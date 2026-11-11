'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import DashboardHeader from './components/dashboard-header';

type DashboardData = {
  matches: Record<string, unknown>[];
  rankings: Record<string, unknown>[];
  alliance: Record<string, unknown>[];
  awards: Record<string, unknown>[];
  queue: Record<string, unknown>[];
};

function DynamicTable({ title, eyebrow, data }: { title: string; eyebrow: string; data: Record<string, unknown>[] }) {
  const headers = data?.length ? Object.keys(data[0]) : [];

  return (
    <section className="dashboard-panel">
      <div className="panel-heading">
        <div>
          <p className="panel-eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        <span className="panel-count">{data?.length ?? 0} 筆</span>
      </div>
      {headers.length === 0 ? (
        <div className="table-empty">目前尚無資料</div>
      ) : (
        <div className="table-scroll">
          <table className="dashboard-table">
            <thead>
              <tr>
                {headers.map((key) => <th key={key}>{key.replaceAll('_', ' ')}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr key={idx}>
                  {headers.map((key) => (
                    <td key={key}>
                      {typeof row[key] === 'object' && row[key] !== null
                        ? JSON.stringify(row[key])
                        : String(row[key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

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
    { label: '賽程場次', value: data.matches?.length ?? 0, unit: 'MATCHES', color: 'blue' },
    { label: '參賽隊伍', value: data.rankings?.length ?? 0, unit: 'TEAMS', color: 'violet' },
    { label: '聯盟組別', value: data.alliance?.length ?? 0, unit: 'ALLIANCES', color: 'orange' },
  ];

  return (
    <main className="dashboard-shell">
      <DashboardHeader active="overview" />

      <div className="dashboard-content">
        <section className="event-hero">
          <div className="hero-copy">
            <div className="event-label"><span className="live-dot" /> LIVE EVENT <span className="label-divider">/</span> 2027 NKS</div>
            <h1>南科模擬賽<br /><span>賽事控制台</span></h1>
            <p>即時掌握賽程、排名與現場叫號資訊。</p>
          </div>
          <div className="hero-watermark" aria-hidden="true">NKS</div>
          <div className="hero-footer">
            <span>FRC SCRIMMAGE · TAIWAN</span>
            <span className="sync-state"><span className="sync-dot" /> 每 5 秒自動更新</span>
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
                <div className="metric-label">{metric.label}</div>
              </div>
            </article>
          ))}
        </section>

        <section className="queue-overview">
          <div className="queue-title">
            <span className="queue-icon" aria-hidden="true">↗</span>
            <div>
              <p className="panel-eyebrow">PIT QUEUE</p>
              <h2>現場叫號</h2>
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
          <Link href="/queue" className="queue-link">完整叫號看板 <span aria-hidden="true">→</span></Link>
        </section>

        <div className="section-intro">
          <div>
            <p className="panel-eyebrow">EVENT DATA</p>
            <h2>賽事資料</h2>
          </div>
          <span>即時資料 · LIVE DATA</span>
        </div>

        <div className="data-grid">
          <DynamicTable title="賽程與成績" eyebrow="MATCH SCHEDULE" data={data.matches ?? []} />
          <DynamicTable title="累積排名" eyebrow="TEAM RANKINGS" data={data.rankings ?? []} />
          <DynamicTable title="聯盟團隊" eyebrow="ALLIANCES" data={data.alliance ?? []} />
          <DynamicTable title="獲獎清單" eyebrow="AWARDS" data={data.awards ?? []} />
        </div>
      </div>

      <footer className="dashboard-footer">
        <span>NKS EVENT CONTROL</span>
        <span>2027 · 南科模擬賽</span>
      </footer>
    </main>
  );
}
