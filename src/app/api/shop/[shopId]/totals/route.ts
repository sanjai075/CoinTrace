import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stackServerApp } from "@/stack/server";


// Timezone helpers (IST: Asia/Kolkata, UTC+5:30)
const IST_OFFSET_MINUTES = 330; // 5.5 hours
const toIST = (dUTC: Date) => new Date(dUTC.getTime() + IST_OFFSET_MINUTES * 60_000);
const fromIST = (dIST: Date) => new Date(dIST.getTime() - IST_OFFSET_MINUTES * 60_000);
const startOfDayISTUTC = (dUTC: Date) => {
  const ist = toIST(dUTC);
  ist.setHours(0, 0, 0, 0);
  return fromIST(ist);
};
const nextDayUTCFromISTStart = (startUTC: Date) => new Date(startUTC.getTime() + 86_400_000);
const parseISODateToISTStartUTC = (s?: string) => {
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  const utcMs = Date.UTC(y, m - 1, d, -5, -30, 0);
  return new Date(utcMs);
};

type DatePayload = { kind: "date"; date: string; includeEntries?: boolean };
type RangePayload = { kind: "range"; from: string; to: string };
type Payload = DatePayload | RangePayload;

export async function POST(req: NextRequest, context: {
  params: Promise<{ shopId: string }>;
}) {
  try {
    const user = await stackServerApp.getUser({ or: "throw" });
    const { shopId } = await context.params;
    if (!shopId) {
      return NextResponse.json({ ok: false, error: "Missing shopId" }, { status: 400 });
    }

    const shop = await prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) {
      return NextResponse.json({ ok: false, error: "Shop not found" }, { status: 404 });
    }
    if (shop.ownerId !== user.id) {
      return NextResponse.json({ ok: false, error: "Not authorized" }, { status: 403 });
    }

    const body = (await req.json()) as Payload | null;
    if (!body || !("kind" in body)) {
      return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
    }

    if (body.kind === "date") {
      const start = parseISODateToISTStartUTC(body.date);
      if (!start) {
        return NextResponse.json({ ok: false, error: "Invalid date format (expected YYYY-MM-DD)" }, { status: 400 });
      }
      const endExcl = nextDayUTCFromISTStart(start);
      const agg = await prisma.billEntry.aggregate({
        _sum: { amount: true },
        where: { bill: { is: { shopId } }, createdAt: { gte: start, lt: endExcl } },
      });
      let entries: number[] | undefined;
      if (body.includeEntries) {
        const list = await prisma.billEntry.findMany({
          where: { bill: { is: { shopId } }, createdAt: { gte: start, lt: endExcl } },
          select: { amount: true },
          orderBy: { createdAt: "asc" },
        });
        entries = list.map((e: { amount: number }) => e.amount);
      }
      return NextResponse.json({ ok: true, total: agg._sum.amount ?? 0, entries });
    }

    if (body.kind === "range") {
      const from = parseISODateToISTStartUTC(body.from);
      const to = parseISODateToISTStartUTC(body.to);
      if (!from || !to) {
        return NextResponse.json({ ok: false, error: "Provide both from and to in YYYY-MM-DD format" }, { status: 400 });
      }
      if (from > to) {
        return NextResponse.json({ ok: false, error: "From must be on or before To" }, { status: 400 });
      }
      const endExcl = nextDayUTCFromISTStart(to);
      const agg = await prisma.billEntry.aggregate({
        _sum: { amount: true },
        where: { bill: { is: { shopId } }, createdAt: { gte: from, lt: endExcl } },
      });
      return NextResponse.json({ ok: true, total: agg._sum.amount ?? 0 });
    }

    return NextResponse.json({ ok: false, error: "Unknown kind" }, { status: 400 });
  } catch (err) {
    console.error("/api/shop/[shopId]/totals error", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
