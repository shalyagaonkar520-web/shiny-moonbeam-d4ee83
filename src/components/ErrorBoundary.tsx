import React from 'react';

interface State {
  error: Error | null;
}

/**
 * Catches a render-time crash and shows a recoverable screen instead of a blank page.
 *
 * Added after a Firebase Cloud Messaging call that ran at module scope threw on
 * iOS Safari and left the whole app white. Anything that slips through in future
 * should at least tell the customer what happened and offer a way out.
 */
export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Unhandled UI error:', error, info.componentStack);
  }

  private reload = () => {
    // Drop caches too: a bad cached bundle is a common cause of a repeat crash.
    try {
      if ('caches' in window) caches.keys().then((ks) => ks.forEach((k) => caches.delete(k)));
    } catch {
      /* cache access can throw in private mode; reloading still helps */
    }
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fff5f7] px-5">
        <div className="w-full max-w-sm text-center bg-white rounded-3xl border border-rose-100 shadow-lg p-7">
          <div className="text-4xl mb-3">🍲</div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">
            Something went wrong
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-2">
            The page failed to load. Reloading usually fixes it.
          </p>
          <button
            onClick={this.reload}
            className="mt-5 w-full py-3 rounded-2xl bg-[#e11d48] text-white text-sm font-black tracking-wide shadow-md hover:bg-rose-700 active:scale-98 transition-all"
          >
            Reload the app
          </button>
          <a
            href="tel:+919606001790"
            className="block mt-3 text-xs font-bold text-gray-400 hover:text-[#e11d48]"
          >
            Or call the kitchen to order
          </a>
        </div>
      </div>
    );
  }
}
