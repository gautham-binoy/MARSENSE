import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertOctagon,
  Droplets,
  HeartPulse,
  Play,
  ShieldCheck,
  Sliders,
  Sparkles,
  Users,
  Wind,
  Zap,
} from 'lucide-react'
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts'
import { api, type ResourceKey, type SimResult } from '@/lib/api'
import { useQuery } from '@/lib/useQuery'
import { useMission } from '@/store/mission'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Callout, PageHeader, Spinner } from '@/components/common'

const RESOURCE_COLORS: Record<ResourceKey, string> = {
  oxygen: '#22d3ee',
  water: '#60a5fa',
  power: '#fbbf24',
  co2_scrubber: '#a78bfa',
  food: '#34d399',
}

export default function SurvivalPage() {
  const m = useMission()
  const { data: scenariosData } = useQuery('scenarios', api.scenarios)

  const [simulating, setSimulating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [allResults, setAllResults] = useState<Record<string, SimResult> | null>(null)
  const [activeTab, setActiveTab] = useState<'timeline' | 'supplies' | 'assumptions' | 'scenarios'>('timeline')

  // Auto-run simulation on initial load or scenario change if no simulation exists
  const runSimulation = async (scenarioIdToRun = m.scenarioId, runAll = false) => {
    setSimulating(true)
    setError(null)
    try {
      const res = await api.simulate({
        supplies: m.supplies,
        assumptions: m.assumptions,
        scenario_ids: runAll ? undefined : [scenarioIdToRun],
      })

      setAllResults(res.results)
      if (res.results[scenarioIdToRun]) {
        m.setSimulation(res.results[scenarioIdToRun])
      } else {
        const first = Object.values(res.results)[0]
        if (first) m.setSimulation(first)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Simulation failed')
    } finally {
      setSimulating(false)
    }
  }

  useEffect(() => {
    if (!m.simulation) {
      void runSimulation(m.scenarioId, false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync route travel distance with rover power assumption
  const syncWithPlannedRoute = () => {
    if (m.route) {
      const totalKm = m.route.length_m / 1000
      const days = Math.max(1, m.supplies.duration_days)
      const dailyKm = Number((totalKm / days).toFixed(2))
      m.setAssumptions({ rover_km_per_day: dailyKm })
    }
  }

  const sim = m.simulation
  const scenarios = scenariosData?.scenarios ?? []

  // Prepare chart timeline data
  const chartData = (sim?.timeline ?? []).map((pt) => {
    const oxygenInit = sim?.summary.oxygen.initial ?? 1
    const waterInit = sim?.summary.water.initial ?? 1
    const powerInit = sim?.summary.power.initial ?? 1
    const scrubberInit = sim?.summary.co2_scrubber.initial ?? 1
    const foodInit = sim?.summary.food.initial ?? 1

    return {
      day: pt.day,
      oxygen: Math.max(0, Number(((pt.oxygen / oxygenInit) * 100).toFixed(1))),
      water: Math.max(0, Number(((pt.water / waterInit) * 100).toFixed(1))),
      power: Math.max(0, Number(((pt.power / powerInit) * 100).toFixed(1))),
      co2_scrubber: Math.max(0, Number(((pt.co2_scrubber / scrubberInit) * 100).toFixed(1))),
      food: Math.max(0, Number(((pt.food / foodInit) * 100).toFixed(1))),
    }
  })

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-space">
      {/* Top action bar */}
      <div className="border-b border-line bg-panel/90 px-4 py-2.5 backdrop-blur z-10 shrink-0">
        <PageHeader
          title="Astronaut Survival Simulator & ECLSS Mass Balance"
          subtitle="Hourly multi-resource mass and energy integration based on NASA BVAD 2022 baseline values."
        >
          <div className="flex items-center gap-2">
            {sim && (
              <Badge variant={sim.verdict === 'ok' ? 'safe' : sim.verdict === 'warning' ? 'caution' : 'danger'}>
                {sim.verdict === 'ok' ? 'Nominal Margin' : sim.verdict === 'warning' ? 'Reserve Breach' : 'Depletion Warning'}
              </Badge>
            )}
            <Button
              variant="sci"
              size="sm"
              onClick={() => runSimulation(m.scenarioId, false)}
              disabled={simulating}
            >
              {simulating ? <Spinner /> : <Play className="h-3.5 w-3.5" />}
              Run Simulator
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => runSimulation(m.scenarioId, true)}
              disabled={simulating}
            >
              <Sparkles className="h-3.5 w-3.5 text-ember" />
              Simulate All Scenarios
            </Button>
          </div>
        </PageHeader>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_420px]">
        {/* Left column: Timeline Chart, Warnings, and Resource Status Grid */}
        <div className="overflow-y-auto p-4 space-y-4">
          {error && <Callout kind="danger">{error}</Callout>}

          {/* Scenario quick selector buttons */}
          <div className="panel-2 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-fg flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-sci" /> Active Mission Scenario:
              </span>
              <span className="text-[11px] text-fg-dim mono">
                Total {sim ? `${sim.total_days} sols` : `${m.supplies.duration_days} sols`}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {scenarios.map((sc) => (
                <button
                  key={sc.id}
                  onClick={() => {
                    m.setScenario(sc.id)
                    void runSimulation(sc.id, false)
                  }}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-all ${
                    m.scenarioId === sc.id
                      ? 'border-sci bg-sci/15 text-sci-2 shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                      : 'border-line/70 bg-panel text-fg-muted hover:text-fg hover:border-line'
                  }`}
                >
                  {sc.name}
                </button>
              ))}
            </div>
            {sim && (
              <p className="text-[11px] text-fg-muted pt-1 border-t border-line/60">
                <span className="text-fg font-medium">{sim.scenario.name}: </span>
                {sim.scenario.description}
              </p>
            )}
          </div>

          {/* Timeline Depletion Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-[13px]">
                <span className="flex items-center gap-1.5">
                  <HeartPulse className="h-4 w-4 text-ember" /> Resource Depletion Timeline (% Remaining)
                </span>
                <span className="mono text-[10.5px] text-fg-dim">
                  Emergency Reserve: {(m.supplies.emergency_reserve_fraction * 100).toFixed(0)}%
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                      <XAxis dataKey="day" tick={{ fill: '#9ca3af', fontSize: 10 }} unit=" d" />
                      <YAxis domain={[-5, 105]} tick={{ fill: '#9ca3af', fontSize: 10 }} unit="%" />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: '#161a22', borderColor: '#374151', fontSize: '11px', borderRadius: '4px' }}
                        formatter={(val: unknown, name: unknown) => [`${val}%`, String(name).replace('_', ' ')]}
                        labelFormatter={(day) => `Mission Day ${day}`}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                      <ReferenceLine
                        y={m.supplies.emergency_reserve_fraction * 100}
                        stroke="#ef4444"
                        strokeDasharray="4 4"
                        label={{ value: 'Reserve Cap', fill: '#ef4444', fontSize: 10, position: 'insideTopRight' }}
                      />
                      <ReferenceLine y={0} stroke="#dc2626" strokeWidth={1.5} />
                      <Line type="monotone" dataKey="oxygen" stroke={RESOURCE_COLORS.oxygen} strokeWidth={2} dot={false} name="Oxygen" />
                      <Line type="monotone" dataKey="water" stroke={RESOURCE_COLORS.water} strokeWidth={2} dot={false} name="Water" />
                      <Line type="monotone" dataKey="power" stroke={RESOURCE_COLORS.power} strokeWidth={2} dot={false} name="Battery" />
                      <Line type="monotone" dataKey="co2_scrubber" stroke={RESOURCE_COLORS.co2_scrubber} strokeWidth={2} dot={false} name="CO2 Scrubber" />
                      <Line type="monotone" dataKey="food" stroke={RESOURCE_COLORS.food} strokeWidth={2} dot={false} name="Food" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-fg-dim text-[12px]">
                  No simulation data. Run the simulator to calculate depletion curves.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Warnings & Critical Alerts */}
          {sim && sim.warnings.length > 0 && (
            <div className="space-y-2">
              <span className="text-[12px] font-semibold text-fg flex items-center gap-1.5">
                <AlertOctagon className="h-4 w-4 text-danger" /> Life Support & Resource Warnings ({sim.warnings.length})
              </span>
              <div className="space-y-1.5">
                {sim.warnings.map((w, idx) => (
                  <Callout key={idx} kind={w.severity === 'critical' ? 'danger' : 'warn'}>
                    <div className="flex items-center justify-between text-[11.5px]">
                      <span>{w.message}</span>
                      <span className="mono text-[10px] text-fg-dim shrink-0 ml-2">Day {w.day}</span>
                    </div>
                  </Callout>
                ))}
              </div>
            </div>
          )}

          {/* Consumable Status Breakdown Cards */}
          {sim && (
            <div className="space-y-2">
              <span className="text-[12px] font-semibold text-fg flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-safe" /> Detailed Consumables Balance
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                {(['oxygen', 'water', 'power', 'co2_scrubber', 'food'] as const).map((key) => {
                  const item = sim.summary[key]
                  const rec = sim.recommended_supplies[key]
                  return (
                    <div key={key} className="panel-2 p-3 space-y-2 rounded-lg border border-line">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[12px] text-fg flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: RESOURCE_COLORS[key] }} />
                          {item.label.split(' (')[0]}
                        </span>
                        <Badge variant={item.status === 'ok' ? 'safe' : item.status === 'warning' ? 'caution' : 'danger'}>
                          {item.status.toUpperCase()}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-1 text-[11px] text-fg-muted">
                        <div>Initial: <span className="mono text-fg">{item.initial}</span></div>
                        <div>Consumed: <span className="mono text-fg">{item.consumed}</span></div>
                        <div>Remaining: <span className="mono font-semibold text-fg">{item.remaining_at_end}</span></div>
                        <div>Margin: <span className={`mono font-semibold ${item.margin_days && item.margin_days > 0 ? 'text-safe' : 'text-danger'}`}>
                          {item.margin_days !== null ? `${item.margin_days > 0 ? '+' : ''}${item.margin_days} d` : '—'}
                        </span></div>
                      </div>

                      {item.days_to_depletion !== null && (
                        <div className="text-[10px] text-fg-dim pt-1 border-t border-line/60">
                          Depletion: <span className="mono text-fg">Day {item.days_to_depletion}</span> (Rate: {item.mean_rate_per_day}/d)
                        </div>
                      )}

                      {rec !== undefined && item.status !== 'ok' && (
                        <div className="text-[10px] text-ember bg-mars/10 p-1.5 rounded border border-mars/20">
                          Recommended loadout: <span className="font-semibold">{rec}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right column: Supplies and Assumptions editor */}
        <aside className="border-l border-line bg-panel/80 overflow-y-auto p-4 space-y-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="timeline">Supplies</TabsTrigger>
              <TabsTrigger value="assumptions">Rates</TabsTrigger>
              <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
            </TabsList>

            {/* TAB 1: Initial Supplies Inputs */}
            <TabsContent value="timeline" className="space-y-3 pt-2">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-fg-muted flex items-center gap-1 mb-1">
                      <Users className="h-3 w-3" /> Crew Count
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={12}
                      value={m.supplies.crew}
                      onChange={(e) => m.setSupplies({ crew: Math.max(1, parseInt(e.target.value) || 1) })}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-fg-muted flex items-center gap-1 mb-1">
                      Duration (Sols)
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      value={m.supplies.duration_days}
                      onChange={(e) => m.setSupplies({ duration_days: Math.max(1, parseFloat(e.target.value) || 1) })}
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-line">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-fg-muted flex items-center gap-1">
                      <Wind className="h-3 w-3 text-sci" /> Oxygen Mass
                    </span>
                    <span className="mono text-fg">{m.supplies.oxygen_kg} kg</span>
                  </div>
                  <Slider
                    value={[m.supplies.oxygen_kg]}
                    min={5}
                    max={200}
                    step={1}
                    onValueChange={([v]) => m.setSupplies({ oxygen_kg: v })}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-fg-muted flex items-center gap-1">
                      <Droplets className="h-3 w-3 text-blue-400" /> Potable & Hygiene Water
                    </span>
                    <span className="mono text-fg">{m.supplies.water_kg} kg</span>
                  </div>
                  <Slider
                    value={[m.supplies.water_kg]}
                    min={20}
                    max={600}
                    step={5}
                    onValueChange={([v]) => m.setSupplies({ water_kg: v })}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-fg-muted flex items-center gap-1">
                      <Zap className="h-3 w-3 text-yellow-400" /> Battery Storage
                    </span>
                    <span className="mono text-fg">{m.supplies.battery_kwh} kWh</span>
                  </div>
                  <Slider
                    value={[m.supplies.battery_kwh]}
                    min={100}
                    max={3000}
                    step={25}
                    onValueChange={([v]) => m.setSupplies({ battery_kwh: v })}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-fg-muted flex items-center gap-1">
                      CO2 Scrubber Capacity
                    </span>
                    <span className="mono text-fg">{m.supplies.co2_scrubber_capacity_kg} kg CO2</span>
                  </div>
                  <Slider
                    value={[m.supplies.co2_scrubber_capacity_kg]}
                    min={5}
                    max={200}
                    step={1}
                    onValueChange={([v]) => m.setSupplies({ co2_scrubber_capacity_kg: v })}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-fg-muted">Food Rations</span>
                    <span className="mono text-fg">{m.supplies.food_kg} kg dry</span>
                  </div>
                  <Slider
                    value={[m.supplies.food_kg]}
                    min={5}
                    max={150}
                    step={1}
                    onValueChange={([v]) => m.setSupplies({ food_kg: v })}
                  />
                </div>

                <div className="space-y-2 pt-2 border-t border-line">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-fg-muted">Emergency Reserve Margin</span>
                    <span className="mono text-fg font-semibold">{(m.supplies.emergency_reserve_fraction * 100).toFixed(0)}%</span>
                  </div>
                  <Slider
                    value={[m.supplies.emergency_reserve_fraction * 100]}
                    min={5}
                    max={50}
                    step={5}
                    onValueChange={([v]) => m.setSupplies({ emergency_reserve_fraction: v / 100 })}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-fg-muted">Return Journey Reserve Days</span>
                    <span className="mono text-fg">{m.supplies.return_journey_days} sols</span>
                  </div>
                  <Slider
                    value={[m.supplies.return_journey_days]}
                    min={0.5}
                    max={10}
                    step={0.5}
                    onValueChange={([v]) => m.setSupplies({ return_journey_days: v })}
                  />
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: NASA BVAD Assumptions Editor */}
            <TabsContent value="assumptions" className="space-y-3 pt-2">
              <div className="space-y-2.5 text-[11px]">
                <div className="flex items-center justify-between pb-1.5 border-b border-line">
                  <span className="font-semibold text-fg">Baseline Parameters (BVAD 2022)</span>
                  {m.route && (
                    <Button size="xs" variant="secondary" onClick={syncWithPlannedRoute}>
                      Sync with Route
                    </Button>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-fg-muted">O2 per astronaut:</span>
                  <span className="mono text-fg">{m.assumptions.o2_kg_per_day} kg/d</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-fg-muted">EVA O2 Multiplier:</span>
                  <span className="mono text-fg">{m.assumptions.o2_eva_multiplier}x</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-fg-muted">Daily EVA Hours:</span>
                  <span className="mono text-fg">{m.assumptions.eva_hours_per_day} h/d</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-fg-muted">Water Recycling Efficiency:</span>
                  <span className="mono text-fg">{(m.assumptions.water_recycling_efficiency * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-fg-muted">Habitat Base Power:</span>
                  <span className="mono text-fg">{m.assumptions.habitat_power_kw} kW</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-fg-muted">Rover Traction Energy:</span>
                  <span className="mono text-fg">{m.assumptions.rover_kwh_per_km} kWh/km</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-fg-muted">Daily Rover Travel:</span>
                  <span className="mono text-fg">{m.assumptions.rover_km_per_day} km/d</span>
                </div>

                <div className="pt-2 border-t border-line text-[10px] text-fg-dim leading-relaxed">
                  Data Sources: NASA Baseline Values and Assumptions Document (BVAD) NASA/TP-2015-218570 Rev. 2.
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: Scenarios Comparison */}
            <TabsContent value="scenarios" className="space-y-2 pt-2">
              {allResults ? (
                <div className="space-y-2">
                  {Object.entries(allResults).map(([key, res]) => (
                    <div
                      key={key}
                      onClick={() => {
                        m.setScenario(key)
                        m.setSimulation(res)
                      }}
                      className={`panel-2 p-2.5 rounded border transition-all cursor-pointer ${
                        m.scenarioId === key ? 'border-sci bg-panel-3' : 'hover:border-fg-dim'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-[11.5px] text-fg">{res.scenario.name}</span>
                        <Badge variant={res.verdict === 'ok' ? 'safe' : res.verdict === 'warning' ? 'caution' : 'danger'}>
                          {res.verdict.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="text-[10.5px] text-fg-muted">
                        Limiting resource: <span className="mono text-ember">{res.limiting_resource}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="panel-2 p-6 text-center text-fg-dim text-[12px]">
                  Click "Simulate All Scenarios" to run batch simulation.
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Workflow step navigator */}
          <div className="pt-3 border-t border-line flex items-center justify-between">
            <Button size="sm" variant="ghost" asChild>
              <Link to="/routes">← Back to Routes</Link>
            </Button>
            <Button size="sm" variant="sci" asChild>
              <Link to="/assessment">Proceed to Mission Assessment →</Link>
            </Button>
          </div>
        </aside>
      </div>
    </div>
  )
}
