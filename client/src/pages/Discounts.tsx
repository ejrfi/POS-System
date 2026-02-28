import { useEffect, useMemo, useState } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useDiscountsPaged, useCreateDiscount, useDeleteDiscount, useUpdateDiscount } from "@/hooks/use-discounts";
import { useProducts, useBrands } from "@/hooks/use-products";
import { useCategories } from "@/hooks/use-others";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MoneyInput } from "@/components/MoneyInput";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { 
  Edit, 
  Plus, 
  Search, 
  Trash2, 
  Info, 
  Tag, 
  Target, 
  Layers, 
  Calendar, 
  Percent, 
  Banknote,
  LayoutGrid,
  List,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle
} from "lucide-react";
import { cn, digitsToNumber, formatCurrency } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertDiscountSchema } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { PageShell } from "@/components/layout/PageShell";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function Discounts() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE" | "all">("all");
  const [appliesTo, setAppliesTo] = useState<"product" | "category" | "global" | "customer" | "all">("all");
  const [activeOnly, setActiveOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState<"createdAt" | "name" | "priorityLevel" | "startDate" | "endDate">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  const { data: products } = useProducts();
  const { data: brands } = useBrands();
  const { data: categories } = useCategories();

  const { data: discountsResult, isLoading } = useDiscountsPaged({
    active: activeOnly ? true : undefined,
    search: debouncedSearch || undefined,
    status: status === "all" ? undefined : status,
    appliesTo: appliesTo === "all" ? undefined : appliesTo,
    page,
    pageSize,
    sortBy,
    sortDir,
  });

  const { mutate: createDiscount, isPending: isCreating } = useCreateDiscount();
  const { mutate: updateDiscount, isPending: isUpdating } = useUpdateDiscount();
  const { mutate: deleteDiscount, isPending: isDeleting } = useDeleteDiscount();
  const { toast } = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<any>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingDiscount, setDeletingDiscount] = useState<any>(null);

  const discountFormSchema = useMemo(
    () =>
      insertDiscountSchema.extend({
        value: z.coerce.number().min(0),
        minimumPurchase: z.coerce.number().min(0).default(0),
        priorityLevel: z.coerce.number().int().min(0).default(0),
        stackable: z.coerce.boolean().default(false),
        active: z.coerce.boolean().default(true),
        status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
        appliesTo: z.enum(["product", "category", "global", "customer"]).default("global"),
        startDate: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
        endDate: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
        productId: z.coerce.number().optional(),
        brandId: z.coerce.number().optional(),
        categoryId: z.coerce.number().optional(),
        customerType: z.enum(["regular", "member", "vip"]).optional(),
      }),
    [],
  );

  const form = useForm<z.infer<typeof discountFormSchema>>({
    resolver: zodResolver(discountFormSchema),
    defaultValues: {
      name: "",
      appliesTo: "global",
      type: "percentage",
      value: 0,
      minimumPurchase: 0,
      priorityLevel: 0,
      stackable: false,
      active: true,
      status: "ACTIVE",
      description: "",
      startDate: undefined,
      endDate: undefined,
      productId: undefined,
      brandId: undefined,
      categoryId: undefined,
      customerType: undefined,
    },
  });

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, appliesTo, activeOnly, pageSize, sortBy, sortDir]);

  useEffect(() => {
    if (!formOpen) return;
    if (editingDiscount) {
      form.reset({
        name: editingDiscount.name ?? "",
        appliesTo: (editingDiscount.appliesTo ?? "global") as any,
        type: editingDiscount.type ?? "percentage",
        value: Number(editingDiscount.value ?? 0),
        minimumPurchase: Number(editingDiscount.minimumPurchase ?? 0),
        priorityLevel: Number(editingDiscount.priorityLevel ?? 0),
        stackable: Boolean(editingDiscount.stackable),
        active: Boolean(editingDiscount.active),
        status: (editingDiscount.status ?? "ACTIVE") as any,
        description: editingDiscount.description ?? "",
        startDate: editingDiscount.startDate ? new Date(editingDiscount.startDate).toISOString().split("T")[0] as any : undefined,
        endDate: editingDiscount.endDate ? new Date(editingDiscount.endDate).toISOString().split("T")[0] as any : undefined,
        productId: editingDiscount.productId ?? undefined,
        brandId: editingDiscount.brandId ?? undefined,
        categoryId: editingDiscount.categoryId ?? undefined,
        customerType: editingDiscount.customerType ?? undefined,
      });
      return;
    }
    form.reset({
      name: "",
      appliesTo: "global",
      type: "percentage",
      value: 0,
      minimumPurchase: 0,
      priorityLevel: 0,
      stackable: false,
      active: true,
      status: "ACTIVE",
      description: "",
      startDate: undefined,
      endDate: undefined,
      productId: undefined,
      brandId: undefined,
      categoryId: undefined,
      customerType: undefined,
    });
  }, [editingDiscount, form, formOpen]);

  const submit = (data: z.infer<typeof discountFormSchema>) => {
    const payload: any = {
      ...data,
      value: String(data.value),
      minimumPurchase: String(data.minimumPurchase ?? 0),
      active: data.status === "ACTIVE" && data.active,
      productId: data.appliesTo === "product" ? data.productId : undefined,
      brandId: data.appliesTo === "product" ? data.brandId : undefined,
      categoryId: data.appliesTo === "category" ? data.categoryId : undefined,
      customerType: data.appliesTo === "customer" ? data.customerType : undefined,
    };

    if (payload.appliesTo === "product" && !payload.productId && !payload.brandId) {
      toast({ variant: "destructive", title: "Validasi", description: "Pilih Product atau Brand untuk diskon produk." });
      return;
    }
    if (payload.appliesTo === "category" && !payload.categoryId) {
      toast({ variant: "destructive", title: "Validasi", description: "Pilih kategori untuk diskon kategori." });
      return;
    }
    if (payload.appliesTo === "customer" && !payload.customerType) {
      toast({ variant: "destructive", title: "Validasi", description: "Pilih tipe pelanggan untuk diskon khusus." });
      return;
    }

    if (editingDiscount) {
      updateDiscount({ id: editingDiscount.id, ...payload }, {
        onSuccess: () => {
          setFormOpen(false);
          setEditingDiscount(null);
          toast({ title: "Berhasil", description: "Diskon berhasil diperbarui" });
        },
        onError: () => toast({ variant: "destructive", title: "Gagal", description: "Diskon gagal diperbarui" }),
      });
      return;
    }

    createDiscount(payload, {
      onSuccess: () => {
        setFormOpen(false);
        toast({ title: "Berhasil", description: "Diskon berhasil dibuat" });
      },
      onError: () => toast({ variant: "destructive", title: "Gagal", description: "Diskon gagal dibuat" }),
    });
  };

  const handleCreate = () => {
    setEditingDiscount(null);
    setFormOpen(true);
  };

  const handleEdit = (d: any) => {
    setEditingDiscount(d);
    setFormOpen(true);
  };

  const askDelete = (d: any) => {
    setDeletingDiscount(d);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!deletingDiscount) return;
    deleteDiscount(deletingDiscount.id, {
      onSuccess: () => {
        toast({ title: "Berhasil", description: "Diskon berhasil dihapus" });
        setDeleteConfirmOpen(false);
        setDeletingDiscount(null);
      },
      onError: () => toast({ variant: "destructive", title: "Gagal", description: "Diskon gagal dihapus" }),
    });
  };

  const items = discountsResult?.items ?? [];
  const total = discountsResult?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const now = Date.now();
  const getStatusInfo = (d: any) => {
    const start = d.startDate ? new Date(d.startDate).getTime() : null;
    const end = d.endDate ? new Date(d.endDate).getTime() : null;
    const expired = end != null && end < now;
    
    if (expired) return { 
      label: "Kedaluwarsa", 
      variant: "secondary" as const, 
      icon: XCircle,
      className: "bg-slate-100 text-slate-600 border-slate-200"
    };
    if (d.status === "INACTIVE" || d.active === false) return { 
      label: "Nonaktif", 
      variant: "destructive" as const, 
      icon: AlertCircle,
      className: "bg-red-50 text-red-600 border-red-100"
    };
    if (start != null && start > now) return { 
      label: "Terjadwal", 
      variant: "secondary" as const, 
      icon: Clock,
      className: "bg-blue-50 text-blue-600 border-blue-100"
    };
    return { 
      label: "Aktif", 
      variant: "success" as const, 
      icon: CheckCircle2,
      className: "bg-emerald-50 text-emerald-600 border-emerald-100"
    };
  };

  return (
    <PageShell
      title="Diskon & Promosi"
      description="Kelola aturan diskon untuk produk, kategori, atau transaksi global."
      headerRight={
        <div className="flex items-center gap-2">
          <div className="flex bg-muted p-1 rounded-lg mr-2">
            <Button 
              variant={viewMode === "table" ? "white" : "ghost"} 
              size="icon" 
              className="h-8 w-8 shadow-none"
              onClick={() => setViewMode("table")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button 
              variant={viewMode === "grid" ? "white" : "ghost"} 
              size="icon" 
              className="h-8 w-8 shadow-none"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={handleCreate} className="shadow-lg shadow-primary/20 bg-gradient-to-r from-primary to-primary/90">
            <Plus className="w-4 h-4 mr-2" /> Tambah Diskon
          </Button>
        </div>
      }
    >

      <Card className="border-none shadow-sm bg-slate-50/50">
        <CardContent className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama diskon..."
                className="pl-9 bg-white border-slate-200 focus:border-primary transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="lg:col-span-2">
            <Select value={status} onValueChange={(v: any) => setStatus(v)}>
              <SelectTrigger className="bg-white border-slate-200">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="ACTIVE">Aktif</SelectItem>
                <SelectItem value="INACTIVE">Nonaktif</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="lg:col-span-2">
            <Select value={appliesTo} onValueChange={(v: any) => setAppliesTo(v)}>
              <SelectTrigger className="bg-white border-slate-200">
                <SelectValue placeholder="Berlaku" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Target</SelectItem>
                <SelectItem value="global">Global</SelectItem>
                <SelectItem value="product">Produk</SelectItem>
                <SelectItem value="category">Kategori</SelectItem>
                <SelectItem value="customer">Pelanggan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="lg:col-span-2 flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 h-10">
            <span className="text-sm font-medium text-slate-600">Hanya Aktif</span>
            <Switch checked={activeOnly} onCheckedChange={setActiveOnly} />
          </div>

          <div className="lg:col-span-2">
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="bg-white border-slate-200">
                <SelectValue placeholder="Urutkan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Terbaru</SelectItem>
                <SelectItem value="name">Nama</SelectItem>
                <SelectItem value="priorityLevel">Prioritas</SelectItem>
                <SelectItem value="startDate">Mulai</SelectItem>
                <SelectItem value="endDate">Berakhir</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : items.length === 0 ? (
        <Card className="border-dashed h-64 flex flex-col items-center justify-center text-muted-foreground">
          <Tag className="w-12 h-12 mb-4 opacity-20" />
          <p>Tidak ada data diskon ditemukan</p>
          <Button variant="link" onClick={handleCreate}>Buat diskon pertama Anda</Button>
        </Card>
      ) : viewMode === "table" ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="w-[300px]">Diskon</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Nilai</TableHead>
                <TableHead className="text-right">Prioritas</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((d: any) => {
                const statusInfo = getStatusInfo(d);
                return (
                  <TableRow key={d.id} className="hover:bg-slate-50/50 transition-colors group">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900">{d.name}</span>
                        <span className="text-xs text-slate-500 line-clamp-1">{d.description || "Tanpa deskripsi"}</span>
                        <div className="flex items-center gap-3 mt-1.5">
                          {d.stackable && (
                            <Badge variant="outline" className="text-[10px] h-4 bg-purple-50 text-purple-600 border-purple-100">
                              <Layers className="w-2.5 h-2.5 mr-1" /> Gabung
                            </Badge>
                          )}
                          <div className="flex items-center text-[10px] text-slate-400">
                            <Calendar className="w-2.5 h-2.5 mr-1" />
                            {d.startDate ? new Date(d.startDate).toLocaleDateString("id-ID") : "∞"} - {d.endDate ? new Date(d.endDate).toLocaleDateString("id-ID") : "∞"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-slate-100 text-slate-600">
                          {d.appliesTo === "product" ? <Banknote className="w-3.5 h-3.5" /> : 
                           d.appliesTo === "category" ? <LayoutGrid className="w-3.5 h-3.5" /> : 
                           d.appliesTo === "customer" ? <Target className="w-3.5 h-3.5" /> : 
                           <LayoutGrid className="w-3.5 h-3.5" />}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-medium capitalize">{d.appliesTo}</span>
                          <span className="text-[10px] text-slate-500">
                            {d.appliesTo === "product" ? (d.productId ? `Produk #${d.productId}` : d.brandId ? `Merek #${d.brandId}` : "Semua Produk") :
                             d.appliesTo === "category" ? (d.categoryId ? `Kategori #${d.categoryId}` : "Semua Kategori") :
                             d.appliesTo === "customer" ? (d.customerType || "Semua Pelanggan") : "Transaksi"}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">
                          {d.type === "percentage" ? `${Number(d.value ?? 0)}%` : formatCurrency(Number(d.value ?? 0))}
                        </span>
                        {Number(d.minimumPurchase ?? 0) > 0 && (
                          <span className="text-[10px] text-slate-500">Min. {formatCurrency(Number(d.minimumPurchase))}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-[11px] font-bold text-slate-600">
                        {d.priorityLevel || 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("px-2 py-0 h-6 text-[11px] font-medium border", statusInfo.className)}>
                        <statusInfo.icon className="w-3 h-3 mr-1" />
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100" onClick={() => handleEdit(d)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => askDelete(d)} disabled={isDeleting}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((d: any) => {
            const statusInfo = getStatusInfo(d);
            return (
              <Card key={d.id} className="overflow-hidden hover:shadow-md transition-shadow group border-slate-200">
                <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
                  <div className="flex flex-col gap-1">
                    <Badge className={cn("w-fit px-2 py-0 h-5 text-[10px] font-medium border", statusInfo.className)}>
                      <statusInfo.icon className="w-2.5 h-2.5 mr-1" />
                      {statusInfo.label}
                    </Badge>
                    <CardTitle className="text-lg font-bold text-slate-900">{d.name}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(d)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => askDelete(d)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-4">
                  <p className="text-xs text-slate-500 line-clamp-2 min-h-[2rem]">{d.description || "Tidak ada deskripsi tersedia untuk aturan diskon ini."}</p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-500 block mb-0.5">Besar Diskon</span>
                      <span className="text-sm font-bold text-primary">
                        {d.type === "percentage" ? `${Number(d.value ?? 0)}%` : formatCurrency(Number(d.value ?? 0))}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-500 block mb-0.5">Target</span>
                      <span className="text-sm font-bold text-slate-700 capitalize">{d.appliesTo}</span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 flex items-center"><Layers className="w-3 h-3 mr-1.5" /> Dapat Digabung</span>
                      <span className={cn("font-medium", d.stackable ? "text-emerald-600" : "text-slate-400")}>
                        {d.stackable ? "Ya" : "Tidak"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 flex items-center"><Calendar className="w-3 h-3 mr-1.5" /> Periode</span>
                      <span className="font-medium text-slate-700">
                        {d.startDate ? new Date(d.startDate).toLocaleDateString("id-ID") : "∞"} - {d.endDate ? new Date(d.endDate).toLocaleDateString("id-ID") : "∞"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between py-4">
        <div className="text-sm text-slate-500">
          Menampilkan <span className="font-bold text-slate-900">{items.length}</span> dari <span className="font-bold text-slate-900">{total}</span> diskon
        </div>
        <Pagination className="justify-end w-auto">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                href="#" 
                onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(1, p - 1)); }} 
                className={cn(page === 1 && "pointer-events-none opacity-50")}
              />
            </PaginationItem>
            <PaginationItem>
              <div className="flex items-center px-4 text-sm font-medium">
                Hal {page} dari {totalPages}
              </div>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext 
                href="#" 
                onClick={(e) => { e.preventDefault(); setPage((p) => Math.min(totalPages, p + 1)); }}
                className={cn(page === totalPages && "pointer-events-none opacity-50")}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-primary px-6 py-8 text-white relative">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Percent className="w-32 h-32 rotate-12" />
            </div>
            <DialogTitle className="text-2xl font-bold mb-1">
              {editingDiscount ? "Ubah Aturan Diskon" : "Buat Aturan Diskon"}
            </DialogTitle>
            <DialogDescription className="text-primary-foreground/80">
              Atur parameter promosi Anda. Diskon akan otomatis dihitung saat checkout.
            </DialogDescription>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(submit)} className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary font-bold text-sm mb-4 border-b pb-2">
                  <Info className="w-4 h-4" /> Informasi Dasar
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nama Diskon</FormLabel>
                        <FormControl>
                          <Input placeholder="Contoh: Diskon Ramadhan" className="bg-slate-50 focus:bg-white transition-colors" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="appliesTo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Diskon</FormLabel>
                        <Select value={String(field.value)} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="bg-slate-50">
                              <SelectValue placeholder="Pilih target" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="global">
                              <div className="flex items-center"><Banknote className="w-4 h-4 mr-2" /> Global (Seluruh Transaksi)</div>
                            </SelectItem>
                            <SelectItem value="product">
                              <div className="flex items-center"><Tag className="w-4 h-4 mr-2" /> Produk / Merek Spesifik</div>
                            </SelectItem>
                            <SelectItem value="category">
                              <div className="flex items-center"><LayoutGrid className="w-4 h-4 mr-2" /> Kategori Tertentu</div>
                            </SelectItem>
                            <SelectItem value="customer">
                              <div className="flex items-center"><Target className="w-4 h-4 mr-2" /> Tipe Pelanggan</div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {form.watch("appliesTo") === "product" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <FormField
                      control={form.control}
                      name="productId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Pilih Produk</FormLabel>
                          <Select
                            value={field.value != null ? String(field.value) : ""}
                            onValueChange={(v) => field.onChange(v === "__clear__" ? undefined : Number(v))}
                          >
                            <FormControl>
                              <SelectTrigger className="bg-white h-9">
                                <SelectValue placeholder="Pilih produk..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="__clear__">Semua Produk</SelectItem>
                              {products?.map((p: any) => (
                                <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="brandId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Pilih Merek</FormLabel>
                          <Select
                            value={field.value != null ? String(field.value) : ""}
                            onValueChange={(v) => field.onChange(v === "__clear__" ? undefined : Number(v))}
                          >
                            <FormControl>
                              <SelectTrigger className="bg-white h-9">
                                <SelectValue placeholder="Pilih merek..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="__clear__">Semua Merek</SelectItem>
                              {brands?.map((b: any) => (
                                <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {form.watch("appliesTo") === "category" && (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <FormField
                      control={form.control}
                      name="categoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Target Kategori</FormLabel>
                          <Select value={field.value != null ? String(field.value) : ""} onValueChange={(v) => field.onChange(v ? Number(v) : undefined)}>
                            <FormControl>
                              <SelectTrigger className="bg-white h-9">
                                <SelectValue placeholder="Pilih kategori..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories?.map((c: any) => (
                                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {form.watch("appliesTo") === "customer" && (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <FormField
                      control={form.control}
                      name="customerType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Tipe Pelanggan</FormLabel>
                          <Select value={field.value ?? ""} onValueChange={(v) => field.onChange(v || undefined)}>
                            <FormControl>
                              <SelectTrigger className="bg-white h-9">
                                <SelectValue placeholder="Pilih tipe..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="regular">Reguler</SelectItem>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="vip">VIP</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 text-primary font-bold text-sm mb-4 border-b pb-2">
                  <Percent className="w-4 h-4" /> Nilai & Kondisi
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipe Diskon</FormLabel>
                        <Select value={String(field.value)} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="bg-slate-50">
                              <SelectValue placeholder="Pilih tipe" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="percentage">Persentase (%)</SelectItem>
                            <SelectItem value="fixed">Nominal (Rp)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Besar Diskon</FormLabel>
                        <FormControl>
                          {form.watch("type") === "percentage" ? (
                            <div className="relative">
                              <Input type="number" min="0" max="100" className="bg-slate-50 pr-8" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">%</span>
                            </div>
                          ) : (
                            <MoneyInput
                              className="bg-slate-50"
                              valueDigits={field.value != null ? String(field.value) : ""}
                              onValueDigitsChange={(digits) => field.onChange(digitsToNumber(digits))}
                            />
                          )}
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="minimumPurchase"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Min. Pembelian</FormLabel>
                        <FormControl>
                          <MoneyInput
                            className="bg-slate-50"
                            valueDigits={field.value != null ? String(field.value) : ""}
                            onValueDigitsChange={(digits) => field.onChange(digitsToNumber(digits))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary font-bold text-sm mb-4 border-b pb-2">
                    <Layers className="w-4 h-4" /> Prioritas & Gabungan
                  </div>
                  
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="priorityLevel"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between mb-1">
                            <FormLabel className="m-0">Prioritas (0-99)</FormLabel>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>Angka lebih tinggi dihitung lebih dulu</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <FormControl>
                            <Input type="number" min="0" max="99" className="bg-slate-50" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="stackable"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-xl border border-slate-200 p-4 bg-slate-50/50 hover:bg-white transition-colors">
                          <div className="space-y-1 pr-4">
                            <FormLabel className="text-sm font-bold flex items-center">
                              Dapat Digabung? 
                              <Badge variant="secondary" className="ml-2 h-4 text-[9px] px-1 bg-purple-100 text-purple-700">Penting</Badge>
                            </FormLabel>
                            <div className="text-[10px] text-slate-500 leading-tight">
                              Jika aktif, diskon ini bisa dikombinasikan dengan diskon lain yang juga memiliki fitur ini.
                            </div>
                          </div>
                          <FormControl>
                            <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary font-bold text-sm mb-4 border-b pb-2">
                    <Calendar className="w-4 h-4" /> Masa Berlaku
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Tanggal Mulai</FormLabel>
                          <FormControl>
                            <Input type="date" className="bg-slate-50 h-9" {...field} value={field.value as any || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Tanggal Akhir</FormLabel>
                          <FormControl>
                            <Input type="date" className="bg-slate-50 h-9" {...field} value={field.value as any || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Status Awal</FormLabel>
                        <Select value={String(field.value)} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="bg-slate-50 h-9">
                              <SelectValue placeholder="Pilih status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ACTIVE">Aktif Langsung</SelectItem>
                            <SelectItem value="INACTIVE">Nonaktif (Draft)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="pt-4 border-t flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setFormOpen(false)} className="hover:bg-slate-100">
                  Batal
                </Button>
                <Button type="submit" disabled={isCreating || isUpdating} className="px-8 shadow-lg shadow-primary/20 bg-gradient-to-r from-primary to-primary/90">
                  {editingDiscount ? "Simpan Perubahan" : "Buat Aturan Diskon"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-red-600">
              <Trash2 className="w-5 h-5 mr-2" /> Hapus Aturan Diskon?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Diskon "{deletingDiscount?.name}" akan dihapus permanen dari sistem dan tidak akan berlaku lagi untuk transaksi mendatang.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-slate-200">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 rounded-xl px-6">Hapus Permanen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
