"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase"
import { format } from "date-fns"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import {
  Search,
  Plus,
  Printer,
  Calendar as CalendarIcon,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"

// Components
import { StatsCards } from "@/components/payments/StatsCards"
import { TransactionTable, Transaction } from "@/components/payments/TransactionTable"
import { AddEditTransactionModal } from "@/components/payments/AddEditTransactionModal"

type FilterType = 'ALL' | 'CREDIT' | 'DEBIT'

export default function FinancePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // Filters
  const [filterType, setFilterType] = useState<FilterType>('ALL')
  const [searchQuery, setSearchQuery] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  // Modal & Selection States
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)

  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // --- 1. Fetch Data ---
  const fetchTransactions = async () => {
    try {
      setLoading(true)
      // FIX: Cast query builder to 'any' to bypass strict table typing if not generated yet
      let query = (supabase.from('finance_transactions') as any)
        .select('*')
        .order('transaction_date', { ascending: false })

      if (dateFrom) query = query.gte('transaction_date', new Date(dateFrom).toISOString())
      if (dateTo) query = query.lte('transaction_date', new Date(dateTo).toISOString())

      const { data, error } = await query

      if (error) throw error
      setTransactions(data as Transaction[])
    } catch (error) {
      console.error("Error fetching transactions:", error)
      toast.error("Failed to load transactions")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [dateFrom, dateTo])

  // --- 2. Computed Stats ---
  const processedData = useMemo(() => {
    let filtered = transactions

    if (filterType !== 'ALL') filtered = filtered.filter(t => t.type === filterType)

    if (searchQuery) {
      const lower = searchQuery.toLowerCase()
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(lower) ||
        t.details?.toLowerCase().includes(lower)
      )
    }

    const stats = transactions.reduce((acc, curr) => {
      if (curr.type === 'CREDIT') acc.credit += Number(curr.amount)
      else acc.debit += Number(curr.amount)
      return acc
    }, { credit: 0, debit: 0 })

    return {
      data: filtered,
      stats: { ...stats, balance: stats.credit - stats.debit }
    }
  }, [transactions, filterType, searchQuery])

  // --- 3. Handlers ---
  const handleDeleteConfirm = async () => {
    if (!selectedTx) return
    try {
      const { error } = await (supabase.from('finance_transactions') as any)
        .delete()
        .eq('id', selectedTx.id)

      if (error) throw error

      setTransactions(prev => prev.filter(t => t.id !== selectedTx.id))
      toast.success("Transaction deleted")
      setIsDeleteAlertOpen(false)
    } catch (e) {
      toast.error("Failed to delete")
    }
  }

  const handleFormSubmit = async (formData: any) => {
    if (!formData.name || !formData.amount || !formData.transaction_date) {
      toast.error("Please fill all required fields")
      return
    }

    try {
      setIsSubmitting(true)
      const payload = {
        name: formData.name,
        amount: parseFloat(formData.amount),
        type: formData.type,
        method: formData.method,
        details: formData.details,
        transaction_date: new Date(formData.transaction_date).toISOString()
      }

      if (isEditMode && selectedTx) {
        // FIX: Cast to 'any' for update
        const { error } = await (supabase.from('finance_transactions') as any)
          .update(payload)
          .eq('id', selectedTx.id)
        if (error) throw error
        toast.success("Transaction updated")
      } else {
        // FIX: Cast to 'any' for insert
        const { error } = await (supabase.from('finance_transactions') as any)
          .insert([payload])
        if (error) throw error
        toast.success("Transaction added")
      }

      await fetchTransactions()
      setIsModalOpen(false)
    } catch (error) {
      console.error(error)
      toast.error(isEditMode ? "Update failed" : "Creation failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  // --- 4. PDF Generation ---
  const generatePDF = (mode: 'ALL' | 'CREDIT' | 'DEBIT') => {
    const doc = new jsPDF()
    const pdfData = processedData.data.filter(t => mode === 'ALL' ? true : t.type === mode)

    if (pdfData.length === 0) {
      toast.warning("No data to print")
      return
    }

    doc.setFontSize(20)
    doc.setTextColor(40)
    doc.text("Financial Transaction Report", 14, 20)

    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(`Generated on: ${format(new Date(), "PPP p")}`, 14, 28)
    doc.text(`Category: ${mode}`, 14, 33)

    let totalC = 0, totalD = 0
    pdfData.forEach(t => t.type === 'CREDIT' ? totalC += Number(t.amount) : totalD += Number(t.amount))

    doc.setFontSize(10)
    doc.setTextColor(0)
    const startY = 40
    if (mode === 'ALL' || mode === 'CREDIT') doc.text(`Total Credited: Rs. ${totalC}`, 14, startY)
    if (mode === 'ALL' || mode === 'DEBIT') doc.text(`Total Debited: Rs. ${totalD}`, 80, startY)
    if (mode === 'ALL') doc.text(`Net Balance: Rs. ${totalC - totalD}`, 150, startY)

    autoTable(doc, {
      startY: startY + 10,
      head: [["Date", "Name", "Details", "Method", "Type", "Amount"]],
      body: pdfData.map(t => [
        format(new Date(t.transaction_date), "dd MMM yyyy, hh:mm a"),
        t.name,
        t.details || "-",
        t.method,
        t.type,
        t.amount
      ]),
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40] },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: { 5: { halign: 'right', fontStyle: 'bold' } },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 4) {
             if (data.cell.raw === 'CREDIT') data.cell.styles.textColor = [22, 163, 74]
             if (data.cell.raw === 'DEBIT') data.cell.styles.textColor = [220, 38, 38]
        }
      }
    })

    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150)
        doc.text(`Page ${i} of ${pageCount}`, 196, 285, { align: "right" })
        doc.text("© 2024 Admin Financial System. Confidential.", 14, 285)
    }

    doc.save(`finance_report_${mode.toLowerCase()}_${new Date().toISOString().slice(0,10)}.pdf`)
  }

  // Helper to format initial data for Edit Mode
  const getInitialFormData = () => {
    if (!selectedTx) return undefined
    const d = new Date(selectedTx.transaction_date)
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return {
      name: selectedTx.name,
      amount: String(selectedTx.amount),
      type: selectedTx.type,
      method: selectedTx.method,
      details: selectedTx.details || "",
      transaction_date: d.toISOString().slice(0, 16)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 min-h-screen bg-slate-50/50">

      {/* 1. Stats Row */}
      <StatsCards stats={processedData.stats} />

      {/* 2. Actions & Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end justify-between">
        <div className="flex flex-col md:flex-row gap-4 flex-1">
            <div className="relative w-full md:max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search transactions..."
                    className="pl-9 bg-white"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="flex items-center gap-2 bg-white border rounded-md p-1 px-2 shadow-sm">
                <CalendarIcon className="w-4 h-4 text-slate-500" />
                <input
                    type="date"
                    className="text-sm outline-none bg-transparent w-32"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                />
                <span className="text-slate-400">-</span>
                <input
                    type="date"
                    className="text-sm outline-none bg-transparent w-32"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                />
            </div>
        </div>

        <div className="flex gap-2">
            <Button onClick={() => { setIsEditMode(false); setIsModalOpen(true) }} className="bg-slate-900 hover:bg-slate-800 text-white gap-2">
                <Plus className="w-4 h-4" /> Add Transaction
            </Button>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                        <Printer className="w-4 h-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white">
                    <DropdownMenuItem onClick={() => generatePDF('ALL')}>Print All History</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => generatePDF('CREDIT')}>Print Credited Only</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => generatePDF('DEBIT')}>Print Debited Only</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>

      {/* 3. Main Content */}
      <div className="space-y-4">
        <Tabs defaultValue="ALL" onValueChange={(v) => setFilterType(v as FilterType)}>
            <TabsList className="bg-white border shadow-sm">
                <TabsTrigger value="ALL">All Transactions</TabsTrigger>
                <TabsTrigger value="CREDIT" className="data-[state=active]:text-emerald-600">Credited</TabsTrigger>
                <TabsTrigger value="DEBIT" className="data-[state=active]:text-red-600">Debited</TabsTrigger>
            </TabsList>
        </Tabs>

        <TransactionTable
            data={processedData.data}
            loading={loading}
            onEdit={(tx) => { setSelectedTx(tx); setIsEditMode(true); setIsModalOpen(true); }}
            onDelete={(tx) => { setSelectedTx(tx); setIsDeleteAlertOpen(true); }}
        />
      </div>

      {/* --- MODALS --- */}
      <AddEditTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        isEdit={isEditMode}
        initialData={isEditMode ? getInitialFormData() : undefined}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
      />

      <Dialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <DialogContent className="sm:max-w-[400px] bg-white">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-600">
                    <X className="w-5 h-5" /> Confirm Deletion
                </DialogTitle>
                <DialogDescription className="py-2">
                    Are you sure you want to delete this transaction? This action cannot be undone.
                </DialogDescription>
            </DialogHeader>
            <div className="bg-slate-50 p-3 rounded-md border text-sm mb-2">
                <p><strong>Name:</strong> {selectedTx?.name}</p>
                <p><strong>Amount:</strong> ₹ {selectedTx?.amount}</p>
            </div>
            <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setIsDeleteAlertOpen(false)}>Cancel</Button>
                <Button variant="outline" onClick={handleDeleteConfirm} className="text-red-600">Delete Record</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}