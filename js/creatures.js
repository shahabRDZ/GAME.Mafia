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

  // ── Spider drawing ──
  function drawCreature(x, y, size, angle, wingPhase, layer, flip) {
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

  // ── Creature class with Bezier flight paths ──
  class Creature {
    constructor(layer) {
      this.layer = layer;
      const scales = [.5, .9, 1.5];
      this.baseSize = (Math.random() * 4 + 4) * scales[layer];
      this.wingSpeed = Math.random() * .06 + .04 + (layer === 0 ? .0 : layer === 2 ? .02 : 0);
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
