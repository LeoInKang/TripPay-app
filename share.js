import { Platform, Share } from 'react-native';

// index.html과 동일한 쓰기 전용 Access 키 (Create+Update만, Delete 없음 / 이미 공개된 값)
const JBIN_ACCESS = '$2a$10$xvOaqF.H5hKFjNwfi.ZvJ.vosXlodN0WHvCVbqAeHWc5yzp/VrGBi';
const VIEW_BASE   = 'https://leoinkang.github.io/travel-expense-app/view.html';

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
  };
}

// JSONBin에 공개 bin 생성 -> view.html 링크 반환
export async function createShareLink(payload) {
  const res = await fetch('https://api.jsonbin.io/v3/b', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Access-Key': JBIN_ACCESS,
      'X-Bin-Private': 'false',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('UPLOAD_FAILED');
  const json = await res.json();
  const binId = json && json.metadata && json.metadata.id;
  if (!binId) throw new Error('NO_BIN_ID');
  return `${VIEW_BASE}?id=${binId}`;
}

// 업로드 + 공유. 반환 { url, method }
export async function shareTrip(data) {
  const payload = buildSharePayload(data);
  const url = await createShareLink(payload);
  const title = `${data?.trip?.name || 'TripPay'} 여행 경비`;

  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'TripPay', text: title, url });
        return { url, method: 'share' };
      } catch (e) {
        // 취소/미지원 -> 복사로 폴백
      }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      return { url, method: 'copy' };
    }
    return { url, method: 'none' };
  }

  await Share.share({ message: `${title}\n${url}`, url });
  return { url, method: 'share' };
}
