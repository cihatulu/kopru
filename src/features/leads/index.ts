// features/leads PUBLIC YÜZEYİ (A20). Yalnız platform admini kullanır.

export { useLeads, useAddLead, useSetLeadStatus } from './api/useLeads';
export type { Lead } from './api/useLeads';
export {
  LEAD_STATUS_META,
  nextLeadStatus,
  isManuallySettable,
  isClosedLead,
} from './domain/lead';
export type { LeadStatus } from './domain/lead';
export { LeadTable } from './components/LeadTable';
export { LeadDialog } from './components/LeadDialog';
export { LeadApplicationModal } from './components/LeadApplicationModal';
