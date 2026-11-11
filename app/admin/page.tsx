'use client';

import Link from 'next/link';
import { useState } from 'react';
import DashboardHeader from '../components/dashboard-header';

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
    } catch {
      setStatus('❌ 發送失敗');
    }
  };

  return (
    <main className="dashboard-shell subpage-shell">
      <DashboardHeader active="admin" />
      <div className="subpage-content admin-page-content">
        <div className="subpage-heading">
          <div>
            <p className="panel-eyebrow">EVENT OPERATIONS · ADMIN</p>
            <h1>叫號管理</h1>
            <p className="subpage-description">更新現場進度與公告，資訊將同步至叫號看板。</p>
          </div>
          <span className="admin-badge">管理模式</span>
        </div>

        <form onSubmit={handleUpdate} className="admin-form">
          <div className="admin-form-heading">
            <span className="admin-form-icon" aria-hidden="true">↗</span>
            <div>
              <p className="panel-eyebrow">PIT QUEUE</p>
              <h2>更新現場資訊</h2>
            </div>
          </div>

          <div className="admin-field">
            <label htmlFor="admin-secret">管理金鑰 <span>SECRET KEY</span></label>
            <input
              id="admin-secret"
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="請輸入 WEBHOOK_SECRET"
              autoComplete="current-password"
              required
            />
          </div>

          <div className="admin-fields-row">
            <div className="admin-field">
              <label htmlFor="admin-on-field">場上比賽 <span>ON FIELD</span></label>
              <input
                id="admin-on-field"
                type="text"
                value={onField}
                onChange={(e) => setOnField(e.target.value)}
                placeholder="例如：Qm10"
              />
            </div>
            <div className="admin-field">
              <label htmlFor="admin-queued">預備區叫號 <span>ON DECK</span></label>
              <input
                id="admin-queued"
                type="text"
                value={queued}
                onChange={(e) => setQueued(e.target.value)}
                placeholder="例如：Qm11, Qm12"
              />
            </div>
          </div>

          <div className="admin-field">
            <label htmlFor="admin-announcement">現場廣播 <span>ANNOUNCEMENT</span></label>
            <input
              id="admin-announcement"
              type="text"
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
              placeholder="例如：請 Qm11 紅方隊伍至預備區報到"
            />
          </div>

          <button type="submit" className="admin-submit">
            推播最新叫號 <span aria-hidden="true">→</span>
          </button>
          {status && (
            <p className={`admin-status${status.includes('成功') ? ' admin-status-success' : status.includes('更新中') ? ' admin-status-pending' : ' admin-status-error'}`} role="status">
              {status}
            </p>
          )}
        </form>
        <div className="subpage-return"><Link href="/">← 返回賽事總覽</Link><span>僅限授權管理人員操作</span></div>
      </div>
      <footer className="dashboard-footer"><span>NKS EVENT CONTROL</span><span>2027 · 南科模擬賽</span></footer>
    </main>
  );
}