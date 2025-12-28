"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { UserX } from "lucide-react"

export function SectionExclusiveTab({ students, filterTeam, search }: { students: any[], filterTeam: string, search: string }) {

  const getList = (category: string) => {
    return students.filter(s => {
      if (s.participations.length === 0) return false
      const isTeamMatch = filterTeam === "all" || s.team_id === filterTeam
      const isSearchMatch = s.name.toLowerCase().includes(search.toLowerCase())
      // @ts-ignore
      const allMatch = s.participations.every(p => p.events?.category === category)
      return isTeamMatch && isSearchMatch && allMatch
    })
  }

  const offStageList = getList('OFF STAGE')
  const onStageList = getList('ON STAGE')

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 h-full gap-4">
        {/* Only OFF STAGE */}
        <div className="flex flex-col h-full border rounded-lg overflow-hidden bg-white shadow-sm">
            <div className="shrink-0 p-3 bg-blue-50/50 border-b flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-8 bg-blue-500 rounded-full"></span>
                    <span className="font-semibold text-slate-700">Only OFF STAGE</span>
                </div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">{offStageList.length}</Badge>
            </div>
            <div className="overflow-auto flex-1"><SimpleTable students={offStageList} /></div>
        </div>

        {/* Only ON STAGE */}
        <div className="flex flex-col h-full border rounded-lg overflow-hidden bg-white shadow-sm">
            <div className="shrink-0 p-3 bg-orange-50/50 border-b flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-8 bg-orange-500 rounded-full"></span>
                    <span className="font-semibold text-slate-700">Only ON STAGE</span>
                </div>
                <Badge variant="secondary" className="bg-orange-100 text-orange-700">{onStageList.length}</Badge>
            </div>
            <div className="overflow-auto flex-1"><SimpleTable students={onStageList} /></div>
        </div>
    </div>
  )
}

function SimpleTable({ students }: { students: any[] }) {
    if (students.length === 0) return <div className="h-full flex items-center justify-center p-8 text-muted-foreground text-sm italic"><UserX className="w-8 h-8 opacity-20 mb-2 mr-2" />No students found.</div>
    return (
        <Table>
            <TableHeader className="bg-slate-50 sticky top-0 z-10"><TableRow><TableHead>Name</TableHead><TableHead>Team</TableHead></TableRow></TableHeader>
            <TableBody>
                {students.map(s => (
                    <TableRow key={s.id} className="hover:bg-slate-50">
                        <TableCell>
                            <div className="font-medium text-sm text-slate-900">{s.name}</div>
                            <div className="text-xs text-slate-500">{s.chest_no}</div>
                        </TableCell>
                        <TableCell>
                            <Badge variant="outline" style={{ color: s.teams.color_hex, borderColor: s.teams.color_hex + '40', backgroundColor: s.teams.color_hex + '10' }}>{s.teams.name}</Badge>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}