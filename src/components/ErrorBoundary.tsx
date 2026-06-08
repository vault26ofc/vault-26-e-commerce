import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center">
          <span className="text-[10px] tracking-[0.5em] uppercase font-ui text-black/40 mb-6">System Error</span>
          <h1 className="text-3xl font-elegant italic mb-4">Something went wrong</h1>
          <p className="text-[11px] tracking-[0.15em] uppercase font-ui text-black/50 mb-10 max-w-sm">
            An unexpected error occurred. Please refresh the page or return to the homepage.
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => window.location.reload()}
              className="border border-black px-10 py-4 text-[10px] tracking-[0.4em] uppercase font-ui font-bold hover:bg-black hover:text-white transition-all duration-300"
            >
              Refresh
            </button>
            <a
              href="/"
              className="border border-black/20 px-10 py-4 text-[10px] tracking-[0.4em] uppercase font-ui font-bold hover:border-black transition-all duration-300"
            >
              Homepage
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
