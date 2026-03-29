/* ── Cinematic Creature Animation System ── */

(function initCreatures() {
  const canvas = document.getElementById("creatureCanvas");
  const ctx = canvas.getContext("2d");
  let W, H;

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

  // ── Creature silhouette drawing ──
  function drawCreature(x, y, size, angle, wingPhase, layer, flip) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(angle);
    if (flip) ctx.scale(-1, 1);
    const s = size;

    ctx.beginPath();
    ctx.ellipse(0, 0, s * 1.1, s * .32, 0, 0, Math.PI * 2);

    const wUp = Math.sin(wingPhase) * s * 1.2;
    const wMid = Math.sin(wingPhase + .4) * s * .7;

    // Left wing
    ctx.moveTo(-s * .2, 0);
    ctx.bezierCurveTo(-s * .7, -wMid * .5, -s * 1.6, -wUp * .8, -s * 2.2, -wUp);
    ctx.bezierCurveTo(-s * 2.4, -wUp * .6, -s * 2.1, -wUp * .2, -s * 1.8, s * .1);
    ctx.bezierCurveTo(-s * 1.3, s * .15, -s * .6, s * .08, -s * .2, 0);

    // Right wing
    ctx.moveTo(s * .2, 0);
    ctx.bezierCurveTo(s * .7, -wMid * .5, s * 1.6, -wUp * .8, s * 2.2, -wUp);
    ctx.bezierCurveTo(s * 2.4, -wUp * .6, s * 2.1, -wUp * .2, s * 1.8, s * .1);
    ctx.bezierCurveTo(s * 1.3, s * .15, s * .6, s * .08, s * .2, 0);

    // Tail
    ctx.moveTo(-s * .3, s * .25);
    ctx.quadraticCurveTo(0, s * .8, s * .3, s * .25);

    // Head
    ctx.moveTo(s * .15, -s * .2);
    ctx.quadraticCurveTo(0, -s * .55, -s * .15, -s * .2);

    const alphas = [.3, .55, .85];
    const blurs = [4, 2, 0];
    const a = alphas[layer] || .55;
    // White-ish silhouette visible on any background
    ctx.fillStyle = `rgba(220,210,215,${a})`;
    ctx.shadowColor = `rgba(255,80,80,${a * .4})`;
    ctx.shadowBlur = blurs[layer] || 2;
    ctx.fill();

    // Red eye glow for mid and foreground creatures
    if (layer >= 1) {
      const eyeAlpha = layer === 2 ? .9 : .5;
      const eyeSize = layer === 2 ? s * .1 : s * .06;
      ctx.beginPath(); ctx.arc(-s * .04, -s * .28, eyeSize, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,40,40,${eyeAlpha})`; ctx.shadowColor = `rgba(255,0,0,${eyeAlpha})`; ctx.shadowBlur = 8; ctx.fill();
    }
    ctx.restore();
  }

  // ── Creature class with Bezier flight paths ──
  class Creature {
    constructor(layer) {
      this.layer = layer;
      const scales = [.7, 1.2, 2];
      this.baseSize = (Math.random() * 6 + 5) * scales[layer];
      this.wingSpeed = Math.random() * .04 + .03 + (layer === 0 ? .0 : layer === 2 ? .015 : 0);
      this.wingPhase = Math.random() * Math.PI * 2;
      this.flip = Math.random() > .5;
      this.speed = (Math.random() * .4 + .2) * (layer === 0 ? .4 : layer === 2 ? 1.1 : .7);
      this.newPath();
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
      this.t += this.speed / this.totalDist;
      this.wingPhase += this.wingSpeed;
      if (this.t >= 1) this.newPath();
    }

    draw() {
      const pos = this.getPos(this.t);
      const tan = this.getTangent(this.t);
      const angle = Math.atan2(tan.y, tan.x) + (this.flip ? Math.PI : 0);
      drawCreature(pos.x, pos.y, this.baseSize, angle, this.wingPhase, this.layer, this.flip);
    }
  }

  // ── Spawn creatures in 3 layers ──
  const creatures = [];
  for (let i = 0; i < 10; i++) creatures.push(new Creature(0));
  for (let i = 0; i < 8; i++) creatures.push(new Creature(1));
  for (let i = 0; i < 5; i++) creatures.push(new Creature(2));

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
