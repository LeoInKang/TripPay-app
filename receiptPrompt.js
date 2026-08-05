// 영수증 → 가져오기 JSON 생성용 AI 프롬프트.
// 사용자가 복사해 Claude·ChatGPT·제미나이에 영수증 사진과 함께 붙여넣는다.
// 원본·해설은 docs/receipt-import-prompt.md — 고치면 양쪽을 같이 고칠 것.
// 스키마의 단일 출처는 transfer.js(buildTripJson)다.

export const RECEIPT_PROMPT = `첨부한 영수증 사진들을 읽어 아래 형식의 JSON 하나로 만들어 줘.
여행 경비 앱(TripPay)의 가져오기 파일이라 형식을 정확히 지켜야 해.

{
  "app": "TripPay",
  "version": 1,
  "trip": {
    "id": "trip_<여행을 짧게 영문으로>",
    "name": "<여행 이름>",
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "country": { "flag": "🇯🇵", "name": "일본", "code": "JPY", "sym": "¥", "r100": true, "exRate": "930" },
    "members": ["<참석자1>", "<참석자2>"],
    "note": "영수증 자동입력"
  },
  "deposits": [], "charges": [], "exchanges": [], "atms": [], "refunds": [],
  "expenses": [
    { "id": 1, "name": "<항목명>", "amt": 12345, "pay": "현금", "date": "MM-DD", "note": "<메모>" }
  ],
  "krwExps": []
}

규칙:
1. 지출 1건 = 영수증 1장. amt는 영수증의 최종 합계(정수, 현지통화). 세금·할인 반영된 실제 지불액.
2. date는 MM-DD 형식. id는 1부터 순번.
3. pay는 "현금" 또는 "트레블월렛"(선불 외화카드) 둘 중 하나만. 현금 표시가 있으면 현금,
   카드 결제로 보이면 나에게 어느 카드였는지 물어봐.
4. name은 한국어로 짧게(가게명 또는 용도). 상세(지점·인원·구성)는 note에.
5. 원화(KRW) 지출은 expenses가 아니라 krwExps에 넣는다(pay 필드 없음). 통화를 섞지 마.
6. country는 여행 국가에 맞게. 자주 쓰는 값:
   일본 JPY ¥ r100=true exRate=930 / 베트남 VND ₫ r100=true 5.5 / 태국 THB ฿ false 40 /
   미국 USD $ false 1350 / 유럽 EUR € false 1500
7. 참석자 이름은 영수증에 보이면 그대로, 없으면 나에게 물어봐.
8. 금액·날짜가 흐릿하거나 1인분/합계가 애매한 영수증은 추측하지 말고 질문해.
9. 끝에 확인용 요약을 붙여 줘: 건수, 통화별 합계, 날짜 범위, 애매했던 항목.
10. JSON은 코드블록 하나로만. 파일 생성이 가능하면 .json 파일로도 만들어 줘.`;
