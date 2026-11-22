/**
 * `/verify/id/:uid`: where the QR on an organisation's staff ID card points.
 * One public read of `idCards/{uid}`. It says whether the holder is a current
 * member of that company's staff, with their photograph, contact and a "Save
 * contact" that carries the picture into the phone.
 */
import { useParams } from 'react-router-dom';
import { Seo } from '@/components/Seo';
import { ContactMissing, ContactStage, PublicContact } from '@/components/cards/PublicContact';
import { useAsync } from '@/hooks/useAsync';
import { readIdCard } from '@/lib/idCards';
import { useBootDone } from '@/lib/boot';

export default function VerifyIdPage() {
  useBootDone();
  const { uid = '' } = useParams();
  const { data, loading } = useAsync(() => readIdCard(uid), [uid], { handleError: true });

  return (
    <ContactStage color={data?.color}>
      <Seo title="Staff check" description="Confirm a staff ID card." path={`/verify/id/${uid}`} noindex />
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
        <ContactMissing loading={loading} />
      )}
    </ContactStage>
  );
}
