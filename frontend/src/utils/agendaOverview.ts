// Pure helpers for the home overview (status, sorting, closing rule).
// `now` is always passed in so the logic can be tested with a fixed clock.

export type AgendaStatus = 'live' | 'completed' | 'upcoming';

export interface AgendaSummaryAttendee {
  id?: string;
  _id?: string;
  name: string;
  cardColor?: string;
  avatarUrl?: string;
}

export interface AgendaSummary {
  _id: string;
  title?: string;
  date?: string;
  time?: string;
  location?: { name?: string; lat: number; lng: number };
  isArchived?: boolean;
  isManuallyClosed?: boolean;
  closeBeforeHours?: number;
  liveMeetingActive?: boolean;
  liveMeetingStatus?: 'not_started' | 'in_progress' | 'completed';
  updatedAt?: string;
  itemCount?: number;
  completedCount?: number;
  items?: { completed?: boolean }[];
  attendees?: AgendaSummaryAttendee[];
}

function parseTime(value?: string): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return isNaN(t) ? null : t;
}

/** Same rule as the agenda page: manually closed, or past the submission deadline before the meeting. */
export function isAgendaClosedForItems(
  agenda: { isManuallyClosed?: boolean; date?: string; closeBeforeHours?: number } | null | undefined,
  now: number = Date.now()
): boolean {
  if (!agenda) return false;
  if (agenda.isManuallyClosed === true) return true;
  const date = parseTime(agenda.date);
  if (date !== null) {
    const offsetMs = (agenda.closeBeforeHours ?? 12) * 60 * 60 * 1000;
    if (now > date - offsetMs) return true;
  }
  return false;
}

export function getAgendaStatus(agenda: AgendaSummary, now: number = Date.now()): AgendaStatus {
  if (agenda.liveMeetingStatus === 'in_progress' || (agenda.liveMeetingActive && agenda.liveMeetingStatus !== 'completed')) {
    return 'live';
  }
  if (agenda.liveMeetingStatus === 'completed' || agenda.isArchived) return 'completed';
  const date = parseTime(agenda.date);
  if (date !== null && date < now) return 'completed';
  return 'upcoming';
}

export function getItemProgress(agenda: AgendaSummary): { done: number; total: number } {
  if (typeof agenda.itemCount === 'number') {
    return { done: agenda.completedCount ?? 0, total: agenda.itemCount };
  }
  const items = Array.isArray(agenda.items) ? agenda.items : [];
  return { done: items.filter(i => i?.completed).length, total: items.length };
}

const STATUS_RANK: Record<AgendaStatus, number> = { live: 0, upcoming: 1, completed: 2 };

/** LIVE first, then upcoming by date ascending (undated last), then completed by date descending (undated by last change). */
export function sortAgendas<T extends AgendaSummary>(list: T[], now: number = Date.now()): T[] {
  const withStatus = list.map(a => ({ a, status: getAgendaStatus(a, now), date: parseTime(a.date) }));
  withStatus.sort((x, y) => {
    const rank = STATUS_RANK[x.status] - STATUS_RANK[y.status];
    if (rank !== 0) return rank;
    if (x.status === 'upcoming') {
      if (x.date === null && y.date === null) return 0;
      if (x.date === null) return 1;
      if (y.date === null) return -1;
      return x.date - y.date;
    }
    if (x.status === 'completed') {
      const xd = x.date ?? parseTime(x.a.updatedAt) ?? 0;
      const yd = y.date ?? parseTime(y.a.updatedAt) ?? 0;
      return yd - xd;
    }
    return 0;
  });
  return withStatus.map(w => w.a);
}
