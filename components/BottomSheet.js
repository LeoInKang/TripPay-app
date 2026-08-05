import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet,
  Pressable, ScrollView, Dimensions, Platform
} from 'react-native';

/**
 * BottomSheet - 아래에서 슬라이드 업하는 선택 시트
 *
 * 사용 예:
 * <BottomSheet
 *   label="참석자"
 *   value={member}
 *   options={[{value:'강&장', label:'강&장'}, ...]}
 *   onChange={setMember}
 *   title="참석자 선택"
 * />
 */
export default function BottomSheet({
  label,
  value,
  options,
  onChange,
  placeholder = '선택',
  title,
}) {
  const [open, setOpen] = useState(false);

  const selected = options.find(o => (o.value ?? o) === value);
  const display = selected ? (selected.label ?? selected) : placeholder;

  return (
    <View>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={styles.field}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.value, !selected && styles.placeholder]}>
          {display}
        </Text>
        <Text style={styles.arrow}>▾</Text>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            {/* 핸들 바 */}
            <View style={styles.handle} />

            {/* 타이틀 */}
            <Text style={styles.title}>{title || label || '선택'}</Text>

            {/* 옵션 리스트 — 항목이 많아도(참석자 20명, 날짜 필터 등) 스크롤로 전부 닿게 한다 */}
            <ScrollView style={styles.optionList} bounces={false}>
              {options.map((item, idx) => {
                const v = item.value ?? item;
                const l = item.label ?? item;
                const isSel = v === value;
                return (
                  <TouchableOpacity
                    key={String(v ?? idx)}
                    style={[styles.option, isSel && styles.optionSel]}
                    onPress={() => {
                      onChange(v);
                      setOpen(false);
                    }}
                    activeOpacity={0.6}
                  >
                    <Text style={[styles.optionText, isSel && styles.optionTextSel]}>
                      {l}
                    </Text>
                    {isSel && <Text style={styles.check}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* 취소 버튼 */}
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setOpen(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelText}>취소</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 11, fontWeight: '600', color: '#6b6b6b', marginBottom: 4 },
  field: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  value: { fontSize: 14, color: '#1a1a1a' },
  placeholder: { color: '#c0c0c0' },
  arrow: { fontSize: 12, color: '#9b9b9b' },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    paddingHorizontal: 16,
    maxHeight: '70%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e0e0e0',
    alignSelf: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 12,
  },
  optionList: {
    backgroundColor: '#f8f7f3',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
    // 시트 자체의 maxHeight(70%)는 일반 View 자식을 잘라내기만 하므로,
    // 목록에 명시적 한계를 줘야 ScrollView가 실제로 스크롤된다.
    maxHeight: Dimensions.get('window').height * 0.5,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  optionSel: { backgroundColor: '#e6f1fb' },
  optionText: { fontSize: 15, color: '#1a1a1a' },
  optionTextSel: { color: '#1a3a5c', fontWeight: '700' },
  check: { fontSize: 16, color: '#1a3a5c', fontWeight: '700' },

  cancelBtn: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b6b6b',
  },
});
