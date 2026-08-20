import { describe, it, expect, beforeEach } from "vitest";
import { registerAndLogin, createBusinessForAgent, withBusiness } from "./helpers";
import { resetDatabase } from "./setup";

describe("Inventory", () => {
  let businessId: string;
  let owner: Awaited<ReturnType<typeof registerAndLogin>>["agent"];
  let productId: string;

  beforeEach(async () => {
    await resetDatabase();
    const reg = await registerAndLogin({ email: "owner-inventory@example.com" });
    owner = reg.agent;
    const business = await createBusinessForAgent(owner);
    businessId = business.id;

    const biz = withBusiness(owner, businessId);
    const product = await biz.post(`/api/businesses/${businessId}/products`).send({
      name: "Bottled Water",
      sku: "WATER-1",
      purchasePrice: 1,
      sellingPrice: 2,
      stock: 10,
      minStock: 5,
      unit: "bottle",
    });
    productId = product.body.product.id;
  });

  it("increases stock with a positive manual adjustment", async () => {
    const biz = withBusiness(owner, businessId);
    const res = await biz.post(`/api/businesses/${businessId}/inventory/adjust`).send({ productId, quantity: 15, note: "Restock" });
    expect(res.status).toBe(200);
    expect(res.body.product.stock).toBe(25);
  });

  it("decreases stock with a negative manual adjustment", async () => {
    const biz = withBusiness(owner, businessId);
    const res = await biz.post(`/api/businesses/${businessId}/inventory/adjust`).send({ productId, quantity: -4, note: "Damaged" });
    expect(res.status).toBe(200);
    expect(res.body.product.stock).toBe(6);
  });

  it("rejects a zero-quantity adjustment", async () => {
    const biz = withBusiness(owner, businessId);
    const res = await biz.post(`/api/businesses/${businessId}/inventory/adjust`).send({ productId, quantity: 0 });
    expect(res.status).toBe(400);
  });

  it("flags a product as low stock once it drops to or below minStock", async () => {
    const biz = withBusiness(owner, businessId);
    await biz.post(`/api/businesses/${businessId}/inventory/adjust`).send({ productId, quantity: -6, note: "Sold a lot" });

    const lowStock = await biz.get(`/api/businesses/${businessId}/inventory/low-stock`);
    expect(lowStock.body.items.some((p: { id: string }) => p.id === productId)).toBe(true);

    const notifications = await biz.get(`/api/businesses/${businessId}/notifications`);
    expect(notifications.body.items.some((n: { type: string }) => n.type === "LOW_STOCK")).toBe(true);
  });
});
