import express, { Request, Response, Router } from 'express';
import mongoose from 'mongoose';
import Agenda from '../models/Agenda';

const router: Router = express.Router();

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

// Create a new agenda
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const newAgenda = new Agenda({
      title: req.body?.title || 'Neue Agenda',
      attendees: req.body?.attendees || [],
      items: req.body?.items || [],
      createdBy: req.body?.createdBy || undefined
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

    const allowedFields = ['title', 'date', 'time', 'location', 'menuUrl', 'closeBeforeHours', 'isManuallyClosed', 'items', 'attendees', 'createdBy'];
    const sanitizedUpdates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        sanitizedUpdates[field] = req.body[field];
      }
    }

    const updatedAgenda = await Agenda.findByIdAndUpdate(
      id,
      { $set: sanitizedUpdates },
      { new: true }
    );
    res.json(updatedAgenda);
  } catch (error) {
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

    agenda.items.push({
      title: req.body?.title,
      description: req.body?.description,
      createdBy: req.body?.createdBy,
      author: req.body?.author || req.body?.createdBy,
      imageUrl: req.body?.imageUrl,
      completed: req.body?.completed || false,
      pinned: req.body?.pinned || false,
      location: req.body?.location || undefined
    });
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

    if (req.body?.title !== undefined) item.title = req.body.title;
    if (req.body?.description !== undefined) item.description = req.body.description;
    if (req.body?.createdBy !== undefined) item.createdBy = req.body.createdBy;
    if (req.body?.author !== undefined) item.author = req.body.author;
    if (req.body?.completed !== undefined) item.completed = req.body.completed;
    if (req.body?.pinned !== undefined) item.pinned = req.body.pinned;
    if (req.body?.location !== undefined) item.location = req.body.location;
    
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
    agenda.items = agenda.items.filter((i: any) => i._id.toString() !== req.params.itemId);
    const savedAgenda = await agenda.save();
    res.json(savedAgenda);
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete item' });
  }
});

export default router;
