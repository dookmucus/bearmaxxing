import {englishMessage} from './english-messages.mjs';
export async function readPlayerResponse(response) {
  const text = await response.text();
  let body;

  try {
    body = JSON.parse(text);
  } catch {
    const contentType = response.headers.get('content-type') || '';
    const isHtml = /text\/html/i.test(contentType) || /<!doctype html|<html[\s>]/i.test(text);

    if (isHtml) {
      throw new Error(englishMessage("messages.player.response.readPlayerResponse.the.player.api.route.returned.the.app.page.instead.of"));
    }
    if (response.status === 404) {
      throw new Error(englishMessage("messages.player.response.readPlayerResponse.the.player.import.function.was.not.found.http.404.check"));
    }
    throw new Error(englishMessage("messages.player.response.readPlayerResponse.the.player.import.endpoint.returned.a.non.json.response.http",{status:response.status}));
  }

  if (!response.ok) throw new Error(body?.error || englishMessage("messages.player.response.readPlayerResponse.player.lookup.failed.http",{status:response.status}));
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error(englishMessage("messages.player.response.readPlayerResponse.the.player.import.endpoint.returned.an.unexpected.json.response"));
  }
  return body;
}
