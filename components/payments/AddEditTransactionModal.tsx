import { useState, useEffect } from "react"
import { Loader2, IndianRupee } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface TransactionFormData {
  name: string
  amount: string
  type: string
  method: string
  details: string
  transaction_date: string
}

interface AddEditTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  isEdit: boolean
  initialData?: TransactionFormData
  onSubmit: (data: TransactionFormData) => Promise<void>
  isSubmitting: boolean
}

export function AddEditTransactionModal({
  isOpen,
  onClose,
  isEdit,
  initialData,
  onSubmit,
  isSubmitting
}: AddEditTransactionModalProps) {

  const [formData, setFormData] = useState<TransactionFormData>({
    name: "",
    amount: "",
    type: "CREDIT",
    method: "LIQUID",
    details: "",
    transaction_date: ""
  })

  // Reset or set data when modal opens
  useEffect(() => {
    if (isOpen) {
      if (isEdit && initialData) {
        setFormData(initialData)
      } else {
        // Default to current time for new entries
        const now = new Date()
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
        const localDateTime = now.toISOString().slice(0, 16)

        setFormData({
            name: "",
            amount: "",
            type: "CREDIT",
            method: "LIQUID",
            details: "",
            transaction_date: localDateTime
        })
      }
    }
  }, [isOpen, isEdit, initialData])

  const handleSubmit = () => {
    onSubmit(formData)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
         <DialogContent className="sm:max-w-[500px] bg-white">
            <DialogHeader>
                <DialogTitle>{isEdit ? "Edit Transaction" : "Add New Transaction"}</DialogTitle>
                <DialogDescription>
                    {isEdit ? "Modify existing transaction details." : "Enter the details for the new payment record."}
                </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Type</label>
                        <Select
                            value={formData.type}
                            onValueChange={(v) => setFormData({...formData, type: v})}
                        >
                            <SelectTrigger className={formData.type === 'CREDIT' ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                                <SelectItem value="CREDIT" className="text-emerald-600">CREDIT</SelectItem>
                                <SelectItem value="DEBIT" className="text-red-600">DEBIT</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                         <label className="text-sm font-medium">Method</label>
                         <Select
                            value={formData.method}
                            onValueChange={(v) => setFormData({...formData, method: v})}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                                <SelectItem value="LIQUID">Liquid Cash</SelectItem>
                                <SelectItem value="UPI">UPI Payment</SelectItem>
                                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Name / Party</label>
                    <Input
                        placeholder="e.g. Shuhaib, MASA..."
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Amount</label>
                    <div className="relative">
                        <div className="absolute left-3 top-2.5 text-slate-500">
                            <IndianRupee className="w-4 h-4" />
                        </div>
                        <Input
                            type="number"
                            placeholder="0.00"
                            className="pl-9"
                            value={formData.amount}
                            onChange={(e) => setFormData({...formData, amount: e.target.value})}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Date & Time</label>
                    <Input
                        type="datetime-local"
                        value={formData.transaction_date}
                        onChange={(e) => setFormData({...formData, transaction_date: e.target.value})}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Details / Note</label>
                    <Textarea
                        placeholder="Description of the transaction..."
                        className="resize-none h-20"
                        value={formData.details}
                        onChange={(e) => setFormData({...formData, details: e.target.value})}
                    />
                </div>
            </div>

            <DialogFooter>
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-green-600">
                    {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {isEdit ? "Save Changes" : "Create Transaction"}
                </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
  )
}