export function success(res, { data = null, message = 'OK', meta = undefined, status = 200 } = {}) {
  const body = { success: true, data, message };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
}

export function error(res, { message = 'Something went wrong', code = 'INTERNAL_ERROR', errors = [], status = 500 } = {}) {
  return res.status(status).json({ success: false, message, code, errors });
}
