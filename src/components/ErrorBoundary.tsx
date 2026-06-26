import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // Surfacing the error to the console so it shows up in logs.
    console.error("[ErrorBoundary] Render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground">
          <div className="max-w-2xl w-full rounded-2xl border border-destructive/30 bg-destructive/5 p-6 space-y-3">
            <h2 className="text-lg font-semibold text-destructive">
              Ha ocurrido un error al renderizar esta pantalla
            </h2>
            <p className="text-sm text-muted-foreground">
              Por favor comparte este mensaje con soporte:
            </p>
            <pre className="text-xs whitespace-pre-wrap break-words bg-background/50 p-3 rounded-lg border border-border max-h-64 overflow-auto">
              {this.state.error.message}
              {this.state.error.stack ? `\n\n${this.state.error.stack}` : ""}
            </pre>
            <button
              onClick={() => {
                this.setState({ error: null });
                window.location.reload();
              }}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
            >
              Recargar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}