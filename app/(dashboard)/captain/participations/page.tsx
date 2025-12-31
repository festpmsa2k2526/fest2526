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

  // New State for Header Image
  const [headerImageUrl, setHeaderImageUrl] = useState<string | null>(null)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  const supabase = createClient()

  // Fetch Data & Assets
  async function loadData() {
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

      // 1. Fetch Participations
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

      // 2. Fetch Header Image Asset
      const { data: assetData } = await (supabase.from('site_assets') as any)
        .select('value')
        .eq('key', 'admit_card_header')
        .single()

      if (assetData) {
        setHeaderImageUrl(assetData.value)
      }

    } catch (err) {
      console.error("Error fetching data:", err)
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
    loadData()
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

  // --- PDF GENERATOR HELPER: Convert URL to Base64 ---
  const getDataUri = async (url: string): Promise<string> => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.error("Error fetching image:", e);
        return "";
    }
  }

  // --- PDF GENERATOR LOGIC ---
  const generatePDF = async (itemsToPrint: GroupedParticipant[]) => {
    if (itemsToPrint.length === 0) return alert("No data to print")

    setIsGeneratingPdf(true)

    try {
        const doc = new jsPDF()
        let headerBase64 = ""

        // Fetch Header Image if available
        if (headerImageUrl) {
            headerBase64 = await getDataUri(headerImageUrl)
        }

        let isFirstPage = true

        itemsToPrint.forEach((item, index) => {
            if (!isFirstPage) doc.addPage()
            isFirstPage = false

            // 1. Header Image (Top Banner)
            // A4 width is 210mm. We use full width. Height ~35mm.
            if (headerBase64) {
                doc.addImage(headerBase64, "PNG", 0, 0, 210, 35)
            } else {
                // Fallback Header if no image
                doc.setFillColor(40, 40, 40)
                doc.rect(0, 0, 210, 35, "F")
                doc.setTextColor(255, 255, 255)
                doc.setFontSize(20)
                doc.setFont("helvetica", "bold")
                doc.text("ARTS FEST 2025", 105, 20, { align: "center" })
            }

            // 2. Title Section
            doc.setTextColor(0, 0, 0)
            doc.setFont("helvetica", "bold")
            doc.setFontSize(16)
            doc.text("ADMIT CARD", 105, 48, { align: "center" })

            // Category Subtitle
            doc.setFontSize(11)
            doc.setTextColor(100, 100, 100)
            doc.setFont("helvetica", "normal")
            doc.text(`CATEGORY: ${item.category}`, 105, 54, { align: "center" })

            // Draw line under title
            doc.setDrawColor(200, 200, 200)
            doc.line(70, 58, 140, 58)

            // 3. Student Details (Grid Layout)
            const startY = 65
            const col1 = 20
            const col2 = 110

            doc.setFontSize(10)
            doc.setTextColor(50, 50, 50)

            // Name
            doc.setFont("helvetica", "bold")
            doc.text("NAME:", col1, startY)
            doc.setFont("helvetica", "normal")
            doc.text(item.student.name.toUpperCase(), col1 + 25, startY)

            // Chest No (Prominent)
            doc.setFont("helvetica", "bold")
            doc.text("CHEST NO:", col2, startY)
            doc.setFont("helvetica", "bold")
            doc.setFontSize(12)
            doc.text(item.student.chest_no || "N/A", col2 + 25, startY)

            // Second Row
            const row2Y = startY + 8
            doc.setFontSize(10)

            doc.setFont("helvetica", "bold")
            doc.text("SECTION:", col1, row2Y)
            doc.setFont("helvetica", "normal")
            doc.text(item.student.section, col1 + 25, row2Y)

            doc.setFont("helvetica", "bold")
            doc.text("CLASS:", col2, row2Y)
            doc.setFont("helvetica", "normal")
            doc.text(item.student.class_grade || "-", col2 + 25, row2Y)

            // 4. Events Table
            // @ts-ignore
            autoTable(doc, {
                startY: 85,
                head: [["#", "Code", "Event Name", "Invigilator Sign"]],
                body: item.events.map((e, i) => [
                    i + 1,
                    e.event_code || "-",
                    e.name,
                    ""
                ]),
                theme: 'grid',
                headStyles: {
                    fillColor: [30, 30, 30],
                    textColor: 255,
                    fontSize: 10,
                    fontStyle: 'bold',
                    halign: 'center'
                },
                columnStyles: {
                    0: { cellWidth: 15, halign: 'center' },
                    1: { cellWidth: 30, halign: 'center' },
                    2: { cellWidth: 'auto' },
                    3: { cellWidth: 40 }
                },
                styles: {
                    fontSize: 10,
                    cellPadding: 4,
                    lineColor: [200, 200, 200],
                    lineWidth: 0.1
                },
                alternateRowStyles: {
                    fillColor: [250, 250, 250]
                }
            })

            // 5. Footer Watermark & Timestamp
            const pageHeight = doc.internal.pageSize.height
            const now = new Date().toLocaleString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true
            })

            doc.setFontSize(8)
            doc.setTextColor(150, 150, 150)
            doc.setFont("helvetica", "italic")

            // Left: Timestamp
            doc.text(`Printed: ${now}`, 15, pageHeight - 10)

            // Center: Watermark
            doc.text("Generated by Arts Fest System", 105, pageHeight - 10, { align: "center" })

            // Right: Page count (optional, but nice)
            doc.text(`Page ${index + 1} of ${itemsToPrint.length}`, 195, pageHeight - 10, { align: "right" })
        })

        doc.save(`AdmitCards_${new Date().toISOString().slice(0,10)}.pdf`)
    } catch (e) {
        console.error("PDF Generation failed", e)
        alert("Failed to generate PDF. Please try again.")
    } finally {
        setIsGeneratingPdf(false)
    }
  }

  // Bulk Print Handler
  const handleBulkPrint = (category: string) => {
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
                    <Button variant="outline" className="gap-2" disabled={isGeneratingPdf}>
                        {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                        {isGeneratingPdf ? "Generating..." : "Print All"}
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
                                disabled={isGeneratingPdf}
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