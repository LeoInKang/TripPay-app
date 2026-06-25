import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

// 여행 데이터 -> JSON 문자열
export function buildTripJson(data) {
  const payload = {
    app: 'TripPay',
    version: 1,
    exportedAt: new Date().toISOString(),
    trip: data?.trip || null,
    deposits:  data?.deposits  || [],
    charges:   data?.charges   || [],
    exchanges: data?.exchanges || [],
    atms:      data?.atms      || [],
    refunds:   data?.refunds   || [],
    expenses:  data?.expenses  || [],
    krwExps:   data?.krwExps   || [],
  };
  return JSON.stringify(payload, null, 2);
}

// 내보내기: 웹은 브라우저 다운로드, 네이티브는 파일 저장 후 공유
export async function exportTripFile(data) {
  const json = buildTripJson(data);
  const safeName = (data?.trip?.name || 'trip').replace(/[^\w가-힣]+/g, '_');
  const filename = `TripPay_${safeName}.json`;

  if (Platform.OS === 'web') {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return true;
  }

  const uri = FileSystem.cacheDirectory + filename;
  await FileSystem.writeAsStringAsync(uri, json);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/json',
      dialogTitle: 'TripPay 데이터 내보내기',
    });
    return true;
  }
  return false;
}

// 가져오기: 파일 선택 -> 텍스트 읽기 -> 파싱/검증
export async function importTripFile() {
  const res = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (res.canceled) return null;
  const asset = res.assets && res.assets[0];
  if (!asset) return null;

  let text;
  if (Platform.OS === 'web') {
    if (asset.file && asset.file.text) {
      text = await asset.file.text();
    } else {
      const r = await fetch(asset.uri);
      text = await r.text();
    }
  } else {
    text = await FileSystem.readAsStringAsync(asset.uri);
  }

  const parsed = JSON.parse(text);
  if (!parsed || !parsed.trip) {
    throw new Error('INVALID');
  }
  return {
    trip: parsed.trip,
    deposits:  parsed.deposits  || [],
    charges:   parsed.charges   || [],
    exchanges: parsed.exchanges || [],
    atms:      parsed.atms      || [],
    refunds:   parsed.refunds   || [],
    expenses:  parsed.expenses  || [],
    krwExps:   parsed.krwExps   || [],
  };
}
