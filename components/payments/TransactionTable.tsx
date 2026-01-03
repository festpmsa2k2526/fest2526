import { format } from "date-fns"
import { Plus, MoreVertical, Edit2, Trash2, Filter, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

// Define the Transaction interface locally if not exported elsewhere
export interface Transaction {
  id: string
  name: string
  amount: number
  type: 'CREDIT' | 'DEBIT'
  method: 'LIQUID' | 'UPI' | 'BANK_TRANSFER'
  details: string
  transaction_date: string
  created_at: string
}

interface TransactionTableProps {
  data: Transaction[]
  loading: boolean
  onEdit: (tx: Transaction) => void
  onDelete: (tx: Transaction) => void
}

export function TransactionTable({ data, loading, onEdit, onDelete }: TransactionTableProps) {
  return (
    <Card className="shadow-sm border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        {loading ? (
           <div className="h-64 flex items-center justify-center">
               <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
           </div>
        ) : data.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                <Filter className="w-12 h-12 mb-2 opacity-20" />
                <p>No transactions found</p>
            </div>
        ) : (
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b text-slate-500 font-medium">
                    <tr>
                        <th className="px-6 py-4">Name</th>
                        <th className="px-6 py-4">Date & Time</th>
                        <th className="px-6 py-4">Amount</th>
                        <th className="px-6 py-4">Method</th>
                        <th className="px-6 py-4">Details</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {data.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-medium text-slate-900">{tx.name}</td>
                            <td className="px-6 py-4 text-slate-500">
                                <div className="font-medium text-slate-700">
                                    {format(new Date(tx.transaction_date), "d MMMM yyyy")}
                                </div>
                                <div className="text-xs">
                                    At {format(new Date(tx.transaction_date), "h:mm a")}
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className={`flex items-center gap-1 font-bold ${tx.type === 'CREDIT' ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {tx.type === 'CREDIT' ? <Plus className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                                    ₹ {tx.amount.toLocaleString()}
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <Badge variant="outline" className="font-normal bg-white">
                                    {tx.method.replace('_', ' ')}
                                </Badge>
                            </td>
                            <td className="px-6 py-4 text-slate-500 max-w-[200px] truncate" title={tx.details}>
                                {tx.details || "-"}
                            </td>
                            <td className="px-6 py-4">
                                <Badge className={
                                    tx.type === 'CREDIT'
                                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200"
                                    : "bg-red-100 text-red-700 hover:bg-red-200 border-red-200"
                                }>
                                    {tx.type}
                                </Badge>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <MoreVertical className="w-4 h-4 text-slate-400" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="bg-white">
                                        <DropdownMenuItem onClick={() => onEdit(tx)}>
                                            <Edit2 className="w-4 h-4 mr-2" /> Edit Details
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={() => onDelete(tx)}
                                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                        >
                                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        )}
      </div>
    </Card>
  )
}