window.cinematicBlast = function (x, y) {
  var flash = document.createElement("div");
  flash.style.cssText =
    "position:fixed;inset:0;z-index:999990;pointer-events:none;" +
    "background:radial-gradient(circle at " + x + "px " + y + "px," +
    "rgba(255,255,235,.98) 0,rgba(255,190,55,.88) 5%," +
    "rgba(255,72,15,.55) 13%,rgba(60,10,0,.12) 26%,transparent 45%);" +
    "opacity:1;transition:opacity .42s ease-out";

  var wave = document.createElement("div");
  wave.style.cssText =
    "position:fixed;left:" + x + "px;top:" + y + "px;" +
    "width:12px;height:12px;border:5px solid rgba(255,235,170,.9);" +
    "border-radius:50%;z-index:999991;pointer-events:none;" +
    "transform:translate(-50%,-50%) scale(.2);" +
    "box-shadow:0 0 30px #ff8a20,0 0 65px #ff3c00;" +
    "transition:transform .55s ease-out,opacity .55s ease-out";

  document.body.appendChild(flash);
  document.body.appendChild(wave);

  var canvas = document.getElementById("game");
  if (canvas) {
    canvas.animate(
      [
        { transform: "translate(0,0)" },
        { transform: "translate(-7px,4px)" },
        { transform: "translate(6px,-4px)" },
        { transform: "translate(-4px,-2px)" },
        { transform: "translate(3px,2px)" },
        { transform: "translate(0,0)" }
      ],
      { duration: 430, easing: "ease-out" }
    );
  }

  requestAnimationFrame(function () {
    flash.style.opacity = "0";
    wave.style.transform = "translate(-50%,-50%) scale(15)";
    wave.style.opacity = "0";
  });

  setTimeout(function () {
    flash.remove();
    wave.remove();
  }, 650);
};
