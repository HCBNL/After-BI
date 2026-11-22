/**
 * `/card/:uid` and `/card#…`: a digital business card.
 *
 * `/card/:uid` is what a printed card's QR and a shared link open now: one
 * public read of `idCards/{uid}` (lib/idCards.ts), so the card shows the
 * holder's current photograph, the company's colour and whether they are
 * still staff. `/card#…` is the older link that carries every detail in the
 * hash (lib/businessCard.ts); it still opens, in the same design.
 */

import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Seo } from '@/components/Seo';
import { ContactMissing, ContactStage, PublicContact } from '@/components/cards/PublicContact';
import { useAsync } from '@/hooks/useAsync';
import { readCardHash } from '@/lib/businessCard';
import { readIdCard } from '@/lib/idCards';
import { COMPANY } from '@/lib/company';
import { useBootDone } from '@/lib/boot';

export default function CardPage() {
  useBootDone();
  const { uid = '' } = useParams();
  const fromHash = useMemo(() => (uid ? null : readCardHash(window.location.hash)), [uid]);
  const record = useAsync(() => (uid ? readIdCard(uid) : Promise.resolve(null)), [uid], { handleError: true });
  const data = record.data;

  if (uid) {
    return (
      <ContactStage color={data?.color}>
        <Seo title={data?.name || 'Contact card'} description="Contact card." path={`/card/${uid}`} noindex />
        {data ? (
          <PublicContact
            status={data.active ? 'verified' : 'inactive'}
            name={data.name}
            position={data.position}
            company={data.company}
            logo={data.logo}
            photo={data.photo}
            color={data.color}
            location={data.location}
            phone={data.phone}
            email={data.email}
            website={data.website}
            staffNo={data.staffNo}
          />
        ) : (
          <ContactMissing loading={record.loading} />
        )}
      </ContactStage>
    );
  }

  return (
    <ContactStage>
      <Seo title={fromHash ? fromHash.name : 'Contact card'} description="Contact card." path="/card" noindex />
      {fromHash ? (
        <PublicContact
          status="plain"
          name={fromHash.name}
          position={fromHash.position}
          company={fromHash.company || COMPANY.name}
          logo={fromHash.logo}
          photo={fromHash.photo}
          location={fromHash.location}
          phone={fromHash.phone}
          email={fromHash.email}
          website={fromHash.company ? fromHash.website : 'afterbi.com'}
          staffNo={fromHash.staffNo}
        />
      ) : (
        <ContactMissing loading={false} />
      )}
    </ContactStage>
  );
}
