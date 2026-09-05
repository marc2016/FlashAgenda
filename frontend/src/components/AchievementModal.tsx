import { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { ProgressBar } from 'primereact/progressbar';
import type {
  IGlobalAchievementsResult,
  IAgendaAchievementsResult
} from '../services/achievementService';
import {
  fetchGlobalAchievements,
  fetchAgendaAchievements,
  ACHIEVEMENT_CATEGORY_COLORS
} from '../services/achievementService';
import AchievementIcon from './AchievementIcon';
import LeaderProfileBadge from './LeaderProfileBadge';

interface Props {
  visible: boolean;
  onHide: () => void;
  agendaId?: string;
  currentUser?: any;
  attendees?: any[];
  onTogglePin?: (achievementId: string) => void;
  pinnedAchievements?: string[];
  initialTab?: 'agenda' | 'global';
}

export default function AchievementModal({
  visible,
  onHide,
  agendaId,
  currentUser,
  attendees = [],
  onTogglePin,
  pinnedAchievements = [],
  initialTab
}: Props) {
  const [activeTab, setActiveTab] = useState<'agenda' | 'global'>(() => {
    if (initialTab) return initialTab;
    return agendaId ? 'agenda' : 'global';
  });

  const [globalCategory, setGlobalCategory] = useState<string>('all');
  const [globalData, setGlobalData] = useState<IGlobalAchievementsResult | null>(null);
  const [agendaData, setAgendaData] = useState<IAgendaAchievementsResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    } else if (agendaId) {
      setActiveTab('agenda');
    } else {
      setActiveTab('global');
    }
  }, [visible, agendaId, initialTab]);

  useEffect(() => {
    if (!visible) return;

    const loadData = async () => {
      setLoading(true);
      const userId = currentUser?.id || currentUser?._id;
      const userName = currentUser?.name;

      // 1. Fetch Global Data
      const gRes = await fetchGlobalAchievements(userId, userName, {
        cardColor: currentUser?.cardColor,
        avatarUrl: currentUser?.avatarUrl,
        securityCode: currentUser?.securityCode,
        secretGuid: currentUser?.secretGuid
      });
      if (gRes) setGlobalData(gRes);

      // 2. Fetch Agenda Data if agendaId provided
      if (agendaId) {
        const aRes = await fetchAgendaAchievements(agendaId, userId, userName);
        if (aRes) setAgendaData(aRes);
      }

      setLoading(false);
    };

    loadData();
  }, [visible, agendaId, currentUser]);

  const activePins = pinnedAchievements.length > 0 ? pinnedAchievements : (globalData?.pinnedAchievements || []);

  const filteredGlobalAchievements = (globalData?.achievements || []).filter(ach => {
    if (globalCategory === 'all') return true;
    return ach.category === globalCategory;
  });

  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      showHeader={false}
      style={{ width: '95vw', maxWidth: '1150px' }}
      contentStyle={{
        padding: 0,
        background: '#111827',
        borderRadius: '16px',
        border: '3px solid #000',
        boxShadow: '8px 8px 0px #000',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '90vh',
        overflow: 'hidden'
      }}
      maskStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(8px)' }}
      modal
      dismissableMask
    >
      <div className="flex flex-column text-white w-full h-full overflow-hidden" style={{ maxHeight: '90vh' }}>
        {/* Top Header */}
        <div 
          className="p-3 sm:p-4 border-bottom-3 border-black flex align-items-center justify-content-between relative flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' }}
        >
          <div className="flex align-items-center gap-3">
            <div 
              className="bg-yellow-400 text-black border-2 border-black border-circle flex align-items-center justify-content-center shadow-3 flex-shrink-0"
              style={{ width: '3.2rem', height: '3.2rem' }}
            >
              <i className="mdi mdi-trophy text-2xl text-black"></i>
            </div>
            <div>
              <h2 className="comic-font comic-text-shadow m-0 text-xl sm:text-2xl text-yellow-300">
                TROPHÄENSAMMLUNG & ERFOLGE
              </h2>
              <span className="text-xs text-yellow-100 font-bold opacity-90">
                {agendaId ? 'Diese Agenda & Dein globales Profil' : 'Dein globales Profil & Auszeichnungen'}
              </span>
            </div>
          </div>

          <button
            onClick={onHide}
            className="bg-black-alpha-40 hover:bg-yellow-500 hover:text-black text-white border-circle border-1 border-white-alpha-30 p-2 flex align-items-center justify-content-center cursor-pointer transition-colors"
            style={{ width: '2.4rem', height: '2.4rem' }}
            title="Schließen"
          >
            <i className="mdi mdi-close text-base font-bold" />
          </button>
        </div>

        {/* Scope Tabs (Diese Agenda vs. Globales Profil) */}
        {agendaId && (
          <div className="flex border-bottom-2 border-black bg-gray-950 p-2 gap-2 flex-shrink-0">
            <button
              onClick={() => setActiveTab('agenda')}
              className={`flex-1 py-2 px-3 border-round-lg font-bold text-sm cursor-pointer border-2 transition-all flex align-items-center justify-content-center gap-2 ${
                activeTab === 'agenda'
                  ? 'bg-yellow-500 text-black border-black shadow-2'
                  : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'
              }`}
            >
              <span className="flex align-items-center gap-2">
                <i className="mdi mdi-flash text-base"></i> Diese Agenda
              </span>
              {agendaData && (
                <span className="bg-black-alpha-30 px-2 py-1 text-2xs border-round font-bold">
                  {agendaData.milestonesUnlocked}/{agendaData.totalMilestones}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('global')}
              className={`flex-1 py-2 px-3 border-round-lg font-bold text-sm cursor-pointer border-2 transition-all flex align-items-center justify-content-center gap-2 ${
                activeTab === 'global'
                  ? 'bg-yellow-500 text-black border-black shadow-2'
                  : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'
              }`}
            >
              <span className="flex align-items-center gap-2">
                <i className="mdi mdi-earth text-base"></i> Globales Profil
              </span>
              {globalData && (
                <span className="bg-black-alpha-30 px-2 py-1 text-2xs border-round font-bold">
                  {globalData.unlockedCount}/{globalData.totalCount}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div 
          className="p-3 sm:p-4 flex-1 overflow-y-auto"
          style={{
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain'
          }}
        >
          {loading ? (
            <div className="text-center p-6 text-yellow-400 font-bold flex flex-column align-items-center gap-3">
              <i className="pi pi-spin pi-spinner text-3xl" />
              <span>Lade Erfolge & Wanderpokale...</span>
            </div>
          ) : activeTab === 'agenda' && agendaData ? (
            /* TAB 1: DIESE AGENDA */
            <div className="flex flex-column gap-4">
              
              {/* Dynamic Shifting Leader Trophies (Wanderpokale) */}
              <div>
                <div className="flex align-items-center justify-content-between mb-2">
                  <div className="flex align-items-center gap-2">
                    <i className="mdi mdi-crown text-xl text-yellow-400"></i>
                    <span className="comic-font text-yellow-400 text-sm sm:text-base uppercase tracking-wider">
                      WANDERPOKALE DIESER SESSION
                    </span>
                  </div>
                  <span className="text-2xs text-gray-400 font-bold">
                    Wechseln dynamisch bei Führungswechsel
                  </span>
                </div>

                <div 
                  className="w-full"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 250px), 1fr))',
                    gap: '0.75rem'
                  }}
                >
                  {agendaData.dynamicLeaders.map(dl => (
                    <div 
                      key={dl.id}
                      className={`p-3 border-round-xl border-2 transition-all flex align-items-center justify-content-between gap-2.5 relative overflow-hidden ${
                        dl.isCurrentUserLeader 
                          ? 'bg-yellow-500-alpha-20 border-yellow-400 shadow-4' 
                          : 'bg-gray-800-alpha-60 border-gray-700'
                      }`}
                      style={{
                        boxShadow: dl.isCurrentUserLeader ? '0 0 15px rgba(250, 204, 21, 0.3)' : 'none'
                      }}
                    >
                      <div className="flex align-items-center min-w-0 flex-1" style={{ gap: '1.25rem' }}>
                        <div 
                          className={`border-circle border-2 border-black flex align-items-center justify-content-center text-xl flex-shrink-0 ${
                            dl.isCurrentUserLeader ? 'bg-yellow-400 text-black shadow-2' : 'bg-gray-700 text-gray-300'
                          }`}
                          style={{ width: '2.8rem', height: '2.8rem' }}
                        >
                          <AchievementIcon icon={dl.icon} className="text-xl" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div>
                            <span className="font-bold text-white text-sm overflow-hidden text-overflow-ellipsis white-space-nowrap">
                              {dl.title}
                            </span>
                          </div>

                          <div 
                            className="text-gray-300 mt-1"
                            style={{ fontSize: '0.68rem', lineHeight: '1.25' }}
                          >
                            {dl.description}
                          </div>
                        </div>
                      </div>

                      {/* Right side: Profile picture and name underneath */}
                      <LeaderProfileBadge
                        leader={dl.leader}
                        attendees={attendees}
                        currentUser={currentUser}
                        size="compact"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Team Milestones - temporarily hidden from UI */}
              {(() => {
                const SHOW_TEAM_MILESTONES = false;
                if (!SHOW_TEAM_MILESTONES) return null;
                return (
                  <div className="border-top-1 border-gray-800 pt-3">
                    <div className="flex align-items-center justify-content-between mb-2">
                      <div className="flex align-items-center gap-2">
                        <i className="mdi mdi-flag-checkered text-xl text-yellow-400"></i>
                        <span className="comic-font text-yellow-400 text-sm sm:text-base uppercase tracking-wider">
                          TEAM-MEILENSTEINE DIESER AGENDA
                        </span>
                      </div>
                      <span className="text-xs text-yellow-300 font-bold">
                        {agendaData.milestonesUnlocked} / {agendaData.totalMilestones} Erreicht
                      </span>
                    </div>

                    <div 
                      className="w-full"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
                        gap: '0.75rem'
                      }}
                    >
                      {agendaData.teamMilestones.map(m => (
                        <div
                          key={m.id}
                          className={`p-3 border-round-xl border-2 flex align-items-center gap-3 ${
                            m.unlocked 
                              ? 'bg-yellow-950-alpha-40 border-yellow-500 shadow-2' 
                              : 'bg-gray-900 border-gray-800 opacity-70'
                          }`}
                        >
                          <div 
                            className={`border-circle border-2 border-black flex align-items-center justify-content-center text-xl flex-shrink-0 ${
                              m.unlocked ? 'bg-yellow-400 text-black' : 'bg-gray-800 text-gray-400'
                            }`}
                            style={{ width: '2.8rem', height: '2.8rem' }}
                          >
                            <AchievementIcon icon={m.icon} isLocked={!m.unlocked} className="text-xl" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex align-items-center justify-content-between">
                              <span className="font-bold text-white text-sm">{m.title}</span>
                              {m.unlocked && <i className="mdi mdi-check-bold text-yellow-400 text-xs font-bold" />}
                            </div>
                            <div className="text-2xs text-gray-300 line-height-2 mt-1">{m.description}</div>
                            {!m.unlocked && (
                              <div className="mt-2">
                                <ProgressBar value={m.progressPercent} showValue={false} style={{ height: '6px' }} />
                                <div className="text-3xs text-gray-400 mt-1 text-right">
                                  {m.current} / {m.target}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Personal Session Achievements */}
              <div className="border-top-1 border-gray-800 pt-3">
                <div className="flex align-items-center gap-2 mb-2">
                  <i className="mdi mdi-target text-xl text-yellow-400"></i>
                  <span className="comic-font text-yellow-400 text-sm sm:text-base uppercase tracking-wider">
                    DEINE ERFOLGE IN DIESEM MEETING
                  </span>
                </div>

                <div 
                  className="w-full"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
                    gap: '0.75rem'
                  }}
                >
                  {agendaData.personalAchievements.map(pa => (
                    <div
                      key={pa.id}
                      className={`p-3 border-round-xl border-2 flex align-items-center gap-3 ${
                        pa.unlocked 
                          ? 'bg-yellow-950-alpha-40 border-yellow-500 shadow-2' 
                          : 'bg-gray-900 border-gray-800 opacity-70'
                      }`}
                    >
                      <div 
                        className={`border-circle border-2 border-black flex align-items-center justify-content-center text-xl flex-shrink-0 ${
                          pa.unlocked ? 'bg-yellow-400 text-black' : 'bg-gray-800 text-gray-400'
                        }`}
                        style={{ width: '2.8rem', height: '2.8rem' }}
                      >
                        <AchievementIcon icon={pa.icon} isLocked={!pa.unlocked} className="text-xl" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex align-items-center justify-content-between">
                          <span className="font-bold text-white text-sm">{pa.title}</span>
                          {pa.unlocked && <i className="mdi mdi-check-bold text-yellow-400 text-xs font-bold" />}
                        </div>
                        <div className="text-2xs text-gray-300 line-height-2 mt-1">{pa.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : globalData ? (
            /* TAB 2: GLOBALES PROFIL */
            <div className="flex flex-column gap-3">
              {/* Rank & Level Banner */}
              <div 
                className="p-3 sm:p-4 border-round-xl border-3 border-black relative overflow-hidden flex flex-column sm:flex-row align-items-center justify-content-between gap-3 shadow-4"
                style={{
                  background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                  border: '3px solid #facc15'
                }}
              >
                <div className="flex align-items-center gap-3 text-center sm:text-left">
                  <div 
                    className="bg-yellow-400 text-black border-2 border-black border-circle flex align-items-center justify-content-center text-2xl font-bold flex-shrink-0 shadow-3"
                    style={{ width: '4rem', height: '4rem' }}
                  >
                    <i className="mdi mdi-star text-3xl text-black"></i>
                  </div>
                  <div>
                    <div className="text-2xs text-yellow-400 font-bold uppercase tracking-wider">
                      Level {globalData.level} • {globalData.rank}
                    </div>
                    <div className="font-bold text-white text-xl sm:text-2xl mt-1">
                      {currentUser?.name || 'Dein Profil'}
                    </div>
                    <div className="text-xs text-gray-300 mt-1">
                      {globalData.unlockedCount} von {globalData.totalCount} Erfolgen freigeschaltet
                    </div>
                  </div>
                </div>

                <div className="w-full sm:w-16rem flex flex-column gap-1">
                  <div className="flex justify-content-between text-2xs text-gray-400 font-bold">
                    <span>Nächster Rang bei</span>
                    <span className="text-yellow-400">{globalData.unlockedCount}/{globalData.nextRankAt} Erfolgen</span>
                  </div>
                  <ProgressBar 
                    value={Math.min(100, Math.round((globalData.unlockedCount / globalData.nextRankAt) * 100))} 
                    showValue={false} 
                    style={{ height: '8px' }} 
                  />
                </div>
              </div>

              {/* Pinning Notification & Rules */}
              <div className="bg-yellow-500-alpha-10 border-1 border-yellow-500-alpha-40 border-round-lg p-2 px-3 flex align-items-center justify-content-between text-xs">
                <span className="text-yellow-200 flex align-items-center gap-1">
                  <i className="mdi mdi-pin text-yellow-400"></i>
                  <strong>Angepinnt an Personenkarte:</strong> {activePins.length} / 3 Badges
                </span>
                <span className="text-2xs text-gray-400">
                  Klicke auf die Stecknadel bei freigeschalteten Badges
                </span>
              </div>

              {/* Category Filter */}
              <div className="flex flex-wrap gap-2 border-bottom-1 border-gray-800 pb-2">
                {[
                  { id: 'all', label: 'Alle' },
                  { id: 'creation', label: 'Erstellung' },
                  { id: 'contributions', label: 'Beiträge' },
                  { id: 'community', label: 'Community' },
                  { id: 'identity', label: 'Identität' }
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setGlobalCategory(cat.id)}
                    className={`py-1 px-3 border-round-lg text-xs font-bold cursor-pointer border-1 transition-colors ${
                      globalCategory === cat.id
                        ? 'bg-yellow-400 text-black border-black'
                        : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Badge Grid */}
              <div 
                className="w-full"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
                  gap: '0.75rem'
                }}
              >
                {filteredGlobalAchievements.map(ach => {
                  const isPinned = activePins.includes(ach.id);
                  const catColor = ACHIEVEMENT_CATEGORY_COLORS[ach.category] || '#374151';

                  return (
                    <div
                      key={ach.id}
                      className={`p-3 sm:p-4 flex flex-column justify-content-between gap-2 relative overflow-hidden transition-transform hover:scale-101 select-none ${
                        !ach.unlocked ? 'opacity-70' : ''
                      }`}
                      style={{
                        background: ach.unlocked
                          ? isPinned
                            ? `linear-gradient(135deg, rgba(250, 204, 21, 0.35) 0%, rgba(0, 0, 0, 0.45) 100%), ${catColor}`
                            : `linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(0, 0, 0, 0.4) 100%), ${catColor}`
                          : 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                        border: isPinned 
                          ? '3px solid #facc15' 
                          : (ach.unlocked ? '3px solid #000' : '2px solid #374151'),
                        boxShadow: isPinned 
                          ? '4px 4px 0px #000, 0 0 14px rgba(250, 204, 21, 0.45)' 
                          : '4px 4px 0px #000',
                        borderRadius: '12px',
                        minHeight: '120px'
                      }}
                    >
                      {ach.unlocked && (
                        <div className="corner-banderole-unlocked">
                          <i className="pi pi-check text-xs font-bold" /> CHECK
                        </div>
                      )}

                      <div className="flex align-items-start gap-3">
                        <div 
                          className={`border-circle border-2 border-black flex align-items-center justify-content-center text-xl flex-shrink-0 ${
                            ach.unlocked ? 'bg-yellow-400 text-black' : 'bg-gray-800 text-gray-400'
                          }`}
                          style={{ width: '3rem', height: '3rem' }}
                        >
                          <AchievementIcon icon={ach.icon} isLocked={!ach.unlocked} className="text-xl" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex align-items-center justify-content-between gap-1">
                            <span className="font-bold text-white text-sm sm:text-base overflow-hidden text-overflow-ellipsis">
                              {ach.title}
                            </span>
                            {ach.unlocked && (
                              <button
                                onClick={() => onTogglePin && onTogglePin(ach.id)}
                                className={`border-none border-circle p-1 cursor-pointer flex align-items-center justify-content-center transition-colors ${
                                  isPinned 
                                    ? 'bg-yellow-400 text-black shadow-2' 
                                    : 'bg-gray-700 text-gray-300 hover:bg-yellow-500 hover:text-black'
                                }`}
                                style={{ width: '1.8rem', height: '1.8rem' }}
                                title={isPinned ? 'Von Personenkarte entfernen' : 'An Personenkarte anpinnen (max. 3)'}
                              >
                                <i className={isPinned ? "mdi mdi-pin text-xs font-bold" : "mdi mdi-pin-outline text-xs font-bold"} />
                              </button>
                            )}
                          </div>

                          <div className="text-2xs text-gray-300 line-height-2 mt-1">
                            {ach.description}
                          </div>

                          {!ach.unlocked && (
                            <div className="flex align-items-center justify-content-end mt-2 text-3xs font-bold text-gray-400">
                              <span>
                                {ach.current} / {ach.target}
                              </span>
                            </div>
                          )}

                          {!ach.unlocked && (
                            <div className="mt-1">
                              <ProgressBar value={ach.progressPercent} showValue={false} style={{ height: '5px' }} />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        {/* Bottom Close Button */}
        <div className="p-3 bg-gray-950 border-top-2 border-black flex justify-content-center flex-shrink-0">
          <Button
            label="Schließen"
            icon="mdi mdi-close font-bold mr-1"
            onClick={onHide}
            className="comic-button bg-yellow-500 text-black font-bold px-5 py-2 text-sm cursor-pointer"
          />
        </div>
      </div>
    </Dialog>
  );
}
