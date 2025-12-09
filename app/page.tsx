"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { Trophy, ArrowRight, Sparkles, Heart } from "lucide-react"

export default function LandingPage() {
  return (
    // h-screen ensures it takes full viewport height without scrolling
    <div className="h-screen w-full flex flex-col bg-background overflow-hidden relative selection:bg-primary/20">

      {/* Background Ambience */}
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/30 blur-[120px] pointer-events-none" />

      {/* Navbar - Fixed height (4rem/64px) */}
      <header className="px-6 h-16 flex items-center justify-between border-b border-border/40 bg-background/50 backdrop-blur-md z-50">
        <div className="flex items-center gap-2 font-heading font-bold text-xl tracking-tight text-foreground">
          {/* Logo with v4 Gradient Syntax */}
          <div className="w-8 h-8 bg-linear-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
            <Trophy className="w-4 h-4" />
          </div>
          <span>ArtsFest <span className="text-primary">2025</span></span>
        </div>

        <div className="flex items-center gap-4">
          <ThemeSwitcher />
          <Link href="/login">
            <Button variant="outline" className="hidden sm:flex border-primary/20 hover:bg-primary/5">Admin Access</Button>
          </Link>
        </div>
      </header>

      {/* Main Content - Takes remaining height */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 relative z-10">

        <div className="space-y-6 max-w-4xl">
          {/* Badge */}
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Sparkles className="w-3 h-3 mr-2" />
            The Ultimate Cultural Experience
          </div>

          {/* Hero Text */}
          <h1 className="font-heading text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter text-foreground animate-in fade-in slide-in-from-bottom-5 duration-700">
            Manage. Compete.<br />
            {/* v4 Gradient Syntax */}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-primary via-purple-500 to-pink-500">
              Conquer the Stage.
            </span>
          </h1>

          <p className="mx-auto max-w-[600px] text-muted-foreground text-lg md:text-xl font-light animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
            Welcome to the official portal for Arts Fest 2025.
            Register participants, track live scores, and lead your house to victory.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8 animate-in fade-in zoom-in duration-700 delay-200">
            <Link href="/login">
              <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all duration-300">
                Captain Login <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>

            <Button variant="ghost" size="lg" className="h-14 px-8 text-lg rounded-full text-muted-foreground hover:text-foreground">
              View Schedule
            </Button>
          </div>
        </div>
      </main>

      {/* Footer - Credits */}
      <footer className="py-6 text-center z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
        <p className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-1.5">
          Made with
          <Heart className="w-4 h-4 text-red-500 fill-red-500 animate-pulse" />
          by
          <a
            href="https://shuhaibcv.vercel.app/" // Replace with your actual portfolio link
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-transparent bg-clip-text bg-linear-to-r from-primary to-purple-600 hover:from-purple-600 hover:to-primary transition-all duration-300 hover:scale-105 hover:underline decoration-primary/30 underline-offset-4"
          >
            Shuhaib
          </a>
        </p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">© 2025 Arts Fest Committee</p>
      </footer>
    </div>
  )
}