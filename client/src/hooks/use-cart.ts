import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product, Customer } from "@shared/schema";

export interface CartItem extends Product {
  quantity: number;
  discount: number; // Amount discount per item
}

interface CartState {
  items: CartItem[];
  customer: Customer | null;
  globalDiscount: number;
  
  addItem: (product: Product) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  updateItemDiscount: (productId: number, discount: number) => void;
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
        
        if (existing) {
          set({
            items: items.map((i) =>
              i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
            ),
          });
        } else {
          set({ items: [...items, { ...product, quantity: 1, discount: 0 }] });
        }
      },

      updateQuantity: (productId, quantity) => {
        if (quantity < 1) return;
        set({
          items: get().items.map((i) =>
            i.id === productId ? { ...i, quantity } : i
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

      removeItem: (productId) => {
        set({ items: get().items.filter((i) => i.id !== productId) });
      },

      setCustomer: (customer) => set({ customer }),
      
      setGlobalDiscount: (globalDiscount) => set({ globalDiscount }),

      clearCart: () => set({ items: [], customer: null, globalDiscount: 0 }),

      getTotal: () => {
        const { items, globalDiscount } = get();
        const subtotal = items.reduce((sum, item) => {
          const itemPrice = Number(item.price);
          return sum + (itemPrice * item.quantity) - (item.discount * item.quantity);
        }, 0);
        return Math.max(0, subtotal - globalDiscount);
      }
    }),
    {
      name: "pos-cart-storage",
    }
  )
);
