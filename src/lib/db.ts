import fs from 'fs';
import path from 'path';
import { User, Team, Challenge, Criterion, Submission, Evaluation, AppSettings } from '@/types';

export interface DatabaseSchema {
  users: (User & { password?: string })[];
  teams: Team[];
  challenges: Challenge[];
  criteria: Criterion[];
  submissions: Submission[];
  evaluations: Evaluation[];
  settings: AppSettings;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Fresh clean initial database - no fake data, only initial admin user
export const initialDatabase: DatabaseSchema = {
  users: [
    {
      id: 'admin-1',
      name: 'مدير الهاكاثون',
      email: 'admin@hackathon.com',
      password: 'admin',
      role: 'admin',
      createdAt: new Date().toISOString(),
    }
  ],
  teams: [],
  challenges: [],
  criteria: [
    {
      id: 'crit-1',
      name: 'أصالة الفكرة والابتكار',
      description: 'مدى جدة الفكرة وابتكار الحل المقدم وتميزه عن الحلول التقليدية.',
      maxScore: 25,
      weight: 25,
    },
    {
      id: 'crit-2',
      name: 'جودة التنفيذ والحل التقني',
      description: 'اكتمال العمل التقني وجودة بناء المشروع وقابليته للعمل.',
      maxScore: 25,
      weight: 25,
    },
    {
      id: 'crit-3',
      name: 'الأثر والجدوى الواقعية',
      description: 'الأثر البيئي/المجتمعي وإمكانية تطبيق المشروع واستدامته على أرض الواقع.',
      maxScore: 25,
      weight: 25,
    },
    {
      id: 'crit-4',
      name: 'جودة العرض والتسليم',
      description: 'وضوح الملفات المسلّمة وتنظيم الأفكار وشمولية التسليم.',
      maxScore: 25,
      weight: 25,
    }
  ],
  submissions: [],
  evaluations: [],
  settings: {
    isSubmissionOpen: false,
    announcement: ''
  }
};

function ensureDataFile(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDatabase, null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('Failed to ensure data file:', err);
  }
}

export function getDatabase(): DatabaseSchema {
  ensureDataFile();
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(data) as DatabaseSchema;
    }
  } catch (err) {
    console.error('Failed to read db file, using fallback:', err);
  }
  return JSON.parse(JSON.stringify(initialDatabase));
}

export function saveDatabase(data: DatabaseSchema): void {
  try {
    ensureDataFile();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write db file:', err);
  }
}

// Reset helper
export function resetDatabase(): DatabaseSchema {
  const fresh = JSON.parse(JSON.stringify(initialDatabase));
  saveDatabase(fresh);
  return fresh;
}
