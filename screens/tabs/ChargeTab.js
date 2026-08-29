import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Platform, Alert
} from 'react-native';
import DateField from '../../components/DateField';
import CurrencyPicker from '../../components/CurrencyPicker';
import { fmtInt, fmtDec, decOnly, toNum, trimDec } from '../../format';
import { tripCurrencies, defaultCode, codeOfRecord, currencyLabel } from '../../currency';

function notify(msg) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(msg);
  } else {
    Alert.alert('알림', msg);
  }
}

// 폼의 통화 상태. 통화가 하나뿐이면 선택 UI를 숨기고 주 통화를 그대로 쓴다.
function useFormCurrency(trip, lastCur, setLastCur) {
  const list = tripCurrencies(trip);
  const home = defaultCode(trip);   // 처음 골라 둘 통화
  // 마지막에 쓴 통화로 시작한다 (원화는 충전·환전에 없으므로 외화만 이어받는다)
  const start = lastCur && lastCur !== 'KRW' && list.some(c => c.code === lastCur) ? lastCur : home;
  const [cur, setCurRaw] = useState(start);
  const setCur = (c) => { setCurRaw(c); if (setLastCur) setLastCur(c); };
  const obj = list.find(c => c.code === cur) || list[0] || {};
  return {
    cur, setCur, home,
    list,
    multi: list.length > 1,
    sym: obj.sym || '',
    r100: !!obj.r100,
    exRate: obj.exRate,
    field: { cur },   // 통화는 항상 적는다
  };
}

function CurrencyPick({ c }) {
  if (!c.multi) return null;
  const options = c.list.map(x => ({ value: x.code, label: currencyLabel(x.code, x.sym) }));
  return (
    <View style={styles.formRow}>
      <View style={styles.col}>
        <CurrencyPicker label="통화" value={c.cur} options={options} onChange={c.setCur} />
      </View>
    </View>
  );
}

// 원화·외화·환율 셋 중 둘을 알면 나머지 하나를 채운다.
// recent = 사용자가 마지막에 건드린 두 칸. 그 둘은 그대로 두고 남은 하나만 계산한다.
// r100 통화는 환율이 100단위 고시라 환산에서 /100·×100이 붙는다.
function fillFxTriple({ krw, local, rate }, recent, r100) {
  const target = ['krw', 'local', 'rate'].find(f => !recent.includes(f));
  if (!target) return null;
  const k = toNum(krw), l = toNum(local), r = toNum(rate);

  if (target === 'rate')  return (k && l) ? { rate:  ((r100 ? k * 100 : k) / l).toFixed(2) } : null;
  if (target === 'krw')   return (l && r) ? { krw:   fmtInt(String(Math.round(r100 ? l * r / 100 : l * r))) } : null;
  return (k && r) ? { local: fmtDec(trimDec((r100 ? k * 100 : k) / r)) } : null;
}

// 원화·외화·환율 세 칸을 함께 다루는 폼 상태. 카드충전·현금환전·카드잔액이전이 공유한다.
function useFxTriple(r100) {
  const [krw, setKrw]     = useState('');
  const [local, setLocal] = useState('');
  const [rate, setRate]   = useState('');
  const recent = useRef([]);
  const setters = { krw: setKrw, local: setLocal, rate: setRate };

  // 한 칸을 입력하면 그 칸과 직전에 건드린 칸을 기준으로 나머지 하나를 채운다.
  const edit = (field, raw) => {
    const shown = field === 'krw' ? fmtInt(raw) : field === 'local' ? fmtDec(raw) : decOnly(raw);
    setters[field](shown);
    recent.current = [field, ...recent.current.filter(f => f !== field)].slice(0, 2);
    const filled = fillFxTriple({ krw, local, rate, [field]: shown }, recent.current, r100);
    if (filled) {
      const [f, v] = Object.entries(filled)[0];
      setters[f](v);
    }
  };

  // 수정 진입·초기화: 계산 없이 값만 세운다. 직후 한 칸을 고치면 남은 둘 중 하나가 다시 계산된다.
  const load = (v = {}) => {
    setKrw(v.krw || ''); setLocal(v.local || ''); setRate(v.rate || '');
    recent.current = [];
  };

  return { krw, local, rate, edit, load, reset: () => load() };
}

const SUB_TABS = [
  { id: 'charge',   icon: '💳', label: '카드충전' },
  { id: 'exchange', icon: '🔄', label: '현금환전' },
  { id: 'atm',      icon: '🏧', label: 'ATM인출' },
  { id: 'refund',   icon: '↩', label: '카드잔액이전' },
];

export default function ChargeTab({
  trip, charges, exchanges, atms, refunds,
  setCharges, setExchanges, setAtms, setRefunds,
  lastCur, setLastCur,
}) {
  const [subTab, setSubTab] = useState('charge');
  const [editTarget, setEditTarget] = useState(null); // { type, item }

  // 내역 한 줄은 그 건의 통화로 표시한다 (cur 없으면 주 통화)
  const curList = tripCurrencies(trip);
  const curOf = (item) => curList.find(x => x.code === codeOfRecord(item, trip)) || curList[0] || {};
  const symOf  = (item) => curOf(item).sym || '';
  const r100Of = (item) => !!curOf(item).r100;

  // 목록이 길어지면 아래로 스크롤한 상태에서 '수정'을 눌러도 상단 폼이 안 보인다.
  // 수정 진입 시 폼 위치로 올려준다.
  const scrollRef = useRef(null);
  const startEdit = (type, item) => {
    setEditTarget({ type, item });
    setSubTab(type);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };
  const clearEdit = () => setEditTarget(null);
  const editItemFor = (type) => (editTarget && editTarget.type === type ? editTarget.item : null);

  const [confirmKey, setConfirmKey] = useState(null);
  const renderRowActions = (rowKey, onEdit, onDelete) => (
    confirmKey === rowKey ? (
      <View style={styles.delWrap}>
        <TouchableOpacity style={[styles.confirmBtn, styles.confirmYes]} onPress={() => { onDelete(); setConfirmKey(null); }}>
          <Text style={styles.confirmYesText}>삭제</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.confirmBtn, styles.confirmNo]} onPress={() => setConfirmKey(null)}>
          <Text style={styles.confirmNoText}>취소</Text>
        </TouchableOpacity>
      </View>
    ) : (
      <View style={styles.actWrap}>
        <TouchableOpacity style={styles.editBtn} onPress={onEdit} hitSlop={6}>
          <Text style={styles.editText}>수정</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.delBtn} onPress={() => setConfirmKey(rowKey)} hitSlop={6}>
          <Text style={styles.delText}>✕</Text>
        </TouchableOpacity>
      </View>
    )
  );

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* 서브 탭 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subTabScroll}>
        {SUB_TABS.map(t => (
          <TouchableOpacity
            key={t.id}
            style={[styles.subTab, subTab === t.id && styles.subTabActive]}
            onPress={() => setSubTab(t.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.subTabIcon}>{t.icon}</Text>
            <Text style={[styles.subTabText, subTab === t.id && styles.subTabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {subTab === 'charge'   && <ChargeForm   {...{ trip, charges, setCharges, lastCur, setLastCur, editItem: editItemFor('charge'), onDone: clearEdit }} />}
      {subTab === 'exchange' && <ExchangeForm {...{ trip, exchanges, setExchanges, lastCur, setLastCur, editItem: editItemFor('exchange'), onDone: clearEdit }} />}
      {subTab === 'atm'      && <AtmForm      {...{ trip, atms, setAtms, lastCur, setLastCur, editItem: editItemFor('atm'), onDone: clearEdit }} />}
      {subTab === 'refund'   && <RefundForm   {...{ trip, refunds, setRefunds, lastCur, setLastCur, editItem: editItemFor('refund'), onDone: clearEdit }} />}

      {/* 전체 내역 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>충전 / 환전 / ATM / 계좌이전 내역</Text>
        {charges.length + exchanges.length + atms.length + refunds.length === 0 ? (
          <Text style={styles.empty}>없습니다</Text>
        ) : (
          <>
            {charges.map(c => (
              <View key={'c-' + c.id} style={[styles.itemRow, editTarget && editTarget.type==='charge' && editTarget.item.id===c.id && styles.itemRowEditing]}>
                <Text style={styles.itemIcon}>💳</Text>
                <View style={styles.itemInfo}>
                  <View style={styles.itemNameLine}>
                    <Text style={styles.itemName}>카드 충전</Text>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{codeOfRecord(c, trip)}</Text>
                    </View>
                  </View>
                  <Text style={styles.itemSub}>
                    {c.date} · ₩{c.krw.toLocaleString('ko-KR')} → {symOf(c)}{c.local.toLocaleString('ko-KR')} · 환율 {r100Of(c) ? '100' : '1'}{symOf(c)}={c.rate}원
                  </Text>
                </View>
                <Text style={styles.itemAmt}>{symOf(c)}{c.local.toLocaleString('ko-KR')}</Text>
                {renderRowActions('c-' + c.id, () => startEdit('charge', c), () => { setCharges(charges.filter(x => x.id !== c.id)); if(editTarget&&editTarget.item.id===c.id) clearEdit(); })}
              </View>
            ))}
            {exchanges.map(e => (
              <View key={'e-' + e.id} style={[styles.itemRow, editTarget && editTarget.type==='exchange' && editTarget.item.id===e.id && styles.itemRowEditing]}>
                <Text style={styles.itemIcon}>🔄</Text>
                <View style={styles.itemInfo}>
                  <View style={styles.itemNameLine}>
                    <Text style={styles.itemName}>현금 환전</Text>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{codeOfRecord(e, trip)}</Text>
                    </View>
                  </View>
                  <Text style={styles.itemSub}>
                    {e.date} · ₩{e.krw.toLocaleString('ko-KR')} → {symOf(e)}{e.local.toLocaleString('ko-KR')} · 환율 {r100Of(e) ? '100' : '1'}{symOf(e)}={e.rate}원
                  </Text>
                </View>
                <Text style={styles.itemAmt}>{symOf(e)}{e.local.toLocaleString('ko-KR')}</Text>
                {renderRowActions('e-' + e.id, () => startEdit('exchange', e), () => { setExchanges(exchanges.filter(x => x.id !== e.id)); if(editTarget&&editTarget.item.id===e.id) clearEdit(); })}
              </View>
            ))}
            {atms.map(a => (
              <View key={'a-' + a.id} style={[styles.itemRow, editTarget && editTarget.type==='atm' && editTarget.item.id===a.id && styles.itemRowEditing]}>
                <Text style={styles.itemIcon}>🏧</Text>
                <View style={styles.itemInfo}>
                  <View style={styles.itemNameLine}>
                    <Text style={styles.itemName}>ATM 인출</Text>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{codeOfRecord(a, trip)}</Text>
                    </View>
                  </View>
                  <Text style={styles.itemSub}>{a.date}{a.note ? ' · ' + a.note : ''}</Text>
                </View>
                <Text style={styles.itemAmt}>{symOf(a)}{a.local.toLocaleString('ko-KR')}</Text>
                {renderRowActions('a-' + a.id, () => startEdit('atm', a), () => { setAtms(atms.filter(x => x.id !== a.id)); if(editTarget&&editTarget.item.id===a.id) clearEdit(); })}
              </View>
            ))}
            {refunds.map(r => (
              <View key={'r-' + r.id} style={[styles.itemRow, editTarget && editTarget.type==='refund' && editTarget.item.id===r.id && styles.itemRowEditing]}>
                <Text style={styles.itemIcon}>↩</Text>
                <View style={styles.itemInfo}>
                  <View style={styles.itemNameLine}>
                    <Text style={styles.itemName}>카드 잔액 이전</Text>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{codeOfRecord(r, trip)}</Text>
                    </View>
                  </View>
                  <Text style={styles.itemSub}>
                    {r.date} · {symOf(r)}{r.local.toLocaleString('ko-KR')} → ₩{(r.krw||0).toLocaleString('ko-KR')}
                  </Text>
                </View>
                <Text style={[styles.itemAmt, styles.itemAmtIn]}>₩{(r.krw||0).toLocaleString('ko-KR')}</Text>
                {renderRowActions('r-' + r.id, () => startEdit('refund', r), () => { setRefunds(refunds.filter(x => x.id !== r.id)); if(editTarget&&editTarget.item.id===r.id) clearEdit(); })}
              </View>
            ))}
          </>
        )}
      </View>
    </ScrollView>
  );
}

function ChargeForm({ trip, lastCur, setLastCur, charges, setCharges, editItem, onDone }) {
  const c = useFormCurrency(trip, lastCur, setLastCur);
  const { sym, r100 } = c;
  const rateHint = c.exRate
    ? `예: ${c.exRate} (${r100 ? '100' : '1'}${sym} = ${c.exRate}원)`
    : '환율';
  const fx = useFxTriple(r100);
  const { krw, local, rate } = fx;
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const editing = !!editItem;

  useEffect(() => {
    if (editItem) {
      c.setCur(codeOfRecord(editItem, trip));
      fx.load({
        krw:   editItem.krw   != null ? fmtInt(String(editItem.krw))   : '',
        local: editItem.local != null ? fmtDec(String(editItem.local)) : '',
        rate:  editItem.rate  != null ? String(editItem.rate)          : '',
      });
      setDate(editItem.date || '');
      setNote(editItem.note || '');
    }
  }, [editItem]);

  const reset = () => { fx.reset(); setDate(''); setNote(''); };

  const handleSubmit = () => {
    if (!krw)   return notify('원화(계좌차감) 금액을 입력해 주세요.');
    if (!local) return notify('충전 외화 금액을 입력해 주세요.');
    if (!rate)  return notify('환율을 입력해 주세요.');
    if (!date)  return notify('날짜를 선택해 주세요.');
    const payload = {
      krw: Math.round(toNum(krw)),
      local: toNum(local),
      rate: toNum(rate),
      date, note, ...c.field,
    };
    if (editing) {
      setCharges(charges.map(x => x.id === editItem.id ? { ...x, ...payload } : x));
      onDone();
    } else {
      setCharges([...charges, { id: Date.now(), ...payload }]);
    }
    reset();
  };
  const handleCancel = () => { reset(); onDone(); };

  return (
    <View style={[styles.card, editing && styles.cardEditing]}>
      <View style={styles.titleRow}>
        <Text style={styles.cardTitle}>{editing ? '카드 충전 수정' : '카드 충전 (계좌→카드)'}</Text>
        {editing && <TouchableOpacity onPress={handleCancel} hitSlop={8}><Text style={styles.cancelEdit}>취소</Text></TouchableOpacity>}
      </View>
      <CurrencyPick c={c} />
      <View style={styles.formRow}>
        <View style={styles.col}>
          <Text style={styles.label}>원화(계좌차감)</Text>
          <TextInput style={styles.input} placeholder="0" keyboardType="numeric" value={krw} onChangeText={v => fx.edit('krw', v)} />
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>외화</Text>
          <TextInput style={styles.input} placeholder="0" keyboardType="decimal-pad" value={local} onChangeText={v => fx.edit('local', v)} />
        </View>
      </View>
      <View style={styles.formRow}>
        <View style={styles.col}>
          <Text style={styles.label}>환율 ({r100 ? `100${sym} 기준` : `1${sym} 기준`})</Text>
          <TextInput style={styles.input} placeholder={rateHint} keyboardType="decimal-pad" value={rate} onChangeText={v => fx.edit('rate', v)} />
        </View>
        <View style={styles.col}>
          <DateField label="날짜" value={date} onChange={setDate} />
        </View>
      </View>
      <View style={styles.formRow}>
        <View style={styles.col}>
          <Text style={styles.label}>메모</Text>
          <TextInput style={styles.input} placeholder="선택" value={note} onChangeText={setNote} />
        </View>
      </View>
      <Text style={styles.helpText}>
        원화·외화·환율 중 둘만 넣으면 나머지 하나는 자동으로 채워집니다.
      </Text>
      <TouchableOpacity style={styles.addBtn} onPress={handleSubmit} activeOpacity={0.8}>
        <Text style={styles.addBtnText}>{editing ? '수정 저장' : '+ 충전'}</Text>
      </TouchableOpacity>
    </View>
  );
}

function ExchangeForm({ trip, lastCur, setLastCur, exchanges, setExchanges, editItem, onDone }) {
  const c = useFormCurrency(trip, lastCur, setLastCur);
  const { sym, r100 } = c;
  const rateHint = c.exRate
    ? `예: ${c.exRate} (${r100 ? '100' : '1'}${sym} = ${c.exRate}원)`
    : '환율';
  const fx = useFxTriple(r100);
  const { krw, local, rate } = fx;
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const editing = !!editItem;

  useEffect(() => {
    if (editItem) {
      c.setCur(codeOfRecord(editItem, trip));
      fx.load({
        krw:   editItem.krw   != null ? fmtInt(String(editItem.krw))   : '',
        local: editItem.local != null ? fmtDec(String(editItem.local)) : '',
        rate:  editItem.rate  != null ? String(editItem.rate)          : '',
      });
      setDate(editItem.date || '');
      setNote(editItem.note || '');
    }
  }, [editItem]);

  const reset = () => { fx.reset(); setDate(''); setNote(''); };

  const handleSubmit = () => {
    if (!krw)   return notify('원화(계좌차감) 금액을 입력해 주세요.');
    if (!local) return notify('환전 외화 금액을 입력해 주세요.');
    if (!rate)  return notify('환율을 입력해 주세요.');
    if (!date)  return notify('날짜를 선택해 주세요.');
    const payload = {
      krw: Math.round(toNum(krw)),
      local: toNum(local),
      rate: toNum(rate),
      date, note, ...c.field,
    };
    if (editing) {
      setExchanges(exchanges.map(x => x.id === editItem.id ? { ...x, ...payload } : x));
      onDone();
    } else {
      setExchanges([...exchanges, { id: Date.now(), ...payload }]);
    }
    reset();
  };
  const handleCancel = () => { reset(); onDone(); };

  return (
    <View style={[styles.card, editing && styles.cardEditing]}>
      <View style={styles.titleRow}>
        <Text style={styles.cardTitle}>{editing ? '현금 환전 수정' : '현금 환전 (계좌→현금)'}</Text>
        {editing && <TouchableOpacity onPress={handleCancel} hitSlop={8}><Text style={styles.cancelEdit}>취소</Text></TouchableOpacity>}
      </View>
      <CurrencyPick c={c} />
      <View style={styles.formRow}>
        <View style={styles.col}>
          <Text style={styles.label}>원화(계좌차감)</Text>
          <TextInput style={styles.input} placeholder="0" keyboardType="numeric" value={krw} onChangeText={v => fx.edit('krw', v)} />
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>외화</Text>
          <TextInput style={styles.input} placeholder="0" keyboardType="decimal-pad" value={local} onChangeText={v => fx.edit('local', v)} />
        </View>
      </View>
      <View style={styles.formRow}>
        <View style={styles.col}>
          <Text style={styles.label}>환율 ({r100 ? `100${sym} 기준` : `1${sym} 기준`})</Text>
          <TextInput style={styles.input} placeholder={rateHint} keyboardType="decimal-pad" value={rate} onChangeText={v => fx.edit('rate', v)} />
        </View>
        <View style={styles.col}>
          <DateField label="날짜" value={date} onChange={setDate} />
        </View>
      </View>
      <View style={styles.formRow}>
        <View style={styles.col}>
          <Text style={styles.label}>메모</Text>
          <TextInput style={styles.input} placeholder="선택" value={note} onChangeText={setNote} />
        </View>
      </View>
      <Text style={styles.helpText}>
        원화·외화·환율 중 둘만 넣으면 나머지 하나는 자동으로 채워집니다.
      </Text>
      <TouchableOpacity style={styles.addBtn} onPress={handleSubmit} activeOpacity={0.8}>
        <Text style={styles.addBtnText}>{editing ? '수정 저장' : '+ 환전'}</Text>
      </TouchableOpacity>
    </View>
  );
}

function AtmForm({ trip, lastCur, setLastCur, atms, setAtms, editItem, onDone }) {
  const c = useFormCurrency(trip, lastCur, setLastCur);
  const [local, setLocal] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const editing = !!editItem;

  useEffect(() => {
    if (editItem) {
      c.setCur(codeOfRecord(editItem, trip));
      setLocal(editItem.local != null ? fmtDec(String(editItem.local)) : '');
      setDate(editItem.date || '');
      setNote(editItem.note || '');
    }
  }, [editItem]);

  const reset = () => { setLocal(''); setDate(''); setNote(''); };

  const handleSubmit = () => {
    if (!local) return notify('인출 외화 금액을 입력해 주세요.');
    if (!date)  return notify('날짜를 선택해 주세요.');
    const payload = { local: toNum(local), date, note, ...c.field };
    if (editing) {
      setAtms(atms.map(x => x.id === editItem.id ? { ...x, ...payload } : x));
      onDone();
    } else {
      setAtms([...atms, { id: Date.now(), ...payload }]);
    }
    reset();
  };
  const handleCancel = () => { reset(); onDone(); };

  return (
    <View style={[styles.card, editing && styles.cardEditing]}>
      <View style={styles.titleRow}>
        <Text style={styles.cardTitle}>{editing ? 'ATM 인출 수정' : '🏧 ATM 인출 (카드→현금)'}</Text>
        {editing && <TouchableOpacity onPress={handleCancel} hitSlop={8}><Text style={styles.cancelEdit}>취소</Text></TouchableOpacity>}
      </View>
      <Text style={styles.helpText}>
        트래블카드 카드로 현지 ATM에서 현금 인출 시 사용합니다.{'\n'}
        카드 잔액이 줄고 현금 잔액이 늘어납니다 (환율 변환 없음).
      </Text>
      <CurrencyPick c={c} />
      <View style={styles.formRow}>
        <View style={styles.col}>
          <Text style={styles.label}>인출 외화 금액</Text>
          <TextInput style={styles.input} placeholder="0" keyboardType="decimal-pad" value={local} onChangeText={v => setLocal(fmtDec(v))} />
        </View>
        <View style={styles.col}>
          <DateField label="날짜" value={date} onChange={setDate} />
        </View>
      </View>
      <View style={styles.formRow}>
        <View style={styles.col}>
          <Text style={styles.label}>메모</Text>
          <TextInput style={styles.input} placeholder="ATM 수수료는 별도 지출로 입력" value={note} onChangeText={setNote} />
        </View>
      </View>
      <TouchableOpacity style={styles.addBtn} onPress={handleSubmit} activeOpacity={0.8}>
        <Text style={styles.addBtnText}>{editing ? '수정 저장' : '+ ATM인출'}</Text>
      </TouchableOpacity>
    </View>
  );
}

function RefundForm({ trip, lastCur, setLastCur, refunds, setRefunds, editItem, onDone }) {
  const c = useFormCurrency(trip, lastCur, setLastCur);
  const { sym, r100 } = c;
  const fx = useFxTriple(r100);
  const { krw, local, rate } = fx;
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const editing = !!editItem;

  useEffect(() => {
    if (editItem) {
      c.setCur(codeOfRecord(editItem, trip));
      fx.load({
        krw:   editItem.krw   != null ? fmtInt(String(editItem.krw))   : '',
        local: editItem.local != null ? fmtDec(String(editItem.local)) : '',
        rate:  editItem.rate  != null ? String(editItem.rate)          : '',
      });
      setDate(editItem.date || '');
      setNote(editItem.note || '');
    }
  }, [editItem]);

  const reset = () => { fx.reset(); setDate(''); setNote(''); };

  const handleSubmit = () => {
    if (!local) return notify('카드 외화 잔액을 입력해 주세요.');
    if (!krw)   return notify('원화 환급액을 입력해 주세요.');
    if (!date)  return notify('날짜를 선택해 주세요.');
    const payload = {
      local: toNum(local),
      krw: Math.round(toNum(krw)),
      rate: toNum(rate),
      date, note, ...c.field,
    };
    if (editing) {
      setRefunds(refunds.map(x => x.id === editItem.id ? { ...x, ...payload } : x));
      onDone();
    } else {
      setRefunds([...refunds, { id: Date.now(), ...payload }]);
    }
    reset();
  };
  const handleCancel = () => { reset(); onDone(); };

  return (
    <View style={[styles.card, editing && styles.cardEditing]}>
      <View style={styles.titleRow}>
        <Text style={styles.cardTitle}>{editing ? '카드→계좌 이전 수정' : '↩ 카드→계좌 이전 (잔액 환전)'}</Text>
        {editing && <TouchableOpacity onPress={handleCancel} hitSlop={8}><Text style={styles.cancelEdit}>취소</Text></TouchableOpacity>}
      </View>
      <Text style={styles.helpText}>
        트래블카드 카드 잔액 일부 또는 전부를 원화로 환전해 계좌로 이전합니다.{'\n'}
        카드 잔액이 줄고, 환전 환율로 계산된 원화가 계좌에 반환됩니다.
      </Text>
      <CurrencyPick c={c} />
      <View style={styles.formRow}>
        <View style={styles.col}>
          <Text style={styles.label}>이전 외화 금액</Text>
          <TextInput style={styles.input} placeholder="0" keyboardType="decimal-pad" value={local} onChangeText={v => fx.edit('local', v)} />
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>반환 원화</Text>
          <TextInput style={styles.input} placeholder="0" keyboardType="numeric" value={krw} onChangeText={v => fx.edit('krw', v)} />
        </View>
      </View>
      <View style={styles.formRow}>
        <View style={styles.col}>
          <Text style={styles.label}>환율</Text>
          <TextInput style={styles.input} placeholder="자동" keyboardType="decimal-pad" value={rate} onChangeText={v => fx.edit('rate', v)} />
        </View>
        <View style={styles.col}>
          <DateField label="날짜" value={date} onChange={setDate} />
        </View>
      </View>
      <View style={styles.formRow}>
        <View style={styles.col}>
          <Text style={styles.label}>메모</Text>
          <TextInput style={styles.input} placeholder="선택" value={note} onChangeText={setNote} />
        </View>
      </View>
      <Text style={styles.helpText}>
        외화·원화·환율 중 둘만 넣으면 나머지 하나는 자동으로 채워집니다.
      </Text>
      <TouchableOpacity style={styles.addBtn} onPress={handleSubmit} activeOpacity={0.8}>
        <Text style={styles.addBtnText}>{editing ? '수정 저장' : '+ 카드 잔액 이전'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0eee8' },
  content: { padding: 12, paddingBottom: 32 },

  subTabScroll: { marginBottom: 12, maxHeight: 50, flexGrow: 0 },
  subTab: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginRight: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  subTabActive: { backgroundColor: '#1a3a5c', borderColor: '#1a3a5c' },
  subTabIcon: { fontSize: 14 },
  subTabText: { fontSize: 12, color: '#6b6b6b' },
  subTabTextActive: { color: '#fff', fontWeight: '600' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  cardEditing: { borderColor: '#378ADD', borderWidth: 1.2 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 12 },
  cancelEdit: { fontSize: 13, color: '#378ADD', fontWeight: '600', marginBottom: 12 },
  helpText: { fontSize: 11, color: '#9b9b9b', marginBottom: 12, lineHeight: 16 },

  formRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  col: { flex: 1 },
  label: { fontSize: 11, fontWeight: '600', color: '#6b6b6b', marginBottom: 4 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 14,
  },
  addBtn: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  empty: { color: '#9b9b9b', fontSize: 13, textAlign: 'center', padding: 20 },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  itemRowEditing: { backgroundColor: '#f0f6ff', borderRadius: 8 },
  itemIcon: { fontSize: 18, marginRight: 10 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 13, fontWeight: '600', color: '#1a1a1a' },
  // 통화 뱃지는 다른 탭과 같은 모양으로 이름 옆에 붙인다
  itemNameLine: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  badge: { backgroundColor: '#e8e6ff', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  badgeText: { fontSize: 9, fontWeight: '700', color: '#5044a8' },
  itemSub: { fontSize: 11, color: '#9b9b9b', marginTop: 1 },
  itemAmt: { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },
  // 계좌로 돌아오는 돈만 초록. 충전·환전·ATM은 여행 안에서 옮겨 담는 것이라 검정 그대로 둔다.
  itemAmtIn: { color: '#1D9E75' },
  actWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 8 },
  editBtn: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: '#eef4fb' },
  editText: { fontSize: 12, color: '#0c447c', fontWeight: '700' },
  delBtn: { paddingHorizontal: 4, paddingVertical: 4 },
  delText: { fontSize: 14, color: '#c0413f', fontWeight: '700' },
  delWrap: { flexDirection: 'row', gap: 6, marginLeft: 8 },
  confirmBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  confirmYes: { backgroundColor: '#E24B4A' },
  confirmYesText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  confirmNo: { backgroundColor: '#f0f0f0' },
  confirmNoText: { color: '#6b6b6b', fontSize: 12, fontWeight: '600' },
});
