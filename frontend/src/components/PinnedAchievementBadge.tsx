import React, { useRef, useEffect } from 'react';
import { OverlayPanel } from 'primereact/overlaypanel';
import { AchievementIcon } from './AchievementIcon';
import { getAchievementDefinition } from '../services/achievementService';

interface PinnedAchievementBadgeProps {
  achId: string;
  size?: 'normal' | 'small';
}

export const PinnedAchievementBadge: React.FC<PinnedAchievementBadgeProps> = ({
  achId,
  size = 'normal'
}) => {
  const op = useRef<OverlayPanel>(null);
  const def = getAchievementDefinition(achId);

  useEffect(() => {
    const handleCloseOthers = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail !== achId) {
        op.current?.hide();
      }
    };
    window.addEventListener('close-achievement-tooltips', handleCloseOthers);
    return () => window.removeEventListener('close-achievement-tooltips', handleCloseOthers);
  }, [achId]);

  if (!def) return null;

  const badgeSize = size === 'small' ? '24px' : '26px';
  const iconSize = size === 'small' ? 'text-2xs' : 'text-xs';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('close-achievement-tooltips', { detail: achId }));
    op.current?.toggle(e);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        data-testid={`pinned-badge-${achId}`}
        className="p-0 border-circle border-2 border-black flex align-items-center justify-content-center cursor-pointer transition-transform hover:scale-115 active:scale-95 shadow-1 select-none flex-shrink-0"
        style={{
          width: badgeSize,
          height: badgeSize,
          background: 'linear-gradient(135deg, #fef08a 0%, #facc15 100%)',
          color: '#000000',
          boxShadow: '1.5px 1.5px 0px #000000'
        }}
        title={`${def.title} (Klicken für Details)`}
        aria-label={`${def.title}: ${def.description}`}
      >
        <AchievementIcon icon={def.icon} className={`${iconSize} font-bold`} />
      </button>

      <OverlayPanel
        ref={op}
        className="comic-achievement-tooltip"
        dismissable
        style={{
          maxWidth: '240px',
          zIndex: 9999
        }}
      >
        <div className="flex flex-column gap-1 text-left select-none" style={{ minWidth: '170px' }}>
          <div className="flex align-items-center gap-2 border-bottom-1 border-white-alpha-20 pb-1">
            <div 
              className="border-circle border-1 border-black flex align-items-center justify-content-center flex-shrink-0"
              style={{ width: '20px', height: '20px', backgroundColor: '#facc15', color: '#000' }}
            >
              <AchievementIcon icon={def.icon} className="text-3xs" />
            </div>
            <span className="font-bold text-yellow-400 text-xs overflow-hidden text-overflow-ellipsis white-space-nowrap">
              {def.title}
            </span>
          </div>

          <div className="text-2xs text-gray-200 line-height-2 mt-1">
            {def.description}
          </div>
        </div>
      </OverlayPanel>
    </>
  );
};

export default PinnedAchievementBadge;
