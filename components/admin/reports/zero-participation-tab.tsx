"use client"

import { useMemo } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { UserX } from "lucide-react"

export function ZeroParticipationTab({ students, filterTeam, search }: { students: any[], filterTeam: string, search: string }) {

  const filteredList = useMemo(() => {
    return students.filter(s => {
      const isTeamMatch = filterTeam === "all" || s.team_id === filterTeam
      const isZero = s.participations.length === 0
      const isSearchMatch = s.name.toLowerCase().includes(search.toLowerCase()) || (s.chest_no && s.chest_no.includes(search))
      return isTeamMatch && isZero && isSearchMatch
    })
  }, [students, filterTeam, search])

  return (
    <div className="flex flex-col h-full bg-white border rounded-lg shadow-sm overflow-hidden">
        <div className="shrink-0 p-4 border-b bg-red-50/30 flex justify-between items-center">
            <div className="flex items-center gap-2 text-red-700">
                <div className="p-2 bg-red-100 rounded-full"><UserX className="w-4 h-4" /></div>
                <div className="flex flex-col">
                    <span className="font-semibold text-sm">Inactive Students</span>
                    <span className="text-xs text-red-600/80">Students with 0 registered events</span>
                </div>
            </div>
            <Badge variant="destructive" className="text-sm px-3 py-1">{filteredList.length}</Badge>
        </div>

        <div className="flex-1 overflow-auto">
            <Table>
                <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                    <TableRow>
                        <TableHead className="w-[100px]">Chest No</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Section</TableHead>
                        <TableHead>Team</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredList.map(s => (
                        <TableRow key={s.id} className="hover:bg-slate-50">
                            <TableCell className="font-mono font-medium text-slate-600">{s.chest_no || '-'}</TableCell>
                            <TableCell className="font-medium text-slate-900">{s.name}</TableCell>
                            <TableCell>{s.class_grade}</TableCell>
                            <TableCell><Badge variant="outline" className="font-normal">{s.section}</Badge></TableCell>
                            <TableCell>
                                <span style={{ color: s.teams.color_hex }} className="font-semibold text-xs border px-2 py-1 rounded bg-slate-50 border-slate-100">
                                    {s.teams.name}
                                </span>
                            </TableCell>
                        </TableRow>
                    ))}
                    {filteredList.length === 0 && (
                        <TableRow><TableCell colSpan={5} className="text-center py-12 text-slate-400">No inactive students found.</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    </div>
  )
}