import { useEffect, useMemo, useState } from "react";
import { LevelInspector } from "./components/LevelInspector";
import { ModelSidebar } from "./components/ModelSidebar";
import { PlanCanvas } from "./components/PlanCanvas";
import { StatusBar } from "./components/StatusBar";
import { TopBar } from "./components/TopBar";
import { WallInspector } from "./components/WallInspector";
import { detectRooms, nearestWallPoint, projectFromLengthAngle, snapPoint, splitWallsAtPoint, wallAzimuthFromNorth, wallOrientationFromNorth } from "./geometry";
import { translations, type Language } from "./i18n";
import {
  createId,
  createLevel,
  externalWallLayers,
  gableProfile,
  initialProject,
  internalWallLayers,
  MATERIALS,
  migrateProject,
  normalizeProfile,
  orientationFromPoints,
  pointsEqual,
  rectangleProfile,
  resizeProfile,
  slopeProfile,
  wallLength,
  type EditorMode,
  type Level,
  type Point,
  type ProfilePoint,
  type Project,
  type Wall,
  type WallLayer,
} from "./model";

type History = { past: Project[]; present: Project; future: Project[] };
type SurfaceKey = "floor" | "ceiling";

const loadProject = () => {
  try {
    const saved = localStorage.getItem("donut-energy-project");
    if (saved) return migrateProject(JSON.parse(saved));
  } catch {
    // A malformed or outdated local save must never prevent the editor from opening.
  }
  return initialProject();
};

const loadLanguage = (): Language => {
  try {
    return localStorage.getItem("donut-energy-language") === "en" ? "en" : "fr";
  } catch {
    return "fr";
  }
};

const loadNorthAngle = () => {
  try {
    const value = Number(localStorage.getItem("donut-energy-north-angle"));
    return Number.isFinite(value) ? ((value % 360) + 360) % 360 : 0;
  } catch {
    return 0;
  }
};

const drawingMode = (mode: EditorMode) => mode === "draw-external" || mode === "draw-internal";

function App() {
  const [history, setHistory] = useState<History>(() => ({ past: [], present: loadProject(), future: [] }));
  const [activeLevelId, setActiveLevelId] = useState(() => history.present.levels[0]?.id ?? "");
  const [selectedWallId, setSelectedWallId] = useState<string | null>(() => history.present.levels[0]?.walls[0]?.id ?? null);
  const [mode, setMode] = useState<EditorMode>("select");
  const [draftStart, setDraftStart] = useState<Point | null>(null);
  const [drawLength, setDrawLength] = useState(4);
  const [drawAngle, setDrawAngle] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [saved, setSaved] = useState(false);
  const [language, setLanguage] = useState<Language>(loadLanguage);
  const [northAngle, setNorthAngle] = useState(loadNorthAngle);

  const project = history.present;
  const activeLevel = useMemo(
    () => project.levels.find((level) => level.id === activeLevelId) ?? project.levels[0],
    [project.levels, activeLevelId],
  );
  const selectedWall = useMemo(
    () => activeLevel?.walls.find((wall) => wall.id === selectedWallId) ?? null,
    [activeLevel, selectedWallId],
  );
  const rooms = useMemo(() => detectRooms(activeLevel?.walls ?? []), [activeLevel?.walls]);
  const lowerWalls = useMemo(() => {
    if (!activeLevel?.showLowerReference) return [];
    const lower = project.levels
      .filter((level) => level.elevation < activeLevel.elevation - 0.001)
      .sort((a, b) => b.elevation - a.elevation)[0];
    return lower?.walls ?? [];
  }, [activeLevel, project.levels]);
  const automaticOrientation = useMemo(() => {
    if (!selectedWall || selectedWall.type !== "external" || !activeLevel) return null;
    return wallOrientationFromNorth(selectedWall, activeLevel.walls, northAngle, rooms);
  }, [selectedWall, activeLevel, northAngle, rooms]);
  const automaticAzimuth = useMemo(() => {
    if (!selectedWall || selectedWall.type !== "external" || !activeLevel) return null;
    return wallAzimuthFromNorth(selectedWall, activeLevel.walls, northAngle, rooms);
  }, [selectedWall, activeLevel, northAngle, rooms]);

  useEffect(() => {
    if (!activeLevel) {
      const first = project.levels[0];
      if (first) setActiveLevelId(first.id);
      return;
    }
    if (selectedWallId && !activeLevel.walls.some((wall) => wall.id === selectedWallId)) setSelectedWallId(null);
  }, [activeLevel, project.levels, selectedWallId]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = language === "fr" ? "Donut Energy — Modélisation thermique" : "Donut Energy — Thermal modelling";
    document.querySelector('meta[name="description"]')?.setAttribute(
      "content",
      language === "fr"
        ? "Donut Energy — éditeur géométrique et thermique de bâtiments."
        : "Donut Energy — geometric and thermal building editor.",
    );
    try {
      localStorage.setItem("donut-energy-language", language);
    } catch {
      // Language persistence is optional when storage is unavailable.
    }
  }, [language]);

  useEffect(() => {
    try {
      localStorage.setItem("donut-energy-north-angle", String(northAngle));
    } catch {
      // North orientation persistence is optional when storage is unavailable.
    }
  }, [northAngle]);

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

  const commitActiveLevel = (update: (level: Level) => Level) => {
    if (!activeLevel) return;
    commit((current) => ({
      ...current,
      levels: current.levels.map((level) => level.id === activeLevel.id ? update(level) : level),
    }));
  };

  const updateSelectedWall = (update: (wall: Wall) => Wall) => {
    if (!selectedWallId) return;
    commitActiveLevel((level) => ({
      ...level,
      walls: level.walls.map((wall) => wall.id === selectedWallId ? update(wall) : wall),
    }));
  };

  const updateWallLength = (length: number) => {
    if (!selectedWall || !Number.isFinite(length) || length < 0.2) return;
    const currentLength = wallLength(selectedWall);
    if (!currentLength) return;
    const oldEnd = selectedWall.end;
    const newEnd = {
      x: selectedWall.start.x + ((selectedWall.end.x - selectedWall.start.x) / currentLength) * length,
      y: selectedWall.start.y + ((selectedWall.end.y - selectedWall.start.y) / currentLength) * length,
    };

    commitActiveLevel((level) => ({
      ...level,
      walls: level.walls.map((wall) => {
        if (wall.id === selectedWall.id) {
          return {
            ...wall,
            end: newEnd,
            orientation: orientationFromPoints(wall.start, newEnd),
            profile: resizeProfile(wall, length),
          };
        }
        let nextStart = wall.start;
        let nextEnd = wall.end;
        if (pointsEqual(wall.start, oldEnd, 0.01)) nextStart = newEnd;
        if (pointsEqual(wall.end, oldEnd, 0.01)) nextEnd = newEnd;
        if (nextStart === wall.start && nextEnd === wall.end) return wall;
        const nextLength = Math.hypot(nextEnd.x - nextStart.x, nextEnd.y - nextStart.y);
        return {
          ...wall,
          start: nextStart,
          end: nextEnd,
          orientation: orientationFromPoints(nextStart, nextEnd),
          profile: resizeProfile(wall, nextLength),
        };
      }),
    }));
  };

  const createWallBetween = (start: Point, end: Point) => {
    if (!activeLevel || !drawingMode(mode)) return;
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    if (length < 0.15) return;
    const type = mode === "draw-internal" ? "internal" : "external";
    const id = createId();
    const newWall: Wall = {
      id,
      name: translations[language].newWall(activeLevel.walls.length + 1),
      start,
      end,
      height: activeLevel.defaultHeight,
      orientation: orientationFromPoints(start, end),
      type,
      layers: type === "external" ? externalWallLayers() : internalWallLayers(),
      profile: rectangleProfile(length, activeLevel.defaultHeight),
    };

    commitActiveLevel((level) => {
      let walls = splitWallsAtPoint(level.walls, start);
      walls = splitWallsAtPoint(walls, end);
      return { ...level, walls: [...walls, newWall] };
    });
    setSelectedWallId(id);
    setDraftStart(end);
  };

  const handleCanvasPoint = (point: Point) => {
    if (!activeLevel) return;
    if (mode === "node") {
      const hit = nearestWallPoint(point, activeLevel.walls, 0.32);
      if (!hit || hit.t <= 0.02 || hit.t >= 0.98) return;
      commitActiveLevel((level) => ({ ...level, walls: splitWallsAtPoint(level.walls, hit.point) }));
      setSelectedWallId(null);
      setMode("select");
      return;
    }
    if (!drawingMode(mode)) return;
    const snapped = snapPoint(point, activeLevel.walls);
    if (!draftStart) {
      setDraftStart(snapped);
      setSelectedWallId(null);
      return;
    }
    createWallBetween(draftStart, snapped);
  };

  const createVectorSegment = () => {
    if (!draftStart || !activeLevel || !drawingMode(mode)) return;
    const length = Math.max(0.1, Number(drawLength));
    const angle = Number.isFinite(drawAngle) ? drawAngle : 0;
    const raw = projectFromLengthAngle(draftStart, length, angle);
    const target = { x: Math.round(raw.x * 1000) / 1000, y: Math.round(raw.y * 1000) / 1000 };
    createWallBetween(draftStart, target);
  };

  const handleModeChange = (nextMode: EditorMode) => {
    setMode(nextMode);
    setDraftStart(null);
    if (nextMode !== "select") setSelectedWallId(null);
  };

  const finishDrawing = () => {
    setDraftStart(null);
    setMode("select");
  };

  const addLevel = () => {
    const index = project.levels.length + 1;
    const highest = [...project.levels].sort((a, b) => b.elevation - a.elevation)[0];
    const elevation = highest ? highest.elevation + highest.defaultHeight + 0.2 : 0;
    const level = createLevel(translations[language].newLevel(index), elevation, false);
    commit((current) => ({ ...current, levels: [...current.levels, level] }));
    setActiveLevelId(level.id);
    setSelectedWallId(null);
    setMode("select");
    setDraftStart(null);
  };

  const selectLevel = (id: string) => {
    setActiveLevelId(id);
    setSelectedWallId(null);
    setMode("select");
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
    try {
      localStorage.setItem("donut-energy-project", JSON.stringify(project));
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch {
      setSaved(false);
    }
  };

  const updateLayer = (layerId: string, patch: Partial<WallLayer>) =>
    updateSelectedWall((wall) => ({ ...wall, layers: wall.layers.map((layer) => layer.id === layerId ? { ...layer, ...patch } : layer) }));

  const setProfilePreset = (preset: "rectangle" | "slope" | "gable") => {
    if (!selectedWall) return;
    const length = wallLength(selectedWall);
    const profile = preset === "gable"
      ? gableProfile(length, selectedWall.height)
      : preset === "slope"
        ? slopeProfile(length, selectedWall.height)
        : rectangleProfile(length, selectedWall.height);
    updateSelectedWall((wall) => ({ ...wall, profile }));
  };

  const addProfilePoint = () => {
    if (!selectedWall) return;
    const profile = normalizeProfile(selectedWall);
    let gapIndex = 0;
    let maxGap = -1;
    for (let index = 0; index < profile.length - 1; index += 1) {
      const gap = profile[index + 1].position - profile[index].position;
      if (gap > maxGap) { maxGap = gap; gapIndex = index; }
    }
    const a = profile[gapIndex];
    const b = profile[gapIndex + 1];
    const point: ProfilePoint = {
      id: createId(),
      position: (a.position + b.position) / 2,
      height: (a.height + b.height) / 2,
    };
    updateSelectedWall((wall) => ({ ...wall, profile: [...profile, point].sort((left, right) => left.position - right.position) }));
  };

  const updateSurfaceLayer = (surface: SurfaceKey, layerId: string, patch: Partial<WallLayer>) => {
    commitActiveLevel((level) => ({
      ...level,
      [surface]: {
        ...level[surface],
        layers: level[surface].layers.map((layer) => layer.id === layerId ? { ...layer, ...patch } : layer),
      },
    }));
  };

  const addSurfaceLayer = (surface: SurfaceKey) => {
    commitActiveLevel((level) => ({
      ...level,
      [surface]: {
        ...level[surface],
        layers: [...level[surface].layers, { id: createId(), thicknessMm: 80, ...MATERIALS[5] }],
      },
    }));
  };

  const removeSurfaceLayer = (surface: SurfaceKey, layerId: string) => {
    commitActiveLevel((level) => ({
      ...level,
      [surface]: { ...level[surface], layers: level[surface].layers.filter((layer) => layer.id !== layerId) },
    }));
  };

  if (!activeLevel) return null;

  return (
    <div className="app-shell">
      <TopBar
        title={project.title}
        canUndo={history.past.length > 0}
        canRedo={history.future.length > 0}
        saved={saved}
        language={language}
        onTitleChange={(title) => commit((current) => ({ ...current, title }))}
        onUndo={undo}
        onRedo={redo}
        onSave={save}
        onLanguageChange={() => setLanguage((current) => current === "fr" ? "en" : "fr")}
      />
      <div className="workspace">
        <ModelSidebar
          mode={mode}
          levels={project.levels}
          activeLevelId={activeLevel.id}
          walls={activeLevel.walls}
          roomCount={rooms.length}
          selectedWallId={selectedWallId}
          draftStart={draftStart}
          drawLength={drawLength}
          drawAngle={drawAngle}
          language={language}
          onModeChange={handleModeChange}
          onSelectWall={(id) => { setSelectedWallId(id); setMode("select"); setDraftStart(null); }}
          onSelectLevel={selectLevel}
          onAddLevel={addLevel}
          onDrawLengthChange={setDrawLength}
          onDrawAngleChange={setDrawAngle}
          onCreateVector={createVectorSegment}
          onFinishDrawing={finishDrawing}
        />
        <PlanCanvas
          walls={activeLevel.walls}
          lowerWalls={lowerWalls}
          rooms={rooms}
          selectedWallId={selectedWallId}
          mode={mode}
          zoom={zoom}
          draftStart={draftStart}
          northAngle={northAngle}
          language={language}
          onSelectWall={setSelectedWallId}
          onClearSelection={() => setSelectedWallId(null)}
          onCanvasPoint={handleCanvasPoint}
          onZoomChange={setZoom}
          onNorthAngleChange={setNorthAngle}
        />
        {selectedWall ? (
          <WallInspector
            wall={selectedWall}
            language={language}
            automaticOrientation={automaticOrientation}
            automaticAzimuth={automaticAzimuth}
            onUpdateWall={(patch) => updateSelectedWall((wall) => ({ ...wall, ...patch }))}
            onUpdateLength={updateWallLength}
            onAddLayer={() => updateSelectedWall((wall) => ({ ...wall, layers: [...wall.layers, { id: createId(), thicknessMm: 100, ...MATERIALS[5] }] }))}
            onUpdateLayer={updateLayer}
            onRemoveLayer={(layerId) => updateSelectedWall((wall) => ({ ...wall, layers: wall.layers.filter((layer) => layer.id !== layerId) }))}
            onUpdateProfile={(profile) => updateSelectedWall((wall) => ({ ...wall, profile }))}
            onSetProfilePreset={setProfilePreset}
            onAddProfilePoint={addProfilePoint}
            onRemoveProfilePoint={(id) => updateSelectedWall((wall) => ({ ...wall, profile: normalizeProfile(wall).filter((point) => point.id !== id) }))}
          />
        ) : (
          <LevelInspector
            level={activeLevel}
            rooms={rooms}
            language={language}
            onUpdateLevel={(patch) => commitActiveLevel((level) => ({ ...level, ...patch }))}
            onUpdateSurfaceLayer={updateSurfaceLayer}
            onAddSurfaceLayer={addSurfaceLayer}
            onRemoveSurfaceLayer={removeSurfaceLayer}
          />
        )}
      </div>
      <StatusBar walls={activeLevel.walls} rooms={rooms} levelName={activeLevel.name} language={language} />
    </div>
  );
}

export default App;
