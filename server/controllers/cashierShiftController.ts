import type { Request, Response } from "express";
import { api } from "@shared/routes";
import type { CashierShiftService } from "../services/cashierShiftService";
import { BusinessError } from "../errors";
import { z } from "zod";

function parseDate(value: unknown) {
  if (!value) return undefined;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

export function createCashierShiftController(service: CashierShiftService) {
  return {
    active: async (req: Request, res: Response) => {
      const user = req.user as any;
      const result = await service.getActiveShiftWithSummary(Number(user.id));
      res.json(result);
    },

    open: async (req: Request, res: Response) => {
      try {
        const user = req.user as any;
        const input = api.cashierShifts.open.input.parse(req.body);
        const shift = await service.openShift({
          userId: Number(user.id),
          openingCash: input.openingCash,
          note: input.note,
          terminalName: input.terminalName,
          ipAddress: req.ip,
          userAgent: req.get("user-agent") || undefined,
          clientOpenedAt: parseDate((input as any).clientOpenedAt),
        });
        res.status(201).json(shift);
      } catch (err: any) {
        if (err instanceof z.ZodError) {
          return res.status(422).json({ code: "VALIDATION_ERROR", message: "Input tidak valid", details: err.issues });
        }
        if (err instanceof BusinessError) {
          return res.status(err.status).json({ code: err.code, message: err.message, details: err.details });
        }
        if (err?.code === "ER_NO_SUCH_TABLE") {
          return res.status(503).json({ code: "DB_SCHEMA_MISSING", message: "Skema database belum siap. Jalankan migrasi/seed terlebih dahulu." });
        }
        res.status(500).json({ code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" });
      }
    },

    close: async (req: Request, res: Response) => {
      try {
        const user = req.user as any;
        const input = api.cashierShifts.close.input.parse(req.body);
        const result = await service.closeShift({ userId: Number(user.id), actualCash: input.actualCash, closeNote: (input as any).closeNote });
        res.json(result);
      } catch (err: any) {
        if (err instanceof z.ZodError) {
          return res.status(422).json({ code: "VALIDATION_ERROR", message: "Input tidak valid", details: err.issues });
        }
        if (err instanceof BusinessError) {
          return res.status(err.status).json({ code: err.code, message: err.message, details: err.details });
        }
        res.status(500).json({ code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" });
      }
    },

    approve: async (req: Request, res: Response) => {
      try {
        const user = req.user as any;
        if (user?.role !== "admin" && user?.role !== "supervisor") {
          return res.status(403).json({ message: "Forbidden" });
        }
        const input = api.cashierShifts.approve.input.parse(req.body);
        const shiftId = Number(req.params.id);
        const updated = await service.approveShift({ shiftId, approvedBy: Number(user.id), approvalNote: (input as any).approvalNote });
        res.json(updated);
      } catch (err: any) {
        if (err instanceof z.ZodError) {
          return res.status(422).json({ code: "VALIDATION_ERROR", message: "Input tidak valid", details: err.issues });
        }
        if (err instanceof BusinessError) {
          return res.status(err.status).json({ code: err.code, message: err.message, details: err.details });
        }
        res.status(500).json({ code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" });
      }
    },

    list: async (req: Request, res: Response) => {
      api.cashierShifts.list.input?.parse({
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        cashierName: req.query.cashierName,
        role: req.query.role,
        status: req.query.status,
        approvalStatus: req.query.approvalStatus,
        diffLargeOnly: req.query.diffLargeOnly,
        search: req.query.search,
      });

      const rows = await service.listShifts({
        startDate: parseDate(req.query.startDate),
        endDate: parseDate(req.query.endDate),
        cashierName: req.query.cashierName ? String(req.query.cashierName) : undefined,
        role: req.query.role ? String(req.query.role) : undefined,
        status: req.query.status ? (String(req.query.status) as any) : undefined,
        approvalStatus: req.query.approvalStatus ? (String(req.query.approvalStatus) as any) : undefined,
        diffLargeOnly: req.query.diffLargeOnly != null ? String(req.query.diffLargeOnly) === "true" || String(req.query.diffLargeOnly) === "1" : undefined,
        search: req.query.search ? String(req.query.search) : undefined,
      });
      res.json(rows);
    },

    summary: async (req: Request, res: Response) => {
      const user = req.user as any;
      const shiftId = Number(req.params.id);
      const detail = await service.getShiftSummary(shiftId);
      if (!detail) return res.status(404).json({ message: "Shift not found" });
      if (user?.role !== "admin" && user?.role !== "supervisor" && Number(detail.shift.userId) !== Number(user.id)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      res.json(detail);
    },

    transactions: async (req: Request, res: Response) => {
      const user = req.user as any;
      const shiftId = Number(req.params.id);
      const detail = await service.getShiftSummary(shiftId);
      if (!detail) return res.status(404).json({ message: "Shift not found" });
      if (user?.role !== "admin" && user?.role !== "supervisor" && Number(detail.shift.userId) !== Number(user.id)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const txns = await service.getShiftTransactions(shiftId);
      if (!txns) return res.status(404).json({ message: "Shift not found" });
      res.json(txns);
    },
  };
}
