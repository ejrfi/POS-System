import type { IStorage } from "../storage";

export class ReportService {
  constructor(private readonly storage: IStorage) {}

  async summary(params?: { startDate?: string; endDate?: string; brandId?: number }) {
    return await (this.storage as any).getReportSummary(params);
  }

  async sales(params?: { startDate?: string; endDate?: string; groupBy?: "day" | "week" | "month"; cashierId?: number; paymentMethod?: string; tier?: string; brandId?: number }) {
    return await (this.storage as any).getReportSales(params);
  }

  async customers(params?: { startDate?: string; endDate?: string; limit?: number; brandId?: number }) {
    return await (this.storage as any).getReportCustomers(params);
  }

  async products(params?: { startDate?: string; endDate?: string; limit?: number; brandId?: number }) {
    return await (this.storage as any).getReportProducts(params);
  }

  async returns(params?: { startDate?: string; endDate?: string; brandId?: number }) {
    return await (this.storage as any).getReportReturns(params);
  }

  async items(params?: { startDate?: string; endDate?: string; brandId?: number }) {
    const startDate = params?.startDate ? new Date(params.startDate) : undefined;
    const endDate = params?.endDate ? new Date(params.endDate) : undefined;
    const brandId = params?.brandId != null ? Number(params.brandId) : undefined;
    return await this.storage.getItemSales(startDate, endDate, brandId);
  }
}
