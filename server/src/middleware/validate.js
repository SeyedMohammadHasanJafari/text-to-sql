/**
 * Validates and REPLACES request parts with the parsed (stripped, coerced) data,
 * so handlers only ever see known-good input.
 *
 * Express 5 exposes `req.query` as a getter, so parsed values for it are
 * stored on `req.validated` instead of being reassigned.
 *
 * @param {{ body?: import('zod').ZodType, params?: import('zod').ZodType, query?: import('zod').ZodType }} schemas
 */
export function validate(schemas) {
  return (req, _res, next) => {
    req.validated = {};
    for (const [part, schema] of Object.entries(schemas)) {
      req.validated[part] = schema.parse(req[part]); // ZodError → errorHandler → 400
    }
    next();
  };
}
