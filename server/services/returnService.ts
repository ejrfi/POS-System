import type { IStorage } from "../storage";

export class ReturnService {
  constructor(private readonly storage: IStorage) {}

  async create(
    input: { saleId: number; items: { productId: number; quantity: number }[]; reason: string; refundMethod: string },
    actor: { id: number; role: string },
    shiftId: number
  ) {
    return await this.storage.createReturn(input.saleId, input.items, input.reason, input.refundMethod, actor, shiftId);
  }

  async list(params: Parameters<IStorage["getReturns"]>[0], context?: Parameters<IStorage["getReturns"]>[1]) {
    return await this.storage.getReturns(params, context);
  }

  async cancel(id: number, actorId: number) {
    return await this.storage.deleteReturn(id, actorId);
  }
}
