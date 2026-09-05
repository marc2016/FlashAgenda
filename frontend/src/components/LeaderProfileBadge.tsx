import React from 'react';

interface LeaderProfileBadgeProps {
  leader: {
    userId?: string;
    userName: string;
    avatarUrl?: string;
    count: number;
  } | null | undefined;
  attendees?: any[];
  currentUser?: any;
  size?: 'normal' | 'compact';
}

export const LeaderProfileBadge: React.FC<LeaderProfileBadgeProps> = ({
  leader,
  attendees = [],
  currentUser,
  size = 'normal'
}) => {
  const avatarDimensions = size === 'compact' ? '2.2rem' : '2.5rem';

  if (!leader) {
    return (
      <div className="flex flex-column align-items-center justify-content-center flex-shrink-0 text-center pl-2 ml-auto" style={{ width: '64px' }}>
        <div 
          className="border-circle border-2 border-dashed border-white-alpha-40 flex align-items-center justify-content-center text-white-alpha-40"
          style={{ width: avatarDimensions, height: avatarDimensions }}
          title="Pokal aktuell unbesetzt"
        >
          <i className="mdi mdi-trophy-outline text-base" />
        </div>
        <span className="text-3xs text-white-alpha-60 mt-1 italic block font-semibold">
          Frei
        </span>
      </div>
    );
  }

  // Resolve avatar URL from leader object, currentUser, or attendees list
  let resolvedAvatar = leader.avatarUrl;
  if (!resolvedAvatar && currentUser) {
    const isSelf = (currentUser.name && currentUser.name.toLowerCase() === leader.userName.toLowerCase()) ||
                   (currentUser.id && currentUser.id === leader.userId) ||
                   (currentUser._id && currentUser._id === leader.userId);
    if (isSelf && currentUser.avatarUrl) {
      resolvedAvatar = currentUser.avatarUrl;
    }
  }
  if (!resolvedAvatar && attendees.length > 0) {
    const match = attendees.find((a: any) => 
      (a.id && a.id === leader.userId) ||
      (a._id && a._id === leader.userId) ||
      (a.name && a.name.toLowerCase() === leader.userName.toLowerCase())
    );
    if (match?.avatarUrl) {
      resolvedAvatar = match.avatarUrl;
    }
  }

  return (
    <div className="flex flex-column align-items-center justify-content-center flex-shrink-0 text-center pl-2 ml-auto" style={{ width: '68px' }}>
      <div className="flex align-items-center justify-content-center">
        {resolvedAvatar ? (
          <img 
            src={resolvedAvatar} 
            alt={leader.userName} 
            className="border-circle border-2 border-black shadow-1" 
            style={{ width: avatarDimensions, height: avatarDimensions, objectFit: 'cover' }}
          />
        ) : (
          <div 
            className="border-circle border-2 border-black bg-yellow-400 text-black flex align-items-center justify-content-center font-black shadow-1"
            style={{ width: avatarDimensions, height: avatarDimensions, fontSize: size === 'compact' ? '0.85rem' : '1rem' }}
          >
            {leader.userName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <span 
        className="text-3xs font-bold text-white mt-1 line-height-1 text-overflow-ellipsis overflow-hidden white-space-nowrap block w-full"
        title={`${leader.userName} (${leader.count})`}
        style={{ textShadow: '1px 1px 0px #000', maxWidth: '68px' }}
      >
        {leader.userName}
      </span>
      <span className="text-3xs text-yellow-300 font-bold opacity-90 line-height-1 mt-0.5">
        ({leader.count})
      </span>
    </div>
  );
};

export default LeaderProfileBadge;
