/* DEEP – der Taucher ist ständig im Wasser.
 * Er schwimmt dauerhaft nach rechts (Strömung/Vortrieb), der Spieler steuert
 * ihn in alle Richtungen und muss Riffe, Felsen, Quallen und Haie umschwimmen.
 * Steuerung: Pfeiltasten / WASD, Maus oder Finger (zieht den Taucher zum Zeiger).
 */
(() => {
  'use strict';

  // ---------- Grundgerüst ----------
  const W = 960;
  const H = 600;
  const TOP = 18;          // Wasseroberfläche (Decke des Spielfelds)
  const FLOOR = 556;       // Meeresboden
  const MAX_SPEED = 300;   // Schwimmgeschwindigkeit des Tauchers (px/s)
  const BEST_KEY = 'deepBest';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const el = {
    dist: document.getElementById('dist'),
    passed: document.getElementById('passed'),
    best: document.getElementById('best'),
    overlay: document.getElementById('overlay'),
    title: document.getElementById('ovTitle'),
    msg: document.getElementById('ovMsg'),
  };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);

  let best = Number(localStorage.getItem(BEST_KEY)) || 0;
  el.best.textContent = Math.floor(best);

  // ---------- Zustand ----------
  // 'ready' = Startbildschirm, 'play', 'paused', 'over'
  let state = 'ready';
  let t = 0;              // Spielzeit (s)
  let traveled = 0;       // zurückgelegte Strecke (px)
  let passed = 0;         // umschwommene Hindernisse
  let nextSpawn = 0;      // Strecke, ab der das nächste Hindernis kommt
  let obstacles = [];
  let bubbles = [];
  let specks = [];        // Plankton im Hintergrund
  let weeds = [];         // Seegras (Parallax)
  let lastBubbleAt = 0;
  let lastDistShown = -1;
  let lastPassedShown = -1;

  const diver = { x: 180, y: 300, vx: 0, vy: 0, r: 20, anim: 0 };

  const keys = {};
  let pointer = null;     // Zeiger in Weltkoordinaten
  let pointerActive = false;

  function buildBackground() {
    specks = Array.from({ length: 60 }, () => ({
      x: rand(0, W), y: rand(TOP, FLOOR), s: rand(0.6, 2.2), f: rand(0.3, 1),
    }));
    weeds = [];
    for (let i = 0; i < 46; i++) {
      const far = i % 2 === 0;
      weeds.push({
        x: rand(0, 1400),
        h: far ? rand(70, 130) : rand(120, 210),
        ph: rand(0, Math.PI * 2),
        far,
      });
    }
  }

  function resetGame() {
    t = 0;
    traveled = 0;
    passed = 0;
    nextSpawn = 700;
    obstacles = [];
    bubbles = [];
    lastBubbleAt = 0;
    Object.assign(diver, { x: 180, y: 300, vx: 0, vy: 0, anim: 0 });
    lastDistShown = -1;
    lastPassedShown = -1;
  }

  // ---------- Hindernisse ----------
  // Alle Hindernisse: x/y = Mittelpunkt. Typen:
  //  pillar = Korallenpfeiler (Rechteck, von oben oder unten – muss umschwommen werden)
  //  rock   = Felsen (Kreis, fest)
  //  jelly  = Qualle (Kreis, schwebt auf und ab)
  //  shark  = Hai (Kreis, schwimmt schnell nach links und verfolgt den Taucher vertikal)
  function spawnPattern() {
    const x = W + 90;
    const roll = Math.random();
    const sharkOk = traveled > 2500;

    if (roll < 0.34) {
      // Korallenpfeiler von oben oder unten
      const fromTop = Math.random() < 0.5;
      const w = rand(60, 96);
      const h = rand(190, 370);
      obstacles.push({
        type: 'pillar', x, y: fromTop ? TOP + h / 2 : FLOOR - h / 2,
        w, h, seed: Math.random(),
      });
      // Manchmal ein zweiter Pfeiler versetzt auf der anderen Seite (Slalom)
      if (Math.random() < 0.45) {
        const h2 = rand(170, 330);
        const x2 = x + w / 2 + rand(170, 240);
        obstacles.push({
          type: 'pillar', x: x2, y: fromTop ? FLOOR - h2 / 2 : TOP + h2 / 2,
          w: rand(60, 90), h: h2, seed: Math.random(),
        });
      }
    } else if (roll < 0.6) {
      // Felsen, auch paarweise (Gruppe)
      const count = Math.random() < 0.35 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const r = rand(26, 44);
        const pts = Array.from({ length: 9 }, (_, k) => ({
          a: (k / 9) * Math.PI * 2,
          f: rand(0.8, 1.1),
        }));
        obstacles.push({
          type: 'rock', x: x + i * rand(70, 110), y: rand(TOP + 90, FLOOR - 90),
          r, pts,
        });
      }
    } else if (roll < 0.8 || !sharkOk) {
      // Qualle
      const y0 = rand(TOP + 110, FLOOR - 110);
      obstacles.push({
        type: 'jelly', x, y: y0, y0, amp: rand(40, 90), freq: rand(1.2, 2.2),
        ph: rand(0, Math.PI * 2), r: 28,
      });
    } else {
      // Hai
      obstacles.push({
        type: 'shark', x, y: rand(TOP + 60, FLOOR - 60), r: 30,
        vmax: rand(90, 140), extra: rand(120, 200),
      });
    }
  }

  function nextSpacing() {
    // Abstand zwischen Hindernissen; wird mit der Strecke enger
    const tighten = Math.min(130, traveled / 150);
    return clamp(rand(300, 460) - tighten, 180, 460);
  }

  function obstacleHit(ob) {
    const dx = diver.x;
    const dy = diver.y;
    const r = diver.r;
    if (ob.type === 'pillar') {
      const l = ob.x - ob.w / 2, rr = ob.x + ob.w / 2;
      const tt = ob.y - ob.h / 2, bb = ob.y + ob.h / 2;
      const cx = clamp(dx, l, rr);
      const cy = clamp(dy, tt, bb);
      const ddx = dx - cx, ddy = dy - cy;
      return ddx * ddx + ddy * ddy < (r - 3) * (r - 3);
    }
    // Kreis-Hindernisse (mit kleiner Toleranz, damit es fair bleibt)
    const rad = ob.type === 'shark' ? ob.r - 4 : ob.r * 0.85;
    const ddx = dx - ob.x, ddy = dy - ob.y;
    const lim = r + rad - 4;
    return ddx * ddx + ddy * ddy < lim * lim;
  }

  function trailingEdge(ob) {
    return ob.type === 'pillar' ? ob.x + ob.w / 2 : ob.x + (ob.r || 0);
  }

  function updateObstacles(dt, scroll) {
    for (const ob of obstacles) {
      ob.x -= scroll * dt;
      if (ob.type === 'jelly') {
        ob.y = ob.y0 + Math.sin(t * ob.freq + ob.ph) * ob.amp;
      } else if (ob.type === 'shark') {
        ob.x -= ob.extra * dt;
        const want = diver.y - ob.y;
        const step = ob.vmax * dt;
        ob.y += clamp(want, -step, step);
        ob.y = clamp(ob.y, TOP + ob.r, FLOOR - ob.r);
      }
    }
    // Hindernisse, die den linken Rand verlassen haben, entfernen
    obstacles = obstacles.filter((ob) => ob.x > -200);
  }

  function checkPassed() {
    for (const ob of obstacles) {
      if (!ob.counted && trailingEdge(ob) < diver.x - diver.r) {
        ob.counted = true;
        passed++;
      }
    }
  }

  // ---------- Steuerung / Physik ----------
  function updateDiver(dt) {
    let dvx = 0;
    let dvy = 0;
    const left = keys.ArrowLeft || keys.KeyA;
    const right = keys.ArrowRight || keys.KeyD;
    const up = keys.ArrowUp || keys.KeyW;
    const down = keys.ArrowDown || keys.KeyS;
    const kx = (right ? 1 : 0) - (left ? 1 : 0);
    const ky = (down ? 1 : 0) - (up ? 1 : 0);

    if (kx || ky) {
      const len = Math.hypot(kx, ky);
      dvx = (kx / len) * MAX_SPEED;
      dvy = (ky / len) * MAX_SPEED;
    } else if (pointerActive && pointer) {
      const ex = pointer.x - diver.x;
      const ey = pointer.y - diver.y;
      const dist = Math.hypot(ex, ey);
      if (dist > 4) {
        const sp = Math.min(MAX_SPEED, dist * 3.5);
        dvx = (ex / dist) * sp;
        dvy = (ey / dist) * sp;
      }
    }

    // Wasserwiderstand: die Geschwindigkeit nähert sich dem Ziel weich an
    const k = Math.min(1, dt * 5);
    diver.vx += (dvx - diver.vx) * k;
    diver.vy += (dvy - diver.vy) * k;
    diver.x += diver.vx * dt;
    diver.y += diver.vy * dt;

    // Im Wasser bleiben: zwischen Oberfläche und Meeresboden, seitlich im Bild
    diver.x = clamp(diver.x, 60, W - 60);
    diver.y = clamp(diver.y, TOP + diver.r, FLOOR - diver.r);

    // Schwimmanimation nur, wenn sich der Taucher wirklich bewegt
    const speed = Math.hypot(diver.vx, diver.vy);
    if (speed > 8) diver.anim += dt * (3 + speed / 70);

    // Atemblasen
    if (t - lastBubbleAt > 0.35) {
      lastBubbleAt = t;
      bubbles.push({
        x: diver.x - 24, y: diver.y - 12,
        r: rand(2, 4.5), life: 0, vy: rand(-70, -110),
      });
    }
  }

  // ---------- Ablauf ----------
  function start() {
    resetGame();
    state = 'play';
    el.overlay.hidden = true;
  }

  function gameOver() {
    state = 'over';
    const meters = Math.floor(traveled / 100);
    if (meters > best) {
      best = meters;
      localStorage.setItem(BEST_KEY, String(best));
      el.best.textContent = best;
    }
    showOverlay(
      'GEKRACHT',
      `Du bist gegen ein Hindernis geschwommen.<br>
       Distanz: <b>${meters} m</b> · Umschwommen: <b>${passed}</b><br><br>
       <kbd>Leertaste</kbd> oder Klick = nochmal`
    );
  }

  function showOverlay(title, html) {
    el.title.textContent = title;
    el.msg.innerHTML = html;
    el.overlay.hidden = false;
  }

  function togglePause() {
    if (state === 'play') {
      state = 'paused';
      showOverlay('PAUSE', '<kbd>P</kbd> oder <kbd>Leertaste</kbd> = weiter');
    } else if (state === 'paused') {
      state = 'play';
      el.overlay.hidden = true;
    }
  }

  // ---------- Zeichnen: Hintergrund ----------
  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1b8fb8');
    g.addColorStop(0.35, '#0b5a80');
    g.addColorStop(0.7, '#063656');
    g.addColorStop(1, '#021a2c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Lichtstrahlen von der Oberfläche
    ctx.save();
    for (let i = 0; i < 6; i++) {
      const bx = ((i * 220 - traveled * 0.05 + t * 8) % (W + 300) + W + 300) % (W + 300) - 150;
      const grad = ctx.createLinearGradient(bx, 0, bx + 120, H * 0.8);
      grad.addColorStop(0, 'rgba(180,245,255,0.16)');
      grad.addColorStop(1, 'rgba(180,245,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(bx, 0);
      ctx.lineTo(bx + 70, 0);
      ctx.lineTo(bx + 240, H * 0.8);
      ctx.lineTo(bx + 120, H * 0.8);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Plankton
    ctx.fillStyle = 'rgba(200,240,255,0.5)';
    for (const p of specks) {
      const px = ((p.x - traveled * 0.5 * p.f) % W + W) % W;
      ctx.globalAlpha = 0.3 + 0.4 * p.f;
      ctx.beginPath();
      ctx.arc(px, p.y + Math.sin(t + p.s * 3) * 4, p.s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawWeeds(far) {
    const period = 1400;
    const speed = far ? 0.35 : 0.8;
    for (const w of weeds) {
      if (w.far !== far) continue;
      const sx = (((w.x - traveled * speed) % period) + period) % period - 40;
      ctx.strokeStyle = far ? '#0f5f4d' : '#15876a';
      ctx.lineWidth = far ? 6 : 9;
      ctx.lineCap = 'round';
      ctx.globalAlpha = far ? 0.55 : 0.95;
      ctx.beginPath();
      ctx.moveTo(sx, FLOOR + 10);
      const sway = Math.sin(t * 1.4 + w.ph) * 18;
      ctx.quadraticCurveTo(sx + sway * 0.4, FLOOR - w.h * 0.5, sx + sway, FLOOR - w.h);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawSeabed() {
    ctx.fillStyle = '#c2a16a';
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 20) {
      const y = FLOOR + 14 + Math.sin((x + traveled * 0.8) * 0.02) * 6 + Math.sin(x * 0.07) * 3;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#8c7346';
    ctx.fillRect(0, FLOOR + 40, W, H);
    // Kieselsteine
    ctx.fillStyle = '#6e5a38';
    for (let i = 0; i < 18; i++) {
      const sx = ((i * 97 - traveled * 0.8) % W + W) % W;
      ctx.beginPath();
      ctx.ellipse(sx, FLOOR + 48 + (i % 3) * 12, 6 + (i % 4), 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ---------- Zeichnen: Hindernisse ----------
  function drawPillar(ob) {
    const l = ob.x - ob.w / 2;
    const tp = ob.y - ob.h / 2;
    const g = ctx.createLinearGradient(l, 0, l + ob.w, 0);
    g.addColorStop(0, '#176b5a');
    g.addColorStop(0.5, '#2fa485');
    g.addColorStop(1, '#17624f');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(l, tp, ob.w, ob.h, 14);
    ctx.fill();
    // Korallenknubbel
    ctx.fillStyle = '#58c9a6';
    for (let i = 0; i < 6; i++) {
      const by = tp + 16 + ((i * 53 + ob.seed * 100) % Math.max(1, ob.h - 30));
      const bx = l + ((i % 2) ? 8 : ob.w - 8);
      ctx.beginPath();
      ctx.arc(bx, by, 7 + (i % 3) * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawRock(ob) {
    ctx.fillStyle = '#4a5563';
    ctx.strokeStyle = '#7d8a99';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ob.pts.forEach((p, i) => {
      const rr = ob.r * p.f;
      const px = ob.x + Math.cos(p.a) * rr;
      const py = ob.y + Math.sin(p.a) * rr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  function drawJelly(ob) {
    const { x, y, r } = ob;
    ctx.fillStyle = 'rgba(255,130,200,0.55)';
    ctx.strokeStyle = 'rgba(255,200,230,0.8)';
    ctx.lineWidth = 2;
    // Tentakel
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * 9, y + 6);
      for (let k = 1; k <= 4; k++) {
        ctx.lineTo(x + i * 9 + Math.sin(t * 5 + i + k) * 5, y + 6 + k * 12);
      }
      ctx.stroke();
    }
    // Glocke
    ctx.beginPath();
    ctx.arc(x, y, r, Math.PI, 0);
    ctx.quadraticCurveTo(x + r * 0.6, y + r * 0.4, x, y + r * 0.5);
    ctx.quadraticCurveTo(x - r * 0.6, y + r * 0.4, x - r, y);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.ellipse(x - 8, y - 12, 7, 4, -0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawShark(ob) {
    const { x, y } = ob;
    const flip = Math.sin(t * 9) * 4;
    // Schwanzflosse (rechts, da der Hai nach links schwimmt)
    ctx.fillStyle = '#5d6d80';
    ctx.beginPath();
    ctx.moveTo(x + 40, y);
    ctx.lineTo(x + 66, y - 20 + flip);
    ctx.lineTo(x + 66, y + 20 + flip);
    ctx.closePath();
    ctx.fill();
    // Körper
    ctx.fillStyle = '#7b8ea3';
    ctx.beginPath();
    ctx.ellipse(x, y, 50, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    // Bauch
    ctx.fillStyle = '#d7e2ec';
    ctx.beginPath();
    ctx.ellipse(x - 4, y + 9, 40, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    // Rückenflosse
    ctx.fillStyle = '#5d6d80';
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 16);
    ctx.lineTo(x + 8, y - 36);
    ctx.lineTo(x + 18, y - 14);
    ctx.closePath();
    ctx.fill();
    // Auge
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(x - 30, y - 4, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawObstacles() {
    for (const ob of obstacles) {
      if (ob.type === 'pillar') drawPillar(ob);
      else if (ob.type === 'rock') drawRock(ob);
      else if (ob.type === 'jelly') drawJelly(ob);
      else if (ob.type === 'shark') drawShark(ob);
    }
  }

  // ---------- Zeichnen: Taucher ----------
  function drawDiver() {
    const tilt = clamp(diver.vy / 600, -0.45, 0.45);
    const moving = Math.hypot(diver.vx, diver.vy) > 8;
    const kick = moving ? Math.sin(diver.anim * 2) * 0.35 : 0;
    const arm = moving ? -0.7 + Math.sin(diver.anim) * 1.0 : -0.3;

    ctx.save();
    ctx.translate(diver.x, diver.y);
    ctx.rotate(tilt);

    // Flosse
    ctx.save();
    ctx.translate(-20, 0);
    ctx.rotate(kick);
    ctx.fillStyle = '#e8562a';
    ctx.beginPath();
    ctx.ellipse(-9, 0, 13, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Sauerstofftank auf dem Rücken
    ctx.fillStyle = '#9aa8b5';
    ctx.beginPath();
    ctx.roundRect(-18, -15, 22, 30, 7);
    ctx.fill();
    ctx.fillStyle = '#5f6e7d';
    ctx.fillRect(-18, -4, 22, 3);

    // Körper (Taucheranzug)
    ctx.fillStyle = '#ffc21a';
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1d3557';
    ctx.fillRect(-2, -12, 5, 24);

    // Arm
    ctx.strokeStyle = '#ffc21a';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(4, -4);
    ctx.lineTo(4 + Math.cos(arm) * 15, -4 + Math.sin(arm) * 15);
    ctx.stroke();

    // Helm mit Sichtscheibe
    ctx.fillStyle = '#ffc21a';
    ctx.beginPath();
    ctx.arc(13, -12, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0b3d5c';
    ctx.beginPath();
    ctx.arc(17, -12, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(180,240,255,0.8)';
    ctx.beginPath();
    ctx.arc(15, -15, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawBubbles(dt) {
    ctx.fillStyle = 'rgba(210,245,255,0.6)';
    ctx.strokeStyle = 'rgba(220,250,255,0.9)';
    ctx.lineWidth = 1.2;
    bubbles = bubbles.filter((b) => (b.life += dt) < 2.2 && b.y > TOP - 20);
    for (const b of bubbles) {
      b.y += b.vy * dt;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // ---------- Hauptschleife ----------
  function frame(now) {
    const dt = Math.min(0.033, (now - (frame.last || now)) / 1000);
    frame.last = now;

    if (state === 'play') {
      t += dt;
      const scroll = Math.min(500, 230 + traveled / 60);
      traveled += scroll * dt;

      while (traveled >= nextSpawn) {
        spawnPattern();
        nextSpawn = traveled + nextSpacing();
      }

      updateDiver(dt);
      updateObstacles(dt, scroll);
      checkPassed();

      for (const ob of obstacles) {
        if (obstacleHit(ob)) {
          gameOver();
          break;
        }
      }

      const meters = Math.floor(traveled / 100);
      if (meters !== lastDistShown) {
        el.dist.textContent = meters;
        lastDistShown = meters;
      }
      if (passed !== lastPassedShown) {
        el.passed.textContent = passed;
        lastPassedShown = passed;
      }
    } else if (state === 'ready' || state === 'over') {
      // Hintergrund läuft weiter, damit die Szene lebt
      t += dt;
      traveled += 120 * dt;
      updateDiver(dt);
    }

    // Zeichnen
    ctx.clearRect(0, 0, W, H);
    drawBackground();
    drawWeeds(true);
    drawObstacles();
    drawSeabed();
    drawWeeds(false);
    drawBubbles(state === 'paused' ? 0 : dt);
    drawDiver();

    requestAnimationFrame(frame);
  }

  // ---------- Eingaben ----------
  const GAME_KEYS = new Set([
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space',
    'KeyW', 'KeyA', 'KeyS', 'KeyD',
  ]);

  window.addEventListener('keydown', (e) => {
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    if (e.repeat) return;
    if (e.code === 'Space' || e.code === 'Enter') {
      action();
    } else if (e.code === 'KeyP') {
      togglePause();
    } else {
      keys[e.code] = true;
    }
  });

  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });

  window.addEventListener('blur', () => {
    for (const k of Object.keys(keys)) keys[k] = false;
    pointerActive = false;
  });

  function toWorld(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * W,
      y: ((e.clientY - rect.top) / rect.height) * H,
    };
  }

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' && e.buttons === 0) return;
    pointer = toWorld(e);
    pointerActive = true;
  });

  window.addEventListener('pointerdown', (e) => {
    pointer = toWorld(e);
    pointerActive = true;
    action();
  });

  window.addEventListener('pointerup', (e) => {
    // Bei Touch den Zeiger loslassen, damit der Taucher sich wieder selbst bewegt
    if (e.pointerType !== 'mouse') pointerActive = false;
  });

  // Leertaste/Enter/Klick: starten, neu starten oder Pause beenden
  function action() {
    if (state === 'ready' || state === 'over') start();
    else if (state === 'paused') togglePause();
  }

  // ---------- Start ----------
  buildBackground();
  diver.x = 180;
  diver.y = 300;
  showOverlay(
    'DEEP',
    `Der Taucher ist immer im Wasser und schwimmt von selbst weiter.<br>
     Weiche <b>Korallen</b>, <b>Felsen</b>, <b>Quallen</b> und <b>Haien</b> aus und schwimm um sie herum.<br><br>
     <kbd>Pfeiltasten</kbd>/<kbd>WASD</kbd> oder Maus/Finger = steuern · <kbd>P</kbd> = Pause<br><br>
     <kbd>Leertaste</kbd> oder Klick = Start`
  );
  requestAnimationFrame(frame);
})();
