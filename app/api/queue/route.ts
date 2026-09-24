import { NextResponse } from 'next/server';

const GAS_WEB_APP_URL = process.env.GAS_WEB_APP_URL!;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'my-scrimmage-secret-1234';

export async function POST(request: Request) {
  try {
    const secret = request.headers.get('x-cheesy-secret');
    if (secret !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    body.type = 'queuing'; // 強制指定類型為 queuing

    await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Queue update failed' }, { status: 500 });
  }
}