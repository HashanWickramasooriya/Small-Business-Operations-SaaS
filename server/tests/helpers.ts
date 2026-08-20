import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { Role } from "@prisma/client";

export const app = createApp();

let userCounter = 0;

export async function registerAndLogin(overrides: Partial<{ email: string; password: string; fullName: string }> = {}) {
  userCounter += 1;
  const email = overrides.email ?? `test-user-${userCounter}-${Date.now()}@example.com`;
  const password = overrides.password ?? "Password123";
  const fullName = overrides.fullName ?? "Test User";

  const agent = request.agent(app);
  const res = await agent.post("/api/auth/register").send({ email, password, fullName });
  return { agent, user: res.body.user as { id: string; email: string; fullName: string } };
}

export async function createBusinessForAgent(
  agent: ReturnType<typeof request.agent>,
  overrides: Partial<{ name: string; currency: string }> = {}
) {
  const res = await agent.post("/api/businesses").send({
    name: overrides.name ?? "Test Business",
    currency: overrides.currency ?? "USD",
  });
  return res.body.business as { id: string; name: string; slug: string };
}

/** Adds an existing (or new) user as a member of a business with a given role, returning their authenticated agent. */
export async function addMemberWithRole(businessId: string, role: Role, overrides?: Partial<{ email: string; fullName: string }>) {
  const { agent, user } = await registerAndLogin(overrides);
  await prisma.membership.create({
    data: { userId: user.id, businessId, role, status: "ACTIVE", joinedAt: new Date() },
  });
  return { agent, user };
}

export function withBusiness(agent: ReturnType<typeof request.agent>, businessId: string) {
  return {
    get: (url: string) => agent.get(url).set("X-Business-Id", businessId),
    post: (url: string) => agent.post(url).set("X-Business-Id", businessId),
    patch: (url: string) => agent.patch(url).set("X-Business-Id", businessId),
    delete: (url: string) => agent.delete(url).set("X-Business-Id", businessId),
  };
}
