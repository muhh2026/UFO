// Intro-Splashscreen für UFO-Jagd: Nachtangriff.
// Wird per Klick, beliebiger Taste oder automatisch nach 6 s beendet,
// danach ist das Hauptmenü (#message) sichtbar.
(function () {
  var intro = document.getElementById("intro");
  if (!intro) return;
  var done = false;

  function endIntro() {
    if (done) return;
    done = true;
    intro.classList.add("hide");
    setTimeout(function () {
      if (intro.parentNode) intro.parentNode.removeChild(intro);
    }, 650);
    var c = document.getElementById("game");
    if (c && c.focus) c.focus();
  }

  intro.addEventListener("click", endIntro);
  intro.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") endIntro();
  });
  // beliebige Taste überspringt das Intro
  document.addEventListener("keydown", function () {
    endIntro();
  });
  // automatisches Weiterleitung nach 6 Sekunden
  setTimeout(endIntro, 6000);
})();
