'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';

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
    current_match: String(getValue(queue, ['current_match', 'Current Match', 'Current_Match', 'currentMatch', 'CurrentMatch']) ?? 'N/A'),
    on_field: String(getValue(queue, ['on_field', 'On Field', 'On_Field', 'onField', 'OnField']) ?? 'N/A'),
    queued: String(getValue(queue, ['queued', 'QueuedMatches', 'Queued Matches', 'Queued', 'queuedMatches']) ?? 'N/A'),
    announcement: String(getValue(queue, ['announcement', 'AnnouncementMessage', 'Announcement Message', 'Announcement', 'announcementMessage']) ?? 'N/A'),
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
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_GAS_API_URL || DEFAULT_GAS_URL;
    if (!apiUrl || apiUrl.includes('your_gas_deploy_id')) {
      setErrorMsg('未設定 NEXT_PUBLIC_GAS_API_URL，請先設定 GAS 連結。');
      setLoading(false);
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
        setErrorMsg('無法載入賽事數據，請確認 GAS 部署網址與權限。');
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, []);

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

  const allianceBracketRounds = useMemo(() => {
    const baseNames = (data?.alliances ?? []).map((alliance) => alliance.name).filter(Boolean);
    if (baseNames.length === 0) return [];

    const normalizedNames = [...baseNames];
    while ((normalizedNames.length & (normalizedNames.length - 1)) !== 0) {
      normalizedNames.push('TBD');
    }

    const rounds: Array<Array<{ left: string; right: string }>> = [];
    let current = [...normalizedNames];

    while (current.length > 1) {
      const nextRound: Array<{ left: string; right: string }> = [];
      for (let i = 0; i < current.length; i += 2) {
        nextRound.push({
          left: current[i] ?? 'TBD',
          right: current[i + 1] ?? 'TBD',
        });
      }
      rounds.push(nextRound);
      current = Array.from({ length: nextRound.length }, (_, index) => `Winner ${index + 1}`);
    }

    return rounds;
  }, [data?.alliances]);

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
              <p className="text-xs uppercase tracking-[0.32em] text-slate-400">2027 Nanke PreSeason</p>
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
                <thead className="bg-slate-800/70 text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  <tr>
                    <th className="w-[14%] px-2 py-3">Match</th>
                    <th className="w-[38%] px-2 py-3 text-red-300">Red Alliance</th>
                    <th className="w-[38%] px-2 py-3 text-blue-300">Blue Alliance</th>
                    <th className="w-[10%] px-2 py-3 text-center">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const groups = filteredMatches.reduce<Record<string, typeof filteredMatches>>((acc, match) => {
                      const key = classifyMatchType(match.Match_Number);
                      const label = key === 'practice' ? 'Practice' : key === 'playoff' ? 'Playoffs' : 'Qualifications';
                      acc[label] = acc[label] ?? [];
                      acc[label].push(match);
                      return acc;
                    }, {});

                    return Object.entries(groups).map(([label, matches]) => (
                      <Fragment key={label}>
                        <tr className="border-t border-slate-800 bg-slate-800/50">
                          <td colSpan={4} className="px-3 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-200">
                            {label}
                          </td>
                        </tr>
                        {matches.map((match) => {
                          const redTeams = parseAllianceTeams(match.Red_Alliance);
                          const blueTeams = parseAllianceTeams(match.Blue_Alliance);
                          const matchLabel = match.Match_Number.replace(/^QM|^Q|^PM|^P|^SF|^F/i, '').trim();
                          const displayMatch = (() => {
                            const raw = String(match.Match_Number ?? '').toUpperCase();
                            if (raw.startsWith('PM') || raw.startsWith('P')) return `Practice ${matchLabel || '1'}`;
                            if (raw.startsWith('F') || raw.includes('SF') || raw.includes('QF')) return `Playoff ${matchLabel || '1'}`;
                            return `Quals ${matchLabel || '1'}`;
                          })();

                          return (
                            <tr
                              key={match.Match_Number}
                              onClick={() => handleMatchOpen(match.Match_Number)}
                              className="cursor-pointer border-t border-slate-800 transition hover:bg-slate-800/60"
                            >
                              <td className="px-2 py-2 align-middle">
                                <div className="flex items-center gap-2 whitespace-nowrap">
                                  <span className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-600 bg-slate-800 text-[8px] text-slate-300">
                                    ○
                                  </span>
                                  <span className="text-xs font-semibold text-white">{displayMatch}</span>
                                </div>
                              </td>
                              <td className="px-2 py-2 align-middle text-red-200">
                                <div className="flex min-w-0 flex-wrap items-center gap-1 text-[11px]">
                                  {redTeams.length ? redTeams.map((team) => (
                                    <span
                                      key={`${match.Match_Number}-red-${team}`}
                                      className={`inline-flex items-center rounded border px-1.5 py-0.5 ${Boolean(match.Red_Eliminated) ? 'border-red-700/80 bg-red-900/40 text-red-200 line-through opacity-70' : 'border-red-700/60 bg-red-900/20 text-red-100'}`}
                                    >
                                      {team}
                                    </span>
                                  )) : <span className="text-slate-500">-</span>}
                                </div>
                              </td>
                              <td className="px-2 py-2 align-middle text-blue-200">
                                <div className="flex min-w-0 flex-wrap items-center gap-1 text-[11px]">
                                  {blueTeams.length ? blueTeams.map((team) => (
                                    <span
                                      key={`${match.Match_Number}-blue-${team}`}
                                      className={`inline-flex items-center rounded border px-1.5 py-0.5 ${Boolean(match.Blue_Eliminated) ? 'border-blue-700/80 bg-blue-900/40 text-blue-200 line-through opacity-70' : 'border-blue-700/60 bg-blue-900/20 text-blue-100'}`}
                                    >
                                      {team}
                                    </span>
                                  )) : <span className="text-slate-500">-</span>}
                                </div>
                              </td>
                              <td className="px-2 py-2 align-middle text-center font-mono text-xs">
                                <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                                  <span className={match.Winner === 'Red' ? 'font-black text-red-300' : 'text-slate-300'}>{match.Red_Total_Score}</span>
                                  <span className="text-slate-500">-</span>
                                  <span className={match.Winner === 'Blue' ? 'font-black text-blue-300' : 'text-slate-300'}>{match.Blue_Total_Score}</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </Fragment>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </section>
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

            {data?.awards && data.awards.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {data.awards.map((award) => (
                  <div key={`${award.award}-${award.winner}`} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Award</div>
                    <div className="mt-2 text-lg font-bold text-white">{award.award}</div>
                    <div className="mt-3 text-sm text-slate-300">
                      Winner: <span className="font-semibold text-sky-300">{award.winner}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-6 text-center text-slate-400">
                No award data available from the backend.
              </div>
            )}
          </section>
        )}

        {activeTab === 'alliance' && (
          <section className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl shadow-slate-950/20">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Alliance Bracket</h2>
            </div>

            {data?.alliances && data.alliances.length > 0 ? (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-left text-sm">
                    <thead className="bg-slate-800/70 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                      <tr>
                        <th className="w-28 px-3 py-3">Alliance</th>
                        <th className="px-3 py-3">Teams</th>
                        <th className="w-28 px-3 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.alliances.map((alliance, index) => (
                        <tr key={`${alliance.name}-${index}`} className="border-t border-slate-800 text-slate-100">
                          <td className="px-3 py-3 font-bold text-white">{alliance.name}</td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-2">
                              {alliance.members.length > 0 ? (
                                alliance.members.map((team) => (
                                  <span key={`${alliance.name}-${team}`} className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-sky-300">
                                    {team}
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-500">No teams assigned.</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-sky-300">{alliance.members.length > 0 ? 'Ready' : 'TBD'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                  <div className="mb-4 text-[11px] uppercase tracking-[0.2em] text-slate-500">Bracket</div>
                  <div className="overflow-x-auto pb-2">
                    <div className="flex min-w-[780px] items-stretch gap-6">
                      {allianceBracketRounds.length > 0 ? (
                        allianceBracketRounds.map((round, roundIndex) => (
                          <div key={`round-${roundIndex}`} className="flex min-w-[170px] flex-1 flex-col justify-center gap-6">
                            <div className="text-center text-[10px] uppercase tracking-[0.2em] text-slate-400">
                              {roundIndex === allianceBracketRounds.length - 1 ? 'Finals' : `Round ${roundIndex + 1}`}
                            </div>

                            <div className="relative flex flex-col gap-5">
                              {round.map((match, matchIndex) => (
                                <div key={`match-${roundIndex}-${matchIndex}`} className="relative flex items-center">
                                  <div className="w-full rounded-xl border border-slate-700 bg-slate-900/80 p-2 shadow-sm shadow-slate-950/30">
                                    <div className="mb-2 border-b border-slate-700 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300">
                                      {match.left}
                                    </div>
                                    <div className="text-[12px] font-semibold text-slate-200">
                                      {match.right}
                                    </div>
                                  </div>

                                  {roundIndex < allianceBracketRounds.length - 1 && (
                                    <div className="pointer-events-none absolute -right-5 top-1/2 h-px w-5 -translate-y-1/2 bg-slate-600" />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-slate-500">No bracket data available.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/50 p-6 text-center text-slate-400">
                No alliance data available from the backend.
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
