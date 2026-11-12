import Link from 'next/link';

type DashboardHeaderProps = {
  active: 'overview' | 'queue' | 'admin' | 'match' | 'team';
};

export default function DashboardHeader({ active }: DashboardHeaderProps) {
  return (
    <header className="dashboard-nav">
      <Link href="/" className="brand-lockup" aria-label="NKS 賽事首頁">
        <span className="brand-mark">N</span>
        <span className="brand-name">NKS <span>EVENT CONTROL</span></span>
      </Link>
      <nav className="nav-links" aria-label="主要導覽">
        <Link className={`nav-link${active === 'overview' ? ' nav-link-active' : ''}`} href="/">賽事總覽</Link>
        <Link className={`nav-link${active === 'queue' ? ' nav-link-active' : ''}`} href="/queue">叫號看板</Link>
        <Link className={`nav-admin${active === 'admin' ? ' nav-admin-active' : ''}`} href="/admin">管理入口 <span aria-hidden="true">↗</span></Link>
      </nav>
    </header>
  );
}
