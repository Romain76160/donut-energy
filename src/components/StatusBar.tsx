import { AreaIcon, BuildingIcon, RulerIcon } from "../icons";
import { localeFor, translations, type Language } from "../i18n";
import { formatNumber, type Wall } from "../model";
import { projectPerimeter, projectWallArea } from "../thermal";

export function StatusBar({ walls, language }: { walls: Wall[]; language: Language }) {
  const text = translations[language];
  const locale = localeFor(language);

  return (
    <footer className="statusbar">
      <div><BuildingIcon /><span>{text.wallCount(walls.length)}</span></div>
      <div><RulerIcon /><span>{text.perimeter(formatNumber(projectPerimeter(walls), 1, locale))}</span></div>
      <div><AreaIcon /><span>{text.wallArea(formatNumber(projectWallArea(walls), 1, locale))}</span></div>
    </footer>
  );
}
