import AsyncStorage from '@react-native-async-storage/async-storage';

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
    return raw ? JSON.parse(raw) : null;
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
