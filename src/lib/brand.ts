/**
 * The organisation's own colour and mark: and how far they are allowed to go.
 *
 * THE RULE, WHICH IS THE WHOLE FILE
 *
 * A tenant's brand reaches printed artefacts and nothing else. Their logo
 * appears on their invoices, their statements and their sign-in screen; their
 * colour appears on an invoice header. Neither touches the app chrome.
 *
 * This is a decision, not an oversight, and it is worth defending because every
 * multi-tenant product is asked for the opposite. An app that repaints its
 * navigation per customer has no design system: it has a theme engine, and
 * every contrast pair in it has to hold for a colour nobody has seen yet. One
 * customer picks #FFE800 and the active tab becomes unreadable; another picks
 * near-black and the primary button disappears into the rail. The product then
 * spends the rest of its life clamping user-chosen colours into a safe range,
 * which is the same as not letting them choose.
 *
 * So: AfterBI green is the app's colour, everywhere, for everyone. The
 * customer's green is on their invoice, where it belongs and where nothing has
 * to be legible against it but black text on white paper.
 */

import { useEffect, useState } from 'react';
import { getOrgSettings } from '@/lib/db';
import { getActiveOrg, onActiveOrgChange } from './tenant';

export interface Brand {
  name: string;
  shortName: string;
  logoUrl?: string;
  /** Hex. Printed artefacts only. Never passed to a Tailwind class. */
  color: string;
}

const FALLBACK: Brand = {
  name: 'AfterBI',
  shortName: 'AfterBI',
  logoUrl: undefined,
  color: '#10b981',
};

/**
 * A hex string that is actually a hex string.
 *
 * Whatever is in the database arrived from a colour input three versions ago
 * and may be `rgb(16,185,129)`, `emerald`, or empty. It goes straight into an
 * inline `style` on a printed invoice, so anything unparseable has to become
 * the fallback here rather than a silently broken header there.
 */
function safeColor(raw: unknown): string {
  return typeof raw === 'string' && /^#[0-9a-f]{6}$/i.test(raw.trim()) ? raw.trim() : FALLBACK.color;
}

/**
 * The current organisation's brand, kept in step with the active tenant.
 *
 * Subscribes to `onActiveOrgChange` rather than reading once at mount: the
 * brand is needed on the sign-in screen, which renders before anybody has an
 * organisation, and a single read at that moment returns the fallback forever.
 */
export function useBrand(): Brand {
  const [brand, setBrand] = useState<Brand>(FALLBACK);

  useEffect(() => {
    let live = true;

    const load = (orgId: string | null) => {
      if (!orgId) {
        setBrand(FALLBACK);
        return;
      }
      getOrgSettings()
        .then((settings) => {
          if (!live || !settings) return;
          setBrand({
            name: settings.name || FALLBACK.name,
            shortName: settings.shortName || settings.name || FALLBACK.shortName,
            logoUrl: settings.logoUrl,
            color: safeColor(settings.brandColor),
          });
        })
        .catch(() => {
          /* A tenant whose settings cannot be read still gets a usable app. */
        });
    };

    load(getActiveOrg());
    const stop = onActiveOrgChange(load);

    return () => {
      live = false;
      stop();
    };
  }, []);

  return brand;
}
