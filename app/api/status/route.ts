import { NextResponse } from 'next/server';

const GAS_WEB_APP_URL = process.env.GAS_WEB_APP_URL!;

export async function GET() {
  try {
    const res = await fetch(GAS_WEB_APP_URL, { cache: 'no-store' });
    const data = await res.json();

    return NextResponse.json(data, {
      status: 200,
      headers: {
        // 設定 Vercel Edge Cache 快取 5 秒
        'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=29',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
  }
}