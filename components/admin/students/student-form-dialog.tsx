"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, AlertCircle } from "lucide-react"

interface Team { id: string; name: string }
interface Student {
  id: string
  name: string
  chest_no: string | null
  class_grade: string | null
  section: string
  team_id: string
}

interface StudentFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  student: Student | null
  teams: Team[]
  onSuccess: () => void
}

const CLASSES = ['FOUNDATION', 'TH-1', 'TH-2', 'AL-1', 'AL-2', 'AL-3', 'AL-4']
const SECTIONS = ['Senior', 'Junior', 'Sub-Junior']

export function StudentFormDialog({ open, onOpenChange, student, teams, onSuccess }: StudentFormDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    chest_no: "",
    class_grade: "FOUNDATION",
    section: "Senior",
    team_id: ""
  })

  // Load data on edit
  useEffect(() => {
    if (student && open) {
      setFormData({
        name: student.name,
        chest_no: student.chest_no || "",
        class_grade: student.class_grade || "FOUNDATION",
        section: student.section,
        team_id: student.team_id
      })
    } else if (!student && open) {
      // Reset for add mode
      setFormData({
        name: "",
        chest_no: "",
        class_grade: "FOUNDATION",
        section: "Senior",
        team_id: ""
      })
    }
    setError(null)
  }, [student, open])

  const supabase = createClient()

  const handleSubmit = async () => {
    setError(null)
    if (!formData.name || !formData.chest_no || !formData.team_id) {
      setError("Please fill all required fields.")
      return
    }

    setLoading(true)
    try {
      // 1. Check Chest No Uniqueness
      const { data: existing } = await supabase
        .from('students')
        .select('id')
        .eq('chest_no', formData.chest_no)
        .neq('id', student?.id || '00000000-0000-0000-0000-000000000000') // Exclude self
        .maybeSingle()

      if (existing) {
        throw new Error(`Chest No ${formData.chest_no} is already taken.`)
      }

      // 2. Perform Insert/Update
      if (student) {
        // Update - FIX: Cast to 'any' to avoid type 'never' error
        const { error: updateError } = await (supabase.from('students') as any)
          .update({
            name: formData.name,
            chest_no: formData.chest_no,
            class_grade: formData.class_grade,
            section: formData.section,
            team_id: formData.team_id
          })
          .eq('id', student.id)
        if (updateError) throw updateError
      } else {
        // Insert
        const { error: insertError } = await (supabase.from('students') as any).insert({
          name: formData.name,
          chest_no: formData.chest_no,
          class_grade: formData.class_grade,
          section: formData.section,
          team_id: formData.team_id
        })
        if (insertError) throw insertError
      }

      onSuccess()
      onOpenChange(false)

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{student ? "Edit Student" : "Add New Student"}</DialogTitle>
          <DialogDescription>
            {student ? "Update student details below." : "Enter details for the new participant."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Name <span className="text-red-500">*</span></Label>
            <Input
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Chest No <span className="text-red-500">*</span></Label>
            <Input
              value={formData.chest_no}
              onChange={e => setFormData({...formData, chest_no: e.target.value})}
              className="col-span-3"
              placeholder="Ex: 101"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Section</Label>
            <div className="col-span-3">
              <Select
                value={formData.section}
                onValueChange={v => setFormData({...formData, section: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Class</Label>
            <div className="col-span-3">
              <Select
                value={formData.class_grade}
                onValueChange={v => setFormData({...formData, class_grade: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Team <span className="text-red-500">*</span></Label>
            <div className="col-span-3">
              <Select
                value={formData.team_id}
                onValueChange={v => setFormData({...formData, team_id: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {student ? "Save Changes" : "Add Student"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}