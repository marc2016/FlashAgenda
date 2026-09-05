import { IAgenda } from '../models/Agenda';

export interface IAchievementDefinition {
  id: string;
  title: string;
  description: string;
  category: 'creation' | 'contributions' | 'community' | 'identity' | 'team_milestone' | 'session_personal' | 'dynamic_leader';
  icon: string;
  target: number;
  xp: number;
  isDynamic?: boolean;
}

export interface ILeaderboardEntry {
  userId?: string;
  userName: string;
  avatarUrl?: string;
  count: number;
  rank: number;
  isCurrentUser?: boolean;
  unlocked?: boolean;
}

export interface IEvaluatedAchievement extends IAchievementDefinition {
  current: number;
  unlocked: boolean;
  progressPercent: number;
  unlockedAt?: string;
  leader?: {
    userId?: string;
    userName: string;
    avatarUrl?: string;
    count: number;
  } | null;
  gapToLeader?: number;
  isCurrentUserLeader?: boolean;
  leaderboard?: ILeaderboardEntry[];
}

export const GLOBAL_ACHIEVEMENT_DEFINITIONS: IAchievementDefinition[] = [
  // Creation
  {
    id: 'creator_first',
    title: 'Pionier',
    description: 'Erste eigene Agenda ins Leben gerufen',
    category: 'creation',
    icon: 'mdi-flash',
    target: 1,
    xp: 50
  },
  {
    id: 'creator_3',
    title: 'Agenda-Architekt',
    description: 'Mindestens 3 Agenden eigenständig erstellt',
    category: 'creation',
    icon: 'mdi-domain',
    target: 3,
    xp: 150
  },
  {
    id: 'creator_10',
    title: 'Flash-Mastermind',
    description: 'Mindestens 10 Agenden erfolgreich organisiert',
    category: 'creation',
    icon: 'mdi-crown',
    target: 10,
    xp: 300
  },

  // Contributions (1, 10, 25, 50, 100)
  {
    id: 'items_1',
    title: 'Themenstarter',
    description: 'Den ersten Agendapunkt überhaupt eingereicht',
    category: 'contributions',
    icon: 'mdi-pencil-plus',
    target: 1,
    xp: 30
  },
  {
    id: 'items_10',
    title: 'Ideenfeuerwerk',
    description: '10 Agendapunkte insgesamt beigesteuert',
    category: 'contributions',
    icon: 'mdi-rocket-launch',
    target: 10,
    xp: 100
  },
  {
    id: 'items_25',
    title: 'Task-Titan',
    description: '25 Agendapunkte insgesamt beigesteuert',
    category: 'contributions',
    icon: 'mdi-clipboard-text',
    target: 25,
    xp: 250
  },
  {
    id: 'items_50',
    title: 'Inhalts-Maschine',
    description: '50 Agendapunkte insgesamt beigesteuert',
    category: 'contributions',
    icon: 'mdi-factory',
    target: 50,
    xp: 500
  },
  {
    id: 'items_100',
    title: 'Flash-Legende',
    description: '100 Agendapunkte insgesamt beigesteuert',
    category: 'contributions',
    icon: 'mdi-trophy-award',
    target: 100,
    xp: 1000
  },
  {
    id: 'items_done_5',
    title: 'Finisher',
    description: '5 Agendapunkte insgesamt als erledigt markiert',
    category: 'contributions',
    icon: 'mdi-check-decagram',
    target: 5,
    xp: 120
  },

  // Community
  {
    id: 'agendas_joined_3',
    title: 'Netzwerker',
    description: 'An mindestens 3 verschiedenen Agenden teilgenommen',
    category: 'community',
    icon: 'mdi-earth',
    target: 3,
    xp: 100
  },
  {
    id: 'comments_10',
    title: 'Debattierclub',
    description: 'Mindestens 10 Kommentare insgesamt verfasst',
    category: 'community',
    icon: 'mdi-forum',
    target: 10,
    xp: 150
  },
  {
    id: 'reactions_10',
    title: 'Reaktionsfeuer',
    description: 'Mindestens 10 Emoji-Reaktionen an Beiträge vergeben',
    category: 'community',
    icon: 'mdi-heart-multiple',
    target: 10,
    xp: 80
  },
  {
    id: 'transfers_1',
    title: 'Kooperationsprofi',
    description: 'Mindestens einen Agendapunkt übertragen oder angenommen',
    category: 'community',
    icon: 'mdi-handshake',
    target: 1,
    xp: 75
  },

  // Identity
  {
    id: 'color_custom',
    title: 'Farbkünstler',
    description: 'Visitenkartenfarbe im Benutzerprofil individualisiert',
    category: 'identity',
    icon: 'mdi-palette',
    target: 1,
    xp: 50
  },
  {
    id: 'avatar_custom',
    title: 'Fotogen',
    description: 'Ein persönliches Profilbild (Avatar) eingerichtet',
    category: 'identity',
    icon: 'mdi-camera',
    target: 1,
    xp: 50
  },
  {
    id: 'security_totp',
    title: 'Fort Knox',
    description: 'Mit Sicherheits-PIN oder dynamischem TOTP-Code geschützt',
    category: 'identity',
    icon: 'mdi-shield-lock',
    target: 1,
    xp: 100
  }
];

export const AGENDA_MILESTONE_DEFINITIONS: IAchievementDefinition[] = [
  {
    id: 'all_completed',
    title: 'Mission Accomplished',
    description: '100% aller Punkte dieser Agenda wurden als erledigt markiert!',
    category: 'team_milestone',
    icon: 'mdi-flag-checkered',
    target: 1,
    xp: 100
  },
  {
    id: 'full_house',
    title: 'Volles Haus',
    description: 'Mindestens 3 Teilnehmer sind in dieser Agenda anwesend',
    category: 'team_milestone',
    icon: 'mdi-account-group',
    target: 3,
    xp: 50
  },
  {
    id: 'hot_discussion',
    title: 'Heiß diskutiert',
    description: 'Mindestens 10 Kommentare oder Reaktionen in diesem Meeting',
    category: 'team_milestone',
    icon: 'mdi-fire',
    target: 10,
    xp: 60
  },
  {
    id: 'well_prepared',
    title: 'Gut vorbereitet',
    description: 'Datum, Uhrzeit und Veranstaltungsort sind vollständig eingetragen',
    category: 'team_milestone',
    icon: 'mdi-map-marker-check',
    target: 1,
    xp: 40
  },
  {
    id: 'democracy',
    title: 'Demokratie pur',
    description: 'Mindestens eine Umfrage mit abgegebenen Teilnehmerstimmen',
    category: 'team_milestone',
    icon: 'mdi-vote',
    target: 1,
    xp: 50
  },
  {
    id: 'power_session',
    title: 'Power-Session',
    description: 'Mindestens 5 Agendapunkte in dieser Agenda erstellt',
    category: 'team_milestone',
    icon: 'mdi-lightning-bolt-circle',
    target: 5,
    xp: 60
  }
];

export const AGENDA_SESSION_PERSONAL_DEFINITIONS: IAchievementDefinition[] = [
  {
    id: 'session_item_creator',
    title: 'Agenda-Impulsgeber',
    description: 'Mindestens einen Punkt zu dieser Agenda beigesteuert',
    category: 'session_personal',
    icon: 'mdi-pencil',
    target: 1,
    xp: 30
  },
  {
    id: 'session_commenter',
    title: 'Aktiver Teilnehmer',
    description: 'Mindestens einen Kommentar in dieser Agenda verfasst',
    category: 'session_personal',
    icon: 'mdi-comment-text-outline',
    target: 1,
    xp: 25
  },
  {
    id: 'session_voter',
    title: 'Stimme erhoben',
    description: 'An einer Umfrage oder einem Upvote in dieser Agenda teilgenommen',
    category: 'session_personal',
    icon: 'mdi-vote-outline',
    target: 1,
    xp: 25
  },
  {
    id: 'session_image_uploader',
    title: 'Bild-Pionier',
    description: 'Mindestens ein Bild in dieser Agenda hochgeladen',
    category: 'session_personal',
    icon: 'mdi-image',
    target: 1,
    xp: 25
  },
  {
    id: 'session_description_added',
    title: 'Detail-Liebhaber',
    description: 'Mindestens eine Beschreibung zu einem Agendapunkt hinzugefügt',
    category: 'session_personal',
    icon: 'mdi-text-box-outline',
    target: 1,
    xp: 25
  }
];

export const DYNAMIC_LEADER_DEFINITIONS: IAchievementDefinition[] = [
  {
    id: 'leader_points',
    title: 'Punkte-König',
    description: 'Hält aktuell die meisten eingereichten Agendapunkte in dieser Agenda',
    category: 'dynamic_leader',
    icon: 'mdi-crown',
    target: 1,
    xp: 50,
    isDynamic: true
  },
  {
    id: 'leader_comments',
    title: 'Debatten-Champion',
    description: 'Hat aktuell die meisten Kommentare in dieser Agenda verfasst',
    category: 'dynamic_leader',
    icon: 'pi pi-comment',
    target: 1,
    xp: 50,
    isDynamic: true
  },
  {
    id: 'leader_upvotes',
    title: 'Publikumsliebling',
    description: 'Eigene Punkte haben die meisten Upvotes in dieser Agenda erhalten',
    category: 'dynamic_leader',
    icon: 'pi pi-thumbs-up',
    target: 1,
    xp: 50,
    isDynamic: true
  },
  {
    id: 'leader_images',
    title: 'Bilder-König',
    description: 'Hat aktuell die meisten Bilder in dieser Agenda beigesteuert',
    category: 'dynamic_leader',
    icon: 'mdi-camera',
    target: 1,
    xp: 50,
    isDynamic: true
  },
  {
    id: 'leader_words',
    title: 'Wort-Meister',
    description: 'Hat aktuell die meisten Wörter in Agendapunkt-Beschreibungen verfasst',
    category: 'dynamic_leader',
    icon: 'mdi-book-open-variant',
    target: 1,
    xp: 50,
    isDynamic: true
  }
];

export function calculateRank(unlockedCount: number): { rank: string; level: number; nextRankAt: number } {
  if (unlockedCount >= 13) {
    return { rank: 'Flash-Legende', level: 5, nextRankAt: 16 };
  } else if (unlockedCount >= 9) {
    return { rank: 'Flash-Champion', level: 4, nextRankAt: 13 };
  } else if (unlockedCount >= 6) {
    return { rank: 'Agenda-Hero', level: 3, nextRankAt: 9 };
  } else if (unlockedCount >= 3) {
    return { rank: 'Planer', level: 2, nextRankAt: 6 };
  } else {
    return { rank: 'Agenda-Rookie', level: 1, nextRankAt: 3 };
  }
}

export function evaluateGlobalAchievements(
  userAgendas: IAgenda[],
  userId: string,
  userName: string,
  userProfile?: { avatarUrl?: string; cardColor?: string; securityCode?: string; secretGuid?: string; pinnedAchievements?: string[] }
) {
  const cleanId = (userId || '').trim().toLowerCase();
  const cleanName = (userName || '').trim().toLowerCase();

  let agendasCreated = 0;
  let agendasJoined = userAgendas.length;
  let itemsContributed = 0;
  let itemsCompleted = 0;
  let commentsCount = 0;
  let reactionsCount = 0;
  let transfersCount = 0;

  for (const ag of userAgendas) {
    const isCreator =
      (cleanId && (ag.createdBy?.toLowerCase() === cleanId)) ||
      (cleanName && (ag.createdBy?.toLowerCase() === cleanName));
    if (isCreator) {
      agendasCreated++;
    }

    for (const item of (ag.items || [])) {
      const itemCreator = item.createdBy?.toLowerCase() || '';
      const itemAuthor = item.author?.toLowerCase() || '';
      const isMyItem = (cleanId && itemCreator === cleanId) || (cleanName && (itemCreator === cleanName || itemAuthor === cleanName));

      if (isMyItem) {
        itemsContributed++;
        if (item.completed) {
          itemsCompleted++;
        }
      }

      // Check item transfers
      if (item.transferredTo) {
        const toId = item.transferredTo.toUserId?.toLowerCase();
        const toName = item.transferredTo.toUserName?.toLowerCase();
        const fromId = item.transferredTo.fromUserId?.toLowerCase();
        const fromName = item.transferredTo.fromUserName?.toLowerCase();
        if (
          (cleanId && (toId === cleanId || fromId === cleanId)) ||
          (cleanName && (toName === cleanName || fromName === cleanName))
        ) {
          transfersCount++;
        }
      }

      // Check comments
      for (const comment of (item.comments || [])) {
        const commentCreator = comment.createdBy?.toLowerCase() || '';
        const commentAuthor = comment.author?.toLowerCase() || '';
        if (
          (cleanId && commentCreator === cleanId) ||
          (cleanName && (commentCreator === cleanName || commentAuthor === cleanName))
        ) {
          commentsCount++;
        }

        // Check emoji reactions
        for (const reaction of (comment.reactions || [])) {
          if (Array.isArray(reaction.users)) {
            const hasReacted = reaction.users.some(u => {
              const cu = u.toLowerCase();
              return (cleanId && cu === cleanId) || (cleanName && cu === cleanName);
            });
            if (hasReacted) {
              reactionsCount++;
            }
          }
        }
      }
    }
  }

  // Profile criteria
  const hasCustomColor = !!(userProfile?.cardColor && userProfile.cardColor !== '#0a4b7c');
  const hasAvatar = !!(userProfile?.avatarUrl && userProfile.avatarUrl.trim().length > 0);
  const hasTotp = !!(userProfile?.secretGuid || (userProfile?.securityCode && userProfile.securityCode !== '----'));

  const counters: Record<string, number> = {
    creator_first: agendasCreated,
    creator_3: agendasCreated,
    creator_10: agendasCreated,
    items_1: itemsContributed,
    items_10: itemsContributed,
    items_25: itemsContributed,
    items_50: itemsContributed,
    items_100: itemsContributed,
    items_done_5: itemsCompleted,
    agendas_joined_3: agendasJoined,
    comments_10: commentsCount,
    reactions_10: reactionsCount,
    transfers_1: transfersCount,
    color_custom: hasCustomColor ? 1 : 0,
    avatar_custom: hasAvatar ? 1 : 0,
    security_totp: hasTotp ? 1 : 0
  };

  const evaluated: IEvaluatedAchievement[] = GLOBAL_ACHIEVEMENT_DEFINITIONS.map(def => {
    const current = counters[def.id] || 0;
    const unlocked = current >= def.target;
    const progressPercent = Math.min(100, Math.round((current / def.target) * 100));
    return {
      ...def,
      current,
      unlocked,
      progressPercent
    };
  });

  const unlockedCount = evaluated.filter(a => a.unlocked).length;
  const totalXp = evaluated.filter(a => a.unlocked).reduce((sum, a) => sum + a.xp, 0);
  const rankInfo = calculateRank(unlockedCount);

  return {
    achievements: evaluated,
    unlockedCount,
    totalCount: evaluated.length,
    totalXp,
    rank: rankInfo.rank,
    level: rankInfo.level,
    nextRankAt: rankInfo.nextRankAt,
    pinnedAchievements: userProfile?.pinnedAchievements || []
  };
}

function countItemImages(item: any): number {
  if (Array.isArray(item.imageUrls) && item.imageUrls.length > 0) {
    return item.imageUrls.length;
  }
  return item.imageUrl ? 1 : 0;
}

function countCommentImages(comment: any): number {
  if (!comment.attachments || !Array.isArray(comment.attachments)) return 0;
  return comment.attachments.filter((att: any) =>
    att.type === 'image' ||
    (typeof att.url === 'string' && /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(att.url))
  ).length;
}

function countWords(text?: string): number {
  if (!text || typeof text !== 'string') return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(w => w.length > 0).length;
}

export function evaluateAgendaAchievements(
  agenda: IAgenda,
  userId?: string,
  userName?: string
) {
  const cleanId = (userId || '').trim().toLowerCase();
  const cleanName = (userName || '').trim().toLowerCase();

  const items = agenda.items || [];
  const attendees = agenda.attendees || [];

  // 1. Team Milestones
  const totalItems = items.length;
  const completedItems = items.filter(i => i.completed).length;
  const allCompleted = totalItems > 0 && completedItems === totalItems;
  const presentCount = attendees.filter(a => a.attendanceStatus === 'present').length;
  
  let totalCommentsAndReactions = 0;
  let hasPollWithVotes = false;

  for (const item of items) {
    if (item.comments) {
      totalCommentsAndReactions += item.comments.length;
      for (const c of item.comments) {
        if (c.reactions) {
          for (const r of c.reactions) {
            totalCommentsAndReactions += (r.users || []).length;
          }
        }
      }
    }
    if (item.poll && item.poll.options) {
      const votes = item.poll.options.reduce((sum, opt) => sum + (opt.votes?.length || 0), 0);
      if (votes > 0) {
        hasPollWithVotes = true;
      }
    }
  }

  const isWellPrepared = !!(agenda.date && agenda.time && agenda.location && agenda.location.name);

  const teamMilestones: IEvaluatedAchievement[] = AGENDA_MILESTONE_DEFINITIONS.map(def => {
    let current = 0;
    if (def.id === 'all_completed') current = allCompleted ? 1 : 0;
    else if (def.id === 'full_house') current = presentCount;
    else if (def.id === 'hot_discussion') current = totalCommentsAndReactions;
    else if (def.id === 'well_prepared') current = isWellPrepared ? 1 : 0;
    else if (def.id === 'democracy') current = hasPollWithVotes ? 1 : 0;
    else if (def.id === 'power_session') current = totalItems;

    const unlocked = current >= def.target;
    const progressPercent = Math.min(100, Math.round((current / def.target) * 100));

    return {
      ...def,
      current,
      unlocked,
      progressPercent
    };
  });

  // Compute per-attendee / contributor maps
  const aliasMap = new Map<string, string>();
  const attendeeInfoMap = new Map<string, { id: string; name: string; avatarUrl?: string }>();

  for (const att of attendees) {
    const canonicalKey = (att.id || (att._id ? String(att._id) : att.name) || '').toLowerCase();
    const info = {
      id: att.id || (att._id ? String(att._id) : att.name) || '',
      name: att.name || 'Unbekannt',
      avatarUrl: att.avatarUrl
    };
    attendeeInfoMap.set(canonicalKey, info);
    if (att.id) aliasMap.set(String(att.id).toLowerCase(), canonicalKey);
    if (att._id) aliasMap.set(String(att._id).toLowerCase(), canonicalKey);
    if (att.name) aliasMap.set(att.name.toLowerCase(), canonicalKey);
  }

  const pointsMap = new Map<string, { name: string; count: number; id: string; avatarUrl?: string }>();
  const finisherMap = new Map<string, { name: string; count: number; id: string; avatarUrl?: string }>();
  const commentsMap = new Map<string, { name: string; count: number; id: string; avatarUrl?: string }>();
  const upvotesMap = new Map<string, { name: string; count: number; id: string; avatarUrl?: string }>();
  const imagesMap = new Map<string, { name: string; count: number; id: string; avatarUrl?: string }>();
  const voterMap = new Map<string, { name: string; count: number; id: string; avatarUrl?: string }>();
  const wordsMap = new Map<string, { name: string; count: number; id: string; avatarUrl?: string }>();
  const descriptionsMap = new Map<string, { name: string; count: number; id: string; avatarUrl?: string }>();

  const registerContributor = (idOrName: string, display?: string) => {
    const raw = (idOrName || display || 'unknown').trim();
    const rawLower = raw.toLowerCase();
    const key = aliasMap.get(rawLower) || rawLower;

    const existingInfo = attendeeInfoMap.get(key);
    const resolvedName = existingInfo?.name || display || raw;
    const resolvedAvatar = existingInfo?.avatarUrl;
    const resolvedId = existingInfo?.id || idOrName || raw;

    if (!pointsMap.has(key)) pointsMap.set(key, { name: resolvedName, count: 0, id: resolvedId, avatarUrl: resolvedAvatar });
    if (!finisherMap.has(key)) finisherMap.set(key, { name: resolvedName, count: 0, id: resolvedId, avatarUrl: resolvedAvatar });
    if (!commentsMap.has(key)) commentsMap.set(key, { name: resolvedName, count: 0, id: resolvedId, avatarUrl: resolvedAvatar });
    if (!upvotesMap.has(key)) upvotesMap.set(key, { name: resolvedName, count: 0, id: resolvedId, avatarUrl: resolvedAvatar });
    if (!imagesMap.has(key)) imagesMap.set(key, { name: resolvedName, count: 0, id: resolvedId, avatarUrl: resolvedAvatar });
    if (!voterMap.has(key)) voterMap.set(key, { name: resolvedName, count: 0, id: resolvedId, avatarUrl: resolvedAvatar });
    if (!wordsMap.has(key)) wordsMap.set(key, { name: resolvedName, count: 0, id: resolvedId, avatarUrl: resolvedAvatar });
    if (!descriptionsMap.has(key)) descriptionsMap.set(key, { name: resolvedName, count: 0, id: resolvedId, avatarUrl: resolvedAvatar });

    return key;
  };

  // Register all attendees first
  for (const att of attendees) {
    registerContributor(att.id || (att._id ? String(att._id) : att.name), att.name);
  }

  for (const item of items) {
    const key = registerContributor(item.createdBy || item.author || 'unknown', item.author || item.createdBy || 'Unbekannt');
    pointsMap.get(key)!.count++;

    if (item.completed) {
      finisherMap.get(key)!.count++;
    }

    const itemImgs = countItemImages(item);
    if (itemImgs > 0) {
      imagesMap.get(key)!.count += itemImgs;
    }

    const itemWords = countWords(item.description);
    if (itemWords > 0) {
      wordsMap.get(key)!.count += itemWords;
      descriptionsMap.get(key)!.count += 1;
    }

    if (item.upvotes && item.upvotes.length > 0) {
      upvotesMap.get(key)!.count += item.upvotes.length;

      for (const voter of item.upvotes) {
        const vKey = registerContributor(voter, voter);
        voterMap.get(vKey)!.count++;
      }
    }

    if (item.poll && item.poll.options) {
      for (const opt of item.poll.options) {
        if (opt.votes && opt.votes.length > 0) {
          for (const voter of opt.votes) {
            const vKey = registerContributor(voter, voter);
            voterMap.get(vKey)!.count++;
          }
        }
      }
    }

    for (const comment of (item.comments || [])) {
      const cKey = registerContributor(comment.createdBy || comment.author || 'unknown', comment.author || comment.createdBy || 'Unbekannt');
      commentsMap.get(cKey)!.count++;

      const commentImgs = countCommentImages(comment);
      if (commentImgs > 0) {
        imagesMap.get(cKey)!.count += commentImgs;
      }
    }
  }

  // Resolve user stats
  const userKey = aliasMap.get(cleanId) || aliasMap.get(cleanName) || cleanId || cleanName;
  const userItemsContributed = pointsMap.get(userKey)?.count || 0;
  const userItemsCompleted = finisherMap.get(userKey)?.count || 0;
  const userCommentsWritten = commentsMap.get(userKey)?.count || 0;
  const userVotesCast = voterMap.get(userKey)?.count || 0;
  const userUpvotesReceived = upvotesMap.get(userKey)?.count || 0;
  const userImagesContributed = imagesMap.get(userKey)?.count || 0;
  const userWordsWritten = wordsMap.get(userKey)?.count || 0;
  const userDescriptionsAdded = descriptionsMap.get(userKey)?.count || 0;

  // Build Leaderboard helper
  const buildLeaderboard = (
    map: Map<string, { name: string; count: number; id: string; avatarUrl?: string }>,
    target: number = 1
  ): ILeaderboardEntry[] => {
    const entries = Array.from(map.values());
    entries.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.name.localeCompare(b.name);
    });

    let currentRank = 1;
    return entries.map((entry, idx) => {
      if (idx > 0 && entry.count < entries[idx - 1].count) {
        currentRank = idx + 1;
      }
      const entryKey = aliasMap.get((entry.id || '').toLowerCase()) || aliasMap.get((entry.name || '').toLowerCase()) || (entry.id || '').toLowerCase();
      const isCurrentUser = !!(
        (userKey && entryKey === userKey) ||
        (cleanId && (entry.id?.toLowerCase() === cleanId || entryKey === aliasMap.get(cleanId))) ||
        (cleanName && (entry.name?.toLowerCase() === cleanName || entryKey === aliasMap.get(cleanName)))
      );

      return {
        userId: entry.id,
        userName: entry.name,
        avatarUrl: entry.avatarUrl,
        count: entry.count,
        rank: currentRank,
        isCurrentUser,
        unlocked: entry.count >= target
      };
    });
  };

  // 2. Personal Session Achievements
  const personalAchievements: IEvaluatedAchievement[] = AGENDA_SESSION_PERSONAL_DEFINITIONS.map(def => {
    let current = 0;
    let mapToUse = pointsMap;
    if (def.id === 'session_item_creator') {
      current = userItemsContributed;
      mapToUse = pointsMap;
    } else if (def.id === 'session_commenter') {
      current = userCommentsWritten;
      mapToUse = commentsMap;
    } else if (def.id === 'session_voter') {
      current = userVotesCast;
      mapToUse = voterMap;
    } else if (def.id === 'session_image_uploader') {
      current = userImagesContributed;
      mapToUse = imagesMap;
    } else if (def.id === 'session_description_added') {
      current = userDescriptionsAdded;
      mapToUse = descriptionsMap;
    }

    const unlocked = current >= def.target;
    const progressPercent = Math.min(100, Math.round((current / def.target) * 100));

    return {
      ...def,
      current,
      unlocked,
      progressPercent,
      leaderboard: buildLeaderboard(mapToUse, def.target)
    };
  });

  // Find leader for a map
  const findLeader = (map: Map<string, { name: string; count: number; id: string; avatarUrl?: string }>) => {
    let topLeader: { name: string; count: number; id: string; avatarUrl?: string } | null = null;
    for (const record of map.values()) {
      if (record.count > 0) {
        if (!topLeader || record.count > topLeader.count) {
          topLeader = record;
        }
      }
    }
    return topLeader;
  };

  const pointsLeader = findLeader(pointsMap);
  const commentsLeader = findLeader(commentsMap);
  const upvotesLeader = findLeader(upvotesMap);
  const imagesLeader = findLeader(imagesMap);
  const wordsLeader = findLeader(wordsMap);

  const dynamicLeaders: IEvaluatedAchievement[] = DYNAMIC_LEADER_DEFINITIONS.map(def => {
    let leader: { name: string; count: number; id: string; avatarUrl?: string } | null = null;
    let userCount = 0;
    let mapToUse = pointsMap;

    if (def.id === 'leader_points') {
      leader = pointsLeader;
      userCount = userItemsContributed;
      mapToUse = pointsMap;
    } else if (def.id === 'leader_comments') {
      leader = commentsLeader;
      userCount = userCommentsWritten;
      mapToUse = commentsMap;
    } else if (def.id === 'leader_upvotes') {
      leader = upvotesLeader;
      userCount = userUpvotesReceived;
      mapToUse = upvotesMap;
    } else if (def.id === 'leader_images') {
      leader = imagesLeader;
      userCount = userImagesContributed;
      mapToUse = imagesMap;
    } else if (def.id === 'leader_words') {
      leader = wordsLeader;
      userCount = userWordsWritten;
      mapToUse = wordsMap;
    }

    const leaderKey = leader ? (aliasMap.get((leader.id || '').toLowerCase()) || aliasMap.get((leader.name || '').toLowerCase()) || (leader.id || '').toLowerCase()) : '';
    const isCurrentUserLeader = !!(
      leader &&
      leader.count > 0 &&
      ((userKey && leaderKey === userKey) ||
       (cleanId && leader.id?.toLowerCase() === cleanId) ||
       (cleanName && leader.name?.toLowerCase() === cleanName))
    );

    const gapToLeader = leader && leader.count > userCount ? leader.count - userCount : 0;

    return {
      ...def,
      current: userCount,
      target: leader ? Math.max(1, leader.count) : 1,
      unlocked: isCurrentUserLeader,
      progressPercent: leader && leader.count > 0 ? Math.min(100, Math.round((userCount / leader.count) * 100)) : 0,
      leader: leader ? { userId: leader.id, userName: leader.name, avatarUrl: leader.avatarUrl, count: leader.count } : null,
      isCurrentUserLeader,
      gapToLeader,
      leaderboard: buildLeaderboard(mapToUse, 1)
    };
  });

  return {
    agendaId: agenda._id,
    teamMilestones,
    personalAchievements,
    dynamicLeaders,
    milestonesUnlocked: teamMilestones.filter(m => m.unlocked).length,
    totalMilestones: teamMilestones.length
  };
}
