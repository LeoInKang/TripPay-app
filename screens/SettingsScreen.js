import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, SafeAreaView, Platform, Alert, StatusBar
} from 'react-native';
import KeyboardAvoider from '../components/KeyboardAvoider';
import DateField from '../components/FullDateField';
import CountryPicker from '../components/CountryPicker';
import ReorderList from '../components/ReorderList';
import { tripCountries, currencyHasData, primaryCode } from '../currency';

function notify(msg) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(msg);
  } else {
    Alert.alert('알림', msg);
  }
}

export default function SettingsScreen({ route, navigation }) {
  const {
    trip, onSave,
    deposits = [], charges = [], exchanges = [], atms = [], refunds = [],
    expenses = [], krwExps = [],
  } = route.params || {};

  const [tripName,  setTripName]  = useState(trip?.name || '');
  const [startDate, setStartDate] = useState(trip?.startDate || '');
  const [endDate,   setEndDate]   = useState(trip?.endDate || '');
  const [note,      setNote]      = useState(trip?.note || '');
  // orig = 저장된 원래 이름(신규는 null). 이름을 바꾸면 저장 시 renames로 내역까지 전파된다.
  const [memberRows, setMemberRows] = useState((trip?.members || []).map(m => ({ orig: m, name: m })));
  const [newMember, setNewMember] = useState('');
  // 거쳐 간 나라 목록. 통화가 겹쳐도 그대로 둔다(이탈리아·프랑스).
  // 순서는 표시용이라 자유롭게 옮길 수 있다 (입력할 때 맨 앞 통화가 먼저 골라진다).
  const [countries, setCountries] = useState(() => tripCountries(trip));
  const [picking, setPicking] = useState(false);
  // 순서를 끄는 동안에는 화면 스크롤을 잠근다 (안 그러면 ScrollView가 터치를 가로챈다)
  const [dragging, setDragging] = useState(false);
  const homeCode = primaryCode(trip);
  const [editIdx,   setEditIdx]   = useState(null);
  const [editName,  setEditName]  = useState('');

  // 삭제 가능 여부: 회비 또는 지출(참여자·분담값)에 참조된 멤버는 삭제 불가
  const memberHasData = (m) => {
    if (deposits.some(d => d.mem === m)) return true;
    const inExp = (list) => list.some(e =>
      (e.participants && e.participants.includes(m)) ||
      (e.split && e.split.values && e.split.values[m] != null)
    );
    return inExp(expenses) || inExp(krwExps);
  };

  const tripData = { deposits, charges, exchanges, atms, refunds, expenses, krwExps };
  // 같은 통화를 쓰는 다른 나라는 뺄 수 있다 — 그 통화를 쓰는 나라가 하나도 안 남을 때만 막는다.
  const removeCountry = (i) => {
    const gone = countries[i];
    if (countries.length <= 1) {
      notify('여행 국가는 하나 이상 있어야 해요.');
      return;
    }
    const stillUsed = countries.some((c, j) => j !== i && c.code === gone.code);
    if (!stillUsed && currencyHasData(trip, gone.code, tripData)) {
      notify(`${gone.code}로 기록된 내역이 있어서 뺄 수 없어요.\n내역을 지우거나 통화를 바꾼 뒤 다시 시도해 주세요.`);
      return;
    }
    setCountries(countries.filter((_, j) => j !== i));
  };

  const addMember = () => {
    const name = newMember.trim();
    if (!name) return;
    if (memberRows.some(r => r.name === name)) { notify('이미 있는 참석자예요.'); return; }
    setMemberRows([...memberRows, { orig: null, name }]);
    setNewMember('');
  };
  const removeMember = (idx) => {
    if (memberRows.length <= 1) { notify('참석자는 최소 1명이 필요해요.'); return; }
    const row = memberRows[idx];
    // 내역은 저장된 원래 이름으로 참조되므로 orig 기준으로 검사한다
    if (memberHasData(row.orig || row.name)) {
      notify(`${row.name}님은 회비·지출 내역이 있어 삭제할 수 없어요. 내역을 먼저 정리해 주세요.`);
      return;
    }
    if (editIdx === idx) setEditIdx(null);
    setMemberRows(memberRows.filter((_, j) => j !== idx));
  };

  const startRename = (idx) => {
    setEditIdx(idx);
    setEditName(memberRows[idx].name);
  };
  const confirmRename = () => {
    const name = editName.trim();
    if (!name) { notify('이름을 입력해 주세요.'); return; }
    if (memberRows.some((r, j) => j !== editIdx && r.name === name)) { notify('이미 있는 참석자예요.'); return; }
    setMemberRows(rows => rows.map((r, j) => (j === editIdx ? { ...r, name } : r)));
    setEditIdx(null);
  };

  // 시작일 선택 시 종료일이 비어 있으면 다음날로 자동 설정
  const nextDay = (ymd) => {
    if (!ymd) return '';
    const d = new Date(ymd + 'T00:00:00');
    if (isNaN(d)) return '';
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const handleStartDate = (v) => {
    setStartDate(v);
    if (!endDate) setEndDate(nextDay(v));
  };

  const handleSave = () => {
    if (!tripName.trim()) {
      notify('여행명을 입력해 주세요.');
      return;
    }
    if (editIdx != null) { notify('참석자 이름 수정을 먼저 완료해 주세요.'); return; }
    const names = memberRows.map(r => r.name.trim()).filter(Boolean);
    if (!names.length) { notify('참석자를 최소 1명 입력해 주세요.'); return; }
    if (new Set(names).size !== names.length) { notify('참석자 이름이 겹쳐요.'); return; }

    // 이름이 바뀐 기존 참석자 → 저장 시 회비·지출 내역의 참조도 함께 바꾼다
    const renames = {};
    memberRows.forEach(r => { if (r.orig && r.orig !== r.name) renames[r.orig] = r.name; });

    const updated = {
      ...trip,
      name: tripName.trim(),
      startDate,
      endDate,
      note,
      members: names,
      countries,
      // homeCode는 통화가 안 적힌 옛 기록을 읽는 기준이라 손대지 않고 그대로 넘긴다.
      // 바꾸면 그 기록들의 통화가 통째로 달라진다 (currency.js primaryCode 주석 참조).
      homeCode,
    };
    const renamedOld = (trip?.members || []).map(m => renames[m] || m);
    const added = names.filter(n => !renamedOld.includes(n));

    const finish = (retro) => {
      if (onSave) onSave(updated, retro, renames);
      navigation.goBack();
    };

    if (added.length === 0) { finish(false); return; }

    const msg = `새 참석자(${added.join(', ')})를 기존 '전원 균등' 지출에도 소급 적용할까요?\n(개별 지출은 내역에서 따로 조정할 수 있어요)`;
    if (Platform.OS === 'web') {
      finish(typeof window !== 'undefined'
        ? window.confirm(msg + '\n\n확인 = 소급 적용 / 취소 = 이후 지출부터')
        : false);
    } else {
      Alert.alert('참석자 추가', msg, [
        { text: '이후 지출부터', onPress: () => finish(false) },
        { text: '소급 적용', onPress: () => finish(true) },
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.sideBtn}>
          <Text style={styles.backText}>‹ 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title}>여행 설정</Text>
        <View style={styles.sideBtn} />
      </View>

      <KeyboardAvoider style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" scrollEnabled={!dragging}>
        <View style={styles.field}>
          <Text style={styles.label}>여행명</Text>
          <TextInput
            style={styles.input}
            placeholder="여행명"
            value={tripName}
            onChangeText={setTripName}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.field, { flex: 1, marginRight: 8 }]}>
            <DateField label="시작일" value={startDate} onChange={handleStartDate} />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <DateField label="종료일" value={endDate} onChange={setEndDate} />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>메모 (선택)</Text>
          <TextInput
            style={styles.input}
            placeholder="메모"
            value={note}
            onChangeText={setNote}
          />
        </View>

        {/* 참석자 편집 */}
        <View style={styles.field}>
          <Text style={styles.label}>참석자</Text>
          {memberRows.map((row, i) => (
            <View key={`m-${i}`} style={[styles.memberRow, editIdx === i && styles.memberRowEditing]}>
              {editIdx === i ? (
                <>
                  <TextInput
                    style={styles.memberInput}
                    value={editName}
                    onChangeText={setEditName}
                    onSubmitEditing={confirmRename}
                    returnKeyType="done"
                    autoFocus
                  />
                  <TouchableOpacity onPress={confirmRename} style={styles.memberOkBtn} hitSlop={6}>
                    <Text style={styles.memberOkText}>확인</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setEditIdx(null)} style={styles.memberDel} hitSlop={8}>
                    <Text style={styles.memberCancelText}>취소</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.memberName}>
                    {row.name}
                    {row.orig && row.orig !== row.name ? <Text style={styles.renamedMark}>  (변경됨)</Text> : null}
                  </Text>
                  <View style={styles.memberActions}>
                    <TouchableOpacity onPress={() => startRename(i)} style={styles.memberEditBtn} hitSlop={6}>
                      <Text style={styles.memberEditText}>수정</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeMember(i)} style={styles.memberDel} hitSlop={8}>
                      <Text style={styles.memberDelText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          ))}
          <View style={styles.addRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="참석자 추가"
              value={newMember}
              onChangeText={setNewMember}
              onSubmitEditing={addMember}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.addBtn} onPress={addMember} activeOpacity={0.85}>
              <Text style={styles.addBtnText}>추가</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.infoHint}>
            여행 중 추가한 참석자는 이후 지출부터 반영돼요. 회비·지출 내역이 있는 참석자는 삭제할 수 없어요.
            이름을 수정하면 저장 시 회비·지출 내역의 이름도 함께 바뀌어요.
          </Text>
        </View>

        {/* 여행 국가 — 통화가 겹쳐도 나라는 각자 보인다. 순서는 표시용이라 자유롭게 옮긴다. */}
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>여행 국가</Text>

          <ReorderList
            data={countries}
            onChange={setCountries}
            onDragging={setDragging}
            rowHeight={46}
            renderRow={(c, i) => (
              <>
                <Text style={styles.curName}>{c.flag || '🌏'} {c.name || ''}</Text>
                {/* 심볼이 코드와 같은 통화가 있다(CHF). 다를 때만 덧붙인다. */}
                <Text style={styles.curCode}>{c.sym && c.sym !== c.code ? `${c.code} ${c.sym}` : c.code}</Text>
                <TouchableOpacity onPress={() => removeCountry(i)} hitSlop={10}>
                  <Text style={styles.curDel}>✕</Text>
                </TouchableOpacity>
              </>
            )}
          />

          <TouchableOpacity style={styles.btnAddCur} onPress={() => setPicking(true)} activeOpacity={0.8}>
            <Text style={styles.btnAddCurText}>+ 국가 추가</Text>
          </TouchableOpacity>

          {picking && (
            <CountryPicker
              multi
              openNow
              value={countries}
              onChange={setCountries}
              onClose={() => setPicking(false)}
              title="여행 국가 선택 (여러 개 가능)"
            />
          )}

          <Text style={styles.infoHint}>
            왼쪽 손잡이를 끌어 순서를 바꿀 수 있어요. 맨 앞 통화가 입력할 때 먼저 골라집니다.{'\n'}
            통화가 같은 나라는 지출 입력에서 하나로 묶입니다. 기록이 있는 통화는 뺄 수 없습니다.
          </Text>
        </View>

        <TouchableOpacity style={styles.btnSave} onPress={handleSave} activeOpacity={0.85}>
          <Text style={styles.btnSaveText}>저장</Text>
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f0',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f0eee8',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  sideBtn: { minWidth: 56 },
  backText: { fontSize: 14, color: '#1a3a5c', fontWeight: '600' },
  title: { fontSize: 16, fontWeight: '800', color: '#1a1a1a' },

  scroll: { padding: 20, paddingBottom: 40 },
  field: { marginBottom: 16 },
  row: { flexDirection: 'row' },
  label: { fontSize: 13, fontWeight: '600', color: '#6b6b6b', marginBottom: 6 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.15)',
    padding: 12,
    fontSize: 15,
    color: '#1a1a1a',
  },

  infoBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.1)',
    padding: 12,
    marginBottom: 16,
  },
  infoLabel: { fontSize: 11, color: '#9b9b9b', marginBottom: 4 },
  infoValue: { fontSize: 14, color: '#1a1a1a', fontWeight: '600' },
  infoHint: { fontSize: 11, color: '#9b9b9b', marginTop: 6, lineHeight: 16 },

  curName: { fontSize: 14, color: '#1a1a1a', fontWeight: '600', flex: 1 },
  curCode: { fontSize: 12, color: '#9b9b9b', marginRight: 10 },
  curBadge: { fontSize: 11, color: '#1a3a5c', backgroundColor: '#e6eefa', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  curDel: { fontSize: 14, color: '#E24B4A', paddingHorizontal: 6 },
  btnAddCur: {
    marginTop: 10, paddingVertical: 10, borderRadius: 10,
    borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.15)', alignItems: 'center', backgroundColor: '#fafafa',
  },
  btnAddCurText: { fontSize: 13, color: '#1a3a5c', fontWeight: '600' },
  curCancel: { fontSize: 12, color: '#9b9b9b', marginTop: 6, textAlign: 'center' },

  memberRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 10, borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.12)',
    paddingHorizontal: 12, paddingVertical: 11, marginBottom: 6,
  },
  memberRowEditing: { borderColor: '#378ADD', borderWidth: 1.2 },
  memberName: { fontSize: 15, color: '#1a1a1a', fontWeight: '500', flex: 1 },
  renamedMark: { fontSize: 12, color: '#378ADD', fontWeight: '600' },
  memberActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  memberEditBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#eef4fb' },
  memberEditText: { fontSize: 12, color: '#0c447c', fontWeight: '700' },
  memberInput: {
    flex: 1, fontSize: 15, color: '#1a1a1a', paddingVertical: 2, paddingHorizontal: 0, marginRight: 8,
  },
  memberOkBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#1a3a5c', marginRight: 4 },
  memberOkText: { fontSize: 12, color: '#fff', fontWeight: '700' },
  memberCancelText: { fontSize: 12, color: '#6b6b6b', fontWeight: '600' },
  memberDel: { paddingHorizontal: 6, paddingVertical: 2 },
  memberDelText: { fontSize: 15, color: '#c0413f', fontWeight: '700' },
  addRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  addBtn: { backgroundColor: '#1a3a5c', borderRadius: 10, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  btnSave: {
    backgroundColor: '#1a3a5c',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnSaveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
