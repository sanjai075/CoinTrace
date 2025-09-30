"use client";

import { useMemo, useState, useTransition } from "react";
import { createBill } from "@/app/actions/bill";

function parseExpression(expr: string): number[] {
  const parts = expr
    .replace(/,/g, "+")
    .split("+")
    .map((s) => s.trim())
    .filter(Boolean);
  const nums: number[] = [];
  for (const p of parts) {
    const n = Number(p);
    if (!isFinite(n) || n <= 0) continue;
    nums.push(n);
  }
  return nums;
}

export default function AddBillClient({ shopId }: { shopId: string }) {
  const [expr, setExpr] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const numbers = useMemo(() => parseExpression(expr), [expr]);
  const total = useMemo(() => numbers.reduce((a, b) => a + b, 0), [numbers]);

  async function onSubmit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      try {
        await createBill(formData);
        setExpr("");
        setMessage("Bill saved");
      } catch (e: any) {
        setMessage(e?.message || "Failed to save bill");
      }
    });
  }

  return (
    <div className="space-y-4">
      <form action={onSubmit} className="space-y-3">
        <input type="hidden" name="shopId" value={shopId} />
        <label className="block">
          <span className="block text-sm text-gray-400 mb-1">Enter amounts (e.g., 70+69+56)</span>
          <input
            name="expression"
            value={expr}
            onChange={(e) => setExpr(e.target.value)}
            placeholder="70+69+56 or 70,69,56"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md"
          />
        </label>
        {/* Preview removed per request: staff should not see computed total before submit */}
        <button
          type="submit"
          disabled={isPending || numbers.length === 0}
          className="px-4 py-2 rounded-md bg-emerald-600 disabled:opacity-50 text-white"
        >
          {isPending ? "Saving…" : "Add Bill"}
        </button>
      </form>
      {message && <p className="text-sm text-gray-300">{message}</p>}
    </div>
  );
}
