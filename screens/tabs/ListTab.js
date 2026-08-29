import React, { useState, useEffect, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  Modal, Pressable, Platform, Dimensions
} from 'react-native';
import BottomSheet from '../../components/BottomSheet';
import Segment     from '../../components/Segment';
import CurrencyPicker from '../../components/CurrencyPicker';
import KeyboardAvoider from '../../components/KeyboardAvoider';
import DateField   from '../../components/DateField';
import SplitEditor, { splitErrorMessage } from '../../components/SplitEditor';
import { PAY_METHODS, PAY_CREDIT } from '../../constants';
import { getAvgRate, makeToKrw, expenseKrw } from '../../settle';
import { fmtInt, fmtDec, toNum } from '../../format';
import { tripCurrencies, primaryCode, codeOfRecord } from '../../currency';

export default function ListTab({ trip, charges = [], exchanges = [], expenses, krwExps, setExpenses, setKrwExps, highlightIds = [] }) {
  const [filterDate, setFilterDate] = useState('all');
  const [filterPay, setFilterPay]   = useState('all');
  const sym = trip.country.sym;
  // 신용카드 건의 추정 원화를 보여주기 위한 환산 (settle.js 단일 출처)
  const toKrw = makeToKrw(getAvgRate(trip, charges, exchanges), trip.country.r100);

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
  // 글자 줄바꿈으로 위 행들의 위치가 늦게 정해질 수 있어 잠시 기다렸다가 스크롤한다.
  // 위치 측정: 네이티브는 onLayout(위치 변화도 다시 알려줌), 웹은 onLayout이
  // 위치 변화를 안 알려주므로 스크롤 시점에 DOM offsetTop을 읽는다.
  const scrollRef = useRef(null);
  const highlightRowRef = useRef(null);
  const highlightY = useRef(null);
  const autoScrolled = useRef(false);
  const firstHighlight = filtered.find(i => highlightIds.includes(i.id));
  const onHighlightLayout = (e) => { highlightY.current = e.nativeEvent.layout.y; };
  useEffect(() => {
    if (!firstHighlight || autoScrolled.current) return;
    const t = setTimeout(() => {
      const sc = scrollRef.current;
      if (!sc) return;
      const isWeb = Platform.OS === 'web';
      const row = highlightRowRef.current;
      const y = isWeb && row && typeof row.offsetTop === 'number' ? row.offsetTop : highlightY.current;
      if (y == null) return;
      autoScrolled.current = true;
      const top = Math.max(0, y - Dimensions.get('window').height * 0.3);
      if (isWeb) sc.scrollTop = top; // 웹: ref가 DOM 노드 (smooth scrollTo가 무시되는 환경이 있어 직접 대입)
      else sc.scrollTo({ y: top, animated: true });
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

  // 수정 저장. 통화가 바뀌면 지출을 반대쪽 목록으로 옮긴다
  // (외화는 expenses, 원화는 krwExps — 저장 위치가 다르다).
  const handleSaveEdit = (draft) => {
    const toFx = draft.newType === 'fx';

    // 공통 필드. 결제수단은 원화에서도 분류용으로 보관하고, 확정 원화는 외화 신용카드에만 남긴다.
    const build = (prev) => {
      const next = {
        ...prev,
        name: draft.name, amt: draft.amt, pay: draft.pay,
        date: draft.date, note: draft.note,
        participants: draft.participants, split: draft.split,
      };
      if (toFx && draft.pay === PAY_CREDIT && draft.krwActual > 0) next.krwActual = draft.krwActual;
      else delete next.krwActual;
      // 통화: 주 통화면 필드를 두지 않는다 (구버전과 같은 모양). 원화 지출에는 통화가 없다.
      if (toFx && draft.cur) next.cur = draft.cur;
      else delete next.cur;
      delete next.type; // 목록으로 구분하므로 항목에는 담지 않는다
      return next;
    };

    if (draft.type === draft.newType) {
      if (toFx) setExpenses(expenses.map(e => (e.id === draft.id ? build(e) : e)));
      else      setKrwExps(krwExps.map(e => (e.id === draft.id ? build(e) : e)));
    } else if (toFx) {
      const moved = build(krwExps.find(e => e.id === draft.id) || {});
      setKrwExps(krwExps.filter(e => e.id !== draft.id));
      setExpenses([...expenses, moved]);
    } else {
      const moved = build(expenses.find(e => e.id === draft.id) || {});
      setExpenses(expenses.filter(e => e.id !== draft.id));
      setKrwExps([...krwExps, moved]);
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

      <ScrollView
        ref={scrollRef}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
      >
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>지출 내역이 없어요</Text>
          </View>
        ) : (
          filtered.map(item => (
            <View
              key={item.id}
              ref={firstHighlight && firstHighlight.id === item.id ? highlightRowRef : undefined}
              onLayout={firstHighlight && firstHighlight.id === item.id ? onHighlightLayout : undefined}
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
                  {item.type === 'fx' && item.pay === PAY_CREDIT && !(item.krwActual > 0) && (
                    <View style={styles.badgeWait}>
                      <Text style={styles.badgeWaitText}>확정대기</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.sub}>
                  {item.date}{item.pay ? ' · ' + item.pay : ''}
                  {item.note ? ' · ' + item.note : ''}
                </Text>
              </View>
              <View style={styles.amtBox}>
                <Text style={styles.amt}>
                  {item.type === 'fx'
                    ? `${_symOfExp(item, trip, sym)}${item.amt.toLocaleString('ko-KR')}`
                    : `₩${item.amt.toLocaleString('ko-KR')}`}
                </Text>
                {item.type === 'fx' && item.pay === PAY_CREDIT && (
                  <Text style={[styles.amtKrw, item.krwActual > 0 && styles.amtKrwFixed]}>
                    {item.krwActual > 0
                      ? `₩${item.krwActual.toLocaleString('ko-KR')} 확정`
                      : `₩${expenseKrw(item, toKrw).toLocaleString('ko-KR')} 추정`}
                  </Text>
                )}
              </View>
              {renderRowActions('i-' + item.type + '-' + item.id, item)}
            </View>
          ))
        )}
      </ScrollView>

      <EditExpenseModal
          trip={trip}
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

// 외화 지출 한 건의 통화 기호 (cur 가 없으면 주 통화)
function _symOfExp(item, trip, fallback) {
  const list = tripCurrencies(trip);
  const code = codeOfRecord(item, trip);
  const hit = list.find(c => c.code === code);
  return (hit && hit.sym) || fallback;
}

function EditExpenseModal({ item, trip, sym, payMethods, members, onClose, onSave }) {
  // 안드로이드 제스처 바에 하단 버튼이 먹히지 않도록 실제 시스템 바 높이를 반영한다
  const insets = useSafeAreaInsets();
  const [name, setName]   = useState('');
  const [amt, setAmt]     = useState('');
  const [pay, setPay]     = useState('');
  // 통화는 수정에서 바꿀 수 있다. 바꾸면 저장 시 지출이 반대쪽 목록으로 옮겨간다
  // (외화는 expenses, 원화는 krwExps). 입력 기본값이 외화라 실수 여지가 있어 넣었다.
  const curList = tripCurrencies(trip);
  const home = primaryCode(trip);
  const multi = curList.length > 1;
  const [cur, setCur]     = useState(home);
  const [date, setDate]   = useState('');
  const [note, setNote]   = useState('');
  const [krwActual, setKrwActual] = useState('');
  const [splitVal, setSplitVal] = useState(null);

  useEffect(() => {
    if (item) {
      setName(item.name || '');
      setAmt(item.amt != null ? (item.type === 'fx' ? fmtDec(String(item.amt)) : fmtInt(String(item.amt))) : '');
      setPay(item.pay || (payMethods[0] || ''));
      setCur(item.type === 'fx' ? codeOfRecord(item, trip) : 'KRW');
      setDate(item.date || '');
      setNote(item.note || '');
      setKrwActual(item.krwActual > 0 ? fmtInt(String(item.krwActual)) : '');
      setSplitVal(
        (item.participants || item.split)
          ? { participants: item.participants || members, split: item.split || { mode: 'equal', values: {} } }
          : null
      );
    }
  }, [item]);

  if (!item) return null;
  const isFx = cur !== 'KRW';             // 화면·검증 기준 (사용자가 바꾼 값)
  const curObj = curList.find(c => c.code === cur) || curList[0] || {};
  const curSym = isFx ? (curObj.sym || sym) : '₩';
  const wasFx = item.type === 'fx';       // 원래 저장 위치

  const save = () => {
    if (!name) { notifyLocal('항목명을 입력해 주세요.'); return; }
    if (!amt)  { notifyLocal('금액을 입력해 주세요.'); return; }
    if (!date) { notifyLocal('날짜를 선택해 주세요.'); return; }
    const num = isFx ? toNum(amt) : Math.round(toNum(amt));
    const splitErr = splitErrorMessage(splitVal, num, isFx ? sym : '₩');
    if (splitErr) { notifyLocal(splitErr); return; }
    onSave({
      id: item.id,
      type: item.type,                       // 원래 목록
      newType: isFx ? 'fx' : 'krw',          // 저장할 목록
      name,
      amt: num,
      pay,                                   // 원화도 분류용으로 저장한다
      krwActual: isFx ? Math.round(toNum(krwActual)) : 0,
      cur: isFx && cur !== home ? cur : undefined,
      date,
      note,
      participants: splitVal ? splitVal.participants : undefined,
      split: splitVal ? splitVal.split : undefined,
    });
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      {/* Modal은 부모와 별도의 뷰 계층에 그려지므로 바깥(MainScreen)의 KeyboardAvoidingView가
          닿지 않는다. 키보드가 입력칸을 덮지 않도록 모달 안에서 다시 감싼다.
          iOS는 padding으로 밀어 올리고, 안드로이드는 app.json의 pan 모드가 창을 옮긴다. */}
      <KeyboardAvoider style={{ flex: 1 }}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]} onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>지출 수정</Text>

          {/* 입력 폼(AddTab)과 같은 순서·같은 컨트롤로 맞춘다.
              통화만 없다 — 외화는 expenses, 원화는 krwExps로 저장 위치가 갈려 수정에서 바꿀 수 없다. */}
          <ScrollView style={{ flexShrink: 1 }} keyboardShouldPersistTaps="handled">
            {/* 1줄: 날짜 | 항목명 */}
            <View style={styles.formRow}>
              <View style={[styles.col, { flex: 0.48 }]}>
                <DateField label="날짜" value={date} onChange={setDate} />
              </View>
              <View style={styles.col}>
                <Text style={styles.labelTop}>항목명</Text>
                <TextInput style={styles.input} placeholder="항목명" value={name} onChangeText={setName} />
              </View>
            </View>

            {/* 2줄: 통화 */}
            <View style={styles.formRow}>
              <View style={styles.col}>
                <CurrencyPicker
                  label="통화"
                  value={cur}
                  options={[
                    ...curList.map(c => ({ value: c.code, label: multi ? c.code : `외화 ${c.sym}` })),
                    { value: 'KRW', label: multi ? 'KRW' : '원화 ₩' },
                  ]}
                  onChange={(v) => {
                    if (v === cur) return;
                    setCur(v);
                    if (v === 'KRW') setKrwActual('');
                    // 원화는 정수뿐이라 소수점은 반올림해 정리한다
                    const n = toNum(amt);
                    if (n) setAmt(v !== 'KRW' ? fmtDec(String(n)) : fmtInt(String(Math.round(n))));
                    // 고정액은 금액 단위가 바뀌면 의미를 잃으므로 균등으로 되돌린다
                    setSplitVal(prev => (prev && prev.split && prev.split.mode === 'fixed')
                      ? { ...prev, split: { mode: 'equal', values: {} } }
                      : prev);
                  }}
                />
              </View>
            </View>

            {/* 3줄: 금액 | 결제수단 (원화의 결제수단은 분류용 — 차감처는 언제나 계좌) */}
            <View style={styles.formRow}>
              <View style={styles.col}>
                <Text style={styles.labelTop}>{isFx ? `금액(${curSym})` : '금액(원화)'}</Text>
                <TextInput style={styles.input} placeholder="0" keyboardType={isFx ? 'decimal-pad' : 'numeric'} value={amt} onChangeText={v => setAmt(isFx ? fmtDec(v) : fmtInt(v))} />
              </View>
              <View style={[styles.col, { flex: 1.6 }]}>
                <Segment
                  label="결제수단"
                  value={pay}
                  options={payMethods.map(m => ({ value: m, label: m }))}
                  onChange={setPay}
                />
              </View>
            </View>

            {/* 4줄: 확정 원화 (외화를 신용카드로 결제했을 때만) */}
            {isFx && pay === PAY_CREDIT && (
              <View style={styles.formRow}>
                <View style={styles.col}>
                  <Text style={styles.labelTop}>확정 원화 (선택)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="카드값 확정 후 실제 청구액"
                    keyboardType="numeric"
                    value={krwActual}
                    onChangeText={v => setKrwActual(fmtInt(v))}
                  />
                  <Text style={styles.modalHint}>
                    비워두면 평균환율로 추정해요. 넣으면 그 금액으로 정산돼요.
                  </Text>
                </View>
              </View>
            )}

            {/* 5줄: 메모 */}
            <View style={styles.formRow}>
              <View style={styles.col}>
                <Text style={styles.labelTop}>메모</Text>
                <TextInput style={styles.input} placeholder="선택" value={note} onChangeText={setNote} />
              </View>
            </View>

            <SplitEditor members={members} value={splitVal} onChange={setSplitVal} sym={isFx ? sym : '₩'} amount={toNum(amt)} />
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
      </KeyboardAvoider>
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
  badgeWait: {
    backgroundColor: '#FAEEDA',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeWaitText: { fontSize: 9, color: '#8a5a06', fontWeight: '700' },
  amtBox: { alignItems: 'flex-end' },
  amtKrw: { fontSize: 10, color: '#BA7517', fontWeight: '600', marginTop: 2 },
  amtKrwFixed: { color: '#1D9E75' },
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
    // paddingBottom은 sheet 렌더 시 안전 영역 값으로 덮어쓴다
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
  modalHint: { fontSize: 11, color: '#9b9b9b', lineHeight: 16, marginTop: 4 },
  formRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  col: { flex: 1 },
  labelTop: { fontSize: 11, fontWeight: '600', color: '#6b6b6b', marginBottom: 4 },
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
