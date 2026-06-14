import mongoose from 'mongoose';

const CTA_SCHEMA = new mongoose.Schema(
  {
    label: { type: String, default: '' },
    href: { type: String, default: '' }
  },
  { _id: false }
);

export const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    body: { type: String, required: true },
    variant: {
      type: String,
      enum: ['info', 'warning', 'error', 'success', 'critical'],
      default: 'info'
    },
    priority: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'published', 'archived'],
      default: 'draft'
    },
    publish_at: { type: Date, default: null },
    expires_at: { type: Date, default: null },
    cta: { type: CTA_SCHEMA, default: () => ({}) },
    audience: { type: String, default: 'all' },
    created_at: { type: Date, default: () => new Date() },
    updated_at: { type: Date, default: () => new Date() },
    created_by: { type: String, default: '' },
    updated_by: { type: String, default: '' }
  },
  {
    strict: true
  }
);

export interface Announcement extends mongoose.Document {
  title: string;
  body: string;
  variant: 'info' | 'warning' | 'error' | 'success' | 'critical';
  priority: number;
  status: 'draft' | 'scheduled' | 'published' | 'archived';
  publish_at: Date | null;
  expires_at: Date | null;
  cta?: {
    label?: string;
    href?: string;
  };
  audience: string;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
  updated_by?: string;
}

export const AnnouncementModel =
  mongoose.models.announcements ||
  mongoose.model<Announcement>('announcements', announcementSchema);
