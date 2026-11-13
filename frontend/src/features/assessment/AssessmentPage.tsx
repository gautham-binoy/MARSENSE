import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertOctagon,
  AlertTriangle,
  Award,
  CheckCircle2,
  Dice5,
  Download,
  FileText,
  FolderOpen,
  Lightbulb,
  Mountain,
  Navigation,
  Play,
  Save,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { api } from '@/lib/api'
import { planFromState, useMission } from '@/store/mission'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Bar, Callout, PageHeader, ScoreRing, Spinner } from '@/components/common'
import { MissionVaultModal } from '@/features/mission-vault/MissionVaultModal'
import { MonteCarloCard } from '@/features/assessment/MonteCarloCard'

const CATEGORY_ICONS: Record<string, typeof ShieldCheck> = {
  terrain: Mountain,
  route: Navigation,
  resources: ShieldCheck,
  environment: AlertTriangle,
  science: Sparkles,
  return: Navigation,
  data_completeness: Award,
}

export default function AssessmentPage() {
  const m = useMission()
  const [assessing, setAssessing] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [saving, setSaving] = useState(false)
  const [vaultOpen, setVaultOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'scorecard' | 'montecarlo'>('scorecard')
  const [error, setError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)

  const computeAssessment = async () => {
    if (!m.base) {
      setError('Please set a mission base location before evaluating feasibility.')
      return
    }
    setAssessing(true)
    setError(null)
    setSaveSuccess(null)
    try {
      const res = await api.assess({
        base: m.base,
        targets: m.targets,
        route: m.route,
        supplies: m.supplies,
        assumptions: m.assumptions,
        scenario_id: m.scenarioId,
        profile: m.profile,
      })
      m.setAssessment(res)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Mission assessment failed')
    } finally {
      setAssessing(false)
    }
  }

  useEffect(() => {
    if (!m.assessment && m.base) {
      void computeAssessment()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDownloadPdf = async () => {
    setGeneratingPdf(true)
    setError(null)
    try {
      const plan = planFromState(m)
      const blob = await api.report({
        mission_name: m.name,
        plan,
        assessment: m.assessment,
        simulation: m.simulation,
        landing: m.landing,
      })

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `MARSENSE_${m.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'PDF generation failed')
    } finally {
      setGeneratingPdf(false)
    }
  }

  const handleSaveMission = async () => {
    setSaving(true)
    setSaveSuccess(null)
    setError(null)
    try {
      const plan = planFromState(m)
      if (m.missionId) {
        await api.updateMission(m.missionId, {
          name: m.name,
          region_id: m.regionId,
          plan,
          assessment: m.assessment,
        })
        setSaveSuccess(`Mission "${m.name}" updated successfully.`)
      } else {
        const res = await api.createMission({
          name: m.name,
          region_id: m.regionId,
          plan,
          assessment: m.assessment,
        })
        m.setMissionId(res.id)
        setSaveSuccess(`Mission "${m.name}" saved as ID #${res.id}.`)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save mission to database')
    } finally {
      setSaving(false)
    }
  }

  const a = m.assessment

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-space">
      {/* Header bar with primary action buttons */}
      <div className="border-b border-line bg-panel/90 px-4 py-2.5 backdrop-blur z-10 shrink-0">
        <PageHeader
          title="Mission Feasibility & Survival Assessment"
          subtitle="Objective multi-criteria evaluation of terrain accessibility, consumable margins, return logistics, and scientific payoff."
        >
          <div className="flex items-center gap-2">
            <Button
              variant="sci"
              size="sm"
              onClick={computeAssessment}
              disabled={assessing || !m.base}
            >
              {assessing ? <Spinner /> : <Play className="h-3.5 w-3.5" />}
              Recompute Assessment
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setVaultOpen(true)}
              className="text-ember border-ember/30 hover:bg-ember/10"
              title="Open SQLite saved flight plans vault"
            >
              <FolderOpen className="h-3.5 w-3.5" />
              Mission Vault
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSaveMission}
              disabled={saving}
            >
              {saving ? <Spinner /> : <Save className="h-3.5 w-3.5" />}
              Save Mission
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={generatingPdf}
              className="border-sci/40 text-sci-2 hover:bg-sci/10"
            >
              {generatingPdf ? <Spinner /> : <Download className="h-3.5 w-3.5 text-sci" />}
              Download PDF Report
            </Button>
          </div>
        </PageHeader>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {error && <Callout kind="danger">{error}</Callout>}
        {saveSuccess && <Callout kind="info">{saveSuccess}</Callout>}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid grid-cols-2 max-w-md mb-2">
            <TabsTrigger value="scorecard" className="text-[12px] flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-safe" />
              Feasibility Scorecard & Rules
            </TabsTrigger>
            <TabsTrigger value="montecarlo" className="text-[12px] flex items-center gap-1.5">
              <Dice5 className="h-3.5 w-3.5 text-sci" />
              Monte Carlo Risk (500 Runs)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scorecard" className="space-y-4">

        {/* Top Summary Banner: Overall Score, Confidence, Verdict, Constraints */}
        {a ? (
          <div className="panel-2 p-4 rounded-xl border border-line flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <ScoreRing score={a.overall_score} size={84} label="Score" />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[17px] font-bold text-fg tracking-tight">
                    Mission Verdict:{' '}
                    <span
                      className={
                        a.verdict === 'feasible'
                          ? 'text-safe'
                          : a.verdict === 'feasible_with_changes'
                          ? 'text-caution'
                          : a.verdict === 'insufficient_data'
                          ? 'text-sci-2'
                          : 'text-danger'
                      }
                    >
                      {a.verdict.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </h2>
                  <Badge variant={a.verdict === 'feasible' ? 'safe' : a.verdict === 'feasible_with_changes' ? 'caution' : 'danger'}>
                    {a.verdict.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <div className="text-[11.5px] text-fg-muted mt-1 flex flex-wrap items-center gap-3">
                  <span>Confidence: <strong className="text-fg mono">{(a.confidence * 100).toFixed(0)}%</strong></span>
                  <span>Scenario: <strong className="text-fg">{a.scenario}</strong></span>
                  <span>Crew: <strong className="text-fg">{m.supplies.crew} astronauts</strong></span>
                  <span>Duration: <strong className="text-fg">{m.supplies.duration_days} sols</strong></span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 justify-end">
              <Button size="sm" variant="secondary" asChild>
                <Link to="/routes">Edit Route</Link>
              </Button>
              <Button size="sm" variant="secondary" asChild>
                <Link to="/survival">Adjust Supplies</Link>
              </Button>
              <Button size="sm" variant="sci" onClick={handleDownloadPdf} disabled={generatingPdf}>
                <FileText className="h-3.5 w-3.5" />
                Generate Official NASA Space Apps PDF
              </Button>
            </div>
          </div>
        ) : (
          <div className="panel-2 p-8 text-center text-fg-dim text-[13px] space-y-2">
            <ShieldAlert className="h-10 w-10 mx-auto opacity-30 text-sci" />
            <p>Click "Recompute Assessment" to evaluate the mission feasibility across all 7 scientific dimensions.</p>
          </div>
        )}

        {/* Safety Capping Notice (if overall score was hard-capped) */}
        {a && a.caps_applied && a.caps_applied.length > 0 && (
          <div className="space-y-1">
            {a.caps_applied.map((cap, i) => (
              <Callout key={i} kind="warn">
                <span className="font-semibold">Safety Rule Triggered: </span>
                {cap}
              </Callout>
            ))}
          </div>
        )}

        {/* Critical Warnings */}
        {a && a.critical_warnings && a.critical_warnings.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[12px] font-semibold text-danger flex items-center gap-1.5">
              <AlertOctagon className="h-4 w-4" /> Critical Mission Blockers ({a.critical_warnings.length})
            </span>
            <div className="space-y-1">
              {a.critical_warnings.map((w, idx) => (
                <Callout key={idx} kind="danger">
                  {w}
                </Callout>
              ))}
            </div>
          </div>
        )}

        {/* Actionable Recommendations */}
        {a && a.recommendations && a.recommendations.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-[13px] text-sci-2">
                <Lightbulb className="h-4 w-4 text-ember" /> Recommended Plan Adjustments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5 text-[11.5px] text-fg-muted">
                {a.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-sci mt-0.5">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* 7 Category Evaluation Breakdown */}
        {a && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-fg flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-safe" /> Dimension Evaluation Breakdown
              </h3>
              <span className="text-[11px] text-fg-dim">
                Weighted combination of verified scientific parameters
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(a.categories).map(([catKey, cat]) => {
                const Icon = CATEGORY_ICONS[catKey] ?? ShieldCheck
                const weight = a.weights[catKey] ?? 0
                return (
                  <div key={catKey} className="panel-2 p-3.5 rounded-lg border border-line space-y-2.5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded bg-panel-3 text-sci">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-[12.5px] font-semibold text-fg capitalize">
                            {catKey.replace(/_/g, ' ')}
                          </div>
                          <div className="text-[10px] text-fg-dim">
                            Weight: {(weight * 100).toFixed(0)}% · Confidence: {(cat.confidence * 100).toFixed(0)}%
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`mono text-[16px] font-bold ${
                            cat.score >= 75 ? 'text-safe' : cat.score >= 50 ? 'text-caution' : 'text-danger'
                          }`}
                        >
                          {cat.score}
                        </span>
                        <span className="text-[10px] text-fg-dim">/100</span>
                      </div>
                    </div>

                    <Bar value={cat.score} max={100} />

                    <p className="text-[11px] text-fg-muted leading-relaxed">
                      {cat.explanation}
                    </p>

                    {cat.warnings && cat.warnings.length > 0 && (
                      <div className="space-y-1 pt-1.5 border-t border-line/60">
                        {cat.warnings.map((cw, ci) => (
                          <div key={ci} className="text-[10.5px] text-caution flex items-start gap-1">
                            <span>⚠</span>
                            <span>{cw}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Disclaimer note */}
        {a && (
          <div className="text-[10.5px] text-fg-dim italic panel-2 p-2.5 border-line/50">
            {a.disclaimer}
          </div>
        )}
          </TabsContent>

          <TabsContent value="montecarlo" className="space-y-4">
            <MonteCarloCard />
          </TabsContent>
        </Tabs>

        <MissionVaultModal open={vaultOpen} onOpenChange={setVaultOpen} />
      </div>
    </div>
  )
}
