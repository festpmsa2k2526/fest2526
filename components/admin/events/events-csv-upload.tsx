"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, UploadCloud, AlertTriangle, FileText, CheckCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface CsvUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function EventsCsvUpload({ open, onOpenChange, onSuccess }: CsvUploadDialogProps) {
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const supabase = createClient()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setError(null)
      setSuccess(null)
    }
  }

  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim() !== '')
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())

    // Required headers
    const required = ['name', 'event_code', 'category', 'limit', 'grade', 'section']
    const missing = required.filter(r => !headers.includes(r))

    if (missing.length > 0) {
      throw new Error(`Missing headers: ${missing.join(', ')}`)
    }

    const rows = lines.slice(1)
    const parsedData = []

    for (let i = 0; i < rows.length; i++) {
      // Basic CSV split - assumes no commas in values
      const cols = rows[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''))

      if (cols.length < required.length) continue;

      const rowData: any = {}
      headers.forEach((h, index) => rowData[h] = cols[index])

      // Validation
      if (!['ON STAGE', 'OFF STAGE'].includes(rowData['category'].toUpperCase())) {
         throw new Error(`Row ${i+2}: Invalid category '${rowData['category']}'. Must be ON STAGE or OFF STAGE.`)
      }

      parsedData.push({
        name: rowData['name'],
        event_code: rowData['event_code'],
        category: rowData['category'].toUpperCase(),
        max_participants_per_team: parseInt(rowData['limit']) || 1,
        grade_type: rowData['grade']?.toUpperCase() || 'A',
        applicable_section: [rowData['section']], // Convert single section to array
        description: rowData['description'] || ''
      })
    }

    return parsedData
  }

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const text = await file.text()
      const eventData = parseCSV(text)

      if (eventData.length === 0) {
        throw new Error("File is empty or invalid.")
      }

      // Bulk Insert
      const { error: insertError } = await (supabase.from('events') as any).insert(eventData)

      if (insertError) {
        if (insertError.code === '23505') throw new Error("Duplicate Event Codes found. Please check your data.")
        throw insertError
      }

      setSuccess(`Successfully added ${eventData.length} events.`)
      setTimeout(() => {
        onSuccess()
        onOpenChange(false)
        setFile(null)
        setSuccess(null)
      }, 2000)

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white">
        <DialogHeader>
          <DialogTitle>Import Events via CSV</DialogTitle>
          <DialogDescription>
            <a href="/template_events.xlsx" download className="text-green-700 hover:underline font-medium">
              Download Template
            </a>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:bg-muted/10 transition-colors">
            <Input
              type="file"
              accept=".csv"
              className="hidden"
              id="event-csv-upload"
              onChange={handleFileChange}
            />
            <label htmlFor="event-csv-upload" className="cursor-pointer flex flex-col items-center gap-2">
              <UploadCloud className="w-10 h-10 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                {file ? file.name : "Click to select CSV"}
              </span>
            </label>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
            <strong>Headers:</strong> name, event_code, category, limit, grade, section, description
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleUpload} disabled={!file || loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}