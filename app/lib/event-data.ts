export type EventRecord = Record<string, unknown>;

export type WinnerSide = 'Red' | 'Blue' | 'Tie';

export interface MatchRecord extends EventRecord {
  Match_Number: string;
  Red_Alliance: string;
  Blue_Alliance: string;
  Red_Total_Score: number;
  Blue_Total_Score: number;
  Red_Auto_Score: number;
  Blue_Auto_Score: number;
  Red_Teleop_Score: number;
  Blue_Teleop_Score: number;
  Red_Endgame_Score: number;
  Blue_Endgame_Score: number;
  Red_Total_RP: number;
  Blue_Total_RP: number;
  Red_Foul_Points?: number;
  Blue_Foul_Points?: number;
  Winner: WinnerSide;
}

export interface EventData {
  matches: MatchRecord[];
  rankings: EventRecord[];
  alliance: EventRecord[];
  awards: EventRecord[];
  queue: EventRecord[];
}

const EMPTY_EVENT_DATA: EventData = {
  matches: [],
  rankings: [],
  alliance: [],
  awards: [],
  queue: [],
};

const normalizeKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, '');

const asRecord = (value: unknown): EventRecord | null => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as EventRecord
    : null
);

const getValue = (record: EventRecord, candidates: string[]) => {
  const keys = new Set(candidates.map(normalizeKey));
  const entry = Object.entries(record).find(([candidate, value]) => (
    keys.has(normalizeKey(candidate)) && value !== undefined && value !== null && value !== ''
  ));
  return entry?.[1];
};

const getArray = (record: EventRecord, candidates: string[]): EventRecord[] => {
  const value = getValue(record, candidates);
  if (Array.isArray(value)) {
    return value.map(asRecord).filter((item): item is EventRecord => item !== null);
  }
  const singleRecord = asRecord(value);
  return singleRecord ? [singleRecord] : [];
};

const hasEventSections = (record: EventRecord) => [
  'matches', 'match', 'rankings', 'ranking', 'team_rankings',
  'alliance', 'alliances', 'awards', 'award', 'queue', 'pit_queue',
].some((section) => Object.keys(record).some((key) => normalizeKey(key) === normalizeKey(section)));

const unwrapEventPayload = (payload: unknown, depth = 0): EventRecord | null => {
  const record = asRecord(payload);
  if (!record) return null;
  if (hasEventSections(record) || depth >= 2) return record;

  const nested = getValue(record, ['data', 'result', 'payload', 'response']);
  const nestedRecord = asRecord(nested);
  return nestedRecord ? unwrapEventPayload(nestedRecord, depth + 1) ?? record : record;
};

const asText = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value).trim();
};

const toNumber = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const normalizeWinner = (value: unknown): WinnerSide => {
  const winner = asText(value).toLowerCase();
  if (winner === 'red') return 'Red';
  if (winner === 'blue') return 'Blue';
  return 'Tie';
};

const normalizeMatch = (record: EventRecord): MatchRecord => ({
  ...record,
  Match_Number: asText(getValue(record, ['Match_Number', 'match_number', 'Match', 'match', 'Match_ID', 'match_id', 'Match_Key', 'match_key', 'Match_No', 'match_no'])),
  Red_Alliance: asText(getValue(record, ['Red_Alliance', 'red_alliance', 'Red Alliance', 'Red_Teams', 'red_teams'])),
  Blue_Alliance: asText(getValue(record, ['Blue_Alliance', 'blue_alliance', 'Blue Alliance', 'Blue_Teams', 'blue_teams'])),
  Red_Total_Score: toNumber(getValue(record, ['Red_Total_Score', 'red_total_score', 'Red Score', 'Red_Score', 'red_score'])),
  Blue_Total_Score: toNumber(getValue(record, ['Blue_Total_Score', 'blue_total_score', 'Blue Score', 'Blue_Score', 'blue_score'])),
  Red_Auto_Score: toNumber(getValue(record, ['Red_Auto_Score', 'red_auto_score', 'Red Auto', 'Red_Auto', 'red_auto'])),
  Blue_Auto_Score: toNumber(getValue(record, ['Blue_Auto_Score', 'blue_auto_score', 'Blue Auto', 'Blue_Auto', 'blue_auto'])),
  Red_Teleop_Score: toNumber(getValue(record, ['Red_Teleop_Score', 'red_teleop_score', 'Red Teleop', 'Red_Teleop', 'red_teleop'])),
  Blue_Teleop_Score: toNumber(getValue(record, ['Blue_Teleop_Score', 'blue_teleop_score', 'Blue Teleop', 'Blue_Teleop', 'blue_teleop'])),
  Red_Endgame_Score: toNumber(getValue(record, ['Red_Endgame_Score', 'red_endgame_score', 'Red Endgame', 'Red_Endgame', 'red_endgame'])),
  Blue_Endgame_Score: toNumber(getValue(record, ['Blue_Endgame_Score', 'blue_endgame_score', 'Blue Endgame', 'Blue_Endgame', 'blue_endgame'])),
  Red_Total_RP: toNumber(getValue(record, ['Red_Total_RP', 'red_total_rp', 'Red RP', 'Red_RP', 'red_rp'])),
  Blue_Total_RP: toNumber(getValue(record, ['Blue_Total_RP', 'blue_total_rp', 'Blue RP', 'Blue_RP', 'blue_rp'])),
  Red_Foul_Points: toNumber(getValue(record, ['Red_Foul_Points', 'red_foul_points', 'Red Foul', 'Red_Foul_Pts', 'red_foul'])),
  Blue_Foul_Points: toNumber(getValue(record, ['Blue_Foul_Points', 'blue_foul_points', 'Blue Foul', 'Blue_Foul_Pts', 'blue_foul'])),
  Winner: normalizeWinner(getValue(record, ['Winner', 'winner'])),
});

const normalizeQueueRow = (record: EventRecord): EventRecord => ({
  ...record,
  'Current Match': getValue(record, ['Current Match', 'current_match', 'Current_Match', 'currentMatch', 'CurrentMatch']),
  'On Field': getValue(record, ['On Field', 'on_field', 'On_Field', 'onField', 'OnField']),
  QueuedMatches: getValue(record, ['QueuedMatches', 'Queued Matches', 'queued', 'queuedMatches']),
  AnnouncementMessage: getValue(record, ['AnnouncementMessage', 'Announcement Message', 'announcement', 'announcementMessage']),
});

export const normalizeEventData = (payload: unknown): EventData => {
  const record = unwrapEventPayload(payload);
  if (!record) return EMPTY_EVENT_DATA;

  return {
    matches: getArray(record, ['matches', 'match', 'match_results', 'schedule']).map(normalizeMatch),
    rankings: getArray(record, ['rankings', 'ranking', 'team_rankings']),
    alliance: getArray(record, ['alliance', 'alliances']),
    awards: getArray(record, ['awards', 'award']),
    queue: getArray(record, ['queue', 'pit_queue']).map(normalizeQueueRow),
  };
};
