import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthSession } from '@/features/auth';
import { useAnnouncements } from './useAnnouncements';

const READ_EVENT = 'kopru_announcements_read';

export function useUnreadAnnouncements() {
  const { data: user } = useAuthSession();
  const orgId = user?.org?.id;
  const list = useAnnouncements();

  const [readIds, setReadIds] = useState<Set<string>>(() => {
    if (!orgId) return new Set();
    try {
      const stored = localStorage.getItem(`kopru_read_announcements_${orgId}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const syncFromStorage = useCallback(() => {
    if (!orgId) return;
    try {
      const stored = localStorage.getItem(`kopru_read_announcements_${orgId}`);
      const ids: string[] = stored ? JSON.parse(stored) : [];
      setReadIds((prev) => {
        if (prev.size === ids.length && ids.every((id) => prev.has(id))) {
          return prev;
        }
        return new Set(ids);
      });
    } catch {
      // ignore
    }
  }, [orgId]);

  useEffect(() => {
    syncFromStorage();
  }, [syncFromStorage]);

  useEffect(() => {
    const handleSync = () => {
      syncFromStorage();
    };
    window.addEventListener(READ_EVENT, handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener(READ_EVENT, handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [syncFromStorage]);

  const allAnnouncements = useMemo(() => list.data?.pages.flat() ?? [], [list.data]);
  const activeAnnouncements = useMemo(() => allAnnouncements.filter((a) => a.isActive), [allAnnouncements]);

  const unreadCount = useMemo(
    () => activeAnnouncements.filter((a) => !readIds.has(a.id)).length,
    [activeAnnouncements, readIds],
  );

  const markAllAsRead = useCallback(() => {
    if (!orgId || activeAnnouncements.length === 0) return;
    const unread = activeAnnouncements.filter((a) => !readIds.has(a.id));
    if (unread.length === 0) return;

    const allIds = activeAnnouncements.map((a) => a.id);
    const updated = new Set([...readIds, ...allIds]);
    setReadIds(updated);
    try {
      localStorage.setItem(`kopru_read_announcements_${orgId}`, JSON.stringify(Array.from(updated)));
      window.dispatchEvent(new Event(READ_EVENT));
    } catch {
      // ignore
    }
  }, [orgId, activeAnnouncements, readIds]);

  return {
    unreadCount,
    markAllAsRead,
  };
}
