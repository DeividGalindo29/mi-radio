// ====== ELEMENTS ======
const audio = document.getElementById("audio");
const btnPlay = document.getElementById("btnPlay");
const volume = document.getElementById("volume");
const volValue = document.getElementById("volValue");
const badgeStatus = document.getElementById("badgeStatus");
const hintText = document.getElementById("hintText");

// Ecualizador visual real (canvas)
const eqCanvas = document.getElementById("eqCanvas");

// Controles EQ (Bajos / Medios / Brillo)
const bass = document.getElementById("bass");
const mid = document.getElementById("mid");
const treble = document.getElementById("treble");

const bassVal = document.getElementById("bassVal");
const midVal = document.getElementById("midVal");
const trebleVal = document.getElementById("trebleVal");

const year = document.getElementById("year");
year.textContent = new Date().getFullYear();

// ✅ Link del streaming tomado desde el HTML (data-stream)
const STREAM_URL = audio?.dataset?.stream || "";

// ====== Mobile nav ======
const navToggle = document.getElementById("navToggle");
const navMobile = document.getElementById("navMobile");

navToggle?.addEventListener("click", () => {
  const isHidden = navMobile.hasAttribute("hidden");
  if (isHidden) navMobile.removeAttribute("hidden");
  else navMobile.setAttribute("hidden", "");

  const expanded = !isHidden;
  navToggle.setAttribute("aria-expanded", String(expanded));
});

navMobile?.querySelectorAll("a").forEach(a => {
  a.addEventListener("click", () => {
    navMobile.setAttribute("hidden", "");
    navToggle?.setAttribute("aria-expanded", "false");
  });
});

// ====== PLAYER LOGIC ======
let isPlaying = false;

// Default volume
audio.volume = Number(volume.value);
updateVolText(audio.volume);

// ====== WEB AUDIO (EQ REAL + ANALYSER) ======
let audioCtx = null;
let sourceNode = null;

let bassFilter = null;
let midFilter = null;
let trebleFilter = null;

let analyser = null;
let rafId = null;

// Crea la cadena de audio una sola vez:
// audio -> bajos -> medios -> brillo -> analyser -> salida
function initAudioChain() {
  if (audioCtx) return; // ya inicializado

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  // Fuente desde el <audio>
  try {
    sourceNode = audioCtx.createMediaElementSource(audio);
  } catch (e) {
    // Si el navegador no permite (o ya se creó antes)
    console.warn("No se pudo crear MediaElementSource:", e);
    return;
  }

  // Filtros EQ
  bassFilter = audioCtx.createBiquadFilter();
  bassFilter.type = "lowshelf";
  bassFilter.frequency.value = 120; // Bajos

  midFilter = audioCtx.createBiquadFilter();
  midFilter.type = "peaking";
  midFilter.frequency.value = 1000; // Medios
  midFilter.Q.value = 1;

  trebleFilter = audioCtx.createBiquadFilter();
  trebleFilter.type = "highshelf";
  trebleFilter.frequency.value = 3500; // Brillo/agudos

  // Analyser para el ecualizador visual
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.85;

  // Conectar cadena
  sourceNode
    .connect(bassFilter)
    .connect(midFilter)
    .connect(trebleFilter)
    .connect(analyser)
    .connect(audioCtx.destination);

  // Aplica valores iniciales (si existen sliders)
  applyEQ();

  // Prepara canvas apagado
  stopDrawing();
}

// Aplica dB de sliders a filtros (si existen)
function applyEQ() {
  if (!bassFilter || !midFilter || !trebleFilter) return;

  if (bass) bassFilter.gain.value = Number(bass.value);
  if (mid) midFilter.gain.value = Number(mid.value);
  if (treble) trebleFilter.gain.value = Number(treble.value);

  if (bassVal) bassVal.textContent = `${bassFilter.gain.value} dB`;
  if (midVal) midVal.textContent = `${midFilter.gain.value} dB`;
  if (trebleVal) trebleVal.textContent = `${trebleFilter.gain.value} dB`;
}

// Listeners de sliders EQ
[bass, mid, treble].forEach(sl => {
  sl?.addEventListener("input", applyEQ);
});

// ====== ECUALIZADOR VISUAL (Canvas) ======
function startDrawing() {
  if (!eqCanvas || !analyser) return;

  const ctx = eqCanvas.getContext("2d");

  const dpr = window.devicePixelRatio || 1;
  const cssW = eqCanvas.clientWidth || eqCanvas.width;
  const cssH = eqCanvas.clientHeight || eqCanvas.height;

  // Nítido en retina
  eqCanvas.width = Math.floor(cssW * dpr);
  eqCanvas.height = Math.floor(cssH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  const barCount = 28;
  const gap = 2;
  const barW = Math.max(2, Math.floor((cssW - (barCount - 1) * gap) / barCount));
  const maxH = cssH;

  function draw() {
    rafId = requestAnimationFrame(draw);

    ctx.clearRect(0, 0, cssW, cssH);
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(0, 0, cssW, cssH);

    analyser.getByteFrequencyData(dataArray);

    for (let i = 0; i < barCount; i++) {
      const idx = Math.floor((i / barCount) * bufferLength);
      const v = dataArray[idx] / 255;

      const h = Math.max(3, v * maxH);
      const x = i * (barW + gap);
      const y = cssH - h;

      const alpha = 0.35 + v * 0.55;
      ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;

      roundRect(ctx, x, y, barW, h, 6);
      ctx.fill();
    }
  }

  if (!rafId) draw();
}

function stopDrawing() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  if (eqCanvas) {
    const ctx = eqCanvas.getContext("2d");
    const w = eqCanvas.clientWidth || 180;
    const h = eqCanvas.clientHeight || 38;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(0, 0, w, h);
  }
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

// ====== PLAY / PAUSE ======
btnPlay.addEventListener("click", async () => {
  try {
    // Carga la URL solo cuando le das play
    if (!audio.src) {
      audio.src = STREAM_URL;
      audio.crossOrigin = "anonymous"; // puede ayudar en algunos casos
    }

    if (!isPlaying) {
      hintText.textContent = "Conectando…";

      // Inicializa cadena de audio (EQ real + analyser)
      initAudioChain();

      // Reanuda contexto si está suspendido
      if (audioCtx && audioCtx.state === "suspended") {
        await audioCtx.resume().catch(() => {});
      }

      await audio.play();
      isPlaying = true;

      setStatusOn();
      btnPlay.textContent = "⏸";
      btnPlay.setAttribute("aria-label", "Pausar");
      hintText.textContent = "Reproduciendo en vivo";

      // Inicia visualizador
      startDrawing();
    } else {
      audio.pause();
      isPlaying = false;

      setStatusOff();
      btnPlay.textContent = "▶";
      btnPlay.setAttribute("aria-label", "Reproducir");
      hintText.textContent = "Pausado";

      stopDrawing();
    }
  } catch (err) {
    isPlaying = false;
    setStatusOff();
    btnPlay.textContent = "▶";
    btnPlay.setAttribute("aria-label", "Reproducir");
    hintText.textContent = "No se pudo reproducir. Verifica el enlace del streaming.";
    stopDrawing();
    console.error(err);
  }
});

// ====== VOLUME ======
volume.addEventListener("input", () => {
  const v = Number(volume.value);
  audio.volume = v;
  updateVolText(v);
});

audio.addEventListener("playing", async () => {
  isPlaying = true;
  setStatusOn();
  btnPlay.textContent = "⏸";
  btnPlay.setAttribute("aria-label", "Pausar");
  hintText.textContent = "Reproduciendo en vivo";

  initAudioChain();
  if (audioCtx && audioCtx.state === "suspended") {
    await audioCtx.resume().catch(() => {});
  }
  startDrawing();
});

audio.addEventListener("pause", () => {
  if (audio.currentTime === 0 && !audio.ended) return;

  isPlaying = false;
  setStatusOff();
  btnPlay.textContent = "▶";
  btnPlay.setAttribute("aria-label", "Reproducir");
  hintText.textContent = "Pausado";
  stopDrawing();
});

audio.addEventListener("error", () => {
  isPlaying = false;
  setStatusOff();
  btnPlay.textContent = "▶";
  btnPlay.setAttribute("aria-label", "Reproducir");
  hintText.textContent = "Error de streaming. Revisa la URL o el formato.";
  stopDrawing();
});

// ====== HELPERS ======
function updateVolText(v) {
  volValue.textContent = `${Math.round(v * 100)}%`;
}

function setStatusOn() {
  badgeStatus.textContent = "ON AIR";
  badgeStatus.classList.add("badge--on");
  badgeStatus.classList.remove("badge--off");
}

function setStatusOff() {
  badgeStatus.textContent = "PAUSADO";
  badgeStatus.classList.add("badge--off");
  badgeStatus.classList.remove("badge--on");
}