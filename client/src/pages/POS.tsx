import { useMemo, useState, useRef, useEffect } from "react";
import { useCart } from "@/hooks/use-cart";
import { useAppSettings, useCustomers, useLoyaltySettings } from "@/hooks/use-others";
import { useCheckout, useRecallSuspendedSale, useSuspendSale, useSuspendedSales } from "@/hooks/use-transactions";
import { useActiveShift, useCloseShift, useOpenShift } from "@/hooks/use-shifts";
import { useAuth } from "@/hooks/use-auth";
import { useDiscountsPaged } from "@/hooks/use-discounts";
import { ProductCard } from "@/components/ProductCard";
import { MoneyInput } from "@/components/MoneyInput";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, ScanBarcode, Trash2, CreditCard, Banknote, User, Minus, Plus, Loader2, Receipt, ShoppingCart, CheckCircle2, Printer, XCircle, LayoutGrid, List, Pause, History, SlidersHorizontal, RefreshCcw, ArrowDownAZ, ArrowUpDown, TrendingUp, PlusCircle, Power, Monitor, FileText, AlertCircle, ReceiptText } from "lucide-react";
import { digitsToNumber, formatCurrency, getImageUrl, cn } from "@/lib/utils";
import { useToast, toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

import { ApiError, apiRequest } from "@/lib/queryClient";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePosFilters, usePosProducts } from "@/hooks/use-pos-products";

type ReceiptLine = {
  name: string;
  quantity: number;
  unitType: "PCS" | "CARTON";
  unitPrice: number;
  discount: number;
  lineTotal: number;
};

type ReceiptData = {
  storeName: string;
  storeAddress: string | null;
  receiptFooter: string | null;
  invoiceNo: string | null;
  transactionDate: string;
  cashierName: string;
  customerName: string | null;
  paymentMethod: string;
  subtotal: number;
  itemDiscount: number;
  redeemAmount: number;
  total: number;
  cashGiven: number | null;
  change: number;
  items: ReceiptLine[];
};

export default function POS() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedBrandId, setSelectedBrandId] = useState<number | undefined>(undefined);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(undefined);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | undefined>(undefined);
  const [stockStatus, setStockStatus] = useState<"all" | "in" | "low" | "out">("all");
  const [sort, setSort] = useState<"relevance" | "nameAsc" | "priceAsc" | "priceDesc" | "stockDesc" | "bestSelling30d">("relevance");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [cashGivenDigits, setCashGivenDigits] = useState("");
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [lastChange, setLastChange] = useState<number | null>(null);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<ReceiptData | null>(null);
  const [checkoutErrorOpen, setCheckoutErrorOpen] = useState(false);
  const [checkoutErrorTitle, setCheckoutErrorTitle] = useState("Transaksi gagal");
  const [checkoutErrorDescription, setCheckoutErrorDescription] = useState("Silakan coba lagi.");
  
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const debouncedSearch = useDebouncedValue(search, 250);
  const { data: posFilters } = usePosFilters();
  const parsedMinPrice = minPrice.trim() ? Number(minPrice) : undefined;
  const parsedMaxPrice = maxPrice.trim() ? Number(maxPrice) : undefined;
  const productsQuery = usePosProducts({
    q: debouncedSearch.trim() ? debouncedSearch.trim() : undefined,
    brandId: selectedBrandId,
    categoryId: selectedCategoryId,
    supplierId: selectedSupplierId,
    stockStatus,
    minPrice: Number.isFinite(parsedMinPrice as any) ? parsedMinPrice : undefined,
    maxPrice: Number.isFinite(parsedMaxPrice as any) ? parsedMaxPrice : undefined,
    sort,
    limit: viewMode === "grid" ? 48 : 60,
  });
  const products = useMemo(() => productsQuery.data?.pages.flatMap(p => p.items) ?? [], [productsQuery.data]);
  const isLoadingProducts = productsQuery.isLoading;
  const isLoadingMore = productsQuery.isFetchingNextPage;
  const { data: loyaltySettings } = useLoyaltySettings();
  const { data: appSettings } = useAppSettings();
  const { data: customersResult } = useCustomers({ status: "ACTIVE", page: 1, pageSize: 200, sortBy: "name", sortDir: "asc" });
  const customers = customersResult?.items ?? [];
  const { items, addItem, setItems, removeItem, updateQuantity, updateUnitType, clearCart, getTotal } = useCart();
  const { mutate: checkout, isPending: isCheckingOut } = useCheckout();
  const { data: suspendedSales } = useSuspendedSales();
  const { mutate: suspendSale, isPending: isSuspending } = useSuspendSale();
  const { mutate: recallSuspendedSale, isPending: isRecalling } = useRecallSuspendedSale();
  const { data: activeShiftData } = useActiveShift();
  const { mutate: openShift, isPending: isOpeningShift } = useOpenShift();
  const { mutate: closeShift, isPending: isClosingShift } = useCloseShift();
  
  const [customer, setCustomer] = useState<any>(null); // Local state for selected customer
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [recallOpen, setRecallOpen] = useState(false);
  const [suspendNote, setSuspendNote] = useState("");
  const [openShiftOpen, setOpenShiftOpen] = useState(false);
  const [closeShiftOpen, setCloseShiftOpen] = useState(false);
  const [openingCashDigits, setOpeningCashDigits] = useState("");
  const [openingNote, setOpeningNote] = useState("");
  const [terminalName, setTerminalName] = useState("");
  const [actualCashDigits, setActualCashDigits] = useState("");
  const [openShiftNow, setOpenShiftNow] = useState<Date>(() => new Date());
  const [closeNote, setCloseNote] = useState("");
  const [justAddedProductId, setJustAddedProductId] = useState<number | null>(null);

  const shiftActive = !!activeShiftData?.shift;
  const expectedCash = activeShiftData?.summary?.expectedCash ?? null;
  const cashDifferencePreview =
    expectedCash == null || actualCashDigits === "" ? null : digitsToNumber(actualCashDigits) - Number(expectedCash);

  useEffect(() => {
    if (!openShiftOpen) return;
    setOpenShiftNow(new Date());
    const t = window.setInterval(() => setOpenShiftNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, [openShiftOpen]);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("pos_terminal_name");
    if (saved && !terminalName.trim()) setTerminalName(saved);
  }, []);

  useEffect(() => {
    if (justAddedProductId == null) return;
    const t = window.setTimeout(() => setJustAddedProductId(null), 220);
    return () => window.clearTimeout(t);
  }, [justAddedProductId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        !!target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || (target as any).isContentEditable);

      if (e.key === "/" && !isTyping) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (e.key === "F2") {
        e.preventDefault();
        barcodeInputRef.current?.focus();
        return;
      }
      const isOpenPaymentShortcut =
        e.key === "F9" ||
        ((e.ctrlKey || e.metaKey) && e.key === "Enter") ||
        (e.altKey && e.key.toLowerCase() === "p");

      if (isOpenPaymentShortcut && !checkoutOpen) {
        e.preventDefault();
        openPaymentModal();
        return;
      }
      if (e.key === "Escape") {
        if (checkoutOpen) closePaymentModal();
        if (suspendOpen) setSuspendOpen(false);
        if (recallOpen) setRecallOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shiftActive, items.length, checkoutOpen, suspendOpen, recallOpen]);

  const { data: activeDiscounts } = useDiscountsPaged({ active: true, status: "ACTIVE" });
  const allDiscounts = activeDiscounts?.items ?? [];

  const getApplicableDiscounts = (product: any, price: number) => {
    return allDiscounts.filter(d => {
      // 1. Customer validation
      if (d.customerType) {
        if (!customer) return false;
        if (d.customerType !== customer.customerType) return false;
      }
      if (d.appliesTo === "customer" && !customer) return false;

      // 2. Minimum purchase validation
      const minPurchase = Number(d.minimumPurchase ?? 0);
      if (minPurchase > 0 && price < minPurchase) return false;

      // 3. Target validation
      if (d.appliesTo === "global") return true;
      if (d.appliesTo === "product" && Number(d.productId) === Number(product.id)) return true;
      if (d.appliesTo === "category" && Number((d as any).categoryId) === Number(product.categoryId)) return true;
      if (d.brandId && Number(d.brandId) === Number(product.brandId)) return true;
      
      return false;
    }).map(d => {
      let amount = 0;
      if (d.type === "PERCENTAGE") {
        amount = (price * Number(d.value)) / 100;
      } else {
        amount = Number(d.value);
      }
      return { ...d, amount, priority: Number(d.priorityLevel ?? 0) };
    });
  };

  const calculateBestDiscount = (product: any, price: number) => {
    const applicable = getApplicableDiscounts(product, price);
    if (applicable.length === 0) return 0;

    // Separate stackable and non-stackable
    const stackable = applicable.filter(d => d.stackable);
    const nonStackable = applicable.filter(d => !d.stackable);

    let maxDiscount = 0;

    // Scenario 1: Best non-stackable discount
    if (nonStackable.length > 0) {
      nonStackable.sort((a, b) => b.amount - a.amount || b.priority - a.priority);
      maxDiscount = Math.max(maxDiscount, nonStackable[0].amount);
    }

    // Scenario 2: Sum of all stackable discounts
    if (stackable.length > 0) {
      const stackableSum = stackable.reduce((sum, d) => sum + d.amount, 0);
      maxDiscount = Math.max(maxDiscount, stackableSum);
    }

    // Ensure discount doesn't exceed price
    return Math.min(price, maxDiscount);
  };

  const handleAddItem = (product: any) => {
    if (!shiftActive) {
      toast({ variant: "destructive", title: "Shift belum dibuka", description: "Buka shift terlebih dahulu untuk mulai transaksi." });
      return;
    }
    const unitPrice = Number(product.price);
    const discountAmount = calculateBestDiscount(product, unitPrice);
    addItem({ ...product, discount: discountAmount });
  };

  const totals = useMemo(() => {
    let subtotalBeforeDiscount = 0;
    let discountTotal = 0;
    for (const item of items) {
      const canCarton = Boolean(item.supportsCarton) && Number(item.pcsPerCarton) > 1 && item.cartonPrice != null;
      const unitType = (item as any).unitType === "CARTON" ? "CARTON" : "PCS";
      const unitPrice = unitType === "CARTON" && canCarton ? Number(item.cartonPrice) : Number(item.price);
      
      // Recalculate discount based on current cart item state (quantity/price might affect rules)
      const discountPerUnit = calculateBestDiscount(item, unitPrice);
      
      const lineTotal = unitPrice * item.quantity;
      const lineDiscount = discountPerUnit * item.quantity;
      
      subtotalBeforeDiscount += Math.max(0, lineTotal);
      discountTotal += Math.max(0, Math.min(lineTotal, lineDiscount));
    }
    const subtotalAfterDiscount = Math.max(0, subtotalBeforeDiscount - discountTotal);
    return { subtotalBeforeDiscount, discountTotal, subtotalAfterDiscount };
  }, [items, allDiscounts, customer]);

  const subtotal = getTotal();
  const globalDiscountAmount = 0;
  const finalTotal = totals.subtotalAfterDiscount;
  const redeemAmountPerPoint = Number(loyaltySettings?.redeemAmountPerPoint ?? 100);
  const earnAmountPerPoint = Number(loyaltySettings?.earnAmountPerPoint ?? 10000);
  const maxRedeemablePoints = customer
    ? Math.min(Number(customer.totalPoints ?? 0), redeemAmountPerPoint > 0 ? Math.floor(finalTotal / redeemAmountPerPoint) : 0)
    : 0;
  const pointsRedeemApplied = Math.min(Math.max(0, pointsToRedeem), Math.max(0, maxRedeemablePoints));
  const redeemAmount = pointsRedeemApplied * redeemAmountPerPoint;
  const payableTotal = Math.max(0, finalTotal - redeemAmount);
  const tierMultiplier =
    customer?.tierLevel === "PLATINUM"
      ? Number(loyaltySettings?.platinumPointMultiplier ?? 1.5)
      : customer?.tierLevel === "GOLD"
        ? Number(loyaltySettings?.goldPointMultiplier ?? 1.25)
        : customer?.tierLevel === "SILVER"
          ? Number(loyaltySettings?.silverPointMultiplier ?? 1.0)
          : 1.0;
  const estimatedPointsEarned =
    customer && earnAmountPerPoint > 0 ? Math.max(0, Math.floor(Math.floor(payableTotal / earnAmountPerPoint) * tierMultiplier)) : 0;

  const cashGiven = digitsToNumber(cashGivenDigits);
  const change = paymentMethod === "cash" ? Math.max(0, cashGiven - payableTotal) : 0;
  const isSufficient = paymentMethod === "cash" ? cashGiven >= payableTotal : true;

  const buildReceiptDraft = (): ReceiptData => {
    const storeName = appSettings?.storeName ?? "Barokah Frozen Food";
    const storeAddress = appSettings?.storeAddress ?? null;
    const receiptFooter = appSettings?.receiptFooter ?? null;
    const transactionDate = new Date().toISOString();
    const cashierName = user?.fullName || user?.username || "-";
    const customerName = customer?.name ?? null;
    const cashGiven = paymentMethod === "cash" ? digitsToNumber(cashGivenDigits) : null;

    const receiptItems: ReceiptLine[] = items.map((item) => {
      const canCarton = Boolean(item.supportsCarton) && Number(item.pcsPerCarton) > 1 && item.cartonPrice != null;
      const unitType = (item as any).unitType === "CARTON" ? "CARTON" : "PCS";
      const unitPrice = unitType === "CARTON" && canCarton ? Number(item.cartonPrice) : Number(item.price);
      const lineTotalRaw = Math.max(0, unitPrice * item.quantity);
      const lineDiscount = Math.max(0, Math.min(lineTotalRaw, Math.max(0, Number(item.discount ?? 0)) * item.quantity));
      const lineTotal = Math.max(0, lineTotalRaw - lineDiscount);
      return {
        name: item.name,
        quantity: item.quantity,
        unitType,
        unitPrice,
        discount: lineDiscount,
        lineTotal,
      };
    });

    return {
      storeName,
      storeAddress,
      receiptFooter,
      invoiceNo: null,
      transactionDate,
      cashierName,
      customerName,
      paymentMethod,
      subtotal: totals.subtotalBeforeDiscount,
      itemDiscount: totals.discountTotal,
      redeemAmount,
      total: payableTotal,
      cashGiven,
      change,
      items: receiptItems,
    };
  };

  const printReceipt = (data: ReceiptData) => {
    const win = window.open("", "receipt", "width=400,height=700");
    if (!win) return;
    const lines = data.items
      .map((i) => {
        const qty = `${i.quantity} ${i.unitType}`;
        const name = String(i.name).replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return `<tr><td style="padding:2px 0">${name}<div style="font-size:11px;color:#555">${qty} × ${formatCurrency(i.unitPrice)}</div></td><td style="padding:2px 0;text-align:right;white-space:nowrap">${formatCurrency(i.lineTotal)}</td></tr>`;
      })
      .join("");

    const headerStore = String(data.storeName).replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const headerAddress = data.storeAddress ? String(data.storeAddress).replace(/</g, "&lt;").replace(/>/g, "&gt;") : "";
    const invoice = data.invoiceNo ? String(data.invoiceNo).replace(/</g, "&lt;").replace(/>/g, "&gt;") : "-";
    const cashier = String(data.cashierName).replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const customerName = data.customerName ? String(data.customerName).replace(/</g, "&lt;").replace(/>/g, "&gt;") : "-";
    const footerLine = data.receiptFooter ? String(data.receiptFooter).replace(/</g, "&lt;").replace(/>/g, "&gt;") : "";

    win.document.open();
    win.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Struk</title>
<style>
  body{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;margin:0;padding:12px;color:#111}
  .center{text-align:center}
  .muted{color:#555;font-size:11px}
  table{width:100%;border-collapse:collapse}
  .rule{border-top:1px dashed #999;margin:10px 0}
  .totals td{padding:2px 0}
  @media print { body{padding:0} }
</style>
</head>
<body>
  <div class="center" style="font-weight:700;font-size:16px">${headerStore}</div>
  ${headerAddress ? `<div class="center muted">${headerAddress}</div>` : ""}
  <div class="center muted">No. invoice: ${invoice}</div>
  <div class="center muted">${new Date(data.transactionDate).toLocaleString()}</div>
  <div class="rule"></div>
  <div class="muted">Kasir: ${cashier}</div>
  <div class="muted">Pelanggan: ${customerName}</div>
  <div class="rule"></div>
  <table>${lines}</table>
  <div class="rule"></div>
  <table class="totals">
    <tr><td>Subtotal</td><td style="text-align:right">${formatCurrency(data.subtotal)}</td></tr>
    <tr><td>Diskon Item</td><td style="text-align:right">-${formatCurrency(data.itemDiscount)}</td></tr>
    <tr><td>Tukar poin</td><td style="text-align:right">-${formatCurrency(data.redeemAmount)}</td></tr>
    <tr><td style="font-weight:700">Total</td><td style="text-align:right;font-weight:700">${formatCurrency(data.total)}</td></tr>
    <tr><td>Metode</td><td style="text-align:right">${String(data.paymentMethod).toUpperCase()}</td></tr>
    ${data.cashGiven != null ? `<tr><td>Tunai</td><td style="text-align:right">${formatCurrency(data.cashGiven)}</td></tr>` : ""}
    <tr><td>Kembalian</td><td style="text-align:right">${formatCurrency(data.change)}</td></tr>
  </table>
  <div class="rule"></div>
  ${footerLine ? `<div class="center muted">${footerLine}</div>` : ""}
  <div class="center muted">Terima kasih</div>
</body>
</html>`);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  const showCheckoutError = (title: string, description: string) => {
    const safeDescription = /<\w|<\/\w|<ol|<div|class=/.test(description)
      ? "Tidak bisa memproses transaksi. Silakan coba lagi."
      : description;
    setCheckoutErrorTitle(title);
    setCheckoutErrorDescription(safeDescription);
    setCheckoutErrorOpen(true);
  };

  const openPaymentModal = () => {
    if (!shiftActive) {
      toast({ variant: "destructive", title: "Shift belum dibuka", description: "Buka shift terlebih dahulu untuk mulai transaksi." });
      return;
    }
    if (items.length === 0) {
      toast({ variant: "destructive", title: "Keranjang kosong", description: "Tambahkan item terlebih dahulu." });
      return;
    }
    setCheckoutOpen(true);
  };

  const closePaymentModal = () => {
    setCheckoutOpen(false);
  };

  // Reset cash input when modal opens
  useEffect(() => {
    if (checkoutOpen) {
      setCashGivenDigits("");
    }
  }, [checkoutOpen]);

  useEffect(() => {
    setPointsToRedeem(0);
  }, [customer?.id]);

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftActive) {
      toast({ variant: "destructive", title: "Shift belum dibuka", description: "Buka shift terlebih dahulu untuk mulai transaksi." });
      return;
    }
    if (!barcodeInput) return;
    
    try {
      // Use apiRequest helper to ensure auth headers are sent
      const res = await apiRequest("GET", `/api/products/barcode/${barcodeInput}`);
      
      const product = await res.json();
      if (product.stock > 0) {
        handleAddItem(product);
        toast({ title: "Item ditambahkan", description: `${product.name} masuk ke cart.` });
        setBarcodeInput("");
        barcodeInputRef.current?.focus();
      } else {
        toast({ variant: "destructive", title: "Stok habis", description: "Produk tidak tersedia." });
      }
    } catch (err: any) {
      // apiRequest throws if not ok
      if (err.message.includes("404")) {
        toast({ variant: "destructive", title: "Tidak ditemukan", description: "Barcode tidak ditemukan." });
      } else {
        toast({ variant: "destructive", title: "Gagal scan", description: "Tidak bisa mengambil data barcode." });
      }
    }
  };

  const handleCheckout = () => {
    if (!shiftActive) {
      toast({ variant: "destructive", title: "Shift belum dibuka", description: "Buka shift terlebih dahulu untuk mulai transaksi." });
      return;
    }
    if (items.length === 0) return;
    if (!isSufficient) return;
    
    const receiptDraft = buildReceiptDraft();

    checkout({
      customerId: customer?.id,
      pointsToRedeem: pointsRedeemApplied,
      items: items.map(i => ({ 
        productId: i.id, 
        quantity: i.quantity,
        unitType: (i as any).unitType === "CARTON" ? "CARTON" : "PCS",
        discount: Math.max(0, Number(i.discount ?? 0)) * i.quantity,
      })),
      globalDiscount: globalDiscountAmount,
      paymentMethod,
    }, {
      onSuccess: (sale) => {
        const invoiceNo = (sale as any)?.invoiceNo ?? receiptDraft.invoiceNo;
        setLastReceipt({ ...receiptDraft, invoiceNo });
        setCheckoutOpen(false);
        clearCart();
        setPointsToRedeem(0);
        setLastChange(change);
        setShowSuccessAlert(true);
      },
      onError: (error) => {
        if (error instanceof ApiError && error.code === "INSUFFICIENT_STOCK" && error.details) {
          const unitLabel = error.details.unitType === "CARTON" ? "pcs (dari karton)" : "pcs";
          showCheckoutError(
            "Stok tidak cukup",
            `${error.details.productName} • tersedia ${error.details.availableQty} ${unitLabel} • butuh ${error.details.requiredQty} ${unitLabel}`,
          );
          return;
        }
        showCheckoutError("Transaksi gagal", error?.message || "Terjadi kesalahan. Silakan coba lagi.");
      }
    });
  };

  const handleSuspend = () => {
    if (!shiftActive) {
      toast({ variant: "destructive", title: "Shift belum dibuka", description: "Buka shift terlebih dahulu untuk mulai transaksi." });
      return;
    }
    if (items.length === 0) return;
    suspendSale({
      customerId: customer?.id,
      pointsToRedeem: pointsRedeemApplied,
      items: items.map(i => ({
        productId: i.id,
        quantity: i.quantity,
        unitType: (i as any).unitType === "CARTON" ? "CARTON" : "PCS",
        discount: i.discount
      })),
      globalDiscount: globalDiscountAmount,
      paymentMethod,
      note: suspendNote || undefined,
    }, {
      onSuccess: () => {
        setSuspendOpen(false);
        setSuspendNote("");
        clearCart();
        setCustomer(null);
        setPointsToRedeem(0);
        toast({ title: "Transaksi ditunda", description: "Transaksi berhasil disimpan sementara." });
      },
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "Gagal menunda transaksi",
          description: error.message || "Silakan coba lagi.",
        });
      }
    });
  };

  const handleOpenShift = () => {
    const cash = digitsToNumber(openingCashDigits);
    if (!Number.isFinite(cash) || cash < 0) {
      toast({ variant: "destructive", title: "Input tidak valid", description: "Kas awal harus berupa angka >= 0." });
      return;
    }
    const terminal = terminalName.trim();
    if (!terminal) {
      toast({ variant: "destructive", title: "Terminal wajib diisi", description: "Isi nama terminal/device (contoh: Kasir-01)." });
      return;
    }

    localStorage.setItem("pos_terminal_name", terminal);

    openShift(
      {
        openingCash: cash,
        note: openingNote?.trim() ? openingNote.trim() : undefined,
        terminalName: terminal,
        clientOpenedAt: new Date().toISOString(),
      },
      {
        onSuccess: () => {
          setOpenShiftOpen(false);
          setOpeningCashDigits("");
          setOpeningNote("");
          toast({ title: "Shift dibuka", description: `Kas awal: ${formatCurrency(cash)}` });
        },
        onError: (error: any) => {
          toast({ variant: "destructive", title: "Gagal membuka shift", description: error?.message || "Silakan coba lagi." });
        },
      },
    );
  };

  const handleCloseShift = () => {
    if (items.length > 0) {
      toast({ variant: "destructive", title: "Cart belum kosong", description: "Kosongkan cart sebelum menutup shift." });
      return;
    }
    const cash = digitsToNumber(actualCashDigits);
    if (!Number.isFinite(cash) || cash < 0) {
      toast({ variant: "destructive", title: "Input tidak valid", description: "Kas aktual harus berupa angka >= 0." });
      return;
    }
    if (cashDifferencePreview != null && Math.abs(Number(cashDifferencePreview)) >= 0.01 && !closeNote.trim()) {
      toast({ variant: "destructive", title: "Alasan wajib", description: "Isi alasan/catatan jika ada selisih kas." });
      return;
    }

    closeShift(
      { actualCash: cash, closeNote: closeNote.trim() ? closeNote.trim() : undefined },
      {
        onSuccess: (data: any) => {
          setCloseShiftOpen(false);
          setActualCashDigits("");
          setCloseNote("");
          clearCart();
          setCustomer(null);
          toast({ title: "Shift ditutup", description: `Selisih: ${formatCurrency(data?.shift?.cashDifference ?? 0)}` });
        },
        onError: (error: any) => {
          if (error?.code === "PENDING_SUSPENDED_SALES") {
            setCloseShiftOpen(false);
            setRecallOpen(true);
            toast({
              variant: "destructive",
              title: "Tidak bisa tutup shift",
              description: "Masih ada transaksi tersimpan. Buka menu Ambil untuk melanjutkan atau menghapus transaksi yang ditunda.",
            });
            return;
          }
          toast({ variant: "destructive", title: "Gagal menutup shift", description: error?.message || "Silakan coba lagi." });
        },
      },
    );
  };

  return (
    <div className="h-screen flex overflow-hidden bg-slate-50">
      {/* LEFT: Product Catalog */}
      <div className="flex-1 flex flex-col min-w-0 pr-0 border-r">
        {/* Header / Search */}
        <div className="p-6 bg-white border-b space-y-4">
          <div className={cn(
            "relative overflow-hidden rounded-xl border-2 p-4 transition-all duration-300 shadow-sm",
            shiftActive 
              ? "bg-white border-emerald-100" 
              : "bg-white border-amber-100"
          )}>
            {!shiftActive ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center shrink-0 border border-amber-100">
                    <Pause className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">Shift belum dibuka</h3>
                    <p className="text-xs text-slate-500">Masukkan kas awal untuk mulai mencatat transaksi hari ini.</p>
                  </div>
                </div>
                <Button 
                  className="h-11 px-6 bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-200/50 font-bold rounded-xl" 
                  onClick={() => setOpenShiftOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" /> Buka Shift Baru
                </Button>
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1">
                  <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100 shadow-inner">
                    <User className="w-7 h-7 text-emerald-600" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-800 text-lg">
                        {activeShiftData?.shift?.userName?.trim() ? activeShiftData.shift.userName : "Kasir"}
                      </span>
                      <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold text-[10px] uppercase tracking-wider">
                        {activeShiftData?.shift?.userRole || "CASHIER"}
                      </Badge>
                      <Badge className="bg-blue-50 text-blue-700 border-blue-100 font-bold text-[10px] uppercase tracking-wider">
                        {activeShiftData?.shift?.terminalName || "TERMINAL -"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
                      <div className="flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5 text-slate-400" />
                        {activeShiftData?.shift?.openedAt ? format(new Date(activeShiftData.shift.openedAt as any), "dd MMM, HH:mm") : "-"}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Receipt className="w-3.5 h-3.5 text-slate-400" />
                        {activeShiftData?.summary?.totalTransactions ?? 0} Transaksi
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Banknote className="w-3.5 h-3.5 text-slate-400" />
                        Net {formatCurrency(((activeShiftData?.summary?.cashSales ?? 0) - (activeShiftData?.summary?.cashRefunds ?? 0)) as any)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <Button 
                    variant="outline" 
                    className={cn(
                      "h-11 px-6 font-bold rounded-xl transition-all",
                      items.length > 0 
                        ? "opacity-50 grayscale border-slate-200" 
                        : "border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                    )}
                    onClick={() => setCloseShiftOpen(true)} 
                    disabled={items.length > 0}
                  >
                    <XCircle className="w-4 h-4 mr-2" /> Tutup Shift
                  </Button>
                  {items.length > 0 && (
                    <p className="text-[10px] font-bold text-red-500 animate-pulse uppercase tracking-tight">
                      Kosongkan keranjang untuk menutup shift
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                ref={searchInputRef}
                placeholder="Cari nama / barcode (shortcut: /)" 
                className="pl-9 h-11 bg-slate-50 border-slate-200 focus-visible:ring-primary/20"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <form onSubmit={handleBarcodeSubmit} className="relative w-64">
              <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
              <Input 
                ref={barcodeInputRef}
                placeholder="Scan barcode (F2)" 
                className="pl-9 h-11 border-primary/20 focus-visible:ring-primary/20 bg-primary/5"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
              />
            </form>

            <div className="flex bg-slate-100 p-1 rounded-md border border-slate-200">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="icon"
                className="h-9 w-9 shadow-none"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="icon"
                className="h-9 w-9 shadow-none"
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex items-center gap-2 shrink-0">
              <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filter</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                value={selectedCategoryId ? String(selectedCategoryId) : "all"}
                onChange={(e) => {
                  const nextCategoryId = e.target.value === "all" ? undefined : Number(e.target.value);
                  setSelectedCategoryId(nextCategoryId);
                  if (nextCategoryId && selectedBrandId) {
                    const selected = posFilters?.brands?.find((b) => Number(b.id) === Number(selectedBrandId));
                    const brandCategoryId = selected ? Number((selected as any).categoryId) : null;
                    if (brandCategoryId && brandCategoryId !== nextCategoryId) setSelectedBrandId(undefined);
                  }
                }}
              >
                <option value="all">Semua kategori</option>
                {posFilters?.categories?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <select
                className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                value={selectedBrandId ? String(selectedBrandId) : "all"}
                onChange={(e) => setSelectedBrandId(e.target.value === "all" ? undefined : Number(e.target.value))}
              >
                <option value="all">Semua brand</option>
                {posFilters?.brands
                  ?.filter((b) => !selectedCategoryId || Number((b as any).categoryId) === Number(selectedCategoryId))
                  .map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
              </select>

              <select
                className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                value={selectedSupplierId ? String(selectedSupplierId) : "all"}
                onChange={(e) => setSelectedSupplierId(e.target.value === "all" ? undefined : Number(e.target.value))}
              >
                <option value="all">Semua pemasok</option>
                {posFilters?.suppliers?.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              <select
                className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                value={stockStatus}
                onChange={(e) => setStockStatus(e.target.value as any)}
              >
                <option value="all">Semua stok</option>
                <option value="in">Tersedia</option>
                <option value="low">Stok menipis</option>
                <option value="out">Habis</option>
              </select>

              <select
                className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                value={sort}
                onChange={(e) => setSort(e.target.value as any)}
              >
                <option value="relevance">Relevansi</option>
                <option value="nameAsc">A-Z</option>
                <option value="priceAsc">Harga ↑</option>
                <option value="priceDesc">Harga ↓</option>
                <option value="stockDesc">Stok terbanyak</option>
                <option value="bestSelling30d">Terlaris 30 hari</option>
              </select>

              <div className="flex items-center gap-2">
                <Input
                  inputMode="numeric"
                  placeholder="Min Rp"
                  className="h-9 w-24 sm:w-28 bg-white focus-visible:ring-primary/20"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                />
                <Input
                  inputMode="numeric"
                  placeholder="Max Rp"
                  className="h-9 w-24 sm:w-28 bg-white focus-visible:ring-primary/20"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                className="h-9 font-medium"
                onClick={() => {
                  setSelectedBrandId(undefined);
                  setSelectedCategoryId(undefined);
                  setSelectedSupplierId(undefined);
                  setStockStatus("all");
                  setSort("relevance");
                  setMinPrice("");
                  setMaxPrice("");
                  setSearch("");
                  searchInputRef.current?.focus();
                }}
              >
                <RefreshCcw className="w-4 h-4 mr-2" />
                Atur ulang
              </Button>
            </div>
          </div>
        </div>

        {/* Product Grid */}
        <ScrollArea className="flex-1 p-6">
          {isLoadingProducts ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
              {Array.from({ length: 12 }).map((_, idx) => (
                <div key={idx} className="rounded-xl border bg-white/50 animate-pulse">
                  <div className="h-32 border-b bg-slate-100 rounded-t-xl" />
                  <div className="p-5 space-y-3">
                    <div className="h-3 w-20 bg-slate-100 rounded" />
                    <div className="h-5 w-40 bg-slate-100 rounded" />
                    <div className="h-10 w-full bg-slate-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : viewMode === "grid" ? (
            <div className="pb-20">
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map((product) => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    discount={calculateBestDiscount(product, Number(product.price))}
                    lowStockThreshold={posFilters?.lowStockThreshold ?? 10}
                    onClick={() => handleAddItem(product)} 
                  />
                ))}
                {products.length === 0 && (
                  <div className="col-span-full">
                    <div className="text-center py-20 text-muted-foreground">
                      <div className="text-lg font-semibold">Produk tidak ditemukan</div>
                      <div className="text-sm mt-1">Coba ubah filter atau kata kunci pencarian.</div>
                      <div className="text-xs mt-3 text-muted-foreground/70">Shortcut: / fokus search • F2 scan • F9 checkout</div>
                    </div>
                  </div>
                )}
              </div>
              {productsQuery.hasNextPage && (
                <div className="mt-6 flex justify-center">
                  <Button
                    variant="outline"
                    className="h-10"
                    onClick={() => productsQuery.fetchNextPage()}
                    disabled={isLoadingMore}
                  >
                    {isLoadingMore ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Muat lebih banyak
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2 pb-20">
              {products.map((product) => {
                const discount = calculateBestDiscount(product, Number(product.price));
                const finalPrice = Math.max(0, Number(product.price) - discount);
                const isOutOfStock = product.stock === 0;
                const canCarton = Boolean(product.supportsCarton) && Number(product.pcsPerCarton) > 1 && product.cartonPrice != null;
                const cartonPrice = canCarton ? Number(product.cartonPrice) : null;
                const stockCartons = canCarton ? Number((product as any).stockCartons ?? 0) : 0;
                const stockRemainderPcs = canCarton ? Number((product as any).stockRemainderPcs ?? product.stock) : product.stock;
                const threshold =
                  Number((product as any)?.minStock ?? 0) > 0
                    ? Number((product as any).minStock)
                    : (posFilters?.lowStockThreshold ?? 10);
                const isLowStock = product.stock > 0 && product.stock <= threshold;
                const justAdded = justAddedProductId === product.id;

                const handleAddProduct = () => {
                  if (isOutOfStock) return;
                  setJustAddedProductId(product.id);
                  handleAddItem(product);
                };

                return (
                  <div
                    key={product.id}
                    onClick={handleAddProduct}
                    className={[
                      "relative flex items-center gap-4 p-3 rounded-xl border cursor-pointer transition-all duration-150",
                      "bg-gradient-to-r from-white via-slate-50 to-slate-100",
                      "border-slate-300 hover:border-primary/50 hover:shadow-md hover:shadow-primary/10",
                      justAdded ? "scale-[0.98] ring-2 ring-primary/40" : "",
                      isOutOfStock ? "opacity-60 pointer-events-none" : "",
                    ].join(" ")}
                  >
                    <div className="w-14 h-14 bg-slate-100 rounded-lg overflow-hidden shrink-0 border border-slate-200">
                      {product.image ? (
                        <img src={getImageUrl(product.image)} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <LayoutGrid className="w-6 h-6" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
                              {product.brand?.name || "Generic"}
                            </span>
                            {product.category?.name ? (
                              <span className="text-[11px] text-muted-foreground/80 truncate">
                                • {product.category.name}
                              </span>
                            ) : null}
                          </div>
                          <div className="font-medium text-sm truncate">{product.name}</div>
                        </div>
                        {discount > 0 && (
                          <span className="shrink-0 rounded-full bg-red-500/10 text-red-600 text-[10px] font-semibold px-2 py-0.5">
                            PROMO
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {product.barcode && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">
                            {product.barcode}
                          </span>
                        )}
                        <span
                          className={[
                            "px-2 py-0.5 rounded-full border",
                            isOutOfStock
                              ? "bg-red-50 border-red-200 text-red-700"
                              : isLowStock
                                ? "bg-amber-50 border-amber-200 text-amber-800"
                                : "bg-emerald-50 border-emerald-200 text-emerald-800",
                          ].join(" ")}
                        >
                          {canCarton && stockCartons > 0
                            ? `Stok: ${stockCartons} karton • ${stockRemainderPcs} pcs`
                            : `Stok: ${product.stock} pcs`}
                        </span>
                        {canCarton && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700">
                            {Number((product as any).pcsPerCarton ?? product.pcsPerCarton)} pcs/karton
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end justify-center gap-1 text-right min-w-[120px]">
                      <div className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
                        {discount > 0 ? "Harga Diskon" : "Harga Normal"}
                      </div>
                      <div className="font-bold text-base text-primary">
                        {formatCurrency(finalPrice)}
                      </div>
                      {discount > 0 && (
                        <div className="text-[11px] text-muted-foreground">
                          <span className="line-through mr-1">{formatCurrency(product.price)}</span>
                          <span className="text-emerald-700 font-semibold">Hemat {formatCurrency(discount)}</span>
                        </div>
                      )}
                      {canCarton && cartonPrice != null && (
                        <div className="text-[11px] text-muted-foreground">
                          Karton: {formatCurrency(cartonPrice)}
                        </div>
                      )}
                    </div>

                    <Button
                      size="icon"
                      variant="ghost"
                      className="shrink-0 h-8 w-8 ml-2 bg-primary/5 text-primary hover:bg-primary hover:text-white rounded-full"
                      disabled={isOutOfStock}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddProduct();
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>

                    {justAdded && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-lg animate-in fade-in zoom-in duration-150">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {products.length === 0 && (
                <div className="text-center py-20 text-muted-foreground">
                  Produk tidak ditemukan.
                </div>
              )}
              {productsQuery.hasNextPage && (
                <div className="pt-4 flex justify-center">
                  <Button
                    variant="outline"
                    className="h-10"
                    onClick={() => productsQuery.fetchNextPage()}
                    disabled={isLoadingMore}
                  >
                    {isLoadingMore ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Muat lebih banyak
                  </Button>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* RIGHT: Cart & Checkout */}
      <div className="w-[400px] bg-white flex flex-col shadow-2xl z-10">
        {/* Customer Selector */}
        <div className="p-4 border-b bg-slate-50/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pelanggan</span>
            {customer && (
              <button onClick={() => setCustomer(null)} className="text-xs text-red-500 hover:underline">
                Hapus
              </button>
            )}
          </div>
          {customer ? (
            <div className="bg-primary/10 text-primary px-3 py-2 rounded-lg flex items-center gap-3 border border-primary/20">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                {customer.name.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-sm">{customer.name}</p>
                <p className="text-xs opacity-80">{customer.totalPoints} pts</p>
              </div>
            </div>
          ) : (
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <select 
                className="w-full h-10 pl-9 pr-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                onChange={(e) => {
                  const c = customers?.find(c => c.id.toString() === e.target.value);
                  setCustomer(c || null);
                }}
                value=""
              >
                <option value="" disabled>Pilih customer (opsional)</option>
                {customers?.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto pos-scrollbar p-4 space-y-3">
          <div className="flex justify-end mb-2">
            {items.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-3 h-3 mr-1" /> Kosongkan cart
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Kosongkan cart?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Semua item di cart akan dihapus. Tindakan ini tidak bisa dibatalkan.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        clearCart();
                        setCustomer(null);
                      }}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Hapus
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
              <ShoppingCart className="w-16 h-16 mb-4 stroke-1" />
              <p>Cart kosong</p>
            </div>
          ) : (
            items.map((item) => {
              const canCarton = Boolean(item.supportsCarton) && Number(item.pcsPerCarton) > 1 && item.cartonPrice != null;
              const unitType = (item as any).unitType === "CARTON" ? "CARTON" : "PCS";
              const unitPrice = unitType === "CARTON" && canCarton ? Number(item.cartonPrice) : Number(item.price);
              const lineDiscount = Math.max(0, Number(item.discount ?? 0)) * item.quantity;
              const lineSubtotal = Math.max(0, (unitPrice * item.quantity) - lineDiscount);
              const conversionText = canCarton ? `1 Karton = ${Number(item.pcsPerCarton)} pcs` : "";

              return (
                <div key={item.id} className="bg-white rounded-lg border p-3 shadow-sm group">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-sm line-clamp-2">{item.name}</h4>
                    <button 
                      onClick={() => removeItem(item.id)}
                      className="text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <select
                        className="h-9 rounded-md border border-input bg-background px-2 text-xs font-semibold"
                        value={unitType}
                        onChange={(e) => updateUnitType(item.id, e.target.value as any)}
                      >
                        <option value="PCS">PCS</option>
                        {canCarton && <option value="CARTON">KARTON</option>}
                      </select>

                      <div className="flex items-center gap-3 bg-slate-100 rounded-md p-1">
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm hover:text-primary disabled:opacity-50"
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm hover:text-primary"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-base">{formatCurrency(Math.max(0, lineSubtotal))}</div>
                      <div className="text-xs text-muted-foreground">{formatCurrency(unitPrice)} / {unitType === "CARTON" ? "Karton" : "Pcs"}</div>
                      {unitType === "CARTON" && conversionText && (
                        <div className="text-xs text-muted-foreground">{conversionText}</div>
                      )}
                      {item.discount > 0 && (
                        <div className="text-xs text-green-600 font-medium">Diskon {formatCurrency(item.discount)} / unit</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Totals Section */}
        <div className="p-6 bg-slate-50 border-t space-y-3">
          <div className="rounded-xl border bg-white p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatCurrency(totals.subtotalBeforeDiscount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total diskon</span>
              <span className={totals.discountTotal > 0 ? "font-medium text-emerald-700" : "font-medium"}>
                -{formatCurrency(totals.discountTotal)}
              </span>
            </div>
            {globalDiscountAmount > 0 && (
              <div className="flex justify-between text-sm text-emerald-700">
                <span className="text-muted-foreground">Diskon transaksi</span>
                <span className="font-medium">-{formatCurrency(globalDiscountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Pajak</span>
              <span className="font-medium">Rp 0</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between items-end">
              <span className="font-bold text-lg">Grand total</span>
              <span className="font-extrabold text-3xl text-primary">{formatCurrency(finalTotal)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="h-11"
              onClick={() => setSuspendOpen(true)}
              disabled={!shiftActive || items.length === 0}
            >
              <Pause className="w-4 h-4 mr-2" />
              Tunda
            </Button>
            <Button
              variant="outline"
              className="h-11"
              onClick={() => setRecallOpen(true)}
              disabled={!shiftActive}
            >
              <History className="w-4 h-4 mr-2" />
              Ambil ({suspendedSales?.length ?? 0})
            </Button>
          </div>

          <Button
            className="w-full h-14 text-lg font-bold shadow-lg shadow-primary/20"
            size="lg"
            onClick={openPaymentModal}
            disabled={!shiftActive || items.length === 0}
          >
            Checkout (F9 / Ctrl+Enter)
          </Button>
        </div>
      </div>

      <Dialog open={openShiftOpen} onOpenChange={setOpenShiftOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 bg-amber-50 border-b border-amber-100">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center shadow-sm text-amber-600">
                <PlusCircle className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-amber-900">Buka Shift Baru</DialogTitle>
                <p className="text-xs text-amber-800/60 font-medium">Lengkapi data kas awal untuk memulai</p>
              </div>
            </div>
          </DialogHeader>
          
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kasir</p>
                <p className="text-sm font-bold text-slate-700">{user?.fullName ?? "-"}</p>
                <p className="text-[10px] text-slate-500 uppercase font-medium">{user?.role ?? "-"}</p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Waktu Buka</p>
                <p className="text-sm font-bold text-slate-700">{format(openShiftNow, "HH:mm")}</p>
                <p className="text-[10px] text-slate-500 uppercase font-medium">{format(openShiftNow, "dd MMM yyyy")}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-600 flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-slate-400" /> Kas Awal
                </Label>
                <MoneyInput
                  className="h-12 text-lg font-bold bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl"
                  valueDigits={openingCashDigits}
                  onValueDigitsChange={setOpeningCashDigits}
                  placeholder="Rp 0"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-600 flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-slate-400" /> Nama Terminal
                </Label>
                <Input
                  className="h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl"
                  placeholder="Contoh: Kasir Utama / Meja 1"
                  value={terminalName}
                  onChange={(e) => setTerminalName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-600 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400" /> Catatan Tambahan
                </Label>
                <Input
                  className="h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl"
                  placeholder="Opsional..."
                  value={openingNote}
                  onChange={(e) => setOpeningNote(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="p-6 bg-slate-50 border-t flex gap-3">
            <Button variant="ghost" className="flex-1 font-bold h-12 rounded-xl" onClick={() => setOpenShiftOpen(false)}>
              Batal
            </Button>
            <Button 
              className="flex-[2] h-12 bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-200/50 font-bold rounded-xl" 
              onClick={handleOpenShift} 
              disabled={isOpeningShift}
            >
              {isOpeningShift ? <Loader2 className="w-5 h-5 animate-spin" /> : "KONFIRMASI BUKA SHIFT"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={closeShiftOpen} onOpenChange={setCloseShiftOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 bg-red-50 border-b border-red-100">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center shadow-sm text-red-600">
                <Power className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-red-900">Tutup Shift Kasir</DialogTitle>
                <p className="text-xs text-red-800/60 font-medium">Pastikan semua transaksi telah selesai</p>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-6">
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ringkasan Shift</p>
              <div className="grid grid-cols-2 gap-px bg-slate-200 rounded-2xl overflow-hidden border border-slate-200">
                <div className="bg-white p-3 space-y-1">
                  <p className="text-[10px] font-medium text-slate-500 uppercase">Total Transaksi</p>
                  <p className="font-bold text-slate-800">{activeShiftData?.summary?.totalTransactions ?? 0}</p>
                </div>
                <div className="bg-white p-3 space-y-1">
                  <p className="text-[10px] font-medium text-slate-500 uppercase">Total Omzet</p>
                  <p className="font-bold text-slate-800">{formatCurrency(activeShiftData?.summary?.totalSales ?? 0)}</p>
                </div>
                <div className="bg-white p-3 space-y-1 text-emerald-600">
                  <p className="text-[10px] font-medium text-slate-500 uppercase">Tunai Masuk</p>
                  <p className="font-bold">{formatCurrency(activeShiftData?.summary?.cashSales ?? 0)}</p>
                </div>
                <div className="bg-white p-3 space-y-1 text-blue-600">
                  <p className="text-[10px] font-medium text-slate-500 uppercase">Non-Tunai</p>
                  <p className="font-bold">{formatCurrency(activeShiftData?.summary?.nonCashSales ?? 0)}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl space-y-1">
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Estimasi Kas di Laci</p>
                <h4 className="text-2xl font-black tabular-nums text-blue-700">{formatCurrency(expectedCash ?? 0)}</h4>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-600">Kas Aktual (Uang Fisik)</Label>
                <MoneyInput
                  className="h-14 text-2xl font-black text-center bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-2xl"
                  valueDigits={actualCashDigits}
                  onValueDigitsChange={setActualCashDigits}
                  placeholder={expectedCash == null ? "0" : formatCurrency(expectedCash)}
                  autoFocus
                />
              </div>

              <div className={cn(
                "flex justify-between items-center p-4 rounded-2xl border-2 transition-all",
                (cashDifferencePreview ?? 0) === 0 
                  ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
                  : (cashDifferencePreview ?? 0) < 0 
                    ? "bg-red-50 border-red-100 text-red-700" 
                    : "bg-orange-50 border-orange-100 text-orange-700"
              )}>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Selisih Kas</p>
                  <p className="text-xl font-black tabular-nums">{formatCurrency(cashDifferencePreview ?? 0)}</p>
                </div>
                {(cashDifferencePreview ?? 0) === 0 ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
              </div>

              {cashDifferencePreview != null && Math.abs(Number(cashDifferencePreview)) >= 0.01 && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <Label className="text-sm font-bold text-slate-600">Alasan Selisih <span className="text-red-500">*</span></Label>
                  <Input
                    className="h-11 bg-slate-50 border-red-100 focus:border-red-300 transition-all rounded-xl"
                    placeholder="Wajib diisi..."
                    value={closeNote}
                    onChange={(e) => setCloseNote(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="p-6 bg-slate-50 border-t flex gap-3">
            <Button variant="ghost" className="flex-1 font-bold h-12 rounded-xl" onClick={() => setCloseShiftOpen(false)}>
              Batal
            </Button>
            <Button
              className="flex-[2] h-12 bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200/50 font-bold rounded-xl"
              onClick={handleCloseShift}
              disabled={!shiftActive || isClosingShift || actualCashDigits === "" || items.length > 0}
            >
              {isClosingShift ? <Loader2 className="w-5 h-5 animate-spin" /> : "KONFIRMASI TUTUP SHIFT"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={suspendOpen} onOpenChange={setSuspendOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Pause className="w-4 h-4 text-primary" />
              Tunda Transaksi
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Catatan (opsional)</Label>
              <Input
                placeholder="Contoh: Pelanggan minta ambil dompet"
                className="h-10"
                value={suspendNote}
                onChange={(e) => setSuspendNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSuspendOpen(false)} className="h-9">Batal</Button>
            <Button size="sm" className="h-9" onClick={handleSuspend} disabled={items.length === 0 || isSuspending}>
              {isSuspending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={recallOpen} onOpenChange={setRecallOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <History className="w-4 h-4 text-primary" />
              Transaksi Ditunda
            </DialogTitle>
          </DialogHeader>

          <div className="py-2">
            <ScrollArea className="h-[320px] pr-3">
              <div className="space-y-2">
                {(suspendedSales?.length ?? 0) === 0 ? (
                  <div className="text-sm text-muted-foreground py-10 text-center">
                    Tidak ada transaksi ditunda.
                  </div>
                ) : (
                  suspendedSales?.map((s) => (
                    <button
                      key={s.id}
                      className="w-full text-left border rounded-lg p-3 hover:bg-slate-50 transition-colors disabled:opacity-60"
                      disabled={isRecalling}
                      onClick={() => {
                        recallSuspendedSale(s.id, {
                          onSuccess: (data) => {
                            setItems(data.items as any);
                            setCustomer(data.customer as any);
                            setPointsToRedeem(Number((data as any).pointsToRedeem ?? 0));
                            setPaymentMethod(data.paymentMethod);
                            setRecallOpen(false);
                            toast({ title: "Transaksi dipanggil", description: "Keranjang diisi dari transaksi yang ditunda." });
                          },
                          onError: (error) => {
                            toast({
                              variant: "destructive",
                              title: "Gagal memanggil transaksi",
                              description: error.message || "Silakan coba lagi.",
                            });
                          }
                        });
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-sm">
                            {s.note?.trim() ? s.note : `Transaksi #${s.id}`}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {s.itemCount} item
                            {s.createdAt ? ` • ${new Date(s.createdAt as any).toLocaleString("id-ID")}` : ""}
                          </div>
                        </div>
                        <div className="text-xs text-primary font-medium mt-0.5">
                          Ambil
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRecallOpen(false)} className="h-9">Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checkout Modal */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-50 p-0 border-none shadow-2xl">
          <div className="flex flex-col h-full">
            <DialogHeader className="p-6 bg-white border-b shrink-0">
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-3 text-xl font-bold">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Receipt className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div>Pembayaran</div>
                    <div className="text-xs font-normal text-muted-foreground mt-0.5">
                      {items.length} item di keranjang
                    </div>
                  </div>
                </DialogTitle>
                <div className="flex flex-col items-end gap-1">
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-semibold px-3 py-1 border-2",
                      shiftActive ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-amber-50 border-amber-200 text-amber-800",
                    )}
                  >
                    {shiftActive ? "SHIFT AKTIF" : "SHIFT TUTUP"}
                  </Badge>
                </div>
              </div>
            </DialogHeader>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left Column: Summary (5 cols) */}
              <div className="md:col-span-5 space-y-6">
                <section className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <List className="w-4 h-4" /> Ringkasan
                  </h3>
                  
                  <div className="relative overflow-hidden rounded-2xl bg-white border-2 border-primary/20 p-6 shadow-md">
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
                    <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-24 w-24 rounded-full bg-blue-500/5 blur-2xl" />
                    
                    <div className="relative z-10 text-center space-y-1">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Tagihan</p>
                      <h2 className="text-4xl font-black tabular-nums tracking-tight text-primary">
                        {formatCurrency(payableTotal)}
                      </h2>
                      
                      {customer && (
                        <div className="pt-3 mt-3 border-t border-slate-100 flex flex-col gap-1">
                          <div className="flex justify-between text-[11px] text-slate-500">
                            <span>Harga Normal</span>
                            <span className="font-medium">{formatCurrency(finalTotal)}</span>
                          </div>
                          <div className="flex justify-between text-[11px] text-primary font-bold">
                            <span>Tukar Poin</span>
                            <span>-{formatCurrency(redeemAmount)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-sm">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Subtotal</span>
                      <span className="font-semibold text-slate-700">{formatCurrency(totals.subtotalBeforeDiscount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Total Diskon Item</span>
                      <span className="font-bold text-emerald-600">-{formatCurrency(totals.discountTotal)}</span>
                    </div>
                    {redeemAmount > 0 && (
                      <div className="flex justify-between text-sm border-t border-slate-100 pt-3">
                        <span className="text-slate-500">Loyalty (Poin)</span>
                        <span className="font-bold text-primary">-{formatCurrency(redeemAmount)}</span>
                      </div>
                    )}
                  </div>
                </section>

                {customer && (
                  <section className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <User className="w-4 h-4" /> Member
                    </h3>
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                            {customer.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold">{customer.name}</p>
                            <p className="text-[10px] text-muted-foreground uppercase">{customer.tierLevel || "REGULAR"}</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="font-bold tabular-nums">
                          {Number(customer.totalPoints ?? 0).toLocaleString("id-ID")} Pts
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-[11px] font-medium text-slate-500 uppercase">
                          <Label className="text-[11px]">Gunakan Poin</Label>
                          <span>Maks: {maxRedeemablePoints.toLocaleString("id-ID")}</span>
                        </div>
                        <div className="relative">
                          <Input
                            type="number"
                            inputMode="numeric"
                            className="h-10 pl-3 pr-12 font-bold focus-visible:ring-primary/30"
                            value={pointsToRedeem}
                            onChange={(e) => setPointsToRedeem(Number(e.target.value))}
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-primary">PTS</div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-50 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Poin akan didapat:</span>
                        <span className="font-bold text-emerald-600">+{estimatedPointsEarned.toLocaleString("id-ID")} Pts</span>
                      </div>
                    </div>
                  </section>
                )}
              </div>

              {/* Right Column: Payment Input (7 cols) */}
              <div className="md:col-span-7 space-y-6">
                <section className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <CreditCard className="w-4 h-4" /> Metode & Input
                  </h3>
                  
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
                    <Tabs value={paymentMethod} onValueChange={setPaymentMethod} className="w-full">
                      <TabsList className="grid w-full grid-cols-2 h-12 bg-slate-100 rounded-xl p-1.5">
                        <TabsTrigger value="cash" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-md transition-all">
                          <Banknote className="w-4 h-4 mr-2" /> Tunai
                        </TabsTrigger>
                        <TabsTrigger value="card" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-md transition-all">
                          <CreditCard className="w-4 h-4 mr-2" /> Non-Tunai
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>

                    {paymentMethod === "cash" ? (
                      <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-bold text-slate-600">Nominal Tunai</Label>
                            {!isSufficient && cashGiven > 0 && (
                              <Badge variant="destructive" className="animate-pulse">
                                Kurang {formatCurrency(Math.max(0, payableTotal - cashGiven))}
                              </Badge>
                            )}
                          </div>
                          <MoneyInput
                            placeholder="Masukkan nominal..."
                            className="text-3xl h-20 font-black text-center bg-slate-50 border-2 border-slate-200 focus:border-primary/40 focus:bg-white transition-all rounded-2xl"
                            valueDigits={cashGivenDigits}
                            onValueDigitsChange={setCashGivenDigits}
                            autoFocus
                          />
                        </div>

                        <div className="space-y-3">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cepat Pilih</p>
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {[2000, 5000, 10000, 20000, 50000, 100000].map((amount) => (
                              <Button
                                key={amount}
                                variant="outline"
                                className="h-12 font-bold hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-all rounded-xl"
                                onClick={() => setCashGivenDigits(String(amount))}
                              >
                                {amount >= 1000 ? `${amount / 1000}k` : amount}
                              </Button>
                            ))}
                            <Button
                              variant="secondary"
                              className="h-12 font-bold col-span-2 rounded-xl border-2 border-primary/10 hover:border-primary/30 transition-all"
                              onClick={() => setCashGivenDigits(String(Math.round(payableTotal)))}
                            >
                              Uang Pas
                            </Button>
                          </div>
                        </div>

                        <div className={cn(
                          "flex justify-between items-center rounded-2xl p-5 border-2 transition-all duration-500",
                          isSufficient 
                            ? "bg-emerald-50 border-emerald-200 shadow-md shadow-emerald-100" 
                            : "bg-slate-50 border-slate-200"
                        )}>
                          <div className="space-y-0.5">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kembalian</p>
                            <h4 className={cn(
                              "text-3xl font-black tabular-nums",
                              isSufficient ? "text-emerald-700" : "text-slate-400"
                            )}>
                              {formatCurrency(change)}
                            </h4>
                          </div>
                          {isSufficient && (
                            <div className="h-12 w-12 rounded-full bg-emerald-500 flex items-center justify-center animate-in zoom-in duration-300">
                              <CheckCircle2 className="w-7 h-7 text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
                        <div className="p-8 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-center space-y-4">
                          <div className="mx-auto h-16 w-16 rounded-full bg-white flex items-center justify-center shadow-sm">
                            <CreditCard className="w-8 h-8 text-primary" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="font-bold">Pembayaran Non-Tunai</h4>
                            <p className="text-sm text-slate-500 max-w-[240px] mx-auto">
                              Silakan proses pembayaran menggunakan mesin EDC atau scan QRIS sesuai nominal tagihan.
                            </p>
                          </div>
                          <div className="inline-block px-4 py-2 bg-white border border-slate-200 rounded-xl font-black text-lg shadow-sm">
                            {formatCurrency(payableTotal)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>

            <div className="p-6 bg-white border-t flex flex-col sm:flex-row gap-3 items-center justify-between shrink-0">
              <Button 
                variant="ghost" 
                className="w-full sm:w-auto font-bold text-slate-500 hover:text-slate-700 h-12 px-8 rounded-xl"
                onClick={() => setCheckoutOpen(false)}
              >
                Batal
              </Button>
              <Button 
                className="w-full sm:w-auto min-w-[200px] h-14 text-lg font-black rounded-2xl shadow-xl shadow-primary/30 transition-all hover:scale-[1.02] active:scale-95" 
                onClick={handleCheckout} 
                disabled={!shiftActive || items.length === 0 || isCheckingOut || !isSufficient}
              >
                {isCheckingOut ? <Loader2 className="mr-3 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-3 h-5 w-5" />}
                PROSES BAYAR
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transaction Success Alert */}
      <AlertDialog open={showSuccessAlert} onOpenChange={setShowSuccessAlert}>
        <AlertDialogContent className="sm:max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
          <div className="relative bg-emerald-500 overflow-hidden p-8 text-center animate-in slide-in-from-top duration-500">
             <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-emerald-400 rounded-full blur-3xl opacity-50 animate-pulse" />
             
             <div className="relative z-10 flex flex-col items-center">
               <div className="h-24 w-24 bg-white rounded-full flex items-center justify-center shadow-xl mb-6 animate-in zoom-in duration-300 delay-150">
                 <CheckCircle2 className="w-12 h-12 text-emerald-600 animate-in spin-in-12 duration-500" />
               </div>
               <h2 className="text-3xl font-black text-white tracking-tight mb-2 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200">
                 Pembayaran Berhasil!
               </h2>
               <p className="text-emerald-100 font-medium animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300">
                 Transaksi telah tersimpan dengan aman.
               </p>
             </div>
          </div>

          <div className="p-8 bg-white space-y-8">
            <div className="text-center space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-400">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Kembalian</p>
              <div className="text-5xl font-black text-slate-800 tracking-tighter tabular-nums">
                {formatCurrency(lastChange || 0)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-500">
              <Button
                variant="outline"
                className="h-14 rounded-xl border-2 font-bold hover:bg-slate-50 hover:text-slate-900 transition-all"
                onClick={() => {
                  if (!lastReceipt) {
                    toast({ variant: "destructive", title: "Struk tidak tersedia" });
                    return;
                  }
                  setShowSuccessAlert(false);
                  setReceiptOpen(true);
                }}
                disabled={!lastReceipt}
              >
                <ReceiptText className="w-5 h-5 mr-2" />
                Lihat Struk
              </Button>
              <Button
                variant="outline"
                className="h-14 rounded-xl border-2 font-bold hover:bg-slate-50 hover:text-slate-900 transition-all"
                onClick={() => {
                  if (!lastReceipt) {
                    toast({ variant: "destructive", title: "Struk tidak tersedia" });
                    return;
                  }
                  printReceipt(lastReceipt);
                  setShowSuccessAlert(false);
                }}
              >
                <Printer className="w-5 h-5 mr-2" />
                Cetak Struk
              </Button>
            </div>

            <Button 
              className="w-full h-16 text-lg font-black rounded-2xl bg-slate-900 hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all hover:scale-[1.02] active:scale-95 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-600"
              onClick={() => {
                setShowSuccessAlert(false);
                setLastChange(null);
              }}
            >
              <Plus className="w-6 h-6 mr-2" />
              Transaksi Baru
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="w-[95vw] max-w-sm">
          <DialogHeader>
            <DialogTitle>Struk</DialogTitle>
          </DialogHeader>
          {lastReceipt ? (
            <div className="space-y-3">
              <div className="text-center">
                <div className="font-bold text-base">{lastReceipt.storeName}</div>
                {lastReceipt.storeAddress ? (
                  <div className="text-xs text-muted-foreground">{lastReceipt.storeAddress}</div>
                ) : null}
                <div className="text-xs text-muted-foreground">{lastReceipt.invoiceNo ?? "-"}</div>
                <div className="text-xs text-muted-foreground">{new Date(lastReceipt.transactionDate).toLocaleString()}</div>
              </div>
              <Separator />
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between gap-3">
                  <span>Kasir</span>
                  <span className="text-foreground truncate">{lastReceipt.cashierName}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>Pelanggan</span>
                  <span className="text-foreground truncate">{lastReceipt.customerName ?? "-"}</span>
                </div>
              </div>
              <Separator />
              <ScrollArea className="h-56">
                <div className="space-y-2 pr-3">
                  {lastReceipt.items.map((i, idx) => (
                    <div key={`${i.name}-${idx}`} className="flex justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <div className="truncate">{i.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {i.quantity} {i.unitType} × {formatCurrency(i.unitPrice)}
                        </div>
                      </div>
                      <div className="shrink-0 font-medium">{formatCurrency(i.lineTotal)}</div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <Separator />
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(lastReceipt.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Diskon Item</span>
                  <span>-{formatCurrency(lastReceipt.itemDiscount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tukar poin</span>
                  <span>-{formatCurrency(lastReceipt.redeemAmount)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(lastReceipt.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Metode</span>
                  <span className="uppercase">{lastReceipt.paymentMethod}</span>
                </div>
                {lastReceipt.cashGiven != null ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tunai</span>
                    <span>{formatCurrency(lastReceipt.cashGiven)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Kembalian</span>
                  <span>{formatCurrency(lastReceipt.change)}</span>
                </div>
              </div>
              {lastReceipt.receiptFooter ? (
                <>
                  <Separator />
                  <div className="text-center text-xs text-muted-foreground">{lastReceipt.receiptFooter}</div>
                </>
              ) : null}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Struk tidak tersedia.</div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setReceiptOpen(false)} className="h-9">
              Tutup
            </Button>
            <Button
              size="sm"
              className="h-9"
              disabled={!lastReceipt}
              onClick={() => lastReceipt && printReceipt(lastReceipt)}
            >
              <Printer className="w-4 h-4 mr-2" /> Cetak
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={checkoutErrorOpen} onOpenChange={setCheckoutErrorOpen}>
        <AlertDialogContent className="sm:max-w-sm text-center">
          <AlertDialogHeader>
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <AlertDialogTitle className="text-center text-xl">{checkoutErrorTitle}</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              {checkoutErrorDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction onClick={() => setCheckoutErrorOpen(false)} className="w-full sm:w-auto min-w-[120px]">
              Tutup
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
