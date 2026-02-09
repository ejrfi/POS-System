import { useSales } from "@/hooks/use-transactions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export default function Transactions() {
  const { data: sales, isLoading } = useSales();

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Transaction History</h1>
        <p className="text-muted-foreground mt-1">View all past sales</p>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Cashier</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                  </div>
                </TableCell>
              </TableRow>
            ) : sales?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No transactions yet.
                </TableCell>
              </TableRow>
            ) : (
              sales?.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="font-mono">{sale.invoiceNo}</TableCell>
                  <TableCell>{new Date(sale.transactionDate!).toLocaleString()}</TableCell>
                  <TableCell>{sale.cashier?.username}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{sale.paymentMethod}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(sale.finalAmount)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
