/**
 * Responsibility:
 * - UI 表示向けの純粋フォーマッタをまとめる。
 *
 * Rules:
 * - 表示文字列の整形だけを担当し、ゲーム状態の更新はしない。
 * - どの画面からでも再利用できる汎用整形だけを置く。
 */
export function formatMissionTimer(seconds) {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const secs = Math.floor(safeSeconds % 60);
  const tenths = Math.floor((safeSeconds - Math.floor(safeSeconds)) * 10);
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
}

export function formatMissionDuration(seconds) {
  return formatMissionTimer(seconds);
}
