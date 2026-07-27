import mongoose, { Schema, Document } from 'mongoose';

export interface IAttendee {
  _id?: string;
  id?: string;
  name: string;
  avatarUrl?: string;
  joinedAt?: Date;
  lastSeen?: Date;
}

export interface ILocation {
  name: string;
  lat: number;
  lng: number;
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
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface IAgenda extends Document {
  title: string;
  date?: string;
  time?: string;
  location?: ILocation;
  menuUrl?: string;
  closeBeforeHours?: number;
  isManuallyClosed?: boolean;
  createdBy?: string;
  attendees: IAttendee[];
  items: IAgendaItem[];
}

const AttendeeSchema = new Schema<IAttendee>({
  id: { type: String },
  name: { type: String, required: true },
  avatarUrl: { type: String },
  joinedAt: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: Date.now }
});

const LocationSchema = new Schema<ILocation>({
  name: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true }
});

const AgendaItemSchema = new Schema<IAgendaItem>({
  title: { type: String, required: true },
  description: { type: String },
  createdBy: { type: String },
  author: { type: String },
  imageUrl: { type: String },
  completed: { type: Boolean, default: false },
  upvotes: { type: [String], default: [] },
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
  isManuallyClosed: { type: Boolean, default: false },
  createdBy: { type: String },
  attendees: [AttendeeSchema],
  items: [AgendaItemSchema]
}, { timestamps: true });

export default mongoose.model<IAgenda>('Agenda', AgendaSchema);
