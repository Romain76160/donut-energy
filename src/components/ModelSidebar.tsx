import { PlusIcon, PointerIcon, WallIcon } from "../icons";
import type { EditorMode, Wall } from "../model";

type Props = {
  mode: EditorMode;
  walls: Wall[];
  selectedWallId: string | null;
  onModeChange: (mode: EditorMode) => void;
  onSelectWall: (id: string) => void;
};

export function ModelSidebar({ mode, walls, selectedWallId, onModeChange, onSelectWall }: Props) {
  return (
    <aside className="model-sidebar" aria-label="Modèle du bâtiment">
      <div>
        <h2>MODÈLE</h2>
        <div className="tools">
          <button className={mode === "select" ? "active" : ""} onClick={() => onModeChange("select")}>
            <PointerIcon /> Sélection
          </button>
          <button className={mode === "draw" ? "active" : ""} onClick={() => onModeChange("draw")}>
            <WallIcon /> Tracer un mur
          </button>
        </div>
        <div className="sidebar-divider" />
        <div className="wall-list-heading">Murs ({walls.length})</div>
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
        <PlusIcon /> Ajouter un mur
      </button>
    </aside>
  );
}
