import fs from 'fs';
import path from 'path';
import os from 'os';
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

// Check if a directory is writable
function isDirectoryWritable(dirPath: string): boolean {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    const testFile = path.join(dirPath, `.write-test-${Date.now()}`);
    fs.writeFileSync(testFile, 'ok', 'utf-8');
    fs.unlinkSync(testFile);
    return true;
  } catch {
    return false;
  }
}

// Resolve optimal storage directory (local project folder vs /tmp for Vercel/serverless)
function getStorageDirectory(): string {
  const isServerless = Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT ||
    process.env.NETLIFY
  );

  const localDir = path.join(process.cwd(), 'data');

  // If local development and data/ is writable, use localDir
  if (!isServerless && isDirectoryWritable(localDir)) {
    return localDir;
  }

  // On Vercel / serverless (where process.cwd() is read-only /var/task), use /tmp
  const tmpDir = path.join(os.tmpdir(), 'hackathon-data');
  try {
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
  } catch (err) {
    console.error('Failed to create tmp dir:', err);
  }
  return tmpDir;
}

const DATA_DIR = getStorageDirectory();
const DB_FILE = path.join(DATA_DIR, 'db.json');
const DB_BAK_FILE = path.join(DATA_DIR, 'db.json.bak');
const DB_TMP_FILE = path.join(DATA_DIR, 'db.json.tmp');

// Bundled reference file shipped with git repo
const BUNDLED_DB_FILE = path.join(process.cwd(), 'data', 'db.json');

// Initial default schema
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
  criteria: [],
  submissions: [],
  evaluations: [],
  settings: {
    isSubmissionOpen: false,
    announcement: ''
  }
};

// Global in-memory cache to guarantee instant persistence across requests
declare global {
  // eslint-disable-next-line no-var
  var __HACKATHON_DB__: DatabaseSchema | undefined;
  // eslint-disable-next-line no-var
  var __HACKATHON_DB_LOADED__: boolean | undefined;
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

function ensureDataFile(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(DB_FILE)) {
      // If we are in /tmp and the bundled project has data/db.json, copy it over!
      if (fs.existsSync(BUNDLED_DB_FILE) && BUNDLED_DB_FILE !== DB_FILE) {
        try {
          const bundledContent = fs.readFileSync(BUNDLED_DB_FILE, 'utf-8');
          fs.writeFileSync(DB_FILE, bundledContent, 'utf-8');
          return;
        } catch (_) {}
      }

      // Otherwise initialize with initialDatabase
      const initial = JSON.parse(JSON.stringify(initialDatabase));
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      globalThis.__HACKATHON_DB__ = initial;
      globalThis.__HACKATHON_DB_LOADED__ = true;
    }
  } catch (err) {
    console.error('Failed to ensure data file:', err);
  }
}

export function getDatabase(): DatabaseSchema {
  // 1. If in-memory cache is already loaded and modified, return it
  if (globalThis.__HACKATHON_DB__ && globalThis.__HACKATHON_DB_LOADED__) {
    return globalThis.__HACKATHON_DB__;
  }

  ensureDataFile();

  // 2. Try reading from active DB_FILE
  try {
    if (fs.existsSync(DB_FILE)) {
      const rawText = fs.readFileSync(DB_FILE, 'utf-8').trim();
      if (rawText.length > 0) {
        const parsed = JSON.parse(rawText);
        const normalized = normalizeDatabase(parsed);
        if (!normalized.users.some(u => u.role === 'admin')) {
          normalized.users.unshift(initialDatabase.users[0]);
        }
        globalThis.__HACKATHON_DB__ = normalized;
        globalThis.__HACKATHON_DB_LOADED__ = true;
        return normalized;
      }
    }
  } catch (err) {
    console.warn('Failed to read db.json, attempting backup file:', err);
  }

  // 3. Fallback to backup file
  try {
    if (fs.existsSync(DB_BAK_FILE)) {
      const bakText = fs.readFileSync(DB_BAK_FILE, 'utf-8').trim();
      if (bakText.length > 0) {
        const parsed = JSON.parse(bakText);
        const normalized = normalizeDatabase(parsed);
        globalThis.__HACKATHON_DB__ = normalized;
        globalThis.__HACKATHON_DB_LOADED__ = true;
        return normalized;
      }
    }
  } catch (_) {}

  // 4. Fallback to bundled file if different
  if (DB_FILE !== BUNDLED_DB_FILE && fs.existsSync(BUNDLED_DB_FILE)) {
    try {
      const bundledText = fs.readFileSync(BUNDLED_DB_FILE, 'utf-8').trim();
      if (bundledText.length > 0) {
        const parsed = JSON.parse(bundledText);
        const normalized = normalizeDatabase(parsed);
        globalThis.__HACKATHON_DB__ = normalized;
        globalThis.__HACKATHON_DB_LOADED__ = true;
        return normalized;
      }
    } catch (_) {}
  }

  // 5. Fallback to initialDatabase
  const fresh = JSON.parse(JSON.stringify(initialDatabase));
  globalThis.__HACKATHON_DB__ = fresh;
  globalThis.__HACKATHON_DB_LOADED__ = true;
  saveDatabase(fresh);
  return fresh;
}

export function saveDatabase(data: DatabaseSchema): boolean {
  const normalized = normalizeDatabase(data);

  // Always protect the main admin account
  if (!normalized.users.some(u => u.role === 'admin')) {
    normalized.users.unshift(initialDatabase.users[0]);
  }

  // 1. Immediately update global in-memory cache (zero latency for subsequent requests)
  globalThis.__HACKATHON_DB__ = normalized;
  globalThis.__HACKATHON_DB_LOADED__ = true;

  const jsonString = JSON.stringify(normalized, null, 2);

  // 2. Persist to disk
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (_) {}

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
        const end = Date.now() + 20;
        while (Date.now() < end) {}
      }
    }
  }

  return written;
}

// Reset helper
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
