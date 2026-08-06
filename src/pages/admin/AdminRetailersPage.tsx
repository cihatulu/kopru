import { ORG_KIND } from '@/constants';
import { AdminOrgsPage } from './AdminOrgsPage';

export default function AdminRetailersPage() {
  return <AdminOrgsPage kind={ORG_KIND.retailer} />;
}
