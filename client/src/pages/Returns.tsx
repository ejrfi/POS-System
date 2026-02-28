import { useMemo, useState } from "react";
import { useSales, useSale, useReturns, useCreateReturn, useDeleteReturn } from "@/hooks/use-transactions";
import { useAuth } from "@/hooks/use-auth";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Loader2, Search, RotateCcw, Eye, Trash2, Receipt, Calendar as CalendarIcon } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { DateRange } from "react-day-picker";
import { format, subDays } from "date-fns";
import { PageShell } from "@/components/layout/PageShell";

function StatusBadge({ status }: { status: string }) {
  const label = status === "CANCELLED" ? "Dibatalkan" : "Selesai";
  const variant = status === "CANCELLED" ? "secondary" : "success";
  return (
    <Badge variant={variant as any} className="font-normal">
      {label}
    </Badge>
  );
}

function formatRefundMethod(method: string) {
  const m = String(method || "").toLowerCase();
  if (m === "cash") return "Tunai";
  if (m === "transfer") return "Transfer";
  if (m === "ewallet") return "E-wallet";
  if (m === "store_credit") return "Kredit toko";
  return method;
}

export default function Returns() {
  const { user } = useAuth();
  const isManager = user?.role === "admin" || user?.role === "supervisor";
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebouncedValue(searchQuery, 300);
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const filters = useMemo(() => {
    return {
      page,
      pageSize,
      status: status !== "all" ? status : undefined,
      search: debouncedSearch.trim() ? debouncedSearch.trim() : undefined,
      startDate: date?.from?.toISOString(),
      endDate: date?.to?.toISOString(),
    };
  }, [page, pageSize, status, debouncedSearch, date]);

  const { data: returnsResult, isLoading: isLoadingReturns, isError, error, isFetching } = useReturns(filters);
  const returns = returnsResult?.items ?? [];
  const total = returnsResult?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const { mutate: deleteReturn, isPending: isDeleting } = useDeleteReturn();
  const { toast } = useToast();
  
  const [selectedReturn, setSelectedReturn] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-8 text-center text-red-500">
        <h2 className="text-xl font-bold">Error loading returns</h2>
        <p className="mt-2">Please check if the server is running and database connections are healthy.</p>
        <p className="text-sm mt-1 text-gray-500">{(error as any)?.message}</p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
           Retry
        </Button>
      </div>
    );
  }

  const handleDelete = (id: number) => {
    deleteReturn(id, {
      onSuccess: () => {
        toast({ title: "Retur dibatalkan", description: "Status retur diperbarui dan stok/poin disesuaikan." });
      },
      onError: () => {
        toast({ variant: "destructive", title: "Gagal", description: "Gagal membatalkan retur." });
      }
    });
  };

  return (
    <PageShell
      title="Retur"
      description="Kelola retur terpisah dari transaksi utama (retur sebagian, poin, stok, audit)."
      headerRight={
        <div className="text-sm text-muted-foreground">
          {isFetching && !isLoadingReturns ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Memuat
            </span>
          ) : null}
        </div>
      }
    >
      <div className="flex flex-col gap-4">

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
                <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <h3 className="tracking-tight text-sm font-medium">Akumulasi Refund</h3>
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(returns.reduce((acc: number, curr: any) => acc + Number(curr.totalRefund ?? 0), 0))}</div>
                <p className="text-xs text-muted-foreground">Audit dari {total} unit pengembalian</p>
            </div>
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
                <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <h3 className="tracking-tight text-sm font-medium">Tingkat Pengembalian</h3>
                    <RotateCcw className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold">
                  {returns.length > 0 ? "Normal" : "0%"}
                </div>
                <p className="text-xs text-muted-foreground">Health Normal</p>
            </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div className="flex flex-1 gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Cari no. retur / invoice / alasan"
                className="pl-8"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
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
                  onSelect={(v) => {
                    setDate(v);
                    setPage(1);
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[170px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua status</SelectItem>
                <SelectItem value="COMPLETED">Selesai</SelectItem>
                <SelectItem value="CANCELLED">Dibatalkan</SelectItem>
              </SelectContent>
            </Select>

            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[120px]">
                <SelectValue placeholder="Baris" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>

            <NewReturnDialog />
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>No. retur</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>No. invoice</TableHead>
                <TableHead>Metode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Alasan</TableHead>
                <TableHead className="text-right">Pengembalian</TableHead>
                <TableHead className="text-right">Poin dikembalikan</TableHead>
                <TableHead className="text-right">Poin dibatalkan</TableHead>
                <TableHead className="text-right w-[120px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingReturns ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Memuat...
                    </div>
                  </TableCell>
                </TableRow>
              ) : returns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                    Tidak ada retur untuk filter ini.
                  </TableCell>
                </TableRow>
              ) : (
                returns.map((ret: any) => (
                  <TableRow key={ret.id} className="hover:bg-muted/50">
                    <TableCell className="font-mono font-medium">{ret.returnNumber || `RET-${ret.id}`}</TableCell>
                    <TableCell>{ret.createdAt ? new Date(ret.createdAt).toLocaleString() : new Date(ret.returnDate).toLocaleString()}</TableCell>
                    <TableCell className="font-mono">{ret.sale?.invoiceNo}</TableCell>
                    <TableCell>{formatRefundMethod(String(ret.refundMethod ?? ""))}</TableCell>
                    <TableCell><StatusBadge status={String(ret.status ?? "COMPLETED")} /></TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">{ret.reason}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold text-red-700">{formatCurrency(Number(ret.totalRefund ?? 0))}</TableCell>
                    <TableCell className="text-right">{Number(ret.pointsRestored ?? 0)}</TableCell>
                    <TableCell className="text-right">{Number(ret.pointsReversed ?? 0)}</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setSelectedReturn(ret);
                            setDetailOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        {isManager ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                disabled={String(ret.status ?? "COMPLETED") === "CANCELLED"}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Batalkan retur?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Pembatalan retur akan mengoreksi stok dan poin. Riwayat tetap tersimpan (status menjadi dibatalkan).
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-red-500 hover:bg-red-600"
                                  onClick={() => handleDelete(ret.id)}
                                >
                                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Konfirmasi"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : null}
                      </div>
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
              Sebelumnya
            </Button>
            <div className="min-w-[110px] text-center">
              Halaman <span className="font-medium">{page}</span> / <span className="font-medium">{totalPages}</span>
            </div>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
              Berikutnya
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-primary" />
              Detail retur
            </DialogTitle>
          </DialogHeader>

          {selectedReturn && (
            <div className="space-y-6 py-4">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-lg border">
                <div className="space-y-1">
                  <p className="text-muted-foreground flex items-center gap-1 text-xs uppercase tracking-wider font-bold">
                    <Receipt className="w-3 h-3" /> No. Retur
                  </p>
                  <p className="font-bold font-mono text-base">{selectedReturn.returnNumber || `RET-${selectedReturn.id}`}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-muted-foreground flex items-center justify-end gap-1 text-xs uppercase tracking-wider font-bold">
                    <CalendarIcon className="w-3 h-3" /> Tanggal
                  </p>
                  <p className="font-medium">{selectedReturn.createdAt ? new Date(selectedReturn.createdAt).toLocaleString() : new Date(selectedReturn.returnDate).toLocaleString()}</p>
                </div>
                <div className="space-y-1 col-span-2 border-t pt-2 mt-1">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Invoice Asal</p>
                      <p className="font-mono font-medium">{selectedReturn.sale?.invoiceNo}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Status</p>
                      <StatusBadge status={String(selectedReturn.status ?? "COMPLETED")} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                 <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Barang yang Diretur</h4>
                 <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="h-9 text-xs font-bold uppercase">Produk</TableHead>
                        <TableHead className="h-9 text-right text-xs font-bold uppercase">Qty Retur</TableHead>
                        <TableHead className="h-9 text-right text-xs font-bold uppercase">Nilai Refund</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedReturn.items?.map((item: any) => {
                        const pcsPerCarton = Number(item.product?.pcsPerCarton ?? 1);
                        const supportsCarton = Boolean(item.product?.supportsCarton) || pcsPerCarton > 1;
                        
                        // Calculate display units
                        let qtyDisplay = `${item.quantity} Pcs`;
                        if (supportsCarton && item.quantity >= pcsPerCarton) {
                          const cartons = Math.floor(item.quantity / pcsPerCarton);
                          const remainder = item.quantity % pcsPerCarton;
                          if (remainder === 0) {
                            qtyDisplay = `${cartons} Karton`;
                          } else {
                            qtyDisplay = `${cartons} Karton + ${remainder} Pcs`;
                          }
                        }

                        return (
                          <TableRow key={item.id} className="text-sm">
                            <TableCell className="py-3">
                              <div className="font-medium">{item.product?.name || "Produk tidak diketahui"}</div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                {item.product?.barcode || "-"}
                              </div>
                            </TableCell>
                            <TableCell className="text-right py-3">
                              <Badge variant="secondary" className="font-mono">
                                {qtyDisplay}
                              </Badge>
                              {supportsCarton && (
                                <div className="text-[10px] text-muted-foreground mt-1">
                                  (Total {item.quantity} Pcs)
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right py-3 font-bold text-red-600">
                              {formatCurrency(Number(item.refundAmount ?? 0))}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Footer Summary */}
              <div className="bg-slate-50 rounded-lg p-4 space-y-3 border">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Alasan Retur</span>
                  <span className="font-medium">{selectedReturn.reason}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Metode Pengembalian</span>
                  <Badge variant="outline" className="uppercase text-[10px] tracking-wider">
                    {formatRefundMethod(String(selectedReturn.refundMethod ?? ""))}
                  </Badge>
                </div>
                
                {Number(selectedReturn.pointsReversed ?? 0) > 0 && (
                  <div className="flex justify-between items-center text-sm text-amber-600">
                    <span className="font-medium">Poin Dibatalkan</span>
                    <span className="font-bold">-{Number(selectedReturn.pointsReversed)} Pts</span>
                  </div>
                )}
                
                <div className="border-t pt-3 mt-2 flex justify-between items-center">
                  <span className="font-bold text-sm uppercase text-muted-foreground">Total Refund</span>
                  <span className="text-xl font-black text-red-600">
                    {formatCurrency(Number(selectedReturn.totalRefund ?? 0))}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

function NewReturnDialog() {
  const [open, setOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);
  const [refundMethod, setRefundMethod] = useState("cash");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebouncedValue(searchQuery, 300);
  
  const { data: salesResult, isLoading: isLoadingSales } = useSales({ 
    page: 1, 
    pageSize: 20, 
    status: "COMPLETED",
    search: debouncedSearch 
  });
  const sales = salesResult?.items ?? [];
  const { data: sale, isLoading: isLoadingSaleDetails } = useSale(selectedSaleId);
  const createReturn = useCreateReturn();
  const { toast } = useToast();
  
  const [selectedItems, setSelectedItems] = useState<Record<number, { qty: number; unit: "PCS" | "CARTON" }>>({});
  const [reason, setReason] = useState("");

  const handleSubmit = async () => {
    if (!sale) return;
    
    // Check if we have any valid items
    const hasItems = Object.values(selectedItems).some(val => val.qty > 0);
    if (!hasItems) {
      toast({ title: "Gagal", description: "Pilih minimal satu item untuk diretur.", variant: "destructive" });
      return;
    }

    const itemsToReturn = Object.entries(selectedItems)
      .filter(([_, val]) => val.qty > 0)
      .map(([saleItemId, val]) => {
        // Find the original item using the saleItemId (key of selectedItems)
        // We use saleItemId as the key now to handle duplicate products in same sale properly
        const item = sale.items.find((i: any) => i.id === Number(saleItemId));
        if (!item) return null;

        const pcsPerCarton = Number(item?.product?.pcsPerCarton ?? 1);
        const finalQty = val.unit === "CARTON" ? val.qty * pcsPerCarton : val.qty;
        
        // Return with productId as required by API, but logic based on unique sale item ID
        return { productId: item.productId, quantity: finalQty };
      })
      .filter(Boolean); // Remove nulls

    if (itemsToReturn.length === 0) {
      toast({ title: "Gagal", description: "Terjadi kesalahan memproses item.", variant: "destructive" });
      return;
    }

    if (!reason) {
      toast({ title: "Gagal", description: "Alasan retur wajib diisi.", variant: "destructive" });
      return;
    }

    try {
      await createReturn.mutateAsync({
        saleId: sale.id,
        items: itemsToReturn,
        reason,
        refundMethod,
      });
      toast({ title: "Berhasil", description: "Retur diproses." });
      setOpen(false);
      setSelectedSaleId(null);
      setReason("");
      setSelectedItems({});
      setRefundMethod("cash");
    } catch (err) {
      toast({ title: "Gagal", description: "Tidak bisa memproses retur.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="shadow-lg shadow-primary/20">
          <RotateCcw className="w-4 h-4 mr-2" />
          Retur Baru
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Proses Retur Baru</DialogTitle>
          <DialogDescription>Pilih transaksi untuk memulai retur (retur sebagian didukung).</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Invoice Selection */}
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium">Pilih invoice</label>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={popoverOpen}
                  className="w-full justify-between"
                >
                  {selectedSaleId
                    ? sales?.find((s) => s.id === selectedSaleId)?.invoiceNo || "Invoice terpilih (Cari ulang jika tidak tampil)"
                    : "Cari nomor invoice..."}
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0">
                <Command shouldFilter={false}>
                  <CommandInput 
                    placeholder="Cari invoice..." 
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                  />
                  <CommandEmpty>
                    {isLoadingSales ? "Mencari..." : "Invoice tidak ditemukan."}
                  </CommandEmpty>
                  <CommandGroup className="max-h-[300px] overflow-y-auto">
                    {sales?.map((s) => (
                      <CommandItem
                        key={s.id}
                        value={s.invoiceNo}
                        onSelect={() => {
                          setSelectedSaleId(s.id);
                          setPopoverOpen(false);
                          setSelectedItems({});
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedSaleId === s.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span>{s.invoiceNo}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(s.transactionDate!).toLocaleDateString()} - {formatCurrency(s.finalAmount)}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {isLoadingSaleDetails && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {sale && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
              <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg border">
                <div>
                  <p className="text-xs text-muted-foreground">Pelanggan</p>
                  <p className="font-medium">{sale.customer?.name || "Tamu"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tanggal</p>
                  <p className="font-medium">{new Date(sale.transactionDate!).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Total bayar</p>
                  <p className="font-bold text-primary">{formatCurrency(sale.finalAmount)}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={refundMethod} onValueChange={setRefundMethod}>
                  <SelectTrigger className="w-full sm:w-[220px]">
                    <SelectValue placeholder="Metode pengembalian dana" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Tunai</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="ewallet">E-wallet</SelectItem>
                    <SelectItem value="store_credit">Kredit toko</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produk</TableHead>
                      <TableHead className="text-center">Terjual</TableHead>
                      <TableHead className="text-right">Harga Satuan</TableHead>
                      <TableHead className="w-[120px]">Satuan Retur</TableHead>
                      <TableHead className="w-[150px] text-center">Jumlah retur</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sale.items.map((item: any) => {
                      const soldPcs = Number(item.conversionQty ?? 0) > 0 ? Number(item.conversionQty) : Number(item.quantity);
                      const pcsPerCarton = Number(item?.product?.pcsPerCarton ?? 1);
                      const supportsCarton = Boolean(item.product?.supportsCarton) || pcsPerCarton > 1;
                      
                      // Use item.id (unique sale item id) as key to prevent collisions
                      const current = selectedItems[item.id] ?? { qty: 0, unit: "PCS" };
                      const isCarton = current.unit === "CARTON";
                      const maxQty = isCarton ? Math.floor(soldPcs / pcsPerCarton) : soldPcs;
                      
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            <div>{item.product.name}</div>
                            <div className="text-[10px] text-muted-foreground uppercase">{item.unitType === "CARTON" ? "Penjualan Karton" : "Penjualan Eceran"}</div>
                          </TableCell>
                          <TableCell className="text-center">
                            {item.unitType === "CARTON" ? (
                              <div>
                                <Badge variant="secondary" className="font-normal">{item.quantity} Karton</Badge>
                                <div className="text-[10px] text-muted-foreground mt-1">({soldPcs} Pcs)</div>
                              </div>
                            ) : (
                              <Badge variant="secondary" className="font-normal">{soldPcs} Pcs</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(Number(item.priceAtSale) / (item.unitType === "CARTON" ? (item.conversionQty / item.quantity) : 1))}
                          </TableCell>
                          <TableCell>
                            {supportsCarton ? (
                              <Select 
                                value={current.unit} 
                                onValueChange={(val: "PCS" | "CARTON") => {
                                  setSelectedItems(prev => ({
                                    ...prev,
                                    [item.id]: { qty: 0, unit: val }
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
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Input 
                                type="number" 
                                min="0" 
                                max={maxQty}
                                className="h-8 text-center"
                                value={current.qty || ""}
                                placeholder="0"
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  if (val <= maxQty && val >= 0) {
                                    setSelectedItems(prev => ({ 
                                      ...prev, 
                                      [item.id]: { qty: val, unit: current.unit } 
                                    }));
                                  }
                                }}
                              />
                              <div className="text-[10px] text-center text-muted-foreground">
                                {isCarton ? `= ${current.qty * pcsPerCarton} Pcs` : `Maks ${soldPcs} Pcs`}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Alasan retur</label>
                <Input 
                  placeholder="Contoh: barang rusak, item salah, berubah pikiran" 
                  value={reason} 
                  onChange={(e) => setReason(e.target.value)} 
                />
              </div>

              <Button onClick={handleSubmit} className="w-full" disabled={createReturn.isPending}>
                {createReturn.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Konfirmasi retur & pengembalian dana
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
