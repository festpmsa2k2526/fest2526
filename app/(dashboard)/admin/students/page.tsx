"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase"
import { StudentFormDialog } from "@/components/admin/students/student-form-dialog"
import { CsvUploadDialog } from "@/components/admin/students/csv-upload-dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { Loader2, Trash2, Search, Edit2, Upload, Plus, AlertTriangle } from "lucide-react"

// Types
interface Team { id: string; name: string; slug: string; color_hex: string }
interface Student {
  id: string
  name: string
  chest_no: string | null
  class_grade: string | null
  section: 'Senior' | 'Junior' | 'Sub-Junior'
  team_id: string
  teams?: { name: string; color_hex: string }
}

export default function AdminStudents() {
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<Student[]>([])
  const [teams, setTeams] = useState<Team[]>([])

  // Filters
  const [search, setSearch] = useState("")
  const [filterTeam, setFilterTeam] = useState<string>("all")
  const [filterSection, setFilterSection] = useState<string>("all")
  const [filterClass, setFilterClass] = useState<string>("all")

  // Modal States
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)

  const supabase = createClient()

  async function loadData() {
    try {
      setLoading(true)
      const { data: teamsData } = await supabase.from('teams').select('*').order('name')
      if (teamsData) setTeams(teamsData as any)

      const { data: studentsData, error } = await supabase
        .from('students')
        .select(`*, teams ( name, color_hex )`)
        .order('chest_no', { ascending: true })

      if (error) throw error
      setStudents(studentsData as any)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // --- ACTIONS ---
  const handleEdit = (student: Student) => {
    setEditingStudent(student)
    setIsAddOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const { error } = await supabase.from('students').delete().eq('id', deleteId)
      if (error) throw error
      setStudents(prev => prev.filter(s => s.id !== deleteId))
    } catch (err) {
      alert("Failed to delete")
    } finally {
      setDeleteId(null)
    }
  }

  const handleBulkDelete = async () => {
    try {
      const { error } = await supabase.from('students').delete().neq('id', '00000000-0000-0000-0000-000000000000') // Delete all
      if (error) throw error
      setStudents([])
      setIsBulkDeleteOpen(false)
    } catch (err) {
      alert("Bulk delete failed")
    }
  }

  // --- FILTERING ---
  const availableClasses = useMemo(() => {
    const classes = new Set(students.map(s => s.class_grade).filter(Boolean))
    return Array.from(classes).sort()
  }, [students])

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
                            (s.chest_no && s.chest_no.toLowerCase().includes(search.toLowerCase()))
      const matchesTeam = filterTeam === "all" || s.team_id === filterTeam
      const matchesSection = filterSection === "all" || s.section === filterSection
      const matchesClass = filterClass === "all" || s.class_grade === filterClass
      return matchesSearch && matchesTeam && matchesSection && matchesClass
    })
  }, [students, search, filterTeam, filterSection, filterClass])

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">

      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Students Directory</h2>
          <p className="text-muted-foreground">Manage registered students and their details.</p>
        </div>
        <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => { setEditingStudent(null); setIsAddOpen(true); }} className="gap-2">
                <Plus className="w-4 h-4" /> Add Student
            </Button>
            <Button variant="outline" onClick={() => setIsUploadOpen(true)} className="gap-2">
                <Upload className="w-4 h-4" /> Import CSV
            </Button>
            {students.length > 0 && (
                <Button variant="destructive" onClick={() => setIsBulkDeleteOpen(true)} className="gap-2">
                    <Trash2 className="w-4 h-4" /> Delete All
                </Button>
            )}
        </div>
      </div>

      {/* FILTER BAR */}
      <Card className="bg-muted/10 border-none shadow-none">
        <CardContent className="p-0">
          <div className="flex flex-col xl:flex-row gap-4 p-1">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or chest no..."
                className="pl-9 bg-white"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Select value={filterTeam} onValueChange={setFilterTeam}>
              <SelectTrigger className="w-full xl:w-[200px] bg-white"><SelectValue placeholder="All Teams" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filterSection} onValueChange={setFilterSection}>
              <SelectTrigger className="w-full xl:w-[180px] bg-white"><SelectValue placeholder="All Sections" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                <SelectItem value="Senior">Senior</SelectItem>
                <SelectItem value="Junior">Junior</SelectItem>
                <SelectItem value="Sub-Junior">Sub-Junior</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger className="w-full xl:w-[150px] bg-white"><SelectValue placeholder="All Classes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {availableClasses.map(cls => <SelectItem key={cls as string} value={cls as string}>{cls}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* STUDENTS TABLE */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="w-[100px]">Chest No</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Team</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center h-32 text-muted-foreground">No students found.</TableCell></TableRow>
              ) : (
                filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-mono font-medium text-slate-700">{student.chest_no || '-'}</TableCell>
                    <TableCell className="font-medium text-base">{student.name}</TableCell>
                    <TableCell>{student.class_grade || '-'}</TableCell>
                    <TableCell><Badge variant="secondary" className="font-normal bg-slate-100 text-slate-600">{student.section}</Badge></TableCell>
                    <TableCell>
                        <Badge variant="outline" style={{ borderColor: student.teams?.color_hex, color: student.teams?.color_hex, backgroundColor: student.teams?.color_hex + '10' }}>
                            {student.teams?.name || "Unknown"}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleEdit(student)}>
                            <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(student.id)}>
                            <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* DIALOGS */}
      <StudentFormDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        student={editingStudent}
        teams={teams}
        onSuccess={loadData}
      />

      <CsvUploadDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        teams={teams}
        onSuccess={loadData}
      />

      {/* DELETE CONFIRMATION */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Delete Student?</AlertDialogTitle>
                <AlertDialogDescription>This action cannot be undone. This will permanently remove the student and their event participations.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* BULK DELETE CONFIRMATION */}
      <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="w-5 h-5" /> Danger Zone: Delete All?</AlertDialogTitle>
                <AlertDialogDescription>
                    Are you absolutely sure? This will delete <strong>ALL {students.length} students</strong> from the database.
                    This action is irreversible and will wipe the slate clean.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive hover:bg-destructive/90">Yes, Delete Everything</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}