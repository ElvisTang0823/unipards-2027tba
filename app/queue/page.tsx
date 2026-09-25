'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

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
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Queue</p>
            <h1 className="mt-2 text-3xl font-black text-white">Queuing Board</h1>
          </div>
          <Link href="/" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-sky-500 hover:text-white">
            Back to Dashboard
          </Link>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-300">Loading queue data...</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Current Match</div>
              <div className="mt-2 text-3xl font-black text-white">{queue.current_match}</div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">On Field</div>
              <div className="mt-2 text-3xl font-black text-sky-300">{queue.on_field}</div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 md:col-span-2">
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Queued</div>
              <div className="mt-2 text-xl font-bold text-slate-100">{queue.queued}</div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 md:col-span-2">
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Announcement</div>
              <div className="mt-2 text-lg font-medium text-amber-300">{queue.announcement}</div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
