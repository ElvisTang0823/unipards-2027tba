'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import DashboardHeader from '../components/dashboard-header';

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
    .map((team) => team.match(/\d+/)?.[0] ?? team.replace(/\s+/g, ' ').trim())
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
    return (
      <main className="dashboard-state">
        <div className="state-card"><span className="loading-mark" aria-hidden="true" /><p>正在載入比賽資訊...</p></div>
      </main>
    );
  }

  if (errorMsg) {
    return (
      <main className="dashboard-state">
        <div className="state-card state-error">
          <span className="state-kicker">資料載入異常</span>
          <h1>無法載入比賽資訊</h1>
          <p>{errorMsg}</p>
          <Link className="state-return" href="/">返回賽事總覽</Link>
        </div>
      </main>
    );
  }

  if (!selectedMatch) {
    return (
      <main className="dashboard-state">
        <div className="state-card state-error">
          <span className="state-kicker">MATCH NOT FOUND</span>
          <h1>找不到這場比賽</h1>
          <p>請確認賽程編號，或返回賽事總覽重新選擇。</p>
          <Link className="state-return" href="/">返回賽事總覽</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard-shell subpage-shell">
      <DashboardHeader active="match" />
      <div className="subpage-content match-page-content">
        <div className="match-page-heading">
          <div>
            <p className="panel-eyebrow">MATCH DETAILS · 賽事詳情</p>
            <h1>{selectedMatch.Match_Number}</h1>
          </div>
          <Link className="back-link" href="/">← 返回賽事總覽</Link>
        </div>

        <section className={`match-scoreboard winner-${selectedMatch.Winner.toLowerCase()}`} aria-label="比賽總分">
          <div className="scoreboard-team scoreboard-red">
            <span>RED ALLIANCE</span>
            <strong>{selectedMatch.Red_Total_Score}</strong>
          </div>
          <div className="scoreboard-center">
            <span className="scoreboard-result">{selectedMatch.Winner === 'Tie' ? 'TIE GAME' : `${selectedMatch.Winner.toUpperCase()} WINS`}</span>
            <span className="scoreboard-divider">VS</span>
          </div>
          <div className="scoreboard-team scoreboard-blue">
            <span>BLUE ALLIANCE</span>
            <strong>{selectedMatch.Blue_Total_Score}</strong>
          </div>
        </section>

        <section className="match-alliance-grid" aria-label="參賽聯盟">
          <article className="alliance-card alliance-red">
            <div className="alliance-heading"><span className="alliance-dot" /><div><p>RED ALLIANCE</p><h2>紅方聯盟</h2></div></div>
            <div className="alliance-teams">
              {parseAllianceTeams(selectedMatch.Red_Alliance).length
                ? parseAllianceTeams(selectedMatch.Red_Alliance).map((team) => /^\d+$/.test(team)
                  ? <Link className="team-chip team-chip-link" href={`/team/${encodeURIComponent(team)}`} key={team}>{team}<span aria-hidden="true">↗</span></Link>
                  : <span className="team-chip" key={team}>{team}</span>)
                : <span className="team-empty">尚無隊伍資料</span>}
            </div>
          </article>
          <article className="alliance-card alliance-blue">
            <div className="alliance-heading"><span className="alliance-dot" /><div><p>BLUE ALLIANCE</p><h2>藍方聯盟</h2></div></div>
            <div className="alliance-teams">
              {parseAllianceTeams(selectedMatch.Blue_Alliance).length
                ? parseAllianceTeams(selectedMatch.Blue_Alliance).map((team) => /^\d+$/.test(team)
                  ? <Link className="team-chip team-chip-link" href={`/team/${encodeURIComponent(team)}`} key={team}>{team}<span aria-hidden="true">↗</span></Link>
                  : <span className="team-chip" key={team}>{team}</span>)
                : <span className="team-empty">尚無隊伍資料</span>}
            </div>
          </article>
        </section>

        <section className="match-breakdown-section">
          <div className="section-intro">
            <div><p className="panel-eyebrow">SCORE BREAKDOWN</p><h2>分項得分</h2></div>
            <span>RED — BLUE</span>
          </div>
          <div className="score-breakdown-grid">
            {[
              { label: 'AUTO', title: '自動階段', red: selectedMatch.Red_Auto_Score, blue: selectedMatch.Blue_Auto_Score },
              { label: 'TELEOP', title: '操作階段', red: selectedMatch.Red_Teleop_Score, blue: selectedMatch.Blue_Teleop_Score },
              { label: 'ENDGAME', title: '結束階段', red: selectedMatch.Red_Endgame_Score, blue: selectedMatch.Blue_Endgame_Score },
              { label: 'TOTAL', title: '總分', red: selectedMatch.Red_Total_Score, blue: selectedMatch.Blue_Total_Score },
            ].map((score) => (
              <article className={`score-breakdown-card${score.label === 'TOTAL' ? ' score-breakdown-total' : ''}`} key={score.label}>
                <span>{score.label}</span>
                <h3>{score.title}</h3>
                <div className="score-pair"><strong className="score-red">{score.red}</strong><i>—</i><strong className="score-blue">{score.blue}</strong></div>
              </article>
            ))}
          </div>
        </section>

        <section className="dashboard-panel match-result-panel">
          <div className="panel-heading"><div><p className="panel-eyebrow">MATCH RESULT</p><h2>比賽結果與排名積分</h2></div></div>
          <div className="match-result-grid">
            <div className="result-stat"><span>勝方</span><strong>{selectedMatch.Winner === 'Tie' ? '平手' : `${selectedMatch.Winner} Alliance`}</strong></div>
            <div className="result-stat result-stat-red"><span>紅方排名積分 <small>RED RP</small></span><strong>{selectedMatch.Red_Total_RP}</strong></div>
            <div className="result-stat result-stat-blue"><span>藍方排名積分 <small>BLUE RP</small></span><strong>{selectedMatch.Blue_Total_RP}</strong></div>
          </div>
        </section>
        <div className="subpage-return"><Link href="/">← 返回賽事總覽</Link><span>賽事數據即時同步</span></div>
      </div>
      <footer className="dashboard-footer"><span>NKS EVENT CONTROL</span><span>2027 · 南科模擬賽</span></footer>
    </main>
  );
}
