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
//   ── v1.2 영수증 가져오기 (방향만 반대, 같은 암호 구조) ──
//   GET    /upload      업로더 페이지: AI가 만든 JSON 붙여넣기 → 브라우저 암호화 → 링크 발급
//   POST   /i           본문 = base64url(iv+암호문) → { id } (TTL 48시간)
//   GET    /i/:id       암호문 반환 (앱이 호출)
//   DELETE /i/:id       가져오기 완료 후 앱이 삭제 (링크 보유 = 삭제 권한)
//   GET    /r/:id       사람용 링크 페이지: 링크 복사 안내 (#키는 브라우저에만 머문다)
//
// 보관기간은 KV의 expirationTtl이 처리한다. 앱 실행 여부와 무관하게 만료된다.

const TTL_SECONDS = 7 * 24 * 60 * 60;      // 공유 7일
const IMPORT_TTL  = 48 * 60 * 60;          // 가져오기 48시간 (쓰고 버리는 용도)
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

    if (section === 'i') {
      if (request.method === 'POST' && !id)   return importCreate(request, env);
      if (request.method === 'GET' && id)     return importRead(id, env);
      if (request.method === 'DELETE' && id)  return importRemove(id, env);
      return new Response('Method Not Allowed', { status: 405 });
    }

    if (section === 'upload' && request.method === 'GET') return page(UPLOAD_HTML);
    if (section === 'r' && id && request.method === 'GET') return page(LINK_HTML);

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

// ── 영수증 가져오기 저장소 ──
// 공유(/d)와 같은 원리: 암호문만 저장, 키는 프래그먼트로만 이동.
// 쓰고 버리는 용도라 TTL이 짧고, 삭제 토큰 없이 링크 보유가 곧 삭제 권한이다.

async function importCreate(request, env) {
  const body = (await request.text()).trim();
  if (body.length === 0)              return json({ error: 'EMPTY' }, 400);
  if (body.length > MAX_BODY)         return json({ error: 'TOO_LARGE' }, 413);
  if (!/^[A-Za-z0-9_-]+$/.test(body)) return json({ error: 'BAD_BODY' }, 400);

  const id = 'imp_' + randomId(9);
  await env.SHARES.put(id, body, { expirationTtl: IMPORT_TTL });
  return json({ id, expiresAt: Date.now() + IMPORT_TTL * 1000 });
}

async function importRead(id, env) {
  if (!id.startsWith('imp_')) return json({ error: 'GONE' }, 404);
  const body = await env.SHARES.get(id, { type: 'text' });
  if (!body) return json({ error: 'GONE' }, 404);
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', ...CORS },
  });
}

async function importRemove(id, env) {
  if (!id.startsWith('imp_')) return json({ ok: true, already: true });
  await env.SHARES.delete(id);
  return json({ ok: true });
}

const page = (html) =>
  new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });

// 뷰어는 GitHub Pages의 view.html을 단일 출처로 두고 여기서 그대로 내보낸다.
// 같은 오리진에서 서빙되므로 /d/:id 호출에 CORS 설정이 필요 없다.
async function viewer() {
  const res = await fetch(VIEWER_URL, { cf: { cacheTtl: 300, cacheEverything: true } });
  if (!res.ok) return new Response('Viewer unavailable', { status: 502 });
  return new Response(res.body, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
  });
}

// ── 정적 페이지 (인라인) ──
// 주의: 아래 HTML의 스크립트는 워커 템플릿 리터럴과 충돌하지 않도록 백틱·${}를 쓰지 않는다.
// 프롬프트 원문의 단일 출처는 docs/receipt-import-prompt.md — 고치면 같이 고칠 것.

const PROMPT_TEXT = [
  '첨부한 영수증 사진들을 읽어 아래 형식의 JSON 하나로 만들어 줘.',
  '여행 경비 앱(TripPay)의 가져오기 파일이라 형식을 정확히 지켜야 해.',
  '',
  '{',
  '  "app": "TripPay",',
  '  "version": 1,',
  '  "trip": {',
  '    "id": "trip_<여행을 짧게 영문으로>",',
  '    "name": "<여행 이름>",',
  '    "startDate": "YYYY-MM-DD",',
  '    "endDate": "YYYY-MM-DD",',
  '    "country": { "flag": "🇯🇵", "name": "일본", "code": "JPY", "sym": "¥", "r100": true, "exRate": "930" },',
  '    "members": ["<참석자1>", "<참석자2>"],',
  '    "note": "영수증 자동입력"',
  '  },',
  '  "deposits": [], "charges": [], "exchanges": [], "atms": [], "refunds": [],',
  '  "expenses": [',
  '    { "id": 1, "name": "<항목명>", "amt": 12345, "pay": "현금", "date": "MM-DD", "note": "<메모>" }',
  '  ],',
  '  "krwExps": []',
  '}',
  '',
  '규칙:',
  '1. 지출 1건 = 영수증 1장. amt는 영수증의 최종 합계(정수, 현지통화). 세금·할인 반영된 실제 지불액.',
  '2. date는 MM-DD 형식. id는 1부터 순번.',
  '3. pay는 "현금" · "트래블카드"(선불 외화카드) · "신용카드" 셋 중 하나만. 현금 표시가 있으면 현금,',
  '   카드 결제로 보이면 나에게 어느 카드였는지 물어봐.',
  '4. name은 한국어로 짧게(가게명 또는 용도). 상세(지점·인원·구성)는 note에.',
  '5. 원화(KRW) 지출은 expenses가 아니라 krwExps에 넣는다(pay 필드 없음). 통화를 섞지 마.',
  '6. country는 여행 국가에 맞게. 자주 쓰는 값:',
  '   일본 JPY ¥ r100=true exRate=930 / 캐나다 CAD C$ r100=false 980 / 베트남 VND ₫ r100=true 5.5 /',
  '   태국 THB ฿ r100=false 40 / 미국 USD $ r100=false 1350 / 유럽 EUR € r100=false 1500',
  '7. 참석자 이름은 영수증에 보이면 그대로, 없으면 나에게 물어봐.',
  '8. 금액·날짜가 흐릿하거나 1인분/합계가 애매한 영수증은 추측하지 말고 질문해.',
  '9. 끝에 확인용 요약을 붙여 줘: 건수, 통화별 합계, 날짜 범위, 애매했던 항목.',
  '10. JSON은 코드블록 하나로만.',
].join('\n');

const PAGE_CSS = '*{box-sizing:border-box;margin:0;padding:0}' +
  'body{font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Noto Sans KR",sans-serif;' +
  'background:#f0eee8;color:#1a1a1a;padding:20px;max-width:560px;margin:0 auto;line-height:1.6}' +
  'h1{font-size:20px;color:#1a3a5c;margin:16px 0 4px}' +
  '.sub{font-size:13px;color:#6b6b6b;margin-bottom:16px}' +
  '.card{background:#fff;border:.5px solid rgba(0,0,0,.1);border-radius:12px;padding:16px;margin-bottom:12px}' +
  '.step{font-size:13px;font-weight:700;color:#1a3a5c;margin-bottom:6px}' +
  'button{width:100%;background:#1a3a5c;color:#fff;border:0;border-radius:10px;padding:13px;' +
  'font-size:14px;font-weight:700;cursor:pointer;font-family:inherit}' +
  'button.light{background:#378ADD}' +
  'textarea{width:100%;min-height:140px;border:.5px solid rgba(0,0,0,.2);border-radius:8px;' +
  'padding:10px;font-size:12px;font-family:ui-monospace,Menlo,monospace}' +
  '.msg{font-size:13px;margin-top:10px;word-break:break-all}' +
  '.ok{color:#0F6E56}.err{color:#A32D2D}' +
  '.linkbox{background:#f8f7f3;border-radius:8px;padding:10px;font-size:12px;word-break:break-all;margin-top:10px}';

const UPLOAD_HTML = '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">' +
'<meta name="viewport" content="width=device-width,initial-scale=1">' +
'<title>TripPay 영수증 가져오기</title><style>' + PAGE_CSS + '</style></head><body>' +
'<h1>영수증 → TripPay</h1>' +
'<p class="sub">AI가 읽은 영수증을 앱으로 보내는 페이지예요. 내용은 이 브라우저에서 암호화되어 서버는 읽을 수 없어요.</p>' +
'<div class="card"><div class="step">1. 프롬프트를 복사해 AI에 영수증 사진과 함께 붙여넣기</div>' +
'<button id="copyPrompt">📋 AI 프롬프트 복사</button><div class="msg" id="m1"></div></div>' +
'<div class="card"><div class="step">2. AI가 만들어준 JSON을 아래에 붙여넣기</div>' +
'<textarea id="jsonIn" placeholder=\'{"app":"TripPay", ...}\'></textarea>' +
'<div style="height:10px"></div><button class="light" id="makeLink">🔗 가져오기 링크 만들기</button>' +
'<div class="msg" id="m2"></div><div id="out"></div></div>' +
'<textarea id="prompt" style="display:none"></textarea>' +
'<script>' +
'document.getElementById("prompt").value=' + JSON.stringify(PROMPT_TEXT) + ';' +
'function b64u(bytes){var s="";for(var i=0;i<bytes.length;i+=8192){s+=String.fromCharCode.apply(null,bytes.subarray(i,i+8192));}' +
'return btoa(s).replace(/\\+/g,"-").replace(/\\//g,"_").replace(/=+$/,"");}' +
'document.getElementById("copyPrompt").onclick=function(){' +
'navigator.clipboard.writeText(document.getElementById("prompt").value).then(function(){' +
'document.getElementById("m1").innerHTML="<span class=ok>복사했어요. AI에 영수증 사진과 함께 붙여넣으세요.</span>";},function(){' +
'document.getElementById("m1").innerHTML="<span class=err>복사 실패 — 길게 눌러 직접 복사해 주세요.</span>";});};' +
'document.getElementById("makeLink").onclick=async function(){' +
'var m2=document.getElementById("m2"),out=document.getElementById("out");out.innerHTML="";' +
'var raw=document.getElementById("jsonIn").value.trim();' +
'var fence=raw.match(/```(?:json)?\\s*([\\s\\S]*?)```/);if(fence)raw=fence[1].trim();' +
'var data;try{data=JSON.parse(raw);}catch(e){m2.innerHTML="<span class=err>JSON을 읽을 수 없어요. AI가 준 코드블록 전체를 붙여넣어 주세요.</span>";return;}' +
'if(!data||!data.trip||(!Array.isArray(data.expenses)&&!Array.isArray(data.krwExps))){' +
'm2.innerHTML="<span class=err>TripPay 형식이 아니에요. trip과 expenses가 있어야 해요.</span>";return;}' +
'data.batchId="b_"+Date.now().toString(36)+Math.random().toString(36).slice(2,8);' +
'try{' +
'var key=crypto.getRandomValues(new Uint8Array(32)),iv=crypto.getRandomValues(new Uint8Array(12));' +
'var ck=await crypto.subtle.importKey("raw",key,"AES-GCM",false,["encrypt"]);' +
'var ct=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv:iv},ck,new TextEncoder().encode(JSON.stringify(data))));' +
'var blob=new Uint8Array(iv.length+ct.length);blob.set(iv);blob.set(ct,iv.length);' +
'var res=await fetch("/i",{method:"POST",headers:{"Content-Type":"text/plain"},body:b64u(blob)});' +
'if(!res.ok)throw new Error("upload");var j=await res.json();' +
'var link=location.origin+"/r/"+j.id+"#"+b64u(key);' +
'var n=(data.expenses||[]).length+(data.krwExps||[]).length;' +
'm2.innerHTML="<span class=ok>지출 "+n+"건 준비 완료. 48시간 안에 앱에서 가져오세요.</span>";' +
'out.innerHTML="<div class=linkbox id=linkText></div><div style=height:10px></div><button id=copyLink>🔗 링크 복사</button>";' +
'document.getElementById("linkText").textContent=link;' +
'document.getElementById("copyLink").onclick=function(){navigator.clipboard.writeText(link).then(function(){' +
'document.getElementById("copyLink").textContent="복사됨 — TripPay의 AI 영수증 가져오기에 붙여넣으세요";});};' +
'}catch(e){m2.innerHTML="<span class=err>업로드에 실패했어요. 네트워크를 확인하고 다시 시도해 주세요.</span>";}};' +
'</script></body></html>';

const LINK_HTML = '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">' +
'<meta name="viewport" content="width=device-width,initial-scale=1">' +
'<title>TripPay 가져오기 링크</title><style>' + PAGE_CSS + '</style></head><body>' +
'<h1>TripPay 가져오기 링크</h1>' +
'<p class="sub">이 링크는 TripPay 앱에서 여는 링크예요. 내용은 암호화되어 있고 48시간 뒤 사라져요.</p>' +
'<div class="card"><div class="step">TripPay 앱 → 첫 화면 → "AI 영수증 가져오기" → 붙여넣기</div>' +
'<button id="copyLink">🔗 링크 전체 복사</button><div class="msg" id="m"></div></div>' +
'<script>' +
'document.getElementById("copyLink").onclick=function(){' +
'navigator.clipboard.writeText(location.href).then(function(){' +
'document.getElementById("m").innerHTML="<span class=ok>복사했어요. TripPay 앱에 붙여넣으세요.</span>";},function(){' +
'document.getElementById("m").innerHTML="<span class=err>복사 실패 — 주소창의 주소를 직접 복사해 주세요.</span>";});};' +
'</script></body></html>';

