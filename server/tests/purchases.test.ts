import { describe, it, expect, beforeEach } from "vitest";
import { registerAndLogin, createBusinessForAgent, withBusiness } from "./helpers";
import { resetDatabase } from "./setup";

describe("Purchases", () => {
  let businessId: string;
  let owner: Awaited<ReturnType<typeof registerAndLogin>>["agent"];
  let productId: string;
  let supplierId: string;

  beforeEach(async () => {
    await resetDatabase();
    const reg = await registerAndLogin({ email: "owner-purchases@example.com" });
    owner = reg.agent;
    businessId = (await createBusinessForAgent(owner)).id;

    const biz = withBusiness(owner, businessId);
    const supplier = await biz.post(`/api/businesses/${businessId}/suppliers`).send({ name: "Acme Supplies" });
    supplierId = supplier.body.supplier.id;

    const product = await biz.post(`/api/businesses/${businessId}/products`).send({
      name: "Bulk Flour",
      sku: "FLOUR-1",
      purchasePrice: 4,
      sellingPrice: 7,
      stock: 0,
      minStock: 5,
      unit: "bag",
      supplierId,
    });
    productId = product.body.product.id;
  });

  it("creates a purchase order in DRAFT status", async () => {
    const biz = withBusiness(owner, businessId);
    const res = await biz.post(`/api/businesses/${businessId}/purchases`).send({
      supplierId,
      items: [{ productId, quantity: 50, unitCost: 4 }],
    });
    expect(res.status).toBe(201);
    expect(res.body.purchase.status).toBe("DRAFT");
    expect(Number(res.body.purchase.totalCost)).toBe(200);
  });

  it("rejects an invalid status transition (DRAFT -> RECEIVED directly is disallowed)", async () => {
    const biz = withBusiness(owner, businessId);
    const created = await biz.post(`/api/businesses/${businessId}/purchases`).send({
      supplierId,
      items: [{ productId, quantity: 10, unitCost: 4 }],
    });
    const res = await biz.patch(`/api/businesses/${businessId}/purchases/${created.body.purchase.id}/status`).send({ status: "RECEIVED" });
    expect(res.status).toBe(400);
  });

  it("increases stock only after the purchase is received, not when merely ordered", async () => {
    const biz = withBusiness(owner, businessId);
    const created = await biz.post(`/api/businesses/${businessId}/purchases`).send({
      supplierId,
      items: [{ productId, quantity: 20, unitCost: 4 }],
    });
    const purchaseId = created.body.purchase.id;

    await biz.patch(`/api/businesses/${businessId}/purchases/${purchaseId}/status`).send({ status: "ORDERED" });
    const afterOrder = await biz.get(`/api/businesses/${businessId}/products/${productId}`);
    expect(afterOrder.body.product.stock).toBe(0);

    const purchaseItemId = created.body.purchase.items[0].id;
    const receive = await biz.post(`/api/businesses/${businessId}/purchases/${purchaseId}/receive`).send({
      items: [{ purchaseItemId, quantityReceived: 20 }],
    });
    expect(receive.status).toBe(200);
    expect(receive.body.purchase.status).toBe("RECEIVED");

    const afterReceive = await biz.get(`/api/businesses/${businessId}/products/${productId}`);
    expect(afterReceive.body.product.stock).toBe(20);
  });

  it("supports partial receiving and reflects PARTIALLY_RECEIVED status", async () => {
    const biz = withBusiness(owner, businessId);
    const created = await biz.post(`/api/businesses/${businessId}/purchases`).send({
      supplierId,
      items: [{ productId, quantity: 30, unitCost: 4 }],
    });
    const purchaseId = created.body.purchase.id;
    await biz.patch(`/api/businesses/${businessId}/purchases/${purchaseId}/status`).send({ status: "ORDERED" });

    const purchaseItemId = created.body.purchase.items[0].id;
    const partial = await biz.post(`/api/businesses/${businessId}/purchases/${purchaseId}/receive`).send({
      items: [{ purchaseItemId, quantityReceived: 10 }],
    });
    expect(partial.body.purchase.status).toBe("PARTIALLY_RECEIVED");

    const product = await biz.get(`/api/businesses/${businessId}/products/${productId}`);
    expect(product.body.product.stock).toBe(10);
  });
});
