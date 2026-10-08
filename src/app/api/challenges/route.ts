import { NextResponse } from 'next/server';
import { getDatabase, saveDatabase } from '@/lib/db';
import { Challenge } from '@/types';

export async function GET() {
  try {
    const db = getDatabase();
    return NextResponse.json(db.challenges);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { title, track, description, targetImpact, deliverables } = await request.json();

    if (!title || !description || !track) {
      return NextResponse.json({ error: 'العنوان والمسار والوصف حقول إجبارية' }, { status: 400 });
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

    return NextResponse.json(newChallenge, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'معرف التحدي مطلوب' }, { status: 400 });
    }

    const db = getDatabase();
    db.challenges = db.challenges.filter(c => c.id !== id);
    saveDatabase(db);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
