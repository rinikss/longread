document.addEventListener("DOMContentLoaded", function () {
  // \\\\\\\\\\\\\\\\\\\\\\\\\\\\\
  // висячие предлоги: короткие предлоги и союзы склеиваем со следующим словом
  // неразрывным пробелом, частицы «же», «ли», «бы» и тире — с предыдущим.
  // делается при загрузке, поэтому в разметке ничего вписывать не нужно,
  // а строки на любой ширине (десктоп, планшет, мобилка) переносятся сами

  const NBSP = " ";
  const SHORT_WORDS = [
    "а",
    "в",
    "и",
    "к",
    "о",
    "с",
    "у",
    "я",
    "во",
    "до",
    "за",
    "из",
    "ко",
    "на",
    "не",
    "ни",
    "но",
    "об",
    "от",
    "по",
    "со",
    "для",
    "без",
    "при",
    "под",
    "над",
    "про",
    "или",
    "что",
    "как",
    "чем",
  ];
  const RE_AFTER = new RegExp(
    '(^|[\\s(«„"—])(' + SHORT_WORDS.join("|") + ") (?=\\S)",
    "giu",
  );
  const RE_BEFORE = / (же|ли|бы)(?=[\s.,!?;:»]|$)/giu;
  const RE_DASH = / (—|–)/g;
  const RE_NUM = /(\d) (?=[а-яёa-z%])/giu; // «120 миллионов», «41 %»

  function glueText(text) {
    let t = text;
    // дважды: «и в звуке» — после первого прохода «в» ещё не склеено
    t = t.replace(RE_AFTER, "$1$2" + NBSP).replace(RE_AFTER, "$1$2" + NBSP);
    t = t.replace(RE_BEFORE, NBSP + "$1");
    t = t.replace(RE_DASH, NBSP + "$1");
    t = t.replace(RE_NUM, "$1" + NBSP);
    return t;
  }

  const GLUE_SELECTOR =
    "p, h2, li, blockquote, .b6_q_line, .year_card_title, .year_card_txt";
  document.querySelectorAll(GLUE_SELECTOR).forEach(function (el) {
    // svg-подписи и бегущую строку не трогаем
    if (el.closest("svg, .marquee")) return;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const glued = glueText(node.nodeValue);
      if (glued !== node.nodeValue) node.nodeValue = glued;
    }
  });

  // \\\\\\\\\\\\\\\
  // адаптив: какой сейчас макет. те же границы, что в adaptive.css
  //   d — десктоп (от 1024px), t — планшет (600–1023px), m — мобилка (до 599px)
  // pick(десктоп, планшет, мобилка) — выбрать число под текущий макет.
  // на десктопе всегда первое значение, поэтому там ничего не меняется

  const MQ_TABLET = window.matchMedia("(max-width: 1023px)");
  const MQ_MOBILE = window.matchMedia("(max-width: 599px)");

  function bp() {
    if (MQ_MOBILE.matches) return "m";
    if (MQ_TABLET.matches) return "t";
    return "d";
  }

  function pick(d, t, m) {
    const b = bp();
    if (b === "m") return m === undefined ? (t === undefined ? d : t) : m;
    if (b === "t") return t === undefined ? d : t;
    return d;
  }
  window.pick = pick;
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
  const graphCurvePath = document.querySelector(".graph_curve_line path");
  const graphCurveLine = document.querySelector(".graph_curve_line");
  const graphDot = document.querySelector(".graph_dot");
  const labelTracks = document.querySelector(".label_tracks");
  const labelDisc = document.querySelector(".label_disc");
  const block2Text = document.querySelector(".block2_text");

  // финал графика: масштаб 0.505 и подъём на 244px макета
  // (на планшете и мобилке график крупнее и уходит выше — над текстом)
  const GRAPH_SCALE_ = [0.505, 0.78, 0.8];
  const GRAPH_SHIFT_ = [16.94, 24, 38.5];

  // точка в финале 45px (а не 64 × 0.505)
  const DOT_FINAL = 45 / 64;

  // подписи: 32px → 20px
  // (на планшете 24 → 17px, на мобилке 12 → 11px)
  const LABEL_FINAL_ = [20 / 32, 0.7, 0.92];

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

    // кривая рисуется точно по пути (свечение повторяет её само — canvas)
    const curveK = part(progress, 0.18, 0.5);
    // видна последняя доля пути длиной curveK (путь в svg идёт справа налево).
    // без stroke-dashoffset: Safari и Chrome на iPhone не пересчитывают его
    // по pathLength, и линия рисовалась не с того конца
    graphCurvePath.style.strokeDasharray =
      "0 " + (1 - curveK) + " " + curveK + " 1";

    // график уменьшается и уходит вверх
    const shrinkK = ease(part(progress, 0.6, 0.78));
    const GRAPH_SCALE = pick.apply(null, GRAPH_SCALE_);
    const GRAPH_SHIFT = pick.apply(null, GRAPH_SHIFT_);
    const LABEL_FINAL = pick.apply(null, LABEL_FINAL_);
    const scale = 1 - (1 - GRAPH_SCALE) * shrinkK;
    graph.style.transform =
      "translateY(" + -GRAPH_SHIFT * shrinkK + "cqw) scale(" + scale + ")";

    // прямая, засечка и кривая гаснут, пока график уходит вверх;
    // точка и подписи остаются яркими, как точка на первом экране
    const dim = 1 - (1 - GRAPH_DIM) * shrinkK;
    graphLine.style.opacity = dim;
    graphTick.style.opacity = dim;
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

  // на планшете и мобилке диск уезжает не вправо, а вниз, под текст
  const DISK_SHIFT_X_ = [DISK_SHIFT_X, 0, 0];
  const DISK_SHIFT_Y_ = [DISK_SHIFT_Y, 25.8, 37.5];
  const DISK_SCALE_ = [DISK_SCALE, 0.8, 0.78];

  // точки с годами в разметке стоят на десктопном финале диска.
  // находим, где эта точка была на диске до сдвига, и переносим её
  // на финал диска текущего макета. центр диска — центр сцены
  const DISK_CX = 50;
  const DISK_CY = 35.56; // 1024 / 1440 / 2 × 100
  const dotHome = [];
  document.querySelectorAll(".year_dot").forEach(function (dot) {
    const x = parseFloat(dot.style.left);
    const y = parseFloat(dot.style.top);
    dotHome.push({
      left: dot.style.left,
      top: dot.style.top,
      qx: DISK_CX + (x - DISK_SHIFT_X - DISK_CX) / DISK_SCALE,
      qy: DISK_CY + (y - DISK_SHIFT_Y - DISK_CY) / DISK_SCALE,
    });
  });
  // положения точек на неподвижном диске для планшета и мобилки (cqw сцены):
  // как на десктопе, но чуть сдвинуты по своим орбитам вправо, чтобы
  // заполнить и правую часть диска, которая здесь видна целиком
  const DOT_ROUND = {
    1948: [18.29, 62.18],
    1983: [29.01, 21.15],
    1987: [24.73, 44.48],
    2007: [60.0, 23.04],
    2008: [39.19, 47.81],
    2022: [58.04, 10.53],
    2025: [81.46, 8.78],
  };
  let dotsBp = "d";

  function placeYearDots() {
    const b = bp();
    if (b === dotsBp) return;
    dotsBp = b;
    const sx = pick.apply(null, DISK_SHIFT_X_);
    const sy = pick.apply(null, DISK_SHIFT_Y_);
    const sc = pick.apply(null, DISK_SCALE_);
    document.querySelectorAll(".year_dot").forEach(function (dot, i) {
      const h = dotHome[i];
      if (b === "d") {
        dot.style.left = h.left;
        dot.style.top = h.top;
        return;
      }
      // на десктопе видна только левая часть диска, а здесь он целиком —
      // поэтому точки разнесены по всему кругу (каждая на своей орбите)
      const q = DOT_ROUND[dot.dataset.year] || [h.qx, h.qy];
      dot.style.left = DISK_CX + (q[0] - DISK_CX) * sc + sx + "cqw";
      dot.style.top = DISK_CY + (q[1] - DISK_CY) * sc + sy + "cqw";
    });
  }
  const DISK_DIM = 0.55;

  // с какой доли секции текст сменяется фактоидами
  const FACTS_FROM = 0.68;
  const block3Facts = document.querySelectorAll(".fact");

  const diskDrawn = []; // какой кусок каждого эллипса нарисован — для свечения

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
    // свечение canvas читает эту же маску, поэтому рисуется вместе с линией
    diskMasks.forEach(function (path, i) {
      const len = diskLengths[i];
      const start = DISK_STARTS[i];
      const shown = drawK * len;
      diskDrawn[i] = [start * len, start * len + shown]; // для свечения
      path.style.strokeDasharray = shown + " " + (len - shown + 1);
      path.style.strokeDashoffset = -start * len;
    });

    // диск уезжает вправо вниз, уменьшается и гаснет
    // (на планшете и мобилке — вниз, под текст)
    placeYearDots();
    const moveK = ease(part(progress, 0.4, 0.58));
    const diskScale = 1 - (1 - pick.apply(null, DISK_SCALE_)) * moveK;
    disk.style.transform =
      "translate(" +
      pick.apply(null, DISK_SHIFT_X_) * moveK +
      "cqw, " +
      pick.apply(null, DISK_SHIFT_Y_) * moveK +
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
    // (а на узком экране — и за левый: отступ 16px)
    const maxLeft = window.innerWidth - stageRect.left - cardW - 2.08 * unit;
    if (left > maxLeft) left = maxLeft;
    if (bp() !== "d") {
      const minLeft = 16 - stageRect.left;
      const maxLeftN = window.innerWidth - 16 - stageRect.left - cardW;
      left = Math.max(minLeft, Math.min(left, maxLeftN));
    }

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
    // на планшете и мобилке волна начинается, когда весь текст уже на месте
    const WAVE_FROM = pick(0.56, 0.62, 0.62);
    const waveK = ease(part(progress, WAVE_FROM, WAVE_FROM + 0.22));
    waveMasks.forEach(function (path, i) {
      const len = waveLengths[i];
      const shown = waveK * len;
      path.style.strokeDasharray = shown + " " + (len - shown + 1);
      path.style.strokeDashoffset = -(len - shown);
    });

    // точки проявляются по очереди, когда волна почти дорисована
    waveDots.forEach(function (dot, i) {
      const from = WAVE_FROM + 0.14 + i * 0.04;
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
  // часть 2 — диаграмма
  // 0.5  – 0.57   текст уходит вверх и гаснет
  // 0.52 – 0.64   ступени поднимаются
  // 0.6  – 0.76   ступени перестраиваются в столбики: низы — в одну линию,
  //               высота каждого столбика — динамический диапазон носителя
  // 0.66 – 0.74   цифры «≈96 дБ» и «60–70 дБ» над столбиками CD и винила
  // 0.72 – 0.8    пунктиры 96 и 65 дБ, значения и названия носителей
  // 0.74 – 0.86   продажи: под CD и винилом вырастают полоски по числу
  //               проданных в США в 2024 (33 и 44 млн)
  // 0.88 – 0.95   плашка «откуда берётся теплота»
  //
  // цифры диапазона: CD 16 бит — 96 дБ, hi-res 24 бит — 144 дБ (теория:
  // 6 дБ на бит), винил 55–65 дБ, кассета без шумоподавления 50–56 дБ,
  // профессиональная катушечная лента — около 80 дБ на практике (Wikipedia,
  // «Dynamic range»; Yamaha). продажи: RIAA, итоги 2024 года
  //
  //
  // точки всё время сами по себе едут по ступеням слева направо друг за другом.
  // скорость — STEP_LOOP (секунд на один проезд по видимой части ступеней)

  const block5 = document.querySelector(".block5");
  const block5Title = document.querySelector(".block5_title");
  const block5Ps = document.querySelectorAll(".block5_text p");
  const stepsSvgs = document.querySelectorAll(".steps");
  const steps = stepsSvgs[0];
  const stepsLine = document.querySelector(".steps_line");
  const stepsDots = document.querySelectorAll(".steps_dot");
  const stepsGuides = document.querySelector(".steps_guides");
  const guideTxts = document.querySelectorAll(".guide_txt");
  const barVals = document.querySelectorAll(".bar_val");
  const barNames = document.querySelectorAll(".bar_name");
  const barSales = document.querySelectorAll(".bar_sale");
  const saleBars = document.querySelectorAll(".sale_bar");
  // полоска продаж: px на 1 млн проданных (44 млн → 132 px)
  const PX_UNIT = 3;
  const vinylFill = document.querySelector(".vinyl_fill");
  const vinylHl = document.querySelector(".vinyl_hl");
  const factCd = document.querySelector(".b5_fact_cd");
  const factVinyl = document.querySelector(".b5_fact_vinyl");
  const moreBtn = document.querySelector(".b5_more");

  const STEP_LOOP = 24;
  const STEP_EDGE = 80;
  const SMOOTH_5 = 0.09;
  // насколько поднимаются ступени во второй части, в cqw
  // (на планшете и мобилке ступени стоят ниже, поэтому поднимаются выше)
  const STEPS_LIFT_ = [18.99, 43, 81.1];

  // на узком экране svg мельче, поэтому подписи в нём крупнее (в единицах svg),
  // и отступы подписей от столбиков растут вместе с ними
  const LBL_ = [1, 1.53, 2.2];
  const DOT_R_ = [22, 26, 30];
  // короткие названия на мобилке, чтобы соседние подписи не слипались
  const NAME_SHORT = { 0: "hi-res", 2: "лента" };
  const nameFull = [];
  document.querySelectorAll(".bar_name").forEach(function (t) {
    nameFull.push(t.textContent);
  });
  let namesBp = "d";

  function fitB5Labels() {
    const b = bp();
    if (b === namesBp) return;
    namesBp = b;
    document.querySelectorAll(".bar_name").forEach(function (t, i) {
      const short = NAME_SHORT[t.dataset.bar];
      t.textContent = b === "m" && short ? short : nameFull[i];
    });
    document.querySelectorAll(".steps_dot").forEach(function (d) {
      d.setAttribute("r", pick.apply(null, DOT_R_));
    });
  }

  // ступени как ломаная: [x, y] в единицах svg (как в макете 1644×656)
  const TOP = 88.9; // верх шкалы — 144 дБ
  const FLOOR = 566.9; // общая нижняя линия столбиков — 0 дБ
  const PX_DB = (FLOOR - TOP) / 144;
  const yDb = function (db) {
    return FLOOR - db * PX_DB;
  };

  // пять «столбиков» ступеней → пять носителей (по убыванию диапазона)
  const BARS = [
    { x1: 230.165, x2: 371.43, db: 144, top: [2, 3] }, // hi-res 24 бит
    { x1: 512.695, x2: 653.96, db: 96, top: [6, 7] }, // компакт-диск
    { x1: 795.224, x2: 936.574, db: 80, top: [10, 11] }, // катушечная лента
    { x1: 1077.84, x2: 1219.1, db: 65, top: [16, 17] }, // винил
    { x1: 1360.37, x2: 1501.63, db: 56, top: [20, 21] }, // кассета
  ];
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

  // куда встаёт каждая точка ступеней в диаграмме
  const TARGET = BASE.map(function (p, i) {
    for (let b = 0; b < BARS.length; b++) {
      if (BARS[b].top.indexOf(i) !== -1) return yDb(BARS[b].db);
    }
    return FLOOR;
  });

  // пересобрать ломаную: m = 0 — ступени, 1 — диаграмма
  // на планшете и мобилке ступени в начале вытянуты вверх (от нижней линии),
  // в диаграмме — обычной высоты
  const STEPS_TALL_ = [1, 1.4, 1.8];

  function buildSteps(m) {
    const tall = pick.apply(null, STEPS_TALL_);
    pts = BASE.map(function (p, i) {
      const y0 = FLOOR - (FLOOR - p[1]) * tall;
      return [p[0], y0 + (TARGET[i] - y0) * m];
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

  function setText(el, x, y) {
    el.setAttribute("x", x);
    el.setAttribute("y", y);
  }

  // пунктиры, связи с цифрами и подписи столбиков
  let saleGrow = 0; // 0…1 — насколько выросли полоски продаж

  function drawGuides() {
    const v = viewX();
    setLine(
      stepsGuides.querySelector(".guide_96"),
      v[0],
      yDb(96),
      v[1],
      yDb(96),
    );
    setLine(
      stepsGuides.querySelector(".guide_65"),
      v[0],
      yDb(65),
      v[1],
      yDb(65),
    );
    const pad = (window.innerWidth * 0.0222) / v[2]; // 32px от края окна
    const lf = pick.apply(null, LBL_);
    setText(guideTxts[0], v[0] + pad, yDb(96) - 10);
    setText(guideTxts[1], v[0] + pad, yDb(65) - 10);

    // пунктир от подписи цифры (низ блока фактоида) до верха столбика
    const svgRect = steps.getBoundingClientRect();
    [
      [factCd, 1, ".link_cd"],
      [factVinyl, 3, ".link_vinyl"],
    ].forEach(function (l) {
      const b = BARS[l[1]];
      const cx = (b.x1 + b.x2) / 2;
      const factBottom =
        (l[0].getBoundingClientRect().bottom - svgRect.top) / v[2];
      setLine(
        stepsGuides.querySelector(l[2]),
        cx,
        factBottom + 10 * lf,
        cx,
        yDb(b.db) - 12 * lf,
      );
    });

    barVals.forEach(function (t) {
      const b = BARS[+t.dataset.bar];
      setText(t, (b.x1 + b.x2) / 2, yDb(b.db) - 14 * lf);
    });
    barNames.forEach(function (t) {
      const b = BARS[+t.dataset.bar];
      setText(t, (b.x1 + b.x2) / 2, FLOOR + 28 * lf);
    });
    barSales.forEach(function (t) {
      const b = BARS[+t.dataset.bar];
      setText(t, (b.x1 + b.x2) / 2, FLOOR + 72 * lf);
    });
    // полоски продаж под названиями: растут из центра
    saleBars.forEach(function (l) {
      const b = BARS[+l.dataset.bar];
      const cx = (b.x1 + b.x2) / 2;
      const half = (+l.dataset.units * PX_UNIT * lf * saleGrow) / 2;
      setLine(l, cx - half, FLOOR + 46 * lf, cx + half, FLOOR + 46 * lf);
    });

    // винил: заливка и вторая обводка (свечение сильнее)
    const vb = BARS[3];
    vinylFill.setAttribute("x", vb.x1);
    vinylFill.setAttribute("y", yDb(vb.db));
    vinylFill.setAttribute("width", vb.x2 - vb.x1);
    vinylFill.setAttribute("height", vb.db * PX_DB);
    vinylHl.setAttribute(
      "d",
      "M" + vb.x1 + " " + FLOOR + "V" + yDb(vb.db) + "H" + vb.x2 + "V" + FLOOR,
    );
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
  let stepsDrawn = 0; // доля нарисованных ступеней — для свечения
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

    // ступени перестраиваются в столбики и поднимаются
    fitB5Labels();
    const STEPS_LIFT = pick.apply(null, STEPS_LIFT_);
    const morphK = ease(part(progress, 0.6, 0.76));
    buildSteps(morphK);
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
    stepsDrawn = k >= 1 ? 1 : dash / total;

    stepsDots.forEach(function (dot, i) {
      const from = 0.35 + i * 0.015;
      stepsShow[i] = ease(part(progress, from, from + 0.02));
    });

    // часть 2: цифры над столбиками, пунктиры, подписи
    rise(factCd, easeOut(part(progress, 0.66, 0.72)), "translateX(-50%)");
    rise(factVinyl, easeOut(part(progress, 0.68, 0.74)), "translateX(-50%)");

    const guidesK = ease(part(progress, 0.72, 0.8));
    stepsGuides.style.opacity = guidesK;
    guideTxts.forEach(function (t) {
      t.style.opacity = guidesK * 0.6;
    });
    barVals.forEach(function (t) {
      t.style.opacity = guidesK * 0.85;
    });
    barNames.forEach(function (t) {
      t.style.opacity = guidesK * (t.classList.contains("is_key") ? 1 : 0.55);
    });
    vinylFill.style.opacity = guidesK;
    vinylHl.style.opacity = guidesK;
    const saleK = easeOut(part(progress, 0.74, 0.84));
    saleGrow = ease(part(progress, 0.74, 0.86));
    barSales.forEach(function (t) {
      t.style.opacity = saleK;
    });
    saleBars.forEach(function (l) {
      l.style.opacity = saleK * (l.classList.contains("is_vinyl") ? 1 : 0.7);
    });
    drawGuides();

    const moreK = easeOut(part(progress, 0.88, 0.95));
    rise(moreBtn, moreK);
    moreBtn.classList.toggle("is_shown", moreK > 0.5);
    if (moreK < 0.5) closeB5();

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

  // плашка «откуда берётся теплота»: открывается по клику, закрывается минусом,
  // кликом мимо, клавишей Esc и если прокрутить экран назад
  const b5Panel = document.querySelector(".b5_panel");
  const b5Close = document.querySelector(".b5_close");

  function openB5() {
    if (!b5Panel) return;
    b5Panel.classList.add("is_open");
    b5Panel.setAttribute("aria-hidden", "false");
    moreBtn.setAttribute("aria-expanded", "true");
  }

  function closeB5() {
    if (!b5Panel || !b5Panel.classList.contains("is_open")) return;
    b5Panel.classList.remove("is_open");
    b5Panel.setAttribute("aria-hidden", "true");
    moreBtn.setAttribute("aria-expanded", "false");
  }

  if (moreBtn && b5Panel) {
    moreBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      openB5();
    });
    b5Close.addEventListener("click", function (e) {
      e.stopPropagation();
      closeB5();
    });
    document.addEventListener("click", function (e) {
      if (!b5Panel.contains(e.target)) closeB5();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeB5();
    });
  }

  if (block5 && stepsLine) {
    buildSteps(0);
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

    // линия расходится от центра к краям (свечение повторяет её само — canvas)
    const l = ease(part(progress, 0.2, 0.42));
    b6LineSvg.style.transform = "scaleX(" + l + ")";

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

  // \\\\\\\\\\\\\\\\\\\\\\\\\\\\\
  // block7 — «50 %»
  //
  // прогресс секции от 0 до 1:
  // 0    – 0.3    круг рисуется от верхней точки по часовой стрелке
  // 0.2  – 0.45   цифра появляется и считает от 0 до 50
  // 0.4  – 0.5    подпись под цифрой
  // 0.48 – 0.62   первый абзац
  // 0.58 – 0.72   второй абзац
  // 0.72 – 1      пауза

  const block7 = document.querySelector(".block7");
  const b7Circle = document.querySelector(".b7_circle_line");
  const b7Num = document.querySelector(".b7_num");
  const b7Count = document.querySelector(".b7_count");
  const b7Cap = document.querySelector(".b7_cap");
  const b7Ps = document.querySelectorAll(".b7_p");
  const SMOOTH_7 = 0.09;
  const COUNT_TO = 50;

  // пока цифра считает, её ширина меняется, а блок стоит по центру и дёргался бы.
  // поэтому фиксируем ширину по финальному числу (в em — масштабируется вместе с текстом)
  function fixCountWidth() {
    if (!b7Count) return;
    const saved = b7Count.textContent;
    b7Count.style.width = "auto";
    b7Count.textContent = COUNT_TO;
    const fs = parseFloat(window.getComputedStyle(b7Count).fontSize) || 1;
    b7Count.style.width = b7Count.getBoundingClientRect().width / fs + "em";
    b7Count.textContent = saved;
  }
  if (document.fonts && document.fonts.ready)
    document.fonts.ready.then(fixCountWidth);
  fixCountWidth();

  function getProgress7() {
    const rect = block7.getBoundingClientRect();
    const scrollable = block7.offsetHeight - window.innerHeight;
    return Math.min(Math.max(-rect.top / scrollable, 0), 1);
  }

  // круг: [cx, cy, r] в единицах сцены 1440×1024. на десктопе он слева
  // и уходит за край, на планшете и мобилке — по центру сверху, текст под ним
  const B7_CIRCLE_ = [
    [250, 512, 447],
    [720, 246, 544],
    [720, -3.5, 609],
  ];
  let circleBp = "d";
  let b7Drawn = 0; // доля нарисованного круга — для свечения
  if (b7Circle) b7Circle.removeAttribute("pathLength");

  function fitB7Circle() {
    const b = bp();
    if (b === circleBp || !b7Circle) return;
    circleBp = b;
    const c = pick.apply(null, B7_CIRCLE_);
    b7Circle.setAttribute("cx", c[0]);
    b7Circle.setAttribute("cy", c[1]);
    b7Circle.setAttribute("r", c[2]);
    b7Circle.setAttribute("transform", "rotate(-90 " + c[0] + " " + c[1] + ")");
  }

  function drawBlock7(progress) {
    fitB7Circle();
    const c = ease(part(progress, 0, 0.3));
    b7Drawn = c;
    // в настоящих единицах длины, без pathLength: так одинаково во всех браузерах
    const len7 = b7Circle.getTotalLength();
    b7Circle.style.strokeDasharray =
      c >= 1 ? "none" : c * len7 + " " + (1.01 - c) * len7;

    const n = easeOut(part(progress, 0.2, 0.3));
    b7Num.style.opacity = n;
    b7Num.style.transform = "translateY(" + (1 - n) * 1.5 + "cqw)";
    const countK = easeOut(part(progress, 0.2, 0.45));
    b7Count.textContent = Math.round(COUNT_TO * countK);

    const cap = easeOut(part(progress, 0.4, 0.5));
    b7Cap.style.opacity = cap;
    b7Cap.style.transform = "translateY(" + (1 - cap) * 1 + "cqw)";

    b7Ps.forEach(function (p, i) {
      const from = 0.48 + i * 0.1;
      const k = easeOut(part(progress, from, from + 0.14));
      p.style.opacity = k;
      p.style.transform = "translateY(" + (1 - k) * 1.5 + "cqw)";
    });
  }

  let shown7 = 0;
  let running7 = false;

  function tick7() {
    const target = getProgress7();
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    shown7 = reduce ? target : shown7 + (target - shown7) * SMOOTH_7;
    if (Math.abs(target - shown7) < 0.0005) shown7 = target;
    drawBlock7(shown7);
    if (shown7 !== target) {
      window.requestAnimationFrame(tick7);
    } else {
      running7 = false;
    }
  }

  function onScroll7() {
    if (running7) return;
    running7 = true;
    window.requestAnimationFrame(tick7);
  }

  if (block7) {
    window.addEventListener("scroll", onScroll7, { passive: true });
    window.addEventListener("resize", onScroll7);
    shown7 = getProgress7();
    drawBlock7(shown7);
  }

  // \\\\\\\\\\\\\\\\\\\\\\\\\\\\\
  // block8 — «двадцать минут, которые нельзя пролистать»
  //
  // прогресс секции от 0 до 1:
  // 0    – 0.06   заголовок и подзаголовок
  // дальше 6 шагов, на каждый STEP8 = 0.12 прогресса. внутри шага:
  //   0    – 0.2   шаг выезжает снизу
  //   0    – 0.55  линии рисунка прорисовываются (свечение вместе с ними)
  //   0.45 – 0.6   точки и заливки
  //   0.4  – 0.6   подпись с номером
  //   0.5  – 0.7   описание
  //   0.82 – 1     шаг уезжает вверх и гаснет
  // 0.77 – 0.81   заголовок и подзаголовок уходят
  // 0.8  – 0.93   итоговый текст, по абзацу
  // 0.93 – 1      пауза

  const block8 = document.querySelector(".block8");
  const b8Title = document.querySelector(".block8_title");
  const b8Sub = document.querySelector(".block8_sub");
  const b8Steps = document.querySelectorAll(".b8_step");
  const SMOOTH_8 = 0.09;
  const STEP8_FROM = 0.05;
  const STEP8 = 0.12;
  const b8Ps = document.querySelectorAll(".b8_p");

  const b8Parts = [];
  b8Steps.forEach(function (step) {
    b8Parts.push({
      el: step,
      draws: step.querySelectorAll(".b8_draw"),
      fills: step.querySelectorAll(".b8_fill"),
      label: step.querySelector(".b8_label"),
      txt: step.querySelector(".b8_txt"),
    });
  });

  // рисунки разного размера: у одного всё в середине листа 447×447, у другого
  // до самых краёв. подгоняем каждый под общую рамку над подписью, чтобы
  // рисунок не наезжал на текст: рамка 420×300 px макета с центром в (720, 550)
  // на планшете и мобилке рамка крупнее в единицах сцены (сцена там мельче)
  const PIC_BOX_ = [
    { cx: 720, cy: 550, w: 420, h: 300 },
    { cx: 720, cy: 564, w: 937, h: 620 },
    { cx: 720, cy: 450, w: 1148, h: 800 },
  ];
  let picsBp = null;

  function fitPics() {
    const PIC_BOX = pick.apply(null, PIC_BOX_);
    picsBp = bp();
    b8Steps.forEach(function (step) {
      const svg = step.querySelector(".b8_pic");
      const bb = svg.getBBox();
      if (!bb.width || !bb.height) return;
      const pad = 4;
      const bw = bb.width + pad * 2;
      const bh = bb.height + pad * 2;
      // px макета на единицу рисунка (на десктопе рисунок не крупнее исходного,
      // на планшете и мобилке сцена мельче, поэтому рисунок можно увеличивать)
      const k = Math.min(pick(1, 10, 10), PIC_BOX.w / bw, PIC_BOX.h / bh);
      const w = bw * k;
      const h = bh * k;
      svg.setAttribute("viewBox", [bb.x - pad, bb.y - pad, bw, bh].join(" "));
      svg.style.width = w / 14.4 + "cqw";
      svg.style.height = h / 14.4 + "cqw";
      svg.style.left = (PIC_BOX.cx - w / 2) / 14.4 + "cqw";
      svg.style.top = (PIC_BOX.cy - h / 2) / 14.4 + "cqw";
    });
  }
  if (block8) {
    fitPics();
    window.addEventListener("resize", function () {
      if (bp() !== picsBp) fitPics();
    });
  }

  function getProgress8() {
    const rect = block8.getBoundingClientRect();
    const scrollable = block8.offsetHeight - window.innerHeight;
    return Math.min(Math.max(-rect.top / scrollable, 0), 1);
  }

  function drawBlock8(progress) {
    const out = ease(part(progress, 0.77, 0.81));
    const t = easeOut(part(progress, 0, 0.04));
    b8Title.style.opacity = t * (1 - out);
    b8Title.style.transform =
      "translateY(" + ((1 - t) * 1.5 - out * 2) + "cqw)";
    const st = easeOut(part(progress, 0.02, 0.05));
    b8Sub.style.opacity = st * (1 - out);
    b8Sub.style.transform = "translateY(" + ((1 - st) * 1.5 - out * 2) + "cqw)";

    b8Ps.forEach(function (p, i) {
      const from = 0.8 + i * 0.04;
      const k = easeOut(part(progress, from, from + 0.05));
      p.style.opacity = k;
      p.style.transform = "translateY(" + (1 - k) * 1.5 + "cqw)";
    });

    b8Parts.forEach(function (s, i) {
      const from = STEP8_FROM + i * STEP8;
      const k = (progress - from) / STEP8; // 0…1 внутри своего шага

      const inK = easeOut(Math.min(Math.max(k / 0.2, 0), 1));
      const outK = ease(Math.min(Math.max((k - 0.82) / 0.18, 0), 1));
      const op = inK * (1 - outK);

      s.el.style.opacity = op;
      s.el.style.visibility = op > 0.001 ? "visible" : "hidden";
      s.el.style.transform =
        "translateY(" + ((1 - inK) * 4 - outK * 4) + "cqw)";

      const d = ease(Math.min(Math.max(k / 0.55, 0), 1));
      s.drawn = d; // эту долю читает свечение (java-script.js)
      s.draws.forEach(function (p) {
        p.style.strokeDasharray = d >= 1 ? "none" : d + " " + (1.01 - d);
      });
      const f = easeOut(Math.min(Math.max((k - 0.45) / 0.15, 0), 1));
      s.fills.forEach(function (p) {
        p.style.opacity = f;
      });
      s.label.style.opacity = easeOut(
        Math.min(Math.max((k - 0.4) / 0.2, 0), 1),
      );
      s.txt.style.opacity = easeOut(Math.min(Math.max((k - 0.5) / 0.2, 0), 1));
    });
  }

  let shown8 = 0;
  let running8 = false;

  function tick8() {
    const target = getProgress8();
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    shown8 = reduce ? target : shown8 + (target - shown8) * SMOOTH_8;
    if (Math.abs(target - shown8) < 0.0005) shown8 = target;
    drawBlock8(shown8);
    if (shown8 !== target) {
      window.requestAnimationFrame(tick8);
    } else {
      running8 = false;
    }
  }

  function onScroll8() {
    if (running8) return;
    running8 = true;
    window.requestAnimationFrame(tick8);
  }

  if (block8) {
    window.addEventListener("scroll", onScroll8, { passive: true });
    window.addEventListener("resize", onScroll8);
    shown8 = getProgress8();
    drawBlock8(shown8);
  }

  // \\\\\\\\\\\\\\\\\\\\\\\\\\\\\
  // block9 — «музыка, которую можно держать в руках» + финальный круг
  //
  // прогресс секции от 0 до 1:
  // 0    – 0.12   заголовок
  // 0.06 – 0.2    первый абзац
  // 0.12 – 0.26   второй абзац
  // 0.22 – 0.34   справа от текста прочерчиваются орбиты (текст остаётся)
  // 0.3  – 0.9    строки цитаты проявляются по очереди, песня за песней
  // 0.9  – 1      пауза
  //
  // круг всё время медленно вращается сам по себе (не от скролла).
  // у каждой орбиты своя скорость: она чуть «гуляет» вокруг общей, поэтому
  // строки слегка смещаются друг относительно друга, но песни не рассыпаются.
  // строки одной орбиты (из разных песен) всегда едут вместе и не сталкиваются

  const block9 = document.querySelector(".block9");
  const b9Title = document.querySelector(".block9_title");
  const b9Ps = document.querySelectorAll(".b9_p");
  const b9Svg = document.querySelector(".b9_rings");
  const SMOOTH_9 = 0.09;

  const B9 = {
    cx: 1015, // центр круга, px макета: круг справа от текста
    cy: 545,
    r0: 330, // орбита заголовков
    size: 21, // кегль строк
    gap: 1, // зазор между орбитами
    step: 3.5, // насколько каждая строка начинается дальше предыдущей, °
    speed: 1.6, // общая скорость вращения, ° в секунду
    sway: 5, // насколько орбиты «гуляют» друг относительно друга, °
  };

  // четыре «песни» по четвертям круга: [начало в °, заголовок, подпись, строки]
  const B9_SONGS = [
    [
      160,
      "Аура",
      "Беньямин · 1936",
      [
        "эту ауру можно определить",
        "как уникальное ощущение дали,",
        "как бы близок",
        "при этом предмет ни был ·",
        "скользить взглядом",
      ],
    ],
    [
      250,
      "Даль",
      "II",
      [
        "во время летнего",
        "послеполуденного отдыха",
        "по линии горной гряды",
        "на горизонте или ветви,",
        "под сенью которой проходит",
        "отдых, — это значит вдыхать",
        "ауру этих гор, этой ветви",
      ],
    ],
    [
      355,
      "Здесь и сейчас",
      "III",
      [
        "здесь и сейчас оригинала",
        "определяют понятие",
        "его подлинности ·",
        "все, что связано",
        "с подлинностью,",
      ],
    ],
    [
      70,
      "Подлинность",
      "IV",
      [
        "недоступно технической —",
        "и, разумеется,",
        "не только технической —",
        "репродукции ·",
      ],
    ],
  ];
  const B9_JITTER = [0, 3, -2, 4, 1, -3, 2, 5, -1, 3, 0, 2];

  const SVGNS = "http://www.w3.org/2000/svg";
  const b9Orbits = []; // { r, circle, len, group, phase, k }
  const b9Lines = []; // { el, order }

  function svgEl(tag, attrs, parent) {
    const el = document.createElementNS(SVGNS, tag);
    Object.keys(attrs).forEach(function (k) {
      el.setAttribute(k, attrs[k]);
    });
    if (parent) parent.appendChild(el);
    return el;
  }

  // путь-круг, начинающийся в точке под углом a (по часовой)
  function circlePath(r, aDeg) {
    const a = (aDeg * Math.PI) / 180;
    const x1 = B9.cx + r * Math.cos(a);
    const y1 = B9.cy + r * Math.sin(a);
    const x2 = B9.cx - r * Math.cos(a);
    const y2 = B9.cy - r * Math.sin(a);
    return (
      "M" +
      x1 +
      " " +
      y1 +
      "A" +
      r +
      " " +
      r +
      " 0 1 1 " +
      x2 +
      " " +
      y2 +
      "A" +
      r +
      " " +
      r +
      " 0 1 1 " +
      x1 +
      " " +
      y1
    );
  }

  function orbitAt(index, r) {
    if (b9Orbits[index]) return b9Orbits[index];
    const o = { r: r };
    o.circle = svgEl(
      "circle",
      { class: "b9_orbit", cx: B9.cx, cy: B9.cy, r: r - 2, pathLength: 1 },
      b9Svg,
    );
    // строки каждой орбиты — в отдельном svg-слое поверх сцены. слой крутится
    // css-трансформом: браузер один раз рисует текст и дальше только
    // поворачивает готовую картинку на видеокарте, без перерисовки букв
    o.layer = svgEl(
      "svg",
      {
        class: "b9_layer",
        viewBox: "0 0 1440 1024",
        fill: "none",
        "aria-hidden": "true",
      },
      null,
    );
    o.group = o.layer;
    // своя скорость: каждая орбита по-своему «гуляет» вокруг общей
    o.phase = index * 1.7;
    o.k = 0.55 + ((index * 37) % 10) / 20;
    b9Orbits[index] = o;
    return o;
  }

  function buildB9() {
    if (!b9Svg) return;
    let order = 0;
    // индекс 0 — орбита заголовков, дальше орбиты строк
    orbitAt(0, B9.r0);
    B9_SONGS.forEach(function (song, si) {
      const a0 = song[0];
      song[3].forEach(function (_, i) {
        orbitAt(i + 1, B9.r0 - 32 - i * (B9.size + B9.gap));
      });
      // заголовок
      const hid = "b9p" + si + "h";
      svgEl("path", { id: hid, d: circlePath(B9.r0, a0) }, b9Orbits[0].group);
      const ht = svgEl("text", { class: "b9_head" }, b9Orbits[0].group);
      const htp = svgEl("textPath", { href: "#" + hid }, ht);
      htp.textContent = song[1];
      const sub = svgEl("tspan", { class: "b9_sub", dx: 8, dy: -12 }, htp);
      sub.textContent = song[2];
      b9Lines.push({ el: ht, order: order++ });
      // строки
      song[3].forEach(function (line, i) {
        const o = b9Orbits[i + 1];
        const id = "b9p" + si + "_" + i;
        const a = a0 + 4 + i * B9.step + B9_JITTER[i % B9_JITTER.length];
        svgEl("path", { id: id, d: circlePath(o.r, a) }, o.group);
        const t = svgEl("text", { class: "b9_line" }, o.group);
        const tp = svgEl("textPath", { href: "#" + id }, t);
        tp.textContent = line;
        b9Lines.push({ el: t, order: order++ });
      });
    });
    // слои строк — поверх круга с орбитами
    // каждый слой крутится вокруг центра круга, а не центра сцены
    const origin = (B9.cx / 1440) * 100 + "% " + (B9.cy / 1024) * 100 + "%";
    b9Orbits.forEach(function (o) {
      o.layer.style.transformOrigin = origin;
      b9Svg.parentNode.appendChild(o.layer);
    });
  }
  buildB9();

  function getProgress9() {
    const rect = block9.getBoundingClientRect();
    const scrollable = block9.offsetHeight - window.innerHeight;
    return Math.min(Math.max(-rect.top / scrollable, 0), 1);
  }

  let b9RingsOn = 0; // видны ли орбиты — от этого зависит вращение

  function drawBlock9(progress) {
    [
      [b9Title, 0, 0.12],
      [b9Ps[0], 0.06, 0.2],
      [b9Ps[1], 0.12, 0.26],
    ].forEach(function (st) {
      const k = easeOut(part(progress, st[1], st[2]));
      st[0].style.opacity = k;
      st[0].style.transform = "translateY(" + (1 - k) * 1.5 + "cqw)";
    });

    // орбиты прочерчиваются от центра наружу
    b9Orbits.forEach(function (o, i) {
      const from = 0.22 + (b9Orbits.length - 1 - i) * 0.008;
      const k = ease(part(progress, from, from + 0.06));
      o.circle.style.strokeDasharray = k >= 1 ? "none" : k + " " + (1.01 - k);
    });
    b9RingsOn = part(progress, 0.22, 0.24);

    // строки по очереди
    const n = b9Lines.length;
    b9Lines.forEach(function (l) {
      const from = 0.3 + (l.order / n) * 0.56;
      l.el.style.opacity = easeOut(part(progress, from, from + 0.04));
    });
    startB9();
  }

  // вращение
  let b9Running = false;
  let b9Visible = false;
  const b9Start = performance.now();

  function spinB9(now) {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const t = reduce ? 0 : (now - b9Start) / 1000;
    b9Orbits.forEach(function (o) {
      const a = t * B9.speed + Math.sin(t * 0.25 * o.k + o.phase) * B9.sway;
      o.layer.style.transform = "rotate(" + a + "deg)";
    });
  }

  function b9Frame(now) {
    spinB9(now);
    if (b9Visible && b9RingsOn > 0) {
      window.requestAnimationFrame(b9Frame);
    } else {
      b9Running = false;
    }
  }

  function startB9() {
    if (b9Running || !b9Svg) return;
    b9Running = true;
    window.requestAnimationFrame(b9Frame);
  }

  let shown9 = 0;
  let running9 = false;

  function tick9() {
    const target = getProgress9();
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    shown9 = reduce ? target : shown9 + (target - shown9) * SMOOTH_9;
    if (Math.abs(target - shown9) < 0.0005) shown9 = target;
    drawBlock9(shown9);
    if (shown9 !== target) {
      window.requestAnimationFrame(tick9);
    } else {
      running9 = false;
    }
  }

  function onScroll9() {
    if (running9) return;
    running9 = true;
    window.requestAnimationFrame(tick9);
  }

  if (block9) {
    window.addEventListener("scroll", onScroll9, { passive: true });
    window.addEventListener("resize", onScroll9);
    new IntersectionObserver(function (entries) {
      b9Visible = entries[0].isIntersecting;
      if (b9Visible) startB9();
    }).observe(block9);
    shown9 = getProgress9();
    drawBlock9(shown9);
  }

  // \\\\\\\\\\\\\\\\\\\\\\\\\\\\\
  // бегущая строка: одинаковое видимое расстояние сверху и снизу.
  // над ней — пустой низ 8 экрана (текст стоит по центру), под ней — отступ
  // до заголовка 9 экрана. считаем оба и добиваем меньший до большего
  const marquee = document.querySelector(".marquee");
  const MARQUEE_GAP = 0; // минимальный добавочный отступ, доля высоты окна

  function fitMarquee() {
    if (!marquee || !block8 || !block9) return;
    const s8 = document.querySelector(".block8_sticky").getBoundingClientRect();
    const t8 = document.querySelector(".block8_text").getBoundingClientRect();
    const above = s8.height - (t8.bottom - s8.top); // пусто под текстом 8 экрана

    const st9 = document.querySelector(".block9_stage").getBoundingClientRect();
    const s9 = document.querySelector(".block9_sticky").getBoundingClientRect();
    let below = st9.top - s9.top + st9.width * 0.0694; // до заголовка 9 экрана
    // на планшете и мобилке заголовок стоит в другом месте сцены
    if (bp() !== "d")
      below =
        st9.top - s9.top + document.querySelector(".block9_title").offsetTop;

    const gap = Math.max(above, below) + window.innerHeight * MARQUEE_GAP;
    marquee.style.paddingTop = gap - above + "px";
    marquee.style.paddingBottom = gap - below + "px";
  }

  if (document.fonts && document.fonts.ready)
    document.fonts.ready.then(fitMarquee);
  fitMarquee();
  window.addEventListener("resize", fitMarquee);

  // \\\\\\\\\\\\\\\\\\\\\\\\\\\\\
  // свечение линий: говорим canvas из java-script.js, какие линии светятся.
  // он сам берёт их форму, положение, прозрачность и сколько уже нарисовано
  if (window.glow) {
    // 1 экран: кольца. r — радиус круга в долях ширины svg-картинки
    const RING_R = [
      511 / 1524,
      411.5 / 1325,
      314 / 1130,
      229 / 960,
      147 / 796,
      74 / 650,
    ];
    document.querySelectorAll(".ring_line").forEach(function (img, i) {
      // у самого большого кольца линия 80% яркости — и свечение тоже
      window.glow.add({
        el: img,
        kind: "ring",
        r: RING_R[i],
        gain: i === 0 ? 0.8 : 1,
      });
    });

    // 2 экран: прямая (в svg от x=250 до 1627 из 1877, y=251 из 503) и кривая
    const g2line = document.querySelector(".graph_line img");
    if (g2line) {
      window.glow.add({
        el: g2line,
        kind: "line",
        x1: 250 / 1877,
        x2: 1627 / 1877,
        y: 251.348 / 503,
      });
    }
    const g2curve = document.querySelector(".graph_curve_line path");
    if (g2curve) window.glow.add({ el: g2curve, kind: "svg", dash: g2curve });

    // 3 экран: эллипсы диска; сколько нарисовано — по их маскам
    const diskEls = document.querySelectorAll(".disk_ellipse");
    const diskDash = document.querySelectorAll(".disk_mask_path");
    // свечение берёт нарисованный кусок напрямую, а не из пунктира маски:
    // на iPhone пунктир эллипса считается иначе, и свет обгонял линию
    diskEls.forEach(function (el, i) {
      window.glow.add({
        el: el,
        kind: "svg",
        range: function () {
          return diskDrawn[i] || null;
        },
      });
    });

    // 4 экран: волна
    const wave = document.querySelector(".wave_line_path");
    if (wave) {
      window.glow.add({
        el: wave,
        kind: "svg",
        dash: document.querySelector(".wave_mask_path"),
      });
    }

    // 5 экран: ступени
    const stepsEl = document.querySelector(".steps_line");
    if (stepsEl) {
      window.glow.add({
        el: stepsEl,
        kind: "svg",
        // ступени — прямые линии, поэтому свечению передаём долю напрямую
        drawn: function () {
          return stepsDrawn;
        },
      });
    }

    // 5 экран: вторая обводка столбика винила — свечение у него сильнее
    const vinylHlEl = document.querySelector(".vinyl_hl");
    if (vinylHlEl) window.glow.add({ el: vinylHlEl, kind: "svg" });
    document.querySelectorAll(".sale_bar").forEach(function (el) {
      window.glow.add({ el: el, kind: "svg", gain: 0.7 });
    });

    // 6 экран: линия и кружок
    const b6line = document.querySelector(".b6_line_svg");
    if (b6line) window.glow.add({ el: b6line, kind: "line" });
    const b6point = document.querySelector(".b6_point_svg");
    if (b6point) window.glow.add({ el: b6point, kind: "ring", r: 23 / 48 });

    // 7 экран: большой круг
    const b7c = document.querySelector(".b7_circle_line");
    if (b7c) {
      window.glow.add({
        el: b7c,
        kind: "svg",
        range: function () {
          return [0, b7Drawn * b7c.getTotalLength()];
        },
      });
    }

    // 8 экран: все линии и точки рисунков (у скрытых шагов свечение не считается)
    b8Parts.forEach(function (s) {
      if (!s.draws.length) return;
      // все линии рисунка — одним источником свечения (так в разы легче)
      window.glow.add({
        el: s.draws[0],
        parts: Array.prototype.slice.call(s.draws),
        kind: "svg",
        drawn: function () {
          return s.drawn || 0;
        },
      });
    });
    b8Parts.forEach(function (s) {
      if (!s.fills.length) return;
      window.glow.add({
        el: s.fills[0],
        parts: Array.prototype.slice.call(s.fills),
        kind: "svg",
        gain: 0.6,
        drawn: function () {
          return parseFloat(s.fills[0].style.opacity) > 0.01 ? 1 : 0;
        },
      });
    });
  }

  // \\\\\\\\\\\\\\\
  // подвал: «Источники» раскрываются по клику,
  // а угловые подписи прячутся, как только подвал показался снизу

  const footer = document.querySelector(".footer");
  const sources = document.querySelector(".sources");
  const sourcesBtn = document.querySelector(".sources_btn");

  if (footer) {
    new IntersectionObserver(function (entries) {
      document.documentElement.classList.toggle(
        "is_footer",
        entries[0].isIntersecting,
      );
    }).observe(footer);
  }

  if (sources && sourcesBtn) {
    sourcesBtn.addEventListener("click", function () {
      const open = !sources.classList.contains("is_open");
      sources.classList.toggle("is_open", open);
      sourcesBtn.setAttribute("aria-expanded", open);
      if (!open) return;
      // когда список раскрылся — мягко докручиваем, чтобы он был виден
      window.setTimeout(function () {
        if (window.lenis) {
          window.lenis.resize();
          window.lenis.scrollTo(document.documentElement.scrollHeight);
        } else {
          window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: "smooth",
          });
        }
      }, 650); // ждём, пока список раскроется (0.6с в css)
    });
  }
});
