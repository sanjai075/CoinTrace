'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface ExpenseBreakdownProps {
  totalExpenses: number;
  generalExpenses: number;
  supplierPayments: number;
  labelTotalExpenses: string;
}

export default function ExpenseBreakdown({
  totalExpenses,
  generalExpenses,
  supplierPayments,
  labelTotalExpenses,
}: ExpenseBreakdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-1.5 border-t border-gray-800/60 pt-2">
      {/* Clickable Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center py-1 group text-left focus:outline-none cursor-pointer"
      >
        <span className="text-sm text-gray-400 flex items-center gap-1 group-hover:text-gray-200 transition-colors">
          {labelTotalExpenses}
          <ChevronDown
            className={`h-4 w-4 text-gray-500 transition-transform duration-300 ${
              isOpen ? 'rotate-180 text-gray-300' : ''
            }`}
          />
        </span>
        <span className="text-sm font-bold text-rose-400">₹{totalExpenses.toFixed(2)}</span>
      </button>

      {/* Sliding Breakdown */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen ? 'max-h-20 opacity-100 mt-1' : 'max-h-0 opacity-0 pointer-events-none'
        }`}
      >
        <div className="space-y-2 pb-1.5 pl-4 border-l border-gray-800">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400">General Expenses</span>
            <span className="text-gray-200 font-medium">₹{generalExpenses.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400">Supplier Payments Paid</span>
            <span className="text-gray-200 font-medium">₹{supplierPayments.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
