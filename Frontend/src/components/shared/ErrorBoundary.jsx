import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('UI error boundary caught:', error, info);
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback !== undefined) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[calc(100vh-64px)] bg-slate-50 flex items-center justify-center px-6 py-16">
          <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-xl shadow-slate-200/60 p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-5">
              <span className="material-symbols-outlined !text-3xl">refresh</span>
            </div>
            <h1 className="text-2xl font-black text-slate-800">Something went wrong</h1>
            <p className="text-sm text-slate-500 mt-2">
              The page hit a display error, but the app is still running.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-7">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="flex-1 h-11 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-dk transition-colors"
              >
                Reload
              </button>
              <a
                href="/"
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold flex items-center justify-center hover:bg-slate-50 transition-colors"
              >
                Home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
