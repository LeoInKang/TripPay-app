// 영수증 → 가져오기 JSON 생성용 AI 프롬프트.
// 사용자가 AI 영수증 가져오기 화면에서 복사해 AI에 영수증 사진과 함께 붙여넣는다.
// 원본·해설은 docs/receipt-import-prompt.md, 워커 /upload 페이지에도 사본 — 고치면 셋을 같이 고칠 것.
// 스키마의 단일 출처는 transfer.js(buildTripJson)다.

export const RECEIPT_PROMPT = `첨부한 영수증 사진들을 읽어 아래 형식의 JSON 하나로 만들어 줘.
여행 경비 앱(TripPay)의 가져오기 파일이라 형식을 정확히 지켜야 해.
출력은 JSON 코드블록 하나만. 인사말·설명·요약·표는 쓰지 마.

{
  "app": "TripPay",
  "version": 1,
  "trip": {
    "id": "trip_<여행을 짧게 영문으로>",
    "name": "<국가명> 여행",
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "country": { "flag": "🇯🇵", "name": "일본", "code": "JPY", "sym": "¥", "r100": true, "exRate": "930" },
    "members": ["총무"],
    "note": "영수증 자동입력"
  },
  "deposits": [], "charges": [], "exchanges": [], "atms": [], "refunds": [],
  "expenses": [
    { "id": 1, "name": "<항목명>", "amt": 12345.67, "pay": "현금", "date": "MM-DD", "note": "<메모>" }
  ],
  "krwExps": []
}

규칙:
1. 지출 1건 = 영수증 1장. amt는 영수증의 최종 합계(현지통화). 세금·할인 반영된 실제 지불액.
   영수증에 찍힌 그대로 쓴다 — 소수점이 있으면 반올림하지 말고 그대로 (예: 10.92).
   여러 명 몫이 한 장에 찍혀 있어도 1인분 금액이 아니라 합계를 쓴다.
2. date는 MM-DD 형식. id는 1부터 순번.
3. pay는 "현금" 또는 "트래블카드" 둘 중 하나만. 현금 표시가 있으면 현금, 카드 결제면 트래블카드.
   영수증만으로는 선불카드인지 신용카드인지 알 수 없으니 카드 종류는 묻지 마.
   신용카드로 낸 건은 내가 앱에서 직접 바꾼다. 카드 끝 4자리가 보이면 note에 남겨 줘.
4. name은 한국어로 짧게(가게명 또는 용도). 상세(지점·인원·구성)는 note에.
5. 원화(KRW) 지출은 expenses가 아니라 krwExps에 넣는다(pay 필드 없음). 통화를 섞지 마.
   영수증이 여러 나라 것이면 통화별로 JSON을 따로 만들어 줘. 한 JSON에는 한 외화만 담긴다.
   (예: 스위스+이탈리아 여행이면 CHF용 JSON 하나, EUR용 JSON 하나. 앱에서 같은 여행에 차례로 넣는다.)
6. country는 여행 국가에 맞게. 자주 쓰는 값:
   일본 JPY ¥ r100=true exRate=930 / 캐나다 CAD C$ r100=false 980 / 베트남 VND ₫ r100=true 5.5 /
   태국 THB ฿ r100=false 40 / 미국 USD $ r100=false 1350 / 유럽 EUR € r100=false 1500
7. trip의 name은 "<국가명> 여행", startDate·endDate는 영수증 날짜 중 가장 이른 날과 가장 늦은 날로 채운다.
   여행 정보는 앱에서 고치니 묻지 마.
8. 금액이나 날짜를 못 읽겠으면 추측하지 말고 그 영수증만 빼고 나머지로 JSON을 만들어.
   뺀 영수증은 JSON 앞에 한 줄로 알려줘. 그 외에는 아무것도 묻지 마.
9. JSON은 코드블록 하나로만.`;

// AI 응답에서 JSON을 꺼낸다. 코드펜스가 있으면 벗기고, 없으면 그대로 파싱.
// 반환: 파싱된 객체. 실패 시 null.
export function parseAiJson(text) {
  if (!text) return null;
  let raw = String(text).trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) raw = fence[1].trim();
  // 앞뒤 잡담이 붙은 경우: 첫 '{'부터 마지막 '}'까지 시도
  if (!raw.startsWith('{')) {
    const s = raw.indexOf('{');
    const e = raw.lastIndexOf('}');
    if (s === -1 || e <= s) return null;
    raw = raw.slice(s, e + 1);
  }
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || !data.trip) return null;
    if (!Array.isArray(data.expenses) && !Array.isArray(data.krwExps)) return null;
    return data;
  } catch (e) {
    return null;
  }
}
