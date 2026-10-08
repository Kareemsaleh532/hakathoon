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

// Fresh clean initial database
const initialDatabase: DatabaseSchema = {
  users: [
    {
      id: 'admin-1',
      name: 'مدير الهاكاثون',
      email: 'admin@hackathon.com',
      password: 'admin',
      role: 'admin',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'judge-1',
      name: 'د. سامي الأحمد',
      email: 'judge@hackathon.com',
      password: 'judge',
      role: 'judge',
      specialty: 'محكم بيئي وتقني',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'user-participant-1',
      name: 'أحمد خليل',
      email: 'ahmed@hackathon.com',
      password: '123',
      role: 'participant',
      teamId: 'team-1',
      phone: '0599000000',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'user-participant-2',
      name: 'متسابق الهاكاثون',
      email: 'participant@hackathon.com',
      password: '123',
      role: 'participant',
      teamId: 'team-1',
      phone: '0599111111',
      createdAt: new Date().toISOString(),
    }
  ],
  teams: [
    {
      id: 'team-1',
      name: 'فريق الاستدامة الخضراء',
      description: 'حلول ذكية لخفض الانبعاثات وإدارة الموارد الطبيعية',
      maxMembers: 5,
      track: 'المناخ والبيئة',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'team-2',
      name: 'فريق الطاقة النظيفة',
      description: 'تطبيقات برمجية لتحسين كفاءة الطاقة المتجددة',
      maxMembers: 4,
      track: 'الطاقة النظيفة',
      createdAt: new Date().toISOString(),
    }
  ],
  challenges: [
    {
      id: 'ch-1',
      title: 'رصد وتحييد الانبعاثات الكربونية في المنشآت',
      track: 'خفض الانبعاثات والحياد الصفري',
      description: 'تطوير أدوات برمجية دقيقة تجمع البيانات الميدانية وتقيس غازات الاحتباس الحراري مع اقتراح خطط بديلة مستدامة.',
      targetImpact: 'تقليل البصمة الكربونية بنسبة لا تقل عن 20% ورفع كفاءة استهلاك الطاقة.',
      deliverables: [
        'لوحة معلومات تفاعلية لحساب الانبعاثات',
        'خوارزمية تنبؤية باستهلاك الطاقة المستقبلي',
        'واجهة برمجة تطبيقات API للربط مع المستشعرات'
      ],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'ch-2',
      title: 'إدارة الموارد المائية والتكيف مع الجفاف',
      track: 'المياه والتكيف مع التغير المناخي',
      description: 'ابتكار نظام ذكي لإدارة شبكات الري أو التوزيع المائي مع استشعار تسريبات المياه والتنبؤ بالجفاف الموسمي.',
      targetImpact: 'توفير ما يصل إلى 35% من استهلاك المياه في القطاع الزراعي والحضري.',
      deliverables: [
        'نموذج أولي لنظام التحكم بالري الذكي',
        'تطبيق جوال أو لوحة تحكم للمزارعين',
        'دراسة أثر بيئي وجدوى استهلاك'
      ],
      createdAt: new Date().toISOString(),
    }
  ],
  criteria: [
    {
      id: 'crit-1',
      name: 'الأثر البيئي والمناخي',
      description: 'مدى فاعلية الحل المقترح في معالجة قضية بيئية حقيقية وتحقيق استدامة بيئية ملموسة.',
      maxScore: 30,
      weight: 30,
    },
    {
      id: 'crit-2',
      name: 'الابتكار والحل التقني',
      description: 'أصالة الفكرة وجودة المعمارية البرمجية والحل التكنولوجي.',
      maxScore: 25,
      weight: 25,
    },
    {
      id: 'crit-3',
      name: 'قابلية التطبيق والاستدامة',
      description: 'إمكانية تنفيذ المشروع على أرض الواقع واستمراريته كنموذج عمل مستدام.',
      maxScore: 25,
      weight: 25,
    },
    {
      id: 'crit-4',
      name: 'جودة العرض والنموذج الأولي',
      description: 'اكتمال النموذج الأولي العامل، ووضوح العرض وتكامل تجربة الاستخدام.',
      maxScore: 20,
      weight: 20,
    }
  ],
  submissions: [
    {
      id: 'sub-1',
      teamId: 'team-1',
      teamName: 'فريق الاستدامة الخضراء',
      challengeId: 'ch-1',
      challengeTitle: 'رصد وتحييد الانبعاثات الكربونية في المنشآت',
      projectTitle: 'منصة إيكو-تراك (EcoTrack) للحياد الكربوني',
      summary: 'نظام ذكي متكامل يعتمد على الذكاء الاصطناعي وإنترنت الأشياء لرصد وتحليل البصمة الكربونية للمصانع والمنشآت لحظياً مع اقتراح إجراءات فورية لخفض الانبعاثات.',
      environmentalImpact: 'يساهم في خفض الانبعاثات بنسبة 28% وتوفير الطاقة بنسبة 35% في أول 6 أشهر.',
      demoUrl: 'https://ecotrack-demo.vercel.app',
      repoUrl: 'https://github.com/green-team/ecotrack',
      presentationUrl: 'https://slides.com/green-team/pitch',
      submittedByUserId: 'user-participant-1',
      submittedByUserName: 'أحمد خليل',
      submittedAt: new Date().toISOString(),
    }
  ],
  evaluations: [],
  settings: {
    isSubmissionOpen: true,
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
