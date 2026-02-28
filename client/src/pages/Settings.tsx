import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store, User, Shield, Save, Monitor, Loader2, LogOut, Plus, Search, Edit, Trash2, Users, Coins, TrendingUp, Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppSettings, useCreateUser, useDeleteUser, useUpdateAppSettings, useUpdateUser, useUsers, useLoyaltySettings, useUpdateLoyaltySettings } from "@/hooks/use-others";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import { PageShell } from "@/components/layout/PageShell";

export default function Settings() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const { data: appSettings, isLoading: appSettingsLoading } = useAppSettings();
  const { mutate: saveAppSettings, isPending: isSavingAppSettings } = useUpdateAppSettings();
  const { data: loyaltySettings, isLoading: loyaltyLoading } = useLoyaltySettings();
  const { mutate: updateLoyalty, isPending: isSavingLoyalty } = useUpdateLoyaltySettings();

  const isAdmin = user?.role === "admin";
  const [activeSection, setActiveSection] = useState<"account" | "store" | "terminal" | "users" | "loyalty">("account");

  const [storeName, setStoreName] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [receiptFooter, setReceiptFooter] = useState("");
  const [terminalName, setTerminalName] = useState("");

  // Loyalty states
  const [earnAmount, setEarnAmount] = useState("");
  const [redeemAmountValue, setRedeemAmountValue] = useState("");
  const [silverMin, setSilverMin] = useState("");
  const [goldMin, setGoldMin] = useState("");
  const [platinumMin, setPlatinumMin] = useState("");
  const [silverMult, setSilverMult] = useState("");
  const [goldMult, setGoldMult] = useState("");
  const [platinumMult, setPlatinumMult] = useState("");

  const [usersSearch, setUsersSearch] = useState("");
  const debouncedUsersSearch = useDebouncedValue(usersSearch, 300);
  const usersQuery = useUsers(
    { search: debouncedUsersSearch.trim() ? debouncedUsersSearch.trim() : undefined },
    { enabled: isAdmin && activeSection === "users" },
  );
  const users = usersQuery.data ?? [];
  const { mutate: createUser, isPending: isCreatingUser } = useCreateUser();
  const { mutate: updateUser, isPending: isUpdatingUser } = useUpdateUser();
  const { mutate: deleteUser, isPending: isDeletingUser } = useDeleteUser();

  const userFormSchema = z.object({
    username: z.string().min(1).max(255),
    fullName: z.string().min(1).max(255),
    role: z.enum(["admin", "supervisor", "cashier"]),
    password: z.string().max(255).optional().or(z.literal("")),
  });

  const userForm = useForm<z.infer<typeof userFormSchema>>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      fullName: "",
      role: "cashier",
      password: "",
    },
  });

  const [userFormOpen, setUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [deleteUserOpen, setDeleteUserOpen] = useState(false);
  const [deletingUserRow, setDeletingUserRow] = useState<any>(null);

  useEffect(() => {
    if (!appSettings) return;
    setStoreName(appSettings.storeName ?? "");
    setStoreAddress(appSettings.storeAddress ?? "");
    setReceiptFooter(appSettings.receiptFooter ?? "");
  }, [appSettings]);

  useEffect(() => {
    if (!loyaltySettings) return;
    setEarnAmount(String(loyaltySettings.earnAmountPerPoint || "10000"));
    setRedeemAmountValue(String(loyaltySettings.redeemAmountPerPoint || "100"));
    setSilverMin(String(loyaltySettings.silverMinSpending || "1000000"));
    setGoldMin(String(loyaltySettings.goldMinSpending || "5000000"));
    setPlatinumMin(String(loyaltySettings.platinumMinSpending || "10000000"));
    setSilverMult(String(loyaltySettings.silverPointMultiplier || "1.00"));
    setGoldMult(String(loyaltySettings.goldPointMultiplier || "1.25"));
    setPlatinumMult(String(loyaltySettings.platinumPointMultiplier || "1.50"));
  }, [loyaltySettings]);

  const handleSaveLoyalty = () => {
    updateLoyalty({
      earnAmountPerPoint: earnAmount,
      redeemAmountPerPoint: redeemAmountValue,
      silverMinSpending: silverMin,
      goldMinSpending: goldMin,
      platinumMinSpending: platinumMin,
      silverPointMultiplier: silverMult,
      goldPointMultiplier: goldMult,
      platinumPointMultiplier: platinumMult,
    }, {
      onSuccess: () => toast({ title: "Berhasil", description: "Pengaturan loyalty berhasil disimpan" }),
      onError: (err: any) => toast({ variant: "destructive", title: "Gagal", description: err?.message || "Gagal menyimpan loyalty" }),
    });
  };

  useEffect(() => {
    const saved = localStorage.getItem("pos_terminal_name");
    if (saved) setTerminalName(saved);
  }, []);

  const handleSaveStore = () => {
    const name = storeName.trim();
    if (!name) {
      toast({ variant: "destructive", title: "Nama toko wajib diisi" });
      return;
    }
    saveAppSettings(
      {
        storeName: name,
        storeAddress: storeAddress.trim() ? storeAddress.trim() : null,
        receiptFooter: receiptFooter.trim() ? receiptFooter.trim() : null,
      },
      {
        onSuccess: () => toast({ title: "Berhasil", description: "Konfigurasi toko tersimpan" }),
        onError: () => toast({ variant: "destructive", title: "Gagal", description: "Gagal menyimpan konfigurasi toko" }),
      },
    );
  };

  const handleSaveTerminal = () => {
    const t = terminalName.trim();
    if (!t) {
      toast({ variant: "destructive", title: "Nama terminal wajib diisi" });
      return;
    }
    localStorage.setItem("pos_terminal_name", t);
    toast({ title: "Berhasil", description: "Nama terminal tersimpan di device ini" });
  };

  useEffect(() => {
    if (!userFormOpen) return;
    if (editingUser) {
      userForm.reset({
        username: String(editingUser.username ?? ""),
        fullName: String(editingUser.fullName ?? ""),
        role: (String(editingUser.role ?? "cashier") as any) || "cashier",
        password: "",
      });
      return;
    }
    userForm.reset({ username: "", fullName: "", role: "cashier", password: "" });
  }, [editingUser, userForm, userFormOpen]);

  const submitUser = (data: z.infer<typeof userFormSchema>) => {
    const username = data.username.trim();
    const fullName = data.fullName.trim();
    const passwordRaw = data.password?.trim() ? data.password.trim() : "";

    if (!username || !fullName) return;
    if (!editingUser && !passwordRaw) {
      toast({ variant: "destructive", title: "Password wajib diisi" });
      return;
    }

    if (editingUser) {
      updateUser(
        {
          id: Number(editingUser.id),
          username,
          fullName,
          role: data.role,
          ...(passwordRaw ? { password: passwordRaw } : {}),
        } as any,
        {
          onSuccess: () => {
            setUserFormOpen(false);
            setEditingUser(null);
            toast({ title: "Berhasil", description: "User berhasil diperbarui" });
          },
          onError: (err: any) => {
            toast({ variant: "destructive", title: "Gagal", description: err?.message || "User gagal diperbarui" });
          },
        },
      );
      return;
    }

    createUser(
      { username, fullName, role: data.role, password: passwordRaw },
      {
        onSuccess: () => {
          setUserFormOpen(false);
          toast({ title: "Berhasil", description: "User berhasil dibuat" });
        },
        onError: (err: any) => {
          toast({ variant: "destructive", title: "Gagal", description: err?.message || "User gagal dibuat" });
        },
      },
    );
  };

  const openCreateUser = () => {
    setEditingUser(null);
    setUserFormOpen(true);
  };

  const openEditUser = (row: any) => {
    setEditingUser(row);
    setUserFormOpen(true);
  };

  const askDeleteUser = (row: any) => {
    setDeletingUserRow(row);
    setDeleteUserOpen(true);
  };

  const confirmDeleteUser = () => {
    if (!deletingUserRow) return;
    deleteUser(Number(deletingUserRow.id), {
      onSuccess: () => {
        toast({ title: "Berhasil", description: "User berhasil dihapus" });
        setDeleteUserOpen(false);
        setDeletingUserRow(null);
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Gagal", description: err?.message || "User gagal dihapus" });
      },
    });
  };

  const roleBadge = (role: string) => {
    const r = String(role || "cashier");
    if (r === "admin") return <Badge className="bg-slate-900 text-white hover:bg-slate-900">Admin</Badge>;
    if (r === "supervisor") return <Badge className="bg-indigo-600 text-white hover:bg-indigo-600">Supervisor</Badge>;
    return <Badge variant="secondary">Kasir</Badge>;
  };

  return (
    <PageShell
      title="Pengaturan"
      description="Pusat konfigurasi sistem POS: akun, toko & struk, terminal, dan kontrol akses."
      headerRight={
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="px-3 py-1 bg-primary/10 text-primary border-none font-bold uppercase tracking-wider text-[10px]">
            {user?.role ?? "-"}
          </Badge>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => logout()} 
            className="text-red-500 hover:text-red-600 hover:bg-red-50 font-bold rounded-xl h-10 px-4"
          >
            <LogOut className="w-4 h-4 mr-2" /> Keluar
          </Button>
        </div>
      }
    >
      <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as any)} className="w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-4 pb-2">
                <Avatar className="h-12 w-12 border-2 border-primary/10 shadow-sm">
                  <AvatarFallback className="bg-primary/5 text-primary font-black text-lg">
                    {(user?.fullName || user?.username || "U").slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="text-sm font-black text-slate-800 truncate">{user?.fullName || user?.username || "-"}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">ID: {user?.id ?? "-"}</div>
                </div>
              </div>

              <div className="space-y-1">
                <p className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Menu Utama</p>
                <TabsList className="w-full h-auto flex flex-col items-stretch bg-transparent p-0 gap-1.5">
                  <TabsTrigger
                    value="account"
                    className={cn(
                      "w-full justify-start gap-3 rounded-xl px-4 py-3 font-bold transition-all border border-transparent",
                      "data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:border-primary/10 data-[state=active]:shadow-none",
                      "hover:bg-slate-50 text-slate-500"
                    )}
                  >
                    <User className="w-4 h-4" />
                    Profil Akun
                  </TabsTrigger>
                  <TabsTrigger
                    value="store"
                    className={cn(
                      "w-full justify-start gap-3 rounded-xl px-4 py-3 font-bold transition-all border border-transparent",
                      "data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:border-primary/10 data-[state=active]:shadow-none",
                      "hover:bg-slate-50 text-slate-500"
                    )}
                  >
                    <Store className="w-4 h-4" />
                    Toko & Struk
                  </TabsTrigger>
                  <TabsTrigger
                    value="terminal"
                    className={cn(
                      "w-full justify-start gap-3 rounded-xl px-4 py-3 font-bold transition-all border border-transparent",
                      "data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:border-primary/10 data-[state=active]:shadow-none",
                      "hover:bg-slate-50 text-slate-500"
                    )}
                  >
                    <Monitor className="w-4 h-4" />
                    Terminal Lokal
                  </TabsTrigger>
                  {isAdmin ? (
                    <>
                      <TabsTrigger
                        value="loyalty"
                        className={cn(
                          "w-full justify-start gap-3 rounded-xl px-4 py-3 font-bold transition-all border border-transparent",
                          "data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:border-primary/10 data-[state=active]:shadow-none",
                          "hover:bg-slate-50 text-slate-500"
                        )}
                      >
                        <Coins className="w-4 h-4" />
                        Loyalty & Poin
                      </TabsTrigger>
                      <TabsTrigger
                        value="users"
                        className={cn(
                          "w-full justify-start gap-3 rounded-xl px-4 py-3 font-bold transition-all border border-transparent",
                          "data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:border-primary/10 data-[state=active]:shadow-none",
                          "hover:bg-slate-50 text-slate-500"
                        )}
                      >
                        <Users className="w-4 h-4" />
                        Manajemen User
                      </TabsTrigger>
                    </>
                  ) : null}
                </TabsList>
              </div>
            </div>

            <div className="bg-gradient-to-br from-primary to-blue-600 rounded-3xl p-6 text-white shadow-xl shadow-primary/20 overflow-hidden relative">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
              <div className="relative z-10 space-y-4">
                <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Butuh Bantuan?</h4>
                  <p className="text-xs text-white/70 mt-1 leading-relaxed">Hubungi administrator jika Anda memerlukan akses tambahan atau mengalami kendala teknis.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-9 animate-in fade-in slide-in-from-right-4 duration-500">
            <TabsContent value="account" className="mt-0 focus-visible:ring-0">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Profil Saya</h2>
                    <p className="text-sm text-slate-500">Kelola informasi identitas akun Anda di sistem.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="md:col-span-2 rounded-3xl border-slate-200 shadow-sm overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" /> Informasi Dasar
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Lengkap</Label>
                          <p className="text-lg font-bold text-slate-700">{user?.fullName ?? "-"}</p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Pengguna</Label>
                          <p className="text-lg font-bold text-slate-700">@{user?.username ?? "-"}</p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Peran Sistem</Label>
                          <div className="flex items-center gap-2 mt-1">
                            {roleBadge(user?.role ?? "cashier")}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal Bergabung</Label>
                          <p className="text-sm font-bold text-slate-500">
                            {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-6">
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                      <h4 className="font-bold text-sm text-slate-800 mb-4">Keamanan</h4>
                      <div className="space-y-4">
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
                            <Shield className="w-4 h-4 text-emerald-500" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-700">Password Aktif</p>
                            <p className="text-[10px] text-slate-400 italic">Terakhir diubah: -</p>
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-relaxed px-1">
                          Untuk mengganti password, silakan hubungi admin melalui menu manajemen user.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="store" className="mt-0 focus-visible:ring-0">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Toko & Struk</h2>
                    <p className="text-sm text-slate-500">Konfigurasi identitas toko yang akan tampil pada struk belanja.</p>
                  </div>
                  <Button
                    onClick={handleSaveStore}
                    disabled={!isAdmin || appSettingsLoading || isSavingAppSettings}
                    className="h-12 px-8 rounded-2xl font-black shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
                  >
                    {isSavingAppSettings ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Simpan Perubahan
                  </Button>
                </div>

                {!isAdmin && (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center gap-4 text-amber-800 shadow-sm animate-in zoom-in-95 duration-300">
                    <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm text-amber-500">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div className="text-sm font-medium">
                      Hanya pengguna dengan peran <span className="font-bold">Admin</span> yang memiliki hak akses untuk mengubah pengaturan toko.
                    </div>
                  </div>
                )}

                <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden">
                  <CardContent className="p-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <Label className="text-sm font-bold text-slate-700">Nama Toko</Label>
                        <div className="relative">
                          <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input
                            value={storeName}
                            onChange={(e) => setStoreName(e.target.value)}
                            className="h-12 pl-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white font-medium transition-all"
                            disabled={!isAdmin || appSettingsLoading}
                            placeholder="Barokah Frozen Food"
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 px-1 italic">Nama ini akan muncul di bagian paling atas struk.</p>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-sm font-bold text-slate-700">Alamat Lengkap</Label>
                        <Input
                          value={storeAddress}
                          onChange={(e) => setStoreAddress(e.target.value)}
                          className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white font-medium transition-all"
                          disabled={!isAdmin || appSettingsLoading}
                          placeholder="Jl. Raya Utama No. 123..."
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-bold text-slate-700">Footer Struk (Pesan Tambahan)</Label>
                      <Input
                        value={receiptFooter}
                        onChange={(e) => setReceiptFooter(e.target.value)}
                        className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white font-medium transition-all"
                        disabled={!isAdmin || appSettingsLoading}
                        placeholder="Terima kasih telah berbelanja!"
                      />
                      <p className="text-[10px] text-slate-400 px-1 italic">Pesan ini akan muncul di bagian paling bawah struk.</p>
                    </div>

                    <div className="pt-6 border-t border-slate-100">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipe Data</p>
                          <p className="text-sm font-bold text-slate-700">Global (Server)</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sinkronisasi</p>
                          <p className="text-sm font-bold text-slate-700">Semua Perangkat</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Terakhir Diubah</p>
                          <p className="text-sm font-bold text-slate-700">
                            {appSettings?.updatedAt ? new Date(appSettings.updatedAt).toLocaleDateString("id-ID") : "Baru saja"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="terminal" className="mt-0 focus-visible:ring-0">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Terminal Lokal</h2>
                    <p className="text-sm text-slate-500">Pengaturan spesifik untuk perangkat yang sedang Anda gunakan saat ini.</p>
                  </div>
                  <Button 
                    onClick={handleSaveTerminal} 
                    className="h-12 px-8 rounded-2xl font-black shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
                  >
                    <Save className="w-4 h-4 mr-2" /> Simpan Perangkat
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="md:col-span-2 rounded-3xl border-slate-200 shadow-sm overflow-hidden">
                    <CardContent className="p-8 space-y-6">
                      <div className="space-y-3">
                        <Label className="text-sm font-bold text-slate-700">Identitas Terminal</Label>
                        <div className="relative">
                          <Monitor className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input
                            value={terminalName}
                            onChange={(e) => setTerminalName(e.target.value)}
                            placeholder="KASIR-UTAMA-01"
                            className="h-14 pl-12 text-lg font-black tracking-tight rounded-2xl bg-slate-50 border-slate-200 focus:bg-white transition-all uppercase"
                          />
                        </div>
                        <p className="text-xs text-slate-500 font-medium px-1">
                          Nama ini akan disimpan secara lokal di browser Anda dan otomatis muncul saat Anda membuka shift baru.
                        </p>
                      </div>

                      <div className="p-6 rounded-2xl bg-blue-50 border border-blue-100 text-blue-800 space-y-3">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-blue-500" />
                          <h4 className="text-sm font-bold">Informasi Teknis</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-[11px] font-medium">
                          <div>
                            <span className="text-blue-400 uppercase tracking-tighter">Browser:</span>
                            <p className="mt-0.5 truncate">{navigator.userAgent.split(" ").slice(-2).join(" ")}</p>
                          </div>
                          <div>
                            <span className="text-blue-400 uppercase tracking-tighter">Status Storage:</span>
                            <p className="mt-0.5">Aktif (Local Storage)</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                    <h4 className="font-bold text-sm text-slate-800">Kenapa Lokal?</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Pengaturan ini bersifat unik untuk setiap komputer/tablet. Memungkinkan Anda memiliki identitas kasir yang berbeda untuk setiap meja atau area tanpa mengubah pengaturan global.
                    </p>
                    <div className="pt-4 space-y-2">
                      <Badge variant="outline" className="w-full justify-center py-1.5 border-dashed font-bold text-[10px] text-slate-400">TIDAK DISINKRON</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {isAdmin ? (
              <>
                <TabsContent value="loyalty" className="mt-0 focus-visible:ring-0">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Loyalty & Poin</h2>
                        <p className="text-sm text-slate-500">Konfigurasi sistem poin belanja dan tingkatan member (tiering).</p>
                      </div>
                      <Button 
                        onClick={handleSaveLoyalty} 
                        className="h-12 px-8 rounded-2xl font-black shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
                        disabled={loyaltyLoading || isSavingLoyalty}
                      >
                        {isSavingLoyalty ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Simpan Aturan
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden bg-white">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                          <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Coins className="w-4 h-4 text-amber-500" /> Dasar Perolehan Poin
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                          <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-600">Belanja per 1 Poin (Rp)</Label>
                            <Input 
                              type="number" 
                              value={earnAmount} 
                              onChange={(e) => setEarnAmount(e.target.value)}
                              className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white font-bold text-lg" 
                            />
                            <p className="text-[10px] text-slate-400">Contoh: 10,000 berarti pelanggan dapat 1 poin setiap belanja Rp 10rb.</p>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-600">Nilai Tukar 1 Poin (Rp)</Label>
                            <Input 
                              type="number" 
                              value={redeemAmountValue} 
                              onChange={(e) => setRedeemAmountValue(e.target.value)}
                              className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white font-bold text-lg" 
                            />
                            <p className="text-[10px] text-slate-400">Contoh: 100 berarti 1 poin bernilai potongan Rp 100.</p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden bg-white">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                          <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-indigo-500" /> Aturan Tiering Member
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-[10px] font-bold text-slate-400 uppercase">Min. Silver (Rp)</Label>
                              <Input value={silverMin} onChange={(e) => setSilverMin(e.target.value)} className="h-10 rounded-lg bg-slate-50" />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] font-bold text-slate-400 uppercase">Multiplier Silver</Label>
                              <Input value={silverMult} onChange={(e) => setSilverMult(e.target.value)} className="h-10 rounded-lg bg-slate-50" />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] font-bold text-slate-400 uppercase">Min. Gold (Rp)</Label>
                              <Input value={goldMin} onChange={(e) => setGoldMin(e.target.value)} className="h-10 rounded-lg bg-slate-50" />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] font-bold text-slate-400 uppercase">Multiplier Gold</Label>
                              <Input value={goldMult} onChange={(e) => setGoldMult(e.target.value)} className="h-10 rounded-lg bg-slate-50" />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] font-bold text-slate-400 uppercase">Min. Platinum (Rp)</Label>
                              <Input value={platinumMin} onChange={(e) => setPlatinumMin(e.target.value)} className="h-10 rounded-lg bg-slate-50" />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] font-bold text-slate-400 uppercase">Multiplier Platinum</Label>
                              <Input value={platinumMult} onChange={(e) => setPlatinumMult(e.target.value)} className="h-10 rounded-lg bg-slate-50" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="p-6 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-start gap-4">
                      <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm text-indigo-500">
                        <Gift className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-indigo-900">Cara Kerja Multiplier</h4>
                        <p className="text-xs text-indigo-800/70 leading-relaxed">
                          Multiplier menentukan seberapa banyak poin ekstra yang didapat pelanggan berdasarkan tingkatannya. 
                          Misal: Multiplier Gold 1.25 berarti pelanggan Gold mendapat 25% poin lebih banyak dari transaksi yang sama dibandingkan pelanggan Regular.
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="users" className="mt-0 focus-visible:ring-0">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h2 className="text-2xl font-black text-slate-800 tracking-tight">Manajemen User</h2>
                      <p className="text-sm text-slate-500">Kelola akses staf kasir dan supervisor sistem.</p>
                    </div>
                    <Button 
                      onClick={openCreateUser} 
                      className="h-12 px-6 rounded-2xl font-black shadow-xl shadow-primary/20 transition-all hover:scale-[1.02]"
                    >
                      <Plus className="w-4 h-4 mr-2" /> Tambah User Baru
                    </Button>
                  </div>

                  <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden bg-white">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
                      <div className="relative w-full sm:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          placeholder="Cari nama atau username..."
                          className="h-10 pl-11 rounded-xl bg-white border-slate-200 focus:ring-primary/20 transition-all"
                          value={usersSearch}
                          onChange={(e) => setUsersSearch(e.target.value)}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-bold">{users.length} Total User</Badge>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                            <TableHead className="w-12 text-center">#</TableHead>
                            <TableHead className="font-bold text-slate-600">Username</TableHead>
                            <TableHead className="font-bold text-slate-600">Nama Lengkap</TableHead>
                            <TableHead className="font-bold text-slate-600">Hak Akses</TableHead>
                            <TableHead className="font-bold text-slate-600">Dibuat Pada</TableHead>
                            <TableHead className="text-right font-bold text-slate-600 px-6">Opsi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {usersQuery.isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                              <TableRow key={`sk-${i}`}>
                                <TableCell><Skeleton className="h-4 w-4 mx-auto" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-44" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                <TableCell className="text-right px-6"><Skeleton className="h-9 w-20 ml-auto rounded-lg" /></TableCell>
                              </TableRow>
                            ))
                          ) : users.length > 0 ? (
                            users.map((u: any, index: number) => {
                              const createdAt = u?.createdAt ? new Date(u.createdAt as any).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-";
                              const isSelf = Number(u.id) === Number(user?.id);
                              return (
                                <TableRow key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                                  <TableCell className="text-center text-xs font-bold text-slate-400">{index + 1}</TableCell>
                                  <TableCell className="font-bold text-slate-700">@{u.username}</TableCell>
                                  <TableCell className="font-medium text-slate-600">{u.fullName}</TableCell>
                                  <TableCell>{roleBadge(String(u.role))}</TableCell>
                                  <TableCell className="text-slate-400 text-xs font-medium">{createdAt}</TableCell>
                                  <TableCell className="text-right space-x-2 px-6">
                                    <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => openEditUser(u)}
                                        className="h-9 rounded-lg border-slate-200 font-bold hover:bg-white hover:text-primary hover:border-primary/30"
                                      >
                                        <Edit className="w-3.5 h-3.5 mr-2" /> Edit
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => askDeleteUser(u)}
                                        disabled={isSelf || isDeletingUser}
                                        className="h-9 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 font-bold"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          ) : (
                            <TableRow>
                              <TableCell colSpan={6} className="h-32 text-center">
                                <div className="flex flex-col items-center justify-center space-y-2 opacity-50">
                                  <Users className="w-8 h-8" />
                                  <p className="text-sm font-medium">Data user tidak ditemukan.</p>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                </div>
              </TabsContent>
            </>
          ) : null}
          </div>
        </div>
      </Tabs>

      <Dialog open={userFormOpen} onOpenChange={setUserFormOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
          <DialogHeader className="p-8 bg-slate-50 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center shadow-sm text-primary">
                {editingUser ? <Edit className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
              </div>
              <div>
                <DialogTitle className="text-xl font-black text-slate-800">
                  {editingUser ? "Perbarui Pengguna" : "User Baru"}
                </DialogTitle>
                <DialogDescription className="text-xs font-medium text-slate-500 mt-1">
                  {editingUser ? `Mengubah data akun @${editingUser.username}` : "Lengkapi formulir untuk akses sistem baru."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Form {...userForm}>
            <form onSubmit={userForm.handleSubmit(submitUser)} className="p-8 space-y-6">
              <div className="grid grid-cols-1 gap-5">
                <FormField
                  control={userForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-xs font-bold text-slate-600">Nama Pengguna (Login)</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-all font-medium" placeholder="kasir_01" autoComplete="off" />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={userForm.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-xs font-bold text-slate-600">Nama Lengkap</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-all font-medium" placeholder="Jane Doe" />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={userForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-xs font-bold text-slate-600">Hak Akses (Role)</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-all font-medium">
                            <SelectValue placeholder="Pilih peran" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                          <SelectItem value="cashier" className="font-medium rounded-lg">Kasir</SelectItem>
                          <SelectItem value="supervisor" className="font-medium rounded-lg">Supervisor</SelectItem>
                          <SelectItem value="admin" className="font-medium rounded-lg">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={userForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-xs font-bold text-slate-600">
                        {editingUser ? "Password Baru (Opsional)" : "Kata Sandi"}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} type="password" className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-all font-medium" placeholder={editingUser ? "Biarkan kosong jika tidak diganti" : "Min. 4 karakter"} />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="ghost" className="flex-1 font-bold h-12 rounded-xl" onClick={() => setUserFormOpen(false)}>
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  className="flex-[2] h-12 rounded-xl font-black shadow-lg shadow-primary/20 transition-all active:scale-95"
                  disabled={isCreatingUser || isUpdatingUser}
                >
                  {isCreatingUser || isUpdatingUser ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  {editingUser ? "Update User" : "Simpan User"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteUserOpen} onOpenChange={setDeleteUserOpen}>
        <AlertDialogContent className="rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
          <AlertDialogHeader className="p-8 bg-red-50 border-b border-red-100">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center shadow-sm text-red-600">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <AlertDialogTitle className="text-xl font-black text-red-900">Hapus Pengguna?</AlertDialogTitle>
                <AlertDialogDescription className="text-xs font-medium text-red-800/60 mt-1">
                  Tindakan ini tidak dapat dibatalkan secara instan.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <div className="p-8">
            <p className="text-sm text-slate-600 leading-relaxed">
              Anda akan menghapus akun <span className="font-bold text-slate-800">@{deletingUserRow?.username}</span>. 
              User yang sudah memiliki riwayat transaksi atau shift tidak dapat dihapus demi integritas data.
            </p>
          </div>
          <AlertDialogFooter className="p-6 bg-slate-50 border-t flex gap-3">
            <AlertDialogCancel className="flex-1 font-bold h-12 rounded-xl border-none hover:bg-slate-200 transition-all">Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteUser} 
              disabled={isDeletingUser}
              className="flex-[2] h-12 rounded-xl bg-red-600 hover:bg-red-700 font-black shadow-lg shadow-red-200/50 transition-all active:scale-95"
            >
              {isDeletingUser ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Ya, Hapus Permanen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
