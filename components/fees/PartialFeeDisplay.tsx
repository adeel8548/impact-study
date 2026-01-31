/**
 * Partial Fee Display Component
 * Shows fee breakdown on vouchers when partial fee applies
 */

import React from 'react';

interface PartialFeeDisplayProps {
  isPartial: boolean;
  monthlyFee: number;
  fullFee?: number;
  totalDaysInMonth?: number;
  payableDays?: number;
  perDayFee?: number;
  joiningDay?: number;
  currency?: string;
}

export function PartialFeeDisplay({
  isPartial,
  monthlyFee,
  fullFee,
  totalDaysInMonth,
  payableDays,
  perDayFee,
  joiningDay,
  currency = 'Rs.',
}: PartialFeeDisplayProps) {
  if (!isPartial) {
    // Display normal fee
    return (
      <div className="fee-display">
        <div className="fee-row">
          <span className="fee-label">Monthly Fee:</span>
          <span className="fee-amount">
            {currency} {monthlyFee.toFixed(2)}
          </span>
        </div>
      </div>
    );
  }

  // Display partial fee breakdown
  return (
    <div className="partial-fee-display border-2 border-yellow-500 p-4 rounded-lg bg-yellow-50">
      <div className="text-center mb-3">
        <span className="inline-block px-3 py-1 bg-yellow-500 text-white text-sm font-semibold rounded">
          PARTIAL FEE (Joining Month)
        </span>
      </div>

      <div className="space-y-2 text-sm">
        {fullFee && (
          <div className="flex justify-between">
            <span className="text-gray-600">Full Monthly Fee:</span>
            <span className="font-semibold">
              {currency} {fullFee.toFixed(2)}
            </span>
          </div>
        )}

        {totalDaysInMonth && (
          <div className="flex justify-between">
            <span className="text-gray-600">Total Days in Month:</span>
            <span className="font-semibold">{totalDaysInMonth} days</span>
          </div>
        )}

        {joiningDay && (
          <div className="flex justify-between">
            <span className="text-gray-600">Joining Day:</span>
            <span className="font-semibold">{joiningDay}</span>
          </div>
        )}

        {payableDays && (
          <div className="flex justify-between">
            <span className="text-gray-600">Payable Days:</span>
            <span className="font-semibold">
              {payableDays} days
              {joiningDay && totalDaysInMonth && (
                <span className="text-xs text-gray-500 ml-1">
                  ({joiningDay}th - {totalDaysInMonth}th)
                </span>
              )}
            </span>
          </div>
        )}

        {perDayFee && (
          <div className="flex justify-between">
            <span className="text-gray-600">Per Day Fee:</span>
            <span className="font-semibold">
              {currency} {perDayFee.toFixed(2)}
            </span>
          </div>
        )}

        <div className="border-t pt-2 mt-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Calculation:</span>
            <span className="text-xs text-gray-500">
              {perDayFee && payableDays && (
                <>{currency} {perDayFee.toFixed(2)} × {payableDays} days</>
              )}
            </span>
          </div>
        </div>

        <div className="border-t pt-2 mt-2">
          <div className="flex justify-between items-center font-bold text-base">
            <span>Monthly Fee:</span>
            <span className="text-green-700">
              {currency} {monthlyFee.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 text-xs text-gray-500 text-center italic">
        Note: Full fee will be charged from next month onward
      </div>
    </div>
  );
}

/**
 * Example Usage in Fee Voucher Component:
 * 
 * <PartialFeeDisplay
 *   isPartial={voucher.isPartial}
 *   monthlyFee={voucher.monthlyFee}
 *   fullFee={5000}
 *   totalDaysInMonth={voucher.totalDaysInMonth}
 *   payableDays={voucher.payableDays}
 *   perDayFee={voucher.perDayFee}
 *   joiningDay={15}
 *   currency="Rs."
 * />
 */

// Alternative: Text-based display for print vouchers
export function PartialFeeTextDisplay({
  isPartial,
  monthlyFee,
  fullFee,
  totalDaysInMonth,
  payableDays,
  perDayFee,
  joiningDay,
  currency = 'Rs.',
}: PartialFeeDisplayProps) {
  if (!isPartial) {
    return `Monthly Fee: ${currency} ${monthlyFee.toFixed(2)}`;
  }

  const lines = [
    '─────────────────────────────────────────',
    ' PARTIAL FEE CALCULATION (Joining Month)',
    '─────────────────────────────────────────',
  ];

  if (fullFee) {
    lines.push(`Full Monthly Fee:        ${currency} ${fullFee.toFixed(2)}`);
  }

  if (totalDaysInMonth) {
    lines.push(`Total Days in Month:     ${totalDaysInMonth} days`);
  }

  if (joiningDay) {
    lines.push(`Joining Day:             ${joiningDay}th`);
  }

  if (payableDays) {
    const range = joiningDay && totalDaysInMonth 
      ? ` (${joiningDay}th-${totalDaysInMonth}th)`
      : '';
    lines.push(`Payable Days:            ${payableDays} days${range}`);
  }

  if (perDayFee) {
    lines.push('');
    lines.push(`Per Day Fee:             ${currency} ${perDayFee.toFixed(2)}`);
    
    if (payableDays) {
      lines.push(`Calculation:             ${perDayFee.toFixed(2)} × ${payableDays} days`);
    }
  }

  lines.push('');
  lines.push(`Monthly Fee:             ${currency} ${monthlyFee.toFixed(2)}`);
  lines.push('─────────────────────────────────────────');
  lines.push('Note: Full fee applies from next month');

  return lines.join('\n');
}

/**
 * Example text output:
 * 
 * ─────────────────────────────────────────
 *  PARTIAL FEE CALCULATION (Joining Month)
 * ─────────────────────────────────────────
 * Full Monthly Fee:        Rs. 5000.00
 * Total Days in Month:     31 days
 * Joining Day:             15th
 * Payable Days:            17 days (15th-31st)
 * 
 * Per Day Fee:             Rs. 161.29
 * Calculation:             161.29 × 17 days
 * 
 * Monthly Fee:             Rs. 2741.93
 * ─────────────────────────────────────────
 * Note: Full fee applies from next month
 */
