import { supabase } from '../lib/supabase.js';

/**
 * Middleware: verifies the Bearer token in the Authorization header
 * and attaches the user object to req.user.
 *
 * Returns 401 if missing or invalid.
 */
export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header' });
    }

    const token = authHeader.slice(7); // strip "Bearer "

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = data.user;
    next();
  } catch (err) {
    console.error('[requireAuth] error:', err);
    return res.status(401).json({ error: 'Authentication failed' });
  }
}