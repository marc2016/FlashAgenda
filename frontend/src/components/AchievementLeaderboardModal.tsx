import React from 'react';
import { Dialog } from 'primereact/dialog';
import AchievementIcon from './AchievementIcon';
import type { IEvaluatedAchievement, ILeaderboardEntry } from '../services/achievementService';

interface Props {
  visible: boolean;
  onHide: () => void;
  achievement: IEvaluatedAchievement | null;
  attendees?: any[];
  currentUser?: { id?: string; _id?: string; name?: string } | null;
}

function getMetricLabel(achievementId: string, count: number): string {
  if (achievementId === 'leader_points' || achievementId === 'session_item_creator') {
    return count === 1 ? '1 Punkt' : `${count} Punkte`;
  }
  if (achievementId === 'leader_comments' || achievementId === 'session_commenter') {
    return count === 1 ? '1 Kommentar' : `${count} Kommentare`;
  }
  if (achievementId === 'leader_upvotes') {
    return count === 1 ? '1 Upvote' : `${count} Upvotes`;
  }
  if (achievementId === 'leader_images' || achievementId === 'session_image_uploader') {
    return count === 1 ? '1 Bild' : `${count} Bilder`;
  }
  if (achievementId === 'session_voter') {
    return count === 1 ? '1 Stimme' : `${count} Stimmen`;
  }
  if (achievementId === 'leader_words') {
    return count === 1 ? '1 Wort' : `${count} Wörter`;
  }
  if (achievementId === 'session_description_added') {
    return count === 1 ? '1 Beschreibung' : `${count} Beschreibungen`;
  }
  return `${count}`;
}

export default function AchievementLeaderboardModal({
  visible,
  onHide,
  achievement,
  attendees = [],
  currentUser
}: Props) {
  if (!achievement) return null;

  // Resolve leaderboard entries or compute fallback from attendees and leader
  const entries: ILeaderboardEntry[] = React.useMemo(() => {
    if (achievement.leaderboard && achievement.leaderboard.length > 0) {
      return achievement.leaderboard;
    }

    // Fallback if leaderboard was not precomputed
    const cleanId = (currentUser?.id || currentUser?._id || '').toLowerCase();
    const cleanName = (currentUser?.name || '').toLowerCase();

    const fallbackList: ILeaderboardEntry[] = (attendees || []).map((att, idx) => {
      const isLeader = achievement.leader && (
        (att.id && att.id === achievement.leader.userId) ||
        (att.name && att.name.toLowerCase() === achievement.leader.userName.toLowerCase())
      );
      const isCurrent = !!(
        (cleanId && (att.id?.toLowerCase() === cleanId || att._id?.toLowerCase() === cleanId)) ||
        (cleanName && att.name?.toLowerCase() === cleanName)
      );
      const count = isLeader ? achievement.leader!.count : (isCurrent ? achievement.current : 0);

      return {
        userId: att.id || att._id,
        userName: att.name,
        avatarUrl: att.avatarUrl,
        count,
        rank: idx + 1,
        isCurrentUser: isCurrent,
        unlocked: count >= achievement.target
      };
    });

    fallbackList.sort((a, b) => b.count - a.count);
    return fallbackList.map((item, idx) => ({ ...item, rank: idx + 1 }));
  }, [achievement, attendees, currentUser]);

  const isDynamic = !!achievement.isDynamic;

  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      header={
        <div className="flex align-items-center">
          <AchievementIcon icon={achievement.icon} className="text-xl text-yellow-400 font-bold mr-2" />
          <span className="font-bold text-white text-lg">{achievement.title}</span>
        </div>
      }
      style={{ width: '95vw', maxWidth: '480px' }}
      className="p-fluid glass-panel"
      modal
      dismissableMask
    >
      <div className="flex flex-column pt-1">
        {/* Simple description without heavy border */}
        <p className="text-gray-300 text-sm m-0 mb-3 line-height-3">
          {achievement.description}
        </p>

        {/* Dynamic leader info if available */}
        {isDynamic && achievement.leader && achievement.leader.count > 0 && (
          <div className="text-xs text-yellow-400 font-semibold mb-3 flex align-items-center">
            <i className="mdi mdi-trophy text-sm mr-2" />
            <span>Spitzenreiter: {achievement.leader.userName} ({getMetricLabel(achievement.id, achievement.leader.count)})</span>
          </div>
        )}

        {/* Section title */}
        <div className="text-xs font-bold uppercase tracking-wider text-yellow-500 mb-2 flex align-items-center">
          <i className="mdi mdi-podium-gold text-sm mr-2" />
          <span>Rangliste</span>
        </div>

        {/* Sleek, simple list without heavy borders */}
        {entries.length === 0 ? (
          <div className="text-center py-4 text-gray-400 text-sm italic">
            Keine Teilnehmer vorhanden.
          </div>
        ) : (
          <div className="flex flex-column gap-1">
            {entries.map((entry) => {
              const isFirst = entry.rank === 1 && entry.count > 0;
              const isSecond = entry.rank === 2 && entry.count > 0;
              const isThird = entry.rank === 3 && entry.count > 0;

              return (
                <div
                  key={entry.userId || entry.userName}
                  className={`flex align-items-center justify-content-between p-2 border-round transition-colors ${
                    entry.isCurrentUser ? 'bg-yellow-500-alpha-10' : 'hover:bg-white-alpha-5'
                  }`}
                >
                  {/* Left: Rank + Avatar + Name */}
                  <div className="flex align-items-center min-w-0 flex-1">
                    {/* Rank */}
                    <span
                      className={`text-sm font-bold w-2rem text-center mr-3 flex-shrink-0 ${
                        isFirst
                          ? 'text-yellow-400'
                          : isSecond
                          ? 'text-gray-200'
                          : isThird
                          ? 'text-orange-300'
                          : 'text-gray-400'
                      }`}
                    >
                      {entry.rank}.
                    </span>

                    {/* Avatar */}
                    {(() => {
                      const resolvedAvatar =
                        entry.avatarUrl ||
                        attendees?.find(
                          (a) =>
                            (a.id && a.id === entry.userId) ||
                            (a.name && a.name.toLowerCase() === entry.userName.toLowerCase())
                        )?.avatarUrl;

                      return (
                        <div
                          className="border-circle bg-gray-800 flex align-items-center justify-content-center text-xs font-bold text-white flex-shrink-0 overflow-hidden mr-3"
                          style={{
                            width: '2.25rem',
                            height: '2.25rem',
                            minWidth: '2.25rem',
                            minHeight: '2.25rem',
                            borderRadius: '50%'
                          }}
                        >
                          {resolvedAvatar ? (
                            <img
                              src={resolvedAvatar}
                              alt={entry.userName}
                              className="w-full h-full object-cover"
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                display: 'block',
                                borderRadius: '50%'
                              }}
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            entry.userName.slice(0, 1).toUpperCase()
                          )}
                        </div>
                      );
                    })()}

                    {/* Name */}
                    <div className="flex align-items-center min-w-0 flex-1">
                      <span className="text-sm font-medium text-white overflow-hidden text-overflow-ellipsis white-space-nowrap">
                        {entry.userName}
                      </span>
                    </div>
                  </div>

                  {/* Right: Metric Score & Status */}
                  <div className="text-right flex align-items-center gap-2 flex-shrink-0">
                    <span className="font-semibold text-sm text-yellow-300">
                      {getMetricLabel(achievement.id, entry.count)}
                    </span>

                    {!isDynamic && (
                      entry.unlocked ? (
                        <i className="mdi mdi-check-circle text-green-400 text-sm" title="Erreicht" />
                      ) : (
                        <span className="text-3xs text-gray-500 italic">Offen</span>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Dialog>
  );
}
