'use client';

import { useEffect, useMemo, useState } from 'react';

type TabKey = 'results' | 'rankings' | 'awards' | 'teams' | 'insights' | 'media' | 'scouting';
type WinnerSide = 'Red' | 'Blue' | 'Tie';

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
  [key: string]: string | number;
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
  Red_Foul_Points?: number;
  Blue_Foul_Points?: number;
  Winner: WinnerSide;
  [key: string]: string | number | undefined;
}

interface AwardItem {
  award: string;
  winner: string;
  [key: string]: string;
}

interface ApiResponse {
  rankings: TeamRanking[];
  matches: MatchDetail[];
  awards?: AwardItem[];
}

const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/你的實際GAS_DEPLOY_ID/exec';
const tabs: { key: TabKey; label: string }[] = [
  { key: 'results', label: 'Results' },
  { key: 'rankings', label: 'Rankings' },
  { key: 'awards', label: 'Awards' },
  { key: 'teams', label: 'Teams' },
  { key: 'insights', label: 'Insights' },
  { key: 'media', label: 'Media' },
  { key: 'scouting', label: 'Scouting' },
];

const getValue = (record: Record<string, any> | null | undefined, keys: string[]) => {
  if (!record) return undefined;
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null && record[key] !== '') return record[key];
  }
  return undefined;
};

const toNumber = (value: any, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const toWinner = (value: any): WinnerSide => {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'red') return 'Red';
  if (normalized === 'blue') return 'Blue';
  return 'Tie';
};

const parseAllianceTeams = (allianceValue: string | undefined) =>
  (allianceValue || '')
    .split(',')
    .map((team) => team.trim())
    .filter(Boolean);

const normalizeMatch = (match: Record<string, any>): MatchDetail => {
  const redAlliance = String(getValue(match, ['Red_Alliance', 'red_alliance', 'Red Alliance']) ?? '');
  const blueAlliance = String(getValue(match, ['Blue_Alliance', 'blue_alliance', 'Blue Alliance']) ?? '');
  return {
    Match_Number: String(getValue(match, ['Match_Number', 'match_number', 'Match', 'match']) ?? 'N/A'),
    Red_Alliance: redAlliance,
    Blue_Alliance: blueAlliance,
    Red_Total_Score: toNumber(getValue(match, ['Red_Total_Score', 'red_total_score', 'Red_Score', 'red_score'])),
    Blue_Total_Score: toNumber(getValue(match, ['Blue_Total_Score', 'blue_total_score', 'Blue_Score', 'blue_score'])),
    Red_Auto_Score: toNumber(getValue(match, ['Red_Auto_Score', 'red_auto_score', 'Red_Auto', 'red_auto'])),
    Blue_Auto_Score: toNumber(getValue(match, ['Blue_Auto_Score', 'blue_auto_score', 'Blue_Auto', 'blue_auto'])),
    Red_Teleop_Score: toNumber(getValue(match, ['Red_Teleop_Score', 'red_teleop_score', 'Red_Teleop', 'red_teleop'])),
    Blue_Teleop_Score: toNumber(getValue(match, ['Blue_Teleop_Score', 'blue_teleop_score', 'Blue_Teleop', 'blue_teleop'])),
    Red_Endgame_Score: toNumber(getValue(match, ['Red_Endgame_Score', 'red_endgame_score', 'Red_Endgame', 'red_endgame'])),
    Blue_Endgame_Score: toNumber(getValue(match, ['Blue_Endgame_Score', 'blue_endgame_score', 'Blue_Endgame', 'blue_endgame'])),
    Red_Total_RP: toNumber(getValue(match, ['Red_Total_RP', 'red_total_rp', 'Red_RP', 'red_rp'])),
    Blue_Total_RP: toNumber(getValue(match, ['Blue_Total_RP', 'blue_total_rp', 'Blue_RP', 'blue_rp'])),
    Red_Foul_Points: toNumber(getValue(match, ['Red_Foul_Points', 'red_foul_points', 'Red_Foul', 'red_foul'])),
    Blue_Foul_Points: toNumber(getValue(match, ['Blue_Foul_Points', 'blue_foul_points', 'Blue_Foul', 'blue_foul'])),
    Winner: toWinner(getValue(match, ['Winner', 'winner'])),
    ...match,
  };
};

const normalizeRanking = (ranking: Record<string, any>): TeamRanking => ({
  Rank: toNumber(getValue(ranking, ['Rank', 'rank'])),
  Team: String(getValue(ranking, ['Team', 'team']) ?? 'TBD'),
  Total_RP: toNumber(getValue(ranking, ['Total_RP', 'total_rp', 'Total RP', 'totalRP'])),
  Avg_RP: toNumber(getValue(ranking, ['Avg_RP', 'avg_rp', 'Average_RP', 'average_rp'])),
  Record_W_L_T: String(getValue(ranking, ['Record_W_L_T', 'record_w_l_t', 'Record', 'record']) ?? '0-0-0'),
  Avg_Score: toNumber(getValue(ranking, ['Avg_Score', 'avg_score', 'Average_Score', 'average_score'])),
  Avg_Auto: toNumber(getValue(ranking, ['Avg_Auto', 'avg_auto', 'Average_Auto', 'average_auto'])),
  Avg_Teleop: toNumber(getValue(ranking, ['Avg_Teleop', 'avg_teleop', 'Average_Teleop', 'average_teleop'])),
  Avg_Endgame: toNumber(getValue(ranking, ['Avg_Endgame', 'avg_endgame', 'Average_Endgame', 'average_endgame'])),
  Played: toNumber(getValue(ranking, ['Played', 'played', 'Matches', 'match_count'])),
  ...ranking,
});

const normalizeAwards = (award: Record<string, any>): AwardItem => ({
  award: String(getValue(award, ['award', 'Award']) ?? 'Award'),
  winner: String(getValue(award, ['winner', 'Winner', 'team']) ?? 'TBD'),
  ...award,
});

const normalizeResponse = (raw: any): ApiResponse => {
  const rankings = Array.isArray(raw?.rankings) ? raw.rankings.map((item: Record<string, any>) => normalizeRanking(item)) : [];
  const matches = Array.isArray(raw?.matches) ? raw.matches.map((item: Record<string, any>) => normalizeMatch(item)) : [];
  const awards = Array.isArray(raw?.awards) ? raw.awards.map((item: Record<string, any>) => normalizeAwards(item)) : [];
  return { rankings, matches, awards };
};

export default function EventDashboard() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<TabKey>('results');
  const [selectedMatchNumber, setSelectedMatchNumber] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchData = async () => {
    const apiUrl = process.env.NEXT_PUBLIC_GAS_API_URL || DEFAULT_GAS_URL;
    if (!apiUrl || apiUrl.includes('你的實際GAS_DEPLOY_ID')) {
      const err = '未設定 API 網址，請確認環境變數 NEXT_PUBLIC_GAS_API_URL 或修改 page.tsx 中的 DEFAULT_GAS_URL。';
      console.error(err);
      setErrorMsg(err);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(apiUrl, { method: 'GET', redirect: 'follow' } as RequestInit);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      const json = normalizeResponse(await res.json());
      setData(json);
      setErrorMsg(null);
      if (!selectedMatchNumber && json.matches?.length) {
        setSelectedMatchNumber(json.matches[0].Match_Number);
      }
    } catch (err) {
      console.error('Failed to fetch data from GAS:', err);
      setErrorMsg('無法載入賽事數據，請檢查 GAS 部署權限或 API 網址是否正確。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!data?.matches?.length) return;
    if (!selectedMatchNumber || !data.matches.some((match) => match.Match_Number === selectedMatchNumber)) {
      setSelectedMatchNumber(data.matches[0].Match_Number);
    }
  }, [data, selectedMatchNumber]);

  const selectedMatch = useMemo(
    () => data?.matches.find((match) => match.Match_Number === selectedMatchNumber) ?? data?.matches[0] ?? null,
    [data, selectedMatchNumber],
  );

  const awardFallback = useMemo(
    () => [
      { award: 'Rookie All Star Award', winner: 'TBD' },
      { award: 'Excellence in Engineering Award', winner: 'TBD' },
      { award: 'Imagery Award', winner: 'TBD' },
      { award: 'Industrial Design Award', winner: 'TBD' },
      { award: 'Innovation in Control Award', winner: 'TBD' },
      { award: "Judges' Award", winner: 'TBD' },
      { award: 'Team Spirit Award', winner: 'TBD' },
    ],
    [],
  );

  const totalTeams = data?.rankings.length ?? 0;
  const totalMatches = data?.matches.length ?? 0;
  const maxScore = data?.matches.reduce((best, match) => Math.max(best, match.Red_Total_Score, match.Blue_Total_Score), 0) ?? 0;
  const topRankedTeam = data?.rankings[0]?.Team ?? 'TBD';

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white font-mono">
        <div className="text-xl animate-pulse">Loading Event Data...</div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-red-400 font-mono p-4 text-center">
        <div className="bg-slate-900 p-6 rounded-xl border border-red-900 max-w-lg shadow-2xl">
          <h2 className="text-xl font-bold mb-2">System Error</h2>
          <p className="text-sm text-slate-300">{errorMsg}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <header className="mb-6 border-b border-slate-800 pb-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">2026 Taiwan Double North Cup Playoffs</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-white md:text-4xl">
                <span className="bg-gradient-to-r from-red-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
                  FRC Event Dashboard
                </span>
              </h1>
              <p className="mt-2 text-sm text-slate-400">Event results, rankings, teams, and detailed match breakdowns.</p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-300">
              <div className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2">
                <div className="text-slate-500">Teams</div>
                <div className="text-lg font-bold text-white">{totalTeams}</div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2">
                <div className="text-slate-500">Matches</div>
                <div className="text-lg font-bold text-white">{totalMatches}</div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2">
                <div className="text-slate-500">Max Score</div>
                <div className="text-lg font-bold text-white">{maxScore}</div>
              </div>
            </div>
          </div>
        </header>

        <nav className="mb-6 overflow-x-auto">
          <div className="flex min-w-max gap-2 rounded-xl border border-slate-800 bg-slate-900 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                  activeTab === tab.key
                    ? 'bg-slate-800 text-white shadow-lg shadow-slate-950/40'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {tab.label}
                {tab.key === 'teams' ? (
                  <span className="ml-2 rounded-full bg-slate-700 px-1.5 py-0.5 text-[10px]">{totalTeams}</span>
                ) : null}
              </button>
            ))}
          </div>
        </nav>

        {activeTab === 'results' && (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_420px]">
            <section className="rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-slate-950/20">
              <div className="border-b border-slate-800 px-5 py-4">
                <h2 className="text-xl font-bold text-white">Qualification Results</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full table-fixed border-collapse text-left">
                  <thead className="bg-slate-800/70 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                    <tr>
                      <th className="w-12 px-3 py-3">Video</th>
                      <th className="w-28 px-3 py-3">Match</th>
                      <th colSpan={3} className="px-3 py-3 text-red-300">Red Alliance</th>
                      <th colSpan={3} className="px-3 py-3 text-blue-300">Blue Alliance</th>
                      <th className="w-24 px-3 py-3 text-center text-slate-300">Scores</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.matches.map((match) => {
                      const redTeams = parseAllianceTeams(match.Red_Alliance);
                      const blueTeams = parseAllianceTeams(match.Blue_Alliance);
                      const isWinnerRed = match.Winner === 'Red';
                      const isWinnerBlue = match.Winner === 'Blue';

                      return (
                        <tr
                          key={match.Match_Number}
                          onClick={() => setSelectedMatchNumber(match.Match_Number)}
                          className={`cursor-pointer border-t border-slate-800 transition hover:bg-slate-800/60 ${
                            selectedMatch?.Match_Number === match.Match_Number ? 'bg-slate-800/80' : ''
                          }`}
                        >
                          <td className="px-3 py-3 text-center text-slate-400">▶</td>
                          <td className="px-3 py-3 font-semibold text-slate-200">{match.Match_Number}</td>
                          <td className="px-2 py-2 text-red-200">{redTeams[0] ?? '-'}</td>
                          <td className="px-2 py-2 text-red-200">{redTeams[1] ?? '-'}</td>
                          <td className="px-2 py-2 text-red-200">{redTeams[2] ?? '-'}</td>
                          <td className="px-2 py-2 text-blue-200">{blueTeams[0] ?? '-'}</td>
                          <td className="px-2 py-2 text-blue-200">{blueTeams[1] ?? '-'}</td>
                          <td className="px-2 py-2 text-blue-200">{blueTeams[2] ?? '-'}</td>
                          <td className="px-3 py-3 text-center font-mono text-sm">
                            <span className={isWinnerRed ? 'font-black text-red-400' : 'text-slate-300'}>{match.Red_Total_Score}</span>
                            <span className="mx-2 text-slate-500">-</span>
                            <span className={isWinnerBlue ? 'font-black text-blue-400' : 'text-slate-300'}>{match.Blue_Total_Score}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <aside className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl shadow-slate-950/20">
              {selectedMatch ? (
                <>
                  <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Match Detail</p>
                      <h3 className="mt-1 text-2xl font-black text-white">{selectedMatch.Match_Number}</h3>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${
                        selectedMatch.Winner === 'Red'
                          ? 'bg-red-500/10 text-red-300'
                          : selectedMatch.Winner === 'Blue'
                            ? 'bg-blue-500/10 text-blue-300'
                            : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {selectedMatch.Winner === 'Tie' ? 'Tie' : `${selectedMatch.Winner} Win`}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-3">
                      <div className="text-[10px] uppercase tracking-[0.22em] text-red-300">Red Alliance</div>
                      <div className="mt-2 space-y-1 text-sm text-red-100">
                        {parseAllianceTeams(selectedMatch.Red_Alliance).map((team) => (
                          <div key={team}>{team}</div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-blue-900/50 bg-blue-950/30 p-3">
                      <div className="text-[10px] uppercase tracking-[0.22em] text-blue-300">Blue Alliance</div>
                      <div className="mt-2 space-y-1 text-sm text-blue-100">
                        {parseAllianceTeams(selectedMatch.Blue_Alliance).map((team) => (
                          <div key={team}>{team}</div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-center">
                      <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Auto</div>
                      <div className="mt-2 text-2xl font-black text-white">{selectedMatch.Red_Auto_Score} - {selectedMatch.Blue_Auto_Score}</div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-center">
                      <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Teleop</div>
                      <div className="mt-2 text-2xl font-black text-white">{selectedMatch.Red_Teleop_Score} - {selectedMatch.Blue_Teleop_Score}</div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-center">
                      <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Endgame</div>
                      <div className="mt-2 text-2xl font-black text-white">{selectedMatch.Red_Endgame_Score} - {selectedMatch.Blue_Endgame_Score}</div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-center">
                      <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Total</div>
                      <div className="mt-2 text-2xl font-black text-white">{selectedMatch.Red_Total_Score} - {selectedMatch.Blue_Total_Score}</div>
                    </div>
                  </div>

                  <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                    <h4 className="mb-3 text-sm font-bold uppercase tracking-[0.22em] text-slate-400">Match Breakdown</h4>
                    <div className="space-y-3 text-sm text-slate-200">
                      <div className="flex items-center justify-between">
                        <span>Red RP</span>
                        <span className="font-bold text-red-300">{selectedMatch.Red_Total_RP}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Blue RP</span>
                        <span className="font-bold text-blue-300">{selectedMatch.Blue_Total_RP}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Foul Points</span>
                        <span className="font-mono text-slate-200">
                          {selectedMatch.Red_Foul_Points ?? 0} - {selectedMatch.Blue_Foul_Points ?? 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex h-full items-center justify-center text-slate-400">Choose a match to view the detailed breakdown.</div>
              )}
            </aside>
          </div>
        )}

        {activeTab === 'rankings' && (
          <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-slate-950/20">
            <div className="border-b border-slate-800 px-5 py-4">
              <h2 className="text-xl font-bold text-white">Rankings</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left">
                <thead className="bg-slate-800/80 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Rank</th>
                    <th className="px-4 py-3">Team</th>
                    <th className="px-4 py-3">Total RP</th>
                    <th className="px-4 py-3">Avg RP</th>
                    <th className="px-4 py-3">W-L-T</th>
                    <th className="px-4 py-3">Avg Score</th>
                    <th className="px-4 py-3">Avg Auto</th>
                    <th className="px-4 py-3">Avg Teleop</th>
                    <th className="px-4 py-3">Avg End</th>
                    <th className="px-4 py-3">Played</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-slate-200">
                  {data?.rankings.map((team) => (
                    <tr key={team.Team} className="border-t border-slate-800 hover:bg-slate-800/60">
                      <td className="px-4 py-3 font-black text-amber-400">#{team.Rank}</td>
                      <td className="px-4 py-3 font-bold text-white">{team.Team}</td>
                      <td className="px-4 py-3">{team.Total_RP}</td>
                      <td className="px-4 py-3 text-emerald-400">{team.Avg_RP}</td>
                      <td className="px-4 py-3 text-slate-300">{team.Record_W_L_T}</td>
                      <td className="px-4 py-3">{team.Avg_Score}</td>
                      <td className="px-4 py-3 text-slate-400">{team.Avg_Auto}</td>
                      <td className="px-4 py-3 text-slate-400">{team.Avg_Teleop}</td>
                      <td className="px-4 py-3 text-slate-400">{team.Avg_Endgame}</td>
                      <td className="px-4 py-3 text-slate-500">{team.Played}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'awards' && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-slate-950/20">
            <div className="border-b border-slate-800 px-5 py-4">
              <h2 className="text-xl font-bold text-white">Awards</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left">
                <thead className="bg-slate-800/80 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Award</th>
                    <th className="px-4 py-3">Winner</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.awards?.length ? data.awards : awardFallback).map((award) => (
                    <tr key={award.award} className="border-t border-slate-800 text-sm text-slate-200">
                      <td className="px-4 py-3 font-medium">{award.award}</td>
                      <td className="px-4 py-3 text-white">{award.winner}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'teams' && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-slate-950/20">
            <div className="border-b border-slate-800 px-5 py-4">
              <h2 className="text-xl font-bold text-white">Teams</h2>
            </div>
            <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
              {data?.rankings.map((team) => (
                <div key={team.Team} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-lg font-black text-white">{team.Team}</span>
                    <span className="rounded-full bg-amber-500/15 px-2 py-1 text-xs font-bold text-amber-300">#{team.Rank}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
                    <div className="rounded-lg bg-slate-900 p-2"><span className="block text-slate-500">Avg RP</span>{team.Avg_RP}</div>
                    <div className="rounded-lg bg-slate-900 p-2"><span className="block text-slate-500">Record</span>{team.Record_W_L_T}</div>
                    <div className="rounded-lg bg-slate-900 p-2"><span className="block text-slate-500">Avg Score</span>{team.Avg_Score}</div>
                    <div className="rounded-lg bg-slate-900 p-2"><span className="block text-slate-500">Played</span>{team.Played}</div>
                    <div className="rounded-lg bg-slate-900 p-2"><span className="block text-slate-500">Auto</span>{team.Avg_Auto}</div>
                    <div className="rounded-lg bg-slate-900 p-2"><span className="block text-slate-500">Teleop</span>{team.Avg_Teleop}</div>
                    <div className="rounded-lg bg-slate-900 p-2"><span className="block text-slate-500">End</span>{team.Avg_Endgame}</div>
                    <div className="rounded-lg bg-slate-900 p-2"><span className="block text-slate-500">Total RP</span>{team.Total_RP}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'insights' && (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Event teams</div>
              <div className="mt-3 text-3xl font-black text-white">{totalTeams}</div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Matches</div>
              <div className="mt-3 text-3xl font-black text-white">{totalMatches}</div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Top score</div>
              <div className="mt-3 text-3xl font-black text-white">{maxScore}</div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Top ranked team</div>
              <div className="mt-3 text-xl font-black text-white">{topRankedTeam}</div>
            </div>
          </section>
        )}

        {(activeTab === 'media' || activeTab === 'scouting') && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400 shadow-2xl shadow-slate-950/20">
            <h2 className="text-xl font-bold text-white">{activeTab === 'media' ? 'Media' : 'Scouting'}</h2>
            <p className="mt-3 text-sm text-slate-300">
              {activeTab === 'media'
                ? '影片、照片與事件媒體內容將在這裡補上。'
                : '賽前分析、策略紀錄與 scouting 資料區可依需要擴充。'}
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
