import { useEffect, useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import { Banknote, CalendarClock, CreditCard, FileDown, Loader2, Printer, ReceiptText, RotateCcw, ShieldCheck, UserRound, Wallet, Search } from "lucide-react";
import { format, differenceInSeconds } from "date-fns";
import { useApproveShift, useCashierShiftSummary, useCashierShiftTransactions } from "@/hooks/use-shifts";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { PageShell } from "@/components/layout/PageShell";

function formatDuration(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function shiftStatusBadge(status: string) {
  const st = status === "ACTIVE" ? "OPEN" : status;
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
}

function approvalBadge(status: string) {
  const st = String(status ?? "NONE");
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
}

function txStatusBadge(status: string) {
  if (status === "COMPLETED") {
    return (
      <Badge variant="outline" className="border-transparent bg-emerald-50 text-emerald-700">
        Selesai
      </Badge>
    );
  }
  if (status === "CANCELLED") {
    return (
      <Badge variant="outline" className="border-transparent bg-red-50 text-red-700">
        Dibatalkan
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-transparent bg-amber-50 text-amber-800">
      Retur
    </Badge>
  );
}

function formatPaymentMethod(method: string | null | undefined) {
  const m = (method ?? "").toLowerCase();
  if (m === "cash") return "Tunai";
  if (m === "card") return "Non-tunai";
  if (m === "transfer") return "Transfer";
  if (m === "ewallet") return "E-wallet";
  if (m === "store_credit") return "Kredit toko";
  return method || "-";
}

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

export default function ShiftReportDetail() {
  const [match, params] = useRoute("/reports/shifts/:id");
  const id = match ? Number(params?.id) : null;

  const { user } = useAuth();
  const { toast } = useToast();
  const approveShift = useApproveShift();

  const { data, isLoading, refetch } = useCashierShiftSummary(id);
  const { data: transactions, isLoading: isLoadingTx, refetch: refetchTx } = useCashierShiftTransactions(id);

  const [txQuery, setTxQuery] = useState("");
  const [txStatus, setTxStatus] = useState<"all" | "COMPLETED" | "CANCELLED" | "RETURN">("all");
  const [txMethod, setTxMethod] = useState<string>("all");
  const [nowTs, setNowTs] = useState(() => Date.now());
  const [approvalNote, setApprovalNote] = useState("");

  const filteredTx = useMemo(() => {
    const q = txQuery.trim().toLowerCase();
    const rows = transactions ?? [];
    return rows.filter((t) => {
      const invoice = String(t.invoiceNo ?? "").toLowerCase();
      const method = String(t.paymentMethod ?? "").toLowerCase();
      const status = String(t.status ?? "").toUpperCase();

      const okQuery = !q || invoice.includes(q);
      const okMethod = txMethod === "all" || method === txMethod;
      const okStatus = txStatus === "all" || status === txStatus;
      return okQuery && okMethod && okStatus;
    });
  }, [transactions, txMethod, txQuery, txStatus]);

  useEffect(() => {
    if (data?.shift?.status !== "OPEN" && data?.shift?.status !== "ACTIVE") return;
    const timer = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [data?.shift?.status]);

  useEffect(() => {
    if (data?.shift?.status !== "OPEN" && data?.shift?.status !== "ACTIVE") return;
    const timer = window.setInterval(() => {
      refetch();
      refetchTx();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [data?.shift?.status, refetch, refetchTx]);

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-4 w-72" />
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-9 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 space-y-4">
        <div className="text-muted-foreground">Shift tidak ditemukan.</div>
        <Link href="/reports/shifts">
          <Button variant="outline">Kembali</Button>
        </Link>
      </div>
    );
  }

  const { shift, summary } = data;
  const shiftCode = (shift as any).shiftCode || `SHF-${shift.id}`;
  const approvalStatus = String((shift as any).approvalStatus ?? "NONE");
  const openedAt = shift.openedAt ? new Date(shift.openedAt as any) : null;
  const closedAt = shift.closedAt ? new Date(shift.closedAt as any) : null;
  const endAt = shift.status === "OPEN" || shift.status === "ACTIVE" ? new Date(nowTs) : (closedAt ?? new Date(nowTs));
  const duration = openedAt ? formatDuration(Math.abs(differenceInSeconds(endAt, openedAt))) : "-";
  const netRevenue = Number(summary.totalSales ?? 0) - Number(summary.totalRefunds ?? 0);
  const cashDiff = Number((shift as any).cashDifference ?? 0);

  return (
    <PageShell
      top={
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/reports">Laporan</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/reports/shifts">Shift</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Detail</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      }
      title={shiftCode}
      description={`${shift.userName} • ${shift.userRole} • ${shift.terminalName?.trim() ? shift.terminalName : "Terminal -"}`}
      headerRight={
        <>
          {shiftStatusBadge(shift.status)}
          {approvalBadge(approvalStatus)}
        </>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">{shiftCode}</h2>
              <div className="flex items-center gap-2">
                {shiftStatusBadge(shift.status)}
                {approvalBadge(approvalStatus)}
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500">
              {shift.userName} • {shift.userRole} • {shift.terminalName?.trim() ? shift.terminalName : "Terminal -"}
            </p>
            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-1">
              <div className="flex items-center gap-1">
                <CalendarClock className="w-3 h-3" />
                Buka: {openedAt ? format(openedAt, "dd MMM, HH:mm") : "-"}
              </div>
              {closedAt && (
                <div className="flex items-center gap-1">
                  <div className="h-1 w-1 rounded-full bg-slate-300" />
                  Tutup: {format(closedAt, "dd MMM, HH:mm")}
                </div>
              )}
              {duration !== "-" && (
                <div className="flex items-center gap-1">
                  <div className="h-1 w-1 rounded-full bg-slate-300" />
                  Durasi: {duration}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="h-11 px-6 rounded-xl font-bold border-slate-200 hover:bg-slate-50 transition-all gap-2"
              onClick={() => {
                const html = `
                  <h1>Laporan Shift</h1>
                  <div class="muted">${shiftCode} • ${String(shift.userName ?? "")} • ${String(shift.terminalName ?? "-")}</div>
                  <div class="muted">Dibuka: ${openedAt ? format(openedAt, "yyyy-MM-dd HH:mm:ss") : "-"} • Ditutup: ${closedAt ? format(closedAt, "yyyy-MM-dd HH:mm:ss") : "-"}</div>
                  <div class="grid">
                    <div class="card"><div class="muted">Kas awal</div><div><b>${formatCurrency(Number(shift.openingCash ?? 0))}</b></div></div>
                    <div class="card"><div class="muted">Kas sistem</div><div><b>${formatCurrency(Number(summary.expectedCash ?? 0))}</b></div></div>
                    <div class="card"><div class="muted">Kas akhir (input)</div><div><b>${formatCurrency(Number(shift.actualCash ?? 0))}</b></div></div>
                    <div class="card"><div class="muted">Selisih kas</div><div><b>${formatCurrency(Number(shift.cashDifference ?? 0))}</b></div></div>
                  </div>
                  <h2 style="margin:18px 0 6px 0;font-size:14px">Ringkasan</h2>
                  <table>
                    <thead><tr><th>Metrik</th><th class="right">Nilai</th></tr></thead>
                    <tbody>
                      <tr><td>Total penjualan</td><td class="right">${formatCurrency(Number(summary.totalSales ?? 0))}</td></tr>
                      <tr><td>Total pengembalian</td><td class="right">-${formatCurrency(Number(summary.totalRefunds ?? 0))}</td></tr>
                      <tr><td>Pendapatan bersih</td><td class="right">${formatCurrency(netRevenue)}</td></tr>
                      <tr><td>Total diskon</td><td class="right">-${formatCurrency(Number((summary as any).totalDiscount ?? 0))}</td></tr>
                      <tr><td>Total transaksi</td><td class="right">${Number(summary.totalTransactions ?? 0)}</td></tr>
                      <tr><td>Total retur</td><td class="right">${Number((summary as any).totalReturns ?? 0)}</td></tr>
                      <tr><td>Total pembatalan</td><td class="right">${Number((summary as any).totalVoid ?? 0)}</td></tr>
                    </tbody>
                  </table>
                `;
                printReport(`Laporan Shift ${shiftCode}`, html);
              }}
            >
              <Printer className="h-4 w-4" />
              Cetak / PDF
            </Button>

            <Button
              variant="outline"
              className="h-11 px-6 rounded-xl font-bold border-slate-200 hover:bg-slate-50 transition-all gap-2"
              onClick={() => {
                const rows: Array<Array<string | number>> = [];
                rows.push(["SHIFT_CODE", shiftCode]);
                rows.push(["KASIR", String(shift.userName ?? "")]);
                rows.push(["PERAN", String(shift.userRole ?? "")]);
                rows.push(["TERMINAL", String(shift.terminalName ?? "")]);
                rows.push(["JAM_BUKA", openedAt ? format(openedAt, "yyyy-MM-dd HH:mm:ss") : ""]);
                rows.push(["JAM_TUTUP", closedAt ? format(closedAt, "yyyy-MM-dd HH:mm:ss") : ""]);
                rows.push([]);
                rows.push(["RINGKASAN"]);
                rows.push(["Kas awal", Number(shift.openingCash ?? 0)]);
                rows.push(["Kas sistem", Number(summary.expectedCash ?? 0)]);
                rows.push(["Kas akhir (input)", Number(shift.actualCash ?? 0)]);
                rows.push(["Selisih kas", Number(shift.cashDifference ?? 0)]);
                rows.push(["Total penjualan", Number(summary.totalSales ?? 0)]);
                rows.push(["Total pengembalian", Number(summary.totalRefunds ?? 0)]);
                rows.push(["Pendapatan bersih", netRevenue]);
                rows.push(["Total diskon", Number((summary as any).totalDiscount ?? 0)]);
                rows.push(["Total poin dipakai", Number((summary as any).totalPointUsed ?? 0)]);
                rows.push(["Total poin didapat", Number((summary as any).totalPointEarned ?? 0)]);
                rows.push(["Transaksi", Number(summary.totalTransactions ?? 0)]);
                rows.push(["Retur", Number((summary as any).totalReturns ?? 0)]);
                rows.push(["Void", Number((summary as any).totalVoid ?? 0)]);
                rows.push([]);
                rows.push(["TRANSAKSI"]);
                rows.push(["No. invoice", "Tanggal", "Pembayaran", "Jumlah", "Status"]);
                (filteredTx ?? []).forEach((t: any) => rows.push([String(t.invoiceNo ?? ""), t.transactionDate ? new Date(t.transactionDate).toISOString() : "", String(t.paymentMethod ?? ""), Number(t.finalAmount ?? 0), String(t.status ?? "")]));
                downloadCsv(`shift_${shiftCode}_${Date.now()}.csv`, rows);
              }}
            >
              <FileDown className="h-4 w-4" />
              Ekspor CSV
            </Button>

            {approvalStatus === "PENDING" && (user?.role === "admin" || user?.role === "supervisor") ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="h-11 px-6 rounded-xl font-black bg-primary shadow-lg shadow-primary/20 gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    Setujui Selisih
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
                  <AlertDialogHeader className="p-8 bg-amber-50 border-b border-amber-100">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center shadow-sm text-amber-600">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <AlertDialogTitle className="text-xl font-black text-amber-900">Setujui Selisih Kas?</AlertDialogTitle>
                        <AlertDialogDescription className="text-xs font-medium text-amber-800/60 mt-1">
                          Konfirmasi persetujuan untuk selisih kas pada shift ini.
                        </AlertDialogDescription>
                      </div>
                    </div>
                  </AlertDialogHeader>
                  <div className="p-8 space-y-4">
                    <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100 text-sm text-amber-900">
                      Shift ini memiliki selisih <span className="font-black underline">{formatCurrency(cashDiff)}</span>.
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-600">Catatan Persetujuan (Opsional)</Label>
                      <Input
                        className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-all"
                        placeholder="Tambahkan keterangan..."
                        value={approvalNote}
                        onChange={(e) => setApprovalNote(e.target.value)}
                      />
                    </div>
                  </div>
                  <AlertDialogFooter className="p-6 bg-slate-50 border-t flex gap-3">
                    <AlertDialogCancel className="flex-1 font-bold h-12 rounded-xl border-none">Batal</AlertDialogCancel>
                    <AlertDialogAction
                      className="flex-[2] h-12 rounded-xl bg-primary font-black shadow-lg shadow-primary/20"
                      onClick={async () => {
                        try {
                          await approveShift.mutateAsync({ id: Number(shift.id), approvalNote: approvalNote.trim() ? approvalNote.trim() : undefined });
                          toast({ title: "Berhasil", description: "Shift telah disetujui oleh supervisor." });
                          setApprovalNote("");
                        } catch (e: any) {
                          toast({ variant: "destructive", title: "Gagal", description: e?.message || "Tidak bisa menyetujui shift." });
                        }
                      }}
                    >
                      Konfirmasi Setuju
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Penjualan</span>
                <div className="h-8 w-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                  <ReceiptText className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-800 tabular-nums">{formatCurrency(summary.totalSales)}</div>
              <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase">{summary.totalTransactions} Transaksi Sukses</div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pengembalian</span>
                <div className="h-8 w-8 rounded-xl bg-red-50 flex items-center justify-center text-red-500">
                  <RotateCcw className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-red-600 tabular-nums">-{formatCurrency(summary.totalRefunds)}</div>
              <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Tunai: -{formatCurrency(summary.cashRefunds)}</div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Net Revenue</span>
                <div className="h-8 w-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-700 tabular-nums">{formatCurrency(netRevenue)}</div>
              <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Diskon: -{formatCurrency(Number((summary as any).totalDiscount ?? 0))}</div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selisih Kas</span>
                <div className={cn(
                  "h-8 w-8 rounded-xl flex items-center justify-center",
                  cashDiff < 0 ? "bg-red-50 text-red-500" : cashDiff > 0 ? "bg-orange-50 text-orange-500" : "bg-emerald-50 text-emerald-500"
                )}>
                  <Banknote className="w-4 h-4" />
                </div>
              </div>
              <div className={cn("text-2xl font-black tabular-nums", cashDiff < 0 ? "text-red-600" : cashDiff > 0 ? "text-orange-700" : "text-emerald-700")}>
                {formatCurrency(cashDiff)}
              </div>
              <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Sistem: {formatCurrency(Number(summary.expectedCash ?? 0))}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden bg-white lg:col-span-1">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <UserRound className="w-4 h-4 text-primary" /> Identitas & Waktu
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">Kasir</span>
                  <span className="text-sm font-black text-slate-700">{shift.userName}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">Role</span>
                  <span className="text-sm font-bold text-slate-600">{shift.userRole}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">Terminal</span>
                  <span className="text-sm font-bold text-slate-600">{shift.terminalName?.trim() ? shift.terminalName : "-"}</span>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Waktu Buka</span>
                  <span className="text-xs font-bold text-slate-700">{openedAt ? format(openedAt, "dd/MM/yy HH:mm") : "-"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Waktu Tutup</span>
                  <span className="text-xs font-bold text-slate-700">
                    {shift.status === "OPEN" || shift.status === "ACTIVE" ? "Masih Aktif" : closedAt ? format(closedAt, "dd/MM/yy HH:mm") : "-"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden bg-white lg:col-span-2">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary" /> Rekonsiliasi Kas Akhir
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="p-5 rounded-3xl bg-blue-50/50 border border-blue-100 space-y-2">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Kas Awal (Modal)</p>
                    <p className="text-2xl font-black text-blue-700 tabular-nums">{formatCurrency(shift.openingCash as any)}</p>
                  </div>
                  <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100 space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estimasi Kas Sistem</p>
                    <p className="text-xl font-bold text-slate-700 tabular-nums">{formatCurrency(summary.expectedCash)}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="p-5 rounded-3xl bg-slate-900 text-white space-y-2 shadow-xl shadow-slate-200">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Input Kas Aktual</p>
                    <p className="text-2xl font-black tabular-nums">{formatCurrency((shift.actualCash ?? 0) as any)}</p>
                  </div>
                  <div className={cn(
                    "p-5 rounded-3xl border-2 flex flex-col justify-center gap-1",
                    Number(shift.cashDifference ?? 0) === 0 ? "bg-emerald-50 border-emerald-100" : 
                    Number(shift.cashDifference ?? 0) < 0 ? "bg-red-50 border-red-100" : "bg-orange-50 border-orange-100"
                  )}>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Selisih Kas</p>
                    <p className={cn(
                      "text-2xl font-black tabular-nums",
                      Number(shift.cashDifference ?? 0) < 0 ? "text-red-700" : 
                      Number(shift.cashDifference ?? 0) > 0 ? "text-orange-700" : "text-emerald-700"
                    )}>
                      {formatCurrency((shift.cashDifference ?? 0) as any)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="rounded-3xl border-slate-200 shadow-sm bg-white p-5 space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aktivitas Khusus</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-500">Total Retur</span>
                <Badge variant="secondary" className="font-black rounded-lg">{Number((summary as any).totalReturns ?? 0)}</Badge>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-500">Total Void</span>
                <Badge variant="secondary" className="font-black rounded-lg">{Number((summary as any).totalVoid ?? 0)}</Badge>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-500">Point Transaksi</span>
                <Badge variant="secondary" className="font-black rounded-lg">{Number((summary as any).pointTxCount ?? 0)}</Badge>
              </div>
            </div>
          </Card>

          <Card className="rounded-3xl border-slate-200 shadow-sm bg-white p-5 space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ringkasan Poin</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-500">Poin Dipakai</span>
                <span className="font-black text-red-600">{Number((summary as any).totalPointUsed ?? 0)} pts</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-500">Poin Didapat</span>
                <span className="font-black text-emerald-600">+{Number((summary as any).totalPointEarned ?? 0)} pts</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-500">Poin Dibatalkan</span>
                <span className="font-black text-slate-400">-{Number((summary as any).pointsReversed ?? 0)} pts</span>
              </div>
            </div>
          </Card>

          <Card className="rounded-3xl border-slate-200 shadow-sm bg-white p-5 space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Metode Pembayaran</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-500">Tunai (Sales)</span>
                <span className="font-black text-slate-700">{formatCurrency(Number(summary.cashSales ?? 0))}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-500">Non-Tunai</span>
                <span className="font-black text-slate-700">{formatCurrency(Number(summary.nonCashSales ?? 0))}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-500 text-red-500">Retur Tunai</span>
                <span className="font-black text-red-600">-{formatCurrency(Number(summary.cashRefunds ?? 0))}</span>
              </div>
            </div>
          </Card>

          <Card className="rounded-3xl border-slate-200 shadow-sm bg-white p-5 space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Catatan Shift</h4>
            <div className="space-y-2 overflow-hidden">
              <div className="space-y-1">
                <p className="text-[9px] font-bold text-slate-400 uppercase">Buka</p>
                <p className="text-xs font-medium text-slate-700 truncate">{(shift as any).note || "-"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-bold text-slate-400 uppercase">Tutup</p>
                <p className="text-xs font-medium text-slate-700 truncate">{(shift as any).closeNote || "-"}</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-base font-black text-slate-800 flex items-center gap-2">
                  <ReceiptText className="w-5 h-5 text-primary" /> Riwayat Transaksi Shift
                </CardTitle>
                <p className="text-xs font-medium text-slate-500">Menampilkan {filteredTx.length} dari {transactions?.length ?? 0} transaksi.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    className="h-10 pl-10 w-full sm:w-[200px] rounded-xl bg-white border-slate-200"
                    placeholder="Invoice..."
                    value={txQuery}
                    onChange={(e) => setTxQuery(e.target.value)}
                  />
                </div>
                <Select value={txMethod} onValueChange={(v) => setTxMethod(v)}>
                  <SelectTrigger className="h-10 w-[140px] rounded-xl bg-white border-slate-200">
                    <SelectValue placeholder="Metode" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                    <SelectItem value="all">Semua metode</SelectItem>
                    <SelectItem value="cash">Tunai</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="ewallet">E-wallet</SelectItem>
                    <SelectItem value="store_credit">Kredit toko</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={txStatus} onValueChange={(v) => setTxStatus(v as any)}>
                  <SelectTrigger className="h-10 w-[140px] rounded-xl bg-white border-slate-200">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                    <SelectItem value="all">Semua status</SelectItem>
                    <SelectItem value="COMPLETED">Selesai</SelectItem>
                    <SelectItem value="CANCELLED">Dibatalkan</SelectItem>
                    <SelectItem value="RETURN">Retur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingTx ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                      <TableHead className="font-bold text-slate-600 pl-6">Waktu</TableHead>
                      <TableHead className="font-bold text-slate-600">No. Invoice</TableHead>
                      <TableHead className="font-bold text-slate-600">Metode</TableHead>
                      <TableHead className="text-right font-bold text-slate-600">Nilai Transaksi</TableHead>
                      <TableHead className="text-right font-bold text-slate-600 pr-6">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTx.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center text-slate-400 font-medium">
                          Tidak ada transaksi ditemukan dengan filter tersebut.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTx.map((t) => {
                        const dt = t.transactionDate ? new Date(t.transactionDate as any) : null;
                        return (
                          <TableRow key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                            <TableCell className="pl-6 py-4 text-xs font-bold text-slate-500">
                              {dt ? format(dt, "HH:mm:ss") : "-"}
                              <span className="block text-[10px] font-normal text-slate-400">{dt ? format(dt, "dd MMM yyyy") : ""}</span>
                            </TableCell>
                            <TableCell className="font-black text-slate-800">{t.invoiceNo}</TableCell>
                            <TableCell className="font-bold text-slate-600">{formatPaymentMethod(t.paymentMethod)}</TableCell>
                            <TableCell className="text-right font-black text-slate-800 tabular-nums">{formatCurrency(t.finalAmount as any)}</TableCell>
                            <TableCell className="text-right pr-6">{txStatusBadge(String(t.status ?? "RETURN").toUpperCase())}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
