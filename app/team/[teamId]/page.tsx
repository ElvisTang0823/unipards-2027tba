'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import DashboardHeader from '../../components/dashboard-header';
import DataTable from '../../components/data-table';
import { normalizeEventData, type EventData, type EventRecord } from '../../lib/event-data';

const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/your_gas_deploy_id/exec';

const normalizeKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, '');

const getRecordValue = (record: EventRecord | undefined, candidates: string[]) => {
  if (!record) return undefined;
  const keys = new Set(candidates.map(normalizeKey));
  const entry = Object.entries(record).find(([candidate, value]) => (
    keys.has(normalizeKey(candidate)) && value !== undefined && value !== null && value !== ''
  ));
  return entry?.[1];
};

const getTeamNumber = (record: EventRecord) => {
  const value = getRecordValue(record, ['Team_Number', 'Team Number', 'Team', 'team_number', 'teamNumber', 'Team_ID', 'team_id', 'Team_Key']);
  const teamNumber = typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
  return teamNumber.match(/^(?:frc)?(\d+)$/i)?.[1] ?? '';
};

const includesTeam = (record: EventRecord, teamNumber: string) => {
  if (getTeamNumber(record) === teamNumber) return true;

  const allianceValues = Object.entries(record)
    .filter(([key]) => {
      const normalized = normalizeKey(key);
      return normalized.includes('team')
        || ((normalized.startsWith('red') || normalized.startsWith('blue')) && normalized.includes('alliance'));
    })
    .map(([, value]) => value);

  return allianceValues.some((value) => {
    const text = Array.isArray(value) ? value.join(' ') : String(value ?? '');
    const teamNumbers: string[] = text.match(/\d+/g) ?? [];
    return teamNumbers.includes(teamNumber);
  });
};

export default function TeamPage() {
  const params = useParams<{ teamId: string }>();
  const teamNumber = decodeURIComponent(String(params?.teamId ?? ''));
  const apiUrl = process.env.NEXT_PUBLIC_GAS_API_URL || DEFAULT_GAS_URL;
  const [data, setData] = useState<EventData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!apiUrl || apiUrl.includes('your_gas_deploy_id')) {
      return () => {
        active = false;
      };
    }

    const fetchData = async () => {
      try {
        const response = await fetch(apiUrl, { method: 'GET', redirect: 'follow' });
        if (!response.ok) throw new Error(`無法取得賽事資料（HTTP ${response.status}）。`);
        const payload: unknown = await response.json();
        if (active) {
          setData(normalizeEventData(payload));
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : '載入賽事資料時發生未知錯誤。');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchData();
    return () => {
      active = false;
    };
  }, [apiUrl]);

  const ranking = useMemo(
    () => data?.rankings.find((row) => getTeamNumber(row) === teamNumber),
    [data, teamNumber],
  );
  const matches = useMemo(
    () => data?.matches.filter((match) => includesTeam(match, teamNumber)) ?? [],
    [data, teamNumber],
  );
  const awards = useMemo(
    () => data?.awards.filter((award) => includesTeam(award, teamNumber)) ?? [],
    [data, teamNumber],
  );
  const alliances = useMemo(
    () => data?.alliance.filter((alliance) => includesTeam(alliance, teamNumber)) ?? [],
    [data, teamNumber],
  );
  const teamName = String(getRecordValue(ranking ?? {}, ['Team_Name', 'Team Name', 'Name', 'Nickname']) ?? '');
  const teamRank = getRecordValue(ranking ?? {}, ['Rank', 'Ranking', 'Position']);

  if ((!apiUrl || apiUrl.includes('your_gas_deploy_id')) && !data) {
    return (
      <main className="dashboard-state">
        <div className="state-card state-error">
          <span className="state-kicker">資料來源尚未設定</span>
          <h1>無法載入隊伍資料</h1>
          <p>請先設定賽事資料來源，再查看隊伍檔案。</p>
          <Link className="state-return" href="/">返回賽事總覽</Link>
        </div>
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="dashboard-state">
        <div className="state-card state-error">
          <span className="state-kicker">資料載入異常</span>
          <h1>無法載入隊伍資料</h1>
          <p>{error}</p>
          <Link className="state-return" href="/">返回賽事總覽</Link>
        </div>
      </main>
    );
  }

  if (loading || !data) {
    return (
      <main className="dashboard-state">
        <div className="state-card"><span className="loading-mark" aria-hidden="true" /><p>正在載入隊伍資料...</p></div>
      </main>
    );
  }

  return (
    <main className="dashboard-shell subpage-shell">
      <DashboardHeader active="team" />
      <div className="subpage-content team-page-content">
        <div className="match-page-heading team-page-heading">
          <div>
            <p className="panel-eyebrow">TEAM PROFILE · 隊伍檔案</p>
            <h1>#{teamNumber}</h1>
            {teamName && <p className="team-display-name">{teamName}</p>}
          </div>
          <Link className="back-link" href="/">← 返回賽事總覽</Link>
        </div>

        <section className="team-summary-grid" aria-label="隊伍賽事摘要">
          <article className="team-summary-card team-rank-card">
            <span>EVENT RANK · 目前排名</span>
            <strong>{teamRank === undefined ? '—' : `#${String(teamRank)}`}</strong>
            <small>{ranking ? '本屆累積排名' : '尚無排名資料'}</small>
          </article>
          <article className="team-summary-card">
            <span>MATCHES · 出賽場次</span>
            <strong>{matches.length}</strong>
            <small>隊伍參與的賽程</small>
          </article>
          <article className="team-summary-card">
            <span>AWARDS · 獲獎紀錄</span>
            <strong>{awards.length}</strong>
            <small>本屆已公布獎項</small>
          </article>
          <article className="team-summary-card">
            <span>ALLIANCES · 聯盟</span>
            <strong>{alliances.length}</strong>
            <small>參與的聯盟組別</small>
          </article>
        </section>

        <div className="section-intro team-section-intro">
          <div><p className="panel-eyebrow">PERFORMANCE</p><h2>隊伍表現</h2></div>
          <span><i className="sync-dot" /> LIVE DATA</span>
        </div>
        <div className="team-data-grid">
          {ranking ? (
            <DataTable title="目前排名" eyebrow="TEAM RANKING" data={[ranking]} />
          ) : (
            <section className="dashboard-panel">
              <div className="panel-heading"><div><p className="panel-eyebrow">TEAM RANKING</p><h2>目前排名</h2></div></div>
              <div className="table-empty">目前尚無此隊伍的排名資料</div>
            </section>
          )}
          {matches.length > 0 ? (
            <DataTable title="出賽紀錄" eyebrow="MATCH HISTORY" data={matches} linkMode="match" />
          ) : (
            <section className="dashboard-panel">
              <div className="panel-heading"><div><p className="panel-eyebrow">MATCH HISTORY</p><h2>出賽紀錄</h2></div></div>
              <div className="table-empty">目前尚無此隊伍的出賽紀錄</div>
            </section>
          )}
          {alliances.length > 0 && <DataTable title="所屬聯盟" eyebrow="ALLIANCES" data={alliances} />}
          {awards.length > 0 && <DataTable title="獲獎紀錄" eyebrow="AWARDS" data={awards} />}
        </div>
        <div className="subpage-return"><Link href="/">← 返回賽事總覽</Link><span>賽事資料每 5 秒同步</span></div>
      </div>
      <footer className="dashboard-footer"><span>NKS EVENT CONTROL</span><span>2027 · 南科模擬賽</span></footer>
    </main>
  );
}
