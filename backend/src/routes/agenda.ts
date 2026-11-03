import express, { Request, Response, Router } from 'express';
import mongoose from 'mongoose';
import { randomInt, randomUUID } from 'crypto';
import rateLimit from 'express-rate-limit';
import Agenda from '../models/Agenda';
import { broadcastAgendaEvent } from '../services/socketService';
import { verifyTotpCode } from '../services/totpService';
import { evaluateGlobalAchievements, evaluateAgendaAchievements } from '../services/achievementService';

const router: Router = express.Router();

// Helper to append audit log entries to an agenda
function logAudit(agenda: any, action: string, user?: string, details?: string) {
  if (!agenda.auditLogs) {
    agenda.auditLogs = [];
  }
  agenda.auditLogs.push({
    action,
    user: user || 'Unbekannt',
    details: details || '',
    timestamp: new Date()
  });
}

// Helper to validate and sanitize image URLs / Data URIs against XSS and malicious scripts (Anti-Virus & Malicious Payload Filter)
export function isSafeImageUrl(url: any): boolean {
  if (!url || typeof url !== 'string') return true;
  const trimmed = url.trim();
  if (trimmed === '') return true;

  // Block dangerous non-image schemes (executable scripts, HTML injection)
  if (/^(javascript|vbscript|data:text\/html|data:text\/javascript|data:application\/)/i.test(trimmed)) {
    return false;
  }

  // HTTP/HTTPS URLs: Check for script tags or inline event handlers
  if (/^https?:\/\//i.test(trimmed)) {
    if (/<script|javascript:|onerror=|onload=|onclick=/i.test(trimmed)) {
      return false;
    }
    return true;
  }

  // Safe Image Data URIs (png, jpeg, webp, gif, svg+xml)
  if (/^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,/i.test(trimmed)) {
    // For SVG base64, decode payload and ensure no script or inline handlers exist
    if (/^data:image\/svg\+xml/i.test(trimmed)) {
      try {
        const base64Content = trimmed.split(',')[1] || '';
        const decoded = Buffer.from(base64Content, 'base64').toString('utf-8');
        if (/<script|onload=|onerror=|onclick=|javascript:/i.test(decoded)) {
          return false;
        }
      } catch {
        return false;
      }
    }
    return true;
  }

  return false;
}

export function isAgendaClosed(agenda: { isManuallyClosed?: boolean; date?: string; closeBeforeHours?: number }, now: number = Date.now()): boolean {
  if (agenda.isManuallyClosed === true) return true;
  if (agenda.date) {
    const agendaDate = new Date(agenda.date).getTime();
    if (!isNaN(agendaDate)) {
      const offsetMs = (agenda.closeBeforeHours ?? 12) * 60 * 60 * 1000;
      if (now > (agendaDate - offsetMs)) {
        return true;
      }
    }
  }
  if (agenda.isManuallyClosed === false) return false;
  return false;
}

export const STANDARD_ITEMS = [
  { systemKey: 'welcome', title: 'Begrüßung' },
  { systemKey: 'next_meeting', title: 'Neuer Termin' },
  { systemKey: 'location', title: 'Location' }
] as const;

// Adds the standard system items (Begrüßung, Neuer Termin, Location) to the top of the agenda,
// or removes them again when disabled. Items belong to the system user, not to any attendee.
export function applyStandardItems(agenda: any, enabled: boolean): void {
  const items: any[] = agenda.items || [];
  if (enabled) {
    const now = new Date();
    const missing = STANDARD_ITEMS
      .filter((std) => !items.some((item: any) => item.systemKey === std.systemKey))
      .map((std) => ({
        title: std.title,
        systemKey: std.systemKey,
        author: 'System',
        createdBy: 'system',
        pinned: true,
        completed: false,
        upvotes: [],
        createdAt: now,
        updatedAt: now
      }));
    agenda.items = [...missing, ...items];
  } else {
    agenda.items = items.filter((item: any) => !item.systemKey);
  }
  if (typeof agenda.markModified === 'function') agenda.markModified('items');
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function generateSecurityCode(): string {
  return String(randomInt(0, 10000)).padStart(4, '0');
}

// Gives every registered attendee a code and GUID if one is missing. Returns true if anything changed.
export function fillMissingSecrets(agenda: any): boolean {
  let changed = false;
  for (const att of agenda?.attendees || []) {
    if (!att.isRegistered) continue;
    if (!att.securityCode) {
      att.securityCode = generateSecurityCode();
      changed = true;
    }
    if (!att.secretGuid) {
      att.secretGuid = randomUUID();
      changed = true;
    }
  }
  if (changed && typeof agenda.markModified === 'function') agenda.markModified('attendees');
  return changed;
}

// The only shape in which a device receives a person's secrets (its own, after proving it).
export function ownUserResponse(att: any) {
  return {
    id: att.id || att._id?.toString(),
    _id: att._id?.toString() || att.id,
    name: att.name,
    email: att.email || '',
    avatarUrl: att.avatarUrl || '',
    cardColor: att.cardColor,
    securityCode: att.securityCode || '',
    secretGuid: att.secretGuid || '',
    isRegistered: true
  };
}

function findAttendeeByParam(agenda: any, targetId: string): any {
  return (agenda?.attendees || []).find((a: any) =>
    (a.id && a.id.toString() === targetId) ||
    (a._id && a._id.toString() === targetId)
  );
}

// Failed code checks per person: at most VERIFY_MAX_FAILURES within VERIFY_WINDOW_MS.
export const VERIFY_MAX_FAILURES = 5;
export const VERIFY_WINDOW_MS = 15 * 60 * 1000;
const verifyFailures = new Map<string, { count: number; firstAt: number }>();

export function currentFailures(key: string, now: number): number {
  const entry = verifyFailures.get(key);
  if (!entry) return 0;
  if (now - entry.firstAt > VERIFY_WINDOW_MS) {
    verifyFailures.delete(key);
    return 0;
  }
  return entry.count;
}

export function recordFailure(key: string, now: number): void {
  const entry = verifyFailures.get(key);
  if (!entry || now - entry.firstAt > VERIFY_WINDOW_MS) {
    verifyFailures.set(key, { count: 1, firstAt: now });
  } else {
    entry.count += 1;
  }
}

export function resetVerifyFailures(): void {
  verifyFailures.clear();
}

// A person's stable id is the same in every agenda they joined; the most recently changed agenda wins.
export async function findAttendeeAcrossAgendas(personId: string): Promise<any | null> {
  if (!personId) return null;
  const agendas = await Agenda.find({ 'attendees.id': personId }).sort({ updatedAt: -1 }).limit(1);
  for (const ag of agendas || []) {
    const att = (ag.attendees || []).find((a: any) => a.id === personId);
    if (att) return att;
  }
  return null;
}

export function isCodeValidFor(att: any, code: string): boolean {
  const clean = (code || '').toString().trim();
  if (!clean) return false;
  if (att.securityCode && String(att.securityCode).trim() === clean) return true;
  return !!(att.secretGuid && (verifyTotpCode(clean, att.secretGuid, 300) || verifyTotpCode(clean, att.secretGuid, 60)));
}

function findMatchingAttendee(list: any[], person: any): any {
  if (!person) return undefined;
  const pid = person.id;
  const p_id = person._id ? String(person._id) : undefined;
  const pname = (person.name || '').trim().toLowerCase();
  return (list || []).find((a: any) => pid && a.id === pid)
    || (list || []).find((a: any) => a._id && (String(a._id) === p_id || String(a._id) === pid))
    || (list || []).find((a: any) => pname && (a.name || '').trim().toLowerCase() === pname);
}

// Attendee lists sent by clients never carry (or change) secrets: keep the stored secrets and
// registration state of known people; new people from such a list start unregistered without secrets.
export function mergeAttendeeSecrets(oldAttendees: any[], incoming: any[]): any[] {
  return (incoming || []).map((raw: any) => {
    const na = typeof raw?.toObject === 'function' ? raw.toObject() : { ...raw };
    delete na.securityCode;
    delete na.secretGuid;
    const oa = findMatchingAttendee(oldAttendees, na);
    if (oa) {
      if (oa.securityCode) na.securityCode = oa.securityCode;
      if (oa.secretGuid) na.secretGuid = oa.secretGuid;
      na.isRegistered = !!oa.isRegistered;
    } else {
      na.isRegistered = false;
    }
    return na;
  });
}

// Whether the requesting person may manage the agenda (close it, archive it): the creator or the
// first attendee. Without a stored creator only the first attendee matches.
export function canManageAgenda(agenda: any, userId?: unknown, userName?: unknown): boolean {
  const id = typeof userId === 'string' ? userId.trim() : '';
  const name = typeof userName === 'string' ? userName.trim().toLowerCase() : '';
  if (!id && !name) return false;
  const createdBy = typeof agenda?.createdBy === 'string' ? agenda.createdBy.trim() : '';
  const first = agenda?.attendees?.[0];
  const firstId = first ? String(first.id || '') : '';
  const firstMongoId = first?._id ? String(first._id) : '';
  const firstName = typeof first?.name === 'string' ? first.name.trim().toLowerCase() : '';

  if (id && ((createdBy && id === createdBy) || (firstId && id === firstId) || (firstMongoId && id === firstMongoId))) return true;
  if (name && ((createdBy && name === createdBy.toLowerCase()) || (firstName && name === firstName))) return true;
  return false;
}

// Slim per-agenda summary for the home overview: no secrets, no comments, no audit logs, no item contents.
export function toAgendaSummary(doc: any) {
  const a = typeof doc?.toObject === 'function' ? doc.toObject() : doc;
  const items: any[] = Array.isArray(a.items) ? a.items : [];
  const location = a.location && typeof a.location.lat === 'number' && typeof a.location.lng === 'number'
    ? { name: a.location.name, lat: a.location.lat, lng: a.location.lng }
    : undefined;
  return {
    _id: a._id,
    title: a.title,
    date: a.date,
    time: a.time,
    location,
    isArchived: !!a.isArchived,
    isManuallyClosed: a.isManuallyClosed,
    closeBeforeHours: a.closeBeforeHours,
    createdBy: a.createdBy,
    liveMeetingActive: !!a.liveMeetingActive,
    liveMeetingStatus: a.liveMeetingStatus || 'not_started',
    updatedAt: a.updatedAt,
    itemCount: items.length,
    completedCount: items.filter(i => i?.completed).length,
    attendees: (Array.isArray(a.attendees) ? a.attendees : []).map((att: any) => ({
      id: att.id || (att._id ? String(att._id) : undefined),
      name: att.name,
      cardColor: att.cardColor,
      avatarUrl: att.avatarUrl
    }))
  };
}

// Get agendas associated with a specific user (created, joined, or matched by security code)
router.get('/user-agendas', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req.query.user as string || '').trim();
    const name = (req.query.name as string || '').trim();
    const code = (req.query.code as string || req.headers['x-user-code'] as string || '').trim();

    if (!user && !name && !code) {
      res.json([]);
      return;
    }

    const orConditions: any[] = [];
    if (user) {
      orConditions.push({ createdBy: user });
      orConditions.push({ 'attendees.id': user });
      if (mongoose.Types.ObjectId.isValid(user)) {
        orConditions.push({ 'attendees._id': new mongoose.Types.ObjectId(user) });
      }
    }
    if (name) {
      const safeName = escapeRegExp(name);
      orConditions.push({ createdBy: { $regex: new RegExp(`^${safeName}$`, 'i') } });
      orConditions.push({ 'attendees.name': { $regex: new RegExp(`^${safeName}$`, 'i') } });
    }
    if (code) {
      orConditions.push({ 'attendees.securityCode': code });
    }

    let candidateAgendas = await Agenda.find({ $or: orConditions }).sort({ updatedAt: -1 }).limit(100);

    // If code is provided, also look for matching secretGuid (TOTP)
    if (code) {
      const totpAgendas = await Agenda.find({ 'attendees.secretGuid': { $exists: true } }).sort({ updatedAt: -1 }).limit(100);
      for (const ag of totpAgendas) {
        if (candidateAgendas.some(c => c._id.toString() === ag._id.toString())) continue;
        const hasTotpMatch = (ag.attendees || []).some(att => att.secretGuid && verifyTotpCode(code, att.secretGuid));
        if (hasTotpMatch) {
          candidateAgendas.push(ag);
        }
      }
    }

    res.json(candidateAgendas.map(toAgendaSummary));
  } catch (error) {
    console.error('Error GET /user-agendas:', error);
    res.status(500).json({ message: 'Failed to fetch user agendas' });
  }
});

// Login user by 4-digit code (securityCode or live TOTP)
// Logging in by code alone is guessable (4 digits across all people): 5 failed attempts per IP per 15 minutes.
const loginByCodeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Zu viele Versuche. Bitte versuche es in 15 Minuten erneut.' }
});

router.post('/login-by-code', loginByCodeLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.body;
    const cleanCode = (code || '').toString().trim();

    if (!cleanCode) {
      res.status(400).json({ message: 'Code ist erforderlich' });
      return;
    }

    let matchedUser: any = null;

    // 1. Direct query by static securityCode across all agendas
    const staticAgenda = typeof (Agenda as any).findOne === 'function'
      ? await Agenda.findOne({ 'attendees.securityCode': cleanCode })
      : null;
    if (staticAgenda) {
      const match = (staticAgenda.attendees || []).find((a: any) =>
        a.securityCode && String(a.securityCode).trim() === cleanCode
      );
      if (match) {
        matchedUser = match;
      }
    }

    // 2. If not found by static code, verify live TOTP across agendas with secretGuid
    if (!matchedUser) {
      const totpAgendas = await Agenda.find({ 'attendees.secretGuid': { $exists: true, $ne: '' } })
        .sort({ updatedAt: -1 })
        .limit(100);

      for (const agenda of totpAgendas) {
        for (const att of (agenda.attendees || [])) {
          if (att.secretGuid && (verifyTotpCode(cleanCode, att.secretGuid, 300) || verifyTotpCode(cleanCode, att.secretGuid, 60))) {
            matchedUser = att;
            break;
          }
        }
        if (matchedUser) break;
      }
    }

    // 3. Fallback check across recent agendas
    if (!matchedUser) {
      const recentAgendas = await Agenda.find({ attendees: { $exists: true } })
        .sort({ updatedAt: -1 })
        .limit(100);

      for (const agenda of recentAgendas) {
        for (const att of (agenda.attendees || [])) {
          if (att.securityCode && String(att.securityCode).trim() === cleanCode) {
            matchedUser = att;
            break;
          }
          if (att.secretGuid && (verifyTotpCode(cleanCode, att.secretGuid, 300) || verifyTotpCode(cleanCode, att.secretGuid, 60))) {
            matchedUser = att;
            break;
          }
        }
        if (matchedUser) break;
      }
    }

    if (!matchedUser) {
      res.status(404).json({ message: 'Ungültiger Code oder kein passender Benutzer gefunden.' });
      return;
    }

    const userObj = {
      id: matchedUser.id || matchedUser._id?.toString(),
      _id: matchedUser._id?.toString() || matchedUser.id,
      name: matchedUser.name,
      email: matchedUser.email || '',
      avatarUrl: matchedUser.avatarUrl || '',
      securityCode: matchedUser.securityCode || '',
      secretGuid: matchedUser.secretGuid || '',
      isRegistered: true
    };

    res.json({ success: true, user: userObj });
  } catch (error) {
    console.error('Error POST /login-by-code:', error);
    res.status(500).json({ message: 'Serverfehler beim Login mit Code' });
  }
});

// Get global statistics for a user (agendas count & total items contributed)
router.get('/user-stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req.query.user as string || '').trim();
    const name = (req.query.name as string || '').trim();

    if (!user && !name) {
      res.json({ agendasCount: 0, totalItemsContributed: 0 });
      return;
    }

    const orConditions: any[] = [];
    if (user) {
      orConditions.push({ createdBy: user });
      orConditions.push({ 'attendees.id': user });
      if (mongoose.Types.ObjectId.isValid(user)) {
        orConditions.push({ 'attendees._id': new mongoose.Types.ObjectId(user) });
      }
    }
    if (name) {
      const safeName = escapeRegExp(name);
      orConditions.push({ createdBy: { $regex: new RegExp(`^${safeName}$`, 'i') } });
      orConditions.push({ 'attendees.name': { $regex: new RegExp(`^${safeName}$`, 'i') } });
    }

    const userAgendas = await Agenda.find({ $or: orConditions });
    const agendasCount = userAgendas.length;

    let totalItemsContributed = 0;
    const cleanUser = user.toLowerCase();
    const cleanName = name.toLowerCase();

    for (const ag of userAgendas) {
      for (const item of (ag.items || [])) {
        const itemCreatedBy = item.createdBy?.toLowerCase();
        const itemAuthor = item.author?.toLowerCase();

        if (
          (cleanUser && itemCreatedBy === cleanUser) ||
          (cleanName && (itemCreatedBy === cleanName || itemAuthor === cleanName))
        ) {
          totalItemsContributed++;
        }
      }
    }

    res.json({ agendasCount, totalItemsContributed });
  } catch (error) {
    console.error('Error GET /user-stats:', error);
    res.status(500).json({ message: 'Failed to fetch user stats' });
  }
});

// Get global achievements for a user across all agendas
router.get('/user-achievements', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req.query.user as string || '').trim();
    const name = (req.query.name as string || '').trim();

    if (!user && !name) {
      res.json(evaluateGlobalAchievements([], '', ''));
      return;
    }

    const orConditions: any[] = [];
    if (user) {
      orConditions.push({ createdBy: user });
      orConditions.push({ 'attendees.id': user });
      if (mongoose.Types.ObjectId.isValid(user)) {
        orConditions.push({ 'attendees._id': new mongoose.Types.ObjectId(user) });
      }
    }
    if (name) {
      const safeName = escapeRegExp(name);
      orConditions.push({ createdBy: { $regex: new RegExp(`^${safeName}$`, 'i') } });
      orConditions.push({ 'attendees.name': { $regex: new RegExp(`^${safeName}$`, 'i') } });
    }

    const userAgendas = await Agenda.find({ $or: orConditions });

    // Try to find attendee record to read profile preferences (cardColor, avatarUrl, pinnedAchievements)
    let foundAttendee: any = null;
    for (const ag of userAgendas) {
      for (const att of (ag.attendees || [])) {
        if (
          (user && (att.id === user || (att as any)._id?.toString() === user)) ||
          (name && att.name && att.name.toLowerCase() === name.toLowerCase())
        ) {
          foundAttendee = att;
          break;
        }
      }
      if (foundAttendee) break;
    }

    const userProfile = {
      cardColor: (req.query.cardColor as string) || foundAttendee?.cardColor,
      avatarUrl: (req.query.avatarUrl as string) || (req.query.hasAvatar === 'true' || req.query.hasAvatar === '1' ? 'has-avatar' : foundAttendee?.avatarUrl),
      securityCode: (req.query.securityCode as string) || foundAttendee?.securityCode,
      secretGuid: (req.query.secretGuid as string) || foundAttendee?.secretGuid,
      pinnedAchievements: foundAttendee?.pinnedAchievements || []
    };

    const result = evaluateGlobalAchievements(userAgendas, user, name, userProfile);
    res.json(result);
  } catch (error) {
    console.error('Error GET /user-achievements:', error);
    res.status(500).json({ message: 'Failed to evaluate user achievements' });
  }
});

// Bulk update user profile (name, email, avatarUrl, cardColor, pinnedAchievements) across all agendas
router.put('/user-profile', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, oldName, name, email, avatarUrl, cardColor, pinnedAchievements } = req.body;
    if (!userId && !oldName) {
      res.status(400).json({ message: 'User ID or oldName is required' });
      return;
    }

    const cleanUserId = (userId || '').trim();
    const cleanOldName = (oldName || '').trim();

    const orConditions: any[] = [];
    if (cleanUserId) {
      orConditions.push({ 'attendees.id': cleanUserId });
      if (mongoose.Types.ObjectId.isValid(cleanUserId)) {
        orConditions.push({ 'attendees._id': new mongoose.Types.ObjectId(cleanUserId) });
      }
    }
    if (cleanOldName) {
      const safeOldName = escapeRegExp(cleanOldName);
      orConditions.push({ 'attendees.name': { $regex: new RegExp(`^${safeOldName}$`, 'i') } });
    }

    const userAgendas = await Agenda.find({ $or: orConditions });

    for (const ag of userAgendas) {
      let modified = false;
      for (const att of (ag.attendees || [])) {
        const match = (cleanUserId && (att.id === cleanUserId || (att as any)._id?.toString() === cleanUserId)) ||
          (cleanOldName && att.name && att.name.trim().toLowerCase() === cleanOldName.toLowerCase());
        if (match) {
          if (name !== undefined) att.name = name;
          if (email !== undefined) att.email = email;
          if (avatarUrl !== undefined) att.avatarUrl = avatarUrl;
          if (cardColor !== undefined) att.cardColor = cardColor;
          if (pinnedAchievements !== undefined) att.pinnedAchievements = pinnedAchievements;
          modified = true;
        }
      }

      // Also update author in items if name changed
      if (modified && name && oldName && name !== oldName) {
        for (const item of (ag.items || [])) {
          if (item.author && item.author.trim().toLowerCase() === oldName.trim().toLowerCase()) {
            item.author = name;
          }
        }
      }

      if (modified) {
        await ag.save();
      }
    }

    res.json({ message: 'User profile updated across agendas' });
  } catch (error) {
    console.error('Error PUT /user-profile:', error);
    res.status(500).json({ message: 'Failed to update user profile' });
  }
});

// Get an agenda by ID
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid agenda ID format' });
      return;
    }
    const agenda = await Agenda.findById(id);
    if (!agenda) {
      res.status(404).json({ message: 'Agenda not found' });
      return;
    }
    // Legacy data: registered people without secrets get server-generated ones (saved once)
    if (fillMissingSecrets(agenda)) {
      try {
        await agenda.save();
      } catch (saveError) {
        console.error('Failed to store generated attendee secrets:', saveError);
      }
    }
    res.json(agenda);
  } catch (error) {
    console.error('Error GET /:id:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get audit logs for an agenda
router.get('/:id/audits', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid agenda ID format' });
      return;
    }
    const agenda = await Agenda.findById(id).select('auditLogs');
    if (!agenda) {
      res.status(404).json({ message: 'Agenda not found' });
      return;
    }
    const logs = (agenda.auditLogs || []).sort(
      (a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    res.json(logs);
  } catch (error) {
    console.error('Error GET /:id/audits:', error);
    res.status(500).json({ message: 'Failed to fetch audit logs' });
  }
});

// Get agenda-specific milestones, personal session achievements & dynamic leader trophies
router.get('/:id/achievements', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid agenda ID format' });
      return;
    }

    const agenda = await Agenda.findById(id);
    if (!agenda) {
      res.status(404).json({ message: 'Agenda not found' });
      return;
    }

    const user = (req.query.user as string || '').trim();
    const name = (req.query.name as string || '').trim();

    const result = evaluateAgendaAchievements(agenda, user, name);
    res.json(result);
  } catch (error) {
    console.error('Error GET /:id/achievements:', error);
    res.status(500).json({ message: 'Failed to evaluate agenda achievements' });
  }
});

// Create a new agenda
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const title = req.body?.title || 'Neue Agenda';
    const userName = req.body?.userName || req.body?.author || 'Ersteller';
    const newAgenda = new Agenda({
      title,
      attendees: req.body?.attendees || [],
      items: req.body?.items || [],
      createdBy: req.body?.createdBy || undefined,
      includeStandardItems: !!req.body?.includeStandardItems,
      auditLogs: [{
        action: 'Agenda erstellt',
        user: userName,
        details: `Agenda "${title}" wurde erstellt.`,
        timestamp: new Date()
      }]
    });
    if (req.body?.includeStandardItems) {
      applyStandardItems(newAgenda, true);
    }
    const savedAgenda = await newAgenda.save();
    res.status(201).json(savedAgenda);
  } catch (error) {
    console.error('Error POST /:', error);
    res.status(500).json({ message: 'Failed to create agenda' });
  }
});

// Update agenda details (title, date, location, time)
// PUT /api/agendas/:id/archive - archive or restore an agenda (creator or first attendee only).
// Sets the value explicitly so a retry never flips it back; also works on archived agendas.
router.put('/:id/archive', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid agenda ID format' });
      return;
    }
    const { archived, userId, userName } = req.body || {};
    if (typeof archived !== 'boolean') {
      res.status(400).json({ message: '"archived" muss true oder false sein.' });
      return;
    }

    const agenda = await Agenda.findById(id);
    if (!agenda) {
      res.status(404).json({ message: 'Agenda not found' });
      return;
    }

    if (!canManageAgenda(agenda, userId, userName)) {
      res.status(403).json({ message: 'Nur der Ersteller kann die Agenda archivieren oder wiederherstellen.' });
      return;
    }

    if (!!agenda.isArchived !== archived) {
      agenda.isArchived = archived;
      const actor = (typeof userName === 'string' && userName.trim()) || (typeof userId === 'string' ? userId : undefined);
      logAudit(
        agenda,
        archived ? 'AGENDA_ARCHIVED' : 'AGENDA_UNARCHIVED',
        actor,
        archived ? 'Agenda wurde archiviert' : 'Agenda wurde wiederhergestellt'
      );
      await agenda.save();
    }

    res.json(toAgendaSummary(agenda));
  } catch (err) {
    console.error('Failed to change archive status:', err);
    res.status(500).json({ message: 'Fehler beim Ändern des Archiv-Status' });
  }
});

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid agenda ID format' });
      return;
    }

    const existingAgenda = await Agenda.findById(id);
    if (!existingAgenda) {
      res.status(404).json({ message: 'Agenda not found' });
      return;
    }

    if (existingAgenda.isArchived) {
      res.status(403).json({ message: 'Diese Agenda ist archiviert und kann nicht mehr geändert werden.' });
      return;
    }

    // Validation: Only creator can change closeBeforeHours or isManuallyClosed
    const isClosingSettingUpdate =
      req.body.closeBeforeHours !== undefined ||
      req.body.isManuallyClosed !== undefined ||
      req.body.includeStandardItems !== undefined;
    if (isClosingSettingUpdate && existingAgenda.createdBy) {
      if (!canManageAgenda(existingAgenda, req.body.userId, req.body.userName)) {
        res.status(403).json({ message: 'Nur der Ersteller kann die Agenda schließen/öffnen oder die Einstellungen dafür ändern.' });
        return;
      }
    }

    // Set createdBy if not present and passed in request
    if (!existingAgenda.createdBy && req.body.createdBy) {
      existingAgenda.createdBy = req.body.createdBy;
    }

    // Validation: Check if adding new items after deadline
    if (req.body.items && Array.isArray(req.body.items)) {
      const hasNewItem = req.body.items.some((item: any) => !item._id);
      if (hasNewItem && isAgendaClosed(existingAgenda)) {
        res.status(403).json({ message: 'Agenda ist bereits geschlossen für neue Punkte' });
        return;
      }

      // Validation: Only item creator (or agenda creator) can delete an item
      const oldItems = existingAgenda.items || [];
      const newItems = req.body.items;
      const requestingUserId = req.body.userId;
      const requestingUserName = (req.body.userName || req.body.author || '').trim().toLowerCase();
      const agendaCreator = existingAgenda.createdBy;

      const isAgendaCreator =
        !agendaCreator ||
        (requestingUserId && requestingUserId === agendaCreator) ||
        (requestingUserName && requestingUserName === agendaCreator.trim().toLowerCase());

      if (!isAgendaCreator && newItems.length < oldItems.length) {
        const deletedItems = oldItems.filter(
          (oi: any) => !newItems.some((ni: any) => (ni._id && oi._id && ni._id.toString() === oi._id.toString()) || (ni.title === oi.title && ni.createdBy === oi.createdBy))
        );

        for (const deletedItem of deletedItems) {
          if (!deletedItem.createdBy && !deletedItem.author) continue;

          const isTransferredAccepted =
            deletedItem.transferredTo && deletedItem.transferredTo.status === 'accepted';

          const isTransferredRecipient =
            isTransferredAccepted &&
            ((requestingUserId && deletedItem.transferredTo?.toUserId === requestingUserId) ||
              (requestingUserName && deletedItem.transferredTo?.toUserName && deletedItem.transferredTo.toUserName.trim().toLowerCase() === requestingUserName));

          const isAuthorized = isTransferredAccepted
            ? isTransferredRecipient
            : ((requestingUserId && deletedItem.createdBy === requestingUserId) ||
              (requestingUserName && deletedItem.author && deletedItem.author.trim().toLowerCase() === requestingUserName) ||
              (requestingUserName && deletedItem.createdBy && deletedItem.createdBy.trim().toLowerCase() === requestingUserName));

          if (!isAuthorized) {
            res.status(403).json({ message: 'Nur der aktuelle Besitzer kann diesen Agendapunkt löschen.' });
            return;
          }
        }
      }
    }

    const userName = req.body.userName || req.body.author || 'Benutzer';
    const auditDetails: string[] = [];
    if (req.body.title !== undefined && req.body.title !== existingAgenda.title) {
      auditDetails.push(`Titel von "${existingAgenda.title}" zu "${req.body.title}" geändert`);
    }
    if (req.body.date !== undefined && req.body.date !== existingAgenda.date) {
      auditDetails.push(`Datum geändert`);
    }
    if (req.body.location !== undefined && JSON.stringify(req.body.location) !== JSON.stringify(existingAgenda.location)) {
      auditDetails.push(`Ort zu "${req.body.location?.name || 'kein Ort'}" geändert`);
    }
    if (req.body.isManuallyClosed !== undefined && req.body.isManuallyClosed !== existingAgenda.isManuallyClosed) {
      auditDetails.push(req.body.isManuallyClosed ? 'Agenda manuell geschlossen' : 'Agenda manuell wieder geöffnet');
    }

    const standardItemsChanged =
      req.body.includeStandardItems !== undefined &&
      !!req.body.includeStandardItems !== !!existingAgenda.includeStandardItems;
    if (standardItemsChanged) {
      auditDetails.push(req.body.includeStandardItems ? 'Standardpunkte aktiviert' : 'Standardpunkte deaktiviert');
    }

    if (auditDetails.length > 0) {
      logAudit(existingAgenda, 'Agenda aktualisiert', userName, auditDetails.join(', '));
    }

    // Audit log detection for items array updates via PUT /:id
    if (req.body.items && Array.isArray(req.body.items)) {
      const oldItems = existingAgenda.items || [];
      const newItems = req.body.items;

      if (newItems.length > oldItems.length) {
        const addedItems = newItems.filter(
          (ni: any) => !ni._id || !oldItems.some((oi: any) => oi._id.toString() === ni._id.toString())
        );
        for (const addedItem of addedItems) {
          const itemTitle = addedItem.title || 'Neuer Punkt';
          const itemAuthor = addedItem.author || userName;
          logAudit(existingAgenda, 'Agendapunkt erstellt', itemAuthor, `Agendapunkt "${itemTitle}" wurde hinzugefügt.`);
        }
      } else if (newItems.length < oldItems.length) {
        const deletedItems = oldItems.filter(
          (oi: any) => !newItems.some((ni: any) => ni._id && ni._id.toString() === oi._id.toString())
        );
        for (const deletedItem of deletedItems) {
          logAudit(existingAgenda, 'Agendapunkt gelöscht', userName, `Agendapunkt "${deletedItem.title}" wurde gelöscht.`);
        }
      } else {
        for (const ni of newItems) {
          if (!ni._id) continue;
          const oi = oldItems.find((item: any) => item._id.toString() === ni._id.toString());
          if (!oi) continue;

          if (ni.title !== undefined && ni.title !== oi.title) {
            logAudit(existingAgenda, 'Agendapunkt bearbeitet', userName, `Titel von "${oi.title}" zu "${ni.title}" geändert.`);
          }
          if (ni.description !== undefined && ni.description !== oi.description) {
            logAudit(existingAgenda, 'Agendapunkt bearbeitet', userName, `Beschreibung von "${oi.title}" geändert.`);
          }
          if (ni.imageUrl !== undefined && ni.imageUrl !== oi.imageUrl) {
            logAudit(existingAgenda, 'Agendapunkt bearbeitet', userName, `Bild von "${oi.title}" geändert.`);
          }
          if (ni.location !== undefined && JSON.stringify(ni.location) !== JSON.stringify(oi.location)) {
            logAudit(existingAgenda, 'Agendapunkt bearbeitet', userName, `Ort von "${oi.title}" geändert.`);
          }
          if (ni.completed !== undefined && ni.completed !== oi.completed) {
            logAudit(existingAgenda, 'Agendapunkt Status', userName, `Agendapunkt "${oi.title}" als ${ni.completed ? 'erledigt' : 'offen'} markiert.`);
          }
          if (ni.pinned !== undefined && ni.pinned !== oi.pinned) {
            logAudit(existingAgenda, 'Agendapunkt Anpinnen', userName, `Agendapunkt "${oi.title}" ${ni.pinned ? 'angeheftet' : 'gelöst'}.`);
          }
          if (ni.upvotes !== undefined && JSON.stringify(ni.upvotes) !== JSON.stringify(oi.upvotes)) {
            logAudit(existingAgenda, 'Agendapunkt Gelikt', userName, `Likes für Agendapunkt "${oi.title}" aktualisiert.`);
          }
          if (ni.poll !== undefined && JSON.stringify(ni.poll) !== JSON.stringify(oi.poll)) {
            logAudit(existingAgenda, 'Abstimmung', userName, `Abstimmung für "${oi.title}" aktualisiert.`);
          }
        }
      }
    }

    if (req.body.attendees && Array.isArray(req.body.attendees)) {
      const oldAttendees = existingAgenda.attendees || [];
      for (const na of req.body.attendees) {
        const oa = oldAttendees.find((a: any) => (a.id && a.id === na.id) || (a._id && a._id.toString() === (na._id || na.id)));
        if (oa && na.attendanceStatus && na.attendanceStatus !== oa.attendanceStatus) {
          const statusText = na.attendanceStatus === 'present' ? 'anwesend' : na.attendanceStatus === 'absent' ? 'abwesend' : 'unbestätigt';
          logAudit(existingAgenda, 'Anwesenheit geändert', userName, `Teilnehmer "${na.name}" als ${statusText} markiert.`);
        }
      }
    }

    // Prevent sort mode/order changes while live meeting is active (unless ending it)
    const isEndingMeeting = req.body.liveMeetingActive === false;
    if (existingAgenda.liveMeetingActive && !isEndingMeeting) {
      if ((req.body.sortMode !== undefined && req.body.sortMode !== existingAgenda.sortMode) ||
          (req.body.sortOrder !== undefined && req.body.sortOrder !== existingAgenda.sortOrder)) {
        res.status(400).json({ message: 'Sortierung ist während einer laufenden Sitzung gesperrt.' });
        return;
      }
      if (standardItemsChanged) {
        res.status(400).json({ message: 'Standardpunkte können während einer laufenden Sitzung nicht geändert werden.' });
        return;
      }
    }

    // Once a meeting is marked 'completed', it cannot be restarted or reverted
    if (existingAgenda.liveMeetingStatus === 'completed' && req.body.liveMeetingStatus && req.body.liveMeetingStatus !== 'completed') {
      res.status(400).json({ message: 'Eine bereits abgeschlossene Sitzung kann nicht erneut gestartet oder fortgesetzt werden.' });
      return;
    }

    // Snapshot before body fields are applied, so stored secrets survive client-sent attendee lists
    const previousAttendees = (existingAgenda.attendees || []).map((a: any) => (typeof a?.toObject === 'function' ? a.toObject() : a));

    const allowedFields = [
      'title', 'date', 'time', 'location', 'menuUrl', 'closeBeforeHours', 'isManuallyClosed',
      'items', 'attendees', 'createdBy', 'sortMode', 'sortOrder', 'auditLogs', 'includeStandardItems',
      'liveMeetingActive', 'liveMeetingStatus', 'liveMeetingElapsedSeconds',
      'liveMeetingPhase', 'liveMeetingCurrentItemIndex', 'liveMeetingCurrentAttendeeIndex',
      'liveMeetingPaused', 'liveMeetingCurrentItemElapsedSeconds',
      'liveMeetingStartedAt', 'liveMeetingItemStartedAt'
    ];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        (existingAgenda as any)[field] = req.body[field];
      }
    }
    if (Array.isArray(req.body.attendees)) {
      (existingAgenda as any).attendees = mergeAttendeeSecrets(previousAttendees, req.body.attendees);
    }
    // Explicitly mark array fields as modified so Mongoose persists all nested
    // changes (e.g. imageUrls inside AgendaItemSchema) to MongoDB.
    if (req.body.items !== undefined) existingAgenda.markModified('items');
    if (req.body.attendees !== undefined) existingAgenda.markModified('attendees');
    if (standardItemsChanged) applyStandardItems(existingAgenda, !!req.body.includeStandardItems);
    if (req.body.auditLogs !== undefined) existingAgenda.markModified('auditLogs');

    try {
      const updatedAgenda = await existingAgenda.save();
      broadcastAgendaEvent(id, 'agenda_updated', { agenda: updatedAgenda });
      res.json(updatedAgenda);
    } catch (saveError: any) {
      if (saveError && saveError.name === 'VersionError') {
        console.warn('Version error encountered, re-fetching agenda and retrying save...');
        const freshAgenda = await Agenda.findById(id);
        if (freshAgenda) {
          const freshPrevious = (freshAgenda.attendees || []).map((a: any) => (typeof a?.toObject === 'function' ? a.toObject() : a));
          for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
              (freshAgenda as any)[field] = req.body[field];
            }
          }
          if (Array.isArray(req.body.attendees)) {
            (freshAgenda as any).attendees = mergeAttendeeSecrets(freshPrevious, req.body.attendees);
          }
          if (req.body.items !== undefined) freshAgenda.markModified('items');
          if (req.body.includeStandardItems !== undefined) applyStandardItems(freshAgenda, !!req.body.includeStandardItems);
          if (req.body.attendees !== undefined) freshAgenda.markModified('attendees');
          if (req.body.auditLogs !== undefined) freshAgenda.markModified('auditLogs');
          const saved = await freshAgenda.save();
          broadcastAgendaEvent(id, 'agenda_updated', { agenda: saved });
          res.json(saved);
          return;
        }
      }
      throw saveError;
    }
  } catch (error) {
    console.error('Error PUT /:id:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add an attendee
router.post('/:id/attendees', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const agenda = await Agenda.findById(id);
    if (!agenda) {
      res.status(404).json({ message: 'Agenda not found' });
      return;
    }
    if (agenda.isArchived) {
      res.status(403).json({ message: 'Diese Agenda ist archiviert und schreibgeschützt.' });
      return;
    }
    const name = (req.body?.name || 'Unbekannt').trim();
    const customId = req.body?.id;
    const now = new Date();

    // Check if attendee with same name or id already exists
    const existingAttendee = (agenda.attendees || []).find((a: any) => {
      const aName = (a.name || '').trim().toLowerCase();
      const targetName = name.toLowerCase();
      const idMatch = customId && ((a.id && a.id === customId) || (a._id && a._id.toString() === customId));
      return (aName && aName === targetName) || idMatch;
    });

    if (existingAttendee) {
      existingAttendee.lastSeen = now;
      if (req.body?.avatarUrl) {
        existingAttendee.avatarUrl = req.body.avatarUrl;
      }
      // Secrets and registration of an existing person never change here (see /verify and /claim)
      agenda.markModified('attendees');
      logAudit(agenda, 'Person wieder beigetreten', name, `Teilnehmer "${name}" ist der Agenda erneut beigetreten.`);
      const savedAgenda = await agenda.save();
      broadcastAgendaEvent(id, 'agenda_updated', { agenda: savedAgenda });
      res.status(200).json(savedAgenda);
      return;
    }

    const newAttendee: any = {
      name,
      joinedAt: now,
      lastSeen: now
    };
    if (customId) {
      newAttendee.id = customId;
    }
    if (req.body?.avatarUrl) {
      newAttendee.avatarUrl = req.body.avatarUrl;
    }
    // Only a device registering itself may bring its own existing secrets (same person across agendas).
    // People added for someone else start unregistered; their secrets are created when they are claimed.
    if (req.body?.isRegistered === true) {
      const ownCode = typeof req.body.securityCode === 'string' ? req.body.securityCode.trim() : '';
      const ownGuid = typeof req.body.secretGuid === 'string' ? req.body.secretGuid.trim() : '';
      newAttendee.isRegistered = true;
      newAttendee.securityCode = /^\d{4}$/.test(ownCode) ? ownCode : generateSecurityCode();
      newAttendee.secretGuid = ownGuid || randomUUID();
    } else {
      newAttendee.isRegistered = false;
    }
    if (req.body?.email) {
      newAttendee.email = req.body.email;
    }
    if (req.body?.cardColor) {
      newAttendee.cardColor = req.body.cardColor;
    }
    agenda.attendees.push(newAttendee);
    agenda.markModified('attendees');
    logAudit(agenda, 'Person beigetreten', name, `Teilnehmer "${name}" ist der Agenda beigetreten.`);
    const savedAgenda = await agenda.save();
    broadcastAgendaEvent(id, 'agenda_updated', { agenda: savedAgenda });
    res.status(201).json(savedAgenda);
  } catch (error) {
    console.error('Error adding attendee:', error);
    res.status(500).json({ message: 'Failed to add attendee' });
  }
});

// Ping to update lastSeen for an attendee
// A device proves it is a registered person by sending that person's code; on success it gets their secrets.
router.post('/:id/attendees/:attendeeId/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const agenda = mongoose.Types.ObjectId.isValid(id) ? await Agenda.findById(id) : null;
    if (!agenda) {
      res.status(404).json({ message: 'Agenda not found' });
      return;
    }
    const attendee = findAttendeeByParam(agenda, req.params.attendeeId as string);
    if (!attendee) {
      res.status(404).json({ message: 'Person nicht gefunden' });
      return;
    }

    const key = `${id}:${attendee.id || attendee._id?.toString()}`;
    const now = Date.now();
    if (currentFailures(key, now) >= VERIFY_MAX_FAILURES) {
      res.status(429).json({ message: 'Zu viele Versuche. Bitte versuche es in 15 Minuten erneut.' });
      return;
    }

    if (!isCodeValidFor(attendee, req.body?.code)) {
      recordFailure(key, now);
      res.status(401).json({ message: 'Falscher Code' });
      return;
    }

    attendee.lastSeen = new Date();
    agenda.markModified('attendees');
    await agenda.save();
    res.json({ success: true, user: ownUserResponse(attendee) });
  } catch (error) {
    console.error('Error POST /:id/attendees/:attendeeId/verify:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// A device takes over a person who has not been registered on any device yet.
router.post('/:id/attendees/:attendeeId/claim', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const agenda = mongoose.Types.ObjectId.isValid(id) ? await Agenda.findById(id) : null;
    if (!agenda) {
      res.status(404).json({ message: 'Agenda not found' });
      return;
    }
    if (agenda.isArchived) {
      res.status(403).json({ message: 'Diese Agenda ist archiviert und schreibgeschützt.' });
      return;
    }
    const attendee = findAttendeeByParam(agenda, req.params.attendeeId as string);
    if (!attendee) {
      res.status(404).json({ message: 'Person nicht gefunden' });
      return;
    }
    if (attendee.isRegistered) {
      res.status(409).json({ message: 'Diese Person ist bereits registriert. Bitte gib ihren Code ein.' });
      return;
    }

    // A device may bring its own secrets so a person keeps one code across agendas
    const ownCode = typeof req.body?.securityCode === 'string' ? req.body.securityCode.trim() : '';
    const ownGuid = typeof req.body?.secretGuid === 'string' ? req.body.secretGuid.trim() : '';
    attendee.isRegistered = true;
    attendee.securityCode = /^\d{4}$/.test(ownCode) ? ownCode : (attendee.securityCode || generateSecurityCode());
    attendee.secretGuid = ownGuid || attendee.secretGuid || randomUUID();
    attendee.lastSeen = new Date();
    agenda.markModified('attendees');
    logAudit(agenda, 'Person übernommen', attendee.name, `Teilnehmer "${attendee.name}" wurde auf einem Gerät übernommen.`);
    const savedAgenda = await agenda.save();
    broadcastAgendaEvent(id, 'agenda_updated', { agenda: savedAgenda });
    res.json({ success: true, user: ownUserResponse(attendee) });
  } catch (error) {
    console.error('Error POST /:id/attendees/:attendeeId/claim:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id/attendees/:attendeeId/ping', async (req: Request, res: Response): Promise<void> => {
  try {
    const agenda = await Agenda.findById(req.params.id);
    if (!agenda) {
      res.status(404).json({ message: 'Agenda not found' });
      return;
    }
    const targetId = req.params.attendeeId;
    const attendee = agenda.attendees.find((a: any) =>
      (a._id && a._id.toString() === targetId) ||
      (a.id && a.id.toString() === targetId) ||
      (a.name && a.name === targetId)
    );
    if (!attendee) {
      res.status(404).json({ message: 'Attendee not found' });
      return;
    }
    attendee.lastSeen = new Date();
    await agenda.save();
    res.json({ message: 'lastSeen updated', lastSeen: attendee.lastSeen });
  } catch (error) {
    console.error('Error updating lastSeen:', error);
    res.status(500).json({ message: 'Failed to update lastSeen' });
  }
});

// Remove an attendee
router.delete('/:id/attendees/:attendeeId', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const attendeeId = req.params.attendeeId as string;
    const agenda = await Agenda.findById(id);
    if (!agenda) {
      res.status(404).json({ message: 'Agenda not found' });
      return;
    }
    if (agenda.isArchived) {
      res.status(403).json({ message: 'Diese Agenda ist archiviert und schreibgeschützt.' });
      return;
    }

    const index = (agenda.attendees || []).findIndex(
      (a: any) =>
        (a._id && a._id.toString() === attendeeId) ||
        (a.id && a.id.toString() === attendeeId) ||
        (a.name && a.name.trim().toLowerCase() === attendeeId.trim().toLowerCase())
    );

    if (index === -1) {
      res.status(404).json({ message: 'Teilnehmer nicht gefunden.' });
      return;
    }

    const removed = agenda.attendees.splice(index, 1)[0];
    agenda.markModified('attendees');
    logAudit(agenda, 'Teilnehmer entfernt', req.body?.user || 'System', `Teilnehmer "${removed.name}" wurde aus der Agenda entfernt.`);

    const saved = await agenda.save();
    broadcastAgendaEvent(id, 'agenda_updated', { agenda: saved });
    res.json(saved);
  } catch (error) {
    console.error('Error deleting attendee:', error);
    res.status(500).json({ message: 'Failed to delete attendee' });
  }
});

// Add an agenda item
router.post('/:id/items', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const agenda = await Agenda.findById(id);
    if (!agenda) {
      res.status(404).json({ message: 'Agenda not found' });
      return;
    }

    if (agenda.isArchived) {
      res.status(403).json({ message: 'Diese Agenda ist archiviert und schreibgeschützt.' });
      return;
    }

    // Check deadline
    if (isAgendaClosed(agenda)) {
      res.status(403).json({ message: 'Agenda ist bereits geschlossen für neue Punkte' });
      return;
    }

    if (req.body?.imageUrl && !isSafeImageUrl(req.body.imageUrl)) {
      res.status(400).json({ message: 'Ungültiges oder unsicheres Bild-URL-Format' });
      return;
    }

    const itemTitle = req.body?.title || 'Neuer Punkt';
    const authorName = req.body?.author || req.body?.userName || 'Benutzer';

    agenda.items.push({
      title: itemTitle,
      description: req.body?.description,
      createdBy: req.body?.createdBy,
      author: authorName,
      imageUrl: req.body?.imageUrl,
      completed: req.body?.completed || false,
      pinned: req.body?.pinned || false,
      location: req.body?.location || undefined
    });

    logAudit(agenda, 'Agendapunkt erstellt', authorName, `Agendapunkt "${itemTitle}" wurde hinzugefügt.`);
    const savedAgenda = await agenda.save();
    broadcastAgendaEvent(id, 'agenda_updated', { agenda: savedAgenda });
    res.status(201).json(savedAgenda);
  } catch (error) {
    res.status(500).json({ message: 'Failed to add item' });
  }
});

// Update an agenda item
router.put('/:id/items/:itemId', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const agenda = await Agenda.findById(id);
    if (!agenda) {
      res.status(404).json({ message: 'Agenda not found' });
      return;
    }
    if (agenda.isArchived) {
      res.status(403).json({ message: 'Diese Agenda ist archiviert und schreibgeschützt.' });
      return;
    }
    const item = agenda.items.find((i: any) => i._id.toString() === req.params.itemId);
    if (!item) {
      res.status(404).json({ message: 'Item not found' });
      return;
    }

    if (req.body?.imageUrl !== undefined) {
      if (!isSafeImageUrl(req.body.imageUrl)) {
        res.status(400).json({ message: 'Ungültiges oder unsicheres Bild-URL-Format' });
        return;
      }
      item.imageUrl = req.body.imageUrl;
    }

    const userName = req.body?.userName || req.body?.author || 'Benutzer';

    if (req.body?.title !== undefined && req.body.title !== item.title) {
      logAudit(agenda, 'Agendapunkt bearbeitet', userName, `Titel von "${item.title}" zu "${req.body.title}" geändert.`);
    }
    if (req.body?.description !== undefined && req.body.description !== item.description) {
      logAudit(agenda, 'Agendapunkt bearbeitet', userName, `Beschreibung von "${item.title}" geändert.`);
    }
    if (req.body?.imageUrl !== undefined && req.body.imageUrl !== item.imageUrl) {
      logAudit(agenda, 'Agendapunkt bearbeitet', userName, `Bild von "${item.title}" geändert.`);
    }
    if (req.body?.location !== undefined && JSON.stringify(req.body.location) !== JSON.stringify(item.location)) {
      logAudit(agenda, 'Agendapunkt bearbeitet', userName, `Ort von "${item.title}" geändert.`);
    }
    if (req.body?.completed !== undefined && req.body.completed !== item.completed) {
      logAudit(agenda, 'Agendapunkt Status', userName, `Agendapunkt "${item.title}" als ${req.body.completed ? 'erledigt' : 'offen'} markiert.`);
    }
    if (req.body?.pinned !== undefined && req.body.pinned !== item.pinned) {
      logAudit(agenda, 'Agendapunkt Anpinnen', userName, `Agendapunkt "${item.title}" ${req.body.pinned ? 'angeheftet' : 'lösgelöst'}.`);
    }
    if (req.body?.upvotes !== undefined) {
      logAudit(agenda, 'Agendapunkt Gelikt', userName, `Likes für Agendapunkt "${item.title}" aktualisiert.`);
    }
    if (req.body?.poll !== undefined && JSON.stringify(req.body.poll) !== JSON.stringify(item.poll)) {
      logAudit(agenda, 'Abstimmung', userName, `Abstimmung für "${item.title}" aktualisiert.`);
    }
    if (req.body?.transferredTo !== undefined) {
      const oldTransfer = item.transferredTo;
      const newTransfer = req.body.transferredTo;
      if (newTransfer === null) {
        logAudit(agenda, 'Übertragung abgebrochen', userName, `Übertragung für "${item.title}" wurde zurückgezogen.`);
        item.transferredTo = undefined;
      } else {
        if (!oldTransfer || oldTransfer.status !== newTransfer.status) {
          if (newTransfer.status === 'pending') {
            logAudit(agenda, 'Agendapunkt übertragen', userName, `Agendapunkt "${item.title}" an ${newTransfer.toUserName} übertragen.`);
          } else if (newTransfer.status === 'accepted') {
            logAudit(agenda, 'Übertragung angenommen', userName, `Übernahme von Agendapunkt "${item.title}" bestätigt.`);
          } else if (newTransfer.status === 'rejected') {
            logAudit(agenda, 'Übertragung abgelehnt', userName, `Übernahme von Agendapunkt "${item.title}" abgelehnt.`);
          }
        }
        item.transferredTo = newTransfer;
      }
    }

    if (req.body?.title !== undefined) item.title = req.body.title;
    if (req.body?.description !== undefined) item.description = req.body.description;
    if (req.body?.createdBy !== undefined) item.createdBy = req.body.createdBy;
    if (req.body?.author !== undefined) item.author = req.body.author;
    if (req.body?.completed !== undefined) item.completed = req.body.completed;
    if (req.body?.pinned !== undefined) item.pinned = req.body.pinned;
    if (req.body?.location !== undefined) item.location = req.body.location;
    if (req.body?.upvotes !== undefined) item.upvotes = req.body.upvotes;
    if (req.body?.poll !== undefined) item.poll = req.body.poll;
    if (req.body?.durationSeconds !== undefined) item.durationSeconds = req.body.durationSeconds;

    const savedAgenda = await agenda.save();
    broadcastAgendaEvent(id, 'agenda_updated', { agenda: savedAgenda });
    res.json(savedAgenda);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update item' });
  }
});

// Delete an agenda item
router.delete('/:id/items/:itemId', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const agenda = await Agenda.findById(id);
    if (!agenda) {
      res.status(404).json({ message: 'Agenda not found' });
      return;
    }
    if (agenda.isArchived) {
      res.status(403).json({ message: 'Diese Agenda ist archiviert und schreibgeschützt.' });
      return;
    }
    const itemToDelete = agenda.items.find((i: any) => i._id.toString() === req.params.itemId);
    const itemTitle = itemToDelete ? itemToDelete.title : 'Unbekannter Punkt';
    const userName = (req.body && req.body.userName) || (req.query && req.query.userName as string) || 'Benutzer';

    if (itemToDelete) {
      const requestingUserId = (req.body && req.body.userId) || (req.query && req.query.userId as string);
      const requestingUserName = ((req.body && req.body.userName) || (req.query && req.query.userName as string) || '').trim().toLowerCase();
      const agendaCreator = agenda.createdBy;

      const isAgendaCreator =
        !agendaCreator ||
        (requestingUserId && requestingUserId === agendaCreator) ||
        (requestingUserName && requestingUserName === agendaCreator.trim().toLowerCase());

      const isTransferredAccepted =
        itemToDelete.transferredTo && itemToDelete.transferredTo.status === 'accepted';

      const isTransferredRecipient =
        isTransferredAccepted &&
        ((requestingUserId && itemToDelete.transferredTo?.toUserId === requestingUserId) ||
          (requestingUserName && itemToDelete.transferredTo?.toUserName && itemToDelete.transferredTo.toUserName.trim().toLowerCase() === requestingUserName));

      const isAuthorized =
        isAgendaCreator ||
        (isTransferredAccepted
          ? isTransferredRecipient
          : ((requestingUserId && itemToDelete.createdBy === requestingUserId) ||
            (requestingUserName && itemToDelete.author && itemToDelete.author.trim().toLowerCase() === requestingUserName) ||
            (requestingUserName && itemToDelete.createdBy && itemToDelete.createdBy.trim().toLowerCase() === requestingUserName)));

      if (!isAuthorized) {
        res.status(403).json({ message: 'Nur der aktuelle Besitzer kann diesen Agendapunkt löschen.' });
        return;
      }
    }

    agenda.items = agenda.items.filter((i: any) => i._id.toString() !== req.params.itemId);
    logAudit(agenda, 'Agendapunkt gelöscht', userName, `Agendapunkt "${itemTitle}" wurde gelöscht.`);

    const savedAgenda = await agenda.save();
    broadcastAgendaEvent(id, 'agenda_updated', { agenda: savedAgenda });
    res.json(savedAgenda);
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete item' });
  }
});

export default router;
