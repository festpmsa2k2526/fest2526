"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, User, Medal } from "lucide-react"

// Types
interface StudentScore {
  id: string
  name: string
  chest_no: string | null
  section: string
  team: { name: string; color_hex: string }
  total: number
  gradeA: number
  gradeB: number
  gradeC: number
}

export function IndividualLeaderboard({ refreshTrigger }: { refreshTrigger: number }) {
  const [rankings, setRankings] = useState<Record<string, StudentScore[]>>({
    Senior: [],
    Junior: [],
    "Sub-Junior": []
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchRankings() {
      setLoading(true)

      // Fetch participations where student is winner
      // Added 'section' to students query
      const { data } = await supabase
        .from('participations')
        .select(`
          points_earned,
          student_id,
          events ( grade_type, applicable_section ),
          students ( name, chest_no, section, team:teams(name, color_hex) )
        `)
        .not('student_id', 'is', null)
        .gt('points_earned', 0)

      if (!data) return

      const studentMap = new Map<string, StudentScore>()

      data.forEach((p: any) => {
        // EXCLUDE GENERAL EVENTS
        if (p.events?.applicable_section?.includes('General')) return

        const sid = p.student_id
        if (!studentMap.has(sid)) {
          studentMap.set(sid, {
            id: sid,
            name: p.students.name,
            chest_no: p.students.chest_no,
            section: p.students.section, // Store section
            team: p.students.team,
            total: 0,
            gradeA: 0,
            gradeB: 0,
            gradeC: 0
          })
        }

        const student = studentMap.get(sid)!
        student.total += p.points_earned

        const grade = p.events?.grade_type
        if (grade === 'A') student.gradeA += p.points_earned
        if (grade === 'B') student.gradeB += p.points_earned
        if (grade === 'C') student.gradeC += p.points_earned
      })

      // Separate into sections and Sort
      const allStudents = Array.from(studentMap.values())

      const grouped = {
        Senior: allStudents.filter(s => s.section === 'Senior').sort((a, b) => b.total - a.total).slice(0, 5),
        Junior: allStudents.filter(s => s.section === 'Junior').sort((a, b) => b.total - a.total).slice(0, 5),
        "Sub-Junior": allStudents.filter(s => s.section === 'Sub-Junior').sort((a, b) => b.total - a.total).slice(0, 5),
      }

      setRankings(grouped)
      setLoading(false)
    }

    fetchRankings()
  }, [refreshTrigger])

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>

  return (
    <Card className="glass-card shadow-md border-border/50 h-full flex flex-col">
      <CardHeader className="py-3 border-b border-border/50 bg-muted/20 shrink-0">
        <CardTitle className="text-lg font-heading flex items-center gap-2 text-foreground">
          <User className="w-4 h-4 text-primary" /> Individual Champions
        </CardTitle>
      </CardHeader>

      <Tabs defaultValue="Senior" className="flex-1 flex flex-col min-h-0">
        <div className="shrink-0 border-b border-border/50 bg-background/50">
            <TabsList className="w-full justify-start h-auto p-0 bg-transparent rounded-none">
                {['Senior', 'Junior', 'Sub-Junior'].map(sec => (
                    <TabsTrigger
                        key={sec}
                        value={sec}
                        className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary py-2 text-xs"
                    >
                        {sec}
                    </TabsTrigger>
                ))}
            </TabsList>
        </div>

        <CardContent className="p-0 overflow-auto flex-1 min-h-0">
          {['Senior', 'Junior', 'Sub-Junior'].map(section => (
            <TabsContent key={section} value={section} className="m-0 h-full">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/40 hover:bg-muted/40 border-border/50">
                        <TableHead className="w-[10%] text-xs">#</TableHead>
                        <TableHead className="w-[40%] text-xs">Student</TableHead>
                        <TableHead className="text-center text-[10px] w-8">A</TableHead>
                        <TableHead className="text-center text-[10px] w-8">B</TableHead>
                        <TableHead className="text-center text-[10px] w-8">C</TableHead>
                        <TableHead className="text-right text-xs font-bold">Pts</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rankings[section as keyof typeof rankings]?.map((student, idx) => (
                        <TableRow key={student.id} className="hover:bg-muted/20 border-border/50">
                            <TableCell className="font-mono text-xs text-muted-foreground py-2">
                            {idx < 3 ? <Medal className={`w-3.5 h-3.5 ${idx===0?'text-yellow-500':idx===1?'text-slate-400':'text-orange-600'}`} /> : idx + 1}
                            </TableCell>
                            <TableCell className="py-2">
                            <div className="font-medium text-sm truncate max-w-[100px]">{student.name}</div>
                            <div className="flex items-center gap-1 text-[10px] mt-0.5">
                                <span className="font-mono bg-muted/50 px-1 rounded text-muted-foreground">{student.chest_no}</span>
                                <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-0" style={{ backgroundColor: student.team.color_hex + '20', color: student.team.color_hex }}>
                                {student.team.name.substring(0, 3)}
                                </Badge>
                            </div>
                            </TableCell>
                            <TableCell className="text-center text-xs text-muted-foreground py-2">{student.gradeA}</TableCell>
                            <TableCell className="text-center text-xs text-muted-foreground py-2">{student.gradeB}</TableCell>
                            <TableCell className="text-center text-xs text-muted-foreground py-2">{student.gradeC}</TableCell>
                            <TableCell className="text-right font-bold text-primary py-2">{student.total}</TableCell>
                        </TableRow>
                        ))}
                        {rankings[section as keyof typeof rankings]?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-xs">No individual scores yet for {section}.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TabsContent>
          ))}
        </CardContent>
      </Tabs>
    </Card>
  )
}