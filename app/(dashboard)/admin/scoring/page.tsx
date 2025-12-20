"use client"

import { useState } from "react"
import { EventScorer } from "@/components/scoring/event-scorer"
import { LiveLeaderboard } from "@/components/scoring/live-leaderboard"
import { IndividualLeaderboard } from "@/components/scoring/individual-leaderboard"
import { GradeSettingsDialog } from "@/components/scoring/grade-settings-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Settings, BarChart3, Edit3 } from "lucide-react"

// UPDATED SECTIONS to include Foundation
const SECTIONS = [
  { id: 'SENIOR_ON', label: 'Senior On-Stage', section: 'Senior', cat: 'ON STAGE' },
  { id: 'SENIOR_OFF', label: 'Senior Off-Stage', section: 'Senior', cat: 'OFF STAGE' },
  { id: 'JUNIOR_ON', label: 'Junior On-Stage', section: 'Junior', cat: 'ON STAGE' },
  { id: 'JUNIOR_OFF', label: 'Junior Off-Stage', section: 'Junior', cat: 'OFF STAGE' },
  { id: 'SUB_ON', label: 'Sub-Jr On-Stage', section: 'Sub-Junior', cat: 'ON STAGE' },
  { id: 'SUB_OFF', label: 'Sub-Jr Off-Stage', section: 'Sub-Junior', cat: 'OFF STAGE' },
  { id: 'GENERAL_ON', label: 'General On-Stage', section: 'General', cat: 'ON STAGE' },
  { id: 'GENERAL_OFF', label: 'General Off-Stage', section: 'General', cat: 'OFF STAGE' },
  // ADDED FOUNDATION
  { id: 'FOUNDATION_ON', label: 'Foundation On-Stage', section: 'Foundation', cat: 'ON STAGE' },
  { id: 'FOUNDATION_OFF', label: 'Foundation Off-Stage', section: 'Foundation', cat: 'OFF STAGE' },
]

export default function ScoringPage() {
  const [activeTab, setActiveTab] = useState(SECTIONS[0].id)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [mobileView, setMobileView] = useState<'SCORING' | 'LEADERBOARD'>('SCORING')

  const handleScoreUpdate = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] animate-in fade-in duration-500 overflow-hidden pb-2 space-y-4">

      {/* Header Section */}
      <div className="shrink-0 flex items-center justify-between">
         <div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold tracking-tight text-foreground">Score Registration</h1>
            <p className="text-muted-foreground text-xs md:text-sm hidden md:block">Record winners and update house points in real-time.</p>
         </div>

         {/* MOBILE VIEW TOGGLE */}
         <div className="flex lg:hidden bg-muted rounded-lg p-1 border border-border">
            <button
                onClick={() => setMobileView('SCORING')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                    mobileView === 'SCORING'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
            >
                <Edit3 className="w-3 h-3"/> Scoring
            </button>
            <button
                onClick={() => setMobileView('LEADERBOARD')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                    mobileView === 'LEADERBOARD'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
            >
                <BarChart3 className="w-3 h-3"/> Standings
            </button>
         </div>

         <Button variant="outline" size="sm" onClick={() => setIsSettingsOpen(true)} className="gap-2 hidden md:flex">
            <Settings className="w-4 h-4" /> Rules
         </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0 relative">

        {/* LEFT PANEL: SCORER */}
        <div className={`flex-1 flex-col min-h-0 glass-card border border-border/50 rounded-xl overflow-hidden shadow-sm ${mobileView === 'LEADERBOARD' ? 'hidden lg:flex' : 'flex'}`}>
           <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
             <div className="shrink-0 border-b border-border/50 bg-muted/30 px-2 pt-2">
                <div className="overflow-x-auto pb-0 scrollbar-none">
                    <TabsList className="h-auto p-0 bg-transparent justify-start gap-2 w-max">
                        {SECTIONS.map(sec => (
                            <TabsTrigger
                                key={sec.id}
                                value={sec.id}
                                className="rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:text-primary data-[state=active]:bg-background/50 px-3 py-2.5 text-xs md:text-sm whitespace-nowrap text-muted-foreground transition-all hover:text-foreground"
                            >
                                {sec.label
                                  .replace('Senior', 'Sen')
                                  .replace('Junior', 'Jun')
                                  .replace('Sub-Jr', 'Sub')
                                  .replace('General', 'Gen')
                                  .replace('Foundation', 'Fnd')}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>
             </div>

             <div className="flex-1 overflow-y-auto p-3 md:p-6 bg-card/30 relative">
                {SECTIONS.map(sec => (
                    <TabsContent key={sec.id} value={sec.id} className="mt-0 h-full data-[state=inactive]:hidden">
                        <EventScorer
                            section={sec.section}
                            category={sec.cat}
                            onScoreSaved={handleScoreUpdate}
                        />
                    </TabsContent>
                ))}
             </div>
           </Tabs>
        </div>

        {/* RIGHT PANEL: LEADERBOARD */}
        <div className={`w-full lg:w-[450px] flex-1 lg:flex-none shrink-0 flex-col min-h-0 glass-card border border-border/50 rounded-xl overflow-hidden shadow-sm ${mobileView === 'SCORING' ? 'hidden lg:flex' : 'flex'}`}>
             <Tabs defaultValue="team" className="flex flex-col h-full">
                <div className="shrink-0 border-b border-border/50 bg-muted/30 px-4 py-2">
                    <TabsList className="w-full bg-background/50 border border-border/50">
                        <TabsTrigger value="team" className="flex-1 text-xs">Team Standings</TabsTrigger>
                        <TabsTrigger value="individual" className="flex-1 text-xs">Top Students</TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex-1 bg-card/30 relative min-h-0">
                    <TabsContent value="team" className="mt-0 h-full p-0 absolute inset-0 overflow-y-auto">
                        <div className="p-2 md:p-4">
                           <LiveLeaderboard refreshTrigger={refreshTrigger} />
                        </div>
                    </TabsContent>
                    <TabsContent value="individual" className="mt-0 h-full p-0 absolute inset-0 overflow-y-auto">
                        <div className="p-2 md:p-4 h-full">
                           <IndividualLeaderboard refreshTrigger={refreshTrigger} />
                        </div>
                    </TabsContent>
                </div>
             </Tabs>
        </div>

      </div>

      {/* Settings Modal */}
      <GradeSettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        onSuccess={handleScoreUpdate}
      />
    </div>
  )
}