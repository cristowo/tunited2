import fs from 'fs';
import path from 'path';

export const UPLOADS_DIR = path.resolve(__dirname, '../uploads');

fs.mkdirSync(UPLOADS_DIR, { recursive: true });
