"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, RefreshCw, Trophy } from "lucide-react"

export function LiveLeaderboard({ refreshTrigger }: { refreshTrigger: number }) {
  const [scores, setScores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function calculateScores() {
      setLoading(true)

      // 1. Fetch all participations with points > 0
      const { data: parts } = await supabase
        .from('participations')
        .select(`
          points_earned,
          teams ( id, name, color_hex ),
          events ( category, applicable_section ),
          students ( section )
        `)
        .gt('points_earned', 0)

      // 2. Fetch all teams to ensure zero-point teams show up
      const { data: teams } = await supabase.from('teams').select('*')

      if (!parts || !teams) return

      // 3. Aggregate
      const leaderboard = teams.map((team: any) => {
        const teamParts = parts.filter((p: any) => p.teams?.id === team.id)

        // Calculate Total
        const total = teamParts.reduce((sum: number, p: any) => sum + (p.points_earned || 0), 0)

        // Helper to check sections safely
        const checkSection = (p: any, section: string) => {
            const appSection = p.events?.applicable_section
            return Array.isArray(appSection) && appSection.includes(section)
        }

        const isGeneral = (p: any) => checkSection(p, 'General')
        const isFoundation = (p: any) => checkSection(p, 'Foundation')
        const isSenior = (p: any) => checkSection(p, 'Senior')
        const isJunior = (p: any) => checkSection(p, 'Junior')
        const isSubJunior = (p: any) => checkSection(p, 'Sub-Junior')

        // Aggregation Logic
        const general = teamParts
            .filter((p: any) => isGeneral(p))
            .reduce((s:number, p:any) => s + (p.points_earned || 0), 0)

        const foundation = teamParts
            .filter((p: any) => isFoundation(p))
            .reduce((s:number, p:any) => s + (p.points_earned || 0), 0)

        // For standard sections, exclude General/Foundation to prevent double counting if overlap exists
        // (Though usually they are mutually exclusive in DB)
        const senior = teamParts
            .filter((p: any) => isSenior(p) && !isGeneral(p))
            .reduce((s:number, p:any) => s + (p.points_earned || 0), 0)

        const junior = teamParts
            .filter((p: any) => isJunior(p) && !isGeneral(p))
            .reduce((s:number, p:any) => s + (p.points_earned || 0), 0)

        const subJunior = teamParts
            .filter((p: any) => isSubJunior(p) && !isGeneral(p) && !isFoundation(p))
            .reduce((s:number, p:any) => s + (p.points_earned || 0), 0)

        return {
          id: team.id,
          name: team.name,
          color: team.color_hex,
          total,
          senior,
          junior,
          subJunior,
          general,
          foundation
        }
      })

      // Sort by Total Descending
      leaderboard.sort((a: any, b: any) => b.total - a.total)
      setScores(leaderboard)
      setLoading(false)
    }

    calculateScores()
  }, [refreshTrigger]) // Re-run when trigger changes

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>

  return (
    <Card className="glass-card shadow-md border-border/50 h-full flex flex-col">
      <CardHeader className="py-4 border-b border-border/50 bg-muted/20 shrink-0">
        <CardTitle className="text-lg font-heading flex items-center gap-2 text-foreground">
          <Trophy className="w-4 h-4 text-primary" /> Live Standings
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-auto flex-1 min-h-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40 border-border/50">
              <TableHead className="w-[30%] text-foreground font-semibold pl-4">Team</TableHead>
              <TableHead className="text-center font-bold text-primary">Total</TableHead>
              {/* Responsive Columns */}
              <TableHead className="text-center text-[10px] text-muted-foreground hidden xl:table-cell">Sen</TableHead>
              <TableHead className="text-center text-[10px] text-muted-foreground hidden xl:table-cell">Jun</TableHead>
              <TableHead className="text-center text-[10px] text-muted-foreground hidden xl:table-cell">Sub</TableHead>
              <TableHead className="text-center text-[10px] text-muted-foreground hidden xl:table-cell">Gen</TableHead>
              <TableHead className="text-center text-[10px] text-muted-foreground hidden xl:table-cell">Fnd</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scores.map((team, idx) => (
              <TableRow key={team.id} className="hover:bg-muted/20 border-border/50 transition-colors">
                <TableCell className="pl-4">
                    <div className="flex items-center gap-2">
                        <div className="font-mono text-xs text-muted-foreground w-3">{idx + 1}</div>
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: team.color }}></div>
                            <span className="truncate text-sm font-medium text-foreground">{team.name}</span>
                        </div>
                    </div>
                </TableCell>
                <TableCell className="text-center">
                    <span className="font-bold text-lg text-primary">{team.total}</span>
                </TableCell>
                <TableCell className="text-center text-muted-foreground text-xs hidden xl:table-cell">{team.senior}</TableCell>
                <TableCell className="text-center text-muted-foreground text-xs hidden xl:table-cell">{team.junior}</TableCell>
                <TableCell className="text-center text-muted-foreground text-xs hidden xl:table-cell">{team.subJunior}</TableCell>
                <TableCell className="text-center text-muted-foreground text-xs hidden xl:table-cell font-medium bg-muted/30">
                    {team.general}
                </TableCell>
                <TableCell className="text-center text-muted-foreground text-xs hidden xl:table-cell">
                    {team.foundation}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}