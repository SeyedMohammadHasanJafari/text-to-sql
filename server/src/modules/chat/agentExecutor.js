import { config } from '#config/env.js';
import { logger } from '#lib/logger.js';
import { executeSandboxedQuery } from '#sandbox/sandboxExecutor.js';
import { adminPool } from '#db/pools.js';
import { listUserDatasets } from '#modules/datasets/dataset.repository.js';
import { AGENT_TOOLS } from './aiTools.js';
import { buildSystemPrompt } from './promptBuilder.js';

const MAX_TOOL_STEPS = 5;

function sanitizeContent(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .replace(/!\[.*?\]\(data:image\/[^;]+;base64,[^)]*\)/gi, '')
    .replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/gi, '')
    .trim();
}

/**
 * Executes multi-turn tool calling with Aval AI / OpenAI compatible endpoints.
 *
 * @param {{
 *   userId: string,
 *   conversationHistory: Array<{ role: 'user' | 'assistant', content: string }>,
 *   userPrompt: string
 * }} params
 * @returns {Promise<{ content: string, sqlQuery: string | null, chartData: object | null }>}
 */
export async function runAgentConversation({ userId, conversationHistory, userPrompt, signal = null }) {
  const systemPrompt = await buildSystemPrompt(userId);

  // If AI API key is not configured, run in deterministic sandbox analysis mode
  if (!config.ai.isConfigured) {
    logger.warn({ userId }, 'AI_API_KEY is not configured; running in sandbox inspection fallback mode');
    return runFallbackAgent({ userId, userPrompt });
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userPrompt },
  ];

  let executedSql = null;
  let chartData = null;
  let steps = 0;

  while (steps < MAX_TOOL_STEPS) {
    if (signal?.aborted) {
      const abortErr = new Error('Agent conversation aborted');
      abortErr.name = 'AbortError';
      throw abortErr;
    }

    steps += 1;

    const fetchSignal = signal
      ? AbortSignal.any([signal, AbortSignal.timeout(45_000)])
      : AbortSignal.timeout(45_000);

    const response = await fetch(`${config.ai.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.ai.apiKey}`,
      },
      body: JSON.stringify({
        model: config.ai.model,
        messages,
        tools: AGENT_TOOLS,
        tool_choice: 'auto',
        temperature: 0.1,
        max_tokens: 1500,
      }),
      signal: fetchSignal,
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      logger.error({ status: response.status, errBody }, 'AI Provider API call failed');
      throw new Error(`AI Provider request failed with status ${response.status}: ${errBody.slice(0, 150)}`);
    }

    const completion = await response.json();
    const choice = completion.choices?.[0];
    const message = choice?.message;

    if (!message) {
      throw new Error('AI Provider returned an empty completion');
    }

    // Append assistant's turn (with or without tool_calls)
    messages.push(message);

    // If model made no tool calls, we have the final answer
    if (!message.tool_calls || message.tool_calls.length === 0) {
      return {
        content: sanitizeContent(message.content),
        sqlQuery: executedSql,
        chartData,
      };
    }

    // Process all tool calls requested in this step
    for (const toolCall of message.tool_calls) {
      const { id: toolCallId, function: fn } = toolCall;
      let toolResult;

      try {
        const args = JSON.parse(fn.arguments || '{}');

        if (fn.name === 'execute_sql') {
          executedSql = args.query;
          logger.info({ userId, query: args.query }, 'Executing AI-generated SQL in sandbox');

          const queryResult = await executeSandboxedQuery(userId, args.query);
          toolResult = {
            columns: queryResult.columns.map((c) => c.name),
            rowCount: queryResult.rowCount,
            rows: queryResult.rows.slice(0, 30), // feed back sample for token conservation
            truncated: queryResult.truncated,
          };
        } else if (fn.name === 'render_chart') {
          chartData = {
            chart_type: args.chart_type,
            title: args.title,
            x_axis: args.x_axis,
            y_axis: args.y_axis,
            data: Array.isArray(args.data) ? args.data : [],
          };
          toolResult = { status: 'success', message: 'Chart registered for visual rendering' };
        } else {
          toolResult = { error: `Tool ${fn.name} is not recognized` };
        }
      } catch (err) {
        logger.warn({ userId, tool: fn.name, err: err.message }, 'Tool execution error (sending back to AI)');
        toolResult = {
          error: err.message,
          hint: err.details?.hint || 'Please adjust the SQL syntax or column names and try again.',
        };
      }

      // Append tool response
      messages.push({
        role: 'tool',
        tool_call_id: toolCallId,
        content: JSON.stringify(toolResult),
      });
    }
  }

  // Fallback return if max steps reached
  const lastMessage = messages[messages.length - 1];
  let finalContent = sanitizeContent(lastMessage?.content);
  if (!finalContent) {
    const isPersian = /[\u0600-\u06FF]/.test(userPrompt);
    finalContent = isPersian
      ? 'تحلیل داده‌ها در سندباکس پایگاه‌داده انجام شد. می‌توانید کوئری SQL و نمودار ایجادشده را در بالا مشاهده نمایید.'
      : 'Data analysis was executed in the database sandbox. You can review the executed SQL query and generated visualization above.';
  }

  return {
    content: finalContent,
    sqlQuery: executedSql,
    chartData,
  };
}

/**
 * Intelligent fallback engine for local development without external API keys.
 * Queries actual tables in the sandbox and formats real responses.
 */
async function runFallbackAgent({ userId, userPrompt }) {
  const isPersian = /[\u0600-\u06FF]/.test(userPrompt);
  const datasets = await listUserDatasets(adminPool, userId);

  if (datasets.length === 0) {
    return {
      content: isPersian
        ? 'در حال حاضر هیچ دیتاستی در سندباکس شما بارگذاری نشده است. لطفاً ابتدا از بخش «دیتاست‌ها» فایل CSV یا Excel خود را آپلود کنید تا بتوانم آن را برای شما تحلیل کنم.'
        : 'There are currently no datasets loaded in your PostgreSQL sandbox. Please upload a CSV or Excel file in the "Datasets" section first.',
      sqlQuery: null,
      chartData: null,
    };
  }

  const ds = datasets[0];
  const numCol = ds.columns?.find((c) => c.dataType === 'numeric' || c.dataType === 'integer' || c.dataType === 'bigint');
  const catCol = ds.columns?.find((c) => c.dataType === 'text' || c.dataType === 'date') || ds.columns?.[0];

  let sql = `SELECT * FROM ${ds.tableName} LIMIT 10;`;
  let chart = null;

  if (numCol && catCol) {
    sql = `SELECT ${catCol.columnName}, SUM(${numCol.columnName}) AS total\nFROM ${ds.tableName}\nGROUP BY ${catCol.columnName}\nORDER BY total DESC\nLIMIT 7;`;
  }

  let finalContent = '';

  try {
    const res = await executeSandboxedQuery(userId, sql);

    if (numCol && catCol && res.rows.length > 0) {
      const dataPoints = res.rows.map((row) => ({
        [catCol.columnName]: String(row[0] ?? 'N/A'),
        total: Number(row[1] ?? 0),
      }));

      chart = {
        chart_type: 'bar',
        title: isPersian ? `توزیع ${numCol.columnName} بر اساس ${catCol.columnName}` : `Distribution of ${numCol.columnName} by ${catCol.columnName}`,
        x_axis: catCol.columnName,
        y_axis: 'total',
        data: dataPoints,
      };
    }

    finalContent = isPersian
      ? `تحلیل اولیه داده‌ها از جدول **${ds.tableName}** با موفقیت در محیط سندباکس اجرا شد.\n\nتعداد کل ردیف‌های بررسی‌شده: ${res.rowCount} ردیف.\n(نکته: جهت اتصال به مدل‌های Aval AI یا OpenAI می‌توانید متغیر \`AI_API_KEY\` را در فایل \`.env\` تنظیم نمایید).`
      : `Sandbox analysis executed successfully on table **${ds.tableName}**.\n\nTotal rows retrieved: ${res.rowCount}.\n(Note: To connect live LLM models, specify \`AI_API_KEY\` in your \`.env\` file).`;
  } catch (err) {
    sql = `SELECT * FROM ${ds.tableName} LIMIT 5;`;
    finalContent = isPersian
      ? `کوئری با خطا مواجه شد: ${err.message}`
      : `Query encountered an error: ${err.message}`;
  }

  return {
    content: finalContent,
    sqlQuery: sql,
    chartData: chart,
  };
}
