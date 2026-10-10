import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createPinSchema } from '#modules/dashboard/dashboard.schemas.js';

describe('dashboardSchemas', () => {
  it('validates valid pin payload', () => {
    const payload = {
      title: 'Monthly Revenue by Category',
      chartType: 'bar',
      chartData: {
        chart_type: 'bar',
        title: 'Monthly Revenue',
        x_axis: 'month',
        y_axis: 'revenue',
        data: [{ month: '2024-01', revenue: 1000 }],
      },
      sqlQuery: 'SELECT month, revenue FROM dataset_sales;',
    };

    const parsed = createPinSchema.safeParse(payload);
    assert.equal(parsed.success, true);
  });

  it('rejects invalid chart type or missing fields', () => {
    const invalidPayload = {
      title: '',
      chartType: 'radar', // not in enum ['bar', 'line', 'pie']
      chartData: {},
    };

    const parsed = createPinSchema.safeParse(invalidPayload);
    assert.equal(parsed.success, false);
  });
});
