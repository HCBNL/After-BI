/**
 * Team → My cards: the staff ID card and the business card, one screen.
 *
 * They were two menu rows filled from the same details. A person typed their
 * position and phone on the ID card, then had to find the business card to
 * see them used, and the business card's only instruction was "go to the
 * other page first". One place to keep the details, two tabs for what comes
 * out of them.
 *
 * The tab lives in the address (`?tab=id` / `?tab=business`) so the old
 * `/id-card` and `/card` links land on the right one, and a tab survives a
 * refresh.
 */

import { useSearchParams } from 'react-router-dom';
import { Contact, IdCard } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { SegmentedControl } from '@/components/ui';
import { Hint } from '@/components/ui/Hint';
import OrgIdCard from './OrgIdCard';
import OrgCard from './OrgCard';

type Tab = 'id' | 'business';

export default function MyCards() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'business' ? 'business' : 'id';

  return (
    <>
      <PageHeader
        title="My cards"
        actions={
          <Hint label="About your cards" align="right">
            Your staff ID card and your business card come from the same details. Set your position, location and phone
            on the ID card tab and both cards use them. Each one downloads as a print-ready PDF.
          </Hint>
        }
      />
      <SegmentedControl
        className="mb-5"
        value={tab}
        onChange={(next) => setParams({ tab: next }, { replace: true })}
        options={[
          { value: 'id', label: 'ID card', icon: <IdCard size={15} /> },
          { value: 'business', label: 'Business card', icon: <Contact size={15} /> },
        ]}
      />
      {tab === 'id' ? <OrgIdCard embedded /> : <OrgCard embedded />}
    </>
  );
}
