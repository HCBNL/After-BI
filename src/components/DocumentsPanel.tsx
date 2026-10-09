/**
 * A child's papers — birth certificate, immunisation card, admission letter.
 *
 * WHO SEES THIS, AND WHY
 *
 * The office and the family. Not teachers: a birth certificate carries a full
 * name, a date of birth and often a state of origin, and a teacher must be able
 * to read every child they teach — which is precisely the reason this has to
 * stay out of that reach. `firestore.rules` enforces it; this component is only
 * the courtesy.
 *
 * WHY A PARENT CAN UPLOAD
 *
 * The same argument that already won for the photograph. The family is the one
 * holding the birth certificate, and an office chasing forty of them by phone
 * is the work this product exists to remove. What a parent uploads is marked
 * `family` and they may remove it again; what the office issues is marked
 * `school` and only the office may remove that. Neither is decided by this
 * component — `addDocument` sets it from the signed-in role, so a parent cannot
 * file something as school-issued.
 */

import { useRef, useState } from 'react';
import { Download, FileText, Image as ImageIcon, Trash2, Upload } from 'lucide-react';
import { Badge, Button, Card, ConfirmDialog, EmptyState, Input, useToast } from '@/components/ui';
import { Loading } from '@/components/brand/Loader';
import { useAsync } from '@/hooks/useAsync';
import { addDocument, deleteDocument, listDocuments } from '@/lib/db';
import { uploadDocument, MAX_DOCUMENT_BYTES } from '@/lib/cloudinary';
import { formatDate } from '@/lib/format';
import type { StudentDocument, UserProfile } from '@/types';

/** Bytes, in the units a person reads. */
function fileSize(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`;
  if (bytes < 1_000_000) return `${Math.round(bytes / 1000)} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

export function DocumentsPanel({
  studentId,
  user,
  studentName,
}: {
  studentId: string;
  user: UserProfile | null;
  studentName: string;
}) {
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<StudentDocument | null>(null);

  const { data, loading, reload } = useAsync(
    async () => (studentId ? listDocuments(studentId) : []),
    [studentId],
    { handleError: true },
  );

  const rows = data ?? [];
  const isOffice = user ? user.role !== 'pg' && user.role !== 'teacher' : false;

  /** Can this person remove this document? Mirrors the security rule exactly. */
  const mayRemove = (row: StudentDocument) => isOffice || row.origin === 'family';

  async function onFile(file: File | undefined) {
    if (!file || !user) return;
    setBusy(true);
    try {
      const { url, mime } = await uploadDocument(file);
      await addDocument(
        {
          studentId,
          /*
           * The file's own name when nothing was typed. A parent photographing
           * a certificate on a phone gets "IMG_0912.HEIC", which is useless —
           * but it is better than "Untitled", and the title box above is right
           * there to fix it before they choose the file.
           */
          title: title.trim() || file.name.replace(/\.[^.]+$/, ''),
          url,
          mime,
          sizeBytes: file.size,
        },
        user,
      );
      setTitle('');
      toast.success('Document added', studentName);
      reload();
    } catch (error) {
      toast.error(
        'Could not add that file',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setBusy(false);
      // Clear the input so choosing the SAME file twice still fires a change.
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  return (
    <>
      <Card>
        {user && (
          <div className="mb-5 flex flex-col gap-2.5 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label
                htmlFor="doc-title"
                className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted"
              >
                What is it?
              </label>
              <Input
                id="doc-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Birth certificate"
              />
            </div>

            <Button
              icon={<Upload size={16} />}
              loading={busy}
              onClick={() => fileInput.current?.click()}
            >
              Add a file
            </Button>

            <input
              ref={fileInput}
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/webp,image/heic"
              className="hidden"
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
          </div>
        )}

        {loading ? (
          <Loading label="Fetching the file" variant="text" />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<FileText size={22} />}
            title="Nothing on file yet"
            description={
              isOffice
                ? 'Birth certificate, immunisation card, the last school’s report — whatever this child’s file should hold.'
                : 'Add your child’s birth certificate or immunisation card here, so the office is not asking for it later.'
            }
          />
        ) : (
          <ul className="divide-y divide-[var(--border-hairline)]">
            {rows.map((row) => {
              const isPdf = row.mime === 'application/pdf';
              return (
                <li key={row.id} className="flex items-center gap-3 py-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl surface-sunken text-muted">
                    {isPdf ? <FileText size={18} /> : <ImageIcon size={18} />}
                  </span>

                  {/*
                    On a phone the badge and two icon buttons left about 40% of
                    the row for the title, which truncated "Birth certificate"
                    to "Birth ce…" and wrapped the line under it to three. The
                    badge is a word, so below `sm` it becomes one — inside the
                    metadata line, where it costs nothing.
                  */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-bold text-primary">{row.title}</p>
                    <p className="truncate text-[11.5px] text-muted">
                      <span className="sm:hidden">
                        {row.origin === 'school' ? 'School' : 'Family'} ·{' '}
                      </span>
                      {formatDate(row.uploadedAt)} · {fileSize(row.sizeBytes)}
                      <span className="hidden sm:inline"> · {row.uploadedByName}</span>
                    </p>
                  </div>

                  <Badge
                    /*
                     * `!` because `Badge` sets `inline-flex` in its own base
                     * string, and Tailwind emits display utilities in a fixed
                     * order where `inline-flex` lands after `hidden` — so the
                     * plain class lost and the badge stayed on screen. Third
                     * time this pattern has bitten in this codebase.
                     */
                    className="!hidden sm:!inline-flex"
                    tone={row.origin === 'school' ? 'info' : 'neutral'}
                  >
                    {row.origin === 'school' ? 'School' : 'Family'}
                  </Badge>

                  <a
                    href={row.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open ${row.title}`}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-[var(--surface-sunken)] hover:text-primary"
                  >
                    <Download size={16} />
                  </a>

                  {mayRemove(row) && user && (
                    <button
                      type="button"
                      onClick={() => setRemoving(row)}
                      aria-label={`Remove ${row.title}`}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-[var(--surface-sunken)] hover:text-[#b3261e]"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-4 text-[11.5px] text-muted">
          PDF or photo, up to {Math.round(MAX_DOCUMENT_BYTES / 1_000_000)} MB
        </p>
      </Card>

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        onConfirm={async () => {
          if (!removing || !user) return;
          try {
            await deleteDocument(removing, user);
            toast.success('Removed', removing.title);
            setRemoving(null);
            reload();
          } catch (error) {
            toast.error(
              'Could not remove that',
              error instanceof Error ? error.message : 'Please try again.',
            );
          }
        }}
        title="Remove this document?"
        message={`${removing?.title ?? ''} will no longer appear on this child's record. The file itself is not recoverable from here.`}
        confirmLabel="Remove"
        tone="danger"
      />
    </>
  );
}
