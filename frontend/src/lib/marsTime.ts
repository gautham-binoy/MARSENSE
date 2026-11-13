/**
 * NASA Goddard Institute for Space Studies (GISS) / Allison & McEwen (2000)
 * Mars Time, Mars Sol Date (MSD), Local Mean Solar Time (LMST), and Solar Longitude (Ls) calculations.
 */

export interface MarsTelemetry {
  msd: number // Mars Sol Date
  mtcStr: string // Coordinated Mars Time (HH:MM:SS)
  lmstStr: string // Local Mean Solar Time at longitude (HH:MM:SS)
  ltstStr: string // Local True Solar Time at longitude (HH:MM:SS)
  m20Sol: number // Sol since Mars 2020 Perseverance touchdown
  lsDeg: number // Solar Longitude Ls (0-360°)
  season: string // Current Martian season
  isDustSeason: boolean // True during southern spring/summer perihelion dust storm window (Ls 180-330°)
}

const JEZERO_LON = 77.58 // Jezero Crater, East longitude
const M20_LANDING_JD = 2459264.444 // 2021-02-18 20:55 UTC

export function calculateMarsTime(date: Date = new Date(), lonDeg = JEZERO_LON): MarsTelemetry {
  const millis = date.getTime()
  const jdUt = 2440587.5 + millis / 86400000.0
  const jdTt = jdUt + (37.0 + 32.184) / 86400.0 // TT offset

  // Mars Sol Date (Allison & McEwen 2000)
  const msd = (jdTt - 2451549.5) / 1.0274912517 + 44796.0 - 0.00096
  const mtcHours = (msd % 1.0) * 24.0

  // Local Mean Solar Time (LMST)
  const lmstHours = ((mtcHours + lonDeg / 15.0) % 24.0 + 24.0) % 24.0

  // Perseverance Sol count (landing occurred at JD 2459264.37)
  const m20Sol = Math.max(0, Math.floor((jdUt - M20_LANDING_JD + 0.05) / 1.02749125))

  // Solar Longitude Ls (J2000 epoch orbital elements)
  const t = (jdTt - 2451545.0) / 36525.0
  const mDeg = 19.3870 + 0.52402075 * (jdTt - 2451545.0)
  const alphaDeg = (1.9146 - 0.004817 * t) * Math.sin((mDeg * Math.PI) / 180.0)
  const lsDeg = Number((((mDeg + alphaDeg) % 360.0 + 360.0) % 360.0).toFixed(1))

  // Equation of Time (EOT) approximation in hours for LTST
  const eotHours = (2.861 / 60) * Math.sin((2 * lsDeg * Math.PI) / 180.0) - (0.071 / 60) * Math.sin((lsDeg * Math.PI) / 180.0)
  const ltstHours = ((lmstHours + eotHours) % 24.0 + 24.0) % 24.0

  // Season determination
  let season = 'Northern Spring / Southern Autumn'
  if (lsDeg >= 90 && lsDeg < 180) season = 'Northern Summer / Southern Winter'
  else if (lsDeg >= 180 && lsDeg < 270) season = 'Northern Autumn / Southern Spring (Perihelion)'
  else if (lsDeg >= 270) season = 'Northern Winter / Southern Summer'

  const isDustSeason = lsDeg >= 180 && lsDeg <= 330

  const fmt = (hVal: number) => {
    const h = Math.floor(hVal)
    const m = Math.floor((hVal - h) * 60)
    const s = Math.floor(((hVal - h) * 60 - m) * 60)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  return {
    msd: Number(msd.toFixed(2)),
    mtcStr: fmt(mtcHours),
    lmstStr: fmt(lmstHours),
    ltstStr: fmt(ltstHours),
    m20Sol,
    lsDeg,
    season,
    isDustSeason,
  }
}
