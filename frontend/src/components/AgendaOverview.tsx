import { useMemo, useState } from 'react';
import AgendaOverviewCard from './AgendaOverviewCard';
import { type AgendaSummary, canManageAgenda, getAgendaStatus, sortAgendas } from '../utils/agendaOverview';

type TabKey = 'all' | 'upcoming' | 'completed';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'Alle' },
  { key: 'upcoming', label: 'Anstehend' },
  { key: 'completed', label: 'Abgeschlossen' }
];

const EMPTY_TEXT: Record<TabKey, string> = {
  all: 'Noch keine Agenden vorhanden.',
  upcoming: 'Keine anstehenden Agenden.',
  completed: 'Noch keine abgeschlossenen Agenden.'
};

interface AgendaOverviewProps {
  agendas: AgendaSummary[];
  loading: boolean;
  userName?: string;
  currentUser?: { id?: string; _id?: string; name?: string } | null;
  onOpen: (id: string) => void;
  onToggleArchive?: (id: string, archived: boolean) => Promise<void>;
}

export default function AgendaOverview({ agendas, loading, userName, currentUser, onOpen, onToggleArchive }: AgendaOverviewProps) {
  const [tab, setTab] = useState<TabKey>('upcoming');
  // Fixed per render pass so status, sorting and relative times agree with each other.
  const now = useMemo(() => Date.now(), [agendas]);

  const { sorted, counts } = useMemo(() => {
    const sortedAll = sortAgendas(agendas, now);
    const upcoming = sortedAll.filter(a => getAgendaStatus(a, now) !== 'completed');
    const completed = sortedAll.filter(a => getAgendaStatus(a, now) === 'completed');
    return {
      sorted: { all: sortedAll, upcoming, completed } as Record<TabKey, AgendaSummary[]>,
      counts: { all: sortedAll.length, upcoming: upcoming.length, completed: completed.length } as Record<TabKey, number>
    };
  }, [agendas, now]);

  const visible = sorted[tab];

  return (
    <section className="agenda-overview mt-5 w-full text-left z-2 px-1 sm:px-3" style={{ maxWidth: '72rem' }} data-testid="agenda-overview">
      <div className="flex align-items-center justify-content-between flex-wrap gap-2 mb-3 px-1">
        <span className="text-xs font-bold uppercase tracking-wider text-yellow-400 flex align-items-center gap-2">
          <i className="pi pi-th-large text-xs" />
          <span>Deine Agenden ({agendas.length})</span>
        </span>
        {userName && <span className="text-xs text-gray-300 font-bold opacity-80">{userName}</span>}
      </div>

      {loading ? (
        <div className="text-center p-3 text-gray-300 text-xs font-bold">
          <i className="pi pi-spin pi-spinner text-yellow-400 mr-2" />
          Lade deine Agenden...
        </div>
      ) : agendas.length === 0 ? (
        <div className="text-center p-3 bg-black-alpha-30 border-round text-xs text-gray-400 font-bold">
          Noch keine Agenden vorhanden.
        </div>
      ) : (
        <>
          <div className="flex justify-content-center sm:justify-content-start mb-4">
            <div className="agenda-tabs" role="tablist" aria-label="Agenden filtern">
              {TABS.map(t => (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.key}
                  data-testid={`agenda-tab-${t.key}`}
                  className={`agenda-tab${tab === t.key ? ' agenda-tab-active' : ''}`}
                  onClick={() => setTab(t.key)}
                >
                  {t.label}
                  <span className="agenda-tab-count">{counts[t.key]}</span>
                </button>
              ))}
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="text-center p-4 bg-black-alpha-30 border-round text-sm text-gray-300 font-bold" data-testid="agenda-tab-empty">
              {EMPTY_TEXT[tab]}{' '}
              {tab !== 'all' && (
                <button
                  type="button"
                  className="bg-transparent border-none p-0 text-yellow-400 font-bold underline cursor-pointer text-sm"
                  data-testid="agenda-tab-empty-show-all"
                  onClick={() => setTab('all')}
                >
                  Alle anzeigen
                </button>
              )}
            </div>
          ) : (
            <div className="agenda-grid" data-testid="agenda-grid">
              {visible.map(agenda => (
                <AgendaOverviewCard
                  key={agenda._id}
                  agenda={agenda}
                  now={now}
                  onOpen={onOpen}
                  onToggleArchive={onToggleArchive && canManageAgenda(agenda, currentUser) ? onToggleArchive : undefined}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
