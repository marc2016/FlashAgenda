import express, { Request, Response, Router } from 'express';
import mongoose from 'mongoose';
import Agenda from '../models/Agenda';
import { broadcastAgendaEvent } from '../services/socketService';
import { verifyTotpCode } from '../services/totpService';

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

export function isAgendaClosed(agenda: { isManuallyClosed?: boolean; date?: string; closeBeforeHours?: number }): boolean {
  if (agenda.isManuallyClosed === true) return true;
  if (agenda.date) {
    const agendaDate = new Date(agenda.date).getTime();
    if (!isNaN(agendaDate)) {
      const offsetMs = (agenda.closeBeforeHours ?? 12) * 60 * 60 * 1000;
      if (Date.now() > (agendaDate - offsetMs)) {
        return true;
      }
    }
  }
  if (agenda.isManuallyClosed === false) return false;
  return false;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

    res.json(candidateAgendas);
  } catch (error) {
    console.error('Error GET /user-agendas:', error);
    res.status(500).json({ message: 'Failed to fetch user agendas' });
  }
});

// Login user by 4-digit code (securityCode or live TOTP)
router.post('/login-by-code', async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.body;
    const cleanCode = (code || '').toString().trim();

    if (!cleanCode) {
      res.status(400).json({ message: 'Code ist erforderlich' });
      return;
    }

    const query: any = { attendees: { $exists: true } };

    const agendas = await Agenda.find(query).sort({ updatedAt: -1 }).limit(50);

    let matchedUser: any = null;

    for (const agenda of agendas) {
      for (const att of (agenda.attendees || [])) {
        // 1. Verify static securityCode
        if (att.securityCode && att.securityCode.toString().trim() === cleanCode) {
          matchedUser = att;
          break;
        }

        // 2. Verify live TOTP secretGuid
        if (att.secretGuid && verifyTotpCode(cleanCode, att.secretGuid)) {
          matchedUser = att;
          break;
        }
      }
      if (matchedUser) break;
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

// Bulk update user profile (name, email, avatarUrl, cardColor) across all agendas
router.put('/user-profile', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, oldName, name, email, avatarUrl, cardColor } = req.body;
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
      auditLogs: [{
        action: 'Agenda erstellt',
        user: userName,
        details: `Agenda "${title}" wurde erstellt.`,
        timestamp: new Date()
      }]
    });
    const savedAgenda = await newAgenda.save();
    res.status(201).json(savedAgenda);
  } catch (error) {
    console.error('Error POST /:', error);
    res.status(500).json({ message: 'Failed to create agenda' });
  }
});

// Update agenda details (title, date, location, time)
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
    const isClosingSettingUpdate = req.body.closeBeforeHours !== undefined || req.body.isManuallyClosed !== undefined;
    if (isClosingSettingUpdate && existingAgenda.createdBy) {
      const requestingUserId = req.body.userId;
      const requestingUserName = req.body.userName;
      const createdBy = existingAgenda.createdBy;
      const firstAttendee = existingAgenda.attendees?.[0];

      const isMatch = (
        (requestingUserId && (requestingUserId === createdBy || (firstAttendee && (requestingUserId === firstAttendee.id || requestingUserId === (firstAttendee as any)._id?.toString())))) ||
        (requestingUserName && (requestingUserName.trim().toLowerCase() === createdBy.trim().toLowerCase() || (firstAttendee && requestingUserName.trim().toLowerCase() === firstAttendee.name.trim().toLowerCase())))
      );

      if (!isMatch) {
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

    const allowedFields = ['title', 'date', 'time', 'location', 'menuUrl', 'closeBeforeHours', 'isManuallyClosed', 'items', 'attendees', 'createdBy', 'sortMode', 'sortOrder', 'auditLogs'];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        (existingAgenda as any)[field] = req.body[field];
      }
    }
    // Explicitly mark array fields as modified so Mongoose persists all nested
    // changes (e.g. imageUrls inside AgendaItemSchema) to MongoDB.
    if (req.body.items !== undefined) existingAgenda.markModified('items');
    if (req.body.attendees !== undefined) existingAgenda.markModified('attendees');
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
          for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
              (freshAgenda as any)[field] = req.body[field];
            }
          }
          if (req.body.items !== undefined) freshAgenda.markModified('items');
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
    const name = req.body?.name || 'Unbekannt';
    const customId = req.body?.id;
    const now = new Date();
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
    agenda.attendees.push(newAttendee);
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
