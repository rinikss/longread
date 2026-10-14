document.addEventListener("DOMContentLoaded", function () {
  // \\\\\\\\\\\\\\\\\\\\\\\\\\\\\
  // block1 — запуск анимации обложки и таймер

  const block1 = document.querySelector(".block1");
  const timerTxt = document.querySelector(".timer_txt");
  const subtitle = document.querySelector(".main_subtitle");

  function startIntro() {
    if (block1) block1.classList.add("is_playing");
  }

  // ждём загрузки шрифтов и svg, чтобы анимация не стартовала на пустом экране
  if (document.readyState === "complete") {
    startIntro();
  } else {
    window.addEventListener("load", startIntro);
  }

  function pad(num) {
    return num < 10 ? "0" + num : String(num);
  }

  function formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return pad(hours) + ":" + pad(minutes) + ":" + pad(seconds);
  }

  let timerStarted = false;

  function startTimer() {
    if (timerStarted || !timerTxt) return;
    timerStarted = true;
    timerTxt.classList.add("is_running");

    const startTime = Date.now();
    setInterval(function () {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      timerTxt.textContent = formatTime(elapsed);
    }, 250);
  }

  // таймер запускается, когда заголовок закончил появляться
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    startTimer();
  } else if (subtitle) {
    subtitle.addEventListener("animationend", function (e) {
      if (e.animationName === "slideUpTitle") startTimer();
    });
  }
});
