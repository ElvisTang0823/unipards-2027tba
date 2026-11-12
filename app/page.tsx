'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import DashboardHeader from './components/dashboard-header';
import DataTable from './components/data-table';

type DashboardData = {
  matches: Record<string, unknown>[];
  rankings: Record<string, unknown>[];
  alliance: Record<string, unknown>[];
  awards: Record<string, unknown>[];
  queue: Record<string, unknown>[];
};

export default function MiniTBAHome() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_CLIENT_API_KEY;
        const res = await fetch('/api/status', {
          headers: { 'x-client-key': apiKey || '' },
        });

        if (!res.ok) {
          if (res.status === 401) throw new Error('401 Unauthorized: 金鑰不正確');
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const json: DashboardData = await res.json();
        setData(json);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : '發生未知錯誤');
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <main className="dashboard-state">
        <div className="state-card state-error">
          <span className="state-kicker">連線異常</span>
          <h1>無法載入賽事資料</h1>
          <p>{error}</p>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="dashboard-state">
        <div className="state-card">
          <span className="loading-mark" aria-hidden="true" />
          <p>正在同步賽事資料...</p>
        </div>
      </main>
    );
  }

  const queue = data.queue?.[0];
  const metrics = [
    { label: '賽程場次', value: data.matches?.length ?? 0, unit: 'MATCHES', color: 'blue', note: '賽程總數' },
    { label: '參賽隊伍', value: data.rankings?.length ?? 0, unit: 'TEAMS', color: 'violet', note: '競賽隊伍' },
    { label: '聯盟組別', value: data.alliance?.length ?? 0, unit: 'ALLIANCES', color: 'orange', note: '已編組聯盟' },
  ];

  return (
    <main className="dashboard-shell">
      <DashboardHeader active="overview" />

      <div className="dashboard-content">
        <section className="event-hero">
          <div className="hero-copy">
            <div className="event-label"><span className="live-dot" /> 2027 SEASON <span className="label-divider">/</span> TAIWAN</div>
            <h1>為下一場<br /><span>全力以赴。</span></h1>
            <p>南科模擬賽即時數據中心，賽程、排名與場邊資訊一站掌握。</p>
            <div className="hero-actions">
              <a className="hero-primary-action" href="#event-data">瀏覽賽事數據 <span aria-hidden="true">↘</span></a>
              <Link className="hero-secondary-action" href="/queue">現場叫號 <span aria-hidden="true">→</span></Link>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="art-orbit art-orbit-outer" />
            <div className="art-orbit art-orbit-inner" />
            <div className="art-field">
              <span className="field-center" />
              <span className="field-line field-line-horizontal" />
              <span className="field-line field-line-vertical" />
              <span className="field-zone field-zone-red" />
              <span className="field-zone field-zone-blue" />
              <span className="field-robot field-robot-one" />
              <span className="field-robot field-robot-two" />
              <span className="field-robot field-robot-three" />
            </div>
            <span className="art-coordinate art-coordinate-top">FRC · 2027</span>
            <span className="art-coordinate art-coordinate-bottom">22°59&apos;N / 120°16&apos;E</span>
          </div>
          <div className="hero-footer">
            <span><span className="hero-footer-mark">N</span> NKS · SOUTHERN TAIWAN</span>
            <span className="sync-state"><span className="sync-dot" /> LIVE DATA <i /> 每 5 秒更新</span>
          </div>
        </section>

        <section className="metric-grid" aria-label="賽事統計">
          {metrics.map((metric, index) => (
            <article key={metric.label} className={`metric-card metric-${metric.color}`}>
              <div className="metric-topline">
                <span className="metric-index">0{index + 1}</span>
                <span className="metric-unit">{metric.unit}</span>
              </div>
              <div className="metric-bottom">
                <div className="metric-value">{metric.value}</div>
                <div className="metric-description"><div className="metric-label">{metric.label}</div><span>{metric.note}</span></div>
              </div>
              <span className="metric-sparkline" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></span>
            </article>
          ))}
        </section>

        <section className="queue-overview">
          <div className="queue-title">
            <span className="queue-icon" aria-hidden="true"><span /></span>
            <div>
              <p className="panel-eyebrow">PIT LANE · LIVE</p>
              <h2>場邊即時動態</h2>
            </div>
          </div>
          {queue ? (
            <div className="queue-stats">
              <div className="queue-stat">
                <span>目前賽次 <small>CURRENT MATCH</small></span>
                <strong>{String(queue['Current Match'] ?? '-')}</strong>
              </div>
              <div className="queue-stat">
                <span>場上進行中 <small>ON FIELD</small></span>
                <strong className="queue-blue">{String(queue['On Field'] ?? '-')}</strong>
              </div>
              <div className="queue-stat">
                <span>預備區報到 <small>ON DECK</small></span>
                <strong className="queue-orange">{String(queue['QueuedMatches'] ?? '-')}</strong>
              </div>
            </div>
          ) : (
            <p className="queue-empty">目前沒有待公告的叫號資訊</p>
          )}
          <Link href="/queue" className="queue-link">開啟叫號看板 <span aria-hidden="true">↗</span></Link>
        </section>

        <div className="section-intro" id="event-data">
          <div>
            <p className="panel-eyebrow">THE NUMBERS BEHIND THE MATCH</p>
            <h2>賽事數據 <span>01—04</span></h2>
            <p className="section-helper">點擊場次或隊伍編號，查看比賽詳情與隊伍檔案。</p>
          </div>
          <span><i className="sync-dot" /> LIVE DATA · 每 5 秒更新</span>
        </div>

        <div className="data-grid">
          <DataTable title="賽程與成績" eyebrow="MATCH SCHEDULE" data={data.matches ?? []} linkMode="match" />
          <DataTable title="累積排名" eyebrow="TEAM RANKINGS" data={data.rankings ?? []} linkMode="team" />
          <DataTable title="聯盟團隊" eyebrow="ALLIANCES" data={data.alliance ?? []} linkMode="team" />
          <DataTable title="獲獎清單" eyebrow="AWARDS" data={data.awards ?? []} linkMode="team" />
        </div>
      </div>

      <footer className="dashboard-footer">
        <span>NKS EVENT CONTROL</span>
        <span>2027 · 南科模擬賽</span>
      </footer>
    </main>
  );
}
