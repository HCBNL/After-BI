import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PORTAL_ROOT } from '@/lib/tiles';

/**
 * The 404, in two shapes.
 *
 * Inside a portal it keeps the shell and offers the way back to that portal's
 * home — because somebody who followed a stale link is still signed in and
 * still has work to do. Outside it, it is a whole page.
 *
 * A wildcard route under each portal is what makes this reachable rather than a
 * blank screen: a path that no route in that portal matches lands here, and
 * says which portal it was looking in.
 */
export default function NotFoundPage({ inPortal }: { inPortal?: boolean }) {
  const { user } = useAuth();
  const home = user ? PORTAL_ROOT[user.role] : '/';

  const body = (
    <div className="mx-auto max-w-md px-6 py-16 text-center">
      <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-sunken)] text-muted">
        <Compass size={24} aria-hidden />
      </span>
      <h1 className="text-[18px] font-bold text-primary">That page is not here</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {inPortal
          ? 'The link may be from an older version of the app, or the screen may not be one your account can open.'
          : 'Check the address, or go back to the start.'}
      </p>
      <Link
        to={inPortal ? home : '/'}
        className="mt-6 inline-flex h-11 items-center rounded-xl bg-brand-900 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-800 dark:bg-brand-500 dark:text-brand-950 dark:hover:bg-brand-400"
      >
        {inPortal ? 'Back to home' : 'Go to sign in'}
      </Link>
    </div>
  );

  if (inPortal) return body;
  return <div className="flex min-h-dvh items-center surface-page">{body}</div>;
}
