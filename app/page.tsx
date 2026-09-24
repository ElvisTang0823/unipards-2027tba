'use client';

import { useState, useEffect } from 'react';

// 定義 GAS API 回傳的資料型別
interface TeamRanking {
  Rank: number;
  Team: string;
  Total_RP: number;
  Avg_RP: number;
  Record_W_L_T: string;
  Avg_Score: number;
  Avg_Auto: number;
  Avg_Teleop: number;
  Avg_Endgame: number;
  Played: number;
}

interface MatchDetail {
  Match_Number: string;
  Red_Alliance: string;
  Blue_Alliance: string;
  Red_Total_Score: number;
  Blue_Total_Score: number;
  Red_Auto_Score: number;
  Blue_Auto_Score: number;
  Red_Teleop_Score: number;
  Blue_Teleop_Score: number;
  Red_Endgame_Score: number;
  Blue_Endgame_Score: number;
  Red_Total_RP: number;
  Blue_Total_RP: number;
  Winner: 'Red' | 'Blue' | 'Tie';
}

interface ApiResponse {
  rankings: TeamRanking[];
  matches: MatchDetail[];
}

// 替換為你的 GAS Web App 部署網址 (務必為 Web App URL)
const GAS_API_URL = process.env.GAS_WEB_APP_URL;

export default function EventDashboard() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'rankings' | 'matches'>('rankings');

  // 自動拉取資料函數
  const fetchData = async () => {
    try {
      const res = await fetch(GAS_API_URL, {
        method: 'GET',
        redirect: 'follow', // 確保跟隨 GAS 的 302 重導向
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const json: ApiResponse = await res.json();
      setData(json);
    } catch (err) {
      console.error('Failed to fetch data from GAS:', err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
    // 設定每 15 秒自動刷新一次戰績
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white font-mono">
        <div className="text-xl animate-pulse">Loading Event Data...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      {/* 標頭 */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center mb-8 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-red-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
            FRC Event Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">Real-time Competition Insights & Match Breakdown</p>
        </div>
        
        {/* 切換 Tab */}
        <div className="flex gap-2 mt-4 md:mt-0 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('rankings')}
            className={`px-4 py-2 rounded-md font-semibold text-sm transition-all ${
              activeTab === 'rankings' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Rankings
          </button>
          <button
            onClick={() => setActiveTab('matches')}
            className={`px-4 py-2 rounded-md font-semibold text-sm transition-all ${
              activeTab === 'matches' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Matches
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto">
        {/* TAB 1: 隊伍排行榜 */}
        {activeTab === 'rankings' && (
          <div className="overflow-x-auto bg-slate-900 rounded-xl border border-slate-800 shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/80 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-700">
                  <th className="p-4">Rank</th>
                  <th className="p-4">Team</th>
                  <th className="p-4">Avg RP</th>
                  <th className="p-4">Total RP</th>
                  <th className="p-4">W-L-T</th>
                  <th className="p-4">Avg Score</th>
                  <th className="p-4">Avg Auto</th>
                  <th className="p-4">Avg Teleop</th>
                  <th className="p-4">Avg End</th>
                  <th className="p-4">Played</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm font-mono">
                {data?.rankings.map((team) => (
                  <tr key={team.Team} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-4 font-bold text-amber-400">#{team.Rank}</td>
                    <td className="p-4 font-bold text-white text-base">{team.Team}</td>
                    <td className="p-4 text-emerald-400 font-bold">{team.Avg_RP}</td>
                    <td className="p-4">{team.Total_RP}</td>
                    <td className="p-4 text-slate-300">{team.Record_W_L_T}</td>
                    <td className="p-4">{team.Avg_Score}</td>
                    <td className="p-4 text-slate-400">{team.Avg_Auto}</td>
                    <td className="p-4 text-slate-400">{team.Avg_Teleop}</td>
                    <td className="p-4 text-slate-400">{team.Avg_Endgame}</td>
                    <td className="p-4 text-slate-500">{team.Played}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: 單場數據 Breakdown */}
        {activeTab === 'matches' && (
          <div className="grid grid-cols-1 gap-4">
            {data?.matches.map((match) => (
              <div key={match.Match_Number} className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                  {match.Match_Number}
                </div>

                {/* 對決看板 */}
                <div className="grid grid-cols-11 gap-2 items-center text-center font-mono">
                  {/* 紅盟 */}
                  <div className="col-span-4 bg-red-950/40 border border-red-900/50 p-3 rounded-lg text-left">
                    <div className="text-red-400 font-bold text-lg mb-1">{match.Red_Alliance}</div>
                    <div className="text-xs text-slate-400 space-y-1">
                      <div>Auto: <span className="text-slate-200">{match.Red_Auto_Score}</span></div>
                      <div>Teleop: <span className="text-slate-200">{match.Red_Teleop_Score}</span></div>
                      <div>Endgame: <span className="text-slate-200">{match.Red_Endgame_Score}</span></div>
                    </div>
                  </div>

                  {/* 比分與 RP */}
                  <div className="col-span-3 flex flex-col items-center justify-center">
                    <div className="flex items-center gap-3 text-2xl font-black">
                      <span className={match.Winner === 'Red' ? 'text-red-500 text-3xl' : 'text-slate-400'}>
                        {match.Red_Total_Score}
                      </span>
                      <span className="text-slate-600 text-sm">VS</span>
                      <span className={match.Winner === 'Blue' ? 'text-blue-500 text-3xl' : 'text-slate-400'}>
                        {match.Blue_Total_Score}
                      </span>
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-slate-400">
                      <span>+{match.Red_Total_RP} RP</span>
                      <span>+{match.Blue_Total_RP} RP</span>
                    </div>
                  </div>

                  {/* 藍盟 */}
                  <div className="col-span-4 bg-blue-950/40 border border-blue-900/50 p-3 rounded-lg text-right">
                    <div className="text-blue-400 font-bold text-lg mb-1">{match.Blue_Alliance}</div>
                    <div className="text-xs text-slate-400 space-y-1">
                      <div>Auto: <span className="text-slate-200">{match.Blue_Auto_Score}</span></div>
                      <div>Teleop: <span className="text-slate-200">{match.Blue_Teleop_Score}</span></div>
                      <div>Endgame: <span className="text-slate-200">{match.Blue_Endgame_Score}</span></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}