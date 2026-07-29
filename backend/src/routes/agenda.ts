import express, { Request, Response, Router } from 'express';
import mongoose from 'mongoose';
import Agenda from '../models/Agenda';

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

// Helper to validate and sanitize image URLs / Data URIs against XSS (e.g. javascript: or data:text/html)
function isSafeImageUrl(url: any): boolean {
  if (!url || typeof url !== 'string') return true;
  const trimmed = url.trim();
  if (trimmed === '') return true;
  const isHttp = /^https?:\/\//i.test(trimmed);
  const isSafeDataUri = /^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,/i.test(trimmed);
  return isHttp || isSafeDataUri;
}

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

    // Validation: Only creator can change closeBeforeHours or isManuallyClosed
    const isClosingSettingUpdate = req.body.closeBeforeHours !== undefined || req.body.isManuallyClosed !== undefined;
    if (isClosingSettingUpdate && existingAgenda.createdBy) {
      const requestingUser = req.body.userId;
      if (!requestingUser || requestingUser !== existingAgenda.createdBy) {
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
      if (hasNewItem) {
        let isClosed = !!existingAgenda.isManuallyClosed;
        if (!isClosed && existingAgenda.date) {
          const agendaDate = new Date(existingAgenda.date).getTime();
          const offsetMs = (existingAgenda.closeBeforeHours ?? 12) * 60 * 60 * 1000;
          if (Date.now() > agendaDate - offsetMs) {
            isClosed = true;
          }
        }
        if (isClosed) {
           res.status(403).json({ message: 'Agenda ist bereits geschlossen für neue Punkte' });
           return;
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
        }
      }
    }

    const allowedFields = ['title', 'date', 'time', 'location', 'menuUrl', 'closeBeforeHours', 'isManuallyClosed', 'items', 'attendees', 'createdBy'];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        (existingAgenda as any)[field] = req.body[field];
      }
    }

    try {
      const updatedAgenda = await existingAgenda.save();
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
          const saved = await freshAgenda.save();
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
    const agenda = await Agenda.findById(req.params.id);
    if (!agenda) {
      res.status(404).json({ message: 'Agenda not found' });
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
    const agenda = await Agenda.findById(req.params.id);
    if (!agenda) {
      res.status(404).json({ message: 'Agenda not found' });
      return;
    }
    
    // Check deadline
    let isClosed = !!agenda.isManuallyClosed;
    if (!isClosed && agenda.date) {
      const agendaDate = new Date(agenda.date).getTime();
      const offsetMs = (agenda.closeBeforeHours ?? 12) * 60 * 60 * 1000;
      if (Date.now() > agendaDate - offsetMs) {
        isClosed = true;
      }
    }
    
    if (isClosed) {
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
    res.status(201).json(savedAgenda);
  } catch (error) {
    res.status(500).json({ message: 'Failed to add item' });
  }
});

// Update an agenda item
router.put('/:id/items/:itemId', async (req: Request, res: Response): Promise<void> => {
  try {
    const agenda = await Agenda.findById(req.params.id);
    if (!agenda) {
      res.status(404).json({ message: 'Agenda not found' });
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

    if (req.body?.title !== undefined) item.title = req.body.title;
    if (req.body?.description !== undefined) item.description = req.body.description;
    if (req.body?.createdBy !== undefined) item.createdBy = req.body.createdBy;
    if (req.body?.author !== undefined) item.author = req.body.author;
    if (req.body?.completed !== undefined) item.completed = req.body.completed;
    if (req.body?.pinned !== undefined) item.pinned = req.body.pinned;
    if (req.body?.location !== undefined) item.location = req.body.location;
    if (req.body?.upvotes !== undefined) item.upvotes = req.body.upvotes;
    
    const savedAgenda = await agenda.save();
    res.json(savedAgenda);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update item' });
  }
});

// Delete an agenda item
router.delete('/:id/items/:itemId', async (req: Request, res: Response): Promise<void> => {
  try {
    const agenda = await Agenda.findById(req.params.id);
    if (!agenda) {
      res.status(404).json({ message: 'Agenda not found' });
      return;
    }
    const itemToDelete = agenda.items.find((i: any) => i._id.toString() === req.params.itemId);
    const itemTitle = itemToDelete ? itemToDelete.title : 'Unbekannter Punkt';
    const userName = (req.body && req.body.userName) || (req.query && req.query.userName as string) || 'Benutzer';

    agenda.items = agenda.items.filter((i: any) => i._id.toString() !== req.params.itemId);
    logAudit(agenda, 'Agendapunkt gelöscht', userName, `Agendapunkt "${itemTitle}" wurde gelöscht.`);

    const savedAgenda = await agenda.save();
    res.json(savedAgenda);
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete item' });
  }
});

export default router;
