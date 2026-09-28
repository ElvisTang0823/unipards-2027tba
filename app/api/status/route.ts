import { NextResponse } from 'next/server';

const GAS_WEB_APP_URL = process.env.GAS_WEB_APP_URL!;
const CLIENT_API_KEY = process.env.CLIENT_API_KEY!;

export async function GET(request: Request) {
  // 從環境變數讀取後端設定的 Key
  const CLIENT_API_KEY = process.env.CLIENT_API_KEY || process.env.NEXT_PUBLIC_CLIENT_API_KEY;

  // 抓取前端傳來的 Key
  const { searchParams } = new URL(request.url);
  const clientKey = request.headers.get('x-client-key') || searchParams.get('key');

  // 💡 Debug 密技：如果還是 401，可以先在 console 印出來看是哪裡沒對上
  // console.log('Client Key:', clientKey);
  // console.log('Expected Key:', CLIENT_API_KEY);

  if (!clientKey || clientKey !== CLIENT_API_KEY) {
    return NextResponse.json(
      { error: 'Unauthorized: Missing or invalid API Key' },
      { status: 401 }
    );
  }

  try {
    // 2. 向 GAS 請求完整資料包
    const res = await fetch(GAS_WEB_APP_URL, { cache: 'no-store' });
    const data = await res.json();

    // 3. 回傳資料並設定 5 秒 Edge 快取
    return NextResponse.json(data, {
      status: 200,
      headers: {
        // 核心快取：Vercel Edge 網快取 5 秒，59 秒內背景重新整理
        'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=59',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch data from DB' }, { status: 500 });
  }
}