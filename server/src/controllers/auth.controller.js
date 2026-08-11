import { loginAdmin, refreshTokens } from '../services/auth.service.js';
import { success } from '../utils/apiResponse.js';
import { REFRESH_COOKIE, setRefreshCookie } from '../utils/cookies.js';

export async function adminLogin(req, res) {
  const { email, password } = req.body;
  const { user, accessToken, refreshToken } = await loginAdmin(email, password);

  setRefreshCookie(res, refreshToken);
  return success(res, { data: { user, accessToken }, message: 'Logged in' });
}

export async function refresh(req, res) {
  const token = req.cookies?.[REFRESH_COOKIE];
  const { user, accessToken, refreshToken } = await refreshTokens(token);

  setRefreshCookie(res, refreshToken);
  return success(res, { data: { user, accessToken }, message: 'Token refreshed' });
}
