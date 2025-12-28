"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, User, Calendar, FileDown, Trophy, Medal } from "lucide-react"

interface Props {
    studentId: string | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function StudentReportModal({ studentId, open, onOpenChange }: Props) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!studentId || !open) return
    const currentId: string = studentId

    async function fetchDetails() {
        setLoading(true)

        const { data: student, error: studentError } = await supabase
            .from('students')
            .select('*, teams(name, color_hex)')
            .eq('id', currentId)
            .single()

        if (studentError || !student) {
            setLoading(false)
            return
        }

        const { data: parts, error: partsError } = await supabase
            .from('participations')
            .select(`
                points_earned, result_position, performance_grade, status,
                events ( name, category, grade_type )
            `)
            .eq('student_id', currentId)

        if (partsError) console.error("Error fetching parts:", partsError)

        setData({ student, parts: parts || [] })
        setLoading(false)
    }
    fetchDetails()
  }, [studentId, open])

  const generatePDF = () => {
     if(!data) return
     const doc = new jsPDF()

     doc.setFontSize(18)
     doc.text(`Student Report: ${data.student.name}`, 14, 20)

     doc.setFontSize(10)
     doc.text(`Chest No: ${data.student.chest_no || 'N/A'}`, 14, 28)
     doc.text(`Team: ${data.student.teams.name} | Section: ${data.student.section}`, 14, 33)

     const total = data.parts.reduce((s:number, p:any) => s + (p.points_earned || 0), 0)
     doc.text(`Total Score: ${total}`, 14, 40)

     const body = data.parts.map((p:any) => [
         p.events.name,
         p.events.category,
         p.status === 'winner' ? 'Completed' : 'Registered',
         p.result_position || '-',
         p.performance_grade || '-',
         p.points_earned || '0'
     ])

     autoTable(doc, {
         startY: 45,
         head: [['Event', 'Category', 'Status', 'Pos', 'Grade', 'Pts']],
         body: body,
         theme: 'grid',
         headStyles: { fillColor: [63, 81, 181] }
     })

     doc.save(`${data.student.name}_report.pdf`)
  }

  if (!studentId) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[800px] h-[85vh] flex flex-col p-0 overflow-hidden bg-white">

        {/* Header Section */}
        <DialogHeader className="p-6 pb-4 border-b bg-slate-50/80 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-100 text-indigo-600 shrink-0">
                        <User className="w-6 h-6" />
                    </div>
                    <div>
                        <DialogTitle className="text-xl font-bold text-slate-800">
                            {loading ? "Loading..." : data?.student.name}
                        </DialogTitle>
                        {/* FIX: Changed div to span to avoid hydration error since DialogDescription is a p tag */}
                        <DialogDescription className="flex flex-wrap items-center gap-2 mt-1.5">
                            {!loading && data && (
                                <>
                                    <Badge variant="outline" className="font-mono text-xs bg-white text-slate-700 border-slate-300">
                                        {data.student.chest_no || 'N/A'}
                                    </Badge>
                                    <span className="text-slate-300">|</span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: data.student.teams.color_hex }}></span>
                                        <span className="font-semibold text-sm text-slate-700">{data.student.teams.name}</span>
                                    </span>
                                    <span className="text-slate-300">|</span>
                                    <span className="text-slate-600 text-sm">{data.student.section}</span>
                                </>
                            )}
                        </DialogDescription>
                    </div>
                </div>

                {!loading && data && (
                    <div className="flex items-center gap-4 bg-white p-2 rounded-lg border shadow-sm">
                        <div className="text-right px-2">
                            <div className="text-2xl font-black text-indigo-600 leading-none">
                                {data.parts.reduce((acc: number, curr: any) => acc + (curr.points_earned || 0), 0)}
                            </div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Pts</div>
                        </div>
                        <Button onClick={generatePDF} size="sm" className="h-9 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                            <FileDown className="w-4 h-4 mr-2" /> PDF
                        </Button>
                    </div>
                )}
            </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 sm:p-6">
            {loading ? (
                <div className="h-full flex flex-col items-center justify-center gap-2">
                    <Loader2 className="animate-spin text-indigo-600 w-8 h-8" />
                    <p className="text-sm text-slate-400">Fetching student records...</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-amber-500" />
                            <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                                Participation History
                            </h4>
                            <Badge className="bg-slate-200 text-slate-600 hover:bg-slate-200 ml-2">
                                {data?.parts.length} Events
                            </Badge>
                        </div>
                    </div>

                    {data?.parts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-60 bg-white rounded-xl border border-dashed border-slate-200 text-slate-400">
                            <Calendar className="w-12 h-12 mb-3 opacity-20" />
                            <p>No events registered for this student.</p>
                        </div>
                    ) : (
                        <div className="border rounded-xl bg-white shadow-sm w-full">
                            {/* Horizontal Scroll Wrapper - Explicitly defined with overflow-x-auto */}
                            <div className="w-full overflow-x-auto pb-2">
                                <table className="w-full min-w-[800px] text-sm text-left">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr>
                                            <th className="py-3 px-4 font-bold text-slate-600 w-[30%] whitespace-nowrap">Event Name</th>
                                            <th className="py-3 px-4 font-bold text-slate-600 whitespace-nowrap">Category</th>
                                            <th className="py-3 px-4 font-bold text-slate-600 text-center whitespace-nowrap">Status</th>
                                            <th className="py-3 px-4 font-bold text-slate-600 text-center whitespace-nowrap">Position</th>
                                            <th className="py-3 px-4 font-bold text-slate-600 text-center whitespace-nowrap">Grade</th>
                                            <th className="py-3 px-4 font-bold text-slate-600 text-right pr-6 whitespace-nowrap">Score</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {data.parts.map((p: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                <td className="py-3 px-4 font-medium text-slate-700">
                                                    {p.events.name}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
                                                        {p.events.category}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    {p.status === 'winner' ? (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 whitespace-nowrap">
                                                            <Medal className="w-3 h-3 mr-1" />
                                                            Completed
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 whitespace-nowrap">
                                                            Registered
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    {p.result_position ? (
                                                        <span className="font-bold text-slate-800">{p.result_position}</span>
                                                    ) : (
                                                        <span className="text-slate-300">-</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-center font-mono text-slate-600">
                                                    {p.performance_grade || '-'}
                                                </td>
                                                <td className="py-3 px-4 text-right pr-6">
                                                    {p.points_earned > 0 ? (
                                                        <span className="font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded text-xs whitespace-nowrap">
                                                            {p.points_earned} pts
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300 font-medium">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  )
}