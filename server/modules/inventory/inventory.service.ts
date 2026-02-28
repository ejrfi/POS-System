import { BusinessError } from "../../errors";
import { InventoryRepository, type InventoryStatus } from "./inventory.repository";

export class InventoryService {
  constructor(private readonly repo: InventoryRepository) {}

  async listCategories(params?: { includeInactive?: boolean }) {
    return await this.repo.listCategories(params);
  }

  async createCategory(input: { name: string; description?: string | null; status?: InventoryStatus }) {
    const name = input.name.trim();
    if (!name) throw new BusinessError(422, "VALIDATION_ERROR", "Nama kategori wajib diisi");
    const exists = await this.repo.getCategoryByName(name);
    if (exists) throw new BusinessError(409, "DUPLICATE_CATEGORY", "Nama kategori sudah digunakan");
    return await this.repo.createCategory({ ...input, name });
  }

  async updateCategory(id: number, input: { name?: string; description?: string | null; status?: InventoryStatus }) {
    const existing = await this.repo.getCategoryById(id);
    if (!existing) throw new BusinessError(404, "NOT_FOUND", "Kategori tidak ditemukan");

    if (input.name != null) {
      const name = input.name.trim();
      if (!name) throw new BusinessError(422, "VALIDATION_ERROR", "Nama kategori wajib diisi");
      const other = await this.repo.getCategoryByName(name);
      if (other && Number(other.id) !== Number(id)) throw new BusinessError(409, "DUPLICATE_CATEGORY", "Nama kategori sudah digunakan");
      input = { ...input, name };
    }

    if (input.status === "INACTIVE") {
      const activeBrands = await this.repo.countActiveBrandsByCategory(id);
      if (activeBrands > 0) {
        throw new BusinessError(409, "CATEGORY_HAS_ACTIVE_BRANDS", "Tidak bisa menonaktifkan kategori: masih ada brand aktif");
      }
    }

    return await this.repo.updateCategory(id, input);
  }

  async setCategoryStatus(id: number, status: InventoryStatus) {
    return await this.updateCategory(id, { status });
  }

  async listBrands(params?: { categoryId?: number; includeInactive?: boolean }) {
    return await this.repo.listBrands(params);
  }

  async createBrand(input: { name: string; categoryId: number; status?: InventoryStatus }) {
    const name = input.name.trim();
    if (!name) throw new BusinessError(422, "VALIDATION_ERROR", "Nama brand wajib diisi");
    if (!Number.isFinite(input.categoryId)) throw new BusinessError(422, "VALIDATION_ERROR", "Kategori wajib dipilih");

    const category = await this.repo.getCategoryById(input.categoryId);
    if (!category) throw new BusinessError(404, "NOT_FOUND", "Kategori tidak ditemukan");
    if (category.status !== "ACTIVE") throw new BusinessError(409, "CATEGORY_INACTIVE", "Kategori nonaktif tidak bisa dipakai");

    const exists = await this.repo.findBrandByNameInCategory({ name, categoryId: input.categoryId });
    if (exists) throw new BusinessError(409, "DUPLICATE_BRAND", "Nama brand sudah digunakan pada kategori ini");

    return await this.repo.createBrand({ ...input, name });
  }

  async updateBrand(id: number, input: { name?: string; categoryId?: number; status?: InventoryStatus }) {
    const existing = await this.repo.getBrandById(id);
    if (!existing) throw new BusinessError(404, "NOT_FOUND", "Brand tidak ditemukan");

    const nextCategoryId = input.categoryId ?? existing.categoryId;

    if (input.categoryId != null) {
      const category = await this.repo.getCategoryById(nextCategoryId);
      if (!category) throw new BusinessError(404, "NOT_FOUND", "Kategori tidak ditemukan");
      if (category.status !== "ACTIVE") throw new BusinessError(409, "CATEGORY_INACTIVE", "Kategori nonaktif tidak bisa dipakai");
    }

    if (input.name != null) {
      const name = input.name.trim();
      if (!name) throw new BusinessError(422, "VALIDATION_ERROR", "Nama brand wajib diisi");
      const other = await this.repo.findBrandByNameInCategory({ name, categoryId: nextCategoryId, excludeId: id });
      if (other) throw new BusinessError(409, "DUPLICATE_BRAND", "Nama brand sudah digunakan pada kategori ini");
      input = { ...input, name };
    }

    if (input.status === "INACTIVE") {
      const productsCount = await this.repo.countProductsByBrand(id);
      if (productsCount > 0) {
        throw new BusinessError(409, "BRAND_HAS_PRODUCTS", "Tidak bisa menonaktifkan brand: masih memiliki produk");
      }
    }

    return await this.repo.updateBrand(id, input);
  }

  async setBrandStatus(id: number, status: InventoryStatus) {
    return await this.updateBrand(id, { status });
  }
}

