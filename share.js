import { Platform, Share } from 'react-native';
import { gcm } from '@noble/ciphers/aes.js';
import { utf8ToBytes } from '@noble/ciphers/utils.js';
import * as Crypto from 'expo-crypto';

// 공유 서버 (Cloudflare Worker). 암호문만 보관하며 복호화 키는 받지 않는다.
// 자세한 구조는 server/README.md 참고.
const WORKER = 'https://trippay.fompy98.workers.dev';

// 링크 유효기간. 실제 만료는 서버(KV TTL)가 처리하므로 앱 실행과 무관하다.
export const SHARE_TTL_DAYS = 7;

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

// RN에는 btoa가 보장되지 않아 직접 인코딩한다.
function toB64url(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i], b = bytes[i + 1], c = bytes[i + 2];
    out += B64[a >> 2];
    out += B64[((a & 3) << 4) | ((b || 0) >> 4)];
    if (b === undefined) break;
    out += B64[((b & 15) << 2) | ((c || 0) >> 6)];
    if (c === undefined) break;
    out += B64[c & 63];
  }
  return out;
}

// 여행 데이터 -> 공유 페이로드 (뷰어가 그대로 렌더링한다)
//
// 다통화 여행을 담으려고 currencies·rates·balance.byCurrency 를 추가했다.
// country 와 balance 의 avgRate·cardBal·cashBal 은 주 통화 기준으로 계속 채운다 —
// 뷰어가 아직 옛 버전일 때도 단일 통화 여행은 그대로 보이게 하기 위해서다.
export function buildSharePayload({ trip, deposits, expenses, krwExps, balance }) {
  const list = (trip?.currencies && trip.currencies.length ? trip.currencies : [trip?.country]).filter(Boolean);
  const primary = list[0] || {};
  const byCur = balance?.byCurrency || [];
  const first = byCur[0] || {};
  const rates = balance?.rates || {};

  return {
    tripName: trip?.name || '',
    country: {
      sym:  primary.sym  || '',
      flag: primary.flag || '🌏',
      r100: primary.r100 || false,
      code: primary.code || '',
    },
    currencies: list.map(c => ({
      code: c.code || '', sym: c.sym || '', flag: c.flag || '🌏', r100: !!c.r100, name: c.name || '',
    })),
    rates,
    startDate: trip?.startDate || '',
    endDate:   trip?.endDate   || '',
    members:   trip?.members   || [],
    note:      trip?.note      || '',
    balance: {
      acctBal: balance?.acctBal || 0,
      byCurrency: byCur.map(c => ({
        code: c.code || '', sym: c.sym || '', cardBal: c.cardBal || 0, cashBal: c.cashBal || 0,
      })),
      // 옛 뷰어 호환 (주 통화 기준)
      avgRate: rates[primary.code || ''] || 0,
      cardBal: first.cardBal || 0,
      cashBal: first.cashBal || 0,
    },
    deposits: deposits || [],
    expenses: expenses || [],
    krwExps:  krwExps  || [],
    createdAt: Date.now(),
  };
}

// 암호화해서 업로드하고 링크를 만든다.
// 키는 '#' 뒤에 실린다. 프래그먼트는 HTTP 요청에 포함되지 않으므로 서버에 도달하지 않는다.
export async function createShareLink(payload) {
  const key = Crypto.getRandomBytes(32);   // AES-256
  const iv  = Crypto.getRandomBytes(12);
  const sealed = gcm(key, iv).encrypt(utf8ToBytes(JSON.stringify(payload)));

  const body = new Uint8Array(iv.length + sealed.length);
  body.set(iv);
  body.set(sealed, iv.length);

  const res = await fetch(`${WORKER}/d`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: toB64url(body),
  });
  if (!res.ok) throw new Error('UPLOAD_FAILED');

  const { id, token, expiresAt } = await res.json();
  if (!id) throw new Error('NO_ID');

  return { url: `${WORKER}/s/${id}#${toB64url(key)}`, id, token, expiresAt };
}

// 공유 회수. 서버에서 삭제하므로 기존 링크는 즉시 열리지 않는다.
// 반환: 'DELETED' | 'GONE'(이미 만료·삭제됨) | 'FAILED'
export async function revokeShare(share) {
  if (!share || !share.id) return 'GONE';
  try {
    const res = await fetch(`${WORKER}/d/${share.id}`, {
      method: 'DELETE',
      headers: { 'X-Delete-Token': share.token || '' },
    });
    if (res.ok) return 'DELETED';
    if (res.status === 404) return 'GONE';
  } catch (e) {}
  return 'FAILED';
}

// 업로드 + 공유. 반환 { url, method, id, token, expiresAt }
// 공유 시트가 실패해도 id·token은 반드시 반환한다. 잃으면 회수할 수 없는 링크가 남는다.
export async function shareTrip(data) {
  const payload = buildSharePayload(data);
  const { url, id, token, expiresAt } = await createShareLink(payload);
  const meta = { id, token, expiresAt };

  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'TripPay', url });
        return { url, method: 'share', ...meta };
      } catch (e) {
        // 취소/미지원 -> 복사로 폴백
      }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        return { url, method: 'copy', ...meta };
      } catch (e) {}
    }
    return { url, method: 'none', ...meta };
  }

  try {
    await Share.share({ message: url });
    return { url, method: 'share', ...meta };
  } catch (e) {
    return { url, method: 'none', ...meta };
  }
}
