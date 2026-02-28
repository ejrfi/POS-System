import { ProductDeletionService } from "../server/modules/inventory/productDeletion.service";
import { BusinessError } from "../server/errors";

const productId = Number(process.argv[2] ?? 3);
const service = new ProductDeletionService();

try {
  const info = await service.getDeleteInfo(productId);
  console.log("getDeleteInfo:", info);
} catch (e: any) {
  if (e instanceof BusinessError) {
    console.error("getDeleteInfo BusinessError:", e.status, e.code, e.message);
  } else {
    console.error("getDeleteInfo Error:", e?.message ?? e);
  }
}

try {
  const result = await service.deleteProduct({ productId, mode: "soft", actorRole: "admin" });
  console.log("deleteProduct result:", result);
} catch (e: any) {
  if (e instanceof BusinessError) {
    console.error("deleteProduct BusinessError:", e.status, e.code, e.message);
  } else {
    console.error("deleteProduct Error:", e?.message ?? e);
  }
}

process.exit(0);
