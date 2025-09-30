"use server";

import { stackServerApp } from "@/stack/server";
import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

/**
 * createBill
 * Contract:
 * - Inputs: formData with shopId (string), expression (string like "70+69+56")
 * - Auth: user must be owner of the shop or staff member of the shop
 * - Behavior: creates Bill and BillEntry rows for each number in expression
 * - Output: none (revalidates shop page)
 */
export async function createBill(formData: FormData) {
  const user = await stackServerApp.getUser({ or: "throw" });
  const shopId = String(formData.get("shopId") || "").trim();
  const expression = String(formData.get("expression") || "").trim();

  if (!shopId) throw new Error("Missing shopId");
  if (!expression) throw new Error("Please enter amounts like 70+69+56");

  // Validate membership (owner or staff)
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { id: true, ownerId: true },
  });
  if (!shop) throw new Error("Shop not found");

  const isOwner = shop.ownerId === user.id;
  let isStaff = false;
  if (!isOwner) {
    const membership = await prisma.staffMembership.findFirst({
      where: { shopId, userId: user.id },
      select: { id: true },
    });
    isStaff = !!membership;
  }
  if (!isOwner && !isStaff) {
    throw new Error("Not authorized to add bills for this shop");
  }

  // Parse expression: allow spaces, commas; treat + as separator
  const parts = expression
    .replace(/,/g, "+")
    .split("+")
    .map((s) => s.trim())
    .filter(Boolean);

  const amounts: number[] = [];
  for (const p of parts) {
    const n = Number(p);
    if (!isFinite(n) || n <= 0) {
      throw new Error(`Invalid amount: ${p}`);
    }
    amounts.push(n);
  }
  if (amounts.length === 0) throw new Error("No valid amounts provided");

  // Create bill + entries in a transaction
  await prisma.$transaction(async (tx: PrismaClient) => {
    const bill = await tx.bill.create({
      data: {
        shopId,
        staffId: user.id,
      },
      select: { id: true },
    });

    await tx.billEntry.createMany({
      data: amounts.map((amount) => ({ billId: bill.id, amount })),
    });
  });

  revalidatePath(`/shop/${shopId}`);
}
