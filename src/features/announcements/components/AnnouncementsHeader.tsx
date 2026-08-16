import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';

interface Props {
  isManufacturer: boolean;
  onCreate: () => void;
}

/** Duyurular sayfasının başlığı; yayınlama eylemi yalnız üreticide görünür. */
export function AnnouncementsHeader({ isManufacturer, onCreate }: Props) {
  return (
    <PageHeader
      title={isManufacturer ? 'Duyuru Yönetimi' : 'Duyurular'}
      description={
        isManufacturer
          ? 'Müşterilerinize iletmek istediğiniz kampanya veya bilgilendirmeleri yayınlayın.'
          : 'Tedarikçilerinizin yayınladığı duyurular.'
      }
      {...(isManufacturer
        ? { actions: <Button onClick={onCreate}>Yeni Duyuru</Button> }
        : {})}
    />
  );
}
