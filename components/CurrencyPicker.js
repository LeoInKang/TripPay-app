import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

/**
 * CurrencyPicker — 통화 선택
 *
 * 통화 개수에 따라 Segment(2~3개)와 가로 스크롤 칩(4개 이상)을 갈아 끼우던 걸
 * 하나로 합쳤다. 가로 스크롤은 선택지가 화면 밖으로 숨어서 안 좋다.
 *
 * 넷까지는 한 줄을 나눠 채워 종전 세그먼트와 같은 모습이고,
 * 그보다 많으면 두 줄 격자로 접는다 — 몇 개든 전부 보인다.
 * 칩 폭을 열 수로 고정해야 마지막 줄에 하나만 남았을 때 그 칩이 줄 전체로 늘어나지 않는다.
 *
 * options: [{ value, label }]
 */
export default function CurrencyPicker({ label, value, options, onChange }) {
  const n = options.length;
  const cols = n <= 4 ? Math.max(n, 1) : Math.min(4, Math.ceil(n / 2));
  const basis = `${100 / cols}%`;
  return (
    <View>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.track}>
        {options.map((opt, idx) => {
          const v = opt.value ?? opt;
          const l = opt.label ?? opt;
          const on = v === value;
          return (
            <TouchableOpacity
              key={String(v ?? idx)}
              style={[styles.chip, { flexBasis: basis }, on && styles.chipOn]}
              onPress={() => onChange(v)}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.text, on && styles.textOn]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >{l}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 11, fontWeight: '600', color: '#6b6b6b', marginBottom: 4 },
  track: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#f0eee8',
    borderRadius: 9,
    padding: 2,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  // 폭은 flexBasis(열 수)로만 정한다. grow를 주면 마지막 줄 칩이 혼자 늘어난다.
  chip: {
    flexGrow: 0,
    flexShrink: 0,
    paddingVertical: 7,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderRadius: 7,
  },
  chipOn: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  text: { fontSize: 13, color: '#6b6b6b', fontWeight: '500' },
  textOn: { color: '#1a3a5c', fontWeight: '700' },
});
