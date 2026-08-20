import { describe, it, expect, beforeEach } from "vitest";
import { registerAndLogin, createBusinessForAgent, withBusiness } from "./helpers";
import { resetDatabase } from "./setup";

describe("Multi-tenancy isolation", () => {
  let businessAId: string;
  let businessBId: string;
  let ownerA: Awaited<ReturnType<typeof registerAndLogin>>["agent"];
  let ownerB: Awaited<ReturnType<typeof registerAndLogin>>["agent"];
  let productAId: string;

  beforeEach(async () => {
    await resetDatabase();
    const regA = await registerAndLogin({ email: "owner-a@example.com" });
    ownerA = regA.agent;
    businessAId = (await createBusinessForAgent(ownerA, { name: "Business A" })).id;

    const regB = await registerAndLogin({ email: "owner-b@example.com" });
    ownerB = regB.agent;
    businessBId = (await createBusinessForAgent(ownerB, { name: "Business B" })).id;

    const bizA = withBusiness(ownerA, businessAId);
    const product = await bizA.post(`/api/businesses/${businessAId}/products`).send({
      name: "Business A Product",
      sku: "A-PRODUCT",
      purchasePrice: 1,
      sellingPrice: 2,
      stock: 10,
      minStock: 1,
    });
    productAId = product.body.product.id;
  });

  it("prevents Business B's owner from accessing Business A's business record", async () => {
    const res = await ownerB.get(`/api/businesses/${businessAId}`).set("X-Business-Id", businessAId);
    expect(res.status).toBe(403);
  });

  it("prevents Business B's owner from listing Business A's products, even scoped through Business A's own id", async () => {
    const res = await ownerB.get(`/api/businesses/${businessAId}/products`).set("X-Business-Id", businessAId);
    expect(res.status).toBe(403);
  });

  it("returns 404, not another tenant's data, when fetching a product by id under the wrong business", async () => {
    const bizB = withBusiness(ownerB, businessBId);
    const res = await bizB.get(`/api/businesses/${businessBId}/products/${productAId}`);
    expect(res.status).toBe(404);
  });

  it("does not leak Business A's data into Business B's product list", async () => {
    const bizB = withBusiness(ownerB, businessBId);
    const res = await bizB.get(`/api/businesses/${businessBId}/products`);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
  });

  it("rejects requests with no business context at all", async () => {
    const res = await ownerA.get("/api/businesses//products");
    expect([400, 404]).toContain(res.status);
  });

  it("a user cannot spoof access by only changing the X-Business-Id header without a real membership", async () => {
    const bizA = withBusiness(ownerB, businessAId); // ownerB's cookies, but Business A's id in the header
    const res = await bizA.get(`/api/businesses/${businessAId}/customers`);
    expect(res.status).toBe(403);
  });
});
