import mongoose from 'mongoose';

// Convert validated ObjectId strings for aggregation-safe MongoDB filters.
export const toObjectId = (id) => new mongoose.Types.ObjectId(id);

// Build a one-to-one lookup stage pair for lightweight referenced fields.
export const lookupOne = ({ from, localField, as, project }) => [
  {
    $lookup: {
      from,
      localField,
      foreignField: '_id',
      as,
      pipeline: [{ $project: project }],
    },
  },
  { $unwind: { path: `$${as}`, preserveNullAndEmptyArrays: true } },
];
