/**
 * One screen failing must not take the app with it.
 *
 * React unmounts the entire tree when a render throws and nothing catches it.
 * With no boundary anywhere, one bad value on one screen left a blank white
 * page with no header, no navigation and no back button — which reads as "the
 * app went offline", because a blank page is what being offline looks like.
 * The only way out was the browser's own back button, and on a page that has
 * already unmounted even that often lands somewhere equally blank.
 *
 * So: catch it, work out which of the three things actually went wrong, say so
 * in a sentence a teacher can act on, and offer the way out that fits.
 *
 * `key`ed on the pathname by the caller, so navigating away clears the error
 * instead of the boundary staying broken for the rest of the visit.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Where "Home" goes. The portal root for whoever is signed in. */
  home?: string;
  /**
   * Clear the error when this value changes. Pass the pathname.
   *
   * Deliberately a prop rather than React's `key`, and the difference is the
   * whole performance of the app. A changed `key` unmounts the entire subtree
   * and builds it again, so keying this boundary on the pathname threw away
   * the shell, both context providers and every cached read on every single
   * tap. Comparing the value inside the boundary clears the error just as
   * reliably and leaves everything below it exactly where it was.
   */
  resetOn?: string;
}

interface State {
  error: Error | null;
  /** The `resetOn` the current error belongs to. */
  seenAt?: string;
}

type Kind = 'stale-build' | 'connection' | 'signed-out' | 'refused' | 'bug';

/**
 * What actually went wrong, from the only evidence there is.
 *
 * Message matching is crude and it is the right tool here: these strings come
 * from the browser and the Firebase SDK, not from us, and the alternative is
 * showing every failure the same unhelpful sentence.
 */
function classify(error: Error): Kind {
  const message = `${error.message} ${(error as { code?: string }).code ?? ''}`.toLowerCase();

  // A deploy went out while this tab was open. The chunk the app is asking for
  // no longer exists on the server under that name.
  if (
    message.includes('dynamically imported module') ||
    message.includes('importing a module script failed') ||
    message.includes('failed to fetch dynamically') ||
    message.includes('chunkloaderror')
  ) {
    return 'stale-build';
  }

  // Firestore's word for "I could not open a connection", which it also says
  // on a perfectly good connection that will not carry its stream.
  if (
    message.includes('client is offline') ||
    message.includes('unavailable') ||
    message.includes('network error') ||
    message.includes('failed to fetch') ||
    message.includes('deadline-exceeded')
  ) {
    return 'connection';
  }

  if (message.includes('unauthenticated') || message.includes('id-token-expired')) return 'signed-out';
  if (message.includes('permission-denied') || message.includes('insufficient permissions')) return 'refused';

  return 'bug';
}

const COPY: Record<Kind, { title: string; body: string }> = {
  'stale-build': {
    title: 'The app was updated',
    body: 'A new version of GetSchool went out while this page was open. Load it again. Nothing you typed is lost.',
  },
  connection: {
    title: 'Could not reach the school records',
    body: 'The app is running, but it could not get through to the database. This is almost always the network. Check your data or Wi-Fi and try again.',
  },
  'signed-out': {
    title: 'Your sign-in has expired',
    body: 'For security, a sign-in does not last for ever. Sign in again and you will come straight back here.',
  },
  refused: {
    title: 'You do not have access to this',
    body: 'Your account is not permitted to open this screen. If that seems wrong, ask your school administrator to check your role.',
  },
  bug: {
    title: 'This screen did not load',
    body: 'Something on this page went wrong. Your work is safe and you are still signed in. The rest of the app still works.',
  },
};

/**
 * A stale build cannot be fixed by re-rendering, so recover from it once,
 * automatically, and only once.
 *
 * The service worker is the reason it can persist: it will happily keep
 * serving the cached shell and the cached assets it already has. Clearing the
 * caches and reloading is the only reliable way back. The sessionStorage flag
 * is what stops that becoming a reload loop on a page that is broken for some
 * other reason — after one attempt the person sees the message and a button
 * instead.
 */
const RECOVERY_FLAG = 'gs:reloaded-for-stale-build';

async function hardReload() {
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
  } catch {
    // Storage can be blocked entirely (private mode, a locked-down browser).
    // The reload below is still worth doing.
  }
  window.location.reload();
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  /**
   * Move to another screen and the error goes with the screen it belonged to.
   *
   * `seenAt` records which route was showing when it was caught. The moment
   * `resetOn` differs from that, this is a different screen and the old
   * failure is not its failure.
   */
  static getDerivedStateFromProps(props: Props, state: State): State | null {
    if (!state.error) return state.seenAt === props.resetOn ? null : { error: null, seenAt: props.resetOn };
    if (state.seenAt === undefined) return { ...state, seenAt: props.resetOn };
    if (state.seenAt !== props.resetOn) return { error: null, seenAt: props.resetOn };
    return null;
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Left in on purpose. When somebody sends a screenshot of this screen, the
    // console beside it is what makes the report actionable.
    console.error('Screen failed to render:', error, info.componentStack);

    if (classify(error) === 'stale-build') {
      let alreadyTried = true;
      try {
        alreadyTried = sessionStorage.getItem(RECOVERY_FLAG) === '1';
        if (!alreadyTried) sessionStorage.setItem(RECOVERY_FLAG, '1');
      } catch {
        // No sessionStorage means no way to guarantee this happens once, and a
        // reload loop is worse than a message. Leave it to the button.
      }
      if (!alreadyTried) void hardReload();
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const kind = classify(error);
    const { title, body } = COPY[kind];
    const home = this.props.home ?? '/';

    return (
      <div className="flex min-h-[60vh] items-center justify-center px-5 py-10">
        <div className="w-full max-w-md text-center">
          <h1 className="text-[19px] font-bold text-primary">{title}</h1>

          <p className="mt-2 text-[14px] leading-relaxed text-secondary">{body}</p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
            {kind === 'signed-out' ? (
              <a
                href="/login"
                className="tap flex items-center rounded-xl bg-brand-600 px-4 text-[14.5px] font-semibold text-white transition-colors hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-400"
              >
                Sign in again
              </a>
            ) : kind === 'stale-build' ? (
              <button
                type="button"
                onClick={() => void hardReload()}
                className="tap rounded-xl bg-brand-600 px-4 text-[14.5px] font-semibold text-white transition-colors hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-400"
              >
                Reload the app
              </button>
            ) : (
              <button
                type="button"
                onClick={() => this.setState({ error: null })}
                className="tap rounded-xl bg-brand-600 px-4 text-[14.5px] font-semibold text-white transition-colors hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-400"
              >
                Try again
              </button>
            )}

            {/*
              A real link, not `history.back()`. The screen that threw is gone
              from the React tree, and on a first visit there is nothing behind
              it in the history to go back to — the button did nothing, which
              is exactly the "I cannot even go back" complaint.
            */}
            <a
              href={home}
              className="tap flex items-center rounded-xl border border-hairline px-4 text-[14.5px] font-semibold text-secondary transition-colors hover:bg-[var(--surface-sunken)] hover:text-primary"
            >
              Back to the main screen
            </a>
          </div>

          {/*
            The message itself, small and last. A teacher will not read it, but
            it is the difference between a useful screenshot and a useless one.
          */}
          <p className="mt-6 break-words font-mono text-[11.5px] leading-relaxed text-muted">
            {error.message}
          </p>
        </div>
      </div>
    );
  }
}
