import AsyncStorage from '@react-native-async-storage/async-storage';
import { migrateTripData } from './migrate.js';

const KEY_INDEX   = 'trippay:trips';
const KEY_CURRENT = 'trippay:currentTripId';
const tripKey = (id) => `trippay:trip:${id}`;

// 여행별 전체 데이터 저장 + 목록(index) 갱신
export async function saveTripData(tripId, data) {
  if (!tripId) return;
  try {
    await AsyncStorage.setItem(tripKey(tripId), JSON.stringify(data));
    const list = await listTrips();
    const meta = {
      id: tripId,
      name: data?.trip?.name || '',
      country: data?.trip?.country || null,
      // 다통화 여행을 목록만 보고 판별할 수 있어야 한다 (AI 가져오기의 통화 대조).
      // 옛 목록에는 없으므로 읽는 쪽이 country 로 폴백한다.
      countries: data?.trip?.countries || null,
      startDate: data?.trip?.startDate || '',
      endDate: data?.trip?.endDate || '',
      members: data?.trip?.members || [],
      note: data?.trip?.note || '',
      updatedAt: Date.now(),
    };
    const next = [meta, ...list.filter(t => t.id !== tripId)];
    await AsyncStorage.setItem(KEY_INDEX, JSON.stringify(next));
  } catch (e) {
    console.warn('saveTripData failed', e);
  }
}

export async function loadTripData(tripId) {
  if (!tripId) return null;
  try {
    const raw = await AsyncStorage.getItem(tripKey(tripId));
    // 옛 스키마로 저장된 데이터도 여기서 현재 형태로 맞춰 내보낸다.
    // (저장은 MainScreen의 자동저장이 하므로 변환분은 다음 저장 때 기록된다)
    return raw ? migrateTripData(JSON.parse(raw)) : null;
  } catch (e) {
    console.warn('loadTripData failed', e);
    return null;
  }
}

export async function deleteTripData(tripId) {
  if (!tripId) return;
  try {
    await AsyncStorage.removeItem(tripKey(tripId));
    const list = await listTrips();
    await AsyncStorage.setItem(KEY_INDEX, JSON.stringify(list.filter(t => t.id !== tripId)));
    const cur = await getCurrentTripId();
    if (cur === tripId) await clearCurrentTripId();
  } catch (e) {
    console.warn('deleteTripData failed', e);
  }
}

// 히스토리 화면에서 쓸 여행 목록 (최근 수정순)
export async function listTrips() {
  try {
    const raw = await AsyncStorage.getItem(KEY_INDEX);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('listTrips failed', e);
    return [];
  }
}

// 현재(활성) 여행 id - 앱 재시작 시 자동 복원에 사용
export async function setCurrentTripId(tripId) {
  try { await AsyncStorage.setItem(KEY_CURRENT, String(tripId)); } catch (e) {}
}
export async function getCurrentTripId() {
  try { return await AsyncStorage.getItem(KEY_CURRENT); } catch (e) { return null; }
}
export async function clearCurrentTripId() {
  try { await AsyncStorage.removeItem(KEY_CURRENT); } catch (e) {}
}
