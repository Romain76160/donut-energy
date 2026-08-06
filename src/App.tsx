import { useEffect, useMemo, useState } from "react";
import { ModelSidebar } from "./components/ModelSidebar";
import { PlanCanvas } from "./components/PlanCanvas";
import { StatusBar } from "./components/StatusBar";
import { TopBar } from "./components/TopBar";
import { WallInspector } from "./components/WallInspector";
import {
  initialProject,
  MATERIALS,
  orientationFromPoints,
  pointsEqual,
  wallLength,
  type EditorMode,
  type Point,
  type Project,
  type Wall,
  type WallLayer,
} from "./model";

type History = { past: Project[]; present: Project; future: Project[] };

const loadProject = () => {
  try {
    const saved = localStorage.getItem("donut-energy-project");
    if (saved) {
      const parsed = JSON.parse(saved) as Project;
      if (parsed.walls?.length) return parsed;
    }
  } catch {
    // A malformed local save should never prevent the editor from opening.
  }
  return initialProject();
};

function App() {
  const [history, setHistory] = useState<History>(() => ({ past: [], present: loadProject(), future: [] }));
  const [selectedWallId, setSelectedWallId] = useState<string | null>(() => history.present.walls[0]?.id ?? null);
  const [mode, setMode] = useState<EditorMode>("select");
  const [draftStart, setDraftStart] = useState<Point | null>(null);
  const [zoom, setZoom] = useState(1);
  const [saved, setSaved] = useState(false);

  const project = history.present;
  const selectedWall = useMemo(
    () => project.walls.find((wall) => wall.id === selectedWallId) ?? null,
    [project.walls, selectedWallId],
  );

  useEffect(() => {
    if (selectedWallId && !project.walls.some((wall) => wall.id === selectedWallId)) {
      setSelectedWallId(project.walls[0]?.id ?? null);
    }
  }, [project.walls, selectedWallId]);

  const commit = (update: (current: Project) => Project) => {
    setSaved(false);
    setHistory((current) => {
      const next = update(current.present);
      if (next === current.present) return current;
      return {
        past: [...current.past.slice(-49), current.present],
        present: next,
        future: [],
      };
    });
  };

  const updateSelectedWall = (update: (wall: Wall) => Wall) => {
    if (!selectedWallId) return;
    commit((current) => ({
      ...current,
      walls: current.walls.map((wall) => wall.id === selectedWallId ? update(wall) : wall),
    }));
  };

  const updateWallLength = (length: number) => {
    if (!selectedWall || !Number.isFinite(length) || length < 0.5) return;
    const currentLength = wallLength(selectedWall);
    if (!currentLength) return;
    const oldEnd = selectedWall.end;
    const newEnd = {
      x: selectedWall.start.x + ((selectedWall.end.x - selectedWall.start.x) / currentLength) * length,
      y: selectedWall.start.y + ((selectedWall.end.y - selectedWall.start.y) / currentLength) * length,
    };
    commit((current) => ({
      ...current,
      walls: current.walls.map((wall) => {
        if (wall.id === selectedWall.id) return { ...wall, end: newEnd };
        if (pointsEqual(wall.start, oldEnd)) return { ...wall, start: newEnd };
        if (pointsEqual(wall.end, oldEnd)) return { ...wall, end: newEnd };
        return wall;
      }),
    }));
  };

  const handleCanvasPoint = (point: Point) => {
    if (!draftStart) {
      setDraftStart(point);
      return;
    }
    const length = Math.hypot(point.x - draftStart.x, point.y - draftStart.y);
    if (length < 0.5) return;
    const id = crypto.randomUUID();
    const newWall: Wall = {
      id,
      name: `Mur ${project.walls.length + 1}`,
      start: draftStart,
      end: point,
      height: 2.8,
      orientation: orientationFromPoints(draftStart, point),
      layers: [
        { id: crypto.randomUUID(), thicknessMm: 200, ...MATERIALS[2] },
        { id: crypto.randomUUID(), thicknessMm: 120, ...MATERIALS[1] },
      ],
    };
    commit((current) => ({ ...current, walls: [...current.walls, newWall] }));
    setSelectedWallId(id);
    setDraftStart(null);
    setMode("select");
  };

  const handleModeChange = (nextMode: EditorMode) => {
    setMode(nextMode);
    setDraftStart(null);
  };

  const undo = () => setHistory((current) => {
    const previous = current.past.at(-1);
    if (!previous) return current;
    return { past: current.past.slice(0, -1), present: previous, future: [current.present, ...current.future] };
  });

  const redo = () => setHistory((current) => {
    const next = current.future[0];
    if (!next) return current;
    return { past: [...current.past, current.present], present: next, future: current.future.slice(1) };
  });

  const save = () => {
    localStorage.setItem("donut-energy-project", JSON.stringify(project));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const updateLayer = (layerId: string, patch: Partial<WallLayer>) =>
    updateSelectedWall((wall) => ({
      ...wall,
      layers: wall.layers.map((layer) => layer.id === layerId ? { ...layer, ...patch } : layer),
    }));

  return (
    <div className="app-shell">
      <TopBar
        title={project.title}
        canUndo={history.past.length > 0}
        canRedo={history.future.length > 0}
        saved={saved}
        onTitleChange={(title) => commit((current) => ({ ...current, title }))}
        onUndo={undo}
        onRedo={redo}
        onSave={save}
      />
      <div className="workspace">
        <ModelSidebar
          mode={mode}
          walls={project.walls}
          selectedWallId={selectedWallId}
          onModeChange={handleModeChange}
          onSelectWall={(id) => { setSelectedWallId(id); setMode("select"); setDraftStart(null); }}
        />
        <PlanCanvas
          walls={project.walls}
          selectedWallId={selectedWallId}
          mode={mode}
          zoom={zoom}
          draftStart={draftStart}
          onSelectWall={setSelectedWallId}
          onCanvasPoint={handleCanvasPoint}
          onZoomChange={setZoom}
        />
        <WallInspector
          wall={selectedWall}
          onUpdateWall={(patch) => updateSelectedWall((wall) => ({ ...wall, ...patch }))}
          onUpdateLength={updateWallLength}
          onAddLayer={() => updateSelectedWall((wall) => ({
            ...wall,
            layers: [...wall.layers, { id: crypto.randomUUID(), thicknessMm: 100, ...MATERIALS[5] }],
          }))}
          onUpdateLayer={updateLayer}
          onRemoveLayer={(layerId) => updateSelectedWall((wall) => ({
            ...wall,
            layers: wall.layers.filter((layer) => layer.id !== layerId),
          }))}
        />
      </div>
      <StatusBar walls={project.walls} />
    </div>
  );
}

export default App;
