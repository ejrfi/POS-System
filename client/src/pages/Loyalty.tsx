import { useEffect, useState } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useCustomers, useCustomerPointHistory, useLoyaltySettings, useUpdateLoyaltySettings } from "@/hooks/use-others";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageShell } from "@/components/layout/PageShell";

const loyaltySchema = z.object({
  earnAmountPerPoint: z.coerce.number().min(1),
  redeemAmountPerPoint: z.coerce.number().min(1),
  silverMinSpending: z.coerce.number().min(0),
  goldMinSpending: z.coerce.number().min(0),
  platinumMinSpending: z.coerce.number().min(0),
  silverPointMultiplier: z.coerce.number().min(0),
  goldPointMultiplier: z.coerce.number().min(0),
  platinumPointMultiplier: z.coerce.number().min(0),
});

export default function Loyalty() {
  const { toast } = useToast();
  const { data: settings, isLoading: settingsLoading } = useLoyaltySettings();
  const { mutate: updateSettings, isPending: isSaving } = useUpdateLoyaltySettings();

  const form = useForm<z.infer<typeof loyaltySchema>>({
    resolver: zodResolver(loyaltySchema),
    defaultValues: {
      earnAmountPerPoint: 10000,
      redeemAmountPerPoint: 100,
      silverMinSpending: 1000000,
      goldMinSpending: 5000000,
      platinumMinSpending: 10000000,
      silverPointMultiplier: 1.0,
      goldPointMultiplier: 1.25,
      platinumPointMultiplier: 1.5,
    },
  });

  useEffect(() => {
    if (!settings) return;
    form.reset({
      earnAmountPerPoint: settings.earnAmountPerPoint,
      redeemAmountPerPoint: settings.redeemAmountPerPoint,
      silverMinSpending: settings.silverMinSpending,
      goldMinSpending: settings.goldMinSpending,
      platinumMinSpending: settings.platinumMinSpending,
      silverPointMultiplier: settings.silverPointMultiplier,
      goldPointMultiplier: settings.goldPointMultiplier,
      platinumPointMultiplier: settings.platinumPointMultiplier,
    });
  }, [settings, form]);

  const onSave = (data: z.infer<typeof loyaltySchema>) => {
    updateSettings(data, {
      onSuccess: () => toast({ title: "Berhasil", description: "Konfigurasi loyalty tersimpan" }),
      onError: () => toast({ variant: "destructive", title: "Gagal", description: "Gagal menyimpan konfigurasi" }),
    });
  };

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const customersQuery = useCustomers({
    search: debouncedSearch || undefined,
    status: "ACTIVE",
    page: 1,
    pageSize: 20,
    sortBy: "name",
    sortDir: "asc",
  });

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailCustomer, setDetailCustomer] = useState<any>(null);
  const pointsQuery = useCustomerPointHistory(detailCustomer?.id ?? null, { page: 1, pageSize: 50 });

  const openCustomer = (c: any) => {
    setDetailCustomer(c);
    setDetailOpen(true);
  };

  return (
    <PageShell
      title="Loyalti & Poin"
      description="Konfigurasi poin, tier, dan audit histori poin"
    >

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Konfigurasi</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSave)} className="grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="earnAmountPerPoint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Perolehan: Rp per 1 poin</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} disabled={settingsLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="redeemAmountPerPoint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Penukaran: Rp per 1 poin</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} disabled={settingsLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="silverMinSpending"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimal belanja Perak</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} disabled={settingsLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="goldMinSpending"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimal belanja Emas</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} disabled={settingsLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="platinumMinSpending"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimal belanja Platinum</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} disabled={settingsLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="silverPointMultiplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pengali poin Perak</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" {...field} disabled={settingsLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="goldPointMultiplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pengali poin Emas</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" {...field} disabled={settingsLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="platinumPointMultiplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pengali poin Platinum</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" {...field} disabled={settingsLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isSaving || settingsLoading}>
                  {isSaving ? "Menyimpan..." : "Simpan"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Histori Poin</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 bg-white rounded-lg border px-3">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari pelanggan (nama/nomor HP)..."
              className="border-none shadow-none focus-visible:ring-0 px-0"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead className="text-right">Poin</TableHead>
                  <TableHead className="text-right">Total Belanja</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customersQuery.isLoading ? (
                  <TableRow><TableCell colSpan={4} className="h-24 text-center">Memuat...</TableCell></TableRow>
                ) : (customersQuery.data?.items?.length ?? 0) > 0 ? (
                  customersQuery.data!.items.map((c: any) => (
                    <TableRow key={c.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => openCustomer(c)}>
                      <TableCell>
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.phone || "-"} · {c.customerType}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{c.tierLevel}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{Number(c.totalPoints ?? 0).toLocaleString("id-ID")}</TableCell>
                      <TableCell className="text-right">{Number(c.totalSpending ?? 0).toLocaleString("id-ID")}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">Tidak ada data</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Histori Poin</DialogTitle>
            <DialogDescription>{detailCustomer ? `${detailCustomer.name} · ${detailCustomer.phone || "-"}` : ""}</DialogDescription>
          </DialogHeader>

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

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
