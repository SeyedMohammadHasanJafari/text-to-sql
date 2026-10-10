/**
 * OpenAI / Aval AI function-calling tool specifications for the Text-to-SQL Agent.
 */

export const AGENT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'execute_sql',
      description:
        'Executes a safe read-only SQL query against the user tables in the PostgreSQL sandbox and returns the dataset rows.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              'A standard PostgreSQL SELECT or WITH query. Must only read data from the available tables.',
          },
        },
        required: ['query'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'render_chart',
      description:
        'Generates an interactive visual chart (Bar, Line, or Pie) alongside your response to visualize query insights.',
      parameters: {
        type: 'object',
        properties: {
          chart_type: {
            type: 'string',
            enum: ['bar', 'line', 'pie'],
            description: 'The visual format of the graph.',
          },
          title: {
            type: 'string',
            description: 'A descriptive title for the chart (in Persian or English matching the user language).',
          },
          x_axis: {
            type: 'string',
            description: 'The property key in data items to use for the categorical / X axis.',
          },
          y_axis: {
            type: 'string',
            description: 'The property key in data items to use for numerical / Y values.',
          },
          data: {
            type: 'array',
            items: {
              type: 'object',
            },
            description:
              'An array of row objects containing values for x_axis and y_axis (e.g. [{"month": "2024-01", "total": 1200}]).',
          },
        },
        required: ['chart_type', 'title', 'x_axis', 'y_axis', 'data'],
        additionalProperties: false,
      },
    },
  },
];
