export async function readPlayerResponse(response) {
  const text = await response.text();
  let body;

  try {
    body = JSON.parse(text);
  } catch {
    const contentType = response.headers.get('content-type') || '';
    const isHtml = /text\/html/i.test(contentType) || /<!doctype html|<html[\s>]/i.test(text);

    if (isHtml) {
      throw new Error('The player API route returned the app page instead of a function response. Check that Netlify deployed the player function and that /api/player/:id routes before the SPA fallback.');
    }
    if (response.status === 404) {
      throw new Error('The player import function was not found (HTTP 404). Check the Netlify Functions directory and the latest deployment.');
    }
    throw new Error(`The player import endpoint returned a non-JSON response (HTTP ${response.status}). Check the Netlify function deployment and logs.`);
  }

  if (!response.ok) throw new Error(body?.error || `Player lookup failed (HTTP ${response.status}).`);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('The player import endpoint returned an unexpected JSON response.');
  }
  return body;
}
