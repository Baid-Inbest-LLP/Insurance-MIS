import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from '../config/index.js';
import { ApiError } from '../utils/ApiError.js';

if (!fs.existsSync(config.upload.dir)) {
  fs.mkdirSync(config.upload.dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.upload.dir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (_req, file, cb) => {
  if (config.upload.allowedMime.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(ApiError.badRequest('Only PDF, JPG, and PNG files are allowed'), false);
  }
};

export const uploadSingle = (fieldName) =>
  multer({
    storage,
    fileFilter,
    limits: { fileSize: config.upload.maxSize },
  }).single(fieldName);

const pdfOnly = (_req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(ApiError.badRequest('Only PDF files are allowed'), false);
  }
};

// A single PDF kept in memory (`req.file.buffer`), never written to disk.
export const uploadPdfInMemory = (fieldName) =>
  multer({
    storage: multer.memoryStorage(),
    fileFilter: pdfOnly,
    limits: { fileSize: config.upload.maxSize },
  }).single(fieldName);
