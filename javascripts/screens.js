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
    if (window.lenis) window.lenis.stop();
  }

  function unlockScroll() {
    document.documentElement.classList.remove("is_locked");
    if (window.lenis) window.lenis.start();
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

  // зерно на свечении (путь от index.html)
  const GRAIN_MASK = 'url("./images/grain_mask.png")';

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
    let reveal;
    if (curveK >= 1) {
      reveal = "linear-gradient(#000, #000)";
    } else if (curveK <= 0) {
      reveal = "linear-gradient(to right, transparent, transparent)";
    } else {
      reveal =
        "linear-gradient(to right, #000 " +
        (edge - 8) +
        "%, transparent " +
        edge +
        "%)";
    }
    // первый слой — зерно, второй открывает свечение слева направо
    const mask = GRAIN_MASK + ", " + reveal;
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
  // \\\\\\\\\\\\\\\\\\\\\\\\\\\\\
  // block4 — слова по очереди, абзацы выезжают сбоку, затем волна и точки
  //
  // прогресс секции от 0 до 1:
  // 0    – 0.6    слова и абзацы по очереди, длинными перекрывающимися отрезками
  // 0.56 – 0.78   рисуется волна слева направо (со свечением)
  // 0.7  – 0.86   точки по очереди появляются на волне
  //
  // точки сами по себе (не от скролла) бесконечно едут по волне слева направо
  // друг за другом: доезжают до правого края за экраном и снова выезжают слева.
  // скорость — DOT_LOOP (секунд на один проезд всей волны)
  //
  // прогресс не прыгает за скроллом, а догоняет его каждый кадр (SMOOTH_4),
  // поэтому текст доплывает до места, даже когда колесо уже остановилось

  const block4 = document.querySelector(".block4");
  const bigWords = document.querySelectorAll(".big_word");
  const wordTxts = document.querySelectorAll(".word_txt");
  const waveMasks = document.querySelectorAll(".wave_mask_path");
  const waveDots = document.querySelectorAll(".wave_dot");

  // линия волны, по которой едут точки
  const waveLine = document.querySelector(".wave_line_path");
  const waveLen = waveLine ? waveLine.getTotalLength() : 0;

  // секунд на один проезд точки по всей волне (меньше — быстрее)
  const DOT_LOOP = 16;
  // на каком отрезке у краёв волны точка гаснет/проявляется (в единицах svg)
  const DOT_EDGE = 80;
  // видимость каждой точки от скролла (0–1), обновляется в drawBlock4
  const dotShow = [];
  waveDots.forEach(function () {
    dotShow.push(0);
  });

  const waveLengths = [];
  waveMasks.forEach(function (path) {
    waveLengths.push(path.getTotalLength());
  });

  // порядок появления: слово → его абзац → следующее слово
  // [элемент, начало, конец] в долях прогресса
  const block4Steps = [
    [bigWords[0], 0.0, 0.12],
    [bigWords[1], 0.06, 0.18],
    [wordTxts[0], 0.1, 0.26],
    [bigWords[2], 0.18, 0.3],
    [wordTxts[1], 0.22, 0.38],
    [bigWords[3], 0.3, 0.42],
    [bigWords[4], 0.36, 0.48],
    [wordTxts[2], 0.4, 0.56],
    [bigWords[5], 0.48, 0.6],
  ];

  // насколько абзацы выезжают сбоку (справа), в cqw
  const SIDE_SHIFT = 4;
  // насколько быстро показанный прогресс догоняет скролл за кадр (0–1)
  const SMOOTH_4 = 0.09;

  // мягкое торможение без рывка в начале — для текста
  function easeOut(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function getProgress4() {
    const rect = block4.getBoundingClientRect();
    const scrollable = block4.offsetHeight - window.innerHeight;
    return Math.min(Math.max(-rect.top / scrollable, 0), 1);
  }

  let shown4 = 0;
  let running4 = false;

  function drawBlock4(progress) {
    block4Steps.forEach(function (step) {
      const el = step[0];
      const k = easeOut(part(progress, step[1], step[2]));
      el.style.opacity = k;
      if (el.classList.contains("word_txt")) {
        el.style.transform = "translate(" + (1 - k) * SIDE_SHIFT + "cqw, -50%)";
      } else {
        el.style.transform = "translateY(" + (1 - k) * 1.5 + "cqw)";
      }
    });

    // волна: путь в svg идёт справа налево, поэтому открываем его с конца
    const waveK = ease(part(progress, 0.56, 0.78));
    waveMasks.forEach(function (path, i) {
      const len = waveLengths[i];
      const shown = waveK * len;
      path.style.strokeDasharray = shown + " " + (len - shown + 1);
      path.style.strokeDashoffset = -(len - shown);
    });

    // точки проявляются по очереди, когда волна почти дорисована
    waveDots.forEach(function (dot, i) {
      const from = 0.7 + i * 0.04;
      dotShow[i] = ease(part(progress, from, from + 0.04));
    });
    startDots();
  }

  // \\\\\\\\\\\\\\  // бесконечное движение точек по волне.
  // точки стоят на равном расстоянии друг от друга и едут вместе, как бусины на нитке
  let dotsRunning = false;
  let block4Visible = false;
  const dotsStart = performance.now();

  function moveDots(now) {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const t = reduce ? 0 : (now - dotsStart) / 1000;
    const shift = (t / DOT_LOOP) * waveLen;
    const n = waveDots.length;

    waveDots.forEach(function (dot, i) {
      // сколько точка проехала от левого края волны
      const d =
        (shift + ((n - 1 - i) / n) * waveLen + waveLen * 0.08) % waveLen;
      // путь в svg идёт справа налево: левый край — конец пути
      const pt = waveLine.getPointAtLength(waveLen - d);
      dot.setAttribute("cx", pt.x);
      dot.setAttribute("cy", pt.y);
      // у краёв волны (за экраном) точка гаснет, чтобы перескок был незаметен
      const edge = Math.min(1, d / DOT_EDGE, (waveLen - d) / DOT_EDGE);
      dot.style.opacity = dotShow[i] * edge;
    });
  }

  function dotsFrame(now) {
    moveDots(now);
    const anyShown = dotShow.some(function (v) {
      return v > 0;
    });
    if (block4Visible && anyShown) {
      window.requestAnimationFrame(dotsFrame);
    } else {
      dotsRunning = false;
    }
  }

  function startDots() {
    if (dotsRunning || !waveLine) return;
    dotsRunning = true;
    window.requestAnimationFrame(dotsFrame);
  }

  // каждый кадр подтягиваем показанный прогресс к настоящему,
  // пока не догоним — потом цикл засыпает до следующего скролла
  function tick4() {
    const target = getProgress4();
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    shown4 = reduce ? target : shown4 + (target - shown4) * SMOOTH_4;
    if (Math.abs(target - shown4) < 0.0005) shown4 = target;
    drawBlock4(shown4);
    if (shown4 !== target) {
      window.requestAnimationFrame(tick4);
    } else {
      running4 = false;
    }
  }

  function onScroll4() {
    if (running4) return;
    running4 = true;
    window.requestAnimationFrame(tick4);
  }

  if (block4) {
    window.addEventListener("scroll", onScroll4, { passive: true });
    window.addEventListener("resize", onScroll4);
    // точки крутятся, только пока экран виден — чтобы не грузить страницу зря
    new IntersectionObserver(function (entries) {
      block4Visible = entries[0].isIntersecting;
      if (block4Visible) startDots();
    }).observe(block4);

    shown4 = getProgress4();
    drawBlock4(shown4);
  }

  // \\\\\\\\\\\\\\\\\\\\\\\\\\\\\
  // block5 — «сторона б: цифра точнее». две части в одной секции
  //
  // прогресс секции от 0 до 1:
  // часть 1
  // 0    – 0.18   заголовок и два абзаца по очереди
  // 0.16 – 0.35   ступени рисуются слева направо, свечение — шторкой вместе с линией
  // 0.35 – 0.45   точки по очереди появляются
  // часть 2 — фактоиды
  // 0.5  – 0.57   текст уходит вверх и гаснет
  // 0.52 – 0.64   ступени поднимаются
  // 0.6  – 0.72   появляются линейки и цифры (сначала компакт-диск, потом винил)
  // 0.72 – 0.88   правая половина (винил) сжимается к верхней линии: 96 → ≈65 дБ
  // 0.86 – 0.94   появляется плашка «откуда берётся теплота»
  //
  // точки всё время сами по себе едут по ступеням слева направо друг за другом.
  // скорость — STEP_LOOP (секунд на один проезд по видимой части ступеней)

  const block5 = document.querySelector(".block5");
  const block5Title = document.querySelector(".block5_title");
  const block5Ps = document.querySelectorAll(".block5_text p");
  const stepsSvgs = document.querySelectorAll(".steps");
  const steps = stepsSvgs[0];
  const stepsLine = document.querySelector(".steps_line");
  const stepsGlowRight = document.querySelector(".steps_glow_right");
  const stepsWipe = document.querySelector("#steps_wipe");
  const stepsDots = document.querySelectorAll(".steps_dot");
  const stepsGuides = document.querySelector(".steps_guides");
  const guideTxts = document.querySelectorAll(".guide_txt");
  const factCd = document.querySelector(".b5_fact_cd");
  const factVinyl = document.querySelector(".b5_fact_vinyl");
  const moreBtn = document.querySelector(".b5_more");

  // ширина мягкого края шторки свечения (в единицах svg)
  const WIPE_SOFT = 160;
  const STEP_LOOP = 24;
  const STEP_EDGE = 80;
  const SMOOTH_5 = 0.09;
  // насколько поднимаются ступени во второй части, в cqw
  const STEPS_LIFT = 16.49;
  // во сколько раз сжимается винил: 65 из 96
  const VINYL_K = 65 / 96;

  // ступени как ломаная: [x, y] в единицах svg (как в макете 1644×656)
  const TOP = 88.9; // потолок — максимальная громкость
  const CD_FLOOR = 566.9; // самая нижняя ступень
  // граница половин: в просвете справа от среднего столбика.
  // левее — компакт-диск (не меняется), правее — винил (сжимается)
  const MIDDLE = 1007.2;
  const BASE = [
    [-500, 527.707],
    [230.165, 527.707],
    [230.165, 88.9],
    [371.43, 88.9],
    [371.43, 566.9],
    [512.695, 566.9],
    [512.695, 167.806],
    [653.96, 167.806],
    [653.96, 530.781],
    [795.224, 530.781],
    [795.224, 278.712],
    [936.574, 278.712],
    [936.574, 530.781],
    // на границе половин нижняя линия делает ступеньку вверх — «пол» винила
    [MIDDLE, 530.781],
    [MIDDLE, 530.781, true],
    [1077.84, 530.781],
    [1077.84, 167.806],
    [1219.1, 167.806],
    [1219.1, 566.9],
    [1360.37, 566.9],
    [1360.37, 88.9],
    [1501.63, 88.9],
    [1501.63, 527.707],
    [2232, 527.707],
  ];

  let pts = [];
  let cum = [];
  let total = 0;
  let squeeze = 1;

  // пересобрать ломаную под текущее сжатие винила
  function buildSteps(f) {
    squeeze = f;
    pts = BASE.map(function (p) {
      if (p[0] > MIDDLE || p[2]) return [p[0], TOP + (p[1] - TOP) * f];
      return [p[0], p[1]];
    });
    cum = [0];
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i][0] - pts[i - 1][0];
      const dy = pts[i][1] - pts[i - 1][1];
      cum.push(cum[i - 1] + Math.abs(dx) + Math.abs(dy));
    }
    total = cum[cum.length - 1];
    stepsLine.setAttribute(
      "d",
      "M" +
        pts
          .map(function (p) {
            return p[0] + " " + p[1];
          })
          .join("L"),
    );
    if (stepsGlowRight) {
      stepsGlowRight.setAttribute(
        "transform",
        "translate(0 " + TOP + ") scale(1 " + f + ") translate(0 " + -TOP + ")",
      );
    }
  }

  // точка на ломаной по длине от её начала
  function pointAt(l) {
    l = Math.min(Math.max(l, 0), total);
    let i = 1;
    while (i < cum.length - 1 && cum[i] < l) i++;
    const seg = cum[i] - cum[i - 1] || 1;
    const k = (l - cum[i - 1]) / seg;
    return [
      pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k,
      pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k,
    ];
  }

  // длина ломаной до места, где она доходит до нужного x
  function lengthAtX(x) {
    if (x <= pts[0][0]) return 0;
    for (let i = 1; i < pts.length; i++) {
      if (pts[i][0] >= x && pts[i][0] > pts[i - 1][0]) {
        return cum[i - 1] + (x - pts[i - 1][0]);
      }
    }
    return total;
  }

  // какие x (в единицах svg) сейчас по краям окна, и сколько px в одной единице
  function viewX() {
    const rect = steps.getBoundingClientRect();
    const scale = rect.width / 1644;
    return [
      (0 - rect.left) / scale,
      (window.innerWidth - rect.left) / scale,
      scale,
    ];
  }

  function visibleRange() {
    const v = viewX();
    return [lengthAtX(v[0]), lengthAtX(v[1])];
  }

  function setLine(el, x1, y1, x2, y2) {
    el.setAttribute("x1", x1);
    el.setAttribute("y1", y1);
    el.setAttribute("x2", x2);
    el.setAttribute("y2", y2);
  }

  // пунктиры и линейки по краям окна
  function drawGuides(compressK) {
    const v = viewX();
    const vinylFloor = TOP + (CD_FLOOR - TOP) * squeeze;
    const pad = (window.innerWidth * 0.025) / v[2]; // 2.5vw от края окна
    const xl = v[0] + pad;
    const xr = v[1] - pad;

    setLine(stepsGuides.querySelector(".guide_top"), v[0], TOP, v[1], TOP);
    setLine(
      stepsGuides.querySelector(".guide_cd"),
      v[0],
      CD_FLOOR,
      MIDDLE,
      CD_FLOOR,
    );
    setLine(
      stepsGuides.querySelector(".guide_vinyl"),
      MIDDLE,
      vinylFloor,
      v[1],
      vinylFloor,
    );

    [
      [".ruler_cd", xl, CD_FLOOR],
      [".ruler_vinyl", xr, vinylFloor],
    ].forEach(function (r) {
      const g = stepsGuides.querySelector(r[0]);
      setLine(g.querySelector(".ruler_line"), r[1], TOP, r[1], r[2]);
      setLine(g.querySelector(".ruler_tick_top"), r[1] - 8, TOP, r[1] + 8, TOP);
      setLine(
        g.querySelector(".ruler_tick_bottom"),
        r[1] - 8,
        r[2],
        r[1] + 8,
        r[2],
      );
    });

    // подписи: «максимальная громкость» над потолком, цифры — вдоль линеек
    const topTxt = guideTxts[0];
    topTxt.setAttribute("x", xl + 16);
    topTxt.setAttribute("y", TOP - 12);

    const cdTxt = guideTxts[1];
    const cdY = (TOP + CD_FLOOR) / 2;
    cdTxt.setAttribute("x", xl - 8);
    cdTxt.setAttribute("y", cdY);
    cdTxt.setAttribute("text-anchor", "middle");
    cdTxt.setAttribute("transform", "rotate(-90 " + (xl - 8) + " " + cdY + ")");

    const vinylTxt = guideTxts[2];
    const vY = (TOP + vinylFloor) / 2;
    vinylTxt.setAttribute("x", xr + 18);
    vinylTxt.setAttribute("y", vY);
    vinylTxt.setAttribute("text-anchor", "middle");
    vinylTxt.setAttribute(
      "transform",
      "rotate(-90 " + (xr + 18) + " " + vY + ")",
    );
    vinylTxt.textContent =
      compressK >= 1 ? "≈65 дБ" : Math.round(96 * squeeze) + " дБ";
  }

  const block5Steps = [
    [block5Title, 0.0, 0.07],
    [block5Ps[0], 0.04, 0.13],
    [block5Ps[1], 0.09, 0.18],
  ];

  const stepsShow = [];
  stepsDots.forEach(function () {
    stepsShow.push(0);
  });

  function getProgress5() {
    const rect = block5.getBoundingClientRect();
    const scrollable = block5.offsetHeight - window.innerHeight;
    return Math.min(Math.max(-rect.top / scrollable, 0), 1);
  }

  let shown5 = 0;
  let running5 = false;

  // появление снизу: прозрачность и сдвиг
  function rise(el, k, extra) {
    el.style.opacity = k;
    el.style.transform =
      (extra || "") + " translateY(" + (1 - k) * 1.5 + "cqw)";
  }

  function drawBlock5(progress) {
    // часть 1: текст появляется, в части 2 уходит вверх
    const out = ease(part(progress, 0.5, 0.57));
    block5Steps.forEach(function (step) {
      const el = step[0];
      const k = easeOut(part(progress, step[1], step[2]));
      el.style.opacity = k * (1 - out);
      el.style.transform = "translateY(" + ((1 - k) * 1.5 - out * 2) + "cqw)";
    });

    // сжатие винила и подъём ступеней
    const squeezeK = ease(part(progress, 0.72, 0.88));
    buildSteps(1 - (1 - VINYL_K) * squeezeK);
    const lift = ease(part(progress, 0.52, 0.64));
    stepsSvgs.forEach(function (svg) {
      svg.style.transform = "translateY(" + -STEPS_LIFT * lift + "cqw)";
    });

    // ступени рисуются: только видимая часть, чтобы скорость не уходила на хвосты
    const k = ease(part(progress, 0.16, 0.35));
    const vis = visibleRange();
    let dash = vis[0] + (vis[1] - vis[0]) * k;
    if (k <= 0) dash = 0;
    stepsLine.style.strokeDasharray =
      k >= 1 ? "none" : dash + " " + (total + 1);

    // свечение: шторка доходит ровно до кончика линии
    let tipX = pointAt(dash)[0];
    if (k <= 0) tipX = -2000;
    if (k >= 1) tipX = 4000;
    stepsWipe.setAttribute("x1", tipX - WIPE_SOFT);
    stepsWipe.setAttribute("x2", tipX);

    stepsDots.forEach(function (dot, i) {
      const from = 0.35 + i * 0.015;
      stepsShow[i] = ease(part(progress, from, from + 0.02));
    });

    // часть 2: линейки, цифры, плашка
    const guidesK = ease(part(progress, 0.6, 0.68));
    stepsGuides.style.opacity = guidesK;
    guideTxts.forEach(function (t) {
      t.style.opacity = guidesK * 0.75;
    });
    drawGuides(squeezeK);

    rise(factCd, easeOut(part(progress, 0.6, 0.68)), "translateX(-50%)");
    rise(factVinyl, easeOut(part(progress, 0.64, 0.72)), "translateX(-50%)");

    const moreK = easeOut(part(progress, 0.86, 0.94));
    rise(moreBtn, moreK);
    moreBtn.classList.toggle("is_shown", moreK > 0.5);

    startSteps();
  }

  function tick5() {
    const target = getProgress5();
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    shown5 = reduce ? target : shown5 + (target - shown5) * SMOOTH_5;
    if (Math.abs(target - shown5) < 0.0005) shown5 = target;
    drawBlock5(shown5);
    if (shown5 !== target) {
      window.requestAnimationFrame(tick5);
    } else {
      running5 = false;
    }
  }

  function onScroll5() {
    if (running5) return;
    running5 = true;
    window.requestAnimationFrame(tick5);
  }

  // бесконечное движение точек по ступеням
  let stepsRunning = false;
  let block5Visible = false;
  const stepsStart = performance.now();

  function moveSteps(now) {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const t = reduce ? 0 : (now - stepsStart) / 1000;
    const vis = visibleRange();
    // чуть шире окна, чтобы точка уезжала за край целиком
    const from = Math.max(0, vis[0] - 60);
    const span = Math.min(total, vis[1] + 60) - from;
    const n = stepsDots.length;

    stepsDots.forEach(function (dot, i) {
      const d = ((t / STEP_LOOP + (n - 1 - i) / n + 0.05) % 1) * span;
      const pt = pointAt(from + d);
      dot.setAttribute("cx", pt[0]);
      dot.setAttribute("cy", pt[1]);
      const edge = Math.min(1, d / STEP_EDGE, (span - d) / STEP_EDGE);
      dot.style.opacity = stepsShow[i] * edge;
    });
  }

  function stepsFrame(now) {
    moveSteps(now);
    const anyShown = stepsShow.some(function (v) {
      return v > 0;
    });
    if (block5Visible && anyShown) {
      window.requestAnimationFrame(stepsFrame);
    } else {
      stepsRunning = false;
    }
  }

  function startSteps() {
    if (stepsRunning || !stepsLine) return;
    stepsRunning = true;
    window.requestAnimationFrame(stepsFrame);
  }

  if (block5 && stepsLine) {
    buildSteps(1);
    window.addEventListener("scroll", onScroll5, { passive: true });
    window.addEventListener("resize", onScroll5);

    new IntersectionObserver(function (entries) {
      block5Visible = entries[0].isIntersecting;
      if (block5Visible) startSteps();
    }).observe(block5);

    shown5 = getProgress5();
    drawBlock5(shown5);
  }

  // \\\\\\\\\\\\\\\\\\\\\\\\\\\\\
  // block6 — «если дело не в звуке, тогда в чём?»
  //
  // прогресс секции от 0 до 1:
  // 0    – 0.14   абзац
  // 0.14 – 0.24   кружок
  // 0.2  – 0.42   линия расходится от кружка к краям окна, свечение — вместе с ней
  // 0.42 – 0.6    вопрос, по строке
  // 0.6  – 1      пауза

  const block6 = document.querySelector(".block6");
  const b6Txt = document.querySelector(".block6_txt");
  const b6Point = document.querySelector(".b6_point");
  const b6LineSvg = document.querySelector(".b6_line_svg");
  const b6LineGlow = document.querySelector(".b6_line_glow");
  const b6Lines = document.querySelectorAll(".b6_q_line");
  const SMOOTH_6 = 0.09;

  function getProgress6() {
    const rect = block6.getBoundingClientRect();
    const scrollable = block6.offsetHeight - window.innerHeight;
    return Math.min(Math.max(-rect.top / scrollable, 0), 1);
  }

  function drawBlock6(progress) {
    const t = easeOut(part(progress, 0, 0.14));
    b6Txt.style.opacity = t;
    b6Txt.style.transform = "translate(-50%, " + (1 - t) * 1.5 + "cqw)";

    const p = easeOut(part(progress, 0.14, 0.24));
    b6Point.style.opacity = p;
    b6Point.style.transform =
      "translate(-50%, -50%) scale(" + (0.6 + 0.4 * p) + ")";

    // линия: доля от центра до края; свечение шире линии, поэтому его край
    // считаем в процентах его собственной ширины (линия = 1440 из 1940)
    const l = ease(part(progress, 0.2, 0.42));
    b6LineSvg.style.transform = "scaleX(" + l + ")";
    b6LineGlow.style.setProperty("--open", l * 50 * (1440 / 1940) + "%");
    // пока линии нет, свечения нет совсем: мягкий край маски иначе
    // оставлял пятно света в центре ещё до появления линии
    b6LineGlow.style.opacity = Math.min(1, l / 0.15);

    b6Lines.forEach(function (line, i) {
      const from = 0.42 + i * 0.07;
      const k = easeOut(part(progress, from, from + 0.11));
      line.style.opacity = k;
      line.style.transform = "translateY(" + (1 - k) * 1.5 + "cqw)";
    });
  }

  let shown6 = 0;
  let running6 = false;

  function tick6() {
    const target = getProgress6();
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    shown6 = reduce ? target : shown6 + (target - shown6) * SMOOTH_6;
    if (Math.abs(target - shown6) < 0.0005) shown6 = target;
    drawBlock6(shown6);
    if (shown6 !== target) {
      window.requestAnimationFrame(tick6);
    } else {
      running6 = false;
    }
  }

  function onScroll6() {
    if (running6) return;
    running6 = true;
    window.requestAnimationFrame(tick6);
  }

  if (block6) {
    window.addEventListener("scroll", onScroll6, { passive: true });
    window.addEventListener("resize", onScroll6);
    shown6 = getProgress6();
    drawBlock6(shown6);
  }

  // \\\\\\\\\\\\\\\\\\\\\\\\\\\\\
  // подпись в левом верхнем углу: SIDE A → SIDE B,
  // когда 5 экран («сторона б») доходит до середины окна
  const sideTxt = document.querySelector(".side_txt");

  function updateSide() {
    if (!sideTxt || !block5) return;
    const sideB = block5.getBoundingClientRect().top < window.innerHeight / 2;
    const txt = sideB ? "SIDE B" : "SIDE A";
    if (sideTxt.textContent !== txt) sideTxt.textContent = txt;
  }

  window.addEventListener("scroll", updateSide, { passive: true });
  updateSide();
});
