import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { Calendar as CalendarIcon, DollarSign, FileDown, Loader2, Printer, Tags, TrendingUp, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRange } from "react-day-picker";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, subDays, endOfDay } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useCustomerReport, useItemSales, useProductReport, useReportSummary, useReturnReport, useSalesReport } from "@/hooks/use-transactions";
import { useBrands } from "@/hooks/use-products";
import { PageShell } from "@/components/layout/PageShell";

function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const escape = (v: string | number) => {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const csv = "\uFEFF" + rows.map(r => r.map(escape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function printReport(title: string, html: string) {
  const win = window.open("", "print", "height=800,width=1100");
  if (!win) return;
  win.document.open();
  win.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${String(title).replace(/</g, "&lt;").replace(/>/g, "&gt;")}</title>
<style>
  body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;margin:0;padding:24px;color:#0f172a}
  h1{margin:0 0 8px 0;font-size:20px}
  .muted{color:#475569;font-size:12px}
  .grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:14px 0 18px}
  .card{border:1px solid #e2e8f0;border-radius:10px;padding:10px}
  table{width:100%;border-collapse:collapse}
  th,td{border-bottom:1px solid #e2e8f0;padding:8px 6px;text-align:left;font-size:12px;vertical-align:top}
  th{background:#f8fafc}
  .right{text-align:right}
  @media print { body{padding:0} }
</style>
</head>
<body>
  ${html}
</body>
</html>`);
  win.document.close();
  win.focus();
  win.print();
  win.close();
}

export default function Reports() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("day");
  const [limit, setLimit] = useState(10);
  const [brandId, setBrandId] = useState<number | undefined>(undefined);

  const { data: brands } = useBrands();

  const filters = useMemo(() => {
    return {
      startDate: date?.from?.toISOString(),
      endDate: date?.to ? endOfDay(date.to).toISOString() : undefined,
      brandId,
    };
  }, [date, brandId]);

  const { data: summary, isLoading: isSummaryLoading } = useReportSummary(filters);
  const { data: salesBuckets, isLoading: isSalesLoading } = useSalesReport({ ...filters, groupBy });
  const { data: customerReport, isLoading: isCustomerLoading } = useCustomerReport({ ...filters, limit });
  const { data: productReport, isLoading: isProductLoading } = useProductReport({ ...filters, limit });
  const { data: returnReport, isLoading: isReturnLoading } = useReturnReport(filters);
  const { data: itemSales, isLoading: isItemSalesLoading } = useItemSales(filters);

  const isLoading = isSummaryLoading || isSalesLoading || isCustomerLoading || isProductLoading || isReturnLoading || isItemSalesLoading;

  const handleExportExcel = () => {
    const rows: Array<Array<string | number>> = [];
    rows.push(["LAPORAN", "Laporan POS"]);
    rows.push(["PERIODE", `${filters.startDate || ""}`, `${filters.endDate || ""}`]);
    rows.push([]);
    rows.push(["RINGKASAN"]);
    rows.push(["Total penjualan", summary?.totalSales ?? 0]);
    rows.push(["Total pengembalian", summary?.totalRefund ?? 0]);
    rows.push(["Pendapatan bersih", summary?.netRevenue ?? 0]);
    rows.push(["Total diskon", summary?.totalDiscount ?? 0]);
    rows.push(["Total poin dipakai", summary?.totalPointUsed ?? 0]);
    rows.push(["Total poin diterbitkan", summary?.totalPointIssued ?? 0]);
    rows.push(["Total transaksi", summary?.totalTransactions ?? 0]);
    rows.push(["Rata-rata nilai transaksi", summary?.averageTransactionValue ?? 0]);
    rows.push([]);
    rows.push(["PENJUALAN (PERIODE)"]);
    rows.push(["Periode", "Penjualan", "Pengembalian", "Bersih", "Transaksi"]);
    (salesBuckets ?? []).forEach(r => rows.push([r.bucket, r.totalSales, r.totalRefund, r.netRevenue, r.transactions]));
    rows.push([]);
    rows.push(["PELANGGAN (TOP BELANJA)"]);
    rows.push(["ID pelanggan", "Nama", "No. HP", "Tier", "Total belanja", "Transaksi"]);
    (customerReport?.topSpenders ?? []).forEach(r => rows.push([r.customerId, r.name, r.phone ?? "", r.tier, r.totalSpent, r.transactions]));
    rows.push([]);
    rows.push(["PRODUK (TERLARIS)"]);
    rows.push(["ID produk", "Nama", "Jumlah terjual", "Pendapatan", "Margin"]);
    (productReport?.bestSelling ?? []).forEach(r => rows.push([r.productId, r.productName, r.quantitySold, r.totalRevenue, r.margin]));
    rows.push([]);
    rows.push(["PRODUK (PALING BANYAK DIRETUR)"]);
    rows.push(["ID produk", "Nama", "Jumlah retur", "Pengembalian"]);
    (productReport?.mostReturned ?? []).forEach(r => rows.push([r.productId, r.productName, r.quantityReturned, r.totalRefund]));
    rows.push([]);
    rows.push(["RETUR"]);
    rows.push(["Total retur", returnReport?.totalReturns ?? 0]);
    rows.push(["Total pengembalian", returnReport?.totalRefund ?? 0]);
    rows.push(["Rasio retur (%)", returnReport?.returnRatePct ?? 0]);
    rows.push([]);
    rows.push(["ITEM RETUR (TOP)"]);
    rows.push(["ID produk", "Nama", "Jumlah retur", "Pengembalian"]);
    (returnReport?.topReturnItems ?? []).forEach(r => rows.push([r.productId, r.productName, r.quantityReturned, r.totalRefund]));
    rows.push([]);
    rows.push(["PENJUALAN ITEM (DETAIL)"]);
    rows.push(["Produk", "Merek", "Jumlah terjual", "Pendapatan"]);
    (itemSales ?? []).forEach(r => rows.push([r.productName, r.brandName ?? "", r.quantitySold, r.totalRevenue]));
    downloadCsv(`laporan_${Date.now()}.csv`, rows);
  };

  const handlePrint = () => {
    const periodText = date?.from
      ? date.to
        ? `${format(date.from, "dd LLL y")} - ${format(date.to, "dd LLL y")}`
        : format(date.from, "dd LLL y")
      : "-";

    const html = `
      <h1>Laporan POS</h1>
      <div class="muted">Periode: ${periodText}</div>
      <div class="grid">
        <div class="card"><div class="muted">Total penjualan</div><div><b>${formatCurrency(summary?.totalSales ?? 0)}</b></div></div>
        <div class="card"><div class="muted">Total pengembalian</div><div><b>${formatCurrency(summary?.totalRefund ?? 0)}</b></div></div>
        <div class="card"><div class="muted">Pendapatan bersih</div><div><b>${formatCurrency(summary?.netRevenue ?? 0)}</b></div></div>
        <div class="card"><div class="muted">Total diskon</div><div><b>${formatCurrency(summary?.totalDiscount ?? 0)}</b></div></div>
      </div>
      <h2 style="margin:18px 0 6px 0;font-size:14px">Penjualan</h2>
      <table>
        <thead><tr><th>Periode</th><th class="right">Penjualan</th><th class="right">Pengembalian</th><th class="right">Bersih</th><th class="right">Transaksi</th></tr></thead>
        <tbody>
          ${(salesBuckets ?? []).map(r => `<tr><td>${String(r.bucket)}</td><td class="right">${formatCurrency(r.totalSales)}</td><td class="right">${formatCurrency(r.totalRefund)}</td><td class="right">${formatCurrency(r.netRevenue)}</td><td class="right">${r.transactions}</td></tr>`).join("")}
        </tbody>
      </table>
    `;
    printReport("Reports", html);
  };

  return (
    <PageShell
      title="Laporan"
      description="Analisis mendalam performa bisnis, tren penjualan, dan perilaku pelanggan."
      headerRight={
        <div className="text-sm text-muted-foreground">
          {isLoading ? (
            <span className="inline-flex items-center gap-2 font-bold text-primary">
              <Loader2 className="h-4 w-4 animate-spin" /> Memperbarui data...
            </span>
          ) : (
            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100 font-black">
              Data Terkini
            </Badge>
          )}
        </div>
      }
    >
      <div className="space-y-8 max-w-[1600px] mx-auto pb-10">
        {/* Modern Filter Card */}
        <Card className="rounded-[32px] border-slate-200/60 shadow-xl shadow-slate-200/20 overflow-hidden bg-white/80 backdrop-blur-sm border-none ring-1 ring-slate-200">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100/60 py-5">
            <CardTitle className="text-sm font-black flex items-center gap-2.5 text-slate-800">
              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <CalendarIcon className="w-4 h-4" />
              </div>
              Konfigurasi Laporan
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-6 lg:items-center justify-between">
              <div className="flex flex-wrap items-center gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Rentang Waktu</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date"
                        variant="outline"
                        className={cn(
                          "h-12 min-w-[240px] justify-start text-left font-bold rounded-2xl bg-white border-slate-200 hover:border-primary hover:bg-slate-50 transition-all shadow-sm group",
                          !date && "text-slate-400"
                        )}
                      >
                        <CalendarIcon className="mr-2.5 h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
                        {date?.from ? (
                          date.to ? (
                            <span className="text-slate-700">
                              {format(date.from, "dd MMM")} - {format(date.to, "dd MMM yyyy")}
                            </span>
                          ) : (
                            <span className="text-slate-700">{format(date.from, "dd MMM yyyy")}</span>
                          )
                        ) : (
                          <span>Pilih Rentang</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-3xl shadow-2xl border-slate-200 overflow-hidden" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={setDate}
                        numberOfMonths={2}
                        className="p-3"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Grup Data</label>
                  <Select value={groupBy} onValueChange={(v) => setGroupBy(v as any)}>
                    <SelectTrigger className="h-12 w-[160px] rounded-2xl bg-white border-slate-200 shadow-sm font-bold text-slate-700 hover:border-primary transition-all">
                      <SelectValue placeholder="Kelompok" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-slate-200 shadow-2xl p-1">
                      <SelectItem value="day" className="rounded-xl font-medium">Harian</SelectItem>
                      <SelectItem value="week" className="rounded-xl font-medium">Mingguan</SelectItem>
                      <SelectItem value="month" className="rounded-xl font-medium">Bulanan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Filter Brand</label>
                  <Select value={brandId ? String(brandId) : "all"} onValueChange={(v) => setBrandId(v === "all" ? undefined : Number(v))}>
                    <SelectTrigger className="h-12 w-[180px] rounded-2xl bg-white border-slate-200 shadow-sm font-bold text-slate-700 hover:border-primary transition-all">
                      <SelectValue placeholder="Semua Brand" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-slate-200 shadow-2xl p-1">
                      <SelectItem value="all" className="rounded-xl font-medium">Semua Brand</SelectItem>
                      {brands?.map((brand) => (
                        <SelectItem key={brand.id} value={String(brand.id)} className="rounded-xl font-medium">
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Limit Baris</label>
                  <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
                    <SelectTrigger className="h-12 w-[130px] rounded-2xl bg-white border-slate-200 shadow-sm font-bold text-slate-700 hover:border-primary transition-all">
                      <SelectValue placeholder="Batas" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-slate-200 shadow-2xl p-1">
                      <SelectItem value="5" className="rounded-xl font-medium">Top 5</SelectItem>
                      <SelectItem value="10" className="rounded-xl font-medium">Top 10</SelectItem>
                      <SelectItem value="20" className="rounded-xl font-medium">Top 20</SelectItem>
                      <SelectItem value="50" className="rounded-xl font-medium">Top 50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-end gap-3 pt-4 lg:pt-0">
                <Button 
                  variant="outline" 
                  className="h-12 px-6 rounded-2xl font-black border-slate-200 hover:bg-slate-50 hover:text-primary transition-all gap-2.5 shadow-sm group" 
                  onClick={handlePrint} 
                  disabled={isLoading}
                >
                  <Printer className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span>Cetak / PDF</span>
                </Button>
                <Button 
                  className="h-12 px-6 rounded-2xl font-black shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-95 transition-all gap-2.5" 
                  onClick={handleExportExcel} 
                  disabled={isLoading}
                >
                  <FileDown className="h-4 w-4" />
                  <span>Ekspor CSV</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dynamic High-Impact Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Total Penjualan" 
            value={formatCurrency(summary?.totalSales ?? 0)} 
            icon={DollarSign} 
            className="rounded-[32px] border-none shadow-xl shadow-slate-200/40 ring-1 ring-slate-200/60"
            description="Total pendapatan kotor"
          />
          <StatCard 
            title="Total Retur" 
            value={formatCurrency(summary?.totalRefund ?? 0)} 
            icon={RotateCcw} 
            className="rounded-[32px] border-none shadow-xl shadow-red-200/20 ring-1 ring-red-100/60 bg-red-50/10"
            iconClassName="text-red-500 bg-red-50"
            description="Pengembalian dana pelanggan"
          />
          <StatCard 
            title="Pendapatan Bersih" 
            value={formatCurrency(summary?.netRevenue ?? 0)} 
            icon={TrendingUp} 
            className="rounded-[32px] border-none shadow-xl shadow-emerald-200/20 ring-1 ring-emerald-100/60 bg-emerald-50/10"
            iconClassName="text-emerald-500 bg-emerald-50"
            description="Penjualan - Retur"
          />
          <StatCard 
            title="Total Diskon" 
            value={formatCurrency(summary?.totalDiscount ?? 0)} 
            icon={Tags} 
            className="rounded-[32px] border-none shadow-xl shadow-slate-200/40 ring-1 ring-slate-200/60"
            iconClassName="text-amber-500 bg-amber-50"
            description="Potongan harga yang diberikan"
          />
        </div>

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Points Activity Card */}
          <Card className="rounded-[32px] border-none shadow-xl shadow-indigo-200/20 ring-1 ring-indigo-100/50 overflow-hidden bg-white group hover:shadow-indigo-200/30 transition-shadow">
            <CardHeader className="bg-indigo-50/40 border-b border-indigo-100/40 py-5">
              <CardTitle className="text-xs font-black text-indigo-900 uppercase tracking-[0.15em] flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                Aktivitas Poin Loyalitas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-7">
              <div className="space-y-6">
                <div className="flex justify-between items-center group/item">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Poin Terpakai</span>
                    <p className="text-xs text-slate-500 font-medium">Dukonversi jadi diskon</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-red-600 tabular-nums">{summary?.totalPointUsed ?? 0}</span>
                    <div className="h-1 w-full bg-red-100 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: '40%' }} />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center group/item">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Poin Diterbitkan</span>
                    <p className="text-xs text-slate-500 font-medium">Reward transaksi baru</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-emerald-600 tabular-nums">+{summary?.totalPointIssued ?? 0}</span>
                    <div className="h-1 w-full bg-emerald-100 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: '65%' }} />
                    </div>
                  </div>
                </div>

                <div className="pt-5 border-t border-slate-50 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-lg bg-indigo-50 flex items-center justify-center">
                      <Tags className="w-3 h-3 text-indigo-500" />
                    </div>
                    <span className="text-xs font-bold text-slate-500">Poin Beredar (O/S)</span>
                  </div>
                  <Badge variant="outline" className="font-black text-indigo-700 bg-indigo-50 border-indigo-100 rounded-lg px-3 py-0.5">
                    {customerReport?.totalPointOutstanding ?? 0}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transaction Metrics Card */}
          <Card className="rounded-[32px] border-none shadow-xl shadow-slate-200/40 ring-1 ring-slate-200/60 overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-5">
              <CardTitle className="text-xs font-black text-slate-900 uppercase tracking-[0.15em] flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                Efisiensi Transaksi
              </CardTitle>
            </CardHeader>
            <CardContent className="p-7">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Volume Transaksi</span>
                    <p className="text-xs text-slate-500 font-medium">Total struk keluar</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-slate-800 tabular-nums">{summary?.totalTransactions ?? 0}</span>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">TX TERPROSES</p>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Average Basket Size</span>
                    <p className="text-xs text-slate-500 font-medium">Rata-rata belanja / TX</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-primary tabular-nums">{formatCurrency(summary?.averageTransactionValue ?? 0)}</span>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <TrendingUp className="w-3 h-3 text-emerald-500" />
                      <span className="text-[10px] font-black text-emerald-600 uppercase">Trend Positif</span>
                    </div>
                  </div>
                </div>

                <div className="pt-5 border-t border-slate-50">
                  <div className="bg-slate-50 rounded-2xl p-3 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-white flex items-center justify-center shadow-sm">
                      <TrendingUp className="w-4 h-4 text-slate-400" />
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                      Statistik dihitung secara real-time berdasarkan sinkronisasi database pusat.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Refund Risk Card */}
          <Card className="rounded-[32px] border-none shadow-xl shadow-orange-200/20 ring-1 ring-orange-100/50 overflow-hidden bg-white">
            <CardHeader className="bg-orange-50/40 border-b border-orange-100/40 py-5">
              <CardTitle className="text-xs font-black text-orange-900 uppercase tracking-[0.15em] flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                Audit & Risiko Retur
              </CardTitle>
            </CardHeader>
            <CardContent className="p-7">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Item Dikembalikan</span>
                    <p className="text-xs text-slate-500 font-medium">Total kuantitas retur</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-orange-600 tabular-nums">{returnReport?.totalReturns ?? 0}</span>
                    <p className="text-[10px] font-bold text-orange-400 uppercase mt-1">UNIT RETUR</p>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Return Rate</span>
                    <p className="text-xs text-slate-500 font-medium">Persentase terhadap omzet</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black text-slate-800">{returnReport?.returnRatePct ?? 0}%</span>
                      <Badge variant={Number(returnReport?.returnRatePct ?? 0) > 5 ? "destructive" : "secondary"} className="text-[10px] h-6 rounded-lg px-2 font-black">
                        {Number(returnReport?.returnRatePct ?? 0) > 5 ? "Tinggi" : "Aman"}
                      </Badge>
                    </div>
                    <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-1000",
                          Number(returnReport?.returnRatePct ?? 0) > 5 ? "bg-red-500" : "bg-emerald-500"
                        )} 
                        style={{ width: `${Math.min(Number(returnReport?.returnRatePct ?? 0) * 10, 100)}%` }} 
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-5 border-t border-slate-50">
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed italic">
                    Batas aman pengembalian adalah di bawah 5% dari total transaksi kotor.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Professional Tabbed Analysis Section */}
        <Tabs defaultValue="sales" className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <TabsList className="bg-slate-100/60 p-1.5 rounded-[22px] border border-slate-200/50 h-auto self-start shadow-inner">
              <TabsTrigger value="sales" className="rounded-2xl px-8 py-3 font-black text-xs uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all">
                Penjualan
              </TabsTrigger>
              <TabsTrigger value="customers" className="rounded-2xl px-8 py-3 font-black text-xs uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all">
                Pelanggan
              </TabsTrigger>
              <TabsTrigger value="products" className="rounded-2xl px-8 py-3 font-black text-xs uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all">
                Produk
              </TabsTrigger>
              <TabsTrigger value="items" className="rounded-2xl px-8 py-3 font-black text-xs uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all">
                Detail Item
              </TabsTrigger>
              <TabsTrigger value="returns" className="rounded-2xl px-8 py-3 font-black text-xs uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all">
                Retur
              </TabsTrigger>
            </TabsList>
            <div className="hidden lg:flex items-center gap-2 text-[11px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-2 rounded-full border border-slate-200/60 shadow-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Real-time Analysis Engine
            </div>
          </div>

          <TabsContent value="sales" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="rounded-[40px] border-none shadow-2xl shadow-slate-200/40 overflow-hidden bg-white ring-1 ring-slate-200/60">
              <CardHeader className="p-8 border-b border-slate-100/60 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-black text-slate-800 tracking-tight">Tren Pendapatan Bersih</CardTitle>
                  <p className="text-sm text-slate-500 font-medium mt-1">Visualisasi fluktuasi omzet bersih per periode</p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary shadow-inner">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </CardHeader>
              <CardContent className="p-8 h-[420px]">
                {(salesBuckets?.length ?? 0) === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 bg-slate-50/50 rounded-[32px] border-2 border-dashed border-slate-200">
                    <TrendingUp className="w-12 h-12 opacity-10" />
                    <div className="text-center">
                      <p className="text-sm font-black uppercase tracking-widest text-slate-400">Data Kosong</p>
                      <p className="text-xs font-medium text-slate-400 mt-1">Sesuaikan filter tanggal untuk melihat tren.</p>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesBuckets} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.7} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="bucket" 
                        fontSize={11} 
                        fontWeight={800} 
                        tickLine={false} 
                        axisLine={false} 
                        tick={{ fill: '#64748b' }} 
                        dy={10}
                      />
                      <YAxis 
                        fontSize={11} 
                        fontWeight={800} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(v) => `Rp ${Number(v) >= 1000000 ? (Number(v)/1000000).toFixed(1) + 'jt' : (Number(v)/1000).toFixed(0) + 'rb'}`} 
                        tick={{ fill: '#94a3b8' }} 
                      />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ 
                          borderRadius: '24px', 
                          border: 'none', 
                          boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)',
                          padding: '16px 20px',
                          background: 'rgba(255, 255, 255, 0.95)',
                          backdropFilter: 'blur(8px)'
                        }}
                        itemStyle={{ fontWeight: 900, fontSize: '14px' }}
                        labelStyle={{ fontWeight: 900, marginBottom: '8px', color: '#1e293b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                        formatter={(v) => [formatCurrency(Number(v)), "NET REVENUE"]}
                      />
                      <Bar 
                        dataKey="netRevenue" 
                        fill="url(#barGradient)" 
                        radius={[10, 10, 4, 4]} 
                        barSize={40} 
                        animationDuration={1500}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[40px] border-none shadow-xl shadow-slate-200/40 overflow-hidden bg-white ring-1 ring-slate-200/60">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 border-none hover:bg-slate-50/80">
                      <TableHead className="pl-8 h-16 font-black text-[11px] uppercase tracking-[0.15em] text-slate-500">Periode</TableHead>
                      <TableHead className="text-right h-16 font-black text-[11px] uppercase tracking-[0.15em] text-slate-500">Penjualan Kotor</TableHead>
                      <TableHead className="text-right h-16 font-black text-[11px] uppercase tracking-[0.15em] text-slate-500">Pengembalian</TableHead>
                      <TableHead className="text-right h-16 font-black text-[11px] uppercase tracking-[0.15em] text-slate-500">Net Revenue</TableHead>
                      <TableHead className="text-right pr-8 h-16 font-black text-[11px] uppercase tracking-[0.15em] text-slate-500">Transaksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(salesBuckets ?? []).length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="h-40 text-center font-bold text-slate-400">Belum ada riwayat penjualan.</TableCell></TableRow>
                    ) : (
                      (salesBuckets ?? []).map((r) => (
                        <TableRow key={r.bucket} className="hover:bg-slate-50/50 border-slate-50 transition-colors group">
                          <TableCell className="pl-8 py-5">
                            <span className="font-black text-slate-800 tracking-tight group-hover:text-primary transition-colors">{r.bucket}</span>
                          </TableCell>
                          <TableCell className="text-right font-bold text-slate-500 tabular-nums">{formatCurrency(r.totalSales)}</TableCell>
                          <TableCell className="text-right">
                            <span className="text-red-500 font-bold bg-red-50 px-3 py-1 rounded-full text-xs tabular-nums">
                              -{formatCurrency(r.totalRefund)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-black text-slate-900 tabular-nums text-base">{formatCurrency(r.netRevenue)}</span>
                          </TableCell>
                          <TableCell className="text-right pr-8">
                            <Badge variant="secondary" className="font-black text-slate-500 bg-slate-100 rounded-lg px-3 py-0.5 tabular-nums">
                              {r.transactions} TX
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="customers" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="rounded-[40px] border-none shadow-2xl shadow-slate-200/40 overflow-hidden bg-white ring-1 ring-slate-200/60">
              <CardHeader className="p-8 border-b border-slate-100/60 flex flex-row items-center justify-between bg-slate-50/30">
                <div>
                  <CardTitle className="text-xl font-black text-slate-800 tracking-tight">Top High-Value Customers</CardTitle>
                  <p className="text-sm text-slate-500 font-medium mt-1">Peringkat pelanggan berdasarkan total akumulasi belanja</p>
                </div>
                <Badge className="bg-amber-100 text-amber-800 border-amber-200 font-black px-4 py-1.5 rounded-2xl shadow-sm text-xs tracking-wider">
                  {customerReport?.totalPointOutstanding ?? 0} TOTAL POIN BEREDAR
                </Badge>
              </CardHeader>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-white border-b border-slate-50">
                      <TableHead className="pl-8 h-16 font-black text-[11px] uppercase tracking-[0.15em] text-slate-400">Profil Pelanggan</TableHead>
                      <TableHead className="h-16 font-black text-[11px] uppercase tracking-[0.15em] text-slate-400 text-center">Loyalty Tier</TableHead>
                      <TableHead className="text-right h-16 font-black text-[11px] uppercase tracking-[0.15em] text-slate-400">Frekuensi Belanja</TableHead>
                      <TableHead className="text-right pr-8 h-16 font-black text-[11px] uppercase tracking-[0.15em] text-slate-400">Customer Lifetime Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(customerReport?.topSpenders ?? []).length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="h-40 text-center font-bold text-slate-400">Database pelanggan masih kosong.</TableCell></TableRow>
                    ) : (
                      customerReport?.topSpenders.map((c, idx) => (
                        <TableRow key={c.customerId} className="hover:bg-slate-50/50 border-slate-50 transition-all group">
                          <TableCell className="pl-8 py-6">
                            <div className="flex items-center gap-4">
                              <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors text-lg shadow-inner">
                                {idx + 1}
                              </div>
                              <div>
                                <div className="font-black text-slate-800 text-base tracking-tight">{c.name}</div>
                                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 flex items-center gap-2">
                                  <span>ID: #{c.customerId}</span>
                                  <span className="h-1 w-1 rounded-full bg-slate-200" />
                                  <span>{c.phone || "No Contact"}</span>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className={cn(
                              "inline-flex items-center px-4 py-1.5 rounded-2xl font-black text-[11px] uppercase tracking-[0.15em] shadow-sm ring-1 ring-inset transition-all",
                              c.tier === "PLATINUM" ? "bg-indigo-50 text-indigo-700 ring-indigo-200/50 shadow-indigo-100" :
                              c.tier === "GOLD" ? "bg-amber-50 text-amber-700 ring-amber-200/50 shadow-amber-100" :
                              c.tier === "SILVER" ? "bg-slate-100 text-slate-700 ring-slate-200/50 shadow-slate-100" :
                              "bg-slate-50 text-slate-500 ring-slate-100 shadow-none"
                            )}>
                              {c.tier}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="font-black text-slate-700 tabular-nums text-lg">{c.transactions}</div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">TRANSAKSI</p>
                          </TableCell>
                          <TableCell className="text-right pr-8">
                            <div className="font-black text-primary tabular-nums text-xl tracking-tighter">{formatCurrency(c.totalSpent)}</div>
                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Total Kontribusi</p>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Best Sellers */}
              <Card className="rounded-[40px] border-none shadow-2xl shadow-emerald-200/20 overflow-hidden bg-white ring-1 ring-emerald-100/50">
                <CardHeader className="bg-emerald-50/40 border-b border-emerald-100/40 p-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-black text-emerald-900 tracking-tight flex items-center gap-3">
                        <TrendingUp className="w-6 h-6 text-emerald-600" /> 
                        Top Performance Products
                      </CardTitle>
                      <p className="text-sm text-emerald-700/60 font-medium mt-1">Berdasarkan volume penjualan tertinggi</p>
                    </div>
                    <div className="h-10 w-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner">
                      <DollarSign className="w-5 h-5" />
                    </div>
                  </div>
                </CardHeader>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-emerald-50 bg-emerald-50/20">
                        <TableHead className="pl-8 h-14 font-black text-[10px] uppercase tracking-[0.2em] text-emerald-800/50">Produk</TableHead>
                        <TableHead className="text-center h-14 font-black text-[10px] uppercase tracking-[0.2em] text-emerald-800/50">Qty</TableHead>
                        <TableHead className="text-right pr-8 h-14 font-black text-[10px] uppercase tracking-[0.2em] text-emerald-800/50">Omzet</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(productReport?.bestSelling ?? []).length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="h-40 text-center font-bold text-slate-400">Belum ada data penjualan produk.</TableCell></TableRow>
                      ) : (
                        productReport?.bestSelling.map((p) => (
                          <TableRow key={p.productId} className="hover:bg-emerald-50/30 border-emerald-50/50 transition-colors group">
                            <TableCell className="pl-8 py-5">
                              <span className="font-black text-slate-800 text-sm tracking-tight group-hover:text-emerald-700 transition-colors">{p.productName}</span>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">SKU: {p.productId}</p>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary" className="font-black bg-emerald-100 text-emerald-700 rounded-xl px-4 py-1 text-xs">
                                {p.quantitySold}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right pr-8">
                              <span className="font-black text-slate-900 tabular-nums">{formatCurrency(p.totalRevenue)}</span>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>

              {/* Most Returned */}
              <Card className="rounded-[40px] border-none shadow-2xl shadow-red-200/20 overflow-hidden bg-white ring-1 ring-red-100/50">
                <CardHeader className="bg-red-50/40 border-b border-red-100/40 p-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-black text-red-900 tracking-tight flex items-center gap-3">
                        <RotateCcw className="w-6 h-6 text-red-600" /> 
                        Product Return Watchlist
                      </CardTitle>
                      <p className="text-sm text-red-700/60 font-medium mt-1">Produk dengan tingkat pengembalian tertinggi</p>
                    </div>
                    <div className="h-10 w-10 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 shadow-inner">
                      <RotateCcw className="w-5 h-5" />
                    </div>
                  </div>
                </CardHeader>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-red-50 bg-red-50/20">
                        <TableHead className="pl-8 h-14 font-black text-[10px] uppercase tracking-[0.2em] text-red-800/50">Produk</TableHead>
                        <TableHead className="text-center h-14 font-black text-[10px] uppercase tracking-[0.2em] text-red-800/50">Retur</TableHead>
                        <TableHead className="text-right pr-8 h-14 font-black text-[10px] uppercase tracking-[0.2em] text-red-800/50">Refund</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(productReport?.mostReturned ?? []).length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="h-40 text-center font-bold text-emerald-600 italic bg-emerald-50/10">Bagus! Tidak ada produk yang diretur.</TableCell></TableRow>
                      ) : (
                        productReport?.mostReturned.map((p) => (
                          <TableRow key={p.productId} className="hover:bg-red-50/30 border-red-50/50 transition-colors group">
                            <TableCell className="pl-8 py-5">
                              <span className="font-black text-slate-800 text-sm tracking-tight group-hover:text-red-700 transition-colors">{p.productName}</span>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">SKU: {p.productId}</p>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="font-black bg-red-50 text-red-700 border-red-200 rounded-xl px-4 py-1 text-xs">
                                {p.quantityReturned}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right pr-8">
                              <span className="font-black text-red-600 tabular-nums">{formatCurrency(p.totalRefund)}</span>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="items" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="rounded-[40px] border-none shadow-2xl shadow-slate-200/40 overflow-hidden bg-white ring-1 ring-slate-200/60">
              <CardHeader className="p-8 border-b border-slate-100/60 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-black text-slate-800 tracking-tight">Detail Penjualan Item</CardTitle>
                  <p className="text-sm text-slate-500 font-medium mt-1">Laporan granular per item produk dan merek</p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 shadow-inner">
                  <Tags className="w-6 h-6" />
                </div>
              </CardHeader>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50 border-none">
                      <TableHead className="pl-8 h-16 font-black text-[11px] uppercase tracking-[0.15em] text-slate-500">Nama Produk</TableHead>
                      <TableHead className="h-16 font-black text-[11px] uppercase tracking-[0.15em] text-slate-500">Merek / Brand</TableHead>
                      <TableHead className="text-center h-16 font-black text-[11px] uppercase tracking-[0.15em] text-slate-500">Terjual</TableHead>
                      <TableHead className="text-right pr-8 h-16 font-black text-[11px] uppercase tracking-[0.15em] text-slate-500">Total Pendapatan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(itemSales ?? []).length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="h-40 text-center font-bold text-slate-400">Tidak ada data item terjual.</TableCell></TableRow>
                    ) : (
                      (itemSales ?? []).map((item, idx) => (
                        <TableRow key={`${item.productName}-${idx}`} className="hover:bg-slate-50/50 border-slate-50 transition-colors">
                          <TableCell className="pl-8 py-5">
                            <span className="font-black text-slate-800 tracking-tight">{item.productName}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-bold text-slate-500 border-slate-200 rounded-lg px-3 py-0.5">
                              {item.brandName || "General"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-black text-slate-700 tabular-nums">{item.quantitySold}</span>
                          </TableCell>
                          <TableCell className="text-right pr-8">
                            <span className="font-black text-slate-900 tabular-nums">{formatCurrency(item.totalRevenue)}</span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="returns" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="rounded-[40px] border-none shadow-xl shadow-red-200/20 bg-white ring-1 ring-red-100/50 p-10 flex items-center gap-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
                  <RotateCcw className="w-32 h-32 text-red-900" />
                </div>
                <div className="h-20 w-20 rounded-[32px] bg-red-50 flex items-center justify-center text-red-500 shrink-0 shadow-inner">
                  <RotateCcw className="w-10 h-10" />
                </div>
                <div>
                  <p className="text-[11px] font-black text-red-900/40 uppercase tracking-[0.2em]">Akumulasi Refund</p>
                  <h3 className="text-4xl font-black text-red-600 tabular-nums tracking-tighter mt-1">{formatCurrency(returnReport?.totalRefund ?? 0)}</h3>
                  <p className="text-xs font-bold text-red-700/60 mt-2 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                    Audit dari {returnReport?.totalReturns ?? 0} unit pengembalian
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium mt-1 italic">
                    Hanya retur berstatus selesai dihitung
                  </p>
                </div>
              </Card>

              <Card className="rounded-[40px] border-none shadow-xl shadow-slate-200/40 bg-white ring-1 ring-slate-200/60 p-10 flex items-center gap-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
                  <TrendingUp className="w-32 h-32 text-slate-900" />
                </div>
                <div className="h-20 w-20 rounded-[32px] bg-slate-50 flex items-center justify-center text-slate-500 shrink-0 shadow-inner">
                  <TrendingUp className="w-10 h-10" />
                </div>
                <div>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Tingkat Pengembalian</p>
                  <div className="flex items-center gap-4 mt-1">
                    <h3 className="text-4xl font-black text-slate-800 tabular-nums tracking-tighter">{returnReport?.returnRatePct ?? 0}%</h3>
                    <Badge variant={Number(returnReport?.returnRatePct ?? 0) > 5 ? "destructive" : "secondary"} className="rounded-xl px-3 py-1 font-black text-[10px] uppercase">
                      {Number(returnReport?.returnRatePct ?? 0) > 5 ? "Risk High" : "Health Normal"}
                    </Badge>
                  </div>
                  <p className="text-xs font-bold text-slate-500 mt-2 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                    Rasio nilai retur terhadap omzet kotor
                  </p>
                </div>
              </Card>
            </div>

            <Card className="rounded-[40px] border-none shadow-2xl shadow-slate-200/40 overflow-hidden bg-white ring-1 ring-slate-200/60">
              <CardHeader className="p-8 border-b border-slate-100/60 bg-slate-50/30">
                <CardTitle className="text-xl font-black text-slate-800 tracking-tight">Detail Log Pengembalian</CardTitle>
                <p className="text-sm text-slate-500 font-medium mt-1">Daftar item yang masuk dalam proses refund/retur</p>
              </CardHeader>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-white border-b border-slate-50">
                      <TableHead className="pl-8 h-16 font-black text-[11px] uppercase tracking-[0.15em] text-slate-400">Nama Produk</TableHead>
                      <TableHead className="text-center h-16 font-black text-[11px] uppercase tracking-[0.15em] text-slate-400">Kuantitas</TableHead>
                      <TableHead className="text-right pr-8 h-16 font-black text-[11px] uppercase tracking-[0.15em] text-slate-400">Nilai Refund</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(returnReport?.topReturnItems ?? []).length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="h-40 text-center font-bold text-slate-400">Log pengembalian masih bersih.</TableCell></TableRow>
                    ) : (
                      returnReport?.topReturnItems.map((p) => (
                        <TableRow key={p.productId} className="hover:bg-red-50/30 border-slate-50 transition-colors group">
                          <TableCell className="pl-8 py-5">
                            <span className="font-black text-slate-800 tracking-tight group-hover:text-red-600 transition-colors">{p.productName}</span>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">SKU: {p.productId}</p>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="font-black text-red-600 border-red-200 bg-red-50 rounded-lg px-3 py-0.5 tabular-nums">
                              {p.quantityReturned} UNIT
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-8">
                            <span className="font-black text-red-600 tabular-nums text-lg">{formatCurrency(p.totalRefund)}</span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  );
}
