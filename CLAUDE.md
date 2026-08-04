# CLAUDE.md — TripPay

> 매 세션 자동 로드. 상세는 복사하지 않고 `docs/feedback-backlog.md`(피드백·스코프 단일 출처)로 안내한다.

## 프로젝트
TripPay = 단체 여행 공금 관리 앱. 회비 납부 → 카드충전/환전 → 지출 기록 → **개인별 정산**까지 한 화면에서.

- 스택: Expo SDK 54 · React Native 0.81.5 · React 19 · React Navigation 7 · AsyncStorage. **서버 없음**(전 데이터 기기 로컬).
- 배포: Android 단독(Play Console). 패키지 `com.leoinkang.trippay` · Play 계정 Fompy Studio(fompy98@gmail.com).
- Expo 계정 `leoinkang` · EAS projectId `3d6bc013-393a-4523-a6da-b69c1013e499`.
- 리포: GitHub `LeoInKang/TripPay-app` (main) · 작업 폴더 `~/projects/apps/TripPay-app`.
- 개인정보처리방침: `docs/privacy-policy.html` → GitHub Pages로 게시 중 `https://leoinkang.github.io/TripPay-app/privacy-policy.html` (Play Console 제출본, 시행일 2026-07-11, 국문+영문 병기, 문의 fompy98@gmail.com).
- UI 언어는 **한국어 전용**. 통화 기준은 항상 **원화(KRW)**.

## 현재 상태 (인계 2026-07-29 기준)
- 비공개 테스트 **v4(versionCode 4)** 배포 완료. 프로덕션 **미출시**.
- Play 14일 요건: 7/29에 6일 경과 → **2026-08-06 전후 충족 예정**. 테스터 12명 이상 유지 필요(등록 20명).
- 참여 링크 `https://play.google.com/apps/testing/com.leoinkang.trippay`
- 관리형 게시 **꺼짐**(검토 통과 시 자동 배포).
- 다음 할 일: ① 요건 충족 시 Play Console에서 **프로덕션 신청**(비공개 테스트 관련 질문 답변) → ② 승인 후 프로덕션 트랙 출시 → ③ 그 사이 테스터 수 유지 확인.
- ⚠️ **v4 라운드 작업물이 아직 미커밋**: `settle.js`·`components/SplitEditor.js`·`components/CountryPicker.js`·`countries.js`·`test-settle.mjs`·`docs/feedback-backlog.md`가 untracked, 탭·화면 6종이 modified. 빌드는 나갔는데 소스 이력이 없다 → 작업 시작 전 커밋 여부부터 정리할 것.

## 구조
```
App.js               Landing(시작·가져오기·히스토리) + Stack 네비게이션 + 마지막 여행 자동복원
screens/
  SetupScreen        새 여행 생성(여행명·기간·국가·참석자) → trip 객체 확정
  MainScreen         여행 상태 보관소 + 6탭 스위처 + 자동저장 트리거
  HistoryScreen      저장된 여행 목록 열기/삭제/JSON 내보내기
  SettingsScreen     여행명·기간·메모·참석자 편집 (국가·통화는 변경 불가)
  tabs/  Home 현황 | Deposit 회비 | Charge 충전·환전·ATM·잔액이전 | Add 지출입력 | List 내역·수정 | Settle 정산·공유
components/          BottomSheet · Segment · DateField(월일) · FullDateField(연월일) · CountryPicker · SplitEditor
settle.js            ★ 개인별 정산 엔진 (유일한 정산 로직 단일 출처)
storage.js           AsyncStorage CRUD (trippay:trips / trippay:currentTripId / trippay:trip:{id})
transfer.js          여행 JSON 내보내기·가져오기 (기기 간 이전 수단)
share.js             JSONBin 업로드 → 외부 view.html 공유 링크
countries.js         국가·통화 47개 (COUNTRIES·POPULAR_CODES·searchCountries)
sampleData.js        개발용 샘플 (__DEV__에서만 Landing에 버튼 노출)
docs/                feedback-backlog.md(피드백·스코프) · privacy-policy.html(Play 제출용)
play_assets/         스토어 스크린샷·아이콘·피처 그래픽
```

상태 관리는 **MainScreen이 전부 보유 → 탭에 props로 내려주는 단방향**. 전역 스토어·Context 없음. 새 탭·기능도 이 방식을 따른다.

## 데이터 모델 (여행 1건 = 아래 8개 배열/객체)
| 키 | 내용 | 주요 필드 |
|---|---|---|
| `trip` | 여행 메타 | `id, name, startDate, endDate, country{flag,name,code,sym,r100,exRate}, members[], note` |
| `deposits` | 회비 납부 | `mem, cur('KRW'\|'LOCAL'), amt, rate, krwEquiv, date, note` |
| `charges` | 카드(트레블월렛) 충전 | `krw, local, rate, date` |
| `exchanges` | 현금 환전 | `krw, local, rate, date` |
| `atms` | ATM 인출(카드→현금) | `local, date, note` |
| `refunds` | 카드 잔액 이전(카드→계좌) | `local, krw, date` |
| `expenses` | **외화** 지출 | `name, amt, pay('트레블월렛'\|'현금'), date, note, participants[], split{mode,values}` |
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
5. 정산 로직을 고쳤으면 **`node test-settle.mjs` 통과 필수**(현재 20/20).

## 설계 결정 (되돌리지 말 것)
- **결제자(선결제·대납) 필드 없음.** 기능이 아니라 운영으로 처리: 돌려준 돈을 지출 1건으로 기록(이중차감 금지), 공금 부족 시 균등 회비 추가 징수 후 지급. 근거·가이드는 `docs/feedback-backlog.md`.
- **국가·통화는 여행 생성 후 변경 불가** (정산 기준이 통째로 흔들림). SettingsScreen에서 읽기 전용 표시.
- **참석자 추가 시 소급 여부를 묻는다**: '이후 지출부터' 선택 시 기존 '전원 균등' 지출을 옛 멤버로 고정(`MainScreen.handleTripSave`).
- **회비·지출 내역이 있는 참석자는 삭제 불가**(SettingsScreen `memberHasData`).
- 외화 회비는 **수동 환율 입력 없이** 평균환율 자동 환산. 평균환율이 없으면(충전·환전 0건) 외화 회비 입력을 막는다.

## 알려진 부채·주의
- **잔액 계산이 HomeTab·SettleTab에 아직 중복**(계좌/카드/현금 3종). 한쪽만 고치면 화면 간 숫자가 어긋난다 — 고칠 땐 양쪽 동시에, 여력 되면 avgRate처럼 공용 모듈로 추출.
  - avgRate와 총 입금·총 지출 환산은 **2026-08-04에 `getAvgRate`로 통일 완료**(그 전까지 두 탭 숫자가 달랐다).
- ⚠️ **공유 기능 ↔ 개인정보처리방침 불일치.** `share.js`는 여행 데이터(참석자 이름·지출·메모)를 외부 서버 JSONBin에 **공개 bin**(`X-Bin-Private: false`)으로 업로드하고 링크를 만든다. 반면 방침 §3·§5는 "모든 데이터는 기기에만 저장, 외부 서버로 전송하지 않음 / 제3자 없음"이라고 단언한다. 프로덕션 신청 전에 **방침 문구 보강**(사용자가 공유를 실행할 때만 JSONBin으로 전송·링크를 아는 사람은 열람 가능) 또는 기능 조정 중 하나가 필요하다. Play Data safety 답변도 같이 맞출 것.
- `share.js`에 JSONBin **쓰기 전용 키가 하드코딩**되어 있고, 공유 뷰어는 옛 웹앱(`leoinkang.github.io/travel-expense-app/view.html`, 현재 살아 있음)이다. 공유 페이지는 아직 **개인별 순액 미반영**(총액 기준) — 후속 과제.
- `settle.js` 상단 주석에 "(회비 + 선결제)"가 남아 있으나 선결제는 스코프에서 제거됨(코드는 무관).
- 루트에 45MB `.aab` 2개가 **untracked이고 .gitignore에도 없다** → `git add .` 하면 그대로 커밋된다.
- 미디어 라이브러리에 옛 이름 스크린샷(1~5.jpg) 잔존. 스토어에는 새 버전만 적용됨, 정리는 선택.
- `.bak` 파일이 곳곳에 있으나 `.gitignore` 처리됨. 새로 만들지 말 것(이력은 git).

## 자주 쓰는 명령
```bash
npx expo start          # 개발 서버. w=웹, 카메라앱으로 QR 스캔=실기기. --tunnel은 ngrok 장애 시 실패 가능
node test-settle.mjs    # 정산 엔진 단위 테스트 (20개)
eas build -p android --profile production   # versionCode 자동 증가 → .aab(45MB) 다운로드
```
빌드 후 Play Console **비공개 테스트 트랙**에 업로드. `eas.json`의 `appVersionSource: "remote"`라 **versionCode는 EAS 서버가 관리** — `app.json`의 `versionCode: 1`은 무시되는 값이니 손대지 말 것. 사용자에게 보이는 버전은 `app.json`의 `version`(현재 1.0.0)과 App.js 랜딩의 "TripPay v1.0" 문자열 두 곳이라, 올릴 땐 같이 올린다.

## 작업 규칙 (Leo 선호 · yakizy와 동일)
- **한국어 존댓말 · 결론 먼저 · 짧은 줄 · 기호 남발/번역투 금지.**
- **추측 진단 금지** — 실코드·실측 기준. 작업 전 최신본 확인.
- 읽기 전용(조회·진단·테스트 실행)은 바로 실행. 변경(빌드·배포·커밋·스펙 변경)은 **무엇을·왜 하는지 알리고 실행**, 되돌리기 어려우면 확인받고 진행.
- 커밋·푸시는 묻지 말고 직접 실행(상시 승인). 단 브랜치 생성·강제 푸시·reset/revert는 확인받는다.
- 커밋 메시지는 **영어**, **`git add .` 금지**(변경한 파일만 명시 add — 위 .aab 이슈도 이 때문).
- 수동 `.bak` 백업 만들지 말 것. 메모리 자동 기록 금지·승인 후만.
