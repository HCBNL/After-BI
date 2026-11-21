/**
 * "Get on iPhone" and "Get on Android": installing AfterBI from the front page.
 *
 * AfterBI installs straight from the browser (it is a web app with a service
 * worker, see lib/pwa.ts), so these do not go to a store:
 *
 *   Android, Chrome, Edge   the browser's own install dialog, at once
 *   iPhone, iPad (Safari)   two steps shown: Share, then Add to Home Screen
 *   anywhere else           the same steps for the browser in hand
 *
 * Once installed it opens full screen from the home screen, like any app.
 */
import { IconArt } from '@/components/ui/IconArt';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Plus, Share, Smartphone, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { canPromptInstall, isInstalled, promptInstall } from '@/lib/pwa';
import { appUrl, onSiteHost } from '@/lib/hosts';

type Platform = 'ios' | 'android';

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function GetApp({ className }: { className?: string }) {
  const [help, setHelp] = useState<Platform | null>(null);
  const [done, setDone] = useState(() => isInstalled());

  const get = async (platform: Platform) => {
    /* The app lives on app.afterbi.com: it is installed from there, so its icon opens the app, not the website. */
    if (onSiteHost()) {
      window.location.href = appUrl('/login');
      return;
    }
    if (platform === 'android' || !isIOS()) {
      if (canPromptInstall()) {
        const ok = await promptInstall();
        if (ok) setDone(true);
        return;
      }
    }
    setHelp(platform);
  };

  if (done) {
    return <p className={cn('text-[15px] font-semibold text-navy-700', className)}>AfterBI is installed on this device.</p>;
  }

  return (
    <>
      <div className={cn('flex flex-wrap gap-2.5 sm:gap-3', className)}>
        <button
          type="button"
          onClick={() => void get('ios')}
          className="inline-flex h-[3.25rem] items-center gap-2 rounded-xl bg-[#1d3fd6] px-4 text-[15px] sm:px-5 sm:text-[16px] font-semibold text-white transition-colors hover:bg-[#1733b5]"
        >
          <Smartphone size={19} strokeWidth={2.2} aria-hidden />
          Get on iPhone
        </button>
        <button
          type="button"
          onClick={() => void get('android')}
          className="inline-flex h-[3.25rem] items-center gap-2 rounded-xl bg-white px-4 text-[15px] sm:px-5 sm:text-[16px] font-semibold text-navy-900 shadow-[0_1px_0_rgba(15,31,54,0.04),0_8px_24px_-14px_rgba(15,31,54,0.35)] transition-colors hover:bg-navy-50"
        >
          <Download size={19} strokeWidth={2.2} aria-hidden />
          Get on Android
        </button>
      </div>
      {help && <InstallHelp platform={help} onClose={() => setHelp(null)} />}
    </>
  );
}

function InstallHelp({ platform, onClose }: { platform: Platform; onClose: () => void }) {
  const steps =
    platform === 'ios'
      ? [
          { icon: Share, text: 'Open this page in Safari and tap the Share button.' },
          { icon: Plus, text: 'Choose "Add to Home Screen", then tap Add.' },
        ]
      : [
          { icon: Download, text: 'Open this page in Chrome and tap the ⋮ menu.' },
          { icon: Plus, text: 'Choose "Install app" or "Add to Home screen".' },
        ];
  return createPortal(
    <div className="site fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={onClose} role="dialog" aria-modal="true" aria-label="Install AfterBI">
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-[1.6rem] bg-white p-6 shadow-[0_30px_80px_-30px_rgba(15,31,54,0.6)]">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-[1.45rem] font-bold leading-tight tracking-[-0.03em] text-navy-900">
            {platform === 'ios' ? 'Get AfterBI on your iPhone' : 'Get AfterBI on Android'}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-navy-500 hover:bg-navy-50">
            <X size={20} aria-hidden />
          </button>
        </div>
        <ol className="mt-5 space-y-3">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <li key={i} className="flex items-center gap-3 rounded-2xl bg-navy-50 p-3.5">
                <IconArt icon={Icon} id={step.text} size={44} halo={0.7} />
                <span className="text-[14.5px] leading-snug text-navy-800">{step.text}</span>
              </li>
            );
          })}
        </ol>
        <p className="mt-4 text-[13px] leading-relaxed text-navy-500">AfterBI then opens from your home screen, full screen, like any app.</p>
      </div>
    </div>,
    document.body,
  );
}
