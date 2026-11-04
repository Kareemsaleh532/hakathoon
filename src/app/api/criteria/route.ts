import { NextResponse } from 'next/server';
import { getDatabase, saveDatabase } from '@/lib/db';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
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
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('criteria')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formatted: Criterion[] = (data || []).map(c => ({
        id: c.id,
        name: c.name,
        description: c.description || '',
        maxScore: Number(c.max_score) || 25,
        weight: Number(c.weight) || Number(c.max_score) || 25,
      }));

      return NextResponse.json(formatted, { headers: noCacheHeaders });
    }

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

    const newCritId = `crit-${Date.now()}`;
    const cleanName = name.trim();
    const cleanDesc = description?.trim() || '';
    const numMaxScore = Number(maxScore) || 25;
    const numWeight = Number(weight) || numMaxScore;

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('criteria')
        .insert({
          id: newCritId,
          name: cleanName,
          description: cleanDesc,
          max_score: numMaxScore,
          weight: numWeight,
        })
        .select()
        .single();

      if (error) throw error;

      const created: Criterion = {
        id: data.id,
        name: data.name,
        description: data.description,
        maxScore: Number(data.max_score),
        weight: Number(data.weight),
      };

      return NextResponse.json(created, { status: 201, headers: noCacheHeaders });
    }

    const db = getDatabase();
    const newCriterion: Criterion = {
      id: newCritId,
      name: cleanName,
      description: cleanDesc,
      maxScore: numMaxScore,
      weight: numWeight,
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

    const cleanName = name.trim();
    const cleanDesc = description?.trim() || '';
    const numMaxScore = Number(maxScore);
    const numWeight = Number(weight) || numMaxScore;

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('criteria')
        .update({
          name: cleanName,
          description: cleanDesc,
          max_score: numMaxScore,
          weight: numWeight,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const updated: Criterion = {
        id: data.id,
        name: data.name,
        description: data.description,
        maxScore: Number(data.max_score),
        weight: Number(data.weight),
      };

      return NextResponse.json(updated, { headers: noCacheHeaders });
    }

    const db = getDatabase();
    const index = db.criteria.findIndex(c => c.id === id);

    if (index === -1) {
      return NextResponse.json({ error: 'المعيار غير موجود' }, { status: 404, headers: noCacheHeaders });
    }

    const updated: Criterion = {
      id,
      name: cleanName,
      description: cleanDesc,
      maxScore: numMaxScore,
      weight: numWeight,
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
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await request.json();
        id = body?.id;
      } catch (_) {}
    }

    if (!id) {
      return NextResponse.json({ error: 'معرف المعيار مطلوب' }, { status: 400, headers: noCacheHeaders });
    }

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('criteria').delete().eq('id', id);
      if (error) throw error;

      return NextResponse.json({ success: true, deletedId: id }, { headers: noCacheHeaders });
    }

    const db = getDatabase();
    db.criteria = db.criteria.filter(c => c.id !== id);

    db.evaluations = db.evaluations.map(ev => {
      if (ev.scores && ev.scores[id!] !== undefined) {
        const { [id!]: _, ...restScores } = ev.scores;
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

    return NextResponse.json({ success: true, deletedId: id }, { headers: noCacheHeaders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: noCacheHeaders });
  }
}
