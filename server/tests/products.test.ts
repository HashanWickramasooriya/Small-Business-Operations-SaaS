import { describe, it, expect, beforeEach } from "vitest";
import { registerAndLogin, createBusinessForAgent, withBusiness } from "./helpers";
import { resetDatabase } from "./setup";

describe("Products", () => {
  let businessId: string;
  let owner: Awaited<ReturnType<typeof registerAndLogin>>["agent"];

  beforeEach(async () => {
    await resetDatabase();
    const reg = await registerAndLogin({ email: "owner-products@example.com" });
    owner = reg.agent;
    const business = await createBusinessForAgent(owner);
    businessId = business.id;
  });

  it("creates a product with initial stock and records an INITIAL inventory movement", async () => {
    const biz = withBusiness(owner, businessId);
    const res = await biz.post(`/api/businesses/${businessId}/products`).send({
      name: "Premium Rice",
      sku: "RICE-001",
      purchasePrice: 5,
      sellingPrice: 9.99,
      taxRate: 5,
      stock: 20,
      minStock: 5,
      unit: "bag",
    });

    expect(res.status).toBe(201);
    expect(res.body.product.stock).toBe(20);

    const movements = await biz.get(`/api/businesses/${businessId}/inventory/movements`);
    expect(movements.body.items.some((m: { type: string; quantity: number }) => m.type === "INITIAL" && m.quantity === 20)).toBe(true);
  });

  it("rejects a duplicate SKU within the same business", async () => {
    const biz = withBusiness(owner, businessId);
    await biz.post(`/api/businesses/${businessId}/products`).send({ name: "A", sku: "DUPE", purchasePrice: 1, sellingPrice: 2, stock: 1, minStock: 1 });
    const res = await biz.post(`/api/businesses/${businessId}/products`).send({ name: "B", sku: "DUPE", purchasePrice: 1, sellingPrice: 2, stock: 1, minStock: 1 });
    expect(res.status).toBe(409);
  });

  it("validates required fields on product creation", async () => {
    const biz = withBusiness(owner, businessId);
    const res = await biz.post(`/api/businesses/${businessId}/products`).send({ name: "" });
    expect(res.status).toBe(400);
  });

  it("archives and restores a product", async () => {
    const biz = withBusiness(owner, businessId);
    const created = await biz.post(`/api/businesses/${businessId}/products`).send({ name: "Archivable", sku: "ARCH-1", purchasePrice: 1, sellingPrice: 2, stock: 1, minStock: 1 });
    const id = created.body.product.id;

    const archived = await biz.post(`/api/businesses/${businessId}/products/${id}/archive`);
    expect(archived.body.product.status).toBe("ARCHIVED");

    const restored = await biz.post(`/api/businesses/${businessId}/products/${id}/archive`);
    expect(restored.body.product.status).toBe("ACTIVE");
  });

  it("does not allow stock to be changed via a product update (must go through inventory adjustment)", async () => {
    const biz = withBusiness(owner, businessId);
    const created = await biz.post(`/api/businesses/${businessId}/products`).send({ name: "Guarded Stock", sku: "GS-1", purchasePrice: 1, sellingPrice: 2, stock: 10, minStock: 1 });
    const id = created.body.product.id;

    const updated = await biz.patch(`/api/businesses/${businessId}/products/${id}`).send({ stock: 999, name: "Guarded Stock Updated" });
    expect(updated.status).toBe(200);
    expect(updated.body.product.stock).toBe(10);
    expect(updated.body.product.name).toBe("Guarded Stock Updated");
  });
});
