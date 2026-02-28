import type { IStorage } from "../storage";

export class CashierShiftService {
  constructor(private readonly storage: IStorage) {}

  async getActiveShiftWithSummary(userId: number) {
    const shift = await this.storage.getActiveCashierShift(userId);
    if (!shift) return { shift: null, summary: null };
    const detail = await this.storage.getCashierShiftSummary(shift.id);
    return { shift, summary: detail?.summary ?? null };
  }

  async openShift(params: { userId: number; openingCash: number; note?: string; terminalName?: string; ipAddress?: string; userAgent?: string; clientOpenedAt?: Date }) {
    return await this.storage.openCashierShift(
      params.userId,
      params.openingCash,
      params.note,
      params.terminalName,
      params.ipAddress,
      params.userAgent,
      params.clientOpenedAt,
    );
  }

  async closeShift(params: { userId: number; actualCash: number; closeNote?: string }) {
    return await this.storage.closeCashierShift(params.userId, params.actualCash, params.closeNote);
  }

  async approveShift(params: { shiftId: number; approvedBy: number; approvalNote?: string }) {
    return await this.storage.approveCashierShift(params.shiftId, params.approvedBy, params.approvalNote);
  }

  async listShifts(filters?: { startDate?: Date; endDate?: Date; cashierName?: string; role?: string; status?: "OPEN" | "CLOSED" | "ACTIVE"; approvalStatus?: "NONE" | "PENDING" | "APPROVED" | "REJECTED"; diffLargeOnly?: boolean; search?: string }) {
    return await this.storage.listCashierShifts(filters);
  }

  async getShiftSummary(shiftId: number) {
    return await this.storage.getCashierShiftSummary(shiftId);
  }

  async getShiftTransactions(shiftId: number) {
    return await this.storage.getCashierShiftTransactions(shiftId);
  }
}
