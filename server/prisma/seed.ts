import { PrismaClient, Role, MembershipStatus, PaymentMethod, InventoryMovementType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding demo data for FreshMart...");

  const passwordHash = await bcrypt.hash("Password123", 12);

  const owner = await prisma.user.upsert({
    where: { email: "owner@freshmart.demo" },
    update: {},
    create: { email: "owner@freshmart.demo", fullName: "Amara Owner", passwordHash },
  });
  const manager = await prisma.user.upsert({
    where: { email: "manager@freshmart.demo" },
    update: {},
    create: { email: "manager@freshmart.demo", fullName: "Malik Manager", passwordHash },
  });
  const cashier = await prisma.user.upsert({
    where: { email: "cashier@freshmart.demo" },
    update: {},
    create: { email: "cashier@freshmart.demo", fullName: "Chloe Cashier", passwordHash },
  });
  const accountant = await prisma.user.upsert({
    where: { email: "accountant@freshmart.demo" },
    update: {},
    create: { email: "accountant@freshmart.demo", fullName: "Aiden Accountant", passwordHash },
  });

  const business = await prisma.business.upsert({
    where: { slug: "freshmart" },
    update: {},
    create: {
      name: "FreshMart",
      slug: "freshmart",
      businessType: "Grocery Store",
      currency: "USD",
      country: "United States",
      phone: "+1 555 010 2020",
      email: "hello@freshmart.demo",
      onboardingStep: 9,
      onboardingComplete: true,
      settings: { create: {} },
    },
  });

  for (const [user, role] of [
    [owner, Role.OWNER],
    [manager, Role.MANAGER],
    [cashier, Role.CASHIER],
    [accountant, Role.ACCOUNTANT],
  ] as const) {
    await prisma.membership.upsert({
      where: { userId_businessId: { userId: user.id, businessId: business.id } },
      update: {},
      create: { userId: user.id, businessId: business.id, role, status: MembershipStatus.ACTIVE, joinedAt: new Date() },
    });
  }

  const categoryNames = ["Beverages", "Bakery", "Produce", "Dairy", "Pantry"];
  const categories: Record<string, string> = {};
  for (const name of categoryNames) {
    const cat = await prisma.category.upsert({
      where: { businessId_name: { businessId: business.id, name } },
      update: {},
      create: { businessId: business.id, name },
    });
    categories[name] = cat.id;
  }

  const expenseCategoryDefs = [
    ["Rent", "RENT"], ["Utilities", "UTILITIES"], ["Salaries", "SALARIES"], ["Transport", "TRANSPORT"],
    ["Marketing", "MARKETING"], ["Maintenance", "MAINTENANCE"], ["Supplies", "SUPPLIES"], ["Other", "OTHER"],
  ] as const;
  const expenseCategories: Record<string, string> = {};
  for (const [name, type] of expenseCategoryDefs) {
    const cat = await prisma.expenseCategory.upsert({
      where: { businessId_name: { businessId: business.id, name } },
      update: {},
      create: { businessId: business.id, name, type },
    });
    expenseCategories[name] = cat.id;
  }

  const supplier = await prisma.supplier.upsert({
    where: { id: "seed-supplier-1" },
    update: {},
    create: {
      id: "seed-supplier-1",
      businessId: business.id,
      name: "Global Foods Distributors",
      email: "orders@globalfoods.demo",
      phone: "+1 555 030 4040",
      address: "1200 Market St, Springfield",
    },
  });

  const productDefs = [
    { name: "Premium Rice (5kg)", sku: "FM-RICE-5KG", category: "Pantry", purchasePrice: 6.5, sellingPrice: 9.99, stock: 120, minStock: 20, unit: "bag" },
    { name: "Organic Milk (1L)", sku: "FM-MILK-1L", category: "Dairy", purchasePrice: 1.2, sellingPrice: 2.49, stock: 80, minStock: 25, unit: "bottle" },
    { name: "Arabica Coffee (250g)", sku: "FM-COFFEE-250", category: "Beverages", purchasePrice: 3.8, sellingPrice: 6.99, stock: 60, minStock: 15, unit: "pack" },
    { name: "Whole Wheat Bread", sku: "FM-BREAD-WW", category: "Bakery", purchasePrice: 1.1, sellingPrice: 2.29, stock: 8, minStock: 10, unit: "loaf" },
    { name: "Fresh Apples (1kg)", sku: "FM-APPLE-1KG", category: "Produce", purchasePrice: 1.5, sellingPrice: 2.79, stock: 45, minStock: 12, unit: "kg" },
    { name: "Orange Juice (1L)", sku: "FM-OJ-1L", category: "Beverages", purchasePrice: 1.6, sellingPrice: 3.29, stock: 5, minStock: 15, unit: "bottle" },
    { name: "Mineral Water (12x500ml)", sku: "FM-WATER-12", category: "Beverages", purchasePrice: 2.4, sellingPrice: 4.49, stock: 90, minStock: 20, unit: "pack" },
  ];

  const products: Record<string, string> = {};
  for (const p of productDefs) {
    const product = await prisma.product.upsert({
      where: { businessId_sku: { businessId: business.id, sku: p.sku } },
      update: {},
      create: {
        businessId: business.id,
        name: p.name,
        sku: p.sku,
        categoryId: categories[p.category],
        purchasePrice: p.purchasePrice,
        sellingPrice: p.sellingPrice,
        taxRate: 5,
        stock: p.stock,
        minStock: p.minStock,
        unit: p.unit,
        supplierId: supplier.id,
      },
    });
    products[p.sku] = product.id;

    await prisma.inventoryMovement.create({
      data: {
        businessId: business.id,
        productId: product.id,
        type: InventoryMovementType.INITIAL,
        quantity: p.stock,
        note: "Seed initial stock",
      },
    });
  }

  const customerDefs = [
    { name: "Grace Thompson", email: "grace@example.com", phone: "+1 555 111 2222" },
    { name: "Liam Rodriguez", email: "liam@example.com", phone: "+1 555 222 3333" },
    { name: "Sophia Nguyen", email: "sophia@example.com", phone: "+1 555 333 4444" },
  ];
  const customers = [];
  for (const c of customerDefs) {
    const customer = await prisma.customer.upsert({
      where: { id: `seed-customer-${c.email}` },
      update: {},
      create: { id: `seed-customer-${c.email}`, businessId: business.id, ...c },
    });
    customers.push(customer);
  }

  const skus = Object.keys(products);
  for (let i = 0; i < 25; i++) {
    const daysAgo = Math.floor(Math.random() * 14);
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);

    const lineCount = 1 + Math.floor(Math.random() * 3);
    const chosenSkus = [...skus].sort(() => 0.5 - Math.random()).slice(0, lineCount);

    let subtotal = 0;
    let tax = 0;
    const itemsData = [];
    for (const sku of chosenSkus) {
      const def = productDefs.find((p) => p.sku === sku)!;
      const qty = 1 + Math.floor(Math.random() * 4);
      const lineSubtotal = def.sellingPrice * qty;
      const lineTax = lineSubtotal * 0.05;
      subtotal += lineSubtotal;
      tax += lineTax;
      itemsData.push({ productId: products[sku], quantity: qty, unitPrice: def.sellingPrice, discount: 0, tax: lineTax, total: lineSubtotal + lineTax });
    }
    const total = subtotal + tax;
    const methods = [PaymentMethod.CASH, PaymentMethod.CARD, PaymentMethod.BANK_TRANSFER];

    await prisma.sale.create({
      data: {
        businessId: business.id,
        customerId: Math.random() > 0.3 ? customers[Math.floor(Math.random() * customers.length)].id : undefined,
        reference: `SALE-${String(i + 1).padStart(6, "0")}`,
        subtotal,
        tax,
        total,
        paymentMethod: methods[Math.floor(Math.random() * methods.length)],
        amountPaid: total,
        soldById: cashier.id,
        createdAt,
        items: { create: itemsData },
      },
    });
  }

  const expenseDefs = [
    { category: "Rent", amount: 1800, vendor: "Springfield Properties", daysAgo: 20 },
    { category: "Utilities", amount: 320, vendor: "City Power & Water", daysAgo: 15 },
    { category: "Salaries", amount: 4200, vendor: "Payroll", daysAgo: 5 },
    { category: "Marketing", amount: 150, vendor: "Local Print Co", daysAgo: 8 },
    { category: "Supplies", amount: 95, vendor: "Office Depot", daysAgo: 3 },
  ];
  for (const e of expenseDefs) {
    const date = new Date();
    date.setDate(date.getDate() - e.daysAgo);
    await prisma.expense.create({
      data: {
        businessId: business.id,
        categoryId: expenseCategories[e.category],
        amount: e.amount,
        vendor: e.vendor,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        date,
      },
    });
  }

  console.log("Seed complete.");
  console.log("Demo logins (password: Password123):");
  console.log("  Owner:      owner@freshmart.demo");
  console.log("  Manager:    manager@freshmart.demo");
  console.log("  Cashier:    cashier@freshmart.demo");
  console.log("  Accountant: accountant@freshmart.demo");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
