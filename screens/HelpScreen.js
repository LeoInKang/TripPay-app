import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  SafeAreaView, Platform, StatusBar, Alert
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { RECEIPT_PROMPT } from '../receiptPrompt';

function notify(msg) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(msg);
  } else {
    Alert.alert('알림', msg);
  }
}

// 정적 도움말. 운영 규칙의 단일 출처는 docs/feedback-backlog.md — 규칙이 바뀌면 여기도 같이 고칠 것.

function Card({ title, children }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, children }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowBody}>{children}</Text>
    </View>
  );
}

export default function HelpScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.sideBtn}>
          <Text style={styles.backText}>‹ 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title}>도움말</Text>
        <View style={styles.sideBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        <Card title="분담방식 고르기">
          <Row label="균등">체크한 참여자끼리 똑같이 나눠요. 대부분의 지출은 이걸로 충분해요.</Row>
          <Row label="비율">각자 비율(%)을 넣어요. 합계가 100%여야 저장돼요. 2·1·1처럼 배수로 넣고 '100%로 맞추기'를 눌러도 돼요.</Row>
          <Row label="고정액">각자 낼 금액을 직접 넣어요. 합계가 지출액과 같아야 저장돼요.</Row>
          <View style={styles.tipBox}>
            <Text style={styles.tipText}>참여자는 그 지출을 실제로 쓴 사람만 체크하세요. 빠진 사람은 부담하지 않아요.</Text>
          </View>
        </Card>

        <Card title="일부만 공금에서 낸 지출">
          <Text style={styles.p}>
            한 지출에서 일부는 특정 인원만, 나머지는 전원이 부담하게 하려면{'\n'}
            <Text style={styles.b}>지출을 두 건으로 나눠</Text> 입력하세요.
          </Text>
          <View style={styles.exBox}>
            <Text style={styles.exText}>골프 그린피 60,000 — 참여자: 친 사람만</Text>
            <Text style={styles.exText}>골프 공용비 40,000 — 참여자: 전원</Text>
          </View>
          <Text style={styles.pSub}>공금 부담 = 전원 균등 부담과 같아요. 계산할 필요 없이 내역에 근거가 남아요.</Text>
        </Card>

        <Card title="누가 대신 냈을 때 (대납)">
          <Text style={styles.p}>
            참석자가 개인 돈으로 먼저 낸 경우예요. 원칙은 세 가지만 기억하세요.
          </Text>
          <View style={styles.ruleBox}>
            <Text style={styles.ruleText}>1. 대납액은 장부에 <Text style={styles.b}>딱 한 번만</Text> 나타나야 해요.</Text>
            <Text style={styles.ruleText}>2. 기록의 통화·수단은 <Text style={styles.b}>공금이 실제로 나간 방식</Text>을 따라요. 비용이 외화였는지는 상관없어요.</Text>
            <Text style={styles.ruleText}>3. 개인 카드로 결제한 것을 <Text style={styles.b}>카드 지출 + 충전으로 적지 마세요.</Text> 가짜 충전이 평균환율을 왜곡해 모두의 정산이 미세하게 틀어져요.</Text>
          </View>

          <Text style={styles.sectionHead}>여행 중에 갚는 경우</Text>
          <Row label="외화 현금으로 갚음">공금 현금에서 지급하고, 외화 지출(결제수단: 현금) 1건으로 기록해요. 참여자는 실제 이용자만.</Row>
          <Row label="원화 이체로 갚음">환율을 협의해 원화로 송금하고, 원화 지출 1건으로 기록해요. 협의 기준은 대납자 카드에서 실제 빠진 원화가 가장 좋고, 모르면 정산 탭의 평균환율을 쓰세요.</Row>
          <Row label="섞어서 갚음">현금 일부 + 이체 일부면 외화 지출과 원화 지출 두 건으로 나눠 기록해요.</Row>
          <Row label="공금이 부족함">전원에게 균등하게 추가 회비를 걷고(회비 입력) 그 돈으로 갚은 뒤, 위와 같이 지출을 기록해요.</Row>

          <Text style={styles.sectionHead}>정산 때까지 못 갚는 경우</Text>
          <Text style={styles.p}>
            대납액을 <Text style={styles.b}>그 사람의 원화 회비</Text>로 기록하고(메모: 대납),{'\n'}
            같은 금액을 <Text style={styles.b}>원화 지출</Text>로 기록하세요(참여자는 실제 이용자).{'\n'}
            정산에서 낸 돈이 늘어난 만큼 자동으로 돌려받게 돼요.
          </Text>

          <Text style={styles.sectionHead}>공용 카드에 충전을 대신 해준 경우</Text>
          <Text style={styles.p}>
            카드에 실제로 돈이 들어갔으니 <Text style={styles.b}>충전 기록은 그대로</Text> 두세요.{'\n'}
            갚으면 → 계좌에서 송금만 하고 아무것도 추가 기록하지 않아요(충전 기록이 곧 그 차감이에요).{'\n'}
            못 갚고 정산하면 → 충전한 원화 금액을 그 사람의 회비로 기록하세요.
          </Text>
        </Card>

        <Card title="영수증 사진으로 자동 입력">
          <Text style={styles.p}>
            영수증을 한 장씩 입력할 필요 없이, AI에게 맡길 수 있어요.
          </Text>
          <Row label="1. 복사">아래 버튼으로 프롬프트를 복사해요.</Row>
          <Row label="2. 붙여넣기">쓰는 AI(클로드·챗GPT·제미나이)에 영수증 사진들과 함께 붙여넣어요.</Row>
          <Row label="3. 저장">AI가 만들어준 JSON을 파일로 저장해 휴대폰으로 옮겨요.</Row>
          <Row label="4. 가져오기">첫 화면의 "여행 데이터 가져오기"로 그 파일을 열면 끝!</Row>
          <TouchableOpacity
            style={styles.copyBtn}
            activeOpacity={0.8}
            onPress={async () => {
              try {
                await Clipboard.setStringAsync(RECEIPT_PROMPT);
                notify('프롬프트를 복사했어요.\nAI에 영수증 사진과 함께 붙여넣으세요.');
              } catch (e) {
                notify('복사에 실패했어요. 다시 시도해 주세요.');
              }
            }}
          >
            <Text style={styles.copyBtnText}>📋 AI 프롬프트 복사</Text>
          </TouchableOpacity>
          <Text style={styles.pSub}>
            금액이 애매한 영수증은 AI가 되물어요. 회비·환전은 영수증에 없으니 가져온 뒤 직접 입력하세요.
          </Text>
        </Card>

        <Card title="왜 이렇게 하면 되나요?">
          <Text style={styles.p}>
            정산은 <Text style={styles.b}>개인 순액 = 낸 돈 − 부담</Text>으로 계산돼요.{'\n'}
            회비(입금)는 공금에 돈이 들어온 기록이고, 부담은 지출의 참여자·분담방식이 정해요.{'\n'}
            둘은 독립이라 각각 사실대로만 기록하면, 차이는 정산이 자동으로 맞춰줘요.
          </Text>
        </Card>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f0',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f0eee8',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  sideBtn: { minWidth: 56 },
  backText: { fontSize: 14, color: '#1a3a5c', fontWeight: '600' },
  title: { fontSize: 16, fontWeight: '800', color: '#1a1a1a' },
  scroll: { padding: 16, paddingBottom: 48 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#1a1a1a', marginBottom: 12 },

  row: { marginBottom: 10 },
  rowLabel: { fontSize: 13, fontWeight: '700', color: '#1a3a5c', marginBottom: 2 },
  rowBody: { fontSize: 13, color: '#3a3a3a', lineHeight: 19 },

  p: { fontSize: 13, color: '#3a3a3a', lineHeight: 20, marginBottom: 8 },
  pSub: { fontSize: 12, color: '#6b6b6b', lineHeight: 17 },
  b: { fontWeight: '700', color: '#1a1a1a' },

  sectionHead: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', marginTop: 12, marginBottom: 8, borderBottomWidth: 2, borderBottomColor: '#378ADD', alignSelf: 'flex-start', paddingBottom: 2 },

  tipBox: { backgroundColor: '#f8f7f3', borderRadius: 8, padding: 10, marginTop: 4 },
  tipText: { fontSize: 12, color: '#5f5e5a', lineHeight: 17 },

  exBox: { backgroundColor: '#f8f7f3', borderRadius: 8, padding: 10, marginBottom: 8 },
  exText: { fontSize: 13, color: '#1a1a1a', lineHeight: 20 },

  ruleBox: { backgroundColor: '#FAEEDA', borderRadius: 8, padding: 12, marginBottom: 4 },
  ruleText: { fontSize: 13, color: '#633806', lineHeight: 19, marginBottom: 6 },

  copyBtn: { backgroundColor: '#1a3a5c', borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 6, marginBottom: 10 },
  copyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
