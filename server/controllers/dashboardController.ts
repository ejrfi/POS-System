import type { Request, Response } from "express";
import { api } from "@shared/routes";
import type { DashboardService } from "../services/dashboardService";

export function createDashboardController(service: DashboardService) {
  return {
    overview: async (req: Request, res: Response) => {
      const input = api.dashboard.overview.input?.parse({
        days: req.query.days,
        months: req.query.months,
        topLimit: req.query.topLimit,
        lowStockThreshold: req.query.lowStockThreshold,
      });
      const result = await service.getOverview(input);
      res.json(result);
    },
  };
}

