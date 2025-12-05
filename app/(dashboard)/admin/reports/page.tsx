"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import {
  Card, CardContent
} from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Loader2, UserX, Filter, FileText, Search, Printer, Layers, FileDown, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

// --- TYPES ---
interface Team { id: string; name: string; color_hex: string }
interface Event { id: string; name: string; event_code: string; category: string; max_participants_per_team: number }

interface StudentWithData {
  id: string
  name: string
  chest_no: string | null
  class_grade: string | null
  section: string
  team_id: string
  teams: { name: string; color_hex: string }
  participations: {
    events: { category: string }
  }[]
}

interface EventParticipant {
  id: string
  student: {
    name: string
    chest_no: string
    class_grade: string
    section: string
    team: { name: string; color_hex: string }
  }
  status: string
}

export default function AdminReports() {
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState<Team[]>([])
  const [events, setEvents] = useState<Event[]>([])

  // Data Stores
  const [allStudents, setAllStudents] = useState<StudentWithData[]>([])
  const [eventParticipants, setEventParticipants] = useState<EventParticipant[]>([])

  // Filter States
  const [selectedTeam, setSelectedTeam] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedEventId, setSelectedEventId] = useState<string>("")
  const [loadingEvent, setLoadingEvent] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)

  const supabase = createClient()

  // 1. Initial Data Load
  useEffect(() => {
    async function loadBaseData() {
      try {
        setLoading(true)

        // Fetch Teams
        const { data: teamsData } = await supabase.from('teams').select('*').order('name')
        if (teamsData) setTeams(teamsData as any)

        // Fetch Events
        const { data: eventsData } = await supabase.from('events').select('*').order('name')
        if (eventsData) setEvents(eventsData as any)

        // Fetch All Students
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

  // 2. Fetch Specific Event Participants
  useEffect(() => {
    if (!selectedEventId) {
      setEventParticipants([])
      return
    }

    async function loadEventData() {
      setLoadingEvent(true)
      const { data } = await supabase
        .from('participations')
        .select(`
          id,
          status,
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
        }))
        // Numeric sort by Chest No
        formatted.sort((a: any, b: any) => {
           const chestA = parseInt(a.student.chest_no) || 99999
           const chestB = parseInt(b.student.chest_no) || 99999
           return chestA - chestB
        })
        setEventParticipants(formatted)
      }
      setLoadingEvent(false)
    }
    loadEventData()
  }, [selectedEventId])

  // --- PDF GENERATION LOGIC ---

  const generatePDF = async (eventsToPrint: Event[]) => {
    setGeneratingPdf(true)
    const doc = new jsPDF()
    let isFirstPage = true

    // Load Header Image (Optional: Ensure /header-bg.png exists in public folder)
    const headerImg = new Image()
    headerImg.src = "/header-bg.png"

    // Helper to fetch participants for a specific event
    const fetchParticipantsForEvent = async (eventId: string) => {
        const { data } = await supabase
            .from('participations')
            .select(`
                students!inner ( name, chest_no, class_grade, section, team:teams(name) )
            `)
            .eq('event_id', eventId)

        if (!data) return []

        return data.map((p: any) => ({
            name: p.students.name,
            chest_no: p.students.chest_no || "N/A",
            class: p.students.class_grade || "-",
            team: p.students.team.name,
            section: p.students.section
        })).sort((a, b) => (parseInt(a.chest_no) || 999) - (parseInt(b.chest_no) || 999))
    }

    // Iterate through events
    for (const event of eventsToPrint) {
        if (!isFirstPage) doc.addPage()
        isFirstPage = false

        // Fetch Data for this event
        const participants = await fetchParticipantsForEvent(event.id)

        // 1. Header
        // doc.addImage(headerImg, 'PNG', 10, 10, 190, 30) // Use if you have an image
        doc.setFontSize(22)
        doc.setFont("helvetica", "bold")
        doc.text("ARTS FEST 2025", 105, 20, { align: "center" })

        doc.setFontSize(14)
        doc.setFont("helvetica", "normal")
        doc.text("Event Call Sheet", 105, 28, { align: "center" })

        // Separator
        doc.setLineWidth(0.5)
        doc.line(10, 35, 200, 35)

        // 2. Event Metadata Table
        autoTable(doc, {
            startY: 40,
            body: [
                ["Event Name", event.name],
                ["Code", event.event_code || "-"],
                ["Category", event.category],
                ["Limit/Team", event.max_participants_per_team.toString()],
            ],
            theme: 'plain',
            styles: { fontSize: 10, cellPadding: 1 },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 30 } },
            margin: { left: 14 }
        })

        // 3. Participants Table
        // @ts-ignore
        const finalY = doc.lastAutoTable.finalY + 5
        doc.line(10, finalY, 200, finalY)

        doc.setFontSize(11)
        doc.setFont("helvetica", "bold")
        doc.text(`Participants (${participants.length})`, 14, finalY + 8)

        const tableBody = participants.map((p, idx) => [
            idx + 1,
            p.chest_no,
            p.name,
            p.class,
            p.team,
            "" // Signature/Grade Column
        ])

        autoTable(doc, {
            startY: finalY + 12,
            head: [["#", "Chest No", "Name", "Class", "Team", "Signature / Grade"]],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [40, 40, 40], textColor: 255 },
            columnStyles: {
                0: { cellWidth: 10, halign: 'center' },
                1: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
                2: { cellWidth: 60 },
                3: { cellWidth: 20, halign: 'center' },
                4: { cellWidth: 30 },
                5: { cellWidth: 'auto' }
            },
            styles: { minCellHeight: 10, valign: 'middle', fontSize: 10 }
        })

        // Footer
        const pageHeight = doc.internal.pageSize.height
        doc.setFontSize(8)
        doc.setFont("helvetica", "italic")
        doc.text(`Generated on ${new Date().toLocaleString()}`, 105, pageHeight - 10, { align: "center" })
    }

    doc.save(eventsToPrint.length > 1 ? "bulk_event_list.pdf" : `${eventsToPrint[0].name}_call_sheet.pdf`)
    setGeneratingPdf(false)
  }

  // Handle Single Event Download
  const handleSingleDownload = () => {
    const event = events.find(e => e.id === selectedEventId)
    if (event) generatePDF([event])
  }

  // Handle Bulk Download
  const handleBulkDownload = (category: string) => {
    // Filter events
    const eventsToPrint = events.filter(e => {
        if (category === 'GENERAL') {
            // Assuming General is a section or category logic
            return e.category === 'ON STAGE' && e.name.toLowerCase().includes('general') // Simplify or use specific field
            // Better logic based on your DB:
            // return e.applicable_section?.includes('General') || e.category === 'GENERAL'
        }
        return e.category === category
    })

    if (eventsToPrint.length === 0) return alert("No events found for this category.")

    if (confirm(`This will generate a PDF with ${eventsToPrint.length} pages. Continue?`)) {
        generatePDF(eventsToPrint)
    }
  }

  // --- COMPUTED LISTS ---

  // Filter 1: Zero Participations
  const zeroParticipationList = useMemo(() => {
    return allStudents.filter(s => {
      const isTeamMatch = selectedTeam === "all" || s.team_id === selectedTeam
      const isZero = s.participations.length === 0
      const isSearchMatch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (s.chest_no && s.chest_no.includes(searchQuery))
      return isTeamMatch && isZero && isSearchMatch
    })
  }, [allStudents, selectedTeam, searchQuery])

  // Filter 2: Single Section Analysis
  const getSectionExclusiveList = (category: string) => {
    return allStudents.filter(s => {
      if (s.participations.length === 0) return false

      const isTeamMatch = selectedTeam === "all" || s.team_id === selectedTeam
      const isSearchMatch = s.name.toLowerCase().includes(searchQuery.toLowerCase())

      // @ts-ignore
      const allMatch = s.participations.every(p => p.events?.category === category)

      return isTeamMatch && isSearchMatch && allMatch
    })
  }

  // Filter 3: Event Participants
  const filteredEventParticipants = useMemo(() => {
    return eventParticipants.filter(p => {
      const isSearchMatch = p.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            p.student.chest_no.includes(searchQuery)
      return isSearchMatch
    })
  }, [eventParticipants, searchQuery])

  if (loading) return <div className="h-[50vh] flex items-center justify-center"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col space-y-4 animate-in fade-in duration-500">
      {/* HEADER SECTION */}
      <div className="shrink-0 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reports & Analysis</h2>
          <p className="text-muted-foreground text-sm">Deep dive into participation metrics and generate lists.</p>
        </div>

        {/* GLOBAL FILTERS */}
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto bg-slate-50 p-2 rounded-lg border">
           <div className="relative w-full sm:w-60">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                className="pl-9 bg-white border-slate-200 focus-visible:ring-primary"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
           </div>

           <Select value={selectedTeam} onValueChange={setSelectedTeam}>
            <SelectTrigger className="w-full sm:w-[180px] bg-white border-slate-200">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Filter className="w-4 h-4" />
                <SelectValue placeholder="All Teams" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {teams.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* TABS CONTAINER */}
      <Tabs defaultValue="zero" className="flex-1 flex flex-col min-h-0">
        <div className="shrink-0">
            <TabsList className="w-full justify-start h-auto p-1 bg-slate-100/50 border rounded-lg mb-2 overflow-x-auto">
            <TabsTrigger
                value="zero"
                className="py-2.5 px-4 rounded-md data-[state=active]:bg-white data-[state=active]:text-red-600 data-[state=active]:shadow-sm transition-all"
            >
                <UserX className="w-4 h-4 mr-2" /> Zero Participation
            </TabsTrigger>
            <TabsTrigger
                value="section"
                className="py-2.5 px-4 rounded-md data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all"
            >
                <Layers className="w-4 h-4 mr-2" /> Section Exclusive
            </TabsTrigger>
            <TabsTrigger
                value="event"
                className="py-2.5 px-4 rounded-md data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm transition-all"
            >
                <FileText className="w-4 h-4 mr-2" /> Event Call Sheet
            </TabsTrigger>
            </TabsList>
        </div>

        <div className="flex-1 bg-white border rounded-lg shadow-sm overflow-hidden flex flex-col relative">

          {/* TAB 1: ZERO PARTICIPATION */}
          <TabsContent value="zero" className="m-0 h-full flex flex-col">
            <div className="shrink-0 p-4 border-b bg-red-50/30 flex justify-between items-center">
                <div className="flex items-center gap-2 text-red-700">
                    <div className="p-2 bg-red-100 rounded-full"><UserX className="w-4 h-4" /></div>
                    <div className="flex flex-col">
                        <span className="font-semibold text-sm">Inactive Students</span>
                        <span className="text-xs text-red-600/80">Students with 0 registered events</span>
                    </div>
                </div>
                <Badge variant="destructive" className="text-sm px-3 py-1">{zeroParticipationList.length}</Badge>
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
                        {zeroParticipationList.map(s => (
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
                        {zeroParticipationList.length === 0 && (
                            <TableRow><TableCell colSpan={5} className="text-center py-12 text-slate-400">Great job! Every student is participating.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
          </TabsContent>

          {/* TAB 2: SECTION EXCLUSIVE */}
          <TabsContent value="section" className="m-0 h-full flex flex-col">
             <div className="grid grid-cols-1 lg:grid-cols-2 h-full divide-y lg:divide-y-0 lg:divide-x">
                {/* LEFT: ONLY OFF STAGE */}
                <div className="flex flex-col h-full overflow-hidden bg-slate-50/30">
                    <div className="shrink-0 p-3 bg-white border-b flex justify-between items-center sticky top-0 z-10">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-8 bg-blue-500 rounded-full"></span>
                            <span className="font-semibold text-slate-700">Only OFF STAGE</span>
                        </div>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200">
                            {getSectionExclusiveList('OFF STAGE').length}
                        </Badge>
                    </div>
                    <div className="overflow-auto flex-1 p-0">
                        <SimpleStudentTable students={getSectionExclusiveList('OFF STAGE')} />
                    </div>
                </div>

                {/* RIGHT: ONLY ON STAGE */}
                <div className="flex flex-col h-full overflow-hidden bg-slate-50/30">
                    <div className="shrink-0 p-3 bg-white border-b flex justify-between items-center sticky top-0 z-10">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-8 bg-orange-500 rounded-full"></span>
                            <span className="font-semibold text-slate-700">Only ON STAGE</span>
                        </div>
                        <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-200">
                            {getSectionExclusiveList('ON STAGE').length}
                        </Badge>
                    </div>
                    <div className="overflow-auto flex-1 p-0">
                        <SimpleStudentTable students={getSectionExclusiveList('ON STAGE')} />
                    </div>
                </div>
             </div>
          </TabsContent>

          {/* TAB 3: EVENT CALL SHEET */}
          <TabsContent value="event" className="m-0 h-full flex flex-col">
             {/* Toolbar */}
             <div className="shrink-0 p-4 border-b bg-slate-50/50 flex flex-col sm:flex-row gap-4 justify-between items-end">
                <div className="w-full sm:w-[320px] space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Select Event Sheet</label>
                    <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                        <SelectTrigger className="w-full bg-white border-slate-300 h-10 shadow-sm">
                            <SelectValue placeholder="Choose an event to view..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
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
                    <Button
                        variant="outline"
                        disabled={!selectedEventId || generatingPdf}
                        className="gap-2 bg-white border-slate-300 hover:bg-slate-50"
                        onClick={handleSingleDownload}
                    >
                        {generatingPdf ? <Loader2 className="w-4 h-4 animate-spin"/> : <FileDown className="w-4 h-4 text-slate-600" />}
                        <span>Download PDF</span>
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="default" className="gap-2">
                                <Printer className="w-4 h-4" /> Bulk Download <ChevronDown className="w-3 h-3 opacity-50"/>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleBulkDownload('ON STAGE')}>
                                All ON STAGE Events
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleBulkDownload('OFF STAGE')}>
                                All OFF STAGE Events
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleBulkDownload('GENERAL')}>
                                All GENERAL Events
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
             </div>

             {/* Content Area */}
             <div className="flex-1 overflow-auto bg-white p-0">
                {!selectedEventId ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300">
                        <div className="p-6 rounded-full bg-slate-50 mb-4">
                            <FileText className="w-10 h-10" />
                        </div>
                        <p className="font-medium text-slate-500">Select an event above to generate the list</p>
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
                                <TableHead className="w-[150px] text-right font-bold text-slate-700">Signature / Score</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredEventParticipants.map((p, idx) => (
                                <TableRow key={p.id} className={cn("hover:bg-slate-50 transition-colors", idx % 2 === 0 ? "bg-white" : "bg-slate-50/30")}>
                                    <TableCell className="font-bold font-mono text-base text-slate-700 bg-slate-50/50 border-r">{p.student.chest_no}</TableCell>
                                    <TableCell>
                                        <div className="font-medium text-slate-900">{p.student.name}</div>
                                        <div className="text-xs text-slate-500">{p.student.section}</div>
                                    </TableCell>
                                    <TableCell className="text-slate-600">{p.student.class_grade}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.student.team.color_hex }}></div>
                                            <span className="font-medium text-sm text-slate-700">{p.student.team.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className={cn(
                                            "text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-full",
                                            p.status === 'registered' ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                                        )}>
                                            {p.status}
                                        </span>
                                    </TableCell>
                                    <TableCell className="border-l border-dashed border-slate-200">
                                        <div className="h-8 border-b border-slate-200 w-full"></div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredEventParticipants.length === 0 && (
                                <TableRow><TableCell colSpan={6} className="text-center py-16 text-muted-foreground italic">No participants found for this event.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
             </div>
          </TabsContent>

        </div>
      </Tabs>
    </div>
  )
}

// Simple Sub-component for Section Lists
function SimpleStudentTable({ students }: { students: StudentWithData[] }) {
    if (students.length === 0) return (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground text-sm italic bg-white">
            <UserX className="w-8 h-8 opacity-20 mb-2" />
            No students found in this category.
        </div>
    )
    return (
        <Table>
            <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                <TableRow>
                    <TableHead className="w-[60%]">Name</TableHead>
                    <TableHead>Team</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {students.map(s => (
                    <TableRow key={s.id} className="hover:bg-slate-50 border-b last:border-0">
                        <TableCell>
                            <div className="font-medium text-sm text-slate-900">{s.name}</div>
                            <div className="text-xs text-slate-500 flex gap-1 items-center mt-0.5">
                                <span className="font-mono bg-slate-100 px-1 rounded">{s.chest_no || '?'}</span>
                                <span>• Class {s.class_grade}</span>
                            </div>
                        </TableCell>
                        <TableCell>
                            <Badge variant="outline" style={{ color: s.teams.color_hex, borderColor: s.teams.color_hex + '40', backgroundColor: s.teams.color_hex + '10' }}>
                                {s.teams.name}
                            </Badge>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}