// features/counterparties PUBLIC YÜZEYİ (A20).

export { useCounterparties } from './api/useCounterparties';
export {
  useAddCounterparty,
  useRespondToConnection,
  useSetCounterpartyStatus,
  useSetCounterpartyDiscount,
  useRequestSubscription,
} from './api/useCounterpartyMutations';
export type {
  AddCounterpartyInput,
  AddCounterpartyResult,
} from './api/useCounterpartyMutations';

export {
  otherParty,
  isManufacturerSide,
  isIncomingRequest,
  isOutgoingRequest,
  counterpartyTitle,
  counterpartyNoun,
  pendingExplanation,
} from './domain/counterparty';
export type { Edge, Party } from './domain/counterparty';

export { addCounterpartySchema, isSelfReference } from './domain/addSchema';
export type { AddCounterpartyForm } from './domain/addSchema';

export { CounterpartyTable } from './components/CounterpartyTable';
export { IncomingRequests } from './components/IncomingRequests';
export { AddCounterpartyDialog } from './components/AddCounterpartyDialog';
export { SubscriptionBanner } from './components/SubscriptionBanner';
