import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUpCircle, ArrowDownCircle, Wallet } from "lucide-react"

interface StatsCardsProps {
  stats: {
    credit: number
    debit: number
    balance: number
  }
}

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="border-l-4 border-l-emerald-500 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Credited</CardTitle>
          <ArrowUpCircle className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-800">₹ {stats.credit.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-1">Income & Receivables</p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-red-500 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Debited</CardTitle>
          <ArrowDownCircle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-800">₹ {stats.debit.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-1">Expenses & Payments</p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-blue-500 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Net Balance</CardTitle>
          <Wallet className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${stats.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            ₹ {stats.balance.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Available Funds</p>
        </CardContent>
      </Card>
    </div>
  )
}