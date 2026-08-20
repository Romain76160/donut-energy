import type { Room } from "../geometry";
import { localeFor, translations, type Language } from "../i18n";
import { formatNumber, levelPhysicalFloorArea, type Level, type Wall } from "../model";
import { projectPerimeter, projectWallArea } from "../thermal";

type Props = {
  walls: Wall[];
  rooms: Room[];
  level: Level;
  language: Language;
};

export function StatusBar({ walls, rooms, level, language }: Props) {
  const text = translations[language];
  const locale = localeFor(language);
  const geometricArea = rooms.reduce((total, room) => total + room.area, 0);
  const floorArea = levelPhysicalFloorArea(level, geometricArea);
  return (
    <footer className="status-bar">
      <strong>{level.name}</strong>
      <span>{text.wallCount(walls.length)}</span>
      <span>{text.roomCount(rooms.length)}</span>
      <span>{text.perimeter(formatNumber(projectPerimeter(walls), 2, locale))}</span>
      <span>{text.wallArea(formatNumber(projectWallArea(walls), 2, locale))}</span>
      <span>{text.roomArea(formatNumber(floorArea, 2, locale))}</span>
      {level.openToBelow ? <span>{language === "fr" ? "vide sur niveau inférieur" : "open to level below"}</span> : null}
    </footer>
  );
}
