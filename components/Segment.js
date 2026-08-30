import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

/**
 * Segment - iOS 스타일 세그먼트 컨트롤
 * 옵션 2-3개일 때 가장 적합
 *
 * 사용 예:
 * <Segment
 *   label="통화"
 *   value={currency}
 *   options={[{value:'KRW', label:'원화 ₩'}, {value:'LOCAL', label:'외화 ¥'}]}
 *   onChange={setCurrency}
 * />
 */
export default function Segment({ label, value, options, onChange }) {
  return (
    <View>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.container}>
        {options.map((opt, idx) => {
          const v = opt.value ?? opt;
          const l = opt.label ?? opt;
          const isSel = v === value;
          return (
            <TouchableOpacity
              key={String(v ?? idx)}
              style={[styles.segment, isSel && styles.segmentSel]}
              onPress={() => onChange(v)}
              activeOpacity={0.7}
            >
              {/* 글꼴을 키우면 '트래블카드'가 '트래블카 / 드'로 접힌다.
                  칸이 좁으면 접지 말고 글자를 조금 줄여 그린다. */}
              <Text
                style={[styles.text, isSel && styles.textSel]}
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
  container: {
    flexDirection: 'row',
    backgroundColor: '#f0eee8',
    borderRadius: 9,
    padding: 2,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  segment: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 7,
  },
  segmentSel: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  text: { fontSize: 13, color: '#6b6b6b', fontWeight: '500' },
  textSel: { color: '#1a3a5c', fontWeight: '700' },
});
