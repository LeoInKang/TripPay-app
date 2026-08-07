# CLAUDE.md — TripPay

> 매 세션 자동 로드. 상세는 복사하지 않고 `docs/feedback-backlog.md`(피드백·스코프 단일 출처)로 안내한다.

## 프로젝트
TripPay = 단체 여행 공금 관리 앱. 회비 납부 → 카드충전/환전 → 지출 기록 → **개인별 정산**까지 한 화면에서.

- 스택: Expo SDK 54 · React Native 0.81.5 · React 19 · React Navigation 7 · AsyncStorage. 여행 데이터는 **기기 로컬**에만 있고, 공유할 때만 암호문이 서버로 간다.
- 배포: Android 단독(Play Console). 패키지 `com.leoinkang.trippay` · Play 계정 Fompy Studio(fompy98@gmail.com).
- Expo 계정 `leoinkang` · EAS projectId `3d6bc013-393a-4523-a6da-b69c1013e499`.
- 리포: GitHub `LeoInKang/TripPay-app` (main) · 작업 폴더 `~/projects/apps/TripPay-app`.
- 개인정보처리방침: `docs/privacy-policy.html` → `https://leoinkang.github.io/TripPay-app/privacy-policy.html` (Play 제출본, 국문+영문, 문의 fompy98@gmail.com). **고치면 푸시해야 반영된다.**
- 공유 서버: Cloudflare Worker `https://trippay.fompy98.workers.dev` (소스 `server/`, KV `SHARES`). 계정 fompy98@gmail.com.
- UI 언어는 **한국어 전용**. 통화 기준은 항상 **원화(KRW)**.

## 현재 상태 (2026-08-07 새벽 기준)
- **v7(versionCode 7, 1.2.1) 비공개 테스트 트랙에 제출 완료 — Google 검토 중**(2026-08-07 오후). 커밋 `2a26cab` 기준.
  내용: 키보드·안전 영역 수정(아래 '키보드 처리' 참조) · 수정 모달 필드 순서 통일 · 회비/충전 수정 시 폼으로 자동 스크롤.
  `.aab` https://expo.dev/artifacts/eas/CP_fS0m8AAsw11ZgRgQT2MSHVJsFhy6PSWPCRFtNXVw.aab
- v6(versionCode 6, 1.2.0)는 배포 완료(2026-08-07 오전 7:33, 검토 몇 분 만에 통과). 테스터 20명.
  내용: AI 영수증 가져오기(클립보드) · 신용카드 결제수단 + 확정 원화 · 지출 폼 통합 · 참석자 이름 수정 · 도움말 화면 · 트래블카드 명칭 변경.
  관리형 게시가 꺼져 있어 검토 통과 즉시 테스터에게 자동 배포된다.
- v5(versionCode 5, 1.1.0)는 비공개 테스트 트랙 배포 완료(정산 정확도 + 암호화 공유). 실기기 검증도 끝남.
- **데이터 보안 신고 수정 제출 완료**(수집·공유 예 / 이름·기타 금융 정보 / 전송 중 암호화 / 삭제 요청 가능).
- Play 14일 요건: **8/10 전후 충족 예정**(8/5 시점 8일 경과 · 테스터 12명 유지).
- 참여 링크 `https://play.google.com/apps/testing/com.leoinkang.trippay`
- 다음 할 일: ① 8/10 전후 프로덕션 신청 → ② 8/9~17 캐나다에서 실사용 검증 → ③ (여유 시) JSONBin 계정 해지.
- **아이폰은 맥북 없이 못 쓴다** — `expo-updates` 미설치이고, 설치해도 EAS Update는 Expo Go에서 동작하지 않는다(개발 빌드 필요). iOS 빌드 이력 0건이고 Apple Developer 계정($99/년)도 없다. 캐나다에서는 맥북 지참 + `npx expo start` + Expo Go가 유일한 경로. 앱스토어는 여행 후 검토.

## 구조
```
App.js               Landing(시작·가져오기·히스토리) + Stack 네비게이션 + 마지막 여행 자동복원
screens/
  SetupScreen        새 여행 생성(여행명·기간·국가·참석자) → trip 객체 확정
  MainScreen         여행 상태 보관소 + 6탭 스위처 + 자동저장 트리거
  HistoryScreen      저장된 여행 목록 열기/삭제/JSON 내보내기
  SettingsScreen     여행명·기간·메모·참석자 편집 (국가·통화는 변경 불가) + 도움말 진입점
  ImportAIScreen     AI 영수증 가져오기 — 프롬프트 복사 + 클립보드 붙여넣기 → 여행 선택·미리보기·병합
  HelpScreen         도움말 — 분담방식·대납 처리 (운영 규칙의 사용자용 요약. 규칙 바뀌면 feedback-backlog.md와 함께 수정)
  tabs/  Home 현황 | Deposit 회비 | Charge 충전·환전·ATM·잔액이전 | Add 지출입력(외화·원화 통합 폼) | List 내역·수정 | Settle 정산·공유
components/          BottomSheet · Segment · DateField(월일) · FullDateField(연월일) · CountryPicker · SplitEditor
settle.js            ★ 개인별 정산 엔진 (유일한 정산 로직 단일 출처)
storage.js           AsyncStorage CRUD (trippay:trips / trippay:currentTripId / trippay:trip:{id})
migrate.js           읽어 들인 여행 데이터를 현재 스키마로 변환 (storage·transfer·ImportAI 세 경로에서 통과)
transfer.js          여행 JSON 내보내기·가져오기 (기기 간 이전 수단)
share.js             정산 공유 — AES-256-GCM 암호화 → 워커 업로드 → 링크 생성·취소
countries.js         국가·통화 47개 (COUNTRIES·POPULAR_CODES·searchCountries)
sampleData.js        개발용 샘플 (__DEV__에서만 Landing에 버튼 노출)
server/              Cloudflare Worker (공유 서버) + wrangler.toml + README
docs/                feedback-backlog.md · privacy-policy.html · play-data-safety.md · receipt-import-prompt.md
play_assets/         스토어 스크린샷·아이콘·피처 그래픽
```

상태 관리는 **MainScreen이 전부 보유 → 탭에 props로 내려주는 단방향**. 전역 스토어·Context 없음. 새 탭·기능도 이 방식을 따른다.

## 데이터 모델 (여행 1건 = 아래 8개 배열/객체)
| 키 | 내용 | 주요 필드 |
|---|---|---|
| `trip` | 여행 메타 | `id, name, startDate, endDate, country{flag,name,code,sym,r100,exRate}, members[], note` |
| `deposits` | 회비 납부 | `mem, cur('KRW'\|'LOCAL'), amt, rate, krwEquiv, date, note` |
| `charges` | 카드(트래블카드) 충전 | `krw, local, rate, date` |
| `exchanges` | 현금 환전 | `krw, local, rate, date` |
| `atms` | ATM 인출(카드→현금) | `local, date, note` |
| `refunds` | 카드 잔액 이전(카드→계좌) | `local, krw, date` |
| `expenses` | **외화** 지출 | `name, amt, pay('트래블카드'\|'현금'\|'신용카드'), krwActual?, date, note, participants[], split{mode,values}` |
| `krwExps` | **원화** 지출(계좌 직접 차감) | `name, amt, date, note, participants[], split{mode,values}` |

- `participants` 없으면 전원, `split` 없으면 균등 — **구버전 데이터 호환 규칙이니 제거 금지.**
- `split.mode` = `equal` | `ratio`(%) | `fixed`(고정액). `shares`는 엔진만 지원, UI 미노출.
- id는 `Date.now()`. 저장은 MainScreen의 useEffect가 변경 감지해 자동 수행(수동 저장 버튼 없음).

## 정산 규칙 (건드릴 때 가장 조심할 부분)
1. **개인 순액 = 낸 회비 − 참여 지출 부담.** `net > 0` 돌려받음 / `< 0` 더 내기. 구현은 `settle.js`의 `computeSettlement` 하나뿐.
2. **평균환율 단일 기준**: `avgRate = (charges + exchanges) 각 rate의 단순 평균`. 외화 회비·외화 지출·외화 잔액 전부 이 환율로 원화 환산한다. 저장 시점 환율을 쓰지 않는다(회비 `krwEquiv`는 표시용).
   - 계산은 **`settle.js`의 `getAvgRate(trip, charges, exchanges)` 하나만** 쓴다. 화면에서 다시 계산하지 말 것(Home·Settle·Deposit 세 탭이 제각각 계산하다 숫자가 어긋난 전례).
   - 충전·환전이 **0건이면 `country.exRate`(국가 기본환율)로 폴백**한다. 폴백이 없으면 외화 회비가 0원으로 계산돼 순액이 뒤집힌다(회귀 테스트 14번).
3. **r100 통화**(JPY·VND·IDR·LAK·KHR·MMK·MNT·UZS·ARS·CLP): 환율이 100단위 고시 → 환산 시 `/100`. 신규 국가 추가 시 `r100` 판단을 반드시 확인할 것.
4. **반올림 잔여는 참여자에게 순환 배정**(`rotation`) → 부담 합계 = 지출액 정확히 일치, 특정인에게 1원이 계속 몰리지 않음. `fixed`는 사용자가 넣은 값 그대로 유지(보정 안 함).
5. **합계를 맞춰야 저장된다 — 고정액·비율 공통 규칙.** 검증은 `SplitEditor`의 `splitErrorMessage`가 하고, 실제 판정은 `settle.js`의 `checkFixedSplit`(합계 = 지출액) · `checkRatioSplit`(합계 = 100%)이 한다. 저장을 막는 곳은 AddTab 외화·원화 폼, ListTab 수정 모달 **3곳**. 편집기가 접혀 있어도 보이도록 헤드에 부족·초과 배지를 띄운다.
   - 고정액: 보정도 정규화도 없어 합계 ≠ 지출액이면 정산이 조용히 어긋난다.
   - 비율: 엔진은 **총 가중치로 정규화**하므로 합계가 90이어도 계산 자체는 맞다. 다만 30을 넣은 사람이 실제로는 33.3%를 물어 **입력값과 실제가 어긋나므로** 100%를 강제한다. 엔진(`settle.js`)은 손대지 않았다 — UI 제약일 뿐이라 기존에 저장된 데이터의 계산 결과는 그대로다.
   - 100% 강제로 잃는 "배수 입력"(2:1:1)은 **`normalizeRatio` + '100%로 맞추기' 버튼**으로 되살렸다. 비를 유지한 채 소수 둘째 자리까지 정규화하고 합계를 정확히 100.00으로 맞춘다(1:1:1 → 33.34/33.33/33.33). 비율 모드로 전환할 때도 이 함수로 균등 초기화해 곧바로 저장 가능한 상태로 둔다.
   - ※ 엔진에는 `shares`(배수) 모드가 남아 있으나 UI 미노출. 위 버튼이 그 역할을 대신한다.
6. **신용카드 지출은 확정 원화(`krwActual`)가 있으면 그 금액이 기준.** 해외 신용카드는 원화 청구액이 3~5영업일 뒤 확정되므로, 여행 중에는 외화 금액만 넣고 평균환율로 추정하다가 확정되면 내역 수정에서 실제 청구액을 넣는다. 외화 `amt`는 항상 보존한다(통화 전환이 아니다).
   - 환산은 `settle.js`의 `expenseKrw(exp, toKrw)` / `makeExpToKrw` 하나만 쓴다. 화면에서 `toKrw(e.amt)`를 직접 부르면 확정 원화가 무시돼 정산과 화면 숫자가 어긋난다.
   - 고정액 분담도 실효 환율로 환산되므로 부담 합계는 확정 원화와 정확히 일치한다(회귀 테스트 21번).
7. **결제수단이 차감처를 정한다**: 트래블카드→카드 외화 잔액 / 현금→현금 잔액 / **신용카드→계좌**. 잔액 코드에서 카드 지출을 고를 때 `pay !== PAY_CASH`만 보면 신용카드가 카드 잔액에서 빠지니 `&& pay !== PAY_CREDIT`까지 확인할 것. 결제수단이 빈 구버전 데이터는 카드 결제로 본다.
8. 정산 로직을 고쳤으면 **`node test-settle.mjs` 통과 필수**(현재 67/67).

## 공유 구조 (2026-08-05 전면 교체)
평문을 공개 저장하던 JSONBin 방식을 걷어내고 **암호화 + 서버**로 바꿨다.

- 앱이 여행 데이터를 **AES-256-GCM으로 암호화**해 워커에 올리고, **복호화 키는 링크의 `#` 뒤에만** 담는다. 프래그먼트는 HTTP 요청에 실려가지 않으므로 **키가 서버에 도달하지 않는다** — 개발자도 인프라 제공자도 내용을 못 읽는다.
- 링크는 `https://trippay.fompy98.workers.dev/s/<id>#<key>` 형태로 **약 94자**.
- **만료는 KV TTL 7일**이 처리한다(앱 실행과 무관). **취소는 삭제 토큰**으로 서버에서 즉시 삭제. 토큰은 `trip.share`에만 있고 서버엔 해시만 둔다.
- 실측 확인: 업로드→복호화 일치, 저장분에 평문 없음, 틀린 토큰 삭제 거부(403), 취소 후 404, 틀린 키는 GCM 인증 실패.
- **JSONBin은 2026-08-05 완전 은퇴**: 계정의 공유 bin 35개 전부 삭제, Access Key 폐기(401 실측). 뷰어의 옛 `?id=` 경로도 제거 — 이제 만료 안내만 띄운다. v4 바이너리에 남은 키는 죽은 문자열이다.

## 설계 결정 (되돌리지 말 것)
- **결제자(선결제·대납) 필드 없음.** 기능이 아니라 운영으로 처리: 돌려준 돈을 지출 1건으로 기록(이중차감 금지), 공금 부족 시 균등 회비 추가 징수 후 지급. 근거·가이드는 `docs/feedback-backlog.md`.
- **결제수단 이름은 `constants.js`가 단일 출처**(`PAY_CARD='트래블카드'` · `PAY_CASH` · `PAY_CREDIT`). 2026-08-07에 브랜드명 '트레블월렛'을 걷어냈고, 저장된 옛 데이터는 `migrate.js`가 로드 시 변환한다(`PAY_CARD_LEGACY`). 화면에 결제수단 문자열을 직접 쓰지 말 것.
- **국가·통화는 여행 생성 후 변경 불가** (정산 기준이 통째로 흔들림). SettingsScreen에서 읽기 전용 표시.
- **참석자 추가 시 소급 여부를 묻는다**: '이후 지출부터' 선택 시 기존 '전원 균등' 지출을 옛 멤버로 고정(`MainScreen.handleTripSave`).
- **회비·지출 내역이 있는 참석자는 삭제 불가**(SettingsScreen `memberHasData`).
- 외화 회비는 **수동 환율 입력 없이** 평균환율 자동 환산. 평균환율이 없으면(충전·환전 0건) 외화 회비 입력을 막는다.

## 키보드 처리 (2026-08-07, 갤럭시 폴드 실측 후 확정)
**Android 15(targetSdk 35)부터 엣지투엣지가 강제되어 `adjustResize`가 창을 줄이지 않는다.** OS는 키보드
높이만 알려주고 대응은 앱 몫이다. 그래서 아무 처리도 안 하면 입력칸이 키보드에 덮인다.

- **`softwareKeyboardLayoutMode: "pan"`은 쓰지 말 것.** 한 번 넣었다가 되돌렸다 — 창을 통째로 밀어
  올리는 방식이라 상단 헤더와 뒤로 버튼이 화면 밖으로 나가고, 창 크기는 그대로라 스크롤뷰가 가려진
  영역을 몰라 목록 끝까지 내려가지 않는다. 입력칸 하나 살리고 셋을 잃는다.
- **`components/KeyboardAvoider.js` 하나만 쓴다.** 양쪽 플랫폼 모두 `behavior="padding"` —
  창을 옮기지 않고 보이는 영역만 줄이므로 헤더 고정과 스크롤이 둘 다 살아 있다.
  사용처: SetupScreen · MainScreen(탭 전체) · SettingsScreen · ListTab 수정 모달 · CountryPicker.
- **Modal 안에는 반드시 Modal 내부에 둘 것.** Modal은 별도 뷰 계층이라 바깥 래퍼가 닿지 않는다.
- **모든 ScrollView에 `keyboardShouldPersistTaps="handled"`.** 없으면 키보드가 떠 있을 때 터치가
  '키보드 닫기'로 먹혀 안드로이드에서 스크롤 제스처가 씹힌다. `keyboardDismissMode`는 쓰지 않는다
  (드래그로 키보드가 닫혀 불편하다는 피드백 — 빈 곳 탭으로만 닫히게 둔다).
- **하단 버튼은 `useSafeAreaInsets()`로 여백을 잡는다.** `react-native-safe-area-context`가 설치만 되고
  안 쓰이던 탓에 안드로이드 제스처 바에 버튼이 잘렸다. `App.js`에 `SafeAreaProvider`가 있어야 동작한다.
- 미해결: 아이폰 국가 선택 모달에서 목록을 스크롤하면 키보드가 닫힌다. 웹에서 재현되지 않아 iOS
  네이티브 거동으로 판단. `react-native-keyboard-controller` 도입 시 함께 검토.

## 알려진 부채·주의
- **잔액 계산이 HomeTab·SettleTab에 아직 중복**(계좌/카드/현금 3종). 한쪽만 고치면 화면 간 숫자가 어긋난다 — 고칠 땐 양쪽 동시에, 여력 되면 avgRate처럼 공용 모듈로 추출.
  - avgRate와 총 입금·총 지출 환산은 **2026-08-04에 `getAvgRate`로 통일 완료**(그 전까지 두 탭 숫자가 달랐다).
- 공유 뷰어는 별도 리포 `LeoInKang/travel-expense-app`의 `view.html`(로컬 클론 `~/projects/apps/trippay`). 정산 로직을 `settle.js`에서 그대로 이식해 뒀으니 **엔진을 고치면 뷰어도 같이 고쳐야 한다.**
- 워커가 `GET /s/:id`에서 Pages의 `view.html`을 가져와 서빙한다. 즉 **뷰어를 고치면 Pages에 푸시해야 반영**된다(워커 재배포는 불필요).
- `settle.js` 상단 주석에 "(회비 + 선결제)"가 남아 있으나 선결제는 스코프에서 제거됨(코드는 무관).
- 루트에 45MB `.aab` 2개가 **untracked이고 .gitignore에도 없다** → `git add .` 하면 그대로 커밋된다.
- 미디어 라이브러리에 옛 이름 스크린샷(1~5.jpg) 잔존. 스토어에는 새 버전만 적용됨, 정리는 선택.
- `.bak` 파일이 곳곳에 있으나 `.gitignore` 처리됨. 새로 만들지 말 것(이력은 git).

## 자주 쓰는 명령
```bash
npx expo start          # 개발 서버. w=웹, 카메라앱으로 QR 스캔=실기기. --tunnel은 ngrok 장애 시 실패 가능
node test-settle.mjs    # 정산 엔진 단위 테스트 (67개)
cd server && wrangler deploy   # 공유 서버 배포 (Cloudflare 로그인 필요)
eas build -p android --profile production   # versionCode 자동 증가 → .aab(45MB) 다운로드
```
빌드 후 Play Console **비공개 테스트 트랙**에 업로드. `eas.json`의 `appVersionSource: "remote"`라 **versionCode는 EAS 서버가 관리** — `app.json`의 `versionCode: 1`은 무시되는 값이니 손대지 말 것. 사용자에게 보이는 버전은 `app.json`의 `version`(현재 1.0.0)과 App.js 랜딩의 "TripPay v1.0" 문자열 두 곳이라, 올릴 땐 같이 올린다.

## 작업 규칙 (Leo 선호 · yakizy와 동일)
- **한국어 존댓말 · 결론 먼저 · 짧은 줄 · 기호 남발/번역투 금지.**
- **추측 진단 금지** — 실코드·실측 기준. 작업 전 최신본 확인.
- **코드 변경은 계획을 먼저 보이고 승인받은 뒤 착수한다.** 설계 전환·기능 추가는 특히. (조회·진단·테스트 실행은 바로)
- 빌드·배포·커밋도 **무엇을·왜 하는지 알리고 실행**, 되돌리기 어려우면 확인받고 진행.
- 커밋·푸시는 묻지 말고 직접 실행(상시 승인). 단 브랜치 생성·강제 푸시·reset/revert는 확인받는다.
- 커밋 메시지는 **영어**, **`git add .` 금지**(변경한 파일만 명시 add — 위 .aab 이슈도 이 때문).
- 수동 `.bak` 백업 만들지 말 것. 메모리 자동 기록 금지·승인 후만.
