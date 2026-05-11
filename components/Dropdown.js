import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet, FlatList, Pressable
} from 'react-native';

export default function Dropdown({ label, value, options, onChange, placeholder = '선택' }) {
  const [open, setOpen] = useState(false);

  const selected = options.find(o => (o.value ?? o) === value);
  const display = selected ? (selected.label ?? selected) : placeholder;

  return (
    <View>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity style={styles.field} onPress={() => setOpen(true)}>
        <Text style={[styles.value, !selected && styles.placeholder]}>{display}</Text>
        <Text style={styles.arrow}>▾</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            {label && <Text style={styles.sheetTitle}>{label}</Text>}
            <FlatList
              data={options}
              keyExtractor={(o, i) => String(o.value ?? o ?? i)}
              renderItem={({ item }) => {
                const v = item.value ?? item;
                const l = item.label ?? item;
                const isSel = v === value;
                return (
                  <TouchableOpacity
                    style={[styles.option, isSel && styles.optionSel]}
                    onPress={() => { onChange(v); setOpen(false); }}
                  >
                    <Text style={[styles.optionText, isSel && styles.optionTextSel]}>{l}</Text>
                    {isSel && <Text style={styles.check}>✓</Text>}
                  </TouchableOpacity>
                );
              }}
            />
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
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheet: {
    width: '85%',
    maxHeight: '70%',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 8,
  },
  sheetTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  optionSel: { backgroundColor: '#f5f5f0' },
  optionText: { fontSize: 14, color: '#1a1a1a' },
  optionTextSel: { color: '#1a3a5c', fontWeight: '700' },
  check: { fontSize: 14, color: '#1a3a5c', fontWeight: '700' },
});
