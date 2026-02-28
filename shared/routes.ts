
import { z } from 'zod';
import { 
  insertUserSchema, 
  insertProductSchema, 
  insertBrandSchema, 
  insertCategorySchema,
  insertSupplierSchema,
  insertCustomerSchema,
  insertDiscountSchema,
  checkoutSchema,
  users,
  products,
  brands,
  categories,
  suppliers,
  customers,
  discounts,
  sales,
  cashierShifts
} from './schema';

export type CheckoutRequest = z.infer<typeof checkoutSchema>;

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
    code: z.string().optional(),
    details: z.any().optional(),
  }),
  notFound: z.object({
    message: z.string(),
    code: z.string().optional(),
    details: z.any().optional(),
  }),
  internal: z.object({
    message: z.string(),
    code: z.string().optional(),
    details: z.any().optional(),
  }),
  unauthorized: z.object({
    message: z.string(),
    code: z.string().optional(),
    details: z.any().optional(),
  }),
};

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/login' as const,
      input: z.object({
        username: z.string(),
        password: z.string(),
      }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/logout' as const,
      responses: {
        200: z.void(),
        409: errorSchemas.validation,
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/user' as const,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
  },
  users: {
    list: {
      method: 'GET' as const,
      path: '/api/users' as const,
      input: z.object({
        search: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.object({
          id: z.number(),
          username: z.string(),
          fullName: z.string(),
          role: z.string(),
          createdAt: z.coerce.date().nullable().optional(),
        })),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/users' as const,
      input: z.object({
        username: z.string().min(1).max(255),
        fullName: z.string().min(1).max(255),
        role: z.enum(["admin", "supervisor", "cashier"]),
        password: z.string().min(4).max(255),
      }),
      responses: {
        201: z.object({
          id: z.number(),
          username: z.string(),
          fullName: z.string(),
          role: z.string(),
          createdAt: z.coerce.date().nullable().optional(),
        }),
        409: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/users/:id' as const,
      input: z.object({
        username: z.string().min(1).max(255).optional(),
        fullName: z.string().min(1).max(255).optional(),
        role: z.enum(["admin", "supervisor", "cashier"]).optional(),
        password: z.string().min(4).max(255).optional(),
      }),
      responses: {
        200: z.object({
          id: z.number(),
          username: z.string(),
          fullName: z.string(),
          role: z.string(),
          createdAt: z.coerce.date().nullable().optional(),
        }),
        404: errorSchemas.notFound,
        409: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/users/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        409: errorSchemas.validation,
      },
    },
  },
  cashierShifts: {
    active: {
      method: 'GET' as const,
      path: '/api/cashier-shifts/active' as const,
      responses: {
        200: z.object({
          shift: z.custom<typeof cashierShifts.$inferSelect>().nullable(),
          summary: z.object({
            totalTransactions: z.number(),
            totalSales: z.number(),
            cashSales: z.number(),
            nonCashSales: z.number(),
            totalRefunds: z.number(),
            cashRefunds: z.number(),
            nonCashRefunds: z.number(),
            expectedCash: z.number(),
            paymentBreakdown: z.record(z.number()),
            totalDiscount: z.number(),
            totalPointUsed: z.number(),
            totalPointEarned: z.number(),
            totalVoid: z.number(),
            totalReturns: z.number(),
            pointTxCount: z.number(),
            bigDiscountTxCount: z.number(),
            pointsReversed: z.number(),
            pointsRestored: z.number(),
          }).nullable(),
        }),
      },
    },
    open: {
      method: 'POST' as const,
      path: '/api/cashier-shifts/open' as const,
      input: z.object({
        openingCash: z.number().min(0),
        note: z.string().max(255).optional(),
        terminalName: z.string().min(1).max(255),
        clientOpenedAt: z.string().optional(),
      }),
      responses: {
        201: z.custom<typeof cashierShifts.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    close: {
      method: 'POST' as const,
      path: '/api/cashier-shifts/close' as const,
      input: z.object({
        actualCash: z.number().min(0),
        closeNote: z.string().max(255).optional(),
      }),
      responses: {
        200: z.object({
          shift: z.custom<typeof cashierShifts.$inferSelect>(),
          summary: z.object({
            totalTransactions: z.number(),
            totalSales: z.number(),
            cashSales: z.number(),
            nonCashSales: z.number(),
            totalRefunds: z.number(),
            cashRefunds: z.number(),
            nonCashRefunds: z.number(),
            expectedCash: z.number(),
            paymentBreakdown: z.record(z.number()),
            totalDiscount: z.number(),
            totalPointUsed: z.number(),
            totalPointEarned: z.number(),
            totalVoid: z.number(),
            totalReturns: z.number(),
            pointTxCount: z.number(),
            bigDiscountTxCount: z.number(),
            pointsReversed: z.number(),
            pointsRestored: z.number(),
          }),
        }),
        400: errorSchemas.validation,
        409: errorSchemas.validation,
        422: errorSchemas.validation,
        503: errorSchemas.internal,
      },
    },
    approve: {
      method: 'POST' as const,
      path: '/api/cashier-shifts/:id/approve' as const,
      input: z.object({
        approvalNote: z.string().max(255).optional(),
      }),
      responses: {
        200: z.custom<typeof cashierShifts.$inferSelect>(),
        400: errorSchemas.validation,
        403: errorSchemas.forbidden,
        404: errorSchemas.notFound,
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/cashier-shifts' as const,
      input: z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        cashierName: z.string().optional(),
        role: z.string().optional(),
        status: z.enum(["OPEN", "ACTIVE", "CLOSED"]).optional(),
        approvalStatus: z.enum(["NONE", "PENDING", "APPROVED", "REJECTED"]).optional(),
        diffLargeOnly: z.coerce.boolean().optional(),
        search: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.object({
          id: z.number(),
          shiftCode: z.string().nullable().optional(),
          userId: z.number(),
          userName: z.string(),
          userRole: z.string(),
          openedAt: z.any().nullable(),
          closedAt: z.any().nullable(),
          openingCash: z.any(),
          expectedCash: z.any().nullable(),
          systemCashTotal: z.any().nullable().optional(),
          actualCash: z.any().nullable(),
          cashDifference: z.any().nullable(),
          totalTransactions: z.number().optional(),
          totalSales: z.any().optional(),
          totalRefund: z.any().optional(),
          totalDiscount: z.any().optional(),
          totalPointUsed: z.number().optional(),
          totalPointEarned: z.number().optional(),
          totalCashSales: z.any().optional(),
          totalNonCashSales: z.any().optional(),
          totalVoid: z.number().optional(),
          totalReturns: z.number().optional(),
          approvalStatus: z.string().optional(),
          approvedBy: z.number().nullable().optional(),
          approvedAt: z.any().nullable().optional(),
          approvalNote: z.string().nullable().optional(),
          note: z.string().nullable().optional(),
          closeNote: z.string().nullable().optional(),
          terminalName: z.string().nullable().optional(),
          status: z.string(),
          user: z.object({
            id: z.number(),
            username: z.string(),
            fullName: z.string(),
            role: z.string(),
          }).nullable(),
        })),
      },
    },
    summary: {
      method: 'GET' as const,
      path: '/api/cashier-shifts/:id/summary' as const,
      responses: {
        200: z.object({
          shift: z.object({
            id: z.number(),
            shiftCode: z.string().nullable().optional(),
            userId: z.number(),
            userName: z.string(),
            userRole: z.string(),
            openedAt: z.any().nullable(),
            closedAt: z.any().nullable(),
            openingCash: z.any(),
            expectedCash: z.any().nullable(),
            systemCashTotal: z.any().nullable().optional(),
            actualCash: z.any().nullable(),
            cashDifference: z.any().nullable(),
            note: z.string().nullable().optional(),
            closeNote: z.string().nullable().optional(),
            terminalName: z.string().nullable().optional(),
            status: z.string(),
            approvalStatus: z.string().nullable().optional(),
            approvedBy: z.number().nullable().optional(),
            approvedAt: z.any().nullable().optional(),
            approvalNote: z.string().nullable().optional(),
            user: z.object({
              id: z.number(),
              username: z.string(),
              fullName: z.string(),
              role: z.string(),
            }).nullable(),
          }),
          summary: z.object({
            totalTransactions: z.number(),
            totalSales: z.number(),
            cashSales: z.number(),
            nonCashSales: z.number(),
            totalRefunds: z.number(),
            cashRefunds: z.number(),
            nonCashRefunds: z.number(),
            expectedCash: z.number(),
            paymentBreakdown: z.record(z.number()),
            totalDiscount: z.number(),
            totalPointUsed: z.number(),
            totalPointEarned: z.number(),
            totalVoid: z.number(),
            totalReturns: z.number(),
            pointTxCount: z.number(),
            bigDiscountTxCount: z.number(),
            pointsReversed: z.number(),
            pointsRestored: z.number(),
          }),
        }),
        404: errorSchemas.notFound,
      },
    },
    transactions: {
      method: 'GET' as const,
      path: '/api/cashier-shifts/:id/transactions' as const,
      responses: {
        200: z.array(z.object({
          id: z.number(),
          invoiceNo: z.string(),
          transactionDate: z.any().nullable(),
          paymentMethod: z.string(),
          finalAmount: z.any(),
          status: z.enum(["COMPLETED", "CANCELLED", "RETURN"]),
        })),
        404: errorSchemas.notFound,
      },
    },
  },
  products: {
    list: {
      method: 'GET' as const,
      path: '/api/products' as const,
      input: z.object({
        search: z.string().optional(),
        brandId: z.coerce.number().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof products.$inferSelect & { brand: typeof brands.$inferSelect | null }>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/products/:id' as const,
      responses: {
        200: z.custom<typeof products.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    getByBarcode: {
      method: 'GET' as const,
      path: '/api/products/barcode/:barcode' as const,
      responses: {
        200: z.custom<typeof products.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/products' as const,
      input: insertProductSchema,
      responses: {
        201: z.custom<typeof products.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/products/:id' as const,
      input: insertProductSchema.partial(),
      responses: {
        200: z.custom<typeof products.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/products/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  pos: {
    filters: {
      method: 'GET' as const,
      path: '/api/pos/filters' as const,
      responses: {
        200: z.object({
          brands: z.array(z.custom<typeof brands.$inferSelect>()),
          categories: z.array(z.custom<typeof categories.$inferSelect>()),
          suppliers: z.array(z.custom<typeof suppliers.$inferSelect>()),
          priceMin: z.number(),
          priceMax: z.number(),
          lowStockThreshold: z.number(),
        }),
      },
    },
    products: {
      search: {
        method: 'GET' as const,
        path: '/api/pos/products' as const,
        input: z.object({
          q: z.string().optional(),
          brandId: z.coerce.number().optional(),
          categoryId: z.coerce.number().optional(),
          supplierId: z.coerce.number().optional(),
          stockStatus: z.enum(["all", "in", "low", "out"]).optional(),
          minPrice: z.coerce.number().optional(),
          maxPrice: z.coerce.number().optional(),
          sort: z.enum(["relevance", "nameAsc", "priceAsc", "priceDesc", "stockDesc", "bestSelling30d"]).optional(),
          limit: z.coerce.number().min(1).max(200).optional(),
          offset: z.coerce.number().min(0).optional(),
        }).optional(),
        responses: {
          200: z.object({
            items: z.array(z.custom<typeof products.$inferSelect & { brand: typeof brands.$inferSelect | null; category?: typeof categories.$inferSelect | null; supplier?: typeof suppliers.$inferSelect | null }>()),
            total: z.number(),
            nextOffset: z.number().nullable(),
          }),
        },
      },
    },
  },
  categories: {
    list: {
      method: 'GET' as const,
      path: '/api/categories' as const,
      responses: {
        200: z.array(z.custom<typeof categories.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/categories' as const,
      input: insertCategorySchema,
      responses: {
        201: z.custom<typeof categories.$inferSelect>(),
      },
    },
  },
  suppliers: {
    list: {
      method: 'GET' as const,
      path: '/api/suppliers' as const,
      responses: {
        200: z.array(z.custom<typeof suppliers.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/suppliers' as const,
      input: insertSupplierSchema,
      responses: {
        201: z.custom<typeof suppliers.$inferSelect>(),
      },
    },
  },
  brands: {
    list: {
      method: 'GET' as const,
      path: '/api/brands' as const,
      responses: {
        200: z.array(z.custom<typeof brands.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/brands' as const,
      input: insertBrandSchema,
      responses: {
        201: z.custom<typeof brands.$inferSelect>(),
      },
    },
  },
  customers: {
    list: {
      method: 'GET' as const,
      path: '/api/customers' as const,
      input: z.object({
        search: z.string().optional(),
        status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
        tierLevel: z.enum(["REGULAR", "SILVER", "GOLD", "PLATINUM"]).optional(),
        customerType: z.enum(["regular", "member", "vip"]).optional(),
        page: z.coerce.number().int().min(1).optional(),
        pageSize: z.coerce.number().int().min(1).max(200).optional(),
        sortBy: z.enum(["createdAt", "name", "phone", "totalPoints", "totalSpending", "tierLevel"]).optional(),
        sortDir: z.enum(["asc", "desc"]).optional(),
      }).optional(),
      responses: {
        200: z.object({
          items: z.array(z.custom<typeof customers.$inferSelect>()),
          page: z.number(),
          pageSize: z.number(),
          total: z.number(),
        }),
      },
    },
    transactions: {
      method: 'GET' as const,
      path: '/api/customers/:id/transactions' as const,
      input: z.object({
        page: z.coerce.number().int().min(1).optional(),
        pageSize: z.coerce.number().int().min(1).max(200).optional(),
      }).optional(),
      responses: {
        200: z.object({
          items: z.array(z.custom<typeof sales.$inferSelect>()),
          page: z.number(),
          pageSize: z.number(),
          total: z.number(),
        }),
        404: errorSchemas.notFound,
      },
    },
    points: {
      method: 'GET' as const,
      path: '/api/customers/:id/points' as const,
      input: z.object({
        page: z.coerce.number().int().min(1).optional(),
        pageSize: z.coerce.number().int().min(1).max(200).optional(),
      }).optional(),
      responses: {
        200: z.object({
          items: z.array(z.object({
            id: z.number(),
            customerId: z.number(),
            transactionId: z.number().nullable(),
            pointEarned: z.number(),
            pointUsed: z.number(),
            description: z.string(),
            createdAt: z.any().nullable(),
          })),
          page: z.number(),
          pageSize: z.number(),
          total: z.number(),
        }),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/customers' as const,
      input: insertCustomerSchema,
      responses: {
        201: z.custom<typeof customers.$inferSelect>(),
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/customers/:id' as const,
      input: insertCustomerSchema.partial(),
      responses: {
        200: z.custom<typeof customers.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/customers/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  sales: {
    checkout: {
      method: 'POST' as const,
      path: '/api/sales/checkout' as const,
      input: checkoutSchema,
      responses: {
        201: z.custom<typeof sales.$inferSelect & { items: any[] }>(),
        400: errorSchemas.validation,
        409: errorSchemas.validation,
        422: errorSchemas.validation,
        500: errorSchemas.internal,
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/sales' as const,
      input: z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        customerId: z.coerce.number().optional(),
        tier: z.string().optional(),
        paymentMethod: z.string().optional(),
        status: z.string().optional(),
        cashierId: z.coerce.number().optional(),
        usedPoints: z.coerce.boolean().optional(),
        search: z.string().optional(),
        page: z.coerce.number().int().min(1).optional(),
        pageSize: z.coerce.number().int().min(1).max(200).optional(),
      }).optional(),
      responses: {
        200: z.object({
          items: z.array(z.custom<any>()),
          total: z.number(),
          page: z.number(),
          pageSize: z.number(),
        }),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/sales/:id' as const,
      responses: {
        200: z.custom<typeof sales.$inferSelect & { items: any[], cashier: any, customer: any }>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/sales/:id' as const,
      responses: {
        204: z.void(),
        403: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
  },
  suspendedSales: {
    create: {
      method: 'POST' as const,
      path: '/api/suspended-sales' as const,
      input: checkoutSchema.extend({
        note: z.string().max(255).optional(),
      }),
      responses: {
        201: z.object({
          id: z.number(),
          note: z.string().nullable(),
          createdAt: z.any().nullable(),
          itemCount: z.number(),
        }),
        400: errorSchemas.validation,
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/suspended-sales' as const,
      responses: {
        200: z.array(z.object({
          id: z.number(),
          note: z.string().nullable(),
          createdAt: z.any().nullable(),
          itemCount: z.number(),
        })),
      },
    },
    recall: {
      method: 'POST' as const,
      path: '/api/suspended-sales/:id/recall' as const,
      responses: {
        200: z.object({
          id: z.number(),
          note: z.string().nullable(),
          createdAt: z.any().nullable(),
          customer: z.custom<typeof customers.$inferSelect>().nullable(),
          globalDiscount: z.number(),
          pointsToRedeem: z.number(),
          paymentMethod: z.string(),
          items: z.array(z.custom<typeof products.$inferSelect & { quantity: number; unitType: "PCS" | "CARTON"; discount: number }>()),
        }),
        404: errorSchemas.notFound,
      },
    },
  },
  returns: {
    create: {
      method: 'POST' as const,
      path: '/api/returns' as const,
      input: z.object({
        saleId: z.number(),
        items: z.array(z.object({
          productId: z.number(),
          quantity: z.number()
        })),
        refundMethod: z.string().default("cash"),
        reason: z.string()
      }),
      responses: {
        201: z.custom<any>(), // Return object
        400: errorSchemas.validation,
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/returns' as const,
      input: z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        status: z.string().optional(),
        search: z.string().optional(),
        page: z.coerce.number().int().min(1).optional(),
        pageSize: z.coerce.number().int().min(1).max(200).optional(),
      }).optional(),
      responses: {
        200: z.object({
          items: z.array(z.custom<any>()),
          total: z.number(),
          page: z.number(),
          pageSize: z.number(),
        }),
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/returns/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  discounts: {
    list: {
      method: 'GET' as const,
      path: '/api/discounts' as const,
      input: z.object({
        active: z.coerce.boolean().optional(),
        search: z.string().optional(),
        status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
        appliesTo: z.enum(["product", "category", "global", "customer"]).optional(),
        page: z.coerce.number().int().min(1).optional(),
        pageSize: z.coerce.number().int().min(1).max(200).optional(),
        sortBy: z.enum(["createdAt", "name", "priorityLevel", "startDate", "endDate"]).optional(),
        sortDir: z.enum(["asc", "desc"]).optional(),
      }).optional(),
      responses: {
        200: z.object({
          items: z.array(z.custom<typeof discounts.$inferSelect>()),
          page: z.number(),
          pageSize: z.number(),
          total: z.number(),
        }),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/discounts/:id' as const,
      responses: {
        200: z.custom<typeof discounts.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/discounts' as const,
      input: insertDiscountSchema,
      responses: {
        201: z.custom<typeof discounts.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/discounts/:id' as const,
      input: insertDiscountSchema.partial(),
      responses: {
        200: z.custom<typeof discounts.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/discounts/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  loyalty: {
    settings: {
      get: {
        method: 'GET' as const,
        path: '/api/loyalty/settings' as const,
        responses: {
          200: z.object({
            earnAmountPerPoint: z.number(),
            redeemAmountPerPoint: z.number(),
            silverMinSpending: z.number(),
            goldMinSpending: z.number(),
            platinumMinSpending: z.number(),
            silverPointMultiplier: z.number(),
            goldPointMultiplier: z.number(),
            platinumPointMultiplier: z.number(),
          }),
        },
      },
      update: {
        method: 'PUT' as const,
        path: '/api/loyalty/settings' as const,
        input: z.object({
          earnAmountPerPoint: z.number().min(1),
          redeemAmountPerPoint: z.number().min(1),
          silverMinSpending: z.number().min(0),
          goldMinSpending: z.number().min(0),
          platinumMinSpending: z.number().min(0),
          silverPointMultiplier: z.number().min(0),
          goldPointMultiplier: z.number().min(0),
          platinumPointMultiplier: z.number().min(0),
        }),
        responses: {
          200: z.object({
            earnAmountPerPoint: z.number(),
            redeemAmountPerPoint: z.number(),
            silverMinSpending: z.number(),
            goldMinSpending: z.number(),
            platinumMinSpending: z.number(),
            silverPointMultiplier: z.number(),
            goldPointMultiplier: z.number(),
            platinumPointMultiplier: z.number(),
          }),
        },
      },
    },
  },
  appSettings: {
    get: {
      method: 'GET' as const,
      path: '/api/app-settings' as const,
      responses: {
        200: z.object({
          storeName: z.string(),
          storeAddress: z.string().nullable(),
          receiptFooter: z.string().nullable(),
        }),
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/app-settings' as const,
      input: z.object({
        storeName: z.string().min(1).max(255),
        storeAddress: z.string().max(255).nullable().optional(),
        receiptFooter: z.string().max(255).nullable().optional(),
      }),
      responses: {
        200: z.object({
          storeName: z.string(),
          storeAddress: z.string().nullable(),
          receiptFooter: z.string().nullable(),
        }),
      },
    },
  },
  dashboard: {
    overview: {
      method: 'GET' as const,
      path: '/api/dashboard/overview' as const,
      input: z.object({
        days: z.coerce.number().min(1).max(365).optional(),
        months: z.coerce.number().min(1).max(36).optional(),
        topLimit: z.coerce.number().min(1).max(50).optional(),
        lowStockThreshold: z.coerce.number().min(0).max(100000).optional(),
      }).optional(),
      responses: {
        200: z.object({
          summary: z.object({
            todaySales: z.number(),
            todayTransactions: z.number(),
            monthSales: z.number(),
            todayItemsSold: z.number(),
            lowStockCount: z.number(),
            activeExpectedCash: z.number(),
            activeShiftCount: z.number(),
            pendingCount: z.number(),
          }),
          charts: z.object({
            dailySales: z.array(z.object({
              date: z.string(),
              totalSales: z.number(),
              cashSales: z.number(),
              nonCashSales: z.number(),
              transactions: z.number(),
            })),
            monthlySales: z.array(z.object({
              month: z.string(),
              totalSales: z.number(),
              transactions: z.number(),
            })),
            paymentBreakdown: z.array(z.object({
              method: z.string(),
              totalSales: z.number(),
              transactions: z.number(),
            })),
            topProducts: z.array(z.object({
              productId: z.number(),
              productName: z.string(),
              quantitySold: z.number(),
              totalRevenue: z.number(),
            })),
          }),
          operational: z.object({
            activeShifts: z.array(z.object({
              id: z.number(),
              userId: z.number(),
              userName: z.string(),
              userRole: z.string(),
              terminalName: z.string().nullable(),
              openedAt: z.any(),
              openingCash: z.number(),
              totalTransactions: z.number(),
              totalSales: z.number(),
              cashSales: z.number(),
              cashRefunds: z.number(),
              expectedCash: z.number(),
            })),
            lowStockProducts: z.array(z.object({
              id: z.number(),
              name: z.string(),
              stock: z.number(),
            })),
            cashDiscrepancies: z.array(z.object({
              shiftId: z.number(),
              userName: z.string(),
              terminalName: z.string().nullable(),
              closedAt: z.any(),
              cashDifference: z.number(),
            })),
          }),
        }),
      },
    },
  },
  reports: {
    summary: {
      method: 'GET' as const,
      path: '/api/reports/summary' as const,
      input: z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        brandId: z.coerce.number().optional(),
      }).optional(),
      responses: {
        200: z.object({
          totalSales: z.number(),
          totalRefund: z.number(),
          netRevenue: z.number(),
          totalDiscount: z.number(),
          totalPointUsed: z.number(),
          totalPointIssued: z.number(),
          totalTransactions: z.number(),
          averageTransactionValue: z.number(),
        }),
      },
    },
    daily: {
      method: 'GET' as const,
      path: '/api/reports/daily' as const,
      responses: {
        200: z.object({
          totalTransactions: z.number(),
          totalItems: z.number(),
          totalRevenue: z.number(),
        }),
      },
    },
    sales: {
      method: 'GET' as const,
      path: '/api/reports/sales' as const,
      input: z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        groupBy: z.enum(["day", "week", "month"]).default("day"),
        cashierId: z.coerce.number().optional(),
        paymentMethod: z.string().optional(),
        tier: z.string().optional(),
        brandId: z.coerce.number().optional(),
      }).optional(),
      responses: {
        200: z.array(z.object({
          bucket: z.string(),
          totalSales: z.number(),
          totalRefund: z.number(),
          netRevenue: z.number(),
          transactions: z.number(),
        })),
      },
    },
    customers: {
      method: 'GET' as const,
      path: '/api/reports/customers' as const,
      input: z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        limit: z.coerce.number().int().min(1).max(100).default(10),
        brandId: z.coerce.number().optional(),
      }).optional(),
      responses: {
        200: z.object({
          topSpenders: z.array(z.object({
            customerId: z.number(),
            name: z.string(),
            phone: z.string().nullable(),
            tier: z.string(),
            totalSpent: z.number(),
            transactions: z.number(),
          })),
          totalPointOutstanding: z.number(),
        }),
      },
    },
    products: {
      method: 'GET' as const,
      path: '/api/reports/products' as const,
      input: z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        limit: z.coerce.number().int().min(1).max(100).default(10),
        brandId: z.coerce.number().optional(),
      }).optional(),
      responses: {
        200: z.object({
          bestSelling: z.array(z.object({
            productId: z.number(),
            productName: z.string(),
            quantitySold: z.number(),
            totalRevenue: z.number(),
            margin: z.number(),
          })),
          mostReturned: z.array(z.object({
            productId: z.number(),
            productName: z.string(),
            quantityReturned: z.number(),
            totalRefund: z.number(),
          })),
        }),
      },
    },
    returns: {
      method: 'GET' as const,
      path: '/api/reports/returns' as const,
      input: z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        brandId: z.coerce.number().optional(),
      }).optional(),
      responses: {
        200: z.object({
          totalReturns: z.number(),
          totalRefund: z.number(),
          returnRatePct: z.number(),
          topReturnItems: z.array(z.object({
            productId: z.number(),
            productName: z.string(),
            quantityReturned: z.number(),
            totalRefund: z.number(),
          })),
        }),
      },
    },
    items: {
      method: 'GET' as const,
      path: '/api/reports/items' as const,
      input: z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        brandId: z.coerce.number().optional(),
      }).optional(),
      responses: {
        200: z.array(z.object({
          productName: z.string(),
          brandName: z.string().nullable(),
          quantitySold: z.number(),
          totalRevenue: z.number(),
        })),
      },
    },
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
