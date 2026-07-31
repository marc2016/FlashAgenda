import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import Agenda from '../models/Agenda';
import AdminSetting from '../models/AdminSetting';

const router = Router();

// Generate a simple secret token for the admin session
const getAdminSecret = () => process.env.ADMIN_JWT_SECRET || 'flashagenda_admin_secret_key_2026';

// Helper to hash password
const hashPassword = (password: string) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

// Helper to get current active admin password (from DB setting or ENV default)
export const getActiveAdminPassword = async (): Promise<string> => {
  try {
    const setting = await AdminSetting.findOne({ key: 'admin_password' });
    if (setting && setting.value) {
      return setting.value;
    }
  } catch (err) {
    console.error('Error fetching admin password setting:', err);
  }
  return process.env.ADMIN_PASSWORD || 'admin123';
};

// Admin authentication middleware
export const requireAdminAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Admin-Authentifizierung erforderlich' });
    }
    const token = authHeader.split(' ')[1];
    const currentPassword = await getActiveAdminPassword();
    const expectedToken = crypto.createHmac('sha256', getAdminSecret()).update(currentPassword).digest('hex');

    if (token !== expectedToken) {
      return res.status(403).json({ message: 'Ungültiges Admin-Token oder Passwort' });
    }
    next();
  } catch (err) {
    return res.status(500).json({ message: 'Authentifizierungsfehler', error: err });
  }
};

// POST /api/admin/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ message: 'Passwort ist erforderlich' });
    }

    const currentPassword = await getActiveAdminPassword();
    if (password !== currentPassword) {
      return res.status(401).json({ message: 'Falsches Admin-Passwort' });
    }

    const token = crypto.createHmac('sha256', getAdminSecret()).update(currentPassword).digest('hex');
    return res.json({ token, message: 'Erfolgreich als Admin angemeldet' });
  } catch (err) {
    return res.status(500).json({ message: 'Fehler beim Admin-Login', error: err });
  }
});

// POST /api/admin/change-password
router.post('/change-password', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!newPassword || newPassword.trim().length < 4) {
      return res.status(400).json({ message: 'Neues Passwort muss mindestens 4 Zeichen lang sein' });
    }

    const currentPassword = await getActiveAdminPassword();
    if (oldPassword !== currentPassword) {
      return res.status(400).json({ message: 'Das aktuelle Admin-Passwort ist falsch' });
    }

    await AdminSetting.findOneAndUpdate(
      { key: 'admin_password' },
      { value: newPassword.trim() },
      { upsert: true, new: true }
    );

    const newToken = crypto.createHmac('sha256', getAdminSecret()).update(newPassword.trim()).digest('hex');
    return res.json({ token: newToken, message: 'Admin-Passwort erfolgreich geändert' });
  } catch (err) {
    return res.status(500).json({ message: 'Fehler beim Ändern des Passworts', error: err });
  }
});

// GET /api/admin/agendas - Get all agendas with details
router.get('/agendas', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const agendas = await Agenda.find().sort({ createdAt: -1 });
    return res.json(agendas);
  } catch (err) {
    return res.status(500).json({ message: 'Fehler beim Laden der Agenden', error: err });
  }
});

// PUT /api/admin/agendas/:id/archive - Toggle archived status
router.put('/agendas/:id/archive', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const agenda = await Agenda.findById(id);
    if (!agenda) {
      return res.status(404).json({ message: 'Agenda nicht gefunden' });
    }

    agenda.isArchived = !agenda.isArchived;
    agenda.auditLogs.push({
      action: agenda.isArchived ? 'AGENDA_ARCHIVED' : 'AGENDA_UNARCHIVED',
      user: 'Admin',
      details: agenda.isArchived ? 'Agenda wurde vom Administrator archiviert' : 'Agenda wurde vom Administrator wiederaktiviert',
      timestamp: new Date()
    } as any);

    await agenda.save();
    return res.json(agenda);
  } catch (err) {
    return res.status(500).json({ message: 'Fehler beim Ändern des Archiv-Status', error: err });
  }
});

// DELETE /api/admin/agendas/:id - Permanently delete an agenda
router.delete('/agendas/:id', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await Agenda.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Agenda nicht gefunden' });
    }
    return res.json({ message: 'Agenda erfolgreich gelöscht', id });
  } catch (err) {
    return res.status(500).json({ message: 'Fehler beim Löschen der Agenda', error: err });
  }
});

export default router;
