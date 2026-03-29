/* ── Cinematic Creature Animation System ── */

(function initCreatures() {
  const canvas = document.getElementById("creatureCanvas");
  const ctx = canvas.getContext("2d");
  let W, H;

  const TOP_SAFE = 0; // No restriction on main page
  function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
  resize();
  window.addEventListener("resize", resize);

  // ── Dust particles ──
  const particles = [];
  for (let i = 0; i < 60; i++) particles.push({
    x: Math.random() * 2000, y: Math.random() * 2000,
    vx: (Math.random() - .5) * .15, vy: (Math.random() - .5) * .12,
    r: Math.random() * 2 + .5, a: Math.random() * .25 + .08,
    pulse: Math.random() * Math.PI * 2, pulseSpd: Math.random() * .008 + .003
  });

  function drawParticles() {
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.pulse += p.pulseSpd;
      if (p.x < -10) p.x = W + 10; if (p.x > W + 10) p.x = -10;
      if (p.y < -10) p.y = H + 10; if (p.y > H + 10) p.y = -10;
      const alpha = p.a * (0.6 + 0.4 * Math.sin(p.pulse));
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,180,170,${alpha})`; ctx.fill();
    });
  }

  // ── Bat drawing ──
  function drawBat(x, y, size, angle, wingPhase, layer, flip) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(angle);
    if (flip) ctx.scale(-1, 1);
    const s = size;
    const alphas = [.2, .45, .75];
    const a = alphas[layer] || .45;

    ctx.beginPath();
    // Body
    ctx.ellipse(0, 0, s * .8, s * .3, 0, 0, Math.PI * 2);
    // Wings
    const wUp = Math.sin(wingPhase) * s * 1.4;
    const wMid = Math.sin(wingPhase + .4) * s * .8;
    // Left wing
    ctx.moveTo(-s * .2, 0);
    ctx.bezierCurveTo(-s * .6, -wMid * .5, -s * 1.4, -wUp * .8, -s * 2, -wUp);
    ctx.bezierCurveTo(-s * 2.2, -wUp * .5, -s * 1.8, -wUp * .1, -s * 1.5, s * .1);
    ctx.bezierCurveTo(-s * 1, s * .15, -s * .5, s * .08, -s * .2, 0);
    // Right wing
    ctx.moveTo(s * .2, 0);
    ctx.bezierCurveTo(s * .6, -wMid * .5, s * 1.4, -wUp * .8, s * 2, -wUp);
    ctx.bezierCurveTo(s * 2.2, -wUp * .5, s * 1.8, -wUp * .1, s * 1.5, s * .1);
    ctx.bezierCurveTo(s * 1, s * .15, s * .5, s * .08, s * .2, 0);
    // Wing fingers (jagged edges)
    ctx.moveTo(-s * 1.2, -wUp * .6); ctx.lineTo(-s * 1.5, -wUp * .9);
    ctx.moveTo(-s * .8, -wUp * .4); ctx.lineTo(-s * 1, -wUp * .7);
    ctx.moveTo(s * 1.2, -wUp * .6); ctx.lineTo(s * 1.5, -wUp * .9);
    ctx.moveTo(s * .8, -wUp * .4); ctx.lineTo(s * 1, -wUp * .7);
    // Ears
    ctx.moveTo(-s * .15, -s * .25); ctx.lineTo(-s * .2, -s * .5); ctx.lineTo(-s * .05, -s * .3);
    ctx.moveTo(s * .15, -s * .25); ctx.lineTo(s * .2, -s * .5); ctx.lineTo(s * .05, -s * .3);

    ctx.fillStyle = `rgba(180,170,185,${a})`;
    ctx.strokeStyle = `rgba(200,190,205,${a * .6})`;
    ctx.shadowColor = `rgba(200,50,80,${a * .3})`;
    ctx.shadowBlur = layer === 0 ? 4 : 1;
    ctx.lineWidth = s * .06;
    ctx.fill(); ctx.stroke();

    // Eyes
    if (layer >= 1) {
      const eyeA = layer === 2 ? .9 : .5;
      ctx.fillStyle = `rgba(255,50,50,${eyeA})`;
      ctx.shadowColor = `rgba(255,0,0,${eyeA})`;
      ctx.shadowBlur = 5;
      ctx.beginPath(); ctx.arc(-s * .12, -s * .15, s * .07, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(s * .12, -s * .15, s * .07, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // ── Spider drawing ──
  function drawSpider(x, y, size, angle, wingPhase, layer, flip) {
    ctx.save();
    ctx.translate(x, y);
    if (flip) ctx.scale(-1, 1);
    const s = size;
    const legWave = Math.sin(wingPhase) * 0.3;

    const alphas = [.2, .45, .75];
    const a = alphas[layer] || .45;
    ctx.strokeStyle = `rgba(220,200,210,${a})`;
    ctx.fillStyle = `rgba(200,180,190,${a})`;
    ctx.shadowColor = `rgba(255,50,50,${a * .3})`;
    ctx.shadowBlur = layer === 0 ? 4 : 1;
    ctx.lineWidth = s * .12;
    ctx.lineCap = "round";

    // 8 legs (4 per side, curved with animation)
    const legAngles = [-0.9, -0.4, 0.1, 0.6];
    const legLengths = [2.2, 2.5, 2.5, 2.0];
    for (let i = 0; i < 4; i++) {
      const la = legAngles[i];
      const ll = legLengths[i] * s;
      const wave = legWave * (i % 2 === 0 ? 1 : -1);
      // Right leg
      ctx.beginPath();
      ctx.moveTo(s * .35, la * s * .3);
      const kneeX = s * .35 + Math.cos(la + wave) * ll * .5;
      const kneeY = la * s * .3 + Math.sin(la + wave) * ll * .5;
      const footX = kneeX + Math.cos(la + .8 + wave * .5) * ll * .5;
      const footY = kneeY + Math.sin(la + .8 + wave * .5) * ll * .5;
      ctx.quadraticCurveTo(kneeX, kneeY, footX, footY);
      ctx.stroke();
      // Left leg (mirrored)
      ctx.beginPath();
      ctx.moveTo(-s * .35, la * s * .3);
      ctx.quadraticCurveTo(-kneeX, kneeY, -footX, footY);
      ctx.stroke();
    }

    // Body (abdomen - larger back)
    ctx.beginPath();
    ctx.ellipse(0, s * .3, s * .5, s * .6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cephalothorax (head - smaller front)
    ctx.beginPath();
    ctx.ellipse(0, -s * .25, s * .35, s * .3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Red hourglass marking on abdomen (like black widow)
    if (layer >= 1) {
      const markAlpha = layer === 2 ? .8 : .4;
      ctx.fillStyle = `rgba(255,30,30,${markAlpha})`;
      ctx.shadowColor = `rgba(255,0,0,${markAlpha})`;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(0, s * .15);
      ctx.lineTo(s * .12, s * .3);
      ctx.lineTo(0, s * .35);
      ctx.lineTo(-s * .12, s * .3);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, s * .35);
      ctx.lineTo(s * .12, s * .42);
      ctx.lineTo(0, s * .5);
      ctx.lineTo(-s * .12, s * .42);
      ctx.closePath();
      ctx.fill();
    }

    // Eyes (8 tiny dots in 2 rows)
    const eyeAlpha = layer === 2 ? .9 : layer === 1 ? .5 : .2;
    ctx.fillStyle = `rgba(255,40,40,${eyeAlpha})`;
    ctx.shadowColor = `rgba(255,0,0,${eyeAlpha})`;
    ctx.shadowBlur = 4;
    const eyeR = s * .06;
    // Top row (4 eyes)
    for (let ex = -1.5; ex <= 1.5; ex += 1) {
      ctx.beginPath(); ctx.arc(ex * s * .1, -s * .4, eyeR, 0, Math.PI * 2); ctx.fill();
    }
    // Bottom row (4 eyes)
    for (let ex = -1; ex <= 1; ex += 0.67) {
      ctx.beginPath(); ctx.arc(ex * s * .08, -s * .32, eyeR * .7, 0, Math.PI * 2); ctx.fill();
    }

    // Fangs
    ctx.strokeStyle = `rgba(220,200,210,${a})`;
    ctx.lineWidth = s * .08;
    ctx.beginPath(); ctx.moveTo(-s * .08, -s * .45); ctx.lineTo(-s * .12, -s * .58); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * .08, -s * .45); ctx.lineTo(s * .12, -s * .58); ctx.stroke();

    ctx.restore();
  }

  // ── Draw hanging spider with web thread ──
  function drawHangingSpider(x, anchorY, spiderY, size, wingPhase, layer) {
    const alphas = [.3, .55, .85];
    const a = alphas[layer] || .55;
    // Web thread from anchor to spider
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, anchorY);
    ctx.lineTo(x, spiderY - size * .4);
    ctx.strokeStyle = `rgba(220,220,230,${a * .7})`;
    ctx.lineWidth = Math.max(1, size * .06);
    ctx.shadowColor = `rgba(255,255,255,${a * .2})`;
    ctx.shadowBlur = 2;
    ctx.stroke();
    ctx.restore();
    // Draw spider at end
    drawSpider(x, spiderY, size, 0, wingPhase, layer, false);
  }

  // ── Creature class ──
  class Creature {
    constructor(layer, forceType) {
      this.layer = layer;
      const scales = this.type === "bat" ? [.6, 1, 1.6] : [.4, .7, 1.1];
      this.baseSize = (Math.random() * 3 + 3) * scales[layer];
      this.wingSpeed = Math.random() * .06 + .04 + (layer === 0 ? .0 : layer === 2 ? .02 : 0);
      this.wingPhase = Math.random() * Math.PI * 2;
      this.flip = Math.random() > .5;
      this.speed = (Math.random() * .4 + .2) * (layer === 0 ? .4 : layer === 2 ? 1.1 : .7);
      // Type: bat, spider-walk, spider-hang
      if (forceType) this.type = forceType;
      else {
        const r = Math.random();
        if (r < 0.4) this.type = "bat";
        else if (r < 0.75) this.type = "spider-walk";
        else this.type = "spider-hang";
      }
      if (this.type === "spider-hang") this.initHanging();
      else if (this.type === "spider-walk") this.newWalkPath();
      else this.newPath();
    }

    initHanging() {
      this.hangX = 50 + Math.random() * (W - 100);
      this.hangAnchorY = TOP_SAFE;
      this.hangMaxY = TOP_SAFE + 80 + Math.random() * (H * .35);
      this.hangY = TOP_SAFE + 10 + Math.random() * 40;
      this.hangDir = 1;
      this.hangSpeed = Math.random() * .8 + .4; // Faster descent
      this.hangPause = 0;
      this.hangSwing = Math.random() * Math.PI * 2;
    }

    newWalkPath() {
      const pad = 30;
      const minY = TOP_SAFE;
      const edge = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
      let sx, sy, ex, ey;
      if (edge === 0) { sx = pad + Math.random() * (W - pad * 2); sy = minY; ex = pad + Math.random() * (W - pad * 2); ey = minY; }
      else if (edge === 1) { sx = W - pad; sy = minY + Math.random() * (H - minY - pad); ex = W - pad; ey = minY + Math.random() * (H - minY - pad); }
      else if (edge === 2) { sx = pad + Math.random() * (W - pad * 2); sy = H - pad; ex = pad + Math.random() * (W - pad * 2); ey = H - pad; }
      else { sx = pad; sy = minY + Math.random() * (H - minY - pad); ex = pad; ey = minY + Math.random() * (H - minY - pad); }
      if (Math.random() > .5) {
        const opp = (edge + 2) % 4;
        if (opp === 0) { ex = pad + Math.random() * (W - pad * 2); ey = minY; }
        else if (opp === 1) { ex = W - pad; ey = minY + Math.random() * (H - minY - pad); }
        else if (opp === 2) { ex = pad + Math.random() * (W - pad * 2); ey = H - pad; }
        else { ex = pad; ey = minY + Math.random() * (H - minY - pad); }
      }
      this.p0 = { x: sx, y: sy };
      this.p1 = { x: pad + Math.random() * (W - pad * 2), y: minY + Math.random() * (H - minY - pad) };
      this.p2 = { x: pad + Math.random() * (W - pad * 2), y: minY + Math.random() * (H - minY - pad) };
      this.p3 = { x: ex, y: ey };
      this.t = 0;
      this.totalDist = this.estimateLength();
      this.flip = this.p3.x > this.p0.x;
    }

    newPath() {
      const margin = 200;
      const side = Math.floor(Math.random() * 4);
      let sx, sy;
      if (side === 0) { sx = -margin; sy = Math.random() * H; }
      else if (side === 1) { sx = W + margin; sy = Math.random() * H; }
      else if (side === 2) { sx = Math.random() * W; sy = -margin; }
      else { sx = Math.random() * W; sy = H + margin; }
      this.p0 = { x: sx, y: sy };
      this.p1 = { x: Math.random() * W, y: Math.random() * H };
      this.p2 = { x: Math.random() * W, y: Math.random() * H };
      const eside = (side + 1 + Math.floor(Math.random() * 3)) % 4;
      let ex, ey;
      if (eside === 0) { ex = -margin; ey = Math.random() * H; }
      else if (eside === 1) { ex = W + margin; ey = Math.random() * H; }
      else if (eside === 2) { ex = Math.random() * W; ey = -margin; }
      else { ex = Math.random() * W; ey = H + margin; }
      this.p3 = { x: ex, y: ey };
      this.t = 0;
      this.totalDist = this.estimateLength();
      this.flip = this.p3.x > this.p0.x;
    }

    estimateLength() {
      let len = 0, px = this.p0.x, py = this.p0.y;
      for (let t = .05; t <= 1; t += .05) {
        const pt = this.getPos(t); len += Math.hypot(pt.x - px, pt.y - py); px = pt.x; py = pt.y;
      }
      return len;
    }

    getPos(t) {
      const mt = 1 - t;
      return {
        x: mt * mt * mt * this.p0.x + 3 * mt * mt * t * this.p1.x + 3 * mt * t * t * this.p2.x + t * t * t * this.p3.x,
        y: mt * mt * mt * this.p0.y + 3 * mt * mt * t * this.p1.y + 3 * mt * t * t * this.p2.y + t * t * t * this.p3.y
      };
    }

    getTangent(t) {
      const mt = 1 - t;
      return {
        x: 3 * mt * mt * (this.p1.x - this.p0.x) + 6 * mt * t * (this.p2.x - this.p1.x) + 3 * t * t * (this.p3.x - this.p2.x),
        y: 3 * mt * mt * (this.p1.y - this.p0.y) + 6 * mt * t * (this.p2.y - this.p1.y) + 3 * t * t * (this.p3.y - this.p2.y)
      };
    }

    update() {
      this.wingPhase += this.wingSpeed;
      if (this.type === "spider-hang") {
        this.hangSwing += .015;
        if (this.hangPause > 0) { this.hangPause--; return; }
        this.hangY += this.hangDir * this.hangSpeed;
        if (this.hangY >= this.hangMaxY) { this.hangDir = -1; this.hangPause = 120 + Math.random() * 200; }
        if (this.hangY <= this.hangAnchorY + 10) { this.hangDir = 1; this.hangPause = 60 + Math.random() * 100; this.hangX = Math.random() * W; this.hangMaxY = 80 + Math.random() * (H * .5); }
      } else {
        this.t += this.speed / this.totalDist;
        if (this.t >= 1) {
          if (this.type === "spider-walk") this.newWalkPath();
          else this.newPath();
        }
      }
    }

    draw() {
      if (this.type === "spider-hang") {
        const swingOffset = Math.sin(this.hangSwing) * 8;
        drawHangingSpider(this.hangX + swingOffset, this.hangAnchorY, this.hangY, this.baseSize, this.wingPhase, this.layer);
      } else {
        const pos = this.getPos(this.t);
        const tan = this.getTangent(this.t);
        const angle = Math.atan2(tan.y, tan.x) + (this.flip ? Math.PI : 0);
        if (this.type === "bat") drawBat(pos.x, pos.y, this.baseSize, angle, this.wingPhase, this.layer, this.flip);
        else drawSpider(pos.x, pos.y, this.baseSize, 0, this.wingPhase, this.layer, this.flip);
      }
    }
  }

  // ── Spawn creatures in 3 layers ──
  const creatures = [];
  // Background
  for (let i = 0; i < 5; i++) creatures.push(new Creature(0, "bat"));
  for (let i = 0; i < 4; i++) creatures.push(new Creature(0, "spider-walk"));
  // Mid
  for (let i = 0; i < 4; i++) creatures.push(new Creature(1, "bat"));
  for (let i = 0; i < 3; i++) creatures.push(new Creature(1, "spider-walk"));
  for (let i = 0; i < 2; i++) creatures.push(new Creature(1, "spider-hang"));
  // Foreground
  for (let i = 0; i < 2; i++) creatures.push(new Creature(2, "bat"));
  for (let i = 0; i < 2; i++) creatures.push(new Creature(2, "spider-walk"));
  for (let i = 0; i < 1; i++) creatures.push(new Creature(2, "spider-hang"));

  // ── Render loop ──
  let lastTime = 0;
  function animate(time) {
    const dt = time - lastTime; lastTime = time;
    if (dt > 100) { requestAnimationFrame(animate); return; }
    ctx.clearRect(0, 0, W, H);

    const grd = ctx.createRadialGradient(W * .5, H * .55, 0, W * .5, H * .55, H * .7);
    grd.addColorStop(0, "rgba(100,10,15,.06)");
    grd.addColorStop(.5, "rgba(50,5,8,.03)");
    grd.addColorStop(1, "transparent");
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);

    drawParticles();
    creatures.sort((a, b) => a.layer - b.layer);
    creatures.forEach(c => { c.update(); c.draw(); });
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
})();
