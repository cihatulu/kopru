import { ORG_KIND } from '@/constants';
import { AdminOrgsPage } from './AdminOrgsPage';

export default function AdminManufacturersPage() {
  return <AdminOrgsPage kind={ORG_KIND.manufacturer} />;
}
