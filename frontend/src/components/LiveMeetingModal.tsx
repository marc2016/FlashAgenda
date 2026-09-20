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
  const [isItemRunning, setIsItemRunning] = useState(true);
  const isInitializedRef = useRef(false);
  const prevItemIndexRef = useRef<number>(-1);
  const prevPhaseRef = useRef<LiveMeetingPhase | null>(null);

  // Toggle pause/resume for both session and item timers
  const handleTogglePause = () => {
    setIsSessionRunning((prev) => {
      const next = !prev;
      setIsItemRunning(next);
      return next;
    });
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

      if (isResuming && agenda?.liveMeetingPhase) {
        setPhase(agenda.liveMeetingPhase as LiveMeetingPhase);
        const restoredItemIdx = typeof agenda.liveMeetingCurrentItemIndex === 'number' ? agenda.liveMeetingCurrentItemIndex : 0;
        const restoredAttIdx = typeof agenda.liveMeetingCurrentAttendeeIndex === 'number' ? agenda.liveMeetingCurrentAttendeeIndex : 0;
        setCurrentItemIndex(Math.min(restoredItemIdx, Math.max(0, (items || []).length - 1)));
        setCurrentAttendeeIndex(Math.min(restoredAttIdx, Math.max(0, (attendees || []).length - 1)));
      } else if (isResuming && typeof agenda?.liveMeetingCurrentItemIndex === 'number') {
        setPhase('agenda_items');
        setCurrentItemIndex(Math.min(agenda.liveMeetingCurrentItemIndex, Math.max(0, (items || []).length - 1)));
        setCurrentAttendeeIndex(0);
      } else {
        setPhase('intro');
        setCurrentAttendeeIndex(0);
        setCurrentItemIndex(0);
      }
      setSessionSeconds(agenda?.liveMeetingElapsedSeconds || 0);
      setItemSeconds(0);
      setIsSessionRunning(true);
      setIsItemRunning(true);
      setLocalAttendees(attendees || []);
      setLocalItems(items || []);
    } else if (!visible) {
      isInitializedRef.current = false;
      prevItemIndexRef.current = -1;
      prevPhaseRef.current = null;
    }
  }, [visible, agenda, attendees, items]);

  // Overall session timer effect
  useEffect(() => {
    if (!visible || !isSessionRunning) return;
    const interval = setInterval(() => {
      setSessionSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [visible, isSessionRunning]);

  // Whenever currentItemIndex changes or entering agenda_items phase, reset the item timer
  useEffect(() => {
    if (phase === 'agenda_items') {
      if (prevItemIndexRef.current !== currentItemIndex || prevPhaseRef.current !== 'agenda_items') {
        setItemSeconds(0);
      }
    }
    prevItemIndexRef.current = currentItemIndex;
    prevPhaseRef.current = phase;
  }, [currentItemIndex, phase]);

  // Periodically persist session seconds and state to server
  useEffect(() => {
    if (!visible || sessionSeconds === 0) return;
    const interval = setInterval(() => {
      onUpdateAgenda({
        liveMeetingElapsedSeconds: sessionSeconds,
        liveMeetingPhase: phase,
        liveMeetingCurrentItemIndex: currentItemIndex,
        liveMeetingCurrentAttendeeIndex: currentAttendeeIndex,
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [visible, sessionSeconds, phase, currentItemIndex, currentAttendeeIndex, onUpdateAgenda]);

  // Active agenda item timer effect (stops when isSessionRunning is false)
  useEffect(() => {
    if (!visible || !isSessionRunning || !isItemRunning || phase !== 'agenda_items') return;
    const interval = setInterval(() => {
      setItemSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [visible, isSessionRunning, isItemRunning, phase]);

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
              durationSeconds: (item.durationSeconds || 0) + elapsedSec,
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
    if (itemSeconds > 0 && phase === 'agenda_items') {
      saveCurrentItemDuration(currentItemIndex, itemSeconds);
    }
    await onUpdateAgenda({
      liveMeetingActive: false,
      liveMeetingStatus: status,
      liveMeetingElapsedSeconds: sessionSeconds,
      liveMeetingPhase: phase,
      liveMeetingCurrentItemIndex: currentItemIndex,
      liveMeetingCurrentAttendeeIndex: currentAttendeeIndex,
    });
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
          md += `- ${opt.text}: ${opt.votes?.length || 0} Stimmen\n`;
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
    const elapsed = itemSeconds;
    const updated = localItems.map((item, idx) => {
      if (idx === currentItemIndex) {
        return {
          ...item,
          durationSeconds: (item.durationSeconds || 0) + (elapsed > 0 ? elapsed : 0),
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

    if (currentItemIndex + 1 < localItems.length) {
      const nextIdx = currentItemIndex + 1;
      setCurrentItemIndex(nextIdx);
      setItemSeconds(0);
      await onUpdateAgenda({
        liveMeetingCurrentItemIndex: nextIdx,
        liveMeetingPhase: 'agenda_items',
        liveMeetingElapsedSeconds: sessionSeconds,
      });
    } else {
      setPhase('summary');
      await onUpdateAgenda({
        liveMeetingPhase: 'summary',
        liveMeetingElapsedSeconds: sessionSeconds,
      });
    }
  };

  const handlePrevItem = async () => {
    if (currentItemIndex > 0) {
      const elapsed = itemSeconds;
      if (elapsed > 0) {
        const updated = localItems.map((item, idx) => {
          if (idx === currentItemIndex) {
            return {
              ...item,
              durationSeconds: (item.durationSeconds || 0) + elapsed,
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
      const prevIdx = currentItemIndex - 1;
      setCurrentItemIndex(prevIdx);
      setItemSeconds(0);
      await onUpdateAgenda({
        liveMeetingCurrentItemIndex: prevIdx,
        liveMeetingPhase: 'agenda_items',
        liveMeetingElapsedSeconds: sessionSeconds,
      });
    }
  };

  const handleJumpToItem = async (index: number) => {
    if (phase === 'agenda_items') {
      const elapsed = itemSeconds;
      if (elapsed > 0) {
        const updated = localItems.map((item, idx) => {
          if (idx === currentItemIndex) {
            return {
              ...item,
              durationSeconds: (item.durationSeconds || 0) + elapsed,
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
    setCurrentItemIndex(index);
    setItemSeconds(0);
    setShowItemDrawer(false);
    await onUpdateAgenda({
      liveMeetingCurrentItemIndex: index,
      liveMeetingPhase: 'agenda_items',
      liveMeetingElapsedSeconds: sessionSeconds,
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

  return (
    <Dialog
      visible={visible}
      onHide={() => handleCloseMeeting('in_progress')}
      maximized
      blockScroll={true}
      dismissableMask={false}
      showHeader={false}
      className="live-meeting-dialog m-0 p-0"
      contentStyle={{
        backgroundColor: '#111827',
        color: '#f9fafb',
        padding: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw'
      }}
    >
      {/* ─── SLIM TOP STICKY BAR: Consistent with other dialog headers ─── */}
      <header
        className="flex align-items-center justify-content-between px-3 sm:px-4 py-2 border-bottom-1 border-gray-800 flex-shrink-0 z-5 gap-2"
        style={{
          backgroundColor: '#1f2937',
        }}
      >
        {/* Left: Icon & Title */}
        <div className="flex align-items-center gap-2 flex-shrink-0">
          <i className="pi pi-play text-yellow-400 text-lg font-bold" />
          <div className="flex align-items-center gap-2">
            <span className="font-bold text-yellow-400 text-sm sm:text-base">
              FlashAgenda Live
            </span>
            {agenda?.title && (
              <>
                <span className="text-gray-500 hidden sm:inline">•</span>
                <span className="text-gray-200 text-xs sm:text-sm font-semibold white-space-nowrap overflow-hidden text-overflow-ellipsis max-w-10rem sm:max-w-18rem hidden sm:inline">
                  {agenda.title}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Center: Live Timers (Task timer links, Gesamt timer rechts, etwas größer) */}
        <div className="flex align-items-center gap-2 sm:gap-3 flex-wrap justify-content-center">
          {/* TOP / Task Timer (only in agenda_items phase) */}
          {phase === 'agenda_items' && (
            <div
              className="flex align-items-center gap-2 px-3 py-1.5 bg-gray-900 border-round text-sm sm:text-base font-mono font-bold text-blue-300 shadow-1"
              title="Dauer für aktuellen Agendapunkt (Task)"
              data-testid="item-timer-display"
            >
              <i className="pi pi-check-square text-blue-400 text-sm sm:text-base" />
              <span className="text-blue-200">{formatTimer(itemSeconds)}</span>
            </div>
          )}

          {/* Total Session Timer */}
          <div
            className="flex align-items-center gap-2 px-3 py-1.5 bg-gray-900 border-round text-sm sm:text-base font-mono font-bold text-gray-200 shadow-1"
            title="Gesamte Sitzungsdauer"
            data-testid="session-timer-display"
          >
            <i className="pi pi-clock text-yellow-400 text-sm sm:text-base" />
            <span>{formatTimer(sessionSeconds)}</span>
          </div>
        </div>

        {/* Right: Wake lock indicator & Close */}
        <div className="flex align-items-center gap-2 flex-shrink-0">
          {wakeLockActive && (
            <span
              className="text-yellow-400 text-xs flex align-items-center gap-1 font-semibold mr-1"
              title="Bildschirm bleibt aktiv (WakeLock aktiv)"
            >
              <i className="pi pi-sun text-sm" />
              <span className="hidden md:inline">Aktiv</span>
            </span>
          )}

          <button
            type="button"
            className="dialog-header-close-btn"
            onClick={() => handleCloseMeeting('in_progress')}
            title="Sitzungsmodus verlassen"
            data-testid="close-live-meeting-btn"
          >
            <i className="pi pi-times" />
          </button>
        </div>
      </header>

      {/* ─── MAIN CONTENT AREA ─── */}
      <main className="flex-1 overflow-y-auto p-3 sm:p-5 flex flex-column align-items-center justify-content-center relative">
        {/* Background ambient comic glow */}
        <div
          className="absolute top-0 left-0 w-24rem h-24rem bg-yellow-500 border-circle blur-8xl opacity-10 pointer-events-none"
          style={{ transform: 'translate(-30%, -30%)' }}
        />
        <div
          className="absolute bottom-0 right-0 w-24rem h-24rem bg-red-600 border-circle blur-8xl opacity-10 pointer-events-none"
          style={{ transform: 'translate(30%, 30%)' }}
        />

        {/* ═══════════════════════════════════════════════════════════════════════
            PHASE 1: INTRO / TITLE SPLASH
            ═══════════════════════════════════════════════════════════════════════ */}
        {phase === 'intro' && (
          <div className="w-full max-w-2xl text-center flex flex-column align-items-center gap-4 py-4 z-1">
            <div className="flex align-items-center justify-content-center mb-2">
              <img
                src="/favicon.svg"
                alt="FlashAgenda"
                className="flex-shrink-0 transition-transform hover:scale-105"
                style={{ width: '11.5rem', height: '11.5rem', filter: 'drop-shadow(6px 6px 0 #000)' }}
              />
            </div>

            <h1
              className="text-3xl sm:text-5xl md:text-6xl font-bold m-0 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 line-height-2"
              style={{ filter: 'drop-shadow(4px 4px 0px #000)', paddingBottom: '0.1em' }}
            >
              {agenda?.title || 'Agenda'}
            </h1>

            {/* Date & Location summary */}
            <div className="flex flex-wrap align-items-center justify-content-center gap-3 text-sm sm:text-base font-bold text-gray-300">
              {agenda?.date && (
                <div className="comic-panel-dark px-3 py-2 flex align-items-center gap-2">
                  <i className="pi pi-calendar text-yellow-400" />
                  <span>
                    {(() => {
                      try {
                        return format(new Date(agenda.date), 'dd.MM.yyyy · HH:mm');
                      } catch {
                        return agenda.date;
                      }
                    })()}
                  </span>
                </div>
              )}
              {agenda?.location?.name && (
                <div className="comic-panel-dark px-3 py-2 flex align-items-center gap-2">
                  <i className="pi pi-map-marker text-yellow-400" />
                  <span className="max-w-15rem white-space-nowrap overflow-hidden text-overflow-ellipsis">
                    {agenda.location.name}
                  </span>
                </div>
              )}
            </div>

            {/* Overview Stats Badges */}
            <div className="flex align-items-center justify-content-center gap-3 sm:gap-6 my-2 w-full">
              <div
                className="flex flex-column align-items-center p-3 border-round-xl flex-1 max-w-14rem"
                style={{
                  backgroundColor: '#1f2937',
                  border: '2px solid #000',
                  boxShadow: '3px 3px 0px #000'
                }}
              >
                <span className="text-3xl sm:text-4xl font-bold text-yellow-400">{totalAttendees}</span>
                <span className="text-xs text-gray-300 font-bold uppercase mt-1">Teilnehmer</span>
              </div>

              <div
                className="flex flex-column align-items-center p-3 border-round-xl flex-1 max-w-14rem"
                style={{
                  backgroundColor: '#1f2937',
                  border: '2px solid #000',
                  boxShadow: '3px 3px 0px #000'
                }}
              >
                <span className="text-3xl sm:text-4xl font-bold text-yellow-400">{totalItems}</span>
                <span className="text-xs text-gray-300 font-bold uppercase mt-1">Agendapunkte</span>
              </div>
            </div>

            {/* Actions to proceed */}
            <div className="flex flex-column sm:flex-row align-items-stretch justify-content-center gap-3 w-full max-w-md mt-3">
              {totalAttendees > 0 ? (
                <Button
                  label="Anwesenheit prüfen"
                  icon="pi pi-users"
                  className="comic-button-success flex-1 py-3 text-base sm:text-lg font-bold flex align-items-center justify-content-center gap-2"
                  style={{ minWidth: '12rem' }}
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
                  onClick={() => {
                    setCurrentItemIndex(0);
                    setPhase('agenda_items');
                    onUpdateAgenda({
                      liveMeetingPhase: 'agenda_items',
                      liveMeetingCurrentItemIndex: 0,
                      liveMeetingElapsedSeconds: sessionSeconds,
                    });
                  }}
                  data-testid="start-items-direct-btn"
                />
              )}

              {totalAttendees > 0 && (
                <Button
                  label="Direkt zu Punkten"
                  icon="pi pi-arrow-right"
                  iconPos="right"
                  className="comic-button-secondary flex-1 py-3 text-base sm:text-lg font-bold flex align-items-center justify-content-center gap-2"
                  style={{ minWidth: '12rem' }}
                  onClick={() => {
                    setCurrentItemIndex(0);
                    setPhase('agenda_items');
                    onUpdateAgenda({
                      liveMeetingPhase: 'agenda_items',
                      liveMeetingCurrentItemIndex: 0,
                      liveMeetingElapsedSeconds: sessionSeconds,
                    });
                  }}
                  title="Anwesenheitsprüfung überspringen und direkt zu Agendapunkten"
                  data-testid="start-items-direct-btn"
                />
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            PHASE 2: ROLL CALL SCHRITT-FÜR-SCHRITT (Personen-Karte groß)
            ═══════════════════════════════════════════════════════════════════════ */}
        {phase === 'roll_call_step' && (
          <div className="w-full max-w-lg flex flex-column align-items-center gap-4 z-1">
            {/* Header / Progress Indicator */}
            <div className="w-full flex align-items-center justify-content-between text-xs font-bold text-gray-400">
              <span>Anwesenheitsabfrage (Roll-Call)</span>
              <span className="text-yellow-400">
                Person {currentAttendeeIndex + 1} von {totalAttendees}
              </span>
            </div>

            <ProgressBar
              value={totalAttendees > 0 ? Math.round(((currentAttendeeIndex + 1) / totalAttendees) * 100) : 0}
              showValue={false}
              className="w-full"
              style={{ height: '8px', border: '1px solid #000', backgroundColor: '#374151' }}
            />

            {/* Authentic Person Card in exact AgendaAttendees format */}
            {currentAttendee ? (
              <div key={currentAttendee._id || currentAttendee.id || currentAttendee.name} className="w-full flex flex-column align-items-center gap-3">
                <div
                  className="relative overflow-hidden w-full"
                  style={{
                    maxWidth: '380px',
                    minHeight: '210px',
                    height: 'auto',
                    background: getCardBackground(currentAttendee, currentAttendeeIndex),
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    border: '3px solid #000',
                    boxShadow: '6px 6px 0px #000',
                    borderRadius: '12px'
                  }}
                >
                  <div className="flex flex-1 text-white p-3 sm:p-4 align-items-center">
                    {/* Left: Profile Icon or Custom Avatar */}
                    <div className="relative flex align-items-center justify-content-center border-right-1 border-white-alpha-30 pr-2 sm:pr-4 mr-2 sm:mr-4 flex-shrink-0">
                      <div className="relative flex align-items-center justify-content-center">
                        {currentAttendee.avatarUrl ? (
                          <img
                            src={currentAttendee.avatarUrl}
                            alt={currentAttendee.name}
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
                    </div>

                    {/* Right: Details */}
                    <div className="flex flex-column flex-1 justify-content-center m-0 p-0 min-w-0">
                      <div className="flex justify-content-between align-items-start mb-1 sm:mb-2 gap-1">
                        <div className="font-bold text-lg sm:text-2xl overflow-hidden text-overflow-ellipsis white-space-nowrap text-white flex-1 min-w-0">
                          {currentAttendee.name}
                        </div>
                      </div>

                      <div className="flex flex-column gap-1 text-xs sm:text-sm text-white-alpha-90">
                        <div>
                          <strong className="block text-3xs sm:text-xs text-white-alpha-60 uppercase tracking-wide mt-1 mb-0">E-Mail</strong>
                          {currentAttendee.email ? (
                            <a
                              href={`mailto:${currentAttendee.email}`}
                              className="m-0 p-0 line-height-1 text-white-alpha-90 hover:text-yellow-300 flex align-items-center gap-1 font-semibold overflow-hidden text-overflow-ellipsis"
                              title={currentAttendee.email}
                            >
                              <i className="mdi mdi-email text-yellow-400 text-xs flex-shrink-0" />
                              <span className="overflow-hidden text-overflow-ellipsis white-space-nowrap">{currentAttendee.email}</span>
                            </a>
                          ) : (
                            <span className="m-0 p-0 line-height-1 text-white-alpha-40 italic">Keine E-Mail</span>
                          )}
                        </div>
                        <div>
                          <strong className="block text-3xs sm:text-xs text-white-alpha-60 uppercase tracking-wide mt-1 mb-0">Zuletzt online</strong>
                          <span className={`m-0 p-0 line-height-1 ${isUserOnline(currentAttendee.lastSeen) ? 'text-green-300 font-bold' : ''}`}>
                            {formatDate(currentAttendee.lastSeen)}
                          </span>
                        </div>
                        <div>
                          <strong className="block text-3xs sm:text-xs text-white-alpha-60 uppercase tracking-wide mt-1 mb-0">Erstellte Punkte</strong>
                          <span className="m-0 p-0 line-height-1 font-bold text-yellow-300">
                            {itemCounts.get(currentAttendee._id || currentAttendee.id || currentAttendee.name) || 0} Punkte
                          </span>
                        </div>

                        {/* Pinned Badges */}
                        {currentAttendee.pinnedAchievements && currentAttendee.pinnedAchievements.length > 0 && (
                          <div 
                            className="flex align-items-center mt-1.5 pt-1 border-top-1 border-white-alpha-20"
                            style={{ gap: '0.75rem' }}
                          >
                            {currentAttendee.pinnedAchievements.slice(0, 3).map((achId: string) => (
                              <PinnedAchievementBadge key={achId} achId={achId} size="small" />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Big Prominent Buttons: Green (Present) & Red (Absent) */}
                <div className="flex flex-column sm:flex-row align-items-stretch justify-content-center gap-3 w-full max-w-sm mt-2 flex-shrink-0">
                  <Button
                    label="Anwesend"
                    icon="pi pi-check text-xl"
                    className="comic-button-success flex-1 py-3 text-lg font-bold flex align-items-center justify-content-center gap-2"
                    style={{ minHeight: '3.8rem' }}
                    onClick={() => handleRecordAttendance('present')}
                    data-testid="attendance-present-btn"
                  />
                  <Button
                    label="Abwesend"
                    icon="pi pi-times text-xl"
                    className="comic-button-danger flex-1 py-3 text-lg font-bold flex align-items-center justify-content-center gap-2"
                    style={{ minHeight: '3.8rem' }}
                    onClick={() => handleRecordAttendance('absent')}
                    data-testid="attendance-absent-btn"
                  />
                </div>
              </div>
            ) : (
              <p className="text-gray-400">Kein Teilnehmer ausgewählt.</p>
            )}

            {/* Sub Controls: Back, Skip, View All */}
            <div className="flex align-items-center justify-content-between w-full gap-2 mt-2 flex-wrap">
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
                className="text-yellow-400 hover:underline ml-auto"
                data-testid="view-rollcall-summary-btn"
              />
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            PHASE 3: ANWESENHEITS-ÜBERSICHT (Personen-Karten auf einer Seite)
            ═══════════════════════════════════════════════════════════════════════ */}
        {phase === 'roll_call_summary' && (
          <div className="w-full max-w-4xl flex flex-column gap-4 z-1 my-auto">
            {/* Header with quick stats */}
            <div className="flex flex-column sm:flex-row align-items-start sm:align-items-center justify-content-between gap-3 border-bottom-1 border-gray-700 pb-3">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold m-0 text-yellow-400" style={{ textShadow: '2px 2px 0 #000' }}>
                  Anwesenheits-Übersicht
                </h2>
                <span className="text-xs text-gray-400">
                  Überprüfe die Anwesenheit aller Teilnehmer. Klicke auf die Buttons einer Personen-Karte, um den Status anzupassen.
                </span>
              </div>

              {/* Status pill badges */}
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
            </div>

            {/* Grid of all attendees in exact Person Card format */}
            <div
              className="grid gap-3 overflow-y-auto max-h-30rem p-1 justify-content-center"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 340px))'
              }}
            >
              {localAttendees.map((att, idx) => {
                const isPresent = att.attendanceStatus === 'present';
                const isAbsent = att.attendanceStatus === 'absent';
                const attendeeId = att._id || att.id || att.name;
                const count = itemCounts.get(attendeeId) || 0;
                const online = isUserOnline(att.lastSeen);

                return (
                  <div
                    key={attendeeId || idx}
                    className="relative overflow-hidden w-full flex flex-column justify-content-between"
                    style={{
                      maxWidth: '340px',
                      minHeight: '220px',
                      height: 'auto',
                      background: getCardBackground(att, idx),
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      border: isPresent
                        ? '3px solid #22c55e'
                        : isAbsent
                        ? '3px solid #ef4444'
                        : '3px solid #000000',
                      boxShadow: '4px 4px 0px #000000',
                      borderRadius: '12px'
                    }}
                  >
                    <div className="flex flex-1 text-white p-3 sm:p-4 align-items-center">
                      {/* Left: Profile Icon or Custom Avatar */}
                      <div className="relative flex align-items-center justify-content-center border-right-1 border-white-alpha-30 pr-2 sm:pr-4 mr-2 sm:mr-4 flex-shrink-0">
                        <div className="relative flex align-items-center justify-content-center">
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
                      </div>

                      {/* Right: Details */}
                      <div className="flex flex-column flex-1 justify-content-center m-0 p-0 min-w-0">
                        <div className="flex justify-content-between align-items-start mb-1 sm:mb-2 gap-1">
                          <div className="font-bold text-lg sm:text-2xl overflow-hidden text-overflow-ellipsis white-space-nowrap text-white flex-1 min-w-0">
                            {att.name}
                          </div>
                        </div>

                        <div className="flex flex-column gap-1 text-xs sm:text-sm text-white-alpha-90">
                          <div>
                            <strong className="block text-3xs sm:text-xs text-white-alpha-60 uppercase tracking-wide mt-1 mb-0">E-Mail</strong>
                            {att.email ? (
                              <a
                                href={`mailto:${att.email}`}
                                className="m-0 p-0 line-height-1 text-white-alpha-90 hover:text-yellow-300 flex align-items-center gap-1 font-semibold overflow-hidden text-overflow-ellipsis"
                                title={att.email}
                              >
                                <i className="mdi mdi-email text-yellow-400 text-xs flex-shrink-0" />
                                <span className="overflow-hidden text-overflow-ellipsis white-space-nowrap">{att.email}</span>
                              </a>
                            ) : (
                              <span className="m-0 p-0 line-height-1 text-white-alpha-40 italic">Keine E-Mail</span>
                            )}
                          </div>
                          <div>
                            <strong className="block text-3xs sm:text-xs text-white-alpha-60 uppercase tracking-wide mt-1 mb-0">Zuletzt online</strong>
                            <span className={`m-0 p-0 line-height-1 ${online ? 'text-green-300 font-bold' : ''}`}>
                              {formatDate(att.lastSeen)}
                            </span>
                          </div>
                          <div>
                            <strong className="block text-3xs sm:text-xs text-white-alpha-60 uppercase tracking-wide mt-1 mb-0">Erstellte Punkte</strong>
                            <span className="m-0 p-0 line-height-1 font-bold text-yellow-300">
                              {count} Punkte
                            </span>
                          </div>

                          {/* Pinned Badges */}
                          {att.pinnedAchievements && att.pinnedAchievements.length > 0 && (
                            <div 
                              className="flex align-items-center mt-1.5 pt-1 border-top-1 border-white-alpha-20"
                              style={{ gap: '0.75rem' }}
                            >
                              {att.pinnedAchievements.slice(0, 3).map((achId: string) => (
                                <PinnedAchievementBadge key={achId} achId={achId} size="small" />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Toggle Action Bar at the bottom of the Card */}
                    <div
                      className="flex align-items-center justify-content-between gap-2 px-3 py-2 border-top-1 border-white-alpha-30"
                      style={{ backgroundColor: 'rgba(0, 0, 0, 0.35)' }}
                    >
                      <span className="text-xs font-bold text-white">
                        {isPresent ? '🟢 Anwesend' : isAbsent ? '🔴 Abwesend' : '⚪ Unbestätigt'}
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

            {/* Bottom Actions */}
            <div className="flex flex-column sm:flex-row align-items-center justify-content-between gap-3 border-top-1 border-gray-700 pt-3">
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
                className="comic-button-success px-4 py-3 text-base sm:text-lg font-bold flex align-items-center gap-2"
                onClick={() => {
                  setCurrentItemIndex(0);
                  setPhase('agenda_items');
                  onUpdateAgenda({
                    liveMeetingPhase: 'agenda_items',
                    liveMeetingCurrentItemIndex: 0,
                    liveMeetingElapsedSeconds: sessionSeconds,
                  });
                }}
                data-testid="start-agenda-items-btn"
              />
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            PHASE 4: SCHRITT-FÜR-SCHRITT AGENDAPUNKTE (2-Spalten-Layout)
            ═══════════════════════════════════════════════════════════════════════ */}
        {phase === 'agenda_items' && (
          <div className="w-full max-w-6xl flex flex-column gap-3 z-1 h-full max-h-full py-1">
            {totalItems === 0 ? (
              <div className="text-center p-6 my-auto">
                <i className="pi pi-folder-open text-gray-500 text-5xl mb-3" />
                <h2 className="text-2xl font-bold text-white mb-2">Keine Agendapunkte vorhanden</h2>
                <p className="text-gray-400 mb-4">Füge in der Hauptansicht Agendapunkte hinzu, um sie hier durchzugehen.</p>
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
              </div>
            ) : currentItem ? (
              <div className="flex flex-column gap-2 sm:gap-3 h-full justify-content-between overflow-hidden">
                {/* Navigation Bar / TOP Indicator Header */}
                <div className="flex align-items-center justify-content-between gap-2 flex-wrap px-1 py-1 flex-shrink-0">
                  <div className="flex align-items-center gap-2">
                    <span className="text-sm sm:text-base font-bold text-yellow-400 font-mono tracking-wide">
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
                  </div>
                </div>

                {/* Main Topic Information: 2-Column Responsive Layout */}
                {(() => {
                  const currentComments = currentItem.comments || [];
                  const notes = currentComments.filter((c: any) => c.text && (c.text.startsWith('📝') || c.text.includes('Sitzungsnotiz')));
                  const regularComments = currentComments.filter((c: any) => !c.text || (!c.text.startsWith('📝') && !c.text.includes('Sitzungsnotiz')));
                  const hasPoll = !!(currentItem.poll && currentItem.poll.options && currentItem.poll.options.length > 0);
                  const hasRightColumn = hasPoll || regularComments.length > 0;

                  return (
                    <div className="flex-1 overflow-hidden flex flex-column md:flex-row gap-3 min-h-0">
                      {/* Left Column: Title, Referent, Badges, Description, Images, Notes List & Input */}
                      <div
                        className={`comic-panel-dark p-3 sm:p-4 overflow-y-auto flex flex-column gap-3 border-round-2xl ${
                          hasRightColumn ? 'flex-1 min-w-0' : 'w-full'
                        }`}
                        style={{
                          backgroundColor: '#1f2937',
                          border: '3px solid #000000',
                          boxShadow: '4px 4px 0px #000000'
                        }}
                      >
                        {/* Topic Title Header */}
                        <div className="flex flex-column gap-2 border-bottom-1 border-gray-700 pb-3">
                          <div className="flex align-items-start justify-content-between gap-2">
                            <h2
                              className="text-xl sm:text-2xl md:text-3xl font-bold m-0 text-white line-height-2 flex-1"
                              style={{ textShadow: '2px 2px 0 #000' }}
                            >
                              {currentItem.title}
                            </h2>

                            {/* Live Pin Toggle: nur Pin-Icon rechts oben in der Ecke */}
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

                          {/* Author Badge */}
                          {currentItem.author && (
                            <div className="flex align-items-center gap-2 flex-wrap mt-1">
                              <PersonChip
                                name={currentItem.author}
                                color={getAttendeeColor(attendees, currentItem.author).color}
                                size="sm"
                              />
                            </div>
                          )}

                          {/* Da drunter: Likes Display (Daumen ohne Zahl und Badges der likes) */}
                          <div className="flex align-items-center gap-2 flex-wrap text-2xs text-gray-300 mt-2" data-testid="item-likes-container">
                            <span
                              className={`flex align-items-center ${hasLiked ? 'text-yellow-400' : 'text-gray-400 hover:text-white'} cursor-pointer mr-2`}
                              onClick={handleToggleLikeCurrentItem}
                              title={hasLiked ? 'Like zurücknehmen' : 'Diesen TOP liken'}
                              data-testid="item-likes-indicator"
                            >
                              <i className={`text-base ${hasLiked || (currentItem.upvotes && currentItem.upvotes.length > 0) ? 'pi pi-thumbs-up-fill text-yellow-400' : 'pi pi-thumbs-up'}`} />
                            </span>
                            {currentItem.upvotes && currentItem.upvotes.map((voterId: string) => {
                              const att = attendees.find(
                                (a: any) =>
                                  (a.id && a.id === voterId) ||
                                  (a._id && a._id === voterId) ||
                                  a.name === voterId
                              );
                              const name = att?.name || voterId;
                              return (
                                <PersonChip
                                  key={voterId}
                                  name={name}
                                  color={getAttendeeColor(attendees, voterId).color}
                                  size="sm"
                                />
                              );
                            })}
                          </div>
                        </div>

                        {/* Topic Description */}
                        {currentItem.description ? (
                          <div className="text-gray-100 text-sm sm:text-base line-height-3 white-space-pre-wrap">
                            {currentItem.description}
                          </div>
                        ) : (
                          <div className="text-gray-400 text-xs italic">Keine zusätzliche Beschreibung vorhanden.</div>
                        )}

                        {/* Topic Images */}
                        {(currentItem.imageUrl || (currentItem.imageUrls && currentItem.imageUrls.length > 0)) && (
                          <div className="flex flex-column gap-2 mt-1">
                            <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">Anhänge & Bilder</span>
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

                        {/* Saved Notes / Decisions list for this TOP */}
                        {notes.length > 0 && (
                          <div className="flex flex-column gap-2 bg-gray-950 p-3 border-round-xl border-1 border-yellow-500-alpha-30 mt-1">
                            <span className="text-xs font-bold text-yellow-400 flex align-items-center gap-1">
                              <i className="pi pi-book" /> Protokollierte Notizen / Beschlüsse ({notes.length}):
                            </span>
                            <div className="flex flex-column gap-2 max-h-12rem overflow-y-auto">
                              {notes.map((n: any, nIdx: number) => (
                                <div key={n.id || nIdx} className="text-xs text-gray-200 bg-gray-900 p-2 border-round flex flex-column gap-1">
                                  <div className="flex align-items-center justify-content-between">
                                    <span className="font-bold text-yellow-300">{n.author || 'Notiz'}</span>
                                    <span className="text-gray-500 text-3xs">{formatDate(n.createdAt)}</span>
                                  </div>
                                  <span className="white-space-pre-wrap">{n.text.replace(/^📝\s*\*\*Sitzungsnotiz \/ Beschluss:\*\*\s*/, '')}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Live Meeting Notes / Decisions Input */}
                        <div className="flex flex-column gap-2 border-top-1 border-gray-700 pt-3 mt-auto">
                          <span className="text-xs font-bold text-yellow-400 flex align-items-center gap-1">
                            <i className="pi pi-pencil" /> Sitzungsbeschluss / Notiz festhalten:
                          </span>
                          <div className="flex gap-2">
                            <InputTextarea
                              value={quickNote}
                              onChange={(e) => setQuickNote(e.target.value)}
                              placeholder="Kurzen Beschluss oder Notiz zu diesem TOP notieren..."
                              rows={2}
                              autoResize={false}
                              className="w-full text-sm bg-gray-900 text-white font-medium resize-none"
                              style={{ border: '2px solid #000', borderRadius: '8px', resize: 'none' }}
                            />
                            <Button
                              icon="pi pi-check"
                              label="Speichern"
                              className="comic-button-success p-button-sm text-xs font-bold flex-shrink-0 self-end py-2 px-3"
                              disabled={!quickNote.trim() || isSavingNote}
                              loading={isSavingNote}
                              onClick={handleAddQuickNote}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Right Column: Poll & Comments */}
                      {hasRightColumn && (
                        <div
                          className="w-full md:w-5 min-w-0 overflow-y-auto flex flex-column gap-3 comic-panel-dark p-3 sm:p-4 border-round-2xl flex-shrink-0"
                          style={{
                            backgroundColor: '#1f2937',
                            border: '3px solid #000000',
                            boxShadow: '4px 4px 0px #000000'
                          }}
                        >
                          {/* Poll */}
                          {hasPoll && (
                            <div
                              className="p-3 border-round-xl flex flex-column gap-2"
                              style={{
                                backgroundColor: '#111827',
                                border: '2px solid #eab308',
                                boxShadow: '3px 3px 0 #000'
                              }}
                            >
                              <div className="flex align-items-center gap-2">
                                <i className="pi pi-chart-bar text-yellow-400 text-base" />
                                <span className="font-bold text-white text-sm">
                                  {currentItem.poll.question || 'Abstimmung'}
                                </span>
                              </div>
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
                                      <div className="flex justify-content-between text-xs font-bold">
                                        <span className="text-gray-200">{opt.text}</span>
                                        <span className="text-yellow-400">{votesCount} Stimmen ({percentage}%)</span>
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
                            </div>
                          )}

                          {/* Comments List */}
                          {regularComments.length > 0 && (
                            <div className="flex flex-column gap-2 flex-1 min-h-0">
                              <span className="text-xs font-bold text-yellow-400 flex align-items-center gap-1">
                                <i className="pi pi-comments" /> Kommentare ({regularComments.length})
                              </span>
                              <div className="flex flex-column overflow-y-auto flex-1">
                                {regularComments.map((comment: any, cIdx: number) => (
                                  <div
                                    key={comment.id || cIdx}
                                    className={`py-2.5 flex flex-column gap-1 ${
                                      cIdx < regularComments.length - 1 ? 'border-bottom-1 border-gray-700' : ''
                                    }`}
                                  >
                                    <div className="flex align-items-center justify-content-between">
                                      <PersonChip
                                        name={comment.author || 'Teilnehmer'}
                                        color={getAttendeeColor(attendees, comment.createdBy || comment.author).color}
                                        size="sm"
                                      />
                                      <span className="text-3xs text-gray-500">{formatDate(comment.createdAt)}</span>
                                    </div>
                                    <p className="m-0 text-xs text-gray-200 white-space-pre-wrap">{comment.text}</p>
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
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Bottom Sticky Navigation */}
                <div className="flex align-items-center justify-content-between gap-2 sm:gap-3 pt-2 flex-wrap flex-shrink-0">
                  <Button
                    label="Vorheriger TOP"
                    icon="pi pi-chevron-left"
                    className="comic-button-secondary text-xs sm:text-sm font-bold"
                    disabled={currentItemIndex === 0}
                    onClick={handlePrevItem}
                    data-testid="prev-top-btn"
                  />


                  <div className="flex align-items-center gap-2">
                    {currentItemIndex + 1 < totalItems && (
                      <Button
                        label="Überspringen"
                        icon="pi pi-forward"
                        text
                        size="small"
                        className="text-gray-400 hover:text-white text-xs font-bold"
                        onClick={() => handleNextItem(false)}
                        title="Zum nächsten Punkt wechseln ohne diesen als erledigt abzuhaken"
                        data-testid="skip-top-btn"
                      />
                    )}

                    <Button
                      label={isSessionRunning ? 'Pause' : 'Fortsetzen'}
                      icon={isSessionRunning ? 'pi pi-pause' : 'pi pi-play'}
                      className={`${
                        isSessionRunning ? 'comic-button-secondary' : 'comic-button-warning'
                      } text-xs sm:text-sm font-bold px-3 sm:px-4 py-2`}
                      onClick={handleTogglePause}
                      title={isSessionRunning ? 'Sitzung pausieren (beide Timer anhalten)' : 'Sitzung fortsetzen (beide Timer starten)'}
                      data-testid="toggle-session-timer-btn"
                    />

                    <Button
                      label={currentItemIndex + 1 < totalItems ? 'Abhaken & Weiter' : 'Abhaken & Beenden'}
                      icon="pi pi-check"
                      iconPos="right"
                      className="comic-button-success text-xs sm:text-sm font-bold px-3 sm:px-4 py-2"
                      onClick={() => handleNextItem(true)}
                      data-testid="next-top-btn"
                    />
                  </div>
                </div>
              </div>
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
          <div className="w-full max-w-3xl text-center flex flex-column align-items-center gap-4 py-4 z-1 my-auto overflow-y-auto max-h-full">
            <span
              className="p-4 border-circle bg-yellow-500 text-black flex align-items-center justify-content-center flex-shrink-0"
              style={{ width: '5rem', height: '5rem', border: '3px solid #000', boxShadow: '4px 4px 0 #000' }}
            >
              <i className="pi pi-check text-3xl font-bold" />
            </span>

            <h1
              className="text-2xl sm:text-4xl font-bold m-0 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 line-height-2"
              style={{ filter: 'drop-shadow(3px 3px 0px #000)' }}
            >
              Sitzung abgeschlossen!
            </h1>

            <p className="text-gray-300 text-sm sm:text-base m-0 max-w-md">
              Alle Agendapunkte und Anwesenheitsdaten wurden erfolgreich erfasst und gespeichert.
            </p>

            {/* Results Grid */}
            <div className="grid w-full gap-3 sm:gap-4 my-1">
              <div
                className="p-3 border-round-xl flex flex-column align-items-center flex-1"
                style={{ backgroundColor: '#1f2937', border: '2px solid #000', boxShadow: '3px 3px 0 #000' }}
              >
                <span className="text-xl sm:text-2xl font-bold text-yellow-400 font-mono">
                  {formatTimer(sessionSeconds)}
                </span>
                <span className="text-xs text-gray-400 uppercase font-bold mt-1">Sitzungsdauer</span>
              </div>

              <div
                className="p-3 border-round-xl flex flex-column align-items-center flex-1"
                style={{ backgroundColor: '#1f2937', border: '2px solid #000', boxShadow: '3px 3px 0 #000' }}
              >
                <span className="text-xl sm:text-2xl font-bold text-green-400">
                  {completedItemsCount}/{totalItems}
                </span>
                <span className="text-xs text-gray-400 uppercase font-bold mt-1">Besprochen</span>
              </div>

              <div
                className="p-3 border-round-xl flex flex-column align-items-center flex-1"
                style={{ backgroundColor: '#1f2937', border: '2px solid #000', boxShadow: '3px 3px 0 #000' }}
              >
                <span className="text-xl sm:text-2xl font-bold text-blue-400">
                  {presentCount}/{totalAttendees}
                </span>
                <span className="text-xs text-gray-400 uppercase font-bold mt-1">Anwesend ({attendanceRate}%)</span>
              </div>
            </div>

            {/* TOP Duration Table */}
            <div
              className="w-full p-3 sm:p-4 border-round-xl flex flex-column gap-2 text-left"
              style={{ backgroundColor: '#1f2937', border: '2px solid #000', boxShadow: '3px 3px 0 #000' }}
            >
              <div className="flex align-items-center justify-content-between border-bottom-1 border-gray-700 pb-2">
                <span className="text-xs sm:text-sm font-bold text-yellow-400 uppercase tracking-wider flex align-items-center gap-1">
                  <i className="pi pi-table" /> Besprechungsdauer je Agendapunkt
                </span>
                <span className="text-2xs text-gray-400 font-mono">
                  Summe: {formatTimer(sessionSeconds)}
                </span>
              </div>

              <div className="max-h-16rem overflow-y-auto">
                <table className="w-full text-xs text-gray-200" style={{ borderCollapse: 'collapse' }}>
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
                      <tr key={it._id || it.id || idx} className="border-bottom-1 border-gray-800 hover:bg-gray-800">
                        <td className="py-2 px-2 text-gray-400 font-mono">#{idx + 1}</td>
                        <td className="py-2 px-2 font-semibold text-white white-space-nowrap overflow-hidden text-overflow-ellipsis max-w-16rem">
                          {it.title}
                        </td>
                        <td className="py-2 px-2 text-center">
                          {it.completed ? (
                            <span className="text-green-400 font-bold">✓ Besprochen</span>
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
            </div>

            {/* Protocol Actions */}
            <div className="flex align-items-center justify-content-center gap-2 sm:gap-3 flex-wrap w-full">
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
            </div>

            {/* Final Action Buttons */}
            <div className="flex flex-column sm:flex-row align-items-center justify-content-center gap-3 w-full max-w-md mt-2">
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
          </div>
        )}
      </main>
    </Dialog>
  );
};

export default LiveMeetingModal;
