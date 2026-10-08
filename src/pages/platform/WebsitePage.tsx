/**
 * Platform → Website.
 *
 * THE LANDING PAGE'S PICTURES LIVE HERE
 *
 * The cover on afterbi.com (pictures or silent video, with optional words),
 * the module cover images and the picture on the About page are all set on
 * this screen. The site ships no photograph of its own: anything left empty
 * draws a designed stand-in instead, so a deployment that never uploads
 * anything still has a finished front page.
 *
 * WHY THE WORDS ARE NOT HERE
 *
 * Mostly pictures. The AfterBI Custom card and the Partner Programme are
 * the exceptions, because they are offers that change. The headlines, the plans, the FAQ and the
 * module copy live in `lib/site.ts` and ship in the bundle, which buys two
 * things: the landing page paints its words on the first frame with no read at
 * all, and a copy change is a pull request somebody reviews rather than a text
 * box somebody pastes into at eleven at night. The one exception is a cover
 * slide's own headline, which belongs to the picture it sits on.
 *
 * WHY THE SIZES ARE SPELLED OUT ON SCREEN
 *
 * Because the slots crop. A photograph handed to a slot at the wrong shape is
 * not rejected, it is trimmed, and the person who chose it finds out when it is
 * live. The hint under each control says the ratio that slot will actually draw
 * at, so a picture can be cut to it beforehand.
 *
 * ONE PUBLISH BUTTON
 *
 * Uploads happen immediately, that is the wait worth showing a spinner for , 
 * but nothing reaches the landing page until Publish is pressed. So a cover can
 * be assembled over ten minutes and go live in one moment, rather than the
 * public watching it being built.
 */

import { useState } from 'react';
import { ExternalLink, Plus, Send, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Alert, Button, Card, CardHeader, Field, Input, useToast } from '@/components/ui';
import { Loading } from '@/components/brand/Loader';
import { useAsync } from '@/hooks/useAsync';
import {
  EMPTY_HOME,
  getSiteHomeLive,
  MAX_HOME_VIDEOS,
  saveSiteHome,
  type SiteHome,
  type SiteVideo,
} from '@/lib/siteDoc';
import { SOCIAL_FIELDS } from '@/lib/social';
import { VideoPicker } from './website/VideoPicker';
import { CustomEditor } from './website/ProgrammeEditors';

export default function WebsitePage() {
  const toast = useToast();
  const { data, loading, reload } = useAsync(getSiteHomeLive, [], { handleError: true });

  const [draft, setDraft] = useState<SiteHome | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /*
   * The draft is seeded from the server copy the first time it lands and then
   * left alone. Re-seeding on every render of `data` would throw away whatever
   * had been typed the moment anything else caused a refetch, which is the
   * classic "my edits vanished" bug in a screen shaped like this one.
   */
  const home = draft ?? data ?? null;
  const seed = (patch: Partial<SiteHome>) => setDraft({ ...(home ?? EMPTY_HOME), ...patch });

  const publish = async () => {
    if (!home) return;
    setBusy(true);
    setError(null);
    try {
      await saveSiteHome(home);
      toast.success('Website published', 'The landing page is showing it now.');
      setDraft(null);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not publish. Try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  const dirty = draft !== null;

  return (
    <>
      <PageHeader
        title="Website"
        description="Videos, follow links and the Custom offer. Pictures live in the website files (public/site)."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<ExternalLink size={15} />}
              onClick={() => window.open('/', '_blank', 'noopener')}
            >
              View
            </Button>
            <Button size="sm" icon={<Send size={15} />} loading={busy} disabled={!dirty} onClick={() => void publish()}>
              {dirty ? 'Publish' : 'Published'}
            </Button>
          </div>
        }
      />

      {loading && !home ? (
        <Loading label="Loading the website" rows={2} />
      ) : (
        <div className="space-y-5">
          {error && (
            <Alert tone="critical" title="Could not publish" defaultOpen>
              {error}
            </Alert>
          )}

          {dirty && (
            <Alert tone="warning" title="Not published yet">
              These changes are only on this screen. Press Publish to put them on the landing page.
            </Alert>
          )}

          <Card>
            <CardHeader
              title="Demo videos"
              subtitle={`Up to ${MAX_HOME_VIDEOS}, in a row on the front page. Empty shows no row.`}
            />
            <VideoList
              videos={home?.videos ?? []}
              onChange={(videos) => seed({ videos })}
            />
          </Card>

          <Card>
            <CardHeader
              title="Follow links"
              subtitle="Leave a box empty to hide that channel."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              {SOCIAL_FIELDS.map((field) => (
                <Field key={field.key} label={field.label}>
                  <Input
                    value={home?.social?.[field.key] ?? ''}
                    onChange={(event) =>
                      seed({ social: { ...(home?.social ?? {}), [field.key]: event.target.value.trim() } })
                    }
                    placeholder="https://"
                    inputMode="url"
                  />
                </Field>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="AfterBI Custom"
              subtitle="The optional built for you offer you can add to a proposal."
            />
            <CustomEditor value={home?.customBuild} onChange={(customBuild) => seed({ customBuild })} />
          </Card>


        </div>
      )}
    </>
  );
}

/** The walkthrough list: a title and a video per row, added and removed in place. */
function VideoList({ videos, onChange }: { videos: SiteVideo[]; onChange: (next: SiteVideo[]) => void }) {
  const update = (index: number, patch: Partial<SiteVideo>) =>
    onChange(videos.map((video, i) => (i === index ? { ...video, ...patch } : video)));

  return (
    <div className="space-y-5">
      {videos.map((video, index) => (
        <div
          key={index}
          className="flex flex-col gap-4 rounded-xl border border-hairline p-4 sm:flex-row sm:items-start"
        >
          <VideoPicker
            label={`Video ${index + 1}`}
            value={video.url}
            onChange={(url) => update(index, { url })}
            width={210}
            height={118}
          />
          <div className="min-w-0 flex-1 space-y-3">
            <Field label="Title on the card" hint="Empty reads: Watch the walkthrough.">
              <Input
                value={video.title ?? ''}
                onChange={(event) => update(index, { title: event.target.value })}
                placeholder="Raise an order in under a minute"
              />
            </Field>
            <Button
              variant="ghost"
              size="sm"
              icon={<Trash2 size={14} />}
              onClick={() => onChange(videos.filter((_, i) => i !== index))}
            >
              Remove this video
            </Button>
          </div>
        </div>
      ))}
      {videos.length < MAX_HOME_VIDEOS && (
        <Button variant="outline" size="sm" icon={<Plus size={15} />} onClick={() => onChange([...videos, { url: '', title: '' }])}>
          Add a video
        </Button>
      )}
    </div>
  );
}
