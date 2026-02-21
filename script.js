// ====== ELEMENTS ======
const audio = document.getElementById("audio");
const btnPlay = document.getElementById("btnPlay");
const volume = document.getElementById("volume");
const volValue = document.getElementById("volValue");
const badgeStatus = document.getElementById("badgeStatus");
const hintText = document.getElementById("hintText");

const year = document.getElementById("year");
year.textContent = new Date().getFullYear();

// ✅ Link del streaming tomado desde el HTML (data-stream)
const STREAM_URL = audio.dataset.stream;

// Mobile nav
const navToggle = document.getElementById("navToggle");
const navMobile = document.getElementById("navMobile");

navToggle.addEventListener("click", () => {
  const isHidden = navMobile.hasAttribute("hidden");
  if (isHidden) navMobile.removeAttribute("hidden");
  else navMobile.setAttribute("hidden", "");

  const expanded = !isHidden;
  navToggle.setAttribute("aria-expanded", String(expanded));
});

// Close mobile nav after click
navMobile?.querySelectorAll("a").forEach(a => {
  a.addEventListener("click", () => {
    navMobile.setAttribute("hidden", "");
    navToggle.setAttribute("aria-expanded", "false");
  });
});

// ====== PLAYER LOGIC ======
let isPlaying = false;

// Default volume
audio.volume = Number(volume.value);
updateVolText(audio.volume);

btnPlay.addEventListener("click", async () => {
  try {
    // ✅ Carga la URL solo cuando le das play
    if (!audio.src) {
      audio.src = STREAM_URL;
    }

    if (!isPlaying) {
      hintText.textContent = "Conectando…";
      await audio.play();
      isPlaying = true;
      setStatusOn();
      btnPlay.textContent = "⏸";
      btnPlay.setAttribute("aria-label", "Pausar");
      hintText.textContent = "Reproduciendo en vivo";
    } else {
      audio.pause();
      isPlaying = false;
      setStatusOff();
      btnPlay.textContent = "▶";
      btnPlay.setAttribute("aria-label", "Reproducir");
      hintText.textContent = "Pausado";
    }
  } catch (err) {
    isPlaying = false;
    setStatusOff();
    btnPlay.textContent = "▶";
    btnPlay.setAttribute("aria-label", "Reproducir");
    hintText.textContent = "No se pudo reproducir. Verifica el enlace del streaming.";
    console.error(err);
  }
});

volume.addEventListener("input", () => {
  const v = Number(volume.value);
  audio.volume = v;
  updateVolText(v);
});

audio.addEventListener("playing", () => {
  isPlaying = true;
  setStatusOn();
  btnPlay.textContent = "⏸";
  btnPlay.setAttribute("aria-label", "Pausar");
  hintText.textContent = "Reproduciendo en vivo";
});

audio.addEventListener("pause", () => {
  if (audio.currentTime === 0 && !audio.ended) return;

  isPlaying = false;
  setStatusOff();
  btnPlay.textContent = "▶";
  btnPlay.setAttribute("aria-label", "Reproducir");
  hintText.textContent = "Pausado";
});

audio.addEventListener("error", () => {
  isPlaying = false;
  setStatusOff();
  btnPlay.textContent = "▶";
  btnPlay.setAttribute("aria-label", "Reproducir");
  hintText.textContent = "Error de streaming. Revisa la URL o el formato.";
});

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