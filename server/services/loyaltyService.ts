import type { IStorage } from "../storage";

export class LoyaltyService {
  constructor(private readonly storage: IStorage) {}

  async getSettings() {
    return await this.storage.getLoyaltySettings();
  }

  async updateSettings(input: Parameters<IStorage["updateLoyaltySettings"]>[0]) {
    return await this.storage.updateLoyaltySettings(input);
  }
}
