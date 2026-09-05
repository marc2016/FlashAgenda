export interface ILeaderboardEntry {
  userId?: string;
  userName: string;
  avatarUrl?: string;
  count: number;
  rank: number;
  isCurrentUser?: boolean;
  unlocked?: boolean;
}

export interface IEvaluatedAchievement {
  id: string;
  title: string;
  description: string;
  category: 'creation' | 'contributions' | 'community' | 'identity' | 'team_milestone' | 'session_personal' | 'dynamic_leader';
  icon: string;
  target: number;
  xp: number;
  current: number;
  unlocked: boolean;
  progressPercent: number;
  isDynamic?: boolean;
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

export interface IGlobalAchievementsResult {
  achievements: IEvaluatedAchievement[];
  unlockedCount: number;
  totalCount: number;
  totalXp: number;
  rank: string;
  level: number;
  nextRankAt: number;
  pinnedAchievements: string[];
}

export interface IAgendaAchievementsResult {
  agendaId: string;
  teamMilestones: IEvaluatedAchievement[];
  personalAchievements: IEvaluatedAchievement[];
  dynamicLeaders: IEvaluatedAchievement[];
  milestonesUnlocked: number;
  totalMilestones: number;
}

export const GLOBAL_ACHIEVEMENT_CATALOG: Record<string, { title: string; icon: string; description: string; category: string; xp: number }> = {
  creator_first: { title: 'Pionier', icon: 'mdi-flash', description: 'Erste eigene Agenda ins Leben gerufen', category: 'creation', xp: 50 },
  creator_3: { title: 'Agenda-Architekt', icon: 'mdi-domain', description: 'Mindestens 3 Agenden eigenständig erstellt', category: 'creation', xp: 150 },
  creator_10: { title: 'Flash-Mastermind', icon: 'mdi-crown', description: 'Mindestens 10 Agenden erfolgreich organisiert', category: 'creation', xp: 300 },
  items_1: { title: 'Themenstarter', icon: 'mdi-pencil-plus', description: 'Den ersten Agendapunkt überhaupt eingereicht', category: 'contributions', xp: 30 },
  items_10: { title: 'Ideenfeuerwerk', icon: 'mdi-rocket-launch', description: '10 Agendapunkte insgesamt beigesteuert', category: 'contributions', xp: 100 },
  items_25: { title: 'Task-Titan', icon: 'mdi-clipboard-text', description: '25 Agendapunkte insgesamt beigesteuert', category: 'contributions', xp: 250 },
  items_50: { title: 'Inhalts-Maschine', icon: 'mdi-factory', description: '50 Agendapunkte insgesamt beigesteuert', category: 'contributions', xp: 500 },
  items_100: { title: 'Flash-Legende', icon: 'mdi-trophy-award', description: '100 Agendapunkte insgesamt beigesteuert', category: 'contributions', xp: 1000 },
  items_done_5: { title: 'Finisher', icon: 'mdi-check-decagram', description: '5 Agendapunkte insgesamt als erledigt markiert', category: 'contributions', xp: 120 },
  agendas_joined_3: { title: 'Netzwerker', icon: 'mdi-earth', description: 'An mindestens 3 verschiedenen Agenden teilgenommen', category: 'community', xp: 100 },
  comments_10: { title: 'Debattierclub', icon: 'mdi-forum', description: 'Mindestens 10 Kommentare insgesamt verfasst', category: 'community', xp: 150 },
  reactions_10: { title: 'Reaktionsfeuer', icon: 'mdi-heart-multiple', description: 'Mindestens 10 Emoji-Reaktionen vergeben', category: 'community', xp: 80 },
  transfers_1: { title: 'Kooperationsprofi', icon: 'mdi-handshake', description: 'Agendapunkt übertragen oder angenommen', category: 'community', xp: 75 },
  color_custom: { title: 'Farbkünstler', icon: 'mdi-palette', description: 'Visitenkartenfarbe im Profil angepasst', category: 'identity', xp: 50 },
  avatar_custom: { title: 'Fotogen', icon: 'mdi-camera', description: 'Persönliches Profilbild eingerichtet', category: 'identity', xp: 50 },
  security_totp: { title: 'Fort Knox', icon: 'mdi-shield-lock', description: 'Mit TOTP oder Sicherheits-PIN geschützt', category: 'identity', xp: 100 }
};

export const ACHIEVEMENT_CATEGORY_COLORS: Record<string, string> = {
  creation: '#b45309',       // Warm Amber / Gold
  contributions: '#1d4ed8',  // Vibrant Royal Blue
  community: '#0d9488',      // Teal / Emerald
  identity: '#7c3aed'        // Electric Purple
};

export function getAchievementDefinition(id: string) {
  return GLOBAL_ACHIEVEMENT_CATALOG[id];
}

export async function fetchGlobalAchievements(
  userId?: string,
  userName?: string,
  profile?: { cardColor?: string; avatarUrl?: string; securityCode?: string; secretGuid?: string }
): Promise<IGlobalAchievementsResult | null> {
  try {
    const params = new URLSearchParams();
    if (userId) params.set('user', userId);
    if (userName) params.set('name', userName);
    if (profile?.cardColor) params.set('cardColor', profile.cardColor);
    if (profile?.avatarUrl) params.set('avatarUrl', profile.avatarUrl);
    if (profile?.securityCode) params.set('securityCode', profile.securityCode);
    if (profile?.secretGuid) params.set('secretGuid', profile.secretGuid);

    const res = await fetch(`/api/agendas/user-achievements?${params.toString()}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch global achievements:', err);
    return null;
  }
}

export async function fetchAgendaAchievements(
  agendaId: string,
  userId?: string,
  userName?: string
): Promise<IAgendaAchievementsResult | null> {
  if (!agendaId) return null;
  try {
    const params = new URLSearchParams();
    if (userId) params.set('user', userId);
    if (userName) params.set('name', userName);

    const res = await fetch(`/api/agendas/${agendaId}/achievements?${params.toString()}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch agenda achievements:', err);
    return null;
  }
}

// LocalStorage helpers for newly unlocked notifications
export function getSeenAchievementKey(userId?: string, agendaId?: string): string {
  const user = (userId || 'anon').trim().toLowerCase();
  if (agendaId) {
    return `flashagenda_seen_${user}_${agendaId}`;
  }
  return `flashagenda_seen_${user}_global`;
}

export function getSeenAchievementIds(userId?: string, agendaId?: string): Set<string> {
  try {
    const key = getSeenAchievementKey(userId, agendaId);
    const raw = localStorage.getItem(key);
    const set = new Set<string>();
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach(id => set.add(id));
      }
    }
    // Also include legacy global key if applicable
    const legacyRaw = localStorage.getItem('flashagenda_seen_achievements');
    if (legacyRaw) {
      try {
        const legacyParsed = JSON.parse(legacyRaw);
        if (Array.isArray(legacyParsed)) {
          legacyParsed.forEach(id => set.add(id));
        }
      } catch {}
    }
    return set;
  } catch {
    return new Set();
  }
}

export function markAchievementsAsSeen(achievementIds: string[], userId?: string, agendaId?: string) {
  try {
    const key = getSeenAchievementKey(userId, agendaId);
    const seen = getSeenAchievementIds(userId, agendaId);
    achievementIds.forEach(id => seen.add(id));
    localStorage.setItem(key, JSON.stringify(Array.from(seen)));
  } catch (err) {
    console.error('Failed to save seen achievements:', err);
  }
}

export function detectNewlyUnlocked(
  achievements: IEvaluatedAchievement[],
  userId?: string,
  agendaId?: string
): IEvaluatedAchievement[] {
  const seen = getSeenAchievementIds(userId, agendaId);
  const newUnlocks: IEvaluatedAchievement[] = [];

  for (const ach of achievements) {
    // Both standard unlocked achievements AND won dynamic leaders trigger unlock toasts
    const isEarned = ach.unlocked || !!ach.isCurrentUserLeader;
    if (isEarned && !seen.has(ach.id)) {
      newUnlocks.push(ach);
    }
  }

  return newUnlocks;
}
