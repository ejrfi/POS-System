import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product, Customer } from "@shared/schema";

export interface CartItem extends Product {
  quantity: number;
  unitType: "PCS" | "CARTON";
  discount: number;
}

interface CartState {
  items: CartItem[];
  customer: Customer | null;
  globalDiscount: number;
  
  addItem: (product: Product & { discount?: number }) => void;
  setItems: (items: CartItem[]) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  updateUnitType: (productId: number, unitType: CartItem["unitType"]) => void;
  updateItemDiscount: (productId: number, discount: number) => void;
  updateAllDiscounts: (discountCalculator: (product: Product) => number) => void;
  removeItem: (productId: number) => void;
  setCustomer: (customer: Customer | null) => void;
  setGlobalDiscount: (amount: number) => void;
  clearCart: () => void;
  
  // Computed helpers (for use inside store if needed, but usually computed in component)
  getTotal: () => number;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      customer: null,
      globalDiscount: 0,

      addItem: (product) => {
        const items = get().items;
        const existing = items.find((i) => i.id === product.id);
        const discount = product.discount ?? 0;
        
        if (existing) {
          set({
            items: items.map((i) =>
              i.id === product.id ? { ...i, quantity: i.quantity + 1, discount } : i
            ),
          });
        } else {
          set({ items: [...items, { ...product, quantity: 1, unitType: "PCS", discount }] });
        }
      },

      setItems: (items) => set({
        items: items.map((i) => {
          const canCarton = Boolean(i.supportsCarton) && Number(i.pcsPerCarton) > 1 && i.cartonPrice != null;
          const requested = (i as any).unitType === "CARTON" ? "CARTON" : "PCS";
          return { ...i, unitType: requested === "CARTON" && !canCarton ? "PCS" : requested };
        })
      }),

      updateQuantity: (productId, quantity) => {
        if (quantity < 1) return;
        set({
          items: get().items.map((i) =>
            i.id === productId ? { ...i, quantity } : i
          ),
        });
      },

      updateUnitType: (productId, unitType) => {
        set({
          items: get().items.map((i) =>
            i.id === productId
              ? {
                  ...i,
                  unitType:
                    unitType === "CARTON" &&
                    !(Boolean(i.supportsCarton) && Number(i.pcsPerCarton) > 1 && i.cartonPrice != null)
                      ? "PCS"
                      : unitType,
                }
              : i
          ),
        });
      },

      updateItemDiscount: (productId, discount) => {
        set({
          items: get().items.map((i) =>
            i.id === productId ? { ...i, discount } : i
          ),
        });
      },

      updateAllDiscounts: (discountCalculator) => {
        set({
          items: get().items.map((i) => ({
            ...i,
            discount: discountCalculator(i)
          })),
        });
      },

      removeItem: (productId) => {
        set({ items: get().items.filter((i) => i.id !== productId) });
      },

      setCustomer: (customer) => set({ customer }),
      
      setGlobalDiscount: (globalDiscount) => set({ globalDiscount }),

      clearCart: () => set({ items: [], customer: null, globalDiscount: 0 }),

      getTotal: () => {
        const { items, globalDiscount } = get();
        const subtotal = items.reduce((sum, item) => {
          const supportsCarton = Boolean(item.supportsCarton) && Number(item.pcsPerCarton) > 1 && item.cartonPrice != null;
          const unitType = (item as any).unitType === "CARTON" ? "CARTON" : "PCS";
          const unitPrice = unitType === "CARTON" && supportsCarton ? Number(item.cartonPrice) : Number(item.price);
          const lineTotal = unitPrice * item.quantity;
          const lineDiscount = Math.max(0, Number(item.discount ?? 0)) * item.quantity;
          return sum + Math.max(0, lineTotal - lineDiscount);
        }, 0);
        return Math.max(0, subtotal - globalDiscount);
      },
    }),
    {
      name: "pos-cart-storage",
    }
  )
);
