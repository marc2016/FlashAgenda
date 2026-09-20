/**
 * Helper to compute exact and consistent item counts per attendee across FlashAgenda views
 * (AgendaAttendees, LiveMeetingModal, etc.).
 *
 * Rules:
 * 1. Transferred and accepted items are counted exclusively for the recipient.
 * 2. Automatically generated / system items (author or createdBy is 'System') are ignored
 *    and not attributed to any attendee.
 * 3. Case-insensitive matching by ID and Name so casing differences don't break attribution.
 * 4. Each item is counted at most once per attendee.
 */
export function calculateAttendeeItemCounts(
  items: any[] = [],
  attendees: any[] = []
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const item of items) {
    if (!item) continue;

    // Skip system generated points
    const authorClean = (item.author || '').trim().toLowerCase();
    const createdByClean = (item.createdBy || '').trim().toLowerCase();
    if (authorClean === 'system' || createdByClean === 'system') {
      continue;
    }

    // 1. If transferred and accepted, attribute count exclusively to recipient
    if (item.transferredTo && item.transferredTo.status === 'accepted') {
      const toUserId = item.transferredTo.toUserId?.toLowerCase();
      const toUserName = item.transferredTo.toUserName?.trim().toLowerCase();

      for (const att of attendees) {
        const attKey = att._id || att.id || att.name;
        const attId = (att._id || att.id)?.toLowerCase();
        const attName = att.name?.trim().toLowerCase();

        if (
          (attId && toUserId && attId === toUserId) ||
          (attName && toUserName && attName === toUserName)
        ) {
          counts.set(attKey, (counts.get(attKey) || 0) + 1);
        }
      }
      continue;
    }

    // 2. Otherwise attribute to original creator / author (at most once per item)
    for (const att of attendees) {
      const attKey = att._id || att.id || att.name;
      const attId = (att._id || att.id)?.toLowerCase();
      const attName = att.name?.trim().toLowerCase();

      const matchesCreator = attId && createdByClean === attId;
      const matchesName = attName && (createdByClean === attName || authorClean === attName);

      if (matchesCreator || matchesName) {
        counts.set(attKey, (counts.get(attKey) || 0) + 1);
      }
    }
  }

  return counts;
}

/**
 * Formats seconds into MM:SS or HH:MM:SS
 */
export function formatTimer(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
