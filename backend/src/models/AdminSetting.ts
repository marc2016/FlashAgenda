import mongoose, { Schema, Document } from 'mongoose';

export interface IAdminSetting extends Document {
  key: string;
  value: string;
}

const AdminSettingSchema = new Schema<IAdminSetting>({
  key: { type: String, required: true, unique: true },
  value: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model<IAdminSetting>('AdminSetting', AdminSettingSchema);
