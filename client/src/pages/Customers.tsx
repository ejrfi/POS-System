import { useEffect, useMemo, useState } from "react";
import {
  useCustomerPointHistory,
  useCustomerTransactions,
  useCustomers,
  useCreateCustomer,
  useDeleteCustomer,
  useUpdateCustomer,
} from "@/hooks/use-others";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Edit, Eye, Phone, Plus, Search, Trash2, User } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCustomerSchema } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { PageShell } from "@/components/layout/PageShell";

export default function Customers() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE" | "all">("all");
  const [tierLevel, setTierLevel] = useState<"REGULAR" | "SILVER" | "GOLD" | "PLATINUM" | "all">("all");
  const [customerType, setCustomerType] = useState<"regular" | "member" | "vip" | "all">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState<"createdAt" | "name" | "phone" | "totalPoints" | "totalSpending" | "tierLevel">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { data: customersResult, isLoading } = useCustomers({
    search: debouncedSearch || undefined,
    status: status === "all" ? undefined : status,
    tierLevel: tierLevel === "all" ? undefined : tierLevel,
    customerType: customerType === "all" ? undefined : customerType,
    page,
    pageSize,
    sortBy,
    sortDir,
  });
  const { mutate: createCustomer, isPending: isCreating } = useCreateCustomer();
  const { mutate: updateCustomer, isPending: isUpdating } = useUpdateCustomer();
  const { mutate: deleteCustomer, isPending: isDeleting } = useDeleteCustomer();
  const { toast } = useToast();

  const customerFormSchema = useMemo(
    () =>
      insertCustomerSchema.extend({
        email: z.string().email().optional().or(z.literal("")),
        address: z.string().optional().or(z.literal("")),
      }),
    [],
  );

  const form = useForm<z.infer<typeof customerFormSchema>>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
      customerType: "regular",
    },
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState<any>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailCustomer, setDetailCustomer] = useState<any>(null);
  const [txPage, setTxPage] = useState(1);
  const [pointsPage, setPointsPage] = useState(1);
  const txQuery = useCustomerTransactions(detailCustomer?.id ?? null, { page: txPage, pageSize: 10 });
  const pointsQuery = useCustomerPointHistory(detailCustomer?.id ?? null, { page: pointsPage, pageSize: 10 });

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, tierLevel, customerType, pageSize, sortBy, sortDir]);

  useEffect(() => {
    if (!formOpen) return;
    if (editingCustomer) {
      form.reset({
        name: editingCustomer.name ?? "",
        phone: editingCustomer.phone ?? "",
        email: editingCustomer.email ?? "",
        address: editingCustomer.address ?? "",
        customerType: (editingCustomer.customerType ?? "regular") as any,
      });
      return;
    }
    form.reset({ name: "", phone: "", email: "", address: "", customerType: "regular" as any });
  }, [editingCustomer, form, formOpen]);

  const onSubmit = (data: z.infer<typeof customerFormSchema>) => {
    const payload = {
      ...data,
      email: data.email?.trim() ? data.email.trim() : undefined,
      address: data.address?.trim() ? data.address.trim() : undefined,
      phone: data.phone?.trim() ? data.phone.trim() : undefined,
    };

    if (editingCustomer) {
      updateCustomer({ id: editingCustomer.id, ...payload } as any, {
        onSuccess: () => {
          setFormOpen(false);
          setEditingCustomer(null);
          toast({ title: "Berhasil", description: "Pelanggan berhasil diperbarui" });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Gagal", description: "Pelanggan gagal diperbarui" });
        }
      });
    } else {
      createCustomer(payload as any, {
        onSuccess: () => {
          setFormOpen(false);
          toast({ title: "Berhasil", description: "Pelanggan berhasil dibuat" });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Gagal", description: "Pelanggan gagal dibuat" });
        }
      });
    }
  };

  const handleEdit = (customer: any) => {
    setEditingCustomer(customer);
    setFormOpen(true);
  };

  const handleView = (customer: any) => {
    setDetailCustomer(customer);
    setTxPage(1);
    setPointsPage(1);
    setDetailOpen(true);
  };

  const handleCreate = () => {
    setEditingCustomer(null);
    setFormOpen(true);
  };

  const askDelete = (customer: any) => {
    setDeletingCustomer(customer);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!deletingCustomer) return;
    deleteCustomer(deletingCustomer.id, {
      onSuccess: () => {
        toast({ title: "Berhasil", description: "Pelanggan berhasil dinonaktifkan/dihapus" });
        setDeleteConfirmOpen(false);
        setDeletingCustomer(null);
      },
      onError: () => {
        toast({ variant: "destructive", title: "Gagal", description: "Pelanggan gagal dihapus" });
      },
    });
  };

  const items = customersResult?.items ?? [];
  const total = customersResult?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const tierBadge = (t: string | null | undefined) => {
    const v = String(t ?? "REGULAR");
    if (v === "PLATINUM") return <Badge className="bg-slate-900 text-white hover:bg-slate-900">Platinum</Badge>;
    if (v === "GOLD") return <Badge className="bg-amber-500 text-white hover:bg-amber-500">Emas</Badge>;
    if (v === "SILVER") return <Badge className="bg-slate-400 text-white hover:bg-slate-400">Perak</Badge>;
    return <Badge variant="secondary">Reguler</Badge>;
  };

  const statusBadge = (s: string | null | undefined) => {
    const v = String(s ?? "ACTIVE");
    if (v === "ACTIVE") return <Badge variant="success">Aktif</Badge>;
    return <Badge variant="destructive">Nonaktif</Badge>;
  };

  return (
    <PageShell
      title="Pelanggan"
      description="Kelola data pelanggan, tier, dan poin loyalti"
      headerRight={
        <Button onClick={handleCreate} className="shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4 mr-2" /> Tambah pelanggan
        </Button>
      }
    >

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pencarian & Filter</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-5">
            <div className="flex items-center gap-2 bg-white rounded-lg border px-3">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama / nomor HP..."
                className="border-none shadow-none focus-visible:ring-0 px-0"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="lg:col-span-2">
            <Select value={status} onValueChange={(v: any) => setStatus(v)}>
              <SelectTrigger className="bg-white">
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
            <Select value={tierLevel} onValueChange={(v: any) => setTierLevel(v)}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tier</SelectItem>
                <SelectItem value="REGULAR">Reguler</SelectItem>
                <SelectItem value="SILVER">Perak</SelectItem>
                <SelectItem value="GOLD">Emas</SelectItem>
                <SelectItem value="PLATINUM">Platinum</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="lg:col-span-2">
            <Select value={customerType} onValueChange={(v: any) => setCustomerType(v)}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                <SelectItem value="regular">Reguler</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="vip">VIP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="lg:col-span-1">
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="lg:col-span-12 flex flex-col md:flex-row gap-3 md:items-center md:justify-between pt-2">
            <div className="flex gap-3">
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="bg-white w-[220px]">
                  <SelectValue placeholder="Urutkan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Terbaru</SelectItem>
                  <SelectItem value="name">Nama</SelectItem>
                  <SelectItem value="phone">No HP</SelectItem>
                  <SelectItem value="totalPoints">Poin</SelectItem>
                  <SelectItem value="totalSpending">Total Belanja</SelectItem>
                  <SelectItem value="tierLevel">Tier</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortDir} onValueChange={(v: any) => setSortDir(v)}>
                <SelectTrigger className="bg-white w-[140px]">
                  <SelectValue placeholder="Arah" />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="desc">Menurun</SelectItem>
                <SelectItem value="asc">Menaik</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-sm text-muted-foreground">
              Total: <span className="font-medium text-foreground">{total}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pelanggan</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Poin</TableHead>
              <TableHead className="text-right">Total Belanja</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">Memuat...</TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Tidak ada pelanggan</TableCell>
              </TableRow>
            ) : (
              items.map((customer: any) => (
                <TableRow key={customer.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                        {String(customer.name ?? "").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium leading-5">{customer.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {customer.phone || "-"} · {customer.customerType || "reguler"}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{tierBadge(customer.tierLevel)}</TableCell>
                  <TableCell>{statusBadge(customer.status)}</TableCell>
                  <TableCell className="text-right font-medium">{Number(customer.totalPoints ?? 0).toLocaleString("id-ID")}</TableCell>
                  <TableCell className="text-right">{Number(customer.totalSpending ?? 0).toLocaleString("id-ID")}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleView(customer)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(customer)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700" onClick={() => askDelete(customer)} disabled={isDeleting}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Halaman <span className="font-medium text-foreground">{page}</span> dari <span className="font-medium text-foreground">{totalPages}</span>
        </div>

        <Pagination className="justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(1, p - 1)); }} />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink
                href="#"
                isActive
                onClick={(e) => { e.preventDefault(); }}
              >
                {page}
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setPage((p) => Math.min(totalPages, p + 1)); }} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? "Ubah pelanggan" : "Tambah pelanggan"}</DialogTitle>
            <DialogDescription>Data pelanggan digunakan untuk poin loyalti dan promo khusus member.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input className="pl-9" placeholder="Nama pelanggan" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>No HP</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input className="pl-9" placeholder="0812xxxx" {...field} value={field.value || ""} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customerType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipe pelanggan</FormLabel>
                      <Select value={String(field.value)} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih tipe" />
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

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (opsional)</FormLabel>
                    <FormControl>
                      <Input placeholder="email@domain.com" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alamat (opsional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Alamat pelanggan" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Batal</Button>
                <Button type="submit" disabled={isCreating || isUpdating}>
                  {editingCustomer ? "Simpan" : "Buat"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus pelanggan?</AlertDialogTitle>
            <AlertDialogDescription>
              Jika pelanggan sudah memiliki transaksi, sistem akan melakukan nonaktif (soft delete) agar audit tetap aman.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detail pelanggan</DialogTitle>
            <DialogDescription>
              {detailCustomer ? `${detailCustomer.name} · ${detailCustomer.phone || "-"}` : ""}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="transactions" className="w-full">
            <TabsList>
              <TabsTrigger value="transactions">Transaksi</TabsTrigger>
              <TabsTrigger value="points">Riwayat poin</TabsTrigger>
            </TabsList>

            <TabsContent value="transactions" className="mt-4">
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>No. invoice</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Metode</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {txQuery.isLoading ? (
                      <TableRow><TableCell colSpan={5} className="h-24 text-center">Memuat...</TableCell></TableRow>
                    ) : txQuery.data?.items?.length ? (
                      txQuery.data.items.map((s: any) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.invoiceNo}</TableCell>
                          <TableCell>{s.transactionDate ? new Date(s.transactionDate).toLocaleString("id-ID") : "-"}</TableCell>
                          <TableCell>{s.paymentMethod}</TableCell>
                          <TableCell className="text-right">{Number(s.finalAmount ?? 0).toLocaleString("id-ID")}</TableCell>
                          <TableCell>{s.status}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Tidak ada transaksi</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="points" className="mt-4">
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Deskripsi</TableHead>
                      <TableHead className="text-right">Poin didapat</TableHead>
                      <TableHead className="text-right">Poin dipakai</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pointsQuery.isLoading ? (
                      <TableRow><TableCell colSpan={4} className="h-24 text-center">Memuat...</TableCell></TableRow>
                    ) : pointsQuery.data?.items?.length ? (
                      pointsQuery.data.items.map((l: any) => (
                        <TableRow key={l.id}>
                          <TableCell>{l.createdAt ? new Date(l.createdAt).toLocaleString("id-ID") : "-"}</TableCell>
                          <TableCell className="max-w-[420px] truncate">{l.description}</TableCell>
                          <TableCell className="text-right">{Number(l.pointEarned ?? 0).toLocaleString("id-ID")}</TableCell>
                          <TableCell className="text-right">{Number(l.pointUsed ?? 0).toLocaleString("id-ID")}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">Tidak ada histori</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
