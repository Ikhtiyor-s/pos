import multer from 'multer';
import path from 'path';

const ALLOWED_TYPES = /jpeg|jpg|png|webp/;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function createUpload(folder: string) {
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, `uploads/${folder}`);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  });

  return multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (_req, file, cb) => {
      const extValid = ALLOWED_TYPES.test(path.extname(file.originalname).toLowerCase());
      const mimeValid = ALLOWED_TYPES.test(file.mimetype);

      if (extValid && mimeValid) {
        cb(null, true);
      } else {
        cb(new Error('Faqat rasm fayllari (jpeg, jpg, png, webp) qabul qilinadi'));
      }
    },
  });
}

export const productUpload = createUpload('products');
export const categoryUpload = createUpload('categories');
export const inventoryUpload = createUpload('inventory');
