'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type WinnerSide = 'Red' | 'Blue' | 'Tie';

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
  [key: string]: string | number | boolean | undefined;
}

interface ApiResponse {
  rankings: any[];
  matches: MatchDetail[];
  awards: any[];
  queue: any;
  alliances: any[];
}

const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/your_gas_deploy_id/exec';
const CACHE_KEY = 'nks_event_cache_v1';
const LAST_FETCH_KEY = 'nks_event_last_fetch_v1';
const FETCH_INTERVAL_MS = 5000;

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
    // ignore storage errors
  }
};

const canFetchNow = () => {
  if (typeof window === 'undefined') return false;
  const lastFetchAt = Number(window.localStorage.getItem(LAST_FETCH_KEY) ?? '0');
  return Date.now() - lastFetchAt >= FETCH_INTERVAL_MS;
};

const getValue = (record: Record<string, any> | undefined | null, keys: string[]) => {
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

const normalizeMatch = (match: Record<string, any>): MatchDetail => {
  const matchNumber = String(getValue(match, ['Match_Number', 'match_number', 'Match', 'match']) ?? 'N/A');
  return {
    Match_Number: matchNumber,
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
    ...match,
  };
};

export default function MatchDetailPage() {
  const params = useParams<{ matchId: string }>();
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const cached = readCachedData();
    if (cached) {
      const matches = Array.isArray(cached?.matches) ? cached.matches.map((item: Record<string, any>) => normalizeMatch(item)) : [];
      setData({
        rankings: Array.isArray(cached?.rankings) ? cached.rankings : [],
        matches,
        awards: Array.isArray(cached?.awards) ? cached.awards : [],
        queue: cached?.queue ?? {},
        alliances: Array.isArray(cached?.alliances) ? cached.alliances : [],
      });
      setLoading(false);
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_GAS_API_URL || DEFAULT_GAS_URL;
    if (!apiUrl || apiUrl.includes('your_gas_deploy_id')) {
      setErrorMsg('未設定 NEXT_PUBLIC_GAS_API_URL，請設定 GAS 網址後再查看 match 詳細頁。');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      if (!canFetchNow()) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(apiUrl, { method: 'GET', redirect: 'follow' });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const payload = await res.json();
        const matches = Array.isArray(payload?.matches) ? payload.matches.map((item: Record<string, any>) => normalizeMatch(item)) : [];
        const nextData = {
          rankings: Array.isArray(payload?.rankings) ? payload.rankings : [],
          matches,
          awards: Array.isArray(payload?.awards) ? payload.awards : [],
          queue: payload?.queue ?? {},
          alliances: Array.isArray(payload?.alliances) ? payload.alliances : [],
        };
        setData(nextData);
        writeCachedData(payload);
      } catch (err) {
        console.error('Failed to fetch match detail data:', err);
        setErrorMsg('無法載入比賽詳細資訊。');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const matchId = decodeURIComponent(String(params?.matchId ?? ''));

  const selectedMatch = useMemo(() => {
    if (!data?.matches.length) return null;
    return data.matches.find((match) => match.Match_Number.toUpperCase() === matchId.toUpperCase()) ?? data.matches[0];
  }, [data, matchId]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">Loading...</div>;
  }

  if (errorMsg) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-center text-red-300">{errorMsg}</div>;
  }

  if (!selectedMatch) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 p-6 text-center text-slate-200">
        <h1 className="text-2xl font-black">Match not found</h1>
        <Link href="/" className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white">Back to dashboard</Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Match Details</p>
            <h1 className="mt-2 text-3xl font-black text-white">{selectedMatch.Match_Number}</h1>
          </div>
          <Link href="/" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-sky-500 hover:text-white">
            Back to Dashboard
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-red-900/60 bg-red-950/30 p-5">
            <div className="mb-3 text-[11px] uppercase tracking-[0.22em] text-red-300">Red Alliance</div>
            <div className="space-y-1 text-lg font-semibold text-red-100">
              {parseAllianceTeams(selectedMatch.Red_Alliance).map((team) => (
                <div key={team}>{team}</div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-blue-900/60 bg-blue-950/30 p-5">
            <div className="mb-3 text-[11px] uppercase tracking-[0.22em] text-blue-300">Blue Alliance</div>
            <div className="space-y-1 text-lg font-semibold text-blue-100">
              {parseAllianceTeams(selectedMatch.Blue_Alliance).map((team) => (
                <div key={team}>{team}</div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-center">
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Auto</div>
            <div className="mt-2 text-2xl font-black text-white">{selectedMatch.Red_Auto_Score} - {selectedMatch.Blue_Auto_Score}</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-center">
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Teleop</div>
            <div className="mt-2 text-2xl font-black text-white">{selectedMatch.Red_Teleop_Score} - {selectedMatch.Blue_Teleop_Score}</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-center">
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Endgame</div>
            <div className="mt-2 text-2xl font-black text-white">{selectedMatch.Red_Endgame_Score} - {selectedMatch.Blue_Endgame_Score}</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-center">
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Total</div>
            <div className="mt-2 text-2xl font-black text-white">{selectedMatch.Red_Total_Score} - {selectedMatch.Blue_Total_Score}</div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 text-[11px] uppercase tracking-[0.22em] text-slate-500">Breakdown</div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="text-sm text-slate-400">Winner</div>
              <div className="mt-2 text-xl font-black text-white">{selectedMatch.Winner}</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="text-sm text-slate-400">Red RP</div>
              <div className="mt-2 text-xl font-black text-red-300">{selectedMatch.Red_Total_RP}</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="text-sm text-slate-400">Blue RP</div>
              <div className="mt-2 text-xl font-black text-blue-300">{selectedMatch.Blue_Total_RP}</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
