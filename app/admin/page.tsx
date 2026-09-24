'use client';

import { useState } from 'react';

export default function AdminPage() {
  const [secret, setSecret] = useState('');
  const [onField, setOnField] = useState('');
  const [queued, setQueued] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [status, setStatus] = useState('');

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('更新中...');

    try {
      const res = await fetch('/api/queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cheesy-secret': secret, // 資安金鑰
        },
        body: JSON.stringify({
          current_match: onField,
          on_field: onField,
          queued: queued,
          announcement: announcement,
        }),
      });

      if (res.ok) {
        setStatus('✅ 叫號狀態更新成功！');
      } else {
        setStatus('❌ 更新失敗：金鑰錯誤或伺服器異常');
      }
    } catch (err) {
      setStatus('❌ 發送失敗');
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8 flex items-center justify-center">
      <form onSubmit={handleUpdate} className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md w-full space-y-4">
        <h2 className="text-2xl font-bold text-red-500 mb-6">📢 Nexus 叫號控制台</h2>

        <div>
          <label className="block text-sm text-slate-400 mb-1">資安 Secret Key</label>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
            placeholder="請輸入 WEBHOOK_SECRET"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">場上比賽 (Now On Field)</label>
          <input
            type="text"
            value={onField}
            onChange={(e) => setOnField(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
            placeholder="例如: Qm10"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">預備區叫號 (Queued / On Deck)</label>
          <input
            type="text"
            value={queued}
            onChange={(e) => setQueued(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
            placeholder="例如: Qm11, Qm12"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">現場廣播廣播詞 (Announcement)</label>

          <input
            type="text"
            value={announcement}
            onChange={(e) => setAnnouncement(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
            placeholder="例如: 請 Qm11 紅方隊伍速至預備區"
          />
        </div>

        <button type="submit" className="w-full bg-red-600 hover:bg-red-500 font-bold py-3 rounded-lg transition">
          推播最新叫號
        </button>

        {status && <p className="text-center text-sm font-bold mt-2">{status}</p>}
      </form>
    </main>
  );
}