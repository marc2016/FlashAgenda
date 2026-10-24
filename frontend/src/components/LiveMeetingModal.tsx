import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { ProgressBar } from 'primereact/progressbar';
import { InputTextarea } from 'primereact/inputtextarea';
import { PersonChip, getAttendeeColor } from './PersonChip';
import { format } from 'date-fns';
import { CARD_COLOR_PALETTE } from './AgendaAttendees';
import { PinnedAchievementBadge } from './PinnedAchievementBadge';
import { calculateAttendeeItemCounts, formatTimer } from '../utils/attendeeUtils';
import { MDXEditor } from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import { READONLY_PLUGINS } from '../utils/markdownPlugins';
import CreateFollowUpAgendaDialog from './CreateFollowUpAgendaDialog';

export { formatTimer } from '../utils/attendeeUtils';

export type LiveMeetingPhase = 'intro' | 'roll_call_step' | 'roll_call_summary' | 'agenda_items' | 'summary';

interface LiveMeetingModalProps {
  visible: boolean;
  onHide: () => void;
  agenda: any;
  items: any[];
  attendees: any[];
  currentUser?: any;
  onUpdateAgenda: (updates: any) => Promise<void> | void;
  onUpdateItems: (items: any[]) => Promise<void> | void;
}

export const getCardColor = (att: any, index: number = 0): string => {
  return att?.cardColor || CARD_COLOR_PALETTE[index % CARD_COLOR_PALETTE.length] || '#0a4b7c';
};

export const getCardBackground = (att: any, index: number = 0): string => {
  const color = getCardColor(att, index);
  if (color.startsWith('linear-gradient')) {
    return color;
  }
  return `linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(0, 0, 0, 0.25) 100%), ${color}`;
};

export const formatDate = (dateInput?: string | Date) => {
  if (!dateInput) return 'Unbekannt';
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return 'Unbekannt';

    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSec < 60 && diffSec >= -5) {
      return 'Jetzt online';
    }
    if (diffSec < 3600 && diffSec >= 60) {
      const mins = Math.floor(diffSec / 60);
      return `Vor ${mins} Min.`;
    }
    if (diffSec < 86400 && diffSec >= 3600) {
      const hours = Math.floor(diffSec / 3600);
      return `Vor ${hours} Std.`;
    }

    return format(date, 'dd.MM.yyyy HH:mm');
  } catch {
    return 'Unbekannt';
  }
};

export const isUserOnline = (lastSeen?: string | Date) => {
  if (!lastSeen) return false;
  try {
    const date = typeof lastSeen === 'string' ? new Date(lastSeen) : lastSeen;
    if (isNaN(date.getTime())) return false;
    const diffSec = (Date.now() - date.getTime()) / 1000;
    return diffSec >= -5 && diffSec < 120;
  } catch {
    return false;
  }
};

export const calculateSessionSeconds = (agenda: any, now: number = Date.now()): number => {
  if (!agenda) return 0;
  const base = typeof agenda.liveMeetingElapsedSeconds === 'number' ? agenda.liveMeetingElapsedSeconds : 0;
  if (!agenda.liveMeetingPaused && agenda.liveMeetingActive && agenda.liveMeetingStartedAt) {
    const startMs = new Date(agenda.liveMeetingStartedAt).getTime();
    if (!isNaN(startMs)) {
      const diffSec = Math.max(0, Math.floor((now - startMs) / 1000));
      return base + diffSec;
    }
  }
  return base;
};

export const calculateItemSeconds = (agenda: any, targetItem?: any, now: number = Date.now()): number => {
  if (!agenda) return targetItem?.durationSeconds || 0;
  const base = typeof agenda.liveMeetingCurrentItemElapsedSeconds === 'number' && agenda.liveMeetingCurrentItemElapsedSeconds > 0
    ? agenda.liveMeetingCurrentItemElapsedSeconds
    : (targetItem?.durationSeconds || 0);

  if (agenda.liveMeetingPhase === 'agenda_items' && !agenda.liveMeetingPaused && agenda.liveMeetingActive && agenda.liveMeetingItemStartedAt) {
    const startMs = new Date(agenda.liveMeetingItemStartedAt).getTime();
    if (!isNaN(startMs)) {
      const diffSec = Math.max(0, Math.floor((now - startMs) / 1000));
      return base + diffSec;
    }
  }
  return base;
};

const plural = (count: number, singular: string, pluralForm: string): string =>
  `${count} ${count === 1 ? singular : pluralForm}`;

const hasValidDate = (dateInput?: string | Date): boolean => {
  if (!dateInput) return false;
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return !isNaN(date.getTime());
};

// Dark comic panel that sits directly on the red presentation stage
const Panel: React.FC<{
  title?: React.ReactNode;
  icon?: string;
  aside?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  testId?: string;
}> = ({ title, icon, aside, className = '', style, children, testId }) => (
  <div className={`comic-panel-dark p-3 sm:p-4 ${className}`} style={style} data-testid={testId}>
    {title && (
      <div className="flex align-items-center justify-content-between gap-2 mb-3">
        <span className="text-xs sm:text-sm font-bold text-yellow-400 uppercase flex align-items-center gap-2">
          {icon && <i className={icon} />}
          {title}
        </span>
        {aside}
      </div>
    )}
    {children}
  </div>
);

// Avatar + details of a person card; empty fields (no email, unknown last seen) are omitted
const PersonCardBody: React.FC<{ att: any; count: number }> = ({ att, count }) => (
  <div className="flex flex-1 text-white p-3 sm:p-4 align-items-center">
    <div className="relative flex align-items-center justify-content-center border-right-1 border-white-alpha-30 pr-2 sm:pr-4 mr-2 sm:mr-4 flex-shrink-0">
      {att.avatarUrl ? (
        <img
          src={att.avatarUrl}
          alt={att.name}
          style={{ width: '4.5rem', height: '4.5rem', objectFit: 'cover' }}
          className="border-circle border-2 border-white-alpha-40"
          loading="lazy"
        />
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          style={{ width: '4.5rem', height: '4.5rem' }}
          className="text-white-alpha-90"
        >
          <path d="M12,19.2C9.5,19.2 7.29,17.92 6,16C6.03,14 10,12.9 12,12.9C14,12.9 17.97,14 18,16C16.71,17.92 14.5,19.2 12,19.2M12,5A3,3 0 0,1 15,8A3,3 0 0,1 12,11A3,3 0 0,1 9,8A3,3 0 0,1 12,5M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12C22,6.47 17.5,2 12,2Z" />
        </svg>
      )}
    </div>

    <div className="flex flex-column flex-1 justify-content-center m-0 p-0 min-w-0">
      <div className="font-bold text-lg sm:text-2xl overflow-hidden text-overflow-ellipsis white-space-nowrap text-white mb-1 sm:mb-2">
        {att.name}
      </div>

      <div className="flex flex-column gap-1 text-xs sm:text-sm text-white-alpha-90">
        {att.email && (
          <div>
            <strong className="block text-3xs sm:text-xs text-white-alpha-60 uppercase tracking-wide mt-1 mb-0">E-Mail</strong>
            <a
              href={`mailto:${att.email}`}
              className="m-0 p-0 line-height-1 text-white-alpha-90 hover:text-yellow-300 flex align-items-center gap-1 font-semibold overflow-hidden text-overflow-ellipsis"
              title={att.email}
            >
              <i className="mdi mdi-email text-yellow-400 text-xs flex-shrink-0" />
              <span className="overflow-hidden text-overflow-ellipsis white-space-nowrap">{att.email}</span>
            </a>
          </div>
        )}
        {hasValidDate(att.lastSeen) && (
          <div>
            <strong className="block text-3xs sm:text-xs text-white-alpha-60 uppercase tracking-wide mt-1 mb-0">Zuletzt online</strong>
            <span className={`m-0 p-0 line-height-1 ${isUserOnline(att.lastSeen) ? 'text-green-300 font-bold' : ''}`}>
              {formatDate(att.lastSeen)}
            </span>
          </div>
        )}
        <div>
          <strong className="block text-3xs sm:text-xs text-white-alpha-60 uppercase tracking-wide mt-1 mb-0">Erstellte Punkte</strong>
          <span className="m-0 p-0 line-height-1 font-bold text-yellow-300">{plural(count, 'Punkt', 'Punkte')}</span>
        </div>

        {att.pinnedAchievements && att.pinnedAchievements.length > 0 && (
          <div className="flex align-items-center mt-1.5 pt-1 border-top-1 border-white-alpha-20" style={{ gap: '0.75rem' }}>
            {att.pinnedAchievements.slice(0, 3).map((achId: string) => (
              <PinnedAchievementBadge key={achId} achId={achId} size="small" />
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
);

export const LiveMeetingModal: React.FC<LiveMeetingModalProps> = ({
  visible,
  onHide,
  agenda,
  items = [],
  attendees = [],
  currentUser,
  onUpdateAgenda,
  onUpdateItems,
}) => {
  const [phase, setPhase] = useState<LiveMeetingPhase>('intro');
  const [currentAttendeeIndex, setCurrentAttendeeIndex] = useState(0);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [showItemDrawer, setShowItemDrawer] = useState(false);
  const [showFollowUpDialog, setShowFollowUpDialog] = useState(false);

  // Local mirrors for instantaneous UI responsiveness
  const [localAttendees, setLocalAttendees] = useState<any[]>(attendees);
  const [localItems, setLocalItems] = useState<any[]>(items);

  // Keep local copies in sync when external props update
  useEffect(() => {
    if (attendees) setLocalAttendees(attendees);
  }, [attendees]);

  useEffect(() => {
    if (items) setLocalItems(items);
  }, [items]);

  // Screen Wake Lock
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const wakeLockRef = useRef<any>(null);

  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        setWakeLockActive(true);
        wakeLockRef.current.addEventListener('release', () => {
          setWakeLockActive(false);
        });
      } catch (err) {
        console.warn('Wake Lock request failed:', err);
        setWakeLockActive(false);
      }
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch (err) {
        console.warn('Wake Lock release failed:', err);
      }
      wakeLockRef.current = null;
      setWakeLockActive(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      requestWakeLock();
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && visible) {
          requestWakeLock();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        releaseWakeLock();
      };
    } else {
      releaseWakeLock();
    }
  }, [visible, requestWakeLock, releaseWakeLock]);

  // Timers
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [itemSeconds, setItemSeconds] = useState(0);
  const [isSessionRunning, setIsSessionRunning] = useState(true);
  const isInitializedRef = useRef(false);
  const prevItemIndexRef = useRef<number>(-1);
  const prevPhaseRef = useRef<LiveMeetingPhase | null>(null);

  // Toggle pause/resume for both session and item timers
  const handleTogglePause = () => {
    const isCurrentlyRunning = !agenda?.liveMeetingPaused;
    const now = Date.now();
    const curSessionSec = calculateSessionSeconds(agenda, now);
    const targetItem = (localItems || [])[currentItemIndex];
    const curItemSec = calculateItemSeconds(agenda, targetItem, now);

    if (isCurrentlyRunning) {
      // Pause: accumulate elapsed seconds on server and clear startedAt
      setIsSessionRunning(false);
      if (phase === 'agenda_items' && curItemSec > 0) {
        saveCurrentItemDuration(currentItemIndex, curItemSec);
      }
      onUpdateAgenda({
        liveMeetingPaused: true,
        liveMeetingElapsedSeconds: curSessionSec,
        liveMeetingCurrentItemElapsedSeconds: curItemSec,
        liveMeetingStartedAt: null,
        liveMeetingItemStartedAt: null,
        liveMeetingPhase: phase,
        liveMeetingCurrentItemIndex: currentItemIndex,
        liveMeetingCurrentAttendeeIndex: currentAttendeeIndex,
      });
    } else {
      // Resume: set new start timestamps from now, keeping accumulated seconds
      setIsSessionRunning(true);
      const isoNow = new Date().toISOString();
      onUpdateAgenda({
        liveMeetingPaused: false,
        liveMeetingElapsedSeconds: curSessionSec,
        liveMeetingCurrentItemElapsedSeconds: curItemSec,
        liveMeetingStartedAt: isoNow,
        liveMeetingItemStartedAt: isoNow,
        liveMeetingPhase: phase,
        liveMeetingCurrentItemIndex: currentItemIndex,
        liveMeetingCurrentAttendeeIndex: currentAttendeeIndex,
      });
    }
  };

  // Quick note / decision state
  const [quickNote, setQuickNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [copiedProtocol, setCopiedProtocol] = useState(false);

  // Reset or restore indices and timers only once when modal opens
  useEffect(() => {
    if (visible && !isInitializedRef.current) {
      isInitializedRef.current = true;
      const isResuming =
        agenda?.liveMeetingStatus === 'in_progress' ||
        (agenda?.liveMeetingElapsedSeconds || 0) > 0 ||
        !!agenda?.liveMeetingPhase;

      let initialPhase: LiveMeetingPhase = 'intro';
      let initialItemIdx = 0;
      let initialAttIdx = 0;

      if (isResuming && agenda?.liveMeetingPhase) {
        initialPhase = agenda.liveMeetingPhase as LiveMeetingPhase;
        const restoredItemIdx = typeof agenda.liveMeetingCurrentItemIndex === 'number' ? agenda.liveMeetingCurrentItemIndex : 0;
        const restoredAttIdx = typeof agenda.liveMeetingCurrentAttendeeIndex === 'number' ? agenda.liveMeetingCurrentAttendeeIndex : 0;
        initialItemIdx = Math.min(restoredItemIdx, Math.max(0, (items || []).length - 1));
        initialAttIdx = Math.min(restoredAttIdx, Math.max(0, (attendees || []).length - 1));
      } else if (isResuming && typeof agenda?.liveMeetingCurrentItemIndex === 'number') {
        initialPhase = 'agenda_items';
        initialItemIdx = Math.min(agenda.liveMeetingCurrentItemIndex, Math.max(0, (items || []).length - 1));
        initialAttIdx = 0;
      }

      setPhase(initialPhase);
      setCurrentItemIndex(initialItemIdx);
      setCurrentAttendeeIndex(initialAttIdx);

      const now = Date.now();
      const targetItem = (items || [])[initialItemIdx];
      setSessionSeconds(calculateSessionSeconds(agenda, now));
      setItemSeconds(calculateItemSeconds(agenda, targetItem, now));

      prevItemIndexRef.current = initialItemIdx;
      prevPhaseRef.current = initialPhase;

      const initialRunning = !agenda?.liveMeetingPaused;
      setIsSessionRunning(initialRunning);
      setLocalAttendees(attendees || []);
      setLocalItems(items || []);
    } else if (!visible) {
      isInitializedRef.current = false;
      prevItemIndexRef.current = -1;
      prevPhaseRef.current = null;
    }
  }, [visible, agenda, attendees, items]);

  // Synchronize state when external agenda updates arrive from server or other devices
  useEffect(() => {
    if (!visible || !isInitializedRef.current || !agenda) return;

    // External phase change
    if (agenda.liveMeetingPhase && agenda.liveMeetingPhase !== phase) {
      setPhase(agenda.liveMeetingPhase as LiveMeetingPhase);
    }

    // External item index change
    if (
      typeof agenda.liveMeetingCurrentItemIndex === 'number' &&
      agenda.liveMeetingCurrentItemIndex !== currentItemIndex
    ) {
      const validIdx = Math.min(
        agenda.liveMeetingCurrentItemIndex,
        Math.max(0, (items || []).length - 1)
      );
      setCurrentItemIndex(validIdx);
    }

    // External attendee index change
    if (
      typeof agenda.liveMeetingCurrentAttendeeIndex === 'number' &&
      agenda.liveMeetingCurrentAttendeeIndex !== currentAttendeeIndex
    ) {
      const validIdx = Math.min(
        agenda.liveMeetingCurrentAttendeeIndex,
        Math.max(0, (attendees || []).length - 1)
      );
      setCurrentAttendeeIndex(validIdx);
    }

    // External pause state change
    if (agenda.liveMeetingPaused !== undefined) {
      const shouldBeRunning = !agenda.liveMeetingPaused;
      if (shouldBeRunning !== isSessionRunning) {
        setIsSessionRunning(shouldBeRunning);
      }
    }

    // If meeting was closed externally
    if (agenda.liveMeetingActive === false && visible) {
      if (agenda.liveMeetingStatus === 'completed') {
        setPhase('summary');
      } else {
        onHide();
      }
    }
  }, [
    visible,
    agenda?.liveMeetingPhase,
    agenda?.liveMeetingCurrentItemIndex,
    agenda?.liveMeetingCurrentAttendeeIndex,
    agenda?.liveMeetingPaused,
    agenda?.liveMeetingActive,
    agenda?.liveMeetingStatus,
    items,
    attendees,
    phase,
    currentItemIndex,
    currentAttendeeIndex,
    isSessionRunning,
    onHide,
  ]);

  // Server-authoritative timer ticker (calculates elapsed seconds based on Date.now() and server timestamps)
  useEffect(() => {
    if (!visible) return;
    const updateTimers = () => {
      const now = Date.now();
      const currentItem = (localItems || [])[currentItemIndex];
      setSessionSeconds(calculateSessionSeconds(agenda, now));
      setItemSeconds(calculateItemSeconds(agenda, currentItem, now));
    };

    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [visible, agenda, localItems, currentItemIndex]);

  // Attendee statistics
  const presentCount = useMemo(
    () => localAttendees.filter((a) => a.attendanceStatus === 'present').length,
    [localAttendees]
  );
  const absentCount = useMemo(
    () => localAttendees.filter((a) => a.attendanceStatus === 'absent').length,
    [localAttendees]
  );
  const totalAttendees = localAttendees.length;
  const attendanceRate = totalAttendees > 0 ? Math.round((presentCount / totalAttendees) * 100) : 0;

  // Item counts per attendee (robust, excludes system items, avoids duplicate counting)
  const itemCounts = useMemo(() => {
    return calculateAttendeeItemCounts(localItems, localAttendees);
  }, [localItems, localAttendees]);

  // Item statistics
  const totalItems = localItems.length;
  const completedItemsCount = useMemo(
    () => localItems.filter((i) => i.completed).length,
    [localItems]
  );

  // Current active attendee & item
  const currentAttendee = localAttendees[currentAttendeeIndex] || null;
  const currentItem = localItems[currentItemIndex] || null;

  // Save current item duration
  const saveCurrentItemDuration = useCallback(
    (itemIdx: number, elapsedSec: number) => {
      if (elapsedSec <= 0) return;
      setLocalItems((prev) => {
        const updated = prev.map((item, idx) => {
          if (idx === itemIdx) {
            return {
              ...item,
              durationSeconds: Math.max(item.durationSeconds || 0, elapsedSec),
            };
          }
          return item;
        });
        onUpdateItems(updated);
        return updated;
      });
    },
    [onUpdateItems]
  );

  // Helper to persist attendees
  const saveAttendees = useCallback(
    async (updatedAttendees: any[], additionalUpdates: any = {}) => {
      setLocalAttendees(updatedAttendees);
      try {
        await onUpdateAgenda({
          attendees: updatedAttendees,
          ...additionalUpdates,
        });
      } catch (err) {
        console.error('Failed to update attendees attendance:', err);
      }
    },
    [onUpdateAgenda]
  );

  // Current user ID
  const currentUserId = useMemo(() => {
    return currentUser?.id || currentUser?._id || currentUser?.name;
  }, [currentUser]);

  // Check if current user has liked current item
  const hasLiked = useMemo(() => {
    return !!(currentUserId && (currentItem?.upvotes || []).includes(currentUserId));
  }, [currentUserId, currentItem?.upvotes]);

  // Toggle like on current item
  const handleToggleLikeCurrentItem = async () => {
    if (!currentUserId || !currentItem) return;
    const currentLikes: string[] = currentItem.upvotes || [];
    const updatedLikes = currentLikes.includes(currentUserId)
      ? currentLikes.filter((id) => id !== currentUserId)
      : [...currentLikes, currentUserId];

    const updated = localItems.map((it, idx) => {
      if (idx === currentItemIndex) {
        return { ...it, upvotes: updatedLikes };
      }
      return it;
    });
    setLocalItems(updated);
    await onUpdateItems(updated);
  };

  // Toggle pin on current item
  const handleTogglePinCurrentItem = async () => {
    if (!currentItem) return;
    const updated = localItems.map((it, idx) => {
      if (idx === currentItemIndex) {
        return { ...it, pinned: !it.pinned };
      }
      return it;
    });
    setLocalItems(updated);
    await onUpdateItems(updated);
  };

  // Close meeting helper
  const handleCloseMeeting = async (status: 'completed' | 'in_progress' = 'in_progress') => {
    const now = Date.now();
    const curSession = calculateSessionSeconds(agenda, now);
    const targetItem = (localItems || [])[currentItemIndex];
    const curItem = calculateItemSeconds(agenda, targetItem, now);
    if (curItem > 0 && phase === 'agenda_items') {
      saveCurrentItemDuration(currentItemIndex, curItem);
    }
    if (status === 'completed') {
      await onUpdateAgenda({
        liveMeetingActive: false,
        liveMeetingStatus: 'completed',
        liveMeetingElapsedSeconds: curSession,
        liveMeetingCurrentItemElapsedSeconds: curItem,
        liveMeetingStartedAt: null,
        liveMeetingItemStartedAt: null,
        liveMeetingPhase: phase,
        liveMeetingCurrentItemIndex: currentItemIndex,
        liveMeetingCurrentAttendeeIndex: currentAttendeeIndex,
        liveMeetingPaused: true,
      });
    } else {
      // User exits the view on their device: meeting stays active and running on server!
      await onUpdateAgenda({
        liveMeetingActive: true,
        liveMeetingStatus: 'in_progress',
        liveMeetingPhase: phase,
        liveMeetingCurrentItemIndex: currentItemIndex,
        liveMeetingCurrentAttendeeIndex: currentAttendeeIndex,
      });
    }
    onHide();
  };

  // Protocol generator
  const generateProtocolMarkdown = () => {
    let md = `# Sitzungsprotokoll: ${agenda?.title || 'Agenda'}\n\n`;
    md += `- **Datum:** ${agenda?.date ? format(new Date(agenda.date), 'dd.MM.yyyy HH:mm') : 'Unbekannt'}\n`;
    md += `- **Gesamtdauer:** ${formatTimer(sessionSeconds)}\n`;
    md += `- **Anwesenheit:** ${presentCount} von ${totalAttendees} anwesend (${attendanceRate}%)\n\n`;

    md += `## Teilnehmer\n`;
    localAttendees.forEach((att) => {
      const statusLabel = att.attendanceStatus === 'present' ? 'Anwesend' : att.attendanceStatus === 'absent' ? 'Abwesend' : 'Unbestätigt';
      md += `- ${att.name} (${statusLabel})\n`;
    });
    md += `\n`;

    md += `## Tagesordnungspunkte (${completedItemsCount}/${totalItems} besprochen)\n\n`;
    localItems.forEach((it, idx) => {
      const statusLabel = it.completed ? 'Besprochen' : 'Offen';
      const durationStr = formatTimer(it.durationSeconds || 0);
      md += `### TOP ${idx + 1}: ${it.title} [${statusLabel} | Dauer: ${durationStr}]\n`;
      if (it.description) {
        md += `${it.description}\n\n`;
      }
      const notes = (it.comments || []).filter((c: any) => c.text && (c.text.startsWith('📝') || c.text.includes('Sitzungsnotiz')));
      if (notes.length > 0) {
        md += `**Beschlüsse & Notizen:**\n`;
        notes.forEach((n: any) => {
          md += `- ${n.text.replace(/^📝\s*\*\*Sitzungsnotiz \/ Beschluss:\*\*\s*/, '')} (${n.author || 'Notiz'})\n`;
        });
        md += `\n`;
      }
      if (it.poll && it.poll.options) {
        md += `**Abstimmung:** ${it.poll.question || 'Umfrage'}\n`;
        it.poll.options.forEach((opt: any) => {
          md += `- ${opt.text}: ${plural(opt.votes?.length || 0, 'Stimme', 'Stimmen')}\n`;
        });
        md += `\n`;
      }
    });

    return md;
  };

  const handleCopyProtocol = async () => {
    try {
      const md = generateProtocolMarkdown();
      await navigator.clipboard.writeText(md);
      setCopiedProtocol(true);
      setTimeout(() => setCopiedProtocol(false), 3000);
    } catch (err) {
      console.error('Failed to copy protocol:', err);
    }
  };

  const handleDownloadProtocol = () => {
    try {
      const md = generateProtocolMarkdown();
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Protokoll_${(agenda?.title || 'Sitzung').replace(/[^a-zA-Z0-9_-]/g, '_')}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download protocol:', err);
    }
  };

  // Roll call actions
  const handleRecordAttendance = async (status: 'present' | 'absent') => {
    if (!currentAttendee) return;
    const updated = localAttendees.map((att, idx) => {
      if (idx === currentAttendeeIndex) {
        return { ...att, attendanceStatus: status };
      }
      return att;
    });

    const nextIndex = currentAttendeeIndex + 1;
    const isLastAttendee = nextIndex >= localAttendees.length;
    const nextPhase: LiveMeetingPhase = isLastAttendee ? 'roll_call_summary' : 'roll_call_step';

    await saveAttendees(updated, {
      liveMeetingPhase: nextPhase,
      liveMeetingCurrentAttendeeIndex: isLastAttendee ? currentAttendeeIndex : nextIndex,
      liveMeetingElapsedSeconds: sessionSeconds,
    });

    if (!isLastAttendee) {
      setCurrentAttendeeIndex(nextIndex);
    } else {
      setPhase('roll_call_summary');
    }
  };

  const handleSkipAttendee = async () => {
    const nextIndex = currentAttendeeIndex + 1;
    const isLastAttendee = nextIndex >= localAttendees.length;
    const nextPhase: LiveMeetingPhase = isLastAttendee ? 'roll_call_summary' : 'roll_call_step';

    await onUpdateAgenda({
      liveMeetingPhase: nextPhase,
      liveMeetingCurrentAttendeeIndex: isLastAttendee ? currentAttendeeIndex : nextIndex,
      liveMeetingElapsedSeconds: sessionSeconds,
    });

    if (!isLastAttendee) {
      setCurrentAttendeeIndex(nextIndex);
    } else {
      setPhase('roll_call_summary');
    }
  };

  const handlePrevAttendee = async () => {
    if (currentAttendeeIndex > 0) {
      const prevIndex = currentAttendeeIndex - 1;
      setCurrentAttendeeIndex(prevIndex);
      await onUpdateAgenda({
        liveMeetingCurrentAttendeeIndex: prevIndex,
        liveMeetingPhase: 'roll_call_step',
        liveMeetingElapsedSeconds: sessionSeconds,
      });
    }
  };

  const handleToggleSummaryStatus = async (attendeeIdx: number, newStatus: 'present' | 'absent') => {
    const updated = localAttendees.map((att, idx) => {
      if (idx === attendeeIdx) {
        // Toggle if clicked same, or set new
        const finalStatus = att.attendanceStatus === newStatus ? 'unconfirmed' : newStatus;
        return { ...att, attendanceStatus: finalStatus };
      }
      return att;
    });
    await saveAttendees(updated, {
      liveMeetingPhase: 'roll_call_summary',
      liveMeetingElapsedSeconds: sessionSeconds,
    });
  };

  // Agenda Item Actions

  const handleNextItem = async (markAsCompleted = true) => {
    const now = Date.now();
    const targetItem = (localItems || [])[currentItemIndex];
    const elapsed = calculateItemSeconds(agenda, targetItem, now);
    const updated = localItems.map((item, idx) => {
      if (idx === currentItemIndex) {
        return {
          ...item,
          durationSeconds: Math.max(item.durationSeconds || 0, elapsed),
          completed: markAsCompleted ? true : item.completed,
        };
      }
      return item;
    });
    setLocalItems(updated);
    try {
      await onUpdateItems(updated);
    } catch (err) {
      console.error('Failed to update item on next:', err);
    }

    const curSession = calculateSessionSeconds(agenda, now);
    const isRunning = !agenda?.liveMeetingPaused;
    const isoNow = new Date().toISOString();

    if (currentItemIndex + 1 < localItems.length) {
      const nextIdx = currentItemIndex + 1;
      const nextDuration = updated[nextIdx]?.durationSeconds || 0;
      setCurrentItemIndex(nextIdx);
      setItemSeconds(nextDuration);
      await onUpdateAgenda({
        liveMeetingCurrentItemIndex: nextIdx,
        liveMeetingCurrentItemElapsedSeconds: nextDuration,
        liveMeetingItemStartedAt: isRunning ? isoNow : null,
        liveMeetingPhase: 'agenda_items',
        liveMeetingElapsedSeconds: curSession,
        liveMeetingStartedAt: isRunning ? (agenda?.liveMeetingStartedAt || isoNow) : null,
        liveMeetingPaused: !isRunning,
      });
    } else {
      setPhase('summary');
      await onUpdateAgenda({
        liveMeetingPhase: 'summary',
        liveMeetingElapsedSeconds: curSession,
        liveMeetingItemStartedAt: null,
        liveMeetingPaused: !isRunning,
      });
    }
  };

  const handlePrevItem = async () => {
    if (currentItemIndex > 0) {
      const now = Date.now();
      const targetItem = (localItems || [])[currentItemIndex];
      const elapsed = calculateItemSeconds(agenda, targetItem, now);
      let updated = localItems;
      if (elapsed > 0) {
        updated = localItems.map((item, idx) => {
          if (idx === currentItemIndex) {
            return {
              ...item,
              durationSeconds: Math.max(item.durationSeconds || 0, elapsed),
            };
          }
          return item;
        });
        setLocalItems(updated);
        try {
          await onUpdateItems(updated);
        } catch (err) {
          console.error('Failed to update item duration on prev:', err);
        }
      }
      const curSession = calculateSessionSeconds(agenda, now);
      const isRunning = !agenda?.liveMeetingPaused;
      const isoNow = new Date().toISOString();
      const prevIdx = currentItemIndex - 1;
      const prevDuration = updated[prevIdx]?.durationSeconds || 0;
      setCurrentItemIndex(prevIdx);
      setItemSeconds(prevDuration);
      await onUpdateAgenda({
        liveMeetingCurrentItemIndex: prevIdx,
        liveMeetingCurrentItemElapsedSeconds: prevDuration,
        liveMeetingItemStartedAt: isRunning ? isoNow : null,
        liveMeetingPhase: 'agenda_items',
        liveMeetingElapsedSeconds: curSession,
        liveMeetingStartedAt: isRunning ? (agenda?.liveMeetingStartedAt || isoNow) : null,
        liveMeetingPaused: !isRunning,
      });
    }
  };

  const handleJumpToItem = async (index: number) => {
    const now = Date.now();
    let updated = localItems;
    if (phase === 'agenda_items') {
      const targetItem = (localItems || [])[currentItemIndex];
      const elapsed = calculateItemSeconds(agenda, targetItem, now);
      if (elapsed > 0) {
        updated = localItems.map((item, idx) => {
          if (idx === currentItemIndex) {
            return {
              ...item,
              durationSeconds: Math.max(item.durationSeconds || 0, elapsed),
            };
          }
          return item;
        });
        setLocalItems(updated);
        try {
          await onUpdateItems(updated);
        } catch (err) {
          console.error('Failed to update item duration on jump:', err);
        }
      }
    }
    const curSession = calculateSessionSeconds(agenda, now);
    const isRunning = !agenda?.liveMeetingPaused;
    const isoNow = new Date().toISOString();
    const targetDuration = updated[index]?.durationSeconds || 0;
    setCurrentItemIndex(index);
    setItemSeconds(targetDuration);
    setShowItemDrawer(false);
    await onUpdateAgenda({
      liveMeetingCurrentItemIndex: index,
      liveMeetingCurrentItemElapsedSeconds: targetDuration,
      liveMeetingItemStartedAt: isRunning ? isoNow : null,
      liveMeetingPhase: 'agenda_items',
      liveMeetingElapsedSeconds: curSession,
      liveMeetingStartedAt: isRunning ? (agenda?.liveMeetingStartedAt || isoNow) : null,
      liveMeetingPaused: !isRunning,
    });
  };

  const handleStartAgendaItems = async (startIdx = 0) => {
    const now = new Date().toISOString();
    const startDuration = (localItems || [])[startIdx]?.durationSeconds || 0;
    setCurrentItemIndex(startIdx);
    setPhase('agenda_items');
    await onUpdateAgenda({
      liveMeetingPhase: 'agenda_items',
      liveMeetingCurrentItemIndex: startIdx,
      liveMeetingCurrentItemElapsedSeconds: startDuration,
      liveMeetingItemStartedAt: isSessionRunning ? now : null,
      liveMeetingElapsedSeconds: sessionSeconds,
      liveMeetingStartedAt: isSessionRunning ? (agenda?.liveMeetingStartedAt || now) : null,
      liveMeetingPaused: !isSessionRunning,
    });
  };

  // Add quick decision note to current item
  const handleAddQuickNote = async () => {
    if (!quickNote.trim() || !currentItem) return;
    setIsSavingNote(true);
    try {
      const noteAuthor = currentUser?.name || 'Moderator';
      const newComment = {
        id: `note_${Date.now()}`,
        author: noteAuthor,
        createdBy: currentUser?.id || currentUser?._id,
        text: `📝 **Sitzungsnotiz / Beschluss:** ${quickNote.trim()}`,
        createdAt: new Date().toISOString()
      };

      const updated = localItems.map((item, idx) => {
        if (idx === currentItemIndex) {
          const comments = item.comments ? [...item.comments, newComment] : [newComment];
          return { ...item, comments };
        }
        return item;
      });

      setLocalItems(updated);
      await onUpdateItems(updated);
      setQuickNote('');
    } catch (err) {
      console.error('Failed to save quick note:', err);
    } finally {
      setIsSavingNote(false);
    }
  };

  const renderStatTile = (icon: string, value: React.ReactNode, label: string, valueClass = 'text-yellow-400') => (
    <div className="comic-panel-dark px-3 sm:px-4 py-3 flex align-items-center gap-3 min-w-0">
      <i className={`${icon} text-yellow-500 text-2xl flex-shrink-0`} />
      <div className="flex flex-column min-w-0">
        <span className={`text-xl sm:text-2xl font-bold line-height-2 ${valueClass}`}>{value}</span>
        <span className="text-xs text-gray-300 font-bold uppercase">{label}</span>
      </div>
    </div>
  );

  const tileGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '0.75rem',
  };

  return (
    <Dialog
      visible={visible}
      onHide={() => handleCloseMeeting('in_progress')}
      maximized
      blockScroll={true}
      dismissableMask={false}
      showHeader={false}
      focusOnShow={false}
      className="live-meeting-dialog m-0 p-0"
      maskClassName="live-meeting-mask"
      contentStyle={{
        color: '#f9fafb',
        padding: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw'
      }}
    >
      {/* ─── TOP BAR: compact pill in the style of the agenda action bar ─── */}
      <div className="flex-shrink-0 px-3 sm:px-4 pt-3 sm:pt-4 z-5">
        <header
          data-testid="live-topbar"
          className="flex align-items-center justify-content-between gap-2 mx-auto"
          style={{
            maxWidth: '1200px',
            background: 'rgba(0,0,0,0.85)',
            borderRadius: '999px',
            padding: '4px 6px 4px 14px',
            border: '1px solid rgba(234,179,8,0.3)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)'
          }}
        >
          {/* Left: Icon & Title */}
          <div className="flex align-items-center gap-2 min-w-0">
            <i className="pi pi-play text-yellow-400 text-sm flex-shrink-0" />
            <span className="font-bold text-yellow-400 text-xs sm:text-sm white-space-nowrap">Live</span>
            {agenda?.title && (
              <span className="text-gray-200 text-xs sm:text-sm font-semibold white-space-nowrap overflow-hidden text-overflow-ellipsis hidden sm:inline" style={{ maxWidth: '18rem' }}>
                {agenda.title}
              </span>
            )}
          </div>

          {/* Center: labelled timers */}
          <div className="flex align-items-center gap-1 sm:gap-2">
            {!isSessionRunning && (
              <div
                className="flex align-items-center gap-1 px-2 py-1 border-round-xl text-xs font-bold text-red-200 animate-pulse"
                style={{ backgroundColor: 'rgba(127, 29, 29, 0.8)', border: '1px solid #ef4444' }}
                title="Sitzung ist aktuell pausiert"
                data-testid="paused-indicator"
              >
                <i className="pi pi-pause text-red-300 text-xs" />
                <span className="text-3xs sm:text-xs">PAUSIERT</span>
              </div>
            )}

            {phase === 'agenda_items' && (
              <div
                className="flex align-items-center gap-1 sm:gap-2 px-2 py-1 border-round-xl bg-black-alpha-40 font-mono font-bold text-xs sm:text-sm"
                title="Dauer für aktuellen Agendapunkt (TOP)"
                data-testid="item-timer-display"
              >
                <i className="pi pi-check-square text-blue-400 text-xs sm:text-sm" />
                <small className="live-timer-label">TOP</small>
                <span className="text-blue-200">{formatTimer(itemSeconds)}</span>
              </div>
            )}

            <div
              className="flex align-items-center gap-1 sm:gap-2 px-2 py-1 border-round-xl bg-black-alpha-40 font-mono font-bold text-xs sm:text-sm text-white"
              title="Gesamte Sitzungsdauer"
              data-testid="session-timer-display"
            >
              <i className="pi pi-clock text-yellow-400 text-xs sm:text-sm" />
              <small className="live-timer-label">Gesamt</small>
              <span>{formatTimer(sessionSeconds)}</span>
            </div>
          </div>

          {/* Right: Wake lock indicator & Close */}
          <div className="flex align-items-center gap-1 flex-shrink-0">
            {wakeLockActive && (
              <span
                className="text-yellow-400 text-xs hidden md:flex align-items-center gap-1 font-semibold"
                title="Bildschirm bleibt aktiv (WakeLock aktiv)"
              >
                <i className="pi pi-sun text-sm" />
                <span>Aktiv</span>
              </span>
            )}
            <Button
              icon="pi pi-times"
              rounded
              text
              size="small"
              className="text-gray-300 hover:text-yellow-400"
              style={{ width: '2.2rem', height: '2.2rem' }}
              onClick={() => handleCloseMeeting('in_progress')}
              title="Sitzungsmodus verlassen"
              aria-label="Sitzungsmodus verlassen"
              data-testid="close-live-meeting-btn"
            />
          </div>
        </header>
      </div>

      {/* ─── STAGE: red background, panels scroll ─── */}
      <main className="flex-1 overflow-y-auto flex flex-column">
        <div className="w-full mx-auto flex flex-column flex-1 px-3 sm:px-4 md:px-5 py-3 sm:py-4" style={{ maxWidth: '1200px' }}>

        {/* ═══════════════════════════════════════════════════════════════════════
            PHASE 1: INTRO / TITLE SPLASH
            ═══════════════════════════════════════════════════════════════════════ */}
        {phase === 'intro' && (
          <div className="w-full flex flex-column gap-3 my-auto mx-auto" style={{ maxWidth: '760px' }}>
            <Panel className="flex flex-column align-items-center text-center gap-3">
              <img
                src="/favicon.svg"
                alt="FlashAgenda"
                className="flex-shrink-0"
                style={{ width: 'clamp(5rem, 18vw, 8rem)', height: 'clamp(5rem, 18vw, 8rem)', filter: 'drop-shadow(5px 5px 0 #000)' }}
              />
              <h1
                className="text-3xl sm:text-5xl font-bold m-0 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 line-height-2 word-break-break-word"
                style={{ filter: 'drop-shadow(3px 3px 0px #000)', paddingBottom: '0.1em' }}
              >
                {agenda?.title || 'Agenda'}
              </h1>
            </Panel>

            <div style={{ ...tileGridStyle, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))' }}>
              {agenda?.date && renderStatTile(
                'pi pi-calendar-plus',
                <span className="text-white text-base sm:text-lg">
                  {(() => {
                    try {
                      return format(new Date(agenda.date), 'dd.MM.yyyy · HH:mm');
                    } catch {
                      return agenda.date;
                    }
                  })()}
                </span>,
                'Datum'
              )}
              {agenda?.location?.name && (
                <div className="comic-panel-dark px-3 sm:px-4 py-3 flex align-items-center gap-3 min-w-0">
                  <i className="pi pi-map-marker text-yellow-500 text-2xl flex-shrink-0" />
                  <div className="flex flex-column min-w-0">
                    <span className="text-white text-base sm:text-lg font-bold white-space-nowrap overflow-hidden text-overflow-ellipsis" title={agenda.location.name}>
                      {agenda.location.name}
                    </span>
                    <span className="text-xs text-gray-300 font-bold uppercase">Ort</span>
                  </div>
                </div>
              )}
              {renderStatTile('pi pi-users', totalAttendees, 'Teilnehmer')}
              {renderStatTile('pi pi-list', totalItems, 'Agendapunkte')}
            </div>

            <Panel>
              <div className="flex flex-column sm:flex-row align-items-stretch gap-3">
                {totalAttendees > 0 ? (
                  <Button
                    label="Anwesenheit prüfen"
                    icon="pi pi-users"
                    className="comic-button-success flex-1 py-3 text-base sm:text-lg font-bold flex align-items-center justify-content-center gap-2"
                    onClick={() => {
                      setCurrentAttendeeIndex(0);
                      setPhase('roll_call_step');
                      onUpdateAgenda({
                        liveMeetingPhase: 'roll_call_step',
                        liveMeetingCurrentAttendeeIndex: 0,
                        liveMeetingElapsedSeconds: sessionSeconds,
                      });
                    }}
                    data-testid="start-rollcall-btn"
                  />
                ) : (
                  <Button
                    label="Tagesordnung starten"
                    icon="pi pi-list"
                    className="comic-button-success flex-1 py-3 text-base sm:text-lg font-bold flex align-items-center justify-content-center gap-2"
                    onClick={() => handleStartAgendaItems(0)}
                    data-testid="start-items-direct-btn"
                  />
                )}

                {totalAttendees > 0 && (
                  <Button
                    label="Direkt zu Punkten"
                    icon="pi pi-arrow-right"
                    iconPos="right"
                    className="comic-button-secondary flex-1 py-3 text-base sm:text-lg font-bold flex align-items-center justify-content-center gap-2"
                    onClick={() => handleStartAgendaItems(0)}
                    title="Anwesenheitsprüfung überspringen und direkt zu Agendapunkten"
                    data-testid="start-items-direct-btn"
                  />
                )}
              </div>
            </Panel>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            PHASE 2: ROLL CALL SCHRITT-FÜR-SCHRITT (Personen-Karte groß)
            ═══════════════════════════════════════════════════════════════════════ */}
        {phase === 'roll_call_step' && (
          <div className="w-full flex flex-column gap-3 my-auto mx-auto" style={{ maxWidth: '560px' }}>
            <Panel
              title="Anwesenheitsabfrage"
              icon="pi pi-users"
              aside={
                <span className="text-xs font-bold text-white">
                  Person {currentAttendeeIndex + 1} von {totalAttendees}
                </span>
              }
            >
              <ProgressBar
                value={totalAttendees > 0 ? Math.round(((currentAttendeeIndex + 1) / totalAttendees) * 100) : 0}
                showValue={false}
                className="w-full"
                style={{ height: '8px', border: '1px solid #000', backgroundColor: '#374151' }}
              />
            </Panel>

            {currentAttendee ? (
              <div
                key={currentAttendee._id || currentAttendee.id || currentAttendee.name}
                className="relative overflow-hidden w-full"
                style={{
                  background: getCardBackground(currentAttendee, currentAttendeeIndex),
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  border: '3px solid #000',
                  boxShadow: '6px 6px 0px #000',
                  borderRadius: '12px'
                }}
              >
                <PersonCardBody
                  att={currentAttendee}
                  count={itemCounts.get(currentAttendee._id || currentAttendee.id || currentAttendee.name) || 0}
                />
              </div>
            ) : (
              <Panel>
                <p className="text-gray-400 m-0">Kein Teilnehmer ausgewählt.</p>
              </Panel>
            )}

            <Panel className="flex flex-column gap-3">
              {currentAttendee && (
                <div className="flex flex-column sm:flex-row align-items-stretch gap-3">
                  <Button
                    label="Anwesend"
                    icon="pi pi-check text-xl"
                    className="comic-button-success flex-1 py-3 text-lg font-bold flex align-items-center justify-content-center gap-2"
                    style={{ minHeight: '3.5rem' }}
                    onClick={() => handleRecordAttendance('present')}
                    data-testid="attendance-present-btn"
                  />
                  <Button
                    label="Abwesend"
                    icon="pi pi-times text-xl"
                    className="comic-button-danger flex-1 py-3 text-lg font-bold flex align-items-center justify-content-center gap-2"
                    style={{ minHeight: '3.5rem' }}
                    onClick={() => handleRecordAttendance('absent')}
                    data-testid="attendance-absent-btn"
                  />
                </div>
              )}

              <div className="flex align-items-center justify-content-between w-full gap-2 flex-wrap">
                <Button
                  label="Zurück"
                  icon="pi pi-chevron-left"
                  text
                  size="small"
                  disabled={currentAttendeeIndex === 0}
                  onClick={handlePrevAttendee}
                  className="text-gray-300 hover:text-white"
                />
                <Button
                  label="Überspringen"
                  icon="pi pi-chevron-right"
                  iconPos="right"
                  text
                  size="small"
                  onClick={handleSkipAttendee}
                  className="text-gray-300 hover:text-yellow-400"
                />
                <Button
                  label="Gesamtübersicht"
                  icon="pi pi-list"
                  text
                  size="small"
                  onClick={() => {
                    setPhase('roll_call_summary');
                    onUpdateAgenda({
                      liveMeetingPhase: 'roll_call_summary',
                      liveMeetingElapsedSeconds: sessionSeconds,
                    });
                  }}
                  className="text-yellow-400 ml-auto"
                  data-testid="view-rollcall-summary-btn"
                />
              </div>
            </Panel>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            PHASE 3: ANWESENHEITS-ÜBERSICHT (Personen-Karten auf einer Seite)
            ═══════════════════════════════════════════════════════════════════════ */}
        {phase === 'roll_call_summary' && (
          <div className="w-full flex flex-column gap-3 my-auto">
            <Panel className="flex flex-column md:flex-row align-items-start md:align-items-center justify-content-between gap-3">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold m-0 text-yellow-400" style={{ textShadow: '2px 2px 0 #000' }}>
                  Anwesenheits-Übersicht
                </h2>
                <span className="text-xs sm:text-sm text-gray-300">
                  Status einer Person über die Buttons auf ihrer Karte anpassen.
                </span>
              </div>

              <div className="flex align-items-center gap-2 flex-wrap">
                <span
                  className="px-3 py-1 border-round-xl text-xs font-bold text-green-300 flex align-items-center gap-1"
                  style={{ backgroundColor: 'rgba(22, 163, 74, 0.25)', border: '1px solid #16a34a' }}
                >
                  <i className="pi pi-check-circle" />
                  {presentCount} Anwesend
                </span>
                <span
                  className="px-3 py-1 border-round-xl text-xs font-bold text-red-300 flex align-items-center gap-1"
                  style={{ backgroundColor: 'rgba(220, 38, 38, 0.25)', border: '1px solid #dc2626' }}
                >
                  <i className="pi pi-times-circle" />
                  {absentCount} Abwesend
                </span>
                <span
                  className="px-3 py-1 border-round-xl text-xs font-bold text-yellow-300 flex align-items-center gap-1"
                  style={{ backgroundColor: 'rgba(234, 179, 8, 0.2)', border: '1px solid #eab308' }}
                >
                  Quote: {attendanceRate}%
                </span>
              </div>
            </Panel>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
                gap: '0.75rem'
              }}
            >
              {localAttendees.map((att, idx) => {
                const isPresent = att.attendanceStatus === 'present';
                const isAbsent = att.attendanceStatus === 'absent';
                const attendeeId = att._id || att.id || att.name;

                return (
                  <div
                    key={attendeeId || idx}
                    className="relative overflow-hidden w-full flex flex-column justify-content-between"
                    style={{
                      background: getCardBackground(att, idx),
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      border: isPresent ? '3px solid #22c55e' : isAbsent ? '3px solid #ef4444' : '3px solid #000000',
                      boxShadow: '6px 6px 0px #000000',
                      borderRadius: '12px'
                    }}
                  >
                    <PersonCardBody att={att} count={itemCounts.get(attendeeId) || 0} />

                    <div
                      className="flex align-items-center justify-content-between gap-2 px-3 py-2 border-top-1 border-white-alpha-30"
                      style={{ backgroundColor: 'rgba(0, 0, 0, 0.35)' }}
                    >
                      <span className="text-xs font-bold text-white flex align-items-center gap-2">
                        <span
                          className="inline-block border-circle flex-shrink-0"
                          style={{
                            width: '9px',
                            height: '9px',
                            backgroundColor: isPresent ? '#22c55e' : isAbsent ? '#ef4444' : '#9ca3af'
                          }}
                        />
                        {isPresent ? 'Anwesend' : isAbsent ? 'Abwesend' : 'Unbestätigt'}
                      </span>
                      <div className="flex align-items-center gap-1">
                        <Button
                          icon="pi pi-check"
                          label="Hier"
                          size="small"
                          className={
                            isPresent
                              ? 'comic-button-success p-button-sm text-xs py-1 px-2 font-bold'
                              : 'comic-button-secondary p-button-sm text-xs py-1 px-2 text-gray-300 font-bold'
                          }
                          onClick={() => handleToggleSummaryStatus(idx, 'present')}
                          data-testid={`attendee-toggle-present-${idx}`}
                        />
                        <Button
                          icon="pi pi-times"
                          label="Fehlt"
                          size="small"
                          className={
                            isAbsent
                              ? 'comic-button-danger p-button-sm text-xs py-1 px-2 font-bold'
                              : 'comic-button-secondary p-button-sm text-xs py-1 px-2 text-gray-300 font-bold'
                          }
                          onClick={() => handleToggleSummaryStatus(idx, 'absent')}
                          data-testid={`attendee-toggle-absent-${idx}`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <Panel className="live-controls-sticky">
              <div className="flex flex-column-reverse sm:flex-row align-items-stretch sm:align-items-center justify-content-between gap-3">
                <Button
                  label="Erneut Schritt-für-Schritt"
                  icon="pi pi-refresh"
                  className="comic-button-secondary text-xs sm:text-sm font-bold"
                  onClick={() => {
                    setCurrentAttendeeIndex(0);
                    setPhase('roll_call_step');
                    onUpdateAgenda({
                      liveMeetingPhase: 'roll_call_step',
                      liveMeetingCurrentAttendeeIndex: 0,
                      liveMeetingElapsedSeconds: sessionSeconds,
                    });
                  }}
                />
                <Button
                  label="Tagesordnung starten"
                  icon="pi pi-arrow-right"
                  iconPos="right"
                  className="comic-button-success px-4 py-3 text-base sm:text-lg font-bold flex align-items-center justify-content-center gap-2"
                  onClick={() => handleStartAgendaItems(0)}
                  data-testid="start-agenda-items-btn"
                />
              </div>
            </Panel>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            PHASE 4: SCHRITT-FÜR-SCHRITT AGENDAPUNKTE (Panels, 2 Spalten ab md)
            ═══════════════════════════════════════════════════════════════════════ */}
        {phase === 'agenda_items' && (
          <div className="w-full flex flex-column gap-3 flex-1">
            {totalItems === 0 ? (
              <Panel className="text-center my-auto">
                <i className="pi pi-folder-open text-gray-500 text-5xl mb-3" />
                <h2 className="text-2xl font-bold text-white mb-2">Keine Agendapunkte vorhanden</h2>
                <p className="text-gray-300 mb-4">Füge in der Hauptansicht Agendapunkte hinzu, um sie hier durchzugehen.</p>
                <Button
                  label="Sitzung beenden"
                  icon="pi pi-check"
                  className="comic-button-success"
                  onClick={() => {
                    setPhase('summary');
                    onUpdateAgenda({
                      liveMeetingPhase: 'summary',
                      liveMeetingElapsedSeconds: sessionSeconds,
                    });
                  }}
                />
              </Panel>
            ) : currentItem ? (
              <>
                {(() => {
                  const currentComments = currentItem.comments || [];
                  const notes = currentComments.filter((c: any) => c.text && (c.text.startsWith('📝') || c.text.includes('Sitzungsnotiz')));
                  const regularComments = currentComments.filter((c: any) => !c.text || (!c.text.startsWith('📝') && !c.text.includes('Sitzungsnotiz')));
                  const hasPoll = !!(currentItem.poll && currentItem.poll.options && currentItem.poll.options.length > 0);
                  const hasRightColumn = hasPoll || regularComments.length > 0;
                  const upvotes: string[] = currentItem.upvotes || [];

                  return (
                    <div className="flex flex-column md:flex-row gap-3 align-items-stretch md:align-items-start">
                      {/* Left column: topic, notes */}
                      <div className={`flex flex-column gap-3 min-w-0 ${hasRightColumn ? 'flex-1' : 'w-full'}`}>
                        <Panel className="flex flex-column gap-3">
                          <div className="flex align-items-center justify-content-between gap-2">
                            <div className="flex align-items-center gap-2">
                              <span className="text-xs sm:text-sm font-bold text-yellow-400 font-mono">
                                TOP {currentItemIndex + 1} von {totalItems}
                              </span>
                              {currentItem.completed && (
                                <span className="text-green-400 text-xs font-bold flex align-items-center gap-1">
                                  <i className="pi pi-check" /> Besprochen
                                </span>
                              )}
                            </div>
                            <div className="flex align-items-center gap-2">
                              <Button
                                label="Alle TOPs"
                                icon="pi pi-list"
                                className="comic-button-secondary text-xs p-button-sm flex align-items-center gap-1"
                                onClick={() => setShowItemDrawer(true)}
                                data-testid="open-all-tops-drawer-btn"
                              />
                              <Button
                                icon={currentItem.pinned ? 'mdi mdi-pin text-base' : 'mdi mdi-pin-outline text-base'}
                                className={
                                  currentItem.pinned
                                    ? 'comic-button-warning p-2 flex-shrink-0 flex align-items-center justify-content-center'
                                    : 'comic-button-secondary p-2 text-gray-300 flex-shrink-0 flex align-items-center justify-content-center'
                                }
                                style={{ width: '2.2rem', height: '2.2rem' }}
                                onClick={handleTogglePinCurrentItem}
                                title={currentItem.pinned ? 'Anheftung lösen' : 'TOP anheften'}
                                data-testid="toggle-pin-item-btn"
                              />
                            </div>
                          </div>

                          <h2
                            className="text-2xl md:text-3xl font-bold m-0 text-white line-height-2 word-break-break-word"
                            style={{ textShadow: '2px 2px 0 #000' }}
                          >
                            {currentItem.title}
                          </h2>

                          {currentItem.author && (
                            <div className="flex align-items-center gap-2 flex-wrap">
                              <PersonChip
                                name={currentItem.author}
                                color={getAttendeeColor(attendees, currentItem.author).color}
                                size="sm"
                              />
                            </div>
                          )}

                          <div className="flex align-items-center gap-2 flex-wrap text-xs text-gray-300" data-testid="item-likes-container">
                            <span
                              className={`flex align-items-center ${hasLiked ? 'text-yellow-400' : 'text-gray-400 hover:text-white'} cursor-pointer`}
                              onClick={handleToggleLikeCurrentItem}
                              title={hasLiked ? 'Like zurücknehmen' : 'Diesen TOP liken'}
                              data-testid="item-likes-indicator"
                            >
                              <i className={`text-base ${hasLiked || upvotes.length > 0 ? 'pi pi-thumbs-up-fill text-yellow-400' : 'pi pi-thumbs-up'}`} />
                            </span>
                            {upvotes.length > 0 ? (
                              <>
                                <span className="font-bold">Daumen hoch von:</span>
                                {upvotes.map((voterId: string) => {
                                  const att = attendees.find(
                                    (a: any) =>
                                      (a.id && a.id === voterId) ||
                                      (a._id && a._id === voterId) ||
                                      a.name === voterId
                                  );
                                  return (
                                    <PersonChip
                                      key={voterId}
                                      name={att?.name || voterId}
                                      color={getAttendeeColor(attendees, voterId).color}
                                      size="sm"
                                    />
                                  );
                                })}
                              </>
                            ) : (
                              <span className="text-gray-400">Noch keine Likes</span>
                            )}
                          </div>

                          <div className="border-top-1 border-gray-700 pt-3">
                            {currentItem.description ? (
                              <div className="agenda-details-container text-gray-100 text-sm sm:text-base line-height-3">
                                <MDXEditor
                                  key={currentItem._id || currentItem.id || currentItemIndex}
                                  markdown={currentItem.description}
                                  readOnly
                                  plugins={READONLY_PLUGINS}
                                />
                              </div>
                            ) : (
                              <div className="text-gray-400 text-xs italic">Keine zusätzliche Beschreibung vorhanden.</div>
                            )}
                          </div>

                          {(currentItem.imageUrl || (currentItem.imageUrls && currentItem.imageUrls.length > 0)) && (
                            <div className="flex flex-column gap-2">
                              <span className="text-xs font-bold text-yellow-400 uppercase">Anhänge & Bilder</span>
                              <div className="flex flex-wrap gap-2">
                                {currentItem.imageUrl && (
                                  <img
                                    src={currentItem.imageUrl}
                                    alt="TOP Anhang"
                                    className="border-round-xl object-contain max-h-16rem max-w-full"
                                    style={{ border: '2px solid #000', boxShadow: '2px 2px 0 #000' }}
                                  />
                                )}
                                {currentItem.imageUrls?.map((imgUrl: string, imgIdx: number) => (
                                  <img
                                    key={imgIdx}
                                    src={imgUrl}
                                    alt={`TOP Anhang ${imgIdx + 1}`}
                                    className="border-round-xl object-contain max-h-16rem max-w-full"
                                    style={{ border: '2px solid #000', boxShadow: '2px 2px 0 #000' }}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </Panel>

                        <Panel title="Sitzungsbeschluss / Notiz" icon="pi pi-pencil" className="flex flex-column gap-3">
                          {notes.length > 0 && (
                            <div className="flex flex-column gap-2">
                              <span className="text-xs font-bold text-gray-300 flex align-items-center gap-1">
                                <i className="pi pi-book" /> Protokollierte Notizen / Beschlüsse ({notes.length}):
                              </span>
                              {notes.map((n: any, nIdx: number) => (
                                <div key={n.id || nIdx} className="text-xs text-gray-200 bg-gray-900 p-2 border-round flex flex-column gap-1" style={{ border: '2px solid #000' }}>
                                  <div className="flex align-items-center justify-content-between">
                                    <span className="font-bold text-yellow-300">{n.author || 'Notiz'}</span>
                                    <span className="text-gray-500 text-3xs">{formatDate(n.createdAt)}</span>
                                  </div>
                                  <span className="white-space-pre-wrap">{n.text.replace(/^📝\s*\*\*Sitzungsnotiz \/ Beschluss:\*\*\s*/, '')}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-2">
                            <InputTextarea
                              value={quickNote}
                              onChange={(e) => setQuickNote(e.target.value)}
                              placeholder="Kurzen Beschluss oder Notiz zu diesem TOP notieren..."
                              rows={2}
                              autoResize={false}
                              className="w-full text-sm bg-gray-900 text-white font-medium"
                              style={{ border: '2px solid #000', borderRadius: '8px', resize: 'none' }}
                            />
                            <Button
                              icon="pi pi-check"
                              label="Speichern"
                              className="comic-button-success p-button-sm text-xs font-bold flex-shrink-0 align-self-end py-2 px-3"
                              disabled={!quickNote.trim() || isSavingNote}
                              loading={isSavingNote}
                              onClick={handleAddQuickNote}
                              aria-label="Notiz speichern"
                            />
                          </div>
                        </Panel>
                      </div>

                      {/* Right column: poll & comments */}
                      {hasRightColumn && (
                        <div className="flex flex-column gap-3 min-w-0 w-full md:w-5 flex-shrink-0">
                          {hasPoll && (
                            <Panel title={currentItem.poll.question || 'Abstimmung'} icon="pi pi-chart-bar">
                              <div className="flex flex-column gap-2">
                                {currentItem.poll.options.map((opt: any, optIdx: number) => {
                                  const votesCount = opt.votes?.length || 0;
                                  const totalVotes = currentItem.poll.options.reduce(
                                    (sum: number, o: any) => sum + (o.votes?.length || 0),
                                    0
                                  );
                                  const percentage = totalVotes > 0 ? Math.round((votesCount / totalVotes) * 100) : 0;

                                  return (
                                    <div key={opt.id || optIdx} className="flex flex-column gap-1">
                                      <div className="flex justify-content-between gap-2 text-xs font-bold">
                                        <span className="text-gray-200">{opt.text}</span>
                                        <span className="text-yellow-400 white-space-nowrap">{plural(votesCount, 'Stimme', 'Stimmen')} ({percentage}%)</span>
                                      </div>
                                      <ProgressBar
                                        value={percentage}
                                        showValue={false}
                                        style={{ height: '6px', backgroundColor: '#374151' }}
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </Panel>
                          )}

                          {regularComments.length > 0 && (
                            <Panel title={`Kommentare (${regularComments.length})`} icon="pi pi-comments">
                              <div className="flex flex-column">
                                {regularComments.map((comment: any, cIdx: number) => (
                                  <div
                                    key={comment.id || cIdx}
                                    className={`py-2 flex flex-column gap-1 ${cIdx < regularComments.length - 1 ? 'border-bottom-1 border-gray-700' : ''}`}
                                  >
                                    <div className="flex align-items-center justify-content-between gap-2">
                                      <PersonChip
                                        name={comment.author || 'Teilnehmer'}
                                        color={getAttendeeColor(attendees, comment.createdBy || comment.author).color}
                                        size="sm"
                                      />
                                      <span className="text-3xs text-gray-500">{formatDate(comment.createdAt)}</span>
                                    </div>
                                    <p className="m-0 text-xs sm:text-sm text-gray-200 white-space-pre-wrap">{comment.text}</p>
                                    {comment.attachments && comment.attachments.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {comment.attachments.map((att: any, aIdx: number) => (
                                          <a
                                            key={aIdx}
                                            href={att.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-3xs text-yellow-400 hover:underline flex align-items-center gap-1 bg-black-alpha-40 px-2 py-1 border-round"
                                          >
                                            <i className="pi pi-paperclip text-xs" />
                                            <span>{att.name}</span>
                                          </a>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </Panel>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Controls panel: one row on desktop, sticky with full-width primary action on mobile */}
                <div className="comic-panel-dark p-2 sm:p-3 live-controls-sticky mt-auto" data-testid="live-item-controls">
                  <div className="flex align-items-center gap-2 flex-wrap live-controls-row">
                    <Button
                      label="Vorheriger TOP"
                      icon="pi pi-chevron-left"
                      className="comic-button-secondary text-xs sm:text-sm font-bold live-btn-compact"
                      disabled={currentItemIndex === 0}
                      onClick={handlePrevItem}
                      aria-label="Vorheriger TOP"
                      title="Vorheriger TOP"
                      data-testid="prev-top-btn"
                    />

                    <div className="flex-1" />

                    {currentItemIndex + 1 < totalItems && (
                      <Button
                        label="Überspringen"
                        icon="pi pi-forward"
                        className="comic-button-secondary text-xs sm:text-sm font-bold live-btn-compact"
                        onClick={() => handleNextItem(false)}
                        aria-label="Überspringen"
                        title="Zum nächsten Punkt wechseln ohne diesen als erledigt abzuhaken"
                        data-testid="skip-top-btn"
                      />
                    )}

                    <Button
                      label={isSessionRunning ? 'Pause' : 'Fortsetzen'}
                      icon={isSessionRunning ? 'pi pi-pause' : 'pi pi-play'}
                      className={`${isSessionRunning ? 'comic-button-secondary' : 'comic-button-warning'} text-xs sm:text-sm font-bold live-btn-compact`}
                      onClick={handleTogglePause}
                      aria-label={isSessionRunning ? 'Pause' : 'Fortsetzen'}
                      title={isSessionRunning ? 'Sitzung pausieren (beide Timer anhalten)' : 'Sitzung fortsetzen (beide Timer starten)'}
                      data-testid="toggle-session-timer-btn"
                    />

                    <Button
                      label={currentItemIndex + 1 < totalItems ? 'Abhaken & Weiter' : 'Abhaken & Beenden'}
                      icon="pi pi-check"
                      iconPos="right"
                      className="comic-button-success text-sm font-bold justify-content-center live-primary-action"
                      onClick={() => handleNextItem(true)}
                      data-testid="next-top-btn"
                    />
                  </div>
                </div>
              </>
            ) : null}

            {/* Quick-Jump Drawer Dialog for all TOPs */}
            <Dialog
              header="Alle Agendapunkte (TOPs)"
              visible={showItemDrawer}
              onHide={() => setShowItemDrawer(false)}
              style={{ width: '90vw', maxWidth: '520px' }}
              className="glass-panel"
              modal
            >
              <div className="flex flex-column gap-2 max-h-24rem overflow-y-auto p-1">
                {localItems.map((item, idx) => (
                  <div
                    key={item._id || item.id || idx}
                    className={`p-3 border-round-xl flex align-items-center justify-content-between gap-2 cursor-pointer transition-colors ${
                      idx === currentItemIndex
                        ? 'bg-yellow-500 text-black font-bold'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    }`}
                    style={{ border: '2px solid #000', boxShadow: '2px 2px 0 #000' }}
                    onClick={() => handleJumpToItem(idx)}
                    data-testid={`drawer-jump-top-${idx}`}
                  >
                    <div className="flex align-items-center gap-2 min-w-0">
                      <span className="text-xs opacity-75 font-mono">#{idx + 1}</span>
                      <span className="white-space-nowrap overflow-hidden text-overflow-ellipsis text-sm">
                        {item.title}
                      </span>
                    </div>
                    <div className="flex align-items-center gap-2 flex-shrink-0">
                      {item.pinned && (
                        <i className={`mdi mdi-pin text-sm ${idx === currentItemIndex ? 'text-black' : 'text-yellow-400'}`} title="Angeheftet" />
                      )}
                      {item.upvotes && item.upvotes.length > 0 && (
                        <span className={`text-2xs font-bold px-1.5 py-0.5 border-round flex align-items-center gap-1 ${idx === currentItemIndex ? 'bg-black text-yellow-400' : 'bg-gray-800 text-red-400'}`}>
                          <i className="pi pi-thumbs-up text-3xs" />
                          <span>{item.upvotes.length}</span>
                        </span>
                      )}
                      {item.completed && (
                        <i className={`pi pi-check-circle ${idx === currentItemIndex ? 'text-black' : 'text-green-400'}`} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Dialog>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            PHASE 5: SITZUNGSABSCHLUSS / SUMMARY & PROTOKOLL
            ═══════════════════════════════════════════════════════════════════════ */}
        {phase === 'summary' && (
          <div className="w-full flex flex-column gap-3 my-auto mx-auto" style={{ maxWidth: '900px' }}>
            <Panel className="flex flex-column align-items-center text-center gap-2">
              <span
                className="border-circle text-black flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: '4rem', height: '4rem', backgroundColor: '#eab308', border: '3px solid #000', boxShadow: '4px 4px 0 #000' }}
              >
                <i className="pi pi-check text-2xl font-bold" />
              </span>
              <h1
                className="text-2xl sm:text-4xl font-bold m-0 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 line-height-2"
                style={{ filter: 'drop-shadow(3px 3px 0px #000)' }}
              >
                Sitzung abgeschlossen!
              </h1>
              <p className="text-gray-300 text-sm sm:text-base m-0">
                Alle Agendapunkte und Anwesenheitsdaten wurden erfasst und gespeichert.
              </p>
            </Panel>

            <div style={tileGridStyle}>
              {renderStatTile('pi pi-clock', <span className="font-mono">{formatTimer(sessionSeconds)}</span>, 'Sitzungsdauer')}
              {renderStatTile('pi pi-check-square', `${completedItemsCount}/${totalItems}`, 'Besprochen', 'text-green-400')}
              {renderStatTile('pi pi-users', `${presentCount}/${totalAttendees}`, `Anwesend (${attendanceRate}%)`, 'text-blue-300')}
            </div>

            <Panel
              title="Besprechungsdauer je Agendapunkt"
              icon="pi pi-table"
              aside={<span className="text-2xs text-gray-400 font-mono">Summe: {formatTimer(sessionSeconds)}</span>}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm text-gray-200" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr className="border-bottom-1 border-gray-700 text-gray-400 font-bold">
                      <th className="py-2 px-2 text-left">TOP</th>
                      <th className="py-2 px-2 text-left">Titel</th>
                      <th className="py-2 px-2 text-center">Status</th>
                      <th className="py-2 px-2 text-right">Dauer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {localItems.map((it, idx) => (
                      <tr key={it._id || it.id || idx} className="border-bottom-1 border-gray-800">
                        <td className="py-2 px-2 text-gray-400 font-mono">#{idx + 1}</td>
                        <td className="py-2 px-2 font-semibold text-white word-break-break-word">{it.title}</td>
                        <td className="py-2 px-2 text-center white-space-nowrap">
                          {it.completed ? (
                            <span className="text-green-400 font-bold inline-flex align-items-center gap-1">
                              <i className="pi pi-check text-xs" /> Besprochen
                            </span>
                          ) : (
                            <span className="text-gray-400">Offen</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-bold text-yellow-400">
                          {formatTimer(it.durationSeconds || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel className="flex flex-column gap-3">
              <div className="flex align-items-center justify-content-center gap-2 sm:gap-3 flex-wrap">
                <Button
                  label={copiedProtocol ? 'Protokoll kopiert!' : 'Protokoll kopieren'}
                  icon={copiedProtocol ? 'pi pi-check text-green-400' : 'pi pi-copy'}
                  className="comic-button-secondary text-xs sm:text-sm font-bold py-2 px-3"
                  onClick={handleCopyProtocol}
                  title="Sitzungsprotokoll in die Zwischenablage kopieren"
                  data-testid="copy-protocol-btn"
                />
                <Button
                  label="Protokoll (.md) herunterladen"
                  icon="pi pi-download"
                  className="comic-button-secondary text-xs sm:text-sm font-bold py-2 px-3"
                  onClick={handleDownloadProtocol}
                  title="Sitzungsprotokoll als Markdown-Datei herunterladen"
                  data-testid="download-protocol-btn"
                />
                <Button
                  label="Neue Agenda vorbereiten"
                  icon="pi pi-plus-circle"
                  className="comic-button-secondary text-xs sm:text-sm font-bold py-2 px-3"
                  onClick={() => setShowFollowUpDialog(true)}
                  title="Neue Agenda mit den Personen und den gepinnten Punkten erstellen"
                  data-testid="create-follow-up-agenda-btn"
                />
              </div>
              <div className="flex flex-column sm:flex-row align-items-stretch gap-3">
                <Button
                  label="Zurück zur Agenda"
                  icon="pi pi-arrow-left"
                  className="comic-button-secondary flex-1 py-3 text-sm font-bold flex align-items-center justify-content-center gap-2"
                  onClick={() => handleCloseMeeting('in_progress')}
                  title="Zurückkehren - Sitzung kann später fortgesetzt werden"
                  data-testid="return-from-meeting-btn"
                />
                <Button
                  label="Sitzung endgültig abschließen"
                  icon="pi pi-check"
                  className="comic-button-success flex-1 py-3 text-sm font-bold flex align-items-center justify-content-center gap-2"
                  onClick={() => handleCloseMeeting('completed')}
                  title="Sitzung beenden und abschließen"
                  data-testid="finish-live-meeting-btn"
                />
              </div>
            </Panel>

            <CreateFollowUpAgendaDialog
              visible={showFollowUpDialog}
              onHide={() => setShowFollowUpDialog(false)}
              agenda={{ ...agenda, items: localItems, attendees: localAttendees }}
              currentUser={currentUser}
            />
          </div>
        )}
        </div>
      </main>
    </Dialog>
  );
};

export default LiveMeetingModal;
