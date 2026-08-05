// TripPay 공유 서버 (Cloudflare Worker)
//
// 서버는 암호문만 보관한다. 복호화 키는 링크의 '#' 뒤에 실려 브라우저에만 머물고
// HTTP 요청에 포함되지 않으므로, 운영자도 저장된 내용을 읽을 수 없다.
//
//   POST   /d           본문 = base64url(iv(12B) + 암호문) → { id, token }
//   GET    /d/:id       암호문 반환 (뷰어가 호출)
//   DELETE /d/:id       X-Delete-Token 일치 시 즉시 삭제 (공유 취소)
//   GET    /s/:id       뷰어 페이지 (Pages의 view.html을 그대로 내보냄)
//
// 보관기간은 KV의 expirationTtl이 처리한다. 앱 실행 여부와 무관하게 만료된다.

const TTL_SECONDS = 7 * 24 * 60 * 60;      // 7일
const MAX_BODY    = 512 * 1024;            // 512KB — 정상 여행 데이터는 수십 KB
const VIEWER_URL  = 'https://leoinkang.github.io/travel-expense-app/view.html';

const b64url = (bytes) => btoa(String.fromCharCode(...bytes))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const randomId = (bytes) => b64url(crypto.getRandomValues(new Uint8Array(bytes)));

// 삭제 토큰은 평문으로 두지 않는다. KV에는 해시만 저장한다.
async function hashToken(token) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return b64url(new Uint8Array(digest));
}

// 앱의 웹 빌드(다른 오리진)에서도 공유·취소가 되도록 CORS를 연다.
// 열어도 안전한 이유: 서버가 다루는 건 어차피 암호문뿐이고, 삭제는 토큰이 지킨다.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Delete-Token',
  'Access-Control-Max-Age': '86400',
};

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...CORS },
  });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const [, section, id] = url.pathname.split('/');

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    if (section === 'd') {
      if (request.method === 'POST' && !id) return create(request, env);
      if (request.method === 'GET' && id)   return read(id, env);
      if (request.method === 'DELETE' && id) return remove(request, id, env);
      return new Response('Method Not Allowed', { status: 405 });
    }

    if (section === 's' && id && request.method === 'GET') return viewer();

    return new Response('Not Found', { status: 404 });
  },
};

async function create(request, env) {
  // 본문은 base64url 텍스트. RN·브라우저 양쪽에서 바이너리 본문을 다루지 않아도 되게 한다.
  const body = (await request.text()).trim();
  if (body.length === 0)              return json({ error: 'EMPTY' }, 400);
  if (body.length > MAX_BODY)         return json({ error: 'TOO_LARGE' }, 413);
  if (!/^[A-Za-z0-9_-]+$/.test(body)) return json({ error: 'BAD_BODY' }, 400);

  const id = randomId(9);      // 12자
  const token = randomId(16);  // 공유 취소용. 앱만 보관한다.

  await env.SHARES.put(id, body, {
    expirationTtl: TTL_SECONDS,
    metadata: { t: await hashToken(token) },
  });

  return json({ id, token, expiresAt: Date.now() + TTL_SECONDS * 1000 });
}

async function read(id, env) {
  const body = await env.SHARES.get(id, { type: 'text' });
  if (!body) return json({ error: 'GONE' }, 404);
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      // 링크가 살아 있는 동안만 짧게 캐시. 취소가 곧바로 반영되도록.
      'Cache-Control': 'public, max-age=60',
      ...CORS,
    },
  });
}

async function remove(request, id, env) {
  const token = request.headers.get('X-Delete-Token') || '';
  const { metadata } = await env.SHARES.getWithMetadata(id);
  if (!metadata) return json({ ok: true, already: true }); // 이미 만료·삭제됨

  if (metadata.t !== await hashToken(token)) return json({ error: 'FORBIDDEN' }, 403);

  await env.SHARES.delete(id);
  return json({ ok: true });
}

// 뷰어는 GitHub Pages의 view.html을 단일 출처로 두고 여기서 그대로 내보낸다.
// 같은 오리진에서 서빙되므로 /d/:id 호출에 CORS 설정이 필요 없다.
async function viewer() {
  const res = await fetch(VIEWER_URL, { cf: { cacheTtl: 300, cacheEverything: true } });
  if (!res.ok) return new Response('Viewer unavailable', { status: 502 });
  return new Response(res.body, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
  });
}
