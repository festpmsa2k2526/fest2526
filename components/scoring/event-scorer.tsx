"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Trophy, Save, Users, User, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

// --- TYPES ---
interface Event {
  id: string
  name: string
  event_code: string
  grade_type: 'A' | 'B' | 'C'
  category: string
  applicable_section: string[]
}

interface Team {
  id: string
  name: string
  color_hex: string
}

interface Participant {
  id: string
  student_id: string | null
  student?: { id: string; name: string; chest_no: string } | null
  team: { id: string; name: string; color_hex: string }
  result_position: 'FIRST' | 'SECOND' | 'THIRD' | null
}

const POINTS_TABLE = {
  'A': { 'FIRST': 15, 'SECOND': 10, 'THIRD': 5 },
  'B': { 'FIRST': 10, 'SECOND': 5, 'THIRD': 3 },
  'C': { 'FIRST': 20, 'SECOND': 15, 'THIRD': 10 },
}

interface EventScorerProps {
  section: string
  category: string
  onScoreSaved?: () => void
}

export function EventScorer({ section, category, onScoreSaved }: EventScorerProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [scoreMode, setScoreMode] = useState<'INDIVIDUAL' | 'TEAM'>('INDIVIDUAL')

  // Data
  const [events, setEvents] = useState<Event[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>("")
  const [participants, setParticipants] = useState<Participant[]>([])

  // Winners State
  const [firstPlace, setFirstPlace] = useState<string[]>([])
  const [secondPlace, setSecondPlace] = useState<string[]>([])
  const [thirdPlace, setThirdPlace] = useState<string[]>([])

  const supabase = createClient()

  // 1. Load Events & Teams
  useEffect(() => {
    async function loadData() {
      setLoading(true)

      const [eventsData, teamsData] = await Promise.all([
        supabase.from('events').select('*').eq('category', category).contains('applicable_section', [section]).order('name'),
        supabase.from('teams').select('*').order('name')
      ])

      if (eventsData.data) setEvents(eventsData.data as any)
      if (teamsData.data) setTeams(teamsData.data as any)

      setLoading(false)
    }
    loadData()
  }, [section, category])

  // 2. Load Participants when Event Selected
  useEffect(() => {
    if (!selectedEventId) {
      setParticipants([])
      setFirstPlace([])
      setSecondPlace([])
      setThirdPlace([])
      return
    }

    async function loadParts() {
      setLoading(true)
      const { data } = await supabase
        .from('participations')
        .select(`id, result_position, student_id, students ( id, name, chest_no ), teams ( id, name, color_hex )`)
        .eq('event_id', selectedEventId)

      if (data) {
        const mapped = data.map((p: any) => ({
          id: p.id,
          student_id: p.student_id,
          result_position: p.result_position,
          student: p.students,
          team: p.teams
        }))
        setParticipants(mapped)

        const hasTeamOnly = mapped.some(p => !p.student_id && p.result_position)
        if (hasTeamOnly) setScoreMode('TEAM')

        const getIds = (pos: string) => mapped.filter((p:any) => p.result_position === pos).map((p:any) => p.student_id ? p.id : p.team.id)
        setFirstPlace(getIds('FIRST'))
        setSecondPlace(getIds('SECOND'))
        setThirdPlace(getIds('THIRD'))
      }
      setLoading(false)
    }
    loadParts()
  }, [selectedEventId])

  // 3. Save Results
  const handleSave = async () => {
    if (!selectedEventId) return
    setSaving(true)

    const event = events.find(e => e.id === selectedEventId)
    if (!event) return

    // @ts-ignore
    const points = POINTS_TABLE[event.grade_type || 'A']

    try {
      if (scoreMode === 'INDIVIDUAL') {
        const updates = participants.filter(p => p.student).map(p => {
            let pos: any = null
            let pts = 0
            if (firstPlace.includes(p.id)) { pos = 'FIRST'; pts = points.FIRST }
            else if (secondPlace.includes(p.id)) { pos = 'SECOND'; pts = points.SECOND }
            else if (thirdPlace.includes(p.id)) { pos = 'THIRD'; pts = points.THIRD }

            return {
                id: p.id,
                event_id: selectedEventId,
                team_id: p.team.id,
                student_id: p.student_id,
                result_position: pos,
                points_earned: pts,
                status: pos ? 'winner' : 'registered'
            }
        })
        if (updates.length > 0) {
            const { error } = await (supabase.from('participations') as any).upsert(updates)
            if (error) throw error
        }
      } else {
        await supabase.from('participations').delete().eq('event_id', selectedEventId).is('student_id', null)

        const newTeamResults: any[] = []
        const addResults = (ids: string[], pos: string, pts: number) => {
            ids.forEach(tid => newTeamResults.push({ event_id: selectedEventId, team_id: tid, student_id: null, result_position: pos, points_earned: pts, status: 'winner' }))
        }
        addResults(firstPlace, 'FIRST', points.FIRST)
        addResults(secondPlace, 'SECOND', points.SECOND)
        addResults(thirdPlace, 'THIRD', points.THIRD)

        if (newTeamResults.length > 0) {
            const { error } = await (supabase.from('participations') as any).insert(newTeamResults)
            if (error) throw error
        }
      }

      if (onScoreSaved) onScoreSaved()

    } catch (err: any) {
      alert("Failed to save: " + err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleWinner = (pos: 'FIRST'|'SECOND'|'THIRD', id: string) => {
      const current = pos === 'FIRST' ? firstPlace : pos === 'SECOND' ? secondPlace : thirdPlace
      const setter = pos === 'FIRST' ? setFirstPlace : pos === 'SECOND' ? setSecondPlace : setThirdPlace
      const all = [...firstPlace, ...secondPlace, ...thirdPlace]

      if (current.includes(id)) setter(prev => prev.filter(x => x !== id))
      else if (!all.includes(id)) setter(prev => [...prev, id])
      else alert("Already assigned to a position")
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
        {/* Selector Header */}
        <div className="flex flex-col gap-4 bg-muted/30 p-4 rounded-xl border border-border/50 shrink-0">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-end">
                <div className="w-full md:w-1/2 space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Select Event</label>
                    <div onClick={(e) => e.stopPropagation()}>
                        <Select value={selectedEventId} onValueChange={(v) => { setSelectedEventId(v); setFirstPlace([]); setSecondPlace([]); setThirdPlace([]) }}>
                            <SelectTrigger className="bg-background shadow-sm h-10"><SelectValue placeholder="-- Choose Event --" /></SelectTrigger>
                            <SelectContent>
                                {events.map(e => <SelectItem key={e.id} value={e.id}>{e.name} ({e.event_code})</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                {selectedEventId && (
                    <div className="w-full md:w-auto">
                        <Tabs value={scoreMode} onValueChange={(v) => { setScoreMode(v as any); setFirstPlace([]); setSecondPlace([]); setThirdPlace([]) }} className="w-full">
                            <TabsList className="bg-background border border-border h-10 p-1 w-full md:w-auto">
                                <TabsTrigger value="INDIVIDUAL" className="text-xs"><User className="w-3.5 h-3.5 mr-2"/> Student</TabsTrigger>
                                <TabsTrigger value="TEAM" className="text-xs"><Users className="w-3.5 h-3.5 mr-2"/> Team</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                )}
            </div>
        </div>

        {/* Scoring Matrix */}
        {selectedEventId && (
            <div className="flex-1 overflow-y-auto min-h-0 pr-1 pb-20 md:pb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4">
                    {['FIRST', 'SECOND', 'THIRD'].map(pos => {
                        // @ts-ignore
                        const pts = POINTS_TABLE[events.find(e => e.id === selectedEventId)?.grade_type || 'A'][pos]
                        const selectedIds = pos === 'FIRST' ? firstPlace : pos === 'SECOND' ? secondPlace : thirdPlace

                        // Dynamic Styles for Positions
                        const style = {
                            FIRST: { border: 'border-yellow-400', headerBg: 'bg-yellow-100/50', icon: 'text-yellow-600', activeBg: 'bg-yellow-50', activeBorder: 'border-yellow-500' },
                            SECOND: { border: 'border-slate-300', headerBg: 'bg-slate-100/50', icon: 'text-slate-600', activeBg: 'bg-slate-100', activeBorder: 'border-slate-400' },
                            THIRD: { border: 'border-orange-300', headerBg: 'bg-orange-100/50', icon: 'text-orange-600', activeBg: 'bg-orange-50', activeBorder: 'border-orange-400' }
                        }[pos as 'FIRST'|'SECOND'|'THIRD']

                        return (
                            <Card key={pos} className={cn("border-t-4 shadow-sm flex flex-col h-[350px] md:h-[450px]", style.border)}>
                                <CardHeader className={cn("pb-2 shrink-0 border-b border-border/10", style.headerBg)}>
                                    <div className="flex justify-between items-center">
                                        <CardTitle className={cn("flex items-center gap-2 text-base font-heading", style.icon)}>
                                            <Trophy className="w-4 h-4" /> {pos} Place
                                        </CardTitle>
                                        <Badge variant="secondary" className="font-mono text-xs">{pts} pts</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1 overflow-y-auto pt-2 space-y-2 p-3 bg-card/50">
                                    {scoreMode === 'INDIVIDUAL' ? (
                                        participants.filter(p => p.student).length > 0 ? (
                                            participants.filter(p => p.student).map(p => {
                                                const isSelected = selectedIds.includes(p.id)
                                                return (
                                                    <div
                                                        key={p.id}
                                                        onClick={() => toggleWinner(pos as any, p.id)}
                                                        className={cn(
                                                            "p-2.5 border rounded-lg cursor-pointer transition-all duration-200 relative group",
                                                            isSelected
                                                                ? cn("shadow-sm ring-1 ring-inset z-10", style.activeBg, style.activeBorder)
                                                                : "bg-background border-border hover:border-primary/30"
                                                        )}
                                                    >
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <div className={cn("font-bold text-sm", isSelected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}>{p.student?.name}</div>
                                                                <div className="text-[10px] text-muted-foreground flex gap-1 mt-0.5">
                                                                    <span className="font-mono bg-muted/50 px-1 rounded border border-border/50">{p.student?.chest_no}</span>
                                                                    <span>{p.team.name}</span>
                                                                </div>
                                                            </div>
                                                            {isSelected && <CheckCircle2 className={cn("w-4 h-4", style.icon)} />}
                                                        </div>
                                                    </div>
                                                )
                                            })
                                        ) : <div className="text-center text-xs text-muted-foreground mt-10">No students registered.</div>
                                    ) : (
                                        teams.map(t => {
                                            const isSelected = selectedIds.includes(t.id)
                                            return (
                                                <div
                                                    key={t.id}
                                                    onClick={() => toggleWinner(pos as any, t.id)}
                                                    className={cn(
                                                        "p-3 border rounded-lg cursor-pointer transition-all duration-200 flex items-center justify-between",
                                                        isSelected
                                                            ? cn("shadow-sm ring-1 ring-inset", style.activeBg, style.activeBorder)
                                                            : "bg-background border-border hover:border-primary/30"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.color_hex }} />
                                                        <span className={cn("font-bold text-sm", isSelected ? "text-foreground" : "text-muted-foreground")}>{t.name}</span>
                                                    </div>
                                                    {isSelected && <CheckCircle2 className={cn("w-4 h-4", style.icon)} />}
                                                </div>
                                            )
                                        })
                                    )}
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            </div>
        )}

        {/* Floating Save Button */}
        {selectedEventId && (
            <div className="absolute bottom-6 right-6 md:static md:flex md:justify-end md:pt-4 md:border-t md:border-border/50 md:mt-auto md:bg-transparent z-50">
                <Button size="lg" onClick={handleSave} disabled={saving} className="shadow-lg md:shadow-none w-full md:w-auto gap-2">
                    {saving ? <Loader2 className="animate-spin" /> : <Save className="w-4 h-4" />}
                    Save & Publish
                </Button>
            </div>
        )}
    </div>
  )
}