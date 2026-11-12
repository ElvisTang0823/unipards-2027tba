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
  const entry = Object.entries(record).find(([candidate, value]) => (
    keys.has(normalizeKey(candidate)) && value !== undefined && value !== null && value !== ''
  ));
  return entry?.[1];
};

const getMatchId = (row: Record<string, unknown>) => {
  const value = getRecordValue(row, ['Match_Number', 'Match Number', 'Match', 'match_number', 'matchNumber', 'Match_ID', 'match_id', 'Match_Key', 'Match_No']);
  const valueText = typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
  return valueText || null;
};

const getTeamId = (value: unknown) => {
  const valueText = typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
  return valueText.match(/^(?:frc)?(\d+)$/i)?.[1] ?? '';
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
                const rowId = linkMode === 'match' ? getMatchId(row) : null;
                const linkKeys = linkMode === 'match'
                  ? ['Match_Number', 'Match Number', 'Match', 'match_number', 'matchNumber', 'Match_ID', 'match_id', 'Match_Key', 'Match_No']
                  : [];
                const normalizedLinkKeys = new Set(linkKeys.map(normalizeKey));

                return (
                  <tr key={idx}>
                    {headers.map((key) => {
                      const normalizedKey = normalizeKey(key);
                      const linkId = linkMode === 'team'
                        ? normalizedKey.includes('team') && !normalizedKey.includes('name')
                          ? getTeamId(row[key])
                          : ''
                        : rowId && normalizedLinkKeys.has(normalizedKey)
                          ? rowId
                          : '';
                      const value = formatValue(row[key]);

                      return (
                        <td key={key}>
                          {linkId ? (
                            <Link className="table-record-link" href={linkMode === 'match' ? `/${encodeURIComponent(linkId)}` : `/team/${encodeURIComponent(linkId)}`}>
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
