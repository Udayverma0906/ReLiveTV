import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL;

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');
  return { Authorization: `Bearer ${session.access_token}` };
}

/**
 * Create a new session as the authenticated user.
 * Returns { id, code, createdAt }.
 */
export async function createSession() {
  const headers = await authHeaders();
  const res = await fetch(`${API_URL}/api/sessions`, {
    method: 'POST',
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create session');
  }
  return res.json();
}

/**
 * Validate a session code (public — no auth needed).
 * Returns the session if valid, throws if not.
 */
export async function getSessionByCode(code) {
  const res = await fetch(`${API_URL}/api/sessions/${code.toUpperCase()}`);
  if (!res.ok) {
    if (res.status === 404) throw new Error('Invalid code');
    throw new Error('Failed to validate code');
  }
  return res.json();
}

/**
 * Get the current video for a channel.
 */
export async function getCurrentVideoForChannel(idOrNumber) {
  const res = await fetch(`${API_URL}/api/channels/${idOrNumber}/current`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch channel video');
  }
  return res.json();
}

/**
 * Mark a video as broken (embed errors).
 */
export async function markVideoBroken(channelNumber, youtubeId, errorCode) {
  const res = await fetch(`${API_URL}/api/channels/${channelNumber}/mark-broken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ youtubeId, errorCode }),
  });
  if (!res.ok) {
    console.warn('Failed to mark video broken');
  }
}