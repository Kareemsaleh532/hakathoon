import { NextResponse } from 'next/server';
import { getDatabase, saveDatabase } from '@/lib/db';
import { Challenge } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET() {
  try {
    const db = getDatabase();
    return NextResponse.json(db.challenges, { headers: noCacheHeaders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: noCacheHeaders });
  }
}

export async function POST(request: Request) {
  try {
    const { title, track, description, targetImpact, deliverables } = await request.json();

    if (!title || !description || !track) {
      return NextResponse.json({ error: 'العنوان والمسار والوصف حقول إجبارية' }, { status: 400, headers: noCacheHeaders });
    }

    const db = getDatabase();
    const newChallenge: Challenge = {
      id: `ch-${Date.now()}`,
      title: title.trim(),
      track: track.trim(),
      description: description.trim(),
      targetImpact: targetImpact?.trim() || '',
      deliverables: Array.isArray(deliverables)
        ? deliverables
        : typeof deliverables === 'string'
        ? deliverables.split('\n').filter(Boolean)
        : [],
      createdAt: new Date().toISOString(),
    };

    db.challenges.push(newChallenge);
    saveDatabase(db);

    return NextResponse.json(newChallenge, { status: 201, headers: noCacheHeaders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: noCacheHeaders });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'معرف التحدي مطلوب' }, { status: 400, headers: noCacheHeaders });
    }

    const db = getDatabase();
    db.challenges = db.challenges.filter(c => c.id !== id);
    saveDatabase(db);

    return NextResponse.json({ success: true, deletedId: id }, { headers: noCacheHeaders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: noCacheHeaders });
  }
}
