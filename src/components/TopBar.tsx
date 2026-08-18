import { RedoIcon, SaveIcon, UndoIcon } from "../icons";
import { translations, type Language } from "../i18n";

type Props = {
  title: string;
  canUndo: boolean;
  canRedo: boolean;
  saved: boolean;
  language: Language;
  onTitleChange: (title: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onLanguageChange: () => void;
};

export function TopBar({
  title,
  canUndo,
  canRedo,
  saved,
  language,
  onTitleChange,
  onUndo,
  onRedo,
  onSave,
  onLanguageChange,
}: Props) {
  const text = translations[language];

  return (
    <header className="topbar">
      <div className="brand" aria-label="Donut Energy">
        <img src="/assets/donut-mark-web.png" alt="" />
        <span>DONUT ENERGY</span>
      </div>
      <input
        className="project-title"
        aria-label={text.projectName}
        value={title}
        onChange={(event) => onTitleChange(event.target.value)}
      />
      <div className="top-actions">
        <button className="quiet-button" onClick={onLanguageChange} title={text.switchLanguage} aria-label={text.switchLanguage}>
          <span>{language === "fr" ? "EN" : "FR"}</span>
        </button>
        <button className="quiet-button" onClick={onUndo} disabled={!canUndo} title={text.undo}>
          <UndoIcon /> <span>{text.undo}</span>
        </button>
        <button className="quiet-button" onClick={onRedo} disabled={!canRedo} title={text.redo}>
          <RedoIcon /> <span>{text.redo}</span>
        </button>
        <button className="save-button" onClick={onSave}>
          <SaveIcon /> <span>{saved ? text.saved : text.save}</span>
        </button>
      </div>
    </header>
  );
}
