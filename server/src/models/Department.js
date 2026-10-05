import mongoose from 'mongoose';

// Departments are data, not a hardcoded list. Users and master lists point to a
// department by id, so its name and code can be changed freely.
const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
    code: { type: String, required: true, trim: true, uppercase: true, unique: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, strict: 'throw' },
);

// Names are unique ignoring case ("Life Insurance" = "life insurance").
departmentSchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

export const Department = mongoose.model('Department', departmentSchema);
