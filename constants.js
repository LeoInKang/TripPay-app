// 앱 전역 상수

// 지출 결제수단. 여행별로 바꾸지 않는다 —
// 잔액 계산(HomeTab·SettleTab)이 결제수단으로 차감처를 가르므로 임의 항목이 늘면 잔액이 깨진다.
//   트래블카드 → 카드 외화 잔액에서 차감
//   현금       → 현금 잔액에서 차감
//   신용카드   → 계좌에서 차감 (확정 원화 krwActual이 있으면 그 금액, 없으면 평균환율 추정)
export const PAY_CASH   = '현금';
export const PAY_CARD   = '트래블카드';
export const PAY_CREDIT = '신용카드';
export const PAY_METHODS = [PAY_CARD, PAY_CASH, PAY_CREDIT];

// 옛 이름(브랜드명). 저장된 데이터에 남아 있어 로드 시 PAY_CARD로 변환한다 — migrateTripData 참조.
export const PAY_CARD_LEGACY = '트레블월렛';
