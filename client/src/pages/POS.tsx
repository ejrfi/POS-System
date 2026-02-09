import { useState, useRef, useEffect } from "react";
import { useProducts, useProductByBarcode } from "@/hooks/use-products";
import { useCart } from "@/hooks/use-cart";
import { useCustomers } from "@/hooks/use-others";
import { useCheckout } from "@/hooks/use-transactions";
import { ProductCard } from "@/components/ProductCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, ScanBarcode, Trash2, CreditCard, Banknote, User, Minus, Plus, Loader2, Receipt, ShoppingCart } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function POS() {
  const [search, setSearch] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const { data: products, isLoading } = useProducts(search);
  const { data: customers } = useCustomers();
  const { data: scannedProduct, isFetching: isScanning } = useProductByBarcode(barcodeInput, false); // Manual trigger logic handled via effect usually, but here we scan on enter
  
  const { 
    items, 
    addItem, 
    updateQuantity, 
    removeItem, 
    customer, 
    setCustomer, 
    getTotal, 
    clearCart 
  } = useCart();
  
  const { mutate: checkout, isPending: isCheckingOut } = useCheckout();
  const { toast } = useToast();

  // Auto-focus barcode input
  useEffect(() => {
    barcodeInputRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      // Re-focus if user is not typing in another input
      if (document.activeElement?.tagName !== 'INPUT' || document.activeElement === document.body) {
         barcodeInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput) return;
    
    // Simulate direct scan logic since hook is async and tricky to imperatively call inside event handler without refetch
    // In a real app, I'd use useQueryClient to fetchQuery directly
    try {
      const res = await fetch(`/api/products/barcode/${barcodeInput}`);
      if (res.ok) {
        const product = await res.json();
        if (product.stock > 0) {
          addItem(product);
          toast({ title: "Item Added", description: `${product.name} added to cart.` });
          setBarcodeInput("");
        } else {
          toast({ variant: "destructive", title: "Out of Stock", description: "This product is unavailable." });
        }
      } else {
        toast({ variant: "destructive", title: "Not Found", description: "Product barcode not found." });
      }
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to scan product." });
    }
  };

  const handleCheckout = () => {
    if (items.length === 0) return;
    
    checkout({
      customerId: customer?.id,
      items: items.map(i => ({ 
        productId: i.id, 
        quantity: i.quantity,
        discount: i.discount 
      })),
      globalDiscount: 0, // Simplified for now
      paymentMethod,
    }, {
      onSuccess: () => {
        setCheckoutOpen(false);
        clearCart();
        toast({
          title: "Transaction Successful",
          description: "Receipt generated successfully.",
        });
      }
    });
  };

  return (
    <div className="h-screen flex overflow-hidden bg-slate-50">
      {/* LEFT: Product Catalog */}
      <div className="flex-1 flex flex-col min-w-0 pr-0 border-r">
        {/* Header / Search */}
        <div className="p-6 bg-white border-b space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search products..." 
                className="pl-9 h-11 bg-slate-50 border-slate-200 focus-visible:ring-primary/20"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <form onSubmit={handleBarcodeSubmit} className="relative w-64">
              <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
              <Input 
                ref={barcodeInputRef}
                placeholder="Scan barcode..." 
                className="pl-9 h-11 border-primary/20 focus-visible:ring-primary/20 bg-primary/5"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
              />
            </form>
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {/* Quick Category Filters (Mock) */}
            {["All Items", "Beverages", "Snacks", "Household", "Personal Care"].map((cat, i) => (
              <Badge 
                key={cat} 
                variant={i === 0 ? "default" : "outline"} 
                className="px-4 py-1.5 text-sm cursor-pointer hover:bg-primary/90 transition-colors"
              >
                {cat}
              </Badge>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <ScrollArea className="flex-1 p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
              {products?.map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  onClick={() => addItem(product)} 
                />
              ))}
              {products?.length === 0 && (
                <div className="col-span-full text-center py-20 text-muted-foreground">
                  No products found.
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
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer</span>
            {customer && (
              <button onClick={() => setCustomer(null)} className="text-xs text-red-500 hover:underline">
                Remove
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
                <option value="" disabled>Select Customer (Optional)</option>
                {customers?.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto pos-scrollbar p-4 space-y-3">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
              <ShoppingCart className="w-16 h-16 mb-4 stroke-1" />
              <p>Cart is empty</p>
            </div>
          ) : (
            items.map((item) => (
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
                
                <div className="flex items-center justify-between">
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
                  
                  <div className="text-right">
                    <div className="font-bold text-base">{formatCurrency(Number(item.price) * item.quantity)}</div>
                    {item.discount > 0 && (
                      <div className="text-xs text-green-600 font-medium">-{formatCurrency(item.discount)} off</div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals Section */}
        <div className="p-6 bg-slate-50 border-t space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(getTotal())}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax (0%)</span>
            <span>$0.00</span>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between items-end">
            <span className="font-bold text-lg">Total</span>
            <span className="font-extrabold text-3xl text-primary">{formatCurrency(getTotal())}</span>
          </div>
          
          <Button 
            className="w-full h-14 text-lg font-bold shadow-lg shadow-primary/20 mt-4" 
            size="lg"
            onClick={() => setCheckoutOpen(true)}
            disabled={items.length === 0}
          >
            Checkout
          </Button>
        </div>
      </div>

      {/* Checkout Modal */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              Complete Payment
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-6 space-y-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Amount Due</p>
              <h2 className="text-4xl font-extrabold text-foreground">{formatCurrency(getTotal())}</h2>
            </div>

            <Tabs defaultValue="cash" onValueChange={setPaymentMethod} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="cash">
                  <Banknote className="w-4 h-4 mr-2" /> Cash
                </TabsTrigger>
                <TabsTrigger value="card">
                  <CreditCard className="w-4 h-4 mr-2" /> Card
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {paymentMethod === "cash" && (
              <div className="grid grid-cols-3 gap-3">
                {[10, 20, 50, 100].map(amount => (
                   <Button key={amount} variant="outline" className="h-12 border-dashed">
                     ${amount}
                   </Button>
                ))}
                <Button variant="outline" className="h-12 border-dashed col-span-2">Exact Amount</Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutOpen(false)}>Cancel</Button>
            <Button 
              className="w-full sm:w-auto px-8" 
              onClick={handleCheckout} 
              disabled={isCheckingOut}
            >
              {isCheckingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
