import { NextResponse } from 'next/server';
import { resetDatabase } from '@/lib/db';

export async function POST() {
  try {
    const freshDb = resetDatabase();
    return NextResponse.json({ success: true, db: freshDb });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
