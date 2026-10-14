document.addEventListener("DOMContentLoaded", function () {
  // \\\\\\\\\\\\\\\\\\\\\\\\\\\\\
  // block1 — запуск анимации обложки и таймер

  const block1 = document.querySelector(".block1");
  const timerTxt = document.querySelector(".timer_txt");
  const subtitle = document.querySelector(".main_subtitle");

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  // блокируем скролл до конца интро и всегда начинаем с самого верха
  function lockScroll() {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    document.documentElement.classList.add("is_locked");
  }

  function unlockScroll() {
    document.documentElement.classList.remove("is_locked");
  }

  if (!reduceMotion) lockScroll();

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

  // формат ММ:СС:мс — минуты, секунды и сотые доли секунды (две цифры),
  // чтобы длина строки не менялась
  function formatTime(totalMs) {
    const minutes = Math.floor(totalMs / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    const hundredths = Math.floor((totalMs % 1000) / 10);
    return pad(minutes) + ":" + pad(seconds) + ":" + pad(hundredths);
  }

  let timerStarted = false;

  function startTimer() {
    if (timerStarted || !timerTxt) return;
    timerStarted = true;
    timerTxt.classList.add("is_running");

    const startTime = performance.now();

    // обновляем каждый кадр, чтобы миллисекунды бежали плавно
    function tick() {
      timerTxt.textContent = formatTime(performance.now() - startTime);
      window.requestAnimationFrame(tick);
    }
    window.requestAnimationFrame(tick);
  }

  // \\\\\\\\\\\\\\\\\\\\\\\\\\\\\
  // block1 — плашка «33⅓ RPM что это?»

  const rpmBtn = document.querySelector(".rpm_btn");
  const rpmPanel = document.querySelector(".rpm_panel");
  const rpmClose = document.querySelector(".rpm_close");

  function openRpm() {
    if (!rpmPanel) return;
    rpmPanel.classList.add("is_open");
    rpmPanel.setAttribute("aria-hidden", "false");
    rpmBtn.setAttribute("aria-expanded", "true");
  }

  function closeRpm() {
    if (!rpmPanel || !rpmPanel.classList.contains("is_open")) return;
    rpmPanel.classList.remove("is_open");
    rpmPanel.setAttribute("aria-hidden", "true");
    rpmBtn.setAttribute("aria-expanded", "false");
  }

  if (rpmBtn) rpmBtn.addEventListener("click", openRpm);
  if (rpmClose) rpmClose.addEventListener("click", closeRpm);

  // закрыть кликом мимо плашки или клавишей Esc
  document.addEventListener("click", function (e) {
    if (!rpmPanel || !rpmBtn) return;
    if (!rpmPanel.contains(e.target) && !rpmBtn.contains(e.target)) {
      closeRpm();
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeRpm();
  });

  // \\\\\\\\\\\\\\\\\\\\\\\\\\\\\
  // когда заголовок закончил появляться: запускаем таймер и открываем скролл
  if (reduceMotion) {
    startTimer();
  } else if (subtitle) {
    subtitle.addEventListener("animationend", function (e) {
      if (e.animationName === "slideUpTitle") {
        startTimer();
        unlockScroll();
      }
    });
  }

  // \\\\\\\\\\\\\\\\\\\\\\\\\\\\\
  // block2 — график рисуется по скроллу
  //
  // прогресс секции от 0 до 1:
  // 0    – 0.12   прямая вырастает из центра
  // 0.1  – 0.16   засечка слева
  // 0.12 – 0.18   подпись «253 000 000»
  // 0.18 – 0.5    кривая рисуется слева направо
  // 0.5  – 0.58   точка и «1 диск»
  // 0.6  – 0.78   график уменьшается и уходит вверх
  // 0.78 – 0.92   появляется текст
  // 0.92 – 1      пауза, всё стоит на месте

  const block2 = document.querySelector(".block2");
  const graph = document.querySelector(".block2_graph");
  const graphLine = document.querySelector(".graph_line");
  const graphTick = document.querySelector(".graph_tick");
  const graphCurve = document.querySelector("img.graph_curve");
  const graphCurvePath = document.querySelector(".graph_curve_line path");
  const graphDot = document.querySelector(".graph_dot");
  const labelTracks = document.querySelector(".label_tracks");
  const labelDisc = document.querySelector(".label_disc");
  const block2Text = document.querySelector(".block2_text");

  // кривая в svg идёт от 15.67% до 84.32% ширины картинки
  const CURVE_START = 15.67;
  const CURVE_END = 84.32;

  // финал графика: масштаб 0.505 и подъём на 244px макета
  const GRAPH_SCALE = 0.505;
  const GRAPH_SHIFT = 16.94;

  // точка в финале 45px (а не 64 × 0.505)
  const DOT_FINAL = 45 / 64;

  // подписи: 32px → 20px
  const LABEL_FINAL = 20 / 32;

  // часть отрезка [from, to], которую уже прошёл прогресс: 0…1
  function part(progress, from, to) {
    if (progress <= from) return 0;
    if (progress >= to) return 1;
    return (progress - from) / (to - from);
  }

  // мягкий разгон и торможение, как ease-in-out
  function ease(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function drawBlock2() {
    if (!block2) return;

    // сколько секции уже прокручено (без последнего экрана, где она отпускает)
    const rect = block2.getBoundingClientRect();
    const scrollable = block2.offsetHeight - window.innerHeight;
    const progress = Math.min(Math.max(-rect.top / scrollable, 0), 1);

    // прямая
    const lineK = ease(part(progress, 0, 0.12));
    graphLine.style.transform = "scaleX(" + lineK + ")";

    // засечка
    const tickK = ease(part(progress, 0.1, 0.16));
    graphTick.style.transform = "scaleY(" + tickK + ")";

    // подпись 253 000 000
    const tracksK = ease(part(progress, 0.12, 0.18));
    labelTracks.style.opacity = tracksK;

    // кривая: чёткая линия рисуется точно по пути,
    // свечение открывается мягкой маской чуть позади кончика
    const curveK = part(progress, 0.18, 0.5);
    graphCurvePath.style.strokeDashoffset = -1 + curveK;

    const edge = CURVE_START + (CURVE_END - CURVE_START) * curveK;
    const mask =
      curveK >= 1
        ? "none"
        : curveK <= 0
          ? "linear-gradient(to right, transparent, transparent)"
          : "linear-gradient(to right, #000 " +
            (edge - 8) +
            "%, transparent " +
            edge +
            "%)";
    graphCurve.style.webkitMaskImage = mask;
    graphCurve.style.maskImage = mask;

    // график уменьшается и уходит вверх
    const shrinkK = ease(part(progress, 0.6, 0.78));
    const scale = 1 - (1 - GRAPH_SCALE) * shrinkK;
    graph.style.transform =
      "translateY(" + -GRAPH_SHIFT * shrinkK + "cqw) scale(" + scale + ")";

    // подписи: 32px в начале → 20px в финале, плавно вместе с графиком.
    // делим на масштаб графика, чтобы размер зависел только от shrinkK
    const labelSize = 1 - (1 - LABEL_FINAL) * shrinkK;
    const labelScale = labelSize / scale;
    labelTracks.style.transform =
      "translateY(" + (1 - tracksK) * 1 + "cqw) scale(" + labelScale + ")";
    labelDisc.style.transform = "scale(" + labelScale + ")";

    // точка и подпись 1 диск
    const dotK = ease(part(progress, 0.5, 0.58));
    const dotGrow = 1 + (DOT_FINAL / GRAPH_SCALE - 1) * shrinkK;
    graphDot.style.opacity = dotK;
    graphDot.style.transform = "scale(" + (0.6 + 0.4 * dotK) * dotGrow + ")";
    labelDisc.style.opacity = dotK;

    // текст
    const textK = ease(part(progress, 0.78, 0.92));
    block2Text.style.opacity = textK;
    block2Text.style.transform = "translateY(" + (1 - textK) * 2 + "cqw)";
  }

  // пересчитываем не чаще одного раза за кадр
  let block2Ticking = false;

  function onScroll() {
    if (block2Ticking) return;
    block2Ticking = true;
    window.requestAnimationFrame(function () {
      drawBlock2();
      block2Ticking = false;
    });
  }

  if (block2) {
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    drawBlock2();
  }
});
