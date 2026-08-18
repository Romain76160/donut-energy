import { PlusIcon, PointerIcon, WallIcon } from "../icons";
import { translations, type Language } from "../i18n";
import type { EditorMode, Wall } from "../model";

type Props = {
  mode: EditorMode;
  walls: Wall[];
  selectedWallId: string | null;
  language: Language;
  onModeChange: (mode: EditorMode) => void;
  onSelectWall: (id: string) => void;
};

export function ModelSidebar({ mode, walls, selectedWallId, language, onModeChange, onSelectWall }: Props) {
  const text = translations[language];

  return (
    <aside className="model-sidebar" aria-label={text.buildingModel}>
      <div>
        <h2>{text.model}</h2>
        <div className="tools">
          <button className={mode === "select" ? "active" : ""} onClick={() => onModeChange("select")}>
            <PointerIcon /> {text.select}
          </button>
          <button className={mode === "draw" ? "active" : ""} onClick={() => onModeChange("draw")}>
            <WallIcon /> {text.drawWall}
          </button>
        </div>
        <div className="sidebar-divider" />
        <div className="wall-list-heading">{text.walls} ({walls.length})</div>
        <div className="wall-list">
          {walls.map((wall) => (
            <button
              key={wall.id}
              className={selectedWallId === wall.id ? "selected" : ""}
              onClick={() => onSelectWall(wall.id)}
            >
              <span className="wall-line-icon" />
              <span>{wall.name}</span>
              {selectedWallId === wall.id ? <i aria-hidden="true" /> : null}
            </button>
          ))}
        </div>
      </div>
      <button className="add-wall-button" onClick={() => onModeChange("draw")}>
        <PlusIcon /> {text.addWall}
      </button>
    </aside>
  );
}
