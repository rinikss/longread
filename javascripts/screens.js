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
  const graphCurveLine = document.querySelector(".graph_curve_line");
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

  // линии графика гаснут до 35%, как круги на первом экране
  const GRAPH_DIM = 0.35;

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

    // прямая, засечка и кривая гаснут, пока график уходит вверх;
    // точка и подписи остаются яркими, как точка на первом экране
    const dim = 1 - (1 - GRAPH_DIM) * shrinkK;
    graphLine.style.opacity = dim;
    graphTick.style.opacity = dim;
    graphCurve.style.opacity = dim;
    graphCurveLine.style.opacity = dim;

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
  // \\\\\\\\\\\\\\\\\\\\\\\\\\\\\
  // block3 — диск: эллипсы рисуются, диск уезжает вправо вниз, появляются
  // заголовок, текст и точки с годами. всё по скроллу, как на втором экране
  //
  // прогресс секции от 0 до 1:
  // 0    – 0.38   эллипсы рисуются одновременно, каждый со своей точки
  // 0.4  – 0.58   диск уезжает вправо вниз, уменьшается и гаснет
  // 0.56 – 0.68   заголовок и текст
  // 0.66 – 0.9    точки с годами по очереди, от 1948 к 2025
  // 0.9  – 1      пауза
  // (всё выше — в первых 68% секции; дальше текст уходит и появляются фактоиды)

  const block3 = document.querySelector(".block3");
  const disk = document.querySelector(".block3_disk");
  const diskMasks = document.querySelectorAll(".disk_mask_path");

  // длина контура каждого эллипса — нужна, чтобы рисовать его по частям
  const diskLengths = [];
  diskMasks.forEach(function (path) {
    diskLengths.push(path.getTotalLength());
  });
  const diskLines = document.querySelectorAll(".disk_line");
  const block3Title = document.querySelector(".block3_title");
  const block3Text = document.querySelector(".block3_text");
  const yearDots = document.querySelectorAll(".year_dot");

  // с какого места контура начинает рисоваться каждый эллипс (доля длины)
  const DISK_STARTS = [0.12, 0.62, 0.37, 0.87];

  // финал диска: центр сдвигается на 456 и 108 px макета, масштаб 0.83
  const DISK_SHIFT_X = 31.67;
  const DISK_SHIFT_Y = 7.5;
  const DISK_SCALE = 0.83;
  const DISK_DIM = 0.55;

  // с какой доли секции текст сменяется фактоидами
  const FACTS_FROM = 0.68;
  const block3Facts = document.querySelectorAll(".fact");

  // насколько свечение отстаёт от кончика линии, в px svg
  const GLOW_LAG = 80;

  function drawBlock3() {
    if (!block3) return;

    const rect = block3.getBoundingClientRect();
    const scrollable = block3.offsetHeight - window.innerHeight;
    const full = Math.min(Math.max(-rect.top / scrollable, 0), 1);

    // первая часть секции (до FACTS_FROM) — диск, текст и точки,
    // вторая — текст уходит, появляются фактоиды
    const progress = Math.min(full / FACTS_FROM, 1);

    // эллипсы: видимый отрезок растёт от 0 до всей длины.
    // смещение задаёт, откуда он начинается
    const drawK = ease(part(progress, 0, 0.38));
    // у каждого эллипса две маски с одинаковым контуром: чётные — линия,
    // нечётные — свечение. свечение идёт чуть позади кончика линии,
    // чтобы размытый край не обгонял её
    diskMasks.forEach(function (path, i) {
      const len = diskLengths[i];
      const start = DISK_STARTS[Math.floor(i / 2)];
      const isGlow = i % 2 === 1;
      let shown = drawK * len;
      if (isGlow && drawK < 1) shown = Math.max(0, shown - GLOW_LAG);
      path.style.strokeDasharray = shown + " " + (len - shown + 1);
      path.style.strokeDashoffset = -start * len;
    });

    // диск уезжает вправо вниз, уменьшается и гаснет
    const moveK = ease(part(progress, 0.4, 0.58));
    const diskScale = 1 - (1 - DISK_SCALE) * moveK;
    disk.style.transform =
      "translate(" +
      DISK_SHIFT_X * moveK +
      "cqw, " +
      DISK_SHIFT_Y * moveK +
      "cqw) scale(" +
      diskScale +
      ")";

    const diskDim = 1 - (1 - DISK_DIM) * moveK;
    diskLines.forEach(function (line) {
      line.style.opacity = diskDim;
    });

    // заголовок и текст
    const titleK = ease(part(progress, 0.56, 0.64));

    const textK = ease(part(progress, 0.6, 0.68));

    // текст с заголовком уходят вверх, на их место по очереди встают фактоиды
    const outK = ease(part(full, 0.7, 0.78));
    block3Title.style.opacity = titleK * (1 - outK);
    block3Title.style.transform =
      "translateY(" + ((1 - titleK) * 2 - outK * 2) + "cqw)";
    block3Text.style.opacity = textK * (1 - outK);
    block3Text.style.transform =
      "translateY(" + ((1 - textK) * 2 - outK * 2) + "cqw)";

    block3Facts.forEach(function (fact, i) {
      const from = 0.77 + i * 0.05;
      const factK = ease(part(full, from, from + 0.07));
      fact.style.opacity = factK;
      fact.style.transform = "translateY(" + (1 - factK) * 2 + "cqw)";
    });

    // точки с годами по очереди
    yearDots.forEach(function (dot, i) {
      const from = 0.66 + i * 0.034;
      const dotK = ease(part(progress, from, from + 0.034));
      dot.style.opacity = dotK;
      dot.style.transform =
        "translate(-50%, -50%) scale(" + (0.6 + 0.4 * dotK) + ")";
    });
  }

  let block3Ticking = false;

  function onScroll3() {
    if (block3Ticking) return;
    block3Ticking = true;
    window.requestAnimationFrame(function () {
      drawBlock3();
      block3Ticking = false;
    });
  }

  if (block3) {
    window.addEventListener("scroll", onScroll3, { passive: true });
    window.addEventListener("resize", onScroll3);
    drawBlock3();
  }
  // \\\\\\\\\\\\\\\\\\\\\\\\\\\\\
  // block3 — карточки годов: клик по точке открывает её карточку

  const yearCards = document.querySelectorAll(".year_card");
  const stage3 = document.querySelector(".block3_stage");
  let openCard = null;

  function findCard(year) {
    let found = null;
    yearCards.forEach(function (card) {
      if (card.dataset.year === year) found = card;
    });
    return found;
  }

  // ставим карточку по центру над точкой: она закрывает точку,
  // а нижний край оказывается над подписью года
  function placeCard(card, dot) {
    const stageRect = stage3.getBoundingClientRect();
    const dotRect = dot.getBoundingClientRect();
    const labelRect = dot.querySelector(".year_label").getBoundingClientRect();
    const unit = stageRect.width / 100;

    const cardW = card.offsetWidth;
    const cardH = card.offsetHeight;

    let left = dotRect.left + dotRect.width / 2 - stageRect.left - cardW / 2;
    const top = labelRect.top - stageRect.top - cardH - 0.3 * unit;

    // не даём карточке уйти за правый край окна
    const maxLeft = window.innerWidth - stageRect.left - cardW - 2.08 * unit;
    if (left > maxLeft) left = maxLeft;

    card.style.left = left + "px";
    card.style.top = top + "px";
  }

  function closeYearCard() {
    if (!openCard) return;
    openCard.classList.remove("is_open");
    openCard.setAttribute("aria-hidden", "true");
    openCard = null;
  }

  function openYearCard(dot) {
    const card = findCard(dot.dataset.year);
    if (!card) return;
    if (openCard === card) {
      closeYearCard();
      return;
    }
    closeYearCard();
    placeCard(card, dot);
    card.classList.add("is_open");
    card.setAttribute("aria-hidden", "false");
    openCard = card;
  }

  yearDots.forEach(function (dot) {
    dot.addEventListener("click", function (e) {
      e.stopPropagation();
      // точка ещё не появилась — не реагируем
      if (parseFloat(dot.style.opacity) < 0.9) return;
      openYearCard(dot);
    });
  });

  yearCards.forEach(function (card) {
    card.addEventListener("click", function (e) {
      e.stopPropagation();
    });
    card
      .querySelector(".year_card_close")
      .addEventListener("click", closeYearCard);
  });

  document.addEventListener("click", closeYearCard);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeYearCard();
  });

  // если прокрутили назад и точки исчезли — закрываем карточку
  window.addEventListener(
    "scroll",
    function () {
      if (!openCard) return;
      const dot = document.querySelector(
        '.year_dot[data-year="' + openCard.dataset.year + '"]',
      );
      if (dot && parseFloat(dot.style.opacity) < 0.9) closeYearCard();
    },
    { passive: true },
  );
});
