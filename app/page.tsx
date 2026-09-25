'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

type TabKey = 'results' | 'rankings' | 'awards' | 'alliance';
type MatchFilter = 'all' | 'practice' | 'qualification' | 'playoff';
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
  Match_Type?: string;
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
  Red_Eliminated?: boolean;
  Blue_Eliminated?: boolean;
  [key: string]: string | number | boolean | undefined;
}

interface AwardItem {
  award: string;
  winner: string;
  [key: string]: string;
}

interface QueueState {
  current_match: string;
  on_field: string;
  queued: string;
  announcement: string;
}

interface AllianceGroup {
  name: string;
  members: string[];
}

interface ApiResponse {
  rankings: TeamRanking[];
  matches: MatchDetail[];
  awards: AwardItem[];
  queue: QueueState;
  alliances: AllianceGroup[];
}

const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/your_gas_deploy_id/exec';
const CACHE_KEY = 'nks_event_cache_v1';
const LAST_FETCH_KEY = 'nks_event_last_fetch_v1';
const FETCH_INTERVAL_MS = 5000;
const tabs: { key: TabKey; label: string }[] = [
  { key: 'results', label: 'Results' },
  { key: 'rankings', label: 'Rankings' },
  { key: 'awards', label: 'Awards' },
  { key: 'alliance', label: 'Alliance' },
];

const readCachedData = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeCachedData = (payload: unknown) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    window.localStorage.setItem(LAST_FETCH_KEY, String(Date.now()));
  } catch {
    // ignore cache storage failures
  }
};

const canFetchNow = () => {
  if (typeof window === 'undefined') return false;
  const now = Date.now();
  const lastFetchAt = Number(window.localStorage.getItem(LAST_FETCH_KEY) ?? '0');
  return now - lastFetchAt >= FETCH_INTERVAL_MS;
};

const getValue = (record: Record<string, any> | null | undefined, keys: string[]) => {
  if (!record) return undefined;
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null && record[key] !== '') return record[key];
  }
  return undefined;
};

const toNumber = (value: unknown, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const normalizeWinner = (value: unknown): WinnerSide => {
  const winner = String(value ?? '').trim().toLowerCase();
  if (winner === 'red') return 'Red';
  if (winner === 'blue') return 'Blue';
  return 'Tie';
};

const parseAllianceTeams = (allianceValue: string | undefined) => {
  if (!allianceValue) return [];
  return String(allianceValue)
    .split(/[\n,;|]/)
    .map((team) => team.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
};

const classifyMatchType = (matchNumber: string): MatchFilter => {
  const normalized = String(matchNumber ?? '').trim().toUpperCase();
  if (!normalized) return 'qualification';
  if (normalized.startsWith('PM') || normalized.startsWith('P')) return 'practice';
  if (normalized.startsWith('Q') || normalized.includes('QM') || normalized.includes('QUAL')) return 'qualification';
  if (normalized.startsWith('F') || normalized.includes('SF') || normalized.includes('QF') || normalized.includes('FINAL')) return 'playoff';
  return 'qualification';
};

const normalizeMatch = (match: Record<string, any>): MatchDetail => {
  const matchNumber = String(getValue(match, ['Match_Number', 'match_number', 'Match', 'match']) ?? 'N/A');
  return {
    Match_Number: matchNumber,
    Match_Type: String(getValue(match, ['Match_Type', 'match_type', 'Type', 'type']) ?? classifyMatchType(matchNumber)),
    Red_Alliance: String(getValue(match, ['Red_Alliance', 'red_alliance', 'Red Alliance']) ?? ''),
    Blue_Alliance: String(getValue(match, ['Blue_Alliance', 'blue_alliance', 'Blue Alliance']) ?? ''),
    Red_Total_Score: toNumber(getValue(match, ['Red_Total_Score', 'red_total_score', 'Red Score', 'Red_Score', 'red_score'])),
    Blue_Total_Score: toNumber(getValue(match, ['Blue_Total_Score', 'blue_total_score', 'Blue Score', 'Blue_Score', 'blue_score'])),
    Red_Auto_Score: toNumber(getValue(match, ['Red_Auto_Score', 'red_auto_score', 'Red Auto', 'Red_Auto', 'red_auto'])),
    Blue_Auto_Score: toNumber(getValue(match, ['Blue_Auto_Score', 'blue_auto_score', 'Blue Auto', 'Blue_Auto', 'blue_auto'])),
    Red_Teleop_Score: toNumber(getValue(match, ['Red_Teleop_Score', 'red_teleop_score', 'Red Teleop', 'Red_Teleop', 'red_teleop'])),
    Blue_Teleop_Score: toNumber(getValue(match, ['Blue_Teleop_Score', 'blue_teleop_score', 'Blue Teleop', 'Blue_Teleop', 'blue_teleop'])),
    Red_Endgame_Score: toNumber(getValue(match, ['Red_Endgame_Score', 'red_endgame_score', 'Red Endgame', 'Red_Endgame', 'red_endgame'])),
    Blue_Endgame_Score: toNumber(getValue(match, ['Blue_Endgame_Score', 'blue_endgame_score', 'Blue Endgame', 'Blue_Endgame', 'blue_endgame'])),
    Red_Total_RP: toNumber(getValue(match, ['Red_Total_RP', 'red_total_rp', 'Red RP', 'Red_RP', 'red_rp'])),
    Blue_Total_RP: toNumber(getValue(match, ['Blue_Total_RP', 'blue_total_rp', 'Blue RP', 'Blue_RP', 'blue_rp'])),
    Red_Foul_Points: toNumber(getValue(match, ['Red_Foul_Points', 'red_foul_points', 'Red Foul', 'Red_Foul_Pts', 'red_foul'])),
    Blue_Foul_Points: toNumber(getValue(match, ['Blue_Foul_Points', 'blue_foul_points', 'Blue Foul', 'Blue_Foul_Pts', 'blue_foul'])),
    Winner: normalizeWinner(getValue(match, ['Winner', 'winner'])),
    Red_Eliminated: Boolean(getValue(match, ['Red_Eliminated', 'red_eliminated', 'Red Eliminated'])),
    Blue_Eliminated: Boolean(getValue(match, ['Blue_Eliminated', 'blue_eliminated', 'Blue Eliminated'])),
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

const normalizeAward = (award: Record<string, any>): AwardItem => ({
  award: String(getValue(award, ['award', 'Award', 'name']) ?? 'Award'),
  winner: String(getValue(award, ['winner', 'Winner', 'team', 'Team']) ?? 'TBD'),
  ...award,
});

const normalizeQueue = (queue: Record<string, any> | null | undefined): QueueState => {
  if (!queue) {
    return { current_match: 'N/A', on_field: 'N/A', queued: 'N/A', announcement: 'N/A' };
  }
  return {
    current_match: String(getValue(queue, ['current_match', 'Current_Match', 'currentMatch']) ?? 'N/A'),
    on_field: String(getValue(queue, ['on_field', 'On_Field', 'onField']) ?? 'N/A'),
    queued: String(getValue(queue, ['queued', 'Queued', 'on_deck']) ?? 'N/A'),
    announcement: String(getValue(queue, ['announcement', 'Announcement']) ?? 'N/A'),
  };
};

const normalizeAlliance = (item: Record<string, any>): AllianceGroup => {
  const name = String(getValue(item, ['name', 'Alliance', 'alliance']) ?? 'Alliance');
  const membersArray = Array.isArray(item?.members)
    ? item.members
    : [
        getValue(item, ['member1', 'Team1', 'team1']),
        getValue(item, ['member2', 'Team2', 'team2']),
        getValue(item, ['member3', 'Team3', 'team3']),
      ];

  return {
    name,
    members: (membersArray as any[])
      .map((team) => String(team ?? '').trim())
      .filter(Boolean),
  };
};

const normalizeResponse = (raw: any): ApiResponse => {
  const rankings = Array.isArray(raw?.rankings) ? raw.rankings.map((item: Record<string, any>) => normalizeRanking(item)) : [];
  const matches = Array.isArray(raw?.matches) ? raw.matches.map((item: Record<string, any>) => normalizeMatch(item)) : [];
  const awards = Array.isArray(raw?.awards) ? raw.awards.map((item: Record<string, any>) => normalizeAward(item)) : [];
  const rawQueue = Array.isArray(raw?.queue) && raw.queue.length > 0 ? raw.queue[0] : raw?.queue;
  const rawAlliances = Array.isArray(raw?.alliances) ? raw.alliances : Array.isArray(raw?.alliance) ? raw.alliance : [];

  return {
    rankings,
    matches,
    awards,
    queue: normalizeQueue(rawQueue),
    alliances: rawAlliances.map((item: Record<string, any>) => normalizeAlliance(item)),
  };
};

export default function EventDashboard() {
  const router = useRouter();
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('results');
  const [activeFilter, setActiveFilter] = useState<MatchFilter>('all');
  const [selectedMatchNumber, setSelectedMatchNumber] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const lastFetchRef = useRef<number>(0);

  useEffect(() => {
    const syncTabFromHash = () => {
      if (typeof window === 'undefined') return;
      const hash = window.location.hash.replace('#', '').trim();
      if (hash === 'results' || hash === 'rankings' || hash === 'awards' || hash === 'alliance') {
        setActiveTab(hash as TabKey);
      }
    };

    syncTabFromHash();
    if (typeof window !== 'undefined') {
      window.addEventListener('hashchange', syncTabFromHash);
      return () => window.removeEventListener('hashchange', syncTabFromHash);
    }
    return undefined;
  }, []);

  useEffect(() => {
    const cached = readCachedData();
    if (cached) {
      const normalized = normalizeResponse(cached);
      setData(normalized);
      setLoading(false);
      if (normalized.matches.length > 0 && !selectedMatchNumber) {
        setSelectedMatchNumber(normalized.matches[0].Match_Number);
      }
    }

    const apiUrl = process.env.NEXT_PUBLIC_GAS_API_URL || DEFAULT_GAS_URL;
    if (!apiUrl || apiUrl.includes('your_gas_deploy_id')) {
      if (!cached) {
        setErrorMsg('未設定 NEXT_PUBLIC_GAS_API_URL，請先設定 GAS 連結。');
        setLoading(false);
      }
      return;
    }

    const fetchData = async () => {
      if (!canFetchNow()) {
        return;
      }

      const now = Date.now();
      if (now - lastFetchRef.current < FETCH_INTERVAL_MS) {
        return;
      }
      lastFetchRef.current = now;

      try {
        const res = await fetch(apiUrl, { method: 'GET', redirect: 'follow' });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const payload = await res.json();
        const normalized = normalizeResponse(payload);
        setData(normalized);
        writeCachedData(payload);
        setErrorMsg(null);
        if (!selectedMatchNumber && normalized.matches.length > 0) {
          setSelectedMatchNumber(normalized.matches[0].Match_Number);
        }
      } catch (err) {
        console.error('Failed to fetch data from GAS:', err);
        if (!cached) {
          setErrorMsg('無法載入賽事數據，請確認 GAS 部署網址與權限。');
        }
      } finally {
        if (!cached) {
          setLoading(false);
        }
      }
    };

    fetchData();
    const interval = setInterval(() => {
      fetchData();
    }, FETCH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [selectedMatchNumber]);

  useEffect(() => {
    if (!data?.matches.length) return;
    if (!selectedMatchNumber || !data.matches.some((match) => match.Match_Number === selectedMatchNumber)) {
      setSelectedMatchNumber(data.matches[0].Match_Number);
    }
  }, [data, selectedMatchNumber]);

  const selectedMatch = useMemo(
    () => data?.matches.find((match) => match.Match_Number === selectedMatchNumber) ?? data?.matches[0] ?? null,
    [data, selectedMatchNumber],
  );

  const filteredMatches = useMemo(() => {
    if (!data?.matches.length) return [];
    return data.matches.filter((match) => {
      if (activeFilter === 'all') return true;
      return classifyMatchType(match.Match_Number) === activeFilter;
    });
  }, [data, activeFilter]);

  const awardFallback = [
    { award: 'Rookie All Star Award', winner: 'TBD' },
    { award: 'Excellence in Engineering Award', winner: 'TBD' },
    { award: 'Imagery Award', winner: 'TBD' },
    { award: 'Industrial Design Award', winner: 'TBD' },
    { award: 'Innovation in Control Award', winner: 'TBD' },
    { award: "Judges' Award", winner: 'TBD' },
    { award: 'Team Spirit Award', winner: 'TBD' },
  ];

  const handleTabChange = (nextTab: TabKey) => {
    setActiveTab(nextTab);
    if (typeof window !== 'undefined') {
      window.location.hash = nextTab;
    }
  };

  const handleMatchOpen = (matchNumber: string) => {
    router.push(`/${encodeURIComponent(matchNumber)}`);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-xl font-semibold tracking-[0.25em] text-slate-300">Loading...</div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 p-6 text-center text-red-300">
        <div className="max-w-lg rounded-2xl border border-red-900 bg-slate-900 p-6 shadow-2xl">
          <h2 className="mb-2 text-xl font-bold">System Error</h2>
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
              <p className="text-xs uppercase tracking-[0.32em] text-slate-400">2026 Taiwan Double North Cup Playoffs</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-white md:text-4xl">
                <span className="bg-gradient-to-r from-red-500 via-violet-500 to-blue-500 bg-clip-text text-transparent">
                  FRC Event Dashboard
                </span>
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/queue"
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-sky-500 hover:text-white"
              >
                Queuing
              </Link>
            </div>
          </div>
        </header>

        <nav className="mb-6">
          <div className="flex min-w-max gap-2 rounded-xl border border-slate-800 bg-slate-900 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab.key ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {activeTab === 'results' && (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_420px]">
            <section className="rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-slate-950/20">
              <div className="flex flex-col gap-3 border-b border-slate-800 px-5 py-4 md:flex-row md:items-center md:justify-between">
                <h2 className="text-xl font-bold text-white">Results</h2>
                <div className="flex items-center gap-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Filter</label>
                  <select
                    value={activeFilter}
                    onChange={(event) => setActiveFilter(event.target.value as MatchFilter)}
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none"
                  >
                    <option value="all">All</option>
                    <option value="practice">Practice</option>
                    <option value="qualification">Qualification</option>
                    <option value="playoff">Playoff</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full table-fixed border-collapse text-left">
                  <thead className="bg-slate-800/70 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                    <tr>
                      <th className="w-20 px-3 py-3">Match</th>
                      <th className="px-3 py-3 text-red-300">Red Alliance</th>
                      <th className="px-3 py-3 text-blue-300">Blue Alliance</th>
                      <th className="w-28 px-3 py-3 text-center">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMatches.map((match) => {
                      const redTeams = parseAllianceTeams(match.Red_Alliance);
                      const blueTeams = parseAllianceTeams(match.Blue_Alliance);

                      return (
                        <tr
                          key={match.Match_Number}
                          onClick={() => setSelectedMatchNumber(match.Match_Number)}
                          className={`cursor-pointer border-t border-slate-800 transition hover:bg-slate-800/60 ${
                            selectedMatch?.Match_Number === match.Match_Number ? 'bg-slate-800/80' : ''
                          }`}
                        >
                          <td className="px-3 py-3 font-semibold text-slate-200">{match.Match_Number}</td>
                          <td className="px-3 py-3 text-red-200">
                            <div className="space-y-1">
                              {redTeams.length ? redTeams.map((team) => (
                                <div key={`${match.Match_Number}-red-${team}`} className={Boolean(match.Red_Eliminated) ? 'line-through opacity-70' : ''}>{team}</div>
                              )) : <span className="text-slate-500">-</span>}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-blue-200">
                            <div className="space-y-1">
                              {blueTeams.length ? blueTeams.map((team) => (
                                <div key={`${match.Match_Number}-blue-${team}`} className={Boolean(match.Blue_Eliminated) ? 'line-through opacity-70' : ''}>{team}</div>
                              )) : <span className="text-slate-500">-</span>}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center font-mono text-sm">
                            <span className={match.Winner === 'Red' ? 'font-black text-red-300' : 'text-slate-300'}>{match.Red_Total_Score}</span>
                            <span className="mx-2 text-slate-500">-</span>
                            <span className={match.Winner === 'Blue' ? 'font-black text-blue-300' : 'text-slate-300'}>{match.Blue_Total_Score}</span>
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
                    <div className="rounded-xl border border-red-900/60 bg-red-950/30 p-3">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-red-300">Red</div>
                      <div className="mt-2 space-y-1 text-sm text-red-100">
                        {parseAllianceTeams(selectedMatch.Red_Alliance).map((team) => (
                          <div key={team}>{team}</div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-blue-900/60 bg-blue-950/30 p-3">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-blue-300">Blue</div>
                      <div className="mt-2 space-y-1 text-sm text-blue-100">
                        {parseAllianceTeams(selectedMatch.Blue_Alliance).map((team) => (
                          <div key={team}>{team}</div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-center">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Auto</div>
                      <div className="mt-2 text-2xl font-black text-white">{selectedMatch.Red_Auto_Score} - {selectedMatch.Blue_Auto_Score}</div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-center">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Teleop</div>
                      <div className="mt-2 text-2xl font-black text-white">{selectedMatch.Red_Teleop_Score} - {selectedMatch.Blue_Teleop_Score}</div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-center">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Endgame</div>
                      <div className="mt-2 text-2xl font-black text-white">{selectedMatch.Red_Endgame_Score} - {selectedMatch.Blue_Endgame_Score}</div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-center">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Total</div>
                      <div className="mt-2 text-2xl font-black text-white">{selectedMatch.Red_Total_Score} - {selectedMatch.Blue_Total_Score}</div>
                    </div>
                  </div>

                  <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                    <h4 className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-slate-400">Game Breakdown</h4>
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

                  <button
                    type="button"
                    onClick={() => handleMatchOpen(selectedMatch.Match_Number)}
                    className="mt-5 w-full rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-sky-500"
                  >
                    Open Match Details
                  </button>
                </>
              ) : (
                <div className="text-slate-400">No match selected.</div>
              )}
            </aside>
          </div>
        )}

        {activeTab === 'rankings' && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl shadow-slate-950/20">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Rankings</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead className="bg-slate-800/70 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                  <tr>
                    <th className="px-3 py-3">Rank</th>
                    <th className="px-3 py-3">Team</th>
                    <th className="px-3 py-3">Record</th>
                    <th className="px-3 py-3">Avg RP</th>
                    <th className="px-3 py-3">Avg Score</th>
                    <th className="px-3 py-3">Avg Auto</th>
                    <th className="px-3 py-3">Avg Teleop</th>
                    <th className="px-3 py-3">Avg Endgame</th>
                    <th className="px-3 py-3">Played</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.rankings.map((team) => (
                    <tr key={team.Team} className="border-t border-slate-800 text-slate-100 hover:bg-slate-800/40">
                      <td className="px-3 py-3 font-bold text-white">#{team.Rank}</td>
                      <td className="px-3 py-3 font-semibold text-sky-300">{team.Team}</td>
                      <td className="px-3 py-3">{team.Record_W_L_T}</td>
                      <td className="px-3 py-3">{team.Avg_RP}</td>
                      <td className="px-3 py-3">{team.Avg_Score}</td>
                      <td className="px-3 py-3">{team.Avg_Auto}</td>
                      <td className="px-3 py-3">{team.Avg_Teleop}</td>
                      <td className="px-3 py-3">{team.Avg_Endgame}</td>
                      <td className="px-3 py-3">{team.Played}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'awards' && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl shadow-slate-950/20">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Awards</h2>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {(data?.awards && data.awards.length > 0 ? data.awards : awardFallback).map((award) => (
                <div key={`${award.award}-${award.winner}`} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Award</div>
                  <div className="mt-2 text-lg font-bold text-white">{award.award}</div>
                  <div className="mt-3 text-sm text-slate-300">
                    Winner: <span className="font-semibold text-sky-300">{award.winner}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'alliance' && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl shadow-slate-950/20">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Alliance Bracket</h2>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {(data?.alliances && data.alliances.length > 0 ? data.alliances : []).map((alliance) => (
                <div key={alliance.name} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                  <div className="mb-3 text-[11px] uppercase tracking-[0.24em] text-slate-500">Alliance</div>
                  <div className="text-xl font-black text-white">{alliance.name}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {alliance.members.length > 0 ? (
                      alliance.members.map((team) => (
                        <span key={`${alliance.name}-${team}`} className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-sm text-sky-300">
                          {team}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-500">No teams assigned.</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
