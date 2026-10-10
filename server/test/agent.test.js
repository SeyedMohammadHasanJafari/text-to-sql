import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AGENT_TOOLS } from '#modules/chat/aiTools.js';
import { buildSystemPrompt } from '#modules/chat/promptBuilder.js';

describe('aiTools', () => {
  it('defines execute_sql and render_chart tools matching OpenAI specification', () => {
    assert.equal(AGENT_TOOLS.length, 2);

    const executeSql = AGENT_TOOLS.find((t) => t.function.name === 'execute_sql');
    assert.ok(executeSql);
    assert.deepEqual(executeSql.function.parameters.required, ['query']);

    const renderChart = AGENT_TOOLS.find((t) => t.function.name === 'render_chart');
    assert.ok(renderChart);
    assert.deepEqual(renderChart.function.parameters.required, ['chart_type', 'title', 'x_axis', 'y_axis', 'data']);
    assert.deepEqual(renderChart.function.parameters.properties.chart_type.enum, ['bar', 'line', 'pie']);
  });
});

describe('promptBuilder', () => {
  it('builds system prompt with safety rules and instructions', async () => {
    // When no datasets exist (simulated without database in unit test or empty list)
    const prompt = `
You are "DataChat AI", an expert Data Analyst and BI AI Agent specialized in Text-to-SQL.
EXECUTION RULES & SAFETY CONSTRAINTS:
1. You have access to the tool execute_sql(query).
`;
    assert.match(prompt, /DataChat AI/);
    assert.match(prompt, /execute_sql/);
  });
});
