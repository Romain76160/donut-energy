import { localeFor, materialLabel, type Language } from "../i18n";
import { formatNumber, type Wall } from "../model";
import {
  clampWallInclination,
  wallInclinationDeg,
  wallTopOffset,
  wallTotalThickness,
  wallTrueHeight,
} from "../wallInclination";
import "../wall-section.css";

type Props = {
  wall: Wall;
  language: Language;
  onInclinationChange: (inclinationDeg: number) => void;
};

export function WallSectionView({ wall, language, onInclinationChange }: Props) {
  const locale = localeFor(language);
  const inclination = wallInclinationDeg(wall);
  const trueHeight = wallTrueHeight(wall.height, inclination);
  const topOffset = wallTopOffset(wall.height, inclination);
  const thickness = wallTotalThickness(wall);
  const angle = inclination * Math.PI / 180;

  const width = 312;
  const height = 196;
  const groundY = 158;
  const originX = 156;
  const scale = Math.min(42, 112 / Math.max(0.5, trueHeight));
  const axis = { x: Math.cos(angle), y: -Math.sin(angle) };
  const normal = { x: Math.sin(angle), y: Math.cos(angle) };
  const bottom = { x: originX, y: groundY };
  const top = {
    x: bottom.x + axis.x * trueHeight * scale,
    y: bottom.y + axis.y * trueHeight * scale,
  };

  let offset = -thickness / 2;
  const layerPolygons = wall.layers.map((layer) => {
    const startOffset = offset;
    const endOffset = startOffset + layer.thicknessMm / 1000;
    offset = endOffset;
    const point = (base: { x: number; y: number }, normalOffset: number) => ({
      x: base.x + normal.x * normalOffset * scale,
      y: base.y + normal.y * normalOffset * scale,
    });
    const p1 = point(bottom, startOffset);
    const p2 = point(top, startOffset);
    const p3 = point(top, endOffset);
    const p4 = point(bottom, endOffset);
    return {
      ...layer,
      points: `${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`,
    };
  });

  const labels = language === "fr" ? {
    title: "COUPE / INCLINAISON",
    help: "Angle du plan du mur par rapport au sol. 90° correspond à un mur parfaitement vertical.",
    inclination: "Inclinaison",
    vertical: "Vertical",
    realHeight: "Longueur réelle du mur",
    verticalHeight: "Hauteur verticale",
    topOffset: "Déport en tête",
    thickness: "Épaisseur totale",
    sectionAria: "Vue en coupe du mur incliné",
  } : {
    title: "SECTION / INCLINATION",
    help: "Angle of the wall plane relative to the floor. 90° is a perfectly vertical wall.",
    inclination: "Inclination",
    vertical: "Vertical",
    realHeight: "True wall length",
    verticalHeight: "Vertical height",
    topOffset: "Top offset",
    thickness: "Total thickness",
    sectionAria: "Section view of the inclined wall",
  };

  return (
    <div className="inspector-section wall-section-panel">
      <div className="section-title-row">
        <h3>{labels.title}</h3>
        <span>{formatNumber(inclination, 0, locale)}°</span>
      </div>
      <p className="section-help">{labels.help}</p>

      <div className="inclination-control">
        <label>
          <span>{labels.inclination}</span>
          <div className="inclination-input-row">
            <input
              className="inclination-range"
              type="range"
              min="30"
              max="150"
              step="1"
              value={inclination}
              onChange={(event) => onInclinationChange(clampWallInclination(Number(event.target.value)))}
            />
            <div className="unit-input compact inclination-number">
              <input
                type="number"
                min="30"
                max="150"
                step="1"
                value={Math.round(inclination)}
                onChange={(event) => onInclinationChange(clampWallInclination(Number(event.target.value)))}
              />
              <b>°</b>
            </div>
          </div>
        </label>
        <div className="inclination-presets">
          <button onClick={() => onInclinationChange(75)}>75°</button>
          <button className={Math.abs(inclination - 90) < 0.5 ? "active" : ""} onClick={() => onInclinationChange(90)}>90° · {labels.vertical}</button>
          <button onClick={() => onInclinationChange(105)}>105°</button>
        </div>
      </div>

      <svg className="wall-section-preview" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={labels.sectionAria}>
        <line className="section-ground" x1="18" y1={groundY} x2={width - 18} y2={groundY} />
        <line className="section-vertical-guide" x1={bottom.x} y1={groundY} x2={bottom.x} y2={top.y} />
        {layerPolygons.map((layer) => (
          <polygon key={layer.id} points={layer.points} fill={layer.color}>
            <title>{materialLabel(layer.name, language)} — {layer.thicknessMm} mm</title>
          </polygon>
        ))}
        <line className="section-axis" x1={bottom.x} y1={bottom.y} x2={top.x} y2={top.y} />
        <circle className="section-base" cx={bottom.x} cy={bottom.y} r="4" />
        <circle className="section-top" cx={top.x} cy={top.y} r="4" />
        <text className="section-angle-label" x={bottom.x + 14} y={bottom.y - 12}>{formatNumber(inclination, 0, locale)}°</text>
      </svg>

      <div className="section-metrics">
        <div><span>{labels.verticalHeight}</span><strong>{formatNumber(wall.height, 2, locale)} m</strong></div>
        <div><span>{labels.realHeight}</span><strong>{formatNumber(trueHeight, 2, locale)} m</strong></div>
        <div><span>{labels.topOffset}</span><strong>{formatNumber(topOffset, 2, locale)} m</strong></div>
        <div><span>{labels.thickness}</span><strong>{formatNumber(thickness * 1000, 0, locale)} mm</strong></div>
      </div>
    </div>
  );
}
