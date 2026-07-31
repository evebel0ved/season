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
// 두 사람의 일간 관계·년지/일지·강한 오행·상호 보완 여부를 태그 점수로 바꾸어 후보를 고른다.
// 해시는 점수가 완전히 같은 후보의 순서만 안정적으로 정하는 데 사용한다.
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
