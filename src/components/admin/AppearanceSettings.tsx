/**
 * Settings → Appearance: the colour the portal wears for this school.
 *
 * Everybody at the school sees it until they pick their own from the menu.
 * The preview shows the same few pieces in light and in dark — the header
 * panel, a button, a tab, a link, a badge — drawn from exactly the palette the
 * app will use, so the office sees what a yellow or a custom maroon really
 * becomes before anybody else does.
 */

import { useState } from 'react';
import { Palette } from 'lucide-react';
import { Alert, Button, Card, CardHeader, useToast } from '@/components/ui';
import { ColourPicker } from '@/components/ColourPicker';
import { useAuth } from '@/context/AuthContext';
import { useSchool } from '@/context/SchoolContext';
import { usePersonalAccent } from '@/hooks/useAccent';
import { saveSettings } from '@/lib/db';
import { cleanChoice, isPreset, paletteFor, PRESETS, STEPS, type AccentChoice } from '@/lib/accent';

function Preview({ choice, dark, schoolName }: { choice: AccentChoice; dark: boolean; schoolName: string }) {
  const p = paletteFor(choice);
  /* By shade name — 50 … 950 — not by position in the array. */
  const s = Object.fromEntries(STEPS.map((step, i) => [step, p.scale[i]])) as Record<(typeof STEPS)[number], string>;
  const page = dark ? '#0b0d10' : '#ffffff';
  const card = dark ? '#14171c' : '#ffffff';
  const text = dark ? '#f2f4f7' : '#14171c';
  const muted = dark ? '#8a94a3' : '#6b7686';
  const line = dark ? 'rgba(255,255,255,0.1)' : 'rgba(20,23,28,0.1)';

  return (
    <div className="overflow-hidden rounded-2xl border" style={{ background: page, borderColor: line }}>
      <div className="px-4 pb-6 pt-4" style={{ background: dark ? p.heroDark : p.hero }}>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">{dark ? 'Dark' : 'Light'}</p>
        <p className="mt-1 truncate text-[16px] font-extrabold text-white">{schoolName}</p>
      </div>
      <div className="-mt-3 rounded-t-2xl px-4 pb-4 pt-4" style={{ background: card }}>
        <div className="flex gap-4 border-b text-[12.5px] font-semibold" style={{ borderColor: line }}>
          <span className="border-b-2 pb-2" style={{ borderColor: dark ? s[400] : s[600], color: dark ? s[400] : s[700] }}>
            Overview
          </span>
          <span className="pb-2" style={{ color: muted }}>Results</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className="rounded-lg px-3 py-1.5 text-[12.5px] font-semibold"
            style={{ background: dark ? s[500] : s[900], color: dark ? s[950] : '#ffffff' }}
          >
            Save
          </span>
          <span
            className="rounded-lg px-3 py-1.5 text-[12.5px] font-semibold"
            style={{ background: dark ? `${s[900]}66` : s[50], color: dark ? s[100] : s[900] }}
          >
            Secondary
          </span>
          <span
            className="rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase"
            style={{ background: dark ? `${s[900]}66` : s[50], color: dark ? s[200] : s[800] }}
          >
            Badge
          </span>
        </div>
        <p className="mt-3 text-[12.5px]" style={{ color: text }}>
          Read the <span className="font-semibold underline" style={{ color: dark ? s[400] : s[700] }}>report card</span>.
        </p>
      </div>
    </div>
  );
}

export function AppearanceSettings() {
  const { user } = useAuth();
  const { settings, reload } = useSchool();
  const toast = useToast();
  const saved = cleanChoice(settings.interfaceColour) ?? 'red';
  const [draft, setDraft] = useState<AccentChoice>(saved);
  const [saving, setSaving] = useState(false);
  const [mine, setMine] = usePersonalAccent();

  const save = async () => {
    setSaving(true);
    try {
      await saveSettings({ interfaceColour: draft }, user);
      toast.success('Colour saved', 'Everybody who has not picked their own sees it from their next page.');
      reload();
    } catch (error) {
      toast.error('Could not save', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const name = isPreset(draft) ? PRESETS[draft].name : draft.toUpperCase();

  return (
    <Card>
      <CardHeader
        icon={<Palette size={17} />}
        title="Interface colour"
        subtitle="What the portal wears for everybody at this school — pick one of the four, or your school's own colour. Any colour works: the app keeps your hue but chooses each shade's lightness so text on it stays readable. Pale colours such as yellow come out as a deeper gold. Report cards and printed papers are not affected."
      />

      <ColourPicker value={draft} onChange={(next) => setDraft(next ?? 'red')} label={`Colour · ${name}`} />

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Preview choice={draft} dark={false} schoolName={settings.name} />
        <Preview choice={draft} dark schoolName={settings.name} />
      </div>


      {mine && (
        <Alert tone="info" className="mt-4" title="You have your own colour set" defaultOpen>
          So the app around you will not change when you save this. Everybody else&rsquo;s will.
          <Button className="mt-2" size="sm" variant="secondary" onClick={() => setMine(null)}>
            Use the school&rsquo;s colour myself
          </Button>
        </Alert>
      )}

      <div className="mt-5 flex justify-end gap-2">
        {draft !== saved && (
          <Button variant="ghost" onClick={() => setDraft(saved)} disabled={saving}>
            Undo
          </Button>
        )}
        <Button onClick={() => void save()} loading={saving} disabled={draft === saved}>
          Save for the school
        </Button>
      </div>
    </Card>
  );
}
