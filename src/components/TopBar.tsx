import { RedoIcon, SaveIcon, UndoIcon } from "../icons";

type Props = {
  title: string;
  canUndo: boolean;
  canRedo: boolean;
  saved: boolean;
  onTitleChange: (title: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
};

export function TopBar({
  title,
  canUndo,
  canRedo,
  saved,
  onTitleChange,
  onUndo,
  onRedo,
  onSave,
}: Props) {
  return (
    <header className="topbar">
      <div className="brand" aria-label="Donut Energy">
        <img src="/assets/donut-mark-web.png" alt="" />
        <span>DONUT ENERGY</span>
      </div>
      <input
        className="project-title"
        aria-label="Nom du projet"
        value={title}
        onChange={(event) => onTitleChange(event.target.value)}
      />
      <div className="top-actions">
        <button className="quiet-button" onClick={onUndo} disabled={!canUndo} title="Annuler">
          <UndoIcon /> <span>Annuler</span>
        </button>
        <button className="quiet-button" onClick={onRedo} disabled={!canRedo} title="Rétablir">
          <RedoIcon /> <span>Rétablir</span>
        </button>
        <button className="save-button" onClick={onSave}>
          <SaveIcon /> <span>{saved ? "Enregistré" : "Enregistrer"}</span>
        </button>
      </div>
    </header>
  );
}
