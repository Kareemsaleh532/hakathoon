import { NextResponse } from 'next/server';
import { resetDatabase } from '@/lib/db';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function POST() {
  try {
    if (isSupabaseConfigured && supabase) {
      // Clear data but preserve admin-1
      await Promise.all([
        supabase.from('evaluations').delete().neq('id', '___none___'),
        supabase.from('submissions').delete().neq('id', '___none___'),
        supabase.from('criteria').delete().neq('id', '___none___'),
        supabase.from('teams').delete().neq('id', '___none___'),
        supabase.from('challenges').delete().neq('id', '___none___'),
        supabase.from('users').delete().neq('id', 'admin-1'),
        supabase.from('settings').upsert({ id: 'app_settings', is_submission_open: false, announcement: '' })
      ]);

      return NextResponse.json({ success: true, message: 'Database reset successfully' }, { headers: noCacheHeaders });
    }

    const freshDb = resetDatabase();
    return NextResponse.json({ success: true, db: freshDb }, { headers: noCacheHeaders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: noCacheHeaders });
  }
}
