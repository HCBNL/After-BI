/**
 * Writing a notice, in one dialog.
 *
 * FOUR DECISIONS, AND ONLY FOUR
 *
 * What it says, who it is for, whether it is urgent, and when it stops being
 * shown. Everything a messaging product would add next — scheduling, per-person
 * recipients, attachments, delivery reports — is what turns a two-minute job
 * into one the office avoids, and the office avoiding it means the notice goes
 * out on WhatsApp instead and there is no record. So: a title, a body, an
 * audience, and two optional switches.
 *
 * The class list is offered only once an audience narrower than the whole
 * school makes it meaningful, and leaving it empty is the common case.
 */

import { useEffect, useMemo, useState } from 'react';
import { Send } from 'lucide-react';
import {
  Button,
  Field,
  Input,
  Modal,
  Select,
  Switch,
  useToast,
} from '@/components/ui';
import { MarkdownEditor } from '@/components/MarkdownEditor';
import { useAuth } from '@/context/AuthContext';
import { useSchool } from '@/context/SchoolContext';
import { classLabel } from '@/lib/classLabel';
import { cn } from '@/lib/cn';
import {
  AUDIENCE_LABEL,
  TONE_LABEL,
  saveAnnouncement,
  type Announcement,
  type Audience,
  type AnnouncementTone,
} from '@/lib/announcements';
import { invalidateAnnouncements } from '@/hooks/useAnnouncements';

const AUDIENCES: Audience[] = ['all', 'parents', 'teachers'];
const TONES: AnnouncementTone[] = ['notice', 'urgent', 'event'];

export function ComposeNotice({
  open,
  onClose,
  editing,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  /** Passed when correcting one already posted; absent when writing a new one. */
  editing?: Announcement | null;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const { classes } = useSchool();
  const toast = useToast();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<Audience>('all');
  const [tone, setTone] = useState<AnnouncementTone>('notice');
  const [classIds, setClassIds] = useState<string[]>([]);
  const [pinned, setPinned] = useState(false);
  const [endsAt, setEndsAt] = useState('');
  const [saving, setSaving] = useState(false);

  /*
   * Reloaded from `editing` every time the dialog opens.
   *
   * Not `useState(editing?.title)` — that only reads on first mount, so the
   * second notice somebody edited would open showing the first one's text.
   */
  useEffect(() => {
    if (!open) return;
    setTitle(editing?.title ?? '');
    setBody(editing?.body ?? '');
    setAudience(editing?.audience ?? 'all');
    setTone(editing?.tone ?? 'notice');
    setClassIds(editing?.classIds ?? []);
    setPinned(Boolean(editing?.pinned));
    setEndsAt(editing?.endsAt ?? '');
    setSaving(false);
  }, [open, editing]);

  const ordered = useMemo(
    () => [...classes].sort((a, b) => a.levelOrder - b.levelOrder),
    [classes],
  );

  const who = useMemo(() => {
    const base = AUDIENCE_LABEL[audience];
    if (!classIds.length) return base;
    const names = ordered.filter((c) => classIds.includes(c.id)).map((c) => classLabel(c));
    return `${base}, in ${names.join(', ')}`;
  }, [audience, classIds, ordered]);

  const toggleClass = (id: string) =>
    setClassIds((current) =>
      current.includes(id) ? current.filter((c) => c !== id) : [...current, id],
    );

  async function post() {
    if (!user) return;
    if (!title.trim()) {
      toast.error('Give the notice a title — it is the line everybody reads first.');
      return;
    }

    setSaving(true);
    try {
      await saveAnnouncement(
        { id: editing?.id, title, body, audience, classIds, tone, pinned, endsAt },
        user,
      );
      /* The board has changed, so the cached copy the bell and the notices
         screen share has to go. */
      invalidateAnnouncements();
      toast.success(editing ? 'Notice updated.' : 'Notice posted to the school.');
      onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The notice could not be posted.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={editing ? 'Edit notice' : 'Write a notice'}
      description={
        editing
          ? 'Corrections keep the original date, so the board still shows when it first went out.'
          : 'It appears on the notice board of everybody it is addressed to, and on their bell, the moment you post it.'
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button icon={<Send size={16} />} onClick={post} loading={saving}>
            {editing ? 'Save changes' : 'Post to school'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Title" required hint="One line. This is what shows on the board and the bell.">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="PTA meeting — Saturday 14th, 10am"
            maxLength={120}
          />
        </Field>

        <Field
          label="The notice"
          hint="Dates, times, where to be. Bold and lists are available above the box."
        >
          <MarkdownEditor
            value={body}
            onChange={setBody}
            rows={7}
            placeholder={
              'The termly PTA meeting holds on Saturday the 14th at 10am in the school hall.\n\nPlease come with your child\u2019s report card.'
            }
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Who gets it">
            <Select value={audience} onChange={(e) => setAudience(e.target.value as Audience)}>
              {AUDIENCES.map((value) => (
                <option key={value} value={value}>
                  {AUDIENCE_LABEL[value]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Kind">
            <Select value={tone} onChange={(e) => setTone(e.target.value as AnnouncementTone)}>
              {TONES.map((value) => (
                <option key={value} value={value}>
                  {TONE_LABEL[value]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {/*
          Classes, folded into a quiet row of toggles rather than a second
          dropdown. This is the one place a multiple choice is genuinely
          multiple — "JSS 1 and JSS 2 parents" is a real thing an office
          sends — and a multi-select is the one native control that is worse
          on a phone than anything we could draw. Nothing chosen means the
          whole school, which is what most notices are.
        */}
        <Field
          label="Only certain classes"
          hint="Leave all of these off to send it to the whole school."
        >
          <div className="flex flex-wrap gap-1.5">
            {ordered.map((cls) => {
              const on = classIds.includes(cls.id);
              return (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => toggleClass(cls.id)}
                  aria-pressed={on}
                  className={cn(
                    'min-h-9 rounded-lg border px-3 text-[12.5px] font-semibold transition-colors',
                    on
                      ? 'border-brand-900 bg-brand-900 text-white dark:border-brand-500 dark:bg-brand-500 dark:text-brand-950'
                      : 'border-hairline text-secondary hover:bg-[var(--surface-sunken)] hover:text-primary',
                  )}
                >
                  {classLabel(cls)}
                </button>
              );
            })}
          </div>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Stop showing it after"
            hint="Optional. A meeting notice should go once the meeting has happened."
          >
            <Input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </Field>

          <div className="flex items-end pb-1">
            <Switch checked={pinned} onChange={setPinned} label="Hold it at the top of the board" />
          </div>
        </div>

        <p className="rounded-xl border border-hairline surface-sunken px-3.5 py-2.5 text-[12.5px] leading-relaxed text-secondary">
          Going to: <span className="font-bold text-primary">{who}</span>
        </p>
      </div>
    </Modal>
  );
}
