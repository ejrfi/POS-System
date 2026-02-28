import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Calendar as CalendarIcon, DollarSign, Loader2, Search, ShieldCheck, Timer } from "lucide-react";
import { format, subDays, differenceInSeconds } from "date-fns";
import { DateRange } from "react-day-picker";
import { useCashierShifts } from "@/hooks/use-shifts";
import { formatCurrency, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";
import { Switch } from "@/components/ui/switch";
import { PageShell } from "@/components/layout/PageShell";

function formatDuration(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function ShiftReports() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  const [cashierName, setCashierName] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [approvalStatus, setApprovalStatus] = useState<string>("all");
  const [diffLargeOnly, setDiffLargeOnly] = useState(false);
  const [nowTs, setNowTs] = useState(() => Date.now());

  const { data, isLoading } = useCashierShifts({
    startDate: date?.from?.toISOString(),
    endDate: date?.to?.toISOString(),
    cashierName: cashierName.trim() ? cashierName.trim() : undefined,
    search: search.trim() ? search.trim() : undefined,
    role: role !== "all" ? role : undefined,
    status: status !== "all" ? (status as any) : undefined,
    approvalStatus: approvalStatus !== "all" ? (approvalStatus as any) : undefined,
    diffLargeOnly: diffLargeOnly ? true : undefined,
  });

  useEffect(() => {
    const hasActive = (data ?? []).some((s) => s.status === "OPEN" || s.status === "ACTIVE");
    if (!hasActive) return;
    const timer = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [data]);

  const summary = useMemo(() => {
    const rows = data ?? [];
    const totalShifts = rows.length;
    const totalSales = rows.reduce((acc, r: any) => acc + Number(r.totalSales ?? 0), 0);
    const totalRefund = rows.reduce((acc, r: any) => acc + Number(r.totalRefund ?? 0), 0);
    const pendingApproval = rows.reduce((acc, r: any) => acc + (String(r.approvalStatus ?? "NONE") === "PENDING" ? 1 : 0), 0);
    return { totalShifts, totalSales, totalRefund, pendingApproval, netSales: totalSales - totalRefund };
  }, [data]);

  const ShiftStatusBadge = ({ value }: { value: string }) => {
    const st = value === "ACTIVE" ? "OPEN" : value;
    const label =
      st === "OPEN"
        ? "Buka"
        : st === "CLOSED"
          ? "Tutup"
          : st === "CANCELLED"
            ? "Dibatalkan"
            : st;
    const className =
      st === "OPEN"
        ? "bg-blue-50 text-blue-700 border-blue-200"
        : st === "CLOSED"
          ? "bg-green-50 text-green-700 border-green-200"
          : "bg-slate-50 text-slate-700 border-slate-200";
    return (
      <Badge variant="outline" className={cn("font-normal", className)}>
        {label}
      </Badge>
    );
  };

  const ApprovalBadge = ({ value }: { value: string }) => {
    const st = String(value ?? "NONE");
    const label =
      st === "PENDING"
        ? "Menunggu"
        : st === "APPROVED"
          ? "Disetujui"
          : st === "REJECTED"
            ? "Ditolak"
            : "Belum disetujui";
    const className =
      st === "PENDING"
        ? "bg-orange-50 text-orange-700 border-orange-200"
        : st === "APPROVED"
          ? "bg-green-50 text-green-700 border-green-200"
          : st === "REJECTED"
            ? "bg-red-50 text-red-700 border-red-200"
            : "bg-slate-50 text-slate-700 border-slate-200";
    return (
      <Badge variant="outline" className={cn("font-normal", className)}>
        {label}
      </Badge>
    );
  };

  return (
    <PageShell
      title="Laporan Shift"
      description="Laporan shift kasir untuk kontrol kas, retur, diskon, dan audit."
      headerRight={
        <div className="text-sm text-muted-foreground">
          {isLoading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Memuat
            </span>
          ) : null}
        </div>
      }
    >
      <div className="space-y-6">
        <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Search className="w-4 h-4 text-primary" /> Pencarian & Filter Laporan
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    className="h-11 pl-10 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-all"
                    placeholder="Cari kode shift / terminal..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Input
                  className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-all"
                  placeholder="Filter nama kasir..."
                  value={cashierName}
                  onChange={(e) => setCashierName(e.target.value)}
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      variant="outline"
                      className={cn(
                        "h-11 justify-start text-left font-medium rounded-xl bg-slate-50 border-slate-200 hover:bg-white transition-all",
                        !date && "text-slate-400"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                      {date?.from ? (
                        date.to ? (
                          <span className="text-slate-700">
                            {format(date.from, "dd MMM")} - {format(date.to, "dd MMM yyyy")}
                          </span>
                        ) : (
                          <span className="text-slate-700">{format(date.from, "dd MMM yyyy")}</span>
                        )
                      ) : (
                        <span>Pilih rentang tanggal</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl border-slate-200" align="end">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={date?.from}
                      selected={date}
                      onSelect={setDate}
                      numberOfMonths={2}
                      className="rounded-2xl"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="h-10 w-[150px] rounded-xl bg-white border-slate-200 shadow-sm">
                    <SelectValue placeholder="Peran" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                    <SelectItem value="all">Semua peran</SelectItem>
                    <SelectItem value="cashier">Kasir</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-10 w-[150px] rounded-xl bg-white border-slate-200 shadow-sm">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="OPEN">Buka</SelectItem>
                    <SelectItem value="CLOSED">Tutup</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={approvalStatus} onValueChange={setApprovalStatus}>
                  <SelectTrigger className="h-10 w-[180px] rounded-xl bg-white border-slate-200 shadow-sm">
                    <SelectValue placeholder="Persetujuan" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                    <SelectItem value="all">Semua persetujuan</SelectItem>
                    <SelectItem value="PENDING">Menunggu</SelectItem>
                    <SelectItem value="APPROVED">Disetujui</SelectItem>
                    <SelectItem value="NONE">Tidak perlu</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 ml-auto lg:ml-0">
                  <Switch checked={diffLargeOnly} onCheckedChange={setDiffLargeOnly} />
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">Selisih Besar</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Shift" value={summary.totalShifts} icon={Timer} className="rounded-3xl border-slate-200 shadow-sm" />
          <StatCard title="Total Penjualan" value={formatCurrency(summary.totalSales)} icon={DollarSign} className="rounded-3xl border-slate-200 shadow-sm" />
          <StatCard title="Penjualan Bersih" value={formatCurrency(summary.netSales)} icon={DollarSign} className="rounded-3xl border-slate-200 shadow-sm" />
          <StatCard 
            title="Menunggu" 
            value={summary.pendingApproval} 
            icon={ShieldCheck} 
            className={cn(
              "rounded-3xl border-slate-200 shadow-sm",
              summary.pendingApproval > 0 ? "bg-amber-50 border-amber-100" : ""
            )} 
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64 bg-white/50 rounded-3xl border border-dashed border-slate-200">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                    <TableHead className="font-bold text-slate-600 pl-6">Informasi Shift</TableHead>
                    <TableHead className="font-bold text-slate-600">Petugas & Terminal</TableHead>
                    <TableHead className="font-bold text-slate-600">Waktu Operasional</TableHead>
                    <TableHead className="text-right font-bold text-slate-600">Penjualan</TableHead>
                    <TableHead className="text-right font-bold text-slate-600">Selisih</TableHead>
                    <TableHead className="font-bold text-slate-600">Status</TableHead>
                    <TableHead className="text-right font-bold text-slate-600 pr-6">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.length ?? 0) === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-40 text-center">
                        <div className="flex flex-col items-center justify-center space-y-2 opacity-50">
                          <Timer className="w-8 h-8" />
                          <p className="text-sm font-medium">Tidak ada data shift ditemukan.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.map((s) => {
                      const openedAt = s.openedAt ? new Date(s.openedAt as any) : null;
                      const closedAt = s.closedAt ? new Date(s.closedAt as any) : null;
                      const endAt = s.status === "OPEN" || s.status === "ACTIVE" ? new Date(nowTs) : (closedAt ?? new Date(nowTs));
                      const duration = openedAt ? formatDuration(Math.abs(differenceInSeconds(endAt, openedAt))) : "-";
                      const code = (s as any).shiftCode || `SHF-${s.id}`;
                      const salesTotal = Number((s as any).totalSales ?? 0);
                      const diff = Number(s.cashDifference ?? 0);
                      const diffClass = diff < 0 ? "text-red-600" : diff > 0 ? "text-orange-700" : "text-emerald-700";
                      
                      return (
                        <TableRow key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                          <TableCell className="pl-6 py-4">
                            <div className="font-black text-slate-800 tracking-tight">{code}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                              {duration !== "-" ? `Durasi ${duration}` : "Baru dibuka"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-bold text-slate-700">{s.userName}</div>
                            <div className="text-[10px] font-medium text-slate-400 uppercase tracking-tight">
                              {s.userRole} • {s.terminalName?.trim() ? s.terminalName : "Terminal -"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs font-bold text-slate-600">
                              {openedAt ? format(openedAt, "dd MMM, HH:mm") : "-"}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Sampai: {s.status === "OPEN" || s.status === "ACTIVE" ? "Sekarang" : closedAt ? format(closedAt, "dd MMM, HH:mm") : "-"}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="font-black text-slate-800">{formatCurrency(salesTotal)}</div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className={cn("font-black tabular-nums", diffClass)}>
                              {formatCurrency(diff)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1.5 items-start">
                              <ShiftStatusBadge value={String(s.status ?? "")} />
                              <ApprovalBadge value={String((s as any).approvalStatus ?? "NONE")} />
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-9 rounded-lg border-slate-200 font-bold hover:bg-white hover:text-primary hover:border-primary/30"
                              asChild
                            >
                              <Link href={`/reports/shifts/${s.id}`}>
                                Detail
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>
    </PageShell>
  );
}
