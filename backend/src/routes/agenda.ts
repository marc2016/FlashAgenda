import express, { Request, Response, Router } from 'express';
import Agenda from '../models/Agenda';

const router: Router = express.Router();

// Get an agenda by ID
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const agenda = await Agenda.findById(req.params.id);
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
      title: req.body?.title || 'Neue Agenda'
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
    const updatedAgenda = await Agenda.findByIdAndUpdate(
      req.params.id,
      { $set: req.body || {} },
      { new: true }
    );
    if (!updatedAgenda) {
      res.status(404).json({ message: 'Agenda not found' });
      return;
    }
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
    agenda.attendees.push({ name: req.body?.name || 'Unbekannt' });
    const savedAgenda = await agenda.save();
    res.status(201).json(savedAgenda);
  } catch (error) {
    res.status(500).json({ message: 'Failed to add attendee' });
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
    agenda.items.push({
      title: req.body?.title,
      description: req.body?.description,
      createdBy: req.body?.createdBy
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
    
    if (req.body?.title !== undefined) item.title = req.body.title;
    if (req.body?.description !== undefined) item.description = req.body.description;
    
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
