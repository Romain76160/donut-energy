import { Component, StrictMode, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

declare global {
  interface Window {
    __donutBootstrap?: {
      ready: () => void;
      fail: (reason: unknown) => void;
    };
  }
}

type ErrorBoundaryProps = { children: ReactNode };
type ErrorBoundaryState = { error: string | null };

const escapeHtml = (value: string) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");

const diagnosticMarkup = (message: string) => `
  <div style="min-height:100vh;display:grid;place-items:center;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0c1729;background:#fff">
    <div style="width:min(680px,100%);padding:24px;border:1px solid #e4e7ec;border-radius:12px;box-shadow:0 8px 30px rgba(16,24,40,.08)">
      <h1 style="margin:0 0 12px;font-size:22px">Donut Energy — erreur de chargement</h1>
      <p style="margin:0 0 14px;line-height:1.55;color:#475467">L’application a bien été chargée par GitHub Pages, mais une erreur JavaScript empêche son affichage.</p>
      <pre style="margin:0;padding:14px;overflow:auto;border-radius:8px;background:#f8fafc;color:#b42318;white-space:pre-wrap;font-size:12px">${escapeHtml(message)}</pre>
    </div>
  </div>`;

const showFatalError = (error: unknown) => {
  const root = document.getElementById("root");
  if (!root) return;
  const message = error instanceof Error ? `${error.name}: ${error.message}\n${error.stack ?? ""}` : String(error);
  root.innerHTML = diagnosticMarkup(message);
};

window.addEventListener("error", (event) => {
  showFatalError(event.error ?? event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  showFatalError(event.reason);
});

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error: `${error.name}: ${error.message}` };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Donut Energy render error", error, info);
  }

  render() {
    if (this.state.error) {
      return <div dangerouslySetInnerHTML={{ __html: diagnosticMarkup(this.state.error) }} />;
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Élément #root introuvable dans index.html");
}

window.__donutBootstrap?.ready();

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
