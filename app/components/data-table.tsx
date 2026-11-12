import Link from 'next/link';

type LinkMode = 'match' | 'team';

type DataTableProps = {
  title: string;
  eyebrow: string;
  data: Record<string, unknown>[];
  linkMode?: LinkMode;
};

const normalizeKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, '');

const getRecordValue = (record: Record<string, unknown>, candidates: string[]) => {
  const keys = new Set(candidates.map(normalizeKey));
  const key = Object.keys(record).find((candidate) => keys.has(normalizeKey(candidate)));
  return key ? record[key] : undefined;
};

const getRowId = (row: Record<string, unknown>, linkMode: LinkMode) => {
  const candidates = linkMode === 'match'
    ? ['Match_Number', 'Match Number', 'Match', 'match_number', 'matchNumber', 'Match_ID', 'match_id']
    : ['Team_Number', 'Team Number', 'Team', 'team_number', 'teamNumber', 'Team_ID', 'team_id'];
  const value = getRecordValue(row, candidates);
  const id = typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
  return id && (linkMode !== 'team' || /^\d+$/.test(id)) ? id : null;
};

const formatValue = (value: unknown) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

export default function DataTable({ title, eyebrow, data, linkMode }: DataTableProps) {
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
              {data.map((row, idx) => {
                const rowId = linkMode ? getRowId(row, linkMode) : null;
                const linkKeys = linkMode === 'match'
                  ? ['Match_Number', 'Match Number', 'Match', 'match_number', 'matchNumber', 'Match_ID', 'match_id']
                  : ['Team_Number', 'Team Number', 'Team', 'team_number', 'teamNumber', 'Team_ID', 'team_id'];
                const normalizedLinkKeys = new Set(linkKeys.map(normalizeKey));

                return (
                  <tr key={idx}>
                    {headers.map((key) => {
                      const isLinkCell = rowId && linkMode && normalizedLinkKeys.has(normalizeKey(key));
                      const value = formatValue(row[key]);

                      return (
                        <td key={key}>
                          {isLinkCell ? (
                            <Link className="table-record-link" href={linkMode === 'match' ? `/${encodeURIComponent(rowId)}` : `/team/${encodeURIComponent(rowId)}`}>
                              {value}<span aria-hidden="true">↗</span>
                            </Link>
                          ) : value}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
