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
const DB_BAK_FILE = path.join(DATA_DIR, 'db.json.bak');
const DB_TMP_FILE = path.join(DATA_DIR, 'db.json.tmp');

// Initial default admin user
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

// Global in-memory cache to guarantee instant, thread-safe, hot-reload-safe persistence
declare global {
  // eslint-disable-next-line no-var
  var __HACKATHON_DB__: DatabaseSchema | undefined;
}

function normalizeDatabase(raw: any): DatabaseSchema {
  if (!raw || typeof raw !== 'object') {
    return JSON.parse(JSON.stringify(initialDatabase));
  }
  return {
    users: Array.isArray(raw.users) ? raw.users : [],
    teams: Array.isArray(raw.teams) ? raw.teams : [],
    challenges: Array.isArray(raw.challenges) ? raw.challenges : [],
    // CRITICAL: keep empty array if user deleted all criteria! Do NOT re-add default criteria!
    criteria: Array.isArray(raw.criteria) ? raw.criteria : [],
    submissions: Array.isArray(raw.submissions) ? raw.submissions : [],
    evaluations: Array.isArray(raw.evaluations) ? raw.evaluations : [],
    settings: raw.settings && typeof raw.settings === 'object'
      ? { isSubmissionOpen: Boolean(raw.settings.isSubmissionOpen), announcement: raw.settings.announcement || '' }
      : { isSubmissionOpen: false, announcement: '' },
  };
}

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.error('Failed to create data dir:', err);
  }
}

function ensureDataFile(): void {
  ensureDataDir();
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initial = JSON.parse(JSON.stringify(initialDatabase));
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      globalThis.__HACKATHON_DB__ = initial;
    }
  } catch (err) {
    console.error('Failed to ensure data file:', err);
  }
}

export function getDatabase(): DatabaseSchema {
  ensureDataFile();

  // Try reading fresh from disk
  try {
    if (fs.existsSync(DB_FILE)) {
      const rawText = fs.readFileSync(DB_FILE, 'utf-8').trim();
      if (rawText.length > 0) {
        const parsed = JSON.parse(rawText);
        const normalized = normalizeDatabase(parsed);
        // Ensure admin always exists
        if (!normalized.users.some(u => u.role === 'admin')) {
          normalized.users.unshift(initialDatabase.users[0]);
        }
        globalThis.__HACKATHON_DB__ = normalized;
        return normalized;
      }
    }
  } catch (err) {
    console.warn('Failed to read db.json, attempting recovery from backup or memory:', err);
  }

  // Fallback 1: try backup file if main was read during mid-write
  try {
    if (fs.existsSync(DB_BAK_FILE)) {
      const bakText = fs.readFileSync(DB_BAK_FILE, 'utf-8').trim();
      if (bakText.length > 0) {
        const parsed = JSON.parse(bakText);
        const normalized = normalizeDatabase(parsed);
        globalThis.__HACKATHON_DB__ = normalized;
        return normalized;
      }
    }
  } catch (_) {}

  // Fallback 2: in-memory cache
  if (globalThis.__HACKATHON_DB__) {
    return globalThis.__HACKATHON_DB__;
  }

  // Fallback 3: fresh initial database
  const fresh = JSON.parse(JSON.stringify(initialDatabase));
  globalThis.__HACKATHON_DB__ = fresh;
  saveDatabase(fresh);
  return fresh;
}

export function saveDatabase(data: DatabaseSchema): boolean {
  ensureDataDir();
  const normalized = normalizeDatabase(data);

  // Always protect the main admin account
  if (!normalized.users.some(u => u.role === 'admin')) {
    normalized.users.unshift(initialDatabase.users[0]);
  }

  // 1. Immediately update global in-memory cache (zero latency for subsequent requests)
  globalThis.__HACKATHON_DB__ = normalized;

  const jsonString = JSON.stringify(normalized, null, 2);

  // 2. Write to disk using atomic temp file replacement with retry
  let written = false;
  let attempts = 0;

  while (!written && attempts < 5) {
    try {
      // Write temp file first
      fs.writeFileSync(DB_TMP_FILE, jsonString, 'utf-8');

      // Backup existing file if present
      if (fs.existsSync(DB_FILE)) {
        try {
          fs.copyFileSync(DB_FILE, DB_BAK_FILE);
        } catch (_) {}
      }

      // Replace target file
      try {
        if (fs.existsSync(DB_FILE)) {
          fs.unlinkSync(DB_FILE);
        }
        fs.renameSync(DB_TMP_FILE, DB_FILE);
      } catch (_) {
        // Fallback for Windows file locks
        fs.writeFileSync(DB_FILE, jsonString, 'utf-8');
        if (fs.existsSync(DB_TMP_FILE)) {
          try { fs.unlinkSync(DB_TMP_FILE); } catch (_) {}
        }
      }

      written = true;
    } catch (err) {
      attempts++;
      if (attempts >= 5) {
        console.error('Failed to save database file after 5 attempts:', err);
      } else {
        // Short synchronous sleep before retry
        const end = Date.now() + 25;
        while (Date.now() < end) {}
      }
    }
  }

  return written;
}

// Reset helper - clean state
export function resetDatabase(): DatabaseSchema {
  const fresh: DatabaseSchema = {
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
    criteria: [],
    submissions: [],
    evaluations: [],
    settings: {
      isSubmissionOpen: false,
      announcement: ''
    }
  };
  saveDatabase(fresh);
  return fresh;
}
