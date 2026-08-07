// features/announcements PUBLIC YÜZEYİ (A20).

export {
  useAnnouncements,
  usePublishAnnouncement,
  useSetAnnouncementActive,
  useMarkRead,
} from './api/useAnnouncements';
export type { Announcement } from './api/useAnnouncements';
export { AnnouncementList } from './components/AnnouncementList';
export { AnnouncementDialog } from './components/AnnouncementDialog';
