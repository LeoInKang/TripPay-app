// 여행 국가/통화 목록
// r100: 환율이 100단위로 고시되는 통화 (예: 일본 100엔 = 930원)
// exRate: 1단위당 원화 기본값(참고용, 앱에서 수정 가능). r100인 경우 100단위 기준.
export const REGIONS = ['아시아', '유럽', '미주', '오세아니아·기타'];

export const COUNTRIES = [
  // ── 아시아 ──
  { flag:'🇯🇵', name:'일본',        code:'JPY', sym:'¥',    r100:true,  exRate:'930',   region:'아시아' },
  { flag:'🇻🇳', name:'베트남',      code:'VND', sym:'₫',    r100:true,  exRate:'5.5',   region:'아시아' },
  { flag:'🇹🇭', name:'태국',        code:'THB', sym:'฿',    r100:false, exRate:'40',    region:'아시아' },
  { flag:'🇨🇳', name:'중국',        code:'CNY', sym:'¥',    r100:false, exRate:'195',   region:'아시아' },
  { flag:'🇹🇼', name:'대만',        code:'TWD', sym:'NT$',  r100:false, exRate:'43',    region:'아시아' },
  { flag:'🇭🇰', name:'홍콩',        code:'HKD', sym:'HK$',  r100:false, exRate:'178',   region:'아시아' },
  { flag:'🇲🇴', name:'마카오',      code:'MOP', sym:'MOP$', r100:false, exRate:'173',   region:'아시아' },
  { flag:'🇸🇬', name:'싱가포르',    code:'SGD', sym:'S$',   r100:false, exRate:'1020',  region:'아시아' },
  { flag:'🇲🇾', name:'말레이시아',  code:'MYR', sym:'RM',   r100:false, exRate:'310',   region:'아시아' },
  { flag:'🇵🇭', name:'필리핀',      code:'PHP', sym:'₱',    r100:false, exRate:'24',    region:'아시아' },
  { flag:'🇮🇩', name:'인도네시아',  code:'IDR', sym:'Rp',   r100:true,  exRate:'8.5',   region:'아시아' },
  { flag:'🇱🇦', name:'라오스',      code:'LAK', sym:'₭',    r100:true,  exRate:'6.2',   region:'아시아' },
  { flag:'🇰🇭', name:'캄보디아',    code:'KHR', sym:'៛',    r100:true,  exRate:'34',    region:'아시아' },
  { flag:'🇲🇲', name:'미얀마',      code:'MMK', sym:'K',    r100:true,  exRate:'65',    region:'아시아' },
  { flag:'🇮🇳', name:'인도',        code:'INR', sym:'₹',    r100:false, exRate:'16',    region:'아시아' },
  { flag:'🇳🇵', name:'네팔',        code:'NPR', sym:'Rs',   r100:false, exRate:'10',    region:'아시아' },
  { flag:'🇱🇰', name:'스리랑카',    code:'LKR', sym:'Rs',   r100:false, exRate:'4.6',   region:'아시아' },
  { flag:'🇲🇳', name:'몽골',        code:'MNT', sym:'₮',    r100:true,  exRate:'39',    region:'아시아' },
  { flag:'🇺🇿', name:'우즈베키스탄',code:'UZS', sym:'so\'m',r100:true,  exRate:'11',    region:'아시아' },
  { flag:'🇰🇿', name:'카자흐스탄',  code:'KZT', sym:'₸',    r100:false, exRate:'2.7',   region:'아시아' },
  { flag:'🇦🇪', name:'아랍에미리트',code:'AED', sym:'AED',  r100:false, exRate:'378',   region:'아시아' },
  { flag:'🇸🇦', name:'사우디',      code:'SAR', sym:'SR',   r100:false, exRate:'370',   region:'아시아' },
  { flag:'🇹🇷', name:'튀르키예',    code:'TRY', sym:'₺',    r100:false, exRate:'34',    region:'아시아' },
  { flag:'🇮🇱', name:'이스라엘',    code:'ILS', sym:'₪',    r100:false, exRate:'375',   region:'아시아' },

  // ── 유럽 ──
  { flag:'🇪🇺', name:'유럽(유로)',  code:'EUR', sym:'€',    r100:false, exRate:'1500',  region:'유럽',
    aliases:['유로','유로존','euro','룩셈부르크','슬로바키아','슬로베니아','리투아니아','라트비아','에스토니아','몰타','키프로스','크로아티아'] },
  { flag:'🇮🇹', name:'이탈리아',    code:'EUR', sym:'€',    r100:false, exRate:'1500',  region:'유럽', aliases:['italy'] },
  { flag:'🇫🇷', name:'프랑스',      code:'EUR', sym:'€',    r100:false, exRate:'1500',  region:'유럽', aliases:['france'] },
  { flag:'🇩🇪', name:'독일',        code:'EUR', sym:'€',    r100:false, exRate:'1500',  region:'유럽', aliases:['germany'] },
  { flag:'🇪🇸', name:'스페인',      code:'EUR', sym:'€',    r100:false, exRate:'1500',  region:'유럽', aliases:['spain'] },
  { flag:'🇳🇱', name:'네덜란드',    code:'EUR', sym:'€',    r100:false, exRate:'1500',  region:'유럽', aliases:['netherlands'] },
  { flag:'🇦🇹', name:'오스트리아',  code:'EUR', sym:'€',    r100:false, exRate:'1500',  region:'유럽', aliases:['austria'] },
  { flag:'🇵🇹', name:'포르투갈',    code:'EUR', sym:'€',    r100:false, exRate:'1500',  region:'유럽', aliases:['portugal'] },
  { flag:'🇬🇷', name:'그리스',      code:'EUR', sym:'€',    r100:false, exRate:'1500',  region:'유럽', aliases:['greece'] },
  { flag:'🇧🇪', name:'벨기에',      code:'EUR', sym:'€',    r100:false, exRate:'1500',  region:'유럽', aliases:['belgium'] },
  { flag:'🇮🇪', name:'아일랜드',    code:'EUR', sym:'€',    r100:false, exRate:'1500',  region:'유럽', aliases:['ireland'] },
  { flag:'🇫🇮', name:'핀란드',      code:'EUR', sym:'€',    r100:false, exRate:'1500',  region:'유럽', aliases:['finland'] },
  { flag:'🇬🇧', name:'영국',        code:'GBP', sym:'£',    r100:false, exRate:'1750',  region:'유럽' },
  { flag:'🇨🇭', name:'스위스',      code:'CHF', sym:'CHF',  r100:false, exRate:'1560',  region:'유럽' },
  { flag:'🇨🇿', name:'체코',        code:'CZK', sym:'Kč',   r100:false, exRate:'59',    region:'유럽' },
  { flag:'🇭🇺', name:'헝가리',      code:'HUF', sym:'Ft',   r100:false, exRate:'3.8',   region:'유럽' },
  { flag:'🇵🇱', name:'폴란드',      code:'PLN', sym:'zł',   r100:false, exRate:'345',   region:'유럽' },
  { flag:'🇸🇪', name:'스웨덴',      code:'SEK', sym:'kr',   r100:false, exRate:'130',   region:'유럽' },
  { flag:'🇳🇴', name:'노르웨이',    code:'NOK', sym:'kr',   r100:false, exRate:'125',   region:'유럽' },
  { flag:'🇩🇰', name:'덴마크',      code:'DKK', sym:'kr',   r100:false, exRate:'200',   region:'유럽' },
  { flag:'🇷🇺', name:'러시아',      code:'RUB', sym:'₽',    r100:false, exRate:'15',    region:'유럽' },

  // ── 미주 ──
  { flag:'🇺🇸', name:'미국',        code:'USD', sym:'$',    r100:false, exRate:'1350',  region:'미주' },
  { flag:'🇨🇦', name:'캐나다',      code:'CAD', sym:'C$',   r100:false, exRate:'980',   region:'미주' },
  { flag:'🇲🇽', name:'멕시코',      code:'MXN', sym:'MX$',  r100:false, exRate:'70',    region:'미주' },
  { flag:'🇧🇷', name:'브라질',      code:'BRL', sym:'R$',   r100:false, exRate:'240',   region:'미주' },
  { flag:'🇦🇷', name:'아르헨티나',  code:'ARS', sym:'AR$',  r100:true,  exRate:'130',   region:'미주' },
  { flag:'🇨🇱', name:'칠레',        code:'CLP', sym:'CLP$', r100:true,  exRate:'140',   region:'미주' },
  { flag:'🇵🇪', name:'페루',        code:'PEN', sym:'S/',   r100:false, exRate:'360',   region:'미주' },

  // ── 오세아니아·기타 ──
  { flag:'🇦🇺', name:'호주',        code:'AUD', sym:'A$',   r100:false, exRate:'900',   region:'오세아니아·기타' },
  { flag:'🇳🇿', name:'뉴질랜드',    code:'NZD', sym:'NZ$',  r100:false, exRate:'830',   region:'오세아니아·기타' },
  { flag:'🇬🇺', name:'괌·사이판',   code:'USD', sym:'$',    r100:false, exRate:'1350',  region:'오세아니아·기타' },
  { flag:'🇿🇦', name:'남아공',      code:'ZAR', sym:'R',    r100:false, exRate:'76',    region:'오세아니아·기타' },
  { flag:'🇪🇬', name:'이집트',      code:'EGP', sym:'E£',   r100:false, exRate:'28',    region:'오세아니아·기타' },
  { flag:'🇲🇦', name:'모로코',      code:'MAD', sym:'DH',   r100:false, exRate:'138',   region:'오세아니아·기타' },
];

// 자주 가는 국가 (선택 화면 상단 고정)

// 이름·코드·기호에 더해 별칭(aliases)까지 본다.
// 유로존 20개국은 통화가 같아 EUR 한 줄로 묶여 있는데, 사용자는 '이탈리아'처럼 나라 이름으로 찾는다.
export function searchCountries(query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return COUNTRIES;
  return COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.code.toLowerCase().includes(q) ||
    c.sym.toLowerCase().includes(q) ||
    (c.aliases || []).some(a => a.toLowerCase().includes(q))
  );
}
