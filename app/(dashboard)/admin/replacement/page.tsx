"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { ReplacementMatrix } from "@/components/admin/ReplacementMatrix"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { Loader2, Users, AlertTriangle } from "lucide-react"

// 1. UPDATED INTERFACE TO MATCH SCHEMA
// Schema says: id (uuid), name (text), color_hex (text)
interface Team {
  id: string
  name: string
  color_hex: string // Fixed: matches your DB schema
}

export default function AdminReplacementPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    async function fetchTeams() {
      try {
        setLoading(true)
        setDataError(null)

        // 2. FIXED QUERY
        // Changed 'color_code' to 'color_hex' to match your table definition
        const { data, error } = await supabase
          .from('teams')
          .select('id, name, color_hex')
          .order('name')

        if (error) {
          console.error("Supabase Query Error:", error)
          setDataError(error.message)
          return
        }

        if (data) {
          // Explicit cast to ensure TypeScript knows this is our Team[]
          const typedData = data as Team[]
          setTeams(typedData)

          if (typedData.length > 0) {
            setSelectedTeam(typedData[0].id)
          } else {
             console.warn("Query succeeded but returned 0 teams. Check RLS policies.")
          }
        }
      } catch (err) {
        console.error("Unexpected Error:", err)
        setDataError("An unexpected error occurred.")
      } finally {
        setLoading(false)
      }
    }
    fetchTeams()
  }, [])

  const currentTeamName = teams.find(t => t.id === selectedTeam)?.name || "Team"

  if (loading) return (
    <div className="h-full w-full flex items-center justify-center">
      <Loader2 className="animate-spin text-blue-600 w-8 h-8" />
    </div>
  )

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4 gap-4 bg-slate-50/50">
      {/* Top Bar */}
      <Card className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shrink-0 bg-slate-900 text-white border-none shadow-lg z-20">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            Participant Replacement
          </h1>
          <p className="text-slate-400 text-sm">Select a team to modify their event participants.</p>
        </div>

        <div className="w-full md:w-72">
           {dataError ? (
             <div className="text-red-400 text-xs bg-red-950/30 p-2 rounded border border-red-900">
               Error: {dataError}
             </div>
           ) : teams.length === 0 ? (
             <div className="flex items-center gap-2 text-yellow-500 text-xs bg-yellow-950/30 p-2 rounded border border-yellow-900">
               <AlertTriangle className="w-4 h-4" />
               <span>No teams found. (Check RLS Policies?)</span>
             </div>
           ) : (
             <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger className="w-full bg-slate-800 border-slate-700 text-white hover:bg-slate-700 transition-colors">
                <SelectValue placeholder="Select a Team" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] bg-white">
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full border border-white/20 shadow-sm"
                        style={{ backgroundColor: team.color_hex }}
                      />
                      {team.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
           )}
        </div>
      </Card>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 bg-white rounded-xl shadow-sm border border-slate-200 p-2 md:p-4 overflow-hidden relative z-10">
        {selectedTeam ? (
          <ReplacementMatrix teamId={selectedTeam} teamName={currentTeamName} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
             <Users className="w-12 h-12 opacity-10" />
             <p className="font-medium">
               {teams.length === 0 ? "Database returned 0 teams." : "Select a team above to begin."}
             </p>
          </div>
        )}
      </div>
    </div>
  )
}