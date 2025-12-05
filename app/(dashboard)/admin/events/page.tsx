"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { EventFormDialog } from "@/components/admin/events/event-form-dialog"
import { EventsCsvUpload } from "@/components/admin/events/events-csv-upload"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { Loader2, Trash2, Search, Edit2, Upload, Plus, AlertTriangle } from "lucide-react"

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

export default function AdminEvents() {
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<Event[]>([])
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)

  const supabase = createClient()

  async function loadEvents() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_code', { ascending: true })

      if (error) throw error
      setEvents(data as unknown as Event[])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEvents()
  }, [])

  const handleEdit = (event: Event) => {
    setEditingEvent(event)
    setIsAddOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const { error } = await supabase.from('events').delete().eq('id', deleteId)
      if (error) throw error
      setEvents(prev => prev.filter(e => e.id !== deleteId))
    } catch (err) {
      alert("Failed to delete")
    } finally {
      setDeleteId(null)
    }
  }

  const handleBulkDelete = async () => {
    try {
      const { error } = await supabase.from('events').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (error) throw error
      setEvents([])
      setIsBulkDeleteOpen(false)
    } catch (err) {
      alert("Failed to delete all events")
    }
  }

  const filteredEvents = events.filter(e => {
    const matchesCategory = filterCategory === "all" || e.category === filterCategory
    const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          e.event_code?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">

      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Events Manager</h2>
          <p className="text-muted-foreground">Manage competition events and regulations.</p>
        </div>
        <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => { setEditingEvent(null); setIsAddOpen(true); }} className="gap-2">
                <Plus className="w-4 h-4" /> New Event
            </Button>
            <Button variant="outline" onClick={() => setIsUploadOpen(true)} className="gap-2">
                <Upload className="w-4 h-4" /> Import CSV
            </Button>
            {events.length > 0 && (
                <Button variant="destructive" onClick={() => setIsBulkDeleteOpen(true)} className="gap-2">
                    <Trash2 className="w-4 h-4" /> Delete All
                </Button>
            )}
        </div>
      </div>

      {/* FILTER BAR */}
      <Card className="bg-muted/10 border-none shadow-none">
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row gap-4 p-1">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or code..."
                className="pl-9 bg-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex gap-2 bg-white p-1 rounded-md border">
                {['all', 'ON STAGE', 'OFF STAGE'].map(cat => (
                <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`px-4 py-1.5 text-sm font-medium rounded-sm transition-all ${
                    filterCategory === cat
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-slate-50'
                    }`}
                >
                    {cat === 'all' ? 'All' : cat}
                </button>
                ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* EVENTS TABLE */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="w-[100px]">Code</TableHead>
                <TableHead>Event Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Section</TableHead>
                <TableHead className="text-center">Grade</TableHead>
                <TableHead className="text-center">Limit</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-32 text-muted-foreground">
                    No events found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredEvents.map((event) => (
                  <TableRow key={event.id} className="group hover:bg-muted/30">
                    <TableCell>
                        <span className="font-mono text-xs font-bold bg-muted/50 px-2 py-1 rounded border border-border">
                            {event.event_code || '---'}
                        </span>
                    </TableCell>
                    <TableCell className="font-medium text-base">
                      {event.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        event.category === 'ON STAGE'
                            ? 'border-orange-500/30 text-orange-600 bg-orange-500/10'
                            : 'border-blue-500/30 text-blue-600 bg-blue-500/10'
                      }>
                        {event.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                        <div className="flex flex-wrap gap-1">
                            {event.applicable_section?.map(sec => (
                                <Badge key={sec} variant="secondary" className="text-[10px] font-normal bg-muted border-border/50 text-muted-foreground">
                                    {sec}
                                </Badge>
                            ))}
                        </div>
                    </TableCell>
                    <TableCell className="text-center">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold border ${
                            event.grade_type === 'A' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                            event.grade_type === 'B' ? 'bg-slate-100 text-slate-700 border-slate-200' :
                            'bg-orange-100 text-orange-700 border-orange-200'
                        }`}>
                            {event.grade_type}
                        </span>
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground font-mono text-sm">
                      {event.max_participants_per_team}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleEdit(event)}>
                            <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(event.id)}>
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
      <EventFormDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        event={editingEvent}
        onSuccess={loadEvents}
      />
      <EventsCsvUpload
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        onSuccess={loadEvents}
      />

      {/* DELETE CONFIRMATION */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Delete Event?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently remove the event and all associated student results/participations.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle className="text-destructive flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Delete All Events?</AlertDialogTitle>
                <AlertDialogDescription>This is extremely destructive. It will wipe all events and scoring data. Are you sure?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive hover:bg-destructive/90">Yes, Delete All</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}