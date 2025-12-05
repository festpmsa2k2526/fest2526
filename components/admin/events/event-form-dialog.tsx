"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, AlertCircle } from "lucide-react"

interface Event {
  id: string
  name: string
  event_code: string
  category: 'OFF STAGE' | 'ON STAGE'
  max_participants_per_team: number
  description: string | null
  grade_type: 'A' | 'B' | 'C'
  applicable_section: string[]
}

interface EventFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: Event | null
  onSuccess: () => void
}

const SECTIONS = ['Senior', 'Junior', 'Sub-Junior', 'General']
const GRADES = ['A', 'B', 'C']
const CATEGORIES = ['ON STAGE', 'OFF STAGE']

export function EventFormDialog({ open, onOpenChange, event, onSuccess }: EventFormDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    event_code: "",
    category: "ON STAGE",
    max_participants_per_team: 1,
    grade_type: "A",
    applicable_section: "Senior", // UI handles single select, DB stores array
    description: ""
  })

  // Load data on edit
  useEffect(() => {
    if (event && open) {
      setFormData({
        name: event.name,
        event_code: event.event_code || "",
        category: event.category,
        max_participants_per_team: event.max_participants_per_team,
        grade_type: event.grade_type || "A",
        // Take the first section if array exists, else default
        applicable_section: event.applicable_section?.[0] || "Senior",
        description: event.description || ""
      })
    } else if (!event && open) {
      // Reset for add mode
      setFormData({
        name: "",
        event_code: "",
        category: "ON STAGE",
        max_participants_per_team: 1,
        grade_type: "A",
        applicable_section: "Senior",
        description: ""
      })
    }
    setError(null)
  }, [event, open])

  const supabase = createClient()

  const handleSubmit = async () => {
    setError(null)
    if (!formData.name || !formData.event_code) {
      setError("Please fill all required fields.")
      return
    }

    setLoading(true)
    try {
      // 1. Check Event Code Uniqueness
      const { data: existing } = await supabase
        .from('events')
        .select('id')
        .eq('event_code', formData.event_code)
        .neq('id', event?.id || '00000000-0000-0000-0000-000000000000')
        .maybeSingle()

      if (existing) {
        throw new Error(`Event Code '${formData.event_code}' is already taken.`)
      }

      const payload = {
        name: formData.name,
        event_code: formData.event_code,
        category: formData.category,
        max_participants_per_team: formData.max_participants_per_team,
        grade_type: formData.grade_type,
        applicable_section: [formData.applicable_section], // Store as array
        description: formData.description
      }

      // 2. Perform Insert/Update
      if (event) {
        const { error: updateError } = await (supabase.from('events') as any)
          .update(payload)
          .eq('id', event.id)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await (supabase.from('events') as any).insert(payload)
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
      <DialogContent className="sm:max-w-[600px] bg-background">
        <DialogHeader>
          <DialogTitle>{event ? "Edit Event" : "Create New Event"}</DialogTitle>
          <DialogDescription>
            Configure event details, rules, and scoring category.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label>Event Name <span className="text-red-500">*</span></Label>
                <Input
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="e.g. Solo Dance"
                />
            </div>
            <div className="space-y-2">
                <Label>Event Code <span className="text-red-500">*</span></Label>
                <Input
                value={formData.event_code}
                onChange={e => setFormData({...formData, event_code: e.target.value})}
                placeholder="e.g. SE001"
                className="font-mono"
                />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label>Category</Label>
                <Select
                    value={formData.category}
                    onValueChange={v => setFormData({...formData, category: v})}
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label>Applicable Section</Label>
                <Select
                    value={formData.applicable_section}
                    onValueChange={v => setFormData({...formData, applicable_section: v})}
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label>Max Participants (Per Team)</Label>
                <Input
                    type="number"
                    min={1}
                    value={formData.max_participants_per_team}
                    onChange={e => setFormData({...formData, max_participants_per_team: parseInt(e.target.value) || 1})}
                />
            </div>
            <div className="space-y-2">
                <Label>Grade Type (Scoring)</Label>
                <Select
                    value={formData.grade_type}
                    onValueChange={v => setFormData({...formData, grade_type: v})}
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {GRADES.map(g => <SelectItem key={g} value={g}>Grade {g}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                placeholder="Rules, time limits, or specific instructions..."
                className="resize-none h-20"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {event ? "Save Changes" : "Create Event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}