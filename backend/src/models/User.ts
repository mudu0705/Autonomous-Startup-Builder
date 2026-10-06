import mongoose, { Schema, Document } from 'mongoose';
import type { UserRole, UserStatus } from '../../../shared/types/user.ts';

export interface IUserDocument extends Document {
  id?: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  fullName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
      index: true,
    },
    fullName: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const UserModel = mongoose.models.User || mongoose.model<IUserDocument>('User', UserSchema);
