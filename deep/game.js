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
  const O2_MAX = 100;      // Sauerstoff-Vorrat (Sekunden)
  const O2_START = 65;     // so viel hat man beim Start
  const O2_DRAIN = 1.8;    // Verbrauch pro Sekunde
  const ITEM_R = 13;       // Radius der Perlen (Einsammel-Toleranz)
  const SHIELD_TIME = 7;   // Sekunden Unverwundbarkeit
  const TURBO_TIME = 4;    // Sekunden Schub
  const MAGNET_TIME = 8;   // Sekunden Perlen-Magnet

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
    o2fill: document.getElementById('o2fill'),
    o2label: document.getElementById('o2label'),
    coins: document.getElementById('coins'),
    score: document.getElementById('score'),
    effects: document.getElementById('effects'),
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
  let fish = [];          // kleine Fischschwärme im Hintergrund
  let lastBubbleAt = 0;
  let lastDistShown = -1;
  let lastPassedShown = -1;
  let lastCoinsShown = -1;
  let lastScoreShown = -1;
  let lastO2Shown = -1;

  // Power-Up-Zustand
  let items = [];         // Perlen + Power-Ups im Wasser
  let floaters = [];      // aufsteigende Punktzahlen / Texte
  let o2 = O2_START;
  let coins = 0;          // eingesammelte Perlen
  let score = 0;          // Gesamtpunkte (Perlen + Strecke + Umschwommen)
  let nextItemAt = 0;     // Strecke, ab der die nächste Perle kommt
  let shieldT = 0;        // Restzeit Schild (s)
  let turboT = 0;         // Restzeit Turbo (s)
  let magnetT = 0;        // Restzeit Magnet (s)
  let hurtT = 0;          // Rot-Flash nach Rettung
  let invulnT = 0;        // kurze Unverwundbarkeit nach Rettung
  let effectsHtml = '';   // aktuelle Anzeige der aktiven Power-Ups

  const diver = { x: 180, y: 300, vx: 0, vy: 0, r: 16, anim: 0 };

  const keys = {};
  let pointer = null;     // Zeiger in Weltkoordinaten
  let pointerActive = false;

  function buildBackground() {
    specks = Array.from({ length: 60 }, () => ({
      x: rand(0, W), y: rand(TOP, FLOOR), s: rand(0.6, 2.2), f: rand(0.3, 1),
    }));
    weeds = [];
    fish = [];
    // Drei lockere Schwärme geben der Tiefe Leben, ohne Hindernisse zu verdecken.
    for (let school = 0; school < 3; school++) {
      const baseX = rand(100, 1500);
      const baseY = rand(TOP + 90, FLOOR - 110);
      const scale = rand(0.55, 0.95);
      for (let i = 0; i < 6; i++) {
        fish.push({
          x: baseX + (i % 3) * rand(24, 42),
          y: baseY + Math.floor(i / 3) * rand(15, 26) + rand(-5, 5),
          scale: scale * rand(0.8, 1.15),
          phase: rand(0, Math.PI * 2),
          speed: rand(0.12, 0.28),
        });
      }
    }
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
    items = [];
    floaters = [];
    lastBubbleAt = 0;
    Object.assign(diver, { x: 180, y: 300, vx: 0, vy: 0, anim: 0 });
    lastDistShown = -1;
    lastPassedShown = -1;
    lastCoinsShown = -1;
    lastScoreShown = -1;
    lastO2Shown = -1;
    o2 = O2_START;
    coins = 0;
    score = 0;
    nextItemAt = 620;
    shieldT = 0;
    turboT = 0;
    magnetT = 0;
    hurtT = 0;
    invulnT = 0;
    effectsHtml = '';
    if (el.effects) el.effects.innerHTML = '';
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
        addScore(15);
      }
    }
  }

  // ---------- Steuerung / Physik ----------
  function updateDiver(dt) {
    let dvx = 0;
    let dvy = 0;
    // Turbo lässt den Taucher schneller schwimmen
    const maxSpeed = MAX_SPEED * (turboT > 0 ? 1.75 : 1);
    const left = keys.ArrowLeft || keys.KeyA;
    const right = keys.ArrowRight || keys.KeyD;
    const up = keys.ArrowUp || keys.KeyW;
    const down = keys.ArrowDown || keys.KeyS;
    const kx = (right ? 1 : 0) - (left ? 1 : 0);
    const ky = (down ? 1 : 0) - (up ? 1 : 0);

    if (kx || ky) {
      const len = Math.hypot(kx, ky);
      dvx = (kx / len) * maxSpeed;
      dvy = (ky / len) * maxSpeed;
    } else if (pointerActive && pointer) {
      const ex = pointer.x - diver.x;
      const ey = pointer.y - diver.y;
      const dist = Math.hypot(ex, ey);
      if (dist > 4) {
        const sp = Math.min(maxSpeed, dist * 3.5);
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

  // ---------- Power-Ups / Perlen ----------
  // Perlen (coin) = Punkte sammeln, o2 = Luft auffüllen,
  // shield = 7 s unverwundbar, turbo = 4 s schneller, magnet = 8 s Perlen anziehen
  function spawnItem() {
    const roll = Math.random();
    let kind = 'coin';
    if (roll < 0.36) kind = 'coin';
    else if (roll < 0.53) kind = 'o2';
    else if (roll < 0.69) kind = 'shield';
    else if (roll < 0.84) kind = 'turbo';
    else kind = 'magnet';

    // Perlen kommen auch als kleine Kette (3 Stück im Bogen)
    if (kind === 'coin' && Math.random() < 0.55) {
      const y0 = rand(TOP + 80, FLOOR - 80);
      const up = Math.random() < 0.5 ? -1 : 1;
      for (let i = 0; i < 3; i++) {
        items.push({
          kind: 'coin', x: W + 80 + i * 46, y: y0 + up * i * 26,
          ph: rand(0, Math.PI * 2), r: ITEM_R, life: 0,
        });
      }
      return;
    }
    items.push({
      kind, x: W + 80, y: rand(TOP + 70, FLOOR - 70),
      ph: rand(0, Math.PI * 2), r: kind === 'coin' ? ITEM_R : 16, life: 0,
    });
  }

  function itemLabel(kind) {
    if (kind === 'o2') return 'O₂ +30';
    if (kind === 'shield') return 'SCHILD 7s';
    if (kind === 'turbo') return 'TURBO 4s';
    if (kind === 'magnet') return 'MAGNET 8s';
    return '+5';
  }

  function itemColor(kind) {
    if (kind === 'o2') return '#7fe7ff';
    if (kind === 'shield') return '#ffd465';
    if (kind === 'turbo') return '#ff8a3d';
    if (kind === 'magnet') return '#c79bff';
    return '#eafcff';
  }

  function addFloater(text, x, y, color) {
    floaters.push({ text, x, y, color, life: 0 });
  }

  function collectItem(it) {
    if (it.kind === 'coin') {
      coins++;
      addScore(5);
      addFloater('+5', it.x, it.y, '#eafcff');
    } else if (it.kind === 'o2') {
      o2 = Math.min(O2_MAX, o2 + 30);
      addFloater('O₂ +30', it.x, it.y, itemColor('o2'));
    } else if (it.kind === 'shield') {
      shieldT = Math.max(shieldT, SHIELD_TIME);
      addFloater(itemLabel('shield'), it.x, it.y, itemColor('shield'));
    } else if (it.kind === 'turbo') {
      turboT = Math.max(turboT, TURBO_TIME);
      addFloater(itemLabel('turbo'), it.x, it.y, itemColor('turbo'));
    } else if (it.kind === 'magnet') {
      magnetT = Math.max(magnetT, MAGNET_TIME);
      addFloater(itemLabel('magnet'), it.x, it.y, itemColor('magnet'));
    }
    // Kleine Sammel-Explosion aus Bläschen
    for (let i = 0; i < 7; i++) {
      bubbles.push({
        x: it.x, y: it.y, r: rand(1.5, 4), life: 0, vy: rand(-110, -40),
      });
    }
  }

  function addScore(n) {
    score += n;
  }

  // Anzeige-Punkte: Ereignis-Punkte + 2 pro geschwommenem Meter
  function totalScore() {
    return score + Math.floor(traveled / 100) * 2;
  }

  function updateItems(dt, scroll) {
    const magnet = magnetT > 0;
    items = items.filter((it) => {
      it.x -= scroll * dt;
      it.life += dt;
      it.y += Math.sin(t * 2 + it.ph) * 14 * dt;

      // Magnet zieht Perlen zum Taucher
      if (magnet && it.kind === 'coin') {
        const dx = diver.x - it.x, dy = diver.y - it.y;
        const d = Math.hypot(dx, dy);
        if (d < 260 && d > 1) {
          const pull = 520 * dt;
          it.x += (dx / d) * pull;
          it.y += (dy / d) * pull;
        }
      }

      // Einsammeln
      const dx = diver.x - it.x, dy = diver.y - it.y;
      const reach = diver.r + it.r + 4;
      if (dx * dx + dy * dy < reach * reach) {
        collectItem(it);
        return false;
      }
      return it.x > -120;
    });

    // Timer der Power-Ups herunterzählen
    shieldT = Math.max(0, shieldT - dt);
    turboT = Math.max(0, turboT - dt);
    magnetT = Math.max(0, magnetT - dt);
    hurtT = Math.max(0, hurtT - dt);
    invulnT = Math.max(0, invulnT - dt);

    // Texte aufsteigen lassen
    floaters = floaters.filter((f) => {
      f.life += dt;
      f.y -= 34 * dt;
      return f.life < 1.2;
    });
  }

  function updateOxygen(dt) {
    // Taucher verbraucht Luft; je schneller er schwimmt, desto mehr
    const speed = Math.hypot(diver.vx, diver.vy);
    const extra = speed > 260 ? 0.5 : 0;
    o2 -= (O2_DRAIN + extra) * dt;
    if (o2 <= 0) {
      o2 = 0;
      gameOver('out');
    }
  }

  function updateEffectsHud() {
    const parts = [];
    if (shieldT > 0) parts.push(`<span class="fx fx-shield">🛡 ${shieldT.toFixed(1)}s</span>`);
    if (turboT > 0) parts.push(`<span class="fx fx-turbo">🚀 ${turboT.toFixed(1)}s</span>`);
    if (magnetT > 0) parts.push(`<span class="fx fx-magnet">🧲 ${magnetT.toFixed(1)}s</span>`);
    const html = parts.join('');
    if (html !== effectsHtml) {
      effectsHtml = html;
      if (el.effects) el.effects.innerHTML = html;
    }
  }

  function updateHud() {
    const meters = Math.floor(traveled / 100);
    if (meters !== lastDistShown) {
      el.dist.textContent = meters;
      lastDistShown = meters;
    }
    if (passed !== lastPassedShown) {
      el.passed.textContent = passed;
      lastPassedShown = passed;
    }
    if (coins !== lastCoinsShown) {
      if (el.coins) el.coins.textContent = coins;
      lastCoinsShown = coins;
    }
    const shownScore = totalScore();
    if (shownScore !== lastScoreShown) {
      if (el.score) el.score.textContent = shownScore;
      lastScoreShown = shownScore;
    }
    const o2Rounded = Math.ceil(o2);
    if (o2Rounded !== lastO2Shown) {
      lastO2Shown = o2Rounded;
      if (el.o2fill) {
        const pct = clamp(o2 / O2_MAX, 0, 1) * 100;
        el.o2fill.style.width = pct + '%';
        el.o2fill.style.background = o2 < 25 ? '#ff5252' : o2 < 50 ? '#ffc21a' : '#4fe3a1';
      }
      if (el.o2label) el.o2label.textContent = o2Rounded;
    }
    updateEffectsHud();
  }

  // ---------- Ablauf ----------
  function start() {
    resetGame();
    state = 'play';
    el.overlay.hidden = true;
  }

  function gameOver(reason) {
    state = 'over';
    const meters = Math.floor(traveled / 100);
    const newBest = meters > best;
    if (newBest) {
      best = meters;
      localStorage.setItem(BEST_KEY, String(best));
      el.best.textContent = best;
    }
    const reasonText = reason === 'out'
      ? 'Die Luft ist ausgegangen – auftauchen!'
      : 'Du bist gegen ein Hindernis geschwommen.';
    showOverlay(
      'GEKRACHT',
      `${reasonText}<br>
       Distanz: <b>${meters} m</b> · Umschwommen: <b>${passed}</b><br>
       Perlen: <b>${coins}</b> · Punkte: <b>${totalScore()}</b>${newBest ? ' · <b>NEUER REKORD!</b>' : ''}<br><br>
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

  function drawSurface() {
    // Bewegte, feine Wellenkante und Lichtreflexe direkt unter der Oberfläche.
    const shimmer = 0.45 + Math.sin(t * 1.7) * 0.08;
    ctx.save();
    ctx.strokeStyle = `rgba(190, 250, 255, ${shimmer})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, TOP + 8);
    for (let x = 0; x <= W; x += 24) {
      ctx.lineTo(x, TOP + 8 + Math.sin(x * 0.025 + t * 2.2) * 3);
    }
    ctx.stroke();
    for (let i = 0; i < 9; i++) {
      const x = ((i * 137 - traveled * 0.24 + t * 18) % (W + 100) + W + 100) % (W + 100) - 50;
      const y = TOP + 18 + (i % 3) * 11;
      ctx.globalAlpha = 0.18 + 0.12 * Math.sin(t * 2 + i);
      ctx.strokeStyle = '#d3fbff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(x, y, 17 + (i % 4) * 5, 2, -0.08, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawFish() {
    // Fische ziehen langsam an der Kamera vorbei und schwimmen leicht im Takt.
    ctx.save();
    for (const f of fish) {
      const period = W + 180;
      const sx = ((f.x - traveled * f.speed + t * 12) % period + period) % period - 70;
      const sy = f.y + Math.sin(t * 1.5 + f.phase) * 5;
      const s = f.scale;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.scale(s, s);
      ctx.globalAlpha = 0.19;
      ctx.fillStyle = '#b9e9e8';
      ctx.beginPath();
      ctx.ellipse(0, 0, 13, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      const tail = Math.sin(t * 8 + f.phase) * 2;
      ctx.beginPath();
      ctx.moveTo(-11, 0);
      ctx.lineTo(-19, -6 + tail);
      ctx.lineTo(-19, 6 + tail);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-1, -4);
      ctx.lineTo(3, -9);
      ctx.lineTo(6, -4);
      ctx.fill();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#eaffff';
      ctx.beginPath();
      ctx.arc(7, -1, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
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

  // ---------- Zeichnen: Perlen & Power-Ups ----------
  function drawItem(it) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 4 + it.ph);
    const col = itemColor(it.kind);

    ctx.save();
    ctx.translate(it.x, it.y);

    // Glow
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, it.r * 2.6);
    g.addColorStop(0, col);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.35 + 0.25 * pulse;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, it.r * 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    if (it.kind === 'coin') {
      // Perlmut-Perle mit Glanzpunkt
      const pg = ctx.createRadialGradient(-3, -4, 1, 0, 0, it.r);
      pg.addColorStop(0, '#ffffff');
      pg.addColorStop(0.55, '#dff4ff');
      pg.addColorStop(1, '#8fc4da');
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.arc(0, 0, it.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    } else {
      // Power-Up: runde Kapsel mit Symbol
      ctx.fillStyle = 'rgba(4, 26, 42, 0.85)';
      ctx.beginPath();
      ctx.arc(0, 0, it.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = 0.7 + 0.3 * pulse;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = col;
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const sym = it.kind === 'o2' ? 'O₂'
        : it.kind === 'shield' ? '🛡'
        : it.kind === 'turbo' ? '⚡'
        : '🧲';
      ctx.fillText(sym, 0, 1);
    }
    ctx.restore();
  }

  function drawItems() {
    for (const it of items) drawItem(it);
  }

  function drawFloaters() {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 15px system-ui, sans-serif';
    for (const f of floaters) {
      ctx.globalAlpha = clamp(1.2 - f.life, 0, 1);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawShield() {
    if (shieldT <= 0) return;
    const pulse = 0.5 + 0.5 * Math.sin(t * 6);
    // Blinken kurz vor Ablauf
    if (shieldT < 2 && Math.floor(shieldT * 8) % 2 === 0) return;
    ctx.save();
    ctx.translate(diver.x, diver.y);
    const r = 34 + pulse * 3;
    const g = ctx.createRadialGradient(0, 0, r * 0.55, 0, 0, r);
    g.addColorStop(0, 'rgba(255,212,101,0)');
    g.addColorStop(0.7, `rgba(255,212,101,${0.12 + pulse * 0.08})`);
    g.addColorStop(1, `rgba(255,235,170,${0.45 + pulse * 0.25})`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,236,180,${0.5 + pulse * 0.4})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  function drawVignette() {
    if (hurtT > 0) {
      ctx.fillStyle = `rgba(255,60,60,${hurtT * 0.5})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (o2 < 25) {
      const a = 0.18 + 0.12 * Math.sin(t * 8);
      ctx.fillStyle = `rgba(10,40,70,${a})`;
      ctx.fillRect(0, 0, W, H);
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

    // Schmale, schwarze Flosse
    ctx.save();
    ctx.translate(-19, 1);
    ctx.rotate(kick);
    ctx.fillStyle = '#090d11';
    ctx.beginPath();
    ctx.moveTo(-7, -4);
    ctx.quadraticCurveTo(-20, -6, -29, -2);
    ctx.lineTo(-34, 0);
    ctx.lineTo(-28, 4);
    ctx.quadraticCurveTo(-17, 7, -7, 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#39464d';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();

    // Kompakter Sauerstofftank mit dunklem Metall-Finish
    const tank = ctx.createLinearGradient(-19, 0, 4, 0);
    tank.addColorStop(0, '#202a30');
    tank.addColorStop(0.45, '#59656a');
    tank.addColorStop(1, '#20292e');
    ctx.fillStyle = tank;
    ctx.beginPath();
    ctx.roundRect(-17, -12, 18, 24, 6);
    ctx.fill();
    ctx.strokeStyle = '#849195';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#11191e';
    ctx.fillRect(-16, -3, 16, 3);
    ctx.fillStyle = '#75d9df';
    ctx.fillRect(-1, -11, 3, 4);

    // Schlanker schwarzer Neoprenanzug
    const suit = ctx.createLinearGradient(0, -10, 0, 10);
    suit.addColorStop(0, '#303a40');
    suit.addColorStop(0.34, '#171e23');
    suit.addColorStop(1, '#080c10');
    ctx.fillStyle = suit;
    ctx.beginPath();
    ctx.ellipse(0, 0, 15.5, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#414d52';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Dezente Nähte und Brust-/Gurt-Details
    ctx.strokeStyle = 'rgba(136, 166, 171, 0.62)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-7, -7);
    ctx.lineTo(-5, 7);
    ctx.moveTo(3, -8);
    ctx.lineTo(2, 8);
    ctx.stroke();
    ctx.fillStyle = '#5ab8c0';
    ctx.fillRect(-2, -1, 4, 2);
    ctx.fillStyle = 'rgba(220,245,245,0.18)';
    ctx.beginPath();
    ctx.ellipse(1, -5, 7, 2, -0.08, 0, Math.PI * 2);
    ctx.fill();

    // Schmaler Arm mit schwarzem Handschuh
    ctx.strokeStyle = '#151c20';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(4, -3);
    ctx.lineTo(4 + Math.cos(arm) * 14, -3 + Math.sin(arm) * 14);
    ctx.stroke();
    ctx.fillStyle = '#090d10';
    ctx.beginPath();
    ctx.arc(4 + Math.cos(arm) * 14, -3 + Math.sin(arm) * 14, 2.7, 0, Math.PI * 2);
    ctx.fill();

    // Schwarze Tauchermaske mit blau schimmernder Scheibe
    ctx.fillStyle = '#10171b';
    ctx.beginPath();
    ctx.arc(13, -10, 9.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#65777d';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.fillStyle = '#07384b';
    ctx.beginPath();
    ctx.ellipse(17, -10, 5.7, 5.2, -0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(164,238,255,0.9)';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.fillStyle = 'rgba(205,250,255,0.85)';
    ctx.beginPath();
    ctx.ellipse(15, -14, 2.1, 1.2, -0.4, 0, Math.PI * 2);
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

      // Perlen/Power-Ups spawnen
      while (traveled >= nextItemAt) {
        spawnItem();
        nextItemAt = traveled + rand(300, 620);
      }

      updateDiver(dt);
      updateObstacles(dt, scroll);
      updateItems(dt, scroll);
      checkPassed();
      updateOxygen(dt);

      // Kollision: mit Schild wird man gerettet statt zu sterben
      if (state === 'play' && invulnT <= 0) {
        for (const ob of obstacles) {
          if (obstacleHit(ob)) {
            if (shieldT > 0) {
              // Schild rettet: Hindernis zerspringt, kurze Unverwundbarkeit
              shieldT = 0;
              hurtT = 0.6;
              invulnT = 0.9;
              ob.dead = true;
              score += 25;
              addFloater('GERETTET! +25', diver.x, diver.y - 30, '#ffd465');
              for (let i = 0; i < 10; i++) {
                bubbles.push({
                  x: ob.x, y: ob.y, r: rand(2, 5), life: 0, vy: rand(-130, -50),
                });
              }
              obstacles = obstacles.filter((o) => !o.dead);
            } else {
              gameOver('hit');
            }
            break;
          }
        }
      }

      if (state === 'play') updateHud();
    } else if (state === 'ready' || state === 'over') {
      // Hintergrund läuft weiter, damit die Szene lebt
      t += dt;
      traveled += 120 * dt;
      updateDiver(dt);
      floaters = floaters.filter((f) => (f.life += dt) < 1.2);
    }

    // Zeichnen
    ctx.clearRect(0, 0, W, H);
    drawBackground();
    drawSurface();
    drawFish();
    drawWeeds(true);
    drawObstacles();
    drawSeabed();
    drawWeeds(false);
    drawItems();
    drawBubbles(state === 'paused' ? 0 : dt);
    drawDiver();
    drawShield();
    drawFloaters();
    drawVignette();

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
     Achte auf deine <b>Luft (O₂)</b> – sie läuft ständig ab, <b>Luftflaschen</b> füllen sie wieder auf.
     Sammle <b>Perlen</b> für Punkte, und sichere dir
     <b style="color:#ffd465">Schild</b> 🛡, <b style="color:#ff8a3d">Turbo</b> ⚡ und
     <b style="color:#c79bff">Magnet</b> 🧲 für den Vorteil.<br><br>
     <kbd>Pfeiltasten</kbd>/<kbd>WASD</kbd> oder Maus/Finger = steuern · <kbd>P</kbd> = Pause<br><br>
     <kbd>Leertaste</kbd> oder Klick = Start`
  );
  requestAnimationFrame(frame);
})();
