import { Platform, Share } from 'react-native';

// index.html과 동일한 쓰기 전용 Access 키 (이미 공개된 값)
const JBIN_ACCESS = '$2a$10$xvOaqF.H5hKFjNwfi.ZvJ.vosXlodN0WHvCVbqAeHWc5yzp/VrGBi';
const VIEW_BASE   = 'https://leoinkang.github.io/travel-expense-app/view.html';
const JBIN_BASE   = 'https://api.jsonbin.io/v3/b';

// 공유 링크 유효기간. 지나면 앱이 실행될 때 정리한다.
export const SHARE_TTL_DAYS = 7;

// view.html이 기대하는 형태로 페이로드 구성
export function buildSharePayload({ trip, deposits, expenses, krwExps, balance }) {
  return {
    tripName: trip?.name || '',
    country: {
      sym:  trip?.country?.sym  || '',
      flag: trip?.country?.flag || '🌏',
      r100: trip?.country?.r100 || false,
      code: trip?.country?.code || '',
    },
    startDate: trip?.startDate || '',
    endDate:   trip?.endDate   || '',
    members:   trip?.members   || [],
    note:      trip?.note      || '',
    balance: {
      avgRate: balance?.avgRate || 0,
      acctBal: balance?.acctBal || 0,
      cardBal: balance?.cardBal || 0,
      cashBal: balance?.cashBal || 0,
    },
    deposits: deposits || [],
    expenses: expenses || [],
    krwExps:  krwExps  || [],
    createdAt: Date.now(),
    expiresAt: Date.now() + SHARE_TTL_DAYS * 86400000,
  };
}

// JSONBin에 공개 bin 생성 -> { url, binId } 반환
// 버전 기록을 끄는 이유: 켜져 있으면 만료 처리로 덮어써도 이전 버전이 그대로 조회된다.
export async function createShareLink(payload) {
  const res = await fetch(JBIN_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Access-Key': JBIN_ACCESS,
      'X-Bin-Private': 'false',
      'X-Bin-Versioning': 'false',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('UPLOAD_FAILED');
  const json = await res.json();
  const binId = json && json.metadata && json.metadata.id;
  if (!binId) throw new Error('NO_BIN_ID');
  return { url: `${VIEW_BASE}?id=${binId}`, binId };
}

// 공유 회수 — 삭제를 먼저 시도하고, 키에 Delete 권한이 없으면 빈 내용으로 덮어쓴다.
// 어느 쪽이든 링크를 열었을 때 내역이 보이지 않는 상태가 된다.
// 반환: 'DELETED' | 'REVOKED' | 'GONE'(이미 없음) | 'FAILED'
export async function revokeShare(binId) {
  if (!binId) return 'GONE';

  try {
    const del = await fetch(`${JBIN_BASE}/${binId}`, {
      method: 'DELETE',
      headers: { 'X-Access-Key': JBIN_ACCESS },
    });
    if (del.ok) return 'DELETED';
    if (del.status === 404) return 'GONE';
  } catch (e) {
    // 네트워크 오류면 덮어쓰기도 실패한다. 아래에서 한 번 더 시도.
  }

  try {
    const put = await fetch(`${JBIN_BASE}/${binId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Access-Key': JBIN_ACCESS,
        'X-Bin-Versioning': 'false',
      },
      body: JSON.stringify({ app: 'TripPay', revoked: true }),
    });
    if (put.ok) return 'REVOKED';
    if (put.status === 404) return 'GONE';
  } catch (e) {}

  return 'FAILED';
}

// 업로드 + 공유. 반환 { url, method, binId, expiresAt }
// binId·expiresAt은 호출부가 여행 데이터에 저장해 두었다가 만료 정리·공유 취소에 쓴다.
export async function shareTrip(data) {
  const payload = buildSharePayload(data);
  const { url, binId } = await createShareLink(payload);
  const meta = { binId, expiresAt: payload.expiresAt };

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
      } catch (e) {
        // 복사 권한이 없어도 업로드는 이미 끝났다. 링크를 직접 보여준다.
      }
    }
    return { url, method: 'none', ...meta };
  }

  // 공유 시트를 못 띄우더라도 binId는 반드시 반환한다.
  // 여기서 throw하면 방금 만든 bin의 id를 잃어 회수할 수 없는 링크가 남는다.
  try {
    await Share.share({ message: url });
    return { url, method: 'share', ...meta };
  } catch (e) {
    return { url, method: 'none', ...meta };
  }
}
