document.addEventListener("DOMContentLoaded", function () {
  // \\\\\\\\\\\\\\\\\\\\\\\\\\\\\
  // плавная прокрутка (библиотека Lenis)
  // lerp — насколько мягко страница догоняет колесо: меньше = плавнее

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  if (typeof Lenis !== "undefined" && !reduceMotion) {
    const lenis = new Lenis({
      lerp: 0.03,
      wheelMultiplier: 1,
    });

    function raf(time) {
      lenis.raf(time);
      window.requestAnimationFrame(raf);
    }
    window.requestAnimationFrame(raf);

    // доступ из screens.js (блокировка скролла на обложке)
    window.lenis = lenis;
  }

  // \\\\\\\\\\\\\\\\\\\\\\\\\\\\\
  // общее: курсор
});
