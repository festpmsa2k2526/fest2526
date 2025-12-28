"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Loader2, Check, Search, Info, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

// --- TYPES ---
interface Student {
  id: string
  name: string
  section: string
  chest_no: string | null
  team_id: string
}

interface Event {
  id: string
  name: string
  category: string
  max_participants_per_team: number
  applicable_section: string[] | null
}

interface Participation {
  id: string
  student_id: string
  event_id: string
  team_id: string
  status: string
}

interface SectionLimit {
  section: string
  category: string
  limit_count: number
}

interface Props {
  teamId: string
  teamName: string
}

// Tabs Configuration
const TABS = [
  { id: 'SENIOR_ON', label: 'Senior On-Stage', section: 'Senior', cat: 'ON STAGE' },
  { id: 'SENIOR_OFF', label: 'Senior Off-Stage', section: 'Senior', cat: 'OFF STAGE' },
  { id: 'JUNIOR_ON', label: 'Junior On-Stage', section: 'Junior', cat: 'ON STAGE' },
  { id: 'JUNIOR_OFF', label: 'Junior Off-Stage', section: 'Junior', cat: 'OFF STAGE' },
  { id: 'SUB_ON', label: 'Sub-Jr On-Stage', section: 'Sub-Junior', cat: 'ON STAGE' },
  { id: 'SUB_OFF', label: 'Sub-Jr Off-Stage', section: 'Sub-Junior', cat: 'OFF STAGE' },
  { id: 'GENERAL_ON', label: 'General On-Stage', section: 'General', cat: 'ON STAGE' },
  { id: 'GENERAL_OFF', label: 'General Off-Stage', section: 'General', cat: 'OFF STAGE' },
  { id: 'FOUNDATION_ON', label: 'Foundation On', section: 'Foundation', cat: 'ON STAGE' },
  { id: 'FOUNDATION_OFF', label: 'Foundation Off', section: 'Foundation', cat: 'OFF STAGE' },
]

export function ReplacementMatrix({ teamId, teamName }: Props) {
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(TABS[0])

  // Data State
  const [students, setStudents] = useState<Student[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [participations, setParticipations] = useState<Participation[]>([])
  const [limits, setLimits] = useState<SectionLimit[]>([])

  // Search
  const [searchQuery, setSearchQuery] = useState("")

  const supabase = createClient()

  // --- DATA FETCHING ---
  useEffect(() => {
    async function loadData() {
      if (!teamId) return

      try {
        setLoading(true)

        // Fetch All Data specific to the selected teamId
        const [stuRes, evtRes, partRes, limitRes] = await Promise.all([
          supabase.from('students').select('*').eq('team_id', teamId).order('name'),
          supabase.from('events').select('*').order('name'),
          supabase.from('participations').select('*').eq('team_id', teamId),
          supabase.from('section_limits').select('*'),
        ])

        if (stuRes.data) setStudents(stuRes.data as unknown as Student[])
        if (evtRes.data) setEvents(evtRes.data as unknown as Event[])
        if (partRes.data) setParticipations(partRes.data as unknown as Participation[])
        if (limitRes.data) setLimits(limitRes.data as unknown as SectionLimit[])

      } catch (e) {
        console.error("Load error", e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [teamId]) // Re-run when admin switches team

  // --- 1. FILTER STUDENTS BASED ON TAB ---
  const filteredStudents = useMemo(() => {
    let list = students

    // Search Filter
    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        list = list.filter(s =>
            s.name.toLowerCase().includes(q) ||
            (s.chest_no && s.chest_no.toLowerCase().includes(q))
        )
    }

    // Section Logic
    if (activeTab.section === 'General') {
        return list.filter(s => s.section === 'Senior' || s.section === 'Junior')
    } else if (activeTab.section === 'Foundation') {
        return list.filter(s => s.section === 'Sub-Junior')
    } else {
        return list.filter(s => s.section === activeTab.section)
    }
  }, [students, activeTab, searchQuery])

  // --- 2. FILTER EVENTS BASED ON TAB ---
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
        if (e.category !== activeTab.cat) return false
        if (!e.applicable_section || e.applicable_section.length === 0) return false
        return e.applicable_section.includes(activeTab.section)
    })
  }, [events, activeTab])

  // --- 3. DYNAMIC LIMIT CHECKER ---
  const getLimitStatus = (student: Student) => {
    let ruleSection = activeTab.section
    const limitRule = limits.find(l => l.section === ruleSection && l.category === activeTab.cat)
    const limit = limitRule ? limitRule.limit_count : 100

    const count = participations.filter(p => {
        const ev = events.find(e => e.id === p.event_id)
        if (!ev) return false
        const isTabSectionEvent = ev.applicable_section?.includes(activeTab.section)
        return p.student_id === student.id &&
               isTabSectionEvent &&
               ev.category === activeTab.cat
    }).length

    return { count, limit, isFull: count >= limit, remaining: limit - count }
  }

  // --- 4. TOGGLE HANDLER (ADMIN OVERRIDE) ---
  const handleToggle = async (studentId: string, eventId: string, isChecked: boolean) => {
    if (!teamId) return

    // REMOVE PARTICIPANT
    if (!isChecked) {
      // Optimistic Remove
      setParticipations(prev => prev.filter(p => !(p.student_id === studentId && p.event_id === eventId)))

      const { error } = await supabase.from('participations').delete().match({ student_id: studentId, event_id: eventId, team_id: teamId })

      if(error) {
        alert("Failed to remove participant")
        // Revert (simplified for brevity, ideally fetch again)
      }
      return
    }

    // ADD PARTICIPANT (REPLACEMENT)
    const student = students.find(s => s.id === studentId)
    const event = events.find(e => e.id === eventId)
    if (!student || !event) return

    // Limit Checks - Admin gets a warning but usually can proceed,
    // but strict logic here helps maintain integrity.
    const { isFull, limit } = getLimitStatus(student)

    if (isFull) {
      const confirm = window.confirm(`Limit Reached! This student has hit the max of ${limit}. Proceed anyway?`)
      if(!confirm) return
    }

    const eventTeamCount = participations.filter(p => p.event_id === eventId).length
    if (eventTeamCount >= event.max_participants_per_team) {
       const confirm = window.confirm(`Event Full! This event already has ${event.max_participants_per_team} participants. Add anyway?`)
       if(!confirm) return
    }

    // Optimistic Update
    const tempId = Math.random().toString()
    const newPart = {
      id: tempId,
      student_id: studentId,
      event_id: eventId,
      team_id: teamId,
      status: 'registered',
      created_at: new Date().toISOString()
    } as any

    setParticipations(prev => [...prev, newPart])

    const { data: inserted, error } = await (supabase.from('participations') as any).insert({
      student_id: studentId,
      event_id: eventId,
      team_id: teamId,
      status: 'registered'
    }).select().single()

    if (error) {
       setParticipations(prev => prev.filter(p => p.id !== tempId))
       alert("Error adding: " + error.message)
    } else {
       setParticipations(prev => prev.map(p => p.id === tempId ? inserted : p))
    }
  }

  // Helper for Cell Colors
  const getCellColor = (isRegistered: boolean, isDisabled: boolean) => {
    if (isRegistered) return "bg-blue-600 text-white border-blue-700" // Admin uses Blue for distinction
    if (isDisabled) return "bg-slate-100 opacity-50"
    return "bg-white border-slate-200 hover:bg-slate-50"
  }

  const getLimitBadgeColor = (isFull: boolean) => {
    return isFull
        ? "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600"
        : "bg-white text-slate-500 border-slate-200"
  }

  if (loading) return <div className="h-96 flex flex-col items-center justify-center gap-2 text-slate-400"><Loader2 className="animate-spin text-primary" /><p>Loading {teamName}...</p></div>

  return (
    <div className="flex flex-col space-y-4 animate-in fade-in h-full w-full overflow-hidden">

      {/* HEADER */}
      <div className="flex flex-col gap-4 shrink-0 w-full">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4 w-full">
            <div className="flex flex-col sm:flex-row w-full gap-3 items-stretch sm:items-center">
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search student..."
                        className="pl-9 bg-white shadow-sm h-10 w-full border-slate-300"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-md border border-amber-200">
                    <AlertCircle className="w-4 h-4" />
                    <span>Admin Mode: Click to replace participants.</span>
                </div>
            </div>
        </div>

        {/* TABS SCROLLER */}
        <div className="w-full overflow-x-auto pb-1 -mx-2 px-2 md:mx-0 md:px-0 scrollbar-none">
            <div className="flex gap-1 border-b border-slate-200 min-w-max">
                {TABS.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                    "px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all uppercase tracking-wide shrink-0",
                    activeTab.id === tab.id
                        ? "border-primary text-primary bg-primary/5"
                        : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                    )}
                >
                    {tab.label.replace('On-Stage', 'On').replace('Off-Stage', 'Off')}
                </button>
                ))}
            </div>
        </div>
      </div>

      {/* MATRIX TABLE */}
      <div className="flex-1 border border-slate-200 rounded-xl bg-white relative shadow-sm w-full overflow-hidden flex flex-col min-h-0">
        {filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Info className="w-12 h-12 mb-2 opacity-20" />
                <p>No programmes available for this category.</p>
            </div>
        ) : (
        <div className="overflow-auto h-full w-full scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            <table className="w-full border-collapse text-sm bg-white">
            <thead className="sticky top-0 z-20 shadow-sm bg-white">
                <tr>
                {/* STICKY CORNER */}
                <th className="p-3 text-left font-bold sticky left-0 top-0 z-30 bg-white border-r border-b border-slate-200 w-[140px] sm:w-60 min-w-[140px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    <div className="flex flex-col gap-1">
                        <span className="text-sm sm:text-base text-slate-900">Student Name</span>
                        <span className="text-[10px] font-normal text-slate-500 uppercase tracking-wider hidden sm:block">
                            {activeTab.section}
                        </span>
                    </div>
                </th>

                {/* EVENT COLUMNS */}
                {filteredEvents.map(event => {
                    const count = participations.filter(p => p.event_id === event.id).length
                    const limit = event.max_participants_per_team
                    const isFull = count >= limit

                    return (
                    <th key={event.id} className="p-1 sm:p-2 border-l border-b border-slate-200 min-w-[60px] sm:min-w-20 h-40 sm:h-[180px] align-bottom transition-colors relative group bg-white">
                        <div className="flex flex-col items-center justify-end h-full w-full pb-2 sm:pb-3 gap-2 sm:gap-3">
                            <Badge className={cn("text-[9px] h-5 px-1.5 pointer-events-none border", getLimitBadgeColor(isFull))}>
                                {count}/{limit}
                            </Badge>
                            <div
                                className="text-[10px] sm:text-xs font-semibold whitespace-nowrap tracking-wide text-slate-700"
                                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                            >
                                {event.name}
                            </div>
                        </div>
                    </th>
                    )
                })}
                </tr>
            </thead>
            <tbody>
                {filteredStudents.map((student, idx) => {
                const { isFull, remaining } = getLimitStatus(student)

                return (
                    <tr key={student.id} className="group border-b border-slate-100 hover:bg-slate-50/50">
                    {/* ROW HEADER (Sticky Left) */}
                    <td className="p-2 sm:p-3 border-r border-slate-200 sticky left-0 z-10 bg-white transition-colors border-b">
                        <div className="flex flex-col gap-1 relative z-10">
                            <div className="font-semibold text-slate-900 text-xs sm:text-sm truncate max-w-[110px] sm:max-w-none">{student.name}</div>
                            <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-[10px] text-slate-500 font-mono">
                                <span className="bg-slate-100 px-1 py-0.5 rounded border border-slate-200">{student.chest_no || '-'}</span>
                                <span className="hidden sm:inline">{student.section}</span>
                            </div>
                            <div className="mt-0.5 sm:mt-1">
                                <Badge variant="outline" className={cn("text-[9px] h-4 px-1 pointer-events-none border", getLimitBadgeColor(isFull))}>
                                    {isFull ? "Maxed" : `${remaining} left`}
                                </Badge>
                            </div>
                        </div>
                        <div className="absolute inset-y-0 right-0 w-px shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] pointer-events-none" />
                    </td>

                    {/* CHECKBOX CELLS */}
                    {filteredEvents.map(event => {
                        const isRegistered = participations.some(p => p.student_id === student.id && p.event_id === event.id)
                        const eventCount = participations.filter(p => p.event_id === event.id).length
                        const isEventFull = eventCount >= event.max_participants_per_team

                        // Admin can technically override anything, but visual cues help.
                        // We disable checkbox ONLY if the student is not registered AND logic prevents it,
                        // BUT since this is admin, we allow override, so we never fully disable "disabled={...}"
                        // Instead, we just style it.

                        const isVisualDisabled = !isRegistered && (isFull || isEventFull)

                        return (
                        <td key={`${student.id}-${event.id}`} className="border-l border-b border-slate-100 p-0 relative align-middle">
                            <label className={cn(
                                "absolute inset-0 flex items-center justify-center cursor-pointer transition-all duration-200",
                                getCellColor(isRegistered, isVisualDisabled)
                            )}>
                                <input
                                    type="checkbox"
                                    checked={isRegistered}
                                    // Removed disabled attribute to allow Admin Override
                                    onChange={(e) => handleToggle(student.id, event.id, e.target.checked)}
                                    className="peer sr-only"
                                />
                                {isRegistered && <Check className="w-5 h-5 text-white animate-in zoom-in duration-200" strokeWidth={3} />}
                            </label>
                        </td>
                        )
                    })}
                    </tr>
                )
                })}
            </tbody>
            </table>
        </div>
        )}
      </div>
    </div>
  )
}