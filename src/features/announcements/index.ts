// features/announcements PUBLIC YÜZEYİ (A20).

export { useAnnouncements } from './api/useAnnouncements';
export {
  usePublishAnnouncement,
  useUpdateAnnouncement,
  useSetAnnouncementActive,
  useDeleteAnnouncement,
  useMarkRead,
} from './api/useAnnouncementMutations';
export { useUnreadAnnouncements } from './api/useUnreadAnnouncements';
export type { Announcement } from './api/useAnnouncements';
export type {
  PublishAnnouncementInput,
  UpdateAnnouncementInput,
} from './api/useAnnouncementMutations';
export { AnnouncementList } from './components/AnnouncementList';
export { AnnouncementDialog } from './components/AnnouncementDialog';
export { AnnouncementTable } from './components/AnnouncementTable';
export { AnnouncementsHeader } from './components/AnnouncementsHeader';
