import type { ReactNode } from "react";
import "../inspector-accordion.css";

type Props = {
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
};

export function InspectorAccordion({ title, hint, defaultOpen = false, children, className = "" }: Props) {
  return (
    <details className={`inspector-accordion ${className}`.trim()} open={defaultOpen}>
      <summary>
        <span className="inspector-accordion-title">{title}</span>
        {hint ? <small>{hint}</small> : null}
        <i aria-hidden="true" />
      </summary>
      <div className="inspector-accordion-body">{children}</div>
    </details>
  );
}
