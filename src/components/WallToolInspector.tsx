import { MoveIcon, TrashIcon } from "../icons";
import type { EditorMode } from "../model";
import "../wall-tool-inspector.css";

type Props = {
  mode: Extract<EditorMode, "move" | "erase">;
  wallCount: number;
  language: "fr" | "en";
};

export function WallToolInspector({ mode, wallCount, language }: Props) {
  const move = mode === "move";
  const labels = language === "fr"
    ? {
      title: move ? "DÉPLACER" : "EFFACER",
      subtitle: move ? "Modification géométrique" : "Suppression directe",
      main: move ? "Glissez le milieu d’un mur pour déplacer le mur entier." : "Survolez un mur puis cliquez pour le supprimer.",
      secondary: move ? "Glissez une extrémité pour déplacer le nœud et conserver les murs raccordés." : "Ctrl+Z ou ⌘Z restaure immédiatement la dernière suppression.",
      count: wallCount + " mur" + (wallCount > 1 ? "s" : "") + " sur ce niveau",
    }
    : {
      title: move ? "MOVE" : "ERASE",
      subtitle: move ? "Geometry editing" : "Direct deletion",
      main: move ? "Drag the middle of a wall to move the whole wall." : "Hover a wall then click to delete it.",
      secondary: move ? "Drag an endpoint to move the node while keeping connected walls joined." : "Ctrl+Z or ⌘Z immediately restores the last deletion.",
      count: wallCount + " wall" + (wallCount === 1 ? "" : "s") + " on this level",
    };

  return (
    <aside className={"inspector wall-tool-inspector " + mode}>
      <div className="wall-tool-inspector-heading">
        {move ? <MoveIcon /> : <TrashIcon />}
        <div>
          <h2>{labels.title}</h2>
          <span>{labels.subtitle}</span>
        </div>
      </div>
      <div className="wall-tool-inspector-card">
        <strong>{labels.main}</strong>
        <p>{labels.secondary}</p>
      </div>
      <small className="wall-tool-count">{labels.count}</small>
    </aside>
  );
}
