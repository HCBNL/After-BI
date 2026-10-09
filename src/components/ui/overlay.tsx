import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button, IconButton } from './primitives';
import { Hint } from './Hint';

/* Modal */

const SIZE = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
  full: 'max-w-[min(96vw,1400px)]',
};

export function Modal({
  open,
  onClose,
  title,
  description,
  note,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  /**
   * WHICH OF THE TWO YOU WANT
   *
   * `description` is a subtitle: who this record belongs to, what it is worth,
   * when it was made. It identifies the thing in front of you and it is
   * printed, because covering it up would make the dialog ambiguous.
   *
   * `note` is an explanation: why this dialog behaves the way it does, what
   * writing this form will actually do. It is worth having and it is worth
   * reading once, so it lives behind the (i) beside the title rather than
   * across the top of every dialog forever.
 */
  description?: ReactNode;
  note?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof SIZE;
  closeOnBackdrop?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  /*
   * THE BUG THIS FIXES: ONE LETTER, THEN THE CARET VANISHES.
   *
   * Every dialog in this app is opened the same way, and it is the ordinary
   * way:
   *
   *     <Modal open={Boolean(editing)} onClose={() => setEditing(null)}>
   *
   * That arrow is a NEW function on every render of the screen. The form's
   * state lives on that same screen, so typing one character into a subject's
   * name called setEditing, re-rendered the screen, and handed this component
   * a different `onClose` than the one before. With `onClose` in the
   * dependency list the effect tore itself down and ran again, and the last
   * thing it did was move focus to the dialog panel. So: type a letter, lose
   * the caret, type nothing else. Every screen with a dialog had it, which is
   * why it looked like the form was refusing to be typed in.
   *
   * The handler is HELD IN A REF rather than depended on. The listener is
   * installed once per opening and always calls the newest `onClose`, so the
   * identity churn is now irrelevant rather than destructive.
   */
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  /*
   * Focus moves into the panel once, as it opens, and only if it is not
   * already inside. A dialog whose first field carries `autoFocus` has the
   * caret in that field before this runs, and pulling it back out is the same
   * rudeness as the bug above, just once rather than on every keystroke.
   */
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (panel && !panel.contains(document.activeElement)) panel.focus();
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div
        /*
           * A NEUTRAL scrim, not a tinted one.
           *
           * This was `bg-brand-950/45`, which in the reference app was a very dark
           * maroon and read as plain shade. Against this product's green ramp,
           * brand-950 is #022c22 and the whole page behind a drawer took on a
           * visible green cast: which makes the accent look like a state rather
           * than a colour, and tints every product photograph underneath it.
 */
          className="absolute inset-0 bg-[rgba(10,12,16,0.5)] backdrop-blur-[2px] animate-fade-in"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={cn(
          'surface-card relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-hairline shadow-pop outline-none animate-scale-in sm:rounded-2xl',
          SIZE[size],
        )}
      >
        {(title || description || note) && (
          <div className="flex items-start justify-between gap-4 border-b border-hairline px-5 py-4 sm:px-6">
            <div className="min-w-0">
              {title && (
                <div className="flex items-center gap-1.5">
                  <h2 className="text-base font-bold text-primary">{title}</h2>
                  {note && <Hint label="About this">{note}</Hint>}
                </div>
              )}
              {description && <p className="mt-1 text-[13px] text-muted leading-snug">{description}</p>}
            </div>
            <IconButton label="Close" onClick={onClose} className="-mr-1.5 -mt-1">
              <X size={18} />
            </IconButton>
          </div>
        )}
        <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-hairline surface-sunken px-5 py-3.5 sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/* ConfirmDialog */

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  tone = 'primary',
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  tone?: 'primary' | 'danger';
  loading?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-secondary">{message}</p>
    </Modal>
  );
}

/* Toast */

type ToastTone = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}

interface ToastApi {
  push: (tone: ToastTone, title: string, description?: string) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

const TOAST_ICON: Record<ToastTone, ReactNode> = {
  success: <CheckCircle2 size={18} />,
  error: <XCircle size={18} />,
  info: <Info size={18} />,
  warning: <AlertTriangle size={18} />,
};

const TOAST_TONE: Record<ToastTone, string> = {
  success: 'text-[#0a7a0a] dark:text-[#4ec54e]',
  error: 'text-[#a52929] dark:text-[#f08080]',
  info: 'text-[#1c5cab] dark:text-[#7cb1f0]',
  warning: 'text-[#8a6100] dark:text-[#fab219]',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const remove = useCallback((id: number) => {
    setItems((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, title: string, description?: string) => {
      const id = nextId.current++;
      setItems((current) => [...current, { id, tone, title, description }]);
      window.setTimeout(() => remove(id), tone === 'error' ? 7000 : 4500);
    },
    [remove],
  );

  const api = useMemo<ToastApi>(
    () => ({
      push,
      success: (t, d) => push('success', t, d),
      error: (t, d) => push('error', t, d),
      info: (t, d) => push('info', t, d),
      warning: (t, d) => push('warning', t, d),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
          {items.map((toast) => (
            <div
              key={toast.id}
              role="status"
              className="pointer-events-auto flex items-start gap-3 rounded-xl border border-hairline surface-card px-4 py-3 shadow-pop animate-slide-down"
            >
              <span className={cn('mt-0.5 shrink-0', TOAST_TONE[toast.tone])}>{TOAST_ICON[toast.tone]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-primary">{toast.title}</p>
                {toast.description && (
                  <p className="mt-0.5 text-[12px] leading-snug text-muted">{toast.description}</p>
                )}
              </div>
              <IconButton label="Dismiss" onClick={() => remove(toast.id)} className="-mr-1.5 -mt-1 h-7 w-7">
                <X size={14} />
              </IconButton>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

/* Drawer */

export function Drawer({
  open,
  onClose,
  title,
  note,
  children,
  side = 'right',
  width = 'max-w-md',
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  /** Explanation, folded behind the (i) beside the title. See `Modal`. */
  note?: ReactNode;
  children: ReactNode;
  side?: 'left' | 'right';
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div /*
           * A NEUTRAL scrim, not a tinted one.
           *
           * This was `bg-brand-950/45`, which in the reference app was a very dark
           * maroon and read as plain shade. Against this product's green ramp,
           * brand-950 is #022c22 and the whole page behind a drawer took on a
           * visible green cast: which makes the accent look like a state rather
           * than a colour, and tints every product photograph underneath it.
 */
          className="absolute inset-0 bg-[rgba(10,12,16,0.5)] backdrop-blur-[2px] animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'surface-card absolute inset-y-0 flex w-full flex-col border-hairline shadow-pop',
          width,
          side === 'right' ? 'right-0 border-l' : 'left-0 border-r',
        )}
      >
        <div className="flex items-center justify-between gap-4 border-b border-hairline px-5 py-4">
          <div className="flex min-w-0 items-center gap-1.5">
            <h2 className="truncate text-base font-bold text-primary">{title}</h2>
            {note && <Hint label="About this">{note}</Hint>}
          </div>
          <IconButton label="Close" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>
        <div className="scrollbar-thin flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
