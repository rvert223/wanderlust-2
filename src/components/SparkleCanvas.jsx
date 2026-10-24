// Full-screen confetti layer for celebrations (posted, verified, rank-up, capture). Other code
// requests bursts via utils/sparkle.js. Kept quiet otherwise to suit the field-guide look. Respects reduced-motion.
import { useEffect, useRef } from 'react';

// Glitter palettes per theme: bright dust glows on dark; deeper tones stay visible on light.
const PALETTES = {
  dark: ['#d9b56a', '#f0d99c', '#c24a5e', '#9cc7e4', '#6f9f84'],
  light: ['#b08637', '#9b2c3f', '#7fb0d4', '#2f5d4a', '#e2c98a'],
};
const isLight = () => document.documentElement.dataset.theme === 'light';
const MAX_PARTICLES = 260;

/** 4-point star centred on (x, y). */
function drawStar(ctx, x, y, radius) {
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const angle = (i * Math.PI) / 4;
    const r = i % 2 ? radius * 0.35 : radius;
    ctx.lineTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
  }
  ctx.closePath();
  ctx.fill();
}

export default function SparkleCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let particles = [];
    let width = 0;
    let height = 0;
    let frame;

    const resize = () => {
      const ratio = devicePixelRatio || 1;
      width = innerWidth;
      height = innerHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const add = (x, y, spread, rise, decay) => {
      if (particles.length >= MAX_PARTICLES) particles.shift();
      const colors = PALETTES[isLight() ? 'light' : 'dark'];
      particles.push({
        x, y, life: 1,
        vx: (Math.random() - 0.5) * spread,
        vy: (Math.random() - 0.5) * spread - rise,
        decay: decay * (0.6 + Math.random()),
        size: 2 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    };
    const burst = (x, y, count) => {
      for (let i = 0; i < (calm ? count / 4 : count); i += 1) add(x, y, 9, 0, 0.02);
    };

    const tick = () => {
      ctx.clearRect(0, 0, width, height);
      particles = particles.filter((p) => p.life > 0);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.life -= p.decay;
        ctx.globalAlpha = Math.max(p.life, 0);
        ctx.fillStyle = p.color;
        drawStar(ctx, p.x, p.y, p.size * (0.5 + p.life * 0.5));
      });
      frame = requestAnimationFrame(tick);
    };

    const onBurst = ({ detail }) => burst(detail.x, detail.y, detail.count);

    resize();
    tick();
    window.addEventListener('resize', resize);
    window.addEventListener('sparkle:burst', onBurst);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('sparkle:burst', onBurst);
    };
  }, []);

  return <canvas ref={canvasRef} className="sparkle-canvas" aria-hidden="true" />;
}
