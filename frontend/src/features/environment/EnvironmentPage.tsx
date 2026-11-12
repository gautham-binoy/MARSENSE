import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  Gauge,
  Radio,
  Thermometer,
} from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts'
import { api } from '@/lib/api'
import { useQuery } from '@/lib/useQuery'
import { useMission } from '@/store/mission'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Callout, PageHeader, ReliabilityBadge, Stat } from '@/components/common'

export default function EnvironmentPage() {
  const m = useMission()
  const { data: meda } = useQuery('meda', api.meda)
  const { data: rad } = useQuery('rad', api.rad)

  const [activeTab, setActiveTab] = useState<'temp' | 'pressure' | 'radiation'>('temp')

  const medaRecords = meda?.records ?? []
  const radRecords = rad?.records ?? []

  // Prepare temperature chart data
  const tempData = medaRecords
    .filter((r) => r.air_temp_c)
    .map((r) => ({
      sol: r.sol,
      date: r.earth_date ?? `Sol ${r.sol}`,
      min: r.air_temp_c?.min,
      mean: r.air_temp_c?.mean,
      max: r.air_temp_c?.max,
    }))

  // Prepare pressure chart data
  const pressureData = medaRecords
    .filter((r) => r.pressure_pa)
    .map((r) => ({
      sol: r.sol,
      date: r.earth_date ?? `Sol ${r.sol}`,
      min: r.pressure_pa?.min,
      mean: r.pressure_pa?.mean,
      max: r.pressure_pa?.max,
    }))

  // Prepare radiation chart data
  const radData = radRecords.map((r) => ({
    sol: r.sol,
    doseRate: r.dose_rate_E_uGy_h?.mean,
    dosePerSol: r.dose_per_sol_E_uGy,
    doseB: r.dose_per_sol_B_uGy,
  }))

  const missionDuration = m.supplies.duration_days
  const typicalDosePerSol = rad?.typical_dose_per_sol_E_uGy ?? 210
  const estimatedMissionDose = ((typicalDosePerSol * missionDuration) / 1000).toFixed(2)

  return (
    <div className="absolute inset-0 flex flex-col overflow-y-auto bg-space p-4 space-y-4">
      {/* Header */}
      <div className="border-b border-line pb-3">
        <PageHeader
          title="Martian Atmospheric & Radiation Environment"
          subtitle="Calibrated archived in-situ observations from Perseverance MEDA (Jezero Crater) and Curiosity RAD (Gale Crater)."
        >
          <div className="flex items-center gap-2">
            <ReliabilityBadge value="measured" />
            <Button size="sm" variant="secondary" asChild>
              <Link to="/routes">Continue to Route Planner →</Link>
            </Button>
          </div>
        </PageHeader>
      </div>

      {/* Disclaimers & Integrity Alert */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Callout kind="info">
          <span className="font-semibold text-fg">Historical Measurements Only: </span>
          {meda?.no_realtime_note ?? 'Data are archived PDS4 calibrated records from Perseverance, not a live Martian forecast.'}
        </Callout>
        <Callout kind="warn">
          <span className="font-semibold text-fg">Dosimetry Reference Disclaimer: </span>
          Curiosity RAD operates in Gale crater (~2,470 km from Jezero). Values are absorbed dose in tissue-equivalent plastic (Gy), not dose equivalent (Sv).
        </Callout>
      </div>

      {/* Overview Stat Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat
          label="MEDA Air Temperature Range"
          value={
            meda?.range.air_temp_c
              ? `${meda.range.air_temp_c.min}°C to ${meda.range.air_temp_c.max}°C`
              : '—'
          }
          hint="Perseverance ATS1–5 ambient air sensors at 1.45 m"
          tone="caution"
        />
        <Stat
          label="Atmospheric Pressure Range"
          value={
            meda?.range.pressure_pa
              ? `${Math.round(meda.range.pressure_pa.min)} – ${Math.round(meda.range.pressure_pa.max)} Pa`
              : '—'
          }
          unit="(~7.5 mbar)"
          hint="Vaisala Barocap pressure sensors on rover mast"
          tone="sci"
        />
        <Stat
          label="Reference GCR Dose Rate"
          value={rad?.typical_dose_per_sol_E_uGy ?? '—'}
          unit="µGy/sol"
          hint="MSL Curiosity RAD detector E average surface background"
          tone="default"
        />
        <Stat
          label={`Mission Cumulative Dose (${missionDuration}d)`}
          value={estimatedMissionDose}
          unit="mGy"
          hint="Estimated galactic cosmic ray accumulation for the planned mission duration"
          tone={parseFloat(estimatedMissionDose) > 10 ? 'danger' : 'safe'}
        />
      </div>

      {/* Interactive Chart Tabs */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <CardTitle className="text-[13px] flex items-center gap-2">
              <Activity className="h-4 w-4 text-sci" />
              Environmental Profiles Across Sampled Sols
            </CardTitle>
            <div className="flex gap-1">
              <Button
                size="xs"
                variant={activeTab === 'temp' ? 'sci' : 'ghost'}
                onClick={() => setActiveTab('temp')}
              >
                <Thermometer className="h-3 w-3" /> Temperature
              </Button>
              <Button
                size="xs"
                variant={activeTab === 'pressure' ? 'sci' : 'ghost'}
                onClick={() => setActiveTab('pressure')}
              >
                <Gauge className="h-3 w-3" /> Pressure
              </Button>
              <Button
                size="xs"
                variant={activeTab === 'radiation' ? 'sci' : 'ghost'}
                onClick={() => setActiveTab('radiation')}
              >
                <Radio className="h-3 w-3" /> Radiation (Gale)
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {/* TAB 1: Temperature Chart */}
          {activeTab === 'temp' && (
            <div className="space-y-3">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={tempData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="sol" tick={{ fill: '#9ca3af', fontSize: 10 }} unit=" Sol" />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} unit="°C" domain={[-95, 0]} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#161a22', borderColor: '#374151', fontSize: '11px', borderRadius: '4px' }}
                      formatter={(v: unknown, n: unknown) => [`${v}°C`, String(n).toUpperCase()]}
                      labelFormatter={(sol) => `Sol ${sol}`}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Line type="monotone" dataKey="max" stroke="#fb923c" strokeWidth={2} name="Daily Max" />
                    <Line type="monotone" dataKey="mean" stroke="#22d3ee" strokeWidth={2} name="Daily Mean" />
                    <Line type="monotone" dataKey="min" stroke="#60a5fa" strokeWidth={2} name="Daily Min" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[11px] text-fg-dim leading-relaxed">
                Source: NASA/JPL/CAB INTA-CSIC MEDA ATS data archived at PDS Atmospheres. Diurnal temperature fluctuations frequently exceed 70°C between Martian noon and pre-dawn.
              </p>
            </div>
          )}

          {/* TAB 2: Pressure Chart */}
          {activeTab === 'pressure' && (
            <div className="space-y-3">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={pressureData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="pressGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="sol" tick={{ fill: '#9ca3af', fontSize: 10 }} unit=" Sol" />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} unit=" Pa" domain={['dataMin - 30', 'dataMax + 30']} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#161a22', borderColor: '#374151', fontSize: '11px', borderRadius: '4px' }}
                      formatter={(v: unknown) => [`${v} Pa`, 'Mean Atmospheric Pressure']}
                      labelFormatter={(sol) => `Sol ${sol}`}
                    />
                    <Area type="monotone" dataKey="mean" stroke="#22d3ee" strokeWidth={2} fill="url(#pressGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[11px] text-fg-dim leading-relaxed">
                Atmospheric pressure reflects the seasonal CO2 cycle as polar caps freeze and sublimate. Jezero crater (~-2,500 m) experiences higher pressure than the global datum (~610 Pa).
              </p>
            </div>
          )}

          {/* TAB 3: Radiation Chart */}
          {activeTab === 'radiation' && (
            <div className="space-y-3">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={radData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="sol" tick={{ fill: '#9ca3af', fontSize: 10 }} unit=" Sol" />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} unit=" µGy/d" />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#161a22', borderColor: '#374151', fontSize: '11px', borderRadius: '4px' }}
                      formatter={(v: unknown, n: unknown) => [`${v} µGy/sol`, String(n)]}
                      labelFormatter={(sol) => `Curiosity Gale Crater Sol ${sol}`}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Bar dataKey="dosePerSol" fill="#f87171" name="Plastic Detector E (Tissue Equiv.)" />
                    <Bar dataKey="doseB" fill="#fb923c" name="Silicon Detector B" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[11px] text-fg-dim leading-relaxed">
                Reference Publication: Hassler et al. (2014) Science 343. Measured surface GCR dose rate at Gale crater is approximately 0.21 ± 0.04 mGy/day.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Technical Data Provenance */}
      <div className="panel-2 p-3 rounded-lg border border-line text-[11px] text-fg-muted space-y-1.5">
        <div className="font-semibold text-fg">Instrument Attributes & Spatial Verification:</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10.5px]">
          <div>Perseverance MEDA: <strong>Jezero Crater floor (18.38°N, 77.58°E)</strong> · Calibrated PDS4 Level 3</div>
          <div>MSL Curiosity RAD: <strong>Gale Crater (-4.59°S, 137.44°E, 2470 km away)</strong> · PDS PPI Level 1A</div>
        </div>
      </div>
    </div>
  )
}
