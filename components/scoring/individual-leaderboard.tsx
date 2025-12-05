"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2, User, Medal } from "lucide-react"

export function IndividualLeaderboard({ refreshTrigger }: { refreshTrigger: number }) {
  const [rankings, setRankings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchRankings() {
      setLoading(true)

      // Fetch participations where student is winner
      // Filter out General events in JS or complex query
      const { data } = await supabase
        .from('participations')
        .select(`
          points_earned,
          student_id,
          events ( grade_type, applicable_section ),
          students ( name, chest_no, team:teams(name, color_hex) )
        `)
        .not('student_id', 'is', null)
        .gt('points_earned', 0)

      if (!data) return

      // Group by Student
      const studentMap = new Map<string, any>()

      data.forEach((p: any) => {
        // EXCLUDE GENERAL EVENTS FOR INDIVIDUAL CHAMPIONSHIP
        if (p.events?.applicable_section?.includes('General')) return

        const sid = p.student_id
        if (!studentMap.has(sid)) {
          studentMap.set(sid, {
            id: sid,
            name: p.students.name,
            chest_no: p.students.chest_no,
            team: p.students.team,
            total: 0,
            gradeA: 0,
            gradeB: 0,
            gradeC: 0
          })
        }

        const student = studentMap.get(sid)
        student.total += p.points_earned

        const grade = p.events?.grade_type
        if (grade === 'A') student.gradeA += p.points_earned
        if (grade === 'B') student.gradeB += p.points_earned
        if (grade === 'C') student.gradeC += p.points_earned
      })

      // Convert to array and sort
      const sorted = Array.from(studentMap.values()).sort((a, b) => b.total - a.total)
      setRankings(sorted.slice(0, 10)) // Top 10
      setLoading(false)
    }

    fetchRankings()
  }, [refreshTrigger])

  if (loading) return <Loader2 className="animate-spin text-muted-foreground" />

  return (
    <Card className="glass-card shadow-md border-border/50 h-full flex flex-col">
      <CardHeader className="py-4 border-b border-border/50 bg-muted/20 shrink-0">
        <CardTitle className="text-lg font-heading flex items-center gap-2 text-foreground">
          <User className="w-4 h-4 text-primary" /> Individual Champions
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-auto flex-1 min-h-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40 border-border/50">
              <TableHead className="w-[10%]">#</TableHead>
              <TableHead className="w-[40%]">Student</TableHead>
              <TableHead className="text-center text-xs">A</TableHead>
              <TableHead className="text-center text-xs">B</TableHead>
              <TableHead className="text-center text-xs">C</TableHead>
              <TableHead className="text-right font-bold">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rankings.map((student, idx) => (
              <TableRow key={student.id} className="hover:bg-muted/20 border-border/50">
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {idx < 3 ? <Medal className={`w-4 h-4 ${idx===0?'text-yellow-500':idx===1?'text-slate-400':'text-orange-600'}`} /> : idx + 1}
                </TableCell>
                <TableCell>
                  <div className="font-medium text-sm truncate">{student.name}</div>
                  <div className="flex items-center gap-2 text-[10px] mt-0.5">
                    <span className="font-mono bg-muted/50 px-1 rounded text-muted-foreground">{student.chest_no}</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-0" style={{ backgroundColor: student.team.color_hex + '20', color: student.team.color_hex }}>
                      {student.team.name}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-center text-xs text-muted-foreground">{student.gradeA}</TableCell>
                <TableCell className="text-center text-xs text-muted-foreground">{student.gradeB}</TableCell>
                <TableCell className="text-center text-xs text-muted-foreground">{student.gradeC}</TableCell>
                <TableCell className="text-right font-bold text-primary">{student.total}</TableCell>
              </TableRow>
            ))}
            {rankings.length === 0 && (
                <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">No individual scores yet.</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}