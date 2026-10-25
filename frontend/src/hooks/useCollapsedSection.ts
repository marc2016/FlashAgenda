import { useState, useCallback } from 'react';

export type CollapsibleSectionId = 'details' | 'attendees' | 'achievements' | 'items';

const STORAGE_KEY = 'flashagenda_collapsed_sections';

// Collapsed state is a per-browser view preference shared by all agendas; any storage error means "expanded"
const readCollapsedSections = (): Partial<Record<CollapsibleSectionId, boolean>> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

export function useCollapsedSection(sectionId: CollapsibleSectionId): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState<boolean>(() => readCollapsedSections()[sectionId] === true);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readCollapsedSections(), [sectionId]: next }));
      } catch {
        // Storage unavailable (private mode, blocked site data): keep the in-memory state only
      }
      return next;
    });
  }, [sectionId]);

  return [collapsed, toggle];
}
