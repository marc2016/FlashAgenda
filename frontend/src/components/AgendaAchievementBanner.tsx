import { useState, useEffect } from 'react';
import { ProgressBar } from 'primereact/progressbar';
import type { IAgendaAchievementsResult, IEvaluatedAchievement } from '../services/achievementService';
import { fetchAgendaAchievements } from '../services/achievementService';
import AchievementIcon from './AchievementIcon';
import LeaderProfileBadge from './LeaderProfileBadge';
import AchievementLeaderboardModal from './AchievementLeaderboardModal';

interface Props {
  agendaId: string;
  currentUser?: any;
  attendees?: any[];
  onOpenAchievementsModal?: (tab?: 'agenda' | 'global') => void;
  refreshTrigger?: number;
}

export default function AgendaAchievementBanner({
  agendaId,
  currentUser,
  attendees = [],
  onOpenAchievementsModal: _onOpenAchievementsModal,
  refreshTrigger = 0
}: Props) {
  const [data, setData] = useState<IAgendaAchievementsResult | null>(null);
  const [selectedAchievement, setSelectedAchievement] = useState<IEvaluatedAchievement | null>(null);

  useEffect(() => {
    if (!agendaId) return;
    const load = async () => {
      const res = await fetchAgendaAchievements(
        agendaId,
        currentUser?.id || currentUser?._id,
        currentUser?.name
      );
      if (res) setData(res);
    };
    load();
  }, [agendaId, currentUser, refreshTrigger]);

  if (!data) return null;

  const unlockedPersonal = (data.personalAchievements || []).filter(p => p.unlocked);
  // Feature flag: set to true to restore team milestones in UI if desired
  const SHOW_TEAM_MILESTONES = false;

  return (
    <div className="mb-4 sm:mb-6 text-white relative select-none">
      {/* Banner Header */}
      <div className="flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div className="flex align-items-center gap-2">
          <h3
            className="text-xl sm:text-2xl text-yellow-500 font-bold m-0"
            style={{ textShadow: '2px 2px 0px #000' }}
          >
            Agenda-Erfolge & Wanderpokale
          </h3>
        </div>

        {SHOW_TEAM_MILESTONES && (
          <div className="flex align-items-center gap-2 self-stretch sm:self-auto justify-content-between sm:justify-end">
            <div className="text-right mr-2 hidden sm:block">
              <span className="text-3xs text-gray-400 block uppercase font-bold">Team-Fortschritt</span>
              <span className="text-xs text-yellow-500 font-bold">
                {data.milestonesUnlocked} / {data.totalMilestones} Meilensteine
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 1. Dynamic Shifting Leader Trophies (Wanderpokale) */}
      <div className="mb-2">
        <div className="text-3xs font-bold uppercase tracking-wider text-yellow-500 mb-2 flex align-items-center gap-1">
          <i className="mdi mdi-crown text-yellow-500"></i>
          <span>Wanderpokale dieser Agenda</span>
        </div>

        <div className="grid">
          {data.dynamicLeaders.map(dl => {
            const cardColor = dl.isCurrentUserLeader ? '#1e293b' : '#111827';

            return (
              <div key={dl.id} className="col-12 sm:col-6 lg:col-3">
                <div
                  className="p-3 border-round-xl select-none flex align-items-center justify-content-between gap-3 h-full cursor-pointer transition-transform hover:scale-102"
                  style={{
                    background: `linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(0, 0, 0, 0.35) 100%), ${cardColor}`,
                    border: dl.isCurrentUserLeader ? '3px solid #facc15' : '3px solid #000',
                    boxShadow: dl.isCurrentUserLeader ? '4px 4px 0px #000, 0 0 10px rgba(250, 204, 21, 0.4)' : '4px 4px 0px #000',
                    borderRadius: '12px',
                    minHeight: '105px'
                  }}
                  onClick={() => setSelectedAchievement(dl)}
                >
                  <div className="flex align-items-center min-w-0 flex-1" style={{ gap: '1.25rem' }}>
                    <div 
                      className={`border-circle border-2 border-black flex align-items-center justify-content-center text-xl flex-shrink-0 shadow-2 ${
                        dl.isCurrentUserLeader ? 'bg-yellow-400 text-black' : 'bg-black-alpha-40 text-white'
                      }`}
                      style={{ width: '2.8rem', height: '2.8rem' }}
                    >
                      <AchievementIcon icon={dl.icon} className="text-xl" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div>
                        <span
                          className="font-bold text-sm sm:text-base text-white overflow-hidden text-overflow-ellipsis white-space-nowrap"
                          style={{ textShadow: '1px 1px 0px #000' }}
                        >
                          {dl.title}
                        </span>
                      </div>

                      <div 
                        className="text-white-alpha-80 mt-1"
                        style={{ fontSize: '0.68rem', lineHeight: '1.25', textShadow: '1px 1px 0px rgba(0,0,0,0.4)' }}
                      >
                        {dl.description}
                      </div>
                    </div>
                  </div>

                  {/* Right side of trophy: Profile picture and name underneath */}
                  <LeaderProfileBadge
                    leader={dl.leader}
                    attendees={attendees}
                    currentUser={currentUser}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Grid of Team-Meilensteine (Teamerfolge) - temporarily hidden from UI */}
      {SHOW_TEAM_MILESTONES && (
        <div className="mt-4">
          <div className="flex align-items-center justify-content-between mb-2 flex-wrap gap-2">
            <div className="text-3xs font-bold uppercase tracking-wider text-yellow-500 flex align-items-center gap-1">
              <i className="mdi mdi-flag-checkered text-yellow-500"></i>
              <span>Gemeinsame Teamerfolge dieser Agenda</span>
            </div>
            <span className="text-xs text-yellow-400 font-bold">
              {data.milestonesUnlocked} / {data.totalMilestones} erreicht
            </span>
          </div>

          <div className="grid">
            {data.teamMilestones.map(m => (
              <div key={m.id} className="col-12 sm:col-6 lg:col-4">
                <div
                  className="p-3 border-round-xl flex align-items-center gap-3 h-full select-none"
                  style={{
                    background: m.unlocked
                      ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.25) 0%, rgba(31, 41, 55, 0.95) 100%)'
                      : 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
                    border: m.unlocked ? '3px solid #22c55e' : '3px solid #000',
                    boxShadow: m.unlocked ? '4px 4px 0px #000, 0 0 10px rgba(34, 197, 94, 0.3)' : '4px 4px 0px #000',
                    borderRadius: '12px',
                    minHeight: '85px'
                  }}
                >
                  <div
                    className={`border-circle border-2 border-black flex align-items-center justify-content-center text-xl flex-shrink-0 shadow-2 ${
                      m.unlocked ? 'bg-green-500 text-black' : 'bg-black-alpha-40 text-gray-400'
                    }`}
                    style={{ width: '2.8rem', height: '2.8rem' }}
                  >
                    <AchievementIcon icon={m.icon} isLocked={!m.unlocked} className="text-xl" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex align-items-center justify-content-between gap-1">
                      <span className="font-bold text-sm text-white overflow-hidden text-overflow-ellipsis white-space-nowrap">
                        {m.title}
                      </span>
                      {m.unlocked ? (
                        <span className="bg-green-600 text-white text-3xs font-bold px-1.5 py-0.5 border-round flex align-items-center gap-1 shadow-1 flex-shrink-0">
                          <i className="mdi mdi-check-bold text-3xs"></i> Erreicht
                        </span>
                      ) : (
                        <span className="text-3xs text-gray-400 font-bold flex-shrink-0">
                          {m.current} / {m.target}
                        </span>
                      )}
                    </div>

                    <div className="text-2xs text-gray-300 mt-1 line-height-2">
                      {m.description}
                    </div>

                    {!m.unlocked && (
                      <div className="mt-2">
                        <ProgressBar
                          value={m.progressPercent}
                          showValue={false}
                          style={{ height: '5px' }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Eigene Erfolge für diese Agenda (Cards Grid) */}
      <div className="mt-4">
        <div className="flex align-items-center justify-content-between mb-2 flex-wrap gap-2">
          <div className="text-3xs font-bold uppercase tracking-wider text-yellow-500 flex align-items-center gap-1">
            <i className="mdi mdi-target text-yellow-500"></i>
            <span>Deine Erfolge in dieser Agenda</span>
          </div>
          <span className="text-xs text-yellow-400 font-bold">
            {unlockedPersonal.length} / {(data.personalAchievements || []).length} erreicht
          </span>
        </div>

        <div className="grid">
          {(data.personalAchievements || []).map(pa => {
            const isUnlocked = pa.unlocked;

            return (
              <div key={pa.id} className="col-12 sm:col-6 lg:col-4">
                <div
                  className={`p-3 border-round-xl select-none flex align-items-center justify-content-between gap-3 h-full cursor-pointer transition-transform hover:scale-102 ${
                    isUnlocked ? 'shadow-2' : 'opacity-70'
                  }`}
                  style={{
                    background: isUnlocked
                      ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(0, 0, 0, 0.35) 100%), #1e293b'
                      : 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(0, 0, 0, 0.45) 100%), #111827',
                    border: isUnlocked ? '3px solid #22c55e' : '3px solid #374151',
                    boxShadow: isUnlocked ? '4px 4px 0px #000, 0 0 10px rgba(34, 197, 94, 0.3)' : '3px 3px 0px #000',
                    borderRadius: '12px',
                    minHeight: '105px',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onClick={() => setSelectedAchievement(pa)}
                >
                  {isUnlocked && (
                    <div className="corner-banderole-unlocked">
                      <i className="mdi mdi-check-bold" style={{ fontSize: '0.65rem' }}></i> CHECK
                    </div>
                  )}

                  <div className="flex align-items-center min-w-0 flex-1" style={{ gap: '1.25rem' }}>
                    <div 
                      className={`border-circle border-2 border-black flex align-items-center justify-content-center text-xl flex-shrink-0 shadow-2 ${
                        isUnlocked ? 'bg-green-500 text-black' : 'bg-black-alpha-40 text-gray-500'
                      }`}
                      style={{ width: '2.8rem', height: '2.8rem' }}
                    >
                      <AchievementIcon icon={pa.icon} isLocked={!isUnlocked} className="text-xl" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div>
                        <span
                          className="font-bold text-sm sm:text-base text-white overflow-hidden text-overflow-ellipsis white-space-nowrap"
                          style={{ textShadow: isUnlocked ? '1px 1px 0px #000' : 'none' }}
                        >
                          {pa.title}
                        </span>
                      </div>

                      <div 
                        className="text-white-alpha-80 mt-1"
                        style={{ fontSize: '0.68rem', lineHeight: '1.25', textShadow: isUnlocked ? '1px 1px 0px rgba(0,0,0,0.4)' : 'none' }}
                      >
                        {pa.description}
                      </div>


                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AchievementLeaderboardModal
        visible={!!selectedAchievement}
        achievement={selectedAchievement}
        attendees={attendees}
        currentUser={currentUser}
        onHide={() => setSelectedAchievement(null)}
      />
    </div>
  );
}
