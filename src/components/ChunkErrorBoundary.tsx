import { Component, type ReactNode } from "react";

/* =========================================================
   CHUNK ERROR BOUNDARY

   Catches errors thrown by lazy()-loaded components,
   most commonly caused by a stale deployment: the user's
   browser tab has an old index.html/bundle in memory that
   references a JS chunk (e.g. DashboardView-a3f8c2.js)
   which no longer exists on the server because a new
   build was deployed since the tab was opened.

   Behavior:
   - If the error looks like a chunk/module load failure,
     force a full page reload ONCE (using sessionStorage
     as a guard so we never get stuck in a reload loop if
     the error is something else entirely).
   - Otherwise, render a small fallback and log the error,
     so a genuine runtime bug doesn't just show a blank
     screen forever.
========================================================= */

interface ChunkErrorBoundaryProps {
  children: ReactNode;
  /* Optional custom fallback while a reload is in-flight
     or for non-chunk errors. Defaults to an empty block
     matching the existing Suspense fallback sizing. */
  fallback?: ReactNode;
}

interface ChunkErrorBoundaryState {
  hasError: boolean;
  isChunkError: boolean;
}

const RELOAD_GUARD_KEY =
  "lumoclip:chunk-error-reload-attempted";

const isChunkLoadError = (
  error: unknown,
): boolean => {
  const message =
    error instanceof Error
      ? error.message
      : String(error);

  return (
    /Failed to fetch dynamically imported module/i.test(
      message,
    ) ||
    /ChunkLoadError/i.test(message) ||
    /Importing a module script failed/i.test(
      message,
    ) ||
    /Loading chunk [\d\w-]+ failed/i.test(
      message,
    ) ||
    /error loading dynamically imported module/i.test(
      message,
    )
  );
};

class ChunkErrorBoundary extends Component<
  ChunkErrorBoundaryProps,
  ChunkErrorBoundaryState
> {
  state: ChunkErrorBoundaryState = {
    hasError: false,
    isChunkError: false,
  };

  static getDerivedStateFromError(
    error: unknown,
  ): ChunkErrorBoundaryState {
    return {
      hasError: true,
      isChunkError: isChunkLoadError(error),
    };
  }

  componentDidCatch(error: unknown) {
    if (isChunkLoadError(error)) {
      let alreadyAttempted = false;

      try {
        alreadyAttempted =
          window.sessionStorage.getItem(
            RELOAD_GUARD_KEY,
          ) === "1";
      } catch {
        /* sessionStorage unavailable (e.g. private mode
           restrictions) — fall through and just log */
      }

      if (!alreadyAttempted) {
        try {
          window.sessionStorage.setItem(
            RELOAD_GUARD_KEY,
            "1",
          );
        } catch {
          /* ignore */
        }

        console.warn(
          "Stale build detected — reloading to fetch the latest version.",
          error,
        );

        window.location.reload();

        return;
      }

      console.error(
        "Chunk failed to load even after a reload. The deployment may be broken.",
        error,
      );

      return;
    }

    console.error(
      "Unhandled error in lazy-loaded view:",
      error,
    );
  }

  /* Clear the reload guard once something renders
     successfully again, so a future genuine stale-deploy
     event can still trigger one reload attempt. */
  componentDidUpdate(
    _prevProps: ChunkErrorBoundaryProps,
    prevState: ChunkErrorBoundaryState,
  ) {
    if (
      prevState.hasError &&
      !this.state.hasError
    ) {
      try {
        window.sessionStorage.removeItem(
          RELOAD_GUARD_KEY,
        );
      } catch {
        /* ignore */
      }
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.state.isChunkError) {
        /* Reload is already in-flight (or was attempted
           and failed again) — show a minimal, non-blank
           notice instead of an empty div forever. */
        return (
          this.props.fallback ?? (
            <div className="flex min-h-[60vh] items-center justify-center px-4 text-center">
              <div>
                <p className="text-sm font-bold text-zinc-300">
                  Updating LumoClip…
                </p>
                <p className="mt-2 text-xs text-zinc-600">
                  If this doesn't finish in a
                  few seconds,{" "}
                  <button
                    type="button"
                    onClick={() =>
                      window.location.reload()
                    }
                    className="underline hover:text-white"
                  >
                    click here to reload
                  </button>
                  .
                </p>
              </div>
            </div>
          )
        );
      }

      return (
        this.props.fallback ?? (
          <div className="flex min-h-[60vh] items-center justify-center px-4 text-center">
            <div>
              <p className="text-sm font-bold text-zinc-300">
                Something went wrong.
              </p>
              <p className="mt-2 text-xs text-zinc-600">
                <button
                  type="button"
                  onClick={() =>
                    window.location.reload()
                  }
                  className="underline hover:text-white"
                >
                  Reload the page
                </button>
              </p>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

export default ChunkErrorBoundary;