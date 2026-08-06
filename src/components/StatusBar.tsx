import { AreaIcon, BuildingIcon, RulerIcon } from "../icons";
import { formatNumber, type Wall } from "../model";
import { projectPerimeter, projectWallArea } from "../thermal";

export function StatusBar({ walls }: { walls: Wall[] }) {
  return (
    <footer className="statusbar">
      <div><BuildingIcon /><span>{walls.length} murs</span></div>
      <div><RulerIcon /><span>{formatNumber(projectPerimeter(walls), 1)} m de périmètre</span></div>
      <div><AreaIcon /><span>{formatNumber(projectWallArea(walls), 1)} m² de parois</span></div>
    </footer>
  );
}
