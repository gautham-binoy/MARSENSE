import { useEffect, useState } from 'react'
import {
  Clock,
  Database,
  Download,
  FolderOpen,
  Plus,
  Save,
  Trash2,
  Upload,
} from 'lucide-react'
import { api, type MissionSummary } from '@/lib/api'
import { planFromState, useMission } from '@/store/mission'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Callout, ScoreRing, Spinner } from '@/components/common'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MissionVaultModal({ open, onOpenChange }: Props) {
  const m = useMission()
  const [missions, setMissions] = useState<MissionSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [newMissionName, setNewMissionName] = useState(m.name || 'Jezero Delta Expedition')
  const [activeTab, setActiveTab] = useState<'browse' | 'save' | 'import'>('browse')

  const fetchMissions = async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await api.missions()
      setMissions(list)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load missions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      setSuccess(null)
      setError(null)
      setNewMissionName(m.name || 'Jezero Delta Expedition')
      void fetchMissions()
    }
  }, [open, m.name])

  const handleLoadMission = async (id: number) => {
    setActionLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const data = await api.mission(id)
      m.loadPlan(data.plan, data.id, data.name)
      if (data.assessment) {
        m.setAssessment(data.assessment)
      }
      setSuccess(`Mission "${data.name}" loaded into active session!`)
      setTimeout(() => onOpenChange(false), 900)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load mission details')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteMission = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete mission "${name}"?`)) return
    setActionLoading(true)
    setError(null)
    try {
      await api.deleteMission(id)
      if (m.missionId === id) {
        m.setMissionId(null)
      }
      setSuccess(`Mission "${name}" deleted.`)
      await fetchMissions()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete mission')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSaveAsNew = async () => {
    if (!newMissionName.trim()) {
      setError('Please provide a mission name.')
      return
    }
    setActionLoading(true)
    setError(null)
    setSuccess(null)
    try {
      m.setName(newMissionName.trim())
      const plan = planFromState(m)
      const res = await api.createMission({
        name: newMissionName.trim(),
        region_id: m.regionId,
        plan,
        assessment: m.assessment,
      })
      m.setMissionId(res.id)
      setSuccess(`Mission saved as "${newMissionName}" (ID #${res.id}).`)
      await fetchMissions()
      setActiveTab('browse')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create mission')
    } finally {
      setActionLoading(false)
    }
  }

  const handleExportJson = () => {
    const plan = planFromState(m)
    const exportData = {
      app: 'MARSENSE',
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      name: m.name,
      region_id: m.regionId,
      plan,
      assessment: m.assessment,
      simulation: m.simulation,
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `MARSENSE_FlightPlan_${m.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const parsed = JSON.parse(text)
        if (!parsed.plan) throw new Error('Invalid MARSENSE mission file format: missing plan.')
        m.loadPlan(parsed.plan, null, parsed.name || file.name.replace('.json', ''))
        if (parsed.assessment) m.setAssessment(parsed.assessment)
        if (parsed.simulation) m.setSimulation(parsed.simulation)
        setSuccess(`Mission imported successfully from ${file.name}!`)
        setTimeout(() => onOpenChange(false), 900)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to parse JSON mission file')
      }
    }
    reader.readAsText(file)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-5 space-y-4">
        <div>
          <DialogTitle className="flex items-center gap-2 text-[15px]">
            <Database className="h-4 w-4 text-sci" />
            Mission Flight Plan Vault (SQLite Persistence)
          </DialogTitle>
          <DialogDescription className="text-[11.5px] text-fg-dim mt-0.5">
            Save, load, duplicate, and export full Martian exploration plans, including waypoints, ECLSS supplies, and feasibility assessments.
          </DialogDescription>
        </div>

        {error && <Callout kind="danger">{error}</Callout>}
        {success && <Callout kind="info">{success}</Callout>}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="browse" className="text-[11.5px]">
              Saved Missions ({missions.length})
            </TabsTrigger>
            <TabsTrigger value="save" className="text-[11.5px]">
              Save Active Mission
            </TabsTrigger>
            <TabsTrigger value="import" className="text-[11.5px]">
              Export / Import JSON
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Browse & Load */}
          <TabsContent value="browse" className="space-y-3 pt-3">
            {loading ? (
              <div className="py-8 text-center text-fg-dim text-[12px] flex items-center justify-center gap-2">
                <Spinner /> Querying mission database...
              </div>
            ) : missions.length === 0 ? (
              <div className="panel-2 p-6 text-center text-fg-dim text-[12px] space-y-2">
                <Database className="h-8 w-8 mx-auto opacity-30 text-sci" />
                <p>No saved missions found in the local SQLite database.</p>
                <Button size="sm" variant="sci" onClick={() => setActiveTab('save')}>
                  <Plus className="h-3 w-3" /> Save Current Plan
                </Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {missions.map((item) => {
                  const isCurrent = m.missionId === item.id
                  return (
                    <div
                      key={item.id}
                      className={`panel-2 p-3 rounded-lg border flex items-center justify-between gap-3 transition-all ${
                        isCurrent ? 'border-sci/60 bg-sci/10' : 'hover:border-fg-dim'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {item.score !== null && item.score !== undefined ? (
                          <ScoreRing score={item.score} size={42} label="" />
                        ) : (
                          <div className="h-10 w-10 rounded-full border border-line flex items-center justify-center text-fg-dim text-[11px] mono">
                            #{item.id}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[13px] text-fg truncate">{item.name}</span>
                            {isCurrent && <Badge variant="safe">Active</Badge>}
                            {item.verdict && (
                              <Badge
                                variant={
                                  item.verdict === 'feasible'
                                    ? 'safe'
                                    : item.verdict === 'feasible_with_changes'
                                    ? 'caution'
                                    : 'danger'
                                }
                              >
                                {item.verdict.replace(/_/g, ' ')}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[10.5px] text-fg-dim mt-0.5 mono">
                            <span>Region: {item.region_id}</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(item.updated_at).toLocaleDateString()} {new Date(item.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          variant={isCurrent ? 'secondary' : 'sci'}
                          onClick={() => handleLoadMission(item.id)}
                          disabled={actionLoading}
                        >
                          <FolderOpen className="h-3.5 w-3.5" />
                          {isCurrent ? 'Reload' : 'Load Plan'}
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => handleDeleteMission(item.id, item.name)}
                          disabled={actionLoading}
                          title="Delete mission"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-fg-dim hover:text-danger" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* TAB 2: Save As New */}
          <TabsContent value="save" className="space-y-3 pt-3">
            <div className="panel-2 p-3 space-y-3 text-[12px]">
              <div>
                <label className="text-fg-muted font-medium mb-1 block">Mission Title / Codename</label>
                <Input
                  value={newMissionName}
                  onChange={(e) => setNewMissionName(e.target.value)}
                  placeholder="e.g. Jezero Delta Astrobiology Traverse"
                  className="text-[12px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-fg-muted panel p-2.5 rounded border border-line/60">
                <div>Base: <strong className="text-fg">{m.base ? `${m.base.lat.toFixed(2)}°N, ${m.base.lon.toFixed(2)}°E` : 'Not set'}</strong></div>
                <div>Crew Size: <strong className="text-fg">{m.supplies.crew} astronauts</strong></div>
                <div>Duration: <strong className="text-fg">{m.supplies.duration_days} sols</strong></div>
                <div>Route Points: <strong className="text-fg">{m.routePoints.length} waypoints</strong></div>
                <div>Strategy: <strong className="text-fg capitalize">{m.routeStrategy}</strong></div>
                <div>Feasibility Verdict: <strong className="text-fg">{m.assessment?.verdict.replace(/_/g, ' ') ?? 'Pending'}</strong></div>
              </div>

              <Button
                variant="sci"
                className="w-full"
                onClick={handleSaveAsNew}
                disabled={actionLoading}
              >
                {actionLoading ? <Spinner /> : <Save className="h-3.5 w-3.5" />}
                Save as New Mission Record
              </Button>
            </div>
          </TabsContent>

          {/* TAB 3: Export & Import */}
          <TabsContent value="import" className="space-y-3 pt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]">
              {/* Export Card */}
              <div className="panel-2 p-3.5 rounded-lg border border-line space-y-2.5">
                <div className="flex items-center gap-1.5 font-semibold text-fg">
                  <Download className="h-4 w-4 text-sci" /> Export Mission JSON
                </div>
                <p className="text-[11px] text-fg-muted">
                  Download the complete mission plan, waypoint coordinates, supplies mass balance, and assessment scorecard as portable JSON.
                </p>
                <Button size="sm" variant="secondary" className="w-full" onClick={handleExportJson}>
                  <Download className="h-3.5 w-3.5" /> Download JSON File
                </Button>
              </div>

              {/* Import Card */}
              <div className="panel-2 p-3.5 rounded-lg border border-line space-y-2.5">
                <div className="flex items-center gap-1.5 font-semibold text-fg">
                  <Upload className="h-4 w-4 text-ember" /> Import Mission JSON
                </div>
                <p className="text-[11px] text-fg-muted">
                  Restore a previously exported flight plan file to immediately populate the globe, routes, and life-support simulator.
                </p>
                <label className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-panel-3 border border-line text-[11.5px] font-medium text-fg hover:border-sci cursor-pointer transition-all">
                  <Upload className="h-3.5 w-3.5 text-sci" />
                  <span>Choose .json File</span>
                  <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
                </label>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
