"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { useState } from "react"
import {
  LayoutDashboard,
  Users,
  Music,
  Trophy,
  IdCardLanyard,
  Replace,
  LogOut,
  Files,
  ScrollText,
  Menu,
  IndianRupee,
  Palette
} from "lucide-react"

interface SidebarProps {
  role: "admin" | "captain"
}

// Internal component to reuse the nav logic
function NavContent({ role, setOpen }: { role: string, setOpen?: (open: boolean) => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const links = role === "admin" ? [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/teams", label: "Manage Teams", icon: Trophy },
    { href: "/admin/students", label: "Students", icon: Users },
    { href: "/admin/events", label: "Events", icon: Music },
    { href: "/admin/scoring", label: "Scoring", icon: Trophy },
    { href: "/admin/replacement", label: "Replacement", icon: Replace },
    { href: "/admin/reports", label: "Reports", icon: ScrollText },
    { href: "/admin/payment", label: "Financial", icon: IndianRupee },
    { href: "/admin/assets", label: "Assets Manage", icon: Files },
  ] : [
    { href: "/captain", label: "Dashboard", icon: LayoutDashboard },
    { href: "/captain/events", label: "Register Events", icon: Music },
    { href: "/captain/participations", label: "Admit Card", icon: IdCardLanyard },
    { href: "/captain/status", label: "Reports", icon:  ScrollText},
  ]

  return (
    <div className="flex flex-col h-full bg-card/95 backdrop-blur-sm">
      <div className="h-16 flex items-center px-6 border-b border-border/50">
        <div className="flex items-center gap-2 font-heading font-bold text-xl tracking-tight text-foreground">
          <Palette className="w-5 h-5 text-primary" />
          <span>Arts Fest</span>
        </div>
      </div>

      <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon
          const isActive = pathname === link.href || pathname?.startsWith(link.href + "/")

          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen?.(false)}
            >
              <div className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}>
                {/* Active Indicator Bar */}
                {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
                )}

                <Icon className={cn(
                    "w-5 h-5 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )} />
                {link.label}
              </div>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-border/50 mt-auto bg-muted/20">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
          <span className="font-medium">Sign Out</span>
        </Button>
      </div>
    </div>
  )
}

// 1. Desktop Sidebar
export function Sidebar({ role }: SidebarProps) {
  return (
    <aside className="w-72 border-r border-border/60 bg-card hidden md:flex flex-col h-full shadow-xl shadow-black/5 z-30">
      <NavContent role={role} />
    </aside>
  )
}

// 2. Mobile Sidebar
export function MobileSidebar({ role }: SidebarProps) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden -ml-2 text-muted-foreground hover:text-primary">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-72 border-r-border/60">
        <div className="sr-only">
          <SheetTitle>Navigation Menu</SheetTitle>
          <SheetDescription>Main navigation for the application</SheetDescription>
        </div>
        <NavContent role={role} setOpen={setOpen} />
      </SheetContent>
    </Sheet>
  )
}