import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Modal, Pressable, ScrollView, Platform
} from 'react-native';
import KeyboardAvoider from './KeyboardAvoider';
import { COUNTRIES, REGIONS, searchCountries } from '../countries';

// 검색 + 자주 가는 국가 + 지역별 그룹 바텀시트
export default function CountryPicker({
  value, onChange, label = '여행 국가',
  multi = false,        // 여러 국가를 한 번에 고른다 (value·onChange가 배열)
  openNow = false,      // 트리거 없이 바로 열기
  onClose,              // 바로 열기로 썼을 때 닫힘 알림
  title = '여행 국가 선택',
}) {
  const [open, setOpen] = useState(!!openNow);
  const [q, setQ] = useState('');

  // 같은 나라를 두 번 담지 않도록 이름+코드로 구분한다 (이탈리아·프랑스는 코드가 같다)
  const keyOf = (c) => (c ? `${c.code}|${c.name}` : '');
  const picked = multi ? (Array.isArray(value) ? value : []) : [];
  const isOn = (c) => (multi ? picked.some(x => keyOf(x) === keyOf(c)) : value?.code === c.code);

  const close = () => { setOpen(false); setQ(''); if (onClose) onClose(); };

  const results = searchCountries(q);
  const searching = q.trim().length > 0;
  const pick = (c) => {
    if (!multi) { onChange(c); close(); return; }
    onChange(isOn(c) ? picked.filter(x => keyOf(x) !== keyOf(c)) : [...picked, c]);
  };

  return (
    <View>
      {!openNow && <Text style={styles.label}>{label}</Text>}
      {!openNow && (
      <TouchableOpacity style={styles.trigger} activeOpacity={0.7} onPress={() => setOpen(true)}>
        {value ? (
          <Text style={styles.triggerText}>
            {value.flag} {value.name} <Text style={styles.triggerSub}>{value.code} {value.sym}</Text>
          </Text>
        ) : (
          <Text style={styles.triggerPlaceholder}>국가를 선택하세요</Text>
        )}
        <Text style={styles.chev}>▾</Text>
      </TouchableOpacity>
      )}

      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        {/* 검색창이 키보드에 가리지 않도록 모달 안에서 감싼다 (Modal은 별도 뷰 계층) */}
        <KeyboardAvoider style={{ flex: 1 }}>
        <Pressable style={styles.backdrop} onPress={close}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>{title}</Text>

            <View style={styles.searchBox}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="국가·통화 검색 (예: 일본, JPY)"
                value={q}
                onChangeText={setQ}
                autoCorrect={false}
              />
              {q.length > 0 && (
                <TouchableOpacity onPress={() => setQ('')} hitSlop={8}>
                  <Text style={styles.clear}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.list} keyboardShouldPersistTaps="always">
              {searching ? (
                results.length === 0 ? (
                  <Text style={styles.empty}>검색 결과가 없어요</Text>
                ) : (
                  results.map(c => (
                    <Row key={'s-' + c.code + c.name} c={c} selected={isOn(c)} onPress={() => pick(c)} />
                  ))
                )
              ) : (
                REGIONS.map(region => {
                  const list = COUNTRIES.filter(c => c.region === region);
                  if (!list.length) return null;
                  return (
                    <View key={region}>
                      <Text style={styles.groupLabel}>{region}</Text>
                      {list.map(c => (
                        <Row key={c.code + c.name} c={c} selected={isOn(c)} onPress={() => pick(c)} />
                      ))}
                    </View>
                  );
                })
              )}
              <View style={{ height: 20 }} />
            </ScrollView>

            {multi && (
              <TouchableOpacity style={styles.doneBtn} onPress={close} activeOpacity={0.85}>
                <Text style={styles.doneText}>
                  {picked.length > 0 ? `${picked.length}개 선택 · 완료` : '완료'}
                </Text>
              </TouchableOpacity>
            )}
          </Pressable>
        </Pressable>
        </KeyboardAvoider>
      </Modal>
    </View>
  );
}

function Row({ c, selected, onPress }) {
  return (
    <TouchableOpacity style={[styles.row, selected && styles.rowOn]} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.rowFlag}>{c.flag}</Text>
      <Text style={[styles.rowName, selected && styles.rowNameOn]}>{c.name}</Text>
      <Text style={styles.rowCode}>{c.code} {c.sym}</Text>
      {selected && <Text style={styles.check}>✓</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: '#6b6b6b', marginBottom: 6 },
  trigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 10, borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.15)',
    paddingHorizontal: 12, paddingVertical: 13,
  },
  triggerText: { fontSize: 15, color: '#1a1a1a', fontWeight: '600' },
  triggerSub: { fontSize: 13, color: '#9b9b9b', fontWeight: '400' },
  triggerPlaceholder: { fontSize: 15, color: '#b0b0b0' },
  chev: { fontSize: 12, color: '#9b9b9b' },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 8, paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    maxHeight: '85%',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e0e0e0', alignSelf: 'center', marginBottom: 12 },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginBottom: 12 },
  doneBtn: {
    backgroundColor: '#1a3a5c', borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginTop: 8,
  },
  doneText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.15)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 11 : 4,
    marginBottom: 10,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 14, color: '#1a1a1a' },
  clear: { fontSize: 14, color: '#9b9b9b', paddingHorizontal: 2 },

  list: { maxHeight: 460 },
  groupLabel: { fontSize: 11, color: '#9b9b9b', fontWeight: '600', marginTop: 10, marginBottom: 6 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 11, borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  rowOn: { backgroundColor: '#f0f6ff' },
  rowFlag: { fontSize: 18 },
  rowName: { flex: 1, fontSize: 14, color: '#1a1a1a' },
  rowNameOn: { color: '#0c447c', fontWeight: '700' },
  rowCode: { fontSize: 12, color: '#9b9b9b' },
  check: { fontSize: 14, color: '#378ADD', fontWeight: '700' },
  empty: { fontSize: 13, color: '#9b9b9b', textAlign: 'center', paddingVertical: 30 },
});
