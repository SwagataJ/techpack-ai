import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const id = uuidv4();
    cb(null, `${id}${ext}`);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/png', 'image/jpeg', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: PNG, JPEG, WebP`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
});

const router = Router();

// Single file upload (backwards compatible)
router.post('/', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  const fileId = path.basename(req.file.filename, path.extname(req.file.filename));

  res.json({
    fileId,
    filename: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
  });
});

// Multiple files upload
router.post('/multiple', upload.array('files', 10), (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    res.status(400).json({ error: 'No files uploaded' });
    return;
  }

  const uploaded = files.map(f => ({
    fileId: path.basename(f.filename, path.extname(f.filename)),
    filename: f.originalname,
    mimetype: f.mimetype,
    size: f.size,
  }));

  res.json({ files: uploaded });
});

export default router;
