'use client';

import { useState, useEffect } from 'react';

// 動態表格組件：給予任何 JSON Array，自動長出 Header 與 Cell
function DynamicTable({ title, data }: { title: string; data: Record<string, any>[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="my-4 p-4 border rounded shadow-sm">
        <h2 className="text-xl font-bold mb-2">{title}</h2>
        <p className="text-gray-500">目前無資料</p>
      </div>
    );
  }

  // 動態抓取資料的第一筆物件的所有 key 作為 Header
  const headers = Object.keys(data[0]);

  return (
    <div className="my-4 p-4 border rounded shadow-sm overflow-x-auto">
      <h2 className="text-xl font-bold mb-2">{title}</h2>
      <table className="min-w-full text-sm text-left border-collapse">
        <thead>
          <tr className="bg-gray-100 border-b">
            {headers.map((key) => (
              <th key={key} className="p-2 border-r font-semibold">
                {key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx} className="border-b hover:bg-gray-50">
              {headers.map((key) => (
                <td key={key} className="p-2 border-r">
                  {typeof row[key] === 'object' ? JSON.stringify(row[key]) : String(row[key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MiniTBAHome() {
  const [data, setData] = useState<{
    matches: any[];
    rankings: any[];
    alliance: any[];
    awards: any[];
    queue: any[];
  } | null>(null);
  
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 從環境變數抓 CLIENT_API_KEY (Next.js 需加上 NEXT_PUBLIC_ 前綴供前端使用)
        const apiKey = process.env.NEXT_PUBLIC_CLIENT_API_KEY;

        const res = await fetch('/api/status', {
          headers: {
            'x-client-key': apiKey || '',
          },
        });

        if (!res.ok) {
          if (res.status === 401) throw new Error('401 Unauthorized: 金鑰不正確');
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const json = await res.json();
        setData(json);
        setError(null);
      } catch (err: any) {
        setError(err.message);
      }
    };

    // 1. 頁面載入後立即執行一次
    fetchData();

    // 2. 設定限制：每 5000ms (5秒) 呼叫一次 API
    const interval = setInterval(fetchData, 5000);

    return () => clearInterval(interval);
  }, []);

  if (error) {
    return <div className="p-8 text-red-500 font-bold">載入失敗: {error}</div>;
  }

  if (!data) {
    return <div className="p-8">資料載入中...</div>;
  }

  return (
    <main className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight">FRC Scrimmage Mini-TBA</h1>

      {/* 叫號看板 (Queue) */}
      {data.queue && data.queue.length > 0 && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h2 className="text-lg font-bold text-blue-900">📢 現場叫號看板 (Pit Queue)</h2>
          <div className="grid grid-cols-3 gap-4 mt-2 text-center">
            <div className="bg-white p-3 rounded shadow-sm">
              <span className="text-xs text-gray-500 block">當前賽次 (Current)</span>
              <span className="text-xl font-bold text-blue-600">{data.queue[0]?.["Current Match"] || '-'}</span>
            </div>
            <div className="bg-white p-3 rounded shadow-sm">
              <span className="text-xs text-gray-500 block">場上進行中 (On Field)</span>
              <span className="text-xl font-bold text-green-600">{data.queue[0]?.["On Field"] || '-'}</span>
            </div>
            <div className="bg-white p-3 rounded shadow-sm">
              <span className="text-xs text-gray-500 block">預備區報到 (Queued)</span>
              <span className="text-xl font-bold text-orange-600">{data.queue[0]?.["QueuedMatches"] || '-'}</span>
            </div>
          </div>
        </div>
      )}

      {/* 5 個動態渲染的數據區塊 (Schema-Agnostic) */}
      <DynamicTable title="Matches 賽程與成績" data={data.matches} />
      <DynamicTable title="Rankings 累積排名" data={data.rankings} />
      <DynamicTable title="Alliance 聯盟團隊" data={data.alliance} />
      <DynamicTable title="Awards 獲獎清單" data={data.awards} />
    </main>
  );
}