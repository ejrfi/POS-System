import { useMemo, useState } from "react";
import { useDashboardOverview } from "@/hooks/use-dashboard";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, Banknote, Calendar as CalendarIcon, CreditCard, Package, ReceiptText, ShoppingBag, Timer, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageShell } from "@/components/layout/PageShell";

function formatCompactCurrency(value: number) {
  const safe = Number.isFinite(value) ? value : 0;
  const compact = new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(safe);
  return `Rp ${compact}`;
}

function formatMonthLabel(value: string) {
  const [y, m] = value.split("-").map((v) => Number(v));
  if (!y || !m) return value;
  return new Date(y, m - 1, 1).toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
}

export default function Dashboard() {
  const [days, setDays] = useState<7 | 30>(30);
  const { data, isLoading, isError, error } = useDashboardOverview({ days, months: 12, topLimit: 10, lowStockThreshold: 10 });

  const paymentChart = useMemo(() => {
    const rows = data?.charts.paymentBreakdown ?? [];
    const agg = new Map<string, { totalSales: number; transactions: number }>();
    rows.forEach((r) => {
      const key = r.method === "cash" ? "Tunai" : "Non-tunai";
      const prev = agg.get(key) ?? { totalSales: 0, transactions: 0 };
      agg.set(key, { totalSales: prev.totalSales + r.totalSales, transactions: prev.transactions + r.transactions });
    });

    const order = ["Tunai", "Non-tunai"];
    const colors: Record<string, string> = { "Tunai": "#16a34a", "Non-tunai": "#2563eb" };
    return order
      .filter((k) => agg.has(k))
      .map((k) => ({
        name: k,
        value: agg.get(k)!.totalSales,
        color: colors[k],
        transactions: agg.get(k)!.transactions,
      }));
  }, [data]);

  const paymentTotal = useMemo(() => {
    return paymentChart.reduce((acc, r) => acc + r.value, 0);
  }, [paymentChart]);

  const monthlyInsights = useMemo(() => {
    const rows = data?.charts.monthlySales ?? [];
    const total = rows.reduce((acc, r) => acc + r.totalSales, 0);
    const avg = rows.length ? total / rows.length : 0;
    const best = rows.reduce<{ month: string; totalSales: number; transactions: number } | null>((prev, cur) => {
      if (!prev) return cur;
      return cur.totalSales > prev.totalSales ? cur : prev;
    }, null);
    const last = rows.length ? rows[rows.length - 1] : null;
    const prev = rows.length >= 2 ? rows[rows.length - 2] : null;
    const momPct = prev && prev.totalSales > 0 && last ? ((last.totalSales - prev.totalSales) / prev.totalSales) * 100 : null;
    return { total, avg, best, momPct };
  }, [data]);

  const topProductsList = useMemo(() => {
    const rows = data?.charts.topProducts ?? [];
    const total = rows.reduce((acc, r) => acc + r.totalRevenue, 0);
    return rows.slice(0, 6).map((r) => ({
      ...r,
      sharePct: total > 0 ? (r.totalRevenue / total) * 100 : 0,
    }));
  }, [data]);

  return (
    <PageShell
      title="Dashboard"
      description="Analisis performa real-time dan ringkasan operasional bisnis."
      headerRight={
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Status Sistem</span>
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 mt-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Monitoring
            </span>
          </div>
          <div className="h-10 w-[1px] bg-slate-200 mx-1 hidden sm:block" />
          <div className="bg-white/80 backdrop-blur-sm px-5 py-2.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 group hover:border-primary transition-colors cursor-default">
            <CalendarIcon className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" />
            <span className="text-sm font-black text-slate-700 tracking-tight">
              {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </span>
          </div>
        </div>
      }
    >
      <div className="space-y-8 max-w-[1600px] mx-auto pb-10 animate-in fade-in duration-700">
        {isError && (
          <Card className="border-none bg-red-50/80 backdrop-blur-sm ring-1 ring-red-200 shadow-xl shadow-red-200/20 rounded-3xl overflow-hidden">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 shadow-inner">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <div className="font-black text-red-900 tracking-tight">Sinkronisasi Gagal</div>
                <div className="text-sm text-red-700/80 font-medium mt-0.5">{(error as any)?.message || "Koneksi database terputus. Silakan muat ulang halaman."}</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main KPI Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
          {isLoading ? (
            Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-32 rounded-[32px]" />)
          ) : (
            <>
              <Card className="rounded-[32px] border-none shadow-xl shadow-emerald-200/20 ring-1 ring-emerald-100/50 bg-white group hover:shadow-emerald-200/40 transition-all active:scale-95 cursor-default">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner group-hover:scale-110 transition-transform">
                      <ReceiptText className="w-5 h-5" />
                    </div>
                    <Badge variant="outline" className="bg-emerald-50/50 text-emerald-600 border-emerald-100 font-black text-[10px] uppercase">Harian</Badge>
                  </div>
                  <div className="mt-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Omzet Hari Ini</p>
                    <h3 className="text-xl font-black text-slate-800 tracking-tighter mt-1 tabular-nums">{formatCurrency(data?.summary.todaySales ?? 0)}</h3>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5">
                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase">{data?.summary.todayTransactions ?? 0} Transaksi</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[32px] border-none shadow-xl shadow-sky-200/20 ring-1 ring-sky-100/50 bg-white group hover:shadow-sky-200/40 transition-all active:scale-95 cursor-default">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-600 shadow-inner group-hover:scale-110 transition-transform">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <Badge variant="outline" className="bg-sky-50/50 text-sky-600 border-sky-100 font-black text-[10px] uppercase">Volume</Badge>
                  </div>
                  <div className="mt-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Total Transaksi</p>
                    <h3 className="text-xl font-black text-slate-800 tracking-tighter mt-1 tabular-nums">{data?.summary.todayTransactions ?? 0}</h3>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5">
                    <Package className="w-3 h-3 text-sky-500" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase">{data?.summary.todayItemsSold ?? 0} Item Terjual</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[32px] border-none shadow-xl shadow-indigo-200/20 ring-1 ring-indigo-100/50 bg-white group hover:shadow-indigo-200/40 transition-all active:scale-95 cursor-default">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner group-hover:scale-110 transition-transform">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <Badge variant="outline" className="bg-indigo-50/50 text-indigo-600 border-indigo-100 font-black text-[10px] uppercase">Bulanan</Badge>
                  </div>
                  <div className="mt-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Omzet Bulan Ini</p>
                    <h3 className="text-xl font-black text-slate-800 tracking-tighter mt-1 tabular-nums">{formatCurrency(data?.summary.monthSales ?? 0)}</h3>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5">
                    <Timer className="w-3 h-3 text-indigo-500" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Akumulasi Real-time</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[32px] border-none shadow-xl shadow-violet-200/20 ring-1 ring-violet-100/50 bg-white group hover:shadow-violet-200/40 transition-all active:scale-95 cursor-default">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-600 shadow-inner group-hover:scale-110 transition-transform">
                      <Package className="w-5 h-5" />
                    </div>
                    <Badge variant="outline" className="bg-violet-50/50 text-violet-600 border-violet-100 font-black text-[10px] uppercase">Stok</Badge>
                  </div>
                  <div className="mt-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Produk Terjual</p>
                    <h3 className="text-xl font-black text-slate-800 tracking-tighter mt-1 tabular-nums">{data?.summary.todayItemsSold ?? 0}</h3>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5">
                    <Package className="w-3 h-3 text-violet-500" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Unit Terdistribusi</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[32px] border-none shadow-xl shadow-orange-200/20 ring-1 ring-orange-100/50 bg-white group hover:shadow-orange-200/40 transition-all active:scale-95 cursor-default">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 shadow-inner group-hover:scale-110 transition-transform">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <Badge variant="outline" className="bg-orange-50/50 text-orange-600 border-orange-100 font-black text-[10px] uppercase">Audit</Badge>
                  </div>
                  <div className="mt-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Stok Menipis</p>
                    <h3 className="text-xl font-black text-orange-600 tracking-tighter mt-1 tabular-nums">{data?.summary.lowStockCount ?? 0}</h3>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3 text-orange-500" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Ambang Batas ≤ 10</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[32px] border-none shadow-xl shadow-slate-200/20 ring-1 ring-slate-200/50 bg-white group hover:shadow-slate-200/40 transition-all active:scale-95 cursor-default">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-600 shadow-inner group-hover:scale-110 transition-transform">
                      <Banknote className="w-5 h-5" />
                    </div>
                    <Badge variant="outline" className="bg-slate-50/50 text-slate-600 border-slate-100 font-black text-[10px] uppercase">Cash</Badge>
                  </div>
                  <div className="mt-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Estimasi Kas</p>
                    <h3 className="text-xl font-black text-slate-800 tracking-tighter mt-1 tabular-nums">{formatCurrency(data?.summary.activeExpectedCash ?? 0)}</h3>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5">
                    <Timer className="w-3 h-3 text-slate-500" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase">{data?.summary.activeShiftCount ?? 0} Shift Aktif</span>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Chart Section */}
          <Card className="lg:col-span-2 rounded-[40px] border-none shadow-2xl shadow-slate-200/40 overflow-hidden bg-white ring-1 ring-slate-200/60">
            <CardHeader className="p-8 border-b border-slate-100/60 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <CardTitle className="text-xl font-black text-slate-800 tracking-tight">Performa Penjualan Harian</CardTitle>
                <CardDescription className="text-sm font-medium mt-1">Tren perbandingan transaksi tunai dan non-tunai</CardDescription>
              </div>
              <Tabs value={String(days)} onValueChange={(v) => setDays(v === "7" ? 7 : 30)} className="bg-slate-100/60 p-1 rounded-2xl border border-slate-200/50">
                <TabsList className="bg-transparent h-auto">
                  <TabsTrigger value="7" className="rounded-xl px-5 py-2 font-black text-[10px] uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:shadow-lg transition-all">7 Hari</TabsTrigger>
                  <TabsTrigger value="30" className="rounded-xl px-5 py-2 font-black text-[10px] uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:shadow-lg transition-all">30 Hari</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="p-8 h-[400px]">
              {isLoading ? (
                <Skeleton className="h-full rounded-[32px]" />
              ) : (data?.charts.dailySales?.length ?? 0) === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 bg-slate-50/50 rounded-[32px] border-2 border-dashed border-slate-200">
                  <TrendingUp className="w-12 h-12 opacity-10" />
                  <p className="text-sm font-black uppercase tracking-widest text-slate-400">Belum Ada Transaksi</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data?.charts.dailySales} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 11, fontWeight: 800, fill: "#64748b" }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 11, fontWeight: 800, fill: "#94a3b8" }} 
                      tickFormatter={(v) => `Rp${(v / 1000).toFixed(0)}rb`} 
                    />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '24px', 
                        border: 'none', 
                        boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)',
                        padding: '16px 20px',
                        background: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(8px)'
                      }}
                      itemStyle={{ fontWeight: 900, fontSize: '13px' }}
                      labelStyle={{ fontWeight: 900, marginBottom: '8px', color: '#1e293b', fontSize: '11px', textTransform: 'uppercase' }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      align="right" 
                      height={40} 
                      iconType="circle"
                      formatter={(value) => <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider ml-1">{value}</span>}
                    />
                    <Area type="monotone" dataKey="totalSales" name="Total Penjualan" stroke="hsl(var(--primary))" fill="url(#colorTotal)" strokeWidth={4} animationDuration={2000} />
                    <Area type="monotone" dataKey="cashSales" name="Tunai" stroke="#16a34a" fill="url(#colorCash)" strokeWidth={2} strokeDasharray="5 5" />
                    <Area type="monotone" dataKey="nonCashSales" name="Non-Tunai" stroke="#2563eb" fill="transparent" strokeWidth={2} strokeDasharray="5 5" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Operational Right Panel */}
          <div className="space-y-8">
            {/* Action Panel */}
            <Card className="rounded-[32px] border-none shadow-xl shadow-indigo-200/20 ring-1 ring-indigo-100/50 overflow-hidden bg-white">
              <CardHeader className="p-7 pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-black text-indigo-900 uppercase tracking-[0.2em] flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                    Status Operasional
                  </CardTitle>
                  <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 font-black text-[10px] rounded-lg">
                    {data?.summary.pendingCount ?? 0} PENDING
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-7 pt-2 space-y-5">
                {isLoading ? (
                  Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)
                ) : (
                  <>
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 group hover:border-primary transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl bg-white flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors shadow-sm">
                          <Timer className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-black text-slate-500 uppercase">Shift Berjalan</span>
                      </div>
                      <span className="text-sm font-black text-slate-800 tabular-nums">{data?.summary.activeShiftCount ?? 0}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 group hover:border-primary transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl bg-white flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors shadow-sm">
                          <Banknote className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-black text-slate-500 uppercase">Estimasi Laci</span>
                      </div>
                      <span className="text-sm font-black text-slate-800 tabular-nums">{formatCurrency(data?.summary.activeExpectedCash ?? 0)}</span>
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button variant="outline" asChild className="rounded-2xl h-11 font-black text-[10px] uppercase tracking-wider border-slate-200 hover:bg-slate-50 transition-all">
                    <Link href="/reports/shifts">Audit Shift</Link>
                  </Button>
                  <Button variant="outline" asChild className="rounded-2xl h-11 font-black text-[10px] uppercase tracking-wider border-slate-200 hover:bg-slate-50 transition-all">
                    <Link href="/inventory">Cek Inventori</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Critical Stock Panel */}
            <Card className="rounded-[32px] border-none shadow-xl shadow-orange-200/20 ring-1 ring-orange-100/50 overflow-hidden bg-white">
              <CardHeader className="p-7 pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-black text-orange-900 uppercase tracking-[0.2em] flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                    Peringatan Stok
                  </CardTitle>
                  <Badge className="bg-orange-50 text-orange-700 border-orange-100 font-black text-[10px] rounded-lg">
                    {data?.operational.lowStockProducts.length ?? 0} ITEM
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-7 pt-2 space-y-3">
                {isLoading ? (
                  Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-xl" />)
                ) : (data?.operational.lowStockProducts.length ?? 0) === 0 ? (
                  <div className="py-4 text-center">
                    <Package className="w-8 h-8 text-emerald-200 mx-auto mb-2" />
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Stok Aman Terkendali</p>
                  </div>
                ) : (
                  data?.operational.lowStockProducts.slice(0, 5).map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-2xl bg-orange-50/50 border border-orange-100 group hover:bg-orange-50 transition-colors">
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-black text-slate-800 truncate tracking-tight">{p.name}</span>
                        <span className="text-[9px] font-bold text-orange-600 uppercase mt-0.5">Prioritas Restock</span>
                      </div>
                      <Badge variant="outline" className="font-black text-orange-700 bg-white border-orange-200 rounded-lg tabular-nums">
                        {p.stock}
                      </Badge>
                    </div>
                  ))
                )}
                {data?.operational.lowStockProducts.length > 5 && (
                  <Button variant="ghost" asChild className="w-full text-[10px] font-black uppercase text-slate-400 hover:text-primary transition-colors">
                    <Link href="/inventory">Lihat {data.operational.lowStockProducts.length - 5} Produk Lainnya...</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Detailed Insights Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Monthly Bar Chart */}
          <Card className="rounded-[40px] border-none shadow-xl shadow-slate-200/40 overflow-hidden bg-white ring-1 ring-slate-200/60">
            <CardHeader className="p-8 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-black text-slate-800 tracking-tight">Kinerja Bulanan</CardTitle>
                  <CardDescription className="text-xs font-medium mt-1">Laporan agregasi 12 bulan terakhir</CardDescription>
                </div>
                <div className="h-10 w-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 shadow-inner">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 h-[300px]">
              {isLoading ? (
                <Skeleton className="h-full rounded-[32px]" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.charts.monthlySales} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="month" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 800, fill: "#94a3b8" }} 
                      tickFormatter={formatMonthLabel} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 800, fill: "#94a3b8" }} 
                      tickFormatter={(v) => `Rp${(v / 1000000).toFixed(0)}jt`} 
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                      itemStyle={{ fontWeight: 900, fontSize: '12px' }}
                      labelFormatter={(label) => `Bulan ${formatMonthLabel(String(label))}`}
                    />
                    <Bar dataKey="totalSales" fill="hsl(var(--primary))" radius={[8, 8, 4, 4]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
            <CardContent className="p-8 pt-0">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-[24px] bg-slate-50 border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Akumulasi</p>
                  <p className="text-xs font-black text-slate-800 mt-1">{formatCompactCurrency(monthlyInsights.total)}</p>
                </div>
                <div className="p-4 rounded-[24px] bg-slate-50 border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Rata-rata</p>
                  <p className="text-xs font-black text-slate-800 mt-1">{formatCompactCurrency(monthlyInsights.avg)}</p>
                </div>
                <div className="p-4 rounded-[24px] bg-emerald-50 border border-emerald-100">
                  <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Puncak</p>
                  <p className="text-xs font-black text-emerald-800 mt-1">{monthlyInsights.best ? formatMonthLabel(monthlyInsights.best.month) : "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method Pie Chart */}
          <Card className="rounded-[40px] border-none shadow-xl shadow-slate-200/40 overflow-hidden bg-white ring-1 ring-slate-200/60">
            <CardHeader className="p-8 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-black text-slate-800 tracking-tight">Metode Pembayaran</CardTitle>
                  <CardDescription className="text-xs font-medium mt-1">Preferensi transaksi pelanggan</CardDescription>
                </div>
                <Badge variant="outline" className="bg-slate-50 border-slate-200 text-slate-700 font-black text-[10px]">
                  TOTAL {formatCompactCurrency(paymentTotal)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-8 h-[280px]">
              {isLoading ? (
                <Skeleton className="h-full rounded-full w-48 mx-auto" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                      formatter={(value: any, name: any) => [formatCurrency(Number(value)), name]}
                    />
                    <Pie data={paymentChart} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={8} animationDuration={1500}>
                      {paymentChart.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Legend verticalAlign="bottom" height={36} iconType="circle" formatter={(value) => <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
            <CardContent className="p-8 pt-0 space-y-4">
              {paymentChart.map((r) => {
                const pct = paymentTotal > 0 ? (r.value / paymentTotal) * 100 : 0;
                return (
                  <div key={r.name} className="group">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: r.color }} />
                        <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{r.name}</span>
                        <span className="text-[10px] font-bold text-slate-400">{r.transactions} TX</span>
                      </div>
                      <span className="text-xs font-black text-slate-900">{pct.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-1000 group-hover:scale-x-105" style={{ width: `${pct}%`, background: r.color }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Top Products Bar Chart */}
          <Card className="rounded-[40px] border-none shadow-xl shadow-slate-200/40 overflow-hidden bg-white ring-1 ring-slate-200/60">
            <CardHeader className="p-8 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-black text-slate-800 tracking-tight">Top High-Revenue</CardTitle>
                  <CardDescription className="text-xs font-medium mt-1">Produk dengan kontribusi omzet terbesar</CardDescription>
                </div>
                <div className="h-10 w-10 rounded-2xl bg-primary/5 flex items-center justify-center text-primary shadow-inner">
                  <ShoppingBag className="w-5 h-5" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 h-[300px]">
              {isLoading ? (
                <Skeleton className="h-full rounded-[32px]" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.charts.topProducts} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis 
                      type="category" 
                      dataKey="productName" 
                      axisLine={false} 
                      tickLine={false} 
                      width={100} 
                      tick={{ fontSize: 9, fontWeight: 900, fill: "#64748b", textTransform: 'uppercase' }} 
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                      formatter={(value: any) => [formatCurrency(Number(value)), "Revenue"]}
                    />
                    <Bar dataKey="totalRevenue" fill="hsl(var(--primary))" radius={[0, 10, 10, 0]} barSize={16} animationDuration={1500} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
            <CardContent className="p-8 pt-0 space-y-4">
              {topProductsList.slice(0, 3).map((p, idx) => (
                <div key={p.productId} className="flex items-center justify-between p-3 rounded-[24px] bg-slate-50 border border-slate-100 group hover:border-primary transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-xl bg-white flex items-center justify-center font-black text-[10px] text-slate-400 shadow-sm">
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-800 truncate tracking-tight">{p.productName}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{p.quantitySold} Unit Terjual</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-black text-slate-900 tabular-nums">{formatCurrency(p.totalRevenue)}</p>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-0.5">{p.sharePct.toFixed(1)}%</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
