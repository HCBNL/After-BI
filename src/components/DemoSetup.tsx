/**
 * The screen a demonstration organisation shows the first time its
 * administrator signs in: it fills itself with a whole business while they
 * watch, then drops them on the home screen with everything already there.
 *
 * Nothing about the app is different afterwards. Orders go through, stock
 * moves, people can be added: it is the real thing with a history behind it.
 */
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui';
import { WordmarkLoading } from '@/components/brand/Wordmark';
import { useAuth } from '@/context/AuthContext';
import { seedDemo, type DemoProgress } from '@/lib/demo';

export function DemoSetup({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const [step, setStep] = useState<DemoProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const started = useRef(-1);

  useEffect(() => {
    if (!user || started.current === attempt) return;
    started.current = attempt;
    setError(null);
    seedDemo(user, setStep)
      .then(onDone)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'It stopped part way through.'));
  }, [user, attempt, onDone]);

  const percent = step ? (step.done / step.total) * 100 : 4;

  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center text-center">
      <WordmarkLoading />
      <h1 className="mt-5 font-display text-[22px] font-bold tracking-[-0.02em] text-primary">
        Setting up the demonstration
      </h1>
      <p className="mt-2 text-[13.5px] leading-relaxed text-secondary">
        A catalogue, three depots with stock, ten distributors, six months of trading and the sign-ins to show it
        with. It takes about a minute. Leave this open.
      </p>

      <div className="mt-6 w-full">
        <div className="h-2 overflow-hidden rounded-full surface-sunken">
          <div
            className="h-full rounded-full bg-brand-600 transition-[width] duration-500 dark:bg-brand-500"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-2.5 text-[12.5px] text-muted">
          {step ? `${step.label} (${step.done} of ${step.total})` : 'Starting'}
        </p>
      </div>

      {error && (
        <div className="mt-5 w-full rounded-2xl border border-hairline surface-card p-4 text-left shadow-card">
          <p className="text-[13.5px] font-bold text-primary">It stopped part way</p>
          <p className="mt-1 text-[13px] leading-relaxed text-secondary">{error}</p>
          <Button className="mt-3" size="sm" onClick={() => setAttempt((n) => n + 1)}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
