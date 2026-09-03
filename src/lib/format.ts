/**
 * Sovereign number formatting utilities
 * Use these functions everywhere a number is displayed in the UI.
 * Never interpolate raw numbers directly into display strings.
 */

/** General number to 1 decimal place */
export function fmt(value: number | undefined | null, decimals = 1): string {
  if (value === undefined || value === null || isNaN(value)) return '—'
  return value.toFixed(decimals)
}

/** Percentage with 1 decimal place and % symbol */
export function fmtPct(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return '—%'
  return `${value.toFixed(1)}%`
}

/** Currency in billions BRL */
export function fmtBRL(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return 'R$—bn'
  if (Math.abs(value) >= 1000) return `R$${(value / 1000).toFixed(1)}tn`
  if (Math.abs(value) >= 1) return `R$${value.toFixed(1)}bn`
  return `R$${(value * 1000).toFixed(0)}m`
}

/** Currency in millions BRL */
export function fmtBRLm(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return 'R$—m'
  return `R$${value.toFixed(0)}m`
}

/** Delta value with explicit + or - sign */
export function fmtDelta(value: number | undefined | null, decimals = 1): string {
  if (value === undefined || value === null || isNaN(value)) return '—'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}`
}

/** Delta percentage with explicit + or - sign */
export function fmtDeltaPct(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return '—%'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

/** Integer — no decimal places, for counts */
export function fmtInt(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return '—'
  return Math.round(value).toLocaleString()
}

/** Score out of 100 — always 0 decimal places */
export function fmtScore(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return '—'
  return Math.round(value).toString()
}

/** Compact large numbers — 12,400 becomes 12.4k, 1,200,000 becomes 1.2m */
export function fmtCompact(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return '—'
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}k`
  return value.toFixed(0)
}

/** GDP growth rate — always shows 1 decimal and % */
export function fmtGDP(value: number | undefined | null): string {
  return fmtPct(value)
}

/** Credit rating — pass through as string, no formatting needed */
export function fmtRating(value: string | undefined | null): string {
  return value ?? '—'
}

/** Turn number — integer, no formatting */
export function fmtTurn(value: number | undefined | null): string {
  if (value === undefined || value === null) return '—'
  return `Turn ${Math.round(value)}`
}

/** Clamp a number between min and max before formatting */
export function fmtClamped(
  value: number | undefined | null,
  min: number,
  max: number,
  decimals = 1
): string {
  if (value === undefined || value === null || isNaN(value)) return '—'
  return Math.max(min, Math.min(max, value)).toFixed(decimals)
}
