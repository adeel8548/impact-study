/**
 * Test Suite for Partial Fee Calculator
 * Run with: npm test or node --test
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import {
  getDaysInMonth,
  calculatePayableDays,
  shouldApplyPartialFee,
  calculateFeeForMonth,
  validateJoiningDate,
} from "../lib/utils/partial-fee-calculator";

describe("Partial Fee Calculator Tests", () => {
  describe("getDaysInMonth", () => {
    it("should return 31 days for January", () => {
      assert.strictEqual(getDaysInMonth(2026, 1), 31);
    });

    it("should return 28 days for February (non-leap year)", () => {
      assert.strictEqual(getDaysInMonth(2026, 2), 28);
    });

    it("should return 29 days for February (leap year)", () => {
      assert.strictEqual(getDaysInMonth(2024, 2), 29);
    });

    it("should return 30 days for April", () => {
      assert.strictEqual(getDaysInMonth(2026, 4), 30);
    });
  });

  describe("calculatePayableDays", () => {
    it("should calculate correct payable days for mid-month joining", () => {
      const days = calculatePayableDays("2026-01-15", 1, 2026);
      assert.strictEqual(days, 17); // 31 - 15 + 1 = 17
    });

    it("should return full month days if joining date is in different month", () => {
      const days = calculatePayableDays("2026-01-15", 2, 2026);
      assert.strictEqual(days, 28); // Full February
    });

    it("should return 1 day for joining on last day", () => {
      const days = calculatePayableDays("2026-01-31", 1, 2026);
      assert.strictEqual(days, 1);
    });

    it("should return full month for joining on 1st", () => {
      const days = calculatePayableDays("2026-01-01", 1, 2026);
      assert.strictEqual(days, 31);
    });
  });

  describe("shouldApplyPartialFee", () => {
    it("should return true for mid-month joining", () => {
      const result = shouldApplyPartialFee("2026-01-15", 1, 2026);
      assert.strictEqual(result, true);
    });

    it("should return false for joining on 1st", () => {
      const result = shouldApplyPartialFee("2026-01-01", 1, 2026);
      assert.strictEqual(result, false);
    });

    it("should return false for different month", () => {
      const result = shouldApplyPartialFee("2026-01-15", 2, 2026);
      assert.strictEqual(result, false);
    });

    it("should return false for null joining date", () => {
      const result = shouldApplyPartialFee(null, 1, 2026);
      assert.strictEqual(result, false);
    });

    it("should return false for undefined joining date", () => {
      const result = shouldApplyPartialFee(undefined, 1, 2026);
      assert.strictEqual(result, false);
    });
  });

  describe("calculateFeeForMonth", () => {
    it("should calculate partial fee for joining month", () => {
      const result = calculateFeeForMonth(5000, "2026-01-15", 1, 2026);

      assert.strictEqual(result.isPartial, true);
      assert.strictEqual(result.fullFee, 5000);
      assert.strictEqual(result.totalDaysInMonth, 31);
      assert.strictEqual(result.payableDays, 17);
      assert.strictEqual(result.perDayFee, 161.29);
      assert.strictEqual(result.calculatedFee, 2741.93);
    });

    it("should calculate full fee for next month after joining", () => {
      const result = calculateFeeForMonth(5000, "2026-01-15", 2, 2026);

      assert.strictEqual(result.isPartial, false);
      assert.strictEqual(result.calculatedFee, 5000);
      assert.strictEqual(result.payableDays, 28); // February
    });

    it("should calculate full fee for joining on 1st", () => {
      const result = calculateFeeForMonth(5000, "2026-01-01", 1, 2026);

      assert.strictEqual(result.isPartial, false);
      assert.strictEqual(result.calculatedFee, 5000);
    });

    it("should handle February correctly", () => {
      const result = calculateFeeForMonth(5000, "2026-02-20", 2, 2026);

      assert.strictEqual(result.isPartial, true);
      assert.strictEqual(result.totalDaysInMonth, 28);
      assert.strictEqual(result.payableDays, 9); // 28 - 20 + 1
      assert.strictEqual(result.perDayFee, 178.57);
      assert.strictEqual(result.calculatedFee, 1607.13);
    });

    it("should handle leap year February", () => {
      const result = calculateFeeForMonth(5000, "2024-02-20", 2, 2024);

      assert.strictEqual(result.isPartial, true);
      assert.strictEqual(result.totalDaysInMonth, 29);
      assert.strictEqual(result.payableDays, 10); // 29 - 20 + 1
    });

    it("should handle null joining date (default to full fee)", () => {
      const result = calculateFeeForMonth(5000, null, 1, 2026);

      assert.strictEqual(result.isPartial, false);
      assert.strictEqual(result.calculatedFee, 5000);
    });

    it("should calculate correct fee for joining on last day", () => {
      const result = calculateFeeForMonth(5000, "2026-01-31", 1, 2026);

      assert.strictEqual(result.isPartial, true);
      assert.strictEqual(result.payableDays, 1);
      assert.strictEqual(result.calculatedFee, 161.29); // One day fee
    });
  });

  describe("validateJoiningDate", () => {
    it("should validate correct date", () => {
      const result = validateJoiningDate("2026-01-15");
      assert.strictEqual(result.valid, true);
    });

    it("should reject invalid date format", () => {
      const result = validateJoiningDate("invalid-date");
      assert.strictEqual(result.valid, false);
    });

    it("should reject future date", () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const result = validateJoiningDate(futureDate);
      assert.strictEqual(result.valid, false);
    });

    it("should accept recent past date", () => {
      const pastDate = new Date();
      pastDate.setMonth(pastDate.getMonth() - 3);
      const result = validateJoiningDate(pastDate);
      assert.strictEqual(result.valid, true);
    });
  });

  describe("Real-world scenarios", () => {
    it("Scenario 1: Student joins mid-January, check Jan + Feb fees", () => {
      const fullFee = 5000;
      const joiningDate = "2026-01-15";

      // January (joining month)
      const janFee = calculateFeeForMonth(fullFee, joiningDate, 1, 2026);
      assert.strictEqual(janFee.isPartial, true);
      assert.strictEqual(janFee.calculatedFee, 2741.93);

      // February (next month - full fee)
      const febFee = calculateFeeForMonth(fullFee, joiningDate, 2, 2026);
      assert.strictEqual(febFee.isPartial, false);
      assert.strictEqual(febFee.calculatedFee, 5000);

      // March (still full fee)
      const marFee = calculateFeeForMonth(fullFee, joiningDate, 3, 2026);
      assert.strictEqual(marFee.isPartial, false);
      assert.strictEqual(marFee.calculatedFee, 5000);
    });

    it("Scenario 2: Student joins on Feb 28 (last day)", () => {
      const result = calculateFeeForMonth(5000, "2026-02-28", 2, 2026);

      assert.strictEqual(result.isPartial, true);
      assert.strictEqual(result.payableDays, 1);
      assert.strictEqual(result.calculatedFee, 178.57); // One day only
    });

    it("Scenario 3: Different fee amounts", () => {
      // High fee
      const highFee = calculateFeeForMonth(10000, "2026-01-15", 1, 2026);
      assert.strictEqual(highFee.calculatedFee, 5483.87);

      // Low fee
      const lowFee = calculateFeeForMonth(2000, "2026-01-15", 1, 2026);
      assert.strictEqual(lowFee.calculatedFee, 1096.77);
    });

    it("Scenario 4: Joining in December (year-end)", () => {
      const decFee = calculateFeeForMonth(5000, "2026-12-20", 12, 2026);

      assert.strictEqual(decFee.isPartial, true);
      assert.strictEqual(decFee.totalDaysInMonth, 31);
      assert.strictEqual(decFee.payableDays, 12); // 31 - 20 + 1

      // Next year January - full fee
      const janNextYear = calculateFeeForMonth(5000, "2026-12-20", 1, 2027);
      assert.strictEqual(janNextYear.isPartial, false);
      assert.strictEqual(janNextYear.calculatedFee, 5000);
    });
  });
});

/**
 * How to run these tests:
 *
 * Option 1: Node.js built-in test runner
 * node --test __tests__/partial-fee-calculator.test.ts
 *
 * Option 2: Jest (if installed)
 * npm test
 *
 * Option 3: Manual verification
 * Copy individual test cases to a TypeScript playground
 */

console.log("✅ All test cases defined. Run with: node --test");
