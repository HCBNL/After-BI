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
 * Only the pictures are editable. The headlines, the plans, the FAQ and the
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
 * Uploads happen immediately — that is the wait worth showing a spinner for —
 * but nothing reaches the landing page until Publish is pressed. So a cover can
 * be assembled over ten minutes and go live in one moment, rather than the
 * public watching it being built.
 */

import { useState } from 'react';
import { ExternalLink, Send } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { ImagePicker } from '@/components/ImagePicker';
import { Alert, Button, Card, CardHeader, HintFooter, useToast } from '@/components/ui';
import { Loading } from '@/components/brand/Loader';
import { useAsync } from '@/hooks/useAsync';
import { EMPTY_HOME, getSiteHome, saveSiteHome, type SiteHome } from '@/lib/siteDoc';
import { MODULES } from '@/lib/site';
import { BannerEditor } from './website/BannerEditor';

export default function WebsitePage() {
  const toast = useToast();
  const { data, loading, reload } = useAsync(getSiteHome, [], { handleError: true });

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
        description="The pictures on afterbi.com. Everything else about the page is in the build."
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
              title="The cover"
              subtitle="Up to six slides at the top of the landing page. Empty shows the built-in one."
            />
            <BannerEditor slides={home?.banners ?? []} onChange={(banners) => seed({ banners })} />
            <HintFooter>
              A cover slide is the first thing a distributor's managing director sees, and it is judged in about a
              second. The photographs that work are the trade's own — a loading bay, a depot aisle, a truck on a bad
              road, a rep with a phone in a shop — because they say "these people have been here" before a word is
              read. Stock photography of a boardroom says the opposite.
            </HintFooter>
          </Card>

          <Card>
            <CardHeader
              title="Module covers"
              subtitle="One picture per module, on the product pages and the shelf on the front page."
            />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {MODULES.map((item) => (
                <ImagePicker
                  key={item.slug}
                  label={item.name}
                  value={home?.moduleImages?.[item.slug] ?? ''}
                  onChange={(url) =>
                    seed({ moduleImages: { ...(home?.moduleImages ?? {}), [item.slug]: url } })
                  }
                  kind="cover"
                  size={208}
                  height={117}
                  hint="16:9. 1600 × 900."
                />
              ))}
            </div>
            <HintFooter>
              A module with no picture draws its own glyph on an ink panel, which is a designed state rather than a
              gap — so these are genuinely optional, and a half-filled set looks deliberate rather than unfinished.
              Fill them in the order a carton moves, not all at once.
            </HintFooter>
          </Card>

          <Card>
            <CardHeader title="The other two" subtitle="The About page, and what a shared link shows." />
            <div className="flex flex-wrap items-start gap-8">
              <ImagePicker
                label="About page"
                value={home?.aboutImage ?? ''}
                onChange={(aboutImage) => seed({ aboutImage })}
                kind="site"
                size={160}
                height={200}
                hint="4:5. 1000 × 1250. Beside the story."
              />
              <ImagePicker
                label="Shared link"
                value={home?.shareImage ?? ''}
                onChange={(shareImage) => seed({ shareImage })}
                kind="site"
                size={240}
                height={126}
                hint="1200 × 630. What WhatsApp, LinkedIn and Slack draw when somebody pastes the address. Falls back to /og.png."
              />
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
