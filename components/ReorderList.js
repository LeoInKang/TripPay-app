import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Animated, PanResponder, StyleSheet, Platform } from 'react-native';

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
  // 핸들러는 항목 수가 바뀔 때만 다시 만들어지므로, 매 렌더 새로 오는 콜백은 ref 로 최신을 본다
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // 웹에서 손잡이를 끌면 브라우저가 텍스트 선택으로 받아들여
  // 「복사 / 모두 선택」 메뉴가 뜨고 제스처가 끊긴다.
  // 손잡이에 user-select:none 만 걸어서는 부족하다 — 선택이 옆 텍스트로 번지기 때문에
  // 목록 전체에서 선택 시작 자체를 막는다.
  const boxRef = useRef(null);
  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;
    const node = boxRef.current;
    if (!node || !node.addEventListener) return undefined;
    const stop = (e) => e.preventDefault();
    node.addEventListener('selectstart', stop);
    node.addEventListener('dragstart', stop);
    return () => {
      node.removeEventListener('selectstart', stop);
      node.removeEventListener('dragstart', stop);
    };
  }, []);

  const end = () => {
    setDragIdx(null);
    dy.setValue(0);
    shift.current = 0;
    if (onDragging) onDragging(false);
  };

  // 제스처 핸들러는 렌더마다 새로 만들면 안 된다.
  // 드래그가 시작되면 상태가 바뀌어 리렌더가 일어나는데, 그때 핸들러가 교체되면
  // 진행 중이던 제스처가 끊겨 손을 떼도 release가 오지 않는다(행이 들린 채 멈춘다).
  // 위치(i)로만 동작하므로 항목 수가 바뀔 때만 다시 만든다.
  const responders = useMemo(
    () => data.map((_, i) => makeResponder(i)),
    [data.length]   // eslint-disable-line react-hooks/exhaustive-deps
  );

  function makeResponder(i) { return PanResponder.create({
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
    // 손을 뗄 때 PanResponder는 End → Release 순으로 부른다.
    // 그래서 End 에서 상태를 되돌리면 Release 가 이동칸수를 0으로 읽어 순서가 안 바뀐다.
    // 마무리는 Release 한 곳에서만 한다.
    onPanResponderRelease: () => {
      const list = dataRef.current;
      const from = i;
      const to = Math.max(0, Math.min(list.length - 1, from + shift.current));
      if (to !== from && onChangeRef.current) {
        const next = [...list];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        onChangeRef.current(next);
      }
      end();
    },
    onPanResponderTerminate: end,
  }); }

  return (
    <View ref={boxRef} style={noSelectBox}>
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
            <View
              style={[styles.handle, noSelect]}
              {...(responders[i] ? responders[i].panHandlers : {})}
            >
              <Text selectable={false} style={[styles.handleIcon, dragging && styles.handleIconOn]}>⋮⋮</Text>
            </View>
            <View style={styles.content}>{renderRow(item, i)}</View>
          </Animated.View>
        );
      })}
    </View>
  );
}

// 웹에서만 의미 있는 속성이라 플랫폼을 갈라 넣는다
const isWeb = Platform.OS === 'web';
const noSelectBox = isWeb ? { userSelect: 'none' } : null;
const noSelect = isWeb ? { userSelect: 'none', cursor: 'grab' } : null;

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
