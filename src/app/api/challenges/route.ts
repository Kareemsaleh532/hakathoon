import { NextResponse } from 'next/server';
import { getDatabase, saveDatabase } from '@/lib/db';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
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
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formatted: Challenge[] = (data || []).map(ch => ({
        id: ch.id,
        title: ch.title,
        track: ch.track || '',
        description: ch.description || '',
        targetImpact: ch.target_impact || '',
        deliverables: ch.deliverables || [],
        createdAt: ch.created_at,
      }));

      return NextResponse.json(formatted, { headers: noCacheHeaders });
    }

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

    const newChId = `ch-${Date.now()}`;
    const cleanTitle = title.trim();
    const cleanTrack = track.trim();
    const cleanDesc = description.trim();
    const cleanImpact = targetImpact?.trim() || '';
    const parsedDeliverables = Array.isArray(deliverables)
      ? deliverables
      : typeof deliverables === 'string'
      ? deliverables.split('\n').filter(Boolean)
      : [];

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('challenges')
        .insert({
          id: newChId,
          title: cleanTitle,
          track: cleanTrack,
          description: cleanDesc,
          target_impact: cleanImpact,
          deliverables: parsedDeliverables,
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json(data, { status: 201, headers: noCacheHeaders });
    }

    const db = getDatabase();
    const newChallenge: Challenge = {
      id: newChId,
      title: cleanTitle,
      track: cleanTrack,
      description: cleanDesc,
      targetImpact: cleanImpact,
      deliverables: parsedDeliverables,
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
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await request.json();
        id = body?.id;
      } catch (_) {}
    }

    if (!id) {
      return NextResponse.json({ error: 'معرف التحدي مطلوب' }, { status: 400, headers: noCacheHeaders });
    }

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('challenges').delete().eq('id', id);
      if (error) throw error;
      return NextResponse.json({ success: true, deletedId: id }, { headers: noCacheHeaders });
    }

    const db = getDatabase();
    db.challenges = db.challenges.filter(c => c.id !== id);
    saveDatabase(db);

    return NextResponse.json({ success: true, deletedId: id }, { headers: noCacheHeaders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: noCacheHeaders });
  }
}
