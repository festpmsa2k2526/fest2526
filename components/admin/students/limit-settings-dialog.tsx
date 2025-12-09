"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Save, Settings2 } from "lucide-react"

interface SectionLimit {
  id: string
  section: string
  category: string
  limit_count: number
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const LIMIT_OPTIONS = Array.from({ length: 10 }, (_, i) => (i + 1).toString()).concat(['100'])

export function LimitSettingsDialog({ open, onOpenChange }: Props) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [limits, setLimits] = useState<SectionLimit[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (open) loadLimits()
  }, [open])

  async function loadLimits() {
    setLoading(true)
    const { data } = await supabase.from('section_limits').select('*').order('section')
    if (data) setLimits(data as SectionLimit[])
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      for (const limit of limits) {
        // FIX: Cast to 'any' to bypass strict TypeScript checking on update object
        await (supabase.from('section_limits') as any)
          .update({ limit_count: limit.limit_count })
          .eq('id', limit.id)
      }
      onOpenChange(false)
    } catch (err) {
      console.error(err)
      alert("Failed to update limits")
    } finally {
      setSaving(false)
    }
  }

  const updateLimit = (id: string, val: string) => {
    setLimits(prev => prev.map(l => l.id === id ? { ...l, limit_count: parseInt(val) } : l))
  }

  // Group by Section for UI
  const grouped = limits.reduce((acc, curr) => {
    if (!acc[curr.section]) acc[curr.section] = []
    acc[curr.section].push(curr)
    return acc
  }, {} as Record<string, SectionLimit[]>)

  // Custom sort order
  const order = ['Senior', 'Junior', 'Sub-Junior', 'General', 'Foundation']

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-white border-slate-200 shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-primary" /> Participation Limits
          </DialogTitle>
          <DialogDescription>Set max events allowed per student category.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="h-40 flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>
        ) : (
          <div className="py-4 space-y-6 max-h-[60vh] overflow-y-auto pr-2">
            {order.map(section => {
               const items = grouped[section]
               if (!items) return null
               return (
                 <div key={section} className="space-y-3">
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b pb-1">{section}</h4>
                    <div className="grid grid-cols-2 gap-4">
                        {items.sort((a,b) => b.category.localeCompare(a.category)).map(limit => (
                            <div key={limit.id} className="space-y-1.5">
                                <Label className="text-xs text-slate-500 font-medium">{limit.category}</Label>
                                <Select
                                    value={limit.limit_count.toString()}
                                    onValueChange={(v) => updateLimit(limit.id, v)}
                                >
                                    <SelectTrigger className="h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white">
                                        {LIMIT_OPTIONS.map(opt => (
                                            <SelectItem key={opt} value={opt}>
                                                {opt === '100' ? 'Unlimited' : opt}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ))}
                    </div>
                 </div>
               )
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Limits
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}