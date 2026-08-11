import DOMPurify from 'isomorphic-dompurify';

// Recursively strips dangerous HTML/script content from string fields in the
// request body. Rich-text fields (Category.description, Page.content, etc.)
// flow through this before hitting any service — no route is exempt.
function sanitizeValue(value) {
  if (typeof value === 'string') {
    return DOMPurify.sanitize(value);
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, sanitizeValue(v)]));
  }
  return value;
}

export function sanitizeMiddleware(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  return next();
}
