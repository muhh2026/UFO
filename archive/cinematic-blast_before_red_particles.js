window.cinematicBlast = function (x, y) {
  var flash = document.createElement("div");
  flash.style.cssText =
    "position:fixed;inset:0;z-index:999990;pointer-events:none;" +
    "background:radial-gradient(circle at " + x + "px " + y + "px," +
    "rgba(255,255,235,.98) 0,rgba(255,190,55,.88) 5%," +
    "rgba(255,72,15,.55) 13%,rgba(60,10,0,.12) 26%,transparent 45%);" +
    "opacity:1;transition:opacity .42s ease-out";

  var fireball = document.createElement("div");
  fireball.style.cssText = "position:fixed;left:"+x+"px;top:"+y+"px;width:90px;height:90px;border-radius:50%;z-index:999992;pointer-events:none;transform:translate(-50%,-50%) scale(.12);background:radial-gradient(circle at 38% 35%,#ffffff 0%,#fff6a0 10%,#ffd12f 24%,#ff8a18 42%,#ff3b0f 60%,#9b1200 78%,transparent 100%);box-shadow:0 0 26px #fff3a0,0 0 55px #ff8a18,0 0 95px rgba(255,45,0,.75);opacity:1;transition:transform .50s ease-out,opacity .85s ease-out";

  var wave = document.createElement("div");
  wave.style.cssText =
    "position:fixed;left:" + x + "px;top:" + y + "px;" +
    "width:12px;height:12px;border:5px solid rgba(255,235,170,.9);" +
    "border-radius:50%;z-index:999991;pointer-events:none;" +
    "transform:translate(-50%,-50%) scale(.2);" +
    "box-shadow:0 0 30px #ff8a20,0 0 65px #ff3c00;" +
    "transition:transform .55s ease-out,opacity .55s ease-out";

  document.body.appendChild(flash);
  document.body.appendChild(fireball);
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
    fireball.style.transform = "translate(-50%,-50%) scale(2.8)";
    fireball.style.opacity = "0";
    wave.style.transform = "translate(-50%,-50%) scale(15)";
    wave.style.opacity = "0";
  });

  setTimeout(function () {
    flash.remove();
    wave.remove();
  }, 650);
};
