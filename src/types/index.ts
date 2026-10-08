export type Role = 'admin' | 'participant' | 'judge';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  specialty?: string;
  teamId?: string;
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  description: string;
  maxMembers: number;
  track?: string;
  createdAt: string;
  membersCount?: number;
}

export interface Challenge {
  id: string;
  title: string;
  track: string;
  description: string;
  targetImpact: string;
  deliverables: string[];
  createdAt: string;
}

export interface Criterion {
  id: string;
  name: string;
  description: string;
  maxScore: number;
  weight: number;
}

export interface Submission {
  id: string;
  teamId: string;
  teamName: string;
  challengeId: string;
  challengeTitle: string;
  projectTitle: string;
  summary: string;
  environmentalImpact: string;
  demoUrl?: string;
  repoUrl?: string;
  presentationUrl?: string;
  submittedByUserId?: string;
  submittedByUserName?: string;
  submittedAt: string;
  updatedAt?: string;
}

export interface Evaluation {
  id: string;
  submissionId: string;
  teamId: string;
  judgeId: string;
  judgeName: string;
  scores: Record<string, number>;
  totalScore: number;
  feedback: string;
  evaluatedAt: string;
}

export interface AppSettings {
  isSubmissionOpen: boolean;
  announcement?: string;
}
