# TripPay 공유 서버

정산 공유 링크를 짧게 만들기 위한 Cloudflare Worker. **서버는 암호문만 보관한다.**

## 왜 이렇게 만들었나

| | 전 (JSONBin) | 지금 |
|---|---|---|
| 서버가 내용을 읽을 수 있나 | 읽을 수 있음(공개 bin) | **불가** — 키가 서버에 안 감 |
| 링크 길이 | 60자 안팎 | 96자 (`workers.dev` 기준) |
| 만료 | 없음 | **KV TTL 7일** — 앱 실행과 무관 |
| 삭제 | 앱 키에 권한 없음 | **삭제 토큰으로 즉시 취소** |

링크는 `https://<host>/s/<id>#<key>` 형태다. `#` 뒤는 HTTP 요청에 실려가지 않으므로
복호화 키가 서버에 도달하지 않는다. 링크가 유출돼도 키 없이는 열 수 없고,
서버가 털려도 나오는 건 해독 불가능한 덩어리뿐이다.

## 암호 방식

- **AES-256-GCM**. 앱은 `@noble/ciphers`(순수 JS), 뷰어는 브라우저 내장 WebCrypto.
- 본문 = `iv(12B) + 암호문`. 키(32B)는 링크 프래그먼트에 base64url로 실린다.
- GCM 인증 태그 덕분에 **누가 저장분을 조작하면 복호화 자체가 실패**한다.
- 상호운용은 실측으로 확인했다(앱 방식 암호화 → WebCrypto 복호화 일치, 틀린 키는 실패).

## API

| | |
|---|---|
| `POST /d` | 본문 = iv+암호문 → `{ id, token, expiresAt }` |
| `GET /d/:id` | 암호문 반환. 없으면 404 |
| `DELETE /d/:id` | 헤더 `X-Delete-Token`이 맞으면 삭제 |
| `GET /s/:id` | 뷰어 페이지 (Pages의 `view.html`을 그대로 서빙) |

`token`은 앱만 보관한다. 서버 KV에는 토큰의 SHA-256 해시만 둔다.

## 배포 (Leo가 직접 실행)

Cloudflare 계정 로그인이 필요해 대신 실행할 수 없다.

```bash
npm install -g wrangler
wrangler login
cd server
wrangler kv namespace create SHARES     # 출력된 id를 wrangler.toml에 넣는다
wrangler deploy
```

배포되면 `https://trippay.<계정>.workers.dev`가 생긴다. 이 주소를 앱의 공유 모듈에 넣으면 된다.

## 한도

무료 티어 기준 요청·저장 한도가 이 앱 규모에는 여유롭지만, 정확한 수치는 배포 후
Cloudflare 대시보드에서 확인할 것. 여행 1건 공유 = 쓰기 1회, 열람 = 읽기 1회다.
