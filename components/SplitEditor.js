import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { checkFixedSplit, checkRatioSplit, normalizeRatio } from '../settle';

const fmtNum = (n) => (Number(n) || 0).toLocaleString('ko-KR');

// 저장 전 검증 문구. 통과면 null, 아니면 사용자에게 보여줄 메시지.
// 고정액은 합계 = 지출액, 비율은 합계 = 100%. 균등은 검증 없음.
export function splitErrorMessage(value, amount, sym = '₩') {
  const fx = checkFixedSplit(value, amount);
  if (!fx.ok) {
    const gap = `${sym}${fmtNum(Math.abs(fx.diff))} ${fx.diff > 0 ? '부족' : '초과'}`;
    return `고정액 합계가 지출액과 달라요 (${gap}).\n합계 ${sym}${fmtNum(fx.sum)} · 지출 ${sym}${fmtNum(fx.amount)}\n금액을 맞춘 뒤 저장해 주세요.`;
  }

  const rt = checkRatioSplit(value);
  if (!rt.ok) {
    const gap = `${Math.abs(rt.diff)}% ${rt.diff > 0 ? '부족' : '초과'}`;
    return `비율 합계가 100%가 아니에요 (${gap}).\n현재 합계 ${rt.sum}%\n'100%로 맞추기'를 누르거나 값을 고쳐 주세요.`;
  }
  return null;
}

// 나눔(참여자 + 분담방식) 편집기 v2
// value: { participants: [name], split: { mode, values } }
// 분담방식: equal(균등) | ratio(비율 %) | fixed(고정액)
// 참여자 칩 없이, 분담방식 아래 리스트 하나로 통합
const MODES = [
  { value: 'equal', label: '균등' },
  { value: 'ratio', label: '비율' },
  { value: 'fixed', label: '고정액' },
];

export default function SplitEditor({ members, value, onChange, sym = '₩', amount = 0 }) {
  const [open, setOpen] = useState(false);

  const participants = (value && value.participants) || members;
  const split = (value && value.split) || { mode: 'equal', values: {} };
  const mode = split.mode || 'equal';
  const vals = split.values || {};

  const emit = (nextParts, nextMode, nextVals) =>
    onChange({ participants: nextParts, split: { mode: nextMode, values: nextVals } });

  const toggleMember = (m) => {
    const has = participants.includes(m);
    let next, nextVals = { ...vals };
    if (has) {
      next = participants.filter((x) => x !== m);
    } else {
      next = members.filter((x) => participants.includes(x) || x === m);
      if (mode !== 'equal' && nextVals[m] == null) nextVals[m] = 0;
    }
    if (next.length === 0) return;
    emit(next, mode, nextVals);
  };

  const allSelected = participants.length === members.length;
  const toggleAll = () => emit(allSelected ? [members[0]] : [...members], mode, vals);

  const setMode = (nextMode) => {
    // 비율은 균등 분배(합계 100)로 시작해 곧바로 저장 가능한 상태로 둔다
    let nextVals = {};
    if (nextMode === 'ratio') nextVals = normalizeRatio(participants, {});
    else if (nextMode === 'fixed') participants.forEach((p) => { nextVals[p] = 0; });
    emit(participants, nextMode, nextVals);
  };

  // 비를 유지한 채 합계 100%로 맞춘다
  const applyNormalize = () => emit(participants, mode, normalizeRatio(participants, vals));

  const setVal = (m, raw) => emit(participants, mode, { ...vals, [m]: raw.replace(/[^0-9.]/g, '') });

  const modeLabel = MODES.find((x) => x.value === mode).label;
  const summary = `${modeLabel}·${participants.length}명`;

  // 미리보기
  const num = (v) => Number(v) || 0;
  const ratioSum = participants.reduce((s, p) => s + num(vals[p]), 0);
  const fixedSum = participants.reduce((s, p) => s + num(vals[p]), 0);
  const perEqual = amount > 0 && participants.length ? Math.round(amount / participants.length) : null;
  const fmt = (n) => n.toLocaleString('ko-KR');

  // 합계 불일치(고정액=지출액 / 비율=100%) — 접힌 상태에서도 보이도록 헤드에 표시하고,
  // 저장은 각 화면에서 splitErrorMessage로 막는다
  const fixedCheck = checkFixedSplit(value, amount);
  const ratioCheck = checkRatioSplit(value);
  const fixedBad = !fixedCheck.ok;
  const ratioBad = !ratioCheck.ok;
  const headWarn = fixedBad
    ? `${sym}${fmt(Math.abs(fixedCheck.diff))} ${fixedCheck.diff > 0 ? '부족' : '초과'}`
    : ratioBad
      ? `${Math.abs(ratioCheck.diff)}% ${ratioCheck.diff > 0 ? '부족' : '초과'}`
      : null;

  // 비율 모드에서 각자 실제로 부담하게 될 금액 (엔진과 같은 정규화 기준)
  const shareOfRatio = (m) =>
    ratioSum > 0 && amount > 0 ? Math.round((amount * num(vals[m])) / ratioSum) : 0;

  // 참여자 먼저, 제외자는 맨 아래로
  const ordered = [
    ...members.filter((m) => participants.includes(m)),
    ...members.filter((m) => !participants.includes(m)),
  ];

  return (
    <View style={styles.wrap}>
      <TouchableOpacity style={styles.head} activeOpacity={0.7} onPress={() => setOpen(!open)}>
        <Text style={styles.headLabel} numberOfLines={1}>
          분담방식 <Text style={styles.headSummary}>{summary}</Text>
          {headWarn && <Text style={styles.headWarn}>{'  '}⚠️ {headWarn}</Text>}
        </Text>
        <Text style={styles.headToggle}>조정 {open ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {open && (
        <View style={styles.body}>
          <View style={styles.seg}>
            {MODES.map((mo) => (
              <TouchableOpacity key={mo.value} style={[styles.segItem, mode === mo.value && styles.segItemOn]} onPress={() => setMode(mo.value)}>
                <Text style={[styles.segText, mode === mo.value && styles.segTextOn]}>{mo.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.rowBetween}>
            <Text style={styles.subLabel}>참여자 · {members.length}명 중 {participants.length}명</Text>
            <TouchableOpacity onPress={toggleAll}>
              <Text style={styles.allBtn}>{allSelected ? '전원 해제' : '전원 선택'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.list}>
            {ordered.map((m, i) => {
              const on = participants.includes(m);
              return (
                <View key={m} style={[styles.row, i === ordered.length - 1 && styles.rowLast, !on && styles.rowOff]}>
                  <TouchableOpacity style={styles.rowLeft} activeOpacity={0.7} onPress={() => toggleMember(m)}>
                    <View style={[styles.check, on && styles.checkOn]}>
                      {on && <Text style={styles.checkMark}>✓</Text>}
                    </View>
                    <View style={styles.rowNameBox}>
                      <Text style={[styles.rowName, !on && styles.rowNameOff]}>{m}{!on ? ' · 제외' : ''}</Text>
                      {on && mode === 'ratio' && amount > 0 && (
                        <Text style={styles.rowSub}>{sym}{fmt(shareOfRatio(m))}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                  {on && mode !== 'equal' ? (
                    <View style={styles.valWrap}>
                      <TextInput
                        style={styles.valInput}
                        keyboardType="numeric"
                        value={vals[m] != null ? String(vals[m]) : ''}
                        onChangeText={(t) => setVal(m, t)}
                        placeholder={mode === 'fixed' ? '0' : '0'}
                      />
                      <Text style={styles.valUnit}>{mode === 'fixed' ? sym : '%'}</Text>
                    </View>
                  ) : (!on ? <Text style={styles.dash}>—</Text> : null)}
                </View>
              );
            })}
          </View>

          <View style={styles.preview}>
            {mode === 'equal' && (
              <Text style={styles.previewText}>
                {perEqual != null ? `1인당 ${sym}${fmt(perEqual)}` : `${participants.length}명 균등`}
              </Text>
            )}
            {mode === 'ratio' && (
              <View style={styles.previewRow}>
                <Text style={[styles.previewText, ratioBad ? styles.warn : styles.ok]}>
                  합계 {ratioSum}%
                  {ratioBad
                    ? ` · ${Math.abs(ratioCheck.diff)}% ${ratioCheck.diff > 0 ? '부족' : '초과'}`
                    : ' ✓'}
                </Text>
                {ratioBad && (
                  <TouchableOpacity style={styles.fitBtn} onPress={applyNormalize} activeOpacity={0.8}>
                    <Text style={styles.fitBtnText}>100%로 맞추기</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            {mode === 'fixed' && (
              <Text style={[styles.previewText, fixedBad ? styles.warn : styles.ok]}>
                합계 {sym}{fmt(fixedSum)}{amount > 0 ? ` / 지출 ${sym}${fmt(amount)}` : ''}
                {fixedBad ? ` · ${sym}${fmt(Math.abs(fixedCheck.diff))} ${fixedCheck.diff > 0 ? '부족' : '초과'}` : ''}
              </Text>
            )}
          </View>
          <Text style={styles.hint}>
            {mode === 'equal' ? '체크한 사람끼리 똑같이 나눠요.'
              : mode === 'ratio' ? '각자 비율(%)을 넣어요. 합계가 100%여야 저장할 수 있어요. 배수로 넣고(2·1·1) 100%로 맞추기를 눌러도 돼요.'
              : '각자 낼 금액을 직접 넣어요. 합계가 지출액과 같아야 저장할 수 있어요.'}
          </Text>
          <Text style={styles.hint}>
            일부만 공금에서 부담하려면 지출을 두 건으로 나눠 입력하세요.{'\n'}
            예: 그린피 60,000(A·B만) + 공용비 40,000(전원)
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.12)', borderRadius: 8, marginBottom: 10, backgroundColor: '#faf9f6' },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 11 },
  headLabel: { fontSize: 13, fontWeight: '600', color: '#1a1a1a' },
  headSummary: { fontSize: 13, fontWeight: '400', color: '#6b6b6b' },
  headToggle: { fontSize: 12, color: '#378ADD', fontWeight: '600' },
  headWarn: { fontSize: 12, color: '#BA7517', fontWeight: '700' },
  body: { paddingHorizontal: 11, paddingBottom: 11 },
  subLabel: { fontSize: 11, fontWeight: '600', color: '#6b6b6b' },
  seg: { flexDirection: 'row', gap: 4, marginTop: 6, marginBottom: 12, borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.12)', borderRadius: 8, padding: 3 },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 6 },
  segItemOn: { backgroundColor: '#1a3a5c' },
  segText: { fontSize: 13, color: '#6b6b6b', fontWeight: '500' },
  segTextOn: { color: '#fff', fontWeight: '700' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  allBtn: { fontSize: 11, color: '#378ADD', fontWeight: '600' },
  list: { borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.1)', borderRadius: 8, backgroundColor: '#fff', overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.06)' },
  rowLast: { borderBottomWidth: 0 },
  rowOff: { backgroundColor: '#f7f6f2' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  check: { width: 20, height: 20, borderRadius: 5, borderWidth: 1, borderColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: '#378ADD', borderColor: '#378ADD' },
  checkMark: { color: '#fff', fontSize: 12, fontWeight: '700' },
  rowNameBox: { flex: 1 },
  rowName: { fontSize: 14, color: '#1a1a1a' },
  rowNameOff: { color: '#9b9b9b' },
  rowSub: { fontSize: 11, color: '#9b9b9b', marginTop: 2 },
  valWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  valInput: { width: 60, textAlign: 'right', borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5, fontSize: 13 },
  valUnit: { fontSize: 12, color: '#9b9b9b', width: 22 },
  dash: { fontSize: 13, color: '#c9c9c9' },
  preview: { marginTop: 10, backgroundColor: '#f8f7f3', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 11 },
  previewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  fitBtn: { backgroundColor: '#378ADD', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  fitBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  previewText: { fontSize: 13, fontWeight: '600', color: '#1a1a1a' },
  ok: { color: '#1D9E75' },
  warn: { color: '#BA7517' },
  hint: { fontSize: 11, color: '#9b9b9b', marginTop: 8, lineHeight: 15 },
});
