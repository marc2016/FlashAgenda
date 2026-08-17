import React from 'react';

export const PERSON_COLOR_PALETTE = [
  '#0a4b7c', // Deep Navy
  '#8b0000', // Crimson Red
  '#006400', // Forest Emerald
  '#4b0082', // Indigo Purple
  '#b8860b', // Golden Bronze
  '#008b8b', // Dark Cyan
  '#8b008b', // Dark Magenta
  '#2f4f4f', // Slate Dark
  '#a52a2a', // Amber Rust
  '#1e3a8a', // Royal Sapphire
];

export interface PersonChipProps {
  name: string;
  avatarUrl?: string;
  color?: string;
  status?: 'pending' | 'accepted' | 'rejected';
  size?: 'xs' | 'sm' | 'md';
  title?: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
  showAvatar?: boolean;
}

/**
 * Returns the unified gradient background style used across Person Cards & Chips.
 */
export const getPersonGradient = (color?: string): string => {
  const baseColor = color || '#374151';
  return `linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(0, 0, 0, 0.25) 100%), ${baseColor}`;
};

/**
 * Finds an attendee in an attendees array by ID or Name.
 */
export const findAttendee = (attendees: any[], idOrName?: string): { attendee: any; index: number } | null => {
  if (!idOrName || !attendees || attendees.length === 0) return null;
  const clean = idOrName.trim().toLowerCase();
  const index = attendees.findIndex(
    (a: any) =>
      (a.id && a.id === idOrName) ||
      (a._id && a._id === idOrName) ||
      (a.name && a.name.trim().toLowerCase() === clean)
  );
  if (index === -1) return null;
  return { attendee: attendees[index], index };
};

/**
 * Resolves the attendee's personal cardColor or picks a deterministic color from the palette.
 */
export const getAttendeeColor = (
  attendees: any[],
  idOrName?: string,
  fallbackIndex = 0
): { attendee: any | null; color: string } => {
  const match = findAttendee(attendees, idOrName);
  if (match?.attendee?.cardColor) {
    return { attendee: match.attendee, color: match.attendee.cardColor };
  }
  const idx = match ? match.index : fallbackIndex;
  return {
    attendee: match?.attendee || null,
    color: PERSON_COLOR_PALETTE[Math.abs(idx) % PERSON_COLOR_PALETTE.length],
  };
};

/**
 * Consolidated PersonChip component for all author, recipient, voter, and comment chips.
 */
export const PersonChip: React.FC<PersonChipProps> = ({
  name,
  avatarUrl,
  color,
  status,
  size = 'sm',
  title,
  className = '',
  style,
  onClick,
  showAvatar = true,
}) => {
  const isPending = status === 'pending';

  const sizeStyles = {
    xs: {
      padding: '0.2rem 0.55rem',
      fontSize: '0.7rem',
      avatarSize: '0.95rem',
      iconSize: '0.65rem',
      gap: '0.35rem',
      borderRadius: '6px',
    },
    sm: {
      padding: '0.35rem 0.85rem',
      fontSize: '0.75rem',
      avatarSize: '1.1rem',
      iconSize: '0.75rem',
      gap: '0.45rem',
      borderRadius: '8px',
    },
    md: {
      padding: '0.45rem 1rem',
      fontSize: '0.875rem',
      avatarSize: '1.4rem',
      iconSize: '0.875rem',
      gap: '0.5rem',
      borderRadius: '10px',
    },
  }[size];

  return (
    <span
      className={`inline-flex align-items-center font-bold text-white select-none ${className}`}
      title={title || name}
      onClick={onClick}
      style={{
        background: getPersonGradient(color),
        border: isPending ? '2px dashed #eab308' : '2px solid #000000',
        boxShadow: '2px 2px 0px #000000',
        borderRadius: sizeStyles.borderRadius,
        lineHeight: 1.2,
        gap: sizeStyles.gap,
        padding: sizeStyles.padding,
        fontSize: sizeStyles.fontSize,
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
    >
      {showAvatar && (
        avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="border-circle object-cover flex-shrink-0"
            style={{
              width: sizeStyles.avatarSize,
              height: sizeStyles.avatarSize,
              border: '1px solid #000',
            }}
          />
        ) : (
          <i
            className="pi pi-user text-white flex-shrink-0"
            style={{ fontSize: sizeStyles.iconSize }}
          />
        )
      )}
      <span className="white-space-nowrap overflow-hidden text-overflow-ellipsis">{name}</span>
      {status === 'pending' && (
        <span className="text-yellow-300 text-2xs font-normal italic ml-1 flex-shrink-0">
          (ausstehend)
        </span>
      )}
    </span>
  );
};

export default PersonChip;
