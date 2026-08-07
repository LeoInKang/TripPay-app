import React from 'react';
import { KeyboardAvoidingView } from 'react-native';

// 키보드가 입력칸을 덮지 않게 하는 공용 래퍼. 키보드 회피는 여기 한 곳에서만 정한다.
//
// 왜 양쪽 플랫폼 모두 padding인가:
// Android 15(targetSdk 35)부터 엣지투엣지가 강제되면서 `adjustResize`가 더 이상 창을 줄이지 않는다.
// OS는 키보드 높이만 알려주고 대응은 앱 몫이다. 그래서 창을 통째로 밀어 올리는 `pan`을 쓰면
// 상단 고정 영역과 뒤로 버튼이 화면 밖으로 나가고, 창 크기가 그대로라 스크롤뷰가 가려진 영역을
// 몰라서 끝까지 내려가지 않는다(2026-08-07 갤럭시 폴드 실측).
// padding은 창을 옮기지 않고 내용 아래에 여백만 만들어 헤더 고정과 스크롤을 둘 다 지킨다.
//
// Modal 안에서는 반드시 Modal 내부에 두어야 한다 — Modal은 별도 뷰 계층이라 바깥 래퍼가 닿지 않는다.
export default function KeyboardAvoider({ children, style }) {
  return (
    <KeyboardAvoidingView style={style} behavior="padding">
      {children}
    </KeyboardAvoidingView>
  );
}
