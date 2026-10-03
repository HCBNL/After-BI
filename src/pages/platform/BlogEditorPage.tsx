/**
 * Writing the blog.
 *
 * A list, and a form. There is no scheduling, no categories, no tags, no
 * authors table and no revision history, and every one of those was considered
 * and left out: a blog that publishes once a fortnight does not need a content
 * management system, it needs somewhere to type.
 *
 * WHAT A DRAFT ACTUALLY IS
 *
 * Not a flag the page respects. `firestore.rules` refuses a document whose
 * `status` is not `published` to everybody but this account, so an unfinished
 * article cannot be read by guessing its address, and `/blog/{slug}` answers
 * "not here" rather than "not yours".
 *
 * THE ADDRESS IS THE TITLE
 *
 * The slug is the document id, so `/blog/why-scratch-cards-fail` is one read
 * with no query and no index behind it. It is generated from the title while
 * the title is being typed, and frozen the moment the article is first saved , 
 * changing it afterwards would break every link already sent out, so the field
 * goes read-only rather than offering a rename that quietly 404s.
 */

import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, FileText, Film, Plus, Save, Trash2, Upload } from 'lucide-react';
import { ImagePicker } from '@/components/ImagePicker';
import { GalleryManager } from '@/components/GalleryManager';
import { VideoBlock } from '@/components/VideoBlock';
import { MarkdownEditor } from '@/components/MarkdownEditor';
import { Prose } from '@/components/Prose';
import {
  Alert,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  SegmentedControl,
  Spinner,
  Textarea,
  useToast,
  HintFooter,
} from '@/components/ui';
import { Loading } from '@/components/brand/Loader';
import { useAsync } from '@/hooks/useAsync';
import { cloudinaryConfigured, uploadVideo } from '@/lib/cloudinary';
import {
  deletePost,
  listAllPosts,
  postDate,
  POST_CATEGORIES,
  readingTime,
  savePost,
  slugifyTitle,
  type Post,
  type PostStatus,
} from '@/lib/blog';
import { parseVideo } from '@/lib/video';
import { PageHeader } from '@/components/layout/PageHeader';
import { FOUNDER } from '@/lib/site';

const BLANK: Post = {
  id: '',
  title: '',
  excerpt: '',
  cover: '',
  body: '',
  status: 'draft',
  publishedAt: new Date().toISOString().slice(0, 10),
  author: FOUNDER.name,
  category: 'News',
  gallery: [],
  video: '',
};

export default function BlogEditorPage() {
  const toast = useToast();
  const { data, loading, error: loadError, reload } = useAsync(listAllPosts, [], { handleError: true });

  const [editing, setEditing] = useState<Post | null>(null);
  /** Empty for a new article; set for one that already exists and cannot be renamed. */
  const [existingId, setExistingId] = useState('');
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Post | null>(null);

  const posts = useMemo(() => data ?? [], [data]);

  const open = (post: Post) => {
    setEditing(post);
    setExistingId(post.id);
    setTab('write');
    setError(null);
  };

  const start = () => {
    setEditing({ ...BLANK });
    setExistingId('');
    setTab('write');
    setError(null);
  };

  const save = async (status?: PostStatus) => {
    if (!editing) return;
    const next: Post = {
      ...editing,
      status: status ?? editing.status,
      id: existingId || slugifyTitle(editing.title),
    };

    if (!next.title.trim()) {
      setError('Give it a title. The address is made from it.');
      return;
    }
    if (!next.id) {
      setError('That title has no letters or digits in it, so there is no address to give the article.');
      return;
    }
    if (!existingId && posts.some((p) => p.id === next.id)) {
      setError(`An article already lives at /blog/${next.id}. Change the title a little.`);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const saved = await savePost(next);
      setEditing(saved);
      setExistingId(saved.id);
      reload();
      toast.success(
        saved.status === 'published' ? 'Published' : 'Saved as a draft',
        saved.status === 'published' ? `Live at /blog/${saved.id}` : 'Only you can read it.',
      );
    } catch (err) {
      setError(
        err instanceof Error && /permission/i.test(err.message)
          ? 'Firestore refused that write. The rules in the console are older than this build. Publish the current firestore.rules.'
          : 'Could not save that. Check the connection and try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  const confirmRemove = async () => {
    if (!removing) return;
    setBusy(true);
    try {
      await deletePost(removing.id);
      if (existingId === removing.id) setEditing(null);
      setRemoving(null);
      reload();
      toast.success('Deleted', `/blog/${removing.id} is gone.`);
    } catch {
      toast.error('Could not delete it', 'Check the connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  /* =============================================================== the list */

  if (!editing) {
    if (loading && !data) return <Loading label="Fetching the articles" rows={3} />;

    return (
      <div className="space-y-5">
        <PageHeader
          title="Blog"
          description="Articles on the public blog. A draft is readable by nobody but you."
          actions={
            <Button size="sm" icon={<Plus size={15} />} onClick={start}>
              New article
            </Button>
          }
        />
        {/*
          Said out loud rather than shown as an empty list. Until the current
          `firestore.rules` are published, reading `posts` is refused, and an
          empty state reading "nothing written yet" would send you looking for
          the bug in the wrong place entirely.
        */}
        {loadError && (
          <Alert tone="critical" title="Could not read the blog">
            {/permission/i.test(loadError.message)
              ? 'Firestore refused it. The rules in the console are older than this build, and the blog is new. Publish the current firestore.rules and reload.'
              : 'Check the connection and reload.'}
          </Alert>
        )}

        {loadError ? null : posts.length === 0 ? (
          <EmptyState
            icon={<FileText size={22} />}
            title="Nothing written yet"
            description="An article shows on the front page as soon as it is published, and the blog link only appears once there is one to read."
            action={<Button icon={<Plus size={16} />} onClick={start}>Write the first one</Button>}
          />
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <Card key={post.id} className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <button onClick={() => open(post)} className="min-w-0 flex-1 text-left">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[15.5px] font-bold text-primary">{post.title}</h3>
                      <Badge tone={post.status === 'published' ? 'good' : 'info'}>
                        {post.status === 'published' ? 'Live' : 'Draft'}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate font-mono text-[12px] text-muted">/blog/{post.id}</p>
                    <p className="mt-1.5 text-[12.5px] text-secondary">
                      {[postDate(post.publishedAt), readingTime(post.body)].filter(Boolean).join(' · ')}
                    </p>
                  </button>

                  <div className="flex shrink-0 items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={() => open(post)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Trash2 size={14} />}
                      onClick={() => setRemoving(post)}
                    >
                      <span className="sr-only">Delete {post.title}</span>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <ConfirmDialog
          open={Boolean(removing)}
          onClose={() => setRemoving(null)}
          onConfirm={() => void confirmRemove()}
          title="Delete this article?"
          tone="danger"
          confirmLabel="Delete it"
          loading={busy}
          message={
            <>
              <strong>{removing?.title}</strong> goes for good, and anybody holding a link to{' '}
              <span className="font-mono text-[12.5px]">/blog/{removing?.id}</span> gets a page saying it is
              not there. There is no undo.
            </>
          }
        />
      </div>
    );
  }

  /* ============================================================= the writer */

  const slug = existingId || slugifyTitle(editing.title);

  return (
    <div className="space-y-5">
      <PageHeader title={existingId ? 'Edit article' : 'New article'} description={slug ? `/blog/${slug}` : 'The address is made from the title.'} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" icon={<ArrowLeft size={15} />} onClick={() => setEditing(null)}>
          All articles
        </Button>

        <div className="flex items-center gap-2">
          <Button variant="secondary" loading={busy} onClick={() => void save('draft')}>
            Save as a draft
          </Button>
          <Button icon={<Save size={16} />} loading={busy} onClick={() => void save('published')}>
            {editing.status === 'published' ? 'Save and keep it live' : 'Publish'}
          </Button>
        </div>
      </div>

      {error && <Alert tone="critical" title="Not saved">{error}</Alert>}

      <Card>
        <div className="space-y-4">
          <Field label="Title" required>
            <Input
              value={editing.title}
              maxLength={140}
              onChange={(event) => setEditing({ ...editing, title: event.target.value })}
              placeholder="Why sell-in is the wrong number to celebrate"
            />
          </Field>

          <Field
            label="Address"
            hint={
              existingId
                ? 'Fixed once the article has been saved. Changing it would break every link already sent out.'
                : 'Made from the title. It is fixed the first time you save.'
            }
          >
            <Input value={slug ? `/blog/${slug}` : ''} readOnly disabled className="font-mono text-[12.5px]" />
          </Field>

          <Field label="The line under the title" hint="One or two sentences. Shown on the card and on shared links.">
            <Textarea
              rows={2}
              maxLength={320}
              value={editing.excerpt}
              onChange={(event) => setEditing({ ...editing, excerpt: event.target.value })}
              placeholder="A carton in a depot has been counted as a sale and sold to nobody."
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Category" hint="A badge on the card, and how the blog groups articles.">
              <Input
                value={editing.category}
                maxLength={40}
                list="post-categories"
                onChange={(event) => setEditing({ ...editing, category: event.target.value })}
                placeholder="News"
              />
              <datalist id="post-categories">
                {POST_CATEGORIES.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </Field>
            <Field label="Date on the article">
              <Input
                type="date"
                value={editing.publishedAt.slice(0, 10)}
                onChange={(event) => setEditing({ ...editing, publishedAt: event.target.value })}
              />
            </Field>
            <Field label="Written by">
              <Input
                value={editing.author}
                maxLength={80}
                onChange={(event) => setEditing({ ...editing, author: event.target.value })}
              />
            </Field>
          </div>

          <ImagePicker
            label="Cover picture"
            value={editing.cover}
            onChange={(url) => setEditing({ ...editing, cover: url })}
            kind="site"
            size={224}
            height={126}
            hint="16:9. 1600 × 900. Used on the card, at the top of the article and on shared links."
          />
        </div>
      </Card>

      {/* ------------------------------------------- the foot of the article */}
      <Card>
        <h3 className="text-[15px] font-bold text-primary">The foot of the article</h3>
        <HintFooter>
          What comes after the words. A picture carousel, a video, or both. This is separate from the cover at the top, and either can be left empty.
        </HintFooter>

        <div className="mt-5 space-y-6">
          <div>
            <p className="mb-2 text-[11.5px] font-bold uppercase tracking-[0.1em] text-muted">
              Picture carousel
            </p>
            <HintFooter>
              Shown as a swipeable strip under the article. Drag with the arrows to set the order; the number on each is where it will sit.
            </HintFooter>
            <GalleryManager
              value={editing.gallery}
              onChange={(gallery) => setEditing({ ...editing, gallery })}
            />
          </div>

          <VideoField value={editing.video ?? ''} onChange={(video) => setEditing({ ...editing, video })} />
        </div>
      </Card>

      <Card className="p-0">
        <div className="border-b border-hairline px-4 py-3 sm:px-5">
          <SegmentedControl
            options={[
              { value: 'write', label: 'Write' },
              { value: 'preview', label: 'Preview' },
            ]}
            value={tab}
            onChange={setTab}
            size="sm"
          />
        </div>

        <div className="p-4 sm:p-5">
          {tab === 'write' ? (
            <MarkdownEditor
              value={editing.body}
              onChange={(body) => setEditing({ ...editing, body })}
              rows={22}
              placeholder={
                'Start with a paragraph.\n\n## A heading\n\n- a point\n- another point\n\n> Something somebody said.'
              }
            />
          ) : editing.body.trim() ? (
            /*
              The same renderer the article uses, not an approximation of it.
              A preview that is drawn by different code is a preview that lies.
            */
            <Prose body={editing.body} />
          ) : (
            <p className="py-10 text-center text-[13.5px] text-muted">Nothing written yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
}

/**
 * The video at the foot of an article.
 *
 * Two ways in, and the owner is told which to reach for. Pasting a YouTube or
 * Vimeo link is the path almost everybody will take: nothing to host,
 * nothing to pay for. Uploading an MP4 straight to Cloudinary is there for the
 * one that would rather keep the file itself, and it only shows when uploads
 * are configured at all. Either way the preview underneath is the exact player
 * the article will draw, so what is seen here is what a visitor gets.
 */
function VideoField({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const preview = parseVideo(value);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadVideo(file);
      onChange(url);
      toast.success('Video uploaded', 'Remember to save the article.');
    } catch (error) {
      toast.error('Could not upload the video', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div>
      <p className="mb-2 text-[11.5px] font-bold uppercase tracking-[0.1em] text-muted">Video</p>
      <p className="mb-3 text-[12.5px] leading-relaxed text-muted">
        YouTube or Vimeo link{cloudinaryConfigured ? ', or an MP4 under 100 MB' : ''}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-[12rem] flex-1">
          <Input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="https://youtu.be/"
            className="font-mono text-[12.5px]"
          />
        </div>
        {cloudinaryConfigured && (
          <button
            type="button"
            disabled={busy}
            onClick={() => input.current?.click()}
            className="tap inline-flex items-center gap-1.5 rounded-xl border border-hairline px-3.5 text-[13.5px] font-semibold text-secondary transition-colors hover:bg-[var(--surface-sunken)] hover:text-primary disabled:opacity-50"
          >
            {busy ? <Spinner size={14} className="text-brand-600 dark:text-brand-400" /> : <Upload size={15} />}
            {busy ? 'Uploading' : 'Upload'}
          </button>
        )}
        {value && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onChange('')}
            className="tap inline-flex items-center gap-1.5 rounded-xl px-3 text-[13.5px] font-semibold text-muted transition-colors hover:text-[#b3261e] disabled:opacity-50"
          >
            <Trash2 size={14} />
            Remove
          </button>
        )}
      </div>

      {value && !preview && (
        <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-[#b3261e]">
          <Film size={13} /> That link is not a YouTube or Vimeo link or a direct video file, so nothing will
          play.
        </p>
      )}

      {preview && (
        <div className="mt-3 max-w-md">
          <VideoBlock url={value} />
        </div>
      )}

      <input
        ref={input}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={(event) => void upload(event.target.files?.[0])}
      />
    </div>
  );
}
