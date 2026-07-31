// ===================================================================
// 사주 계산 핵심 엔진 (Saju / Four Pillars Calculation Engine)
// ===================================================================

// 천간 (Heavenly Stems) - 10개
const CHEONGAN = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
const CHEONGAN_HANJA = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
// 천간의 오행
const CHEONGAN_OHAENG = ['목', '목', '화', '화', '토', '토', '금', '금', '수', '수'];
// 천간의 음양 (true = 양)
const CHEONGAN_YINYANG = [true, false, true, false, true, false, true, false, true, false];

// 지지 (Earthly Branches) - 12개
const JIJI = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
const JIJI_HANJA = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
// 지지의 오행
const JIJI_OHAENG = ['수', '토', '목', '목', '토', '화', '화', '토', '금', '금', '토', '수'];
// 지지의 음양
const JIJI_YINYANG = [true, false, true, false, true, false, true, false, true, false, true, false];
// 지지가 담당하는 시간대 (24시간제 시작 시각, 각 지지는 2시간씩)
// 자시: 23:00~01:00, 축시: 01:00~03:00 ... 해시: 21:00~23:00
const JIJI_TIME_RANGE = [
  [23, 1], [1, 3], [3, 5], [5, 7], [7, 9], [9, 11],
  [11, 13], [13, 15], [15, 17], [17, 19], [19, 21], [21, 23]
];

// ---------------------------------------------------------------
// 절기(節氣) 정밀 계산 - 24절기 중 사주 계산에 필요한 "절"(각 달의 시작점) 12개
//
// [이전 버전의 문제점]
// 과거에는 "2000년 anchor + 연도 차이 × 365.2422일" 방식의 평균 운동 근사식을
// 사용했는데, 실제 절입 시각과 대조 검증한 결과 anchor(2000년)에서 멀어질수록
// 오차가 누적되어(anchor 자체 오차 포함 시 약 -7~8시간, 심한 경우 최대 하루)
// 절기 경계 근처 생일에서는 연주·월주가 통째로 잘못 나오는 문제가 있었다.
//
// [현재 버전]
// Jean Meeus, "Astronomical Algorithms"(2nd ed.)의 태양 겉보기 황경(apparent
// longitude) 저정밀 공식(오차 약 0.01도, 시간으로 대략 ±1분 내외)을 사용해
// 태양이 각 절기의 목표 황경(입춘=315°, 15° 간격)에 도달하는 정확한 시각을
// 뉴턴-랩슨 방식으로 역산한다. 실제 공식 절입시각과 대조 검증한 결과 오차는
// 대부분 ±10분 이내였다. 외부 API 없이도 어느 연도(과거/미래)든 계산 가능하다.
// ---------------------------------------------------------------

const DEG2RAD = Math.PI / 180;

// 각 절기 이름 + "절(節)"의 태양황경(도). 입춘부터 15도 간격.
const JUL_NAMES = [
  { name: '소한', longitude: 285 }, // 축월 시작
  { name: '입춘', longitude: 315 }, // 인월 시작 = 연주 기준점
  { name: '경칩', longitude: 345 }, // 묘월 시작
  { name: '청명', longitude: 15 },  // 진월 시작
  { name: '입하', longitude: 45 },  // 사월 시작
  { name: '망종', longitude: 75 },  // 오월 시작
  { name: '소서', longitude: 105 }, // 미월 시작
  { name: '입추', longitude: 135 }, // 신월 시작
  { name: '백로', longitude: 165 }, // 유월 시작
  { name: '한로', longitude: 195 }, // 술월 시작
  { name: '입동', longitude: 225 }, // 해월 시작
  { name: '대설', longitude: 255 }, // 자월 시작
];

// 뉴턴-랩슨 초기 추정값으로 쓸 절기별 평년 그레고리력 월/일
// (대략적인 시작점일 뿐, 최종 정밀도에는 영향 없음 — 반복 계산으로 실제 시각에 수렴)
const JUL_APPROX_MONTH_DAY = [
  [1, 6], [2, 4], [3, 6], [4, 5], [5, 6], [6, 6],
  [7, 7], [8, 8], [9, 8], [10, 8], [11, 7], [12, 7],
];

function dateToJD(date) {
  return date.getTime() / 86400000 + 2440587.5;
}
function jdToDate(jd) {
  return new Date((jd - 2440587.5) * 86400000);
}

// 태양의 겉보기 황경(도, 0~360)을 계산 (Meeus 저정밀 공식)
function sunApparentLongitude(jd) {
  const T = (jd - 2451545.0) / 36525.0; // 율리우스 세기(J2000.0 기준)

  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T; // 평균 황경
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;  // 평균 근점이각
  const Mrad = M * DEG2RAD;

  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mrad)
          + (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad)
          + 0.000289 * Math.sin(3 * Mrad); // 중심차

  const trueLong = L0 + C;

  // 장동(nutation) + 광행차(aberration) 보정 -> 겉보기 황경
  const omega = 125.04 - 1934.136 * T;
  const lambda = trueLong - 0.00569 - 0.00478 * Math.sin(omega * DEG2RAD);

  return ((lambda % 360) + 360) % 360;
}

// 목표 황경(targetDeg)에 태양이 도달하는 정확한 시각(JD)을 뉴턴 방식으로 역산
function solveForLongitude(targetDeg, approxJD) {
  let jd = approxJD;
  for (let i = 0; i < 8; i++) {
    const lon = sunApparentLongitude(jd);
    // 황경 차이를 -180~180 범위로 정규화 (0/360도 경계를 넘나드는 문제 방지)
    let diff = targetDeg - lon;
    diff = ((diff + 180) % 360 + 360) % 360 - 180;
    if (Math.abs(diff) < 1e-6) break;
    jd += diff / 0.9856; // 태양은 하루에 약 0.9856도 이동
  }
  return jd;
}

// 특정 연도, 특정 절기(jieqiIndex: 0=소한..11=대설)의 절입 시각을 구한다.
// 반환값은 epoch(실제 시각)이 정확한 Date 객체이며, KST 오프셋은
// findSolarTermPeriod()에서 입력 생일 쪽을 UTC로 맞춰 비교하므로 여기서는
// 별도의 타임존 보정을 하지 않는다(과거 버전은 여기서 +9시간을 잘못 더해
// 결과 자체가 9시간 밀리는 이중 보정 버그가 있었다).
function getJieqiDate(year, jieqiIndex) {
  const targetDeg = JUL_NAMES[jieqiIndex].longitude;
  const [m, d] = JUL_APPROX_MONTH_DAY[jieqiIndex];
  const approxDate = new Date(Date.UTC(year, m - 1, d, 0, 0));
  const approxJD = dateToJD(approxDate);
  const exactJD = solveForLongitude(targetDeg, approxJD);
  return jdToDate(exactJD);
}

// 특정 생일(로컬 KST 기준, year/month/day/hour/minute)이 속한 절기 인덱스와
// 해당 절기가 시작된 날짜를 반환
function findSolarTermPeriod(year, month, day, hour, minute) {
  // 입력 생일을 UTC로 변환 (KST = UTC+9)
  const birthUTC = new Date(Date.UTC(year, month - 1, day, hour - 9, minute));

  // 인접한 3년치 절기 목록 생성 (전년 12월~다음해 1월까지 커버)
  const candidates = [];
  for (let y = year - 1; y <= year + 1; y++) {
    for (let idx = 0; idx < 12; idx++) {
      candidates.push({ y, idx, date: getJieqiDate(y, idx) });
    }
  }
  candidates.sort((a, b) => a.date - b.date);

  // birthUTC 이전의 가장 최근 절기를 찾는다
  let currentPeriod = null;
  for (let i = 0; i < candidates.length; i++) {
    if (candidates[i].date <= birthUTC) {
      currentPeriod = candidates[i];
    } else {
      break;
    }
  }
  return currentPeriod; // { y, idx, date }
}

// ---------------------------------------------------------------
// 연주(年柱) 계산: 입춘(idx=1)을 기준으로 연도가 바뀐다.
// ---------------------------------------------------------------
function getYearPillarInfo(year, month, day, hour, minute) {
  const period = findSolarTermPeriod(year, month, day, hour, minute);
  // 입춘 이전(즉 period.idx가 소한(0)이거나, 전년도 대설(11)인 경우)이면 연도가 아직 안 바뀐 것
  let sajuYear = period.y;
  if (period.idx === 0) {
    // 소한 시기 = 아직 전년도 연주를 씀 (입춘 전이므로)
    sajuYear = period.y - 1 < year ? period.y : period.y; // 소한은 해당 y의 1월이므로 실제 사주연도는 y-1
    sajuYear = period.y - 1;
  } else if (period.idx === 11) {
    // 대설 시기(그 해 12월) = 아직 그 해 연주
    sajuYear = period.y;
  } else if (period.idx === 1) {
    // 입춘 이후 = 해당 연도부터 새 연주
    sajuYear = period.y;
  } else {
    sajuYear = period.idx === 0 ? period.y - 1 : period.y;
  }
  // 위 로직 정리: 입춘(idx>=1) 이후면 period.y, 소한(idx=0)이면 period.y - 1
  sajuYear = period.idx === 0 ? period.y - 1 : period.y;

  // 연간지 계산: 60갑자 순환. 기준점: 1984년 = 갑자년(년주 index 0)
  const REF_YEAR = 1984;
  let diff = (sajuYear - REF_YEAR) % 60;
  if (diff < 0) diff += 60;
  const cheonganIdx = diff % 10;
  const jijiIdx = diff % 12;
  return { cheonganIdx, jijiIdx, sajuYear };
}

// ---------------------------------------------------------------
// 월주(月柱) 계산: 월지는 절기로 고정(인월=1월~축월=12월),
// 월간은 연간에 따라 오호둔(五虎遁) 공식으로 결정.
// ---------------------------------------------------------------
// 절기 인덱스(0=소한...11=대설) -> 월지 인덱스 매핑
// 입춘(1)=인월(지지idx 2), 경칩(2)=묘월(3), 청명(3)=진월(4), 입하(4)=사월(5),
// 망종(5)=오월(6), 소서(6)=미월(7), 입추(7)=신월(8), 백로(8)=유월(9),
// 한로(9)=술월(10), 입동(10)=해월(11), 대설(11)=자월(0), 소한(0)=축월(1)
const JIEQI_TO_WOLJI = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0];

// 오호둔(五虎遁): 연간(年干)에 따라 인월(寅月)의 월간이 결정되고, 이후 순서대로 진행
// 갑/기년 -> 병인월부터, 을/경년 -> 무인월부터, 병/신년 -> 경인월부터,
// 정/임년 -> 임인월부터, 무/계년 -> 갑인월부터
const OHODUN_START = {
  0: 2, 5: 2, // 갑, 기 -> 병(2)
  1: 4, 6: 4, // 을, 경 -> 무(4)
  2: 6, 7: 6, // 병, 신 -> 경(6)
  3: 8, 8: 8, // 정, 임 -> 임(8)
  4: 0, 9: 0, // 무, 계 -> 갑(0)
};

function getMonthPillarInfo(yearCheonganIdx, jieqiIdx) {
  const wolJiIdx = JIEQI_TO_WOLJI[jieqiIdx]; // 월지(고정)
  // 인월(지지idx=2)부터 시작하는 순서로 만들어 몇 번째인지 계산
  // 지지 순서: 인(2) 묘(3) 진(4) 사(5) 오(6) 미(7) 신(8) 유(9) 술(10) 해(11) 자(0) 축(1)
  const order = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1];
  const stepFromIn = order.indexOf(wolJiIdx); // 인월로부터 몇 번째 달인지 (0-based)
  const startCheongan = OHODUN_START[yearCheonganIdx];
  const wolGanIdx = (startCheongan + stepFromIn) % 10;
  return { cheonganIdx: wolGanIdx, jijiIdx: wolJiIdx };
}

// ---------------------------------------------------------------
// 일주(日柱) 계산: 그레고리력 날짜를 율리우스적일수(JDN)로 바꾼 뒤 60 나머지로 계산.
// 기준: 1900년 1월 31일 = 갑진일(甲辰日) (공인된 명리학 계산 기준점)
// ---------------------------------------------------------------
function toJulianDayNumber(year, month, day) {
  // 표준 그레고리력 -> JDN 변환 공식
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

function getDayPillarInfo(year, month, day, hour) {
  // 자시(23:00~00:59)에 태어난 경우, 다음날 일주로 계산하는 것이 명리학 관행(조자시/야자시 이슈는 단순화하여 23시 이후는 익일로 처리)
  let calcYear = year, calcMonth = month, calcDay = day;
  if (hour >= 23) {
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() + 1);
    calcYear = d.getFullYear();
    calcMonth = d.getMonth() + 1;
    calcDay = d.getDate();
  }
  const jdn = toJulianDayNumber(calcYear, calcMonth, calcDay);
  // 1899-12-22 = 갑자일(甲子日, 60갑자 index 0). 실제 만세력 예시(2012-02-04 을미일 등)로
  // 역산 검증하여 확정한 기준점.
  const refJdn = toJulianDayNumber(1899, 12, 22);
  let diff = (jdn - refJdn) % 60;
  if (diff < 0) diff += 60;
  const cheonganIdx = diff % 10;
  const jijiIdx = diff % 12;
  return { cheonganIdx, jijiIdx };
}

// ---------------------------------------------------------------
// 시주(時柱) 계산: 시지는 태어난 시각으로 고정, 시간은 일간에 따라
// 오자둔(五子遁) 공식으로 결정.
// ---------------------------------------------------------------
function getSiJiIndex(hour, minute) {
  // 한국 표준시(UTC+9, 동경 135도)는 실제 한반도 경도(동경 127.5도 부근)보다 30분 빠르다.
  // 따라서 명리학에서 시지 경계를 판단할 때는 30분을 보정(-30분)하여 "진태양시에 가까운" 시각을 사용한다.
  // 예: 유시(酉時)의 표준 경계는 17:00~19:00이지만, 보정 후에는 17:30~19:30이 된다.
  // (이 -30분 보정 방향 자체는 다수 역술가들이 쓰는 방식이나, 아래 두 예외 기간은
  //  반영하지 않은 근사치임을 알아둘 것 — 정밀 계산이 필요하면 별도 룩업 테이블 추가 필요)
  //   1) 1954-03-21 ~ 1961-08-09: 한국이 동경 127도30분(UTC+8:30) 표준시를 실제로
  //      사용한 기간 — 이 기간은 보정값 자체가 달라져야 함
  //   2) 1948~1988년 사이 12차례 시행된 일광절약시간(서머타임) 기간 — 시계가 1시간
  //      앞당겨져 있었으므로 추가 보정이 필요하나 여기서는 반영하지 않음
  // 또한 자시(子時, 23:00~01:00) 경계 처리는 "23시 이후 익일로 계산"하는 정자시(正子時)
  // 방식 하나만 채택했는데, 이는 역술가들 사이에서도 야자시(夜子時) 방식과 이견이 있는
  // 지점이라 "유일한 정답"은 아님.
  const t = (hour + minute / 60) - 0.5;
  const tt = ((t % 24) + 24) % 24; // 음수 방지(0시 이전으로 넘어가는 경우 24시간 순환)
  if (tt >= 23 || tt < 1) return 0; // 자
  if (tt < 3) return 1; // 축
  if (tt < 5) return 2; // 인
  if (tt < 7) return 3; // 묘
  if (tt < 9) return 4; // 진
  if (tt < 11) return 5; // 사
  if (tt < 13) return 6; // 오
  if (tt < 15) return 7; // 미
  if (tt < 17) return 8; // 신
  if (tt < 19) return 9; // 유
  if (tt < 21) return 10; // 술
  return 11; // 해
}

// 오자둔(五子遁): 일간에 따라 자시(子時)의 시간이 결정
// 갑/기일 -> 갑자시부터, 을/경일 -> 병자시부터, 병/신일 -> 무자시부터,
// 정/임일 -> 경자시부터, 무/계일 -> 임자시부터
const OJADUN_START = {
  0: 0, 5: 0, // 갑,기 -> 갑(0)
  1: 2, 6: 2, // 을,경 -> 병(2)
  2: 4, 7: 4, // 병,신 -> 무(4)
  3: 6, 8: 6, // 정,임 -> 경(6)
  4: 8, 9: 8, // 무,계 -> 임(8)
};

function getHourPillarInfo(dayCheonganIdx, hour, minute) {
  const siJiIdx = getSiJiIndex(hour, minute);
  const startCheongan = OJADUN_START[dayCheonganIdx];
  const siGanIdx = (startCheongan + siJiIdx) % 10;
  return { cheonganIdx: siGanIdx, jijiIdx: siJiIdx };
}

// ---------------------------------------------------------------
// 전체 사주팔자 계산 메인 함수
// ---------------------------------------------------------------
function calculateSaju(year, month, day, hour, minute) {
  const period = findSolarTermPeriod(year, month, day, hour, minute);
  const yearPillar = getYearPillarInfo(year, month, day, hour, minute);
  const monthPillar = getMonthPillarInfo(yearPillar.cheonganIdx, period.idx);
  const dayPillar = getDayPillarInfo(year, month, day, hour);
  const hourPillar = getHourPillarInfo(dayPillar.cheonganIdx, hour, minute);

  function formatPillar(p) {
    return {
      cheongan: CHEONGAN[p.cheonganIdx],
      cheonganHanja: CHEONGAN_HANJA[p.cheonganIdx],
      jiji: JIJI[p.jijiIdx],
      jijiHanja: JIJI_HANJA[p.jijiIdx],
      ohaengCheongan: CHEONGAN_OHAENG[p.cheonganIdx],
      ohaengJiji: JIJI_OHAENG[p.jijiIdx],
      cheonganIdx: p.cheonganIdx,
      jijiIdx: p.jijiIdx,
    };
  }

  const result = {
    year: formatPillar(yearPillar),
    month: formatPillar(monthPillar),
    day: formatPillar(dayPillar),
    hour: formatPillar(hourPillar),
    sajuYear: yearPillar.sajuYear,
  };

  // 오행 분포 카운트 (8글자 = 4개 천간 + 4개 지지)
  const ohaengCount = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  [result.year, result.month, result.day, result.hour].forEach(p => {
    ohaengCount[p.ohaengCheongan]++;
    ohaengCount[p.ohaengJiji]++;
  });
  result.ohaengCount = ohaengCount;

  // 일간(日干) = 본인을 상징하는 핵심 오행
  result.ilgan = result.day.cheongan;
  result.ilganOhaeng = result.day.ohaengCheongan;

  return result;
}

// ===================================================================
// 지지(地支) 관계 — 육합(六合)/삼합(三合)/충(沖)/형(刑)/해(害)
// 명리학에서 두 사람의 궁합을 볼 때 일간(오행) 관계뿐 아니라
// 년지(띠)와 일지(부부궁)의 지지 관계도 함께 본다.
// ===================================================================

// 육합(六合): 지지끼리 짝을 이뤄 화합하는 관계. 서로를 편안하게 해주는 궁합.
// 자축합토, 인해합목, 묘술합화, 진유합금, 사신합수, 오미합화
const YUKHAP_PAIRS = [
  [0, 1],  // 자-축
  [2, 11], // 인-해
  [3, 10], // 묘-술
  [4, 9],  // 진-유
  [5, 8],  // 사-신
  [6, 7],  // 오-미
];

// 삼합(三合): 세 지지가 모여 하나의 강한 오행 기운을 이루는 관계 중 두 지지만 겹쳐도
// "반합(半合)"으로 통하는 좋은 궁합으로 본다. 여기서는 삼합 그룹 소속 여부로 판정.
// 신자진(수국), 인오술(화국), 사유축(금국), 해묘미(목국)
const SAMHAP_GROUPS = [
  [8, 0, 4],  // 신-자-진 (水局)
  [2, 6, 10], // 인-오-술 (火局)
  [5, 9, 1],  // 사-유-축 (金局)
  [11, 3, 7], // 해-묘-미 (木局)
];

// 충(沖): 정반대 방향의 지지끼리 강하게 부딪히는 관계. 서로 다른 기질이 정면충돌.
// 자오충, 축미충, 인신충, 묘유충, 진술충, 사해충 (지지 순서상 6칸씩 차이)
const CHUNG_PAIRS = [
  [0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11],
];

// 형(刑): 서로를 은근히 갉아먹거나 트집 잡기 쉬운 껄끄러운 관계.
// 인사신(무은지형), 축술미(지세지형), 자묘(무례지형), 진오유해(자형 포함 간소화)
const HYEONG_GROUPS = [
  [2, 5, 8],  // 인-사-신
  [1, 10, 7], // 축-술-미
  [0, 3],     // 자-묘
];
const JAHYEONG = [4, 6, 9, 11]; // 진/오/유/해는 같은 지지끼리 만나면 자형(自刑)

// 해(害): 육합을 방해하는 자리에서 생기는, 은근하고 사소하게 거슬리는 관계.
// 자미해, 축오해, 인사해, 묘진해, 신해해, 유술해
const HAE_PAIRS = [
  [0, 7], [1, 6], [2, 5], [3, 4], [8, 11], [9, 10],
];

function hasPair(list, a, b) {
  return list.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

// 두 지지(jijiIdx 0~11) 사이의 관계를 판정.
// 여러 관계가 동시에 성립할 수 있는 이론이지만, 여기서는 실사용성을 위해
// "가장 특징적인 관계 하나"를 우선순위(합 > 충 > 형 > 해 > 없음)로 뽑는다.
function getJijiRelation(idxA, idxB) {
  if (idxA === idxB) {
    return { type: '동일', label: '같은 지지', tone: 'neutral' };
  }
  if (hasPair(YUKHAP_PAIRS, idxA, idxB)) {
    return { type: '육합', label: '육합(六合) — 찰떡같이 화합', tone: 'good' };
  }
  const samhap = SAMHAP_GROUPS.find(g => g.includes(idxA) && g.includes(idxB));
  if (samhap) {
    return { type: '삼합', label: '삼합(三合) — 같은 방향을 보는 궁합', tone: 'good' };
  }
  if (hasPair(CHUNG_PAIRS, idxA, idxB)) {
    return { type: '충', label: '충(沖) — 정면으로 부딪히는 자리', tone: 'clash' };
  }
  const hyeong = HYEONG_GROUPS.find(g => g.includes(idxA) && g.includes(idxB));
  if (hyeong) {
    return { type: '형', label: '형(刑) — 은근히 신경전이 생기는 자리', tone: 'friction' };
  }
  if (hasPair(HAE_PAIRS, idxA, idxB)) {
    return { type: '해', label: '해(害) — 사소하게 거슬리는 자리', tone: 'friction' };
  }
  return { type: '평', label: '특별한 상호작용 없이 무난한 자리', tone: 'neutral' };
}

// 두 사람의 사주를 비교하여 궁합 관련 정보 산출
function analyzeCompatibility(sajuA, sajuB) {
  // 오행 상생 관계: 목생화, 화생토, 토생금, 금생수, 수생목
  const SANGSAENG = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' };
  // 오행 상극 관계: 목극토, 토극수, 수극화, 화극금, 금극목
  const SANGGEUK = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' };

  const totalCount = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  Object.keys(totalCount).forEach(k => {
    totalCount[k] = sajuA.ohaengCount[k] + sajuB.ohaengCount[k];
  });

  // 가장 부족한 오행 찾기 (커플 합산 기준)
  let minOhaeng = '목', minVal = Infinity;
  Object.entries(totalCount).forEach(([k, v]) => {
    if (v < minVal) { minVal = v; minOhaeng = k; }
  });

  // 가장 넘치는 오행
  let maxOhaeng = '목', maxVal = -Infinity;
  Object.entries(totalCount).forEach(([k, v]) => {
    if (v > maxVal) { maxVal = v; maxOhaeng = k; }
  });

  // 두 일간 사이의 관계(상생/상극/동일) 판정
  const ilganA = sajuA.ilganOhaeng, ilganB = sajuB.ilganOhaeng;
  let relation = '중립';
  if (ilganA === ilganB) relation = '동기';
  else if (SANGSAENG[ilganA] === ilganB || SANGSAENG[ilganB] === ilganA) relation = '상생';
  else if (SANGGEUK[ilganA] === ilganB || SANGGEUK[ilganB] === ilganA) relation = '상극';

  // 년지(年支) 관계 = 흔히 말하는 "띠 궁합"
  const yearJijiRelation = getJijiRelation(sajuA.year.jijiIdx, sajuB.year.jijiIdx);

  // 일지(日支) 관계 = 부부궁(配偶宮)끼리의 궁합. 명리학에서는 배우자 자리인
  // 일지의 상성을 연애/결혼 궁합에서 특히 중요하게 본다.
  const dayJijiRelation = getJijiRelation(sajuA.day.jijiIdx, sajuB.day.jijiIdx);

  // 오행 상호보완도: 각자 부족한 오행을 상대가 채워주는지 확인.
  // A에게 부족한(0~1개) 오행 중 B가 넉넉히(2개 이상) 가진 것이 있으면 "서로 채워주는 궁합".
  const OHAENG_KEYS = ['목', '화', '토', '금', '수'];
  const complement = { aFillsB: [], bFillsA: [] };
  OHAENG_KEYS.forEach(k => {
    if (sajuB.ohaengCount[k] <= 1 && sajuA.ohaengCount[k] >= 2) complement.aFillsB.push(k);
    if (sajuA.ohaengCount[k] <= 1 && sajuB.ohaengCount[k] >= 2) complement.bFillsA.push(k);
  });

  return {
    totalCount,
    minOhaeng, // 커플에게 부족한 오행 -> 보완 추천의 핵심
    maxOhaeng,
    relation,
    ilganA, ilganB,
    yearJijiRelation,
    dayJijiRelation,
    complement,
  };
}

// ===================================================================
// 오행별 추천 후보 데이터
// 계절은 오행별로 고정하되, 그 밖의 시간·색상·꽃·장소·데이트 방식은
// 두 사람의 실제 사주 조합을 시드로 삼아 여러 후보 중에서 안정적으로 선택한다.
// 같은 두 사람은 다시 계산해도 같은 추천을 받고, 다른 조합은 같은 부족 오행이어도
// 서로 다른 세부 추천을 받을 수 있다.
// ===================================================================
const OHAENG_INFO = {
  목: {
    season: '봄',
    seasonDetail: '새싹이 움트는 이른 봄',
    timeRange: '오전 7시~10시',
    timeDetail: '하루를 시작하며 계획을 세우기 좋은 시간',
    keyword: '새로운 시작',
    colors: [
      '초록색', '연두색', '청록색', '세이지그린', '올리브색', '민트색',
      '포레스트그린', '피스타치오색', '이끼색', '에메랄드색', '카키색', '라임색'
    ],
    flowers: [
      '튤립', '개나리', '유칼립투스', '프리지어', '라넌큘러스', '스위트피',
      '아이비', '몬스테라', '수선화', '은엽아카시아', '그린벨', '리시안셔스',
      '작은 야생화 다발', '허브 화분', '올리브나무'
    ],
    places: [
      '수목원에서 천천히 걷기', '식물원 온실 구경하기', '처음 가보는 동네 골목 산책',
      '강변 자전거 코스 달리기', '북카페에서 다음 여행 계획 세우기', '플리마켓 구경하기',
      '원데이클래스에서 작은 소품 만들기', '숲길 피크닉', '캠핑장에서 아침 산책',
      '차밭이나 허브 농원 방문', '새로 생긴 카페 찾아가기', '둘만의 산책 코스 만들기',
      '서점에서 서로 읽을 책 골라주기', '사진 산책하며 같은 장면 찍기',
      '근교 드라이브 후 가벼운 트레킹', '정원 카페에서 올해 하고 싶은 일 적기',
      '자전거 대여해 공원 한 바퀴 돌기', '작은 화분을 함께 고르고 키우기',
      '여행 박람회나 지역 축제 둘러보기', '새로운 운동을 체험 수업으로 배워보기'
    ],
    timeOptions: [
      { range: '오전 7시~9시', detail: '사람이 붐비기 전 산책이나 가벼운 아침 데이트에 어울려요.' },
      { range: '오전 9시~11시', detail: '새 장소를 찾아가거나 함께 계획을 세우기 좋은 시간이에요.' },
      { range: '오전 10시~낮 12시', detail: '브런치 뒤 전시·산책처럼 일정을 이어가기 편한 시간이에요.' },
      { range: '주말 오전', detail: '하루를 길게 쓸 수 있어 근교 나들이나 체험 활동에 잘 맞아요.' },
      { range: '해 뜬 뒤 2~3시간', detail: '몸과 마음이 깨어나는 시간이라 새로운 일을 시작하기 좋아요.' },
      { range: '오후 2시~4시', detail: '복잡하지 않은 장소에서 다음 계획을 이야기하기 좋아요.' },
      { range: '퇴근 직후 1~2시간', detail: '짧은 산책이나 새 카페 방문처럼 부담 없는 변화에 어울려요.' },
      { range: '맑은 날 오전', detail: '야외 활동을 곁들이면 서로의 반응과 취향을 자연스럽게 알 수 있어요.' }
    ],
    keywords: [
      '새로운 시작', '함께 세우는 계획', '가벼운 변화', '성장하는 관계',
      '첫걸음을 내딛는 용기', '새로운 취미', '움직이며 가까워지는 시간', '앞으로의 기대'
    ],
    summaryPool: [
      '둘이 먼저 계획을 꺼내고 새로운 경험을 시작하는 모습',
      '익숙한 데이트에서 벗어나 새로운 장소를 찾아보는 모습',
      '생각만 하던 일을 실제 약속으로 옮기는 추진력',
      '앞으로 함께 해보고 싶은 일을 자연스럽게 이야기하는 분위기',
      '서로의 관심사를 넓혀주고 새로운 취미를 만드는 과정',
      '관계가 정체되지 않도록 작은 변화를 자주 만드는 습관'
    ],
    dateTips: [
      '한 사람씩 번갈아 새로운 장소를 하나씩 골라보세요.',
      '이번 달에 함께 해볼 일을 세 가지 적고 하나를 바로 예약해보세요.',
      '익숙한 동네에서도 한 번도 가보지 않은 길로 산책해보세요.',
      '서로 배우고 싶었던 취미를 하나 골라 체험 수업부터 들어보세요.',
      '다음 여행의 지역만 먼저 정하고 각자 가고 싶은 곳을 두 군데씩 찾아보세요.',
      '작은 화분이나 허브를 함께 골라 꾸준히 돌보는 공동 목표를 만들어보세요.',
      '데이트가 반복된다고 느껴질 때는 장소보다 이동 방식부터 바꿔보세요.',
      '상대가 제안한 계획에 바로 평가하기보다 한 번은 실제로 해보는 편이 좋아요.',
      '한 달에 한 번은 사진·지도 기록이 남는 새로운 경험을 만들어보세요.',
      '서로의 버킷리스트에서 당장 가능한 항목 하나를 골라 실행해보세요.',
      '새로운 계획은 크게 잡기보다 이번 주 안에 끝낼 수 있는 크기로 정해보세요.',
      '데이트가 끝난 뒤 다음에 이어서 해볼 일을 하나만 정해두세요.'
    ],
    direction: '동쪽',
  },
  화: {
    season: '여름',
    seasonDetail: '태양이 가장 뜨거운 한여름',
    timeRange: '오후 3시~6시',
    timeDetail: '함께 웃고 반응을 나누기 좋은 활기찬 시간',
    keyword: '솔직한 표현',
    colors: [
      '빨간색', '주황색', '핑크색', '코랄색', '살구색', '로즈핑크',
      '체리레드', '버건디', '주홍색', '와인색', '복숭아색', '자주색'
    ],
    flowers: [
      '장미', '해바라기', '작약', '거베라', '다알리아', '카네이션',
      '맨드라미', '금어초', '알스트로메리아', '백일홍', '코스모스',
      '글라디올러스', '라즈베리색 리시안셔스', '주황 튤립', '붉은 아마릴리스'
    ],
    places: [
      '라이브 공연에서 함께 좋아하는 곡 듣기', '야시장 먹거리 하나씩 골라보기',
      '노을 지는 해변 산책', '스포츠 경기장에서 같이 응원하기',
      '놀이공원에서 사진 남기기', '노래방에서 서로의 애창곡 듣기',
      '루프탑에서 야경과 음악 즐기기', '댄스나 리듬 운동 체험하기',
      '쿠킹 클래스에서 매운 요리 만들기', '지역 축제나 퍼레이드 구경하기',
      '코미디 공연이나 토크쇼 보기', '포토부스에서 장난스러운 사진 찍기',
      '보드게임 카페에서 팀플레이 게임하기', '즉석 사진을 찍으며 하루 기록하기',
      '색감이 강한 전시 관람하기', '드라이브하며 서로 좋아하는 음악 틀기',
      '야외 영화제나 불꽃놀이 보기', '활기찬 번화가에서 맛집 두 곳 이어가기',
      '친구들과 가벼운 모임 함께하기', '테마가 있는 파티룸에서 기념일 보내기'
    ],
    timeOptions: [
      { range: '낮 12시~오후 2시', detail: '활동적인 데이트를 시작하고 반응을 바로 나누기 좋은 시간이에요.' },
      { range: '오후 3시~5시', detail: '공연·축제·맛집처럼 에너지가 필요한 일정에 잘 맞아요.' },
      { range: '해 질 무렵', detail: '노을이나 야외 풍경을 보며 자연스럽게 애정을 표현하기 좋아요.' },
      { range: '오후 6시~8시', detail: '식사와 공연을 이어가며 즐거운 분위기를 만들기 쉬워요.' },
      { range: '주말 늦은 오후', detail: '사진과 추억이 남는 활동적인 데이트를 계획하기 좋아요.' },
      { range: '기념일 저녁', detail: '평소보다 분명하게 마음을 표현하고 기억에 남는 장면을 만들기 좋아요.' },
      { range: '공연 시작 1시간 전', detail: '식사나 산책을 곁들이면 설렘이 자연스럽게 이어져요.' },
      { range: '맑은 날 해질녘', detail: '밝은 분위기와 감성적인 대화를 함께 가져가기 좋아요.' }
    ],
    keywords: [
      '솔직한 표현', '함께 웃는 시간', '설렘과 반응', '따뜻한 애정 표현',
      '기억에 남는 장면', '활기찬 데이트', '서로를 향한 관심', '분위기를 바꾸는 웃음'
    ],
    summaryPool: [
      '좋아하는 마음을 말과 표정으로 분명하게 보여주는 모습',
      '둘이 함께 웃고 즉각적으로 반응을 주고받는 분위기',
      '평범한 하루에도 기억에 남는 장면을 만드는 활기',
      '서운함보다 고마움과 애정을 먼저 표현하는 습관',
      '관계가 심심해지지 않도록 작은 이벤트를 만드는 모습',
      '상대가 기뻐할 때 함께 크게 기뻐해주는 반응'
    ],
    dateTips: [
      '데이트가 끝나기 전에 오늘 가장 좋았던 순간을 한 가지씩 말해보세요.',
      '고맙거나 보고 싶다는 말은 상대가 눈치채길 기다리지 말고 바로 표현해보세요.',
      '기념일이 아니어도 작은 간식이나 사진처럼 가벼운 깜짝 선물을 준비해보세요.',
      '공연·경기·축제처럼 같은 장면에 함께 반응할 수 있는 일정을 골라보세요.',
      '서운한 일이 있을 때는 비난보다 “나는 그때 조금 외로웠어”처럼 감정을 먼저 말해보세요.',
      '둘만 아는 노래나 사진 포즈처럼 반복할 수 있는 작은 의식을 만들어보세요.',
      '무표정하게 넘어가기보다 상대의 제안에 좋고 싫은 반응을 분명하게 보여주세요.',
      '일주일에 한 번은 칭찬이나 고마운 점을 구체적인 행동과 함께 말해보세요.',
      '사진만 찍고 끝내지 말고 왜 좋았는지 한 문장씩 기록해보세요.',
      '싸운 뒤에는 사과만 하지 말고 다음에 어떻게 다르게 행동할지도 함께 말해보세요.',
      '서로 좋아하는 음악을 세 곡씩 골라 함께 듣는 시간을 가져보세요.',
      '평소보다 조금 밝은 옷이나 소품을 맞춰 입고 사진을 남겨보세요.'
    ],
    direction: '남쪽',
  },
  토: {
    season: '환절기(늦여름·환절기)',
    seasonDetail: '계절과 계절 사이, 환절기의 안정된 기운',
    timeRange: '오후 1시~4시',
    timeDetail: '서두르지 않고 오래 머물며 대화하기 좋은 시간',
    keyword: '편안한 안정',
    colors: [
      '갈색', '황토색', '베이지', '크림색', '카멜색', '테라코타',
      '머스터드색', '모래색', '브라운', '아이보리', '오트밀색', '웜그레이'
    ],
    flowers: [
      '국화', '메리골드', '황금색 해바라기', '천일홍', '밀 이삭',
      '팜파스그래스', '브라운 장미', '골든볼', '카라', '목화',
      '드라이플라워 다발', '헬리크리섬', '노란 프리지어', '베이지 리시안셔스', '솔리다고'
    ],
    places: [
      '도자기 공방에서 컵 만들기', '한옥 마을 천천히 걷기',
      '온천이나 찜질방에서 쉬기', '브런치 카페에서 오래 대화하기',
      '베이킹 클래스에서 같은 메뉴 만들기', '전통시장에서 장을 보고 함께 요리하기',
      '근교 숙소에서 아무 일정 없이 쉬기', '공원 피크닉에서 간단한 도시락 먹기',
      '집에서 영화와 저녁을 함께 준비하기', '가구·생활용품 매장을 둘러보기',
      '한식 맛집에서 익숙한 메뉴 나눠 먹기', '농장 체험이나 과일 따기',
      '보드게임 카페에서 차분한 전략 게임하기', '동네 단골 카페를 정해 정기적으로 가기',
      '향초나 비누 공방 체험하기', '전통찻집에서 천천히 차 마시기',
      '쿠킹 스튜디오에서 일주일 반찬 만들기', '산책 뒤 족욕 카페 가기',
      '둘만의 월간 데이트 예산 정하기', '집 안 작은 공간을 함께 정리하고 꾸미기'
    ],
    timeOptions: [
      { range: '오전 11시~오후 1시', detail: '브런치와 산책을 이어가며 서두르지 않고 이야기하기 좋아요.' },
      { range: '오후 1시~3시', detail: '공방·카페처럼 한곳에 오래 머무는 일정에 잘 맞아요.' },
      { range: '오후 3시~5시', detail: '복잡한 일정 없이 차분한 활동을 함께 하기 좋아요.' },
      { range: '주말 오후', detail: '요리·정리·체험처럼 생활에 가까운 데이트를 하기 좋아요.' },
      { range: '비 오는 날 낮', detail: '실내에서 오래 머물며 편안한 대화를 나누기 좋아요.' },
      { range: '식사 전후 2시간', detail: '같이 먹고 준비하는 과정에서 안정감을 느끼기 좋아요.' },
      { range: '휴일 늦은 오전', detail: '시간을 재촉하지 않고 익숙한 장소에서 쉬기 좋아요.' },
      { range: '약속이 없는 오후', detail: '계획을 빽빽하게 채우지 않고 서로의 생활 속도를 맞추기 좋아요.' }
    ],
    keywords: [
      '편안한 안정', '꾸준한 신뢰', '함께 만드는 일상', '오래 머무는 시간',
      '생활 속 배려', '예측 가능한 약속', '따뜻한 휴식', '차분히 쌓이는 친밀감'
    ],
    summaryPool: [
      '약속과 일정을 꾸준히 지키며 관계를 편안하게 만드는 모습',
      '특별한 이벤트보다 반복되는 일상에서 신뢰를 쌓는 과정',
      '돈·시간·생활 문제를 미루지 않고 함께 정리하는 습관',
      '서두르지 않고 한 공간에 오래 머물며 편하게 대화하는 분위기',
      '상대가 힘들 때 말보다 실제 행동으로 챙겨주는 모습',
      '둘만의 안정적인 데이트 리듬과 생활 규칙을 만드는 과정'
    ],
    dateTips: [
      '매번 장소를 새로 찾기보다 둘 다 편한 단골 장소를 하나 만들어보세요.',
      '데이트 일정은 시작 시간뿐 아니라 돌아갈 시간까지 미리 맞춰보세요.',
      '여행이나 큰 지출 전에는 예산과 우선순위를 함께 적어보세요.',
      '한 달에 한 번은 같이 요리하거나 생활용품을 고르는 일상형 데이트를 해보세요.',
      '상대가 지쳤을 때 해결책부터 말하기보다 밥과 휴식부터 챙겨주세요.',
      '집안일이나 공동 일정은 기억에 맡기지 말고 캘린더에 역할을 나눠 적어보세요.',
      '싸운 뒤에는 누가 맞았는지보다 다음부터 반복하지 않을 행동을 하나 정해보세요.',
      '서로의 수면·식사·업무 리듬을 알아두면 불필요한 서운함이 줄어들어요.',
      '기념일보다 평소 약속을 지키는 모습을 더 중요하게 여겨주세요.',
      '무리한 일정 대신 한 장소에서 식사와 대화를 길게 이어가보세요.',
      '둘만의 월간 데이트 예산과 꼭 하고 싶은 일 하나를 함께 정해보세요.',
      '상대가 부담스러워하는 생활 문제는 작은 단위로 나누어 같이 처리해보세요.'
    ],
    direction: '중앙',
  },
  금: {
    season: '가을',
    seasonDetail: '결실을 맺는 청명한 가을',
    timeRange: '오후 5시~8시',
    timeDetail: '하루를 정리하며 차분한 결론을 내리기 좋은 시간',
    keyword: '분명한 약속',
    colors: [
      '흰색', '금색', '은색·그레이', '샴페인골드', '펄그레이', '쿨그레이',
      '라이트그레이', '스틸색', '아이보리화이트', '백금색', '차콜그레이', '크림화이트'
    ],
    flowers: [
      '백합', '은방울꽃', '흰 국화', '카라', '흰 장미', '안개꽃',
      '화이트 리시안셔스', '델피늄 화이트', '목화', '은엽 유칼립투스',
      '화이트 튤립', '스카비오사', '흰 작약', '실버 브루니아', '스타티스 화이트'
    ],
    places: [
      '미술관에서 작품 하나씩 골라 이야기하기', '전망대에서 하루를 정리하기',
      '고즈넉한 사찰이나 정원 걷기', '금속공예나 주얼리 공방 체험하기',
      '깔끔한 분위기의 레스토랑에서 예약 데이트하기', '사진관에서 단정한 커플 사진 남기기',
      '향수 공방에서 서로 어울리는 향 고르기', '클래식 공연이나 소규모 연주회 보기',
      '디자인 편집숍에서 취향 비교하기', '전시 도록이나 엽서 한 장씩 골라주기',
      '정돈된 북카페에서 각자 읽고 대화하기', '건축물이 인상적인 공간 둘러보기',
      '야경이 잘 보이는 전망 카페 가기', '재정·여행 계획을 노트에 함께 정리하기',
      '옷이나 액세서리를 하나씩 골라주기', '기념품을 오래 쓸 물건으로 고르기',
      '차분한 와인바 대신 무알코올 페어링 식당 가기', '공예 전시나 디자인 페어 관람하기',
      '둘의 사진을 골라 작은 앨범 만들기', '한 달 동안 지킬 공동 목표 정하기'
    ],
    timeOptions: [
      { range: '오후 4시~6시', detail: '전시를 보고 식사로 이어가며 생각을 정리하기 좋은 시간이에요.' },
      { range: '오후 5시~7시', detail: '하루의 분위기가 차분해져 중요한 이야기를 꺼내기 좋아요.' },
      { range: '오후 6시~8시', detail: '예약한 장소에서 집중도 높은 데이트를 하기 좋아요.' },
      { range: '해 진 직후', detail: '전망대나 정돈된 공간에서 서로의 계획을 나누기 좋아요.' },
      { range: '주말 늦은 오후', detail: '전시·공연·식사를 깔끔하게 이어가기 편한 시간이에요.' },
      { range: '한 달을 마무리하는 저녁', detail: '지출·일정·다음 달 계획을 함께 정리하기 좋아요.' },
      { range: '기념일 전날 저녁', detail: '선물보다 서로 원하는 방식을 미리 확인하기 좋아요.' },
      { range: '약속 시간보다 20분 이른 때', detail: '서두르지 않고 차분하게 하루 일정을 시작하기 좋아요.' }
    ],
    keywords: [
      '분명한 약속', '서로 존중하는 기준', '깔끔한 마무리', '함께 이루는 목표',
      '신뢰할 수 있는 태도', '정돈된 대화', '선명한 선택', '오래 남는 결과'
    ],
    summaryPool: [
      '연락·약속·돈 문제의 기준을 분명하게 맞추는 모습',
      '복잡한 문제를 미루지 않고 결론과 역할을 정하는 과정',
      '상대의 선택과 경계를 존중하며 신뢰를 쌓는 태도',
      '서로 원하는 것을 추측하지 않고 정확하게 확인하는 습관',
      '계획한 일을 끝까지 마무리해 함께 성취감을 느끼는 모습',
      '감정적인 지적보다 구체적인 요청으로 대화하는 분위기'
    ],
    dateTips: [
      '연락 빈도나 약속 변경 기준은 문제가 생기기 전에 구체적으로 맞춰보세요.',
      '상대의 잘못을 지적하기 전에 내가 원하는 행동을 한 문장으로 말해보세요.',
      '여행·지출·선물은 각자 중요하게 보는 기준을 먼저 세 가지씩 적어보세요.',
      '함께 찍은 사진이나 기록을 정리해 작은 결과물로 남겨보세요.',
      '한 달에 하나씩 끝낼 수 있는 공동 목표를 정하고 완료 여부를 확인해보세요.',
      '데이트 장소는 분위기뿐 아니라 소음·대기 시간·이동 거리도 함께 고려해보세요.',
      '칭찬할 때는 “좋았어”보다 어떤 행동이 좋았는지 구체적으로 말해주세요.',
      '상대가 거절했을 때 이유를 캐묻기보다 가능한 다른 선택지를 두 개 정도 제안해보세요.',
      '싸울 때 과거의 일을 모아 말하지 말고 지금 해결할 문제 하나만 다뤄보세요.',
      '약속을 바꿔야 한다면 사과와 함께 새 시간까지 바로 제안해주세요.',
      '서로의 개인 시간과 연락이 필요한 시간을 구분해 합의해보세요.',
      '선택지가 많을 때는 각자 양보하기 어려운 조건 하나씩만 먼저 정해보세요.'
    ],
    direction: '서쪽',
  },
  수: {
    season: '겨울',
    seasonDetail: '고요히 응축되는 깊은 겨울',
    timeRange: '저녁 8시~밤 11시',
    timeDetail: '주변이 조용해져 속마음을 천천히 나누기 좋은 시간',
    keyword: '깊은 대화',
    colors: [
      '검은색', '남색', '짙은 파란색', '네이비', '코발트블루', '인디고',
      '블루그레이', '먹색', '청회색', '군청색', '딥블루', '아쿠아블루'
    ],
    flowers: [
      '수국', '동백꽃', '블루 델피늄', '아이리스', '블루 스타',
      '라벤더', '아네모네 블루', '히아신스', '푸른 리시안셔스',
      '에린지움', '블루 데이지', '무스카리', '짙은 보라 장미',
      '청보라 스타티스', '옥시페탈룸'
    ],
    places: [
      '강변 야경을 보며 천천히 걷기', '수족관에서 말없이 풍경 함께 보기',
      '조용한 카페 구석자리에서 오래 대화하기', '호숫가 드라이브',
      '스파나 온수풀에서 쉬기', '심야 영화 뒤 감상 나누기',
      '재즈 공연이나 잔잔한 라이브 듣기', '북카페에서 각자 읽다가 이야기하기',
      '비 오는 날 창가 카페 가기', '천문대나 별이 보이는 곳 방문하기',
      '조용한 해변에서 파도 소리 듣기', '한강이나 하천 산책로 야간 걷기',
      '숙소에서 휴대폰을 내려놓고 쉬기', '서로의 어린 시절 사진 보며 이야기하기',
      '차분한 보드게임이나 퍼즐 맞추기', '뮤지엄 야간 개장 관람하기',
      '심야 드라이브하며 플레이리스트 듣기', '족욕이나 마사지로 피로 풀기',
      '조용한 찻집에서 질문 카드 나누기', '서로의 고민을 끊지 않고 10분씩 들어주기'
    ],
    timeOptions: [
      { range: '저녁 7시~9시', detail: '하루의 긴장이 풀려 속마음을 천천히 꺼내기 좋아요.' },
      { range: '저녁 8시~10시', detail: '주변이 조용해져 깊은 대화나 야경 산책에 잘 맞아요.' },
      { range: '밤 9시~11시', detail: '결론을 재촉하지 않고 서로의 이야기를 끝까지 듣기 좋아요.' },
      { range: '비 오는 날 저녁', detail: '실내에서 차분히 머물며 감정을 정리하기 좋아요.' },
      { range: '주말 밤', detail: '다음 날 부담이 적어 늦은 영화나 긴 대화를 하기 좋아요.' },
      { range: '해 진 뒤 1~2시간', detail: '야경·산책·드라이브처럼 조용한 활동에 어울려요.' },
      { range: '잠들기 2시간 전', detail: '민감한 문제를 해결하기보다 마음을 나누는 대화에 좋아요.' },
      { range: '사람이 적은 평일 저녁', detail: '붐비지 않는 공간에서 서로에게 집중하기 좋아요.' }
    ],
    keywords: [
      '깊은 대화', '충분한 휴식', '말없이도 편한 시간', '감정을 정리하는 여유',
      '서로의 속마음', '차분한 공감', '기다려주는 태도', '조용히 쌓이는 신뢰'
    ],
    summaryPool: [
      '서둘러 결론을 내리지 않고 서로의 이야기를 끝까지 듣는 모습',
      '말이 적어져도 무시하지 않고 다시 대화할 시간을 정하는 습관',
      '바쁜 일정 속에서 둘만 조용히 쉬어가는 시간을 확보하는 모습',
      '상대의 감정을 해결하려 들기보다 충분히 이해해주는 태도',
      '겉으로 드러난 말보다 그 안의 이유를 천천히 확인하는 과정',
      '함께 있어도 각자의 생각과 휴식 시간을 존중하는 분위기'
    ],
    dateTips: [
      '민감한 이야기는 이동 중보다 조용히 앉아 있을 수 있는 장소에서 꺼내보세요.',
      '상대가 생각할 시간이 필요하다고 하면 언제 다시 이야기할지만 약속해주세요.',
      '서로 번갈아 10분씩 말하고 중간에 해결책을 제안하지 않는 대화를 해보세요.',
      '야경 산책이나 드라이브처럼 침묵이 어색하지 않은 일정을 골라보세요.',
      '피곤한 날에는 새로운 활동보다 온수욕·마사지·조용한 식사처럼 회복을 우선해보세요.',
      '싸운 직후 메시지를 길게 보내기보다 감정이 가라앉은 뒤 짧고 분명하게 말해보세요.',
      '서로의 고민을 들은 뒤 “내가 들어주면 될까, 해결 방법을 같이 찾을까?”라고 물어보세요.',
      '휴대폰을 내려놓고 30분만 서로에게 집중하는 시간을 만들어보세요.',
      '같은 영화를 보고 각자 인상 깊었던 장면을 이야기해보세요.',
      '말수가 줄었을 때 괜찮다고 단정하지 말고 필요한 것이 있는지 한 번 확인해주세요.',
      '데이트 사이에 혼자 쉬는 시간이 필요하다는 점을 자연스럽게 인정해주세요.',
      '결론 없는 대화도 괜찮다는 마음으로 감정과 상황을 구분해 들어보세요.'
    ],
    direction: '북쪽',
  },
};


// ===================================================================
// 꽃말 기반 추천
//
// 꽃말은 시대·문화·꽃 색상에 따라 여러 해석이 공존하므로, 이 사이트에서는
// 관계 궁합에 활용하기 좋은 긍정적인 현대 해석으로 기준을 통일한다.
// 먼저 부족한 오행에 속한 꽃 후보군을 정한 뒤,
// 1) 일간 관계, 2) 년지·일지 관계, 3) 서로에게 도움이 되는 방식에 맞는 꽃말을
// 각각 평가하여 점수가 높은 꽃을 추천한다. 해시는 동점일 때만 사용한다.
// ===================================================================
const FLOWER_TAG_LABEL = {
  love: '사랑',
  affection: '애정 표현',
  passion: '설렘과 열정',
  joy: '함께하는 기쁨',
  admiration: '존중과 감탄',
  gratitude: '고마움',
  support: '서로 돕는 마음',
  mutualSupport: '서로 주고받는 도움',
  trust: '신뢰',
  devotion: '한결같은 마음',
  loyalty: '변치 않는 마음',
  promise: '약속',
  sincerity: '진심',
  honesty: '솔직함',
  respect: '존중',
  understanding: '이해',
  communication: '대화',
  reconciliation: '화해',
  forgiveness: '서운함을 푸는 마음',
  patience: '기다려주는 마음',
  calm: '차분함',
  comfort: '편안함',
  steadiness: '꾸준함',
  harmony: '조화',
  balance: '균형',
  partnership: '동반자 관계',
  friendship: '친근함과 우정',
  deepBond: '깊은 유대',
  lastingLove: '오래가는 사랑',
  individuality: '서로의 다름 존중',
  growth: '함께 성장함',
  newBeginning: '새로운 시작',
  hope: '희망',
  curiosity: '새로운 경험',
  sharedExperience: '함께 쌓는 추억',
  healing: '회복과 위로',
  protection: '든든한 보호',
  memory: '오래 남는 추억',
  peace: '평화로운 관계',
  courage: '용기',
  warmth: '따뜻함',
  prosperity: '함께 만드는 결실',
};

const FLOWER_MEANING_RULES = [
  { match: ['화이트 튤립'], meaning: '진심 어린 사과와 새로운 출발', tags: ['reconciliation', 'sincerity', 'newBeginning', 'forgiveness'] },
  { match: ['주황 튤립'], meaning: '따뜻한 관심과 밝은 설렘', tags: ['affection', 'warmth', 'joy', 'passion'] },
  { match: ['튤립'], meaning: '배려와 진심 어린 사랑', tags: ['love', 'sincerity', 'care', 'newBeginning'] },
  { match: ['개나리'], meaning: '희망과 반가운 시작', tags: ['hope', 'newBeginning', 'joy', 'growth'] },
  { match: ['은엽 유칼립투스', '유칼립투스'], meaning: '회복과 든든한 보호', tags: ['healing', 'protection', 'calm', 'support'] },
  { match: ['프리지어'], meaning: '순수한 믿음과 새로운 시작', tags: ['trust', 'sincerity', 'newBeginning', 'friendship'] },
  { match: ['라넌큘러스'], meaning: '서로의 매력을 알아보는 마음', tags: ['admiration', 'affection', 'joy', 'love'] },
  { match: ['스위트피'], meaning: '고마움과 즐거운 추억', tags: ['gratitude', 'memory', 'joy', 'sharedExperience'] },
  { match: ['아이비'], meaning: '굳건한 우정과 오래가는 결속', tags: ['loyalty', 'friendship', 'lastingLove', 'partnership'] },
  { match: ['몬스테라'], meaning: '함께 자라는 관계와 번영', tags: ['growth', 'prosperity', 'partnership', 'hope'] },
  { match: ['수선화'], meaning: '새로운 시작과 자신을 존중하는 마음', tags: ['newBeginning', 'respect', 'hope', 'individuality'] },
  { match: ['은엽아카시아'], meaning: '세심한 배려와 따뜻한 우정', tags: ['support', 'friendship', 'warmth', 'gratitude'] },
  { match: ['그린벨'], meaning: '기쁜 소식과 밝은 기대', tags: ['hope', 'joy', 'newBeginning', 'curiosity'] },
  { match: ['리시안셔스'], meaning: '변치 않는 사랑과 고마움', tags: ['lastingLove', 'gratitude', 'devotion', 'sincerity'] },
  { match: ['작은 야생화 다발'], meaning: '꾸밈없는 마음과 자연스러운 친밀감', tags: ['sincerity', 'friendship', 'comfort', 'individuality'] },
  { match: ['허브 화분'], meaning: '일상 속 돌봄과 천천히 회복하는 마음', tags: ['healing', 'steadiness', 'support', 'comfort'] },
  { match: ['올리브나무'], meaning: '평화와 화해, 오래 이어지는 관계', tags: ['peace', 'reconciliation', 'lastingLove', 'partnership'] },

  { match: ['흰 장미'], meaning: '순수한 진심과 서로를 향한 존중', tags: ['sincerity', 'respect', 'trust', 'love'] },
  { match: ['브라운 장미'], meaning: '편안한 애정과 안정적인 신뢰', tags: ['comfort', 'trust', 'steadiness', 'affection'] },
  { match: ['짙은 보라 장미'], meaning: '깊은 매력과 특별한 존중', tags: ['admiration', 'respect', 'deepBond', 'love'] },
  { match: ['장미'], meaning: '사랑과 솔직한 애정 표현', tags: ['love', 'affection', 'passion', 'sincerity'] },
  { match: ['황금색 해바라기', '해바라기'], meaning: '한결같은 마음과 밝은 응원', tags: ['devotion', 'support', 'joy', 'loyalty'] },
  { match: ['흰 작약'], meaning: '차분한 행복과 깊은 배려', tags: ['comfort', 'support', 'lastingLove', 'sincerity'] },
  { match: ['작약'], meaning: '행복한 관계와 다정한 사랑', tags: ['love', 'joy', 'lastingLove', 'warmth'] },
  { match: ['거베라'], meaning: '희망과 함께 웃는 기쁨', tags: ['hope', 'joy', 'support', 'friendship'] },
  { match: ['다알리아'], meaning: '품위 있는 헌신과 단단한 마음', tags: ['devotion', 'respect', 'courage', 'loyalty'] },
  { match: ['카네이션'], meaning: '사랑과 감사, 따뜻한 돌봄', tags: ['love', 'gratitude', 'warmth', 'support'] },
  { match: ['맨드라미'], meaning: '쉽게 변하지 않는 열정적인 마음', tags: ['passion', 'loyalty', 'lastingLove', 'courage'] },
  { match: ['금어초'], meaning: '솔직하게 마음을 말하는 용기', tags: ['communication', 'honesty', 'courage', 'sincerity'] },
  { match: ['알스트로메리아'], meaning: '서로를 지지하는 우정과 헌신', tags: ['friendship', 'support', 'devotion', 'partnership'] },
  { match: ['백일홍'], meaning: '오래 기억하는 마음과 변치 않는 우정', tags: ['memory', 'loyalty', 'friendship', 'lastingLove'] },
  { match: ['코스모스'], meaning: '조화와 순수한 마음', tags: ['harmony', 'sincerity', 'balance', 'peace'] },
  { match: ['글라디올러스'], meaning: '진실한 마음과 관계를 지키는 용기', tags: ['honesty', 'courage', 'devotion', 'sincerity'] },
  { match: ['붉은 아마릴리스'], meaning: '자신 있게 표현하는 매력과 열정', tags: ['passion', 'admiration', 'courage', 'affection'] },

  { match: ['흰 국화'], meaning: '진실한 마음과 성실한 약속', tags: ['sincerity', 'steadiness', 'promise', 'respect'] },
  { match: ['국화'], meaning: '성실함과 오래 이어지는 진심', tags: ['steadiness', 'sincerity', 'lastingLove', 'trust'] },
  { match: ['메리골드'], meaning: '따뜻한 위로와 다시 웃는 힘', tags: ['healing', 'warmth', 'joy', 'support'] },
  { match: ['천일홍'], meaning: '변치 않는 마음과 오래가는 인연', tags: ['loyalty', 'lastingLove', 'memory', 'devotion'] },
  { match: ['밀 이삭'], meaning: '함께 일군 결실과 풍요', tags: ['prosperity', 'partnership', 'steadiness', 'gratitude'] },
  { match: ['팜파스그래스'], meaning: '서로의 자유를 품어주는 마음', tags: ['individuality', 'balance', 'comfort', 'respect'] },
  { match: ['골든볼'], meaning: '밝은 희망과 즐거운 에너지', tags: ['hope', 'joy', 'warmth', 'support'] },
  { match: ['카라'], meaning: '순수한 존중과 단정한 약속', tags: ['respect', 'sincerity', 'promise', 'trust'] },
  { match: ['목화'], meaning: '포근한 사랑과 변치 않는 돌봄', tags: ['comfort', 'love', 'support', 'steadiness'] },
  { match: ['드라이플라워 다발'], meaning: '오래 간직하고 싶은 추억', tags: ['memory', 'lastingLove', 'gratitude', 'sharedExperience'] },
  { match: ['헬리크리섬'], meaning: '변하지 않는 기억과 오래가는 마음', tags: ['memory', 'loyalty', 'lastingLove', 'devotion'] },
  { match: ['노란 프리지어'], meaning: '밝은 우정과 믿음', tags: ['friendship', 'trust', 'joy', 'sincerity'] },
  { match: ['솔리다고'], meaning: '격려와 함께 이루는 성공', tags: ['support', 'prosperity', 'partnership', 'hope'] },

  { match: ['백합'], meaning: '순수한 마음과 깊은 존중', tags: ['sincerity', 'respect', 'trust', 'peace'] },
  { match: ['은방울꽃'], meaning: '다시 찾아오는 행복', tags: ['reconciliation', 'joy', 'hope', 'healing'] },
  { match: ['안개꽃'], meaning: '맑은 마음과 오래가는 사랑', tags: ['sincerity', 'lastingLove', 'love', 'devotion'] },
  { match: ['화이트 리시안셔스'], meaning: '변치 않는 진심과 감사', tags: ['sincerity', 'gratitude', 'devotion', 'lastingLove'] },
  { match: ['델피늄 화이트'], meaning: '열린 마음과 부드러운 소통', tags: ['communication', 'sincerity', 'peace', 'understanding'] },
  { match: ['화이트 튤립'], meaning: '진심 어린 사과와 새로운 출발', tags: ['reconciliation', 'sincerity', 'newBeginning', 'forgiveness'] },
  { match: ['스카비오사'], meaning: '쉽게 말하지 못한 깊은 마음', tags: ['deepBond', 'sincerity', 'communication', 'understanding'] },
  { match: ['실버 브루니아'], meaning: '단단한 신뢰와 서로를 지켜주는 마음', tags: ['trust', 'protection', 'loyalty', 'support'] },
  { match: ['스타티스 화이트'], meaning: '변치 않는 기억과 성실한 마음', tags: ['memory', 'steadiness', 'loyalty', 'sincerity'] },

  { match: ['수국'], meaning: '진심 어린 이해와 감사', tags: ['understanding', 'gratitude', 'communication', 'healing'] },
  { match: ['동백꽃'], meaning: '겸손하고 변치 않는 사랑', tags: ['lastingLove', 'devotion', 'sincerity', 'respect'] },
  { match: ['블루 델피늄'], meaning: '열린 마음과 깊은 소통', tags: ['communication', 'understanding', 'deepBond', 'sincerity'] },
  { match: ['아이리스'], meaning: '믿음과 희망, 지혜로운 관계', tags: ['trust', 'hope', 'understanding', 'respect'] },
  { match: ['블루 스타'], meaning: '서로를 믿는 행복한 사랑', tags: ['trust', 'love', 'joy', 'loyalty'] },
  { match: ['라벤더'], meaning: '평온함과 한결같은 헌신', tags: ['calm', 'devotion', 'healing', 'loyalty'] },
  { match: ['아네모네 블루'], meaning: '기다림 속에서도 이어지는 기대', tags: ['patience', 'hope', 'sincerity', 'deepBond'] },
  { match: ['히아신스'], meaning: '진심과 마음의 평온', tags: ['sincerity', 'calm', 'healing', 'understanding'] },
  { match: ['에린지움'], meaning: '서로의 독립성을 지켜주는 오래가는 마음', tags: ['individuality', 'respect', 'loyalty', 'lastingLove'] },
  { match: ['블루 데이지'], meaning: '평화와 믿음, 편안한 친밀감', tags: ['peace', 'trust', 'comfort', 'friendship'] },
  { match: ['무스카리'], meaning: '관용과 쉽게 흔들리지 않는 신뢰', tags: ['forgiveness', 'trust', 'patience', 'loyalty'] },
  { match: ['청보라 스타티스'], meaning: '변치 않는 마음과 오래 남는 추억', tags: ['loyalty', 'memory', 'lastingLove', 'deepBond'] },
  { match: ['옥시페탈룸'], meaning: '서로를 믿는 행복한 사랑', tags: ['trust', 'love', 'joy', 'partnership'] },
];

const FLOWER_ELEMENT_FALLBACK = {
  목: { meaning: '함께 성장하고 새로운 일을 시작하는 마음', tags: ['growth', 'newBeginning', 'hope', 'curiosity'] },
  화: { meaning: '좋아하는 마음을 솔직하게 표현하는 사랑', tags: ['love', 'affection', 'passion', 'joy'] },
  토: { meaning: '편안함과 오래 이어지는 신뢰', tags: ['comfort', 'trust', 'steadiness', 'devotion'] },
  금: { meaning: '진심과 서로를 존중하는 약속', tags: ['sincerity', 'respect', 'promise', 'trust'] },
  수: { meaning: '깊은 이해와 차분하게 기다리는 마음', tags: ['understanding', 'calm', 'patience', 'deepBond'] },
};

function getFlowerMeaningInfo(name, ohaeng) {
  // '리시안셔스'보다 '화이트 리시안셔스'처럼 더 구체적인 이름을 우선한다.
  const matches = FLOWER_MEANING_RULES
    .map(rule => {
      const matchedKeyword = rule.match
        .filter(keyword => String(name).includes(keyword))
        .sort((a, b) => b.length - a.length)[0];
      return matchedKeyword ? { rule, matchedLength: matchedKeyword.length } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.matchedLength - a.matchedLength);
  const found = matches[0]?.rule;
  const fallback = FLOWER_ELEMENT_FALLBACK[ohaeng] || FLOWER_ELEMENT_FALLBACK.토;
  return {
    name,
    meaning: found?.meaning || fallback.meaning,
    tags: [...new Set(found?.tags || fallback.tags)],
    source: found ? 'library' : 'fallback',
  };
}

function relationFlowerTheme(context) {
  const relation = context?.relation;
  if (relation === '상생') {
    return {
      key: 'relation',
      title: '서로 힘을 보태는 마음',
      tags: ['support', 'mutualSupport', 'gratitude', 'devotion', 'partnership'],
      intro: '서로 자연스럽게 힘을 보태는 장점을 오래 이어가라는 의미로',
    };
  }
  if (relation === '상극') {
    return {
      key: 'relation',
      title: '부딪힌 뒤 다시 이해하는 마음',
      tags: ['reconciliation', 'understanding', 'patience', 'respect', 'communication', 'forgiveness'],
      intro: '의견이 부딪힐 때도 상대를 이기려 하기보다 다시 이해하고 대화하라는 의미로',
    };
  }
  if (relation === '동기') {
    return {
      key: 'relation',
      title: '닮은 점과 다른 점을 함께 존중하는 마음',
      tags: ['harmony', 'balance', 'individuality', 'friendship', 'respect'],
      intro: '닮은 점은 즐기고 같은 고집이 생길 때는 서로의 차이를 존중하라는 의미로',
    };
  }
  if (relation === '중립') {
    return {
      key: 'relation',
      title: '함께 경험을 쌓는 마음',
      tags: ['sharedExperience', 'curiosity', 'friendship', 'newBeginning', 'joy'],
      intro: '같은 취미와 새로운 장소에서의 좋은 경험이 두 사람을 더 가깝게 만든다는 의미로',
    };
  }
  return {
    key: 'relation',
    title: '지금 두 사람에게 필요한 마음',
    tags: ['trust', 'understanding', 'support', 'sincerity', 'sharedExperience'],
    intro: '현재 확인 가능한 사주 흐름에서 두 사람에게 도움이 되는 태도를 담아',
  };
}

function closenessFlowerTheme(context) {
  const dayTone = context?.dayJijiRelation?.tone;
  const yearTone = context?.yearJijiRelation?.tone;
  if (dayTone === 'good') {
    return {
      key: 'closeness',
      title: '가까워질수록 커지는 신뢰',
      tags: ['trust', 'lastingLove', 'partnership', 'comfort', 'deepBond'],
      intro: '가까워질수록 편안해지는 장점을 오래가는 신뢰로 이어가라는 의미로',
    };
  }
  if (dayTone === 'clash') {
    return {
      key: 'closeness',
      title: '생활 방식의 차이를 푸는 마음',
      tags: ['reconciliation', 'communication', 'patience', 'understanding', 'peace', 'calm'],
      intro: '가까워진 뒤 드러나는 생활 방식의 차이를 차분한 대화와 화해로 풀어가라는 의미로',
    };
  }
  if (dayTone === 'friction') {
    return {
      key: 'closeness',
      title: '작은 서운함을 쌓아두지 않는 마음',
      tags: ['forgiveness', 'honesty', 'communication', 'understanding', 'warmth'],
      intro: '사소한 서운함을 오래 쌓지 않고 부드럽게 말해 풀어가라는 의미로',
    };
  }
  if (yearTone === 'good') {
    return {
      key: 'closeness',
      title: '함께 움직일 때 잘 맞는 호흡',
      tags: ['partnership', 'harmony', 'sharedExperience', 'trust', 'support'],
      intro: '밖에서 함께 활동하거나 목표를 세울 때 잘 맞는 호흡을 살리라는 의미로',
    };
  }
  if (yearTone === 'clash' || yearTone === 'friction') {
    return {
      key: 'closeness',
      title: '생활 기준을 맞춰가는 마음',
      tags: ['respect', 'communication', 'balance', 'patience', 'promise'],
      intro: '돈·일정·가족·연락처럼 생활 기준이 다른 부분을 미리 맞춰가라는 의미로',
    };
  }
  return {
    key: 'closeness',
    title: '일상에서 천천히 쌓는 친밀감',
    tags: ['comfort', 'friendship', 'steadiness', 'sharedExperience', 'trust'],
    intro: '특별한 이벤트보다 반복되는 일상 속 좋은 경험을 천천히 쌓으라는 의미로',
  };
}

function complementFlowerTheme(ohaeng, context) {
  const aFillsB = context?.complement?.aFillsB || [];
  const bFillsA = context?.complement?.bFillsA || [];
  const fallbackTags = FLOWER_ELEMENT_FALLBACK[ohaeng]?.tags || [];
  if (aFillsB.length > 0 && bFillsA.length > 0) {
    return {
      key: 'complement',
      title: '서로 주고받는 도움에 대한 감사',
      tags: ['mutualSupport', 'gratitude', 'partnership', 'support', 'devotion', 'trust'],
      intro: '두 사람이 서로 다른 방식으로 힘을 보태는 관계이므로, 받은 배려를 당연하게 여기지 말고 다시 돌려주라는 의미로',
    };
  }
  if (aFillsB.length > 0 || bFillsA.length > 0) {
    return {
      key: 'complement',
      title: '한쪽의 배려를 당연하게 여기지 않는 마음',
      tags: ['gratitude', 'respect', 'support', 'devotion', 'trust', 'warmth'],
      intro: '한 사람이 먼저 챙기거나 방향을 잡아주는 순간이 많을 수 있어, 그 배려를 말과 행동으로 알아주라는 의미로',
    };
  }
  return {
    key: 'complement',
    title: '같은 약점을 함께 다루는 균형',
    tags: ['balance', 'communication', 'individuality', 'partnership', ...fallbackTags],
    intro: '두 사람이 비슷한 부분에서 함께 어려움을 느낄 수 있으므로 역할을 나누고 서로의 방식을 존중하라는 의미로',
  };
}

function withObjectParticle(word) {
  const value = String(word || '');
  const last = value.charCodeAt(value.length - 1);
  if (last >= 0xac00 && last <= 0xd7a3) {
    const hasFinalConsonant = (last - 0xac00) % 28 !== 0;
    return value + (hasFinalConsonant ? '을' : '를');
  }
  return value + '을';
}

function scoreFlowerForTheme(flower, theme, allTags, seed) {
  const themeMatches = flower.tags.filter(tag => theme.tags.includes(tag));
  const allMatches = flower.tags.filter(tag => allTags.includes(tag));
  // 핵심 주제 일치도를 가장 크게 보고, 전체 궁합 태그는 보조 점수로 사용한다.
  // 해시는 점수가 같은 꽃의 순서만 안정적으로 정하기 위한 값이다.
  const tieBreaker = stableHash(`${seed}|${theme.key}|${flower.name}`) / 4294967296;
  return {
    score: themeMatches.length * 100 + allMatches.length * 12 + tieBreaker,
    themeMatches,
  };
}

function selectFlowersByMeaning(pool, ohaeng, seed, context) {
  const candidates = (pool || []).map(name => getFlowerMeaningInfo(name, ohaeng));
  const themes = [
    relationFlowerTheme(context),
    closenessFlowerTheme(context),
    complementFlowerTheme(ohaeng, context),
  ];
  const allTags = [...new Set(themes.flatMap(theme => theme.tags))];
  const selected = [];

  themes.forEach(theme => {
    let ranked = candidates
      .filter(candidate => !selected.some(item => item.name === candidate.name))
      .map(candidate => ({ candidate, ...scoreFlowerForTheme(candidate, theme, allTags, seed) }));
    // 해당 주제와 직접 연결되는 꽃이 하나라도 있으면, 다른 주제 점수만 높은 꽃은 제외한다.
    if (ranked.some(item => item.themeMatches.length > 0)) {
      ranked = ranked.filter(item => item.themeMatches.length > 0);
    }
    ranked.sort((a, b) => b.score - a.score);
    const best = ranked[0];
    if (!best) return;

    const matchedLabels = best.themeMatches
      .slice(0, 2)
      .map(tag => FLOWER_TAG_LABEL[tag])
      .filter(Boolean);
    const matchText = matchedLabels.length ? ` 특히 ${matchedLabels.join('·')}의 의미가 잘 맞아요.` : '';

    selected.push({
      name: best.candidate.name,
      meaning: best.candidate.meaning,
      tags: best.candidate.tags,
      theme: theme.title,
      reason: `${theme.intro} ${withObjectParticle(best.candidate.name)} 골랐어요. 꽃말은 ‘${best.candidate.meaning}’이에요.${matchText}`,
      score: Math.floor(best.score),
    });
  });

  return selected;
}


// 오행 상생 관계: 부족한 오행을 "낳아주는" 관계의 오행을 함께 제안하기 위함
const SANGSAENG_PARENT = { 목: '수', 화: '목', 토: '화', 금: '토', 수: '금' };

// 문자열을 항상 같은 32비트 숫자로 바꾸는 간단한 해시
function stableHash(value) {
  const str = String(value);
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

// 같은 시드에서는 항상 같은 순서를 내는 난수 생성기
function createSeededRandom(seed) {
  let state = (Number(seed) >>> 0) || 0x6d2b79f5;
  return function () {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickOne(pool, random) {
  if (!Array.isArray(pool) || pool.length === 0) return '';
  return pool[Math.floor(random() * pool.length)];
}

function pickMany(pool, count, random) {
  if (!Array.isArray(pool) || pool.length === 0) return [];
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}

function pillarSignature(pillar) {
  if (!pillar) return 'x';
  return [
    pillar.cheonganIdx ?? pillar.cheongan ?? 'x',
    pillar.jijiIdx ?? pillar.jiji ?? 'x',
    pillar.ohaengCheongan ?? 'x',
    pillar.ohaengJiji ?? 'x'
  ].join(':');
}

function exactSajuSignature(saju) {
  const countText = ['목', '화', '토', '금', '수']
    .map(k => `${k}${saju?.ohaengCount?.[k] || 0}`)
    .join('');
  return [
    pillarSignature(saju?.year),
    pillarSignature(saju?.month),
    pillarSignature(saju?.day),
    pillarSignature(saju?.hour),
    countText
  ].join('|');
}

function approxEntrySignature(entry) {
  if (entry?.exact) return exactSajuSignature(entry.exact);
  const approx = entry?.approx;
  if (!approx) return 'unknown';
  const dist = ['목', '화', '토', '금', '수']
    .map(k => `${k}${approx.day?.percent?.[k] || 0}`)
    .join('');
  return [
    approx.month?.jijiIdx ?? 'x',
    approx.month?.ohaeng ?? 'x',
    approx.hour?.jijiIdx ?? 'x',
    approx.hour?.ohaeng ?? 'x',
    dist
  ].join('|');
}

function buildRecommendationVariant(ohaeng, seed, context) {
  const info = OHAENG_INFO[ohaeng];
  const contextText = [
    context?.relation || '',
    context?.maxOhaeng || '',
    context?.yearJijiRelation?.type || '',
    context?.dayJijiRelation?.type || '',
    context?.variantRole || ''
  ].join('|');
  const random = createSeededRandom(stableHash(`${seed}|${ohaeng}|${contextText}`));
  const time = pickOne(info.timeOptions, random);

  // 꽃은 무작위로 섞지 않고, 관계 특징과 꽃말의 일치도를 계산해 선택한다.
  const flowerDetails = selectFlowersByMeaning(
    info.flowers,
    ohaeng,
    `${seed}|${contextText}`,
    context
  );

  return {
    season: info.season,
    seasonDetail: info.seasonDetail,
    timeRange: time?.range || info.timeRange,
    timeDetail: time?.detail || info.timeDetail,
    colors: pickMany(info.colors, 3, random),
    flowers: flowerDetails.map(item => item.name),
    flowerDetails,
    flowerSelectionMethod: 'meaning-score',
    places: pickMany(info.places, 4, random),
    keyword: pickOne(info.keywords, random) || info.keyword,
    summary: pickOne(info.summaryPool, random),
    dateTip: pickOne(info.dateTips, random),
    direction: info.direction,
    variantId: stableHash(`${seed}|${ohaeng}|${contextText}`).toString(36),
  };
}

// 두 사람의 사주로부터 최종 데이트/궁합 추천 세트를 생성
function generateCoupleRecommendation(sajuA, sajuB) {
  const compat = analyzeCompatibility(sajuA, sajuB);

  // 입력 순서를 바꿔도 같은 두 사람에게 같은 추천이 나오도록 서명을 정렬한다.
  const pairSignature = [exactSajuSignature(sajuA), exactSajuSignature(sajuB)]
    .sort()
    .join('||');
  const baseSeed = stableHash([
    pairSignature,
    compat.minOhaeng,
    compat.maxOhaeng,
    compat.relation,
    compat.yearJijiRelation?.type,
    compat.dayJijiRelation?.type
  ].join('|'));

  const supportOhaeng = SANGSAENG_PARENT[compat.minOhaeng];
  const primary = buildRecommendationVariant(
    compat.minOhaeng,
    `${baseSeed}|primary`,
    { ...compat, variantRole: 'primary' }
  );
  const support = buildRecommendationVariant(
    supportOhaeng,
    `${baseSeed}|support`,
    { ...compat, variantRole: 'support' }
  );

  return {
    compat,
    primaryOhaeng: compat.minOhaeng,
    primary,
    supportOhaeng,
    support,
    recommendationSeed: baseSeed,
  };
}

// ===================================================================
// 연도 미상(未詳) 근사 계산
// 사주팔자는 연주·월주·일주·시주 네 기둥 모두 '몇 년'인지에 뿌리를 두고
// 있어서, 연도가 없으면 60갑자를 정확히 특정할 수 없습니다.
// 다만 아래 두 가지는 연도 없이도 근사적으로 말할 수 있습니다.
//   1) 월지(月支)는 절기(태양 황경)로 고정되므로, 월/일만 있으면
//      "그 달의 오행 기운"은 거의 정확히 알 수 있습니다.
//   2) 일주(日柱)는 그레고리력 절대 날짜에 좌우되므로 연도가 없으면
//      확정할 수 없지만, 최근 N년 각각을 가정해 계산해보면 일간 오행이
//      대략 어떤 분포로 나오는지(어느 오행이 나올 확률이 높은지)는
//      통계적으로 보여줄 수 있습니다.
// 이 함수는 "정확한 사주"가 아니라 "경향 추정치"임을 명확히 알리는
// 용도로만 사용합니다.
// ---------------------------------------------------------------

// 월/일만으로 절기 구간(=월지)을 근사 판정 (연도는 현재 연도로 임시 고정해
// 계산하되, 절기 날짜의 연도별 흔들림은 ±1일 이내이므로 월지 판정에는
// 영향이 없음)
function getMonthOhaengByDate(month, day) {
  const refYear = new Date().getFullYear();
  const period = findSolarTermPeriod(refYear, month, day, 12, 0);
  const wolJiIdx = JIEQI_TO_WOLJI[period.idx];
  const ohaeng = JIJI_OHAENG[wolJiIdx];
  return {
    jijiIdx: wolJiIdx,
    jiji: JIJI[wolJiIdx],
    jijiHanja: JIJI_HANJA[wolJiIdx],
    ohaeng,
    jieqiName: JUL_NAMES[period.idx].name,
  };
}

// 최근 sampleYears년 각각을 가정했을 때 일간 오행이 어떻게 분포하는지 집계
function getDayOhaengDistribution(month, day, hour, sampleYears) {
  const n = sampleYears || 60;
  const nowYear = new Date().getFullYear();
  const dist = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  const cheonganDist = {};
  CHEONGAN.forEach(c => cheonganDist[c] = 0);

  for (let y = nowYear - n; y <= nowYear; y++) {
    // 2/29 같은 날짜가 해당 연도에 없으면 건너뜀
    const d = new Date(y, month - 1, day);
    if (d.getMonth() !== month - 1) continue;
    const dayPillar = getDayPillarInfo(y, month, day, hour != null ? hour : 12);
    const ohaeng = CHEONGAN_OHAENG[dayPillar.cheonganIdx];
    dist[ohaeng]++;
    cheonganDist[CHEONGAN[dayPillar.cheonganIdx]]++;
  }

  const total = Object.values(dist).reduce((s, v) => s + v, 0) || 1;
  const percent = {};
  Object.keys(dist).forEach(k => { percent[k] = Math.round((dist[k] / total) * 100); });

  // 가장 흔한 오행(들)
  const maxCount = Math.max(...Object.values(dist));
  const likely = Object.keys(dist).filter(k => dist[k] === maxCount);

  return { counts: dist, percent, total, likelyOhaeng: likely };
}

// 연도 없이(월/일/시만으로) 얻을 수 있는 근사 정보 묶음
function calculateSajuApprox(month, day, hour, minute) {
  const monthInfo = getMonthOhaengByDate(month, day);
  const dayDist = getDayOhaengDistribution(month, day, hour != null ? hour : 12, 60);

  // 시지(時支)는 시각만으로 정확히 결정 가능 (오행도 함께)
  let hourInfo = null;
  if (hour != null) {
    const siJiIdx = getSiJiIndex(hour, minute || 0);
    hourInfo = {
      jijiIdx: siJiIdx,
      jiji: JIJI[siJiIdx],
      jijiHanja: JIJI_HANJA[siJiIdx],
      ohaeng: JIJI_OHAENG[siJiIdx],
    };
  }

  return {
    isApprox: true,
    month: monthInfo,
    day: dayDist,
    hour: hourInfo,
  };
}

// 근사 모드(연도 미상 포함) 커플용 오행 총합 및 추천 산출
// entry: { exact: sajuResult } 또는 { approx: approxResult } 형태
function buildOhaengCountFromEntry(entry) {
  const count = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  if (entry.exact) {
    Object.keys(count).forEach(k => count[k] = entry.exact.ohaengCount[k]);
  } else if (entry.approx) {
    // 근사 모드: 월지 오행(확정) 1개 + 시지 오행(확정, 있으면) 1개 +
    // 일간 오행은 최빈값을 1개로 반영 (연도를 모르니 확정 4쌍 중 2쌍만 확정치)
    count[entry.approx.month.ohaeng] += 1;
    if (entry.approx.hour) count[entry.approx.hour.ohaeng] += 1;
    const likely = entry.approx.day.likelyOhaeng[0];
    count[likely] += 1;
  }
  return count;
}

function generateCoupleRecommendationApprox(entryA, entryB) {
  const countA = buildOhaengCountFromEntry(entryA);
  const countB = buildOhaengCountFromEntry(entryB);
  const totalCount = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  Object.keys(totalCount).forEach(k => totalCount[k] = countA[k] + countB[k]);

  let minOhaeng = '목', minVal = Infinity;
  let maxOhaeng = '목', maxVal = -Infinity;
  Object.entries(totalCount).forEach(([k, v]) => {
    if (v < minVal) { minVal = v; minOhaeng = k; }
    if (v > maxVal) { maxVal = v; maxOhaeng = k; }
  });

  const pairSignature = [approxEntrySignature(entryA), approxEntrySignature(entryB)]
    .sort()
    .join('||');
  const baseSeed = stableHash(`${pairSignature}|${minOhaeng}|${maxOhaeng}|approx`);
  const supportOhaeng = SANGSAENG_PARENT[minOhaeng];

  const primary = buildRecommendationVariant(
    minOhaeng,
    `${baseSeed}|primary`,
    { relation: '근사', maxOhaeng, variantRole: 'primary-approx' }
  );
  const support = buildRecommendationVariant(
    supportOhaeng,
    `${baseSeed}|support`,
    { relation: '근사', maxOhaeng, variantRole: 'support-approx' }
  );

  return {
    isApprox: true,
    compat: { totalCount, minOhaeng, maxOhaeng },
    primaryOhaeng: minOhaeng,
    primary,
    supportOhaeng,
    support,
    recommendationSeed: baseSeed,
  };
}

window.SajuCore = {
  CHEONGAN, JIJI, CHEONGAN_OHAENG, JIJI_OHAENG,
  calculateSaju, analyzeCompatibility, OHAENG_INFO, generateCoupleRecommendation,
  calculateSajuApprox, getMonthOhaengByDate, getDayOhaengDistribution,
  generateCoupleRecommendationApprox,
  getFlowerMeaningInfo,
};
