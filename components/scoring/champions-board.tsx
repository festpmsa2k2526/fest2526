"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Crown, Star, Loader2, Sparkles, Trophy } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface Winner {
  name: string
  team: string
  total: number
  section: string
  type: 'KALA' | 'SARGGA'
}

export function ChampionsBoard({ refreshTrigger }: { refreshTrigger: number }) {
  const [champions, setChampions] = useState<Winner[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function calculateChampions() {
      setLoading(true)
      const { data } = await supabase.from('participations')
        .select(`
          points_earned, student_id, result_position, performance_grade,
          events ( category, grade_type, applicable_section ),
          students ( id, name, section, team:teams(name) )
        `)
        .not('student_id', 'is', null)
        .gt('points_earned', 0)

      if (!data) { setLoading(false); return }

      const students: Record<string, any> = {}

      data.forEach((p: any) => {
         if (p.events?.applicable_section?.includes('General')) return

         const sid = p.student_id
         if (!students[sid]) {
             students[sid] = {
                 id: sid,
                 name: p.students.name,
                 team: p.students.team.name,
                 section: p.students.section,
                 total: 0,
                 has_on_stage_A_win: false,
                 has_off_stage_A_win: false,
                 a_grade_count: 0
             }
         }

         const s = students[sid]
         s.total += p.points_earned

         if (p.events.grade_type === 'A' && p.result_position === 'FIRST' && p.performance_grade === 'A') {
             s.a_grade_count++
             if (p.events.category === 'ON STAGE') s.has_on_stage_A_win = true
             if (p.events.category === 'OFF STAGE') s.has_off_stage_A_win = true
         }
      })

      const results: Winner[] = []
      const sections = ['Senior', 'Junior', 'Sub-Junior']

      sections.forEach(sectionName => {
          const sectionStudents = Object.values(students).filter((s:any) => s.section === sectionName)

          // Kala Prathibha
          let kalaCandidates = sectionStudents.filter((s:any) => s.has_on_stage_A_win && s.has_off_stage_A_win)
          let kalaWinner: any = null

          if (kalaCandidates.length > 0) {
              kalaCandidates.sort((a:any, b:any) => {
                  if (b.total !== a.total) return b.total - a.total
                  return b.a_grade_count - a.a_grade_count
              })
              kalaWinner = kalaCandidates[0]
              results.push({
                  name: kalaWinner.name,
                  team: kalaWinner.team,
                  total: kalaWinner.total,
                  section: sectionName,
                  type: 'KALA'
              })
          }

          // Sargga Prathibha
          const sarggaCandidates = sectionStudents.filter((s:any) => s.id !== kalaWinner?.id)
          sarggaCandidates.sort((a:any, b:any) => b.total - a.total)

          if (sarggaCandidates.length > 0) {
              const sarggaWinner = sarggaCandidates[0]
               results.push({
                   name: sarggaWinner.name,
                   team: sarggaWinner.team,
                   total: sarggaWinner.total,
                   section: sectionName,
                   type: 'SARGGA'
               })
          }
      })

      setChampions(results)
      setLoading(false)
    }

    calculateChampions()
  }, [refreshTrigger])

  if (loading) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 mb-2">
        {['Senior', 'Junior', 'Sub-Junior'].map(section => {
            const kala = champions.find(c => c.section === section && c.type === 'KALA')
            const sargga = champions.find(c => c.section === section && c.type === 'SARGGA')

            return (
                <div key={section} className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950 text-white shadow-xl">
                    {/* Header */}
                    <div className="flex items-center justify-between px-3 py-2 bg-white/5 border-b border-white/10">
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{section} Championship</span>
                        {(kala || sargga) && <Trophy className="w-3 h-3 text-yellow-500" />}
                    </div>

                    <div className="grid grid-cols-2 divide-x divide-white/10">
                        {/* KALA */}
                        <div className="p-3 relative group">
                            <div className="absolute inset-0 bg-linear-to-br from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="flex flex-col h-full relative z-10">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <Crown className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400/20" />
                                    <span className="text-[9px] font-bold text-yellow-500 uppercase tracking-wider">Kala Prathibha</span>
                                </div>
                                <div className="mt-auto">
                                    <div className="font-bold text-sm leading-tight truncate" title={kala?.name}>{kala ? kala.name : '-'}</div>
                                    <div className="text-[10px] text-slate-400 flex justify-between items-center mt-1">
                                        <span className="truncate max-w-[60px]">{kala?.team}</span>
                                        {kala && <Badge variant="secondary" className="h-4 px-1 text-[9px] bg-yellow-500/20 text-yellow-200 border-0">{kala.total} pts</Badge>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SARGGA */}
                        <div className="p-3 relative group">
                            <div className="absolute inset-0 bg-linear-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                             <div className="flex flex-col h-full relative z-10">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <Star className="w-3.5 h-3.5 text-blue-400 fill-blue-400/20" />
                                    <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider">Sargga Prathibha</span>
                                </div>
                                <div className="mt-auto">
                                    <div className="font-bold text-sm leading-tight truncate" title={sargga?.name}>{sargga ? sargga.name : '-'}</div>
                                    <div className="text-[10px] text-slate-400 flex justify-between items-center mt-1">
                                        <span className="truncate max-w-[60px]">{sargga?.team}</span>
                                        {sargga && <Badge variant="secondary" className="h-4 px-1 text-[9px] bg-blue-500/20 text-blue-200 border-0">{sargga.total} pts</Badge>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )
        })}
    </div>
  )
}