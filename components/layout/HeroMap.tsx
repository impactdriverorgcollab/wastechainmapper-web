/**
 * A drawing of what the product does: a river, streets, hotspot zones that grow with severity, and the
 * three kinds of pin. It is decoration made from the product's own parts, and it follows the theme.
 */
function Pin({ x, y, tone, mark }: { x: number; y: number; tone: 'high' | 'medium' | 'low'; mark: 'check' | 'dot' | 'q' }) {
  const fill = { high: 'fill-tier-high', medium: 'fill-tier-medium', low: 'fill-tier-low' }[tone];
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 0 C-3 -9 -13 -14 -13 -25 A13 13 0 1 1 13 -25 C13 -14 3 -9 0 0 Z" className={`${fill} stroke-panel`} strokeWidth="2" />
      <circle cx="0" cy="-25" r="7.5" className="fill-panel" />
      {mark === 'check' && <path d="M-4 -25 L-1 -22 L5 -29" className={`${{ high: 'stroke-tier-high', medium: 'stroke-tier-medium', low: 'stroke-tier-low' }[tone]}`} fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />}
      {mark === 'dot' && <circle cx="0" cy="-25" r="3" className={fill} />}
      {mark === 'q' && <text x="0" y="-21" textAnchor="middle" className={fill} fontSize="11" fontWeight="600">?</text>}
    </g>
  );
}

export function HeroMap() {
  return (
    <svg viewBox="0 0 480 360" className="h-auto w-full" role="img" aria-label="A map with a river, hotspot zones in three sizes and pins for reported, corroborated and field-verified sites.">
      <rect width="480" height="360" rx="12" className="fill-panel-2" />
      {/* land blocks */}
      <g className="fill-panel-3" opacity="0.75">
        <rect x="24" y="28" width="96" height="64" rx="6" /><rect x="136" y="28" width="70" height="64" rx="6" />
        <rect x="24" y="108" width="60" height="80" rx="6" /><rect x="260" y="30" width="90" height="70" rx="6" />
        <rect x="372" y="28" width="84" height="100" rx="6" /><rect x="300" y="250" width="70" height="80" rx="6" />
        <rect x="390" y="230" width="66" height="100" rx="6" /><rect x="40" y="260" width="90" height="70" rx="6" />
      </g>
      {/* river */}
      <path d="M-10 210 C70 190 120 250 200 236 S330 170 390 190 S470 230 500 214" fill="none" className="stroke-accent" strokeWidth="22" strokeLinecap="round" opacity="0.28" />
      <path d="M-10 210 C70 190 120 250 200 236 S330 170 390 190 S470 230 500 214" fill="none" className="stroke-accent" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      {/* streets */}
      <g className="stroke-line-strong" strokeWidth="2" fill="none" opacity="0.55" strokeLinecap="round">
        <path d="M0 100 H480" /><path d="M0 306 H480" /><path d="M128 0 V360" /><path d="M244 0 V360" /><path d="M360 0 V360" />
        <path d="M20 340 L200 120 L330 60" strokeDasharray="6 5" />
      </g>
      {/* hotspot zones: the size follows the number of sites */}
      <circle cx="196" cy="150" r="46" fill="rgb(209 50 42)" opacity="0.28" />
      <circle cx="196" cy="150" r="46" fill="none" stroke="rgb(209 50 42)" strokeWidth="2" />
      <circle cx="352" cy="108" r="30" fill="rgb(232 116 26)" opacity="0.3" />
      <circle cx="352" cy="108" r="30" fill="none" stroke="rgb(232 116 26)" strokeWidth="2" />
      <circle cx="96" cy="276" r="20" fill="rgb(224 174 26)" opacity="0.32" />
      <circle cx="96" cy="276" r="20" fill="none" stroke="rgb(224 174 26)" strokeWidth="2" />
      <circle cx="400" cy="286" r="14" fill="rgb(62 155 79)" opacity="0.35" />
      <circle cx="400" cy="286" r="14" fill="none" stroke="rgb(62 155 79)" strokeWidth="2" />
      {/* pins */}
      <Pin x={182} y={158} tone="high" mark="check" />
      <Pin x={212} y={146} tone="medium" mark="dot" />
      <Pin x={196} y={128} tone="low" mark="q" />
      <Pin x={352} y={116} tone="medium" mark="dot" />
      <Pin x={340} y={96} tone="low" mark="q" />
      <Pin x={96} y={284} tone="low" mark="q" />
      <Pin x={400} y={292} tone="high" mark="check" />
    </svg>
  );
}
