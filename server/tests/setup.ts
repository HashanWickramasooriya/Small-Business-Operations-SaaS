import { beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma";

// Tests run against the database at process.env.DATABASE_URL (see .env.test /
// README testing instructions). We only truncate tenant-scoped tables between
// runs; the schema itself is expected to already be migrated onto that DB.
beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

export async function resetDatabase() {
  const tables = [
    "ActivityLog",
    "Notification",
    "InventoryMovement",
    "SaleItem",
    "Sale",
    "PurchaseItem",
    "Purchase",
    "Expense",
    "ExpenseCategory",
    "Product",
    "Category",
    "Customer",
    "Supplier",
    "BusinessSettings",
    "Membership",
    "PasswordResetToken",
    "RefreshToken",
    "Business",
    "User",
  ];
  for (const table of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
  }
}
