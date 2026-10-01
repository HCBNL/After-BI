/**
 * Getting one child's report card out of the school by hand.
 *
 * Most families read the card in the portal or receive it by email. Some will
 * do neither — no working email, no patience for a sign-in — and ask the
 * school to send it on WhatsApp, which is where Nigerian school business is
 * actually done. So the office needs, for any child, in two taps:
 *
 *   PDF         the same file the family would download from the portal, with
 *               the same crest, layout and verification code — one design, in
 *               `src/lib/reportCard.ts`, not a second one for the office.
 *   WhatsApp    on a phone, the share sheet attaches the PDF straight into the
 *               parent's chat. On a computer, the PDF is saved and the
 *               parent's chat opens with a message ready; the office drops the
 *               file in. (No web page may attach a file to WhatsApp itself.)
 *   Preview     the PDF in a new tab, to check before sending.
 *
 * A card that is not published yet can still go — a parent at the gate on
 * results day is a real case — but the office is asked first, because a draft
 * is a sheet the school has not finished deciding. Every send is written to
 * the audit log.
 */

import { useEffect, useRef, useState } from 'react';
import { Download, Eye, MessageCircle, Share2 } from 'lucide-react';
import { Alert, Button, ConfirmDialog, Field, IconButton, Input, Modal, Spinner, Textarea, useToast } from '@/components/ui';
import { useSchool } from '@/context/SchoolContext';
import { getGuardian, } from '@/lib/db';
import { whatsappLink, whatsappNumber } from '@/lib/whatsapp';
import { formatPhone } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { Student, TermResult } from '@/types';

type Pending = 'pdf' | 'open' | 'whatsapp' | null;

/** Can this device hand a PDF to another app? True on most phones, false on most computers. */
function canShareFiles(file?: File): boolean {
  try {
    const probe = file ?? new File([new Blob(['x'])], 'x.pdf', { type: 'application/pdf' });
    return typeof navigator !== 'undefined' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

export function ReportCardActions({
  result,
  student,
  compact = false,
  className,
}: {
  result: TermResult;
  student: Student | null;
  /** Icon-only on small screens, for a row in a list. */
  compact?: boolean;
  className?: string;
}) {
  const { settings } = useSchool();
  const toast = useToast();
  const [busy, setBusy] = useState<Pending>(null);
  const [confirm, setConfirm] = useState<Pending>(null);
  const [sending, setSending] = useState(false);

  const input = { result, student, school: settings };
  const published = result.status === 'published';

  const run = async (what: Exclude<Pending, null>) => {
    if (what === 'whatsapp') {
      setSending(true);
      return;
    }
    setBusy(what);
    try {
      const card = await import('@/lib/reportCard');
      if (what === 'open') {
        await card.openReportCard(input);
        return;
      }
      const outcome = await card.downloadReportCard(input);
      if (outcome.status === 'saved') {
        toast.success('Report card saved', `${result.studentName} · ${result.termName}`);
      } else if (outcome.status === 'declined') toast.info('Download cancelled');
      else toast.warning('Could not save it here', outcome.reason);
    } catch (error) {
      toast.error('Could not build the PDF', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(null);
    }
  };

  /* A draft goes out only after a yes. Previewing needs no permission. */
  const ask = (what: Exclude<Pending, null>) => {
    if (published || what === 'open') void run(what);
    else setConfirm(what);
  };

  const label = (text: string) => (compact ? <span className="hidden sm:inline">{text}</span> : text);

  return (
    <>
      <div className={cn('flex shrink-0 items-center gap-1.5', className)}>
        <IconButton
          label={`Preview ${result.studentName}'s report card`}
          onClick={() => ask('open')}
          disabled={busy !== null}
        >
          {busy === 'open' ? <Spinner size={15} /> : <Eye size={17} />}
        </IconButton>
        <Button
          size="sm"
          variant="outline"
          icon={<Download size={15} />}
          loading={busy === 'pdf'}
          onClick={() => ask('pdf')}
          aria-label={`Save ${result.studentName}'s report card as PDF`}
        >
          {label('PDF')}
        </Button>
        {/*
          Its own element rather than <Button>: the shared variants set the
          background, and WhatsApp's green is what tells the office at a
          glance which button sends to a parent.
        */}
        <button
          type="button"
          onClick={() => ask('whatsapp')}
          aria-label={`Send ${result.studentName}'s report card on WhatsApp`}
          className="inline-flex h-9 select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#1f8f4e] px-3 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-[#1a7a43] active:scale-[0.98]"
        >
          <MessageCircle size={15} />
          {label('WhatsApp')}
        </button>
      </div>

      <ConfirmDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title="This report card is not published yet"
        message={`${result.studentName}'s ${result.termName} card is still ${result.status}. Families cannot see it in the portal. Send it anyway?`}
        confirmLabel="Send anyway"
        onConfirm={() => {
          const what = confirm;
          setConfirm(null);
          if (what) void run(what);
        }}
      />

      {sending && <SendOnWhatsApp result={result} student={student} onClose={() => setSending(false)} />}
    </>
  );
}

/* ------------------------------------------------------------ WhatsApp */

function SendOnWhatsApp({
  result,
  student,
  onClose,
}: {
  result: TermResult;
  student: Student | null;
  onClose: () => void;
}) {
  const { settings } = useSchool();
  const toast = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [guardianName, setGuardianName] = useState(student?.guardianName ?? '');
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState(false);
  const recorded = useRef(false);

  /*
   * The PDF and the parent's number are fetched as the dialog opens, not when
   * a button is pressed. A phone only lets a page open the share sheet
   * straight after a tap; building a PDF first would use that moment up and
   * the share would be refused.
   */
  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const [card, guardian] = await Promise.all([
          import('@/lib/reportCard'),
          getGuardian(result.studentId).catch(() => null),
        ]);
        const built = await card.reportCardFile({ result, student, school: settings });
        if (!live) return;
        const name = guardian?.guardianName || student?.guardianName || '';
        setFile(built);
        setGuardianName(name);
        setPhone(guardian?.guardianPhone ?? '');
        setMessage(
          `Good day${name ? ` ${name}` : ''}. Please find attached ${result.studentName}'s report card for ${result.termName}, ${result.sessionName}, from ${settings.name}.`,
        );
      } catch (error) {
        if (live) setProblem(error instanceof Error ? error.message : 'Could not build the PDF.');
      }
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.id]);

  const note = (_how: 'shared' | 'whatsapp') => {
    if (recorded.current) return;
    recorded.current = true;
  };

  const number = whatsappNumber(phone);
  const shareable = file ? canShareFiles(file) : false;

  const share = async () => {
    if (!file) return;
    try {
      await navigator.share({ files: [file], text: message, title: file.name });
      note('shared');
      toast.success('Shared', 'Check it arrived in the right chat.');
      onClose();
    } catch (error) {
      // Closing the share sheet is not a failure.
      if (error instanceof DOMException && error.name === 'AbortError') return;
      toast.error('Could not share', error instanceof Error ? error.message : 'Save the PDF instead.');
    }
  };

  const save = async () => {
    if (!file) return;
    const { saveFile } = await import('@/lib/download');
    const outcome = await saveFile(file.name, file);
    if (outcome.status === 'saved') setSaved(true);
    else if (outcome.status === 'unsupported') toast.warning('Could not save it here', outcome.reason);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Send on WhatsApp"
      description={`${result.studentName} · ${result.termName} ${result.sessionName}`}
      footer={
        <Button variant="ghost" onClick={onClose}>
          Done
        </Button>
      }
    >
      {problem ? (
        <Alert tone="critical">{problem}</Alert>
      ) : !file ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted">
          <Spinner /> Preparing the report card…
        </div>
      ) : (
        <div className="space-y-4">
          <Field
            label="Parent’s WhatsApp number"
            hint={guardianName || undefined}
            error={phone.trim() && !number ? 'That does not look like a phone number.' : undefined}
          >
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              placeholder="0803 123 4567"
            />
          </Field>
          {!phone.trim() && (
            <p className="-mt-2 text-[12.5px] text-muted">
              No number on file for this family. Type one, or open WhatsApp and choose the chat yourself.
            </p>
          )}

          <Field label="Message">
            <Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
          </Field>

          {shareable && (
            <Button full icon={<Share2 size={16} />} onClick={() => void share()}>
              Share the PDF…
            </Button>
          )}

          <div className="rounded-xl border border-hairline p-3.5">
            <p className="text-[13px] font-semibold text-primary">
              {shareable ? 'Or from a computer' : 'Two steps'}
            </p>
            <ol className="mt-2 space-y-2.5 text-[13px] text-secondary">
              <li className="flex items-center justify-between gap-3">
                <span>
                  1. Save the PDF{saved && <span className="font-semibold text-status-good"> · saved</span>}
                </span>
                <Button size="sm" variant="outline" icon={<Download size={14} />} onClick={() => void save()}>
                  Save PDF
                </Button>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span>2. Open the chat and attach the file (📎 → Document)</span>
                <a
                  href={whatsappLink(number, message)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => note('whatsapp')}
                  className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl bg-[#1f8f4e] px-3 text-[13px] font-semibold text-white hover:bg-[#1a7a43]"
                >
                  <MessageCircle size={14} /> Open chat
                </a>
              </li>
            </ol>
            {number && (
              <p className="mt-2 text-[12px] text-muted">Opens a chat with {formatPhone(phone)}.</p>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
