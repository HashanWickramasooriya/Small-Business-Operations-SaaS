import { describe, it, expect, beforeEach } from "vitest";
import { registerAndLogin, createBusinessForAgent, withBusiness } from "./helpers";
import { resetDatabase } from "./setup";

describe("Sales / POS", () => {
  let businessId: string;
  let owner: Awaited<ReturnType<typeof registerAndLogin>>["agent"];
  let productId: string;

  beforeEach(async () => {
    await resetDatabase();
    const reg = await registerAndLogin({ email: "owner-sales@example.com" });
    owner = reg.agent;
    const business = await createBusinessForAgent(owner);
    businessId = business.id;

    const biz = withBusiness(owner, businessId);
    const product = await biz.post(`/api/businesses/${businessId}/products`).send({
      name: "Coffee",
      sku: "COFFEE-1",
      purchasePrice: 3,
      sellingPrice: 10,
      taxRate: 10,
      stock: 5,
      minStock: 2,
      unit: "pack",
    });
    productId = product.body.product.id;
  });

  it("computes totals correctly and reduces stock on sale creation", async () => {
    const biz = withBusiness(owner, businessId);
    const res = await biz.post(`/api/businesses/${businessId}/sales`).send({
      items: [{ productId, quantity: 2, discount: 0 }],
      discount: 0,
      paymentMethod: "CASH",
    });

    expect(res.status).toBe(201);
    // subtotal 20, tax 10% = 2, total 22 (Decimal fields serialize as strings)
    expect(Number(res.body.sale.subtotal)).toBe(20);
    expect(Number(res.body.sale.tax)).toBe(2);
    expect(Number(res.body.sale.total)).toBe(22);

    const product = await biz.get(`/api/businesses/${businessId}/products/${productId}`);
    expect(product.body.product.stock).toBe(3);
  });

  it("applies an order-level discount to the total", async () => {
    const biz = withBusiness(owner, businessId);
    const res = await biz.post(`/api/businesses/${businessId}/sales`).send({
      items: [{ productId, quantity: 1, discount: 0 }],
      discount: 3,
      paymentMethod: "CARD",
    });
    // subtotal 10, tax 1, total 11 - 3 = 8
    expect(Number(res.body.sale.total)).toBe(8);
  });

  it("rejects a sale that exceeds available stock", async () => {
    const biz = withBusiness(owner, businessId);
    const res = await biz.post(`/api/businesses/${businessId}/sales`).send({
      items: [{ productId, quantity: 999, discount: 0 }],
      discount: 0,
      paymentMethod: "CASH",
    });
    expect(res.status).toBe(400);
  });

  it("records a SALE inventory movement on checkout", async () => {
    const biz = withBusiness(owner, businessId);
    await biz.post(`/api/businesses/${businessId}/sales`).send({
      items: [{ productId, quantity: 1, discount: 0 }],
      paymentMethod: "CASH",
    });
    const movements = await biz.get(`/api/businesses/${businessId}/inventory/movements`);
    expect(movements.body.items.some((m: { type: string; quantity: number }) => m.type === "SALE" && m.quantity === -1)).toBe(true);
  });

  it("refunds a sale and restores stock", async () => {
    const biz = withBusiness(owner, businessId);
    const sale = await biz.post(`/api/businesses/${businessId}/sales`).send({
      items: [{ productId, quantity: 2, discount: 0 }],
      paymentMethod: "CASH",
    });
    const saleItemId = sale.body.sale.items[0].id;

    const refund = await biz.post(`/api/businesses/${businessId}/sales/${sale.body.sale.id}/refund`).send({
      items: [{ saleItemId, quantity: 2 }],
      reason: "Customer changed mind",
    });
    expect(refund.status).toBe(200);
    expect(refund.body.sale.status).toBe("REFUNDED");

    const product = await biz.get(`/api/businesses/${businessId}/products/${productId}`);
    expect(product.body.product.stock).toBe(5);
  });
});
