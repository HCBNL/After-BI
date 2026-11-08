/**
 * The help bubble, bottom right: answers first, a person last.
 *
 * WHAT THIS REPLACED, AND WHY
 *
 * A single orange circle that went straight to WhatsApp. Two things were
 * wrong with it. The colour was the accent, so the loudest thing on every
 * public page was a utility that floats over the content rather than the
 * button the page is actually asking you to press; and the only thing it
 * could do was start a conversation, so "what does it cost" became a message
 * somebody had to be awake to answer, at whatever hour it arrived.
 *
 * Now it opens a card. Seven questions with their answers already in them,
 * each one carrying the link that finishes the job, and underneath them a box
 * to type in. Talking to a person is still there, at the bottom, where it
 * belongs: it is the most expensive way to answer a question, for us and for
 * the visitor, so it is the last resort rather than the only one. Whatever
 * they typed travels with them into WhatsApp, along with the page they were
 * on, so nobody has to say it twice.
 *
 * HOW IT OPENS
 *
 * Hover opens it on a mouse, the way the Support menu in the header does, and
 * a tap opens it on a phone, which has no hover. But hover must not also
 * *close* it: somebody halfway through typing a question whose pointer
 * strayed two pixels off the card would lose what they had written. So the
 * first real interaction, opening a question or touching the box, pins it
 * open, and from then on only the close button, Escape or a click outside
 * will shut it.
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, MessageCircle, Send, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { WHATSAPP_URL } from '@/lib/site';
import { HELP_TOPICS, helpWhatsApp } from '@/lib/help';

/** How long the pointer may be off the card before it closes, in ms. */
const CLOSE_DELAY = 220;

export function HelpBubble({ onBook }: { onBook: () => void }) {
  const [open, setOpen] = useState(false);
  /** Set by the first real interaction: from here on, hover cannot close it. */
  const [pinned, setPinned] = useState(false);
  const [asked, setAsked] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const { pathname } = useLocation();
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);

  const close = useCallback(() => {
    window.clearTimeout(closeTimer.current);
    setOpen(false);
    setPinned(false);
    setAsked(null);
  }, []);

  /* A new page closes it: the answer they clicked is the page they are now on. */
  useEffect(() => {
    close();
  }, [pathname, close]);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  /* Escape, and a click anywhere else, both close a pinned card. */
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    const onDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) close();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open, close]);

  const openNow = () => {
    window.clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const closeSoon = () => {
    if (pinned) return;
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), CLOSE_DELAY);
  };

  /** Any real interaction pins the card: hovering away must not undo work. */
  const pin = () => {
    window.clearTimeout(closeTimer.current);
    setPinned(true);
  };

  const ask = (index: number) => {
    pin();
    setAsked((current) => (current === index ? null : index));
  };

  const toPerson = `${WHATSAPP_URL}?text=${encodeURIComponent(helpWhatsApp(message, pathname))}`;

  return (
    <div
      ref={root}
      className="fixed bottom-5 right-5 z-40 flex flex-col items-end sm:bottom-7 sm:right-7"
      style={{ bottom: 'calc(1.25rem + var(--safe-bottom))' }}
      onMouseEnter={openNow}
      onMouseLeave={closeSoon}
    >
      {open && (
        <Card
          id={panelId}
          asked={asked}
          onAsk={ask}
          message={message}
          onMessage={(value) => {
            pin();
            setMessage(value);
          }}
          boxRef={box}
          onPin={pin}
          onBook={() => {
            close();
            onBook();
          }}
          onClose={close}
          toPerson={toPerson}
        />
      )}

      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={open ? 'Close help' : 'Help and answers'}
        onClick={() => {
          if (open && pinned) return close();
          /*
           * Deliberately no auto-focus on the box.
           *
           * It is the obvious thing to do and it is wrong here: focusing the
           * textarea scrolls the answers out of view, and on a phone it
           * throws the keyboard up over them, so the one card built to
           * answer the question first opens on the slowest way to ask it.
           * The box is two inches away when they want it.
           */
          openNow();
          pin();
        }}
        className={cn(
          'tap inline-flex h-13 w-13 items-center justify-center rounded-full shadow-pop transition-all',
          'bg-navy-900 text-white hover:bg-navy-800 active:scale-95',
          'ring-1 ring-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
        )}
      >
        {open ? <X size={21} aria-hidden /> : <MessageCircle size={22} aria-hidden />}
      </button>
    </div>
  );
}

/* ----------------------------------------------------------------- the card */

function Card({
  id,
  asked,
  onAsk,
  message,
  onMessage,
  boxRef,
  onPin,
  onBook,
  onClose,
  toPerson,
}: {
  id: string;
  asked: number | null;
  onAsk: (index: number) => void;
  message: string;
  onMessage: (value: string) => void;
  boxRef: React.RefObject<HTMLTextAreaElement | null>;
  onPin: () => void;
  onBook: () => void;
  onClose: () => void;
  toPerson: string;
}) {
  return (
    <div
      id={id}
      role="dialog"
      aria-label="Help and answers"
      className={cn(
        'mb-3 flex max-h-[min(37rem,calc(100dvh-7rem))] w-[min(23rem,calc(100vw-2.5rem))] flex-col',
        'overflow-hidden rounded-[1.4rem] bg-white shadow-pop ring-1 ring-navy-900/10',
        'origin-bottom-right animate-scale-in',
      )}
    >
      {/* ---------------------------------------------------------- header */}
      {/*
        The header is the structure colour, not the accent. A help card is a
        utility: it should read as part of the furniture, which is what makes
        the one accent button further down the page still the brightest thing
        on screen while this is open.
      */}
      <header className="relative shrink-0 bg-navy-900 px-5 pb-4 pt-4 text-white">
        <p className="font-display text-[1.05rem] font-extrabold tracking-[-0.02em]">How can we help?</p>
        <p className="mt-1 pr-7 text-[13px] leading-snug text-white/70">Answers first. A person if you need one.</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close help"
          className="tap absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X size={16} aria-hidden />
        </button>
      </header>

      {/* --------------------------------------------------------- answers */}
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <ul className="divide-y divide-navy-900/8">
          {HELP_TOPICS.map((topic, index) => {
            const isOpen = asked === index;
            return (
              <li key={topic.q}>
                <h3>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => onAsk(index)}
                    className={cn(
                      'tap flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors',
                      'text-[14.5px] font-semibold leading-snug text-navy-900 hover:bg-navy-50',
                      isOpen && 'bg-navy-50',
                    )}
                  >
                    {topic.q}
                    <ChevronDown
                      size={16}
                      aria-hidden
                      className={cn('shrink-0 text-navy-400 transition-transform duration-200', isOpen && 'rotate-180 text-navy-900')}
                    />
                  </button>
                </h3>
                {isOpen && (
                  <div className="bg-navy-50 px-5 pb-4">
                    <p className="text-[13.5px] leading-[1.6] text-navy-700">{topic.a}</p>
                    {topic.book ? (
                      <button
                        type="button"
                        onClick={onBook}
                        className="mt-2.5 inline-flex items-center gap-1.5 text-[13.5px] font-bold text-navy-900 underline decoration-navy-900/30 underline-offset-4 hover:decoration-navy-900"
                      >
                        {topic.cta ?? 'Book a demo'} <ArrowRight size={14} aria-hidden />
                      </button>
                    ) : topic.to ? (
                      <Link
                        to={topic.to}
                        className="mt-2.5 inline-flex items-center gap-1.5 text-[13.5px] font-bold text-navy-900 underline decoration-navy-900/30 underline-offset-4 hover:decoration-navy-900"
                      >
                        {topic.cta ?? 'Read more'} <ArrowRight size={14} aria-hidden />
                      </Link>
                    ) : null}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* ---------------------------------------------------- talk to a person */}
      {/*
        The last resort, and the only accent in the card.
        What they typed goes with them: `toPerson` already carries the message
        and the page they were on, so the conversation opens with the question
        instead of with "hello".
      */}
      <footer className="shrink-0 border-t border-navy-900/10 bg-white p-3">
        <label htmlFor={`${id}-msg`} className="sr-only">
          Your question
        </label>
        <textarea
          id={`${id}-msg`}
          ref={boxRef}
          rows={2}
          value={message}
          onFocus={onPin}
          onChange={(event) => onMessage(event.target.value)}
          placeholder="Not here? Type your question…"
          className={cn(
            'w-full resize-none rounded-xl border border-navy-900/12 bg-white px-3.5 py-2.5',
            'text-[14px] leading-snug text-navy-900 outline-none transition-colors',
            'placeholder:text-navy-400 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/25',
          )}
        />
        <a
          href={toPerson}
          target="_blank"
          rel="noreferrer noopener"
          className={cn(
            'tap mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl',
            'bg-brand-500 text-[14.5px] font-bold text-navy-900 ring-1 ring-navy-900/20 transition-colors hover:bg-brand-600 active:scale-[0.99]',
          )}
        >
          {message.trim() ? (
            <>
              Send to an agent <Send size={15} aria-hidden />
            </>
          ) : (
            <>
              Talk to an agent <ArrowRight size={15} aria-hidden />
            </>
          )}
        </a>
        <p className="mt-1.5 text-center text-[11.5px] text-navy-400">Opens WhatsApp · we reply within a working day</p>
      </footer>
    </div>
  );
}
