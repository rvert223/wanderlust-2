// The welcome screen's arched "mirror": a small field-guide landscape (ridges, drifting contour
// lines, a dotted trail to a pin, a few stars) inside an engraved double frame.
const CONTOURS = [128, 146, 164, 182, 200, 218].map(
  (y, i) => `M-80 ${y} C-20 ${y - 14 + (i % 3) * 5} 40 ${y + 12} 100 ${y} S220 ${y - 12 + (i % 2) * 8} 320 ${y + 4}`,
);
const STARS = [[46, 64], [78, 38], [196, 56], [120, 30], [150, 92], [32, 104], [212, 110]];
const ARCH = 'M0 300V120A120 120 0 0 1 240 120V300Z';
const SPARKLES = [[-2, 40, 7], [244, 70, 5], [232, 8, 4], [10, 0, 4]];
const sparklePath = (x, y, r) => `M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z`;

export default function MirrorScene() {
  return (
    <svg className="mirror-scene" viewBox="-8 -8 256 316" role="img" aria-label="An arched mirror showing a trail winding through the hills to a marked spot">
      <defs>
        <clipPath id="archClip"><path d={ARCH} /></clipPath>
        <linearGradient id="archSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="scene-sky-top" />
          <stop offset="1" className="scene-sky-bottom" />
        </linearGradient>
      </defs>

      <g clipPath="url(#archClip)">
        <rect x="0" y="0" width="240" height="300" fill="url(#archSky)" />
        {STARS.map(([x, y], i) => <circle key={`${x}-${y}`} cx={x} cy={y} r={i % 3 ? 0.9 : 1.4} className="scene-star" style={{ '--i': i }} />)}
        <circle cx="168" cy="84" r="20" className="scene-orb" />
        <g className="scene-contours">
          {CONTOURS.map((d) => <path key={d} d={d} className="scene-contour" />)}
        </g>
        <path d="M0 214 L34 186 L58 198 L96 158 L128 182 L156 166 L190 192 L240 170 V300 H0Z" className="scene-ridge-far" />
        <path d="M0 252 C40 230 70 238 104 226 S170 214 240 236 V300 H0Z" className="scene-ridge-near" />
        <path d="M120 300 C112 278 140 268 128 252 S96 230 112 214 S150 196 138 178" className="scene-trail" />
        <g transform="translate(138 172)">
          <circle r="9" className="scene-pin-pulse" />
          <path d="M0 4C-5 -1 -6 -4 -6 -7a6 6 0 0 1 12 0c0 3 -1 6 -6 11z" className="scene-pin" />
          <circle cy="-7" r="2" className="scene-pin-dot" />
        </g>
      </g>

      <path d={ARCH} className="scene-frame" />
      <path d="M-6 300V120A126 126 0 0 1 246 120V300" className="scene-frame thin" />
      <path d="M-8 300H248" className="scene-frame" />
      {SPARKLES.map(([x, y, r], i) => <path key={i} d={sparklePath(x, y, r)} className="scene-sparkle" style={{ '--i': i }} />)}
    </svg>
  );
}
