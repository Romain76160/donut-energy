import type { Room } from "../geometry";
import { localeFor, translations, type Language } from "../i18n";
import { formatNumber, type Wall } from "../model";
import { projectPerimeter, projectWallArea } from "../thermal";

type Props = {
  walls: Wall[];
  rooms: Room[];
  levelName: string;
  language: Language;
};

export function StatusBar({ walls, rooms, levelName, language }: Props) {
  const text = translations[language];
  const locale = localeFor(language);
  const roomArea = rooms.reduce((total, room) => total + room.area, 0);
  return (
    <footer className="status-bar">
      <strong>{levelName}</strong>
      <span>{text.wallCount(walls.length)}</span>
      <span>{text.roomCount(rooms.length)}</span>
      <span>{text.perimeter(formatNumber(projectPerimeter(walls), 2, locale))}</span>
      <span>{text.wallArea(formatNumber(projectWallArea(walls), 2, locale))}</span>
      <span>{text.roomArea(formatNumber(roomArea, 2, locale))}</span>
    </footer>
  );
}
