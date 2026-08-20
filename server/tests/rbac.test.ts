import { describe, it, expect, beforeEach } from "vitest";
import { registerAndLogin, createBusinessForAgent, addMemberWithRole, withBusiness } from "./helpers";
import { resetDatabase } from "./setup";

describe("Role-based access control", () => {
  let businessId: string;
  let owner: Awaited<ReturnType<typeof registerAndLogin>>["agent"];

  beforeEach(async () => {
    await resetDatabase();
    const reg = await registerAndLogin({ email: "rbac-owner@example.com" });
    owner = reg.agent;
    businessId = (await createBusinessForAgent(owner)).id;
  });

  it("OWNER can access every module, including employees and settings", async () => {
    const biz = withBusiness(owner, businessId);
    const members = await biz.get(`/api/businesses/${businessId}/members`);
    expect(members.status).toBe(200);
    const settings = await biz.patch(`/api/businesses/${businessId}/settings`).send({ invoicePrefix: "INV" });
    expect(settings.status).toBe(200);
  });

  it("MANAGER can manage products but cannot access expenses or employees write actions", async () => {
    const { agent } = await addMemberWithRole(businessId, "MANAGER", { email: "manager@example.com" });
    const biz = withBusiness(agent, businessId);

    const product = await biz.post(`/api/businesses/${businessId}/products`).send({ name: "Managed", sku: "MGR-1", purchasePrice: 1, sellingPrice: 2, stock: 1, minStock: 1 });
    expect(product.status).toBe(201);

    const expenses = await biz.get(`/api/businesses/${businessId}/expenses`);
    expect(expenses.status).toBe(403);

    const invite = await biz.post(`/api/businesses/${businessId}/members`).send({ email: "x@example.com", fullName: "X", role: "STAFF" });
    // Managers ARE allowed to invite per business rules, but role changes are owner-only.
    expect(invite.status).toBe(201);

    const roleChange = await biz.patch(`/api/businesses/${businessId}/members/${invite.body.membership.id}`).send({ role: "MANAGER" });
    expect(roleChange.status).toBe(403);
  });

  it("CASHIER can create sales but cannot manage products or view reports", async () => {
    const { agent } = await addMemberWithRole(businessId, "CASHIER", { email: "cashier@example.com" });
    const biz = withBusiness(agent, businessId);

    const ownerBiz = withBusiness(owner, businessId);
    const product = await ownerBiz.post(`/api/businesses/${businessId}/products`).send({ name: "For Sale", sku: "CASH-1", purchasePrice: 1, sellingPrice: 5, stock: 10, minStock: 1 });

    const sale = await biz.post(`/api/businesses/${businessId}/sales`).send({ items: [{ productId: product.body.product.id, quantity: 1, discount: 0 }], paymentMethod: "CASH" });
    expect(sale.status).toBe(201);

    const createProduct = await biz.post(`/api/businesses/${businessId}/products`).send({ name: "Blocked", sku: "CASH-2", purchasePrice: 1, sellingPrice: 2, stock: 1, minStock: 1 });
    expect(createProduct.status).toBe(403);

    const reports = await biz.get(`/api/businesses/${businessId}/reports/sales`);
    expect(reports.status).toBe(403);
  });

  it("ACCOUNTANT can manage expenses and view reports but cannot access POS", async () => {
    const { agent } = await addMemberWithRole(businessId, "ACCOUNTANT", { email: "accountant@example.com" });
    const biz = withBusiness(agent, businessId);

    const categories = await biz.get(`/api/businesses/${businessId}/expenses/categories`);
    const expense = await biz.post(`/api/businesses/${businessId}/expenses`).send({
      categoryId: categories.body.categories[0].id,
      amount: 50,
      paymentMethod: "CASH",
      date: new Date().toISOString(),
    });
    expect(expense.status).toBe(201);

    const reports = await biz.get(`/api/businesses/${businessId}/reports/expenses`);
    expect(reports.status).toBe(200);

    const pos = await biz.post(`/api/businesses/${businessId}/sales`).send({ items: [], paymentMethod: "CASH" });
    expect(pos.status).toBe(403);
  });

  it("STAFF has only dashboard and notification access", async () => {
    const { agent } = await addMemberWithRole(businessId, "STAFF", { email: "staff@example.com" });
    const biz = withBusiness(agent, businessId);

    const dashboard = await biz.get(`/api/businesses/${businessId}/dashboard`);
    expect(dashboard.status).toBe(200);

    const products = await biz.get(`/api/businesses/${businessId}/products`);
    expect(products.status).toBe(403);
  });

  it("non-owner cannot remove the business owner's membership", async () => {
    const { agent } = await addMemberWithRole(businessId, "MANAGER", { email: "manager2@example.com" });
    const bizOwner = withBusiness(owner, businessId);
    const membership = await bizOwner.get(`/api/businesses/${businessId}/members`);
    const ownerMembership = membership.body.members.find((m: { role: string }) => m.role === "OWNER");

    const bizManager = withBusiness(agent, businessId);
    const res = await bizManager.delete(`/api/businesses/${businessId}/members/${ownerMembership.id}`);
    expect(res.status).toBe(403);
  });
});
