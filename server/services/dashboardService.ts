import type { IStorage } from "../storage";

export type DashboardOverviewParams = {
  days?: number;
  months?: number;
  topLimit?: number;
  lowStockThreshold?: number;
};

export class DashboardService {
  constructor(private readonly storage: IStorage) {}

  async getOverview(params?: DashboardOverviewParams) {
    return await this.storage.getDashboardOverview(params);
  }
}

