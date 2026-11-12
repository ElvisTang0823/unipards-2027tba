'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import DashboardHeader from '../components/dashboard-header';
import { normalizeEventData, type EventData } from '../lib/event-data';

const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/your_gas_deploy_id/exec';
const CACHE_KEY = 'nks_event_cache_v1';
const LAST_FETCH_KEY = 'nks_event_last_fetch_v1';

const subscribeToCache = (onStoreChange: () => void) => {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', onStoreChange);
  return () => window.removeEventListener('storage', onStoreChange);
};

const getCachedSnapshot = () => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(CACHE_KEY);
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

const parseAllianceTeams = (allianceValue: string | undefined) => {
  if (!allianceValue) return [];
  return String(allianceValue)
    .split(/[\n,;|]/)
    .map((team) => team.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
};

export default function MatchDetailPage() {
  const params = useParams<{ matchId: string }>();
  const cachedSnapshot = useSyncExternalStore(subscribeToCache, getCachedSnapshot, () => null);
  const cachedData = useMemo(() => {
    if (!cachedSnapshot) return null;
    try {
      return normalizeEventData(JSON.parse(cachedSnapshot) as unknown);
    } catch {
      return null;
    }
  }, [cachedSnapshot]);
  const [fetchedData, setFetchedData] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const apiUrl = process.env.NEXT_PUBLIC_GAS_API_URL || DEFAULT_GAS_URL;
  const data = fetchedData ?? cachedData;

  useEffect(() => {
    if (cachedData) return;
    if (!apiUrl || apiUrl.includes('your_gas_deploy_id')) {
      return;
    }

    let active = true;
    const fetchData = async () => {
      try {
        const res = await fetch(apiUrl, { method: 'GET', redirect: 'follow' });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const payload = await res.json();
        const nextData = normalizeEventData(payload);
        if (!active) return;
        setFetchedData(nextData);
        writeCachedData(payload);
      } catch (err) {
        if (active) {
          console.error('Failed to fetch match detail data:', err);
          setErrorMsg('無法載入比賽詳細資訊。');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchData();
    return () => {
      active = false;
    };
  }, [apiUrl, cachedData]);

  const matchId = decodeURIComponent(String(params?.matchId ?? ''));

  const selectedMatch = useMemo(() => {
    if (!data?.matches.length) return null;
    return data.matches.find((match) => match.Match_Number.trim().toUpperCase() === matchId.trim().toUpperCase()) ?? null;
  }, [data, matchId]);

  if ((!apiUrl || apiUrl.includes('your_gas_deploy_id')) && !data) {
    return (
      <main className="dashboard-state">
        <div className="state-card state-error">
          <span className="state-kicker">資料來源尚未設定</span>
          <h1>無法載入比賽資訊</h1>
          <p>請先設定賽事資料來源，再查看比賽詳情。</p>
          <Link className="state-return" href="/">返回賽事總覽</Link>
        </div>
      </main>
    );
  }

  if (loading && !data) {
    return (
      <main className="dashboard-state">
        <div className="state-card"><span className="loading-mark" aria-hidden="true" /><p>正在載入比賽資訊...</p></div>
      </main>
    );
  }

  if (errorMsg && !data) {
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
