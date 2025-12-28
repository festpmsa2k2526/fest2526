"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import { Loader2, Search, Filter, FileText, UserX, Layers, Users } from "lucide-react"

// Import Sub-Components
import { ZeroParticipationTab } from "@/components/admin/reports/zero-participation-tab"
import { SectionExclusiveTab } from "@/components/admin/reports/section-exclusive-tab"
import { EventCallSheetTab } from "@/components/admin/reports/event-call-sheet-tab"
import { StudentSheetTab } from "@/components/admin/reports/student-sheet-tab"

// --- TYPES ---
interface Team { id: string; name: string; color_hex: string }
interface Event { id: string; name: string; event_code: string; category: string; max_participants_per_team: number }

export default function AdminReports() {
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState<Team[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [allStudents, setAllStudents] = useState<any[]>([])

  // Global Filter States (Used for Zero/Exclusive Tabs primarily)
  const [selectedTeam, setSelectedTeam] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  const supabase = createClient()

  useEffect(() => {
    async function loadBaseData() {
      try {
        setLoading(true)
        const { data: teamsData } = await supabase.from('teams').select('*').order('name')
        if (teamsData) setTeams(teamsData as any)

        const { data: eventsData } = await supabase.from('events').select('*').order('name')
        if (eventsData) setEvents(eventsData as any)

        const { data: studentsData, error } = await supabase
          .from('students')
          .select(`
            *,
            teams ( name, color_hex ),
            participations (
              events ( category )
            )
          `)
          .order('name')

        if (error) throw error
        setAllStudents(studentsData as any)

      } catch (err) {
        console.error("Error loading reports data:", err)
      } finally {
        setLoading(false)
      }
    }
    loadBaseData()
  }, [])

  if (loading) return <div className="h-[calc(100vh-4rem)] flex items-center justify-center"><Loader2 className="animate-spin text-primary w-10 h-10" /></div>

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col space-y-4 animate-in fade-in duration-500 pb-4">
      {/* HEADER SECTION */}
      <div className="shrink-0 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 rounded-xl border shadow-sm">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Reports & Analysis</h2>
          <p className="text-muted-foreground text-sm">Deep dive into participation metrics and generate lists.</p>
        </div>

        {/* Filters shown for certain tabs contextually, but kept here for access */}
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
           {/* These filters apply mainly to the analysis tabs (Zero/Exclusive) */}
           <div className="relative w-full sm:w-60">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Global Search..."
                className="pl-9 bg-slate-50 border-slate-200"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
           </div>
           <Select value={selectedTeam} onValueChange={setSelectedTeam}>
            <SelectTrigger className="w-full sm:w-[180px] bg-slate-50 border-slate-200">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Filter className="w-4 h-4" />
                <SelectValue placeholder="All Teams" />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="all">All Teams</SelectItem>
              {teams.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
           </Select>
        </div>
      </div>

      {/* TABS CONTAINER */}
      <Tabs defaultValue="event" className="flex-1 flex flex-col min-h-0">
        <div className="shrink-0 mb-3">
            <TabsList className="w-full justify-start h-auto p-1 bg-slate-100 border rounded-lg overflow-x-auto gap-2">
            <TabsTrigger value="event" className="py-2 px-4 rounded-md data-[state=active]:bg-white data-[state=active]:text-purple-700 data-[state=active]:shadow-sm transition-all font-medium">
                <FileText className="w-4 h-4 mr-2" /> Event Call Sheet
            </TabsTrigger>
            <TabsTrigger value="student" className="py-2 px-4 rounded-md data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm transition-all font-medium">
                <Users className="w-4 h-4 mr-2" /> Student Sheet
            </TabsTrigger>
            <TabsTrigger value="zero" className="py-2 px-4 rounded-md data-[state=active]:bg-white data-[state=active]:text-red-700 data-[state=active]:shadow-sm transition-all font-medium">
                <UserX className="w-4 h-4 mr-2" /> Zero Participation
            </TabsTrigger>
            <TabsTrigger value="section" className="py-2 px-4 rounded-md data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm transition-all font-medium">
                <Layers className="w-4 h-4 mr-2" /> Section Exclusive
            </TabsTrigger>
            </TabsList>
        </div>

        <div className="flex-1 min-h-0">
          <TabsContent value="event" className="m-0 h-full">
             <EventCallSheetTab events={events} />
          </TabsContent>

          <TabsContent value="student" className="m-0 h-full">
             <StudentSheetTab students={allStudents} teams={teams} />
          </TabsContent>

          <TabsContent value="zero" className="m-0 h-full">
             <ZeroParticipationTab students={allStudents} filterTeam={selectedTeam} search={searchQuery} />
          </TabsContent>

          <TabsContent value="section" className="m-0 h-full">
             <SectionExclusiveTab students={allStudents} filterTeam={selectedTeam} search={searchQuery} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}