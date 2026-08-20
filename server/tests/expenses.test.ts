import { describe, it, expect, beforeEach } from "vitest";
import { registerAndLogin, createBusinessForAgent, withBusiness } from "./helpers";
import { resetDatabase } from "./setup";

describe("Expenses", () => {
  let businessId: string;
  let owner: Awaited<ReturnType<typeof registerAndLogin>>["agent"];
  let categoryId: string;

  beforeEach(async () => {
    await resetDatabase();
    const reg = await registerAndLogin({ email: "owner-expenses@example.com" });
    owner = reg.agent;
    businessId = (await createBusinessForAgent(owner)).id;

    const biz = withBusiness(owner, businessId);
    const categories = await biz.get(`/api/businesses/${businessId}/expenses/categories`);
    categoryId = categories.body.categories[0].id;
  });

  it("creates an expense", async () => {
    const biz = withBusiness(owner, businessId);
    const res = await biz.post(`/api/businesses/${businessId}/expenses`).send({
      categoryId,
      amount: 120.5,
      vendor: "City Utilities",
      paymentMethod: "BANK_TRANSFER",
      date: new Date().toISOString(),
    });
    expect(res.status).toBe(201);
    expect(res.body.expense.amount).toBe("120.5");
  });

  it("rejects an expense with a negative or zero amount", async () => {
    const biz = withBusiness(owner, businessId);
    const res = await biz.post(`/api/businesses/${businessId}/expenses`).send({
      categoryId,
      amount: -10,
      paymentMethod: "CASH",
      date: new Date().toISOString(),
    });
    expect(res.status).toBe(400);
  });

  it("rejects an expense referencing an invalid category", async () => {
    const biz = withBusiness(owner, businessId);
    const res = await biz.post(`/api/businesses/${businessId}/expenses`).send({
      categoryId: "not-a-real-category",
      amount: 10,
      paymentMethod: "CASH",
      date: new Date().toISOString(),
    });
    expect(res.status).toBe(400);
  });

  it("includes created expenses in the expense report totals", async () => {
    const biz = withBusiness(owner, businessId);
    await biz.post(`/api/businesses/${businessId}/expenses`).send({ categoryId, amount: 40, paymentMethod: "CASH", date: new Date().toISOString() });
    await biz.post(`/api/businesses/${businessId}/expenses`).send({ categoryId, amount: 60, paymentMethod: "CASH", date: new Date().toISOString() });

    const report = await biz.get(`/api/businesses/${businessId}/reports/expenses?preset=today`);
    expect(report.body.total).toBe(100);
  });

  it("deletes an expense", async () => {
    const biz = withBusiness(owner, businessId);
    const created = await biz.post(`/api/businesses/${businessId}/expenses`).send({ categoryId, amount: 25, paymentMethod: "CASH", date: new Date().toISOString() });
    const res = await biz.delete(`/api/businesses/${businessId}/expenses/${created.body.expense.id}`);
    expect(res.status).toBe(204);
  });
});
