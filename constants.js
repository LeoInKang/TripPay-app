// 앱 전역 상수

// 지출 결제수단. 여행별로 바꾸지 않는다 —
// 카드·현금 잔액 계산이 '현금' 여부로 갈리므로(HomeTab·SettleTab) 임의 항목이 늘면 잔액이 깨진다.
export const PAY_CASH = '현금';
export const PAY_CARD = '트레블월렛';
export const PAY_METHODS = [PAY_CARD, PAY_CASH];
