"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Users, CalendarCheck } from "lucide-react"
import { ParticipantStatusTab } from "@/components/captain/status/participant-status-tab"
import { EventStatusTab } from "@/components/captain/status/event-status-tab"

// Define interface for the profile response
interface ProfileData {
  team_id: string | null
  teams: {
    name: string
  } | null
}

export default function CaptainStatusPage() {
  const [loading, setLoading] = useState(true)
  const [teamName, setTeamName] = useState("")

  const [students, setStudents] = useState<any[]>([])
  const [participations, setParticipations] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    async function loadTeamData() {
      try {
        setLoading(true)
        // 1. Get Current User
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            setError("Not authenticated")
            return
        }

        // 2. Find Team from Profiles
        // Using explicit cast to avoid 'never' type inference
        const { data } = await supabase
            .from('profiles')
            .select('team_id, teams(name)')
            .eq('id', user.id)
            .single()

        const profile = data as unknown as ProfileData

        if (!profile || !profile.team_id) {
            setError("No team assigned to this account.")
            return
        }

        const currentTeamId = profile.team_id
        setTeamName(profile.teams?.name || "Your Team")

        // 3. Fetch Students & Their Participations (For Compliance Tab)
        const { data: studentData } = await supabase
            .from('students')
            .select(`
                id, name, chest_no, section, class_grade,
                participations (
                    attendance_status,
                    events ( category )
                )
            `)
            .eq('team_id', currentTeamId)
            .order('name')

        setStudents(studentData || [])

        // 4. Fetch All Participations with Event Details (For Attendance Tab)
        const { data: participationData } = await supabase
            .from('participations')
            .select(`
                id, attendance_status,
                event:events ( name, category, event_code ),
                student:students ( name, chest_no, class_grade )
            `)
            .eq('team_id', currentTeamId)
            .order('created_at')

        setParticipations(participationData || [])

      } catch (err: any) {
        console.error(err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadTeamData()
  }, [])

  if (loading) return <div className="h-[calc(100vh-4rem)] flex items-center justify-center"><Loader2 className="animate-spin w-10 h-10 text-primary" /></div>

  if (error) {
      return (
          <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center text-center p-4">
              <h2 className="text-xl font-bold text-slate-800">Access Restricted</h2>
              <p className="text-slate-500 mt-2">{error}</p>
          </div>
      )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
        <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Status Dashboard</h1>
            <p className="text-muted-foreground mt-1">
                Monitoring compliance and attendance for <span className="font-bold text-primary">{teamName}</span>.
            </p>
        </div>

        <Tabs defaultValue="participants" className="space-y-6">
            <div className="bg-white p-1 rounded-lg border inline-flex shadow-sm">
                <TabsList className="bg-transparent h-auto p-0 gap-1">
                    <TabsTrigger
                        value="participants"
                        className="py-2.5 px-4 rounded-md data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 data-[state=active]:shadow-none text-slate-500 font-medium transition-all"
                    >
                        <Users className="w-4 h-4 mr-2" />Compliance
                    </TabsTrigger>
                    <TabsTrigger
                        value="events"
                        className="py-2.5 px-4 rounded-md data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 data-[state=active]:shadow-none text-slate-500 font-medium transition-all"
                    >
                        <CalendarCheck className="w-4 h-4 mr-2" />Attendance
                    </TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="participants" className="animate-in slide-in-from-left-2 duration-300">
                <ParticipantStatusTab students={students} />
            </TabsContent>

            <TabsContent value="events" className="animate-in slide-in-from-right-2 duration-300">
                <EventStatusTab participations={participations} />
            </TabsContent>
        </Tabs>
    </div>
  )
}