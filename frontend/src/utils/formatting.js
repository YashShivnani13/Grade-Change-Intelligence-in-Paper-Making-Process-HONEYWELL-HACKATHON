// Utility functions for value, unit, and timestamp formatting

export function formatValue(val, decimals = 1) {
  if (val === null || val === undefined || isNaN(val)) return "---";
  return Number(val).toFixed(decimals);
}

export function formatSeconds(totalSeconds) {
  if (totalSeconds === null || totalSeconds === undefined) return "00:00:00";
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);

  const pad = (n) => String(n).padStart(2, "0");
  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

export function formatDelta(val, unit = "") {
  if (val === null || val === undefined) return `0.0 ${unit}`;
  const sign = val > 0 ? "+" : "";
  return `${sign}${val.toFixed(1)} ${unit}`;
}

export function formatISO(isoString) {
  if (!isoString) return new Date().toLocaleTimeString();
  try {
    return new Date(isoString).toLocaleTimeString();
  } catch {
    return isoString;
  }
}
