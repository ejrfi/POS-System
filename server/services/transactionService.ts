import type { IStorage } from "../storage";
import type { CheckoutRequest } from "@shared/schema";

export class TransactionService {
  constructor(private readonly storage: IStorage) {}

  async checkout(input: CheckoutRequest, cashierId: number) {
    return await this.storage.createSale(input, cashierId);
  }

  async list(params: Parameters<IStorage["getSales"]>[0], context: Parameters<IStorage["getSales"]>[1]) {
    return await this.storage.getSales(params, context);
  }

  async get(id: number) {
    return await this.storage.getSale(id);
  }

  async void(id: number, actorId: number, shiftId?: number) {
    return await this.storage.deleteSale(id, actorId, shiftId);
  }
}
