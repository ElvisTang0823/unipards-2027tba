'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import DashboardHeader from './components/dashboard-header';
import DataTable from './components/data-table';
import { normalizeEventData, type EventData } from './lib/event-data';

export default function MiniTBAHome() {
  const [data, setData] = useState<EventData | null>(null);
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

        const json: unknown = await res.json();
        setData(normalizeEventData(json));
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
  const currentMatch = String(queue?.['On Field'] ?? queue?.['Current Match'] ?? '');
  const featuredMatch = data.matches.find(
    (match) => match.Match_Number.toLowerCase() === currentMatch.trim().toLowerCase(),
  );
  const metrics = [
    { label: '賽程場次', value: data.matches.length },
    { label: '參賽隊伍', value: data.rankings.length },
    { label: '聯盟組別', value: data.alliance.length },
  ];

  return (
    <main className="dashboard-shell">
      <DashboardHeader active="overview" />

      <div className="dashboard-content">
        <section className="event-hero">
          <div className="hero-copy">
            <div className="event-label"><span className="live-dot" /> 官方賽事資訊 <span className="label-divider">/</span> 2027 FRC</div>
            <h1>南科模擬賽<span className="hero-title-year">2027</span></h1>
            <p>賽程、成績與隊伍排名，即時更新。</p>
            <div className="hero-actions">
              <a className="hero-primary-action" href="#event-data">查看賽事數據 <span aria-hidden="true">↓</span></a>
              <Link className="hero-secondary-action" href="/queue">現場叫號 <span aria-hidden="true">→</span></Link>
            </div>
          </div>
          <aside className="hero-event-panel" aria-label="即時賽況">
            <div className="hero-panel-heading">
              <span className="panel-live-mark"><i /> LIVE</span>
              <span>賽事即時資訊</span>
            </div>
            <div className="hero-current-match">
              <span>場上進行中 <small>ON FIELD</small></span>
              <strong>{String(queue?.['On Field'] ?? '—')}</strong>
            </div>
            {featuredMatch && (
              <div className="hero-score-line">
                <span><i className="score-dot score-dot-red" /> RED</span>
                <strong>{featuredMatch.Red_Total_Score}</strong>
                <b>—</b>
                <strong>{featuredMatch.Blue_Total_Score}</strong>
                <span><i className="score-dot score-dot-blue" /> BLUE</span>
              </div>
            )}
          </aside>
          <div className="hero-footer">
            <span>2027 · 南科模擬賽</span>
            <span className="sync-state"><span className="sync-dot" /> 資料每 5 秒更新</span>
          </div>
        </section>

        <section className="event-overview-strip" aria-label="賽事概況">
          <section className="metric-grid" aria-label="賽事統計">
            {metrics.map((metric) => (
              <article key={metric.label} className="metric-card">
                <div className="metric-bottom">
                  <div className="metric-value">{metric.value}</div>
                  <div className="metric-description"><div className="metric-label">{metric.label}</div></div>
                </div>
              </article>
            ))}
          </section>

          <section className="queue-overview" aria-label="叫號資訊">
            <div className="queue-title">
              <p className="panel-eyebrow">LIVE QUEUE</p>
              <h2>場邊即時動態</h2>
            </div>
            {queue ? (
              <div className="queue-stats">
                <div className="queue-stat">
                  <span>目前賽次 <small>CURRENT MATCH</small></span>
                  <strong>{String(queue['Current Match'] ?? '-')}</strong>
                </div>
                <div className="queue-stat">
                  <span>預備區報到 <small>ON DECK</small></span>
                  <strong className="queue-orange">{String(queue['QueuedMatches'] ?? '-')}</strong>
                </div>
              </div>
            ) : (
              <p className="queue-empty">目前沒有待公告的叫號資訊</p>
            )}
            <Link href="/queue" className="queue-link">查看叫號 <span aria-hidden="true">↗</span></Link>
          </section>
        </section>

        <div className="section-intro" id="event-data">
          <div>
            <p className="panel-eyebrow">THE NUMBERS BEHIND THE MATCH</p>
            <h2>賽事數據 <span>01—04</span></h2>
            <p className="section-helper">點擊場次或隊伍編號，查看比賽詳情與隊伍檔案。</p>
          </div>
          <span><i className="sync-dot" /> LIVE DATA · 每 5 秒更新</span>
        </div>

        <div className="data-grid home-data-grid">
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
