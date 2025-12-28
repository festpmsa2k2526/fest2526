"use client"

import { useState, useMemo } from "react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, AlertCircle, CheckCircle2, XCircle, Filter, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"

interface Student {
  id: string
  name: string
  chest_no: string | null
  section: string
  class_grade: string | null
  participations: {
    attendance_status: string
    events: {
      category: string
    }
  }[]
}

export function ParticipantStatusTab({ students }: { students: Student[] }) {
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")

  const processedData = useMemo(() => {
    let totalPenalty = 0

    const rows = students.map(student => {
      // 1. Filter valid participations (Ignore 'absent' records)
      // A student effectively "participated" only if they were present or pending (not yet marked absent)
      const validParts = student.participations.filter(p => p.attendance_status !== 'absent')

      // 2. Check Categories
      const hasOnStage = validParts.some(p => p.events?.category === 'ON STAGE')
      const hasOffStage = validParts.some(p => p.events?.category === 'OFF STAGE')

      // 3. Determine Compliance
      const isCompliant = hasOnStage && hasOffStage
      const penalty = isCompliant ? 0 : 10
      totalPenalty += penalty

      let statusLabel = "Good"
      let statusColor = "bg-emerald-100 text-emerald-700 border-emerald-200"

      if (!hasOnStage && !hasOffStage) {
          statusLabel = "No Events"
          statusColor = "bg-red-100 text-red-700 border-red-200"
      } else if (!hasOnStage) {
          statusLabel = "Missing On-Stage"
          statusColor = "bg-orange-100 text-orange-700 border-orange-200"
      } else if (!hasOffStage) {
          statusLabel = "Missing Off-Stage"
          statusColor = "bg-blue-100 text-blue-700 border-blue-200"
      }

      return {
        ...student,
        hasOnStage,
        hasOffStage,
        isCompliant,
        penalty,
        statusLabel,
        statusColor
      }
    })

    const filtered = rows.filter(row => {
      const matchesSearch = row.name.toLowerCase().includes(search.toLowerCase()) ||
                            (row.chest_no && row.chest_no.includes(search))

      const matchesFilter = filterStatus === 'all'
        ? true
        : filterStatus === 'good' ? row.isCompliant
        : !row.isCompliant

      return matchesSearch && matchesFilter
    })

    return { rows: filtered, totalPenalty }
  }, [students, search, filterStatus])

  return (
    <div className="space-y-6">
      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-red-50 border-red-100 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 h-full w-1 bg-red-500"></div>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-full text-red-600 shadow-sm">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-red-600 uppercase tracking-wider">Compliance Penalty</p>
              <div className="flex items-baseline gap-1">
                <p className="text-3xl font-black text-slate-800">-{processedData.totalPenalty}</p>
                <span className="text-xs text-red-500 font-medium">pts</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-orange-50 rounded-full text-orange-600">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Action Needed</p>
              <p className="text-2xl font-bold text-slate-700">
                {students.length - processedData.rows.filter(r => r.isCompliant).length} <span className="text-sm font-normal text-slate-400">Students</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50 border-emerald-100 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-emerald-100 rounded-full text-emerald-600">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Fully Compliant</p>
              <p className="text-2xl font-bold text-emerald-700">
                 {processedData.rows.filter(r => r.isCompliant).length} <span className="text-sm font-normal text-emerald-600/60">Students</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-xl border shadow-sm">
        <div className="relative flex-1">
           <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
           <Input
             placeholder="Search by name or chest no..."
             className="pl-9 bg-slate-50 border-slate-200 focus-visible:ring-0 focus-visible:bg-white transition-all"
             value={search}
             onChange={(e) => setSearch(e.target.value)}
           />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
           <SelectTrigger className="w-full sm:w-[200px] bg-slate-50 border-slate-200">
              <div className="flex items-center text-slate-600">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter Status" />
              </div>
           </SelectTrigger>
           <SelectContent className="bg-white">
              <SelectItem value="all">All Students</SelectItem>
              <SelectItem value="good">Compliant Only</SelectItem>
              <SelectItem value="bad">Non-Compliant Only</SelectItem>
           </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <div className="border rounded-xl bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 border-b border-slate-200">
              <TableRow>
                <TableHead className="w-[100px] font-bold text-slate-700">Chest No</TableHead>
                <TableHead className="font-bold text-slate-700">Student Name</TableHead>
                <TableHead className="hidden md:table-cell text-slate-700">Class</TableHead>
                <TableHead className="hidden md:table-cell text-slate-700">Section</TableHead>
                <TableHead className="text-center font-bold text-slate-700">On-Stage</TableHead>
                <TableHead className="text-center font-bold text-slate-700">Off-Stage</TableHead>
                <TableHead className="text-right pr-6 font-bold text-slate-700">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedData.rows.map((student) => (
                <TableRow key={student.id} className="hover:bg-slate-50 group transition-colors">
                  <TableCell className="font-mono font-bold text-slate-600 bg-slate-50/50 group-hover:bg-transparent transition-colors">
                    {student.chest_no || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-slate-900">{student.name}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-slate-500">{student.class_grade}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="outline" className="font-normal text-slate-500">{student.section}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {student.hasOnStage
                      ? <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
                      : <div className="w-2 h-2 bg-slate-200 rounded-full mx-auto" />
                    }
                  </TableCell>
                  <TableCell className="text-center">
                    {student.hasOffStage
                      ? <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
                      : <div className="w-2 h-2 bg-slate-200 rounded-full mx-auto" />
                    }
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    {student.isCompliant ? (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200 shadow-none">Good</Badge>
                    ) : (
                      <div className="flex flex-col items-end gap-1">
                          <Badge variant="outline" className={cn("border font-medium shadow-none", student.statusColor)}>
                            {student.statusLabel}
                          </Badge>
                          <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">-10 Pts</span>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {processedData.rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-400">
                    No participants found matching your criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}