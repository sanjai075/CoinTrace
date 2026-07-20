"use client";

import { useCallback, useMemo, useState, FormEvent } from "react";

export default function TotalsClient({ shopId }: { shopId: string }) {
  const [date, setDate] = useState<string>("");
  const [dateLoading, setDateLoading] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const [dateTotal, setDateTotal] = useState<number | null>(null);
  const [showEntries, setShowEntries] = useState(false);
  const [entries, setEntries] = useState<number[] | null>(null);
  const [hasDateTotal, setHasDateTotal] = useState(false);

  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [rangeLoading, setRangeLoading] = useState(false);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [rangeTotal, setRangeTotal] = useState<number | null>(null);

  const endpoint = useMemo(() => `/api/shop/${shopId}/totals`, [shopId]);

  const fetchDateTotals = useCallback(async (includeEntries: boolean) => {
    setDateError(null);
    setDateLoading(true);
    if (!includeEntries) {
      setEntries(null);
    }
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "date", date, includeEntries }),
      });
      const data = await res.json();
      if (!data.ok) {
        setDateError(data.error || "Failed to fetch total");
        setDateTotal(null);
        setEntries(null);
        setHasDateTotal(false);
      } else {
        setDateTotal(data.total ?? 0);
        setEntries(includeEntries && Array.isArray(data.entries) ? data.entries : null);
        // Mark that we successfully fetched the total for this date
        setHasDateTotal(true);
      }
    } catch {
      setDateError("Network error");
      setDateTotal(null);
      setEntries(null);
      setHasDateTotal(false);
    } finally {
      setDateLoading(false);
    }
  }, [endpoint, date]);

  const submitDate = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!date) return;
    await fetchDateTotals(showEntries);
  }, [date, showEntries, fetchDateTotals]);

  const submitRange = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setRangeError(null);
    setRangeLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "range", from, to }),
      });
      const data = await res.json();
      if (!data.ok) {
        setRangeError(data.error || "Failed to fetch total");
        setRangeTotal(null);
      } else {
        setRangeTotal(data.total ?? 0);
      }
    } catch {
      setRangeError("Network error");
      setRangeTotal(null);
    } finally {
      setRangeLoading(false);
    }
  }, [endpoint, from, to]);

  return (
    <div className="space-y-6">
      <div className="p-4 bg-gray-900/50 rounded-lg">
        <form onSubmit={submitDate} className="space-y-3">
          <div className="flex items-end gap-2">
            <label className="flex-1">
              <span className="block text-sm text-gray-400 mb-1">Specific Date</span>
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  // Reset state when date changes
                  setHasDateTotal(false);
                  setDateTotal(null);
                  setEntries(null);
                  setDateError(null);
                }}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md"
              />
            </label>
            <button
              type="submit"
              className="px-3 py-2 rounded-md bg-indigo-600 text-white text-sm disabled:opacity-50"
              disabled={!date || dateLoading}
            >
              {dateLoading ? "Loading…" : "Get Total"}
            </button>
            <button
              type="button"
              onClick={() => { setDate(""); setDateTotal(null); setEntries(null); setDateError(null); setHasDateTotal(false); setShowEntries(false); }}
              className="px-3 py-2 rounded-md bg-gray-700 text-gray-200 text-sm"
            >
              Clear
            </button>
            {!showEntries && (
              <button
                type="button"
                onClick={async () => {
                  setShowEntries(true);
                  if (date && hasDateTotal) {
                    await fetchDateTotals(true);
                  }
                }}
                disabled={!date || !hasDateTotal || dateLoading}
                className="px-3 py-2 rounded-md bg-emerald-700 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                View entries
              </button>
            )}
            {showEntries && (
              <button
                type="button"
                onClick={() => { setShowEntries(false); setEntries(null); }}
                className="px-3 py-2 rounded-md bg-emerald-900 text-white text-sm"
              >
                Hide entries
              </button>
            )}
          </div>
        </form>
        {dateError && <p className="mt-3 text-red-400 text-sm">{dateError}</p>}
        {date && dateTotal !== null && (
          <p className="mt-3 text-gray-300">Total for {date}: <span className="font-semibold">₹{dateTotal.toFixed(2)}</span></p>
        )}
        {date && showEntries && entries && (
          <div className="mt-3 text-gray-300 text-sm space-y-1">
            {entries.length > 0 ? (
              <>
                <p className="break-words">{entries.join(" + ")} +</p>
                <p>
                  Entries: <span className="font-semibold">{entries.length}</span> · Total: <span className="font-semibold">₹{entries.reduce((a, b) => a + b, 0).toFixed(2)}</span>
                </p>
              </>
            ) : (
              <p>No entries for this date.</p>
            )}
          </div>
        )}
      </div>

      <div className="p-4 bg-gray-900/50 rounded-lg">
        <form onSubmit={submitRange} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label>
              <span className="block text-sm text-gray-400 mb-1">From</span>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md"
              />
            </label>
            <label>
              <span className="block text-sm text-gray-400 mb-1">To</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md"
              />
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-3 py-2 rounded-md bg-indigo-600 text-white text-sm disabled:opacity-50"
              disabled={!from || !to || rangeLoading}
            >
              {rangeLoading ? "Loading…" : "Get Total"}
            </button>
            <button
              type="button"
              onClick={() => { setFrom(""); setTo(""); setRangeError(null); setRangeTotal(null); }}
              className="px-3 py-2 rounded-md bg-gray-700 text-gray-200 text-sm"
            >
              Clear
            </button>
          </div>
        </form>
        {rangeError && <p className="mt-3 text-red-400 text-sm">{rangeError}</p>}
        {from && to && rangeTotal !== null && !rangeError && (
          <p className="mt-3 text-gray-300">Total for {from} to {to}: <span className="font-semibold">₹{rangeTotal.toFixed(2)}</span></p>
        )}
      </div>
    </div>
  );
}
