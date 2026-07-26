import mongoose, { Schema, Document } from 'mongoose';

export interface IAttendee {
  _id?: string;
  name: string;
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
}

export interface IAgenda extends Document {
  title: string;
  date?: string;
  time?: string;
  location?: ILocation;
  attendees: IAttendee[];
  items: IAgendaItem[];
}

const AttendeeSchema = new Schema<IAttendee>({
  name: { type: String, required: true }
});

const LocationSchema = new Schema<ILocation>({
  name: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true }
});

const AgendaItemSchema = new Schema<IAgendaItem>({
  title: { type: String, required: true },
  description: { type: String },
  createdBy: { type: String }
});

const AgendaSchema = new Schema<IAgenda>({
  title: { type: String, required: true },
  date: { type: String },
  time: { type: String },
  location: { type: LocationSchema },
  attendees: [AttendeeSchema],
  items: [AgendaItemSchema]
}, { timestamps: true });

export default mongoose.model<IAgenda>('Agenda', AgendaSchema);
