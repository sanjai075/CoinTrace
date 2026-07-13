'use server';

import { stackServerApp } from '@/stack/server';
import { prisma } from '@/lib/prisma';
import { SaleType, CustomerTxType, SupplierTxType, ExpenseCategory } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

// Helper to hash 4-digit pin using standard Node crypto
function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(pin).digest('hex');
}

// ----------------------------------------------------
// Worker Actions
// ----------------------------------------------------

export async function addWorker(formData: FormData) {
  const user = await stackServerApp.getUser({ or: 'throw' });
  const shopId = formData.get('shopId') as string;
  const name = formData.get('name') as string;
  const pin = formData.get('pin') as string;

  if (!shopId || !name || !pin) {
    throw new Error('All fields are required.');
  }

  if (pin.length !== 4 || isNaN(Number(pin))) {
    throw new Error('PIN must be a 4-digit number.');
  }

  // Verify shop owner
  const shop = await prisma.shop.findFirst({
    where: { id: shopId, ownerId: user.id },
  });
  if (!shop) throw new Error('Not authorized.');

  await prisma.worker.create({
    data: {
      name,
      pin: hashPin(pin),
      shopId,
    },
  });

  revalidatePath(`/shop/${shopId}`);
}

export async function verifyWorkerPin(workerId: string, pin: string) {
  const worker = await prisma.worker.findUnique({
    where: { id: workerId },
  });

  if (!worker) {
    return { success: false, error: 'Worker not found' };
  }

  const hashed = hashPin(pin);
  if (worker.pin === hashed) {
    return { success: true, worker: { id: worker.id, name: worker.name } };
  }

  return { success: false, error: 'Invalid PIN' };
}

// ----------------------------------------------------
// Product Actions
// ----------------------------------------------------

export async function addProductToCatalog(formData: FormData) {
  const user = await stackServerApp.getUser({ or: 'throw' });
  const shopId = formData.get('shopId') as string;
  const name = formData.get('name') as string;
  const sellingPrice = Number(formData.get('sellingPrice'));
  const barcode = (formData.get('barcode') as string) || null;
  const stockInput = formData.get('stock') as string;
  const stock = stockInput && stockInput.trim() !== '' ? Math.floor(Number(stockInput)) : null;

  if (!shopId || !name || isNaN(sellingPrice)) {
    return { error: 'Invalid product name or price.' };
  }

  if (stock !== null && isNaN(stock)) {
    return { error: 'Invalid stock quantity. Must be a valid integer.' };
  }

  // Verify shop relationship
  const isOwner = await prisma.shop.findFirst({ where: { id: shopId, ownerId: user.id } });
  const isStaff = await prisma.staffMembership.findFirst({ where: { shopId, userId: user.id } });
  if (!isOwner && !isStaff) return { error: 'Not authorized.' };

  // Enforce barcode uniqueness per shop
  if (barcode) {
    const existing = await prisma.product.findFirst({
      where: { shopId, barcode },
    });
    if (existing) {
      return { error: `A product with barcode "${barcode}" already exists in this shop (${existing.name}).` };
    }
  }

  // Enforce product name uniqueness per shop (case-insensitive, active products only)
  const existingName = await prisma.product.findFirst({
    where: {
      shopId,
      archived: false,
      name: {
        equals: name,
        mode: 'insensitive',
      },
    },
  });
  if (existingName) {
    return { error: `A product named "${name}" already exists in your active catalog.` };
  }

  await prisma.product.create({
    data: {
      name,
      sellingPrice,
      barcode,
      stock,
      shopId,
    },
  });

  revalidatePath(`/shop/${shopId}`);
  return { success: true };
}

// ----------------------------------------------------
// Khata: Customer Actions
// ----------------------------------------------------

export async function addCustomer(formData: FormData) {
  const user = await stackServerApp.getUser({ or: 'throw' });
  const shopId = formData.get('shopId') as string;
  const name = formData.get('name') as string;
  const phone = formData.get('phone') as string;

  if (!shopId || !name) throw new Error('Customer name is required.');

  const isOwner = await prisma.shop.findFirst({ where: { id: shopId, ownerId: user.id } });
  const isStaff = await prisma.staffMembership.findFirst({ where: { shopId, userId: user.id } });
  if (!isOwner && !isStaff) throw new Error('Not authorized.');

  await prisma.customer.create({
    data: {
      name,
      phone: phone || null,
      shopId,
    },
  });

  revalidatePath(`/shop/${shopId}`);
}

export async function recordCustomerPayment(formData: FormData) {
  const user = await stackServerApp.getUser({ or: 'throw' });
  const shopId = formData.get('shopId') as string;
  const customerId = formData.get('customerId') as string;
  const amount = Number(formData.get('amount'));

  if (!shopId || !customerId || isNaN(amount) || amount <= 0) {
    throw new Error('Invalid payment parameters.');
  }

  const isOwner = await prisma.shop.findFirst({ where: { id: shopId, ownerId: user.id } });
  const isStaff = await prisma.staffMembership.findFirst({ where: { shopId, userId: user.id } });
  if (!isOwner && !isStaff) throw new Error('Not authorized.');

  await prisma.$transaction(async (tx) => {
    // 1. Subtract from running balance
    await tx.customer.update({
      where: { id: customerId },
      data: {
        runningBalance: { decrement: amount },
      },
    });

    // 2. Create customer transaction ledger entry
    await tx.customerTx.create({
      data: {
        customerId,
        type: CustomerTxType.PAYMENT_RCVD,
        amount,
      },
    });
  });

  revalidatePath(`/shop/${shopId}`);
}

// ----------------------------------------------------
// Khata: Supplier Actions
// ----------------------------------------------------

export async function addSupplier(formData: FormData) {
  const user = await stackServerApp.getUser({ or: 'throw' });
  const shopId = formData.get('shopId') as string;
  const name = formData.get('name') as string;
  const phone = formData.get('phone') as string;

  if (!shopId || !name) throw new Error('Supplier name is required.');

  const isOwner = await prisma.shop.findFirst({ where: { id: shopId, ownerId: user.id } });
  const isStaff = await prisma.staffMembership.findFirst({ where: { shopId, userId: user.id } });
  if (!isOwner && !isStaff) throw new Error('Not authorized.');

  await prisma.supplier.create({
    data: {
      name,
      phone: phone || null,
      shopId,
    },
  });

  revalidatePath(`/shop/${shopId}`);
}

export async function recordSupplierTx(formData: FormData) {
  const user = await stackServerApp.getUser({ or: 'throw' });
  const shopId = formData.get('shopId') as string;
  const supplierId = formData.get('supplierId') as string;
  const amount = Number(formData.get('amount'));
  const type = formData.get('type') as SupplierTxType; // CREDIT_PURCHASE or PAYMENT_PAID

  if (!shopId || !supplierId || isNaN(amount) || amount <= 0 || !type) {
    throw new Error('Invalid transaction parameters.');
  }

  const isOwner = await prisma.shop.findFirst({ where: { id: shopId, ownerId: user.id } });
  const isStaff = await prisma.staffMembership.findFirst({ where: { shopId, userId: user.id } });
  if (!isOwner && !isStaff) throw new Error('Not authorized.');

  await prisma.$transaction(async (tx) => {
    // 1. Update running balance
    const incrementAmount = type === SupplierTxType.CREDIT_PURCHASE ? amount : -amount;
    await tx.supplier.update({
      where: { id: supplierId },
      data: {
        runningBalance: { increment: incrementAmount },
      },
    });

    // 2. Create entry in supplier transactions
    await tx.supplierTx.create({
      data: {
        supplierId,
        type,
        amount,
      },
    });
  });

  revalidatePath(`/shop/${shopId}`);
}

// ----------------------------------------------------
// Expense Actions
// ----------------------------------------------------

export async function addExpense(formData: FormData) {
  const user = await stackServerApp.getUser({ or: 'throw' });
  const shopId = formData.get('shopId') as string;
  const category = formData.get('category') as ExpenseCategory;
  const amount = Number(formData.get('amount'));
  const notes = formData.get('notes') as string;

  if (!shopId || !category || isNaN(amount) || amount <= 0) {
    throw new Error('Invalid expense parameters.');
  }

  const isOwner = await prisma.shop.findFirst({ where: { id: shopId, ownerId: user.id } });
  const isStaff = await prisma.staffMembership.findFirst({ where: { shopId, userId: user.id } });
  if (!isOwner && !isStaff) throw new Error('Not authorized.');

  await prisma.expense.create({
    data: {
      category,
      amount,
      notes: notes || null,
      shopId,
    },
  });

  revalidatePath(`/shop/${shopId}`);
}

// ----------------------------------------------------
// Sale Actions (Tactile Grid Checkout)
// ----------------------------------------------------

export async function recordSale(saleData: {
  shopId: string;
  type: SaleType;
  customerId?: string | null;
  workerId?: string | null;
  workerName?: string | null;
  items: Array<{ productId: string; quantity: number; price: number }>;
}) {
  const user = await stackServerApp.getUser({ or: 'throw' });
  const { shopId, type, customerId, workerId, workerName, items } = saleData;

  if (!shopId || !type || !items || items.length === 0) {
    throw new Error('Invalid sale transaction data.');
  }

  const isOwner = await prisma.shop.findFirst({ where: { id: shopId, ownerId: user.id } });
  const isStaff = await prisma.staffMembership.findFirst({ where: { shopId, userId: user.id } });
  if (!isOwner && !isStaff) throw new Error('Not authorized.');

  const total = items.reduce((acc, item) => acc + item.quantity * item.price, 0);

  // Validate that the worker exists in the database
  let verifiedWorkerId: string | null = null;
  if (workerId) {
    const workerExists = await prisma.worker.findUnique({ where: { id: workerId } });
    if (workerExists) {
      verifiedWorkerId = workerId;
    }
  }

  // Validate that the customer exists in the database
  let verifiedCustomerId: string | null = null;
  if (customerId) {
    const customerExists = await prisma.customer.findUnique({ where: { id: customerId } });
    if (customerExists) {
      verifiedCustomerId = customerId;
    }
  }

  const sale = await prisma.$transaction(async (tx) => {
    // 1. Create main Sale row
    const saleRow = await tx.sale.create({
      data: {
        shopId,
        type,
        customerId: verifiedCustomerId,
        workerId: verifiedWorkerId,
        staffId: user.id, // Records the active email account executing/overseeing the action
        workerName: workerName || user.displayName || user.primaryEmail || 'Owner',
        total,
      },
    });

    // 2. Create SaleItem rows and decrement stock if tracked
    for (const item of items) {
      await tx.saleItem.create({
        data: {
          saleId: saleRow.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        },
      });

      const p = await tx.product.findUnique({
        where: { id: item.productId },
        select: { stock: true },
      });
      if (p && p.stock !== null) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { decrement: Math.floor(item.quantity) },
          },
        });
      }
    }

    // 3. If credit sale, update Customer Balance and write ledger
    if (type === SaleType.CREDIT && customerId) {
      await tx.customer.update({
        where: { id: customerId },
        data: {
          runningBalance: { increment: total },
        },
      });

      await tx.customerTx.create({
        data: {
          customerId,
          type: CustomerTxType.CREDIT_SALE,
          amount: total,
          saleId: saleRow.id,
        },
      });
    }

    return saleRow;
  });

  revalidatePath(`/shop/${shopId}`);
  return { success: true, saleId: sale.id };
}

export async function updateProductStock(formData: FormData) {
  const user = await stackServerApp.getUser({ or: 'throw' });
  const shopId = formData.get('shopId') as string;
  const productId = formData.get('productId') as string;
  const stockInput = formData.get('stock') as string;

  if (!shopId || !productId) {
    throw new Error('Missing shopId or productId');
  }

  const stock = stockInput && stockInput.trim() !== '' ? Math.floor(Number(stockInput)) : null;

  if (stock !== null && isNaN(stock)) {
    throw new Error('Invalid stock quantity. Must be an integer.');
  }

  // Verify shop authorization (owner or staff)
  const isOwner = await prisma.shop.findFirst({ where: { id: shopId, ownerId: user.id } });
  const isStaff = await prisma.staffMembership.findFirst({ where: { shopId, userId: user.id } });
  if (!isOwner && !isStaff) throw new Error('Not authorized.');

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { stock: true },
  });
  if (!product) throw new Error('Product not found.');

  const oldStock = product.stock;

  if (oldStock !== stock) {
    const diff = (stock ?? 0) - (oldStock ?? 0);
    await prisma.stockAdjustmentLog.create({
      data: {
        productId,
        shopId,
        staffId: user.id,
        staffName: user.primaryEmail || user.displayName || 'Staff',
        oldStock,
        newStock: stock,
        change: diff,
      },
    });

    await prisma.product.update({
      where: { id: productId },
      data: { stock },
    });
  }

  revalidatePath(`/shop/${shopId}/products`);
}

export async function deleteProduct(formData: FormData) {
  const user = await stackServerApp.getUser({ or: 'throw' });
  const shopId = formData.get('shopId') as string;
  const productId = formData.get('productId') as string;

  if (!shopId || !productId) {
    return { error: 'Missing parameters.' };
  }

  // Verify shop authorization (owner or staff)
  const isOwner = await prisma.shop.findFirst({ where: { id: shopId, ownerId: user.id } });
  const isStaff = await prisma.staffMembership.findFirst({ where: { shopId, userId: user.id } });
  if (!isOwner && !isStaff) return { error: 'Not authorized.' };

  // Check sales history count
  const salesCount = await prisma.saleItem.count({
    where: { productId },
  });

  if (salesCount > 0) {
    // Has sales history, archive it
    await prisma.product.update({
      where: { id: productId },
      data: { archived: true },
    });
  } else {
    // No sales history, delete permanently
    await prisma.product.delete({
      where: { id: productId },
    });
  }

  revalidatePath(`/shop/${shopId}/products`);
  return { success: true };
}

export async function unarchiveProduct(formData: FormData) {
  const user = await stackServerApp.getUser({ or: 'throw' });
  const shopId = formData.get('shopId') as string;
  const productId = formData.get('productId') as string;

  if (!shopId || !productId) {
    return { error: 'Missing parameters.' };
  }

  // Verify shop authorization (owner or staff)
  const isOwner = await prisma.shop.findFirst({ where: { id: shopId, ownerId: user.id } });
  const isStaff = await prisma.staffMembership.findFirst({ where: { shopId, userId: user.id } });
  if (!isOwner && !isStaff) return { error: 'Not authorized.' };

  // Set archived to false
  await prisma.product.update({
    where: { id: productId },
    data: { archived: false },
  });

  revalidatePath(`/shop/${shopId}/products`);
  return { success: true };
}
