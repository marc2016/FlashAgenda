import React from 'react';

interface AchievementIconProps {
  icon?: string;
  isLocked?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const AchievementIcon: React.FC<AchievementIconProps> = ({
  icon,
  isLocked = false,
  className = '',
  style
}) => {
  if (isLocked) {
    return <i className={`mdi mdi-lock text-gray-500 ${className}`} style={style} aria-hidden="true" />;
  }

  if (!icon) {
    return <i className={`mdi mdi-trophy ${className}`} style={style} aria-hidden="true" />;
  }

  if (icon.startsWith('pi-') || icon.startsWith('pi ') || icon.includes('pi-')) {
    const piClass = icon.startsWith('pi ') ? icon : `pi ${icon}`;
    return <i className={`${piClass} ${className}`} style={style} aria-hidden="true" />;
  }

  if (icon.startsWith('mdi-') || icon.includes('mdi-')) {
    return <i className={`mdi ${icon} ${className}`} style={style} aria-hidden="true" />;
  }

  // Fallback for legacy emoji strings
  return (
    <span className={className} style={style} role="img" aria-label="achievement-icon">
      {icon}
    </span>
  );
};

export default AchievementIcon;
