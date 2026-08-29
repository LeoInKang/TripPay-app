import React, { useRef, useState } from 'react';
import { View, Text, Animated, PanResponder, StyleSheet } from 'react-native';

/**
 * ReorderList — 손잡이를 눌러 끌어서 순서를 바꾸는 짧은 목록
 *
 * 새 패키지 없이 RN 내장 PanResponder·Animated 만 쓴다
 * (react-native-gesture-handler·reanimated 는 네이티브 의존성이라 도입 비용이 크다).
 *
 * 스크롤과 부딪히지 않게 두 가지를 지킨다.
 *   1. 드래그는 행 전체가 아니라 왼쪽 손잡이에만 건다 — 목록의 다른 곳은 평소대로 스크롤된다.
 *   2. 끄는 동안 onDragging(true)로 알려 바깥 ScrollView를 잠근다. 안드로이드에서
 *      ScrollView가 도중에 터치를 가로채는 걸 막으려면 이게 필요하다.
 *
 * 행 높이가 일정하다는 전제로 이동 칸수를 계산한다(rowHeight).
 */
export default function ReorderList({
  data = [],
  onChange,
  renderRow,          // (item, index) => 행 내용 (손잡이 오른쪽에 놓인다)
  rowHeight = 44,
  onDragging,
}) {
  const [dragIdx, setDragIdx] = useState(null);
  const dy = useRef(new Animated.Value(0)).current;
  const shift = useRef(0);        // 현재 몇 칸 옮겨졌는지
  const dataRef = useRef(data);
  dataRef.current = data;

  const end = () => {
    setDragIdx(null);
    dy.setValue(0);
    shift.current = 0;
    if (onDragging) onDragging(false);
  };

  const makeResponder = (i) => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    // 부모 ScrollView가 도중에 채가지 못하게 한다
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => true,

    onPanResponderGrant: () => {
      setDragIdx(i);
      dy.setValue(0);
      shift.current = 0;
      if (onDragging) onDragging(true);
    },
    onPanResponderMove: (_, g) => {
      dy.setValue(g.dy);
      shift.current = Math.round(g.dy / rowHeight);
    },
    onPanResponderRelease: () => {
      const list = dataRef.current;
      const from = i;
      const to = Math.max(0, Math.min(list.length - 1, from + shift.current));
      if (to !== from && onChange) {
        const next = [...list];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        onChange(next);
      }
      end();
    },
    onPanResponderTerminate: end,
  });

  return (
    <View>
      {data.map((item, i) => {
        const dragging = dragIdx === i;
        return (
          <Animated.View
            key={i}
            style={[
              styles.row,
              { height: rowHeight },
              dragging && styles.rowDragging,
              dragging && { transform: [{ translateY: dy }], zIndex: 10 },
            ]}
          >
            <View style={styles.handle} {...makeResponder(i).panHandlers}>
              <Text style={[styles.handleIcon, dragging && styles.handleIconOn]}>⋮⋮</Text>
            </View>
            <View style={styles.content}>{renderRow(item, i)}</View>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.06)',
    backgroundColor: '#fff',
  },
  rowDragging: {
    backgroundColor: '#f2f6fc',
    borderRadius: 8,
    borderBottomColor: 'transparent',
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  // 손잡이는 넉넉히 잡아야 손가락으로 집힌다
  handle: { width: 40, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  handleIcon: { fontSize: 15, color: '#c4c4c4', letterSpacing: -3 },
  handleIconOn: { color: '#1a3a5c' },
  content: { flex: 1, flexDirection: 'row', alignItems: 'center' },
});
