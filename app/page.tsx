'use client';

import { useEffect, useState } from 'react';

interface Match {
  match_key: string;
  red: string[];
  blue: string[];
  red_score: number;
  blue_score: number;
}

interface Ranking {
  rank: number;
  team: string;
  rp: number;
  tiebreaker: number;
  played: number;
}

interface Queuing {
  current_match: string;
  on_field: string;
  queued: string;
  announcement: string;
}

export default function Home() {
  const [data, setData] = useState<{ matches: Match[]; rankings: Ranking[]; queuing: Queuing } | null>(null);
  const [tab, setTab] = useState<'matches' | 'rankings' | 'nexus'>('nexus');

  // 每 5 秒自動向 Vercel 快取代理抓取最新賽事資料
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/status');
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error('Fetch error:', err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); // 5 秒 Polling
    return () => clearInterval(interval);
  }, []);

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center text-2xl font-bold">
        載入 Mini-TBA 賽事資料中...
      </div>
    );
  }

  const { matches, rankings, queuing } = data;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      {/* 頁籤切換 Bar */}
      <header className="max-w-6xl mx-auto flex flex-wrap justify-between items-center mb-8 pb-4 border-b border-slate-800">
        <h1 className="text-3xl font-black tracking-wider text-red-500">MINI-TBA</h1>
        <div className="flex space-x-2 mt-4 sm:mt-0">
          <button
            onClick={() => setTab('nexus')}
            className={`px-4 py-2 rounded-lg font-bold transition ${
              tab === 'nexus' ? 'bg-red-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            📢 Nexus 叫號看板
          </button>
          <button
            onClick={() => setTab('matches')}
            className={`px-4 py-2 rounded-lg font-bold transition ${
              tab === 'matches' ? 'bg-blue-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            🏆 比分與賽程
          </button>
          <button
            onClick={() => setTab('rankings')}
            className={`px-4 py-2 rounded-lg font-bold transition ${
              tab === 'rankings' ? 'bg-amber-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            📊 隊伍排名
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto">
        {/* ================= 廣播跑馬燈 ================= */}
        {queuing?.announcement && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 p-4 rounded-xl mb-8 flex items-center space-x-3 animate-pulse">
            <span className="text-2xl">📢</span>
            <div className="font-bold text-lg">{queuing.announcement}</div>
          </div>
        )}

        {/* ================= TAB 1: NEXUS 叫號看板 ================= */}
        {tab === 'nexus' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-2xl">
              <span className="text-slate-400 uppercase tracking-widest font-bold text-sm mb-2">NOW ON FIELD (比賽中)</span>
              <div className="text-7xl font-black text-emerald-400 my-4">{queuing?.on_field || 'None'}</div>
              <p className="text-slate-500 text-sm">請現場觀眾與隊伍預備</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-2xl">
              <span className="text-slate-400 uppercase tracking-widest font-bold text-sm mb-2">ON DECK / QUEUING (預備區報到)</span>
              <div className="text-6xl font-black text-amber-400 my-4">{queuing?.queued || 'None'}</div>
              <p className="text-amber-500/80 font-medium text-sm">請上述賽次之隊伍儘速前往 Queueing Area</p>
            </div>
          </div>
        )}

        {/* ================= TAB 2: 比分與賽程 ================= */}
        {tab === 'matches' && (
          <div className="space-y-4">
            {matches.length === 0 ? (
              <p className="text-slate-500 text-center py-12">尚無比賽數據</p>
            ) : (
              matches.map((m) => (
                <div key={m.match_key} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="font-bold text-xl text-slate-300 min-w-[80px]">{m.match_key}</div>

                  {/* Alliance Teams */}
                  <div className="flex-1 grid grid-cols-2 gap-4 w-full md:w-auto">
                    {/* Red Alliance */}
                    <div className="bg-red-950/40 border border-red-800/40 rounded-lg p-3 text-center">
                      <div className="text-xs text-red-400 font-bold mb-1">RED ALLIANCE</div>
                      <div className="font-mono text-lg font-bold text-red-200">{m.red.filter(Boolean).join(' - ')}</div>
                    </div>
                    {/* Blue Alliance */}
                    <div className="bg-blue-950/40 border border-blue-800/40 rounded-lg p-3 text-center">
                      <div className="text-xs text-blue-400 font-bold mb-1">BLUE ALLIANCE</div>
                      <div className="font-mono text-lg font-bold text-blue-200">{m.blue.filter(Boolean).join(' - ')}</div>
                    </div>
                  </div>

                  {/* Scores */}
                  <div className="flex items-center space-x-3 font-mono text-2xl font-black px-4 py-2 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-red-500">{m.red_score}</span>
                    <span className="text-slate-600">:</span>
                    <span className="text-blue-500">{m.blue_score}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ================= TAB 3: 隊伍排名 ================= */}
        {tab === 'rankings' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/50 text-slate-400 text-sm">
                  <th className="p-4">Rank</th>
                  <th className="p-4">Team</th>
                  <th className="p-4">RP (Ranking Points)</th>
                  <th className="p-4">Tiebreaker</th>
                  <th className="p-4">Played</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {rankings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">尚無排名資料</td>
                  </tr>
                ) : (
                  rankings.map((r) => (
                    <tr key={r.team} className="hover:bg-slate-800/30 transition">
                      <td className="p-4 font-bold text-amber-400">#{r.rank}</td>
                      <td className="p-4 font-bold text-white text-lg">{r.team}</td>
                      <td className="p-4 text-emerald-400 font-bold">{r.rp}</td>
                      <td className="p-4 text-slate-400">{r.tiebreaker}</td>
                      <td className="p-4 text-slate-400">{r.played}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}