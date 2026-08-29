import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { ProgressBar } from 'primereact/progressbar';
import { InputTextarea } from 'primereact/inputtextarea';
import { PersonChip, getAttendeeColor } from './PersonChip';
import { format } from 'date-fns';
import { CARD_COLOR_PALETTE } from './AgendaAttendees';

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

export const formatTimer = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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

  // Timers
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [itemSeconds, setItemSeconds] = useState(0);
  const [isSessionRunning, setIsSessionRunning] = useState(true);
  const [isItemRunning, setIsItemRunning] = useState(true);

  // Quick note / decision state
  const [quickNote, setQuickNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Reset indices and timers when modal opens
  useEffect(() => {
    if (visible) {
      setPhase('intro');
      setCurrentAttendeeIndex(0);
      setCurrentItemIndex(0);
      setSessionSeconds(0);
      setItemSeconds(0);
      setIsSessionRunning(true);
      setIsItemRunning(true);
      setLocalAttendees(attendees || []);
      setLocalItems(items || []);
    }
  }, [visible]);

  // Overall session timer effect
  useEffect(() => {
    if (!visible || !isSessionRunning) return;
    const interval = setInterval(() => {
      setSessionSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [visible, isSessionRunning]);

  // Active agenda item timer effect
  useEffect(() => {
    if (!visible || !isItemRunning || phase !== 'agenda_items') return;
    const interval = setInterval(() => {
      setItemSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [visible, isItemRunning, phase]);

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

  // Item counts per attendee
  const itemCounts = useMemo(() => {
    const counts = new Map<string, number>();
    (localItems || []).forEach((item) => {
      if (item.createdBy) {
        counts.set(item.createdBy, (counts.get(item.createdBy) || 0) + 1);
      }
      if (item.author) {
        counts.set(item.author, (counts.get(item.author) || 0) + 1);
      }
    });
    return counts;
  }, [localItems]);

  // Item statistics
  const totalItems = localItems.length;
  const completedItemsCount = useMemo(
    () => localItems.filter((i) => i.completed).length,
    [localItems]
  );

  // Current active attendee & item
  const currentAttendee = localAttendees[currentAttendeeIndex] || null;
  const currentItem = localItems[currentItemIndex] || null;

  // Helper to persist attendees
  const saveAttendees = useCallback(
    async (updatedAttendees: any[]) => {
      setLocalAttendees(updatedAttendees);
      try {
        await onUpdateAgenda({ attendees: updatedAttendees });
      } catch (err) {
        console.error('Failed to update attendees attendance:', err);
      }
    },
    [onUpdateAgenda]
  );

  // Roll call actions
  const handleRecordAttendance = async (status: 'present' | 'absent') => {
    if (!currentAttendee) return;
    const updated = localAttendees.map((att, idx) => {
      if (idx === currentAttendeeIndex) {
        return { ...att, attendanceStatus: status };
      }
      return att;
    });

    await saveAttendees(updated);

    if (currentAttendeeIndex + 1 < localAttendees.length) {
      setCurrentAttendeeIndex((prev) => prev + 1);
    } else {
      setPhase('roll_call_summary');
    }
  };

  const handleSkipAttendee = () => {
    if (currentAttendeeIndex + 1 < localAttendees.length) {
      setCurrentAttendeeIndex((prev) => prev + 1);
    } else {
      setPhase('roll_call_summary');
    }
  };

  const handlePrevAttendee = () => {
    if (currentAttendeeIndex > 0) {
      setCurrentAttendeeIndex((prev) => prev - 1);
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
    await saveAttendees(updated);
  };

  // Agenda Item Actions
  const handleToggleItemComplete = async (itemIndex: number) => {
    const updated = localItems.map((item, idx) => {
      if (idx === itemIndex) {
        return { ...item, completed: !item.completed };
      }
      return item;
    });
    setLocalItems(updated);
    try {
      await onUpdateItems(updated);
    } catch (err) {
      console.error('Failed to update item completed state:', err);
    }
  };

  const handleNextItem = async (markAsCompleted = true) => {
    let updated = localItems;
    if (markAsCompleted && currentItem && !currentItem.completed) {
      updated = localItems.map((item, idx) => {
        if (idx === currentItemIndex) {
          return { ...item, completed: true };
        }
        return item;
      });
      setLocalItems(updated);
      try {
        await onUpdateItems(updated);
      } catch (err) {
        console.error('Failed to update item completed state on next:', err);
      }
    }

    if (currentItemIndex + 1 < localItems.length) {
      setCurrentItemIndex((prev) => prev + 1);
      setItemSeconds(0);
    } else {
      setPhase('summary');
    }
  };

  const handlePrevItem = () => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex((prev) => prev - 1);
      setItemSeconds(0);
    }
  };

  const handleJumpToItem = (index: number) => {
    setCurrentItemIndex(index);
    setItemSeconds(0);
    setShowItemDrawer(false);
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
      onHide={onHide}
      maximized
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
      {/* ─── TOP STICKY BAR: Timers, Phase Status & Close ─── */}
      <header
        className="flex align-items-center justify-content-between px-3 sm:px-4 py-2 border-bottom-2 border-black flex-shrink-0 z-5"
        style={{
          backgroundColor: '#1f2937',
          boxShadow: '0 4px 12px rgba(0,0,0,0.6)'
        }}
      >
        <div className="flex align-items-center gap-2 sm:gap-3 min-w-0">
          <span
            className="inline-flex align-items-center justify-content-center border-circle bg-yellow-500 text-black flex-shrink-0"
            style={{ width: '32px', height: '32px', border: '2px solid #000', boxShadow: '1px 1px 0 #000' }}
          >
            <i className="pi pi-play text-sm font-bold" />
          </span>
          <div className="flex flex-column min-w-0">
            <span className="text-yellow-400 font-bold text-xs uppercase tracking-wider">FlashAgenda Live</span>
            <span className="text-white font-bold text-sm sm:text-base white-space-nowrap overflow-hidden text-overflow-ellipsis">
              {agenda?.title || 'Sitzungsmodus'}
            </span>
          </div>
        </div>

        {/* Center: Live Timers */}
        <div className="flex align-items-center gap-2 sm:gap-4 flex-wrap justify-content-center">
          {/* Total Session Timer */}
          <div
            className="flex align-items-center gap-2 px-3 py-1 border-round-xl"
            style={{
              backgroundColor: '#111827',
              border: '2px solid #000',
              boxShadow: '2px 2px 0px #000'
            }}
            title="Gesamte Sitzungsdauer (Klicken für Pause/Weiter)"
          >
            <i className="pi pi-clock text-yellow-400 text-sm" />
            <div className="flex flex-column">
              <span className="text-gray-400 font-bold text-2xs uppercase">Sitzung</span>
              <span className="text-white font-bold font-mono text-xs sm:text-sm">
                {formatTimer(sessionSeconds)}
              </span>
            </div>
            <Button
              icon={isSessionRunning ? 'pi pi-pause' : 'pi pi-play'}
              text
              rounded
              size="small"
              className="p-0 text-yellow-400 ml-1 hover:text-white"
              style={{ width: '1.4rem', height: '1.4rem' }}
              onClick={() => setIsSessionRunning((p) => !p)}
            />
          </div>

          {/* TOP Timer (only in agenda_items phase) */}
          {phase === 'agenda_items' && (
            <div
              className="flex align-items-center gap-2 px-3 py-1 border-round-xl bg-gray-900"
              style={{
                border: '2px solid #3b82f6',
                boxShadow: '2px 2px 0px #000'
              }}
              title="Dauer für aktuellen Agendapunkt"
            >
              <i className="pi pi-stopwatch text-blue-400 text-sm" />
              <div className="flex flex-column">
                <span className="text-blue-300 font-bold text-2xs uppercase">TOP {currentItemIndex + 1}</span>
                <span className="text-blue-200 font-bold font-mono text-xs sm:text-sm">
                  {formatTimer(itemSeconds)}
                </span>
              </div>
              <Button
                icon="pi pi-refresh"
                text
                rounded
                size="small"
                className="p-0 text-blue-300 ml-1 hover:text-white"
                style={{ width: '1.4rem', height: '1.4rem' }}
                onClick={() => setItemSeconds(0)}
                title="TOP-Timer zurücksetzen"
              />
            </div>
          )}
        </div>

        {/* Right: Phase switcher / Close */}
        <div className="flex align-items-center gap-2 flex-shrink-0">
          <Button
            icon="pi pi-times"
            rounded
            text
            size="small"
            className="text-gray-300 hover:text-red-400"
            onClick={onHide}
            title="Sitzungsmodus verlassen"
            style={{ width: '2.2rem', height: '2.2rem' }}
            data-testid="close-live-meeting-btn"
          />
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
              <div className="w-full flex flex-column align-items-center gap-3">
                <div
                  className="relative overflow-hidden w-full"
                  style={{
                    maxWidth: '360px',
                    minHeight: '190px',
                    height: 'auto',
                    background: getCardBackground(currentAttendee, currentAttendeeIndex),
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    border: '3px solid #000',
                    boxShadow: '6px 6px 0px #000',
                    borderRadius: '12px'
                  }}
                >
                  <div className="flex h-full text-white p-3 sm:p-4 align-items-center">
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
                      </div>
                    </div>
                  </div>
                </div>

                {/* Big Prominent Buttons: Green (Present) & Red (Absent) */}
                <div className="flex flex-column sm:flex-row align-items-stretch justify-content-center gap-3 w-full max-w-sm mt-2">
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
                onClick={() => setPhase('roll_call_summary')}
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
                    <div className="flex h-full text-white p-3 sm:p-4 align-items-center">
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
                }}
                data-testid="start-agenda-items-btn"
              />
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            PHASE 4: SCHRITT-FÜR-SCHRITT AGENDAPUNKTE (Alle Infos auf einer Seite)
            ═══════════════════════════════════════════════════════════════════════ */}
        {phase === 'agenda_items' && (
          <div className="w-full max-w-4xl flex flex-column gap-3 z-1 h-full max-h-full py-1">
            {totalItems === 0 ? (
              <div className="text-center p-6 my-auto">
                <i className="pi pi-folder-open text-gray-500 text-5xl mb-3" />
                <h2 className="text-2xl font-bold text-white mb-2">Keine Agendapunkte vorhanden</h2>
                <p className="text-gray-400 mb-4">Füge in der Hauptansicht Agendapunkte hinzu, um sie hier durchzugehen.</p>
                <Button label="Sitzung beenden" icon="pi pi-check" className="comic-button-success" onClick={() => setPhase('summary')} />
              </div>
            ) : currentItem ? (
              <div className="flex flex-column gap-3 h-full justify-content-between">
                {/* Navigation Bar / TOP Indicator Header */}
                <div className="flex align-items-center justify-content-between gap-2 flex-wrap bg-gray-900 p-2 sm:p-3 border-round-xl border-1 border-gray-700">
                  <div className="flex align-items-center gap-2">
                    <span className="comic-button px-3 py-1 text-xs font-bold">
                      TOP {currentItemIndex + 1} von {totalItems}
                    </span>
                    {currentItem.completed ? (
                      <span className="comic-button-success px-2 py-1 text-2xs uppercase font-bold flex align-items-center gap-1">
                        <i className="pi pi-check" /> Besprochen
                      </span>
                    ) : (
                      <span className="comic-button-secondary px-2 py-1 text-2xs uppercase font-bold text-gray-300">
                        Offen
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

                {/* Main Topic Information Card */}
                <div
                  className="comic-panel-dark p-4 sm:p-5 flex-1 overflow-y-auto flex flex-column gap-4 border-round-2xl"
                  style={{
                    backgroundColor: '#1f2937',
                    border: '3px solid #000000',
                    boxShadow: '4px 4px 0px #000000'
                  }}
                >
                  {/* Topic Title & Author Header */}
                  <div className="flex flex-column gap-2 border-bottom-1 border-gray-700 pb-3">
                    <div className="flex align-items-start justify-content-between gap-3">
                      <h2
                        className="text-2xl sm:text-3xl md:text-4xl font-bold m-0 text-white line-height-2"
                        style={{ textShadow: '2px 2px 0 #000' }}
                      >
                        {currentItem.title}
                      </h2>

                      {/* Quick Mark Complete Button */}
                      <Button
                        label={currentItem.completed ? 'Besprochen' : 'Als besprochen markieren'}
                        icon={currentItem.completed ? 'pi pi-check-circle' : 'pi pi-circle'}
                        className={
                          currentItem.completed
                            ? 'comic-button-success flex-shrink-0 text-xs sm:text-sm font-bold'
                            : 'comic-button-secondary flex-shrink-0 text-xs sm:text-sm font-bold text-yellow-400'
                        }
                        onClick={() => handleToggleItemComplete(currentItemIndex)}
                        data-testid="toggle-item-complete-btn"
                      />
                    </div>

                    {/* Author / Referent & Badges */}
                    <div className="flex align-items-center gap-2 flex-wrap mt-1">
                      {currentItem.author && (
                        <div className="flex align-items-center gap-1">
                          <span className="text-xs text-gray-400">Referent:</span>
                          <PersonChip
                            name={currentItem.author}
                            color={getAttendeeColor(attendees, currentItem.author).color}
                            size="sm"
                          />
                        </div>
                      )}
                      {currentItem.pinned && (
                        <span className="comic-button-secondary px-2 py-1 text-2xs text-yellow-400 flex align-items-center gap-1 font-bold">
                          <i className="pi pi-bookmark-fill" /> Angeheftet
                        </span>
                      )}
                      {currentItem.upvotes && currentItem.upvotes.length > 0 && (
                        <span className="comic-button-secondary px-2 py-1 text-2xs text-red-400 flex align-items-center gap-1 font-bold">
                          <i className="pi pi-heart-fill" /> {currentItem.upvotes.length} Likes
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Topic Description */}
                  {currentItem.description ? (
                    <div className="text-gray-100 text-sm sm:text-base line-height-3 white-space-pre-wrap bg-gray-900 p-3 sm:p-4 border-round-xl border-1 border-gray-800">
                      {currentItem.description}
                    </div>
                  ) : (
                    <div className="text-gray-400 text-sm italic">Keine zusätzliche Beschreibung vorhanden.</div>
                  )}

                  {/* Topic Images */}
                  {(currentItem.imageUrl || (currentItem.imageUrls && currentItem.imageUrls.length > 0)) && (
                    <div className="flex flex-column gap-2 mt-2">
                      <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">Anhänge & Bilder</span>
                      <div className="flex flex-wrap gap-3">
                        {currentItem.imageUrl && (
                          <img
                            src={currentItem.imageUrl}
                            alt="TOP Anhang"
                            className="border-round-xl object-contain max-h-20rem max-w-full"
                            style={{ border: '2px solid #000', boxShadow: '2px 2px 0 #000' }}
                          />
                        )}
                        {currentItem.imageUrls?.map((imgUrl: string, imgIdx: number) => (
                          <img
                            key={imgIdx}
                            src={imgUrl}
                            alt={`TOP Anhang ${imgIdx + 1}`}
                            className="border-round-xl object-contain max-h-20rem max-w-full"
                            style={{ border: '2px solid #000', boxShadow: '2px 2px 0 #000' }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Poll section if attached */}
                  {currentItem.poll && currentItem.poll.options && (
                    <div
                      className="p-4 border-round-xl flex flex-column gap-3"
                      style={{
                        backgroundColor: '#111827',
                        border: '2px solid #eab308',
                        boxShadow: '3px 3px 0 #000'
                      }}
                    >
                      <div className="flex align-items-center gap-2">
                        <i className="pi pi-chart-bar text-yellow-400 text-lg" />
                        <span className="font-bold text-white text-base">
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
                                style={{ height: '8px', backgroundColor: '#374151' }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Live Meeting Notes / Decisions */}
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
                        className="w-full text-sm bg-gray-900 text-white font-medium"
                        style={{ border: '2px solid #000', borderRadius: '8px' }}
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

                {/* Bottom Sticky Navigation */}
                <div className="flex align-items-center justify-content-between gap-2 sm:gap-3 pt-2 flex-wrap">
                  <Button
                    label="Vorheriger TOP"
                    icon="pi pi-chevron-left"
                    className="comic-button-secondary text-xs sm:text-sm font-bold"
                    disabled={currentItemIndex === 0}
                    onClick={handlePrevItem}
                    data-testid="prev-top-btn"
                  />

                  <span className="text-xs text-gray-400 font-bold hidden sm:inline-block">
                    {completedItemsCount} von {totalItems} besprochen
                  </span>

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
              style={{ width: '90vw', maxWidth: '480px' }}
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
                    {item.completed && (
                      <i className={`pi pi-check-circle ${idx === currentItemIndex ? 'text-black' : 'text-green-400'}`} />
                    )}
                  </div>
                ))}
              </div>
            </Dialog>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            PHASE 5: SITZUNGSABSCHLUSS / SUMMARY
            ═══════════════════════════════════════════════════════════════════════ */}
        {phase === 'summary' && (
          <div className="w-full max-w-xl text-center flex flex-column align-items-center gap-4 py-4 z-1 my-auto">
            <span
              className="p-4 border-circle bg-yellow-500 text-black flex align-items-center justify-content-center"
              style={{ width: '5.5rem', height: '5.5rem', border: '3px solid #000', boxShadow: '4px 4px 0 #000' }}
            >
              <i className="pi pi-check text-4xl font-bold" />
            </span>

            <h1
              className="text-3xl sm:text-5xl font-bold m-0 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 line-height-2"
              style={{ filter: 'drop-shadow(3px 3px 0px #000)' }}
            >
              Sitzung abgeschlossen!
            </h1>

            <p className="text-gray-300 text-sm sm:text-base m-0 max-w-md">
              Alle Agendapunkte und Anwesenheitsdaten wurden erfolgreich erfasst und gespeichert.
            </p>

            {/* Results Grid */}
            <div className="grid w-full gap-3 sm:gap-4 my-2">
              <div
                className="p-3 border-round-xl flex flex-column align-items-center flex-1"
                style={{ backgroundColor: '#1f2937', border: '2px solid #000', boxShadow: '3px 3px 0 #000' }}
              >
                <span className="text-2xl sm:text-3xl font-bold text-yellow-400 font-mono">
                  {formatTimer(sessionSeconds)}
                </span>
                <span className="text-xs text-gray-400 uppercase font-bold mt-1">Sitzungsdauer</span>
              </div>

              <div
                className="p-3 border-round-xl flex flex-column align-items-center flex-1"
                style={{ backgroundColor: '#1f2937', border: '2px solid #000', boxShadow: '3px 3px 0 #000' }}
              >
                <span className="text-2xl sm:text-3xl font-bold text-green-400">
                  {completedItemsCount}/{totalItems}
                </span>
                <span className="text-xs text-gray-400 uppercase font-bold mt-1">Besprochen</span>
              </div>

              <div
                className="p-3 border-round-xl flex flex-column align-items-center flex-1"
                style={{ backgroundColor: '#1f2937', border: '2px solid #000', boxShadow: '3px 3px 0 #000' }}
              >
                <span className="text-2xl sm:text-3xl font-bold text-blue-400">
                  {presentCount}/{totalAttendees}
                </span>
                <span className="text-xs text-gray-400 uppercase font-bold mt-1">Anwesend ({attendanceRate}%)</span>
              </div>
            </div>

            {/* Close / Return Button */}
            <div className="flex align-items-center justify-content-center gap-3 w-full max-w-xs mt-2">
              <Button
                label="Zurück zur Agenda"
                icon="pi pi-arrow-left"
                className="comic-button-success w-full py-3 text-base font-bold flex align-items-center justify-content-center gap-2"
                onClick={onHide}
                data-testid="return-from-meeting-btn"
              />
            </div>
          </div>
        )}
      </main>
    </Dialog>
  );
};

export default LiveMeetingModal;
