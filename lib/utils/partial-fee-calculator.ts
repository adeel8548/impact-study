/**
 * Partial Fee Calculator Utility
 * Handles fee calculation for students joining mid-month
 * 
 * Rules:
 * 1. Partial fee only applies to the JOINING month
 * 2. All subsequent months use full fee
 * 3. If student joins on 1st, full fee is applied
 * 4. Fee = (full_fee / total_days_in_month) * payable_days
 */

export interface PartialFeeCalculation {
  isPartial: boolean;
  fullFee: number;
  calculatedFee: number;
  totalDaysInMonth: number;
  payableDays: number;
  perDayFee: number;
  joiningDate: Date;
  month: number;
  year: number;
}

/**
 * Get total days in a specific month
 */
export function getDaysInMonth(year: number, month: number): number {
  // month is 1-indexed (1 = January, 12 = December)
  return new Date(year, month, 0).getDate();
}

/**
 * Calculate payable days for a student joining mid-month
 * @param joiningDate - The date student joined (format: YYYY-MM-DD or Date object)
 * @param month - Target month (1-12)
 * @param year - Target year
 * @returns Number of payable days (inclusive of joining date)
 */
export function calculatePayableDays(
  joiningDate: string | Date,
  month: number,
  year: number
): number {
  const joinDate = typeof joiningDate === 'string' 
    ? new Date(joiningDate) 
    : joiningDate;

  const joinMonth = joinDate.getMonth() + 1; // 0-indexed to 1-indexed
  const joinYear = joinDate.getFullYear();
  const joinDay = joinDate.getDate();

  // If not the joining month, return full month days
  if (joinMonth !== month || joinYear !== year) {
    return getDaysInMonth(year, month);
  }

  // Calculate remaining days (including joining day)
  const totalDays = getDaysInMonth(year, month);
  return totalDays - joinDay + 1;
}

/**
 * Check if partial fee should be applied for a given month
 * Partial fee only applies to the JOINING month, not any other month
 */
export function shouldApplyPartialFee(
  joiningDate: string | Date | null | undefined,
  targetMonth: number,
  targetYear: number
): boolean {
  if (!joiningDate) return false;

  const joinDate = typeof joiningDate === 'string' 
    ? new Date(joiningDate) 
    : joiningDate;

  const joinMonth = joinDate.getMonth() + 1;
  const joinYear = joinDate.getFullYear();
  const joinDay = joinDate.getDate();

  // Partial fee only if:
  // 1. This is the joining month
  // 2. Student joined after the 1st
  return (
    joinMonth === targetMonth &&
    joinYear === targetYear &&
    joinDay > 1
  );
}

/**
 * Calculate fee for a student for a specific month
 * Automatically determines if partial or full fee should be applied
 */
export function calculateFeeForMonth(
  fullFee: number,
  joiningDate: string | Date | null | undefined,
  targetMonth: number,
  targetYear: number
): PartialFeeCalculation {
  const totalDaysInMonth = getDaysInMonth(targetYear, targetMonth);
  
  // Default to full fee
  let result: PartialFeeCalculation = {
    isPartial: false,
    fullFee: fullFee,
    calculatedFee: fullFee,
    totalDaysInMonth,
    payableDays: totalDaysInMonth,
    perDayFee: fullFee / totalDaysInMonth,
    joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
    month: targetMonth,
    year: targetYear,
  };

  // Check if partial fee should be applied
  if (!shouldApplyPartialFee(joiningDate, targetMonth, targetYear)) {
    return result;
  }

  // Calculate partial fee
  const payableDays = calculatePayableDays(joiningDate!, targetMonth, targetYear);
  const perDayFee = fullFee / totalDaysInMonth;
  const calculatedFee = parseFloat((perDayFee * payableDays).toFixed(2));

  return {
    isPartial: true,
    fullFee: fullFee,
    calculatedFee: calculatedFee,
    totalDaysInMonth,
    payableDays,
    perDayFee: parseFloat(perDayFee.toFixed(4)),
    joiningDate: new Date(joiningDate!),
    month: targetMonth,
    year: targetYear,
  };
}

/**
 * Format partial fee breakdown for display
 */
export function formatPartialFeeBreakdown(calc: PartialFeeCalculation): string {
  if (!calc.isPartial) {
    return `Full Fee: Rs. ${calc.fullFee.toFixed(2)}`;
  }

  return [
    `Partial Fee Calculation:`,
    `Full Monthly Fee: Rs. ${calc.fullFee.toFixed(2)}`,
    `Total Days in Month: ${calc.totalDaysInMonth}`,
    `Per Day Fee: Rs. ${calc.perDayFee.toFixed(2)}`,
    `Payable Days: ${calc.payableDays} (joined on ${calc.joiningDate.getDate()})`,
    `Calculated Fee: Rs. ${calc.perDayFee.toFixed(2)} × ${calc.payableDays} = Rs. ${calc.calculatedFee.toFixed(2)}`,
  ].join('\n');
}

/**
 * Validate joining date
 */
export function validateJoiningDate(joiningDate: string | Date): {
  valid: boolean;
  error?: string;
} {
  try {
    const date = typeof joiningDate === 'string' 
      ? new Date(joiningDate) 
      : joiningDate;

    if (isNaN(date.getTime())) {
      return { valid: false, error: 'Invalid date format' };
    }

    // Check if date is not in the future
    if (date > new Date()) {
      return { valid: false, error: 'Joining date cannot be in the future' };
    }

    // Check if date is reasonable (not too far in the past)
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 10);
    
    if (date < fiveYearsAgo) {
      return { valid: false, error: 'Joining date seems too old' };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid date' };
  }
}

/**
 * Example usage:
 * 
 * const student = {
 *   fullFee: 5000,
 *   joiningDate: '2026-01-15'
 * };
 * 
 * // Calculate fee for January 2026 (joining month)
 * const janFee = calculateFeeForMonth(
 *   student.fullFee,
 *   student.joiningDate,
 *   1,  // January
 *   2026
 * );
 * console.log(janFee);
 * // Output: { isPartial: true, calculatedFee: 2741.94, payableDays: 17, ... }
 * 
 * // Calculate fee for February 2026 (next month - full fee)
 * const febFee = calculateFeeForMonth(
 *   student.fullFee,
 *   student.joiningDate,
 *   2,  // February
 *   2026
 * );
 * console.log(febFee);
 * // Output: { isPartial: false, calculatedFee: 5000, payableDays: 28, ... }
 */
