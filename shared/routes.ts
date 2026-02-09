
import { z } from 'zod';
import { 
  insertUserSchema, 
  insertProductSchema, 
  insertBrandSchema, 
  insertCustomerSchema,
  checkoutSchema,
  users,
  products,
  brands,
  customers,
  sales
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
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
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof customers.$inferSelect>()),
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
  },
  sales: {
    checkout: {
      method: 'POST' as const,
      path: '/api/sales/checkout' as const,
      input: checkoutSchema,
      responses: {
        201: z.custom<typeof sales.$inferSelect & { items: any[] }>(),
        400: errorSchemas.validation,
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/sales' as const,
      responses: {
        200: z.array(z.custom<typeof sales.$inferSelect & { cashier: typeof users.$inferSelect }>()),
      },
    },
  },
  reports: {
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
