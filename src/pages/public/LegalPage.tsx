/**
 * /terms and /privacy: plain-language starting versions. Have them reviewed
 * by a lawyer before relying on them; edit the sections below.
 */

import { Seo } from '@/components/Seo';
import { PublicShell } from '@/components/marketing/kit';
import { container } from '@/components/marketing/tokens';
import { COMPANY } from '@/lib/company';
import { cn } from '@/lib/cn';

type Kind = 'terms' | 'privacy';

const UPDATED = '8 October 2026';

const CONTENT: Record<Kind, { title: string; intro: string; sections: { h: string; p: string }[] }> = {
  terms: {
    title: 'Terms of Service',
    intro: `These terms govern your use of AfterBI, a product of ${COMPANY.name} ("we", "us"). By creating an account or using AfterBI you agree to them.`,
    sections: [
      { h: 'Your account', p: 'You are responsible for the accounts in your organisation, for keeping passwords private, and for everything done under your accounts. Tell us promptly if you suspect unauthorised use.' },
      { h: 'Subscriptions and payment', p: 'Plans are billed in advance, monthly or yearly, at the price shown when you subscribe. Partner users are free. If a payment is missed we may suspend access until it is settled; your data is kept during suspension.' },
      { h: 'Your data', p: 'You own the data you put into AfterBI. You give us permission to store and process it only to provide the service to you. You can export your data at any time.' },
      { h: 'Acceptable use', p: 'Do not use AfterBI for anything unlawful, to attempt to access another organisation’s data, or to disrupt the service.' },
      { h: 'Availability', p: 'We work to keep AfterBI available and secure, but the service is provided as is and may occasionally be interrupted for maintenance or reasons outside our control.' },
      { h: 'Liability', p: 'To the extent the law allows, our total liability for any claim is limited to the fees you paid us in the three months before the claim.' },
      { h: 'Ending the service', p: 'You can cancel at the end of any billing period. We may end the service for a serious breach of these terms. On request we will provide an export of your data.' },
      { h: 'Contact', p: `Questions about these terms: ${COMPANY.email}.` },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    intro: `This policy explains what ${COMPANY.name} collects when you use AfterBI and afterbi.com, and how we use it.`,
    sections: [
      { h: 'What we collect', p: 'Account details (name, email, phone, role), the business records your organisation enters, and basic technical information such as device type and sign-in times.' },
      { h: 'How we use it', p: 'Only to provide, secure and improve AfterBI, to support you, and to send service messages. We do not sell personal data.' },
      { h: 'Where it is stored', p: 'Data is stored with our cloud providers (Google Firebase). Each organisation’s data is kept separate by database security rules.' },
      { h: 'Sharing', p: 'We share data only with providers who help us run the service, when you ask us to, or when the law requires it.' },
      { h: 'Retention', p: 'We keep data while your account is active and for a reasonable period afterwards, then delete it, unless the law requires us to keep it longer.' },
      { h: 'Your rights', p: `You can ask to see, correct, export or delete your personal data by writing to ${COMPANY.email}.` },
      { h: 'Contact', p: `Privacy questions: ${COMPANY.email}.` },
    ],
  },
};

export default function LegalPage({ kind }: { kind: Kind }) {
  const page = CONTENT[kind];
  return (
    <PublicShell closing={false}>
      <Seo title={page.title} description={page.intro} path={`/${kind}`} />
      <section className="site-wash">
        <div className={cn(container, 'max-w-3xl pb-20 pt-14 sm:pt-20')}>
          <h1 className="font-display text-[2.4rem] font-extrabold tracking-[-0.04em] text-navy-900 sm:text-[3rem]">{page.title}</h1>
          <p className="mt-2 text-[14px] text-navy-500">Last updated {UPDATED}</p>
          <p className="mt-6 text-[17px] leading-relaxed text-navy-700">{page.intro}</p>
          <div className="mt-10 space-y-8">
            {page.sections.map((section) => (
              <section key={section.h}>
                <h2 className="text-[19px] font-bold text-navy-900">{section.h}</h2>
                <p className="mt-2 text-[16px] leading-relaxed text-navy-700">{section.p}</p>
              </section>
            ))}
          </div>
          <p className="mt-12 text-[14px] text-navy-500">
            {COMPANY.name} · {COMPANY.url}
          </p>
        </div>
      </section>
    </PublicShell>
  );
}
