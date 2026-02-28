import { type Product, type Brand, type Category } from "@shared/schema";
import { formatCurrency, getImageUrl } from "@/lib/utils";
import { Plus, Package, Check } from "lucide-react";
import { useEffect, useState } from "react";

interface ProductCardProps {
  product: Product & { brand: Brand | null; category?: Category | null };
  onClick: () => void;
  discount?: number;
  lowStockThreshold?: number;
}

export function ProductCard({ product, onClick, discount = 0, lowStockThreshold = 10 }: ProductCardProps) {
  const threshold = Number((product as any)?.minStock ?? 0) > 0 ? Number((product as any).minStock) : lowStockThreshold;
  const isLowStock = product.stock > 0 && product.stock <= threshold;
  const isOutOfStock = product.stock === 0;
  const [imageError, setImageError] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  
  const finalPrice = Number(product.price) - discount;
  const canCarton = Boolean(product.supportsCarton) && Number(product.pcsPerCarton) > 1 && product.cartonPrice != null;
  const cartonPrice = canCarton ? Number(product.cartonPrice) : null;
  const stockCartons = canCarton ? Number((product as any).stockCartons ?? 0) : 0;
  const stockRemainderPcs = canCarton ? Number((product as any).stockRemainderPcs ?? product.stock) : product.stock;

  const triggerAddAnimation = () => {
    if (isOutOfStock) return;
    setJustAdded(true);
  };

  useEffect(() => {
    if (!justAdded) return;
    const t = window.setTimeout(() => setJustAdded(false), 220);
    return () => window.clearTimeout(t);
  }, [justAdded]);

  const handleAddClick = () => {
    if (isOutOfStock) return;
    triggerAddAnimation();
    onClick();
  };

  return (
    <div
      onClick={handleAddClick}
      className={[
        "relative group overflow-hidden rounded-2xl border text-slate-900 dark:text-slate-100 shadow-md transition-all duration-200",
        "bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900",
        "border-slate-400 dark:border-slate-700",
        "hover:shadow-xl hover:shadow-primary/15",
        "ring-1 ring-slate-900/5 dark:ring-slate-50/5",
        justAdded ? "scale-95 ring-2 ring-primary/50" : "",
        isOutOfStock ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:-translate-y-0.5 hover:border-primary/50",
      ].join(" ")}
    >
      {product.image && !imageError ? (
        <div className="w-full h-32 overflow-hidden border-b relative bg-slate-50">
          <img 
            src={getImageUrl(product.image)} 
            alt={product.name} 
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-200" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/0 to-transparent pointer-events-none" />
        </div>
      ) : (
        <div className="w-full h-32 bg-slate-50 border-b flex items-center justify-center text-slate-300 relative">
           <Package className="w-12 h-12 stroke-1" />
           <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-black/0 to-transparent pointer-events-none" />
        </div>
      )}

      <div className="absolute left-3 top-3 flex items-center gap-2">
        {isOutOfStock ? (
          <span className="px-2 py-1 rounded-full bg-red-600/90 text-white text-[10px] font-semibold tracking-wide">
            HABIS
          </span>
        ) : isLowStock ? (
          <span className="px-2 py-1 rounded-full bg-amber-500/90 text-white text-[10px] font-semibold tracking-wide">
            MENIPIS
          </span>
        ) : (
          <span className="px-2 py-1 rounded-full bg-emerald-600/90 text-white text-[10px] font-semibold tracking-wide">
            TERSEDIA
          </span>
        )}
        {discount > 0 && (
          <span className="px-2 py-1 rounded-full bg-fuchsia-600/90 text-white text-[10px] font-semibold tracking-wide">
            PROMO
          </span>
        )}
      </div>

      {justAdded && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-lg animate-in fade-in zoom-in duration-150">
            <Check className="h-5 w-5" />
          </div>
        </div>
      )}

      <div className="p-5 flex flex-col">
        <div className="flex items-start justify-between gap-3 mb-2">
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
              {product.barcode ? (
                <span className="text-[11px] text-muted-foreground/70 font-mono truncate">
                  {product.barcode}
                </span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            aria-label="Tambah ke cart"
            disabled={isOutOfStock}
            onClick={(e) => {
              e.stopPropagation();
              if (!isOutOfStock) {
                handleAddClick();
              }
            }}
            className={[
              "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 shrink-0",
              isOutOfStock
                ? "bg-muted text-muted-foreground"
                : "bg-primary/10 text-primary hover:bg-primary hover:text-white shadow-sm hover:shadow-md hover:shadow-primary/15",
            ].join(" ")}
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        
        <h3 className="font-semibold text-[15px] leading-snug mb-auto group-hover:text-primary transition-colors line-clamp-2">
          {product.name}
        </h3>
        
        <div className="mt-4 flex items-end justify-between gap-3">
          <div className="flex flex-col min-w-0">
            <div className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
              {discount > 0 ? "Harga Diskon" : "Harga Normal"}
            </div>
            <span className={["text-lg font-bold tracking-tight leading-tight", discount > 0 ? "text-primary" : "text-slate-900 dark:text-slate-100"].join(" ")}>
              {formatCurrency(finalPrice)}
            </span>
            {discount > 0 ? (
              <div className="text-xs text-muted-foreground">
                <span className="mr-1">Normal:</span>
                <span className="line-through decoration-red-500">{formatCurrency(product.price)}</span>
                <span className="ml-2 text-emerald-700 font-semibold">Hemat {formatCurrency(discount)}</span>
              </div>
            ) : null}
            {canCarton && cartonPrice != null && (
              <span className="text-xs text-muted-foreground">
                Karton: {formatCurrency(cartonPrice)} ({Number(product.pcsPerCarton)} pcs)
              </span>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
              <span className={["px-2 py-1 rounded-full border", isOutOfStock ? "bg-red-50 border-red-200 text-red-700" : isLowStock ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-emerald-50 border-emerald-200 text-emerald-800"].join(" ")}>
                {canCarton && stockCartons > 0
                  ? `Sisa: ${stockCartons} karton • ${stockRemainderPcs} pcs`
                  : `Sisa: ${product.stock} pcs`}
              </span>
              {canCarton && (
                <span className="px-2 py-1 rounded-full border bg-slate-50 border-slate-200 text-slate-700">
                  {Number((product as any).pcsPerCarton ?? product.pcsPerCarton)} pcs/karton
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Decorative gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200" />
    </div>
  );
}
