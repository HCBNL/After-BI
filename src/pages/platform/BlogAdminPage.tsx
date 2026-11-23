/**
 * The owner's blog desk: every article on the public blog, and a writer for
 * new ones. Articles written here are saved to Firestore (`blogPosts`, the
 * slug as the id): a draft is seen only here; a published one appears on
 * /blog at once and can be found by search engines. The built in articles
 * (lib/blogPosts.ts) are listed too, read only.
 */
import { useMemo, useState } from 'react';
import { ExternalLink, ImagePlus, Pencil, Plus, Send, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Alert, Button, Card, Field, Input, Select, Switch, Textarea, useToast } from '@/components/ui';
import { Loading } from '@/components/brand/Loader';
import { useAsync } from '@/hooks/useAsync';
import { builtInPosts, deleteOwnPost, listOwnPosts, readMinutes, saveOwnPost, slugify, TOPICS, type BlogTopic, type OwnPost } from '@/lib/blog';
import { uploadImage, shrinkImage } from '@/lib/cloudinary';
import { Cover, Prose } from '@/pages/public/blog/parts';

const SCENES = [
  'data-analytics',
  'pie-chart',
  'revenue-growth',
  'financial-performance',
  'budget-calculator',
  'price-tag',
  'price-comparison',
  'payment-cards',
  'billing-calendar',
  'coin-stacks',
  'inventory-boxes',
  'warehouse',
  'warehouse-2',
  'delivery-truck',
  'location-distribution',
  'global-trade',
  'retail-store',
  'shopping-bags',
  'manufacturing-plant',
  'team-onboarding',
  'target-goals',
  'agreement',
  'promotion',
  'product-activation',
  'workflow-automation',
  'mobile-applications',
  'growth-analytics',
  'reports-and-charts',
  'product-package',
  'delivery-tracking',
  'location-and-maps',
  'shopping-cart',
  'online-payments',
  'security-and-privacy',
  'team-members',
  'customer-support',
  'booking-calendar',
  'forms-and-feedback',
  'faqs',
  'video-tutorials',
  'site-search',
  'notifications',
  'settings',
];
const GROUNDS: { label: string; value: string }[] = [
  { label: 'Butter', value: '#fff1b8' },
  { label: 'Lilac', value: '#ecd5f5' },
  { label: 'Peach', value: '#fde0d2' },
  { label: 'Mint', value: '#dcf7e3' },
  { label: 'Sky', value: '#d7ecff' },
  { label: 'Cream', value: '#fff6e5' },
];
const words = (s: string) => s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

function blank(): OwnPost {
  return {
    slug: '',
    title: '',
    excerpt: '',
    topics: ['guides'],
    date: new Date().toISOString().slice(0, 10),
    author: 'AfterBI Research',
    scene: 'data-analytics',
    ground: '#d7ecff',
    body: '',
    status: 'draft',
  };
}

export default function BlogAdminPage() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(listOwnPosts, [], { handleError: true });
  const [draft, setDraft] = useState<OwnPost | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const own = data ?? [];
  const builtIn = builtInPosts().filter((p) => !own.some((o) => o.slug === p.slug));

  const remove = async (slug: string) => {
    if (!window.confirm('Delete this article for good? It disappears from the blog straight away.')) return;
    try {
      await deleteOwnPost(slug);
      toast.success('Article deleted');
      reload();
    } catch {
      toast.error('Could not delete it', 'Check the connection and try again.');
    }
  };

  if (draft) {
    return (
      <Writer
        initial={draft}
        isNew={!editing}
        taken={[...own.map((o) => o.slug), ...builtIn.map((b) => b.slug)].filter((s) => s !== editing)}
        onDone={() => {
          setDraft(null);
          setEditing(null);
          reload();
        }}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Blog"
        description="Every article on the public blog. Write one here, save it as a draft, and publish when it is ready: it appears on afterbi.com/blog straight away."
        actions={
          <Button icon={<Plus size={16} />} onClick={() => setDraft(blank())}>
            New article
          </Button>
        }
      />
      {error && (
        <Alert tone="critical" title="Your articles could not be read" defaultOpen>
          {/permission/i.test(error.message) ? 'Publish the current firestore.rules, then reload.' : 'Check the connection and reload.'}
        </Alert>
      )}
      {loading && !data ? (
        <Loading rows={3} label="Reading the blog" />
      ) : (
        <div className="space-y-5">
          <Card>
            <h2 className="text-lead font-semibold text-primary">Your articles</h2>
            {own.length === 0 ? (
              <p className="mt-2 text-label text-muted">None yet. Tap New article to write the first.</p>
            ) : (
              <ul className="mt-3 divide-y divide-[var(--border-hairline)]">
                {own.map((p) => (
                  <li key={p.slug} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body font-semibold text-primary">{p.title}</p>
                      <p className="text-caption text-muted">
                        {p.status === 'published' ? 'Published' : 'Draft'} · {p.date} · {`${readMinutes(p.body)} min read`}
                      </p>
                    </div>
                    {p.status === 'published' && (
                      <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer" aria-label="Open on the blog" className="tap flex items-center justify-center rounded-xl text-muted hover:text-primary">
                        <ExternalLink size={16} />
                      </a>
                    )}
                    <button
                      type="button"
                      aria-label="Edit"
                      onClick={() => {
                        setEditing(p.slug);
                        setDraft(p);
                      }}
                      className="tap flex items-center justify-center rounded-xl text-muted hover:text-primary"
                    >
                      <Pencil size={16} />
                    </button>
                    <button type="button" aria-label="Delete" onClick={() => void remove(p.slug)} className="tap flex items-center justify-center rounded-xl text-muted hover:text-status-critical">
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <h2 className="text-lead font-semibold text-primary">Built in articles</h2>
            <p className="mt-1 text-label text-muted">Written into the site. To change one, write a new article with the same address and it replaces it.</p>
            <ul className="mt-3 divide-y divide-[var(--border-hairline)]">
              {builtIn.map((p) => (
                <li key={p.slug} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-semibold text-primary">{p.title}</p>
                    <p className="text-caption text-muted">
                      {p.date} · {`${p.minutes} min read`}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Copy to edit"
                    title="Copy into the writer to change it"
                    onClick={() => {
                      setEditing(null);
                      setDraft({ ...p, status: 'draft' });
                    }}
                    className="tap flex items-center justify-center rounded-xl text-muted hover:text-primary"
                  >
                    <Pencil size={16} />
                  </button>
                  <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer" aria-label="Open on the blog" className="tap flex items-center justify-center rounded-xl text-muted hover:text-primary">
                    <ExternalLink size={16} />
                  </a>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ the writer */

function Writer({ initial, isNew, taken, onDone }: { initial: OwnPost; isNew: boolean; taken: string[]; onDone: () => void }) {
  const toast = useToast();
  const [p, setP] = useState<OwnPost>(initial);
  const [slugTouched, setSlugTouched] = useState(!isNew || Boolean(initial.slug));
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = (patch: Partial<OwnPost>) => setP((x) => ({ ...x, ...patch }));
  const slug = slugTouched ? p.slug : slugify(p.title);
  const preview = useMemo(() => ({ ...p, slug, minutes: readMinutes(p.body) }), [p, slug]);

  const problem = !p.title.trim()
    ? 'Give it a title.'
    : !slug
      ? 'Give it an address.'
      : isNew && taken.includes(slug)
        ? 'Another article already uses this address.'
        : p.excerpt.trim().length < 40
          ? 'Write a summary of at least a sentence (it is what Google shows).'
          : p.body.trim().split(/\s+/).length < 120
            ? 'The article needs at least 120 words.'
            : '';

  const save = async (status: 'draft' | 'published') => {
    if (status === 'published' && problem) {
      toast.error('Not ready to publish', problem);
      return;
    }
    if (!p.title.trim() || !slug) {
      toast.error('Not saved', 'It needs a title first.');
      return;
    }
    setBusy(true);
    try {
      await saveOwnPost({ ...p, slug, status });
      toast.success(status === 'published' ? 'Published' : 'Draft saved', status === 'published' ? `afterbi.com/blog/${slug}` : undefined);
      onDone();
    } catch {
      toast.error('Could not save it', 'Check the connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(await shrinkImage(file, 1600, 0.86), 'site');
      set({ image: url });
    } catch (e) {
      toast.error('Could not upload it', e instanceof Error ? e.message : undefined);
    } finally {
      setUploading(false);
    }
  };

  const topic2 = p.topics[1] ?? '';
  return (
    <div>
      <PageHeader
        title={isNew ? 'New article' : 'Edit article'}
        description="Write in plain text. A blank line starts a new paragraph; ## starts a heading; - starts a bullet; 1. a numbered step; > a pulled out note. **bold** and [link text](/blog/another-article) work inside any line."
        actions={
          <>
            <Button variant="outline" onClick={onDone}>
              Cancel
            </Button>
            <Button variant="outline" loading={busy} onClick={() => void save('draft')}>
              Save draft
            </Button>
            <Button icon={<Send size={15} />} loading={busy} onClick={() => void save('published')}>
              Publish
            </Button>
          </>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="space-y-4">
          <Field label="Title">
            <Input value={p.title} maxLength={110} onChange={(e) => set({ title: e.target.value })} placeholder="How to set credit limits for distributors" />
          </Field>
          <Field label="Address" hint="The end of the article's link. Short words, joined by hyphens. Do not change it after publishing, or old links break.">
            <Input
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                set({ slug: slugify(e.target.value) });
              }}
              disabled={!isNew}
            />
          </Field>
          <Field label="Summary" hint="One or two sentences. Shown on the card and by Google under the title, so it should make someone want to read on.">
            <Textarea rows={3} maxLength={220} value={p.excerpt} onChange={(e) => set({ excerpt: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Topic">
              <Select value={p.topics[0]} onChange={(e) => set({ topics: [e.target.value as BlogTopic, ...(topic2 && topic2 !== e.target.value ? [topic2 as BlogTopic] : [])] })}>
                {TOPICS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Second topic">
              <Select value={topic2} onChange={(e) => set({ topics: [p.topics[0], ...(e.target.value && e.target.value !== p.topics[0] ? [e.target.value as BlogTopic] : [])] })}>
                <option value="">None</option>
                {TOPICS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Author">
              <Input value={p.author} onChange={(e) => set({ author: e.target.value })} />
            </Field>
            <Field label="Date">
              <Input type="date" value={p.date} onChange={(e) => set({ date: e.target.value })} />
            </Field>
            <Field label="Artwork" hint="Used when there is no picture.">
              <Select value={p.scene ?? 'data-analytics'} onChange={(e) => set({ scene: e.target.value })}>
                {SCENES.map((s) => (
                  <option key={s} value={s}>
                    {words(s)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Background">
              <Select value={p.ground ?? '#d7ecff'} onChange={(e) => set({ ground: e.target.value })}>
                {GROUNDS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-hairline px-4 py-2.5 text-label font-semibold text-primary hover:bg-[var(--surface-sunken)]">
              <ImagePlus size={16} aria-hidden /> {uploading ? 'Uploading…' : p.image ? 'Change picture' : 'Use a picture instead'}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => void upload(e.target.files?.[0])} />
            </label>
            {p.image && (
              <button type="button" onClick={() => set({ image: undefined })} className="text-label font-semibold text-muted hover:text-status-critical">
                Remove picture
              </button>
            )}
          </div>
          <Switch checked={Boolean(p.featured)} onChange={(v) => set({ featured: v })} label="Feature at the top" description="Shown in the carousel at the top of the blog (the latest three)." />
          <Switch checked={Boolean(p.spotlight)} onChange={(v) => set({ spotlight: v })} label="Spotlight" description="Listed in Spotlight down the right of the blog." />
          <Field label="Article">
            <Textarea rows={22} value={p.body} onChange={(e) => set({ body: e.target.value })} placeholder={'Start with the point in one paragraph.\n\n## A heading\n\nMore text, with a [link](/blog/landed-cost-per-unit).\n\n- A bullet\n- Another'} />
          </Field>
          <p className="text-caption text-muted">{`${p.body.trim() ? p.body.trim().split(/\s+/).length : 0} words · ${readMinutes(p.body)} min read`}</p>
          {problem && <p className="text-caption font-semibold text-status-warning">{`Before publishing: ${problem}`}</p>}
        </Card>

        {/* The preview, in the blog's own colours. */}
        <div className="bl overflow-hidden rounded-[22px] p-5 sm:p-7 xl:sticky xl:top-4 xl:max-h-[calc(100dvh-2rem)] xl:overflow-y-auto" data-mode="dark">
          <p className="bl-label">Preview</p>
          <h1 className="bl-head mt-3 text-[2rem]">{p.title || 'Your title'}</h1>
          <p className="mt-3 text-[1rem] leading-relaxed text-[var(--bl-muted)]">{p.excerpt || 'Your summary.'}</p>
          <Cover post={preview} className="mt-5 aspect-[16/8] w-full rounded-[14px]" />
          <div className="mt-6">
            <Prose body={p.body || 'Your article appears here as you write it.'} />
          </div>
        </div>
      </div>
    </div>
  );
}
