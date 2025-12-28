"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  CheckCircle2,
  Circle,
  Mic2,
  LayoutGrid,
  Users,
  AlertCircle,
  UserMinus
} from "lucide-react"
import { cn } from "@/lib/utils"

// --- Types & Interfaces (The Fix) ---

interface Team {
  id: string;
  name: string;
  color_hex: string
}

interface Event {
  id: string;
  name: string;
  category: string; // 'ON STAGE' | 'OFF STAGE'
  applicable_section: string[];
  max_participants_per_team: number;
}

interface Participation {
  id: string;
  event_id: string;
  attendance_status: string; // 'present' | 'absent' etc.
  events?: {
    category: string;
  };
}

interface Student {
  id: string;
  name: string;
  // Explicitly defining this property prevents the "never" error
  participations: Participation[];
}

// Helper interface for the computed stats
interface EventStatus extends Event {
  registeredCount: number;
  status: 'FULL' | 'EMPTY' | 'PARTIAL';
}

const SECTIONS = ['Senior', 'Junior', 'Sub-Junior', 'General', 'Foundation']

export function TeamDetailsDialog({ team, open, onOpenChange }: { team: Team | null, open: boolean, onOpenChange: (open: boolean) => void }) {
  const [loading, setLoading] = useState(true)

  // --- The Fix Applied Here ---
  // We explicitly type these states so TypeScript knows what they contain
  const [events, setEvents] = useState<Event[]>([])
  const [participations, setParticipations] = useState<Participation[]>([])
  const [students, setStudents] = useState<Student[]>([])

  const [activeSection, setActiveSection] = useState("Senior")

  const supabase = createClient()

  useEffect(() => {
    if (!team || !open) return

    async function fetchData() {
      setLoading(true)
      try {
        // 1. Fetch Events
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select('id, name, category, applicable_section, max_participants_per_team')
          .order('name')

        if (eventsError) throw eventsError;

        // 2. Fetch Students with their Participations (for Penalty Calculation)
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select(`
            id, name,
            participations (
                id, event_id, attendance_status,
                events ( category )
            )
          `)
          .eq('team_id', team!.id)

        if (studentsError) throw studentsError;

        if (eventsData) setEvents(eventsData as Event[])

        if (studentsData) {
            // We cast to unknown first to avoid conflicts with Supabase auto-generated types
            const typedStudents = studentsData as unknown as Student[]
            setStudents(typedStudents)

            // Flatten participations for the registration count logic
            const allParts = typedStudents.flatMap(s => s.participations)
            setParticipations(allParts)
        }

      } catch (err) {
        console.error("Error fetching team details:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [team, open])

  // --- PENALTY CALCULATIONS ---
  const penalties = useMemo(() => {
      let compliancePenalty = 0
      let attendancePenalty = 0
      let nonCompliantCount = 0
      let absentCount = 0

      students.forEach(student => {
          // Filter valid participations (not absent)
          const validParts = student.participations.filter(p => p.attendance_status !== 'absent')

          // Compliance Check
          const hasOnStage = validParts.some(p => p.events?.category === 'ON STAGE')
          const hasOffStage = validParts.some(p => p.events?.category === 'OFF STAGE')

          if (!hasOnStage || !hasOffStage) {
              compliancePenalty += 10
              nonCompliantCount++
          }

          // Attendance Check (look at ALL participations, valid or not)
          student.participations.forEach(p => {
              if (p.attendance_status === 'absent') {
                  attendancePenalty += 5
                  absentCount++
              }
          })
      })

      return {
          compliance: compliancePenalty,
          attendance: attendancePenalty,
          nonCompliantCount,
          absentCount,
          total: compliancePenalty + attendancePenalty
      }
  }, [students])

  // --- SECTION STATS ---
  const stats = useMemo(() => {
    const sectionEvents = events.filter(e =>
      e.applicable_section && e.applicable_section.includes(activeSection)
    )

    const processList = (list: Event[]): EventStatus[] => list.map(e => {
        const registeredCount = participations.filter(p => p.event_id === e.id).length
        const isFull = registeredCount >= e.max_participants_per_team
        const isEmpty = registeredCount === 0
        return {
            ...e,
            registeredCount,
            status: isFull ? 'FULL' : isEmpty ? 'EMPTY' : 'PARTIAL'
        }
    })

    const onStage = processList(sectionEvents.filter(e => e.category === 'ON STAGE'))
    const offStage = processList(sectionEvents.filter(e => e.category === 'OFF STAGE'))

    const totalEvents = sectionEvents.length
    const filledCount = [...onStage, ...offStage].filter(s => s.status !== 'EMPTY').length

    return { onStage, offStage, totalEvents, filledCount }
  }, [events, participations, activeSection])

  if (!team) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[900px] h-[90vh] flex flex-col p-0 overflow-hidden bg-slate-50 [&>button]:z-50">

        {/* Header */}
        <DialogHeader className="p-6 pb-4 bg-white border-b shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 -mr-10 -mt-10" style={{ backgroundColor: team.color_hex }} />

          <div className="relative z-10 flex items-start justify-between">
              <div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: team.color_hex, color: team.color_hex }} />
                    <DialogTitle className="text-2xl font-bold tracking-tight text-slate-900">{team.name}</DialogTitle>
                  </div>
                  <DialogDescription className="mt-1">
                    Registration and Penalty Report
                  </DialogDescription>
              </div>

              <div className="text-right">
                  <div className="text-3xl font-black text-red-600 leading-none">-{penalties.total}</div>
                  <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Total Deduction</div>
              </div>
          </div>
        </DialogHeader>

        {/* Penalty Summary Section */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-white border-b shrink-0">
            <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-full text-orange-600">
                        <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-xs font-bold text-orange-700 uppercase tracking-wider">Non-Compliant</div>
                        <div className="text-sm text-orange-600/80">{penalties.nonCompliantCount} Students</div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-xl font-bold text-orange-700">-{penalties.compliance}</div>
                    <div className="text-[10px] text-orange-500 font-medium">pts</div>
                </div>
            </div>

            <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-full text-red-600">
                        <UserMinus className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-xs font-bold text-red-700 uppercase tracking-wider">Absent Events</div>
                        <div className="text-sm text-red-600/80">{penalties.absentCount} Events</div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-xl font-bold text-red-700">-{penalties.attendance}</div>
                    <div className="text-[10px] text-red-500 font-medium">pts</div>
                </div>
            </div>
        </div>

        {/* Content Layout */}
        <div className="flex-1 flex flex-col min-h-0">

            {/* Tabs Bar */}
            <div className="bg-white border-b px-6 pt-2 shrink-0">
                 <Tabs value={activeSection} onValueChange={setActiveSection} className="w-full">
                    <TabsList className="w-full justify-start h-auto p-0 bg-transparent rounded-none gap-4 flex-wrap">
                        {SECTIONS.map(sec => (
                            <TabsTrigger
                                key={sec}
                                value={sec}
                                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary px-2 py-3 text-xs md:text-sm font-medium text-slate-500 hover:text-slate-800 transition-all"
                            >
                                {sec}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                 </Tabs>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto bg-slate-50/50">
                <div className="p-6 space-y-8 pb-20">

                    {loading ? (
                       <div className="h-40 flex items-center justify-center">
                          <Loader2 className="animate-spin text-slate-400 w-8 h-8" />
                       </div>
                    ) : (
                      <>
                        {/* ON STAGE SECTION */}
                        {stats.onStage.length > 0 && (
                            <section>
                                <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm py-2 mb-2 border-b border-purple-100 flex items-center gap-2 shadow-sm">
                                    <span className="p-1.5 rounded-md bg-purple-100 text-purple-600">
                                        <Mic2 className="w-4 h-4" />
                                    </span>
                                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">On Stage Events</h3>
                                    <Badge variant="secondary" className="ml-auto text-[10px]">{stats.onStage.length}</Badge>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                    {stats.onStage.map(event => (
                                        <EventStatusCard key={event.id} event={event} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* OFF STAGE SECTION */}
                        {stats.offStage.length > 0 && (
                            <section>
                                <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm py-2 mb-2 border-b border-indigo-100 flex items-center gap-2 shadow-sm">
                                    <span className="p-1.5 rounded-md bg-indigo-100 text-indigo-600">
                                        <LayoutGrid className="w-4 h-4" />
                                    </span>
                                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Off Stage Events</h3>
                                    <Badge variant="secondary" className="ml-auto text-[10px]">{stats.offStage.length}</Badge>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                    {stats.offStage.map(event => (
                                        <EventStatusCard key={event.id} event={event} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {stats.onStage.length === 0 && stats.offStage.length === 0 && (
                            <div className="h-40 flex flex-col items-center justify-center text-slate-400">
                                <Circle className="w-10 h-10 mb-2 opacity-20" />
                                <p className="text-sm">No events found for {activeSection} section.</p>
                            </div>
                        )}
                      </>
                    )}
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function EventStatusCard({ event }: { event: EventStatus }) {
    const isFull = event.status === 'FULL'
    const isEmpty = event.status === 'EMPTY'

    return (
        <div className={cn(
            "group relative p-4 rounded-xl border transition-all duration-200 flex flex-col h-full",
            isFull ? "bg-white border-emerald-200 shadow-sm" :
            isEmpty ? "bg-slate-50/80 border-slate-200 hover:bg-white hover:border-slate-300 hover:shadow-sm" :
            "bg-white border-orange-200 shadow-sm"
        )}>
            <div className="flex justify-between items-start gap-3 mb-3">
                <h4 className={cn("font-semibold text-sm leading-snug wrap-break-word", isEmpty ? "text-slate-600" : "text-slate-900")}>
                    {event.name}
                </h4>
                {isFull && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                {!isFull && !isEmpty && <div className="w-2 h-2 rounded-full bg-orange-400 shrink-0 mt-1.5" />}
            </div>

            <div className="mt-auto flex items-end justify-between pt-2 border-t border-dashed border-slate-100/50">
                <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-400 font-normal h-5 px-1.5 bg-slate-50/50">
                    Max: {event.max_participants_per_team}
                </Badge>

                <div className={cn(
                    "flex items-center gap-1.5 text-xs font-bold",
                    isFull ? "text-emerald-600" : isEmpty ? "text-slate-400" : "text-orange-600"
                )}>
                    <Users className="w-3.5 h-3.5" />
                    <span>{event.registeredCount}</span>
                </div>
            </div>
        </div>
    )
}