"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Loader2, FileText, Printer, FileDown, ChevronDown, Check, UserCheck, UserX, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface Event {
    id: string;
    name: string;
    event_code: string;
    category: string;
    max_participants_per_team: number
}

// Define the structure of data returned from Supabase for type safety
interface ParticipationRecord {
    id: string
    event_id: string
    status: string
    attendance_status: string | null
    students: {
        name: string
        chest_no: string | null
        class_grade: string | null
        section: string
        team: {
            name: string
            color_hex: string
        }
    }
}

interface CompletionStatusRow {
    event_id: string
    attendance_status: string | null
}

export function EventCallSheetTab({ events }: { events: Event[] }) {
  const [selectedEventId, setSelectedEventId] = useState<string>("")
  const [loadingEvent, setLoadingEvent] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [participants, setParticipants] = useState<ParticipationRecord[]>([])

  // Track which events have complete attendance marked
  const [completedEventIds, setCompletedEventIds] = useState<Set<string>>(new Set())

  const supabase = createClient()

  // 1. Check for completed events (Global check for dropdown styling)
  useEffect(() => {
    async function checkCompletionStatus() {
        const { data } = await supabase
            .from('participations')
            .select('event_id, attendance_status')

        if (data) {
            // Cast data to known type to fix 'never' error
            const records = data as unknown as CompletionStatusRow[]
            const statusMap: Record<string, boolean> = {} // eventId -> isComplete

            // Group by event
            records.forEach(p => {
                if (statusMap[p.event_id] === false) return; // Already failed

                // Initialize if undefined
                if (statusMap[p.event_id] === undefined) statusMap[p.event_id] = true;

                // If any participant is pending, mark event as incomplete
                if (!p.attendance_status || p.attendance_status === 'pending') {
                    statusMap[p.event_id] = false;
                }
            })

            const completed = new Set<string>()
            Object.keys(statusMap).forEach(id => {
                if (statusMap[id]) completed.add(id)
            })
            setCompletedEventIds(completed)
        }
    }
    checkCompletionStatus()
  }, [events])

  // 2. Load Participants for Selected Event
  useEffect(() => {
    if (!selectedEventId) {
      setParticipants([])
      return
    }

    async function loadEventData() {
      setLoadingEvent(true)
      const { data } = await supabase
        .from('participations')
        .select(`
          id, event_id, status, attendance_status,
          students!inner ( name, chest_no, class_grade, section, team:teams(name, color_hex) )
        `)
        .eq('event_id', selectedEventId)
        .order('created_at', { ascending: true })

      if (data) {
        // Cast the raw data to our interface
        const rawData = data as unknown as any[]

        const formatted: ParticipationRecord[] = rawData.map((p) => ({
          id: p.id,
          event_id: p.event_id, // Now valid
          status: p.status,
          attendance_status: p.attendance_status || 'pending',
          students: {
            name: p.students.name,
            chest_no: p.students.chest_no || 'N/A',
            class_grade: p.students.class_grade || '-',
            section: p.students.section,
            team: {
                name: p.students.team.name,
                color_hex: p.students.team.color_hex
            }
          }
        }))

        // Sorting logic handled separately to satisfy TS
        formatted.sort((a, b) => {
            const chestA = parseInt(a.students.chest_no || '999') || 999
            const chestB = parseInt(b.students.chest_no || '999') || 999
            return chestA - chestB
        })

        setParticipants(formatted)
      }
      setLoadingEvent(false)
    }
    loadEventData()
  }, [selectedEventId])

  // 3. Handle Status Change
  const updateAttendance = async (participationId: string, newStatus: string) => {
      // Optimistic Update
      setParticipants(prev => prev.map(p =>
          p.id === participationId ? { ...p, attendance_status: newStatus } : p
      ))

      try {
          // Cast the query builder to 'any' to bypass strict type checking for the new column
          const { error } = await (supabase.from('participations') as any)
            .update({ attendance_status: newStatus })
            .eq('id', participationId)

          if (error) throw error

          // Re-check completion for this event
          const allMarked = participants.every(p => {
              if (p.id === participationId) return newStatus !== 'pending';
              return p.attendance_status !== 'pending';
          })

          setCompletedEventIds(prev => {
              const next = new Set(prev)
              if (allMarked) next.add(selectedEventId)
              else next.delete(selectedEventId)
              return next
          })

      } catch (err) {
          console.error("Failed to update status", err)
          alert("Failed to save status. Please try again.")
      }
  }

  // PDF Logic
  const generatePDF = async (eventsToPrint: Event[]) => {
    setGeneratingPdf(true)
    const doc = new jsPDF()
    let isFirstPage = true

    for (const event of eventsToPrint) {
        if (!isFirstPage) doc.addPage()
        isFirstPage = false

        const { data } = await supabase
            .from('participations')
            .select(`attendance_status, students!inner ( name, chest_no, class_grade, team:teams(name) )`)
            .eq('event_id', event.id)

        // Cast data here as well
        const rawData = data as unknown as any[]

        const parts = (rawData || []).map((p) => ({
            name: p.students.name,
            chest_no: p.students.chest_no || "N/A",
            class: p.students.class_grade || "-",
            team: p.students.team.name,
            attendance: p.attendance_status === 'present' ? 'Present' : p.attendance_status === 'absent' ? 'Absent' : 'Pending'
        })).sort((a, b) => (parseInt(a.chest_no) || 999) - (parseInt(b.chest_no) || 999))

        doc.setFontSize(18)
        doc.setFont("helvetica", "bold")
        doc.text("ARTS FEST 2025", 105, 20, { align: "center" })
        doc.setFontSize(12)
        doc.setFont("helvetica", "normal")
        doc.text(`Event: ${event.name} (${event.event_code})`, 105, 28, { align: "center" })

        const body = parts.map((p, i) => [i + 1, p.chest_no, p.name, p.class, p.team, p.attendance])

        autoTable(doc, {
            startY: 35,
            head: [["#", "Chest No", "Name", "Class", "Team", "Attendance"]],
            body: body,
            theme: 'grid',
            headStyles: { fillColor: [40, 40, 40] },
            didParseCell: function(data) {
                if (data.section === 'body' && data.column.index === 5) {
                    if (data.cell.raw === 'Absent') {
                        data.cell.styles.textColor = [220, 50, 50];
                    } else if (data.cell.raw === 'Present') {
                        data.cell.styles.textColor = [50, 150, 50];
                    }
                }
            }
        })
    }
    doc.save("event_sheets.pdf")
    setGeneratingPdf(false)
  }

  return (
    <div className="flex flex-col h-full bg-white border rounded-lg shadow-sm">
        {/* Toolbar */}
        <div className="shrink-0 p-4 border-b bg-slate-50/50 flex flex-col sm:flex-row gap-4 justify-between items-end">
            <div className="w-full sm:w-[400px] space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Select Event Sheet</label>
                <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                    <SelectTrigger className="w-full bg-white h-10 shadow-sm border-slate-200">
                        <SelectValue placeholder="Choose an event to mark..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] bg-white">
                        {events.map(e => (
                            <SelectItem key={e.id} value={e.id} className="cursor-pointer">
                                <div className="flex items-center justify-between w-full gap-4">
                                    <span className={cn("font-medium", completedEventIds.has(e.id) ? "text-green-700" : "text-slate-700")}>
                                        {e.name}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        {completedEventIds.has(e.id) && <Check className="w-3 h-3 text-green-600" />}
                                        <span className={cn("ml-auto text-xs font-mono border px-1 rounded", completedEventIds.has(e.id) ? "border-green-200 bg-green-50 text-green-700" : "text-slate-400 border-slate-200")}>
                                            {e.event_code || '---'}
                                        </span>
                                    </div>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex gap-2">
                <Button variant="outline" disabled={!selectedEventId || generatingPdf} onClick={() => { const e = events.find(ev => ev.id === selectedEventId); if(e) generatePDF([e]) }} className="gap-2 bg-white hover:bg-slate-50">
                    {generatingPdf ? <Loader2 className="w-4 h-4 animate-spin"/> : <FileDown className="w-4 h-4" />} PDF Report
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button className="gap-2 bg-slate-900 text-white hover:bg-slate-800">
                            <Printer className="w-4 h-4" /> Bulk Export <ChevronDown className="w-3 h-3 opacity-50"/>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white">
                        <DropdownMenuItem onClick={() => generatePDF(events.filter(e => e.category === 'ON STAGE'))}>All ON STAGE</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => generatePDF(events.filter(e => e.category === 'OFF STAGE'))}>All OFF STAGE</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto bg-white">
            {!selectedEventId ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-300">
                    <div className="p-6 rounded-full bg-slate-50 mb-4"><FileText className="w-10 h-10" /></div>
                    <p className="font-medium text-slate-500">Select an event above to mark participation</p>
                </div>
            ) : loadingEvent ? (
                <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>
            ) : (
                <Table>
                    <TableHeader className="bg-slate-50 sticky top-0 z-20 shadow-sm border-b">
                        <TableRow>
                            <TableHead className="w-20 font-bold text-slate-700">Chest No</TableHead>
                            <TableHead className="font-bold text-slate-700">Student Name</TableHead>
                            <TableHead className="font-bold text-slate-700 hidden md:table-cell">Class</TableHead>
                            <TableHead className="font-bold text-slate-700">Team</TableHead>
                            <TableHead className="w-[180px] text-right font-bold text-slate-700 pr-6">Participation</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {participants.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-16 text-muted-foreground italic">No participants found.</TableCell></TableRow>
                        ) : (
                            participants.map((p, idx) => (
                                <TableRow key={p.id} className={cn("hover:bg-slate-50 transition-colors", idx % 2 === 0 ? "bg-white" : "bg-slate-50/30")}>
                                    <TableCell className="font-bold font-mono text-base text-slate-700 bg-slate-50/50 border-r">{p.students.chest_no}</TableCell>
                                    <TableCell>
                                        <div className="font-medium text-slate-900">{p.students.name}</div>
                                        <div className="text-xs text-slate-500">{p.students.section}</div>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell text-slate-600">{p.students.class_grade}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.students.team.color_hex }}></div>
                                            <span className="font-medium text-sm text-slate-700">{p.students.team.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-4">
                                        <Select
                                            defaultValue={p.attendance_status || 'pending'}
                                            onValueChange={(val) => updateAttendance(p.id, val)}
                                        >
                                            <SelectTrigger
                                                className={cn(
                                                    "w-40 h-8 ml-auto border transition-colors focus:ring-0",
                                                    p.attendance_status === 'present' ? "bg-green-50 border-green-200 text-green-700 font-medium" :
                                                    p.attendance_status === 'absent' ? "bg-red-50 border-red-200 text-red-700 font-medium" :
                                                    "bg-white border-slate-200 text-slate-500"
                                                )}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {p.attendance_status === 'present'}
                                                    {p.attendance_status === 'absent'}
                                                    {(p.attendance_status === 'pending' || !p.attendance_status)}
                                                    <SelectValue />
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent align="end" className="bg-white">
                                                <SelectItem value="pending" className="text-slate-500">
                                                    <div className="flex items-center gap-2"><Clock className="w-4 h-4"/> Pending</div>
                                                </SelectItem>
                                                <SelectItem value="present" className="text-green-600 font-medium">
                                                    <div className="flex items-center gap-2"><UserCheck className="w-4 h-4"/> Present</div>
                                                </SelectItem>
                                                <SelectItem value="absent" className="text-red-600 font-medium">
                                                    <div className="flex items-center gap-2"><UserX className="w-4 h-4"/> Absent</div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            )}
        </div>
    </div>
  )
}