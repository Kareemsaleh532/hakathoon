import { NextResponse } from 'next/server';
import { getDatabase, saveDatabase } from '@/lib/db';
import { Criterion } from '@/types';

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
    return NextResponse.json(db.criteria, { headers: noCacheHeaders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: noCacheHeaders });
  }
}

export async function POST(request: Request) {
  try {
    const { name, description, maxScore, weight } = await request.json();

    if (!name || !maxScore) {
      return NextResponse.json({ error: 'اسم المعيار والدرجة القصوى مطلوبان' }, { status: 400, headers: noCacheHeaders });
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

    return NextResponse.json(newCriterion, { status: 201, headers: noCacheHeaders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: noCacheHeaders });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, name, description, maxScore, weight } = await request.json();

    if (!id || !name || !maxScore) {
      return NextResponse.json({ error: 'معرف المعيار والاسم والدرجة حقول مطلوبة' }, { status: 400, headers: noCacheHeaders });
    }

    const db = getDatabase();
    const index = db.criteria.findIndex(c => c.id === id);

    if (index === -1) {
      return NextResponse.json({ error: 'المعيار غير موجود' }, { status: 404, headers: noCacheHeaders });
    }

    const updated: Criterion = {
      id,
      name: name.trim(),
      description: description?.trim() || '',
      maxScore: Number(maxScore),
      weight: Number(weight) || Number(maxScore),
    };

    db.criteria[index] = updated;
    saveDatabase(db);

    return NextResponse.json(updated, { headers: noCacheHeaders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: noCacheHeaders });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'معرف المعيار مطلوب' }, { status: 400, headers: noCacheHeaders });
    }

    const db = getDatabase();
    const beforeCount = db.criteria.length;
    db.criteria = db.criteria.filter(c => c.id !== id);

    // Also clean up evaluations that had scores for this deleted criterion and recalculate totalScore
    db.evaluations = db.evaluations.map(ev => {
      if (ev.scores && ev.scores[id] !== undefined) {
        const { [id]: _, ...restScores } = ev.scores;
        const newTotal = Object.values(restScores).reduce((sum, s) => sum + (Number(s) || 0), 0);
        return {
          ...ev,
          scores: restScores,
          totalScore: newTotal,
        };
      }
      return ev;
    });

    saveDatabase(db);

    return NextResponse.json({
      success: true,
      deletedId: id,
      remainingCount: db.criteria.length,
      wasRemoved: beforeCount !== db.criteria.length
    }, { headers: noCacheHeaders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: noCacheHeaders });
  }
}
