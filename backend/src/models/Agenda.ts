import mongoose, { Schema, Document } from 'mongoose';

export interface IAttendee {
  _id?: string;
  id?: string;
  name: string;
  avatarUrl?: string;
  email?: string;
  securityCode?: string;
  secretGuid?: string;
  isRegistered?: boolean;
  joinedAt?: Date;
  lastSeen?: Date;
}

export interface ILocation {
  name: string;
  lat: number;
  lng: number;
}

export interface IPollOption {
  id: string;
  text: string;
  votes: string[];
}

export interface IPoll {
  question?: string;
  options: IPollOption[];
  allowMultiple?: boolean;
}

export interface IAgendaItem {
  _id?: string;
  title: string;
  description?: string;
  createdBy?: string; // Attendee ID
  author?: string; // Attendee Name
  imageUrl?: string;
  completed?: boolean;
  upvotes?: string[];
  pinned?: boolean;
  location?: ILocation;
  poll?: IPoll;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface IAuditLog {
  _id?: string;
  action: string;
  user?: string;
  details?: string;
  timestamp: Date;
}

export interface IAgenda extends Document {
  title: string;
  date?: string;
  time?: string;
  location?: ILocation;
  menuUrl?: string;
  closeBeforeHours?: number;
  isManuallyClosed?: boolean;
  isArchived?: boolean;
  createdBy?: string;
  sortMode?: 'date' | 'rating' | 'random';
  sortOrder?: 'asc' | 'desc';
  attendees: IAttendee[];
  items: IAgendaItem[];
  auditLogs: IAuditLog[];
}

const AuditLogSchema = new Schema<IAuditLog>({
  action: { type: String, required: true },
  user: { type: String },
  details: { type: String },
  timestamp: { type: Date, default: Date.now }
});

const AttendeeSchema = new Schema<IAttendee>({
  id: { type: String },
  name: { type: String, required: true },
  avatarUrl: { type: String },
  email: { type: String },
  securityCode: { type: String },
  secretGuid: { type: String },
  isRegistered: { type: Boolean, default: false },
  joinedAt: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: Date.now }
});

const LocationSchema = new Schema<ILocation>({
  name: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true }
});

const PollOptionSchema = new Schema<IPollOption>({
  id: { type: String, required: true },
  text: { type: String, required: true },
  votes: { type: [String], default: [] }
});

const PollSchema = new Schema<IPoll>({
  question: { type: String },
  options: [PollOptionSchema],
  allowMultiple: { type: Boolean, default: false }
});

const AgendaItemSchema = new Schema<IAgendaItem>({
  title: { type: String, required: true },
  description: { type: String },
  createdBy: { type: String },
  author: { type: String },
  imageUrl: { type: String },
  completed: { type: Boolean, default: false },
  upvotes: { type: [String], default: [] },
  pinned: { type: Boolean, default: false },
  location: { type: LocationSchema },
  poll: { type: PollSchema },
  createdAt: { type: Date },
  updatedAt: { type: Date }
});

const AgendaSchema = new Schema<IAgenda>({
  title: { type: String, required: true },
  date: { type: String },
  time: { type: String },
  location: { type: LocationSchema },
  menuUrl: { type: String },
  closeBeforeHours: { type: Number, default: 12 },
  isManuallyClosed: { type: Boolean },
  isArchived: { type: Boolean, default: false },
  createdBy: { type: String },
  sortMode: { type: String, enum: ['date', 'rating', 'random'], default: 'date' },
  sortOrder: { type: String, enum: ['asc', 'desc'], default: 'asc' },
  attendees: [AttendeeSchema],
  items: [AgendaItemSchema],
  auditLogs: [AuditLogSchema]
}, { timestamps: true, versionKey: false });

export default mongoose.model<IAgenda>('Agenda', AgendaSchema);
