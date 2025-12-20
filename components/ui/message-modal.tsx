"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle2, Info } from "lucide-react"

interface MessageModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  type?: 'error' | 'success' | 'info'
}

export function MessageModal({ open, onOpenChange, title, description, type = 'info' }: MessageModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-white border-slate-200">
        <DialogHeader className="flex flex-col items-center justify-center text-center space-y-3">
          <div className={`p-3 rounded-full ${
            type === 'error' ? 'bg-red-100 text-red-600' :
            type === 'success' ? 'bg-emerald-100 text-emerald-600' :
            'bg-blue-100 text-blue-600'
          }`}>
            {type === 'error' ? <AlertCircle className="w-6 h-6" /> :
             type === 'success' ? <CheckCircle2 className="w-6 h-6" /> :
             <Info className="w-6 h-6" />}
          </div>
          <div className="space-y-1">
            <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
            <DialogDescription className="text-slate-500">
              {description}
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogFooter className="sm:justify-center">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} className="w-full sm:w-24">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}