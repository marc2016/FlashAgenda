import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';
import { de } from 'date-fns/locale';
import AgendaMiniMap from './AgendaMiniMap';
import { PersonChip, PERSON_COLOR_PALETTE } from './PersonChip';
import {
  type AgendaSummary,
  type AgendaStatus,
  getAgendaStatus,
  getItemProgress,
  isAgendaClosedForItems
} from '../utils/agendaOverview';

const MAX_CHIPS = 5;

const STATUS_LABEL: Record<AgendaStatus, string> = {
  live: 'LIVE',
  upcoming: 'ANSTEHEND',
  completed: 'ABGESCHLOSSEN'
};

interface AgendaOverviewCardProps {
  agenda: AgendaSummary;
  now: number;
  onOpen: (id: string) => void;
}

export default function AgendaOverviewCard({ agenda, now, onOpen }: AgendaOverviewCardProps) {
  const status = getAgendaStatus(agenda, now);
  const { done, total } = getItemProgress(agenda);
  const closed = isAgendaClosedForItems(agenda, now);
  const attendees = agenda.attendees || [];
  const date = agenda.date ? parseISO(agenda.date) : null;
  const hasDate = !!date && isValid(date);
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  const title = agenda.title || 'Unbenannte Agenda';

  return (
    <button
      type="button"
      data-testid="agenda-card"
      data-status={status}
      onClick={() => onOpen(agenda._id)}
      className={`agenda-card agenda-card-${status}`}
      aria-label={`${title} öffnen`}
    >
      <AgendaMiniMap location={agenda.location} />

      <div className="agenda-card-body">
        <div className="flex align-items-start justify-content-between gap-2">
          <h3 className="agenda-card-title" title={title}>{title}</h3>
          <div className="flex align-items-center gap-2 flex-shrink-0 pt-1">
            {agenda.isArchived && (
              <i className="pi pi-box text-gray-300" data-testid="agenda-card-archived" title="Archiviert" />
            )}
            {closed && (
              <i className="pi pi-lock text-yellow-400" data-testid="agenda-card-lock" title="Keine neuen Punkte mehr möglich" />
            )}
          </div>
        </div>

        <div className="agenda-card-meta">
          {hasDate ? (
            <>
              <span>
                <i className="pi pi-calendar" />
                {format(date!, 'EEE dd.MM.yyyy · HH:mm', { locale: de })}
              </span>
              <span className="agenda-card-relative" data-testid="agenda-card-relative">
                {formatDistanceToNow(date!, { locale: de, addSuffix: true })}
              </span>
            </>
          ) : (
            <span><i className="pi pi-calendar" />ohne Datum</span>
          )}
          {agenda.location?.name && (
            <span className="agenda-card-location" data-testid="agenda-card-location">
              <i className="pi pi-map-marker" />
              {agenda.location.name}
            </span>
          )}
        </div>

        <div className="agenda-card-progress" title={`${done} von ${total} Punkten abgehakt`}>
          <div className="agenda-card-progress-track">
            <div className="agenda-card-progress-bar" style={{ width: `${percent}%` }} />
          </div>
          <span data-testid="agenda-card-progress">{done}/{total}</span>
        </div>

        <div className="flex align-items-end justify-content-between gap-2 mt-auto">
          <div className="flex flex-wrap gap-1 align-items-center" data-testid="agenda-card-people">
            {attendees.slice(0, MAX_CHIPS).map((att, idx) => (
              <PersonChip
                key={att.id || att._id || `${att.name}-${idx}`}
                name={att.name}
                avatarUrl={att.avatarUrl}
                color={att.cardColor || PERSON_COLOR_PALETTE[idx % PERSON_COLOR_PALETTE.length]}
                size="xs"
              />
            ))}
            {attendees.length > MAX_CHIPS && (
              <span className="agenda-card-more" data-testid="agenda-card-more">+{attendees.length - MAX_CHIPS}</span>
            )}
          </div>
          <span className={`agenda-card-status agenda-card-status-${status}`} data-testid="agenda-status">
            {status === 'live' && <span className="agenda-card-live-dot" />}
            {STATUS_LABEL[status]}
          </span>
        </div>
      </div>
    </button>
  );
}
