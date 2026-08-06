import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = (props: IconProps) => ({
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  ...props,
});

export const PointerIcon = (props: IconProps) => (
  <svg {...base(props)}><path d="m5 3 13 9-6 1.2 3.4 6.1-2.6 1.4-3.3-6.1L5 18Z" /></svg>
);
export const WallIcon = (props: IconProps) => (
  <svg {...base(props)}><path d="M4 18 18 4M8 18l10-10M4 14l10-10" /><path d="M4 20v-5M20 4h-5" /></svg>
);
export const UndoIcon = (props: IconProps) => (
  <svg {...base(props)}><path d="m9 7-5 5 5 5" /><path d="M5 12h8a6 6 0 0 1 6 6" /></svg>
);
export const RedoIcon = (props: IconProps) => (
  <svg {...base(props)}><path d="m15 7 5 5-5 5" /><path d="M19 12h-8a6 6 0 0 0-6 6" /></svg>
);
export const SaveIcon = (props: IconProps) => (
  <svg {...base(props)}><path d="M5 3h12l2 2v16H5Z" /><path d="M8 3v6h8V3M8 21v-7h8v7" /></svg>
);
export const PlusIcon = (props: IconProps) => (
  <svg {...base(props)}><path d="M12 5v14M5 12h14" /></svg>
);
export const TrashIcon = (props: IconProps) => (
  <svg {...base(props)}><path d="M5 7h14M9 7V4h6v3M8 7l1 13h6l1-13M10 11v5M14 11v5" /></svg>
);
export const ZoomInIcon = (props: IconProps) => (
  <svg {...base(props)}><path d="M12 8v8M8 12h8" /></svg>
);
export const ZoomOutIcon = (props: IconProps) => (
  <svg {...base(props)}><path d="M8 12h8" /></svg>
);
export const LocateIcon = (props: IconProps) => (
  <svg {...base(props)}><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="1.5" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
);
export const BuildingIcon = (props: IconProps) => (
  <svg {...base(props)}><path d="M5 21V4h10v17M15 9h4v12M3 21h18M8 8h3M8 12h3M8 16h3" /></svg>
);
export const RulerIcon = (props: IconProps) => (
  <svg {...base(props)}><path d="m4 16 12-12 4 4L8 20Z" /><path d="m13 7 2 2M10 10l2 2M7 13l2 2" /></svg>
);
export const AreaIcon = (props: IconProps) => (
  <svg {...base(props)}><path d="M4 4h16v16H4Z" /><path d="M4 9h3M4 15h3M17 4v3M11 4v3M20 11h-3M20 16h-3M13 20v-3M8 20v-3" /></svg>
);
