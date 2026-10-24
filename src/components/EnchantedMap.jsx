// Dependency-free field map: a topographic sheet centred on the user. Sightings are projected by
// real distance/bearing, pulsing red when hazardous; dashed halos mark geographic patterns.
import { ALERT_HAZARD } from '../config/app';
import { CATEGORIES, sightingEmoji } from '../config/categories';
import { formatDistance, projectToUnit } from '../utils/geo';

const PLOT_RADIUS = 64; // viewBox units available for plotting (the sheet is 200 × 150)
const RINGS = [1 / 3, 2 / 3, 1];
// Decorative contour lines, drawn as gentle waves across the sheet.
const CONTOURS = [-62, -44, -26, -8, 10, 28, 46, 64].map(
  (y, i) => `M-110 ${y} C-70 ${y - 12 + (i % 3) * 6} -35 ${y + 14} 0 ${y} S70 ${y - 14 + (i % 2) * 10} 110 ${y + 4}`,
);

export default function EnchantedMap({ center, sightings, patterns, radiusKm, selectedId, onSelect }) {
  const place = (coords) => {
    const { x, y } = projectToUnit(center, coords, radiusKm);
    return { x: x * PLOT_RADIUS, y: y * PLOT_RADIUS };
  };

  return (
    <svg viewBox="-100 -75 200 150" className="map" role="group" aria-label="Map of nearby sightings">
      <rect x="-100" y="-75" width="200" height="150" className="map-land" />
      {CONTOURS.map((d) => <path key={d} d={d} className="map-contour" />)}
      {RINGS.map((fraction) => (
        <g key={fraction}>
          <circle r={PLOT_RADIUS * fraction} className="map-ring" />
          <text y={-PLOT_RADIUS * fraction + 4} className="map-ring-label">{formatDistance(radiusKm * fraction)}</text>
        </g>
      ))}
      <text x="92" y="-64" className="map-compass">N</text>
      <path d="M92 -62v10" className="map-axis" />

      {patterns.map((pattern) => {
        const { x, y } = place(pattern.center);
        return <circle key={pattern.key} cx={x} cy={y} r={8 + pattern.count * 3} className={`map-pattern ${pattern.kind === 'hazard' ? 'hazard' : ''}`} />;
      })}

      {sightings.map((sighting) => {
        const { x, y } = place(sighting.coords);
        const classes = ['pin', sighting.hazard >= ALERT_HAZARD && 'hazard', sighting.id === selectedId && 'selected'].filter(Boolean).join(' ');
        return (
          <g
            key={sighting.id}
            transform={`translate(${x} ${y})`}
            className={classes}
            role="button"
            tabIndex={0}
            aria-label={sighting.title}
            onClick={() => onSelect(sighting.id)}
            onKeyDown={(event) => event.key === 'Enter' && onSelect(sighting.id)}
          >
            <circle r="8" className="pin-ring" style={{ '--c': CATEGORIES[sighting.category].color }} />
            <circle r="6" className="pin-core" style={{ '--c': CATEGORIES[sighting.category].color }} />
            <text className="pin-emoji" dy=".35em">{sightingEmoji(sighting)}</text>
          </g>
        );
      })}

      <g className="you">
        <circle r="5" className="you-halo" />
        <circle r="2.6" className="you-dot" />
      </g>
    </svg>
  );
}
