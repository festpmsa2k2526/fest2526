"use client"

import { useState, useMemo } from "react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import { Search, AlertTriangle, Clock, CheckCircle, UserMinus, UserX, Filter } from "lucide-react"

interface Participation {
  id: string
  attendance_status: string | null
  event: {
    name: string
    category: string
    event_code: string
  }
  student: {
    name: string
    chest_no: string | null
    class_grade: string | null
  }
}

export function EventStatusTab({ participations }: { participations: Participation[] }) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const processedData = useMemo(() => {
    let totalDeduction = 0

    // 1. Map Data and Calculate Total Deduction
    const rows = participations.map(p => {
      const isAbsent = p.attendance_status === 'absent'
      const isPresent = p.attendance_status === 'present'
      // If null or 'pending', treat as pending
      const isPending = !p.attendance_status || p.attendance_status === 'pending'

      const penalty = isAbsent ? 5 : 0
      totalDeduction += penalty

      let statusDisplay = {
          key: 'pending',
          label: 'Pending',
          subLabel: 'Not yet verified',
          color: 'bg-slate-100 text-slate-500 border-slate-200',
          icon: Clock
      }

      if (isAbsent) {
          statusDisplay = {
              key: 'absent',
              label: 'Absent',
              subLabel: '-5 Marks',
              color: 'bg-red-50 text-red-700 border-red-200',
              icon: UserX
          }
      }
      if (isPresent) {
          statusDisplay = {
              key: 'present',
              label: 'Present',
              subLabel: 'Good',
              color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
              icon: CheckCircle
          }
      }

      return { ...p, penalty, statusDisplay }
    })

    // 2. Filter Rows based on Search and Dropdown Selection
    const filtered = rows.filter(r => {
       const matchesSearch =
           r.event.name.toLowerCase().includes(search.toLowerCase()) ||
           r.student.name.toLowerCase().includes(search.toLowerCase()) ||
           (r.student.chest_no && r.student.chest_no.includes(search))

       const matchesStatus = statusFilter === "all" || r.statusDisplay.key === statusFilter

       return matchesSearch && matchesStatus
    })

    return { rows: filtered, totalDeduction }
  }, [participations, search, statusFilter])

  return (
    <div className="space-y-6">
       {/* Stats Card */}
       <Card className="bg-red-50 border-red-100 shadow-sm relative overflow-hidden">
          <div className="absolute left-0 top-0 h-full w-1 bg-red-500"></div>
          <CardContent className="p-4 flex items-center justify-between">
             <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 rounded-full text-red-600 shadow-sm">
                   <UserMinus className="w-6 h-6" />
                </div>
                <div>
                   <p className="text-xs font-bold text-red-600 uppercase tracking-wider">Attendance Penalty</p>
                   <p className="text-sm text-red-600/80">Total deduction for absent students</p>
                </div>
             </div>
             <div className="flex items-baseline gap-1">
                <p className="text-4xl font-black text-slate-800">-{processedData.totalDeduction}</p>
                <span className="text-sm font-bold text-red-500">pts</span>
             </div>
          </CardContent>
       </Card>

       {/* Filters */}
       <div className="flex flex-col sm:flex-row gap-3">
           <div className="relative flex-1">
               <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
               <Input
                 placeholder="Search by event name or student..."
                 className="pl-9 h-10 bg-white border-slate-200 focus-visible:ring-0 focus-visible:border-primary"
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
               />
           </div>

           <Select value={statusFilter} onValueChange={setStatusFilter}>
               <SelectTrigger className="w-full sm:w-[200px] h-10 bg-white border-slate-200 text-slate-600">
                   <div className="flex items-center gap-2">
                       <Filter className="w-4 h-4" />
                       <SelectValue placeholder="Filter Status" />
                   </div>
               </SelectTrigger>
               <SelectContent className="bg-white">
                   <SelectItem value="all">All Status</SelectItem>
                   <SelectItem value="pending">Pending</SelectItem>
                   <SelectItem value="present">Present</SelectItem>
                   <SelectItem value="absent">Absent</SelectItem>
               </SelectContent>
           </Select>
       </div>

       {/* List */}
       <div className="border rounded-xl bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
             <Table>
                <TableHeader className="bg-slate-50 border-b border-slate-200">
                   <TableRow>
                      <TableHead className="w-[35%] font-bold text-slate-700">Event Details</TableHead>
                      <TableHead className="w-[30%] font-bold text-slate-700">Participant</TableHead>
                      <TableHead className="hidden md:table-cell text-slate-700">Class</TableHead>
                      <TableHead className="text-right pr-6 font-bold text-slate-700">Status</TableHead>
                   </TableRow>
                </TableHeader>
                <TableBody>
                   {processedData.rows.map((row) => {
                      const Icon = row.statusDisplay.icon
                      return (
                         <TableRow key={row.id} className="hover:bg-slate-50 transition-colors">
                            <TableCell>
                               <div className="font-semibold text-slate-900">{row.event.name}</div>
                               <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-[10px] font-normal border-slate-300 text-slate-500 bg-white">{row.event.category}</Badge>
                                  <span className="text-xs text-slate-400 font-mono bg-slate-100 px-1 rounded">{row.event.event_code}</span>
                               </div>
                            </TableCell>
                            <TableCell>
                               <div className="font-medium text-slate-700">{row.student.name}</div>
                               <div className="text-xs text-slate-500 font-mono mt-0.5">#{row.student.chest_no || 'N/A'}</div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-slate-500">
                               {row.student.class_grade || '-'}
                            </TableCell>
                            <TableCell className="text-right pr-6">
                               <div className="flex flex-col items-end gap-1">
                                   <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold gap-1.5 border ${row.statusDisplay.color}`}>
                                      <Icon className="w-3.5 h-3.5" />
                                      {row.statusDisplay.label}
                                   </span>
                                   {row.statusDisplay.subLabel && (
                                       <span className="text-[10px] font-medium text-slate-400">{row.statusDisplay.subLabel}</span>
                                   )}
                               </div>
                            </TableCell>
                         </TableRow>
                      )
                   })}
                   {processedData.rows.length === 0 && (
                      <TableRow>
                         <TableCell colSpan={4} className="text-center py-16 text-slate-400 italic">
                             {statusFilter !== 'all'
                                ? `No ${statusFilter} records found.`
                                : "No attendance records found."}
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