/* ShowShung Skeleton Mascot — fixed lying skeleton at the bottom of the page.
   Cycles through subtle moods (idle/wave/look/sleep/wake/react), hides on
   scroll-down, reacts to taps. Disabled if body[data-mascot-disabled="true"]. */
(function () {
  function init() {
    const mascot = document.getElementById("ssMascot");
    if (!mascot) return;

    if (document.body.dataset.mascotDisabled === "true") {
      mascot.remove();
      return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      mascot.className = "ss-mascot is-idle";
      return;
    }

    const ACTIONS = [
      { className: "is-wave",  duration: 1500, weight: 28 },
      { className: "is-look",  duration: 2300, weight: 26 },
      { className: "is-react", duration: 1300, weight: 18 },
      { className: "is-sleep", duration: 3900, weight: 18 },
      { className: "is-wake",  duration: 1000, weight: 10 }
    ];

    let actionTimer = null, resetTimer = null;
    let lastScrollY = window.scrollY;
    let isBusy = false;

    function setAction(cls) { mascot.className = "ss-mascot " + cls; }
    function idle()         { isBusy = false; setAction("is-idle"); }

    function weightedRandom() {
      const total = ACTIONS.reduce((s, a) => s + a.weight, 0);
      let r = Math.random() * total;
      for (const a of ACTIONS) { r -= a.weight; if (r <= 0) return a; }
      return ACTIONS[0];
    }

    function runRandomAction() {
      if (document.hidden || isBusy) return;
      const a = weightedRandom();
      isBusy = true;
      setAction(a.className);
      clearTimeout(resetTimer);
      resetTimer = setTimeout(idle, a.duration);
    }

    function scheduleLoop() {
      clearInterval(actionTimer);
      actionTimer = setInterval(runRandomAction, 6200 + Math.random() * 2600);
    }

    // User asked the mascot stays always visible — no scroll hiding
    function onScroll() { /* no-op */ }

    // Tap reaction (rate-limited)
    document.addEventListener("click", function (e) {
      const t = e.target.closest("button, [role='button'], .btn, a[href]");
      if (!t || isBusy) return;
      isBusy = true;
      setAction("is-react");
      clearTimeout(resetTimer);
      resetTimer = setTimeout(idle, 950);
    });

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { clearInterval(actionTimer); idle(); }
      else                 { scheduleLoop(); }
    });
    window.addEventListener("scroll", onScroll, { passive: true });

    idle();
    scheduleLoop();

    window.ShowShungMascot = {
      wave:  () => { setAction("is-wave");  setTimeout(idle, 1500); },
      sleep: () => { setAction("is-sleep"); setTimeout(idle, 3900); },
      wake:  () => { setAction("is-wake");  setTimeout(idle, 1000); },
      hide:  () => mascot.classList.add("is-hidden"),
      show:  () => mascot.classList.remove("is-hidden")
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
