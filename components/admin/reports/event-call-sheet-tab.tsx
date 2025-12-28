"use client"

import { useState, useEffect, useMemo } from "react"
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
import { Loader2, FileText, Printer, FileDown, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface Event { id: string; name: string; event_code: string; category: string; max_participants_per_team: number }

export function EventCallSheetTab({ events }: { events: Event[] }) {
  const [selectedEventId, setSelectedEventId] = useState<string>("")
  const [loadingEvent, setLoadingEvent] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [participants, setParticipants] = useState<any[]>([])

  const supabase = createClient()

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
          id, status,
          students!inner ( name, chest_no, class_grade, section, team:teams(name, color_hex) )
        `)
        .eq('event_id', selectedEventId)
        .order('created_at', { ascending: true })

      if (data) {
        const formatted = data.map((p: any) => ({
          id: p.id,
          status: p.status,
          student: {
            name: p.students.name,
            chest_no: p.students.chest_no || 'N/A',
            class_grade: p.students.class_grade || '-',
            section: p.students.section,
            team: p.students.team
          }
        })).sort((a: any, b: any) => (parseInt(a.student.chest_no) || 999) - (parseInt(b.student.chest_no) || 999))
        setParticipants(formatted)
      }
      setLoadingEvent(false)
    }
    loadEventData()
  }, [selectedEventId])

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
            .select(`students!inner ( name, chest_no, class_grade, team:teams(name) )`)
            .eq('event_id', event.id)

        const parts = (data || []).map((p: any) => ({
            name: p.students.name,
            chest_no: p.students.chest_no || "N/A",
            class: p.students.class_grade || "-",
            team: p.students.team.name
        })).sort((a, b) => (parseInt(a.chest_no) || 999) - (parseInt(b.chest_no) || 999))

        doc.setFontSize(18)
        doc.setFont("helvetica", "bold")
        doc.text("ARTS FEST 2025", 105, 20, { align: "center" })
        doc.setFontSize(12)
        doc.setFont("helvetica", "normal")
        doc.text(`Event: ${event.name} (${event.event_code})`, 105, 28, { align: "center" })

        const body = parts.map((p, i) => [i + 1, p.chest_no, p.name, p.class, p.team, ""])

        autoTable(doc, {
            startY: 35,
            head: [["#", "Chest No", "Name", "Class", "Team", "Grade/Sig"]],
            body: body,
            theme: 'grid',
            headStyles: { fillColor: [40, 40, 40] }
        })
    }
    doc.save("event_sheets.pdf")
    setGeneratingPdf(false)
  }

  return (
    <div className="flex flex-col h-full bg-white border rounded-lg shadow-sm">
        {/* Toolbar */}
        <div className="shrink-0 p-4 border-b bg-slate-50/50 flex flex-col sm:flex-row gap-4 justify-between items-end">
            <div className="w-full sm:w-[320px] space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Select Event Sheet</label>
                <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                    <SelectTrigger className="w-full bg-white h-10 shadow-sm"><SelectValue placeholder="Choose an event..." /></SelectTrigger>
                    <SelectContent className="max-h-[300px] bg-white">
                        {events.map(e => (
                            <SelectItem key={e.id} value={e.id}>
                                <span className="font-medium text-slate-700">{e.name}</span>
                                <span className="ml-2 text-xs text-slate-400 font-mono border px-1 rounded">{e.event_code || '---'}</span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex gap-2">
                <Button variant="outline" disabled={!selectedEventId || generatingPdf} onClick={() => { const e = events.find(ev => ev.id === selectedEventId); if(e) generatePDF([e]) }} className="gap-2 bg-white">
                    {generatingPdf ? <Loader2 className="w-4 h-4 animate-spin"/> : <FileDown className="w-4 h-4" />} Download PDF
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button className="gap-2"><Printer className="w-4 h-4" /> Bulk Download <ChevronDown className="w-3 h-3 opacity-50"/></Button>
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
                    <p className="font-medium text-slate-500">Select an event above to view call sheet</p>
                </div>
            ) : loadingEvent ? (
                <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>
            ) : (
                <Table>
                    <TableHeader className="bg-slate-50 sticky top-0 z-20 shadow-sm border-b">
                        <TableRow>
                            <TableHead className="w-[100px] font-bold text-slate-700">Chest No</TableHead>
                            <TableHead className="font-bold text-slate-700">Student Name</TableHead>
                            <TableHead className="font-bold text-slate-700">Class</TableHead>
                            <TableHead className="font-bold text-slate-700">Team</TableHead>
                            <TableHead className="font-bold text-slate-700">Status</TableHead>
                            <TableHead className="w-[150px] text-right font-bold text-slate-700">Score</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {participants.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center py-16 text-muted-foreground italic">No participants found.</TableCell></TableRow>
                        ) : (
                            participants.map((p, idx) => (
                                <TableRow key={p.id} className={cn("hover:bg-slate-50", idx % 2 === 0 ? "bg-white" : "bg-slate-50/30")}>
                                    <TableCell className="font-bold font-mono text-base text-slate-700 bg-slate-50/50 border-r">{p.student.chest_no}</TableCell>
                                    <TableCell>
                                        <div className="font-medium text-slate-900">{p.student.name}</div>
                                        <div className="text-xs text-slate-500">{p.student.section}</div>
                                    </TableCell>
                                    <TableCell>{p.student.class_grade}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.student.team.color_hex }}></div>
                                            <span className="font-medium text-sm text-slate-700">{p.student.team.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className={cn("text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-full", p.status === 'registered' ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600")}>
                                            {p.status}
                                        </span>
                                    </TableCell>
                                    <TableCell className="border-l border-dashed border-slate-200">
                                        <div className="h-8 border-b border-slate-200 w-full"></div>
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