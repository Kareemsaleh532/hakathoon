import { NextResponse } from 'next/server';
import { getDatabase, saveDatabase } from '@/lib/db';
import { Criterion } from '@/types';

export async function GET() {
  try {
    const db = getDatabase();
    return NextResponse.json(db.criteria);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, description, maxScore, weight } = await request.json();

    if (!name || !maxScore) {
      return NextResponse.json({ error: 'اسم المعيار والدرجة القصوى مطلوبان' }, { status: 400 });
    }

    const db = getDatabase();
    const newCriterion: Criterion = {
      id: `crit-${Date.now()}`,
      name: name.trim(),
      description: description?.trim() || '',
      maxScore: Number(maxScore) || 25,
      weight: Number(weight) || Number(maxScore) || 25,
    };

    db.criteria.push(newCriterion);
    saveDatabase(db);

    return NextResponse.json(newCriterion, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'معرف المعيار مطلوب' }, { status: 400 });
    }

    const db = getDatabase();
    db.criteria = db.criteria.filter(c => c.id !== id);
    saveDatabase(db);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
