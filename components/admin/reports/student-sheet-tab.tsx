"use client"

import { useState, useMemo } from "react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Search, Eye, Filter } from "lucide-react"
import { StudentReportModal } from "./student-report-modal"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"

interface Student {
  id: string
  name: string
  chest_no: string | null
  class_grade: string | null
  section: string
  team_id: string
  teams: { name: string; color_hex: string }
  participations: any[]
}

interface Props {
  students: Student[]
  teams: { id: string; name: string }[]
}

export function StudentSheetTab({ students, teams }: Props) {
  const [search, setSearch] = useState("")
  const [filterTeam, setFilterTeam] = useState("all")
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
                            (s.chest_no && s.chest_no.includes(search))
      const matchesTeam = filterTeam === "all" || s.team_id === filterTeam
      return matchesSearch && matchesTeam
    })
  }, [students, search, filterTeam])

  return (
    <div className="flex flex-col h-full bg-white border rounded-lg shadow-sm overflow-hidden">
      {/* Local Filter Bar */}
      <div className="shrink-0 p-4 border-b bg-slate-50/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
         <div className="flex items-center gap-2 text-slate-600">
            <h3 className="font-bold text-sm uppercase tracking-wider">All Students Registry</h3>
            <Badge variant="secondary">{filteredStudents.length}</Badge>
         </div>

         <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:min-w-[200px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search name or chest no..."
                    className="pl-9 bg-white h-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
            <Select value={filterTeam} onValueChange={setFilterTeam}>
                <SelectTrigger className="w-[140px] h-9 bg-white">
                    <Filter className="w-3 h-3 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Team" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                    <SelectItem value="all">All Teams</SelectItem>
                    {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
            </Select>
         </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <Table>
            <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                <TableRow>
                    <TableHead className="w-[100px] font-bold">Chest No</TableHead>
                    <TableHead className="font-bold">Name</TableHead>
                    <TableHead className="font-bold">Class</TableHead>
                    <TableHead className="font-bold">Section</TableHead>
                    <TableHead className="font-bold">Team</TableHead>
                    <TableHead className="text-center font-bold">Events</TableHead>
                    <TableHead className="text-right font-bold pr-6">Details</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {filteredStudents.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={7} className="text-center h-32 text-muted-foreground">
                            No students found matching your criteria.
                        </TableCell>
                    </TableRow>
                ) : (
                    filteredStudents.map((s) => (
                        <TableRow key={s.id} className="hover:bg-slate-50 group">
                            <TableCell className="font-mono font-bold text-slate-600 bg-slate-50/30">
                                {s.chest_no || '-'}
                            </TableCell>
                            <TableCell className="font-medium text-slate-900">
                                {s.name}
                            </TableCell>
                            <TableCell>{s.class_grade}</TableCell>
                            <TableCell>
                                <Badge variant="outline" className="font-normal text-slate-500 border-slate-200">
                                    {s.section}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.teams.color_hex }} />
                                    <span className="text-sm font-medium">{s.teams.name}</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-center">
                                {/* Updated Badge Styling for better visibility */}
                                <Badge
                                    className={
                                        s.participations.length > 0
                                        ? "bg-indigo-600 text-white hover:bg-indigo-700 border-indigo-600"
                                        : "bg-slate-100 text-slate-400 hover:bg-slate-200 border-slate-200"
                                    }
                                >
                                    {s.participations.length}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right pr-4">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => setSelectedStudentId(s.id)}
                                >
                                    <Eye className="w-4 h-4 text-primary" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
      </div>

      <StudentReportModal
        studentId={selectedStudentId}
        open={!!selectedStudentId}
        onOpenChange={(open) => !open && setSelectedStudentId(null)}
      />
    </div>
  )
}