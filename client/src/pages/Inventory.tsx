import { useState, useEffect, useMemo } from "react";
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useBrands, useCreateBrand, useDeleteBrand, useUpdateBrand, useProductDeleteInfo } from "@/hooks/use-products";
import { useBrands as useBrandsList, useCategories, useCreateCategory, useDeactivateCategory, useSuppliers, useUpdateCategory } from "@/hooks/use-others";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/MoneyInput";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  Package, 
  AlertTriangle, 
  Filter, 
  Tags, 
  RefreshCw, 
  Wand2, 
  Repeat, 
  Loader2,
  LayoutGrid,
  List,
  Banknote,
  Boxes,
  Info,
  ChevronRight,
  History,
  TrendingUp,
  Image as ImageIcon,
  MoreVertical
} from "lucide-react";
import { cn, digitsToNumber, formatCurrency, getImageUrl } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProductSchema } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription as AlertDialogDesc, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PageShell } from "@/components/layout/PageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Schema for form (coercing numbers)
const productFormSchema = insertProductSchema.extend({
  price: z.coerce.number().min(0),
  costPrice: z.coerce.number().min(0),
  stock: z.coerce.number().int().min(0),
  brandId: z.coerce.number().int(),
  categoryId: z.coerce.number().int(),
  supplierId: z.coerce.number().int(),
  minStock: z.coerce.number().int().min(0).default(0),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).default("ACTIVE"),
  image: z.string().optional(),
  pcsPerCarton: z.coerce.number().int().min(1).default(1),
  cartonPrice: z.coerce.number().min(0).optional(),
  supportsCarton: z.boolean().optional().default(false),
});

export default function Inventory() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "low">("all");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteProductId, setDeleteProductId] = useState<number | null>(null);
  
  // Category Management
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [editingCategoryDescription, setEditingCategoryDescription] = useState("");
  const [editingCategoryStatus, setEditingCategoryStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");

  // Brand Management
  const [isBrandDialogOpen, setIsBrandDialogOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [newBrandCategoryId, setNewBrandCategoryId] = useState<string>("all");
  const [editingBrandId, setEditingBrandId] = useState<number | null>(null);
  const [editingBrandName, setEditingBrandName] = useState("");
  const [editingBrandCategoryId, setEditingBrandCategoryId] = useState<string>("all");
  const [editingBrandStatus, setEditingBrandStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [uploading, setUploading] = useState(false);

  const productsStatus = statusFilter === "all" ? undefined : (statusFilter as any);
  const { data: products, isLoading } = useProducts(search, undefined, productsStatus);
  const { data: brands } = useBrandsList();
  const { data: categories } = useCategories();
  const { data: suppliers } = useSuppliers();
  const { data: deleteInfo, isLoading: isLoadingDeleteInfo, error: deleteInfoError } = useProductDeleteInfo(deleteProductId, deleteOpen);
  
  const { mutate: createProduct, isPending: isCreating } = useCreateProduct();
  const { mutate: updateProduct, isPending: isUpdating } = useUpdateProduct();
  const { mutate: deleteProduct, isPending: isDeletingProduct } = useDeleteProduct();
  const { mutate: createBrand, isPending: isCreatingBrand } = useCreateBrand();
  const { mutate: deleteBrand, isPending: isDeletingBrand } = useDeleteBrand();
  const { mutate: updateBrand, isPending: isUpdatingBrand } = useUpdateBrand();
  const { mutate: createCategory, isPending: isCreatingCategory } = useCreateCategory();
  const { mutate: updateCategory, isPending: isUpdatingCategory } = useUpdateCategory();
  const { mutate: deactivateCategory, isPending: isDeactivatingCategory } = useDeactivateCategory();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof productFormSchema>>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      barcode: "",
      description: "",
      status: "ACTIVE",
      costPrice: 0,
      price: 0,
      pcsPerCarton: 1,
      cartonPrice: 0,
      supportsCarton: false,
      stock: 0,
      minStock: 0,
      brandId: 1,
      categoryId: 1,
      supplierId: 1,
    },
  });
  const supportsCartonValue = form.watch("supportsCarton");
  const categoryIdValue = form.watch("categoryId");

  // Reset form when dialog closes or switches mode
  useEffect(() => {
    if (isDialogOpen) {
      const defaultCategoryId = Number(categories?.find((c: any) => c.status === "ACTIVE")?.id ?? categories?.[0]?.id ?? 1);
      const defaultBrandId = Number(
        brands?.find((b: any) => b.status === "ACTIVE" && Number(b.categoryId) === defaultCategoryId)?.id ??
          brands?.find((b: any) => b.status === "ACTIVE")?.id ??
          brands?.[0]?.id ??
          1
      );
      const defaultSupplierId = Number(suppliers?.find((s: any) => s.status === "ACTIVE")?.id ?? suppliers?.[0]?.id ?? 1);

      if (editingProduct) {
        form.reset({
          name: editingProduct.name,
          barcode: editingProduct.barcode,
          description: editingProduct.description || "",
          status: (editingProduct.status ?? "ACTIVE") as any,
          costPrice: Number(editingProduct.costPrice ?? 0),
          price: Number(editingProduct.price),
          pcsPerCarton: Number(editingProduct.pcsPerCarton ?? 1),
          cartonPrice: editingProduct.cartonPrice != null ? Number(editingProduct.cartonPrice) : 0,
          supportsCarton: Boolean(editingProduct.supportsCarton),
          stock: editingProduct.stock,
          brandId: editingProduct.brandId,
          categoryId: Number(editingProduct.categoryId ?? defaultCategoryId),
          supplierId: Number(editingProduct.supplierId ?? defaultSupplierId),
          minStock: Number(editingProduct.minStock ?? 0),
          image: editingProduct.image || "",
        });
      } else {
        form.reset({
          name: "",
          barcode: "",
          description: "",
          status: "ACTIVE",
          costPrice: 0,
          price: 0,
          pcsPerCarton: 1,
          cartonPrice: 0,
          supportsCarton: false,
          stock: 0,
          brandId: defaultBrandId,
          categoryId: defaultCategoryId,
          supplierId: defaultSupplierId,
          minStock: 0,
          image: "",
        });
      }
    }
  }, [isDialogOpen, editingProduct, form, brands, categories, suppliers]);

  const generateBarcode = (type: 'random' | 'loop') => {
    let code = "";
    if (type === 'random') {
      // Generate 13 digit EAN-13 style random number
      code = Math.floor(Math.random() * 1000000000000).toString().padStart(12, '8');
    } else {
      // Find max barcode and increment
      // Simple logic: Use timestamp + incremental
      code = `P${Date.now().toString().slice(-8)}`;
    }
    form.setValue("barcode", code);
  };

  const onSubmit = (data: z.infer<typeof productFormSchema>) => {
    const supportsCarton = Boolean(data.supportsCarton);
    const pcsPerCarton = supportsCarton ? Math.max(1, Math.trunc(data.pcsPerCarton ?? 1)) : 1;
    const cartonPrice = supportsCarton ? (data.cartonPrice ?? 0) : null;

    const payload = {
      ...data,
      costPrice: data.costPrice.toString(),
      price: data.price.toString(),
      pcsPerCarton,
      cartonPrice: cartonPrice == null ? null : cartonPrice.toString(),
      supportsCarton,
    };

    if (editingProduct) {
      updateProduct({ id: editingProduct.id, ...payload } as any, {
        onSuccess: () => {
          setIsDialogOpen(false);
          setEditingProduct(null);
          toast({ title: "Berhasil", description: "Produk berhasil diperbarui" });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Gagal", description: "Tidak bisa memperbarui produk" });
        }
      });
    } else {
      createProduct(payload as any, {
        onSuccess: () => {
          setIsDialogOpen(false);
          toast({ title: "Berhasil", description: "Produk berhasil ditambahkan" });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Gagal", description: "Tidak bisa menambahkan produk" });
        }
      });
    }
  };

  const handleCreateCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    createCategory(
      { name, description: newCategoryDescription?.trim() ? newCategoryDescription.trim() : null, status: "ACTIVE" } as any,
      {
        onSuccess: () => {
          setNewCategoryName("");
          setNewCategoryDescription("");
          toast({ title: "Berhasil", description: "Kategori berhasil ditambahkan" });
        },
        onError: (err: any) => {
          toast({ variant: "destructive", title: "Gagal", description: err?.message || "Tidak bisa menambahkan kategori" });
        },
      },
    );
  };

  const startEditCategory = (c: any) => {
    setEditingCategoryId(Number(c.id));
    setEditingCategoryName(String(c.name ?? ""));
    setEditingCategoryDescription(String(c.description ?? ""));
    setEditingCategoryStatus((c.status ?? "ACTIVE") as any);
  };

  const cancelEditCategory = () => {
    setEditingCategoryId(null);
    setEditingCategoryName("");
    setEditingCategoryDescription("");
    setEditingCategoryStatus("ACTIVE");
  };

  const saveEditCategory = () => {
    if (editingCategoryId == null) return;
    const name = editingCategoryName.trim();
    if (!name) return;
    updateCategory(
      { id: editingCategoryId, name, description: editingCategoryDescription?.trim() ? editingCategoryDescription.trim() : null, status: editingCategoryStatus } as any,
      {
        onSuccess: () => {
          toast({ title: "Berhasil", description: "Kategori berhasil diperbarui" });
          cancelEditCategory();
        },
        onError: (err: any) => {
          toast({ variant: "destructive", title: "Gagal", description: err?.message || "Tidak bisa memperbarui kategori" });
        },
      },
    );
  };

  const handleDeactivateCategory = (id: number) => {
    if (confirm("Nonaktifkan kategori ini?")) {
      deactivateCategory(id, {
        onSuccess: () => toast({ title: "Berhasil", description: "Kategori dinonaktifkan" }),
        onError: (err: any) => toast({ variant: "destructive", title: "Gagal", description: err?.message || "Tidak bisa menonaktifkan kategori" }),
      });
    }
  };

  const handleCreateBrand = () => {
    const name = newBrandName.trim();
    const categoryId = newBrandCategoryId === "all" ? null : Number(newBrandCategoryId);
    if (!name) return;
    if (!categoryId) return;
    createBrand(
      { name, categoryId, status: "ACTIVE" } as any,
      {
        onSuccess: () => {
          setNewBrandName("");
          setNewBrandCategoryId("all");
          toast({ title: "Berhasil", description: "Merek berhasil ditambahkan" });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Gagal", description: "Tidak bisa menambahkan merek" });
        },
      },
    );
  };

  const startEditBrand = (b: any) => {
    setEditingBrandId(Number(b.id));
    setEditingBrandName(String(b.name ?? ""));
    setEditingBrandCategoryId(String(b.categoryId ?? "all"));
    setEditingBrandStatus((b.status ?? "ACTIVE") as any);
  };

  const cancelEditBrand = () => {
    setEditingBrandId(null);
    setEditingBrandName("");
    setEditingBrandCategoryId("all");
    setEditingBrandStatus("ACTIVE");
  };

  const saveEditBrand = () => {
    if (editingBrandId == null) return;
    const name = editingBrandName.trim();
    const categoryId = editingBrandCategoryId === "all" ? null : Number(editingBrandCategoryId);
    if (!name) return;
    if (!categoryId) return;
    updateBrand(
      { id: editingBrandId, name, categoryId, status: editingBrandStatus } as any,
      {
        onSuccess: () => {
          toast({ title: "Berhasil", description: "Merek berhasil diperbarui" });
          cancelEditBrand();
        },
        onError: (err: any) => {
          toast({ variant: "destructive", title: "Gagal", description: err?.message || "Tidak bisa memperbarui merek" });
        },
      },
    );
  };

  const handleDeleteBrand = (id: number) => {
    if (confirm("Hapus merek ini?")) {
      deleteBrand(id, {
        onSuccess: () => {
          toast({ title: "Berhasil", description: "Merek berhasil dihapus" });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Gagal", description: "Tidak bisa menghapus merek" });
        },
      });
    }
  };

  const handleQuickStock = (product: any, amount: number) => {
    const newStock = Math.max(0, product.stock + amount);
    updateProduct({ id: product.id, stock: newStock } as any, {
      onSuccess: () => {
        const pcsPerCarton = Math.max(1, Number(product.pcsPerCarton ?? 1));
        const supportsCarton = Boolean(product.supportsCarton) && pcsPerCarton > 1;
        let desc = `${product.name}: ${newStock} pcs`;

        if (supportsCarton) {
          const c = Math.floor(newStock / pcsPerCarton);
          const p = newStock % pcsPerCarton;
          desc = `${product.name}: ${c} Karton ${p > 0 ? `• ${p} Pcs` : ''}`;
        }
        
        toast({ title: "Stok diperbarui", description: desc });
      }
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    setUploading(true);
    try {
      // Use direct fetch since we need multipart/form-data
      const token = localStorage.getItem('auth_token'); // Get auth token
      
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        headers: {
          // 'Content-Type': 'multipart/form-data', // Do NOT set this manually, browser does it
          'Authorization': token ? `Bearer ${token}` : '', // Add Authorization header
        }
      });
      
      if (!res.ok) throw new Error('Upload failed');
      
      const data = await res.json();
      form.setValue('image', data.url);
      toast({ title: "Berhasil", description: "Foto berhasil diunggah" });
    } catch (error) {
      console.error("Upload failed", error);
      toast({ variant: "destructive", title: "Upload gagal", description: "Tidak bisa mengunggah foto" });
    } finally {
      setUploading(false);
    }
  };

  const filteredProducts = products?.filter(p => {
    // Brand Filter
    if (brandFilter !== "all" && p.brandId?.toString() !== brandFilter) {
      return false;
    }
    if (categoryFilter !== "all" && (p as any).categoryId?.toString() !== categoryFilter) {
      return false;
    }
    if (supplierFilter !== "all" && (p as any).supplierId?.toString() !== supplierFilter) {
      return false;
    }
    if (statusFilter !== "all" && String((p as any).status ?? "ACTIVE") !== statusFilter) {
      return false;
    }
    // Low Stock Filter
    if (filterType === "low") return p.stock < Number((p as any).minStock ?? 10);
    
    return true;
  });

  const stats = useMemo(() => {
    if (!products) return { totalItems: 0, lowStock: 0, totalValue: 0, outOfStock: 0 };
    return products.reduce((acc, p) => {
      acc.totalItems += 1;
      if (p.stock === 0) acc.outOfStock += 1;
      if (p.stock > 0 && p.stock < Number((p as any).minStock ?? 10)) acc.lowStock += 1;
      acc.totalValue += Number((p as any).costPrice ?? 0) * p.stock;
      return acc;
    }, { totalItems: 0, lowStock: 0, totalValue: 0, outOfStock: 0 });
  }, [products]);

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingProduct(null);
    setIsDialogOpen(true);
  };

  return (
    <TooltipProvider>
      <PageShell
        title="Manajemen Inventori"
        description="Kelola produk, stok, harga, kategori, dan pemasok"
        headerRight={
          <>
            <Dialog open={isCategoryDialogOpen} onOpenChange={(open) => {
              setIsCategoryDialogOpen(open);
              if (!open) cancelEditCategory();
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <Filter className="w-4 h-4 mr-2" /> Kategori
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[96vw] sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Kelola Kategori</DialogTitle>
                  <DialogDescription>Buat kategori dan atur status aktif/nonaktif.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Input
                      placeholder="Nama kategori"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="sm:col-span-1"
                    />
                    <Input
                      placeholder="Deskripsi (opsional)"
                      value={newCategoryDescription}
                      onChange={(e) => setNewCategoryDescription(e.target.value)}
                      className="sm:col-span-2"
                    />
                    <Button onClick={handleCreateCategory} disabled={isCreatingCategory} className="sm:col-span-3">
                      <Plus className="w-4 h-4 mr-2" /> Tambah kategori
                    </Button>
                  </div>

                  <div className="max-h-[320px] overflow-y-auto space-y-2">
                    {categories?.map((c: any) => {
                      const isEditing = editingCategoryId != null && Number(c.id) === Number(editingCategoryId);
                      return (
                        <div key={c.id} className="rounded-lg border bg-white p-3">
                          {isEditing ? (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <Input value={editingCategoryName} onChange={(e) => setEditingCategoryName(e.target.value)} />
                              <Input value={editingCategoryDescription} onChange={(e) => setEditingCategoryDescription(e.target.value)} placeholder="Deskripsi" />
                              <Select value={editingCategoryStatus} onValueChange={(v) => setEditingCategoryStatus(v as any)}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="ACTIVE">Aktif</SelectItem>
                                  <SelectItem value="INACTIVE">Nonaktif</SelectItem>
                                </SelectContent>
                              </Select>
                              <div className="flex gap-2 sm:col-span-3">
                                <Button onClick={saveEditCategory} disabled={isUpdatingCategory} className="flex-1">Simpan</Button>
                                <Button variant="outline" onClick={cancelEditCategory} className="flex-1">Batal</Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-semibold truncate">{c.name}</div>
                                <div className="text-xs text-muted-foreground truncate">{c.description || "-"}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="font-normal">{c.status}</Badge>
                                <Button variant="outline" size="sm" onClick={() => startEditCategory(c)}>Ubah</Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-400 hover:text-red-600"
                                  onClick={() => handleDeactivateCategory(Number(c.id))}
                                  disabled={isDeactivatingCategory || c.status === "INACTIVE"}
                                  title="Nonaktifkan"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isBrandDialogOpen} onOpenChange={(open) => {
              setIsBrandDialogOpen(open);
              if (!open) cancelEditBrand();
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <Tags className="w-4 h-4 mr-2" /> Merek
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[96vw] sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Kelola Merek</DialogTitle>
                  <DialogDescription>Merek harus berada pada kategori.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Input
                      placeholder="Nama merek"
                      value={newBrandName}
                      onChange={(e) => setNewBrandName(e.target.value)}
                    />
                    <Select value={newBrandCategoryId} onValueChange={setNewBrandCategoryId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih kategori" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Pilih kategori</SelectItem>
                        {categories?.filter((c: any) => c.status === "ACTIVE").map((c: any) => (
                          <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={handleCreateBrand} disabled={isCreatingBrand}>
                      <Plus className="w-4 h-4 mr-2" /> Tambah merek
                    </Button>
                  </div>

                  <div className="max-h-[320px] overflow-y-auto space-y-2">
                    {brands?.map((b: any) => {
                      const isEditing = editingBrandId != null && Number(b.id) === Number(editingBrandId);
                      const categoryName = categories?.find((c: any) => Number(c.id) === Number(b.categoryId))?.name || "-";
                      return (
                        <div key={b.id} className="rounded-lg border bg-white p-3">
                          {isEditing ? (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <Input value={editingBrandName} onChange={(e) => setEditingBrandName(e.target.value)} />
                              <Select value={editingBrandCategoryId} onValueChange={setEditingBrandCategoryId}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Kategori" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">Pilih kategori</SelectItem>
                                  {categories?.filter((c: any) => c.status === "ACTIVE").map((c: any) => (
                                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select value={editingBrandStatus} onValueChange={(v) => setEditingBrandStatus(v as any)}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="ACTIVE">Aktif</SelectItem>
                                  <SelectItem value="INACTIVE">Nonaktif</SelectItem>
                                </SelectContent>
                              </Select>
                              <div className="flex gap-2 sm:col-span-3">
                                <Button onClick={saveEditBrand} disabled={isUpdatingBrand} className="flex-1">Simpan</Button>
                                <Button variant="outline" onClick={cancelEditBrand} className="flex-1">Batal</Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-semibold truncate">{b.name}</div>
                                <div className="text-xs text-muted-foreground truncate">{categoryName}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="font-normal">
                                  {b.status === "ACTIVE" ? "Aktif" : b.status === "INACTIVE" ? "Nonaktif" : b.status}
                                </Badge>
                                <Button variant="outline" size="sm" onClick={() => startEditBrand(b)}>Ubah</Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-400 hover:text-red-600"
                                  onClick={() => handleDeleteBrand(Number(b.id))}
                                  disabled={isDeletingBrand || b.status === "INACTIVE"}
                                  title="Nonaktifkan"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button onClick={handleCreate} className="shadow-lg shadow-primary/20 w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" /> Tambah Produk
            </Button>
          </>
        }
      >

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-white shadow-sm border-slate-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Produk</div>
              <div className="text-2xl font-bold text-slate-900">{stats.totalItems}</div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white shadow-sm border-slate-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Stok Menipis</div>
              <div className="text-2xl font-bold text-slate-900">{stats.lowStock}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-slate-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Habis Stok</div>
              <div className="text-2xl font-bold text-slate-900">{stats.outOfStock}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-slate-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Nilai Inventori</div>
              <div className="text-2xl font-bold text-slate-900">{formatCurrency(stats.totalValue)}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border bg-card shadow-sm p-4 sm:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded-xl border border-slate-200 flex-1">
            <Search className="w-5 h-5 text-slate-400 ml-2" />
            <Input 
              placeholder="Cari nama atau barcode..." 
              className="border-none shadow-none focus-visible:ring-0 h-9 bg-transparent"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border bg-slate-100 p-1 h-10">
              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className={cn("h-8 w-8 p-0", viewMode === "table" && "bg-white shadow-sm")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className={cn("h-8 w-8 p-0", viewMode === "grid" && "bg-white shadow-sm")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
            <Tabs defaultValue="all" value={filterType} onValueChange={(v) => setFilterType(v as "all" | "low")} className="w-[200px]">
              <TabsList className="w-full h-10">
                <TabsTrigger value="all" className="flex-1 h-8">Semua</TabsTrigger>
                <TabsTrigger value="low" className="flex-1 flex gap-2 h-8">
                  <AlertTriangle className="w-3 h-3" /> 
                  Menipis
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger className="w-full h-10 bg-white">
              <SelectValue placeholder="Filter merek" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua merek</SelectItem>
              {brands?.map(b => (
                <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full h-10 bg-white">
              <SelectValue placeholder="Filter kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua kategori</SelectItem>
              {categories?.map(c => (
                <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            <SelectTrigger className="w-full h-10 bg-white">
              <SelectValue placeholder="Filter pemasok" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua pemasok</SelectItem>
              {suppliers?.map(s => (
                <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full h-10 bg-white">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua status</SelectItem>
              <SelectItem value="ACTIVE">Aktif</SelectItem>
              <SelectItem value="INACTIVE">Nonaktif</SelectItem>
              <SelectItem value="ARCHIVED">Arsip</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {viewMode === "table" ? (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[300px]">Produk</TableHead>
                <TableHead>Merek/Kat</TableHead>
                <TableHead>Barcode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Harga</TableHead>
                <TableHead className="text-right">Margin</TableHead>
                <TableHead className="text-right">Stok</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                    <div className="mt-2 text-sm text-muted-foreground">Memuat data...</div>
                  </TableCell>
                </TableRow>
              ) : filteredProducts?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    Produk tidak ditemukan.
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts?.map((product) => (
                  <TableRow key={product.id} className="hover:bg-slate-50/50 group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {product.image ? (
                          <div className="w-12 h-12 rounded-lg overflow-hidden border bg-white shrink-0">
                            <img 
                              src={getImageUrl(product.image)} 
                              alt={product.name} 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0 border border-slate-200">
                            <Package className="w-6 h-6" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate">{product.name}</div>
                          <div className="text-xs text-slate-500 truncate">{product.description || "Tidak ada deskripsi"}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="secondary" className="w-fit font-medium text-[10px] uppercase tracking-tight">
                          {product.brand?.name || '-'}
                        </Badge>
                        <span className="text-[10px] text-slate-400 font-medium ml-1">
                          {categories?.find(c => Number(c.id) === Number((product as any).categoryId))?.name || "-"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-slate-500">{product.barcode}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        "font-medium text-[10px] uppercase",
                        (product as any).status === "ACTIVE" ? "text-emerald-600 border-emerald-100 bg-emerald-50" : "text-slate-500 bg-slate-50"
                      )}>
                        {(product as any).status === "ACTIVE" ? "Aktif" : (product as any).status === "INACTIVE" ? "Nonaktif" : "Arsip"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-900">{formatCurrency(product.price)}</TableCell>
                    <TableCell className="text-right">
                      <div className="text-xs font-semibold text-emerald-600">
                        {formatCurrency(Math.max(0, Number(product.price) - Number((product as any).costPrice ?? 0)))}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {Math.round((Number(product.price) - Number((product as any).costPrice ?? 0)) / Number(product.price) * 100)}% Margin
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" className="h-auto p-0 hover:bg-transparent ml-auto block">
                            <div className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                              product.stock === 0 ? 'bg-red-50 text-red-700 border-red-100' : 
                              product.stock < Number((product as any).minStock ?? 10) ? 'bg-amber-50 text-amber-700 border-amber-100' : 
                              'bg-emerald-50 text-emerald-700 border-emerald-100'
                            )}>
                              {(() => {
                                const pcsPerCarton = Math.max(1, Number((product as any).pcsPerCarton ?? 1));
                                const supportsCarton = Boolean((product as any).supportsCarton) && pcsPerCarton > 1;
                                if (!supportsCarton) return `${product.stock} pcs`;
                                const cartons = Math.floor(Number(product.stock) / pcsPerCarton);
                                const rem = Number(product.stock) % pcsPerCarton;
                                return cartons > 0 ? `${cartons} k • ${rem} p` : `${product.stock} pcs`;
                              })()}
                            </div>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-3" align="end">
                          <div className="text-xs font-bold mb-2 px-1 text-slate-500 uppercase tracking-wider">Update Stok Cepat</div>
                          
                          {/* PCS Controls */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                              <span>Satuan (PCS)</span>
                            </div>
                            <div className="grid grid-cols-4 gap-1">
                              <Button variant="outline" size="sm" className="h-8 text-red-600 border-red-100 hover:bg-red-50 p-0" onClick={() => handleQuickStock(product, -1)} disabled={product.stock <= 0}>-1</Button>
                              <Button variant="outline" size="sm" className="h-8 text-red-600 border-red-100 hover:bg-red-50 p-0" onClick={() => handleQuickStock(product, -10)} disabled={product.stock < 10}>-10</Button>
                              <Button variant="outline" size="sm" className="h-8 text-emerald-600 border-emerald-100 hover:bg-emerald-50 p-0" onClick={() => handleQuickStock(product, 1)}>+1</Button>
                              <Button variant="outline" size="sm" className="h-8 text-emerald-600 border-emerald-100 hover:bg-emerald-50 p-0" onClick={() => handleQuickStock(product, 10)}>+10</Button>
                            </div>
                          </div>

                          {/* Carton Controls */}
                          {(() => {
                            const pcsPerCarton = Math.max(1, Number((product as any).pcsPerCarton ?? 1));
                            const supportsCarton = Boolean((product as any).supportsCarton) && pcsPerCarton > 1;
                            
                            if (supportsCarton) {
                              return (
                                <div className="space-y-2 mt-3 pt-3 border-t border-slate-100">
                                  <div className="flex items-center justify-between text-[10px] text-blue-500 px-1 font-medium">
                                    <span>Karton (@{pcsPerCarton})</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="h-8 text-red-600 border-red-100 hover:bg-red-50" 
                                      onClick={() => handleQuickStock(product, -pcsPerCarton)} 
                                      disabled={product.stock < pcsPerCarton}
                                    >
                                      -1 Karton
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="h-8 text-blue-600 border-blue-100 hover:bg-blue-50" 
                                      onClick={() => handleQuickStock(product, pcsPerCarton)}
                                    >
                                      +1 Karton
                                    </Button>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </PopoverContent>
                      </Popover>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                          onClick={() => {
                            setSelectedProductForDetail(product);
                            setIsDetailOpen(true);
                          }}
                        >
                          <Info className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                          onClick={() => handleEdit(product)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              className="text-red-600 focus:text-red-600"
                              disabled={Number(product.stock) > 0 || Boolean((product as any).hasActivePromo)}
                              onClick={() => {
                                setDeleteProductId(Number(product.id));
                                setDeleteOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Hapus Produk
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="animate-pulse border-slate-200">
                <div className="aspect-square bg-slate-100" />
                <CardContent className="p-4 space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </CardContent>
              </Card>
            ))
          ) : filteredProducts?.length === 0 ? (
            <div className="col-span-full h-64 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl">
              <Package className="w-12 h-12 mb-2 opacity-10" />
              <p>Produk tidak ditemukan</p>
            </div>
          ) : (
            filteredProducts?.map((product) => (
              <Card key={product.id} className="overflow-hidden group hover:shadow-md transition-all border-slate-200 bg-white">
                <div 
                  className="aspect-video relative bg-slate-50 cursor-pointer overflow-hidden"
                  onClick={() => {
                    setSelectedProductForDetail(product);
                    setIsDetailOpen(true);
                  }}
                >
                  {product.image ? (
                    <img 
                      src={getImageUrl(product.image)} 
                      alt={product.name} 
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <Package className="w-12 h-12" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex flex-col gap-1">
                    <Badge className={cn(
                      "shadow-sm border-none",
                      product.stock === 0 ? 'bg-red-500 text-white' : 
                      product.stock < Number((product as any).minStock ?? 10) ? 'bg-amber-500 text-white' : 
                      'bg-emerald-500 text-white'
                    )}>
                      {product.stock} pcs
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-1">
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors cursor-pointer" onClick={() => {
                        setSelectedProductForDetail(product);
                        setIsDetailOpen(true);
                      }}>
                        {product.name}
                      </h3>
                      <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                        {product.brand?.name || '-'} • {categories?.find(c => Number(c.id) === Number((product as any).categoryId))?.name || "-"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                    <div className="text-lg font-black text-slate-900">
                      {formatCurrency(product.price)}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleEdit(product)}>
                        <Edit className="h-4 w-4 text-slate-400" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => {
                        setSelectedProductForDetail(product);
                        setIsDetailOpen(true);
                      }}>
                        <Info className="h-4 w-4 text-slate-400" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!open && isDeletingProduct) return;
          setDeleteOpen(open);
          if (!open) setDeleteProductId(null);
        }}
      >
        <AlertDialogContent className="w-[96vw] sm:max-w-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Produk</AlertDialogTitle>
            <AlertDialogDesc>
              Penghapusan produk akan divalidasi di server untuk menjaga konsistensi transaksi dan stok.
            </AlertDialogDesc>
          </AlertDialogHeader>

          {isLoadingDeleteInfo ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : deleteInfoError ? (
            <div className="grid gap-2 text-sm">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
                Gagal memuat detail produk. Anda tetap bisa melanjutkan penghapusan, server akan memvalidasi stok/transaksi/promo.
              </div>
              <div className="text-xs text-muted-foreground">{String((deleteInfoError as any)?.message ?? "Unknown error")}</div>
            </div>
          ) : deleteInfo ? (
            <div className="grid gap-3 text-sm">
              <div className="grid grid-cols-2 gap-2 rounded-lg border bg-slate-50/60 p-3">
                <div>
                  <div className="text-xs text-muted-foreground">Nama</div>
                  <div className="font-semibold">{deleteInfo.name}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Barcode</div>
                  <div className="font-mono">{deleteInfo.barcode}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Kategori</div>
                  <div className="font-medium">{deleteInfo.categoryName || "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Brand</div>
                  <div className="font-medium">{deleteInfo.brandName || "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Stok</div>
                  <div className="font-medium">{deleteInfo.stock} pcs</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Status</div>
                  <div className="font-medium">{deleteInfo.status}</div>
                </div>
              </div>

              {deleteInfo.hasTransactions ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
                  Produk ini pernah digunakan dalam transaksi. Sistem akan menonaktifkan produk, bukan menghapus permanen.
                </div>
              ) : null}

              {deleteInfo.hasActivePromo ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">
                  Produk masih dalam promo aktif. Nonaktifkan promo terlebih dahulu sebelum menghapus.
                </div>
              ) : null}

              {Number(deleteInfo.stock) > 0 ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">
                  Stok produk masih ada. Kurangi stok menjadi 0 terlebih dahulu sebelum menghapus.
                </div>
              ) : null}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              {deleteProductId ? "Tidak ada data." : "Pilih produk terlebih dahulu."}
            </div>
          )}

          {(() => {
            const hasStock = Number(deleteInfo?.stock ?? 0) > 0;
            const hasPromo = Boolean(deleteInfo?.hasActivePromo);
            const hasTransactions = Boolean(deleteInfo?.hasTransactions);
            const canSoft = Boolean(deleteProductId) && (!deleteInfo || (!hasStock && !hasPromo));
            const canHard = Boolean(deleteProductId) && isAdmin && (!deleteInfo || (!hasStock && !hasPromo && !hasTransactions));
            return (
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction
                  disabled={!canSoft || isDeletingProduct}
                  onClick={(e) => {
                    e.preventDefault();
                    if (!deleteProductId) return;
                    deleteProduct(
                      { id: deleteProductId, mode: "soft" },
                      {
                        onSuccess: () => {
                          setDeleteOpen(false);
                          setDeleteProductId(null);
                          toast({ title: "Berhasil", description: "Produk dinonaktifkan" });
                        },
                        onError: (err: any) => {
                          toast({ variant: "destructive", title: "Gagal", description: err?.message || "Tidak bisa menghapus produk" });
                        },
                      },
                    );
                  }}
                >
                  {isDeletingProduct ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ya, Nonaktifkan"}
                </AlertDialogAction>
                {isAdmin ? (
                  <AlertDialogAction
                    className="bg-red-500 hover:bg-red-600"
                    disabled={!canHard || isDeletingProduct}
                    onClick={(e) => {
                      e.preventDefault();
                      if (!deleteProductId) return;
                      deleteProduct(
                        { id: deleteProductId, mode: "hard" },
                        {
                          onSuccess: () => {
                            setDeleteOpen(false);
                            setDeleteProductId(null);
                            toast({ title: "Berhasil", description: "Produk dihapus permanen" });
                          },
                          onError: (err: any) => {
                            toast({ variant: "destructive", title: "Gagal", description: err?.message || "Tidak bisa menghapus produk" });
                          },
                        },
                      );
                    }}
                  >
                    {isDeletingProduct ? <Loader2 className="w-4 h-4 animate-spin" /> : "Hapus Permanen"}
                  </AlertDialogAction>
                ) : null}
              </AlertDialogFooter>
            );
          })()}
        </AlertDialogContent>
      </AlertDialog>

      {/* Product Detail Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="w-[96vw] sm:max-w-2xl p-0 overflow-hidden border-none shadow-2xl">
          {selectedProductForDetail && (
            <div className="flex flex-col">
              <div className="relative h-48 sm:h-64 bg-slate-100">
                {selectedProductForDetail.image ? (
                  <img 
                    src={getImageUrl(selectedProductForDetail.image)} 
                    alt={selectedProductForDetail.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <Package className="w-20 h-20" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-6 right-6">
                  <div className="flex flex-wrap gap-2 mb-2">
                    <Badge className="bg-blue-500 hover:bg-blue-500 text-white border-none">
                      {categories?.find(c => Number(c.id) === Number(selectedProductForDetail.categoryId))?.name || "Tanpa Kategori"}
                    </Badge>
                    <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white border-none">
                      {selectedProductForDetail.brand?.name || "Tanpa Merek"}
                    </Badge>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                    {selectedProductForDetail.name}
                  </h2>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-2 right-2 text-white hover:bg-white/20 rounded-full"
                  onClick={() => setIsDetailOpen(false)}
                >
                  <Plus className="w-6 h-6 rotate-45" />
                </Button>
              </div>

              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-8 bg-white">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Info className="w-3 h-3" /> Informasi Dasar
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-slate-50">
                        <span className="text-sm text-slate-500">Barcode</span>
                        <span className="text-sm font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                          {selectedProductForDetail.barcode}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-50">
                        <span className="text-sm text-slate-500">Pemasok</span>
                        <span className="text-sm font-bold text-slate-900">
                          {suppliers?.find(s => Number(s.id) === Number(selectedProductForDetail.supplierId))?.name || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-slate-500">Status</span>
                        <Badge variant="outline" className={cn(
                          "font-bold text-[10px] uppercase",
                          selectedProductForDetail.status === "ACTIVE" ? "text-emerald-600 border-emerald-100 bg-emerald-50" : "text-slate-500"
                        )}>
                          {selectedProductForDetail.status === "ACTIVE" ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <TrendingUp className="w-3 h-3" /> Harga & Keuntungan
                    </h3>
                    <div className="bg-slate-50 rounded-2xl p-4 space-y-3 border border-slate-100">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">Harga Jual</span>
                        <span className="text-lg font-black text-slate-900">{formatCurrency(selectedProductForDetail.price)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">Harga Beli</span>
                        <span className="text-sm font-bold text-slate-600">{formatCurrency(selectedProductForDetail.costPrice)}</span>
                      </div>
                      <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                        <span className="text-xs font-bold text-emerald-600">Estimasi Margin</span>
                        <div className="text-right">
                          <div className="text-sm font-black text-emerald-600">
                            {formatCurrency(Number(selectedProductForDetail.price) - Number(selectedProductForDetail.costPrice))}
                          </div>
                          <div className="text-[10px] font-bold text-emerald-500">
                            {Math.round((Number(selectedProductForDetail.price) - Number(selectedProductForDetail.costPrice)) / Number(selectedProductForDetail.price) * 100)}% per pcs
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Boxes className="w-3 h-3" /> Stok & Inventori
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                        <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Stok Saat Ini</div>
                        <div className={cn(
                          "text-2xl font-black",
                          selectedProductForDetail.stock === 0 ? "text-red-600" : 
                          selectedProductForDetail.stock < Number(selectedProductForDetail.minStock ?? 10) ? "text-amber-600" : 
                          "text-emerald-600"
                        )}>
                          {selectedProductForDetail.stock} <span className="text-xs font-normal">pcs</span>
                        </div>
                      </div>
                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                        <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Batas Minimum</div>
                        <div className="text-2xl font-black text-slate-900">
                          {selectedProductForDetail.minStock || 0} <span className="text-xs font-normal">pcs</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedProductForDetail.supportsCarton && (
                    <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100">
                      <h4 className="text-[10px] font-bold text-blue-600 uppercase mb-3 flex items-center gap-2">
                        <Package className="w-3 h-3" /> Penjualan Karton Aktif
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500">Isi per Karton</span>
                          <span className="font-bold text-slate-900">{selectedProductForDetail.pcsPerCarton} pcs</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500">Harga per Karton</span>
                          <span className="font-bold text-blue-600">{formatCurrency(selectedProductForDetail.cartonPrice)}</span>
                        </div>
                        <div className="pt-2 border-t border-blue-100 text-[10px] text-blue-500 italic">
                          * Harga karton lebih hemat {Math.round((Number(selectedProductForDetail.price) * Number(selectedProductForDetail.pcsPerCarton) - Number(selectedProductForDetail.cartonPrice)) / (Number(selectedProductForDetail.price) * Number(selectedProductForDetail.pcsPerCarton)) * 100)}% dibanding eceran
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <History className="w-3 h-3" /> Deskripsi
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      {selectedProductForDetail.description || "Tidak ada deskripsi produk untuk ditampilkan."}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-slate-50 border-t flex justify-end gap-3">
                <Button variant="outline" className="rounded-xl" onClick={() => setIsDetailOpen(false)}>
                  Tutup
                </Button>
                <Button className="rounded-xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200" onClick={() => {
                  setIsDetailOpen(false);
                  handleEdit(selectedProductForDetail);
                }}>
                  <Edit className="w-4 h-4 mr-2" /> Edit Produk
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[96vw] sm:max-w-4xl p-0 overflow-hidden border-none shadow-2xl">
          <div className="p-6 bg-[#0f172a] text-white">
             <DialogTitle className="text-xl font-black text-white">{editingProduct ? "Ubah Produk" : "Tambah Produk Baru"}</DialogTitle>
             <DialogDescription className="text-slate-300 mt-1">
               Lengkapi data produk dengan teliti untuk akurasi laporan inventori dan penjualan.
             </DialogDescription>
           </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0">
              <div className="max-h-[70vh] overflow-y-auto p-6 bg-white">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                  {/* Left Column: Basic Info & Image */}
                  <div className="md:col-span-7 space-y-8">
                    <section>
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Info className="w-3 h-3" /> Informasi Utama
                      </h3>
                      <div className="grid gap-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-600 font-bold">Nama Produk</FormLabel>
                              <FormControl>
                                <Input placeholder="Contoh: Kopi Susu Gula Aren" className="h-11 rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="barcode"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-slate-600 font-bold">Barcode / SKU</FormLabel>
                                <div className="flex gap-2">
                                  <FormControl>
                                    <Input placeholder="Scan barcode..." className="h-11 rounded-xl border-slate-200" {...field} />
                                  </FormControl>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button variant="outline" size="icon" type="button" className="h-11 w-11 rounded-xl shrink-0 border-slate-200">
                                        <Wand2 className="w-4 h-4" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-48 p-2" align="end">
                                       <div className="grid gap-1">
                                         <Button variant="ghost" size="sm" className="justify-start h-9 rounded-lg" onClick={() => generateBarcode('random')}>
                                           <RefreshCw className="w-3 h-3 mr-2" /> Kode Acak
                                         </Button>
                                         <Button variant="ghost" size="sm" className="justify-start h-9 rounded-lg" onClick={() => generateBarcode('loop')}>
                                           <Repeat className="w-3 h-3 mr-2" /> Kode Berurutan
                                         </Button>
                                       </div>
                                    </PopoverContent>
                                  </Popover>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-slate-600 font-bold">Status</FormLabel>
                                <Select value={field.value} onValueChange={field.onChange}>
                                  <FormControl>
                                    <SelectTrigger className="h-11 rounded-xl border-slate-200">
                                      <SelectValue placeholder="Pilih status" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="ACTIVE">Aktif (Dijual)</SelectItem>
                                    <SelectItem value="INACTIVE">Nonaktif</SelectItem>
                                    <SelectItem value="ARCHIVED">Arsip</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </section>

                    <section>
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Filter className="w-3 h-3" /> Klasifikasi & Relasi
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="categoryId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-600 font-bold">Kategori</FormLabel>
                              <Select
                                value={field.value?.toString()}
                                onValueChange={(v) => {
                                  const next = Number(v);
                                  field.onChange(next);
                                  const nextBrand = brands?.find((b: any) => b.status === "ACTIVE" && Number(b.categoryId) === next);
                                  if (nextBrand) form.setValue("brandId", Number(nextBrand.id));
                                }}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-11 rounded-xl border-slate-200">
                                    <SelectValue placeholder="Kategori" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {categories?.filter((c: any) => c.status === "ACTIVE").map((c: any) => (
                                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
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
                              <FormLabel className="text-slate-600 font-bold">Merek</FormLabel>
                              <Select
                                value={field.value?.toString()}
                                onValueChange={(v) => field.onChange(Number(v))}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-11 rounded-xl border-slate-200">
                                    <SelectValue placeholder="Merek" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {brands?.filter((b: any) => b.status === "ACTIVE" && Number(b.categoryId) === Number(categoryIdValue)).map((b: any) => (
                                    <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="supplierId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-600 font-bold">Pemasok</FormLabel>
                              <Select
                                value={field.value?.toString()}
                                onValueChange={(v) => field.onChange(Number(v))}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-11 rounded-xl border-slate-200">
                                    <SelectValue placeholder="Pemasok" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {suppliers?.filter((s: any) => s.status === "ACTIVE").map((s: any) => (
                                    <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </section>

                    <section>
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <ImageIcon className="w-3 h-3" /> Media & Deskripsi
                      </h3>
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="image"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <div className="flex flex-col sm:flex-row gap-4">
                                  <div className={cn(
                                    "w-full sm:w-32 h-32 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center relative overflow-hidden bg-slate-50 group transition-colors",
                                    field.value && "border-solid border-blue-200 bg-blue-50/30"
                                  )}>
                                    {field.value ? (
                                      <>
                                        <img src={getImageUrl(field.value)} alt="Preview" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                          <Button type="button" variant="ghost" size="icon" className="text-white" onClick={() => form.setValue('image', '')}>
                                            <Trash2 className="w-5 h-5" />
                                          </Button>
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        <ImageIcon className="w-8 h-8 text-slate-300 mb-1" />
                                        <span className="text-[10px] text-slate-400 font-bold uppercase">Foto Produk</span>
                                      </>
                                    )}
                                  </div>
                                  <div className="flex-1 space-y-2">
                                    <Input 
                                      type="file" 
                                      accept="image/*" 
                                      onChange={handleImageUpload} 
                                      disabled={uploading} 
                                      className="h-11 rounded-xl cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    />
                                    <p className="text-[10px] text-slate-400 italic">Format: JPG, PNG, WEBP. Maks: 2MB.</p>
                                  </div>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input placeholder="Tambahkan catatan atau deskripsi produk..." className="h-11 rounded-xl border-slate-200" {...field} value={field.value || ""} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </section>
                  </div>

                  {/* Right Column: Pricing & Stock */}
                  <div className="md:col-span-5 space-y-8">
                    <section className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Banknote className="w-3 h-3 text-emerald-500" /> Harga & Margin
                      </h3>
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="costPrice"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-600 font-bold">Harga Beli (Modal)</FormLabel>
                              <FormControl>
                                <MoneyInput
                                  valueDigits={String(field.value ?? "")}
                                  onValueDigitsChange={(digits) => field.onChange(digitsToNumber(digits))}
                                  placeholder="Rp 0"
                                  className="h-11 rounded-xl bg-white border-slate-200 text-lg font-bold"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="price"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-600 font-bold">Harga Jual</FormLabel>
                              <FormControl>
                                <MoneyInput
                                  valueDigits={String(field.value ?? "")}
                                  onValueDigitsChange={(digits) => field.onChange(digitsToNumber(digits))}
                                  placeholder="Rp 0"
                                  className="h-11 rounded-xl bg-white border-slate-200 text-lg font-bold text-blue-600"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="pt-2 flex justify-between items-center px-1">
                          <span className="text-xs font-bold text-slate-400">Potensi Laba:</span>
                          <span className="text-sm font-black text-emerald-600">
                            {formatCurrency(Math.max(0, Number(form.watch("price") || 0) - Number(form.watch("costPrice") || 0)))}
                          </span>
                        </div>
                      </div>
                    </section>

                    <section className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Boxes className="w-3 h-3 text-amber-500" /> Stok & Pengadaan
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="stock"
                          render={({ field }) => {
                            const stock = Number(field.value ?? 0);
                            const pcsPerCarton = Math.max(1, Number(form.watch("pcsPerCarton") ?? 1));
                            const isCarton = supportsCartonValue && pcsPerCarton > 1;
                            const cartons = isCarton ? Math.floor(stock / pcsPerCarton) : 0;
                            const remainder = isCarton ? stock % pcsPerCarton : 0;

                            return (
                              <FormItem>
                                <FormLabel className="text-slate-600 font-bold">Stok Awal (Unit Terkecil/Pcs)</FormLabel>
                                <FormControl>
                                  <Input type="number" className="h-11 rounded-xl border-slate-200 font-bold" {...field} />
                                </FormControl>
                                {isCarton && (
                                  <div className="text-xs text-blue-600 font-medium bg-blue-50 px-3 py-2 rounded-lg border border-blue-100 flex items-center gap-2">
                                     <Package className="w-3 h-3" />
                                     Setara: <span className="font-bold">{cartons} Karton</span> + <span className="font-bold">{remainder} Pcs</span>
                                  </div>
                                )}
                                <FormMessage />
                              </FormItem>
                            );
                          }}
                        />
                        <FormField
                          control={form.control}
                          name="minStock"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-600 font-bold">Batas Min.</FormLabel>
                              <FormControl>
                                <Input type="number" className="h-11 rounded-xl border-slate-200 font-bold" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </section>

                    <section className={cn(
                      "rounded-3xl p-6 border transition-all",
                      supportsCartonValue ? "bg-blue-50/50 border-blue-100 shadow-sm" : "bg-slate-50/30 border-slate-100 opacity-60"
                    )}>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                          <Package className="w-3 h-3" /> Penjualan Karton
                        </h3>
                        <FormField
                          control={form.control}
                          name="supportsCarton"
                          render={({ field }) => (
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="pcsPerCarton"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-500 text-[11px] font-bold">Isi per Karton</FormLabel>
                              <FormControl>
                                <Input type="number" disabled={!supportsCartonValue} className="h-10 rounded-xl bg-white border-slate-200" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="cartonPrice"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-500 text-[11px] font-bold">Harga Karton</FormLabel>
                              <FormControl>
                                <MoneyInput
                                  disabled={!supportsCartonValue}
                                  valueDigits={String(field.value ?? "")}
                                  onValueDigitsChange={(digits) => field.onChange(digitsToNumber(digits))}
                                  placeholder="Rp 0"
                                  className="h-10 rounded-xl bg-white border-slate-200"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </section>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-slate-50 border-t flex flex-col sm:flex-row justify-end gap-3">
                <Button type="button" variant="outline" className="h-11 px-8 rounded-xl order-2 sm:order-1" onClick={() => setIsDialogOpen(false)}>Batal</Button>
                <Button type="submit" disabled={isCreating || isUpdating} className="h-11 px-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-200 order-1 sm:order-2">
                  {isCreating || isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {editingProduct ? "Simpan Perubahan" : "Tambah Produk"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      </PageShell>
    </TooltipProvider>
  );
}
