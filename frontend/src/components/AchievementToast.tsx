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
        className="flex flex-column border-round-2xl overflow-hidden achievement-toast-enter"
        style={{
          background: '#1f2937',
          border: '3px solid #000000',
          borderRadius: '16px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 6px 6px 0px #000000'
        }}
      >
        {/* Dialog Header Bar */}
        <div className="flex align-items-center justify-content-between px-3 py-2 border-bottom-1 border-white-alpha-10">
          <div className="flex align-items-center gap-2">
            <i className={`${currentAch.isDynamic ? 'mdi mdi-crown' : 'mdi mdi-trophy'} text-sm text-yellow-400`} />
            <span className="text-xs font-bold uppercase tracking-wider text-yellow-400">
              {currentAch.isDynamic ? 'Wanderpokal erhalten!' : 'Erfolg freigeschaltet!'}
            </span>
          </div>

          <div className="flex align-items-center gap-2">
            {achievements.length > 1 && (
              <div className="flex align-items-center gap-1 bg-gray-800 border-1 border-gray-700 px-2 py-0.5 border-round text-2xs font-semibold text-gray-300">
                <span>{visibleIndex + 1}/{achievements.length}</span>
                {visibleIndex > 0 && (
                  <button
                    onClick={handlePrev}
                    className="p-0 border-none bg-transparent text-gray-400 hover:text-white cursor-pointer ml-1"
                    title="Vorherige"
                  >
                    <i className="mdi mdi-chevron-left text-xs" />
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className="p-0 border-none bg-transparent text-gray-400 hover:text-white cursor-pointer ml-0.5"
                  title="Nächste"
                >
                  <i className="mdi mdi-chevron-right text-xs" />
                </button>
              </div>
            )}

            {/* Dialog-styled Close Button */}
            <button
              onClick={onDismiss}
              className="dialog-header-close-btn flex-shrink-0"
              title="Schließen"
              aria-label="Schließen"
            >
              <span className="p-dialog-header-close-icon pi pi-times" />
            </button>
          </div>
        </div>

        {/* Dialog Content */}
        <div className="p-3 flex align-items-center gap-3">
          {/* Badge Icon */}
          <div 
            className="border-circle border-2 border-black flex align-items-center justify-content-center text-xl flex-shrink-0 bg-yellow-400 text-black shadow-2"
            style={{ width: '2.8rem', height: '2.8rem' }}
          >
            <AchievementIcon icon={currentAch.icon} className="text-xl" />
          </div>

          {/* Texts */}
          <div className="flex-1 min-w-0">
            <div className="font-bold text-white text-base overflow-hidden text-overflow-ellipsis white-space-nowrap">
              {currentAch.title}
            </div>
            <div className="text-xs text-gray-300 line-height-3 mt-1">
              {currentAch.description}
            </div>
          </div>
        </div>

        {/* Dots Indicator for multiple notifications */}
        {achievements.length > 1 && (
          <div className="px-3 pb-2 flex align-items-center gap-1">
            {achievements.map((ach, idx) => (
              <div
                key={ach.id || idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setVisibleIndex(idx);
                }}
                className="cursor-pointer border-round transition-all"
                style={{
                  width: idx === visibleIndex ? '16px' : '6px',
                  height: '4px',
                  backgroundColor: idx === visibleIndex ? '#facc15' : '#4b5563'
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
