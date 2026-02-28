import { useMemo, useState } from "react";
import { useCreateReturn, useDeleteSale, useSale, useSales } from "@/hooks/use-transactions";
import { useAuth } from "@/hooks/use-auth";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DateRange } from "react-day-picker";
import { format, subDays } from "date-fns";
import { Calendar as CalendarIcon, Eye, Loader2, Receipt, Search, RotateCcw, Ban, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageShell } from "@/components/layout/PageShell";

function getStatusLabel(status: string) {
  if (status === "COMPLETED") return "Selesai";
  if (status === "REFUNDED") return "Dikembalikan";
  if (status === "PARTIAL_REFUND") return "Sebagian dikembalikan";
  if (status === "CANCELLED") return "Dibatalkan";
  return status;
}

function StatusBadge({ status }: { status: string }) {
  const label = getStatusLabel(status);
  const variant =
    status === "COMPLETED"
      ? "success"
      : status === "REFUNDED"
        ? "destructive"
        : status === "PARTIAL_REFUND"
          ? "warning"
          : "secondary";
  return (
    <Badge variant={variant as any} className="font-normal">
      {label}
    </Badge>
  );
}

function printReceiptFromSale(sale: any) {
  const items = (sale.items ?? []).map((i: any) => ({
    name: i.product?.name ?? "-",
    quantity: Number(i.conversionQty ?? 0) > 0 ? Number(i.conversionQty) : Number(i.quantity ?? 0),
    unitType: Number(i.conversionQty ?? 0) > 0 ? "PCS" : String(i.unitType ?? "PCS"),
    unitPrice: Number(i.priceAtSale ?? 0),
    lineTotal: Number(i.subtotal ?? 0),
  }));

  const win = window.open("", "print", "height=600,width=420");
  if (!win) return;

  const lines = items
    .map((i: any) => {
      const qty = `${i.quantity} ${i.unitType}`;
      const name = String(i.name).replace(/</g, "&lt;").replace(/>/g, "&gt;");
      return `<tr><td style="padding:2px 0">${name}<div style="font-size:11px;color:#555">${qty} × ${formatCurrency(i.unitPrice)}</div></td><td style="padding:2px 0;text-align:right;white-space:nowrap">${formatCurrency(i.lineTotal)}</td></tr>`;
    })
    .join("");

  const invoice = sale.invoiceNo ? String(sale.invoiceNo).replace(/</g, "&lt;").replace(/>/g, "&gt;") : "-";
  const cashier = String(sale.cashier?.fullName || sale.cashier?.username || "-").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const customerName = sale.customer?.name ? String(sale.customer.name).replace(/</g, "&lt;").replace(/>/g, "&gt;") : "-";

  win.document.open();
  win.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Struk</title>
<style>
  body{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;margin:0;padding:12px;color:#111}
  .center{text-align:center}
  .muted{color:#555;font-size:11px}
  table{width:100%;border-collapse:collapse}
  .rule{border-top:1px dashed #999;margin:10px 0}
  .totals td{padding:2px 0}
  @media print { body{padding:0} }
</style>
</head>
<body>
  <div class="center" style="font-weight:700;font-size:16px">POS</div>
  <div class="center muted">No. invoice: ${invoice}</div>
  <div class="center muted">${new Date(sale.transactionDate).toLocaleString()}</div>
  <div class="rule"></div>
  <div class="muted">Kasir: ${cashier}</div>
  <div class="muted">Pelanggan: ${customerName}</div>
  <div class="rule"></div>
  <table>${lines}</table>
  <div class="rule"></div>
  <table class="totals">
    <tr><td>Subtotal</td><td style="text-align:right">${formatCurrency(Number(sale.subtotal ?? 0))}</td></tr>
    <tr><td>Diskon</td><td style="text-align:right">-${formatCurrency(Number(sale.discountAmount ?? 0))}</td></tr>
    <tr><td>Tukar poin</td><td style="text-align:right">-${formatCurrency(Number(sale.redeemedAmount ?? 0))}</td></tr>
    <tr><td style="font-weight:700">Total</td><td style="text-align:right;font-weight:700">${formatCurrency(Number(sale.finalAmount ?? 0))}</td></tr>
    <tr><td>Metode</td><td style="text-align:right">${String(sale.paymentMethod ?? "").toUpperCase()}</td></tr>
  </table>
  <div class="rule"></div>
  <div class="center muted">Terima kasih</div>
</body>
</html>`);
  win.document.close();
  win.focus();
  win.print();
  win.close();
}

export default function Transactions() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [customerId, setCustomerId] = useState("");
  const [cashierId, setCashierId] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [paymentMethod, setPaymentMethod] = useState<string>("all");
  const [tier, setTier] = useState<string>("all");
  const [usedPoints, setUsedPoints] = useState<string>("all");
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const filters = useMemo(() => {
    const parsedCustomerId = customerId.trim() ? Number(customerId.trim()) : undefined;
    const parsedCashierId = cashierId.trim() ? Number(cashierId.trim()) : undefined;
    return {
      page,
      pageSize,
      search: debouncedSearch.trim() ? debouncedSearch.trim() : undefined,
      customerId: parsedCustomerId && Number.isFinite(parsedCustomerId) ? parsedCustomerId : undefined,
      cashierId: user?.role !== "cashier" && parsedCashierId && Number.isFinite(parsedCashierId) ? parsedCashierId : undefined,
      status: status !== "all" ? status : undefined,
      paymentMethod: paymentMethod !== "all" ? paymentMethod : undefined,
      tier: tier !== "all" ? tier : undefined,
      usedPoints: usedPoints === "all" ? undefined : usedPoints === "yes",
      startDate: date?.from?.toISOString(),
      endDate: date?.to?.toISOString(),
    };
  }, [page, pageSize, debouncedSearch, customerId, cashierId, user?.role, status, paymentMethod, tier, usedPoints, date]);

  const { data, isLoading, isFetching } = useSales(filters);
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const { data: saleDetail, isLoading: isLoadingDetail } = useSale(selectedSaleId);

  const { mutate: voidSale, isPending: isVoiding } = useDeleteSale();
  const createReturn = useCreateReturn();

  const openDetail = (id: number) => {
    setSelectedSaleId(id);
    setDetailOpen(true);
  };

  const onVoid = (id: number) => {
    voidSale(id, {
      onSuccess: () => {
        toast({ title: "Transaksi di-void", description: "Status transaksi diperbarui tanpa hard delete." });
        setDetailOpen(false);
      },
      onError: (e: any) => {
        toast({ variant: "destructive", title: "Gagal void", description: e?.message || "Tidak bisa memproses void." });
      },
    });
  };

  return (
    <PageShell
      title="Transaksi"
      description="Riwayat transaksi POS lengkap dengan filter, retur, dan audit."
      headerRight={
        <div className="text-sm text-muted-foreground">
          {isFetching && !isLoading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Memuat
            </span>
          ) : null}
        </div>
      }
    >
      <div className="flex flex-col gap-2">

        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-base">Pencarian & Filter</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-col lg:flex-row gap-3 lg:items-start lg:justify-between">
              <div className="flex flex-1 flex-col sm:flex-row flex-wrap gap-2 min-w-0">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Cari invoice / nama / HP / ID member" className="pl-8 w-full" />
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-2 w-full sm:w-auto max-w-full">
                      <CalendarIcon className="h-4 w-4" />
                      {date?.from ? (
                        date.to ? `${format(date.from, "dd LLL y")} - ${format(date.to, "dd LLL y")}` : format(date.from, "dd LLL y")
                      ) : (
                        "Rentang tanggal"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={date?.from}
                      selected={date}
                      onSelect={(v) => { setDate(v); setPage(1); }}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex flex-1 flex-col sm:flex-row flex-wrap gap-2 min-w-0">
                <Input
                  value={customerId}
                  onChange={(e) => { setCustomerId(e.target.value); setPage(1); }}
                  placeholder="ID member"
                  inputMode="numeric"
                  className="w-full sm:w-[140px]"
                />

                {user?.role !== "cashier" ? (
                  <Input
                    value={cashierId}
                    onChange={(e) => { setCashierId(e.target.value); setPage(1); }}
                    placeholder="Kasir ID"
                    inputMode="numeric"
                    className="w-full sm:w-[140px]"
                  />
                ) : null}

                <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                  <SelectTrigger className="w-full sm:w-[170px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua status</SelectItem>
                    <SelectItem value="COMPLETED">Selesai</SelectItem>
                    <SelectItem value="PARTIAL_REFUND">Sebagian dikembalikan</SelectItem>
                    <SelectItem value="REFUNDED">Dikembalikan</SelectItem>
                    <SelectItem value="CANCELLED">Dibatalkan</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={paymentMethod} onValueChange={(v) => { setPaymentMethod(v); setPage(1); }}>
                  <SelectTrigger className="w-full sm:w-[170px]">
                    <SelectValue placeholder="Metode bayar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua metode</SelectItem>
                    <SelectItem value="cash">Tunai</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="ewallet">E-wallet</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={tier} onValueChange={(v) => { setTier(v); setPage(1); }}>
                  <SelectTrigger className="w-full sm:w-[170px]">
                    <SelectValue placeholder="Tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua tier</SelectItem>
                    <SelectItem value="REGULAR">REGULAR</SelectItem>
                    <SelectItem value="SILVER">SILVER</SelectItem>
                    <SelectItem value="GOLD">GOLD</SelectItem>
                    <SelectItem value="PLATINUM">PLATINUM</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={usedPoints} onValueChange={(v) => { setUsedPoints(v); setPage(1); }}>
                  <SelectTrigger className="w-full sm:w-[170px]">
                    <SelectValue placeholder="Pakai poin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    <SelectItem value="yes">Pakai poin</SelectItem>
                    <SelectItem value="no">Tanpa poin</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                  <SelectTrigger className="w-full sm:w-[120px]">
                    <SelectValue placeholder="Rows" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>No. invoice</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Pelanggan</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="text-right">Jumlah item</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="text-right">Diskon</TableHead>
                <TableHead className="text-right">Poin dipakai</TableHead>
                <TableHead className="text-right">Poin didapat</TableHead>
                <TableHead className="text-right">Total akhir</TableHead>
                <TableHead>Pembayaran</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Kasir</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={14}>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={14} className="h-24 text-center text-muted-foreground">
                    Tidak ada transaksi untuk filter ini.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((sale: any) => (
                  <TableRow key={sale.id} className="hover:bg-muted/50">
                    <TableCell className="font-mono font-medium">{sale.invoiceNo}</TableCell>
                    <TableCell>{sale.transactionDate ? new Date(sale.transactionDate).toLocaleString() : "-"}</TableCell>
                    <TableCell>{sale.customer?.name || "-"}</TableCell>
                    <TableCell className="font-mono">{sale.customer?.tierLevel || "-"}</TableCell>
                    <TableCell className="text-right">{Number(sale.totalItems ?? 0)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(sale.subtotal ?? 0))}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(sale.discountAmount ?? 0))}</TableCell>
                    <TableCell className="text-right">{Number(sale.redeemedPoints ?? 0)}</TableCell>
                    <TableCell className="text-right">{Number(sale.pointsEarned ?? 0)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(Number(sale.finalAmount ?? 0))}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize bg-slate-50">{String(sale.paymentMethod ?? "")}</Badge>
                    </TableCell>
                    <TableCell><StatusBadge status={String(sale.status ?? "")} /></TableCell>
                    <TableCell>{sale.cashier?.fullName || sale.cashier?.username || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDetail(sale.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t text-sm">
          <div className="text-muted-foreground">
            Total: <span className="font-medium text-foreground">{total}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
              Prev
            </Button>
            <div className="min-w-[110px] text-center">
              Page <span className="font-medium">{page}</span> / <span className="font-medium">{totalPages}</span>
            </div>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
              Next
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                <span>Detail Transaksi</span>
              </div>
              {saleDetail?.status ? <StatusBadge status={String(saleDetail.status)} /> : null}
            </DialogTitle>
          </DialogHeader>

          {isLoadingDetail || !saleDetail ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Top Summary Card */}
              <div className="bg-slate-50 p-4 rounded-lg border flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-6 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Invoice</p>
                    <p className="font-mono font-bold text-lg">{saleDetail.invoiceNo}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {saleDetail.transactionDate ? new Date(saleDetail.transactionDate).toLocaleString() : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Pelanggan</p>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                        {(saleDetail.customer?.name || "T").charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{saleDetail.customer?.name || "Tamu"}</p>
                        <p className="text-xs text-muted-foreground">{saleDetail.customer?.phone || "-"}</p>
                      </div>
                    </div>
                  </div>
                  <div>
                     <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Kasir</p>
                     <p className="font-medium">{saleDetail.cashier?.fullName || saleDetail.cashier?.username || "-"}</p>
                     <Badge variant="outline" className="mt-1 text-[10px] uppercase bg-white">
                       {String(saleDetail.paymentMethod ?? "")}
                     </Badge>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 justify-end items-center border-t lg:border-t-0 pt-3 lg:pt-0">
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => printReceiptFromSale(saleDetail)}>
                    <Printer className="h-4 w-4" />
                    Struk
                  </Button>

                  <RefundDialog
                    disabled={String(saleDetail.status) === "CANCELLED" || String(saleDetail.status) === "REFUNDED"}
                    sale={saleDetail}
                    onRefund={async (payload) => {
                      try {
                        await createReturn.mutateAsync(payload);
                        toast({ title: "Retur berhasil", description: "Pengembalian diproses dan poin/stok diperbarui." });
                      } catch (e: any) {
                        toast({ variant: "destructive", title: "Retur gagal", description: e?.message || "Tidak bisa memproses retur." });
                      }
                    }}
                  />

                  {user?.role !== "cashier" && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="gap-2" disabled={isVoiding || String(saleDetail.status) !== "COMPLETED"}>
                          {isVoiding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                          Batalkan
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Batalkan transaksi?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Pembatalan tidak melakukan penghapusan permanen. Sistem mengembalikan stok dan menyesuaikan poin, lalu mengubah status transaksi menjadi dibatalkan.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onVoid(Number(saleDetail.id))}>
                            Konfirmasi pembatalan
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Rincian Barang</h4>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="text-xs font-bold uppercase h-9">Produk</TableHead>
                        <TableHead className="text-right text-xs font-bold uppercase h-9">Qty</TableHead>
                        <TableHead className="text-right text-xs font-bold uppercase h-9">Harga Satuan</TableHead>
                        <TableHead className="text-right text-xs font-bold uppercase h-9">Diskon</TableHead>
                        <TableHead className="text-right text-xs font-bold uppercase h-9">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {saleDetail.items?.map((item: any) => {
                         const pcsPerCarton = Number(item.product?.pcsPerCarton ?? 1);
                         const isCarton = item.unitType === "CARTON";
                         
                         return (
                          <TableRow key={item.id} className="text-sm">
                            <TableCell className="py-3">
                              <div className="font-medium">{item.product?.name || "-"}</div>
                              <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                {item.product?.barcode}
                              </div>
                            </TableCell>
                            <TableCell className="text-right py-3">
                              {isCarton ? (
                                <div>
                                  <Badge variant="secondary" className="font-bold">{item.quantity} Karton</Badge>
                                  <div className="text-[10px] text-muted-foreground mt-1">
                                    Setara {item.conversionQty} Pcs
                                  </div>
                                </div>
                              ) : (
                                <span className="font-medium">{item.quantity} Pcs</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right py-3">
                              {formatCurrency(Number(item.priceAtSale ?? 0))}
                              {isCarton && <span className="text-[10px] text-muted-foreground block">per karton</span>}
                            </TableCell>
                            <TableCell className="text-right py-3 text-green-600 font-medium">
                              {Number(item.discountAtSale ?? 0) > 0 ? `-${formatCurrency(Number(item.discountAtSale ?? 0))}` : "-"}
                            </TableCell>
                            <TableCell className="text-right py-3 font-bold">
                              {formatCurrency(Number(item.subtotal ?? 0))}
                            </TableCell>
                          </TableRow>
                         );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader className="py-3 bg-slate-50 border-b">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Rincian Pembayaran</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">{formatCurrency(Number(saleDetail.subtotal ?? 0))}</span>
                    </div>
                    <div className="flex justify-between items-center text-green-700">
                      <span className="text-muted-foreground">Diskon</span>
                      <span className="font-medium">-{formatCurrency(Number(saleDetail.discountAmount ?? 0))}</span>
                    </div>
                    {Number(saleDetail.redeemedAmount ?? 0) > 0 && (
                       <div className="flex justify-between items-center text-amber-700">
                         <span className="text-muted-foreground">Tukar Poin ({Number(saleDetail.redeemedPoints)} pts)</span>
                         <span className="font-medium">-{formatCurrency(Number(saleDetail.redeemedAmount ?? 0))}</span>
                       </div>
                    )}
                    <div className="border-t border-dashed pt-3 mt-1 flex justify-between items-center">
                      <span className="font-bold text-base">Total Akhir</span>
                      <span className="font-black text-xl text-primary">{formatCurrency(Number(saleDetail.finalAmount ?? 0))}</span>
                    </div>
                    
                    {Number(saleDetail.pointsEarned ?? 0) > 0 && (
                      <div className="bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg text-xs font-bold text-center mt-2 border border-emerald-100">
                        + {Number(saleDetail.pointsEarned)} Poin Loyalitas Didapatkan
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm flex flex-col">
                  <CardHeader className="py-3 bg-slate-50 border-b">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Log & Audit</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 flex-1 overflow-hidden relative">
                    <div className="absolute inset-0 overflow-auto p-4 space-y-3">
                      {(saleDetail.auditLogs?.length ?? 0) === 0 ? (
                        <div className="text-sm text-muted-foreground text-center py-8">Belum ada perubahan tercatat.</div>
                      ) : (
                        saleDetail.auditLogs.map((l: any) => (
                          <div key={l.id} className="flex items-start gap-3 text-sm border-b border-slate-100 pb-2 last:border-0">
                            <div className="h-2 w-2 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-700">{String(l.action ?? "")}</p>
                              <p className="text-xs text-muted-foreground">{l.createdAt ? new Date(l.createdAt).toLocaleString() : "-"}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Returns History */}
              {(saleDetail.returns?.length ?? 0) > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Riwayat Retur</h4>
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-red-50">
                        <TableRow>
                          <TableHead className="text-red-900 h-8 text-xs font-bold uppercase">No. Retur</TableHead>
                          <TableHead className="text-red-900 h-8 text-xs font-bold uppercase">Tanggal</TableHead>
                          <TableHead className="text-red-900 h-8 text-xs font-bold uppercase text-right">Nilai Refund</TableHead>
                          <TableHead className="text-red-900 h-8 text-xs font-bold uppercase text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {saleDetail.returns.map((r: any) => (
                          <TableRow key={r.id} className="hover:bg-red-50/30">
                            <TableCell className="font-mono font-medium">{r.returnNumber || `RET-${r.id}`}</TableCell>
                            <TableCell className="text-xs">{r.createdAt ? new Date(r.createdAt).toLocaleString() : "-"}</TableCell>
                            <TableCell className="text-right font-bold text-red-700">{formatCurrency(Number(r.totalRefund ?? 0))}</TableCell>
                            <TableCell className="text-center"><StatusBadge status={String(r.status ?? "")} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

function RefundDialog({ sale, disabled, onRefund }: { sale: any; disabled?: boolean; onRefund: (payload: { saleId: number; items: { productId: number; quantity: number }[]; reason: string; refundMethod?: string }) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [refundMethod, setRefundMethod] = useState("cash");
  // Store quantity and unit for each product
  const [selected, setSelected] = useState<Record<number, { qty: number; unit: "PCS" | "CARTON" }>>({});

  const returnedByProduct = useMemo(() => {
    const map = new Map<number, number>();
    for (const r of sale?.returns ?? []) {
      if (String(r.status ?? "") !== "COMPLETED") continue;
      for (const it of r.items ?? []) {
        const productId = Number(it.productId);
        map.set(productId, (map.get(productId) ?? 0) + Number(it.quantity ?? 0));
      }
    }
    return map;
  }, [sale]);

  const items = sale?.items ?? [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" className="gap-2" disabled={disabled} onClick={() => setOpen(true)}>
        <RotateCcw className="h-4 w-4" />
        Refund
      </Button>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Proses Retur / Refund</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-1.5 block">Alasan Retur</label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Contoh: Barang rusak, salah beli..." />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Metode Pengembalian</label>
              <Select value={refundMethod} onValueChange={setRefundMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih metode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Tunai</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="ewallet">E-wallet</SelectItem>
                  <SelectItem value="store_credit">Kredit toko</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[30%]">Produk</TableHead>
                  <TableHead className="text-right">Terjual</TableHead>
                  <TableHead className="text-right">Sudah Diretur</TableHead>
                  <TableHead className="text-right">Sisa (Pcs)</TableHead>
                  <TableHead className="w-[120px]">Satuan Retur</TableHead>
                  <TableHead className="text-right w-[100px]">Jumlah</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it: any) => {
                  const soldPcs = Number(it.conversionQty ?? 0) > 0 ? Number(it.conversionQty) : Number(it.quantity ?? 0);
                  const returned = returnedByProduct.get(Number(it.productId)) ?? 0;
                  const availablePcs = Math.max(0, soldPcs - returned);
                  
                  const pcsPerCarton = Number(it.product?.pcsPerCarton ?? 1);
                  const supportsCarton = Boolean(it.product?.supportsCarton) || pcsPerCarton > 1;
                  
                  // Current selection state
                  const current = selected[Number(it.productId)] ?? { qty: 0, unit: "PCS" };
                  const isCarton = current.unit === "CARTON";
                  
                  const maxQty = isCarton ? Math.floor(availablePcs / pcsPerCarton) : availablePcs;

                  return (
                    <TableRow key={it.id}>
                      <TableCell>
                        <div className="font-medium">{it.product?.name || "-"}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {it.unitType === "CARTON" ? "Dijual per Karton" : "Dijual per Pcs"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {it.unitType === "CARTON" ? (
                          <div>
                            <span className="font-bold">{it.quantity}</span> Karton
                            <div className="text-[10px] text-muted-foreground">({soldPcs} Pcs)</div>
                          </div>
                        ) : (
                          `${soldPcs} Pcs`
                        )}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{returned > 0 ? `${returned} Pcs` : "-"}</TableCell>
                      <TableCell className="text-right font-mono">{availablePcs}</TableCell>
                      <TableCell>
                        {supportsCarton ? (
                          <Select 
                            value={current.unit} 
                            onValueChange={(val: "PCS" | "CARTON") => {
                              setSelected(prev => ({
                                ...prev,
                                [Number(it.productId)]: { qty: 0, unit: val } // Reset qty on unit change
                              }));
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PCS">Pcs</SelectItem>
                              <SelectItem value="CARTON">Karton</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="secondary" className="font-normal text-xs">Pcs</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min={0}
                          max={maxQty}
                          disabled={maxQty <= 0}
                          value={current.qty || ""}
                          onChange={(e) => {
                            const val = Math.max(0, Math.floor(Number(e.target.value || 0)));
                            if (val <= maxQty) {
                              setSelected(prev => ({ 
                                ...prev, 
                                [Number(it.productId)]: { qty: val, unit: current.unit } 
                              }));
                            }
                          }}
                          className="h-8 text-right font-mono"
                          placeholder="0"
                        />
                        {isCarton && (
                          <div className="text-[10px] text-muted-foreground mt-1 text-right">
                            = {current.qty * pcsPerCarton} Pcs
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button
              onClick={async () => {
                const itemsPayload = Object.entries(selected)
                  .map(([productId, val]) => {
                    const pid = Number(productId);
                    const item = items.find((i: any) => i.productId === pid);
                    const pcsPerCarton = Number(item?.product?.pcsPerCarton ?? 1);
                    // Convert to PCS for backend
                    const finalQty = val.unit === "CARTON" ? val.qty * pcsPerCarton : val.qty;
                    return { productId: pid, quantity: finalQty };
                  })
                  .filter(i => i.quantity > 0);

                if (!itemsPayload.length) {
                  return; // Show error toast ideally
                }
                if (!reason.trim()) return;
                
                await onRefund({ saleId: Number(sale.id), items: itemsPayload, reason: reason.trim(), refundMethod });
                setSelected({});
                setReason("");
                setRefundMethod("cash");
                setOpen(false);
              }}
              disabled={Object.values(selected).every(v => v.qty === 0) || !reason.trim()}
            >
              Proses Refund
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
