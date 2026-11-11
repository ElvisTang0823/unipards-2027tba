'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import DashboardHeader from '../components/dashboard-header';

interface QueueState {
  current_match: string;
  on_field: string;
  queued: string;
  announcement: string;
}

const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/your_gas_deploy_id/exec';
const CACHE_KEY = 'nks_queue_cache_v1';
const LAST_FETCH_KEY = 'nks_queue_last_fetch_v1';
const FETCH_INTERVAL_MS = 5000;

const getValue = (record: Record<string, any> | undefined | null, keys: string[]) => {
  if (!record) return undefined;
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null && record[key] !== '') return record[key];
  }
  return undefined;
};

const readCachedQueue = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeCachedQueue = (payload: unknown) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    window.localStorage.setItem(LAST_FETCH_KEY, String(Date.now()));
  } catch {
    // ignore storage errors
  }
};

const canFetchQueueNow = () => {
  if (typeof window === 'undefined') return false;
  const lastFetchAt = Number(window.localStorage.getItem(LAST_FETCH_KEY) ?? '0');
  return Date.now() - lastFetchAt >= FETCH_INTERVAL_MS;
};

export default function QueuePage() {
  const [queue, setQueue] = useState<QueueState>({
    current_match: 'N/A',
    on_field: 'N/A',
    queued: 'N/A',
    announcement: 'N/A',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = readCachedQueue();
    if (cached) {
      const queueValue = Array.isArray(cached?.queue) && cached.queue.length > 0 ? cached.queue[0] : cached?.queue ?? {};
      setQueue({
        current_match: String(getValue(queueValue, ['current_match', 'Current Match', 'Current_Match', 'currentMatch', 'CurrentMatch']) ?? 'N/A'),
        on_field: String(getValue(queueValue, ['on_field', 'On Field', 'On_Field', 'onField', 'OnField']) ?? 'N/A'),
        queued: String(getValue(queueValue, ['queued', 'QueuedMatches', 'Queued Matches', 'Queued', 'queuedMatches']) ?? 'N/A'),
        announcement: String(getValue(queueValue, ['announcement', 'AnnouncementMessage', 'Announcement Message', 'Announcement', 'announcementMessage']) ?? 'N/A'),
      });
      setLoading(false);
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_GAS_API_URL || DEFAULT_GAS_URL;
    if (!apiUrl || apiUrl.includes('your_gas_deploy_id')) {
      setLoading(false);
      return;
    }

    const fetchQueue = async () => {
      if (!canFetchQueueNow()) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(apiUrl, { method: 'GET', redirect: 'follow' });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const payload = await res.json();
        const queueValue = Array.isArray(payload?.queue) && payload.queue.length > 0 ? payload.queue[0] : payload?.queue ?? {};
        const nextQueue = {
          current_match: String(getValue(queueValue, ['current_match', 'Current Match', 'Current_Match', 'currentMatch', 'CurrentMatch']) ?? 'N/A'),
          on_field: String(getValue(queueValue, ['on_field', 'On Field', 'On_Field', 'onField', 'OnField']) ?? 'N/A'),
          queued: String(getValue(queueValue, ['queued', 'QueuedMatches', 'Queued Matches', 'Queued', 'queuedMatches']) ?? 'N/A'),
          announcement: String(getValue(queueValue, ['announcement', 'AnnouncementMessage', 'Announcement Message', 'Announcement', 'announcementMessage']) ?? 'N/A'),
        };
        setQueue(nextQueue);
        writeCachedQueue(payload);
      } catch (err) {
        console.error('Failed to fetch queue data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchQueue();
  }, []);

  return (
    <main className="dashboard-shell subpage-shell">
      <DashboardHeader active="queue" />
      <div className="subpage-content queue-page-content">
        <div className="subpage-heading">
          <div>
            <p className="panel-eyebrow">LIVE EVENT · PIT OPERATIONS</p>
            <h1>現場叫號看板</h1>
            <p className="subpage-description">掌握目前場次與即將進場的隊伍資訊。</p>
          </div>
          <span className="live-badge"><span className="live-dot" /> LIVE STATUS</span>
        </div>

        {loading ? (
          <div className="queue-loading state-card">
            <span className="loading-mark" aria-hidden="true" />
            <p>正在同步叫號資訊...</p>
          </div>
        ) : (
          <>
            <section className="queue-feature-grid" aria-label="即時叫號狀態">
              <article className="queue-feature queue-feature-current">
                <span className="queue-feature-label">CURRENT MATCH <span>目前賽次</span></span>
                <strong>{queue.current_match}</strong>
                <span className="queue-feature-caption">賽程進度</span>
              </article>
              <article className="queue-feature queue-feature-field">
                <span className="queue-feature-label">ON FIELD <span>場上進行中</span></span>
                <strong>{queue.on_field}</strong>
                <span className="queue-feature-caption">正在比賽</span>
              </article>
            </section>

            <section className="queue-detail-grid" aria-label="叫號公告">
              <article className="dashboard-panel queue-detail-card">
                <div className="panel-heading">
                  <div><p className="panel-eyebrow">ON DECK</p><h2>預備區報到</h2></div>
                  <span className="queue-icon" aria-hidden="true">↗</span>
                </div>
                <p className="queue-detail-value">{queue.queued}</p>
              </article>
              <article className="dashboard-panel queue-detail-card">
                <div className="panel-heading">
                  <div><p className="panel-eyebrow">ANNOUNCEMENT</p><h2>現場廣播</h2></div>
                  <span className="announcement-icon" aria-hidden="true">!</span>
                </div>
                <p className="queue-detail-value queue-announcement">{queue.announcement}</p>
              </article>
            </section>
          </>
        )}
        <div className="subpage-return"><Link href="/">← 返回賽事總覽</Link><span>自動同步現場資訊</span></div>
      </div>
      <footer className="dashboard-footer"><span>NKS EVENT CONTROL</span><span>2027 · 南科模擬賽</span></footer>
    </main>
  );
}
