(function () {
  var c = document.getElementById("game"),
    x = c.getContext("2d"),
    box = document.getElementById("message"),
    L = document.getElementById("level"),
    S = document.getElementById("score"),
    T = document.getElementById("targets"),
    U = document.getElementById("ufoShot"),
    J = document.getElementById("jetShot"),
    SL = document.getElementById("slow"),
    SB = document.getElementById("slowBox"),
    LU = document.getElementById("levelUp"),
    W,
    H,
    stars = [],
    meteors = [],
    objects = [],
    sparks = [],
    raiders = [],
    fallingCows = [],
    fallingCowTargets = {},
    cowLandingX = {},
    cowLandingTime = {},
    raidSpawn = 0,
    stolen = {},
    high = [],
    ac = null,
    paused = 0,
    lost = 0,
    jetDown = 0,
    playerName = "Spieler",
    recorded = 0,
    slowUntil = 0,
    moonReady = 0,
    run = 0,
    score = 0,
    level = 1,
    hits = 0,
    spawn = 0,
    last = 0,
    muted = false;
  function resize() {
    W = innerWidth;
    H = innerHeight;
    c.width = W * devicePixelRatio;
    c.height = H * devicePixelRatio;
    x.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    stars = [];
    for (var i = 0; i < 220; i++)
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H * 0.63,
        r: Math.random() * 1.5 + 0.25,
        a: Math.random(),
        p: Math.random() * 6.28,
      });
    meteors = [];
    for (var m = 0; m < 5; m++)
      meteors.push({
        x: Math.random() * W,
        y: Math.random() * H * 0.42,
        p: Math.random() * 24000,
      });
  }
  addEventListener("resize", resize);
  resize();
  try {
    high = JSON.parse(localStorage.getItem("ufoScores") || "[]").map(
      function (v) {
        return typeof v === "object" ? v : { name: "Spieler", score: v };
      },
    );
  } catch (e) {
    high = [];
  }
  try {
    muted = localStorage.getItem("ufoMute") === "1";
  } catch (e) {
    muted = false;
  }
  function cheer() {
    LU.className = "";
    void LU.offsetWidth;
    LU.className = "celebrate";
    sound("ufo");
  }
  function ui() {
    L.textContent = level;
    S.textContent = score;
    T.textContent = hits + "/" + (7 + level);
    U.textContent = hits;
    J.textContent = jetDown + "/5";
  }
  function slowUi(t) {
    var left = Math.max(0, slowUntil - t),
      cool = Math.max(0, moonReady - t);
    SL.textContent = left
      ? Math.ceil(left / 1000) + "s"
      : cool
        ? "bereit in " + Math.ceil(cool / 1000) + "s"
        : "bereit";
    SB.style.display = "inline";
  }
  function sound(kind) {
    if (muted) return;
    try {
      if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === "suspended") ac.resume();
      var o = ac.createOscillator(),
        g = ac.createGain(),
        n = ac.currentTime;
      o.connect(g);
      g.connect(ac.destination);
      if (kind === "jet") {
        o.type = "sawtooth";
        o.frequency.setValueAtTime(120, n);
        o.frequency.exponentialRampToValueAtTime(55, n + 0.28);
        g.gain.setValueAtTime(0.06, n);
        g.gain.exponentialRampToValueAtTime(0.001, n + 0.3);
      } else if (kind === "ufo") {
        o.type = "sine";
        o.frequency.setValueAtTime(260, n);
        o.frequency.exponentialRampToValueAtTime(680, n + 0.18);
        g.gain.setValueAtTime(0.09, n);
        g.gain.exponentialRampToValueAtTime(0.001, n + 0.34);
      } else {
        o.type = "triangle";
        o.frequency.setValueAtTime(180, n);
        o.frequency.exponentialRampToValueAtTime(440, n + 0.08);
        g.gain.setValueAtTime(0.05, n);
        g.gain.exponentialRampToValueAtTime(0.001, n + 0.16);
      }
      o.start(n);
      o.stop(n + 0.38);
    } catch (z) {}
  }
  function add() {
    var used = {},
      free = [];
    for (var i = 0; i < objects.length; i++)
      if (objects[i].steal && objects[i].target !== null)
        used[objects[i].target] = 1;
    for (var n = 0; n < 10; n++) if (!stolen[n] && !used[n]) free.push(n);
    var mobile = matchMedia("(pointer:coarse)").matches,
      jet = Math.random() < (mobile ? 0.12 : 0.19),
      steal = !jet && free.length > 0 && Math.random() < (mobile ? 0.68 : 0.42),
      z = 0.26 + Math.random() * 0.54,
      s = 64 * z;
    objects.push({
      x: Math.random() > 0.5 ? -s : W + s,
      y: 70 + Math.random() * H * 0.42,
      z: z,
      v:
        (105 + Math.random() * 105 + (level - 1) * 24) *
        (1 +
          (score < 20000
            ? Math.floor(score / 5000)
            : 4 + Math.floor((score - 20000) / 100000)) *
            0.3) *
        (Math.random() > 0.5 ? 1 : -1),
      jet: jet,
      steal: steal,
      target: steal ? free[Math.floor(Math.random() * free.length)] : null,
      born: performance.now(),
      beamAt: performance.now() + 1800,
      p: Math.random() * 7,
    });
  }
  function ellipse(a, b, rx, ry, fill) {
    x.fillStyle = fill;
    x.beginPath();
    x.ellipse(a, b, rx, ry, 0, 0, Math.PI * 2);
    x.fill();
  }
  function jet(d, t) {
    var s = 70 * d.z,
      dir = d.v > 0 ? 1 : -1;
    x.save();
    x.translate(d.x, d.y + Math.sin(t / 390 + d.p) * s * 0.035);
    x.scale(dir, 1);
    x.rotate(-0.035);
    x.shadowColor = "#6bcffa";
    x.shadowBlur = s * 0.18;
    var m = x.createLinearGradient(0, -s * 0.85, 0, s * 0.5);
    m.addColorStop(0, "#f8ffff");
    m.addColorStop(0.1, "#c8d7dc");
    m.addColorStop(0.28, "#7e929d");
    m.addColorStop(0.52, "#465b67");
    m.addColorStop(0.76, "#22343f");
    m.addColorStop(1, "#0b171f");
    x.fillStyle = m;
    x.beginPath();
    x.moveTo(-s * 1.75, 0);
    x.lineTo(s * 1.6, 0);
    x.lineTo(s * 0.68, -s * 0.16);
    x.lineTo(s * 0.32, -s * 0.8);
    x.lineTo(-s * 0.12, -s * 0.76);
    x.lineTo(-s * 0.4, -s * 0.15);
    x.lineTo(-s * 1.12, -s * 0.6);
    x.lineTo(-s * 0.92, -s * 0.08);
    x.closePath();
    x.fill();
    x.save();
    x.globalAlpha = 0.32;
    x.strokeStyle = "#e8f8ff";
    x.lineWidth = Math.max(1, s * 0.022);
    x.beginPath();
    x.moveTo(-s * 1.28, -s * 0.08);
    x.quadraticCurveTo(0, -s * 0.19, s * 1.25, -s * 0.07);
    x.stroke();
    x.restore();
    var glass = x.createLinearGradient(
      -s * 0.35,
      -s * 0.75,
      s * 0.4,
      -s * 0.15,
    );
    glass.addColorStop(0, "#dffcff");
    glass.addColorStop(0.18, "#72b7cf");
    glass.addColorStop(0.45, "#28566d");
    glass.addColorStop(0.72, "#142f40");
    glass.addColorStop(1, "#07151f");
    x.fillStyle = glass;
    x.beginPath();
    x.moveTo(-s * 0.36, -s * 0.68);
    x.quadraticCurveTo(s * 0.13, -s * 0.84, s * 0.42, -s * 0.17);
    x.lineTo(-s * 0.25, -s * 0.18);
    x.closePath();
    x.fill();
    x.save();
    x.globalAlpha = 0.55;
    x.fillStyle = "#efffff";
    x.beginPath();
    x.ellipse(-s * 0.08, -s * 0.55, s * 0.2, s * 0.045, -0.22, 0, 7);
    x.fill();
    x.restore();
    x.fillStyle = "#0c263b";
    x.beginPath();
    x.moveTo(-s * 0.84, -s * 0.13);
    x.lineTo(-s * 0.08, -s * 0.14);
    x.lineTo(-s * 0.52, s * 0.48);
    x.lineTo(-s * 1.08, s * 0.15);
    x.closePath();
    x.fill();
    x.strokeStyle = "#e6ffff88";
    x.lineWidth = Math.max(1, s * 0.025);
    x.beginPath();
    x.moveTo(-s * 1.54, -s * 0.02);
    x.lineTo(s * 1.43, -s * 0.02);
    x.stroke();
    x.fillStyle = "#ff4f48";
    x.save();
    x.shadowColor = "#ff6a28";
    x.shadowBlur = s * 0.48;
    ellipse(-s * 1.42, 0, s * 0.18, s * 0.11, "#ff5729");
    ellipse(-s * 1.53, 0, s * 0.13, s * 0.075, "#ffbd38");
    ellipse(-s * 1.62, 0, s * 0.075, s * 0.04, "#fff6c2");
    x.globalAlpha = 0.42;
    ellipse(-s * 1.82, 0, s * 0.28, s * 0.055, "#ff7628");
    x.globalAlpha = 1;
    x.restore();
    x.fillStyle = "#8fffff";
    x.save();
    x.shadowColor = "#76ffff";
    x.shadowBlur = s * 0.3;
    ellipse(s * 0.27, -s * 0.35, s * 0.075, s * 0.075, "#aaffff");
    x.restore();
    x.restore();
  }
  function ufo(d, t) {
    var s = 48 * d.z,
      y = d.y + Math.sin(t / 460 + d.p) * s * 0.07;
    x.save();
    x.translate(d.x, y);
    if (d.steal && d.target !== null && t > d.beamAt) {
      stolen[d.target] = 1;
      var remaining = 10 - Object.keys(stolen).length;
      if (remaining <= 0 && !lost) {
        lost = 1;
        run = 0;
        box.style.display = "flex";
        box.innerHTML =
          '<div class="card"><div class="alien" aria-label="tanzendes Alien">👽</div><h1>MISSION VERLOREN</h1><p>Loser! Die UFOs waren schneller.</p><button id="start">NOCH EINMAL</button><button id="menu" style="margin-left:10px">ZUM STARTMENÜ</button><div class="scores"><b>HIGHSCORES</b><ol id="scores"></ol></div></div>';
        document.getElementById("start").onclick = reset;
        saveScore();
        showScores();
      }
      var places = [
          [0.07, 0.755],
          [0.11, 0.73],
          [0.18, 0.745],
          [0.25, 0.765],
          [0.33, 0.75],
          [0.43, 0.735],
          [0.53, 0.765],
          [0.64, 0.755],
          [0.72, 0.735],
          [0.76, 0.77],
          [0.82, 0.755],
          [0.88, 0.72],
          [0.95, 0.75],
        ],
        p0 = places[d.target],
        ground = H * p0[1] - y,
        lift = Math.min(
          1,
          (t - d.beamAt) /
            (3500 /
              (1 +
                (score < 20000
                  ? Math.floor(score / 5000)
                  : 4 + Math.floor((score - 20000) / 100000)) *
                  0.3)),
        );
      if (lift >= 1) {
        var left = 10 - Object.keys(stolen).length;
        if (left <= 0 && !lost) {
          lost = 1;
          run = 0;
          box.style.display = "flex";
          box.innerHTML =
            '<div class="card"><div class="alien" aria-label="tanzendes Alien">👽</div><h1>MISSION VERLOREN</h1><p>Loser! Die UFOs waren schneller.</p><button id="start">NOCH EINMAL</button><button id="menu" style="margin-left:10px">ZUM STARTMENÜ</button><div class="scores"><b>HIGHSCORES</b><ol id="scores"></ol></div></div>';
          document.getElementById("start").onclick = reset;
          saveScore();
          showScores();
        }
      }
      var ax = (W * p0[0] - d.x) * (1 - lift),
        ay = ground * (1 - lift) + s * 0.42 * lift,
        red = x.createLinearGradient(0, s * 0.18, ax, ay);
      red.addColorStop(0, "rgba(255,244,210,.9)");
      red.addColorStop(0.28, "rgba(255,75,55,.78)");
      red.addColorStop(1, "rgba(255,35,25,.06)");
      x.fillStyle = red;
      x.beginPath();
      x.moveTo(-s * 0.32, s * 0.2);
      x.lineTo(ax + s * 0.28, ay);
      x.lineTo(ax - s * 0.28, ay);
      x.lineTo(s * 0.32, s * 0.2);
      x.closePath();
      x.fill();
      x.strokeStyle = "rgba(255,125,92,.95)";
      x.lineWidth = 1;
      x.beginPath();
      x.moveTo(0, s * 0.16);
      x.lineTo(ax, ay);
      x.stroke();
      x.save();
      x.translate(ax, ay);
      x.globalAlpha = 0.92;
      x.shadowColor = "#ff4538";
      x.shadowBlur = 10;
      var cow = true;
      if (cow) {
        ellipse(-s * 0.04, 0, s * 0.48, s * 0.22, "#eee7d7");
        ellipse(s * 0.38, -s * 0.12, s * 0.15, s * 0.14, "#eee7d7");
        ellipse(-s * 0.14, 0, s * 0.12, s * 0.08, "#573d2d");
        ellipse(s * 0.18, s * 0.06, s * 0.1, s * 0.065, "#573d2d");
      } else {
        ellipse(0, 0, s * 0.4, s * 0.22, "#f3f0df");
        ellipse(s * 0.31, -s * 0.06, s * 0.13, s * 0.12, "#5c5549");
      }
      x.strokeStyle = "#ded4bc";
      x.lineWidth = Math.max(1, s * 0.035);
      x.beginPath();
      x.moveTo(-s * 0.18, s * 0.1);
      x.lineTo(-s * 0.14, s * 0.34);
      x.moveTo(s * 0.1, s * 0.1);
      x.lineTo(s * 0.14, s * 0.34);
      x.stroke();
      x.restore();
      x.save();
      x.globalAlpha = 0.25 + 0.12 * Math.sin(t / 130 + d.p);
      x.strokeStyle = "#c9ffff";
      x.lineWidth = Math.max(1, s * 0.018);
      x.beginPath();
      x.ellipse(0, s * 0.02, s * 1.58, s * 0.44, 0, 0, 7);
      x.stroke();
      x.restore();
    }
    var beam = x.createRadialGradient(
      0,
      s * 0.32,
      s * 0.05,
      0,
      s * 0.32,
      s * 2.25,
    );
    beam.addColorStop(0, "rgba(202,255,255,.8)");
    beam.addColorStop(0.22, "rgba(67,221,255,.3)");
    beam.addColorStop(1, "rgba(42,130,255,0)");
    x.fillStyle = beam;
    x.beginPath();
    x.ellipse(0, s * 0.32, s * 2.15, s * 0.94, 0, 0, 7);
    x.fill();
    x.shadowColor = "#55eaff";
    x.shadowBlur = s * 0.72;
    var hull = x.createLinearGradient(0, -s * 0.58, 0, s * 0.54);
    hull.addColorStop(0, "#f1fbff");
    hull.addColorStop(0.1, "#a9bdc7");
    hull.addColorStop(0.28, "#526977");
    hull.addColorStop(0.52, "#172632");
    hull.addColorStop(0.76, "#354b59");
    hull.addColorStop(1, "#050b11");
    x.fillStyle = hull;
    x.beginPath();
    x.ellipse(0, 0, s * 1.68, s * 0.5, 0, 0, 7);
    x.fill();
    x.save();
    x.globalAlpha = 0.22;
    x.fillStyle = "#eaffff";
    for (var pl = -1; pl <= 1; pl++) {
      x.beginPath();
      x.ellipse(pl * s * 0.55, -s * 0.12, s * 0.24, s * 0.05, 0, 0, 7);
      x.fill();
    }
    x.restore();
    x.fillStyle = "#071019";
    x.beginPath();
    x.ellipse(0, -s * 0.07, s * 1.4, s * 0.31, 0, 0, 7);
    x.fill();
    var dome = x.createRadialGradient(
      -s * 0.2,
      -s * 0.5,
      s * 0.04,
      0,
      -s * 0.34,
      s * 0.75,
    );
    dome.addColorStop(0, "#ffffff");
    dome.addColorStop(0.09, "#d8ffff");
    dome.addColorStop(0.25, "#72dce9");
    dome.addColorStop(0.52, "#246b82");
    dome.addColorStop(0.74, "#123b50");
    dome.addColorStop(1, "#061722");
    x.fillStyle = dome;
    x.beginPath();
    x.ellipse(0, -s * 0.34, s * 0.59, s * 0.36, 0, Math.PI, 0, true);
    x.fill();
    x.save();
    x.globalAlpha = 0.46;
    x.fillStyle = "#eaffff";
    x.beginPath();
    x.ellipse(-s * 0.2, -s * 0.48, s * 0.19, s * 0.07, -0.28, 0, 7);
    x.fill();
    x.globalAlpha = 0.18;
    x.beginPath();
    x.ellipse(s * 0.16, -s * 0.4, s * 0.12, s * 0.045, 0.2, 0, 7);
    x.fill();
    x.restore();
    x.strokeStyle = "#d7fbff88";
    x.lineWidth = Math.max(1, s * 0.028);
    x.beginPath();
    x.ellipse(0, 0, s * 1.55, s * 0.4, 0, 0, 7);
    x.stroke();
    for (var i = -2; i <= 2; i++) {
      ellipse(
        i * s * 0.5,
        s * 0.22,
        s * 0.09,
        s * 0.075,
        i === 0 ? "#ebff87" : "#77edff",
      );
    }
    x.restore();
  }
  function animals(t) {
    var taken = {};
    for (var n = 0; n < objects.length; n++)
      if (objects[n].steal && t > objects[n].beamAt)
        taken[objects[n].target] = 1;
    var herd = [
      [W * 0.07, H * 0.755, 0.3, "cow"],
      [W * 0.11, H * 0.73, 0.48, "cow"],
      [W * 0.18, H * 0.745, 0.28, "cow"],
      [W * 0.25, H * 0.765, 0.34, "cow"],
      [W * 0.33, H * 0.75, 0.25, "cow"],
      [W * 0.43, H * 0.735, 0.42, "cow"],
      [W * 0.53, H * 0.765, 0.27, "cow"],
      [W * 0.64, H * 0.755, 0.32, "cow"],
      [W * 0.72, H * 0.735, 0.29, "cow"],
      [W * 0.76, H * 0.77, 0.25, "cow"],
      [W * 0.82, H * 0.755, 0.27, "sheep"],
      [W * 0.88, H * 0.72, 0.5, "cow"],
      [W * 0.95, H * 0.75, 0.27, "sheep"],
      [W * 0.04, H * 0.79, 0.22, "sheep"],
      [W * 0.15, H * 0.785, 0.21, "sheep"],
      [W * 0.22, H * 0.78, 0.24, "cow"],
      [W * 0.3, H * 0.79, 0.2, "sheep"],
      [W * 0.38, H * 0.775, 0.23, "cow"],
      [W * 0.48, H * 0.79, 0.2, "sheep"],
      [W * 0.57, H * 0.78, 0.24, "cow"],
      [W * 0.69, H * 0.79, 0.21, "sheep"],
      [W * 0.79, H * 0.79, 0.22, "cow"],
      [W * 0.91, H * 0.785, 0.2, "sheep"],
    ].slice(0, 10);
    for (var i = 0; i < herd.length; i++) {
      if (taken[i] || stolen[i] || fallingCowTargets[i]) continue;
      var a = herd[i],
        xx = Object.prototype.hasOwnProperty.call(cowLandingX, i)
          ? cowLandingX[i]
          : a[0],
        yy = a[1],
        s = a[2] * 38,
        bob = Math.sin(t / 700 + i) * s * 0.035,
        breath = 1 + Math.sin(t / 850 + i) * 0.018;
      x.save();
      x.translate(xx, yy + bob);
      if (a[3] === "cow") x.scale(1.25, 1.25);
      x.scale(1, breath);
      x.globalAlpha = 0.93;
      if (a[3] === "cow") {
        var ph = Object.prototype.hasOwnProperty.call(cowLandingTime, i)
            ? (t - cowLandingTime[i]) / 1800
            : t / 1800 + i * 1.7,
          walk = Math.sin(ph) * Math.min(32, s * 1.8),
          dir = Math.cos(ph) >= 0 ? 1 : -1,
          step = Math.sin(t / 170 + i) * s * 0.035,
          legF = Math.sin(t / 230 + i) * s * 0.14,
          legR = Math.sin(t / 230 + i + Math.PI) * s * 0.14;
        x.translate(walk, step);
        x.scale(dir, 1);
        x.rotate(Math.sin(t / 700 + i) * 0.018);
        x.save();
        x.globalAlpha = 0.28;
        x.fillStyle = "#000";
        x.beginPath();
        x.ellipse(0, s * 0.78, s * 1.3, s * 0.18, 0, 0, 7);
        x.fill();
        x.restore();
        var f = x.createLinearGradient(0, -s * 0.65, 0, s * 0.65);
        f.addColorStop(0, "#fffdf4");
        f.addColorStop(0.48, "#e9e5d9");
        f.addColorStop(1, "#aaa79f");
        x.fillStyle = f;
        x.beginPath();
        x.ellipse(-s * 0.18, -s * 0.03, s * 1.28, s * 0.58, -0.025, 0, 7);
        x.fill();
        x.fillStyle = "#2d2c29";
        x.beginPath();
        x.ellipse(-s * 0.55, -s * 0.12, s * 0.38, s * 0.29, -0.4, 0, 7);
        x.ellipse(s * 0.15, s * 0.14, s * 0.32, s * 0.2, 0.25, 0, 7);
        x.ellipse(-s * 0.02, -s * 0.34, s * 0.2, s * 0.13, 0.25, 0, 7);
        x.fill();
        var headBob = Math.sin(t / 480 + i) * s * 0.045,
          headAngle = Math.sin(t / 720 + i) * 0.055;
        x.save();
        x.translate(s * 0.55, -s * 0.2);
        x.rotate(headAngle);
        x.translate(-s * 0.55, s * 0.2 + headBob);
        x.fillStyle = "#ddd8ca";
        x.beginPath();
        x.moveTo(s * 0.55, -s * 0.2);
        x.quadraticCurveTo(s * 0.62, -s * 0.55, s * 0.82, -s * 0.58);
        x.lineTo(s * 0.91, -s * 0.17);
        x.closePath();
        x.fill();
        x.fillStyle = "#f0ebe0";
        x.beginPath();
        x.ellipse(s * 0.94, -s * 0.32, s * 0.39, s * 0.34, -0.1, 0, 7);
        x.fill();
        x.fillStyle = "#dba7a3";
        x.beginPath();
        x.ellipse(s * 1.1, -s * 0.12, s * 0.29, s * 0.18, 0, 0, 7);
        x.fill();
        x.fillStyle = "#5a3b37";
        x.beginPath();
        x.arc(s * 0.99, -s * 0.13, Math.max(1, s * 0.038), 0, 7);
        x.arc(s * 1.2, -s * 0.13, Math.max(1, s * 0.038), 0, 7);
        x.fill();
        x.fillStyle = "#171713";
        x.beginPath();
        x.arc(s * 0.97, -s * 0.38, Math.max(1, s * 0.058), 0, 7);
        x.fill();
        x.fillStyle = "#fff";
        x.beginPath();
        x.arc(s * 0.99, -s * 0.4, Math.max(1, s * 0.019), 0, 7);
        x.fill();
        x.fillStyle = "#ded2b9";
        x.beginPath();
        x.ellipse(s * 0.67, -s * 0.5, s * 0.22, s * 0.1, -0.4, 0, 7);
        x.ellipse(s * 1.12, -s * 0.52, s * 0.22, s * 0.1, 0.38, 0, 7);
        x.fill();
        x.strokeStyle = "#d7c39a";
        x.lineWidth = Math.max(1, s * 0.055);
        x.beginPath();
        x.moveTo(s * 0.72, -s * 0.57);
        x.lineTo(s * 0.62, -s * 0.75);
        x.moveTo(s * 1.04, -s * 0.59);
        x.lineTo(s * 1.16, -s * 0.76);
        x.stroke();
        x.restore();
        x.strokeStyle = "#c8c0b1";
        x.lineWidth = Math.max(1, s * 0.12);
        x.lineCap = "round";
        x.beginPath();
        x.moveTo(-s * 0.72, s * 0.28);
        x.lineTo(-s * 0.72 + legR, s * 0.73);
        x.moveTo(-s * 0.3, s * 0.31);
        x.lineTo(-s * 0.3 - legR, s * 0.76);
        x.moveTo(s * 0.31, s * 0.3);
        x.lineTo(s * 0.31 - legF, s * 0.74);
        x.moveTo(s * 0.63, s * 0.25);
        x.lineTo(s * 0.63 + legF, s * 0.69);
        x.stroke();
        x.strokeStyle = "#26251f";
        x.lineWidth = Math.max(1, s * 0.14);
        x.beginPath();
        x.moveTo(-s * 0.72 + legR, s * 0.7);
        x.lineTo(-s * 0.72 + legR, s * 0.8);
        x.moveTo(-s * 0.3 - legR, s * 0.73);
        x.lineTo(-s * 0.3 - legR, s * 0.82);
        x.moveTo(s * 0.31 - legF, s * 0.71);
        x.lineTo(s * 0.31 - legF, s * 0.8);
        x.moveTo(s * 0.63 + legF, s * 0.66);
        x.lineTo(s * 0.63 + legF, s * 0.76);
        x.stroke();
        x.fillStyle = "#d6a09d";
        x.beginPath();
        x.ellipse(-s * 0.04, s * 0.43, s * 0.26, s * 0.14, 0, 0, 7);
        x.fill();
        x.strokeStyle = "#bd7f7f";
        x.lineWidth = Math.max(1, s * 0.035);
        x.beginPath();
        x.moveTo(-s * 0.14, s * 0.49);
        x.lineTo(-s * 0.14, s * 0.64);
        x.moveTo(s * 0.06, s * 0.49);
        x.lineTo(s * 0.06, s * 0.64);
        x.stroke();
        x.strokeStyle = "#887c6b";
        x.lineWidth = Math.max(1, s * 0.06);
        x.beginPath();
        x.moveTo(-s * 1.16, -s * 0.04);
        x.quadraticCurveTo(
          -s * 1.48,
          s * 0.08,
          -s * 1.3 + Math.sin(t / 330 + i) * s * 0.28,
          s * 0.48,
        );
        x.stroke();
        x.fillStyle = "#37332c";
        x.beginPath();
        x.ellipse(
          -s * 1.3 + Math.sin(t / 330 + i) * s * 0.28,
          s * 0.5,
          s * 0.1,
          s * 0.16,
          0.25,
          0,
          7,
        );
        x.fill();
        x.save();
        x.globalAlpha = 0.22;
        var g = x.createRadialGradient(
          -s * 0.45,
          -s * 0.35,
          s * 0.05,
          -s * 0.1,
          0,
          s * 1.2,
        );
        g.addColorStop(0, "#fff");
        g.addColorStop(1, "rgba(255,255,255,0)");
        x.fillStyle = g;
        x.beginPath();
        x.ellipse(-s * 0.15, -s * 0.05, s * 1.05, s * 0.43, 0, 0, 7);
        x.fill();
        x.restore();
      } else {
        var wool = x.createRadialGradient(
          -s * 0.2,
          -s * 0.2,
          s * 0.04,
          0,
          0,
          s * 1.1,
        );
        wool.addColorStop(0, "#fffdf0");
        wool.addColorStop(0.68, "#e7e4d6");
        wool.addColorStop(1, "#b9b7aa");
        x.fillStyle = wool;
        for (var z = -0.45; z <= 0.45; z += 0.23) {
          x.beginPath();
          x.arc(z * s, -s * 0.03, s * 0.34, 0, 7);
          x.fill();
        }
        x.fillStyle = "#5a5a50";
        x.beginPath();
        x.ellipse(s * 0.78, -s * 0.07, s * 0.28, s * 0.25, 0, 0, 7);
        x.fill();
        x.fillStyle = "#1b1d1a";
        x.beginPath();
        x.arc(s * 0.88, -s * 0.14, Math.max(1, s * 0.035), 0, 7);
        x.fill();
        x.strokeStyle = "#494a40";
        x.lineWidth = Math.max(1, s * 0.06);
        for (var r = -0.35; r < 0.6; r += 0.38) {
          x.beginPath();
          x.moveTo(r * s, s * 0.25);
          x.lineTo(r * s, s * 0.65);
          x.stroke();
        }
      }
      x.restore();
    }
  }
  function pets(t) {
    if (
      window.fatalHideKind === "pet" &&
      performance.now() < window.fatalHideUntil
    )
      return;
    var phase = Math.floor(t / 12000) % 3;
    if (phase !== 1) return;
    var p = (t % 12000) / 12000,
      xx = W * (0.12 + p * 0.72),
      yy = H * 0.775 + Math.sin(p * 18) * 3,
      dog = Math.floor(t / 12000) % 2 === 0,
      s = 13,
      gait = Math.sin(t / 115),
      gait2 = Math.sin(t / 115 + Math.PI),
      bob = Math.abs(Math.sin(t / 115)) * 2;
    x.save();
    x.translate(xx, yy - bob);
    x.globalAlpha = 0.96;
    x.save();
    x.globalAlpha = 0.28;
    x.fillStyle = "#000";
    x.beginPath();
    x.ellipse(0, s * 0.72, s * 1.25, s * 0.16, 0, 0, 7);
    x.fill();
    x.restore();
    if (dog) {
      var fur = x.createLinearGradient(0, -s * 0.55, 0, s * 0.6);
      fur.addColorStop(0, "#c9945d");
      fur.addColorStop(0.55, "#9b673c");
      fur.addColorStop(1, "#5f3c24");
      x.fillStyle = fur;
      x.beginPath();
      x.ellipse(-s * 0.08, 0, s * 1.08, s * 0.48, -0.03, 0, 7);
      x.fill();
      x.fillStyle = "rgba(83,48,26,.38)";
      x.beginPath();
      x.ellipse(s * 0.43, s * 0.04, s * 0.4, s * 0.44, -0.14, 0, 7);
      x.ellipse(-s * 0.66, s * 0.07, s * 0.43, s * 0.4, 0.16, 0, 7);
      x.fill();
      x.strokeStyle = "rgba(70,40,23,.62)";
      x.lineWidth = Math.max(1, s * 0.035);
      x.beginPath();
      x.moveTo(-s * 0.9, -s * 0.15);
      x.bezierCurveTo(
        -s * 0.42,
        -s * 0.48,
        s * 0.18,
        -s * 0.44,
        s * 0.63,
        -s * 0.2,
      );
      x.stroke();
      x.fillStyle = "rgba(118,72,40,.42)";
      x.beginPath();
      x.ellipse(s * 0.48, s * 0.29, s * 0.2, s * 0.16, -0.15, 0, 7);
      x.ellipse(-s * 0.57, s * 0.31, s * 0.22, s * 0.17, 0.16, 0, 7);
      x.fill();
      x.fillStyle = "rgba(255,220,170,.22)";
      x.beginPath();
      x.ellipse(-s * 0.28, -s * 0.25, s * 0.58, s * 0.13, -0.12, 0, 7);
      x.fill();
      x.fillStyle = "#a87345";
      x.beginPath();
      x.moveTo(s * 0.55, -s * 0.18);
      x.quadraticCurveTo(s * 0.65, -s * 0.5, s * 0.83, -s * 0.42);
      x.lineTo(s * 0.92, -s * 0.08);
      x.closePath();
      x.fill();
      x.beginPath();
      x.ellipse(s * 0.93, -s * 0.27, s * 0.34, s * 0.3, -0.08, 0, 7);
      x.fill();
      x.fillStyle = "#6a4028";
      x.beginPath();
      x.moveTo(s * 0.78, -s * 0.45);
      x.lineTo(s * 0.88, -s * 0.72);
      x.lineTo(s * 0.99, -s * 0.43);
      x.closePath();
      x.fill();
      x.fillStyle = "#b8794d";
      x.beginPath();
      x.ellipse(s * 1.16, -s * 0.2, s * 0.27, s * 0.15, 0, 0, 7);
      x.fill();
      x.fillStyle = "#251811";
      x.beginPath();
      x.arc(s * 1.36, -s * 0.2, s * 0.055, 0, 7);
      x.arc(s * 0.99, -s * 0.34, s * 0.045, 0, 7);
      x.fill();
      x.strokeStyle = "#3b2418";
      x.lineWidth = Math.max(1, s * 0.025);
      x.beginPath();
      x.moveTo(s * 1.16, -s * 0.1);
      x.quadraticCurveTo(s * 1.27, -s * 0.04, s * 1.34, -s * 0.09);
      x.stroke();
      x.strokeStyle = "#d9b15e";
      x.lineWidth = Math.max(1, s * 0.055);
      x.beginPath();
      x.moveTo(s * 0.58, -s * 0.28);
      x.lineTo(s * 0.76, -s * 0.26);
      x.stroke();
      x.fillStyle = "rgba(245,215,175,.28)";
      x.beginPath();
      x.ellipse(s * 0.43, s * 0.08, s * 0.24, s * 0.33, -0.15, 0, 7);
      x.fill();
      x.fillStyle = "#fff";
      x.beginPath();
      x.arc(s * 1.005, -s * 0.355, s * 0.014, 0, 7);
      x.fill();
      x.strokeStyle = "#70462c";
      x.lineWidth = Math.max(1, s * 0.08);
      x.lineCap = "round";
      x.beginPath();
      x.moveTo(-s * 0.62, s * 0.25);
      x.lineTo(-s * 0.62 + gait * s * 0.18, s * 0.7);
      x.moveTo(-s * 0.22, s * 0.28);
      x.lineTo(-s * 0.22 + gait2 * s * 0.18, s * 0.72);
      x.moveTo(s * 0.3, s * 0.27);
      x.lineTo(s * 0.3 + gait2 * s * 0.18, s * 0.69);
      x.moveTo(s * 0.6, s * 0.22);
      x.lineTo(s * 0.6 + gait * s * 0.18, s * 0.66);
      x.stroke();
      x.strokeStyle = "#2d2118";
      x.lineWidth = Math.max(1, s * 0.12);
      x.beginPath();
      x.moveTo(-s * 0.62 + gait * s * 0.18, s * 0.67);
      x.lineTo(-s * 0.62 + gait * s * 0.18, s * 0.76);
      x.moveTo(-s * 0.22 + gait2 * s * 0.18, s * 0.69);
      x.lineTo(-s * 0.22 + gait2 * s * 0.18, s * 0.78);
      x.moveTo(s * 0.3 + gait2 * s * 0.18, s * 0.66);
      x.lineTo(s * 0.3 + gait2 * s * 0.18, s * 0.75);
      x.moveTo(s * 0.6 + gait * s * 0.18, s * 0.63);
      x.lineTo(s * 0.6 + gait * s * 0.18, s * 0.72);
      x.stroke();
      x.strokeStyle = "#8c5c37";
      x.lineWidth = Math.max(1, s * 0.08);
      x.beginPath();
      x.moveTo(-s * 1.05, -s * 0.08);
      x.quadraticCurveTo(
        -s * 1.35,
        -s * 0.4,
        -s * 1.15 + Math.sin(t / 180) * s * 0.15,
        -s * 0.62,
      );
      x.stroke();
    } else {
      var fur = x.createLinearGradient(0, -s * 0.48, 0, s * 0.55);
      fur.addColorStop(0, "#b7bac2");
      fur.addColorStop(0.5, "#888c96");
      fur.addColorStop(1, "#555b66");
      x.fillStyle = fur;
      x.beginPath();
      x.ellipse(-s * 0.08, 0, s * 0.92, s * 0.42, -0.04, 0, 7);
      x.fill();
      x.fillStyle = "rgba(55,60,70,.36)";
      x.beginPath();
      x.ellipse(-s * 0.59, s * 0.05, s * 0.39, s * 0.39, 0.18, 0, 7);
      x.ellipse(s * 0.39, s * 0.03, s * 0.32, s * 0.36, -0.15, 0, 7);
      x.fill();
      x.strokeStyle = "rgba(48,52,61,.7)";
      x.lineWidth = Math.max(1, s * 0.03);
      x.beginPath();
      x.moveTo(-s * 0.82, -s * 0.12);
      x.bezierCurveTo(
        -s * 0.42,
        -s * 0.39,
        s * 0.14,
        -s * 0.4,
        s * 0.57,
        -s * 0.19,
      );
      x.stroke();
      x.fillStyle = "rgba(88,93,105,.42)";
      x.beginPath();
      x.ellipse(-s * 0.55, s * 0.27, s * 0.2, s * 0.15, 0.18, 0, 7);
      x.ellipse(s * 0.38, s * 0.25, s * 0.17, s * 0.14, -0.15, 0, 7);
      x.fill();
      x.fillStyle = "rgba(235,240,250,.18)";
      x.beginPath();
      x.ellipse(-s * 0.22, -s * 0.23, s * 0.48, s * 0.11, -0.1, 0, 7);
      x.fill();
      x.beginPath();
      x.ellipse(s * 0.75, -s * 0.24, s * 0.31, s * 0.29, 0, 0, 7);
      x.fill();
      x.fillStyle = "#777c86";
      x.beginPath();
      x.moveTo(s * 0.57, -s * 0.42);
      x.lineTo(s * 0.62, -s * 0.72);
      x.lineTo(s * 0.78, -s * 0.44);
      x.lineTo(s * 0.91, -s * 0.72);
      x.lineTo(s * 1.02, -s * 0.39);
      x.closePath();
      x.fill();
      x.fillStyle = "#d0a5a5";
      x.beginPath();
      x.moveTo(s * 1.03, -s * 0.2);
      x.lineTo(s * 1.13, -s * 0.16);
      x.lineTo(s * 1.04, -s * 0.1);
      x.closePath();
      x.fill();
      x.strokeStyle = "#3d4048";
      x.lineWidth = Math.max(1, s * 0.022);
      x.beginPath();
      x.moveTo(s * 1.05, -s * 0.1);
      x.quadraticCurveTo(s * 1.11, -s * 0.04, s * 1.17, -s * 0.09);
      x.stroke();
      x.fillStyle = "rgba(235,240,250,.22)";
      x.beginPath();
      x.ellipse(s * 0.35, s * 0.04, s * 0.25, s * 0.3, -0.12, 0, 7);
      x.fill();
      x.fillStyle = "#d7edc1";
      x.beginPath();
      x.ellipse(s * 0.82, -s * 0.28, s * 0.055, s * 0.04, 0, 0, 7);
      x.fill();
      x.fillStyle = "#111";
      x.beginPath();
      x.arc(s * 0.84, -s * 0.28, s * 0.018, 0, 7);
      x.fill();
      x.strokeStyle = "#666b75";
      x.lineWidth = Math.max(1, s * 0.065);
      x.lineCap = "round";
      x.beginPath();
      x.moveTo(-s * 0.45, s * 0.2);
      x.lineTo(-s * 0.45 + gait * s * 0.16, s * 0.6);
      x.moveTo(-s * 0.12, s * 0.22);
      x.lineTo(-s * 0.12 + gait2 * s * 0.16, s * 0.61);
      x.moveTo(s * 0.25, s * 0.2);
      x.lineTo(s * 0.25 + gait2 * s * 0.16, s * 0.58);
      x.moveTo(s * 0.52, s * 0.16);
      x.lineTo(s * 0.52 + gait * s * 0.16, s * 0.56);
      x.stroke();
      x.strokeStyle = "#343840";
      x.lineWidth = Math.max(1, s * 0.1);
      x.beginPath();
      x.moveTo(-s * 0.45 + gait * s * 0.16, s * 0.57);
      x.lineTo(-s * 0.45 + gait * s * 0.16, s * 0.65);
      x.moveTo(-s * 0.12 + gait2 * s * 0.16, s * 0.58);
      x.lineTo(-s * 0.12 + gait2 * s * 0.16, s * 0.66);
      x.moveTo(s * 0.25 + gait2 * s * 0.16, s * 0.55);
      x.lineTo(s * 0.25 + gait2 * s * 0.16, s * 0.63);
      x.moveTo(s * 0.52 + gait * s * 0.16, s * 0.53);
      x.lineTo(s * 0.52 + gait * s * 0.16, s * 0.61);
      x.stroke();
      x.strokeStyle = "#777b85";
      x.lineWidth = Math.max(1, s * 0.075);
      x.beginPath();
      x.moveTo(-s * 0.88, -s * 0.05);
      x.bezierCurveTo(
        -s * 1.35,
        -s * 0.38,
        -s * 1.28,
        -s * 0.92,
        -s * 0.73 + Math.sin(t / 230) * s * 0.15,
        -s * 0.8,
      );
      x.stroke();
      x.strokeStyle = "rgba(235,235,240,.55)";
      x.lineWidth = 1;
      x.beginPath();
      x.moveTo(s * 1.08, -s * 0.15);
      x.lineTo(s * 1.34, -s * 0.23);
      x.moveTo(s * 1.08, -s * 0.12);
      x.lineTo(s * 1.35, -s * 0.08);
      x.stroke();
    }
    x.restore();
  }
  function walkers(t, dt) {
    raidSpawn += dt;
    if (raidSpawn > 10 + Math.random() * 5 && raiders.length < 1) {
      var free = [];
      for (var n = 0; n < 10; n++) if (!stolen[n]) free.push(n);
      if (free.length) {
        var target = free[Math.floor(Math.random() * free.length)],
          side = Math.random() < 0.5 ? -1 : 1;
        raiders.push({
          x: side < 0 ? -28 : W + 28,
          y: H * 0.78,
          target: target,
          dir: side < 0 ? 1 : -1,
          speed: 58 + level * 4,
          p: Math.random() * 7,
          carry: false,
        });
        raidSpawn = 0;
      }
    }
    for (var i = raiders.length - 1; i >= 0; i--) {
      var a = raiders[i],
        tx = a.carry
          ? a.dir > 0
            ? W + 42
            : -42
          : W *
            [0.07, 0.11, 0.18, 0.25, 0.33, 0.43, 0.53, 0.64, 0.72, 0.76][
              a.target
            ];
      a.x += Math.sign(tx - a.x) * a.speed * dt;
      if (!a.carry && Math.abs(tx - a.x) < 8) {
        a.carry = true;
        stolen[a.target] = 1;
        sound("ufo");
      }
      if (a.carry && (a.x < -35 || a.x > W + 35)) {
        raiders.splice(i, 1);
        continue;
      }
      x.save();
      x.translate(a.x, a.y + Math.sin(t * 0.018 + a.p) * 2);
      x.scale(a.dir, 1);
      x.shadowColor = "#74ff9a";
      x.shadowBlur = 10;
      x.fillStyle = "#75d95a";
      x.beginPath();
      x.ellipse(0, -13, 8, 10, 0, 0, 7);
      x.fill();
      x.fillStyle = "#142b24";
      x.beginPath();
      x.ellipse(-3, -14, 2, 3, 0, 0, 7);
      x.ellipse(3, -14, 2, 3, 0, 0, 7);
      x.fill();
      x.strokeStyle = "#75d95a";
      x.lineWidth = 3;
      x.lineCap = "round";
      var k = Math.sin(t * 0.03 + a.p) * 5;
      x.beginPath();
      x.moveTo(0, -4);
      x.lineTo(0, 7);
      x.moveTo(0, 0);
      x.lineTo(k, -1);
      x.moveTo(0, 0);
      x.lineTo(-k, -1);
      x.moveTo(0, 7);
      x.lineTo(k, 15);
      x.moveTo(0, 7);
      x.lineTo(-k, 15);
      x.stroke();
      if (a.carry) {
        x.fillStyle = "#eee7d7";
        x.beginPath();
        x.ellipse(13, -1, 10, 5, 0, 0, 7);
        x.fill();
        x.fillStyle = "#573d2d";
        x.beginPath();
        x.ellipse(17, -2, 2.5, 2, 0, 0, 7);
        x.fill();
        x.strokeStyle = "#ded4bc";
        x.lineWidth = 1.5;
        x.beginPath();
        x.moveTo(7, 2);
        x.lineTo(7, 7);
        x.moveTo(15, 2);
        x.lineTo(15, 7);
        x.stroke();
      }
      x.restore();
    }
  }
  function fatalBlast(px, py, msg, kind) {
    if (lost) return true;
    lost = 1;
    run = 0;
    objects = [];
    raiders = [];
    window.fatalHideKind = kind;
    if (window.cinematicBlast) window.cinematicBlast(px, py);
    window.fatalHideUntil = performance.now() + 1300;
    for (var k = 0; k < 240; k++) {
      var ang = Math.random() * Math.PI * 2,
        spd = 0.5 + Math.random() * 6.2,
        col =
          k % 7 === 0
            ? "#ffffff"
            : k % 7 === 1
              ? "#fff39a"
              : k % 7 === 2
                ? "#ffbf32"
                : k % 7 === 3
                  ? "#ff681c"
                  : k % 7 === 4
                    ? "#d81818"
                    : k % 7 === 5
                      ? "#6b0810"
                      : "#292323";
      sparks.push({
        x: px,
        y: py,
        dx: Math.cos(ang) * spd,
        dy: Math.sin(ang) * spd,
        life: 1,
        col: col,
      });
    }
    for (var q = 0; q < 24; q++) {
      var an = Math.random() * Math.PI * 2,
        sp = 0.3 + Math.random() * 1.7;
      sparks.push({
        x: px,
        y: py,
        dx: Math.cos(an) * sp,
        dy: Math.sin(an) * sp,
        life: 1,
        col: "#7b0014",
      });
    }
    sound("jet");
    saveScore();
    setTimeout(function () {
      box.style.display = "flex";
      box.innerHTML =
        '<div class="card"><div class="alien">👽</div><h1>MISSION VERLOREN</h1><p>' +
        msg +
        '</p><button id="start">NOCH EINMAL</button><button id="menu" style="margin-left:10px">ZUM STARTMENÜ</button><div class="scores"><b>HIGHSCORES</b><ol id="scores"></ol></div></div>';
      document.getElementById("start").onclick = reset;
      showScores();
    }, 1300);
    return true;
  }
  function etHit(px, py) {
    var t = performance.now(),
      cycle = Math.floor(t / 17000) % 3;
    if (cycle !== 0) return false;
    var p = (t % 17000) / 17000,
      ex = -70 + p * (W + 140),
      ey = H * 0.26 + Math.sin(p * Math.PI) * 34;
    if (Math.abs(px - ex) < 28 && Math.abs(py - ey) < 38 && !lost)
      return fatalBlast(ex, ey, "Du hast E.T. getroffen.", "et");
    return false;
  }
  function petHit(px, py, tap) {
    var t = performance.now(),
      phase = Math.floor(t / 12000) % 3;
    if (phase !== 1) return false;
    var p = (t % 12000) / 12000,
      xx = W * (0.12 + p * 0.72),
      yy = H * 0.775 + Math.sin(p * 18) * 3;
    if (Math.abs(px - xx) < 34 * tap && Math.abs(py - yy) < 32 * tap && !lost)
      return fatalBlast(xx, yy, "Du hast ein Tier am Boden getroffen.", "pet");
    return false;
  }
  function cyclist(t) {
    if (
      window.fatalHideKind === "et" &&
      performance.now() < window.fatalHideUntil
    )
      return;
    var cycle = Math.floor(t / 17000) % 3;
    if (cycle !== 0) return;
    var p = (t % 17000) / 17000,
      xx = -70 + p * (W + 140),
      yy = H * 0.26 + Math.sin(p * Math.PI) * 34,
      ss = 0.62;
    x.save();
    x.translate(xx, yy);
    x.scale(ss, ss);
    x.rotate(Math.sin(t / 230) * 0.018);
    x.globalAlpha = 0.22;
    x.fillStyle = "#000";
    x.beginPath();
    x.ellipse(0, 27, 30, 5, 0, 0, 7);
    x.fill();
    x.globalAlpha = 0.9;
    x.strokeStyle = "#16150d";
    x.lineWidth = 3;
    x.beginPath();
    x.arc(-14, 13, 11, 0, 7);
    x.arc(15, 13, 11, 0, 7);
    var pedal = Math.sin(t / 115) * 6;
    x.moveTo(-14, 13);
    x.lineTo(-1, -3);
    x.lineTo(15, 13);
    x.lineTo(-8, 13);
    x.lineTo(5, 3);
    x.lineTo(-1, -3);
    x.lineTo(11, -3);
    x.stroke();
    x.strokeStyle = "#27251f";
    x.lineWidth = 2;
    x.beginPath();
    x.arc(-1, -3, 4, 0, 7);
    x.moveTo(-1, -3);
    x.lineTo(pedal, -3 + Math.cos(t / 115) * 6);
    x.stroke();
    var body = x.createLinearGradient(-14, -38, 14, -8);
    body.addColorStop(0, "#a47a50");
    body.addColorStop(0.45, "#795338");
    body.addColorStop(1, "#493326");
    x.fillStyle = body;
    x.beginPath();
    x.ellipse(-2, -24, 13, 18, -0.08, 0, 7);
    x.fill();
    x.fillStyle = "#5b3828";
    x.beginPath();
    x.ellipse(-3, -29, 11, 9, -0.08, 0, 7);
    x.fill();
    x.fillStyle = "rgba(255,220,170,.17)";
    x.beginPath();
    x.ellipse(-6, -31, 6, 11, -0.15, 0, 7);
    x.fill();
    x.fillStyle = "#98724f";
    x.beginPath();
    x.ellipse(4, -34, 6, 11, -0.1, 0, 7);
    x.fill();
    x.fillStyle = "#b89b74";
    x.beginPath();
    x.ellipse(8, -43, 11, 10, -0.08, 0, 7);
    x.fill();
    x.fillStyle = "#15140f";
    x.beginPath();
    x.ellipse(4, -45, 2.4, 3.1, -0.2, 0, 7);
    x.ellipse(11, -45, 2.4, 3.1, 0.2, 0, 7);
    x.fill();
    x.fillStyle = "#f5e7c6";
    x.beginPath();
    x.arc(4.6, -46, 0.8, 0, 7);
    x.arc(11.6, -46, 0.8, 0, 7);
    x.fill();
    x.strokeStyle = "#6d5741";
    x.lineWidth = 1;
    x.beginPath();
    x.moveTo(7, -39);
    x.quadraticCurveTo(9, -37, 12, -39);
    x.stroke();
    x.strokeStyle = "#a98360";
    x.lineWidth = 4;
    x.lineCap = "round";
    x.beginPath();
    x.moveTo(4, -17);
    x.lineTo(13, -5);
    x.moveTo(-6, -16);
    x.lineTo(8, -5);
    x.stroke();
    x.fillStyle = "#b89b74";
    x.beginPath();
    x.arc(13, -5, 2.5, 0, 7);
    x.arc(8, -5, 2.5, 0, 7);
    x.fill();
    x.restore();
  }
  function landscape(t) {
    var sky = x.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#01030f");
    sky.addColorStop(0.22, "#07152e");
    sky.addColorStop(0.48, "#102c55");
    sky.addColorStop(0.66, "#315b78");
    sky.addColorStop(0.695, "#142216");
    sky.addColorStop(1, "#020904");
    x.fillStyle = sky;
    x.fillRect(0, 0, W, H);
    var glow = x.createRadialGradient(
      W * 0.8,
      H * 0.15,
      5,
      W * 0.8,
      H * 0.15,
      W * 0.34,
    );
    glow.addColorStop(0, "rgba(220,240,255,.28)");
    glow.addColorStop(0.18, "rgba(125,180,235,.16)");
    glow.addColorStop(0.48, "rgba(55,95,175,.07)");
    glow.addColorStop(1, "rgba(5,15,50,0)");
    x.fillStyle = glow;
    x.fillRect(0, 0, W, H);
    var aur = x.createLinearGradient(0, H * 0.12, W, H * 0.48);
    aur.addColorStop(0, "rgba(40,220,185,0)");
    aur.addColorStop(0.3, "rgba(70,205,185,.10)");
    aur.addColorStop(0.56, "rgba(82,130,220,.09)");
    aur.addColorStop(0.78, "rgba(110,82,190,.045)");
    aur.addColorStop(1, "rgba(30,100,190,0)");
    x.fillStyle = aur;
    x.beginPath();
    x.moveTo(0, H * 0.18);
    x.bezierCurveTo(W * 0.24, H * 0.1, W * 0.34, H * 0.43, W * 0.58, H * 0.23);
    x.bezierCurveTo(W * 0.75, H * 0.05, W * 0.87, H * 0.32, W, H * 0.14);
    x.lineTo(W, H * 0.48);
    x.bezierCurveTo(W * 0.78, H * 0.38, W * 0.67, H * 0.6, W * 0.45, H * 0.4);
    x.bezierCurveTo(W * 0.2, H * 0.53, W * 0.14, H * 0.25, 0, H * 0.43);
    x.closePath();
    x.fill();
    var cloud = x.createLinearGradient(0, H * 0.28, 0, H * 0.48);
    cloud.addColorStop(0, "rgba(35,63,103,0)");
    cloud.addColorStop(0.5, "rgba(95,142,184,.13)");
    cloud.addColorStop(1, "rgba(35,63,103,0)");
    x.fillStyle = cloud;
    for (var cl = 0; cl < 6; cl++) {
      x.beginPath();
      x.ellipse(
        (cl * W * 0.23 + t * 0.006 * (cl % 2 ? 1 : -1)) % W,
        H * (0.31 + (cl % 3) * 0.06),
        W * 0.19,
        H * 0.035,
        0,
        0,
        7,
      );
      x.fill();
    }
    x.fillStyle = "rgba(158,197,255,.08)";
    for (var q = 0; q < 4; q++) {
      x.beginPath();
      x.ellipse(
        W * (0.12 + q * 0.29),
        H * (0.3 + (q % 2) * 0.06),
        W * 0.22,
        H * 0.035,
        0,
        0,
        7,
      );
      x.fill();
    }
    for (var i = 0; i < stars.length; i++) {
      var z = stars[i],
        al = 0.35 + 0.55 * Math.abs(Math.sin(t / 1200 + z.p));
      x.save();
      x.globalAlpha = al;
      x.fillStyle = "#edf8ff";
      if (z.r > 1.15) {
        x.shadowColor = "#b9e8ff";
        x.shadowBlur = 5;
      }
      x.beginPath();
      x.arc(z.x, z.y, Math.max(0.45, z.r * 0.72), 0, Math.PI * 2);
      x.fill();
      x.restore();
    }
    for (var m = 0; m < meteors.length; m++) {
      var mt = meteors[m],
        q = (t + mt.p) % 24000;
      if (q < 850) {
        var u = q / 850,
          xx = (mt.x + u * W * 0.28) % W,
          yy = mt.y + u * H * 0.14;
        x.save();
        x.globalAlpha = 1 - u;
        x.strokeStyle = "rgba(225,248,255,.9)";
        x.shadowColor = "#8bdfff";
        x.shadowBlur = 18;
        x.lineWidth = 1.5;
        x.beginPath();
        x.moveTo(xx - W * 0.055, yy - H * 0.028);
        x.lineTo(xx, yy);
        x.stroke();
        x.restore();
      }
    }
    x.save();
    x.shadowColor = "#d9f2ff";
    x.shadowBlur = 75;
    var mx = W * 0.8,
      my = H * 0.15,
      mg = x.createRadialGradient(mx - 13, my - 15, 4, mx, my, 42);
    mg.addColorStop(0, "#fffdf0");
    mg.addColorStop(0.45, "#e8e5d5");
    mg.addColorStop(0.78, "#c7c5b9");
    mg.addColorStop(1, "#8f9392");
    ellipse(mx, my, 40, 40, mg);
    x.shadowBlur = 0;
    x.globalAlpha = 0.32;
    ellipse(mx - 14, my - 9, 10, 7, "#66675f");
    ellipse(mx + 13, my - 17, 7, 9, "#74756c");
    ellipse(mx + 17, my + 10, 12, 9, "#5e605a");
    ellipse(mx - 17, my + 18, 8, 6, "#6b6d65");
    ellipse(mx - 3, my + 8, 6, 5, "#7e7f76");
    ellipse(mx + 5, my - 2, 4, 3, "#62645f");
    ellipse(mx - 23, my + 3, 5, 8, "#73756e");
    ellipse(mx + 2, my - 25, 5, 4, "#686a63");
    x.globalAlpha = 0.22;
    x.strokeStyle = "#eee9d8";
    x.lineWidth = 1.3;
    x.beginPath();
    x.arc(mx - 14, my - 9, 10, 3.25, 5.9);
    x.arc(mx + 17, my + 10, 12, 3.2, 5.8);
    x.arc(mx - 17, my + 18, 8, 3.2, 5.8);
    x.stroke();
    x.globalAlpha = 0.1;
    ellipse(mx - 21, my - 19, 11, 10, "#ffffff");
    ellipse(mx + 8, my + 20, 10, 6, "#ffffff");
    x.globalAlpha = 1;
    x.restore();
    x.fillStyle = "rgba(166,205,226,.18)";
    x.beginPath();
    x.moveTo(W * 0.69, H * 0.67);
    x.lineTo(W * 0.77, H * 0.58);
    x.lineTo(W * 0.85, H * 0.67);
    x.closePath();
    x.fill();
    x.fillStyle = "#09130e";
    x.fillRect(W * 0.735, H * 0.63, W * 0.07, H * 0.08);
    for (var bg = 0; bg < 26; bg++) {
      var bx = (bg * 71) % W,
        bh = 10 + (bg % 6) * 6;
      x.fillStyle = "rgba(18,40,45,.48)";
      x.beginPath();
      x.moveTo(bx - bh * 0.7, H * 0.695);
      x.lineTo(bx, H * 0.695 - bh);
      x.lineTo(bx + bh * 0.7, H * 0.695);
      x.closePath();
      x.fill();
    }
    for (var tr = 0; tr < 18; tr++) {
      var tx = (tr * 97) % W,
        th = 18 + (tr % 5) * 11;
      var treeMoon = Math.max(0, 1 - Math.abs(tx - W * 0.8) / (W * 0.42));
      x.fillStyle =
        "rgba(" +
        Math.round(3 + treeMoon * 24) +
        "," +
        Math.round(13 + treeMoon * 35) +
        "," +
        Math.round(8 + treeMoon * 38) +
        ",.94)";
      x.beginPath();
      x.moveTo(tx - th * 0.8, H * 0.695);
      x.lineTo(tx, H * 0.695 - th);
      x.lineTo(tx + th * 0.8, H * 0.695);
      x.closePath();
      x.fill();
      if (treeMoon > 0.35) {
        x.strokeStyle = "rgba(180,220,235," + treeMoon * 0.16 + ")";
        x.lineWidth = 1;
        x.beginPath();
        x.moveTo(tx - th * 0.8, H * 0.695);
        x.lineTo(tx, H * 0.695 - th);
        x.lineTo(tx + th * 0.8, H * 0.695);
        x.stroke();
      }
      x.fillRect(tx - 2, H * 0.695 - th * 0.15, 4, th * 0.4);
    }
    x.fillStyle = "#10200e";
    x.beginPath();
    x.moveTo(0, H * 0.7);
    for (var j = 0; j <= W; j += 32)
      x.lineTo(j, H * 0.65 + Math.sin(j * 0.028) * 18);
    x.lineTo(W, H);
    x.lineTo(0, H);
    x.fill();
    var fg = x.createLinearGradient(0, H * 0.69, 0, H);
    fg.addColorStop(0, "#284d27");
    fg.addColorStop(0.22, "#1b391a");
    fg.addColorStop(0.58, "#0c2110");
    fg.addColorStop(1, "#020704");
    x.fillStyle = fg;
    x.fillRect(0, H * 0.72, W, H * 0.28);
    var haze = x.createLinearGradient(0, H * 0.7, 0, H * 0.86);
    haze.addColorStop(0, "rgba(190,225,240,.17)");
    haze.addColorStop(0.32, "rgba(130,175,195,.10)");
    haze.addColorStop(0.72, "rgba(80,120,135,.035)");
    haze.addColorStop(1, "rgba(50,80,90,0)");
    x.fillStyle = haze;
    x.fillRect(0, H * 0.7, W, H * 0.16);
    for (var g = 0; g < 180; g++) {
      var gx = (g * 83) % W,
        gy = H * 0.72 + ((g * 47) % (H * 0.28));
      var ga = 0.12 + (g % 4) * 0.035,
        moonGrass = Math.max(0, 1 - Math.abs(gx - W * 0.8) / (W * 0.48));
      x.strokeStyle =
        "rgba(" +
        Math.round(92 + moonGrass * 38) +
        "," +
        Math.round(145 + moonGrass * 45) +
        "," +
        Math.round(72 + moonGrass * 42) +
        "," +
        ga +
        ")";
      x.lineWidth = 1;
      x.beginPath();
      x.moveTo(gx, gy);
      x.lineTo(gx + ((g % 5) - 2) * 3, gy - 5 - (g % 7));
      x.stroke();
    }
    x.strokeStyle = "rgba(44,75,33,.9)";
    x.lineWidth = 3;
    x.beginPath();
    x.moveTo(0, H * 0.76);
    x.lineTo(W, H * 0.8);
    x.moveTo(0, H * 0.8);
    x.lineTo(W, H * 0.84);
    x.stroke();
    for (var f = 0; f < 28; f++) {
      var fx = (f * 151 + t * 0.012 * ((f % 3) + 1)) % W,
        fy = H * 0.71 + ((f * 31) % (H * 0.18));
      x.fillStyle =
        "rgba(185,255,115," + (0.16 + 0.16 * Math.sin(t / 500 + f)) + ")";
      x.shadowColor = "#baff73";
      x.shadowBlur = 6;
      x.beginPath();
      x.arc(fx, fy, 1.2, 0, 7);
      x.fill();
    }
    x.shadowBlur = 0;
    for (var dust = 0; dust < 60; dust++) {
      var dx = (dust * 193 + t * 0.004 * ((dust % 4) + 1)) % W,
        dy = H * 0.73 + ((dust * 37) % (H * 0.24));
      x.fillStyle = "rgba(155,201,125," + (0.03 + (dust % 5) * 0.012) + ")";
      x.beginPath();
      x.arc(dx, dy, 1 + (dust % 3) * 0.5, 0, 7);
      x.fill();
    }
    var vign = x.createRadialGradient(
      W * 0.5,
      H * 0.48,
      H * 0.25,
      W * 0.5,
      H * 0.48,
      Math.max(W, H) * 0.74,
    );
    vign.addColorStop(0.54, "rgba(0,0,0,0)");
    vign.addColorStop(1, "rgba(0,0,10,.38)");
    x.fillStyle = vign;
    x.fillRect(0, 0, W, H);
    animals(t);
    pets(t);
    cyclist(t);
  }
  function drawFallingCows(dt) {
    for (var fc = fallingCows.length - 1; fc >= 0; fc--) {
      var a = fallingCows[fc];
      a.vy += 520 * dt;
      a.y += a.vy * dt;
      a.rot += a.spin * dt;
      if (a.y >= a.ground) {
        a.y = a.ground;
        a.vy = 0;
        a.spin = 0;
        a.rot = 0;
        if (!a.landedAt) {
          a.landedAt = performance.now();
          cowLandingX[a.target] = a.x;
          cowLandingTime[a.target] = a.landedAt;
          delete fallingCowTargets[a.target];
          delete stolen[a.target];
        }
        if (performance.now() - a.landedAt > 650) {
          fallingCows.splice(fc, 1);
          continue;
        }
      }
      var s = a.s;
      x.save();
      x.translate(a.x, a.y);
      x.rotate(a.rot);
      x.globalAlpha = 0.96;
      x.fillStyle = "rgba(0,0,0,.24)";
      x.beginPath();
      x.ellipse(0, s * 0.65, s * 1.05, s * 0.15, 0, 0, 7);
      x.fill();
      var g = x.createLinearGradient(0, -s * 0.5, 0, s * 0.55);
      g.addColorStop(0, "#fffdf3");
      g.addColorStop(1, "#b9b4a8");
      x.fillStyle = g;
      x.beginPath();
      x.ellipse(-s * 0.1, 0, s * 1.05, s * 0.46, 0, 0, 7);
      x.fill();
      x.fillStyle = "#34312c";
      x.beginPath();
      x.ellipse(-s * 0.38, -s * 0.08, s * 0.27, s * 0.2, -0.3, 0, 7);
      x.ellipse(s * 0.18, s * 0.1, s * 0.23, s * 0.15, 0.2, 0, 7);
      x.fill();
      x.fillStyle = "#eee9dc";
      x.beginPath();
      x.ellipse(s * 0.83, -s * 0.2, s * 0.34, s * 0.3, 0, 0, 7);
      x.fill();
      x.fillStyle = "#d9a7a0";
      x.beginPath();
      x.ellipse(s * 1.02, -s * 0.07, s * 0.24, s * 0.14, 0, 0, 7);
      x.fill();
      x.strokeStyle = "#cfc6b5";
      x.lineWidth = Math.max(1, s * 0.1);
      x.beginPath();
      x.moveTo(-s * 0.62, s * 0.25);
      x.lineTo(-s * 0.7, s * 0.66);
      x.moveTo(-s * 0.18, s * 0.28);
      x.lineTo(-s * 0.25, s * 0.7);
      x.moveTo(s * 0.3, s * 0.27);
      x.lineTo(s * 0.38, s * 0.67);
      x.moveTo(s * 0.58, s * 0.22);
      x.lineTo(s * 0.68, s * 0.62);
      x.stroke();
      x.restore();
    }
  }
  function particles() {
    for (var i = sparks.length - 1; i >= 0; i--) {
      var p = sparks[i];
      p.life -= 0.025;
      if (p.life <= 0) {
        sparks.splice(i, 1);
        continue;
      }
      x.save();
      x.globalAlpha = p.life;
      x.fillStyle = p.col;
      x.shadowColor = p.col;
      x.shadowBlur = 14;
      x.beginPath();
      x.arc(
        p.x + p.dx * (1 - p.life) * 40,
        p.y + p.dy * (1 - p.life) * 40,
        8 * p.life,
        0,
        7,
      );
      x.fill();
      x.restore();
    }
  }
  function frame(t) {
    var dt = Math.min(0.05, (t - last) / 1000 || 0);
    if (slowUntil > t) dt *= 0.25;
    slowUi(t);
    if (paused) {
      requestAnimationFrame(frame);
      return;
    }
    last = t;
    landscape(t);
    if (run) walkers(t, dt);
    if (run && !paused) {
      spawn += dt;
      var need = 7 + level;
      if (
        spawn >
          Math.max(
            0.18,
            (0.82 - level * 0.04) *
              (1 /
                (1 +
                  (score < 20000
                    ? Math.floor(score / 5000)
                    : 4 + Math.floor((score - 20000) / 100000)) *
                    0.22)),
          ) &&
        hits < need
      ) {
        add();
        if (
          Math.random() < (matchMedia("(pointer:coarse)").matches ? 0.68 : 0.42)
        )
          add();
        spawn = 0;
      }
      objects.forEach(function (d) {
        d.x += d.v * dt;
      });
      for (var i = objects.length - 1; i >= 0; i--)
        if (objects[i].x < -170 || objects[i].x > W + 170) objects.splice(i, 1);
      if (hits >= need && objects.length === 0) {
        level++;
        hits = 0;
        jetDown = 0;
        cheer();
        ui();
      }
    }
    objects
      .sort(function (a, b) {
        return a.z - b.z;
      })
      .forEach(function (d) {
        d.jet ? jet(d, t) : ufo(d, t);
      });
    drawFallingCows(dt);
    particles();
    requestAnimationFrame(frame);
  }
  // Lokale Highscores (localStorage) rendern – Fallback, wenn Firebase offline ist.
  function renderLocalScores() {
    var q = document.getElementById("scores");
    if (!q) return;
    q.replaceChildren();
    if (!high.length) {
      var e = document.createElement("li");
      e.textContent = "Noch keine lokalen Highscores";
      q.appendChild(e);
      return;
    }
    // <ol> nummeriert automatisch – keine manuelle Platznummer voranstellen
    high.forEach(function (v) {
      var e = document.createElement("li");
      e.textContent =
        String(v.name || "Spieler") +
        " - " +
        Number(v.score || 0).toLocaleString("de-DE") +
        " Punkte";
      q.appendChild(e);
    });
  }
  window.renderLocalScores = renderLocalScores;
  function showScores() {
    var q = document.getElementById("scores");
    if (!q) return;
    var fb = window.ufoFirebase;
    if (fb && fb.status === "FEHLER") {
      renderLocalScores();
      return;
    }
    q.textContent = "Online-Highscores werden geladen...";
    if (window.renderOnlineScores) window.renderOnlineScores();
    // Fallback: wenn Firebase nicht rechtzeitig online geht, lokale Liste anzeigen
    setTimeout(function () {
      var online = !!(
        window.onlineHighscores && window.onlineHighscores.length
      );
      var fbNow = window.ufoFirebase;
      if (!online && (!fbNow || fbNow.status !== "ONLINE")) renderLocalScores();
    }, 4000);
  }
  function saveScore() {
    if (score <= 0 || recorded) return;
    recorded = 1;
    high.push({ name: playerName || "Spieler", score: score });
    high.sort(function (x, y) {
      return y.score - x.score;
    });
    high = high.slice(0, 10);
    try {
      localStorage.setItem("ufoScores", JSON.stringify(high));
    } catch (e) {}
    console.log(
      "GAME SCORE UPLOAD:",
      playerName,
      score,
      !!window.saveOnlineScore,
    );
    if (window.saveOnlineScore)
      window.saveOnlineScore(playerName || "Spieler", score);
  }
  function reset() {
    if (
      matchMedia("(pointer:coarse)").matches &&
      !document.fullscreenElement &&
      document.documentElement.requestFullscreen
    )
      document.documentElement.requestFullscreen().catch(function () {});
    var pi = document.getElementById("player");
    if (pi && pi.value.trim()) playerName = pi.value.trim();
    saveScore();
    recorded = 0;
    sound("hit");
    lost = 0;
    paused = 0;
    document.getElementById("sheet").className = "";
    document.getElementById("pause").textContent = "PAUSE";
    objects = [];
    sparks = [];
    raiders = [];
    fallingCows = [];
    fallingCowTargets = {};
    cowLandingX = {};
    raidSpawn = 0;
    stolen = {};
    slowUntil = 0;
    moonReady = 0;
    score = 0;
    level = 1;
    hits = 0;
    jetDown = 0;
    spawn = 0;
    run = 1;
    box.style.display = "none";
    c.focus();
    showScores();
    ui();
  }
  c.addEventListener("pointerdown", function (e) {
    c.focus();
    if (!run) return;
    var r = c.getBoundingClientRect(),
      px = e.clientX - r.left,
      py = e.clientY - r.top,
      tap = e.pointerType === "touch" ? 1.65 : 1;
    if (petHit(px, py, tap)) return;
    for (var w = raiders.length - 1; w >= 0; w--) {
      var a = raiders[w];
      if (Math.abs(px - a.x) < 16 * tap && Math.abs(py - a.y) < 28 * tap) {
        score += 350;
        if (a.carry) delete stolen[a.target];
        raiders.splice(w, 1);
        for (var z = 0; z < 28; z++)
          sparks.push({
            x: a.x,
            y: a.y,
            dx: Math.random() * 2 - 1,
            dy: Math.random() * 2 - 1,
            life: 1,
            col: "#75ff8b",
          });
        sound("hit");
        ui();
        return;
      }
    }
    for (var i = objects.length - 1; i >= 0; i--) {
      var d = objects[i],
        s = (d.jet ? 64 : 48) * d.z;
      if (Math.abs(px - d.x) < s * 1.75 * tap && Math.abs(py - d.y) < s * tap) {
        if (d.jet) {
          score -= 150;
          jetDown++;
          sound("jet");
          if (jetDown >= 5 && !lost) {
            lost = 1;
            run = 0;
            box.style.display = "flex";
            box.innerHTML =
              '<div class="card"><div class="alien" aria-label="tanzendes Alien">👽</div><h1>MISSION VERLOREN</h1><p>Du hast in diesem Level 5 Flugzeuge abgeschossen.</p><button id="start">NOCH EINMAL</button><button id="menu" style="margin-left:10px">ZUM STARTMENÜ</button><div class="scores"><b>HIGHSCORES</b><ol id="scores"></ol></div></div>';
            document.getElementById("start").onclick = reset;
            saveScore();
            showScores();
          }
        } else {
          sound(d.steal ? "ufo" : "hit");
          if (
            d.steal &&
            d.target !== null &&
            Math.sign(performance.now() - d.beamAt) === 1
          ) {
            var fp = [
                [0.07, 0.755],
                [0.11, 0.73],
                [0.18, 0.745],
                [0.25, 0.765],
                [0.33, 0.75],
                [0.43, 0.735],
                [0.53, 0.765],
                [0.64, 0.755],
                [0.72, 0.735],
                [0.76, 0.77],
              ][d.target],
              fs = 48 * d.z,
              ft = performance.now(),
              fl = Math.min(
                1,
                (ft - d.beamAt) /
                  (3500 /
                    (1 +
                      (score < 20000
                        ? Math.floor(score / 5000)
                        : 4 + Math.floor((score - 20000) / 100000)) *
                        0.3)),
              ),
              fx = d.x + (W * fp[0] - d.x) * (1 - fl),
              fy = d.y + (H * fp[1] - d.y) * (1 - fl) + fs * 0.42 * fl;
            fallingCowTargets[d.target] = 1;
            fallingCows.push({
              target: d.target,
              x: fx,
              y: fy,
              ground: H * fp[1],
              vy: 35,
              rot: 0,
              spin: (Math.random() - 0.5) * 3,
              s: Math.max(8, fs * 0.45),
            });
          }
          if (d.steal) delete stolen[d.target];
          var reward = d.steal ? 500 : Math.round((1.3 - d.z) * 500) * level;
          score += reward;
          hits++;
        }
        for (var q = 0; q < 44; q++)
          sparks.push({
            x: d.x,
            y: d.y,
            dx: Math.random() * 2 - 1,
            dy: Math.random() * 2 - 1,
            life: 1,
            col: d.jet ? "#ff674d" : "#8efbff",
          });
        objects.splice(i, 1);
        ui();
        break;
      }
    }
    if (run) {
      if (
        Math.abs(px - W * 0.8) < 48 * tap &&
        Math.abs(py - H * 0.15) < 48 * tap &&
        performance.now() >= moonReady
      ) {
        slowUntil = performance.now() + 5000;
        moonReady = slowUntil + 5000;
        sound("ufo");
      } else etHit(px, py);
    }
  });
  function showSheet() {
    document.getElementById("sheet").className = "show";
  }
  function hideSheet() {
    document.getElementById("sheet").className = "";
    if (paused) {
      paused = 0;
      last = performance.now();
      document.getElementById("pause").textContent = "PAUSE";
    }
  }
  document.getElementById("start").onclick = reset;
  showScores();
  document.getElementById("closeSheet").onclick = hideSheet;
  function toggleSheet() {
    if (!run) return;
    if (!paused) {
      paused = 1;
      document.getElementById("pause").textContent = "WEITER";
      showSheet();
    } else hideSheet();
  }
  function handleKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var k = (e.key || "").toLowerCase();
    var a = document.activeElement;
    if (a && /^(input|textarea|select)$/i.test(a.tagName)) return;
    if (k === "m" || e.code === "KeyM") {
      e.preventDefault();
      e.stopPropagation();
      toggleMute();
      return;
    }
    if (k === "a" || k === "p" || e.code === "KeyA" || e.code === "KeyP") {
      e.preventDefault();
      e.stopPropagation();
      toggleSheet();
    }
  }
  document.addEventListener("keydown", handleKey, true);
  function muteUi() {
    var mb = document.getElementById("mute");
    if (mb) mb.textContent = muted ? "🔇" : "🔊";
  }
  function toggleMute() {
    muted = !muted;
    try {
      localStorage.setItem("ufoMute", muted ? "1" : "0");
    } catch (e) {}
    muteUi();
    if (!muted) sound("hit");
  }
  document.getElementById("mute").onclick = toggleMute;
  muteUi();
  // PAUSE-Button: nur schlicht pausieren – der "Windows-Update"-Screen
  // erscheint ausschließlich über die Tasten A/P (toggleSheet).
  // Ist der Screen gerade offen, wird er beim Button-Klick mit geschlossen.
  document.getElementById("pause").onclick = function () {
    if (!run) return;
    paused = !paused;
    last = performance.now();
    if (!paused) document.getElementById("sheet").className = "";
    this.textContent = paused ? "WEITER" : "PAUSE";
  };
  document.getElementById("quit").onclick = function () {
    if (!run) return;
    run = 0;
    paused = 0;
    document.getElementById("sheet").className = "";
    document.getElementById("pause").textContent = "PAUSE";
    objects = [];
    box.style.display = "flex";
    box.innerHTML =
      '<div class="card"><h1>SPIEL BEENDET</h1><p>Deine Mission wurde beendet.</p><button id="start">NEUE MISSION</button><button id="menu" style="margin-left:10px">ZUM STARTMENÜ</button></div>';
    document.getElementById("start").onclick = reset;
    document.getElementById("menu").onclick = function () {
      box.innerHTML =
        '<div class="card"><h1><span style="color:#ff2b2b;text-shadow:0 0 20px #ff0000;">UFO</span>-JAGD</h1><div class="intro"><b>Einsatzbriefing</b><br>Verteidige die 10 Kühe gegen UFOs. Triff UFOs, rette Kühe aus roten Strahlen und meide die Jets. Der Mond löst Zeitlupe aus.</div><input id="player" class="name" maxlength="18" placeholder="Dein Name" autocomplete="nickname"><button id="start">MISSION STARTEN</button><div class="scores"><b>HIGHSCORES</b><ol id="scores"></ol></div></div>';
      document.getElementById("start").onclick = reset;
      showScores();
    };
  };
  ui();
  requestAnimationFrame(frame);
})();
