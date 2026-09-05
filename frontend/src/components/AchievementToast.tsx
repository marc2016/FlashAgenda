import { useState, useEffect } from 'react';
import type { IEvaluatedAchievement } from '../services/achievementService';
import AchievementIcon from './AchievementIcon';

interface Props {
  achievements: IEvaluatedAchievement[];
  onDismiss: () => void;
}

export default function AchievementToast({ achievements, onDismiss }: Props) {
  const [visibleIndex, setVisibleIndex] = useState(0);

  // Reset index if achievements array changes and index is out of bounds
  useEffect(() => {
    if (visibleIndex >= achievements.length) {
      setVisibleIndex(0);
    }
  }, [achievements.length, visibleIndex]);

  useEffect(() => {
    if (!achievements || achievements.length === 0) return;

    // Cycle through multiple unlocked achievements if more than 1
    const timer = setTimeout(() => {
      if (visibleIndex < achievements.length - 1) {
        setVisibleIndex(prev => prev + 1);
      } else {
        onDismiss();
      }
    }, 5500);

    return () => clearTimeout(timer);
  }, [achievements, visibleIndex, onDismiss]);

  if (!achievements || achievements.length === 0) return null;

  const currentAch = achievements[visibleIndex];
  if (!currentAch) return null;

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (visibleIndex < achievements.length - 1) {
      setVisibleIndex(prev => prev + 1);
    } else {
      onDismiss();
    }
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (visibleIndex > 0) {
      setVisibleIndex(prev => prev - 1);
    }
  };

  return (
    <div 
      className="fixed bottom-0 right-0 m-3 sm:m-4 z-5 select-none"
      style={{ maxWidth: '380px', width: 'calc(100vw - 2rem)' }}
    >
      <div 
        key={currentAch.id || visibleIndex}
        className="glass-panel p-3 border-round-xl flex align-items-start gap-3 relative overflow-hidden achievement-toast-enter"
        style={{
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
        }}
      >
        {/* Clean Icon */}
        <div 
          className="flex align-items-center justify-content-center flex-shrink-0 border-round bg-yellow-500-alpha-20 text-yellow-400"
          style={{ width: '2.5rem', height: '2.5rem' }}
        >
          <AchievementIcon icon={currentAch.icon} className="text-2xl text-yellow-400" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex align-items-center justify-content-between mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-yellow-500 flex align-items-center">
              <i className={`${currentAch.isDynamic ? 'mdi mdi-crown' : 'mdi mdi-trophy'} text-sm mr-1.5`} />
              <span>{currentAch.isDynamic ? 'Wanderpokal erhalten!' : 'Erfolg freigeschaltet!'}</span>
            </span>
            {achievements.length > 1 && (
              <div className="flex align-items-center gap-1">
                <span className="text-2xs text-gray-400 font-semibold mr-1">
                  {visibleIndex + 1}/{achievements.length}
                </span>
                {visibleIndex > 0 && (
                  <button
                    onClick={handlePrev}
                    className="p-0 border-none bg-transparent text-gray-400 hover:text-white cursor-pointer"
                    title="Vorherige"
                  >
                    <i className="mdi mdi-chevron-left text-xs" />
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className="p-0 border-none bg-transparent text-gray-400 hover:text-white cursor-pointer"
                  title="Nächste"
                >
                  <i className="mdi mdi-chevron-right text-xs" />
                </button>
              </div>
            )}
          </div>
          <div className="font-bold text-white text-base overflow-hidden text-overflow-ellipsis white-space-nowrap">
            {currentAch.title}
          </div>
          <div className="text-xs text-gray-300 line-height-3 mt-1">
            {currentAch.description}
          </div>

          {/* Dots Indicator for multiple notifications */}
          {achievements.length > 1 && (
            <div className="flex align-items-center gap-1 mt-2">
              {achievements.map((ach, idx) => (
                <div
                  key={ach.id || idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setVisibleIndex(idx);
                  }}
                  className="cursor-pointer border-round transition-all"
                  style={{
                    width: idx === visibleIndex ? '14px' : '6px',
                    height: '4px',
                    backgroundColor: idx === visibleIndex ? '#facc15' : 'rgba(255, 255, 255, 0.2)'
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={onDismiss}
          className="bg-transparent border-none text-gray-400 hover:text-white cursor-pointer p-1 self-start flex-shrink-0"
          title="Schließen"
        >
          <i className="mdi mdi-close text-base" />
        </button>
      </div>
    </div>
  );
}
