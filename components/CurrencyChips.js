import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

/**
 * CurrencyChips — 통화 선택 칩
 *
 * Segment는 2~3개용이라 유럽 여러 나라를 도는 여행에서 글자가 뭉개진다.
 * 칩을 가로로 스크롤하면 개수가 늘어도 깨지지 않고, 드롭다운과 달리
 * 탭 한 번으로 바뀌며 현재 선택이 항상 보인다.
 *
 * options: [{ value, label }]
 */
export default function CurrencyChips({ label, value, options, onChange }) {
  return (
    <View>
      {label && <Text style={styles.label}>{label}</Text>}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.row}
      >
        {options.map(opt => {
          const on = opt.value === value;
          return (
            <TouchableOpacity
              key={String(opt.value)}
              style={[styles.chip, on && styles.chipOn]}
              onPress={() => onChange(opt.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.text, on && styles.textOn]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: '#6b6b6b', marginBottom: 6 },
  row: { gap: 6, paddingRight: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
    backgroundColor: '#f0eee8', borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.08)',
  },
  chipOn: { backgroundColor: '#fff', borderColor: '#1a3a5c', borderWidth: 1 },
  text: { fontSize: 13, color: '#6b6b6b', fontWeight: '600' },
  textOn: { color: '#1a3a5c', fontWeight: '700' },
});
