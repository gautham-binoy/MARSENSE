import { useState, useMemo } from 'react'
import {
  CheckCircle2,
  Cpu,
  Droplets,
  Flame,
  FlaskConical,
  Gauge,
  Plus,
  Sparkles,
  Wind,
  Zap,
} from 'lucide-react'
import { useMission } from '@/store/mission'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Callout, Stat } from '@/components/common'

export function IsruSimulatorCard() {
  const m = useMission()

  // MOXIE parameters
  const [moxiePowerKw, setMoxiePowerKw] = useState(1.5)
  const [moxieHoursPerSol, setMoxieHoursPerSol] = useState(12)

  // Regolith Pyrolysis parameters
  const [regolithExcavationKgPerSol, setRegolithExcavationKgPerSol] = useState(250)
  const [regolithWaterYieldPct, setRegolithWaterYieldPct] = useState(2.2)

  // Sabatier reactor toggle
  const [sabatierEnabled, setSabatierEnabled] = useState(true)

  const [injectedSuccess, setInjectedSuccess] = useState<string | null>(null)

  const missionSols = m.supplies.duration_days

  const isruCalculations = useMemo(() => {
    // 1. MOXIE O2 calculation:
    // MOXIE delivers approx 10.5 grams O2 per kWh at 800°C SOXE
    const dailyKwh = moxiePowerKw * moxieHoursPerSol
    const dailyO2Kg = Number(((dailyKwh * 0.0105 * 1000) / 1000).toFixed(2)) // 10.5 g/kWh = 0.0105 kg/kWh
    const missionO2Kg = Number((dailyO2Kg * missionSols).toFixed(2))
    const crewDailyO2Demand = m.supplies.crew * m.assumptions.o2_kg_per_day
    const o2SelfSufficiencyPct = Math.min(100, Math.round((dailyO2Kg / crewDailyO2Demand) * 100))

    // 2. Regolith Pyrolysis H2O calculation:
    // 250 kg regolith * 2.2% = 5.5 kg H2O/sol
    const dailyWaterKg = Number(((regolithExcavationKgPerSol * regolithWaterYieldPct) / 100).toFixed(2))
    const missionWaterKg = Number((dailyWaterKg * missionSols).toFixed(2))
    const energyRequiredKwh = Number((dailyWaterKg * 3.2).toFixed(1)) // ~3.2 kWh/kg H2O thermal energy
    const crewDailyWaterDemand = m.supplies.crew * m.assumptions.water_kg_per_day
    const waterSelfSufficiencyPct = Math.min(100, Math.round((dailyWaterKg / crewDailyWaterDemand) * 100))

    // 3. Sabatier Methane (CH4) Synthesis:
    // CO2 + 4 H2 -> CH4 + 2 H2O
    // 1 kg H2 + 5.5 kg CO2 -> 2 kg CH4 + 4.5 kg H2O
    const dailyMethaneKg = sabatierEnabled ? Number((dailyWaterKg * 0.44).toFixed(2)) : 0
    const missionMethaneKg = Number((dailyMethaneKg * missionSols).toFixed(2))

    return {
      dailyO2Kg,
      missionO2Kg,
      o2SelfSufficiencyPct,
      dailyWaterKg,
      missionWaterKg,
      waterSelfSufficiencyPct,
      energyRequiredKwh,
      dailyMethaneKg,
      missionMethaneKg,
    }
  }, [
    moxiePowerKw,
    moxieHoursPerSol,
    regolithExcavationKgPerSol,
    regolithWaterYieldPct,
    sabatierEnabled,
    missionSols,
    m.supplies.crew,
    m.assumptions.o2_kg_per_day,
    m.assumptions.water_kg_per_day,
  ])

  const handleInjectSupplies = () => {
    const newOxygen = Number((m.supplies.oxygen_kg + isruCalculations.missionO2Kg).toFixed(1))
    const newWater = Number((m.supplies.water_kg + isruCalculations.missionWaterKg).toFixed(1))

    m.setSupplies({
      oxygen_kg: newOxygen,
      water_kg: newWater,
    })

    setInjectedSuccess(
      `Successfully injected +${isruCalculations.missionO2Kg} kg O2 and +${isruCalculations.missionWaterKg} kg H2O into Mission Supplies! Total supplies now: ${newOxygen} kg O2, ${newWater} kg H2O.`
    )
  }

  return (
    <Card className="border-line shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-[14px] text-fg">
            <FlaskConical className="h-4 w-4 text-sci" />
            ISRU Chemical Plant & Fuel Synthesizer
          </CardTitle>
          <Badge variant="sci">NASA Technology Level 7</Badge>
        </div>
        <p className="text-[11px] text-fg-dim">
          Model in-situ resource extraction utilizing MOXIE atmospheric Solid Oxide Electrolysis (CO2 → O2) and regolith thermal dehydration (450°C clay pyrolysis).
        </p>
      </CardHeader>

      <CardContent className="space-y-4 text-[12px]">
        {injectedSuccess && (
          <Callout kind="info">
            <div className="flex items-center gap-1.5 text-safe">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{injectedSuccess}</span>
            </div>
          </Callout>
        )}

        {/* Top Summary Output Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat
            label="Daily O2 (MOXIE)"
            value={`${isruCalculations.dailyO2Kg} kg/sol`}
            hint={`${isruCalculations.o2SelfSufficiencyPct}% of crew respiration`}
            tone="sci"
          />
          <Stat
            label="Daily H2O (Pyrolysis)"
            value={`${isruCalculations.dailyWaterKg} kg/sol`}
            hint={`${isruCalculations.waterSelfSufficiencyPct}% of crew hydration`}
            tone="safe"
          />
          <Stat
            label="Sortie O2 Produced"
            value={`${isruCalculations.missionO2Kg} kg`}
            hint={`Over ${missionSols} mission sols`}
          />
          <Stat
            label="Sortie H2O Extracted"
            value={`${isruCalculations.missionWaterKg} kg`}
            hint={`Over ${missionSols} mission sols`}
          />
        </div>

        {/* Reactor Parameter Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
          {/* Subsystem 1: MOXIE SOXE Module */}
          <div className="panel-2 p-3.5 rounded-lg border border-line space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-fg flex items-center gap-1.5 text-[12px]">
                <Wind className="h-3.5 w-3.5 text-sci" /> MOXIE Atmospheric O2 Plant
              </span>
              <span className="mono text-[10px] text-sci-2">800°C SOXE</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-fg-muted flex items-center gap-1">
                  <Zap className="h-3 w-3" /> Electrical Power Draw:
                </span>
                <span className="mono text-fg font-medium">{moxiePowerKw.toFixed(1)} kW</span>
              </div>
              <Slider
                value={[moxiePowerKw]}
                min={0.5}
                max={5.0}
                step={0.1}
                onValueChange={([v]) => setMoxiePowerKw(v)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-fg-muted flex items-center gap-1">
                  <Gauge className="h-3 w-3" /> Daily Duty Cycle:
                </span>
                <span className="mono text-fg font-medium">{moxieHoursPerSol} hrs / sol</span>
              </div>
              <Slider
                value={[moxieHoursPerSol]}
                min={2}
                max={24}
                step={1}
                onValueChange={([v]) => setMoxieHoursPerSol(v)}
              />
            </div>
          </div>

          {/* Subsystem 2: Regolith Thermal Pyrolysis */}
          <div className="panel-2 p-3.5 rounded-lg border border-line space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-fg flex items-center gap-1.5 text-[12px]">
                <Droplets className="h-3.5 w-3.5 text-blue-400" /> Regolith Pyrolysis Kiln
              </span>
              <span className="mono text-[10px] text-ember">450°C Thermal</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-fg-muted flex items-center gap-1">
                  <Cpu className="h-3 w-3" /> Regolith Excavation:
                </span>
                <span className="mono text-fg font-medium">{regolithExcavationKgPerSol} kg / sol</span>
              </div>
              <Slider
                value={[regolithExcavationKgPerSol]}
                min={50}
                max={1000}
                step={25}
                onValueChange={([v]) => setRegolithExcavationKgPerSol(v)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-fg-muted flex items-center gap-1">
                  <Flame className="h-3 w-3" /> Water Lattice Fraction:
                </span>
                <span className="mono text-fg font-medium">{regolithWaterYieldPct.toFixed(1)}% H2O</span>
              </div>
              <Slider
                value={[regolithWaterYieldPct]}
                min={1.0}
                max={4.0}
                step={0.1}
                onValueChange={([v]) => setRegolithWaterYieldPct(v)}
              />
            </div>
          </div>
        </div>

        {/* Sabatier MAV Propellant Option */}
        <div className="panel-2 p-3 rounded-lg border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11.5px]">
          <div>
            <div className="font-semibold text-fg flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-ember" /> Sabatier Mars Ascent Vehicle (MAV) Propellant
            </div>
            <p className="text-fg-muted text-[10.5px]">
              Couples hydrogen with atmospheric CO2 to synthesize liquid methane (CH4) rocket propellant: <strong>{isruCalculations.missionMethaneKg} kg CH4</strong> synthesized over sortie.
            </p>
          </div>
          <Button
            size="sm"
            variant={sabatierEnabled ? 'sci' : 'secondary'}
            onClick={() => setSabatierEnabled((e) => !e)}
            className="shrink-0 text-[11px]"
          >
            {sabatierEnabled ? 'Sabatier Active' : 'Enable Sabatier'}
          </Button>
        </div>

        {/* Direct Supply Injection Action */}
        <div className="pt-2 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-fg-dim flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-safe" />
            <span>Apply calculated in-situ yields to augment astronaut survival margins.</span>
          </div>

          <Button
            variant="sci"
            size="sm"
            onClick={handleInjectSupplies}
            className="w-full sm:w-auto"
          >
            <Plus className="h-3.5 w-3.5" />
            Augment Mission Supplies (+{isruCalculations.missionO2Kg} kg O2, +{isruCalculations.missionWaterKg} kg H2O)
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
