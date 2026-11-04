import { NextResponse } from 'next/server';
import { getDatabase, saveDatabase } from '@/lib/db';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

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
        .from('settings')
        .select('*')
        .eq('id', 'app_settings')
        .maybeSingle();

      if (error) throw error;

      const settings = {
        isSubmissionOpen: Boolean(data?.is_submission_open),
        announcement: data?.announcement || '',
      };

      return NextResponse.json(settings, { headers: noCacheHeaders });
    }

    const db = getDatabase();
    return NextResponse.json(db.settings, { headers: noCacheHeaders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: noCacheHeaders });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('settings')
        .upsert({
          id: 'app_settings',
          is_submission_open: body.isSubmissionOpen !== undefined ? Boolean(body.isSubmissionOpen) : false,
          announcement: body.announcement !== undefined ? String(body.announcement) : '',
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        isSubmissionOpen: Boolean(data.is_submission_open),
        announcement: data.announcement || '',
      }, { headers: noCacheHeaders });
    }

    const db = getDatabase();
    db.settings = {
      ...db.settings,
      ...body,
    };
    saveDatabase(db);

    return NextResponse.json(db.settings, { headers: noCacheHeaders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: noCacheHeaders });
  }
}
