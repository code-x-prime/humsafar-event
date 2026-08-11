// Re-exports the canonical error-code enum from config/constants.js so both the
// spec's "config/constants.js" and "utils/responseCodes.js" locations resolve to
// one source of truth instead of two competing lists.
export { ERROR_CODES } from '../config/constants.js';
