import { NextResponse } from 'next/server';

const GAS_WEB_APP_URL = process.env.GAS_WEB_APP_URL!;
const CHEESY_WEBHOOK_SECRET = process.env.CHEESY_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  const authHeader = request.headers.get('x-cheesy-secret');

  if (authHeader !== CHEESY_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized Webhook Secret' }, { status: 401 });
  }

  try {
    const body = await request.json();
    await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}