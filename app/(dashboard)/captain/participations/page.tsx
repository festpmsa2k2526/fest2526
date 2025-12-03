"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Loader2, AlertCircle, Calendar, Search, Printer, FileDown, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

// Raw DB Response Type
interface RawParticipation {
  id: string
  status: string
  created_at: string
  students: {
    id: string
    name: string
    section: string
    chest_no: string | null
    class_grade: string | null
  }
  events: {
    name: string
    category: string
    event_code: string | null
  }
}

// Grouped Type for UI
interface GroupedParticipant {
  studentId: string
  student: RawParticipation['students']
  category: string
  events: RawParticipation['events'][]
  status: string // simplified status for the group
}

interface Profile { team_id: string }

export default function CaptainParticipations() {
  const [rawData, setRawData] = useState<RawParticipation[]>([])
  const [groupedData, setGroupedData] = useState<GroupedParticipant[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  const supabase = createClient()

  // Fetch Data
  async function loadParticipations() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profileData } = await supabase
        .from('profiles')
        .select('team_id')
        .eq('id', user.id)
        .single()

      const profile = profileData as unknown as Profile
      if (!profile?.team_id) return

      const { data: participations, error } = await supabase
        .from('participations')
        .select(`
          id,
          status,
          created_at,
          students ( id, name, section, chest_no, class_grade ),
          events ( name, category, event_code )
        `)
        .eq('team_id', profile.team_id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const rows = participations as any as RawParticipation[]
      setRawData(rows)
      processGroupedData(rows)

    } catch (err) {
      console.error("Error fetching participations:", err)
    } finally {
      setLoading(false)
    }
  }

  // Grouping Logic: Student + Category
  const processGroupedData = (rows: RawParticipation[]) => {
    const map = new Map<string, GroupedParticipant>()

    rows.forEach(row => {
        // Key is combination of StudentID and Category (e.g., "123-ON_STAGE")
        const key = `${row.students.id}-${row.events.category}`

        if (!map.has(key)) {
            map.set(key, {
                studentId: row.students.id,
                student: row.students,
                category: row.events.category,
                events: [],
                status: row.status
            })
        }
        map.get(key)?.events.push(row.events)
    })

    setGroupedData(Array.from(map.values()))
  }

  useEffect(() => {
    loadParticipations()
  }, [])

  // --- FILTERING ---
  const filteredData = useMemo(() => {
    return groupedData.filter(item => {
        const matchesSearch =
            item.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.student.chest_no?.toLowerCase().includes(searchQuery.toLowerCase())

        return matchesSearch
    })
  }, [groupedData, searchQuery])

  // --- PDF GENERATOR LOGIC ---
  const generatePDF = (itemsToPrint: GroupedParticipant[]) => {
    if (itemsToPrint.length === 0) return alert("No data to print")

    const doc = new jsPDF()
    let isFirstPage = true

    itemsToPrint.forEach((item) => {
        if (!isFirstPage) doc.addPage()
        isFirstPage = false
        doc.addImage("/header-bg.png", "PNG", 0, 0, 210, 40)
        // Header
        doc.setFontSize(22)
        doc.setFont("helvetica", "bold")
        doc.text("ARTS FEST 2025", 105, 20, { align: "center" })
        doc.setFontSize(12)
        doc.setFont("helvetica", "normal")
        doc.text(`Admit Card - ${item.category}`, 105, 28, { align: "center" }) // Show Category in Header

        // Separator
        doc.setLineWidth(0.5)
        doc.line(10, 35, 200, 35)

        // Student Details
        autoTable(doc, {
            startY: 40,
            body: [
                ["Name", item.student.name],
                ["Chest No", item.student.chest_no || "N/A"],
                ["Class & Section", `${item.student.class_grade || '-'} (${item.student.section})`],
            ],
            theme: 'plain',
            styles: { fontSize: 11, cellPadding: 1.5 },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 40 },
                1: { cellWidth: 'auto' }
            }
        })

        // Separator
        // @ts-ignore
        const finalY = doc.lastAutoTable.finalY + 5
        doc.line(10, finalY, 200, finalY)

        // Events Table (Only for this category)
        doc.setFontSize(14)
        doc.setFont("helvetica", "bold")
        doc.text(`Events (${item.category})`, 14, finalY + 10)

        const tableBody = item.events.map((e, index) => [
            index + 1,
            e.event_code || "-",
            e.name,
            "" // Signature
        ])

        autoTable(doc, {
            startY: finalY + 15,
            head: [["Sl No", "Code", "Event Name", "Signature"]],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [40, 40, 40], textColor: 255 },
            columnStyles: {
                0: { cellWidth: 15, halign: 'center' },
                1: { cellWidth: 25, halign: 'center' },
                2: { cellWidth: 'auto' },
                3: { cellWidth: 40 }
            },
            styles: { minCellHeight: 12, valign: 'middle' }
        })

        // Footer
        const pageHeight = doc.internal.pageSize.height
        doc.setFontSize(8)
        doc.setFont("helvetica", "italic")
        doc.text("Generated by Arts Fest System", 105, pageHeight - 10, { align: "center" })
    })

    doc.save(`admit_cards_${new Date().toISOString().slice(0,10)}.pdf`)
  }

  // Bulk Print Handler
  const handleBulkPrint = (category: string) => {
    // Filter currently viewable list by category
    const listToPrint = filteredData.filter(item => item.category === category)
    if (listToPrint.length === 0) {
        alert(`No participants found for ${category} in the current view.`)
        return
    }
    generatePDF(listToPrint)
  }

  if (loading) return <div className="h-[50vh] flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 w-full max-w-full">

      {/* Header Section */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Team Registrations</h2>
            <p className="text-muted-foreground text-sm">Manage entries and download admit cards.</p>
        </div>
        <div className="flex flex-wrap gap-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2">
                        <Printer className="w-4 h-4" />
                        Print All
                        <ChevronDown className="w-3 h-3 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleBulkPrint('ON STAGE')}>
                        On Stage Participants
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkPrint('OFF STAGE')}>
                        Off Stage Participants
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>

      {/* Search & Info */}
      <Card className="bg-muted/10 border-none shadow-sm">
        <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative w-full md:w-[300px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search student or chest no..."
                        className="pl-9 bg-white"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex-1" />

                <div className="text-xs text-muted-foreground font-mono bg-white px-2 py-1 rounded border">
                    Showing: {filteredData.length} records (Grouped by Category)
                </div>
            </div>
        </CardContent>
      </Card>

      <Card className="glass-card shadow-sm border-border/50 bg-card/80 w-full overflow-hidden">
        <CardHeader className="border-b border-border/50 pb-4 px-4 sm:px-6">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Participants List
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredData.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground flex flex-col items-center gap-4 px-4">
              <AlertCircle className="w-12 h-12 opacity-20" />
              <p>No participants found.</p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
                <Table className="min-w-[800px]">
                <TableHeader className="bg-muted/40">
                    <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[250px] pl-6">Student Details</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Events Count</TableHead>
                    <TableHead className="text-right pr-6">Admit Card</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredData.map((row) => (
                    <TableRow key={`${row.studentId}-${row.category}`} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="pl-6">
                            <div className="flex flex-col">
                                <span className="font-semibold text-foreground">{row.student.name}</span>
                                <span className="text-xs text-muted-foreground font-mono mt-0.5">
                                    {row.student.chest_no ? `#${row.student.chest_no}` : 'No Chest No'}
                                    {row.student.class_grade && ` • Class ${row.student.class_grade}`}
                                </span>
                            </div>
                        </TableCell>
                        <TableCell>
                            <Badge variant="secondary" className="font-normal text-xs bg-muted text-muted-foreground border-border/50">
                                {row.student.section}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            <Badge variant="outline" className={cn("text-[10px]",
                                row.category === 'ON STAGE' ? "border-orange-200 text-orange-700 bg-orange-50" : "border-blue-200 text-blue-700 bg-blue-50"
                            )}>
                                {row.category}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            <span className="text-sm font-medium">{row.events.length} Events</span>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-2 text-xs"
                                onClick={() => generatePDF([row])}
                            >
                                <FileDown className="w-3 h-3" /> Download
                            </Button>
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}