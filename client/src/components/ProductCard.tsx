import { type Product, type Brand } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";
import { Plus } from "lucide-react";

interface ProductCardProps {
  product: Product & { brand: Brand | null };
  onClick: () => void;
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  const isLowStock = product.stock < 10;
  const isOutOfStock = product.stock === 0;

  return (
    <div
      onClick={!isOutOfStock ? onClick : undefined}
      className={`
        relative group overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-all duration-300
        ${isOutOfStock ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-xl hover:border-primary/50 cursor-pointer hover:-translate-y-1'}
      `}
    >
      <div className="p-5 flex flex-col h-full">
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {product.brand?.name || 'Generic'}
          </span>
          {isLowStock && !isOutOfStock && (
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
              LOW STOCK
            </span>
          )}
          {isOutOfStock && (
            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
              SOLD OUT
            </span>
          )}
        </div>
        
        <h3 className="font-semibold text-lg leading-tight mb-auto group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        
        <div className="mt-4 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-primary">
              {formatCurrency(product.price)}
            </span>
            <span className="text-xs text-muted-foreground">
              {product.stock} units
            </span>
          </div>
          
          <button 
            disabled={isOutOfStock}
            className={`
              w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200
              ${isOutOfStock 
                ? 'bg-muted text-muted-foreground' 
                : 'bg-primary/10 text-primary hover:bg-primary hover:text-white group-hover:scale-110 shadow-sm'}
            `}
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {/* Decorative gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300" />
    </div>
  );
}
