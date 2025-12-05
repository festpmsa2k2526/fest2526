"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Save } from "lucide-react"

interface GradeSetting {
  id: string
  grade_type: 'A' | 'B' | 'C'
  first_place: number
  second_place: number
  third_place: number
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function GradeSettingsDialog({ open, onOpenChange, onSuccess }: Props) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<GradeSetting[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (open) loadSettings()
  }, [open])

  async function loadSettings() {
    setLoading(true)
    const { data } = await supabase.from('grade_settings').select('*').order('grade_type')
    if (data) setSettings(data as GradeSetting[])
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      for (const setting of settings) {
        // FIX: Cast to 'any' to bypass strict TypeScript checking on update object
        await (supabase.from('grade_settings') as any)
          .update({
            first_place: setting.first_place,
            second_place: setting.second_place,
            third_place: setting.third_place
          })
          .eq('id', setting.id)
      }
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      console.error(err)
      alert("Failed to update settings")
    } finally {
      setSaving(false)
    }
  }

  const updateVal = (index: number, field: keyof GradeSetting, val: string) => {
    const newSettings = [...settings]
    // @ts-ignore
    newSettings[index][field] = parseInt(val) || 0
    setSettings(newSettings)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-background border-border/50 shadow-lg">
        <DialogHeader>
          <DialogTitle>Scoring Configuration</DialogTitle>
          <DialogDescription>Adjust points awarded for each grade type.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="h-40 flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>
        ) : (
          <div className="grid gap-6 py-4">
            {settings.map((setting, idx) => (
              <div key={setting.id} className="grid grid-cols-4 items-center gap-4 border-b border-border/50 pb-4 last:pb-0 last:border-0">
                <div className="font-bold text-lg bg-primary/10 w-10 h-10 rounded-full flex items-center justify-center text-primary border border-primary/20">
                  {setting.grade_type}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">First</Label>
                  <Input
                    type="number"
                    value={setting.first_place}
                    onChange={(e) => updateVal(idx, 'first_place', e.target.value)}
                    className="h-9 bg-background/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Second</Label>
                  <Input
                    type="number"
                    value={setting.second_place}
                    onChange={(e) => updateVal(idx, 'second_place', e.target.value)}
                    className="h-9 bg-background/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Third</Label>
                  <Input
                    type="number"
                    value={setting.third_place}
                    onChange={(e) => updateVal(idx, 'third_place', e.target.value)}
                    className="h-9 bg-background/50"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Points
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}