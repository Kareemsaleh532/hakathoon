import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'لم يتم إرفاق أي ملف' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save in public/uploads directory so it's accessible via static URL
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Sanitize file name
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._\-\u0600-\u06FF]/g, '_');
    const finalFileName = `${timestamp}-${safeName}`;
    const filePath = path.join(uploadDir, finalFileName);

    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({
      url: `/uploads/${finalFileName}`,
      fileName: file.name,
      fileSize: file.size,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'فشل رفع الملف' }, { status: 500 });
  }
}
