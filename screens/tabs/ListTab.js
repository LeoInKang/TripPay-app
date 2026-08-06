import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  Modal, Pressable, Platform, Dimensions
} from 'react-native';
import BottomSheet from '../../components/BottomSheet';
import DateField   from '../../components/DateField';
import SplitEditor, { splitErrorMessage } from '../../components/SplitEditor';
import { PAY_METHODS } from '../../constants';

// 정수 금액용 천단위 콤마 포맷
function fmtInt(v) {
  const digits = (v || '').toString().replace(/[^0-9]/g, '');
  if (!digits) return '';
  return parseInt(digits, 10).toLocaleString('ko-KR');
}

export default function ListTab({ trip, expenses, krwExps, setExpenses, setKrwExps, highlightIds = [] }) {
  const [filterDate, setFilterDate] = useState('all');
  const [filterPay, setFilterPay]   = useState('all');
  const sym = trip.country.sym;

  const allItems = [
    ...expenses.map(e => ({ ...e, type: 'fx' })),
    ...krwExps.map(e => ({ ...e, type: 'krw' })),
  ].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // 필터 옵션 추출
  const uniqueDates = [...new Set(allItems.map(i => i.date).filter(Boolean))].sort();
  const uniquePays  = [...new Set(allItems.filter(i => i.pay).map(i => i.pay))];

  const dateOptions = [
    { value: 'all', label: '전체 날짜' },
    ...uniqueDates.map(d => ({ value: d, label: d })),
  ];
  const payOptions = [
    { value: 'all', label: '전체 결제수단' },
    ...uniquePays.map(p => ({ value: p, label: p })),
    { value: 'krw', label: '원화 지출' },
  ];

  const filtered = allItems.filter(item => {
    if (filterDate !== 'all' && item.date !== filterDate) return false;
    if (filterPay !== 'all') {
      if (filterPay === 'krw' && item.type !== 'krw') return false;
      if (filterPay !== 'krw' && item.pay !== filterPay) return false;
    }
    return true;
  });

  // 방금 가져온 지출이 목록 아래쪽에 있으면 첫 하이라이트 항목이
  // 화면 중간쯤 오도록 한 번만 자동 스크롤한다.
  // 글자 줄바꿈으로 위 행들의 높이가 늦게 정해지면 초기 레이아웃의 y가 어긋나므로,
  // 잠시 기다렸다가 스크롤 시점에 위치를 다시 잰다.
  const scrollRef = useRef(null);
  const highlightRowRef = useRef(null);
  const autoScrolled = useRef(false);
  const firstHighlight = filtered.find(i => highlightIds.includes(i.id));
  useEffect(() => {
    if (!firstHighlight || autoScrolled.current) return;
    const t = setTimeout(() => {
      const row = highlightRowRef.current, sc = scrollRef.current;
      if (!row || !sc) return;
      autoScrolled.current = true;
      const isDom = typeof HTMLElement !== 'undefined' && sc instanceof HTMLElement;
      const go = (y) => {
        const top = Math.max(0, y - Dimensions.get('window').height * 0.3);
        if (isDom) sc.scrollTop = top; // 웹: ref가 DOM 노드 (smooth scrollTo가 무시되는 환경이 있어 직접 대입)
        else sc.scrollTo({ y: top, animated: true });
      };
      if (isDom && typeof row.offsetTop === 'number') {
        go(row.offsetTop);
      } else if (row.measureLayout && sc.getInnerViewNode) {
        row.measureLayout(sc.getInnerViewNode(), (x, y) => go(y), () => {});
      }
    }, 400);
    return () => clearTimeout(t);
  }, [firstHighlight ? firstHighlight.id : null]);

  const handleDelete = (item) => {
    if (item.type === 'fx') {
      setExpenses(expenses.filter(e => e.id !== item.id));
    } else {
      setKrwExps(krwExps.filter(e => e.id !== item.id));
    }
  };

  // 수정 모달 상태
  const [editItem, setEditItem] = useState(null); // { ...item, type }

  const handleSaveEdit = (draft) => {
    if (draft.type === 'fx') {
      setExpenses(expenses.map(e => e.id === draft.id
        ? { ...e, name: draft.name, amt: draft.amt, pay: draft.pay, date: draft.date, note: draft.note, participants: draft.participants, split: draft.split }
        : e));
    } else {
      setKrwExps(krwExps.map(e => e.id === draft.id
        ? { ...e, name: draft.name, amt: draft.amt, date: draft.date, note: draft.note, participants: draft.participants, split: draft.split }
        : e));
    }
    setEditItem(null);
  };

  const [confirmKey, setConfirmKey] = useState(null);
  const renderRowActions = (rowKey, item) => (
    confirmKey === rowKey ? (
      <View style={styles.delWrap}>
        <TouchableOpacity style={[styles.confirmBtn, styles.confirmYes]} onPress={() => { handleDelete(item); setConfirmKey(null); }}>
          <Text style={styles.confirmYesText}>삭제</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.confirmBtn, styles.confirmNo]} onPress={() => setConfirmKey(null)}>
          <Text style={styles.confirmNoText}>취소</Text>
        </TouchableOpacity>
      </View>
    ) : (
      <View style={styles.actWrap}>
        <TouchableOpacity style={styles.editBtn} onPress={() => setEditItem(item)} hitSlop={6}>
          <Text style={styles.editText}>수정</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.delBtn} onPress={() => setConfirmKey(rowKey)} hitSlop={6}>
          <Text style={styles.delText}>✕</Text>
        </TouchableOpacity>
      </View>
    )
  );

  return (
    <View style={styles.container}>
      {/* 필터 바 */}
      <View style={styles.filterBar}>
        <View style={styles.filterCol}>
          <BottomSheet
            label="날짜"
            value={filterDate}
            options={dateOptions}
            onChange={setFilterDate}
            title="날짜 선택"
          />
        </View>
        <View style={styles.filterCol}>
          <BottomSheet
            label="결제수단"
            value={filterPay}
            options={payOptions}
            onChange={setFilterPay}
            title="결제수단 선택"
          />
        </View>
      </View>

      <ScrollView ref={scrollRef} style={styles.list} contentContainerStyle={styles.listContent}>
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>지출 내역이 없어요</Text>
          </View>
        ) : (
          filtered.map(item => (
            <View
              key={item.id}
              ref={firstHighlight && firstHighlight.id === item.id ? highlightRowRef : undefined}
              style={[
                styles.row,
                highlightIds.includes(item.id) && styles.rowNew,
                editItem && editItem.id === item.id && styles.rowEditing,
              ]}
            >
              <View style={styles.info}>
                <View style={styles.nameLine}>
                  <Text style={styles.name}>{item.name}</Text>
                  {highlightIds.includes(item.id) && (
                    <View style={styles.badgeNew}>
                      <Text style={styles.badgeNewText}>새로 추가</Text>
                    </View>
                  )}
                  {item.type === 'krw' && (
                    <View style={styles.badgeKrw}>
                      <Text style={styles.badgeKrwText}>원화</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.sub}>
                  {item.date}{item.pay ? ' · ' + item.pay : ''}
                  {item.note ? ' · ' + item.note : ''}
                </Text>
              </View>
              <Text style={styles.amt}>
                {item.type === 'fx'
                  ? `${sym}${item.amt.toLocaleString('ko-KR')}`
                  : `₩${item.amt.toLocaleString('ko-KR')}`}
              </Text>
              {renderRowActions('i-' + item.type + '-' + item.id, item)}
            </View>
          ))
        )}
      </ScrollView>

      <EditExpenseModal
        item={editItem}
        sym={sym}
        payMethods={PAY_METHODS}
        members={trip.members}
        onClose={() => setEditItem(null)}
        onSave={handleSaveEdit}
      />
    </View>
  );
}

function EditExpenseModal({ item, sym, payMethods, members, onClose, onSave }) {
  const [name, setName]   = useState('');
  const [amt, setAmt]     = useState('');
  const [pay, setPay]     = useState('');
  const [date, setDate]   = useState('');
  const [note, setNote]   = useState('');
  const [splitVal, setSplitVal] = useState(null);

  useEffect(() => {
    if (item) {
      setName(item.name || '');
      setAmt(item.amt != null ? fmtInt(String(item.amt)) : '');
      setPay(item.pay || (payMethods[0] || ''));
      setDate(item.date || '');
      setNote(item.note || '');
      setSplitVal(
        (item.participants || item.split)
          ? { participants: item.participants || members, split: item.split || { mode: 'equal', values: {} } }
          : null
      );
    }
  }, [item]);

  if (!item) return null;
  const isFx = item.type === 'fx';

  const save = () => {
    if (!name) { notifyLocal('항목명을 입력해 주세요.'); return; }
    if (!amt)  { notifyLocal('금액을 입력해 주세요.'); return; }
    if (!date) { notifyLocal('날짜를 선택해 주세요.'); return; }
    const num = isFx
      ? parseFloat(amt.replace(/,/g, ''))
      : parseInt(amt.replace(/,/g, ''));
    const splitErr = splitErrorMessage(splitVal, num, isFx ? sym : '₩');
    if (splitErr) { notifyLocal(splitErr); return; }
    onSave({
      id: item.id,
      type: item.type,
      name,
      amt: num,
      pay: isFx ? pay : undefined,
      date,
      note,
      participants: splitVal ? splitVal.participants : undefined,
      split: splitVal ? splitVal.split : undefined,
    });
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>{isFx ? '외화 지출 수정' : '원화 지출 수정'}</Text>

          <ScrollView style={{ maxHeight: 460 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>항목명</Text>
            <TextInput style={styles.input} placeholder="항목명" value={name} onChangeText={setName} />

            <Text style={styles.label}>{isFx ? `금액(${sym})` : '금액(원화)'}</Text>
            <TextInput style={styles.input} placeholder="0" keyboardType="numeric" value={amt} onChangeText={v => setAmt(fmtInt(v))} />

            {isFx && (
              <>
                <Text style={styles.label}>결제수단</Text>
                <View style={styles.chipRow}>
                  {payMethods.map(m => (
                    <TouchableOpacity key={m} style={[styles.chip, pay === m && styles.chipSel]} onPress={() => setPay(m)}>
                      <Text style={[styles.chipText, pay === m && styles.chipTextSel]}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <View style={{ marginTop: 10 }}>
              <DateField label="날짜" value={date} onChange={setDate} />
            </View>

            <Text style={styles.label}>메모</Text>
            <TextInput style={styles.input} placeholder="선택" value={note} onChangeText={setNote} />

            <View style={{ marginTop: 10 }}>
              <SplitEditor members={members} value={splitVal} onChange={setSplitVal} sym={isFx ? sym : '₩'} amount={parseFloat((amt || '').replace(/,/g, '')) || 0} />
            </View>
          </ScrollView>

          <View style={styles.btnRow}>
            <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={onClose}>
              <Text style={styles.modalCancelText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, styles.modalSave]} onPress={save}>
              <Text style={styles.modalSaveText}>수정 저장</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function notifyLocal(msg) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(msg);
  } else {
    // eslint-disable-next-line no-alert
    alert(msg);
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0eee8' },

  filterBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  filterCol: { flex: 1 },

  list: { flex: 1 },
  listContent: { padding: 12, paddingBottom: 32 },

  empty: { alignItems: 'center', padding: 40 },
  emptyText: { color: '#9b9b9b', fontSize: 13 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  rowEditing: { borderColor: '#378ADD', borderWidth: 1.2 },
  rowNew: { backgroundColor: '#eef6ff', borderColor: 'rgba(55,138,221,0.5)' },
  badgeNew: {
    backgroundColor: '#378ADD',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeNewText: { fontSize: 9, color: '#fff', fontWeight: '700' },
  info: { flex: 1 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { fontSize: 13, fontWeight: '600', color: '#1a1a1a' },
  sub: { fontSize: 11, color: '#9b9b9b', marginTop: 2 },

  badgeKrw: {
    backgroundColor: '#e6f1fb',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeKrwText: { fontSize: 9, color: '#0c447c', fontWeight: '600' },
  badgePayer: {
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgePayerText: { fontSize: 9, color: '#6b6b6b', fontWeight: '600' },

  amt: { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },
  actWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 8 },
  editBtn: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: '#eef4fb' },
  editText: { fontSize: 12, color: '#0c447c', fontWeight: '700' },
  delBtn: { padding: 4 },
  delText: { fontSize: 13, color: '#c0413f', fontWeight: '700' },
  delWrap: { flexDirection: 'row', gap: 6, marginLeft: 8 },
  confirmBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  confirmYes: { backgroundColor: '#E24B4A' },
  confirmYesText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  confirmNo: { backgroundColor: '#f0f0f0' },
  confirmNoText: { color: '#6b6b6b', fontSize: 12, fontWeight: '600' },

  // 수정 모달
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    paddingHorizontal: 16,
    maxHeight: '88%',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e0e0e0', alignSelf: 'center', marginBottom: 12 },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginBottom: 12 },
  label: { fontSize: 11, fontWeight: '600', color: '#6b6b6b', marginBottom: 4, marginTop: 10 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 14,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8, backgroundColor: '#f0f0f0',
    borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.1)',
  },
  chipSel: { backgroundColor: '#1a3a5c', borderColor: '#1a3a5c' },
  chipText: { fontSize: 13, color: '#6b6b6b', fontWeight: '500' },
  chipTextSel: { color: '#fff', fontWeight: '700' },

  btnRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  modalBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  modalCancel: { backgroundColor: '#f0f0f0' },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: '#6b6b6b' },
  modalSave: { backgroundColor: '#1a3a5c' },
  modalSaveText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
