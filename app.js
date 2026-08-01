(function () {
  // 월지·일지 개인화 + 생년 미상 가능성 추가 분석 확장본
  // - 오행별 다중 후보군에 월지·일지의 지지 기질을 추가 반영
  // - 월지: 대외적 생활 리듬·관계 운영 방식, 일지: 가까운 관계의 반응·애정 방식으로 구분
  // - 두 사람의 월지 관계와 일지 관계를 별도로 계산해 성격·갈등·데이트·추천 결과에 반영
  // - 이름은 선택 시드에서 제외하고 같은 사주·궁합 입력에는 같은 결과를 유지
  // - 생년 미상은 최근 60개 연도 후보를 내부 비교해 힘이 되는 순간·갈등·관계 시나리오를 가능성형으로 출력
  const { calculateSaju, calculateSajuApprox, generateCoupleRecommendation,
          generateCoupleRecommendationApprox, OHAENG_INFO } = window.SajuCore;

  const OHAENG_COLOR = {
    목: '#7fa473', 화: '#d98a7c', 토: '#b3a077', 금: '#a6a190', 수: '#7ba0c4',
  };
  const OHAENG_GLOW = {
    목: 'rgba(127,164,115,0.10)', 화: 'rgba(217,138,124,0.10)', 토: 'rgba(179,160,119,0.10)',
    금: 'rgba(166,161,144,0.09)', 수: 'rgba(123,160,196,0.10)',
  };

  let relationshipMode = 'lover';
  let lastRenderPayload = null;


  function hasFinalConsonant(value) {
    const text = String(value || '').trim();
    if (!text) return false;
    const code = text.charCodeAt(text.length - 1);
    return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0;
  }

  function withSubjectParticle(value) {
    const text = String(value || '').trim();
    return text + (hasFinalConsonant(text) ? '이' : '가');
  }


  // 일간 관계(상생/상극/동기/중립)에 대한 연인·친구 궁합 해설
  const RELATION_EXPLAIN = {
    상생: {
      emoji: '🌱',
      title: '상생 — 함께 있을수록 편안해지는 관계',
      friendTitle: '상생 — 서로에게 힘이 되어주는 친구',
      lover: ['함께 있으면 서로 더 좋은 사람이 되는 느낌을 받아요', '자연스럽게 응원하고 챙겨주는 편이에요', '다퉈도 비교적 금방 마음을 풀어요', '서로의 장점을 더 잘 살려줘요'],
      friend: ['힘들 때 먼저 떠오르는 친구가 되기 쉬워요', '같이 있으면 기운이 나는 편이에요', '필요할 때 도움을 주고받으며 오래 이어져요'],
      quote: '너랑 있으면 내가 더 좋아지는 것 같아.',
      friendQuote: '힘들 때 자연스럽게 서로를 찾게 돼.',
    },
    상극: {
      emoji: '⚔️',
      title: '상극 — 끌림도 크지만 부딪힐 때도 있어요',
      friendTitle: '상극 — 친하지만 자주 티격태격하는 친구',
      lover: ['첫인상이 강렬하거나 빠르게 끌릴 수 있어요', '가치관이나 생활 방식의 차이가 눈에 잘 보여요', '서로 물러서지 않으면 자존심 싸움이 되기 쉬워요', '차이를 잘 맞춰가면 서로 많이 성장할 수 있어요'],
      friend: ['친해도 종종 티격태격할 수 있어요', '서로의 부족한 점을 빠르게 지적하는 편이에요', '가까운 만큼 피곤하게 느껴지는 순간도 있어요'],
      quote: '좋아하긴 하는데 왜 이렇게 싸우지?',
      friendQuote: '친하긴 한데 만나면 꼭 한 번은 티격태격해.',
      caveat: '※ 상극이라고 해서 꼭 나쁜 관계는 아니에요. 서로 다른 점을 이해하는 과정에서 함께 성장하기도 해요.',
    },
    동기: {
      emoji: '🤝',
      title: '동기 — 닮은 점이 많아 금방 통하는 관계',
      friendTitle: '동기 — 관심사와 반응이 비슷한 친구',
      lover: ['취향과 생각이 비슷한 부분이 많아요', '대화의 흐름이 잘 이어져요', '서로의 반응을 빠르게 이해해요', '둘 다 고집을 부리면 먼저 양보하기 어려울 수 있어요'],
      friend: ['가까운 친구가 되기 쉬워요', '같이 놀면 시간이 빠르게 가요', '관심사가 비슷해서 편하게 느껴져요'],
      quote: '너랑 있으면 나를 보는 것 같아.',
      friendQuote: '설명하지 않아도 바로 알아듣는 친구야.',
    },
    중립: {
      emoji: '⚖️',
      title: '중립 — 천천히 편안해지는 관계',
      friendTitle: '중립 — 부담 없이 오래 보기 좋은 친구',
      lover: ['크게 싸우지도, 감정이 급하게 달아오르지도 않아요', '안정적이지만 가끔은 심심하게 느껴질 수 있어요', '시간을 함께 보내면서 정이 깊어지는 편이에요'],
      friend: ['만나면 반갑지만 연락이 뜸할 수 있어요', '필요할 때 부담 없이 만날 수 있어요'],
      quote: '편하긴 한데, 엄청 특별한 느낌은 아니야.',
      friendQuote: '오랜만에 만나도 어색하지 않은 친구야.',
    },
  };
  const RELATION_GENERAL_CAVEAT = '사주에서 이 관계를 볼 때는 오행 궁합 하나만으로 판단하지 않아요. 상극이라도 전체 사주가 잘 맞으면 좋은 인연이 될 수 있고, 상생이라도 다른 요소가 맞지 않으면 어려움을 겪을 수 있어요. 상생·상극은 두 사람 관계의 한 가지 성향을 보여주는 지표로 이해해주세요.';


  const RELATION_SUMMARY_TEXT = {
    상생: '🌱 서로를 자연스럽게 북돋는 사이예요',
    상극: '⚡ 강하게 끌리지만 자주 부딪힐 수 있어요',
    동기: '🪞 닮은 점이 많아 쉽게 통하는 사이예요',
    중립: '🍃 부담 없이 편안한 사이예요',
  };

  // 지지(地支) 관계 유형별 부가 설명 — getJijiRelation()의 결과(type)에 매칭
  const JIJI_RELATION_DESC = {
    육합: '두 지지가 짝을 이뤄 화합하는 자리예요. 함께 있으면 자연스럽게 안정감이 들고, 큰 노력 없이도 손발이 잘 맞는 궁합으로 봐요.',
    삼합: '관심사나 목표 방향이 비슷한 지지끼리 만난 자리예요. 여행 계획, 공부, 운동처럼 함께 목표를 정하고 움직일 때 특히 손발이 잘 맞아요.',
    충: '정반대 자리에서 마주보는 지지끼리 만난, 명리학에서 가장 강하게 부딪히는 관계예요. 서로 기질이나 방식이 뚜렷하게 달라 자주 의견 차이가 생길 수 있지만, 그만큼 강하게 끌리는 경우도 많아요.',
    형: '겉으로는 무난해 보여도 은근히 신경전이나 잔소리가 쌓이기 쉬운 자리예요. 대화로 오해를 자주 풀어주는 게 좋아요.',
    해: '크게 부딪히진 않지만 사소한 데서 자꾸 어긋나는 느낌을 줄 수 있는 자리예요. 서로의 속도나 방식 차이를 이해해주면 무난해져요.',
    동일: '같은 지지라 기질이 서로 닮아 있어요. 통하는 부분이 많지만, 같은 약점도 공유할 수 있어요.',
    평: '합도 충도 아닌, 특별한 상호작용이 없는 무난한 자리예요. 좋고 나쁨보다는 다른 요소들로 궁합을 살펴보는 게 좋아요.',
  };


  // 상세 궁합 문장을 결과값에 따라 조합하기 위한 데이터
  const OHAENG_ORDER = ['목', '화', '토', '금', '수'];
  const OHAENG_HANJA = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' };
  const SANGSAENG_NEXT = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' };
  const SANGGEUK_TARGET = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' };

  const OHAENG_RELATION_TRAITS = {
    목: {
      core: '성장과 가능성을 먼저 보는 편',
      love: '함께 발전하고 있다는 감각',
      strength: '새로운 계획을 세우고 관계에 활력을 넣는 능력',
      shadow: '답답함을 느끼면 상대를 재촉하거나 방향을 정해주려는 태도',
      repair: '결론부터 강요하기보다 상대가 생각할 시간을 주는 것',
      activity: '산책, 전시, 여행 계획처럼 새로운 경험을 함께 만드는 활동',
    },
    화: {
      core: '감정과 반응이 빠르고 표현이 분명한 편',
      love: '즉각적인 호응과 애정 표현',
      strength: '분위기를 밝히고 관계의 온도를 높이는 능력',
      shadow: '서운함이 생기면 말이 빨라지거나 감정이 크게 번지는 태도',
      repair: '감정이 최고조일 때 결론 내리지 않고 잠시 식힌 뒤 대화하는 것',
      activity: '공연, 축제, 맛집 탐방처럼 반응을 나눌 수 있는 활동',
    },
    토: {
      core: '안정과 책임을 중요하게 여기며 쉽게 흔들리지 않는 편',
      love: '예측 가능한 태도와 꾸준한 신뢰',
      strength: '관계를 현실적으로 지키고 상대를 든든하게 받쳐주는 능력',
      shadow: '익숙한 방식을 고수하거나 서운함을 오래 쌓아두는 태도',
      repair: '누가 옳은지보다 앞으로 반복하지 않을 약속을 구체적으로 정하는 것',
      activity: '요리, 집 꾸미기, 정기 데이트처럼 생활 리듬을 만드는 활동',
    },
    금: {
      core: '기준과 원칙이 분명하고 관계에서도 명확함을 원하는 편',
      love: '약속을 지키는 태도와 서로에 대한 존중',
      strength: '문제를 정확히 짚고 관계의 경계를 건강하게 세우는 능력',
      shadow: '실망하면 말이 단호해지거나 상대의 부족한 점을 평가하는 태도',
      repair: '지적보다 요청의 형태로 말하고, 잘한 점도 같은 비중으로 표현하는 것',
      activity: '운동, 목표 챌린지, 재정 계획처럼 성취 기준이 분명한 활동',
    },
    수: {
      core: '상황을 오래 관찰하고 속으로 충분히 생각한 뒤 움직이는 편',
      love: '간섭받지 않는 여유와 깊이 있는 대화',
      strength: '상대의 속마음을 읽고 상황에 유연하게 대응하는 능력',
      shadow: '갈등이 부담스러우면 말을 줄이거나 속마음을 감추는 태도',
      repair: '혼자 정리할 시간을 갖되 언제 다시 이야기할지 시간을 약속하는 것',
      activity: '야경 산책, 카페 대화, 영화 감상처럼 차분히 감정을 나누는 활동',
    },
  };

  // 오행 이름을 실제 관계 행동으로 풀어쓴 문장
  const ELEMENT_LOW_GUIDE = {
    목: '새로운 데이트를 정하거나 둘의 다음 계획을 세울 때 서로 눈치만 보며 시작이 늦어질 수 있어요. 여행 날짜, 이번 달에 해볼 일처럼 첫 행동을 미리 정해두면 편해요.',
    화: '좋아하는 마음이 있어도 말이나 표정으로 잘 드러나지 않아 관계가 심심하게 느껴질 수 있어요. “보고 싶었어”, “오늘 좋았어”처럼 짧은 표현을 자주 해주는 게 도움이 돼요.',
    토: '약속, 돈, 일정, 집안일처럼 반복해서 챙겨야 하는 일을 서로 미루기 쉬워요. 누가 무엇을 언제까지 할지 정해두면 사소한 다툼을 줄일 수 있어요.',
    금: '싫은 점이나 지켜야 할 선을 분명하게 말하지 못해 문제가 오래 끌 수 있어요. 연락 빈도, 돈 쓰는 방식, 친구 관계처럼 민감한 기준은 미리 말로 맞춰두는 편이 좋아요.',
    수: '감정이 올라왔을 때 잠깐 멈추거나 상대 이야기를 끝까지 듣는 여유가 부족할 수 있어요. 바로 결론 내리기보다 20분 정도 쉬고 다시 이야기할 시간을 정해두는 방식이 잘 맞아요.',
  };

  const ELEMENT_HELP_TEXT = {
    목: (supporter, receiver) => `${supporter}님은 ${receiver}님이 앞으로 무엇을 해야 할지 막막해할 때, 새로운 선택지를 꺼내고 첫 단계를 정하는 데 도움을 주는 편이에요.`,
    화: (supporter, receiver) => `${supporter}님은 ${receiver}님이 기분이 가라앉거나 표현을 망설일 때, 먼저 말을 걸고 분위기를 풀어주는 역할을 하기 쉬워요.`,
    토: (supporter, receiver) => `${supporter}님은 ${receiver}님이 일정·약속·생활 문제로 흔들릴 때, 해야 할 일을 차근차근 정리하고 꾸준히 챙겨주는 편이에요.`,
    금: (supporter, receiver) => `${supporter}님은 ${receiver}님이 결정을 미루거나 기준을 잡지 못할 때, 선택지를 정리하고 분명한 결론을 내리도록 돕는 편이에요.`,
    수: (supporter, receiver) => `${supporter}님은 ${receiver}님이 감정이 복잡할 때, 서둘러 답을 요구하기보다 이야기를 들어주고 마음을 정리할 시간을 주는 편이에요.`,
  };

  const ELEMENT_SHARED_STRONG = {
    목: '둘 다 새로운 장소나 활동을 찾는 데 적극적이라 데이트가 단조롭지 않은 편이에요. 다만 계획이 자주 바뀌거나 시작만 하고 마무리가 늦어질 수 있어요.',
    화: '둘 다 반응과 애정 표현이 빠르기 때문에 즐거울 때는 분위기가 금방 달아올라요. 반대로 서운할 때도 말이 빨라져 싸움이 커지기 쉬워요.',
    토: '둘 다 약속과 익숙한 생활을 중요하게 여겨 안정적인 관계를 만들기 쉬워요. 다만 한 번 정한 방식에서 물러서지 않아 고집 대결이 생길 수 있어요.',
    금: '둘 다 약속, 예의, 관계의 기준을 중요하게 여겨 서로 믿을 만한 사람이라고 느끼기 쉬워요. 다만 상대의 부족한 점을 빠르게 지적하는 분위기가 될 수 있어요.',
    수: '둘 다 조용히 생각하고 깊게 대화하는 시간을 편하게 느껴요. 다만 속마음을 먼저 꺼내지 않아 서로 괜찮은 줄 알고 지나칠 수 있어요.',
  };

  const ELEMENT_SHARED_GAP = {
    목: '둘 다 새로운 계획을 먼저 꺼내는 데 약할 수 있으니, 한 달에 한 번은 번갈아 데이트 장소나 여행 계획을 정하는 방식이 좋아요.',
    화: '둘 다 애정 표현을 기다리는 편이 될 수 있으니, 고맙거나 보고 싶을 때는 상대가 알아주길 기다리지 말고 바로 말해주세요.',
    토: '돈, 일정, 집안일처럼 꾸준히 관리해야 하는 부분이 흐트러질 수 있으니 공동 캘린더나 역할표를 사용하는 편이 좋아요.',
    금: '연락 기준이나 서로 지켜야 할 선이 애매해질 수 있으니, 불편한 일이 생기기 전에 구체적인 기준을 말로 정해주세요.',
    수: '싸운 뒤 감정을 가라앉히고 천천히 대화하는 과정이 부족할 수 있으니, 잠시 쉬었다가 다시 이야기할 시간을 약속하는 것이 좋아요.',
  };

  const SANGSAENG_PAIR_SCENE = {
    '목>화': (a, b) => `${a}님이 새로운 데이트나 계획을 꺼내면 ${b}님이 반응과 추진력을 더하는 조합이에요. 아이디어만 있던 일을 실제 약속으로 옮길 때 손발이 잘 맞을 수 있어요.`,
    '화>토': (a, b) => `${a}님이 따뜻한 말과 애정 표현으로 관계의 분위기를 만들면 ${b}님이 그것을 꾸준한 연락과 약속으로 이어가는 조합이에요. 즐거움이 일상의 안정감으로 연결되기 쉬워요.`,
    '토>금': (a, b) => `${a}님이 차분하게 상황을 정리하고 기다려주면 ${b}님이 기준을 세우고 결정을 내리는 조합이에요. 돈, 일정, 장기 계획처럼 현실적인 문제를 함께 처리할 때 장점이 잘 드러나요.`,
    '금>수': (a, b) => `${a}님이 복잡한 문제의 핵심을 정리해주면 ${b}님이 감정과 상황을 살펴 더 부드러운 방법을 찾는 조합이에요. 한 사람은 결론을 잡고 다른 사람은 분위기를 조율하는 식으로 역할이 나뉘기 쉬워요.`,
    '수>목': (a, b) => `${a}님이 충분히 들어주고 생각할 여유를 만들어주면 ${b}님이 자신감을 얻어 새로운 시도를 시작하는 조합이에요. ${b}님은 ${a}님 곁에서 막막했던 생각을 실제 계획으로 바꾸기 쉬워요.`,
  };

  const SANGGEUK_PAIR_SCENE = {
    '목>토': (a, b) => `${a}님은 변화를 빨리 시작하려 하고 ${b}님은 익숙한 방식과 안정성을 지키려는 편이라, ${a}님은 답답함을 느끼고 ${b}님은 재촉받는다고 느낄 수 있어요. 여행·이사·돈처럼 큰 결정은 바로 결론 내기보다 검토 기간을 함께 정하는 것이 좋아요.`,
    '토>수': (a, b) => `${a}님은 관계를 분명하고 안정적으로 만들고 싶어 하지만 ${b}님은 상황에 따라 움직일 여유가 필요해요. ${a}님이 답을 재촉하면 ${b}님이 말을 줄일 수 있으니, 언제까지 생각한 뒤 답할지 시간을 정해주는 방식이 잘 맞아요.`,
    '수>화': (a, b) => `${a}님은 먼저 상황을 지켜보고 생각하려 하고 ${b}님은 바로 표현하고 반응하려는 편이에요. ${b}님은 무시당한다고 느끼고 ${a}님은 감정에 압도될 수 있으니, 잠시 쉬되 다시 대화할 시각을 확실히 약속해주세요.`,
    '화>금': (a, b) => `${a}님은 순간의 감정과 즐거움을 중요하게 여기고 ${b}님은 약속과 기준을 정확히 지키려는 편이에요. ${a}님은 지적받는다고 느끼고 ${b}님은 말이 자주 바뀐다고 느낄 수 있으니, 즉흥적인 선택이 가능한 범위를 미리 정해두면 좋아요.`,
    '금>목': (a, b) => `${a}님은 문제를 정확히 짚고 고치려 하지만 ${b}님은 자유롭게 시도하며 배우는 편이에요. ${a}님의 조언이 잦아지면 ${b}님은 통제받는다고 느낄 수 있으니, 지적보다 “나는 이렇게 해줬으면 좋겠어”라는 요청으로 말하는 것이 좋아요.`,
  };

  function buildElementHelpSentences(supporter, receiver, elements, seed) {
    const baseSeed = `${seed || ''}|${supporter}|${receiver}|${(elements || []).join('')}`;
    return (elements || []).slice(0, 2).map((k, index) => {
      const pool = OHAENG_VARIATION_BANK[k]?.help || [];
      const fn = pickVariation(pool, baseSeed, `help:${k}:${index}`);
      if (typeof fn === 'function') return fn(supporter, receiver);
      return ELEMENT_HELP_TEXT[k] ? ELEMENT_HELP_TEXT[k](supporter, receiver) : '';
    }).filter(Boolean);
  }

  function buildWeakEverydayText(stats, seed) {
    const isMissing = !!stats.missing.length;
    const targets = isMissing ? stats.missing : stats.weak;
    const selectedTargets = pickVariationMany(targets, 2, `${seed || ''}|${getCountSignature(stats.count)}`, 'weak-targets');
    return selectedTargets.map((k, index) => {
      const bank = OHAENG_VARIATION_BANK[k];
      const pool = isMissing ? bank?.missing : bank?.weak;
      return pickVariation(pool, seed, `weak:${k}:${index}`) || ELEMENT_LOW_GUIDE[k];
    }).filter(Boolean).join(' ');
  }

  function buildCombinedEverydayText(stats, seed) {
    const strongText = pickVariationMany(stats.dominant, 2, seed, 'combined-strong-targets')
      .map((k, index) => pickVariation(OHAENG_VARIATION_BANK[k]?.sharedStrong, seed, `combined-strong:${k}:${index}`) || ELEMENT_SHARED_STRONG[k])
      .filter(Boolean).join(' ');
    const lowTargets = stats.missing.length ? stats.missing : stats.weak;
    const lowText = pickVariationMany(lowTargets, 2, seed, 'combined-low-targets')
      .map((k, index) => pickVariation(OHAENG_VARIATION_BANK[k]?.sharedGap, seed, `combined-gap:${k}:${index}`) || ELEMENT_SHARED_GAP[k])
      .filter(Boolean).join(' ');
    return `${strongText} ${lowText}`.trim();
  }

  const RELATION_DIRECTION_TEXT = {
    aGeneratesB: ({ nameA, nameB, aDay, bDay }) => {
      const scene = SANGSAENG_PAIR_SCENE[`${aDay}>${bDay}`];
      return scene ? scene(nameA, nameB) : `${nameA}님이 먼저 힘을 보태고 ${nameB}님이 그 도움을 받아 움직이기 쉬운 관계예요.`;
    },
    bGeneratesA: ({ nameA, nameB, aDay, bDay }) => {
      const scene = SANGSAENG_PAIR_SCENE[`${bDay}>${aDay}`];
      return scene ? scene(nameB, nameA) : `${nameB}님이 먼저 힘을 보태고 ${nameA}님이 그 도움을 받아 움직이기 쉬운 관계예요.`;
    },
    aControlsB: ({ nameA, nameB, aDay, bDay }) => {
      const scene = SANGGEUK_PAIR_SCENE[`${aDay}>${bDay}`];
      return scene ? scene(nameA, nameB) : `${nameA}님이 기준을 먼저 정하고 ${nameB}님이 맞춰야 하는 상황이 반복될 수 있어요. 역할과 결정 범위를 미리 나누는 것이 좋아요.`;
    },
    bControlsA: ({ nameA, nameB, aDay, bDay }) => {
      const scene = SANGGEUK_PAIR_SCENE[`${bDay}>${aDay}`];
      return scene ? scene(nameB, nameA) : `${nameB}님이 기준을 먼저 정하고 ${nameA}님이 맞춰야 하는 상황이 반복될 수 있어요. 역할과 결정 범위를 미리 나누는 것이 좋아요.`;
    },
    same: ({ nameA, nameB, aDay }) =>
      `두 사람은 ${aDay}(${OHAENG_HANJA[aDay]}) 성향을 함께 가지고 있어, 중요하게 여기는 점과 반응 속도가 비슷해요. 설명하지 않아도 통하는 순간이 많지만 같은 문제에서 동시에 고집을 부릴 수도 있어요. “나도 같을 거야”라고 넘기지 말고, 원하는 결론과 속도를 따로 확인하는 것이 좋아요.`,
    neutral: ({ nameA, nameB }) =>
      `${nameA}님과 ${nameB}님은 처음부터 누가 이끌고 누가 맞춰주는지가 정해지는 관계는 아니에요. 같은 취미를 정기적으로 함께 하거나, 여행·공연·맛집 탐방처럼 둘 다 즐거웠던 경험을 하나씩 쌓을수록 신뢰와 친밀감이 커지는 조합이에요.`,
  };

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatOhaengList(items) {
    return items.map(k => `${k}(${OHAENG_HANJA[k]})`).join('·');
  }

  function getDayOhaeng(saju) {
    return saju?.day?.ohaengCheongan || saju?.day?.ohaeng || null;
  }

  function getElementDirection(a, b) {
    if (!a || !b) return 'neutral';
    if (a === b) return 'same';
    if (SANGSAENG_NEXT[a] === b) return 'aGeneratesB';
    if (SANGSAENG_NEXT[b] === a) return 'bGeneratesA';
    if (SANGGEUK_TARGET[a] === b) return 'aControlsB';
    if (SANGGEUK_TARGET[b] === a) return 'bControlsA';
    return 'neutral';
  }

  function analyzeOhaengCount(count) {
    const safeCount = Object.fromEntries(OHAENG_ORDER.map(k => [k, Number(count?.[k] || 0)]));
    const total = Object.values(safeCount).reduce((sum, value) => sum + value, 0) || 1;
    const average = total / OHAENG_ORDER.length;
    const sortedDesc = [...OHAENG_ORDER].sort((a, b) => safeCount[b] - safeCount[a]);
    const sortedAsc = [...OHAENG_ORDER].sort((a, b) => safeCount[a] - safeCount[b]);
    const max = safeCount[sortedDesc[0]];
    const min = safeCount[sortedAsc[0]];
    const dominant = sortedDesc.filter(k => safeCount[k] === max);
    const weak = sortedAsc.filter(k => safeCount[k] === min);
    const missing = OHAENG_ORDER.filter(k => safeCount[k] === 0);
    const variance = OHAENG_ORDER.reduce((sum, k) => sum + Math.pow(safeCount[k] - average, 2), 0) / OHAENG_ORDER.length;
    const dispersion = Math.sqrt(variance) / Math.max(average, 0.1);
    const balanceScore = Math.max(0, Math.min(100, Math.round(100 - dispersion * 38 - missing.length * 5)));
    const balanceLabel = balanceScore >= 82 ? '고르게 분포된 편' : balanceScore >= 67 ? '비교적 안정적인 편' : balanceScore >= 50 ? '특정 성향이 도드라지는 편' : '한 가지 성향이 매우 강한 편';
    return { count: safeCount, total, average, dominant, weak, missing, max, min, balanceScore, balanceLabel };
  }

  function makePersonProfile(name, saju) {
    const day = getDayOhaeng(saju) || '토';
    const stats = analyzeOhaengCount(saju?.ohaengCount);
    // 이름은 출력에만 사용하고 문장 선택에는 넣지 않습니다.
    const seed = getSajuSignature(saju);
    const dominant = stats.dominant.includes(day)
      ? day
      : (pickVariation(stats.dominant, seed, 'profile:dominant') || day);
    const ranked = [...OHAENG_ORDER].sort((a, b) => stats.count[b] - stats.count[a]);
    const secondary = ranked.find(k => k !== dominant && stats.count[k] > 0) || null;
    const bank = OHAENG_VARIATION_BANK[dominant] || OHAENG_VARIATION_BANK.토;
    const dayBank = OHAENG_VARIATION_BANK[day] || bank;
    const monthJiji = getPillarJiji(saju, 'month');
    const dayJiji = getPillarJiji(saju, 'day');
    const monthJijiBank = getJijiPersonalBank(monthJiji);
    const dayJijiBank = getJijiPersonalBank(dayJiji);
    const branchSeed = `${seed}|month:${monthJiji || '?'}|day:${dayJiji || '?'}`;
    const trait = {
      core: pickVariation(bank.core, branchSeed, 'trait:core'),
      love: pickVariation(bank.love, branchSeed, 'trait:love'),
      strength: pickVariation(bank.strength, branchSeed, 'trait:strength'),
      shadow: pickVariation(bank.shadow, branchSeed, 'trait:shadow'),
      repair: pickVariation(bank.repair, branchSeed, 'trait:repair'),
      activity: pickVariation(bank.activity, branchSeed, 'trait:activity'),
    };
    const dayCore = pickVariation(dayBank.core, branchSeed, 'trait:day-core');
    const weakText = buildWeakEverydayText(stats, branchSeed);
    const monthTrait = pickVariation(monthJijiBank?.month, branchSeed, 'jiji:month-trait');
    const dayTrait = pickVariation(dayJijiBank?.day, branchSeed, 'jiji:day-trait');
    const dayFriction = pickVariation(dayJijiBank?.friction, branchSeed, 'jiji:day-friction');
    const dayRepair = pickVariation(dayJijiBank?.repair, branchSeed, 'jiji:day-repair');
    const dayRomantic = pickVariation(dayJijiBank?.romantic, branchSeed, 'jiji:day-romantic');
    let summary;
    if (day === dominant) {
      summary = `${name}님은 일간과 전체 오행 분포에서 ${day}(${OHAENG_HANJA[day]}) 성향이 함께 두드러져, 실제 관계에서도 ${trait.core}이에요. 특히 ‘${trait.love}’가 느껴질 때 상대의 마음을 더 확실히 믿는 편이에요.`;
    } else {
      const secondaryText = secondary && secondary !== day ? ` 여기에 ${secondary}(${OHAENG_HANJA[secondary]}) 기운도 보조적으로 나타나 상황에 따라 반응 방식이 달라질 수 있어요.` : '';
      summary = `${name}님의 일간은 ${day}(${OHAENG_HANJA[day]})라 첫 반응은 ${dayCore}이고, 전체 분포에서는 ${dominant}(${OHAENG_HANJA[dominant]})가 더 두드러져 반복되는 관계 행동은 ${trait.core}이에요. ‘${trait.love}’가 채워질 때 애정을 안정적으로 느껴요.${secondaryText}`;
    }
    const branchSummaryParts = [];
    if (monthTrait) branchSummaryParts.push(`월지 ${formatJiji(monthJiji)}의 흐름은 대외적인 생활과 관계 운영에서 ${monthTrait}이에요.`);
    if (dayTrait) branchSummaryParts.push(`일지 ${formatJiji(dayJiji)}에서는 가까운 사람에게 ${dayTrait}이에요.`);
    return {
      name, day, stats, dominant, secondary, trait, seed: branchSeed,
      monthJiji, dayJiji, monthJijiBank, dayJijiBank,
      monthTrait, dayTrait, dayFriction, dayRepair, dayRomantic,
      summary,
      branchSummary: branchSummaryParts.join(' '),
      caution: `관계에서 특히 잘하는 점은 ${trait.strength}이에요. 다만 긴장하거나 서운할 때는 ${trait.shadow}가 나타나기 쉬워요.${dayFriction ? ` 일지의 가까운 관계 반응에서는 ${dayFriction}` : ''} ${weakText}`.trim(),
    };
  }

  function getJijiSignal(relInfo) {
    if (!relInfo) return 0;
    if (relInfo.tone === 'good') return 2;
    if (relInfo.tone === 'clash') return -2;
    if (relInfo.tone === 'friction') return -1;
    return 0;
  }

  function buildJijiSynthesis(profileA, profileB, compat) {
    const seed = `${profileA.seed}|${profileB.seed}|${getCompatSignature(compat)}|month-day-jiji`;
    const branch = buildBranchPairScenario(profileA, profileB, compat, seed, 'summary');
    const year = compat?.yearJijiRelation || { type: '평', tone: 'neutral' };
    const yearLine = getJijiRelationDescription(year, seed, 'general');
    return `${branch} 년지에서는 ${year.type}의 흐름이 함께 보여, 장기적인 가족·환경 문제에서는 ${yearLine}`;
  }

  function buildComplementInsight(profileA, profileB, compat) {
    const aFillsB = compat?.complement?.aFillsB || [];
    const bFillsA = compat?.complement?.bFillsA || [];
    const sharedMissing = profileA.stats.missing.filter(k => profileB.stats.missing.includes(k));
    const sharedDominant = profileA.stats.dominant.filter(k => profileB.stats.dominant.includes(k));
    const seed = `${profileA.seed}|${profileB.seed}|${getCompatSignature(compat)}|complement`;
    const lines = [];
    if (aFillsB.length && bFillsA.length) {
      lines.push(pickVariation(['한 사람만 계속 챙기는 관계라기보다 상황에 따라 먼저 손을 내미는 사람이 자연스럽게 바뀌는 편이에요.', '서로 다른 부족함을 번갈아 채워주기 때문에 역할이 한쪽에만 고정되지 않는 장점이 있어요.', '각자가 잘하는 영역이 달라 상황에 따라 도움을 주고받는 방향이 바뀌기 쉬워요.'], seed, 'complement:both'));
      lines.push(...buildElementHelpSentences(profileA.name, profileB.name, aFillsB, `${seed}|a`));
      lines.push(...buildElementHelpSentences(profileB.name, profileA.name, bFillsA, `${seed}|b`));
    } else if (aFillsB.length) {
      lines.push(...buildElementHelpSentences(profileA.name, profileB.name, aFillsB, `${seed}|a-only`));
      lines.push(`${profileB.name}님도 ${profileA.name}님이 지쳐 보이는 날에는 안부·예약·준비 중 한 가지를 먼저 맡아주면 도움의 흐름이 일방적이지 않게 유지돼요.`);
    } else if (bFillsA.length) {
      lines.push(...buildElementHelpSentences(profileB.name, profileA.name, bFillsA, `${seed}|b-only`));
      lines.push(`${profileA.name}님도 ${profileB.name}님이 지쳐 보이는 날에는 안부·예약·준비 중 한 가지를 먼저 맡아주면 도움의 흐름이 일방적이지 않게 유지돼요.`);
    } else {
      lines.push(pickVariation(['둘 다 어려워하는 일을 상대가 알아서 해결해주길 기다리기보다 일정 잡기나 예약처럼 작은 역할부터 나누는 것이 좋아요.', '보완 방향이 뚜렷하지 않아 실제 생활에서 역할을 직접 정할수록 서로를 더 든든하게 느껴요.', '잘하는 영역이 비슷한 만큼 놓치는 일도 겹칠 수 있어 담당을 번갈아 정하는 방식이 도움이 돼요.'], seed, 'complement:none'));
    }
    const relationLinePool = {
      상생: ['한 사람이 아이디어나 힘든 마음을 꺼내면 다른 사람이 실제 행동이나 따뜻한 반응으로 이어주기 쉬워요.', '도움을 준 사람이 계속 소진되기보다 상대의 호응이 다시 힘으로 돌아오는 순환을 만들기 쉬워요.'],
      상극: ['처음에는 차이로 부딪혀도 한쪽이 놓친 현실이나 감정을 다른 쪽이 발견해 중요한 결정을 더 균형 있게 만들 수 있어요.', '서로 다른 관점이 불편함만이 아니라 위험을 줄이고 선택지를 넓히는 역할도 해요.'],
      동기: ['말을 길게 설명하지 않아도 기분과 취향을 빠르게 알아차려 필요한 방식으로 곁을 지키기 쉬워요.', '반응이 비슷해 지친 날과 즐거운 날의 리듬을 빠르게 맞출 수 있어요.'],
      중립: ['큰 도움보다 꾸준한 연락과 약속을 통해 편안한 믿음을 쌓기 쉬워요.', '필요한 순간에 부담 없이 곁을 지켜주는 행동이 관계의 안정감을 만들어요.'],
    }[compat?.relation || '중립'];
    lines.push(pickVariation(relationLinePool, seed, 'complement:relation'));
    if (compat?.dayJijiRelation?.tone === 'good') lines.push(pickVariation(['둘만 있을 때는 긴장을 풀고 속마음을 나누기 쉬워요. 해결책보다 먼저 함께 밥을 먹거나 산책하며 마음을 가라앉히는 방식이 잘 맞아요.', '정서적 호흡이 좋아 힘든 날에는 말없이 곁에 있거나 천천히 들어주는 것만으로도 큰 도움이 돼요.'], seed, 'complement:day-good'));
    else if (compat?.yearJijiRelation?.tone === 'good') lines.push(pickVariation(['여행 일정·모임·장기 계획처럼 둘 밖의 생활을 함께 꾸릴 때 손발이 잘 맞아요.', '현실적인 일정과 바깥 활동에서 협력하는 힘이 있어 서로의 일상에 실제 도움이 되기 쉬워요.'], seed, 'complement:year-good'));
    sharedDominant.slice(0, 1).forEach(k => lines.push(pickVariation(OHAENG_VARIATION_BANK[k]?.sharedStrong, seed, `complement:shared-strong:${k}`) || ELEMENT_SHARED_STRONG[k]));
    sharedMissing.slice(0, 1).forEach(k => lines.push(pickVariation(OHAENG_VARIATION_BANK[k]?.sharedGap, seed, `complement:shared-gap:${k}`) || ELEMENT_SHARED_GAP[k]));
    return uniqueText(lines).slice(0, 4);
  }

  const ELEMENT_PAIR_CONFLICT = {
    '목+목': '둘 다 새로운 계획을 먼저 꺼내다 보니 여행·데이트 약속이 자주 바뀌고, 시작한 일을 누가 마무리할지를 두고 서로 미룰 수 있어요.',
    '목+화': '재미있는 일이 생기면 둘 다 바로 움직이지만, 한쪽은 다음 계획으로 넘어가고 다른 쪽은 지금의 감정을 더 확인받고 싶어 속도가 엇갈릴 수 있어요.',
    '목+토': '여행·이사·돈처럼 큰 결정을 할 때 한 사람은 빨리 바꾸고 싶고 다른 사람은 충분히 확인하고 싶어, 결론을 내는 시점을 두고 다툴 수 있어요.',
    '목+금': '한 사람은 자유롭게 시도해보려 하고 다른 사람은 미리 기준을 세우려 해, 조언이 반복되면 간섭으로 느껴지고 즉흥적인 선택은 무책임하게 보일 수 있어요.',
    '목+수': '한 사람은 바로 다음 행동을 정하고 싶지만 다른 사람은 더 생각할 시간이 필요해, 답을 재촉하거나 연락을 미루는 상황에서 서운함이 생길 수 있어요.',
    '화+화': '둘 다 서운함과 애정을 바로 표현하는 편이라 화해도 빠르지만, 감정이 올라온 순간에는 같은 말을 반복하며 싸움의 강도가 커질 수 있어요.',
    '화+토': '한 사람은 즉흥적인 만남과 표현을 원하고 다른 사람은 정해진 일정과 꾸준함을 중요하게 여겨, 갑작스러운 약속 변경이나 연락 패턴에서 차이가 나기 쉬워요.',
    '화+금': '한 사람은 그때의 감정과 분위기를 따라 말하고 다른 사람은 했던 말과 약속을 정확히 기억해, 가벼운 표현이 약속 위반처럼 받아들여질 수 있어요.',
    '화+수': '한 사람은 지금 바로 이야기하고 싶고 다른 사람은 혼자 정리한 뒤 말하고 싶어, 답장 속도와 싸운 뒤 대화를 다시 시작하는 시점에서 가장 자주 엇갈려요.',
    '토+토': '둘 다 익숙한 생활을 지키려 해서 안정적이지만, 돈 쓰는 방식이나 주말 루틴이 한 번 굳어지면 서로 양보하지 않아 고집 대결이 될 수 있어요.',
    '토+금': '둘 다 약속과 책임을 중요하게 여기지만, 일정·비용·역할을 너무 정확히 따지면 연애가 편안한 관계보다 평가받는 일처럼 느껴질 수 있어요.',
    '토+수': '한 사람은 관계의 계획과 답을 분명히 하고 싶고 다른 사람은 상황에 맞춰 여유롭게 움직이고 싶어, 확답을 요구하는 순간 부담이 커질 수 있어요.',
    '금+금': '둘 다 잘못된 부분을 빠르게 알아채서 문제 해결은 빠르지만, 누가 더 옳은지 따지기 시작하면 사과보다 지적이 길어질 수 있어요.',
    '금+수': '한 사람은 관계의 기준과 결론을 명확히 듣고 싶고 다른 사람은 상황과 감정을 더 살펴보고 싶어, 애매한 답이나 단호한 말투에서 상처가 생길 수 있어요.',
    '수+수': '둘 다 상대가 먼저 말해주길 기다리면 겉으로는 조용해도 서운함이 오래 남을 수 있고, 싸운 뒤 연락을 누가 먼저 할지를 두고 시간이 길어질 수 있어요.',
  };

  function getElementPairConflict(profileA, profileB, seed) {
    return getPairVariation(profileA, profileB, seed || `${profileA.seed}|${profileB.seed}`);
  }

  function buildConflictScenario(profileA, profileB, direction, compat) {
    const dayTone = compat?.dayJijiRelation?.tone;
    const yearTone = compat?.yearJijiRelation?.tone;
    const seed = `${profileA.seed}|${profileB.seed}|${getCompatSignature(compat)}|conflict`;
    const branchContext = getProfileJijiContext(profileA, profileB, compat);
    const base = [];
    if (direction === 'aControlsB' || direction === 'bControlsA') {
      const controller = direction === 'aControlsB' ? profileA : profileB;
      const receiver = direction === 'aControlsB' ? profileB : profileA;
      base.push(pickVariation([
        `여행 계획이나 중요한 결정을 할 때 ${controller.name}님이 기준과 해결책을 먼저 정하면 ${receiver.name}님은 함께 상의하기보다 정해진 답을 따라야 한다고 느낄 수 있어요.`,
        `${controller.name}님의 빠른 판단이 ${receiver.name}님에게는 도움보다 통제로 느껴질 수 있어 결정권을 항목별로 나누는 것이 좋아요.`,
        `${controller.name}님이 문제를 고치려는 마음으로 말해도 ${receiver.name}님은 자신의 방식이 부정당한다고 느낄 수 있어 요청형 문장이 필요해요.`,
      ], seed, 'conflict:control'));
    } else if (direction === 'same') {
      base.push(pickVariation(['둘 다 같은 결론을 원한다고 생각해 세부 내용을 확인하지 않으면 약속 시간·비용·역할에서 다른 기대가 드러날 수 있어요.', '반응이 비슷해 상대 마음을 안다고 단정하기 쉬워요. 원하는 속도와 결론은 따로 확인해주세요.', '같은 장점과 약점이 동시에 커져 둘 다 미루거나 둘 다 고집을 부리는 장면이 생길 수 있어요.'], seed, 'conflict:same'));
    } else if (direction === 'aGeneratesB' || direction === 'bGeneratesA') {
      const giver = direction === 'aGeneratesB' ? profileA : profileB;
      const receiver = direction === 'aGeneratesB' ? profileB : profileA;
      base.push(pickVariation([`${giver.name}님이 연락·예약·분위기 조율을 계속 맡고 ${receiver.name}님이 따라가는 패턴이 굳어지면 데이트를 혼자 준비한다는 서운함이 생길 수 있어요.`, `${giver.name}님의 배려가 자연스럽게 반복되면서 ${receiver.name}님은 도움을 받는 역할에 익숙해질 수 있어 가끔은 시작하는 사람을 바꿔야 해요.`, `상생의 흐름이 좋아도 한 사람이 계속 에너지를 공급하면 지칠 수 있어 다음 약속은 도움을 받은 사람이 준비하는 규칙이 좋아요.`], seed, 'conflict:generate'));
    } else {
      base.push(pickVariation(['누가 먼저 연락하고 약속을 잡을지 서로 기다리면 관심이 줄었다고 오해할 수 있어요.', '큰 갈등은 적어도 관계를 움직이는 사람이 없으면 친밀감이 정체될 수 있어요.', '역할이 자연스럽게 정해지지 않아 준비와 결정이 한쪽에 몰리지 않도록 번갈아 맡는 편이 좋아요.'], seed, 'conflict:neutral'));
    }
    base.push(getElementPairConflict(profileA, profileB, seed));

    if (branchContext.day.tone === 'clash' || branchContext.day.tone === 'friction') {
      const aFriction = profileA.dayFriction || `${profileA.name}님은 가까운 상황에서 자신의 방식이 선명해질 수 있어요.`;
      const bFriction = profileB.dayFriction || `${profileB.name}님도 감정을 다루는 속도가 다를 수 있어요.`;
      base.push(`${formatJiji(profileA.dayJiji)} 일지의 ${profileA.name}님은 ${aFriction} 반면 ${formatJiji(profileB.dayJiji)} 일지의 ${profileB.name}님은 ${bFriction}`);
    } else {
      base.push(getJijiRelationDescription(branchContext.day, seed, 'day'));
    }

    if (branchContext.month.tone === 'clash' || branchContext.month.tone === 'friction') {
      base.push(getJijiRelationDescription(branchContext.month, seed, 'month'));
    } else if (yearTone === 'clash' || yearTone === 'friction') {
      base.push(pickVariation(['가족·친구 모임·기념일 비용·주말 사용처럼 둘 밖의 생활에서 차이가 커질 수 있어 일정이 잡히기 전에 기준부터 확인하세요.', '바깥 관계와 생활 환경에서 마찰이 생기기 쉬워 참석 범위·비용·시간을 사전에 합의하는 편이 좋아요.'], seed, 'conflict:year-bad'));
    } else {
      base.push(pickVariation(['데이트 장소·예약·이동 경로·연락 시간을 한 사람이 계속 맡지 않도록 준비 역할과 결정권을 번갈아 나눠주세요.', '바깥 활동의 호흡이 무난한 만큼 익숙한 역할이 한쪽에 고정되지 않게 가끔 담당을 바꿔보세요.'], seed, 'conflict:year-neutral'));
    }
    return uniqueText(base).slice(0, 5);
  }

  function buildRelationshipFlow(profileA, profileB, compat) {
    const relation = compat?.relation;
    const branchContext = getProfileJijiContext(profileA, profileB, compat);
    const daySignal = getJijiSignal(branchContext.day);
    const complementCount = (compat?.complement?.aFillsB?.length || 0) + (compat?.complement?.bFillsA?.length || 0);
    const seed = `${profileA.seed}|${profileB.seed}|${getCompatSignature(compat)}|flow`;
    let key = 'neutral';
    if (relation === '상생' && daySignal > 0 && complementCount >= 2) key = 'strongGood';
    else if (relation === '상극' && daySignal < 0) key = 'clashStrong';
    else if (relation === '동기' && complementCount === 0) key = 'sameNoComplement';
    else if (daySignal > 0) key = 'dayGood';
    else if (daySignal < 0) key = 'dayBad';
    const first = pickVariation(RELATION_FLOW_VARIATIONS[key], seed, `flow:${key}`);
    const combinedCount = Object.fromEntries(OHAENG_ORDER.map(k => [k, profileA.stats.count[k] + profileB.stats.count[k]]));
    const combinedStats = analyzeOhaengCount(combinedCount);
    const nuance = buildCombinedEverydayText(combinedStats, `${seed}|combined`);
    const branchNuance = pickVariation([
      getJijiRelationDescription(branchContext.month, seed, 'month'),
      getJijiRelationDescription(branchContext.day, seed, 'day'),
    ], seed, 'flow:branch-nuance');
    return `${first} ${branchNuance} ${nuance}`.trim();
  }

  const ROMANTIC_ELEMENT_SCENE = {
    목: '새로운 식당이나 여행지를 함께 찾아보고, 다음에 할 일을 자연스럽게 이야기하는 연인이에요. 서로의 목표를 응원하는 말이 애정 표현처럼 느껴지는 편이에요.',
    화: '만나면 표정과 말투가 밝아지고, 보고 싶었다는 말이나 사진·기념일 같은 표현을 적극적으로 나누는 연인이에요. 짧게 만나도 데이트 분위기가 금방 살아나요.',
    토: '정해진 날에 만나 밥을 먹고 서로의 일상을 챙기는, 생활 속에서 안정감을 주는 연인이에요. 아플 때 필요한 것을 챙기거나 약속을 지키는 행동으로 사랑을 보여줘요.',
    금: '시간과 약속을 소중히 여기고, 관계를 애매하게 두기보다 서로의 계획과 기준을 분명히 공유하는 연인이에요. 함께 세운 목표를 지켜갈 때 애정이 깊어져요.',
    수: '시끄러운 자리보다 둘만의 카페나 밤 산책에서 속이야기를 오래 나누는 연인이에요. 계속 붙어 있기보다 각자의 시간을 보낸 뒤 다시 만날 때 편안함을 느껴요.',
  };

  function buildRomanticTogetherScenes(profileA, profileB, compat, direction, combinedStats) {
    const seed = `${profileA.seed}|${profileB.seed}|${getCompatSignature(compat)}|romantic`;
    const relation = compat?.relation || '중립';
    const branchContext = getProfileJijiContext(profileA, profileB, compat);
    const daySignal = getJijiSignal(branchContext.day);
    const dominantCandidates = combinedStats.dominant.length ? combinedStats.dominant : [profileA.dominant];
    const dominant = pickVariation(dominantCandidates, seed, 'romantic:dominant') || profileA.dominant;
    const scenes = [];
    scenes.push(pickVariation(RELATION_SCENE_VARIATIONS[relation], seed, `romantic:relation:${relation}`));
    const dayKey = daySignal > 0 ? 'dayGood' : daySignal < 0 ? 'dayBad' : 'dayNeutral';
    scenes.push(pickVariation(RELATION_SCENE_VARIATIONS[dayKey], seed, `romantic:${dayKey}`));
    const branchRomancePool = uniqueText([profileA.dayRomantic, profileB.dayRomantic]);
    if (branchRomancePool.length) scenes.push(pickVariation(branchRomancePool, seed, 'romantic:day-branches'));
    scenes.push(pickVariation(OHAENG_VARIATION_BANK[dominant]?.romantic, seed, `romantic:element:${dominant}`) || ROMANTIC_ELEMENT_SCENE[dominant]);
    if (direction === 'aGeneratesB' || direction === 'bGeneratesA') {
      const giver = direction === 'aGeneratesB' ? profileA : profileB;
      const receiver = direction === 'aGeneratesB' ? profileB : profileA;
      scenes.push(pickVariation([`${giver.name}님이 데이트의 흐름이나 감정 표현을 먼저 열고 ${receiver.name}님이 그 분위기를 이어가는 모습이 자주 보여요. 가끔은 시작하는 역할을 바꿔주세요.`, `${giver.name}님이 관계의 에너지를 먼저 만들면 ${receiver.name}님이 안정적으로 받아 이어가는 편이에요. 다음 약속은 도움을 받은 사람이 먼저 제안해보세요.`], seed, 'romantic:give-receive'));
    }
    return uniqueText(scenes).slice(0, 4);
  }

  function buildActionTips(profileA, profileB, direction, compat) {
    const seed = `${profileA.seed}|${profileB.seed}|${getCompatSignature(compat)}|tips`;
    const branchActions = buildBranchPairScenario(profileA, profileB, compat, seed, 'action');
    const tips = [
      `${profileA.name}님과 이야기할 때는 ‘${profileA.trait.repair}’ 방식을 써보세요.${profileA.dayRepair ? ` 일지 ${formatJiji(profileA.dayJiji)}의 반응을 고려하면 ${profileA.dayRepair}` : ''}`,
      `${profileB.name}님과 이야기할 때는 ‘${profileB.trait.repair}’ 방식을 써보세요.${profileB.dayRepair ? ` 일지 ${formatJiji(profileB.dayJiji)}의 반응을 고려하면 ${profileB.dayRepair}` : ''}`,
    ];
    if (direction === 'aGeneratesB' || direction === 'bGeneratesA') tips.push(pickVariation(['배려를 받은 사람이 고맙다는 말에서 끝내지 않고 다음 약속이나 준비로 되돌려주는 순환을 만들어보세요.', '도움을 주는 역할이 고정되지 않도록 다음 데이트는 도움을 받은 사람이 먼저 제안해보세요.', '한쪽이 계속 정서적·실무적 에너지를 공급하지 않도록 시작하는 사람을 의식적으로 바꿔주세요.'], seed, 'tips:generate'));
    else if (direction === 'aControlsB' || direction === 'bControlsA') tips.push(pickVariation(['상대 행동을 교정하기 전에 내가 필요한 것을 요청형 문장으로 말해주세요.', '결론을 대신 내려주지 말고 반드시 지킬 기준과 상대가 선택할 영역을 나눠주세요.', '조언을 하기 전에 지금 필요한 것이 해결책인지 공감인지 먼저 물어보세요.'], seed, 'tips:control'));
    else if (direction === 'same') tips.push(pickVariation(['의견이 같아 보여도 원하는 결론과 속도가 같은지 한 번 더 확인해주세요.', '상대도 자신과 같을 것이라 단정하지 말고 일정·비용·감정 기대를 각각 말해주세요.', '둘 다 잘하는 일보다 둘 다 미루는 일을 먼저 찾아 담당을 번갈아 정해주세요.'], seed, 'tips:same'));
    else tips.push(pickVariation(['누가 먼저 관계를 움직일지 기다리지 말고 약속과 연락의 시작을 번갈아 맡아보세요.', '공통 취미나 정기적인 만남을 하나 만들어 관계가 자연스럽게 이어질 계기를 주세요.'], seed, 'tips:neutral'));
    tips.push(...branchActions);
    if (compat?.yearJijiRelation?.tone === 'clash' || compat?.yearJijiRelation?.tone === 'friction') tips.push(pickVariation(['돈·가족·주말 일정·친구 모임 범위는 감정이 좋을 때 미리 합의해두세요.', '둘 밖의 생활에서 마찰이 커질 수 있으니 모임·비용·시간 기준을 일정이 잡히기 전에 확인하세요.'], seed, 'tips:year-bad'));
    return uniqueText(tips).slice(0, 6);
  }

  function ensureCompatDetailStyles() {
    if (document.getElementById('compat-detail-styles')) return;
    const style = document.createElement('style');
    style.id = 'compat-detail-styles';
    style.textContent = `
      .compat-detail-wrap{margin-top:20px;padding-top:18px;border-top:1px solid var(--line)}
      .compat-detail-title{font-weight:700;font-size:17px;margin-bottom:12px;color:var(--ink);font-family:'Noto Serif KR',serif}
      .compat-summary-card{padding:14px 16px;margin:10px 0;border-radius:14px;background:var(--bg-panel-raised);border:1px solid var(--line);line-height:1.75}
      .compat-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:12px 0}
      .compat-card{padding:14px 16px;border:1px solid var(--line);border-radius:14px;background:#ffffff;line-height:1.7;box-shadow:0 4px 14px rgba(28,29,33,.035)}
      .compat-card h4{display:flex;align-items:center;gap:7px;margin:0 0 9px;font-size:14px;color:var(--ink)}
      .compat-card h4::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--accent-2);box-shadow:0 0 0 4px rgba(148,151,163,.14);flex:0 0 auto}
      .compat-card p{margin:6px 0}
      .compat-stack-card{margin-top:16px}
      .compat-highlight-card{border-color:var(--line);background:linear-gradient(135deg,var(--bg-panel-raised) 0%,#ffffff 100%)}
      .compat-stack-card + .compat-stack-card{margin-top:16px}
      .compat-chip-row{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
      .compat-chip{display:inline-flex;padding:4px 9px;border-radius:999px;background:var(--bg-panel-raised);border:1px solid var(--line);color:var(--ink-dim);font-size:12px}
      .compat-list{margin:7px 0 0;padding-left:20px;line-height:1.75}
      .compat-muted{font-size:12px;opacity:.72;margin-top:12px}
      @media (max-width:680px){.compat-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function buildDetailedCompatHtml(sajuA, sajuB, compat, rawNameA, rawNameB) {
    ensureCompatDetailStyles();
    const nameA = escapeHtml(rawNameA);
    const nameB = escapeHtml(rawNameB);
    const profileA = makePersonProfile(nameA, sajuA);
    const profileB = makePersonProfile(nameB, sajuB);
    const direction = getElementDirection(profileA.day, profileB.day);
    const directionText = buildDirectionText(profileA, profileB, direction, compat);
    const complements = buildComplementInsight(profileA, profileB, compat);
    const conflicts = buildConflictScenario(profileA, profileB, direction, compat);
    const tips = buildActionTips(profileA, profileB, direction, compat);
    const flow = buildRelationshipFlow(profileA, profileB, compat);
    const combinedCount = Object.fromEntries(OHAENG_ORDER.map(k => [k, profileA.stats.count[k] + profileB.stats.count[k]]));
    const combinedStats = analyzeOhaengCount(combinedCount);
    const romanticScenes = buildRomanticTogetherScenes(profileA, profileB, compat, direction, combinedStats);
    const jijiContext = getProfileJijiContext(profileA, profileB, compat);

    const chipsA = [
      `일간 ${profileA.day}(${OHAENG_HANJA[profileA.day]})`,
      profileA.monthJiji ? `월지 ${formatJiji(profileA.monthJiji)}` : '',
      profileA.dayJiji ? `일지 ${formatJiji(profileA.dayJiji)}` : '',
      `강점 ${formatOhaengList(profileA.stats.dominant)}`,
      profileA.stats.missing.length ? `적게 나타남 ${formatOhaengList(profileA.stats.missing)}` : `덜 두드러짐 ${formatOhaengList(profileA.stats.weak.slice(0, 1))}`,
      `균형 ${profileA.stats.balanceScore}`,
    ].filter(Boolean);
    const chipsB = [
      `일간 ${profileB.day}(${OHAENG_HANJA[profileB.day]})`,
      profileB.monthJiji ? `월지 ${formatJiji(profileB.monthJiji)}` : '',
      profileB.dayJiji ? `일지 ${formatJiji(profileB.dayJiji)}` : '',
      `강점 ${formatOhaengList(profileB.stats.dominant)}`,
      profileB.stats.missing.length ? `적게 나타남 ${formatOhaengList(profileB.stats.missing)}` : `덜 두드러짐 ${formatOhaengList(profileB.stats.weak.slice(0, 1))}`,
      `균형 ${profileB.stats.balanceScore}`,
    ].filter(Boolean);

    return `
      <section class="compat-detail-wrap">
        <div class="compat-detail-title">두 사람의 관계를 조금 더 자세히 볼게요</div>
        <div class="compat-summary-card"><b>두 사람 사이의 기본 분위기</b><br>${directionText}</div>

        <div class="compat-grid">
          <article class="compat-card">
            <h4>${nameA}님은 사랑할 때 이런 편이에요</h4>
            <div class="compat-chip-row">${chipsA.map(x => `<span class="compat-chip">${x}</span>`).join('')}</div>
            <p>${profileA.summary}</p>
            ${profileA.branchSummary ? `<p><b>월지·일지로 보면</b> ${profileA.branchSummary}</p>` : ''}
            <p>${profileA.caution}</p>
          </article>
          <article class="compat-card">
            <h4>${nameB}님은 사랑할 때 이런 편이에요</h4>
            <div class="compat-chip-row">${chipsB.map(x => `<span class="compat-chip">${x}</span>`).join('')}</div>
            <p>${profileB.summary}</p>
            ${profileB.branchSummary ? `<p><b>월지·일지로 보면</b> ${profileB.branchSummary}</p>` : ''}
            <p>${profileB.caution}</p>
          </article>
        </div>

        <div class="compat-card compat-highlight-card">
          <h4>월지와 일지의 관계 흐름</h4>
          <div class="compat-chip-row">
            <span class="compat-chip">월지 ${jijiContext.month.type}</span>
            <span class="compat-chip">일지 ${jijiContext.day.type}</span>
          </div>
          <p>${buildJijiSynthesis(profileA, profileB, compat)}</p>
          <p><b>두 사람의 관계는</b> ${flow}</p>
        </div>

        <div class="compat-grid">
          <article class="compat-card">
            <h4>서로에게 힘이 되어주는 순간</h4>
            <ul class="compat-list">${complements.map(x => `<li>${x}</li>`).join('')}</ul>
          </article>
          <article class="compat-card">
            <h4>이럴 때 자주 부딪힐 수 있어요</h4>
            <ul class="compat-list">${conflicts.map(x => `<li>${x}</li>`).join('')}</ul>
          </article>
        </div>

        <div class="compat-card compat-stack-card compat-highlight-card">
          <h4>연인이 되면 이런 모습이에요</h4>
          ${romanticScenes.map(scene => `<p>${scene}</p>`).join('')}
        </div>

        <div class="compat-card compat-stack-card compat-highlight-card">
          <h4>오래 잘 만나려면 이렇게 해보세요</h4>
          <ol class="compat-list">${tips.map(x => `<li>${x}</li>`).join('')}</ol>
        </div>
        <div class="compat-muted">※ 월지는 생활·사회적 관계의 리듬, 일지는 가까운 관계에서의 반응을 살펴보는 참고 요소로 사용했어요. ‘균형’ 수치는 오행 분포의 편중을 보여주는 참고값이에요.</div>
      </section>
    `;
  }


  // -----------------------------------------------------------------
  // 생년 미상 가능성 기반 추가 분석
  // 별도 입력을 받지 않고 최근 60개 출생연도를 동일한 비중으로 가정해
  // 가능한 일간·일지 관계와 상호 보완 흐름을 집계합니다.
  // 이 수치는 실제 출생연도의 확률이 아니라, 가정한 후보군 안에서
  // 각 관계 유형이 나타난 비중을 뜻합니다.
  // -----------------------------------------------------------------
  const APPROX_RELATION_SUPPORT_BANK = {
    상생: [
      '가능한 일간 조합 가운데 상생 흐름에서는 한 사람이 시작한 일을 다른 사람이 자연스럽게 이어주며 서로의 부담을 덜어주는 모습이 나타날 수 있어요.',
      '한쪽이 지치거나 망설일 때 다른 쪽이 감정적 응원이나 실제 행동으로 힘을 보태는 관계가 될 가능성이 있어요.',
      '서로 다른 장점이 연결되면 혼자서는 미뤘을 일도 함께 계획하고 실행하기 쉬운 흐름이 보여요.',
      '배려가 한 방향으로만 흐르기보다 상황에 따라 챙기는 역할이 바뀌는 관계로 이어질 수 있어요.',
    ],
    상극: [
      '가능한 일간 조합 가운데 상극 흐름에서는 서로 다른 관점이 상대가 놓친 문제를 발견하게 해주는 힘으로 작용할 수 있어요.',
      '방식은 다르더라도 한 사람은 추진력을, 다른 사람은 점검과 균형을 맡아 중요한 결정을 더 입체적으로 볼 가능성이 있어요.',
      '처음에는 차이로 느껴지는 성향이 위기 상황에서는 서로의 약점을 보완하는 역할로 바뀔 수 있어요.',
      '상대의 반응이 낯설기 때문에 오히려 자신의 습관을 돌아보고 관계 방식을 넓히는 계기가 생길 수 있어요.',
    ],
    동기: [
      '가능한 일간 조합 가운데 동기 흐름에서는 설명을 길게 하지 않아도 상대의 기분과 반응을 빠르게 알아차릴 수 있어요.',
      '취향과 행동 속도가 비슷해 지친 날에는 함께 쉬고 즐거운 날에는 바로 움직이는 자연스러운 호흡이 나타날 수 있어요.',
      '비슷한 고민을 겪을 때 판단보다 공감을 먼저 건네며 정서적인 편이 되어줄 가능성이 있어요.',
      '서로 좋아하는 방식이 닮아 작은 장난이나 일상적인 연락만으로도 친밀감을 회복하기 쉬운 흐름이 보여요.',
    ],
    중립: [
      '가능한 일간 조합 가운데 중립 흐름에서는 강하게 이끌기보다 필요한 순간에 곁을 지키며 안정감을 주는 관계가 될 수 있어요.',
      '큰 도움 한 번보다 일정한 연락과 작은 약속을 반복하면서 서로에게 믿을 만한 사람이 될 가능성이 있어요.',
      '각자의 생활을 크게 흔들지 않으면서도 실질적으로 필요한 부분을 차분히 나누는 관계로 이어질 수 있어요.',
      '처음부터 역할이 정해지지 않아 상황에 따라 계획하는 사람과 받아주는 사람이 자연스럽게 바뀔 수 있어요.',
    ],
  };

  const APPROX_RELATION_CONFLICT_BANK = {
    상생: [
      '상생 흐름이 나타나는 조합에서도 한 사람이 계속 계획·연락·배려를 맡으면 도움을 주는 쪽에 피로가 쌓일 수 있어요.',
      '자연스럽게 챙겨주는 관계일수록 받은 사람이 고마움을 실제 행동으로 돌려주지 않으면 역할이 고정될 가능성이 있어요.',
      '서로 잘 맞는다는 느낌 때문에 불편한 점을 늦게 말하면 작은 서운함이 한꺼번에 드러날 수 있어요.',
      '한쪽의 도움을 다른 쪽이 당연하게 받아들이는 순간 관계의 균형이 흔들릴 수 있어요.',
    ],
    상극: [
      '상극 흐름이 나타나는 조합에서는 한 사람의 조언이 다른 사람에게 통제나 평가로 느껴져 자존심 싸움으로 번질 수 있어요.',
      '결정 속도와 감정 표현 방식이 다르면 같은 상황을 한쪽은 회피로, 다른 쪽은 압박으로 받아들일 가능성이 있어요.',
      '서로를 바꾸려는 대화가 반복되면 문제의 내용보다 말투와 태도에 대한 서운함이 커질 수 있어요.',
      '끌림이 강한 만큼 감정이 올라온 순간에는 작은 차이도 관계 전체의 문제처럼 확대될 수 있어요.',
    ],
    동기: [
      '동기 흐름이 나타나는 조합에서는 둘 다 어려워하는 약속 잡기·사과하기·돈 관리 같은 일을 함께 미룰 수 있어요.',
      '서로 비슷하다는 생각 때문에 원하는 것이 같을 거라고 넘기면 세부적인 기대 차이가 뒤늦게 드러날 가능성이 있어요.',
      '같은 순간에 고집을 부리거나 침묵하면 누가 먼저 화해할지를 기다리는 시간이 길어질 수 있어요.',
      '친구 같은 편안함에 기대면 연인다운 표현이 줄어 상대가 관계의 확신을 잃을 수 있어요.',
    ],
    중립: [
      '중립 흐름이 나타나는 조합에서는 큰 싸움은 적어도 누가 먼저 연락하고 약속을 정할지 기다리며 관계가 정체될 수 있어요.',
      '서로 부담을 주지 않으려다 필요한 요구까지 말하지 않아 거리감이 서서히 커질 가능성이 있어요.',
      '편안함이 익숙함으로 굳으면 관계를 위한 노력과 애정 표현이 줄었다고 느낄 수 있어요.',
      '문제를 심각하게 여기지 않고 넘기다 같은 불편이 반복될 수 있어요.',
    ],
  };

  const APPROX_RELATION_ROMANTIC_BANK = {
    상생: [
      '한 사람이 먼저 마음이나 계획을 꺼내면 다른 사람이 자연스럽게 반응해주는 연애가 될 가능성이 있어요.',
      '거창한 이벤트보다 필요한 순간에 먼저 움직여주는 행동에서 사랑을 확인하는 커플로 이어질 수 있어요.',
      '서로의 목표를 응원하고 실제 도움으로 연결할 때 연인다운 신뢰가 깊어질 가능성이 커요.',
    ],
    상극: [
      '서로에게 없는 매력이 강하게 보여 설렘과 긴장감이 함께 살아 있는 연애가 될 가능성이 있어요.',
      '데이트할 때는 활기가 넘치지만 의견이 다를 때도 감정이 크게 움직여 화해 방식이 중요한 커플이 될 수 있어요.',
      '다른 성향을 고치기보다 역할로 나눌 때 강한 끌림과 현실적인 팀워크가 함께 살아날 수 있어요.',
    ],
    동기: [
      '친구 같은 편안함과 연인다운 장난스러움이 함께 있는 커플이 될 가능성이 있어요.',
      '같은 이야기에 웃고 별일 없는 날에도 메시지나 밈을 나누며 친밀감을 쌓는 연애로 이어질 수 있어요.',
      '취향과 반응 속도가 비슷해 짧게 만나도 금방 둘만의 분위기로 돌아오는 관계가 될 수 있어요.',
    ],
    중립: [
      '처음부터 불꽃처럼 달아오르기보다 일상을 공유하면서 천천히 정이 깊어지는 연애가 될 가능성이 있어요.',
      '각자의 생활을 존중하고 약속한 순간에 성실하게 반응하는 것이 큰 애정 표현이 되는 커플로 이어질 수 있어요.',
      '화려한 이벤트보다 자주 밥을 먹고 편안하게 쉬는 시간이 관계를 깊게 만들 가능성이 있어요.',
    ],
  };

  const APPROX_RELATION_TIP_BANK = {
    상생: [
      '도움을 받은 사람이 다음 약속이나 연락을 먼저 준비해 배려가 한 방향으로 굳지 않게 해보세요.',
      '서로 잘 맞는다고 느껴도 힘든 역할이 한 사람에게 반복되는지 가끔 확인하는 편이 좋아요.',
      '고마움을 말로만 끝내지 말고 상대가 부담스러워하던 일 하나를 실제 행동으로 돌려주세요.',
    ],
    상극: [
      '상대 행동을 고치려 하기 전에 “내가 필요한 것은 무엇인지”를 요청형 문장으로 말해주세요.',
      '감정이 올라온 순간에는 결론을 내리지 말고 다시 이야기할 시각을 정한 뒤 잠시 쉬는 편이 좋아요.',
      '서로 절대 양보할 수 없는 기준과 조정 가능한 부분을 분리해서 이야기해보세요.',
    ],
    동기: [
      '마음이 같을 것이라고 추측하지 말고 원하는 연락 방식과 결론을 각각 확인해주세요.',
      '둘 다 미루기 쉬운 일은 담당을 번갈아 정해 관계의 빈틈을 함께 관리해보세요.',
      '친구 같은 편안함 속에서도 고마움과 애정은 말로 분명히 표현해주세요.',
    ],
    중립: [
      '누가 먼저 움직일지 기다리지 않도록 약속이나 연락의 시작을 번갈아 맡아보세요.',
      '관계가 편안할수록 정기적으로 새로운 경험을 하나씩 넣어 친밀감의 흐름을 살려주세요.',
      '괜찮다고 넘긴 불편이 없는지 가끔 좋았던 점과 아쉬웠던 점을 하나씩 나눠보세요.',
    ],
  };

  const APPROX_DAY_RELATION_SCENE_BANK = {
    육합: [
      '가능한 일지 조합에서 육합이 나타나는 경우에는 둘만 있을 때 경계가 비교적 빨리 풀리고 속마음을 편하게 나눌 수 있어요.',
      '육합 흐름에서는 피곤한 날에도 함께 식사하거나 쉬는 것만으로 친밀감을 회복하기 쉬운 모습이 나타날 수 있어요.',
      '가까운 관계에서 자연스럽게 안심되는 조합이 일부 포함되어 있어, 말보다 곁을 지켜주는 행동이 크게 느껴질 수 있어요.',
    ],
    삼합: [
      '가능한 일지 조합에서 삼합이 나타나는 경우에는 함께 움직일 목표가 있을 때 감정과 행동의 호흡이 좋아질 수 있어요.',
      '여행·운동·공부처럼 같은 방향을 보고 움직이는 상황에서 연인다운 팀워크가 살아날 가능성이 있어요.',
      '가만히 마주 앉아 있기보다 공동 경험을 만들 때 친밀감이 빠르게 깊어지는 조합이 일부 보여요.',
    ],
    충: [
      '가능한 일지 조합에서 충이 나타나는 경우에는 가까워질수록 감정 속도와 확인 방식의 차이가 선명해질 수 있어요.',
      '좋아하는 마음과 별개로 한 사람은 바로 말하고 다른 사람은 거리를 두려는 장면이 생길 가능성이 있어요.',
      '갈등 순간의 긴장이 큰 조합도 포함되어 있어, 냉각 시간과 재대화 약속이 특히 중요할 수 있어요.',
    ],
    형: [
      '가능한 일지 조합에서 형이 나타나는 경우에는 큰 사건보다 반복되는 말투와 잔소리에서 피로가 쌓일 수 있어요.',
      '겉으로는 무난해 보여도 가까운 사이에서 평가받거나 간섭받는 느낌이 생길 가능성이 있어요.',
      '사소한 행동을 고치려는 대화가 반복될 수 있어 한 번에 한 가지 문제만 다루는 편이 좋아요.',
    ],
    해: [
      '가능한 일지 조합에서 해가 나타나는 경우에는 배려한 행동이 상대의 기대와 어긋나 사소한 오해가 반복될 수 있어요.',
      '큰 충돌은 없어도 답장 시점이나 말의 뉘앙스를 다르게 받아들이는 조합이 일부 포함되어 있어요.',
      '의도와 감정을 짧게 확인하는 습관이 있으면 작은 엇갈림이 오래 남는 것을 줄일 수 있어요.',
    ],
    동일: [
      '가능한 일지 조합에서 동일 관계가 나타나는 경우에는 친밀감이 빠르지만 같은 약점도 함께 드러날 수 있어요.',
      '애정 표현의 취향은 비슷해도 둘 다 같은 순간에 침묵하거나 고집을 부릴 가능성이 있어요.',
      '상대 마음을 이미 안다고 생각하기보다 원하는 것을 한 번 더 확인하는 편이 좋아요.',
    ],
    평: [
      '가능한 일지 조합 중 특별한 합·충이 없는 경우에는 실제 연락 습관과 대화 방식이 관계 만족도를 더 크게 좌우해요.',
      '강한 운명적 호흡보다 함께 만든 경험과 반복되는 약속을 통해 정이 깊어지는 조합이 많이 포함되어 있어요.',
      '서로의 성향을 미리 단정하기보다 실제 생활에서 맞춰가는 힘이 중요한 흐름이에요.',
    ],
  };

  function normalizeProbabilityMap(map) {
    const entries = Object.entries(map || {});
    const total = entries.reduce((sum, [, value]) => sum + Number(value || 0), 0) || 1;
    return Object.fromEntries(entries.map(([key, value]) => [key, Number(value || 0) / total]));
  }

  function probabilityPercent(value) {
    return Math.max(0, Math.min(100, Math.round(Number(value || 0) * 100)));
  }

  function sortedProbabilityEntries(map) {
    return Object.entries(map || {}).sort((a, b) => b[1] - a[1]);
  }

  function directionToRelation(direction) {
    if (direction === 'same') return '동기';
    if (direction === 'aGeneratesB' || direction === 'bGeneratesA') return '상생';
    if (direction === 'aControlsB' || direction === 'bControlsA') return '상극';
    return '중립';
  }

  function buildPossibleSajuCandidates(entry, input) {
    if (entry?.exact) {
      const saju = entry.exact;
      const stats = analyzeOhaengCount(saju?.ohaengCount);
      return [{
        year: input?.year,
        saju,
        stats,
        dayElement: getDayOhaeng(saju),
        dayJiji: getPillarJiji(saju, 'day'),
        dominant: stats.dominant[0] || getDayOhaeng(saju) || '토',
      }];
    }

    const currentYear = new Date().getFullYear();
    const minYear = currentYear - 59;
    const candidates = [];
    const month = Number(input?.month);
    const day = Number(input?.day);
    const hour = input?.hourUnknown ? 12 : Number(input?.hour ?? 12);
    const minute = Number(input?.minute ?? 0);

    for (let year = minYear; year <= currentYear; year += 1) {
      const date = new Date(year, month - 1, day);
      if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) continue;
      try {
        const saju = calculateSaju(year, month, day, hour, minute);
        const stats = analyzeOhaengCount(saju?.ohaengCount);
        candidates.push({
          year,
          saju,
          stats,
          dayElement: getDayOhaeng(saju),
          dayJiji: getPillarJiji(saju, 'day'),
          dominant: stats.dominant[0] || getDayOhaeng(saju) || '토',
        });
      } catch (error) {
        // 일부 연도 계산이 불가능하더라도 나머지 후보로 계속 집계합니다.
      }
    }

    if (candidates.length) return candidates;

    // 계산 코어가 후보 연도를 처리하지 못할 때 기존 근사값으로 최소 후보를 만듭니다.
    const likely = entry?.approx?.day?.likelyOhaeng || [];
    const percent = entry?.approx?.day?.percent || {};
    const fallback = likely.map((element, index) => ({
      year: null,
      saju: null,
      stats: analyzeOhaengCount(buildApproxCount(entry.approx)),
      dayElement: element,
      dayJiji: null,
      dominant: element,
      fallbackWeight: Math.max(1, Number.parseFloat(percent?.[element]) || (likely.length - index)),
    }));
    return fallback.length ? fallback : [{
      year: null,
      saju: null,
      stats: analyzeOhaengCount(buildApproxCount(entry.approx)),
      dayElement: analyzeOhaengCount(buildApproxCount(entry.approx)).dominant[0] || '토',
      dayJiji: null,
      dominant: analyzeOhaengCount(buildApproxCount(entry.approx)).dominant[0] || '토',
      fallbackWeight: 1,
    }];
  }

  function candidateWeight(candidate) {
    return Math.max(0.0001, Number(candidate?.fallbackWeight || 1));
  }

  function buildUnknownYearPossibilityModel(entryA, entryB, inputA, inputB) {
    const candidatesA = buildPossibleSajuCandidates(entryA, inputA);
    const candidatesB = buildPossibleSajuCandidates(entryB, inputB);
    const relationCounts = { 상생: 0, 상극: 0, 동기: 0, 중립: 0 };
    const directionCounts = { aGeneratesB: 0, bGeneratesA: 0, aControlsB: 0, bControlsA: 0, same: 0, neutral: 0 };
    const dayRelationCounts = { 육합: 0, 삼합: 0, 충: 0, 형: 0, 해: 0, 동일: 0, 평: 0 };
    const dominantPairCounts = {};
    const combinedDominantCounts = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
    let totalWeight = 0;
    let aFillsBWeight = 0;
    let bFillsAWeight = 0;
    let mutualFillWeight = 0;
    let sharedStrongWeight = 0;
    let sharedGapWeight = 0;

    for (const a of candidatesA) {
      for (const b of candidatesB) {
        const weight = candidateWeight(a) * candidateWeight(b);
        totalWeight += weight;
        const direction = getElementDirection(a.dayElement, b.dayElement);
        const relation = directionToRelation(direction);
        relationCounts[relation] += weight;
        directionCounts[direction] += weight;

        const dayRelation = a.dayJiji && b.dayJiji ? getLocalJijiRelation(a.dayJiji, b.dayJiji) : { type: '평', tone: 'neutral' };
        dayRelationCounts[dayRelation.type in dayRelationCounts ? dayRelation.type : '평'] += weight;

        const aTargets = [...(b.stats?.missing || []), ...(b.stats?.weak || [])];
        const bTargets = [...(a.stats?.missing || []), ...(a.stats?.weak || [])];
        const aFills = (a.stats?.dominant || []).some(k => aTargets.includes(k));
        const bFills = (b.stats?.dominant || []).some(k => bTargets.includes(k));
        if (aFills) aFillsBWeight += weight;
        if (bFills) bFillsAWeight += weight;
        if (aFills && bFills) mutualFillWeight += weight;
        if ((a.stats?.dominant || []).some(k => (b.stats?.dominant || []).includes(k))) sharedStrongWeight += weight;
        if ((a.stats?.missing || []).some(k => (b.stats?.missing || []).includes(k))) sharedGapWeight += weight;

        const pair = [a.dominant, b.dominant]
          .sort((x, y) => OHAENG_ORDER.indexOf(x) - OHAENG_ORDER.indexOf(y))
          .join('+');
        dominantPairCounts[pair] = (dominantPairCounts[pair] || 0) + weight;

        if (a.saju && b.saju) {
          const combinedCount = Object.fromEntries(OHAENG_ORDER.map(k => [k, Number(a.saju?.ohaengCount?.[k] || 0) + Number(b.saju?.ohaengCount?.[k] || 0)]));
          const combinedDominant = analyzeOhaengCount(combinedCount).dominant[0];
          if (combinedDominant) combinedDominantCounts[combinedDominant] += weight;
        } else {
          combinedDominantCounts[a.dominant] += weight / 2;
          combinedDominantCounts[b.dominant] += weight / 2;
        }
      }
    }

    const safeTotal = totalWeight || 1;
    const monthA = getEntryMonthJiji(entryA);
    const monthB = getEntryMonthJiji(entryB);
    return {
      candidatesA: candidatesA.length,
      candidatesB: candidatesB.length,
      pairCount: candidatesA.length * candidatesB.length,
      relation: normalizeProbabilityMap(relationCounts),
      direction: normalizeProbabilityMap(directionCounts),
      dayRelation: normalizeProbabilityMap(dayRelationCounts),
      dominantPair: normalizeProbabilityMap(dominantPairCounts),
      combinedDominant: normalizeProbabilityMap(combinedDominantCounts),
      aFillsB: aFillsBWeight / safeTotal,
      bFillsA: bFillsAWeight / safeTotal,
      mutualFill: mutualFillWeight / safeTotal,
      sharedStrong: sharedStrongWeight / safeTotal,
      sharedGap: sharedGapWeight / safeTotal,
      monthRelation: getLocalJijiRelation(monthA, monthB),
      monthA,
      monthB,
    };
  }

  function makePossibilityChip(label, probability) {
    return `<span class="compat-chip">${escapeHtml(label)} ${probabilityPercent(probability)}%</span>`;
  }

  function buildPossibilityChips(model) {
    const relationChips = sortedProbabilityEntries(model.relation)
      .slice(0, 4)
      .map(([key, value]) => makePossibilityChip(key, value));
    const dayChips = sortedProbabilityEntries(model.dayRelation)
      .filter(([, value]) => probabilityPercent(value) > 0)
      .slice(0, 3)
      .map(([key, value]) => makePossibilityChip(`일지 ${key}`, value));
    return [...relationChips, ...dayChips].join('');
  }

  function possibilityPrefix(probability) {
    const percent = probabilityPercent(probability);
    if (percent >= 45) return '후보 조합에서 비교적 자주 나타나는 흐름으로,';
    if (percent >= 30) return '후보 조합에서 눈에 띄는 가능성으로,';
    return '가능한 관계 시나리오 중 하나로,';
  }

  function buildApproxSupportLines(model, statsA, statsB, nameA, nameB, seed) {
    const lines = [];
    const topRelations = sortedProbabilityEntries(model.relation).slice(0, 2);
    topRelations.forEach(([relation, probability], index) => {
      const text = pickVariation(APPROX_RELATION_SUPPORT_BANK[relation], seed, `approx-support:${relation}:${index}`);
      if (text) lines.push(`${possibilityPrefix(probability)} ${text}`);
    });

    const topDirection = sortedProbabilityEntries(model.direction)[0];
    if (topDirection && topDirection[1] >= 0.24) {
      const [direction, probability] = topDirection;
      if (direction === 'aGeneratesB') lines.push(`${probabilityPercent(probability)}%의 후보 조합에서는 ${nameA}님이 먼저 아이디어나 정서적 힘을 보태고 ${nameB}님이 이를 행동으로 이어가는 방향이 나타나요.`);
      if (direction === 'bGeneratesA') lines.push(`${probabilityPercent(probability)}%의 후보 조합에서는 ${nameB}님이 먼저 아이디어나 정서적 힘을 보태고 ${nameA}님이 이를 행동으로 이어가는 방향이 나타나요.`);
    }

    if (model.mutualFill >= 0.22) {
      lines.push(`후보 조합의 약 ${probabilityPercent(model.mutualFill)}%에서는 두 사람이 서로의 약한 오행을 번갈아 보완하는 흐름이 나타나, 한 사람만 계속 챙기기보다 상황에 따라 역할이 바뀔 가능성이 있어요.`);
    } else {
      if (model.aFillsB >= 0.28) lines.push(`${nameA}님의 기운이 ${nameB}님의 부족한 부분을 보완하는 조합이 약 ${probabilityPercent(model.aFillsB)}%로 나타나, ${nameB}님이 막막할 때 ${nameA}님이 방향이나 안정감을 제공할 가능성이 있어요.`);
      if (model.bFillsA >= 0.28) lines.push(`${nameB}님의 기운이 ${nameA}님의 부족한 부분을 보완하는 조합이 약 ${probabilityPercent(model.bFillsA)}%로 나타나, ${nameA}님이 지칠 때 ${nameB}님이 다른 관점이나 정서적 여유를 줄 가능성이 있어요.`);
    }

    const monthType = model.monthRelation?.type || '평';
    const monthTone = model.monthRelation?.tone || 'neutral';
    if (monthTone === 'good') {
      lines.push(getJijiRelationDescription(model.monthRelation, seed, 'month'));
    } else if (monthType === '평') {
      lines.push('월지 관계가 한쪽으로 강하게 기울지 않아, 실제로 누가 약속을 준비하고 생활 리듬을 조율하는지에 따라 서로에게 주는 도움이 달라질 수 있어요.');
    }

    if (model.sharedStrong >= 0.28) {
      const common = statsA.dominant.find(k => statsB.dominant.includes(k));
      if (common) lines.push(pickVariation(OHAENG_VARIATION_BANK[common]?.sharedStrong, seed, `approx-support-shared:${common}`) || ELEMENT_SHARED_STRONG[common]);
    }
    return uniqueText(lines).slice(0, 4);
  }

  function buildApproxConflictLines(model, statsA, statsB, seed) {
    const lines = [];
    const topRelations = sortedProbabilityEntries(model.relation).slice(0, 2);
    topRelations.forEach(([relation, probability], index) => {
      const text = pickVariation(APPROX_RELATION_CONFLICT_BANK[relation], seed, `approx-conflict:${relation}:${index}`);
      if (text) lines.push(`${possibilityPrefix(probability)} ${text}`);
    });

    const frictionProbability = (model.dayRelation.충 || 0) + (model.dayRelation.형 || 0) + (model.dayRelation.해 || 0);
    if (frictionProbability >= 0.18) {
      const frictionType = sortedProbabilityEntries({ 충: model.dayRelation.충, 형: model.dayRelation.형, 해: model.dayRelation.해 })[0][0];
      const scene = pickVariation(APPROX_DAY_RELATION_SCENE_BANK[frictionType], seed, `approx-day-friction:${frictionType}`);
      if (scene) lines.push(`일지 마찰 흐름이 합산 약 ${probabilityPercent(frictionProbability)}%로 나타나요. ${scene}`);
    }

    const monthTone = model.monthRelation?.tone || 'neutral';
    if (monthTone === 'clash' || monthTone === 'friction') {
      lines.push(getJijiRelationDescription(model.monthRelation, seed, 'month'));
    }

    const topPair = sortedProbabilityEntries(model.dominantPair)[0];
    if (topPair) {
      const [pair, probability] = topPair;
      const pairText = pickVariation(PAIR_CONFLICT_VARIATIONS[pair] || [ELEMENT_PAIR_CONFLICT[pair]], seed, `approx-pair-conflict:${pair}`);
      if (pairText) lines.push(`강한 오행 조합에서는 ${pair} 흐름이 약 ${probabilityPercent(probability)}%로 가장 많이 나타나요. ${pairText}`);
    }

    if (model.sharedGap >= 0.22) {
      const sharedMissing = statsA.missing.find(k => statsB.missing.includes(k));
      if (sharedMissing) lines.push(pickVariation(OHAENG_VARIATION_BANK[sharedMissing]?.sharedGap, seed, `approx-shared-gap:${sharedMissing}`) || ELEMENT_SHARED_GAP[sharedMissing]);
    }
    return uniqueText(lines).slice(0, 4);
  }

  function buildApproxRomanticScenarios(model, seed) {
    const scenes = [];
    const topRelations = sortedProbabilityEntries(model.relation).slice(0, 2);
    topRelations.forEach(([relation, probability], index) => {
      const scene = pickVariation(APPROX_RELATION_ROMANTIC_BANK[relation], seed, `approx-romantic:${relation}:${index}`);
      if (scene) scenes.push(`<b>${relation} 가능성 ${probabilityPercent(probability)}%</b><br>${scene}`);
    });

    const topDay = sortedProbabilityEntries(model.dayRelation)[0];
    if (topDay) {
      const [type, probability] = topDay;
      const scene = pickVariation(APPROX_DAY_RELATION_SCENE_BANK[type], seed, `approx-romantic-day:${type}`);
      if (scene) scenes.push(`<b>가까운 관계의 ${type} 흐름 ${probabilityPercent(probability)}%</b><br>${scene}`);
    }

    const topElement = sortedProbabilityEntries(model.combinedDominant)[0];
    if (topElement) {
      const [element, probability] = topElement;
      const scene = pickVariation(OHAENG_VARIATION_BANK[element]?.romantic, seed, `approx-romantic-element:${element}`);
      if (scene) scenes.push(`<b>${element} 기운이 두드러지는 조합 ${probabilityPercent(probability)}%</b><br>${scene}`);
    }
    return uniqueText(scenes).slice(0, 3);
  }

  function buildApproxActionTips(model, statsA, statsB, seed) {
    const tips = [];
    const topRelations = sortedProbabilityEntries(model.relation).slice(0, 2);
    topRelations.forEach(([relation], index) => {
      const tip = pickVariation(APPROX_RELATION_TIP_BANK[relation], seed, `approx-tip:${relation}:${index}`);
      if (tip) tips.push(tip);
    });

    const monthActions = (JIJI_RELATION_VARIATIONS[model.monthRelation?.type] || JIJI_RELATION_VARIATIONS.평)?.action || [];
    const monthTip = pickVariation(monthActions, seed, 'approx-tip-month');
    if (monthTip) tips.push(monthTip);

    const weakTargets = uniqueText([...(statsA.missing.length ? statsA.missing : statsA.weak), ...(statsB.missing.length ? statsB.missing : statsB.weak)]);
    const weakElement = pickVariation(weakTargets, seed, 'approx-tip-weak-element');
    if (weakElement) {
      const pool = OHAENG_VARIATION_BANK[weakElement]?.sharedGap || OHAENG_VARIATION_BANK[weakElement]?.weak || [];
      const weakTip = pickVariation(pool, seed, `approx-tip-weak:${weakElement}`);
      if (weakTip) tips.push(weakTip);
    }

    const frictionProbability = (model.dayRelation.충 || 0) + (model.dayRelation.형 || 0) + (model.dayRelation.해 || 0);
    if (frictionProbability >= 0.2) tips.push('일지 관계가 여러 갈래로 나뉘므로, 싸운 직후의 반응을 성격으로 단정하지 말고 각자 필요한 냉각 시간과 다시 이야기할 시각을 미리 정해두세요.');
    else tips.push('실제 일지 관계가 어느 흐름이든 적용할 수 있도록, 중요한 감정은 추측보다 짧은 확인 질문으로 맞춰보세요.');

    return uniqueText(tips).slice(0, 5);
  }

  function buildApproxCompatHtml(entryA, entryB, rawNameA, rawNameB, inputA, inputB) {
    ensureCompatDetailStyles();
    const nameA = escapeHtml(rawNameA);
    const nameB = escapeHtml(rawNameB);
    const countA = entryA.exact ? entryA.exact.ohaengCount : buildApproxCount(entryA.approx);
    const countB = entryB.exact ? entryB.exact.ohaengCount : buildApproxCount(entryB.approx);
    const statsA = analyzeOhaengCount(countA);
    const statsB = analyzeOhaengCount(countB);
    const monthA = getEntryMonthJiji(entryA);
    const monthB = getEntryMonthJiji(entryB);
    const monthBankA = getJijiPersonalBank(monthA);
    const monthBankB = getJijiPersonalBank(monthB);
    const approxSeed = `${getCountSignature(countA)}|${getCountSignature(countB)}|${monthA || '?'}|${monthB || '?'}|${inputA?.month || '?'}-${inputA?.day || '?'}|${inputB?.month || '?'}-${inputB?.day || '?'}|possibility`;
    const model = buildUnknownYearPossibilityModel(entryA, entryB, inputA, inputB);

    const traitA = pickVariation(monthBankA?.month, approxSeed, 'approx:month-a');
    const traitB = pickVariation(monthBankB?.month, approxSeed, 'approx:month-b');
    const supports = buildApproxSupportLines(model, statsA, statsB, nameA, nameB, approxSeed);
    const conflicts = buildApproxConflictLines(model, statsA, statsB, approxSeed);
    const romanticScenes = buildApproxRomanticScenarios(model, approxSeed);
    const tips = buildApproxActionTips(model, statsA, statsB, approxSeed);
    const relationTop = sortedProbabilityEntries(model.relation)[0] || ['중립', 0];
    const dayTop = sortedProbabilityEntries(model.dayRelation)[0] || ['평', 0];
    const candidateDescription = model.pairCount > 1
      ? `가능한 출생연도 조합 ${model.pairCount.toLocaleString()}가지를 비교했어요.`
      : '한 사람의 확정 사주와 다른 사람의 가능한 출생연도 후보를 비교했어요.';

    return `
      <section class="compat-detail-wrap">
        <div class="compat-detail-title">생년 미상 가능성 기반 추가 분석</div>
        <div class="compat-summary-card">
          <b>확정할 수 없는 부분을 비워두지 않고 여러 가능성으로 살펴봤어요.</b><br>
          ${candidateDescription} 가장 많이 나타난 일간 관계는 <b>${relationTop[0]} ${probabilityPercent(relationTop[1])}%</b>, 가까운 관계의 일지 흐름은 <b>${dayTop[0]} ${probabilityPercent(dayTop[1])}%</b>예요.
          이 비율은 실제 출생연도의 확률이 아니라, 최근 60개 연도를 동일하게 가정한 후보군 안에서 나타난 비중이에요.
          <div class="compat-chip-row" style="margin-top:10px;">${buildPossibilityChips(model)}</div>
        </div>

        <div class="compat-grid">
          <article class="compat-card">
            <h4>${nameA}님의 확인 가능한 관계 성향</h4>
            <div class="compat-chip-row">${monthA ? `<span class="compat-chip">월지 ${formatJiji(monthA)}</span>` : ''}<span class="compat-chip">강한 경향 ${formatOhaengList(statsA.dominant)}</span></div>
            <p>두드러지는 성향은 ${formatOhaengList(statsA.dominant)}, 상대적으로 덜 드러나는 성향은 ${formatOhaengList(statsA.weak)}이에요.</p>
            ${traitA ? `<p>월지에서는 ${traitA}이에요.</p>` : ''}
          </article>
          <article class="compat-card">
            <h4>${nameB}님의 확인 가능한 관계 성향</h4>
            <div class="compat-chip-row">${monthB ? `<span class="compat-chip">월지 ${formatJiji(monthB)}</span>` : ''}<span class="compat-chip">강한 경향 ${formatOhaengList(statsB.dominant)}</span></div>
            <p>두드러지는 성향은 ${formatOhaengList(statsB.dominant)}, 상대적으로 덜 드러나는 성향은 ${formatOhaengList(statsB.weak)}이에요.</p>
            ${traitB ? `<p>월지에서는 ${traitB}이에요.</p>` : ''}
          </article>
        </div>

        <div class="compat-card">
          <h4>월지로 확인되는 생활 궁합</h4>
          <div class="compat-chip-row"><span class="compat-chip">월지 ${model.monthRelation?.type || '평'}</span></div>
          <p>${getJijiRelationDescription(model.monthRelation, approxSeed, 'month')}</p>
        </div>

        <div class="compat-grid">
          <article class="compat-card">
            <h4>서로에게 힘이 되어줄 가능성이 큰 순간</h4>
            <ul class="compat-list">${supports.map(x => `<li>${x}</li>`).join('')}</ul>
          </article>
          <article class="compat-card">
            <h4>이럴 때 갈등이 생길 가능성이 있어요</h4>
            <ul class="compat-list">${conflicts.map(x => `<li>${x}</li>`).join('')}</ul>
          </article>
        </div>

        <div class="compat-card compat-stack-card compat-highlight-card">
          <h4>가까워지면 나타날 수 있는 관계 시나리오</h4>
          ${romanticScenes.map(scene => `<p>${scene}</p>`).join('')}
        </div>

        <div class="compat-card compat-stack-card compat-highlight-card">
          <h4>가능성이 달라도 공통으로 도움이 되는 방법</h4>
          <ol class="compat-list">${tips.map(x => `<li>${x}</li>`).join('')}</ol>
        </div>

        <div class="compat-muted">※ 생년 미상 분석은 입력된 월·일·시간에 최근 60개 출생연도를 대입한 가능성 비교예요. 실제 일간·일지·상생·상극을 확정하는 결과가 아니며, 비율이 높다고 반드시 그 관계에 해당한다는 뜻은 아니에요.</div>
      </section>
    `;
  }

  function relationExplainHtml(relationKey, nameA, nameB, mode, variationSeed) {
    const r = RELATION_EXPLAIN[relationKey];
    if (!r) return '';
    const selectedMode = mode === 'friend' ? 'friend' : 'lover';
    const bank = RELATION_VARIATION_BANK[relationKey] || {};
    const seed = `${variationSeed || ''}|${relationKey}|${selectedMode}`;
    const original = r[selectedMode] || [];
    const expanded = uniqueText([...(bank[selectedMode] || []), ...original]);
    const list = pickVariationMany(expanded, selectedMode === 'lover' ? 4 : 3, seed, 'relation:list');
    const li = arr => arr.map(x => `<li>${x}</li>`).join('');
    const namesLabel = (nameA && nameB) ? `${escapeHtml(nameA)} · ${escapeHtml(nameB)}` : '';
    const modeLabel = selectedMode === 'lover' ? '연인으로 보면 ❤️' : '친구로 보면 🤝';
    const displayTitle = RELATION_SUMMARY_TEXT[relationKey] || `${r.emoji} ${selectedMode === 'friend' ? (r.friendTitle || r.title) : r.title}`;
    const quotePool = selectedMode === 'lover' ? [...(bank.quotes || []), r.quote] : [...(bank.quotes || []), r.friendQuote];
    const quote = pickVariation(uniqueText(quotePool), seed, 'relation:quote') || '함께 있을 때 편안한 관계예요.';
    return `
      <div class="re-heading">${displayTitle}${namesLabel ? `<span class="re-names">${namesLabel}</span>` : ''}</div>
      <div class="re-lover-friend re-single-mode">
        <div class="re-block">
          <div class="re-label">${modeLabel}</div>
          <ul>${li(list)}</ul>
        </div>
      </div>
      <div class="re-quote">"${quote}"</div>
      ${r.caveat ? `<div class="re-block" style="margin-top:10px;">${r.caveat}</div>` : ''}
      <div class="re-caveat">${RELATION_GENERAL_CAVEAT}</div>
    `;
  }

  // 추천 색상 이름 -> 실제 표시용 hex (스와치 렌더링용)
  const COLOR_NAME_HEX = {
    '초록색': '#84ab78', '연두색': '#bcd89a', '청록색': '#7fbcb2',
    '세이지그린': '#9caf88', '올리브색': '#8d9464', '민트색': '#a8d5c2',
    '포레스트그린': '#4f7758', '피스타치오색': '#b7c98b', '이끼색': '#798b61',
    '에메랄드색': '#5a9b84', '카키색': '#8b8f62', '라임색': '#c4d66b',

    '빨간색': '#d98a7c', '주황색': '#eab08a', '핑크색': '#f0b8c4',
    '코랄색': '#e79b8d', '살구색': '#efbd9d', '로즈핑크': '#d994a8',
    '체리레드': '#c96f76', '버건디': '#8e4d5a', '주홍색': '#df765e',
    '와인색': '#7d4655', '복숭아색': '#f3b7a6', '자주색': '#a2678a',

    '갈색': '#b08b6e', '황토색': '#cbab7a', '베이지': '#e6dac0',
    '크림색': '#f0e5ca', '카멜색': '#c49a6c', '테라코타': '#c98267',
    '머스터드색': '#c7a34b', '모래색': '#d7c39d', '브라운': '#94735d',
    '아이보리': '#eee8d6', '오트밀색': '#d8cbb3', '웜그레이': '#aaa096',

    '흰색': '#f5f4f0', '금색': '#dcc48f', '실버': '#c2c2bd', '은색·그레이': '#c2c2bd',
    '샴페인골드': '#d8c3a5', '펄그레이': '#d5d6d3', '쿨그레이': '#aeb3b8',
    '라이트그레이': '#d8dadc', '스틸색': '#8f9aa3', '아이보리화이트': '#f2efe5',
    '백금색': '#d9d7d2', '차콜그레이': '#66686a', '크림화이트': '#f4efe4',

    '검은색': '#4a4a4a', '남색': '#7186a8', '파란색': '#7197bd', '짙은 파란색': '#82a0bd',
    '네이비': '#4f6281', '코발트블루': '#597db3', '인디고': '#59658d',
    '블루그레이': '#8799aa', '먹색': '#555b62', '청회색': '#788f9e',
    '군청색': '#526b91', '딥블루': '#536f95', '아쿠아블루': '#76aabb',
  };

  // ---------------------------------------------------------------
  // 셀렉트박스 채우기
  // ---------------------------------------------------------------
  function fillSelect(id, start, end, pad, suffix) {
    const el = document.getElementById(id);
    const frag = document.createDocumentFragment();
    for (let i = start; i <= end; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = (pad ? String(i).padStart(pad, '0') : i) + (suffix || '');
      frag.appendChild(opt);
    }
    el.appendChild(frag);
  }

  function initPersonInputs(prefix, defaultYear) {
    fillSelect(prefix + '-year', 1940, new Date().getFullYear(), null, '년');
    fillSelect(prefix + '-month', 1, 12, null, '월');
    fillSelect(prefix + '-day', 1, 31, null, '일');
    fillSelect(prefix + '-hour', 0, 23, 2, '시');
    fillSelect(prefix + '-minute', 0, 59, 2, '분');
    document.getElementById(prefix + '-year').value = defaultYear;
    document.getElementById(prefix + '-month').value = 1;
    document.getElementById(prefix + '-day').value = 1;
    document.getElementById(prefix + '-hour').value = 12;
    document.getElementById(prefix + '-minute').value = 0;

    const unknownCb = document.getElementById(prefix + '-unknown');
    unknownCb.addEventListener('change', () => {
      const hourSel = document.getElementById(prefix + '-hour');
      const minSel = document.getElementById(prefix + '-minute');
      if (unknownCb.checked) {
        hourSel.value = 12; minSel.value = 0;
        hourSel.disabled = true; minSel.disabled = true;
      } else {
        hourSel.disabled = false; minSel.disabled = false;
      }
    });

    // 연도 모름 체크박스: 연도 select를 숨기고 비활성화
    const yearUnknownCb = document.getElementById(prefix + '-year-unknown');
    const yearSel = document.getElementById(prefix + '-year');
    yearUnknownCb.addEventListener('change', () => {
      if (yearUnknownCb.checked) {
        yearSel.disabled = true;
        yearSel.style.opacity = '0.35';
      } else {
        yearSel.disabled = false;
        yearSel.style.opacity = '1';
      }
    });
  }

  initPersonInputs('a', 1994);
  initPersonInputs('b', 1995);

  // ---------------------------------------------------------------
  // 입력값 읽기 + 검증
  // ---------------------------------------------------------------
  function readPerson(prefix) {
    const nameInput = document.getElementById(prefix + '-name').value.trim();
    const defaultName = prefix === 'a' ? 'A' : 'B';
    const name = nameInput || defaultName;

    const yearUnknown = document.getElementById(prefix + '-year-unknown').checked;
    const month = parseInt(document.getElementById(prefix + '-month').value, 10);
    const day = parseInt(document.getElementById(prefix + '-day').value, 10);
    const hour = parseInt(document.getElementById(prefix + '-hour').value, 10);
    const minute = parseInt(document.getElementById(prefix + '-minute').value, 10);
    const hourUnknown = document.getElementById(prefix + '-unknown').checked;


    if (yearUnknown) {
      // 연도 없이도 실제 존재하는 월/일인지만 검증 (윤년 2/29는 통과시키되
      // 계산 시 통계 샘플에서 자연스럽게 처리됨)
      const leapCheckYear = 2024; // 2/29 검증용 임의 윤년
      const d = new Date(leapCheckYear, month - 1, day);
      if (d.getMonth() !== month - 1 || d.getDate() !== day) {
        return { error: `존재하지 않는 날짜예요 (${month}월 ${day}일)`, name };
      }
      return { yearUnknown: true, month, day, hour, minute, hourUnknown, name };
    }

    const year = parseInt(document.getElementById(prefix + '-year').value, 10);
    const d = new Date(year, month - 1, day);
    if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
      return { error: `존재하지 않는 날짜예요 (${year}년 ${month}월 ${day}일)`, name };
    }
    return { yearUnknown: false, year, month, day, hour, minute, hourUnknown, name };
  }

  // ---------------------------------------------------------------
  // 계산 실행
  // ---------------------------------------------------------------


  function ensureRelationshipModeSelector(calcButton) {
    if (!calcButton || document.getElementById('relationshipModeSelector')) return;
    const style = document.createElement('style');
    style.id = 'relationship-mode-styles';
    style.textContent = `
      .relationship-mode-wrap{height:100%;margin:0;padding:18px 20px;border:1px solid var(--line);border-radius:16px;background:var(--bg-panel);box-shadow:0 1px 2px rgba(28,29,33,0.03),0 8px 24px rgba(28,29,33,0.03);display:flex;flex-direction:column;justify-content:center;text-align:left}
      .relationship-mode-title{font-family:'Noto Serif KR',serif;font-weight:500;font-size:14px;color:var(--ink);margin-bottom:12px}
      .relationship-mode-options{display:flex;flex-wrap:wrap;gap:18px}
      .relationship-mode-option{position:relative;cursor:pointer;display:flex;align-items:center;gap:8px}
      .relationship-mode-option input{position:absolute;opacity:0;pointer-events:none}
      .relationship-mode-option .cb-box{
        width:16px;height:16px;flex:0 0 auto;border-radius:5px;
        border:1.5px solid var(--ink-faint);background:#fff;
        display:flex;align-items:center;justify-content:center;
        transition:border-color .18s ease,background .18s ease;
      }
      .relationship-mode-option .cb-box svg{width:10px;height:10px;opacity:0;transform:scale(.6);transition:opacity .15s ease,transform .15s ease;}
      .relationship-mode-option input:checked + .cb-box{border-color:var(--accent-2);background:var(--accent-grad);}
      .relationship-mode-option input:checked + .cb-box svg{opacity:1;transform:scale(1);}
      .relationship-mode-option .cb-label{font-size:14px;color:var(--ink-dim);transition:color .18s ease;}
      .relationship-mode-option input:checked ~ .cb-label{color:var(--ink);font-weight:600;}
      .relationship-mode-note{margin-top:12px;font-size:11.5px;line-height:1.6;color:var(--ink-faint)}
      @media(max-width:620px){.relationship-mode-wrap{padding:14px 12px}.relationship-mode-title{font-size:12.5px;margin-bottom:9px}.relationship-mode-options{gap:10px}.relationship-mode-option{gap:6px}.relationship-mode-option .cb-label{font-size:12px}.relationship-mode-note{margin-top:9px;font-size:10px;line-height:1.45}}
      .re-single-mode{grid-template-columns:1fr!important}
      #result.friend-result-mode .lover-only-block{display:none!important}
    `;
    document.head.appendChild(style);

    const wrap = document.createElement('div');
    wrap.id = 'relationshipModeSelector';
    wrap.className = 'relationship-mode-wrap';
    const checkIcon = '<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 8.2L6.2 11.4L13 4.4" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    wrap.innerHTML = `
      <div class="relationship-mode-title">두 사람은 어떤 관계인가요?</div>
      <div class="relationship-mode-options">
        <label class="relationship-mode-option">
          <input type="radio" name="relationshipMode" value="lover" checked>
          <span class="cb-box">${checkIcon}</span>
          <span class="cb-label">연인</span>
        </label>
        <label class="relationship-mode-option">
          <input type="radio" name="relationshipMode" value="friend">
          <span class="cb-box">${checkIcon}</span>
          <span class="cb-label">친구</span>
        </label>
      </div>
      <div class="relationship-mode-note">친구를 선택하면 친구 관계 해설만 보여드려요. 연애·데이트 관련 추가 해설은 연인 선택에서만 확인할 수 있어요.</div>
    `;
    const relationshipSlot = document.getElementById('relationshipModeSlot');
    if (relationshipSlot) relationshipSlot.appendChild(wrap);
    else calcButton.parentNode.insertBefore(wrap, calcButton);

    wrap.querySelectorAll('input[name="relationshipMode"]').forEach(input => {
      input.addEventListener('change', event => {
        relationshipMode = event.target.value === 'friend' ? 'friend' : 'lover';
        if (lastRenderPayload) {
          renderResult(...lastRenderPayload);
        }
      });
    });
  }

  function markLoverOnlyBlocks() {
    const result = document.getElementById('result');
    if (!result) return;
    result.classList.toggle('friend-result-mode', relationshipMode === 'friend');

    const recHero = document.getElementById('recHero');
    const relationBody = document.getElementById('relationExplainBody');
    const recParent = recHero?.parentElement;
    if (recParent && recParent.id !== 'result' && !(relationBody && recParent.contains(relationBody))) {
      recParent.classList.add('lover-only-block');
    }

    ['deepCompat', 'recHero', 'recTime', 'recTimeDetail', 'recColors', 'recFlowers', 'recPlaces', 'supportNote', 'recCoupleExtraGrid', 'recDateIdeasBlock', 'recTouchBlock', 'flowerMeaningDetails']
      .forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const block = id === 'deepCompat' || id === 'recHero' || id === 'supportNote' || id === 'recCoupleExtraGrid' || id === 'recDateIdeasBlock' || id === 'recTouchBlock' || id === 'flowerMeaningDetails'
          ? el
          : (el.parentElement || el);
        block.classList.add('lover-only-block');
      });
  }

  const calcBtn = document.getElementById('calcBtn');
  const errorMsg = document.getElementById('errorMsg');
  const loading = document.getElementById('loading');
  const resultEl = document.getElementById('result');

  // 모바일은 실제 화면 너비로 표시해 가독성을 유지합니다.
  // 저장 이미지는 아래 저장 함수에서 항상 PC 기준 992px로 별도 렌더링합니다.
  const RESULT_CAPTURE_WIDTH = 992;
  let resultScaleFrame = 0;

  function usesMobileResultLayout() {
    return isMobileOrTabletDevice() || (window.innerWidth || 0) <= 900;
  }

  function updateResultDesktopScale() {
    if (!resultEl) return;
    const mobileLayout = usesMobileResultLayout();
    resultEl.dataset.resultLayoutWidth = String(RESULT_CAPTURE_WIDTH);
    resultEl.classList.toggle('result-mobile-layout', mobileLayout);
    resultEl.classList.remove('result-desktop-layout');
    resultEl.style.width = '';
    resultEl.style.maxWidth = '';
    resultEl.style.zoom = '';
    resultEl.style.transform = '';
  }

  function scheduleResultScaleUpdate() {
    cancelAnimationFrame(resultScaleFrame);
    resultScaleFrame = requestAnimationFrame(() => {
      updateResultDesktopScale();
      resultScaleFrame = 0;
    });
  }

  window.addEventListener('resize', scheduleResultScaleUpdate, { passive: true });
  window.addEventListener('orientationchange', scheduleResultScaleUpdate, { passive: true });

  ensureRelationshipModeSelector(calcBtn);

  calcBtn.addEventListener('click', () => {
    errorMsg.textContent = '';
    const a = readPerson('a');
    const b = readPerson('b');

    if (a.error) { errorMsg.textContent = `${a.name}: ` + a.error; return; }
    if (b.error) { errorMsg.textContent = `${b.name}: ` + b.error; return; }

    calcBtn.disabled = true;
    resultEl.style.display = 'none';
    loading.style.display = 'block';

    // 짧은 지연으로 계산 연출 (실제로는 즉시 계산되지만 체감 리듬을 위함)
    setTimeout(() => {
      try {
        const entryA = a.yearUnknown
          ? { approx: calculateSajuApprox(a.month, a.day, a.hourUnknown ? null : a.hour, a.minute) }
          : { exact: calculateSaju(a.year, a.month, a.day, a.hour, a.minute) };
        const entryB = b.yearUnknown
          ? { approx: calculateSajuApprox(b.month, b.day, b.hourUnknown ? null : b.hour, b.minute) }
          : { exact: calculateSaju(b.year, b.month, b.day, b.hour, b.minute) };

        const bothExact = !a.yearUnknown && !b.yearUnknown;
        const rec = bothExact
          ? generateCoupleRecommendation(entryA.exact, entryB.exact)
          : generateCoupleRecommendationApprox(entryA, entryB);

        renderResult(entryA, entryB, rec, a, b);
        loading.style.display = 'none';
        resultEl.style.display = 'block';
        updateResultDesktopScale();
        requestAnimationFrame(() => resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      } catch (e) {
        loading.style.display = 'none';
        errorMsg.textContent = '계산 중 오류가 생겼어요: ' + e.message;
        console.error(e);
      } finally {
        calcBtn.disabled = false;
      }
    }, 500);
  });

  // ---------------------------------------------------------------
  // 결과 렌더링 - 정확 모드 (연도 있음)
  // ---------------------------------------------------------------
  function renderPillarCardExact(prefix, saju, label) {
    document.getElementById('pillarTitle' + prefix).textContent = label;
    const charsEl = document.getElementById('pillarChars' + prefix);
    charsEl.innerHTML = '';
    const pillars = [
      { p: saju.year, lbl: '연주' },
      { p: saju.month, lbl: '월주' },
      { p: saju.day, lbl: '일주' },
      { p: saju.hour, lbl: '시주' },
    ];
    pillars.forEach(({ p, lbl }) => {
      const cheonganDiv = document.createElement('div');
      cheonganDiv.className = 'pillar-char o-' + p.ohaengCheongan;
      cheonganDiv.innerHTML = `<span class="hanja">${p.cheonganHanja}</span><span class="lbl">${lbl}(간)</span>`;
      charsEl.appendChild(cheonganDiv);
    });
    pillars.forEach(({ p, lbl }) => {
      const jijiDiv = document.createElement('div');
      jijiDiv.className = 'pillar-char o-' + p.ohaengJiji;
      jijiDiv.innerHTML = `<span class="hanja">${p.jijiHanja}</span><span class="lbl">${lbl}(지)</span>`;
      charsEl.appendChild(jijiDiv);
    });

    renderOhaengBar(prefix, saju.ohaengCount);
  }

  // ---------------------------------------------------------------
  // 결과 렌더링 - 근사 모드 (연도 모름)
  // ---------------------------------------------------------------
  function renderPillarCardApprox(prefix, approx, label) {
    document.getElementById('pillarTitle' + prefix).textContent = label;
    const charsEl = document.getElementById('pillarChars' + prefix);
    charsEl.innerHTML = '';

    // 월지: 절기 기준으로 확정 가능
    const monthDiv = document.createElement('div');
    monthDiv.className = 'pillar-char o-' + approx.month.ohaeng;
    monthDiv.innerHTML = `<span class="hanja">${approx.month.jijiHanja}</span><span class="lbl">월지(${approx.month.jieqiName})</span>`;
    charsEl.appendChild(monthDiv);

    // 일간: 확정 불가 -> 최빈 오행 + 확률 표기
    const likely = approx.day.likelyOhaeng[0];
    const dayDiv = document.createElement('div');
    dayDiv.className = 'pillar-char o-' + likely;
    dayDiv.innerHTML = `<span class="hanja" style="font-size:15px;">${likely}(추정)</span><span class="lbl">일간 · ${approx.day.percent[likely]}%</span>`;
    charsEl.appendChild(dayDiv);

    // 시지: 시각이 있으면 확정 가능
    if (approx.hour) {
      const hourDiv = document.createElement('div');
      hourDiv.className = 'pillar-char o-' + approx.hour.ohaeng;
      hourDiv.innerHTML = `<span class="hanja">${approx.hour.jijiHanja}</span><span class="lbl">시지</span>`;
      charsEl.appendChild(hourDiv);
    }

    // 오행 합산치(월지 1 + 일간 최빈치 1 + 시지 1)로 바 표시
    const count = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
    count[approx.month.ohaeng] += 1;
    count[likely] += 1;
    if (approx.hour) count[approx.hour.ohaeng] += 1;
    renderOhaengBar(prefix, count);
  }

  function renderOhaengBar(prefix, ohaengCount) {
    const barEl = document.getElementById('ohaengBar' + prefix);
    barEl.innerHTML = '';
    const total = Object.values(ohaengCount).reduce((s, v) => s + v, 0) || 1;
    ['목', '화', '토', '금', '수'].forEach(k => {
      const v = ohaengCount[k];
      if (v === 0) return;
      const seg = document.createElement('div');
      seg.style.width = (v / total * 100) + '%';
      seg.style.background = OHAENG_COLOR[k];
      seg.title = `${k}: ${v}`;
      barEl.appendChild(seg);
    });
  }

  function renderWheel(countA, countB) {
    const svg = document.getElementById('wheelSvg');
    const cx = 200, cy = 200;
    const order = ['목', '화', '토', '금', '수'];
    const total = {};
    order.forEach(k => total[k] = countA[k] + countB[k]);
    const maxVal = Math.max(...Object.values(total), 1);

    let svgContent = '';
    const gridColor = '#e4e1d8';
    const labelColor = '#6b6355';

    // 배경 원(가이드라인)
    [0.33, 0.66, 1].forEach(r => {
      svgContent += `<circle cx="${cx}" cy="${cy}" r="${140 * r}" fill="none" stroke="${gridColor}" stroke-width="1"/>`;
    });

    // 오각형 축 + 라벨
    const points = [];
    order.forEach((k, i) => {
      const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      const val = total[k];
      const r = 20 + (val / maxVal) * 120;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      points.push(`${x},${y}`);

      const axisX = cx + 140 * Math.cos(angle);
      const axisY = cy + 140 * Math.sin(angle);
      svgContent += `<line x1="${cx}" y1="${cy}" x2="${axisX}" y2="${axisY}" stroke="${gridColor}" stroke-width="1"/>`;

      const labelX = cx + 168 * Math.cos(angle);
      const labelY = cy + 168 * Math.sin(angle);
      svgContent += `<text x="${labelX}" y="${labelY}" text-anchor="middle" dominant-baseline="middle" font-family="Noto Serif KR, serif" font-size="20" fill="${OHAENG_COLOR[k]}" font-weight="700">${k}</text>`;
      svgContent += `<text x="${labelX}" y="${labelY + 18}" text-anchor="middle" font-family="Noto Sans KR, sans-serif" font-size="11" fill="${labelColor}">${val}</text>`;
    });

    svgContent += `<polygon points="${points.join(' ')}" fill="rgba(148,151,163,0.14)" stroke="#8a8d99" stroke-width="2"/>`;

    order.forEach((k, i) => {
      const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      const val = total[k];
      const r = 20 + (val / maxVal) * 120;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      svgContent += `<circle cx="${x}" cy="${y}" r="4.5" fill="${OHAENG_COLOR[k]}"/>`;
    });

    svg.innerHTML = svgContent;
  }

  function colorSwatchesHtml(colorNames) {
    return colorNames.map(c => {
      const hex = COLOR_NAME_HEX[c] || '#cccccc';
      return `<span class="color-swatch"><span class="dot" style="background:${hex};"></span>${c}</span>`;
    }).join('');
  }


  function stableTextHash(value) {
    let hash = 2166136261;
    const text = String(value || '');
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }



  // -----------------------------------------------------------------
  // 개인화 문장 배리에이션 엔진
  // 같은 오행이라도 일간·오행 분포·결핍·궁합 관계·지지 관계가 다르면
  // 서로 다른 후보군을 고르되, 같은 입력에서는 결과가 바뀌지 않도록 고정 시드를 사용합니다.
  // -----------------------------------------------------------------
  function pickVariation(pool, seed, salt) {
    if (!Array.isArray(pool)) return pool || '';
    if (!pool.length) return '';
    return pool[stableTextHash(`${seed || ''}|${salt || ''}`) % pool.length];
  }

  function pickVariationMany(pool, count, seed, salt) {
    if (!Array.isArray(pool) || !pool.length || count <= 0) return [];
    return pool
      .map((value, index) => ({ value, score: stableTextHash(`${seed || ''}|${salt || ''}|${index}|${typeof value === 'string' ? value : ''}`) }))
      .sort((a, b) => a.score - b.score)
      .slice(0, Math.min(count, pool.length))
      .map(item => item.value);
  }

  function uniqueText(items) {
    return [...new Set((items || []).filter(Boolean).map(value => String(value).trim()).filter(Boolean))];
  }

  function getCountSignature(count) {
    return OHAENG_ORDER.map(k => `${k}${Number(count?.[k] || 0)}`).join('');
  }

  function getSajuSignature(saju) {
    if (!saju) return 'no-saju';
    const pillars = ['year', 'month', 'day', 'hour'].map(key => {
      const p = saju?.[key] || {};
      return [p.cheonganHanja, p.jijiHanja, p.ohaengCheongan, p.ohaengJiji].filter(Boolean).join('');
    }).join('|');
    return `${pillars}|${getCountSignature(saju?.ohaengCount)}`;
  }

  function getEntryVariationSignature(entry, input) {
    if (entry?.exact) return `exact:${getSajuSignature(entry.exact)}`;
    const approx = entry?.approx || {};
    return [
      'approx', input?.month, input?.day, input?.hourUnknown ? 'h?' : input?.hour,
      approx?.month?.ohaeng, approx?.day?.likelyOhaeng?.join(''), approx?.hour?.ohaeng
    ].join(':');
  }

  function getCompatSignature(compat) {
    return [
      compat?.relation || '중립',
      compat?.dayJijiRelation?.type || '평', compat?.dayJijiRelation?.tone || 'neutral',
      compat?.yearJijiRelation?.type || '평', compat?.yearJijiRelation?.tone || 'neutral',
      (compat?.complement?.aFillsB || []).join(''), (compat?.complement?.bFillsA || []).join(''),
      compat?.minOhaeng || '', compat?.maxOhaeng || ''
    ].join('|');
  }

  function buildRenderVariationSeed(entryA, entryB, rec, inputA, inputB) {
    const people = [getEntryVariationSignature(entryA, inputA), getEntryVariationSignature(entryB, inputB)].sort();
    return `${people.join('||')}|${getCompatSignature(rec?.compat)}|${rec?.primaryOhaeng || ''}|${relationshipMode}`;
  }



  // -----------------------------------------------------------------
  // 월지·일지 기반 개인화 엔진
  // 월지는 일상·사회생활에서 관계를 운영하는 리듬, 일지는 가까운 관계에서
  // 감정과 애정을 주고받는 반응으로 나누어 문장을 선택합니다.
  // -----------------------------------------------------------------
  const JIJI_KOREAN = {
    子: '자', 丑: '축', 寅: '인', 卯: '묘', 辰: '진', 巳: '사',
    午: '오', 未: '미', 申: '신', 酉: '유', 戌: '술', 亥: '해',
  };
  const JIJI_ELEMENT = {
    子: '수', 丑: '토', 寅: '목', 卯: '목', 辰: '토', 巳: '화',
    午: '화', 未: '토', 申: '금', 酉: '금', 戌: '토', 亥: '수',
  };
  const JIJI_ALIAS = {
    자: '子', 축: '丑', 인: '寅', 묘: '卯', 진: '辰', 사: '巳',
    오: '午', 미: '未', 신: '申', 유: '酉', 술: '戌', 해: '亥',
  };

  function normalizeJiji(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    if (JIJI_KOREAN[raw]) return raw;
    if (JIJI_ALIAS[raw]) return JIJI_ALIAS[raw];
    const hanja = Object.keys(JIJI_KOREAN).find(k => raw.includes(k));
    if (hanja) return hanja;
    const korean = Object.keys(JIJI_ALIAS).find(k => raw.includes(k));
    return korean ? JIJI_ALIAS[korean] : null;
  }

  function getPillarJiji(saju, pillar) {
    const p = saju?.[pillar] || {};
    return normalizeJiji(p.jijiHanja || p.jiji || p.branchHanja || p.branch);
  }

  function getEntryMonthJiji(entry) {
    return getPillarJiji(entry?.exact, 'month') || normalizeJiji(entry?.approx?.month?.jijiHanja || entry?.approx?.month?.jiji);
  }

  function getEntryDayJiji(entry) {
    return getPillarJiji(entry?.exact, 'day') || normalizeJiji(entry?.approx?.day?.jijiHanja || entry?.approx?.day?.jiji);
  }

  function formatJiji(value) {
    const jiji = normalizeJiji(value);
    return jiji ? `${JIJI_KOREAN[jiji]}(${jiji})` : '확인 어려움';
  }

  const JIJI_YUKHAP = [['子','丑'],['寅','亥'],['卯','戌'],['辰','酉'],['巳','申'],['午','未']];
  const JIJI_CHUNG = [['子','午'],['丑','未'],['寅','申'],['卯','酉'],['辰','戌'],['巳','亥']];
  const JIJI_HAE = [['子','未'],['丑','午'],['寅','巳'],['卯','辰'],['申','亥'],['酉','戌']];
  const JIJI_HYEONG = [['子','卯'],['寅','巳'],['巳','申'],['寅','申'],['丑','戌'],['戌','未'],['丑','未']];
  const JIJI_SELF_HYEONG = new Set(['辰','午','酉','亥']);
  const JIJI_SAMHAP = [['申','子','辰'],['亥','卯','未'],['寅','午','戌'],['巳','酉','丑']];

  function pairIncludes(collection, a, b) {
    return collection.some(pair => pair.includes(a) && pair.includes(b));
  }

  function getLocalJijiRelation(aValue, bValue) {
    const a = normalizeJiji(aValue);
    const b = normalizeJiji(bValue);
    if (!a || !b) return { type: '평', tone: 'neutral', a, b };
    if (a === b) return { type: '동일', tone: 'neutral', a, b };
    if (pairIncludes(JIJI_YUKHAP, a, b)) return { type: '육합', tone: 'good', a, b };
    if (pairIncludes(JIJI_CHUNG, a, b)) return { type: '충', tone: 'clash', a, b };
    if (pairIncludes(JIJI_HYEONG, a, b)) return { type: '형', tone: 'friction', a, b };
    if (pairIncludes(JIJI_HAE, a, b)) return { type: '해', tone: 'friction', a, b };
    if (JIJI_SAMHAP.some(group => group.includes(a) && group.includes(b))) return { type: '삼합', tone: 'good', a, b };
    return { type: '평', tone: 'neutral', a, b };
  }

  function getProfileJijiContext(profileA, profileB, compat) {
    const month = getLocalJijiRelation(profileA?.monthJiji, profileB?.monthJiji);
    const localDay = getLocalJijiRelation(profileA?.dayJiji, profileB?.dayJiji);
    const day = compat?.dayJijiRelation
      ? { ...localDay, ...compat.dayJijiRelation, a: localDay.a, b: localDay.b }
      : localDay;
    return { month, day };
  }

  const JIJI_RELATION_VARIATIONS = {
    육합: {
      general: ['서로 다른 방식이 자연스럽게 맞물려 큰 설명 없이도 역할을 나누기 쉬워요.', '한쪽이 먼저 움직이면 다른 쪽이 부담 없이 받아주는 흐름이 생기기 쉬워요.', '차이가 있어도 대립보다 보완으로 이어져 함께 있을 때 안정감을 느끼기 쉬워요.'],
      month: ['월지 육합이라 일정·생활 습관·바깥 활동에서 손발을 맞추기 쉬워요.', '일상을 운영하는 리듬이 자연스럽게 이어져 여행이나 모임을 준비할 때 부담이 적어요.', '사회생활과 주말 계획에서 서로의 방식을 받아들이는 힘이 좋은 편이에요.'],
      day: ['일지 육합이라 가까운 관계에서 긴장이 빨리 풀리고 애정 표현을 편하게 받아들이기 쉬워요.', '둘만 있을 때 정서적인 안전감이 생겨 속마음을 자연스럽게 꺼내기 쉬워요.', '연인 사이의 거리와 반응이 부드럽게 맞아 일상적인 스킨십과 대화가 편안한 편이에요.'],
      action: ['자연스럽게 맞는다는 이유로 역할이 한쪽에 고정되지 않도록 가끔 준비 담당을 바꿔보세요.', '잘 맞는 부분을 당연하게 넘기지 말고 상대가 해준 일을 구체적으로 고마워해주세요.'],
    },
    삼합: {
      general: ['공통 목표가 생기면 각자의 장점이 한 방향으로 모이기 쉬워요.', '관심사와 추진 방향이 연결될 때 관계 에너지가 크게 살아나요.', '함께할 프로젝트나 취미가 있을수록 관계의 강점이 분명해져요.'],
      month: ['월지 삼합 흐름이라 여행·공부·운동처럼 함께 움직일 목표가 있을 때 생활 호흡이 좋아져요.', '바깥 활동의 방향이 맞아 공동 일정이나 장기 계획을 만들 때 추진력이 생겨요.', '서로 다른 일상을 하나의 목표로 묶을 때 관계 만족도가 높아지는 편이에요.'],
      day: ['일지 삼합 흐름이라 감정적인 친밀감이 공통 경험을 통해 빠르게 깊어져요.', '둘만의 취미와 추억이 늘어날수록 애정 표현도 자연스럽게 풍부해져요.', '같은 방향을 바라볼 때 가까운 관계의 안정감과 설렘이 함께 커져요.'],
      action: ['공동 목표가 경쟁으로 바뀌지 않도록 각자의 속도와 성취를 따로 존중해주세요.', '함께하는 일만 늘리지 말고 각자 쉬는 시간도 일정에 남겨두세요.'],
    },
    충: {
      general: ['반응 속도와 익숙한 방식이 정반대로 느껴져 강한 끌림과 긴장이 함께 생길 수 있어요.', '같은 상황에서도 서로 다른 결론을 내리기 쉬워 조율 과정이 관계의 핵심이 돼요.', '차이가 선명해 상대에게 없는 매력을 느끼지만 가까워질수록 규칙이 필요해요.'],
      month: ['월지 충이라 주말 사용·약속 변경·사회생활의 비중처럼 생활 리듬에서 부딪힐 수 있어요.', '바깥 활동과 일정 운영 방식이 반대로 느껴져 미리 계획할 범위와 즉흥적으로 바꿀 범위를 나눠야 해요.', '가족·친구 모임과 개인 시간의 배분에서 차이가 커질 수 있어 사전 합의가 중요해요.'],
      day: ['일지 충이라 좋아하는 마음과 별개로 가까운 순간의 반응 속도가 크게 다를 수 있어요.', '한 사람은 바로 확인하고 다른 사람은 거리를 두고 정리하려 해 다툰 뒤의 규칙이 특히 중요해요.', '애정과 긴장이 함께 크게 움직일 수 있어 감정이 높을 때 결론을 서두르지 않는 편이 좋아요.'],
      action: ['감정이 높아지면 20~30분 쉬고 다시 이야기할 정확한 시각을 정해주세요.', '누가 옳은지보다 각자 반드시 지킬 기준과 양보 가능한 부분을 하나씩 말해보세요.'],
    },
    형: {
      general: ['겉으로 큰 충돌은 없어도 비슷한 문제를 반복 지적하며 신경전이 쌓일 수 있어요.', '상대를 고치려는 말이 늘면 가까운 만큼 피로도 커질 수 있어요.', '사소한 불편이 반복되면서 관계 전체에 대한 불만으로 번지기 쉬워요.'],
      month: ['월지 형이라 일정·돈·역할처럼 반복되는 생활 문제에서 잔소리와 방어가 생기기 쉬워요.', '일상 운영 방식의 작은 차이가 누적될 수 있어 담당과 기준을 정기적으로 다시 맞춰야 해요.', '바깥에서는 무난해 보여도 준비 과정과 시간 관리에서 은근한 긴장이 쌓일 수 있어요.'],
      day: ['일지 형이라 가까워질수록 말투와 사소한 습관을 서로 예민하게 볼 수 있어요.', '애정은 있어도 반복되는 지적 때문에 편안함이 줄 수 있어 잘한 점을 함께 표현해야 해요.', '같은 갈등을 되풀이할 수 있어 그날 다룰 행동 하나만 정해 말하는 편이 좋아요.'],
      action: ['과거 사례를 모아 말하지 말고 오늘 불편했던 행동 하나와 원하는 변화 하나만 이야기하세요.', '지적 한 번마다 상대가 잘하고 있는 점도 구체적으로 한 번 표현해보세요.'],
    },
    해: {
      general: ['큰 싸움보다 기대와 실제 행동이 조금씩 어긋나는 장면이 반복될 수 있어요.', '선의로 한 행동도 상대에게는 다른 의미로 전달돼 서운함이 남기 쉬워요.', '겉으로는 평온하지만 확인하지 않은 추측이 쌓이면 거리감이 생길 수 있어요.'],
      month: ['월지 해라 약속 시간·연락 방식·모임 참여처럼 사소한 생활 선택이 자꾸 엇갈릴 수 있어요.', '서로 배려한다고 한 선택이 상대의 기대와 다를 수 있어 일정과 의도를 짧게 확인하는 습관이 필요해요.', '일상에서는 큰 문제보다 작은 변경과 전달 누락이 피로를 만들기 쉬워요.'],
      day: ['일지 해라 가까운 사이에서 말하지 않은 기대가 어긋나 조용한 서운함이 남기 쉬워요.', '상대가 알아줄 것이라 기다리기보다 원하는 애정 표현과 위로 방식을 직접 알려주는 편이 좋아요.', '큰 충돌은 적어도 감정이 미묘하게 빗나갈 수 있어 짐작보다 확인이 중요해요.'],
      action: ['의도를 추측하지 말고 “나는 이렇게 이해했는데 맞아?”라고 짧게 확인해보세요.', '약속 변경이나 답장이 늦어질 때 이유와 새 시간을 함께 알려주세요.'],
    },
    동일: {
      general: ['익숙함이 빨리 생기고 서로의 반응을 쉽게 짐작하지만 같은 약점도 겹칠 수 있어요.', '생활 감각이 닮아 편안하지만 상대도 자신과 같을 것이라 단정하기 쉬워요.', '설명이 짧아도 통하는 대신 둘 다 미루거나 고집을 부리는 장면이 함께 커질 수 있어요.'],
      month: ['월지가 같아 생활 리듬과 익숙한 방식이 비슷하지만 둘 다 놓치는 역할도 겹칠 수 있어요.', '주말과 일상을 보내는 취향은 잘 맞아도 준비와 마무리를 서로 미룰 수 있어요.', '바깥 활동의 속도가 비슷해 편하지만 변화가 부족하면 관계가 정체될 수 있어요.'],
      day: ['일지가 같아 가까운 관계에서 친밀감이 빠르지만 서운함을 다루는 방식도 똑같이 겹칠 수 있어요.', '애정 표현의 취향은 비슷해도 상대 마음을 다 안다고 생각하지 않는 것이 중요해요.', '둘만의 분위기는 편하지만 같은 순간에 침묵하거나 고집을 부릴 가능성이 있어요.'],
      action: ['둘 다 어려워하는 일을 먼저 찾고 준비·사과·연락 시작을 번갈아 맡아보세요.', '상대도 같을 것이라 넘기지 말고 원하는 속도와 결론을 각각 확인해주세요.'],
    },
    평: {
      general: ['강한 합이나 충보다 실제 생활 습관과 대화 방식이 관계의 색을 더 크게 만들어요.', '타고난 상호작용이 한쪽으로 기울지 않아 공통 경험을 쌓는 방식이 중요해요.', '처음부터 역할이 정해지기보다 함께 지내며 둘만의 리듬을 만들어가는 관계예요.'],
      month: ['월지 관계가 무난해 일정과 생활 방식은 실제 합의에 따라 충분히 맞춰갈 수 있어요.', '바깥 활동에서는 강한 충돌보다 누가 먼저 계획하고 준비하는지가 더 중요해요.', '생활 리듬의 차이가 결정적이지 않아 정기적인 약속을 만들수록 호흡이 안정돼요.'],
      day: ['일지 관계가 무난해 애정의 깊이는 반복되는 대화와 신뢰를 통해 천천히 커져요.', '가까운 관계에서는 강한 끌림보다 약속한 순간에 성실하게 반응하는 태도가 중요해요.', '특별한 합충이 적어 서로가 원하는 애정 표현을 직접 배우며 맞춰가는 편이에요.'],
      action: ['정기적으로 함께할 취미나 작은 루틴을 하나 만들어보세요.', '누가 먼저 연락하고 약속을 잡을지 번갈아 맡아 관계가 멈추지 않게 해주세요.'],
    },
  };

  function getJijiRelationDescription(relInfo, seed, context) {
    const type = relInfo?.type || '평';
    const bank = JIJI_RELATION_VARIATIONS[type] || JIJI_RELATION_VARIATIONS.평;
    const pool = bank?.[context] || bank.general;
    return pickVariation(pool, seed, `jiji-desc:${context || 'general'}:${type}`) || JIJI_RELATION_DESC[type] || JIJI_RELATION_DESC.평;
  }

  const JIJI_PERSONAL_BANK = {
    子: {
      month: ['사람과 상황을 먼저 관찰한 뒤 움직여 일상에서 속도 조절을 중요하게 여기는 편', '정보와 분위기를 충분히 읽은 뒤 약속과 계획을 정하려는 편', '혼자 정리할 시간과 유연한 일정이 있어야 대외적인 관계도 편안해지는 편'],
      day: ['가까운 사이에서는 조용한 대화와 정서적인 안전감이 있어야 마음을 깊이 여는 편', '애정을 크게 드러내기보다 상대의 말과 분위기를 오래 기억하며 마음을 보여주는 편', '붙어 있는 시간보다 서로의 여유를 존중한 뒤 깊게 연결되는 방식을 선호하는 편'],
      friction: ['생각이 많아 답을 미루거나 마음을 숨겨 상대가 거리감을 느낄 수 있어요.', '상대가 알아차리길 기다리다가 서운함이 길어질 수 있어요.', '갈등이 생기면 조용히 물러나지만 속으로는 여러 가능성을 계속 생각하는 편이에요.'],
      repair: ['생각할 시간이 필요하다고 말하고 다시 이야기할 시각을 함께 정해보세요.', '현재 느끼는 감정을 완벽히 정리하지 못해도 한 문장으로 먼저 알려주세요.', '상대의 마음을 읽는 것만큼 자신의 필요도 직접 말해보세요.'],
      romantic: ['밤 산책이나 조용한 카페에서 속이야기를 오래 나눌수록 애정이 깊어져요.', '말이 많지 않아도 손을 잡고 같은 풍경을 보는 시간이 친밀감을 키워줘요.', '각자의 시간을 보낸 뒤 다시 만났을 때 편안하게 이어지는 연애가 잘 맞아요.'],
      keyword: ['깊은 대화', '여유', '조용한 신뢰'], season: '한겨울', seasonDetail: ['고요하게 마음을 정리하는 겨울밤', '차분한 대화가 깊어지는 한겨울', '따뜻한 실내에서 가까워지는 계절'], timeRange: '오후 7시~밤 11시', timeDetail: ['사람이 줄어드는 저녁에 조용히 걷거나 긴 대화를 나눠보세요.', '서두르지 않아도 되는 밤 시간에 카페와 산책을 이어보세요.'],
      places: ['강변 산책길','조용한 북카페','수족관','야경 명소'], dateIdeas: ['서로 최근 가장 오래 생각한 일을 한 가지씩 이야기하기','야경을 보며 이어폰 한 쪽씩 나눠 듣기','조용한 카페에서 질문 카드로 깊은 대화하기','각자 쉬는 시간을 보낸 뒤 늦은 저녁에 만나기'], colors: ['네이비','파란색','청록색','실버'], flowers: [{name:'아이리스',meaning:'신뢰와 좋은 소식',reason:'자(子)의 깊은 관찰력과 차분한 신뢰를 표현하기 좋아요.'},{name:'물망초',meaning:'기억과 진심',reason:'말보다 오래 기억하며 마음을 보여주는 자(子)의 애정 방식과 어울려요.'}],
    },
    丑: {
      month: ['익숙한 순서와 현실적인 준비가 갖춰져야 일상에서 안정감을 느끼는 편', '약속을 급하게 늘리기보다 지킬 수 있는 범위에서 꾸준히 관계를 운영하는 편', '변화보다 신뢰와 책임을 먼저 확인한 뒤 천천히 움직이는 편'],
      day: ['가까운 사람에게 말보다 챙김과 반복되는 행동으로 마음을 보여주는 편', '한번 마음을 주면 쉽게 흔들리지 않고 오래 관계를 지키려는 편', '편안한 식사와 생활 속 도움에서 사랑을 가장 분명하게 느끼는 편'],
      friction: ['참을 수 있을 때까지 버티다가 한 번에 서운함을 꺼낼 수 있어요.', '익숙한 방식을 바꾸라는 요구를 받으면 마음을 닫고 고집이 세질 수 있어요.', '챙겨준 행동을 상대도 당연히 알아줄 것이라 기대하기 쉬워요.'],
      repair: ['작은 불편이 생긴 날 바로 한 문장으로 알려주세요.', '변화를 전부 거부하기보다 한 가지는 상대 방식으로 시험해보세요.', '챙겨준 마음을 계산하기보다 지금 원하는 도움을 구체적으로 요청하세요.'],
      romantic: ['함께 밥을 먹고 필요한 것을 챙겨주는 평범한 일상에서 애정이 단단해져요.', '정해진 날에 꾸준히 만나며 관계의 리듬을 만드는 연애가 잘 맞아요.', '화려한 이벤트보다 힘든 날 자리를 지켜주는 행동에서 사랑을 확인해요.'],
      keyword: ['꾸준한 신뢰','생활의 안정','묵직한 돌봄'], season:'늦겨울', seasonDetail:['차분하게 온기를 쌓는 늦겨울','따뜻한 식사와 약속이 힘이 되는 계절','봄을 기다리며 신뢰를 다지는 시간'], timeRange:'오전 11시~오후 6시', timeDetail:['식사와 대화를 서두르지 않아도 되는 낮 시간이 좋아요.','주말 오후에 장보기와 식사를 한 코스로 이어보세요.'],
      places:['전통시장','베이커리 카페','도자기 공방','조용한 식당'], dateIdeas:['함께 장을 보고 한 끼 만들기','다음 달 지킬 수 있는 약속 하나 정하기','서로 필요한 생활용품을 골라주기','도자기나 베이킹 체험으로 결과물 남기기'], colors:['오트밀색','브라운','베이지','크림색'], flowers:[{name:'스톡',meaning:'변치 않는 마음',reason:'축(丑)의 꾸준하고 오래 지키는 관계 태도와 어울려요.'},{name:'카네이션',meaning:'사랑과 존중',reason:'생활 속에서 묵묵히 챙겨주는 축(丑)의 돌봄을 담기 좋아요.'}],
    },
    寅: {
      month: ['새로운 목표가 생기면 일정을 먼저 움직이며 관계에도 활력을 넣는 편', '일상에서 도전과 변화가 있어야 자신다운 에너지가 살아나는 편', '사람들과 함께 무언가를 시작하고 이끄는 역할에 자연스럽게 나서는 편'],
      day: ['좋아하는 사람과 미래 계획을 나누고 함께 성장할 때 애정을 크게 느끼는 편', '호감이 생기면 새로운 경험을 제안하며 관계를 앞으로 움직이려는 편', '상대를 응원하고 가능성을 믿어주는 말로 사랑을 표현하는 편'],
      friction: ['상대의 준비가 늦으면 기다리기보다 대신 방향을 정하려 할 수 있어요.', '하고 싶은 일을 빠르게 늘려 상대가 따라가기 벅찰 수 있어요.', '현재의 감정보다 다음 단계와 해결책을 먼저 말하기 쉬워요.'],
      repair: ['제안하기 전에 상대가 원하는 속도와 여유를 먼저 물어보세요.', '새로운 계획은 한 번에 하나만 정하고 끝까지 마무리해보세요.', '해결책보다 상대가 지금 느끼는 감정을 먼저 인정해주세요.'],
      romantic: ['근교 여행이나 새로운 체험을 함께 시작할 때 연인다운 설렘이 커져요.', '서로의 목표를 응원하고 작은 성취를 축하하며 가까워지는 커플이에요.', '다음에 할 일을 자연스럽게 이야기할 때 관계가 살아 있다고 느껴요.'],
      keyword:['도전','새로운 시작','함께 성장'], season:'초봄', seasonDetail:['새로운 움직임이 시작되는 초봄','첫 계획을 꺼내기 좋은 산뜻한 계절','관계에 활력을 넣는 봄의 시작'], timeRange:'오전 9시~오후 4시', timeDetail:['활동할 시간이 충분한 오전부터 새로운 장소를 둘러보세요.','이른 오후까지 이동과 체험을 넣은 코스가 잘 맞아요.'],
      places:['근교 여행지','등산로·둘레길','팝업스토어','원데이 클래스'], dateIdeas:['처음 가는 동네에서 반나절 탐방하기','서로 올해 해보고 싶은 일을 하나씩 실행하기','활동적인 원데이 클래스 체험하기','짧은 근교 여행 계획을 당일 완성하기'], colors:['포레스트그린','초록색','라임색','카키색'], flowers:[{name:'프리지아',meaning:'새로운 시작',reason:'인(寅)의 도전적이고 앞으로 나아가는 기운과 잘 맞아요.'},{name:'해바라기',meaning:'한결같은 응원',reason:'상대의 가능성을 믿고 힘을 주는 인(寅)의 애정 방식과 어울려요.'}],
    },
    卯: {
      month: ['사람 사이의 분위기와 예의를 살피며 부드럽게 관계를 이어가는 편', '일상에서 조화롭고 보기 좋은 환경이 갖춰질 때 마음이 편안해지는 편', '강하게 밀어붙이기보다 상대의 반응을 보며 자연스럽게 방향을 조율하는 편'],
      day: ['다정한 말과 섬세한 배려가 오갈 때 사랑받는다는 확신이 커지는 편', '편안한 대화와 아름다운 공간에서 감정을 천천히 나누는 방식을 선호하는 편', '상대의 작은 변화와 취향을 기억해 부드럽게 마음을 표현하는 편'],
      friction: ['갈등을 피하려고 맞춰주다가 뒤늦게 억울함이 생길 수 있어요.', '분위기를 깨고 싶지 않아 불편한 기준을 분명히 말하지 못할 수 있어요.', '상대의 말투나 반응이 거칠면 내용보다 태도에 오래 상처받을 수 있어요.'],
      repair: ['부드럽게 말하더라도 가능한 것과 어려운 것을 분명히 구분해주세요.', '분위기를 지키기 위해 참기보다 작은 불편을 일찍 요청하세요.', '상대의 의도를 추측하기 전에 말투에서 느낀 감정을 직접 설명해보세요.'],
      romantic: ['전시와 산책처럼 아름다운 장면을 함께 나눌 때 친밀감이 깊어져요.', '작은 꽃이나 손편지처럼 세심한 표현이 오래 기억에 남는 연애를 해요.', '서로의 취향을 존중하며 다정한 대화를 이어갈 때 애정이 안정돼요.'],
      keyword:['다정한 조화','섬세한 배려','아름다운 일상'], season:'봄', seasonDetail:['꽃과 대화가 자연스럽게 어울리는 봄','부드러운 분위기에서 마음이 열리는 계절','서로의 취향을 발견하기 좋은 봄날'], timeRange:'오전 11시~오후 7시', timeDetail:['빛이 부드러운 낮에 전시와 산책을 천천히 이어보세요.','사람이 너무 붐비지 않는 오후에 취향을 나눌 장소가 좋아요.'],
      places:['식물원','미술 전시','꽃시장','감성 카페'], dateIdeas:['서로에게 어울리는 꽃 한 송이 골라주기','전시를 보고 가장 마음에 든 장면 이야기하기','조용한 골목에서 사진 산책하기','취향이 담긴 작은 선물 서로 골라주기'], colors:['세이지그린','민트색','연두색','핑크색'], flowers:[{name:'튤립',meaning:'솔직한 사랑',reason:'묘(卯)의 부드럽고 분명한 애정 표현을 담기 좋아요.'},{name:'안개꽃',meaning:'맑은 마음',reason:'작은 배려가 쌓여 친밀해지는 묘(卯)의 관계 방식과 어울려요.'}],
    },
    辰: {
      month: ['여러 가능성을 열어두고 상황을 크게 보며 일상의 방향을 조정하는 편', '변화가 생겨도 전체 흐름을 정리해 새로운 기반을 만들려는 편', '사람과 계획을 연결하며 복잡한 상황에서 중심을 잡으려는 편'],
      day: ['가까운 관계에서도 감정과 현실을 함께 보며 장기적인 방향을 고민하는 편', '상대와 미래의 그림을 공유할 때 관계에 대한 확신이 커지는 편', '마음이 복잡할수록 시간을 두고 전체 맥락을 정리한 뒤 표현하는 편'],
      friction: ['생각과 계획이 많아 결론이 늦어지거나 방향이 자주 바뀔 수 있어요.', '전체를 정리하려다 상대의 지금 감정을 뒤로 미룰 수 있어요.', '혼자 감당하려는 태도 때문에 상대가 관계 밖에 있다고 느낄 수 있어요.'],
      repair: ['큰 방향과 지금 해결할 문제를 분리해 하나씩 이야기하세요.', '계획을 정리하기 전에 상대의 현재 감정을 먼저 확인해주세요.', '혼자 결론을 만든 뒤 알리기보다 중간 생각도 함께 공유해보세요.'],
      romantic: ['장기 계획과 서로의 꿈을 이야기할 때 관계가 더 깊어지는 커플이에요.', '넓은 공간을 걷거나 전망을 보며 복잡한 마음을 정리하는 데이트가 잘 맞아요.', '변화의 시기에 함께 기반을 다시 만드는 과정이 중요한 애정 표현이 돼요.'],
      keyword:['전환','큰 그림','함께 만드는 기반'], season:'늦봄', seasonDetail:['변화의 방향을 정리하는 늦봄','다음 계절을 준비하며 계획을 맞추는 시간','넓은 시야로 관계를 바라보는 계절'], timeRange:'오후 1시~저녁 8시', timeDetail:['이동과 대화를 함께 할 수 있는 긴 오후 일정이 좋아요.','전망이 트인 장소에서 앞으로의 계획을 천천히 나눠보세요.'],
      places:['전망대','넓은 공원','복합문화공간','대형 서점'], dateIdeas:['서로의 올해 계획을 지도처럼 그려보기','전망 좋은 곳에서 다음 계절에 할 일 정하기','복합문화공간에서 각자 원하는 코스 하나씩 선택하기','지난 사진을 보며 관계의 변화 이야기하기'], colors:['청록색','카멜색','황토색','에메랄드색'], flowers:[{name:'수국',meaning:'진심과 변화',reason:'상황에 따라 관계의 모양을 조율하는 진(辰)의 특성과 어울려요.'},{name:'리시안셔스',meaning:'변치 않는 애정',reason:'변화 속에서도 관계의 기반을 지키려는 진(辰)의 마음을 담기 좋아요.'}],
    },
    巳: {
      month: ['사람과 상황의 핵심을 빠르게 읽고 자신만의 방식으로 집중하는 편', '관심이 생긴 일에는 깊이 파고들며 일상의 밀도를 높이는 편', '겉으로는 차분해도 목표와 관계에서 분명한 열정을 품는 편'],
      day: ['가까운 사람에게 강한 집중과 매력으로 마음을 표현하는 편', '피상적인 대화보다 서로의 욕구와 진심을 깊이 확인하는 관계를 선호하는 편', '애정이 생기면 상대의 반응을 세밀하게 살피며 관계의 온도를 높이는 편'],
      friction: ['상대의 말과 행동 속 의미를 너무 깊게 해석해 의심이 커질 수 있어요.', '마음이 강한 만큼 반응을 확인하려는 태도가 압박으로 느껴질 수 있어요.', '자신의 판단이 맞다고 느끼면 상대의 설명을 충분히 듣지 않을 수 있어요.'],
      repair: ['해석한 내용을 사실로 단정하기 전에 상대에게 직접 확인하세요.', '확신을 요구하기보다 상대가 편하게 표현할 시간을 남겨주세요.', '결론을 말하기 전에 상대 설명을 끝까지 요약해보세요.'],
      romantic: ['둘만의 공간에서 깊은 대화와 선명한 애정 표현을 나눌 때 끌림이 커져요.', '분위기와 감각이 살아 있는 데이트에서 서로에게 집중하기 쉬워요.', '상대의 취향과 욕구를 세심하게 알아가는 과정 자체가 로맨틱하게 느껴져요.'],
      keyword:['집중','매력','깊은 교감'], season:'초여름', seasonDetail:['감각과 설렘이 선명해지는 초여름','관계의 온도가 높아지는 계절','서로에게 집중하기 좋은 초여름 밤'], timeRange:'오후 4시~밤 10시', timeDetail:['해가 기울기 시작하는 시간부터 분위기 있는 코스를 이어보세요.','사람이 적당히 줄어드는 저녁에 서로에게 집중할 장소가 좋아요.'],
      places:['미디어아트 전시','분위기 좋은 레스토랑','향수 공방','야경 카페'], dateIdeas:['서로에게 어울리는 향을 골라주기','깊이 궁금했던 질문 세 가지 나누기','미디어아트 전시 뒤 인상 깊었던 감정 이야기하기','조명이 좋은 곳에서 천천히 저녁 먹기'], colors:['버건디','와인색','자주색','체리레드'], flowers:[{name:'라넌큘러스',meaning:'매력과 설렘',reason:'사(巳)의 집중력과 선명한 끌림을 표현하기 좋아요.'},{name:'장미',meaning:'사랑과 열정',reason:'감정을 깊고 분명하게 나누는 사(巳)의 애정 방식과 어울려요.'}],
    },
    午: {
      month: ['활기와 즉각적인 반응이 있어야 일상과 관계에서 에너지가 살아나는 편', '사람들과 함께 움직이고 표현하며 분위기를 밝히는 역할을 맡기 쉬운 편', '마음이 움직이면 계획보다 먼저 행동하며 경험을 크게 나누려는 편'],
      day: ['좋아하는 마음을 표정과 말로 빠르게 보여주며 애정을 확인받고 싶은 편', '함께 웃고 반응하는 순간이 많을수록 관계에 확신을 느끼는 편', '연인다운 설렘과 분명한 표현이 있어야 마음이 안정되는 편'],
      friction: ['감정이 올라오면 생각보다 말이 먼저 나가 싸움이 커질 수 있어요.', '상대의 반응이 늦으면 관심이 줄었다고 빠르게 단정할 수 있어요.', '즐거운 순간에 한 약속을 실제 결정으로 받아들여 혼선이 생길 수 있어요.'],
      repair: ['감정이 가장 높을 때는 결론을 내리지 말고 잠시 자리를 바꿔보세요.', '반응 속도와 애정의 크기를 같은 것으로 해석하지 마세요.', '분위기에서 한 말과 실제 약속을 나중에 한 번 더 확인하세요.'],
      romantic: ['공연과 축제처럼 함께 크게 웃고 반응할 때 애정이 가장 선명해져요.', '보고 싶었다는 말과 자연스러운 스킨십이 자주 오가는 연애가 잘 맞아요.', '짧게 만나도 분위기를 살려 평범한 저녁을 특별하게 만드는 커플이에요.'],
      keyword:['활기','분명한 표현','뜨거운 설렘'], season:'한여름', seasonDetail:['표현과 웃음이 크게 살아나는 한여름','함께 움직일수록 가까워지는 계절','밝은 에너지를 나누기 좋은 여름날'], timeRange:'오후 3시~밤 10시', timeDetail:['볼거리와 사람이 적당히 있는 오후부터 저녁까지 활기 있는 코스가 좋아요.','짧은 만남이라도 공연이나 야경처럼 반응을 나눌 요소를 넣어보세요.'],
      places:['야외 축제','공연장','테마파크','스포츠 경기장'], dateIdeas:['같이 응원할 공연이나 경기를 보기','즉석 사진을 찍고 좋았던 순간 적기','노을을 본 뒤 고마웠던 점 말하기','밝은 드레스코드를 정해 만나기'], colors:['빨간색','주황색','코랄색','주홍색'], flowers:[{name:'거베라',meaning:'희망과 활기',reason:'오(午)의 밝고 적극적인 관계 에너지를 표현하기 좋아요.'},{name:'해바라기',meaning:'밝은 응원',reason:'좋아하는 마음을 크게 보여주는 오(午)의 애정 방식과 어울려요.'}],
    },
    未: {
      month: ['사람들의 감정과 필요를 살피며 편안한 환경을 만드는 역할을 하기 쉬운 편', '일상에서 따뜻함과 미적 감각이 조화를 이룰 때 마음이 안정되는 편', '강하게 이끌기보다 서로 배려할 수 있는 흐름을 만드는 편'],
      day: ['가까운 사람을 세심하게 돌보고 편안하게 쉴 수 있게 해주는 방식으로 사랑을 표현하는 편', '부드러운 대화와 따뜻한 공간에서 감정이 천천히 열리는 편', '상대가 자신에게 기대고 안심하는 순간에 애정의 깊이를 느끼는 편'],
      friction: ['상대를 배려하다 자신의 피로와 욕구를 뒤로 미룰 수 있어요.', '직접 말하지 않은 기대가 채워지지 않으면 조용히 서운해질 수 있어요.', '갈등을 피하려고 애매하게 답해 문제가 오래 남을 수 있어요.'],
      repair: ['도와주기 전에 지금 자신에게 여유가 있는지도 확인하세요.', '원하는 배려를 상대가 알아주길 기다리지 말고 구체적으로 말하세요.', '부드럽게 말하더라도 결정해야 할 부분은 기한을 정해주세요.'],
      romantic: ['집처럼 편안한 공간에서 함께 만들고 쉬는 시간이 사랑으로 느껴져요.', '상대가 지친 날 음식과 작은 돌봄으로 마음을 전하는 연애가 잘 맞아요.', '소품·꽃·음악처럼 따뜻한 분위기를 함께 꾸밀 때 친밀감이 커져요.'],
      keyword:['따뜻한 돌봄','편안한 감성','함께 쉬는 시간'], season:'늦여름', seasonDetail:['따뜻함 속에 여유가 필요한 늦여름','함께 쉬며 마음을 돌보는 계절','감성과 생활의 온기가 어울리는 시간'], timeRange:'오전 11시~저녁 8시', timeDetail:['서두르지 않아도 되는 낮에 만들기 체험과 식사를 이어보세요.','편안한 공간에서 오래 머물 수 있는 오후 일정이 좋아요.'],
      places:['브런치 카페','플라워 공방','도자기 공방','근교 숙소'], dateIdeas:['서로 좋아하는 음식을 함께 만들기','꽃이나 소품으로 작은 공간 꾸미기','피곤한 날을 위한 둘만의 휴식 루틴 정하기','도자기나 뜨개 체험으로 선물 만들기'], colors:['살구색','복숭아색','크림색','로즈핑크'], flowers:[{name:'라벤더',meaning:'평온과 기다림',reason:'미(未)의 따뜻하고 편안한 돌봄을 담기 좋아요.'},{name:'리시안셔스',meaning:'따뜻한 애정',reason:'부드럽게 관계를 지키는 미(未)의 애정 방식과 어울려요.'}],
    },
    申: {
      month: ['변화에 빠르게 적응하며 효율적인 방법과 새로운 정보를 찾는 편', '일상에서 재치와 선택지가 많을수록 관계에도 흥미를 느끼는 편', '상황에 따라 역할을 바꾸고 문제를 영리하게 해결하려는 편'],
      day: ['가까운 사람과 장난·대화·새로운 자극을 주고받을 때 애정이 살아나는 편', '상대와 생각을 주고받으며 서로에게 흥미로운 사람이 되고 싶은 편', '구속보다 유연한 약속과 함께 배우는 관계를 선호하는 편'],
      friction: ['진지한 감정을 농담으로 넘겨 상대가 가볍게 느낄 수 있어요.', '흥미가 바뀌면 계획과 연락 방식도 자주 달라질 수 있어요.', '문제를 빨리 해결하려다 상대가 감정을 충분히 느낄 시간을 놓칠 수 있어요.'],
      repair: ['농담하기 전에 상대가 지금 공감을 원하는지 먼저 확인하세요.', '계획을 바꿀 때는 이유와 새로운 대안을 함께 알려주세요.', '해결책을 말하기 전에 상대가 느낀 감정을 한 문장으로 되짚어보세요.'],
      romantic: ['보드게임과 체험처럼 서로의 반응을 바로 볼 수 있는 데이트가 잘 맞아요.', '장난과 지적인 대화가 자연스럽게 섞일 때 친구 같은 연애의 매력이 커져요.', '새로운 정보를 함께 발견하고 각자 의견을 나누며 가까워지는 커플이에요.'],
      keyword:['재치','유연한 호흡','새로운 자극'], season:'초가을', seasonDetail:['새로운 자극과 대화가 풍성한 초가을','가볍게 움직이며 취향을 발견하는 계절','선선한 공기 속에서 호흡이 빨라지는 시간'], timeRange:'오후 1시~밤 9시', timeDetail:['체험과 대화를 번갈아 할 수 있는 오후 일정이 좋아요.','한 장소에 오래 머물기보다 두세 가지 짧은 코스를 연결해보세요.'],
      places:['보드게임 카페','방탈출','과학관·체험관','편집숍 거리'], dateIdeas:['서로 다른 전략으로 보드게임 해보기','새로운 앱이나 도구를 함께 배워보기','방탈출 뒤 서로 잘한 역할 칭찬하기','각자 흥미로운 장소 하나씩 골라 반반 코스 만들기'], colors:['실버','웜그레이','민트색','청록색'], flowers:[{name:'알스트로메리아',meaning:'우정과 헌신',reason:'신(申)의 친구 같은 호흡과 유연한 협력을 표현하기 좋아요.'},{name:'아이리스',meaning:'믿음과 용기',reason:'새로운 선택지를 찾고 움직이는 신(申)의 관계 에너지와 어울려요.'}],
    },
    酉: {
      month: ['기준과 완성도를 중요하게 여기며 일상과 관계를 깔끔하게 정리하는 편', '약속·시간·예의를 지키는지를 통해 사람에 대한 신뢰를 판단하는 편', '좋아하는 것과 불편한 것을 분명히 구분해 선택하려는 편'],
      day: ['가까운 관계에서도 존중과 정확한 약속이 있어야 마음을 편하게 여는 편', '애매한 표현보다 말과 행동이 일치하는 사랑을 선호하는 편', '세심하게 준비한 선물과 계획으로 상대를 특별하게 대하는 편'],
      friction: ['실망하면 감정보다 잘못된 점을 먼저 지적할 수 있어요.', '작은 약속 위반도 관계 전체의 신뢰 문제로 확대해 볼 수 있어요.', '완성도를 높이려다 상대의 자유로운 방식을 평가할 수 있어요.'],
      repair: ['지적하기 전에 상대가 잘하고 있는 점을 한 가지 먼저 말하세요.', '모든 기준을 한 번에 맞추지 말고 가장 중요한 한 가지만 합의하세요.', '틀린 점보다 자신이 원하는 행동을 요청형 문장으로 말해주세요.'],
      romantic: ['예약과 준비가 잘 된 데이트에서 서로를 존중받는다고 느껴요.', '작은 선물과 정확한 약속처럼 세심한 행동이 연인다운 애정 표현이 돼요.', '서로의 취향을 정교하게 알아가고 잘 어울리는 것을 골라줄 때 친밀감이 커져요.'],
      keyword:['세심한 존중','정돈된 신뢰','분명한 약속'], season:'가을', seasonDetail:['취향과 기준이 선명해지는 가을','차분하게 완성도를 높이는 계절','서로를 세심하게 바라보기 좋은 시간'], timeRange:'오후 2시~저녁 9시', timeDetail:['예약한 전시나 식당을 중심으로 여유 있는 반나절 코스를 만들어보세요.','사람이 너무 붐비지 않는 오후에 취향을 집중해서 나눠보세요.'],
      places:['디자인 전시','정갈한 레스토랑','주얼리 공방','티룸'], dateIdeas:['서로에게 어울리는 소품 골라주기','전시에서 가장 완성도가 높다고 느낀 작품 이야기하기','잘 지켜준 약속을 세 가지씩 말하기','주얼리나 가죽 소품 만들기'], colors:['아이보리','실버','웜그레이','버건디'], flowers:[{name:'백합',meaning:'순수한 존중',reason:'유(酉)의 정갈하고 존중을 중시하는 태도와 어울려요.'},{name:'카라',meaning:'품위와 열정',reason:'분명한 기준 속에서도 깊은 애정을 품는 유(酉)의 특성을 담기 좋아요.'}],
    },
    戌: {
      month: ['책임과 신의를 중시하며 자신이 맡은 관계와 역할을 끝까지 지키려는 편', '일상에서 원칙과 안전한 기반이 있어야 새로운 일도 편하게 시작하는 편', '가까운 사람과 공동체를 보호하고 든든한 중심이 되려는 편'],
      day: ['연인에게 충실하고 힘든 순간에도 편을 지켜주는 방식으로 사랑을 표현하는 편', '관계의 약속과 진정성을 중요하게 여기며 쉽게 마음을 바꾸지 않는 편', '상대가 자신을 믿고 의지할 때 애정과 책임감을 함께 느끼는 편'],
      friction: ['옳다고 믿는 기준을 지키려다 상대의 다른 선택을 받아들이기 어려울 수 있어요.', '한번 실망하면 경계심이 높아져 마음을 다시 여는 데 시간이 걸릴 수 있어요.', '책임을 혼자 떠안다가 상대가 기여하지 않는다고 느낄 수 있어요.'],
      repair: ['원칙을 말할 때 상대가 선택할 수 있는 범위도 함께 남겨주세요.', '실망한 행동과 상대 전체에 대한 평가를 분리해 말하세요.', '혼자 책임지기 전에 역할과 도움을 구체적으로 요청하세요.'],
      romantic: ['힘든 날에도 약속을 지키고 곁을 지켜주는 행동에서 사랑을 확인해요.', '역사·산책·여행처럼 오래 이야기할 수 있는 경험을 함께 쌓을 때 유대가 깊어져요.', '둘만의 원칙과 믿음을 만들며 든든한 팀이 되는 연애가 잘 맞아요.'],
      keyword:['신의','든든한 편','오래가는 약속'], season:'늦가을', seasonDetail:['신뢰와 약속을 돌아보는 늦가을','오래갈 관계의 기반을 다지는 계절','차분하게 서로의 편을 확인하는 시간'], timeRange:'오전 11시~저녁 8시', timeDetail:['오래 걸으며 대화할 수 있는 선선한 낮 시간이 좋아요.','역사와 이야기가 있는 장소에서 긴 산책과 식사를 이어보세요.'],
      places:['고궁·성곽길','역사 박물관','숲길','오래된 맛집'], dateIdeas:['각자 관계에서 꼭 지키고 싶은 약속 말하기','성곽이나 오래된 거리를 걸으며 추억 사진 남기기','서로 힘들 때 필요한 도움 목록 만들기','오래된 맛집을 찾아 한 끼 천천히 먹기'], colors:['카키색','브라운','머스터드색','버건디'], flowers:[{name:'국화',meaning:'성실과 진실',reason:'술(戌)의 신의와 오래 지키는 관계 태도를 표현하기 좋아요.'},{name:'스톡',meaning:'오래가는 마음',reason:'힘든 순간에도 자리를 지키는 술(戌)의 애정 방식과 어울려요.'}],
    },
    亥: {
      month: ['상황의 경계를 넓게 보고 사람마다 다른 사정을 이해하려는 편', '일상에서 자유로운 상상과 충분한 휴식이 있어야 관계에도 여유가 생기는 편', '고정된 방식보다 흐름과 감정에 맞춰 유연하게 움직이는 편'],
      day: ['가까운 사람의 마음을 깊이 이해하고 포용하는 방식으로 사랑을 표현하는 편', '둘만의 세계와 긴 대화가 생길 때 관계에 특별한 의미를 느끼는 편', '간섭보다 믿음과 자유를 주고받는 연애를 선호하는 편'],
      friction: ['상대를 이해하려다 자신의 경계와 욕구를 흐릴 수 있어요.', '현실적인 결정을 미루며 좋은 가능성만 오래 바라볼 수 있어요.', '마음이 상하면 설명보다 조용히 멀어져 상대가 이유를 모를 수 있어요.'],
      repair: ['상대를 이해하는 것과 자신이 감당할 수 있는 범위를 분리해 말하세요.', '열어둘 문제와 지금 결정할 문제를 구분해 기한을 정해주세요.', '거리를 두기 전에 현재 힘든 이유와 다시 연락할 시간을 알려주세요.'],
      romantic: ['물가와 밤 풍경처럼 일상에서 벗어난 공간에서 긴 대화를 나눌 때 애정이 깊어져요.', '함께 영화·음악·이야기를 공유하며 둘만의 세계를 만드는 연애가 잘 맞아요.', '서로의 자유를 존중하면서도 돌아올 수 있는 정서적 공간을 만들어주는 커플이에요.'],
      keyword:['포용','자유로운 교감','둘만의 세계'], season:'초겨울', seasonDetail:['상상과 깊은 대화가 어울리는 초겨울','둘만의 세계를 만들기 좋은 계절','조용한 풍경 속에서 마음이 넓어지는 시간'], timeRange:'오후 5시~밤 11시', timeDetail:['해가 진 뒤 물가나 조용한 공간에서 긴 대화를 나눠보세요.','영화와 음악처럼 감정을 공유할 수 있는 저녁 코스가 좋아요.'],
      places:['호수·강변','독립 영화관','음악 감상실','조용한 숙소'], dateIdeas:['서로 좋아하는 영화 한 편 보고 감상 나누기','물가를 걸으며 최근 마음에 남은 일 이야기하기','각자 만든 플레이리스트 교환하기','하루 동안 연락 부담을 줄이고 저녁에 깊게 대화하기'], colors:['네이비','파란색','자주색','청록색'], flowers:[{name:'물망초',meaning:'기억과 진심',reason:'상대의 마음을 오래 품고 기억하는 해(亥)의 애정 방식과 어울려요.'},{name:'델피니움',meaning:'자유로운 마음',reason:'신뢰와 자유를 함께 중요하게 여기는 해(亥)의 관계 태도를 담기 좋아요.'}],
    },
  };

  function getJijiPersonalBank(value) {
    const jiji = normalizeJiji(value);
    return jiji ? JIJI_PERSONAL_BANK[jiji] : null;
  }

  function buildBranchPairScenario(profileA, profileB, compat, seed, context) {
    const relations = getProfileJijiContext(profileA, profileB, compat);
    const monthText = getJijiRelationDescription(relations.month, seed, 'month');
    const dayText = getJijiRelationDescription(relations.day, seed, 'day');
    if (context === 'summary') return `${monthText} ${dayText}`;
    if (context === 'action') {
      const monthAction = pickVariation((JIJI_RELATION_VARIATIONS[relations.month.type] || JIJI_RELATION_VARIATIONS.평).action, seed, 'branch-action:month');
      const dayAction = pickVariation((JIJI_RELATION_VARIATIONS[relations.day.type] || JIJI_RELATION_VARIATIONS.평).action, seed, 'branch-action:day');
      return uniqueText([monthAction, dayAction]);
    }
    return { relations, monthText, dayText };
  }

  function getRecommendationBranchBanks(entryA, entryB, seed) {
    const monthCodes = uniqueText([getEntryMonthJiji(entryA), getEntryMonthJiji(entryB)]).sort();
    const dayCodes = uniqueText([getEntryDayJiji(entryA), getEntryDayJiji(entryB)]).sort();
    const monthBanks = monthCodes.map(code => ({ code, bank: getJijiPersonalBank(code) })).filter(item => item.bank);
    const dayBanks = dayCodes.map(code => ({ code, bank: getJijiPersonalBank(code) })).filter(item => item.bank);
    const seasonSource = pickVariation(monthBanks, seed, 'branch-rec:season-source') || monthBanks[0] || dayBanks[0] || null;
    return { monthBanks, dayBanks, seasonSource };
  }

  function uniqueFlowerDetails(items) {
    const seen = new Set();
    return (items || []).filter(item => {
      const name = String(item?.name || '').trim();
      if (!name || seen.has(name)) return false;
      seen.add(name);
      return true;
    });
  }

  const OHAENG_VARIATION_BANK = {
    목: {
      core: [
        '가능성을 발견하면 먼저 움직여보려는 편',
        '관계를 지금보다 나은 방향으로 키우고 싶어 하는 편',
        '새로운 자극과 변화가 있어야 마음이 살아나는 편',
        '막힌 상황에서도 다음 선택지를 찾으려는 편',
        '상대의 성장 가능성을 보고 응원하는 편',
        '정체된 분위기보다 함께 발전하는 흐름을 선호하는 편',
      ],
      love: ['함께 성장하고 있다는 확신', '새로운 경험을 같이 시작하는 설렘', '서로의 목표를 응원하는 태도', '다음 계획을 함께 세우는 과정', '자신의 가능성을 믿어주는 말'],
      strength: ['새로운 계획을 꺼내 관계에 활력을 넣는 능력', '상대가 망설일 때 첫걸음을 만들어주는 능력', '관계의 장기적인 가능성을 발견하는 능력', '함께할 목표를 구체적인 행동으로 바꾸는 능력', '답답한 분위기에 새로운 전환점을 만드는 능력'],
      shadow: ['속도가 느린 상대를 재촉하거나 방향을 대신 정하려는 태도', '새로운 계획을 계속 늘리면서 마무리를 놓치는 태도', '관계를 성장시켜야 한다는 압박을 상대에게 주는 태도', '현재의 안정감보다 다음 변화만 바라보는 태도', '조언이 많아져 상대가 통제받는다고 느끼게 하는 태도'],
      repair: ['결론을 정해주기보다 상대가 선택할 여지를 남기는 것', '새로운 제안을 하기 전에 상대가 원하는 속도를 먼저 묻는 것', '아이디어를 하나만 고르고 끝까지 함께 마무리하는 것', '변화를 요구하기보다 지금 잘하고 있는 점부터 인정하는 것', '당장 답을 받으려 하지 말고 생각할 기한을 함께 정하는 것'],
      activity: ['새로운 동네 산책', '전시나 팝업 탐방', '짧은 근교 여행', '함께 배우는 원데이 클래스', '다음 달 버킷리스트 만들기'],
      missing: [
        '둘 사이에 목 기운이 비어 있으면 누가 먼저 계획을 꺼낼지 기다리다가 관계가 정체될 수 있어요. 번갈아 한 가지씩 다음 약속을 제안해보세요.',
        '새로운 시도를 시작하는 힘이 약할 수 있어요. 거창한 여행보다 처음 가보는 카페처럼 작은 변화를 정기적으로 넣는 편이 좋아요.',
        '미래 이야기가 막연하게 흐르기 쉬워요. 이번 달에 함께 해볼 일 하나만 날짜까지 정하면 관계에 방향이 생겨요.',
        '둘 다 익숙한 방식에 머물면 재미가 줄 수 있어요. 한 사람씩 돌아가며 새로운 장소나 활동을 골라보세요.',
      ],
      weak: [
        '목 기운이 상대적으로 약하면 계획은 있어도 시작이 늦어질 수 있어요. 첫 행동을 10분 안에 할 수 있는 수준으로 작게 정해보세요.',
        '변화를 원하면서도 먼저 제안하는 데 망설일 수 있어요. 선택지를 두 개만 정해 상대에게 골라달라고 하는 방식이 잘 맞아요.',
        '관계의 다음 단계를 자연스럽게 미루기 쉬워요. 여행·저축·운동 중 하나를 공동 목표로 정하면 흐름이 살아나요.',
        '새로운 경험이 부족하면 서로에게 무심해진 것처럼 느낄 수 있어요. 한 달에 한 번은 평소와 다른 일정을 만들어보세요.',
      ],
      sharedStrong: [
        '둘 다 목 기운이 강하면 새로운 데이트와 계획을 빠르게 만들어요. 다만 시작한 일을 누가 마무리할지 미리 나누는 것이 중요해요.',
        '함께 성장하려는 욕구가 커서 공부·운동·여행 목표를 같이 세울 때 관계가 활발해져요. 경쟁으로 바뀌지 않게 각자의 속도도 존중해주세요.',
        '둘 다 변화를 좋아해 관계가 단조롭지 않지만, 계획이 자주 바뀌면 안정감이 떨어질 수 있어요. 꼭 지킬 약속 하나는 고정해두세요.',
        '상대의 가능성을 잘 보지만 조언도 많아질 수 있어요. 해결책보다 먼저 “지금은 응원이 필요한지 의견이 필요한지” 물어보는 편이 좋아요.',
      ],
      sharedGap: [
        '둘 다 목 기운이 약하면 다음 약속을 서로 미룰 수 있어요. 월별로 데이트 기획 담당을 번갈아 정해보세요.',
        '관계가 편안한 대신 새로움이 부족해질 수 있어요. 계절마다 한 번씩 처음 해보는 활동을 넣어보세요.',
        '미래 계획이 말로만 남기 쉬워요. 날짜·예산·첫 행동 중 하나는 대화가 끝나기 전에 확정하는 편이 좋아요.',
        '서로 눈치를 보며 제안을 아낄 수 있어요. 하고 싶은 일을 각자 세 개씩 적고 겹치는 항목부터 실행해보세요.',
      ],
      romantic: [
        '새로운 장소를 함께 발견하고 다음 계획을 이야기할 때 애정이 살아나는 커플이에요.',
        '서로의 목표를 응원하고 작은 성취를 함께 축하하는 모습에서 연인다운 유대가 커져요.',
        '정해진 코스보다 즉흥적으로 골목을 걷거나 새로운 체험을 할 때 둘만의 이야기가 많이 생겨요.',
        '한 사람이 아이디어를 꺼내고 다른 사람이 구체화할 때 데이트의 호흡이 좋아져요.',
        '같이 배우고 성장하는 경험이 단순한 이벤트보다 오래 기억에 남는 커플이에요.',
      ],
      summary: ['둘의 관계에 새로운 흐름을 만들고 다음 단계를 함께 시작하는 모습', '서로의 가능성을 믿어주며 작은 계획을 실제 행동으로 옮기는 모습', '익숙함에 머물지 않고 함께 성장할 기회를 만드는 모습', '관계가 막힐 때 새로운 선택지를 찾아 분위기를 전환하는 모습', '미래 목표를 이야기하고 첫걸음을 함께 정하는 모습'],
      keyword: ['성장', '새로운 시작', '확장', '도전', '발견', '함께 만드는 미래'],
      timeDetail: ['햇빛이 부드러운 오전이나 이동하기 좋은 이른 오후에 새로운 장소를 둘러보세요.', '주말 한낮처럼 활동할 시간이 충분할 때 짧은 탐방이나 체험을 넣어보세요.', '일정이 너무 빡빡하지 않은 오후에 산책과 대화를 함께 배치하는 편이 좋아요.', '평소보다 조금 일찍 만나 계획 없이 한 동네를 천천히 탐색해보세요.'],
      places: ['식물원', '수목원', '산책로', '독립서점', '전시회', '팝업스토어', '공방', '근교 여행지', '새로 생긴 카페 거리', '한강·하천 산책길', '테마 정원', '북카페'],
      dateIdeas: ['서로 가보고 싶었던 장소를 하나씩 골라 반나절 코스를 만들기', '한 달 버킷리스트를 세 개만 정하고 첫 번째 항목 실행하기', '원데이 클래스에서 같은 결과물을 함께 완성하기', '처음 가는 동네에서 지도 없이 천천히 산책하기', '각자의 올해 목표를 이야기하고 서로 도울 수 있는 한 가지 정하기', '작은 화분이나 식물을 골라 함께 키우기', '근교로 짧게 이동해 계절 풍경 사진 남기기', '새로운 취미를 한 번 체험한 뒤 다음에 계속할지 함께 결정하기'],
      help: [
        (s, r) => `${s}님은 ${r}님이 다음 행동을 정하지 못할 때 선택지를 넓혀주고 시작점을 만드는 역할을 하기 쉬워요.`,
        (s, r) => `${s}님은 ${r}님이 관계나 일상에서 정체감을 느낄 때 새로운 계획을 꺼내 분위기를 바꿔주는 편이에요.`,
        (s, r) => `${s}님은 ${r}님의 가능성을 먼저 발견해 “한번 해보자”는 용기를 주는 역할을 할 수 있어요.`,
        (s, r) => `${s}님은 ${r}님이 막막해할 때 큰 목표를 작은 첫 단계로 나누는 데 도움을 주는 편이에요.`,
      ],
    },
    화: {
      core: ['감정과 호감이 생기면 반응으로 빠르게 보여주는 편', '관계의 온도와 분위기를 민감하게 느끼는 편', '좋고 싫은 마음이 표정과 말투에 잘 드러나는 편', '사람 사이의 활기와 즉각적인 교감을 중요하게 여기는 편', '애정을 표현하고 확인받을 때 마음이 선명해지는 편', '즐거운 감정을 상대와 바로 나누려는 편'],
      love: ['즉각적인 호응과 분명한 애정 표현', '표정과 말투에서 느껴지는 따뜻한 반응', '보고 싶다는 마음을 숨기지 않는 태도', '함께 웃고 설레는 순간의 밀도', '기념일과 작은 이벤트로 확인되는 관심'],
      strength: ['관계의 분위기를 밝히고 감정을 빠르게 연결하는 능력', '상대가 위축됐을 때 따뜻한 반응으로 힘을 주는 능력', '좋아하는 마음을 숨기지 않아 관계를 선명하게 만드는 능력', '평범한 순간도 즐거운 기억으로 바꾸는 능력', '어색한 분위기를 먼저 풀고 친밀감을 높이는 능력'],
      shadow: ['서운함이 생기면 말과 반응이 너무 빨라지는 태도', '상대의 반응이 늦을 때 애정이 식었다고 단정하는 태도', '감정이 큰 순간에 결론까지 한꺼번에 내리려는 태도', '분위기에 따라 약속이나 말을 쉽게 바꾸는 태도', '확인받고 싶은 마음이 커져 상대를 몰아붙이는 태도'],
      repair: ['감정이 가장 뜨거울 때 결론을 내리지 않고 잠시 식힌 뒤 말하는 것', '상대의 반응 속도를 애정의 크기로 해석하지 않는 것', '서운함을 비난 대신 구체적인 행동 하나로 설명하는 것', '하고 싶은 말을 메시지로 모두 보내기 전에 핵심 한 문장만 고르는 것', '화해할 때 감정 표현과 실제 약속을 따로 나누어 이야기하는 것'],
      activity: ['공연 관람', '축제 나들이', '사진 남기기', '맛집 탐방', '야시장·밤거리 데이트'],
      missing: ['화 기운이 비어 있으면 좋아하는 마음이 있어도 표현이 적어 관계가 심심하게 느껴질 수 있어요. 짧은 칭찬이나 반가운 표정을 의식적으로 보여주세요.', '둘 다 애정 표현을 기다리기만 하면 상대가 무심하다고 오해할 수 있어요. 하루 한 번은 마음을 말이나 행동으로 먼저 전해보세요.', '기쁨을 함께 크게 나누는 장면이 부족할 수 있어요. 작은 성취나 기념일도 가볍게 축하하면 관계 온도가 올라가요.', '감정을 숨기는 시간이 길어지면 뒤늦게 서운함이 커질 수 있어요. 좋았던 점부터 짧게 표현하는 습관이 도움이 돼요.'],
      weak: ['화 기운이 약하면 마음은 깊어도 표현이 늦을 수 있어요. “오늘 만나서 좋았어”처럼 짧고 구체적인 말을 자주 해보세요.', '상대가 알아서 느껴주길 기대하기 쉬워요. 칭찬·고마움·보고 싶은 마음 중 하나는 직접 말해주는 편이 좋아요.', '데이트가 편안하지만 설렘이 흐려질 수 있어요. 사진을 남기거나 작은 이벤트를 넣어 감정을 눈에 보이게 만들어보세요.', '서운함을 참다가 한꺼번에 말할 수 있어요. 감정이 30% 정도일 때 먼저 알려주는 것이 관계를 지켜줘요.'],
      sharedStrong: ['둘 다 화 기운이 강하면 즐거울 때 분위기가 빠르게 달아오르고 애정 표현도 풍부해요. 다만 서운할 때도 말이 커질 수 있어 냉각 시간을 정해두는 편이 좋아요.', '반응이 빠르고 이벤트를 좋아해 연애가 생동감 있지만, 상대의 작은 표정 변화에도 예민해질 수 있어요. 확인되지 않은 감정은 바로 단정하지 마세요.', '서로 칭찬하고 표현하는 힘이 커서 가까워지기 쉽지만, 감정 경쟁이 되면 누가 더 서운한지만 남을 수 있어요. 한 번에 한 사람의 이야기만 들어주세요.', '함께 있을 때 에너지가 높아지지만 피곤한 날에도 같은 반응을 기대하면 부담이 생겨요. 조용히 쉬는 데이트도 애정으로 인정해주세요.'],
      sharedGap: ['둘 다 화 기운이 약하면 애정 표현을 서로 기다릴 수 있어요. 고마움과 보고 싶은 마음은 생각난 순간 바로 한마디 해주세요.', '관계가 편안한 대신 연인다운 설렘이 줄 수 있어요. 한 달에 한 번은 옷차림이나 장소에 작은 변화를 줘보세요.', '좋아도 티가 적어 상대가 확신을 잃을 수 있어요. 헤어질 때 오늘 좋았던 점 하나를 말하는 규칙이 도움이 돼요.', '감정 확인이 늦어 오해가 길어질 수 있어요. 표정이 어두워졌을 때 “지금 기분이 어때?”라고 먼저 묻는 습관을 만들어보세요.'],
      romantic: ['표정과 말투가 밝아지고 보고 싶었다는 마음을 숨기지 않을 때 연인다운 설렘이 커져요.', '사진·기념일·짧은 메시지처럼 눈에 보이는 표현을 자주 나누는 커플이에요.', '같이 웃고 즉각적으로 반응해주는 순간이 많은 날 서로의 애정을 가장 크게 느껴요.', '짧게 만나도 분위기를 살리는 힘이 있어 평범한 저녁도 특별한 데이트가 되기 쉬워요.', '칭찬과 장난이 자연스럽게 오갈 때 친밀감과 끌림이 함께 높아지는 커플이에요.'],
      summary: ['좋아하는 마음을 말과 표정으로 분명하게 나누는 모습', '평범한 순간에도 반응과 웃음으로 관계의 온도를 높이는 모습', '서로의 기분을 빠르게 알아차리고 따뜻하게 호응하는 모습', '작은 기념과 표현으로 애정을 눈에 보이게 만드는 모습', '설렘과 즐거움을 함께 크게 느끼고 공유하는 모습'],
      keyword: ['설렘', '표현', '온기', '활기', '로맨틱함', '함께 웃는 순간'],
      timeDetail: ['노을이 시작되는 늦은 오후부터 저녁까지 표정과 분위기를 충분히 나눌 수 있는 일정이 좋아요.', '조명과 음악이 살아나는 저녁 시간에 공연이나 맛집을 함께 즐겨보세요.', '짧게 만나더라도 기분 전환이 되는 퇴근 후 저녁 데이트가 잘 맞아요.', '사람과 볼거리가 적당히 있는 주말 오후에 활기 있는 코스를 골라보세요.'],
      places: ['공연장', '야외 축제', '야시장', '루프탑 카페', '사진관', '테마파크', '라이브 바', '맛집 거리', '노을 명소', '미디어아트 전시', '불빛이 예쁜 산책길', '스포츠 경기장'],
      dateIdeas: ['서로의 사진을 자연스럽게 찍어주며 야경 산책하기', '작은 기념일을 정해 좋아하는 디저트로 축하하기', '공연이나 스포츠 경기를 보며 반응을 함께 나누기', '서로에게 어울리는 메뉴를 하나씩 골라 맛집 탐방하기', '즉석 사진을 찍고 그날 가장 좋았던 순간을 뒷면에 적기', '노을을 본 뒤 각자 오늘 고마웠던 점 하나씩 말하기', '서로 좋아하는 노래로 짧은 플레이리스트를 만들어 듣기', '드레스코드를 한 가지 정해 평소와 다른 분위기로 만나기'],
      help: [(s,r)=>`${s}님은 ${r}님이 기분이 가라앉았을 때 먼저 말을 걸고 분위기를 따뜻하게 바꾸는 역할을 하기 쉬워요.`,(s,r)=>`${s}님은 ${r}님이 표현을 망설일 때 솔직한 반응으로 마음을 꺼내기 쉽게 만들어줘요.`,(s,r)=>`${s}님은 ${r}님의 작은 성취도 크게 반겨주며 자신감을 높여주는 편이에요.`,(s,r)=>`${s}님은 ${r}님이 관계의 확신을 잃을 때 말과 표정으로 애정을 분명하게 보여줄 수 있어요.`],
    },
    토: {
      core: ['안정과 책임을 중요하게 여기며 관계를 꾸준히 지키는 편', '말보다 반복되는 행동으로 신뢰를 쌓는 편', '생활 리듬과 현실적인 약속이 맞을 때 편안해지는 편', '쉽게 흔들리기보다 오래 지켜보며 관계를 다지는 편', '상대를 실제로 챙겨주는 행동에서 마음을 보여주는 편', '익숙하고 예측 가능한 흐름 속에서 애정이 깊어지는 편'],
      love: ['꾸준한 연락과 변하지 않는 태도', '약속을 지키는 행동에서 느껴지는 신뢰', '생활 속에서 실제로 챙겨주는 마음', '예측 가능한 관계의 리듬', '힘들 때 자리를 지켜주는 든든함'],
      strength: ['관계를 현실적으로 지키고 꾸준히 돌보는 능력', '감정이 흔들릴 때 중심을 잡아주는 능력', '약속과 생활 문제를 차근차근 정리하는 능력', '상대가 지칠 때 실제 필요한 것을 챙기는 능력', '장기적인 신뢰를 행동으로 쌓는 능력'],
      shadow: ['익숙한 방식을 고수해 변화를 거부하는 태도', '서운함을 바로 말하지 않고 오래 쌓아두는 태도', '챙겨준 만큼 상대도 해야 한다는 기대가 커지는 태도', '안정을 이유로 상대의 자유를 제한하는 태도', '한 번 굳어진 판단을 쉽게 바꾸지 않는 태도'],
      repair: ['누가 옳은지보다 다음부터 반복하지 않을 약속을 정하는 것', '서운함이 쌓이기 전에 작은 불편부터 말하는 것', '익숙한 방식만 고집하지 않고 한 가지는 상대 방식으로 해보는 것', '챙겨준 행동을 계산하기보다 원하는 도움을 직접 요청하는 것', '감정과 생활 문제를 분리해 하나씩 정리하는 것'],
      activity: ['함께 요리하기', '집 꾸미기', '정기 데이트', '시장·마트 장보기', '생활 계획 세우기'],
      missing: ['토 기운이 비어 있으면 일정·돈·역할처럼 반복 관리가 필요한 일이 흐트러질 수 있어요. 공동 캘린더와 간단한 역할표가 도움이 돼요.', '관계의 안정감을 확인할 행동이 부족할 수 있어요. 연락 시간이나 만나는 주기를 어느 정도 고정해보세요.', '좋은 마음은 있어도 실제 챙김이 빠질 수 있어요. 아픈 날·바쁜 날 필요한 도움을 구체적으로 묻는 습관이 좋아요.', '약속이 자주 바뀌면 불안이 커질 수 있어요. 변경이 생길 때 대안을 함께 제시해 신뢰를 지켜주세요.'],
      weak: ['토 기운이 약하면 생활 문제를 감정으로만 해결하려 할 수 있어요. 일정·비용·역할은 말로 구체화해두는 편이 좋아요.', '꾸준함이 부족해 상대가 관계의 확신을 잃을 수 있어요. 짧더라도 지킬 수 있는 연락 약속을 정해보세요.', '서로 챙겨야 할 일을 미루기 쉬워요. 예약·이동·비용을 번갈아 맡으면 부담이 줄어요.', '관계가 바쁠 때 쉽게 흐트러질 수 있어요. 주 1회처럼 현실적으로 가능한 고정 루틴을 만들어보세요.'],
      sharedStrong: ['둘 다 토 기운이 강하면 안정적인 생활 리듬과 신뢰를 만들기 쉬워요. 다만 익숙한 방식이 굳어지면 고집 대결이 될 수 있어요.', '서로 책임감이 있어 장기 관계에 강하지만, 챙긴 일을 마음속으로 계산하면 서운함이 쌓여요. 고마움을 자주 말해주세요.', '평범한 일상을 함께 보내는 만족도가 높지만 변화가 부족해질 수 있어요. 가끔은 한 사람이 새로운 코스를 맡아보세요.', '현실적인 문제를 잘 처리하지만 감정 표현이 업무처럼 변할 수 있어요. 해결 후에는 반드시 위로나 애정 표현도 덧붙여주세요.'],
      sharedGap: ['둘 다 토 기운이 약하면 약속·돈·일정 관리가 흐트러질 수 있어요. 공동 캘린더에 확정 사항만 기록해보세요.', '관계가 감정에 따라 움직여 안정감이 떨어질 수 있어요. 지킬 수 있는 연락·만남 주기를 먼저 정해주세요.', '서로 챙김을 기다리다 실망할 수 있어요. 필요한 도움은 눈치보다 구체적인 요청으로 말하는 편이 좋아요.', '장기 계획이 막연하게 남기 쉬워요. 한 달 단위로 비용과 일정을 점검하는 짧은 대화가 도움이 돼요.'],
      romantic: ['정해진 날에 만나 밥을 먹고 서로의 일상을 챙기는 모습에서 사랑을 확인하는 커플이에요.', '아플 때 필요한 것을 챙기거나 약속을 지키는 행동이 가장 큰 애정 표현이 돼요.', '화려한 이벤트보다 함께 장을 보고 식사하는 평범한 시간이 오래 기억에 남아요.', '반복되는 일상 속에서도 자리를 지켜주는 태도에서 깊은 안정감을 느껴요.', '둘만의 고정 루틴이 생길수록 관계에 대한 믿음이 단단해지는 커플이에요.'],
      summary: ['약속과 일상을 꾸준히 지키며 관계에 안정감을 만드는 모습', '힘든 날에도 자리를 지키고 실제 필요한 것을 챙기는 모습', '작은 책임을 나누며 오래 갈 수 있는 신뢰를 쌓는 모습', '감정의 변화에도 흔들리지 않고 관계의 중심을 잡아주는 모습', '함께하는 생활 리듬을 차근차근 만들어가는 모습'],
      keyword: ['안정', '신뢰', '꾸준함', '생활의 온기', '든든함', '함께 지키는 약속'],
      timeDetail: ['식사와 대화를 여유롭게 이어갈 수 있는 주말 낮이나 이른 저녁이 좋아요.', '서두르지 않아도 되는 오후에 함께 장을 보거나 요리하는 일정을 넣어보세요.', '규칙적인 생활 리듬을 깨지 않는 편안한 저녁 시간이 잘 맞아요.', '오래 머물 수 있는 장소에서 식사와 산책을 한 코스로 이어보세요.'],
      places: ['조용한 식당', '전통시장', '베이커리 카페', '공원', '한옥 거리', '요리 스튜디오', '도자기 공방', '근교 펜션', '대형 서점', '식물 카페', '동네 산책길', '브런치 카페'],
      dateIdeas: ['함께 장을 본 뒤 한 끼를 천천히 만들어 먹기', '각자 좋아하는 반찬이나 디저트를 하나씩 골라 소박한 식탁 만들기', '다음 달 일정과 예산을 카페에서 편안하게 맞춰보기', '오래 걷지 않아도 되는 공원에서 도시락 먹기', '둘만의 정기 데이트 요일과 작은 루틴 정하기', '서로 필요한 생활용품을 골라주며 취향 알아가기', '사진을 정리하며 지난 데이트 중 좋았던 순간 다시 이야기하기', '도자기·베이킹처럼 결과물이 남는 체험 함께하기'],
      help: [(s,r)=>`${s}님은 ${r}님이 일정이나 생활 문제로 흔들릴 때 해야 할 일을 차근차근 정리해주는 편이에요.`,(s,r)=>`${s}님은 ${r}님이 지쳐 있을 때 말보다 실제 필요한 것을 챙겨 안정감을 줄 수 있어요.`,(s,r)=>`${s}님은 ${r}님이 불안해할 때 변하지 않는 태도와 약속으로 신뢰를 만들어줘요.`,(s,r)=>`${s}님은 ${r}님의 계획이 흐트러질 때 현실적으로 가능한 순서를 함께 잡아주는 역할을 하기 쉬워요.`],
    },
    금: {
      core: ['기준과 원칙이 분명하고 관계에서도 명확함을 원하는 편', '약속과 예의를 지키는 태도에서 신뢰를 판단하는 편', '문제의 핵심을 빠르게 정리하고 결론을 내리려는 편', '서로의 경계와 역할이 분명할 때 편안해지는 편', '말과 행동이 일치하는지를 중요하게 보는 편', '관계를 애매하게 두기보다 정의하고 정돈하려는 편'],
      love: ['약속을 지키는 태도와 분명한 존중', '말과 행동이 일치하는 신뢰', '서로의 경계를 함부로 넘지 않는 배려', '관계를 애매하게 두지 않는 확실함', '함께 정한 기준을 성실하게 지키는 모습'],
      strength: ['문제를 정확히 짚고 건강한 경계를 세우는 능력', '복잡한 상황에서 핵심과 우선순위를 정하는 능력', '약속과 역할을 분명하게 만들어 신뢰를 높이는 능력', '상대의 권리와 선택을 존중하는 기준을 만드는 능력', '관계에 필요한 결정을 미루지 않는 능력'],
      shadow: ['실망하면 말이 단호해지고 상대를 평가하는 태도', '정답을 찾으려다 감정의 맥락을 놓치는 태도', '약속 위반을 오래 기억하며 점수처럼 계산하는 태도', '자신의 기준을 보편적인 기준처럼 적용하는 태도', '사과보다 잘잘못을 먼저 따지는 태도'],
      repair: ['지적보다 “나는 이렇게 해줬으면 좋겠어”라는 요청으로 말하는 것', '문제를 해결하기 전에 상대의 감정을 한 문장으로 확인하는 것', '잘못된 점만큼 잘하고 있는 점도 구체적으로 표현하는 것', '모든 기준을 한 번에 맞추려 하지 말고 가장 중요한 한 가지부터 합의하는 것', '판단을 내리기 전에 상대가 그렇게 행동한 이유를 먼저 듣는 것'],
      activity: ['운동 챌린지', '재정 계획 세우기', '정리·수납 데이트', '목표형 보드게임', '전시·건축 탐방'],
      missing: ['금 기운이 비어 있으면 연락·돈·친구 관계처럼 민감한 기준을 말하지 못해 문제가 길어질 수 있어요. 불편해지기 전에 선을 구체적으로 정해주세요.', '서로 원하는 관계의 정의가 애매할 수 있어요. 독점성·연락 방식·공개 범위를 직접 확인하는 편이 좋아요.', '싫은 일을 참다가 갑자기 거리를 둘 수 있어요. 작은 불편도 요청형 문장으로 일찍 말해주세요.', '결정을 미루며 상대의 눈치를 볼 수 있어요. 선택 기준을 세 개 이하로 줄여 함께 결론을 내보세요.'],
      weak: ['금 기운이 약하면 경계와 기준을 분명히 말하기 어려워요. 연락 빈도나 약속 변경 기준부터 구체적으로 합의해보세요.', '상대에게 맞추다가 뒤늦게 억울함이 생길 수 있어요. 가능한 것과 어려운 것을 미리 구분해 말해주세요.', '결론을 미루다 문제가 오래 남을 수 있어요. 대화가 끝날 때 결정된 사항을 한 문장으로 확인해보세요.', '사과와 요청이 애매하게 섞일 수 있어요. “미안한 점”과 “앞으로 원하는 점”을 따로 말하면 명확해져요.'],
      sharedStrong: ['둘 다 금 기운이 강하면 약속과 예의를 잘 지켜 믿을 만한 관계가 돼요. 다만 지적이 많아지면 평가받는 느낌이 생길 수 있어요.', '문제 해결은 빠르지만 누가 더 옳은지 따지기 시작하면 감정이 뒤로 밀려요. 해결 전 위로 한 문장을 먼저 건네보세요.', '서로의 경계를 존중해 깔끔한 관계를 만들지만, 지나치게 독립적이면 거리감이 생길 수 있어요. 도움을 요청하는 연습도 필요해요.', '목표와 기준을 함께 세우는 데 강하지만 계획이 연애의 성과표가 되지 않게 여유로운 일정도 남겨두세요.'],
      sharedGap: ['둘 다 금 기운이 약하면 관계의 선과 약속이 애매해질 수 있어요. 연락·비용·친구 관계 기준을 미리 말로 맞춰두세요.', '불편한 일을 서로 참아 문제가 오래 끌 수 있어요. 감정이 작을 때 짧게 요청하는 습관을 만들어보세요.', '결정을 상대에게 미루다 책임 공방이 생길 수 있어요. 작은 선택부터 담당자를 번갈아 정해주세요.', '관계의 정의가 각자 다를 수 있어요. 기대하는 연애 방식과 지켜야 할 선을 구체적인 예로 확인해보세요.'],
      romantic: ['시간과 약속을 소중히 여기고 관계의 기준을 분명히 공유할 때 애정이 깊어져요.', '함께 세운 목표를 지키고 서로의 경계를 존중하는 모습이 신뢰로 이어지는 커플이에요.', '애매한 표현보다 확실한 약속과 행동에서 사랑을 확인하는 편이에요.', '서로의 시간을 존중하면서도 필요할 때 정확히 약속하는 연애가 잘 맞아요.', '문제를 깔끔하게 해결한 뒤 다시 따뜻하게 연결되는 과정에서 관계가 단단해져요.'],
      summary: ['연락·약속·돈 문제의 기준을 분명히 맞추며 신뢰를 만드는 모습', '서로의 경계를 존중하고 말과 행동을 일치시키는 모습', '복잡한 문제의 핵심을 정리하고 함께 결론을 내리는 모습', '관계를 애매하게 두지 않고 필요한 약속을 분명히 세우는 모습', '상대의 선택과 시간을 존중하며 건강한 거리를 지키는 모습'],
      keyword: ['명확함', '존중', '약속', '균형 잡힌 경계', '정돈', '신뢰의 기준'],
      timeDetail: ['일정이 명확한 주말 오후에 예약된 전시나 체험을 여유 있게 즐겨보세요.', '약속 시간을 지키기 쉬운 이른 저녁에 한 가지 목적이 분명한 데이트가 좋아요.', '사람이 너무 붐비지 않는 시간에 전시·건축·서점처럼 집중할 공간을 골라보세요.', '계획과 휴식의 경계가 분명한 반나절 코스로 부담 없이 만나보세요.'],
      places: ['미술관', '건축 전시', '대형 서점', '보드게임 카페', '공예 전시관', '전망대', '정갈한 레스토랑', '기록관·박물관', '스포츠 센터', '디자인 편집숍', '주얼리 공방', '조용한 와인바가 아닌 티룸'],
      dateIdeas: ['서로 중요하게 생각하는 연애 원칙을 세 가지씩 이야기하기', '전시를 본 뒤 가장 인상 깊었던 작품 하나를 골라 이유 나누기', '공동 목표를 하나 정하고 현실적인 일정표 만들기', '서로에게 필요한 연락 방식과 혼자만의 시간을 구체적으로 맞춰보기', '보드게임이나 방탈출처럼 규칙이 분명한 활동 함께하기', '각자 사고 싶던 물건의 기준을 설명하고 서로 골라주기', '한 달 지출 계획 중 함께 쓸 데이트 예산을 가볍게 정하기', '서로 잘 지켜준 약속을 세 가지씩 말하며 인정해주기'],
      help: [(s,r)=>`${s}님은 ${r}님이 결정을 미룰 때 선택 기준을 정리하고 결론을 내리도록 돕는 편이에요.`,(s,r)=>`${s}님은 ${r}님이 관계의 선을 잡지 못할 때 서로 지켜야 할 기준을 분명하게 만드는 역할을 할 수 있어요.`,(s,r)=>`${s}님은 ${r}님이 복잡한 문제에 흔들릴 때 핵심과 우선순위를 정리해줘요.`,(s,r)=>`${s}님은 ${r}님이 불편함을 말하기 어려워할 때 요청을 구체적인 문장으로 바꾸는 데 도움을 줄 수 있어요.`],
    },
    수: {
      core: ['상황을 충분히 관찰하고 속으로 정리한 뒤 움직이는 편', '표면보다 상대의 속마음과 분위기를 깊게 읽는 편', '혼자 생각할 여유가 있어야 감정을 정확히 말하는 편', '서두르기보다 흐름을 보며 유연하게 대응하는 편', '깊은 대화와 조용한 친밀감을 선호하는 편', '감정을 바로 드러내기보다 오래 품고 이해하려는 편'],
      love: ['간섭받지 않는 여유와 깊이 있는 대화', '말하지 않은 마음까지 천천히 이해해주는 태도', '조용히 곁을 지켜주는 안정감', '각자의 시간을 존중한 뒤 다시 연결되는 편안함', '성급한 결론 없이 끝까지 들어주는 모습'],
      strength: ['상대의 속마음을 읽고 상황에 유연하게 대응하는 능력', '복잡한 감정을 차분히 정리하도록 돕는 능력', '서두르지 않고 관계의 깊이를 키우는 능력', '말보다 분위기와 맥락을 세심하게 살피는 능력', '갈등 속에서도 여러 가능성을 열어두는 능력'],
      shadow: ['갈등이 부담스러우면 말을 줄이고 속마음을 감추는 태도', '생각이 많아져 답이나 행동을 지나치게 미루는 태도', '상대가 알아차리길 기다리며 직접 표현하지 않는 태도', '상처를 피하려고 관계에서 조용히 멀어지는 태도', '상황을 이해하려다 자신의 욕구를 뒤로 미루는 태도'],
      repair: ['혼자 정리할 시간을 갖되 언제 다시 이야기할지 약속하는 것', '생각이 끝날 때까지 침묵하기보다 현재 상태를 한 문장으로 알려주는 것', '상대의 감정을 이해한 뒤 자신의 필요도 분명히 말하는 것', '답을 미루더라도 가능한 시한을 구체적으로 정하는 것', '피하고 싶은 마음이 들 때 관계를 끊기보다 대화의 속도를 낮추는 것'],
      activity: ['야경 산책', '조용한 카페 대화', '영화 감상', '서점 데이트', '물가·강변 산책'],
      missing: ['수 기운이 비어 있으면 감정이 올라왔을 때 멈추고 생각할 여유가 부족할 수 있어요. 20분 정도 쉬고 다시 대화할 시각을 정해주세요.', '상대의 말을 끝까지 듣기 전에 결론을 낼 수 있어요. 해결책보다 먼저 상대가 느낀 감정을 한 문장으로 되짚어보세요.', '혼자 있는 시간과 감정 정리 과정이 부족해 피로가 쌓일 수 있어요. 각자의 휴식 시간을 관계 문제로 해석하지 않는 것이 좋아요.', '깊은 이야기를 피하고 활동만 늘릴 수 있어요. 한 달에 한 번은 조용히 속마음을 나누는 시간을 만들어보세요.'],
      weak: ['수 기운이 약하면 감정이 올라온 순간 바로 반응할 수 있어요. 잠깐 멈춘 뒤 핵심 한 가지를 골라 말해주세요.', '상대의 맥락을 충분히 듣기 전에 판단할 수 있어요. 질문을 하나 더 한 뒤 결론을 내리는 습관이 도움이 돼요.', '각자의 시간이 부족하면 관계 피로가 커질 수 있어요. 혼자 쉬는 시간을 미리 알려 오해를 줄여주세요.', '속이야기가 얕아져 관계가 겉돌 수 있어요. 결과보다 과정과 감정을 묻는 질문을 자주 해보세요.'],
      sharedStrong: ['둘 다 수 기운이 강하면 깊은 대화와 조용한 시간을 편하게 느껴요. 다만 속마음을 먼저 꺼내지 않아 괜찮은 척 지나칠 수 있어요.', '서로의 분위기를 잘 읽지만 추측만으로 결론을 내리면 오해가 길어져요. 중요한 감정은 직접 확인해주세요.', '각자의 시간을 존중해 편안하지만 연락이 뜸해지면 관계가 멀어진 것처럼 보일 수 있어요. 다시 연결될 시간을 약속해두세요.', '갈등을 크게 만들지 않는 대신 문제를 미룰 수 있어요. 생각할 시간을 가진 뒤 반드시 대화를 마무리해주세요.'],
      sharedGap: ['둘 다 수 기운이 약하면 싸운 뒤 감정을 가라앉히는 과정이 부족할 수 있어요. 쉬는 시간과 재대화 시각을 함께 정해주세요.', '상대의 말을 충분히 듣기 전에 결론을 내릴 수 있어요. 한 사람씩 3분 동안 끊지 않고 말하는 방식을 써보세요.', '각자의 휴식이 부족해 사소한 일에도 예민해질 수 있어요. 혼자 쉬는 시간을 미리 존중해주세요.', '깊은 대화가 줄어 서로의 속마음을 놓칠 수 있어요. 일주일에 한 번은 해결책 없이 감정만 묻는 시간을 만들어보세요.'],
      romantic: ['시끄러운 자리보다 둘만의 카페나 밤 산책에서 속이야기를 오래 나누는 커플이에요.', '계속 붙어 있기보다 각자의 시간을 보낸 뒤 다시 만날 때 편안함을 느껴요.', '말이 없어도 함께 쉬는 시간이 친밀감으로 느껴지는 연애를 하기 쉬워요.', '영화·음악·야경처럼 같은 감정을 천천히 공유할 때 관계가 깊어져요.', '서로의 속도를 재촉하지 않고 마음이 열릴 때까지 기다려주는 모습이 큰 사랑 표현이 돼요.'],
      summary: ['서둘러 결론을 내리지 않고 서로의 이야기를 끝까지 듣는 모습', '각자의 시간을 존중하면서 깊은 대화로 다시 연결되는 모습', '말하지 않은 감정까지 천천히 살피며 관계를 부드럽게 조율하는 모습', '감정이 복잡할 때 조용히 곁을 지키고 마음을 정리하게 돕는 모습', '빠른 반응보다 깊은 이해를 선택하며 친밀감을 쌓는 모습'],
      keyword: ['깊이', '여유', '공감', '조용한 친밀감', '유연함', '마음의 흐름'],
      timeDetail: ['사람이 적고 대화가 길어지는 늦은 저녁이나 밤 산책 시간이 잘 맞아요.', '서두를 필요 없는 주말 저녁에 영화와 카페를 천천히 이어보세요.', '조용한 오후 늦게 만나 해 질 무렵까지 같은 공간에 머물러보세요.', '각자 할 일을 마친 뒤 부담 없이 만나는 밤 시간에 속이야기가 자연스럽게 나와요.'],
      places: ['강변 산책길', '야경 명소', '조용한 카페', '독립영화관', '아쿠아리움', '북카페', '호수 공원', 'LP 음악 카페', '천문대', '한적한 해변', '차분한 전시관', '프라이빗한 티룸'],
      dateIdeas: ['서로 좋아하는 영화를 본 뒤 결말보다 느낀 감정 이야기하기', '야경을 걸으며 요즘 마음에 가장 많이 남는 일 하나씩 말하기', '각자 책 한 권을 골라 조용히 읽고 인상 깊은 문장 나누기', '휴대폰을 잠시 내려두고 차나 커피를 천천히 마시기', '서로에게 필요한 혼자만의 시간과 다시 연락할 방식을 맞춰보기', '같은 플레이리스트를 들으며 말없이 산책하기', '아쿠아리움이나 물가에서 천천히 걷고 사진 한 장씩 남기기', '최근 힘들었던 일에 해결책 없이 공감만 해주는 대화 해보기'],
      help: [(s,r)=>`${s}님은 ${r}님이 감정이 복잡할 때 답을 재촉하지 않고 충분히 이야기할 여유를 만들어줘요.`,(s,r)=>`${s}님은 ${r}님의 말 뒤에 숨은 마음을 살피고 상황을 부드럽게 조율하는 편이에요.`,(s,r)=>`${s}님은 ${r}님이 지쳤을 때 조용히 곁을 지키며 마음을 정리할 시간을 줄 수 있어요.`,(s,r)=>`${s}님은 ${r}님이 한 가지 결론에 갇혔을 때 다른 가능성을 함께 살펴보도록 도와줘요.`],
    },
  };

  const RELATION_VARIATION_BANK = {
    상생: {
      lover: ['서로의 부족한 부분을 자연스럽게 채워줘요', '한 사람이 시작하면 다른 사람이 편안하게 이어줘요', '힘든 순간에 서로의 회복 속도를 높여주는 편이에요', '각자의 장점이 관계 안에서 더 잘 드러나요', '함께 있을 때 자신감과 안정감이 함께 커져요', '배려가 일방향보다 주고받는 흐름으로 이어지기 쉬워요', '다툰 뒤에도 관계를 다시 살리는 힘이 비교적 좋아요', '공동 목표를 세울 때 역할 분담이 자연스럽게 이루어져요'],
      friend: ['필요할 때 먼저 떠오르는 친구가 되기 쉬워요', '한 사람이 지치면 다른 사람이 자연스럽게 힘을 보태요', '서로 다른 장점으로 실제 도움을 주고받는 편이에요', '같이 움직일수록 자신감이 살아나는 친구 관계예요', '오래 만나도 경쟁보다 응원의 흐름이 강해요', '힘든 일을 말했을 때 현실적인 도움과 정서적 지지를 함께 받을 수 있어요'],
      quotes: ['너와 있으면 내 장점이 더 잘 보이는 것 같아.', '혼자였으면 미뤘을 일도 너와는 해볼 수 있어.', '힘들 때 네가 내 편이라는 느낌이 들어.', '우리는 서로 다른데 이상하게 손발이 잘 맞아.'],
    },
    상극: {
      lover: ['서로에게 없는 매력이 강하게 보여 빠르게 끌릴 수 있어요', '좋아하는 만큼 방식의 차이도 선명하게 느껴져요', '한쪽의 장점이 다른 쪽에게는 압박으로 느껴질 수 있어요', '갈등을 잘 다루면 서로의 시야를 크게 넓혀주는 관계예요', '감정과 생활 속도가 달라 밀고 당기는 장면이 생기기 쉬워요', '자존심 싸움보다 역할과 기준을 나누면 강한 팀이 될 수 있어요', '다툼 뒤 화해 방식이 관계의 만족도를 크게 좌우해요', '차이를 고치려 하기보다 활용할 때 관계의 매력이 살아나요'],
      friend: ['친한 만큼 서로의 약점을 빠르게 건드릴 수 있어요', '의견은 자주 다르지만 중요한 순간에는 새로운 관점을 줘요', '경쟁심이 생기기 쉬워 역할을 분명히 나누는 편이 좋아요', '티격태격해도 서로에게 자극이 되는 친구 관계예요', '말투와 결정 속도 차이에서 피로가 쌓일 수 있어요', '차이를 인정하면 서로 부족한 점을 가장 잘 알려주는 친구가 돼요'],
      quotes: ['좋아하는데 왜 이렇게 방식이 다르지?', '너 때문에 힘들기도 하지만 많이 배우기도 해.', '같은 목표를 보는데 가는 길이 자꾸 달라.', '부딪히는 만큼 서로에게 강하게 끌리는 것 같아.'],
    },
    동기: {
      lover: ['반응과 취향이 비슷해 빠르게 가까워져요', '설명하지 않아도 상대의 기분을 짐작하기 쉬워요', '친구 같은 편안함이 연애의 큰 장점이 돼요', '같이 놀고 쉬는 방식이 비슷해 일상 호흡이 좋아요', '비슷한 약점까지 공유해 어려운 일을 함께 미룰 수 있어요', '둘 다 고집을 부리는 순간에는 먼저 양보하기 어려워요', '유머 코드와 감정 속도가 닮아 친밀감이 빨리 생겨요', '익숙함에 기대지 않고 애정 표현을 의식적으로 해주는 것이 좋아요'],
      friend: ['관심사와 반응이 비슷해 금방 친해져요', '설명이 짧아도 바로 알아듣는 장면이 많아요', '같이 놀 때 에너지와 속도가 잘 맞아요', '비슷한 약점 때문에 준비나 결정을 함께 미룰 수 있어요', '오랜만에 만나도 대화의 흐름이 빠르게 살아나요', '서로 닮았다는 이유로 마음을 다 안다고 단정하지 않는 것이 좋아요'],
      quotes: ['너와 있으면 내 생각을 설명할 필요가 적어.', '우리 둘은 웃는 포인트도 참 비슷해.', '편한데 가끔은 너무 닮아서 고집도 같이 세져.', '친구처럼 편한데 연인다운 표현도 잊지 말자.'],
    },
    중립: {
      lover: ['처음부터 강렬하기보다 시간을 두고 신뢰가 쌓여요', '큰 충돌은 적지만 관계를 움직일 계기가 필요할 수 있어요', '서로 부담을 주지 않아 편안한 일상형 관계가 되기 쉬워요', '공통 경험이 늘어날수록 애정의 깊이가 커져요', '누가 먼저 이끌지 기다리면 관계가 정체될 수 있어요', '작은 약속을 꾸준히 지키는 것이 강한 설렘보다 중요해요', '각자의 생활을 존중하면서 천천히 가까워지는 편이에요', '특별한 사건보다 반복되는 일상에서 관계의 진가가 드러나요'],
      friend: ['오랜만에 만나도 부담 없이 이어지는 친구 관계예요', '연락이 뜸해도 크게 서운하지 않은 편이에요', '같은 취미나 정기적인 약속이 있을 때 더 가까워져요', '필요할 때 편하게 만날 수 있는 안정적인 친구가 되기 쉬워요', '큰 갈등은 적지만 서로 먼저 연락하지 않을 수 있어요', '생활 변화가 생기면 의식적으로 안부를 이어가는 것이 좋아요'],
      quotes: ['천천히 알아갈수록 더 편해지는 것 같아.', '특별한 일은 없어도 같이 있으면 안정돼.', '우리 사이는 작은 약속이 쌓일수록 깊어져.', '자주 보지 않아도 다시 만나면 편안해.'],
    },
  };

  const PAIR_CONFLICT_VARIATIONS = {
    '목+목': ['둘 다 하고 싶은 일이 많아 계획은 풍부하지만 마무리 담당이 모호해질 수 있어요.', '서로의 성장 방향이 다르면 응원이 경쟁처럼 느껴질 수 있어요.', '새로운 제안을 동시에 꺼내 일정과 예산이 과해질 수 있으니 우선순위를 하나만 정하세요.'],
    '목+화': ['한 사람은 다음 계획으로 빠르게 넘어가고 다른 사람은 지금의 감정을 더 확인받고 싶어 속도가 엇갈릴 수 있어요.', '아이디어와 반응이 모두 빨라 즉흥적인 약속이 늘지만, 뒤늦게 피로와 비용 문제가 생길 수 있어요.', '목의 조언이 화에게는 찬물처럼 느껴지고 화의 즉각적인 반응이 목에게는 계획을 흔드는 것처럼 보일 수 있어요.'],
    '목+토': ['변화를 시작하려는 쪽과 안정성을 확인하려는 쪽이 결정 시점을 두고 다툴 수 있어요.', '목은 토를 답답하다고 느끼고 토는 목을 성급하다고 느끼기 쉬워 검토 기간을 함께 정하는 것이 좋아요.', '여행·이사·돈처럼 큰 계획에서 새로움과 안전의 비중을 먼저 합의하세요.'],
    '목+금': ['자유롭게 시도하려는 태도와 기준을 먼저 세우려는 태도가 부딪힐 수 있어요.', '금의 조언이 목에게 통제로 느껴지고 목의 즉흥성이 금에게 무책임하게 보일 수 있어요.', '아이디어를 제한하기보다 실험 가능한 범위와 반드시 지킬 기준을 나눠 정해주세요.'],
    '목+수': ['목은 다음 행동을 빨리 정하고 싶고 수는 충분히 생각한 뒤 움직이고 싶어 답변 속도에서 서운함이 생겨요.', '수의 침묵이 목에게 무관심처럼 보이고 목의 재촉이 수에게 압박으로 느껴질 수 있어요.', '생각할 시간을 주되 언제 다시 결정할지 시점을 분명히 약속하는 방식이 좋아요.'],
    '화+화': ['둘 다 감정과 표현이 빨라 화해도 빠르지만 싸움의 강도도 커질 수 있어요.', '상대의 표정과 말투에 즉각 반응해 확인되지 않은 감정을 사실처럼 받아들일 수 있어요.', '서운함 경쟁이 시작되면 한 사람씩 말하고 다른 사람은 요약만 하는 규칙이 필요해요.'],
    '화+토': ['즉흥적인 만남과 표현을 원하는 쪽과 정해진 일정과 꾸준함을 원하는 쪽이 엇갈릴 수 있어요.', '화는 토의 차분함을 무관심으로, 토는 화의 변화를 불안정함으로 해석할 수 있어요.', '즉흥적으로 바꿔도 되는 약속과 반드시 지킬 약속을 구분하면 갈등이 줄어요.'],
    '화+금': ['감정과 분위기를 따라 한 말이 금에게는 정확한 약속으로 기억될 수 있어요.', '금의 단호한 지적이 화에게 사랑이 식은 신호처럼 느껴질 수 있어요.', '감정 표현과 실제 결정 사항을 분리해 확인하는 습관이 필요해요.'],
    '화+수': ['화는 지금 바로 말하고 싶고 수는 혼자 정리한 뒤 말하고 싶어 재대화 시점이 가장 중요해요.', '화의 빠른 확인 요구가 수를 숨게 만들고 수의 침묵은 화의 불안을 키울 수 있어요.', '쉬는 시간을 갖되 연락을 끊지 말고 다시 이야기할 정확한 시각을 정해주세요.'],
    '토+토': ['둘 다 익숙한 생활을 지키려 해 안정적이지만 변화가 필요할 때 고집 대결이 될 수 있어요.', '챙긴 일과 희생을 마음속으로 계산하면 작은 불균형도 오래 남아요.', '돈·집안일·주말 루틴을 정기적으로 바꾸거나 재협상하는 시간이 필요해요.'],
    '토+금': ['둘 다 책임을 중요하게 여기지만 일정과 비용을 너무 정확히 따지면 관계가 평가처럼 느껴질 수 있어요.', '토는 정을 앞세우고 금은 기준을 앞세워 같은 책임감도 다른 언어로 표현할 수 있어요.', '역할을 정하되 예외와 여유를 허용하는 범위도 함께 합의하세요.'],
    '토+수': ['토는 관계의 확답과 안정성을 원하고 수는 상황에 맞춰 움직일 여유가 필요해 부담이 생길 수 있어요.', '수의 유연함이 토에게는 불확실함으로, 토의 확인이 수에게는 간섭으로 느껴질 수 있어요.', '결정이 필요한 항목과 아직 열어둘 항목을 구분해서 말해주세요.'],
    '금+금': ['둘 다 문제를 빠르게 발견하지만 누가 더 옳은지 따지면 사과보다 지적이 길어질 수 있어요.', '기준이 비슷해 신뢰는 높지만 작은 약속 위반도 크게 평가할 수 있어요.', '판단 전에 각자 인정할 점 하나를 먼저 말하면 방어적인 분위기가 줄어요.'],
    '금+수': ['금은 분명한 결론을 원하고 수는 맥락과 감정을 더 살피고 싶어 애매한 답과 단호한 말투에서 상처가 생겨요.', '수의 여운 있는 표현이 금에게는 회피로, 금의 명확함이 수에게는 차가움으로 느껴질 수 있어요.', '결론을 낼 시간과 감정을 듣는 시간을 따로 배치하는 것이 좋아요.'],
    '수+수': ['둘 다 상대가 먼저 말해주길 기다리면 겉으로 조용해도 서운함이 길어질 수 있어요.', '서로를 배려한다며 침묵하지만 실제로는 각자 다른 추측을 키울 수 있어요.', '생각할 시간을 가진 뒤 먼저 연락할 사람과 시간을 미리 정해두세요.'],
  };

  const DIRECTION_PAIR_VARIATIONS = {
    '목>화': [(a,b)=>`${a}님이 새로운 아이디어를 꺼내면 ${b}님이 빠른 반응과 표현으로 실제 분위기를 살리는 조합이에요.`,(a,b)=>`${a}님이 관계의 다음 방향을 제안하고 ${b}님이 설렘과 추진력을 더할 때 가장 자연스럽게 움직여요.`],
    '화>토': [(a,b)=>`${a}님이 따뜻한 표현으로 마음을 열면 ${b}님이 꾸준한 연락과 약속으로 그 온기를 오래 유지하는 조합이에요.`,(a,b)=>`${a}님이 관계의 온도를 높이고 ${b}님이 생활 속 안정감으로 받쳐줄 때 애정이 일상에 자리 잡아요.`],
    '토>금': [(a,b)=>`${a}님이 현실적인 기반을 만들면 ${b}님이 기준과 결론을 정리해 장기 계획을 구체화하는 조합이에요.`,(a,b)=>`${a}님이 차분히 상황을 지탱하고 ${b}님이 필요한 결정을 내릴 때 돈·일정·역할 문제를 잘 풀어요.`],
    '금>수': [(a,b)=>`${a}님이 문제의 핵심과 경계를 정리하면 ${b}님이 감정과 맥락을 살펴 더 부드러운 방법을 찾는 조합이에요.`,(a,b)=>`${a}님이 방향을 선명하게 잡고 ${b}님이 상대의 마음과 상황을 조율할 때 균형이 좋아져요.`],
    '수>목': [(a,b)=>`${a}님이 충분히 듣고 기다려주면 ${b}님이 자신감을 얻어 새로운 계획을 시작하는 조합이에요.`,(a,b)=>`${a}님이 생각할 여유와 정서적 안전감을 만들고 ${b}님이 그 힘을 실제 변화로 이어가요.`],
    '목>토': [(a,b)=>`${a}님은 변화를 앞당기려 하고 ${b}님은 기반을 확인하려 해, 큰 결정일수록 검토 기간을 함께 정해야 해요.`,(a,b)=>`${a}님의 성장 욕구가 ${b}님에게 재촉으로 느껴질 수 있어, 바꿀 부분과 유지할 부분을 나누는 것이 좋아요.`],
    '토>수': [(a,b)=>`${a}님은 관계를 안정시키려 하고 ${b}님은 여유를 남기려 해, 확답이 필요한 범위를 구분해야 해요.`,(a,b)=>`${a}님의 꾸준한 확인이 ${b}님에게 부담이 되지 않도록 생각할 시간과 답변 시점을 함께 약속해주세요.`],
    '수>화': [(a,b)=>`${a}님은 충분히 생각하려 하고 ${b}님은 즉시 반응하려 해, 감정을 식힐 시간과 재대화 시점을 정하는 것이 핵심이에요.`,(a,b)=>`${a}님의 침묵과 ${b}님의 빠른 표현이 서로를 불안하게 만들 수 있어 현재 상태를 짧게라도 알려주는 편이 좋아요.`],
    '화>금': [(a,b)=>`${a}님은 순간의 감정과 분위기를 중시하고 ${b}님은 약속과 일관성을 중시해, 표현과 결정을 분리할 필요가 있어요.`,(a,b)=>`${a}님의 즉흥성과 ${b}님의 명확한 기준이 부딪힐 수 있으니 자유롭게 바꿔도 되는 범위를 미리 정해주세요.`],
    '금>목': [(a,b)=>`${a}님은 문제를 정확히 고치려 하고 ${b}님은 시도하며 배우려 해, 지적보다 요청의 언어가 중요해요.`,(a,b)=>`${a}님의 기준이 ${b}님에게 통제로 느껴지지 않도록 반드시 지킬 선과 자유롭게 실험할 영역을 나눠주세요.`],
  };

  const RELATION_FLOW_VARIATIONS = {
    strongGood: ['초반의 호감이 시간이 지나며 신뢰와 공동 목표로 이어지는 관계예요.', '가까워질수록 서로의 역할이 자연스럽게 나뉘고 실제 생활에서 든든함이 커져요.', '정서적 호흡과 현실적인 보완이 함께 있어 장기 계획을 세울 때 강점이 드러나요.'],
    clashStrong: ['끌림과 긴장이 함께 큰 관계라 다툴 때의 규칙이 관계 만족도를 좌우해요.', '관계가 빠르게 깊어질 수 있지만 서로를 바꾸려 하면 감정의 진폭도 커져요.', '차이를 인정하고 결정권을 나누면 강한 에너지가 성장 동력으로 바뀔 수 있어요.'],
    sameNoComplement: ['친구처럼 빠르게 가까워지지만 둘 다 어려워하는 일은 함께 미룰 수 있어요.', '취향과 반응은 잘 맞지만 약속 잡기·사과하기·생활 관리에서는 담당을 나누는 것이 좋아요.', '설명하지 않아도 통하는 장점이 크지만 같은 약점을 상대가 채워줄 것이라 기대하지 마세요.'],
    dayGood: ['겉보기보다 가까워질수록 정서적 편안함이 커지는 관계예요.', '둘만의 일상과 대화가 쌓일수록 애정이 안정되는 흐름이에요.', '화려한 이벤트보다 함께 쉬고 식사하는 평범한 시간이 관계를 단단하게 만들어요.'],
    dayBad: ['초반의 매력과 별개로 가까워진 뒤에는 감정 속도와 생활 기준을 조율해야 해요.', '좋아하는 마음만으로 넘기기 어려운 반복 갈등이 있어, 구체적인 관계 규칙이 필요해요.', '서로를 고치기보다 꼭 지킬 기준과 양보 가능한 부분을 나눌수록 오래 갈 수 있어요.'],
    neutral: ['함께 지내며 정이 차곡차곡 쌓이는 관계라 꾸준한 공통 경험이 중요해요.', '처음의 강렬함보다 반복되는 연락과 약속이 친밀감을 키워주는 관계예요.', '정기적으로 함께할 취미나 루틴을 만들면 관계가 자연스럽게 깊어져요.'],
  };

  const RELATION_SCENE_VARIATIONS = {
    상생: ['한 사람이 마음이나 계획을 꺼내면 다른 사람이 자연스럽게 호응해주는 장면이 많아요.', '안부를 챙기고 필요한 순간에 먼저 움직이는 행동에서 사랑을 확인하기 쉬워요.', '서로 다른 장점이 번갈아 드러나 한쪽만 관계를 끌고 간다는 느낌이 적어요.'],
    상극: ['서로에게 없는 매력이 강하게 보여 설렘과 긴장감이 함께 살아 있어요.', '데이트에서는 활기가 넘치지만 의견이 다를 때 감정도 크게 움직일 수 있어요.', '다툼과 화해의 방식까지 둘만의 규칙으로 만들 때 강한 끌림이 안정적인 애정으로 바뀌어요.'],
    동기: ['친구 같은 편안함과 연인다운 장난스러움이 함께 있는 커플이에요.', '같은 이야기에 웃고 별일 없는 날에도 메시지와 밈으로 친밀감을 쌓아요.', '익숙함이 큰 장점이지만 애정 표현까지 생략하지 않는 것이 좋아요.'],
    중립: ['자주 밥을 먹고 일상을 공유하면서 천천히 연인다운 정이 깊어져요.', '조용히 곁에 있어주는 시간과 꾸준한 연락이 화려한 이벤트보다 중요해요.', '각자의 생활을 존중하면서 약속한 순간에 성실하게 반응하는 연애가 잘 맞아요.'],
    dayGood: ['둘만 있을 때 경계가 빨리 풀려 속마음과 스킨십 표현이 비교적 자연스러워요.', '피곤한 날에는 특별한 일을 하지 않아도 함께 쉬고 식사하는 것만으로 가까움을 느껴요.', '감정을 방어하기보다 상대에게 기대는 장면이 자연스럽게 생기기 쉬워요.'],
    dayBad: ['가까워질수록 각자의 방식이 선명해져 애정 표현의 속도를 맞추는 과정이 중요해요.', '한 사람은 바로 확인받고 싶고 다른 사람은 생각할 시간이 필요할 수 있어요.', '좋아하는 마음과 편안한 방식이 다를 수 있어, 재촉과 침묵 사이의 규칙을 만들어야 해요.'],
    dayNeutral: ['각자 할 일을 하다가 자연스럽게 만나 쉬는 연애를 하기 쉬워요.', '연락 횟수보다 약속한 순간에 성실하게 반응하는 것이 더 중요해요.', '무리하게 일상에 끼어들기보다 편안한 거리와 꾸준한 만남을 유지해요.'],
  };

  function getPairVariation(profileA, profileB, seed) {
    const pair = [profileA.dominant, profileB.dominant].sort((a, b) => OHAENG_ORDER.indexOf(a) - OHAENG_ORDER.indexOf(b)).join('+');
    const pool = [ELEMENT_PAIR_CONFLICT[pair], ...(PAIR_CONFLICT_VARIATIONS[pair] || [])].filter(Boolean);
    return pickVariation(pool, seed, `pair-conflict:${pair}`) || '서로 중요하게 여기는 기준이 다른 상황에서는 연락 시점, 약속 방식, 말투 같은 작은 차이가 더 크게 느껴질 수 있어요.';
  }

  function buildDirectionText(profileA, profileB, direction, compat) {
    const seed = `${profileA.seed}|${profileB.seed}|${getCompatSignature(compat)}|${direction}`;
    if (direction === 'aGeneratesB' || direction === 'bGeneratesA') {
      const giver = direction === 'aGeneratesB' ? profileA : profileB;
      const receiver = direction === 'aGeneratesB' ? profileB : profileA;
      const key = `${giver.day}>${receiver.day}`;
      const pool = [SANGSAENG_PAIR_SCENE[key], ...(DIRECTION_PAIR_VARIATIONS[key] || [])].filter(Boolean);
      const fn = pickVariation(pool, seed, `direction:${key}`);
      return fn ? fn(giver.name, receiver.name) : `${giver.name}님이 먼저 힘을 보태고 ${receiver.name}님이 그 도움을 받아 움직이기 쉬운 관계예요.`;
    }
    if (direction === 'aControlsB' || direction === 'bControlsA') {
      const controller = direction === 'aControlsB' ? profileA : profileB;
      const receiver = direction === 'aControlsB' ? profileB : profileA;
      const key = `${controller.day}>${receiver.day}`;
      const pool = [SANGGEUK_PAIR_SCENE[key], ...(DIRECTION_PAIR_VARIATIONS[key] || [])].filter(Boolean);
      const fn = pickVariation(pool, seed, `direction:${key}`);
      return fn ? fn(controller.name, receiver.name) : `${controller.name}님이 기준을 먼저 정하고 ${receiver.name}님이 맞춰야 하는 상황이 반복될 수 있어요. 역할과 결정 범위를 미리 나누는 것이 좋아요.`;
    }
    if (direction === 'same') {
      const pool = [
        `두 사람은 ${profileA.day}(${OHAENG_HANJA[profileA.day]}) 일간이라 중요하게 여기는 점과 반응 속도가 비슷해요. 통하는 만큼 같은 문제에서 동시에 고집을 부릴 수 있어요.`,
        `두 사람 모두 ${profileA.day}(${OHAENG_HANJA[profileA.day]})의 기본 반응을 공유해 설명이 짧아도 통하기 쉬워요. 다만 상대도 자신과 같은 결론을 원할 것이라고 단정하지 마세요.`,
        `같은 ${profileA.day} 일간이라 친밀감은 빠르게 생기지만, 같은 약점까지 겹칠 수 있어 역할과 속도를 따로 확인하는 편이 좋아요.`,
      ];
      return pickVariation(pool, seed, 'direction:same');
    }
    return pickVariation([
      `${profileA.name}님과 ${profileB.name}님은 처음부터 누가 이끌고 누가 맞춰주는지가 정해진 관계는 아니에요. 공통 경험을 쌓을수록 친밀감이 커져요.`,
      `두 사람의 일간은 강한 생극 방향보다 각자의 선택과 생활 습관이 관계의 흐름을 더 크게 좌우해요.`,
      `자연스럽게 정해지는 역할이 적은 만큼 연락·약속·비용을 어떻게 나눌지 직접 합의할수록 관계가 편안해져요.`,
    ], seed, 'direction:neutral');
  }

  function buildPersonalizedPrimaryRecommendation(base, primaryElement, entryA, entryB, rec, inputA, inputB) {
    /*
     * 메인 추천 영역은 SajuCore가 계산한 기존 오행 기반 결과를 그대로 사용합니다.
     * 월지·일지 및 생년 미상 후보 분석은 상세 궁합 문장에만 반영하고,
     * 계절·시간대·색상·꽃·장소·데이트 추천을 덮어쓰지 않습니다.
     * 따라서 분석 기능을 추가해도 기존 입력의 메인 추천 결과가 달라지지 않습니다.
     */
    const original = base || {};
    const originalFlowerDetails = Array.isArray(original.flowerDetails) && original.flowerDetails.length
      ? original.flowerDetails
      : (original.flowers || []).map(name => ({ name, meaning: '', theme: '', reason: '' }));
    const originalDateIdeas = Array.isArray(original.dateIdeas) && original.dateIdeas.length
      ? original.dateIdeas
      : [original.dateTip].filter(Boolean);

    return {
      ...original,
      season: original.season,
      seasonDetail: original.seasonDetail,
      timeRange: original.timeRange,
      timeDetail: original.timeDetail,
      summary: original.summary,
      keyword: original.keyword,
      colors: Array.isArray(original.colors) ? [...original.colors] : [],
      flowers: Array.isArray(original.flowers)
        ? [...original.flowers]
        : originalFlowerDetails.map(item => item.name),
      flowerDetails: originalFlowerDetails.map(item => ({ ...item })),
      places: Array.isArray(original.places) ? [...original.places] : [],
      dateIdeas: [...originalDateIdeas],
      dateTip: original.dateTip,
    };
  }


  const TOUCH_CANDIDATES = [
    { id:'walking-hand', level:1, category:'hand', title:'산책할 때 손잡기', detail:'나란히 걸으면서 손을 가볍게 잡고, 대화가 편해지면 손가락을 자연스럽게 맞잡아보세요.', tags:['gentle','calm','trust','active','wood','neutral'] },
    { id:'hand-squeeze', level:1, category:'hand', title:'말 대신 손을 살짝 꼭 잡아주기', detail:'응원이 필요한 순간에 손을 한 번 꼭 잡아주면 긴 설명 없이도 “네 편이야”라는 마음을 전할 수 있어요.', tags:['gentle','reassurance','trust','earth','stable'] },
    { id:'fingertip-touch', level:1, category:'hand', title:'대화 중 손끝을 가볍게 맞대기', detail:'서로의 반응을 살피면서 손끝부터 가볍게 닿아보면 부담 없이 친밀감을 확인할 수 있어요.', tags:['consent','gentle','metal','calm','cautious'] },
    { id:'sleeve-hold', level:1, category:'playful', title:'사람 많은 곳에서 소매를 살짝 잡기', detail:'붐비는 장소에서 소매나 팔꿈치를 살짝 잡아주면 과하지 않으면서도 서로를 챙기는 느낌이 살아나요.', tags:['playful','active','reassurance','wood','same'] },
    { id:'back-pat', level:1, category:'comfort', title:'등을 천천히 토닥여주기', detail:'지치거나 속상한 날에는 해결책부터 말하기보다 가까이 앉아 등을 천천히 토닥여주는 편이 좋아요.', tags:['reassurance','comfort','gentle','repair','earth','friction'] },
    { id:'shoulder-touch', level:1, category:'comfort', title:'괜찮은지 물으며 어깨를 가볍게 감싸기', detail:'표정이 어두운 날에는 먼저 괜찮은지 묻고 어깨를 가볍게 감싸주면 관심과 존중을 함께 보여줄 수 있어요.', tags:['respectful','consent','reassurance','metal','cautious'] },

    { id:'arm-link', level:2, category:'playful', title:'팔짱 끼고 가까이 걷기', detail:'전시나 야경처럼 함께 둘러보는 데이트에서 팔짱을 끼면 장난스러운 친밀감과 활동적인 호흡이 살아나요.', tags:['playful','active','same','expressive','wood','fire'] },
    { id:'shoulder-lean', level:2, category:'comfort', title:'어깨에 기대어 조용히 쉬기', detail:'카페나 이동 중에는 계속 이야기하려 하기보다 어깨에 기대어 쉬는 시간이 편안함을 만들어줘요.', tags:['calm','comfort','stable','deepBond','water','neutral'] },
    { id:'brief-hug', level:2, category:'hug', title:'만날 때와 헤어질 때 짧게 안아주기', detail:'만남의 시작과 끝에 짧고 분명하게 안아주면 애정을 확인하면서도 서로에게 부담을 주지 않아요.', tags:['reassurance','trust','respectful','gentle','clear','metal'] },
    { id:'sit-close', level:2, category:'comfort', title:'나란히 앉아 몸을 가볍게 기대기', detail:'영화나 음악을 함께 볼 때 팔이나 어깨가 자연스럽게 닿는 정도의 거리에서 편안함을 쌓아보세요.', tags:['comfort','calm','same','neutral','stable','earth'] },
    { id:'hair-stroke', level:2, category:'care', title:'머리나 머리카락을 다정하게 쓰다듬기', detail:'피곤해 보이거나 긴장이 풀린 순간에 조심스럽게 머리를 쓰다듬으면 돌봄과 애정을 함께 전할 수 있어요.', tags:['comfort','reassurance','gentle','stable','trust','earth'] },
    { id:'hand-back-stroke', level:2, category:'hand', title:'손등을 천천히 쓰다듬기', detail:'대화를 나누면서 손등을 천천히 쓸어주면 말의 흐름을 끊지 않고도 다정함을 보여줄 수 있어요.', tags:['calm','romantic','gentle','deepBond','respectful','water'] },
    { id:'guide-back', level:2, category:'care', title:'길을 건널 때 등을 가볍게 받쳐주기', detail:'이동할 때 등을 가볍게 받쳐주거나 먼저 길을 살펴주면 생활 속에서 서로를 보호하는 느낌이 커져요.', tags:['active','care','trust','earth','wood','partnership'] },
    { id:'warm-hands', level:2, category:'hand', title:'차가운 손을 두 손으로 감싸주기', detail:'추운 날이나 긴장한 순간에 상대의 손을 두 손으로 감싸주면 안정감과 따뜻함을 자연스럽게 전할 수 있어요.', tags:['comfort','warmth','reassurance','earth','water','trust'] },

    { id:'long-hug', level:3, category:'hug', title:'말없이 조금 오래 안아주기', detail:'마음이 복잡한 날에는 대화를 서두르지 말고 서로의 호흡이 편안해질 때까지 잠시 안아주는 방식이 잘 맞아요.', tags:['comfort','deepBond','trust','stable','calm','water','earth'] },
    { id:'forehead-touch', level:3, category:'face', title:'이마를 살짝 맞대기', detail:'둘만의 조용한 순간에 눈을 마주보고 이마를 맞대면 말보다 진한 친밀감을 느끼기 쉬워요.', tags:['romantic','deepBond','calm','trust','water','good'] },
    { id:'forehead-kiss', level:3, category:'kiss', title:'이마에 다정하게 입맞추기', detail:'상대를 안심시키고 싶은 순간에는 강한 표현보다 이마에 짧게 입맞추는 다정한 방식이 잘 어울려요.', tags:['romantic','reassurance','trust','comfort','respectful','earth'] },
    { id:'cheek-kiss', level:3, category:'kiss', title:'볼에 가볍게 입맞추기', detail:'기분 좋은 만남이나 칭찬을 건넨 뒤 볼에 가볍게 입맞추면 밝고 장난스러운 애정 표현이 돼요.', tags:['playful','expressive','romantic','same','fire'] },
    { id:'brief-back-hug', level:3, category:'hug', title:'뒤에서 짧게 안아주기', detail:'요리하거나 함께 무언가를 준비할 때 먼저 반응을 확인한 뒤 짧게 안아주면 생활 속 설렘을 더할 수 있어요.', tags:['playful','romantic','care','fire','earth','consent'] },
    { id:'temple-kiss', level:3, category:'kiss', title:'관자놀이나 머리 옆에 입맞추기', detail:'상대가 지쳐 있을 때 관자놀이나 머리 옆에 짧게 입맞추면 위로와 애정을 동시에 전하기 좋아요.', tags:['reassurance','comfort','romantic','water','earth','trust'] },
    { id:'hand-kiss', level:3, category:'kiss', title:'손등에 장난스럽게 입맞추기', detail:'분위기가 밝은 날에는 손등에 가볍게 입맞추며 장난스럽고 특별한 애정 표현을 만들어보세요.', tags:['playful','romantic','expressive','fire','metal','same'] },
    { id:'cuddle-shoulder', level:3, category:'comfort', title:'소파에서 어깨를 감싸고 함께 기대기', detail:'영화나 음악을 들을 때 어깨를 감싸고 나란히 기대면 말이 없어도 편안한 친밀감을 유지할 수 있어요.', tags:['comfort','stable','deepBond','earth','water','neutral'] },
    { id:'slow-dance', level:3, category:'playful', title:'좋아하는 음악에 맞춰 천천히 몸을 맞추기', detail:'둘만의 공간에서 음악에 맞춰 천천히 움직이면 활동적인 설렘과 눈맞춤을 자연스럽게 이어갈 수 있어요.', tags:['romantic','active','expressive','fire','wood','attraction'] },

    { id:'light-kiss', level:4, category:'kiss', title:'눈을 맞춘 뒤 가볍게 입맞추기', detail:'분위기에 휩쓸려 서두르기보다 서로의 반응을 확인하고 천천히 가까워지는 입맞춤이 잘 맞아요.', tags:['romantic','expressive','attraction','trust','consent','fire'] },
    { id:'lingering-hug', level:4, category:'hug', title:'헤어지기 전 여운이 남도록 오래 안아주기', detail:'헤어지기 아쉬운 날에는 서두르지 않고 조금 오래 안아주며 다음 만남을 기대하는 마음을 나눠보세요.', tags:['deepBond','romantic','trust','water','earth','good'] },
    { id:'face-caress', level:4, category:'face', title:'얼굴을 감싸고 눈을 맞추기', detail:'먼저 괜찮은지 확인한 뒤 볼이나 얼굴선을 부드럽게 감싸고 눈을 맞추면 집중도 높은 애정 표현이 돼요.', tags:['romantic','consent','clear','metal','deepBond','attraction'] },
    { id:'nose-touch', level:4, category:'face', title:'코끝을 살짝 맞대고 웃기', detail:'진지한 분위기만 이어가기보다 코끝을 살짝 맞대고 웃으면 편안함과 설렘을 함께 살릴 수 있어요.', tags:['playful','romantic','same','fire','gentle'] },
    { id:'close-slow-dance', level:4, category:'hug', title:'가까이 안고 천천히 춤추기', detail:'둘만의 공간에서 서로의 속도를 확인하며 가까이 안고 천천히 움직이면 호흡과 거리감을 맞추기 좋아요.', tags:['romantic','attraction','active','consent','fire','wood'] },
    { id:'kiss-after-talk', level:4, category:'kiss', title:'속마음을 나눈 뒤 짧게 입맞추기', detail:'깊은 대화를 마친 뒤 서로의 마음이 확인됐을 때 짧게 입맞추면 말과 몸짓이 자연스럽게 이어져요.', tags:['deepBond','communication','romantic','water','trust','clear'] },

    { id:'slow-kiss', level:5, category:'kiss', title:'조용한 분위기에서 천천히 키스하기', detail:'둘 다 충분히 편안하다는 확신이 들 때 호흡을 맞추며 천천히 마음을 나누는 방식이에요.', tags:['romantic','deepBond','attraction','trust','consent','fire','water'] },
    { id:'deep-embrace', level:5, category:'hug', title:'몸을 가까이 붙이고 오래 안아주기', detail:'감정적인 신뢰가 쌓인 뒤에는 몸을 가까이 붙이고 오래 안아주며 말보다 깊은 안정감을 나눌 수 있어요.', tags:['deepBond','comfort','attraction','earth','water','trust'] },
    { id:'soft-kiss-series', level:5, category:'kiss', title:'짧은 입맞춤을 여러 번 천천히 나누기', detail:'한 번에 농도를 높이기보다 상대의 반응을 확인하며 짧고 부드러운 입맞춤을 이어가는 방식이 잘 맞아요.', tags:['romantic','consent','playful','fire','trust','pacing'] },
    { id:'private-cuddle', level:5, category:'comfort', title:'둘만의 공간에서 오래 기대어 있기', detail:'대화와 휴식을 충분히 나눈 뒤 서로 기대어 오래 머무르면 편안함과 깊은 친밀감을 함께 느낄 수 있어요.', tags:['deepBond','comfort','private','water','earth','stable'] },
    { id:'kiss-with-embrace', level:5, category:'kiss', title:'포옹을 이어가며 천천히 입맞추기', detail:'먼저 오래 안아 서로의 긴장이 풀린 뒤 자연스럽게 입맞춤으로 이어가면 감정과 속도를 맞추기 좋아요.', tags:['romantic','deepBond','attraction','consent','trust','good'] },

    { id:'lingering-kiss', level:6, category:'kiss', title:'충분한 눈맞춤 뒤 여운 있게 키스하기', detail:'서로의 신뢰와 동의가 충분할 때 눈맞춤과 포옹을 오래 이어간 뒤 여운이 남는 키스를 천천히 나눠보세요.', tags:['romantic','deepBond','attraction','consent','trust','fire','water'] },
    { id:'close-embrace-kiss', level:6, category:'kiss', title:'가까이 안은 채 호흡을 맞추며 키스하기', detail:'둘 다 적극적으로 가까워지고 싶다는 반응이 분명할 때, 포옹과 키스를 서두르지 않고 같은 속도로 이어가는 방식이에요.', tags:['deepBond','attraction','consent','partnership','fire','water','good'] },
    { id:'private-romantic-pause', level:6, category:'comfort', title:'둘만의 공간에서 긴 포옹과 입맞춤 사이에 머물기', detail:'감정이 충분히 깊어진 관계라면 긴 포옹과 입맞춤 사이에 천천히 머물며 서로의 반응을 계속 확인하는 친밀감이 잘 맞아요.', tags:['private','deepBond','trust','consent','water','earth','romantic'] },
    { id:'slow-intimate-dance', level:6, category:'hug', title:'둘만의 음악에 맞춰 깊게 안고 천천히 움직이기', detail:'서로에게 집중할 수 있는 공간에서 가까이 안고 천천히 움직이면 강한 설렘을 과하지 않게 나누기 좋아요.', tags:['private','romantic','attraction','active','fire','wood','consent'] },
  ];

  const TOUCH_TAG_REASON = {
    trust: '일지 관계에서 신뢰와 친밀감이 비교적 잘 형성되는 흐름',
    reassurance: '서로의 불안을 말보다 다정한 행동으로 낮춰주는 관계',
    attraction: '상극 또는 강한 화 기운에서 나타나는 분명한 끌림',
    consent: '합보다 충·형·해의 신호가 있어 서로의 반응 확인이 중요한 궁합',
    playful: '동기 관계나 목·화 기운에서 나타나는 장난스럽고 활동적인 호흡',
    comfort: '토·수 기운에서 나타나는 편안함과 휴식 중심의 친밀감',
    deepBond: '수 기운이나 좋은 일지 관계에서 나타나는 깊은 정서적 연결',
    active: '목 기운 또는 좋은 년지 관계에서 나타나는 함께 움직이는 호흡',
    expressive: '화 기운에서 나타나는 분명한 애정 표현',
    respectful: '금 기운에서 나타나는 경계와 약속을 존중하는 방식',
    stable: '토 기운과 상호 보완에서 나타나는 꾸준한 안정감',
    calm: '수 기운에서 나타나는 천천히 가까워지는 속도',
    repair: '갈등 뒤 말보다 먼저 긴장을 풀어주는 방식',
    same: '동기·동일 지지에서 나타나는 친구 같은 편안함',
    partnership: '서로 부족한 부분을 주고받는 상호 보완형 관계',
    communication: '대화를 통해 친밀감이 깊어지는 궁합',
    pacing: '감정 속도가 달라 천천히 농도를 맞추는 것이 중요한 관계',
    private: '둘만의 조용한 공간에서 친밀감이 더 잘 살아나는 흐름',
    wood: '목 기운의 활동성과 새로운 경험을 함께 만드는 성향',
    fire: '화 기운의 빠른 반응과 로맨틱한 표현',
    earth: '토 기운의 돌봄과 몸으로 전하는 안정감',
    metal: '금 기운의 분명한 확인과 절제된 애정 표현',
    water: '수 기운의 깊고 조용한 친밀감',
  };

  function getPersonSeedKey(input) {
    return [
      input?.yearUnknown ? '?' : input?.year,
      input?.month,
      input?.day,
      input?.hourUnknown ? '?' : input?.hour,
      input?.minute,
    ].join('-');
  }

  function addTouchTag(contextMap, tag, reason, weight) {
    const current = contextMap.get(tag);
    if (!current || current.weight < weight) contextMap.set(tag, { reason, weight });
  }

  function elementTouchTags(element) {
    return {
      목: ['active','playful','wood'],
      화: ['expressive','romantic','fire','attraction'],
      토: ['comfort','stable','earth','care'],
      금: ['respectful','clear','metal','consent'],
      수: ['calm','deepBond','water','private'],
    }[element] || [];
  }

  function buildTouchRecommendation(entryA, entryB, rec, inputA, inputB) {
    const compat = rec?.compat || {};
    const relation = compat.relation || '중립';
    const dayRel = compat.dayJijiRelation || {};
    const yearRel = compat.yearJijiRelation || {};
    const dayTone = dayRel.tone || 'neutral';
    const yearTone = yearRel.tone || 'neutral';
    const complementCount = (compat.complement?.aFillsB?.length || 0) + (compat.complement?.bFillsA?.length || 0);
    const primary = rec?.primaryOhaeng || compat.minOhaeng || '토';
    const maxOhaeng = compat.maxOhaeng || '토';
    const anyApprox = !!(entryA?.approx || entryB?.approx);

    const countA = entryA?.exact ? entryA.exact.ohaengCount : buildApproxCount(entryA.approx);
    const countB = entryB?.exact ? entryB.exact.ohaengCount : buildApproxCount(entryB.approx);
    const dominantA = analyzeOhaengCount(countA).dominant[0];
    const dominantB = analyzeOhaengCount(countB).dominant[0];

    const context = new Map();
    if (relation === '상생') {
      addTouchTag(context, 'trust', '상생 관계라 서로를 안심시키는 접촉이 잘 맞아요.', 6);
      addTouchTag(context, 'reassurance', '한 사람이 먼저 다가가면 다른 사람이 편안하게 받아주는 흐름이에요.', 5);
    } else if (relation === '상극') {
      addTouchTag(context, 'attraction', '상극 관계 특유의 강한 끌림과 긴장감이 있어요.', 6);
      addTouchTag(context, 'consent', '끌림이 큰 만큼 그날의 감정과 반응을 확인하는 과정이 중요해요.', 6);
      addTouchTag(context, 'pacing', '서로의 감정 속도가 다를 수 있어 농도를 천천히 맞추는 편이 좋아요.', 5);
    } else if (relation === '동기') {
      addTouchTag(context, 'same', '동기 관계라 친구처럼 편안한 접촉이 자연스럽게 이어져요.', 6);
      addTouchTag(context, 'playful', '반응과 취향이 비슷해 장난스러운 스킨십이 잘 맞아요.', 5);
    } else {
      addTouchTag(context, 'calm', '중립 관계는 가벼운 접촉을 반복하며 천천히 친밀감을 쌓는 편이 잘 맞아요.', 5);
      addTouchTag(context, 'gentle', '갑작스럽게 농도를 높이기보다 예측 가능한 접촉이 편안해요.', 5);
    }

    const dayTypeTags = {
      육합: [['trust',7],['deepBond',7],['comfort',5]],
      삼합: [['active',6],['partnership',6],['playful',4]],
      충: [['attraction',6],['consent',8],['pacing',7]],
      형: [['repair',7],['gentle',6],['reassurance',6]],
      해: [['consent',7],['clear',6],['reassurance',5]],
      동일: [['same',7],['comfort',5],['playful',5]],
      평: [['stable',4],['gentle',4]],
    }[dayRel.type] || [];
    dayTypeTags.forEach(([tag, weight]) => addTouchTag(context, tag, `일지의 ${dayRel.type || '평'} 관계에서 드러나는 친밀감의 방식이에요.`, weight));

    if (yearTone === 'good') {
      addTouchTag(context, 'active', '년지 흐름이 좋아 함께 움직이는 상황에서 자연스럽게 가까워져요.', 4);
      addTouchTag(context, 'playful', '바깥 활동과 데이트 중 장난스러운 접촉이 잘 어울려요.', 4);
    } else if (yearTone === 'clash' || yearTone === 'friction') {
      addTouchTag(context, 'private', '둘 밖의 일정에서는 차이가 날 수 있어 조용한 둘만의 공간이 더 편안해요.', 5);
      addTouchTag(context, 'respectful', '생활 방식 차이가 있어 스킨십 전 반응을 확인하는 태도가 중요해요.', 5);
    }

    if (complementCount >= 2) addTouchTag(context, 'partnership', '서로 다른 강점을 주고받아 몸짓으로도 안정감을 나누기 쉬워요.', 6);
    else if (complementCount === 1) addTouchTag(context, 'reassurance', '한쪽이 먼저 챙기는 순간이 있어 다정한 반응으로 균형을 맞추는 게 좋아요.', 4);

    [compat.ilganA, compat.ilganB, dominantA, dominantB, maxOhaeng].filter(Boolean).forEach(element => {
      elementTouchTags(element).forEach(tag => addTouchTag(context, tag, TOUCH_TAG_REASON[tag] || `${element} 기운과 잘 맞는 방식이에요.`, element === maxOhaeng ? 5 : 3));
    });
    elementTouchTags(primary).forEach(tag => addTouchTag(context, tag, `${primary} 기운이 부족한 두 사람에게 필요한 관계 행동과 연결돼요.`, 3));

    let level = 2;
    if (!anyApprox) {
      if (relation === '상생') level += 1;
      if (relation === '상극' && dayTone !== 'clash' && dayTone !== 'friction') level += 1;
      if (dayRel.type === '육합') level += 2;
      else if (dayRel.type === '삼합' || dayRel.type === '동일') level += 1;
      else if (dayRel.type === '충' || dayRel.type === '형' || dayRel.type === '해') level -= 1;
      if (complementCount >= 2) level += 1;
      if (maxOhaeng === '화') level += 1;
      if (maxOhaeng === '수' && dayTone === 'good') level += 1;
      if (maxOhaeng === '토' && dayTone === 'good') level += 1;
      if (maxOhaeng === '목' && yearTone === 'good') level += 1;
    }
    if (dayTone === 'clash' || dayTone === 'friction') level = Math.min(level, 4);
    if (anyApprox) level = Math.min(level, 3);
    level = Math.max(1, Math.min(6, level));

    const levelMeta = {
      1: { label:'아주 가볍게', sub:'편안함과 동의를 먼저 확인하는 단계예요.' },
      2: { label:'천천히 다정하게', sub:'부담 없는 접촉을 자주 나누는 편이 잘 맞아요.' },
      3: { label:'자연스럽고 따뜻하게', sub:'일상적인 포옹과 입맞춤이 친밀감을 키워줘요.' },
      4: { label:'로맨틱하게 진하게', sub:'눈맞춤과 포옹의 여운을 조금 길게 가져가도 좋아요.' },
      5: { label:'깊고 로맨틱하게', sub:'충분한 신뢰 속에서 천천히 농도를 높이는 방식이에요.' },
      6: { label:'매우 깊고 친밀하게', sub:'서로의 적극적인 동의와 신뢰가 분명할 때 깊은 친밀감을 나눌 수 있어요.' },
    }[level];

    const seedParts = [getPersonSeedKey(inputA), getPersonSeedKey(inputB)].sort();
    const seed = `${seedParts.join('||')}|${relation}|${dayRel.type}|${yearRel.type}|${primary}|${maxOhaeng}`;
    const eligible = TOUCH_CANDIDATES.filter(item => item.level <= level);
    const scored = eligible.map(item => {
      const matches = item.tags.filter(tag => context.has(tag));
      let score = 35 - Math.abs(item.level - level) * 7 + (item.level === level ? 6 : 0);
      matches.forEach(tag => { score += context.get(tag).weight; });
      if ((dayTone === 'clash' || dayTone === 'friction') && item.level >= 4) score -= 12;
      if (dayTone === 'good' && item.level >= 3) score += 4;
      if (relation === '상극' && item.tags.includes('consent')) score += 7;
      if (relation === '동기' && item.tags.includes('playful')) score += 6;
      if (relation === '상생' && item.tags.includes('reassurance')) score += 5;
      const tie = stableTextHash(`${seed}|${item.id}`) / 4294967296;
      return { ...item, matches, score:score + tie };
    }).sort((a,b) => b.score - a.score);

    const selected = [];
    const categoryCount = new Map();
    for (const item of scored) {
      const used = categoryCount.get(item.category) || 0;
      if (used >= 2) continue;
      if (selected.length < 3 && used >= 1 && scored.some(other => (categoryCount.get(other.category) || 0) === 0)) continue;
      const completeReason = text => {
        const value = String(text || '').trim();
        if (!value) return '';
        return /(?:[.!?]|요)$/.test(value) ? value : `${value}이에요.`;
      };
      const reasonBits = item.matches
        .sort((a,b) => (context.get(b)?.weight || 0) - (context.get(a)?.weight || 0))
        .map(tag => completeReason(context.get(tag)?.reason || TOUCH_TAG_REASON[tag]))
        .filter(Boolean);
      selected.push({ ...item, why:[...new Set(reasonBits)].slice(0,2).join(' ') || '두 사람의 일간과 오행 분포에 맞는 접촉 방식이에요.' });
      categoryCount.set(item.category, used + 1);
      if (selected.length === 4) break;
    }
    if (selected.length < 4) {
      for (const item of scored) {
        if (selected.some(chosen => chosen.id === item.id)) continue;
        const used = categoryCount.get(item.category) || 0;
        if (used >= 2) continue;
        const completeReason = text => {
          const value = String(text || '').trim();
          if (!value) return '';
          return /(?:[.!?]|요)$/.test(value) ? value : `${value}이에요.`;
        };
        const reasonBits = item.matches
          .sort((a,b) => (context.get(b)?.weight || 0) - (context.get(a)?.weight || 0))
          .map(tag => completeReason(context.get(tag)?.reason || TOUCH_TAG_REASON[tag]))
          .filter(Boolean);
        selected.push({ ...item, why:[...new Set(reasonBits)].slice(0,2).join(' ') || '두 사람의 일간과 오행 분포에 맞는 접촉 방식이에요.' });
        categoryCount.set(item.category, used + 1);
        if (selected.length === 4) break;
      }
    }

    const relationSummary = {
      상생:'한 사람이 먼저 다가가면 다른 사람이 자연스럽게 받아주는 흐름이라, 안심시키는 접촉에서 친밀감이 빠르게 깊어져요.',
      상극:'서로에게 없는 매력이 강하게 보여 끌림은 크지만, 감정이 올라온 날에는 같은 접촉도 다르게 느낄 수 있어요.',
      동기:'친구 같은 편안함이 강해 장난스럽고 일상적인 스킨십이 어색하지 않게 이어져요.',
      중립:'갑자기 진하게 다가가기보다 익숙한 접촉을 반복할수록 연인다운 편안함이 커져요.',
    }[relation];
    const daySummary = {
      육합:'가까운 거리에서도 긴장이 쉽게 풀리는 편이라 포옹과 입맞춤으로 넘어가는 흐름이 비교적 자연스러워요.',
      삼합:'함께 걷거나 움직이는 동안 손잡기·팔짱처럼 활동 속에 섞이는 접촉이 특히 잘 맞아요.',
      충:'끌림과 긴장이 함께 커질 수 있으니 눈맞춤과 짧은 확인을 거쳐 속도를 맞추는 과정이 중요해요.',
      형:'작은 서운함이 남은 날에는 농도를 높이기보다 등을 토닥이거나 짧게 안아 긴장을 먼저 풀어주세요.',
      해:'상대가 괜찮아 보여도 반응이 엇갈릴 수 있어 “안아도 될까?”처럼 짧게 확인하면 훨씬 편안해져요.',
      동일:'서로의 반응을 빨리 읽어 자연스럽게 가까워지지만, 익숙함 때문에 애정 표현이 줄지 않게 해주세요.',
      평:'예측 가능한 손잡기와 포옹을 꾸준히 반복하는 편이 화려한 표현보다 잘 맞아요.',
    }[dayRel.type] || '서로의 반응을 확인하며 편안한 속도로 친밀감을 쌓는 편이 좋아요.';
    const elementSummary = {
      목:'목 기운이 두드러져 산책·여행처럼 함께 움직이는 상황에서 장난스러운 접촉이 살아나요.',
      화:'화 기운이 두드러져 눈맞춤과 입맞춤처럼 감정이 분명하게 전해지는 표현이 잘 맞아요.',
      토:'토 기운이 두드러져 오래 안아주거나 기대어 쉬는 안정적인 접촉이 큰 힘이 돼요.',
      금:'금 기운이 두드러져 갑작스러운 표현보다 먼저 반응을 확인하고 분명하게 다가가는 방식이 편안해요.',
      수:'수 기운이 두드러져 조용한 공간에서 천천히 호흡을 맞추는 깊은 스킨십이 잘 어울려요.',
    }[maxOhaeng] || '';

    return { level, levelMeta, summary:`${relationSummary} ${daySummary} ${elementSummary}`.trim(), ideas:selected };
  }

  function ensureFlowerRecommendationStyles() {
    if (document.getElementById('flower-recommendation-styles')) return;
    const style = document.createElement('style');
    style.id = 'flower-recommendation-styles';
    style.textContent = `
      .rec-couple-extra-grid{display:grid;grid-template-columns:1fr;gap:16px;margin-top:16px;align-items:stretch}
      .rec-date-ideas,.rec-touch-card{min-width:0;margin:0;padding:15px 16px;border:1px solid var(--line);border-radius:15px;background:var(--bg-panel-raised)}
      .rec-extra-title{display:flex;align-items:center;gap:7px;margin-bottom:9px;font-size:14px;font-weight:700;color:var(--ink)}
      .rec-extra-title::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--accent-2);box-shadow:0 0 0 4px rgba(148,151,163,.14)}
      .rec-date-list,.rec-touch-list{margin:0;padding-left:20px;line-height:1.72;color:var(--ink-dim);font-size:13px}
      .rec-touch-level{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 10px;margin-bottom:9px;border:1px solid var(--line);border-radius:11px;background:#fff}
      .rec-touch-level-copy{min-width:0}
      .rec-touch-level-label{font-size:11px;color:var(--ink-faint);margin-bottom:2px}
      .rec-touch-level-value{font-size:13px;font-weight:700;color:var(--ink)}
      .rec-touch-meter{display:flex;gap:3px;flex:0 0 auto}
      .rec-touch-meter span{display:block;width:7px;height:20px;border-radius:999px;background:var(--line)}
      .rec-touch-meter span.on{background:var(--accent-2)}
      .rec-touch-summary{margin:0 0 9px;font-size:12.5px;line-height:1.65;color:var(--ink-dim)}
      .rec-touch-list li+li{margin-top:5px}
      .rec-touch-list b{color:var(--ink);font-weight:700}
      .rec-touch-why{display:block;margin-top:4px;font-size:11.5px;line-height:1.55;color:var(--accent-3)}
      .rec-touch-caution{margin-top:10px;padding-top:9px;border-top:1px dashed var(--line);font-size:11px;line-height:1.55;color:var(--ink-faint)}
      .flower-detail-section{margin-top:16px;padding:15px 16px;border:1px solid var(--line);border-radius:15px;background:var(--bg-panel-raised)}
      .flower-detail-title{font-size:15px;font-weight:700;color:var(--ink);margin-bottom:11px;font-family:'Noto Serif KR',serif}
      .flower-detail-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
      .flower-detail-item{min-width:0;padding:12px 13px;border:1px solid var(--line);border-radius:13px;background:#ffffff;box-shadow:0 4px 13px rgba(28,29,33,.035)}
      .flower-detail-name{font-weight:700;font-size:14px;color:var(--ink);line-height:1.4}
      .flower-detail-row{margin-top:8px;font-size:12.5px;line-height:1.6;color:var(--ink-dim)}
      .flower-detail-row b{display:block;margin-bottom:2px;color:var(--accent-3);font-size:11.5px}
      .flower-detail-reason{padding-top:8px;border-top:1px dashed var(--line)}
      @media (max-width:760px){.rec-couple-extra-grid,.flower-detail-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function ensureCoupleExtraGrid() {
    let grid = document.getElementById('recCoupleExtraGrid');
    if (grid) return grid;
    const supportNote = document.getElementById('supportNote');
    if (!supportNote) return null;
    grid = document.createElement('div');
    grid.id = 'recCoupleExtraGrid';
    grid.className = 'rec-couple-extra-grid lover-only-block';
    supportNote.insertAdjacentElement('afterend', grid);
    return grid;
  }

  function ensureDateIdeasBlock() {
    let block = document.getElementById('recDateIdeasBlock');
    const grid = ensureCoupleExtraGrid();
    if (!grid) return block;
    if (!block) {
      block = document.createElement('section');
      block.id = 'recDateIdeasBlock';
      block.className = 'rec-date-ideas lover-only-block';
      block.innerHTML = '<div class="rec-extra-title">둘에게 잘 맞는 데이트</div><ul id="recDateIdeas" class="rec-date-list"></ul>';
    }
    if (block.parentElement !== grid) grid.appendChild(block);
    return block;
  }

  function ensureTouchRecommendationBlock() {
    let block = document.getElementById('recTouchBlock');
    const grid = ensureCoupleExtraGrid();
    if (!grid) return block;
    if (!block) {
      block = document.createElement('section');
      block.id = 'recTouchBlock';
      block.className = 'rec-touch-card lover-only-block';
      block.innerHTML = `
        <div class="rec-extra-title">어울리는 스킨십</div>
        <div class="rec-touch-level">
          <div class="rec-touch-level-copy">
            <div class="rec-touch-level-label">스킨십 농도</div>
            <div class="rec-touch-level-value" id="recTouchLevel"></div>
          </div>
          <div class="rec-touch-meter" id="recTouchMeter" aria-label="스킨십 농도"></div>
        </div>
        <p class="rec-touch-summary" id="recTouchSummary"></p>
        <ul class="rec-touch-list" id="recTouchIdeas"></ul>
        <div class="rec-touch-caution">서로 편안하고 동의하는 범위가 가장 중요해요. 한쪽이 망설이면 농도를 낮추고 먼저 물어봐 주세요.</div>
      `;
    }
    if (block.parentElement !== grid) grid.appendChild(block);
    return block;
  }

  function ensureFlowerMeaningDetails() {
    let section = document.getElementById('flowerMeaningDetails');
    if (section) return section;
    ensureDateIdeasBlock();
    ensureTouchRecommendationBlock();
    const grid = ensureCoupleExtraGrid();
    const supportNote = document.getElementById('supportNote');
    const anchor = grid || supportNote;
    if (!anchor) return null;
    section = document.createElement('section');
    section.id = 'flowerMeaningDetails';
    section.className = 'flower-detail-section lover-only-block';
    anchor.insertAdjacentElement('afterend', section);
    return section;
  }

  function renderResult(entryA, entryB, rec, inputA, inputB) {
    lastRenderPayload = [entryA, entryB, rec, inputA, inputB];
    const anyApprox = !!(entryA.approx || entryB.approx);
    const isLover = relationshipMode === 'lover';

    document.getElementById('pillarsDividerLabel').textContent = anyApprox ? '오행 경향 추정' : '사주팔자 명식';

    const approxNoteEl = document.getElementById('approxNote');
    if (anyApprox) {
      approxNoteEl.style.display = 'block';
      approxNoteEl.innerHTML =
        '<b>연도 미상 안내.</b> 사주는 연·월·일·시 네 기둥 모두 태어난 해에 뿌리를 두기 때문에, ' +
        '연도를 모르면 60갑자를 정확히 특정할 수 없어요. 아래 결과는 <b>월지는 절기로 확정</b>하고, ' +
        '<b>일간은 최근 60년을 가정했을 때 가장 흔히 나오는 오행</b>을 보여주는 참고용 추정치예요. ' +
        '실제 사주와 다를 수 있어요.';
    } else {
      approxNoteEl.style.display = 'none';
    }

    const labelA = inputA.yearUnknown
      ? `${inputA.name} · ${String(inputA.month).padStart(2,'0')}.${String(inputA.day).padStart(2,'0')} (연도 미상)`
      : `${inputA.name} · ${inputA.year}.${String(inputA.month).padStart(2,'0')}.${String(inputA.day).padStart(2,'0')}`;
    const labelB = inputB.yearUnknown
      ? `${inputB.name} · ${String(inputB.month).padStart(2,'0')}.${String(inputB.day).padStart(2,'0')} (연도 미상)`
      : `${inputB.name} · ${inputB.year}.${String(inputB.month).padStart(2,'0')}.${String(inputB.day).padStart(2,'0')}`;

    if (entryA.approx) renderPillarCardApprox('A', entryA.approx, labelA);
    else renderPillarCardExact('A', entryA.exact, labelA);

    if (entryB.approx) renderPillarCardApprox('B', entryB.approx, labelB);
    else renderPillarCardExact('B', entryB.exact, labelB);

    // 휠 표시용 각자의 오행 합산치 (근사 모드는 확정 가능한 기둥만 반영)
    const wheelCountA = entryA.exact ? entryA.exact.ohaengCount : buildApproxCount(entryA.approx);
    const wheelCountB = entryB.exact ? entryB.exact.ohaengCount : buildApproxCount(entryB.approx);
    renderWheel(wheelCountA, wheelCountB);

    // 관계 배지 (근사 모드에서는 일간 비교가 불확실하므로 문구를 다르게)
    const explainEl = document.getElementById('relationExplainBody');
    const deepCompatEl = document.getElementById('deepCompat');
    const nameA = inputA.name, nameB = inputB.name;
    const variationSeed = buildRenderVariationSeed(entryA, entryB, rec, inputA, inputB);
    if (anyApprox) {
      document.getElementById('relationBadge').textContent = '연도 미상으로 일간 간 관계는 추정이 어려워요';
      explainEl.innerHTML =
        '<div class="re-caveat" style="margin-top:0; border-top:none; padding-top:0;">태어난 연도를 몰라 일간과 일지를 하나로 확정하지는 않아요. 대신 가능한 최근 60개 출생연도를 비교해 상생·상극·동기와 일지 관계가 나타나는 비중을 계산하고, 그 가능성에 기반한 추가 분석을 보여드려요.</div>' +
        (isLover ? buildApproxCompatHtml(entryA, entryB, nameA, nameB, inputA, inputB) : '');
      // 년지/일지 궁합도 연도를 모르면 확정 불가하므로 숨김
      deepCompatEl.style.display = 'none';
    } else {
      // 상단 결과 배지는 기존 이름 포함 문장으로 표시하고,
      // Relation 카드 안의 제목만 짧은 이모지 요약 문구를 사용합니다.
      const loverRelationLabels = {
        상생: `${nameA}님과 ${nameB}님은 서로를 북돋는 상생(相生) 관계예요`,
        상극: `${nameA}님과 ${nameB}님은 팽팽하게 부딪히는 상극(相剋) 관계예요`,
        동기: `${nameA}님과 ${nameB}님은 반응 방식이 비슷한 동기(同氣) 관계예요`,
        중립: `${nameA}님과 ${nameB}님은 천천히 가까워지는 중립 관계예요`,
      };
      const friendRelationLabels = {
        상생: `${nameA}님과 ${nameB}님은 서로 힘이 되어주는 친구 관계예요`,
        상극: `${nameA}님과 ${nameB}님은 친해도 자주 티격태격할 수 있는 친구 관계예요`,
        동기: `${nameA}님과 ${nameB}님은 관심사와 반응이 비슷한 친구 관계예요`,
        중립: `${nameA}님과 ${nameB}님은 부담 없이 오래 보기 좋은 친구 관계예요`,
      };
      const relationLabels = isLover ? loverRelationLabels : friendRelationLabels;
      document.getElementById('relationBadge').textContent = relationLabels[rec.compat.relation];
      explainEl.innerHTML =
        relationExplainHtml(rec.compat.relation, nameA, nameB, relationshipMode, variationSeed) +
        (isLover ? buildDetailedCompatHtml(entryA.exact, entryB.exact, rec.compat, nameA, nameB) : '');

      // 년지(띠)/일지(부부궁)와 연애용 심층 해설은 연인 선택에서만 보여줘요.
      if (isLover) renderDeepCompat(rec.compat, nameA, nameB, entryA.exact, entryB.exact);
      deepCompatEl.style.display = isLover ? 'block' : 'none';
    }

    // 메인 추천
    const p = buildPersonalizedPrimaryRecommendation(rec.primary, rec.primaryOhaeng, entryA, entryB, rec, inputA, inputB);
    const hanjaMap = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' };
    document.getElementById('recHanja').textContent = hanjaMap[rec.primaryOhaeng];
    document.getElementById('recHanja').style.color = OHAENG_COLOR[rec.primaryOhaeng];
    document.getElementById('recSeason').textContent = p.season;
    document.getElementById('recKeyword').textContent = `${p.seasonDetail} · ${p.keyword}의 분위기`;

    const heroTopEl = document.getElementById('recHeroTop');
    if (heroTopEl) heroTopEl.classList.remove('has-photo');

    document.getElementById('recTime').textContent = p.timeRange;
    document.getElementById('recTimeDetail').textContent = p.timeDetail;

    document.getElementById('recColors').innerHTML = colorSwatchesHtml(p.colors);

    const flowersEl = document.getElementById('recFlowers');
    ensureFlowerRecommendationStyles();
    const flowerDetails = Array.isArray(p.flowerDetails) && p.flowerDetails.length
      ? p.flowerDetails
      : (p.flowers || []).map(name => ({ name, meaning: '', theme: '', reason: '' }));
    flowersEl.innerHTML = flowerDetails.map(item => `<span class="tag">${escapeHtml(item.name)}</span>`).join('');

    const placesEl = document.getElementById('recPlaces');
    placesEl.innerHTML = (p.places || []).map(pl => `<span class="tag">${escapeHtml(pl)}</span>`).join('');

    const dateIdeasBlock = ensureDateIdeasBlock();
    const dateIdeasEl = document.getElementById('recDateIdeas');
    const dateIdeas = Array.isArray(p.dateIdeas) && p.dateIdeas.length
      ? p.dateIdeas
      : [p.dateTip].filter(Boolean);
    if (dateIdeasEl) {
      dateIdeasEl.innerHTML = dateIdeas.map(idea => `<li>${escapeHtml(idea)}</li>`).join('');
    }
    if (dateIdeasBlock) dateIdeasBlock.style.display = dateIdeas.length ? '' : 'none';

    const touchBlock = ensureTouchRecommendationBlock();
    const touch = buildTouchRecommendation(entryA, entryB, rec, inputA, inputB);
    const touchLevelEl = document.getElementById('recTouchLevel');
    const touchMeterEl = document.getElementById('recTouchMeter');
    const touchSummaryEl = document.getElementById('recTouchSummary');
    const touchIdeasEl = document.getElementById('recTouchIdeas');
    if (touchLevelEl) touchLevelEl.textContent = `${touch.level}/6 · ${touch.levelMeta.label}`;
    if (touchMeterEl) {
      touchMeterEl.innerHTML = Array.from({ length: 6 }, (_, i) => `<span class="${i < touch.level ? 'on' : ''}"></span>`).join('');
      touchMeterEl.setAttribute('aria-label', `스킨십 농도 ${touch.level}/6`);
    }
    if (touchSummaryEl) touchSummaryEl.textContent = `${touch.summary} ${touch.levelMeta.sub}`;
    if (touchIdeasEl) {
      touchIdeasEl.innerHTML = touch.ideas.map(item => `<li><b>${escapeHtml(item.title)}</b><br>${escapeHtml(item.detail)}<span class="rec-touch-why">궁합 포인트 · ${escapeHtml(item.why || '')}</span></li>`).join('');
    }
    if (touchBlock) touchBlock.style.display = touch.ideas.length ? '' : 'none';

    // 글로우 컬러
    document.getElementById('recHero').style.setProperty('--accent-glow', OHAENG_GLOW[rec.primaryOhaeng]);

    // 추천 이유를 생활 언어로 설명
    const s = rec.support;
    const fallbackSummary = pickVariation(
      OHAENG_VARIATION_BANK[rec.primaryOhaeng]?.summary,
      variationSeed,
      'support:fallback-summary'
    ) || '두 사람에게 부족한 관계 행동을 함께 채워가는 모습';

    const primarySummaryRaw = p.summary || fallbackSummary;
    const primarySummary = escapeHtml(withSubjectParticle(primarySummaryRaw));
    const primaryPlaces = (p.places || []).slice(0, 2).map(escapeHtml).join(' 또는 ');
    const primaryColors = (p.colors || []).slice(0, 2).map(escapeHtml).join('·');
    let note =
      `${escapeHtml(nameA)}님과 ${escapeHtml(nameB)}님의 결과에서는 <b>${primarySummary}</b> 상대적으로 덜 나타나는 편이에요. ` +
      `${primaryPlaces ? `추천 장소는 ${primaryPlaces} 중에서 골라보세요. ` : ''}` +
      `${primaryColors ? `옷이나 작은 소품은 ${primaryColors} 계열 중 하나만 가볍게 활용해도 충분해요. ` : ''}` +
      `<br><span style="opacity:.78;">아래 추천은 두 사람의 일간 관계, 강한 오행, 월지의 생활 리듬, 일지의 가까운 관계 반응을 함께 반영한 결과예요.</span>`;
    if (anyApprox) {
      note += ' <span style="opacity:.78;">연도 미상 추정치를 포함한 결과예요.</span>';
    }
    document.getElementById('supportNote').innerHTML = note;

    const flowerMeaningSection = ensureFlowerMeaningDetails();
    if (flowerMeaningSection) {
      flowerMeaningSection.innerHTML = `
        <div class="flower-detail-title">추천 꽃에 담긴 의미</div>
        <div class="flower-detail-grid">
          ${flowerDetails.map(item => `
            <article class="flower-detail-item">
              <div class="flower-detail-name">${escapeHtml(item.name)}</div>
              <div class="flower-detail-row"><b>꽃말</b>${escapeHtml(item.meaning || '두 사람에게 필요한 마음을 담은 꽃이에요.')}</div>
              <div class="flower-detail-row flower-detail-reason"><b>추천 이유</b>${escapeHtml(item.reason || '두 사람의 관계 흐름과 잘 어울려 추천했어요.')}</div>
            </article>
          `).join('')}
        </div>
      `;
    }

    markLoverOnlyBlocks();
  }

  // 년지(띠)/일지(부부궁) 관계 뱃지와 서로에게 도움이 되는 방식를 렌더링
  function renderDeepCompat(compat, nameA, nameB, sajuA, sajuB) {
    const toneLabelMap = { good: '좋은 궁합', clash: '충돌 주의', friction: '마찰 주의', neutral: '무난' };
    const deepSeed = `${getSajuSignature(sajuA)}|${getSajuSignature(sajuB)}|${getCompatSignature(compat)}|deep`;

    function fillItem(prefix, relInfo, context) {
      const badgeEl = document.getElementById(prefix + 'Badge');
      const descEl = document.getElementById(prefix + 'Desc');
      if (!badgeEl || !descEl || !relInfo) return;
      const tone = relInfo.tone || 'neutral';
      const type = relInfo.type || '평';
      badgeEl.innerHTML = `<span class="dc-tone-badge dc-tone-${tone}">${type} · ${toneLabelMap[tone] || toneLabelMap.neutral}</span>`;
      descEl.textContent = getJijiRelationDescription(relInfo, deepSeed, context || 'general');
    }

    fillItem('dcYear', compat.yearJijiRelation, 'general');
    fillItem('dcDay', compat.dayJijiRelation, 'day');

    const { aFillsB = [], bFillsA = [] } = compat.complement || {};
    const parts = [];
    if (bFillsA.length > 0) parts.push(...buildElementHelpSentences(escapeHtml(nameB), escapeHtml(nameA), bFillsA, `${deepSeed}|b`));
    if (aFillsB.length > 0) parts.push(...buildElementHelpSentences(escapeHtml(nameA), escapeHtml(nameB), aFillsB, `${deepSeed}|a`));

    const profileA = makePersonProfile(escapeHtml(nameA), sajuA);
    const profileB = makePersonProfile(escapeHtml(nameB), sajuB);
    const monthRel = getProfileJijiContext(profileA, profileB, compat).month;
    parts.push(`월지 ${formatJiji(profileA.monthJiji)}와 ${formatJiji(profileB.monthJiji)}의 관계는 ${monthRel.type} 흐름이에요. ${getJijiRelationDescription(monthRel, deepSeed, 'month')}`);

    let complementHtml = '';
    if (parts.length === 1) {
      complementHtml = `${escapeHtml(nameA)}님과 ${escapeHtml(nameB)}님은 잘하는 방식과 어려워하는 부분이 비슷한 편이에요. 서로 편하게 느끼기는 쉽지만, 둘 다 미루는 문제는 역할을 정하는 것이 좋아요. ${parts[0]}`;
    } else {
      complementHtml = parts.join(' ');
    }
    document.getElementById('dcComplement').innerHTML = complementHtml;
  }

  function buildApproxCount(approx) {
    const count = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
    count[approx.month.ohaeng] += 1;
    count[approx.day.likelyOhaeng[0]] += 1;
    if (approx.hour) count[approx.hour.ohaeng] += 1;
    return count;
  }

  // ---------------------------------------------------------------
  // 결과 이미지 저장 (관계궁합 이후의 자세한 설명은 제외하고
  // "추천 궁합 기운" 카드까지만 캡처)
  // ---------------------------------------------------------------
  function ensureSaveImageStyles() {
    if (document.getElementById('save-image-styles')) return;
    const style = document.createElement('style');
    style.id = 'save-image-styles';
    style.textContent = `
      /* 화면에는 영향을 주지 않고 저장용 복제본에만 적용 */
      .capture-sandbox {
        position: fixed;
        left: -1100px;
        top: 0;
        width: 1040px;
        margin: 0;
        padding: 0;
        background: transparent;
        overflow: visible;
        pointer-events: none;
      }

      .capture-sandbox .capture-clean {
        width: var(--capture-width, 992px) !important;
        margin: 0 !important;
        /* ::before 대신 실제 카드 배경에 계절색을 적용해 html2canvas 오류 방지 */
        background-color: #ffffff !important;
        background-image: radial-gradient(
          ellipse 95% 85% at 50% 0%,
          var(--capture-accent-glow, rgba(148,151,163,0.16)),
          transparent 75%
        ) !important;
        background-repeat: no-repeat !important;
        border: 1px solid var(--line) !important;
        border-radius: 24px !important;
        overflow: hidden !important;
        box-shadow: none !important;
        filter: none !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
        transform: none !important;
        isolation: isolate;
      }

      .capture-sandbox .capture-full {
        width: var(--capture-width, 992px) !important;
        margin: 0 !important;
        padding-bottom: 24px !important;
        background: #ffffff !important;
        overflow: visible !important;
      }

      /* 저장 이미지의 본문 글꼴은 가장 작은 기준으로 통일합니다.
         "추천 시간대"(#recTime/#recTimeDetail)를 포함한 rec-detail-card 계열이
         다른 블록과 다른 크기로 새지 않도록, 카드 자기 자신 + 모든 후손 +
         주요 id를 한 규칙에서 함께 강제합니다. */
      .capture-sandbox .capture-clean,
      .capture-sandbox .capture-full,
      .capture-sandbox .capture-clean .rec-details,
      .capture-sandbox .capture-clean .rec-details *,
      .capture-sandbox .capture-clean .rec-detail-card,
      .capture-sandbox .capture-clean .rec-detail-card *,
      .capture-sandbox .capture-clean #recTime,
      .capture-sandbox .capture-clean #recTimeDetail,
      .capture-sandbox .capture-clean #recColors,
      .capture-sandbox .capture-clean #recFlowers,
      .capture-sandbox .capture-clean #recPlaces,
      .capture-sandbox .capture-clean .tag,
      .capture-sandbox .capture-clean .color-swatch,
      .capture-sandbox .capture-clean .swatch,
      .capture-sandbox .capture-clean .relation-explain-body,
      .capture-sandbox .capture-clean .relation-explain-body *,
      .capture-sandbox .capture-clean .compat-detail-wrap,
      .capture-sandbox .capture-clean .compat-detail-wrap *,
      .capture-sandbox .capture-clean .deep-compat,
      .capture-sandbox .capture-clean .deep-compat *,
      .capture-sandbox .capture-clean .support-note,
      .capture-sandbox .capture-clean .support-note *,
      .capture-sandbox .capture-clean .rec-couple-extra-grid,
      .capture-sandbox .capture-clean .rec-couple-extra-grid *,
      .capture-sandbox .capture-clean .flower-detail-section,
      .capture-sandbox .capture-clean .flower-detail-section *,
      .capture-sandbox .capture-full .rec-details,
      .capture-sandbox .capture-full .rec-details *,
      .capture-sandbox .capture-full .rec-detail-card,
      .capture-sandbox .capture-full .rec-detail-card *,
      .capture-sandbox .capture-full #recTime,
      .capture-sandbox .capture-full #recTimeDetail,
      .capture-sandbox .capture-full #recColors,
      .capture-sandbox .capture-full #recFlowers,
      .capture-sandbox .capture-full #recPlaces,
      .capture-sandbox .capture-full .tag,
      .capture-sandbox .capture-full .color-swatch,
      .capture-sandbox .capture-full .swatch,
      .capture-sandbox .capture-full .relation-explain-body,
      .capture-sandbox .capture-full .relation-explain-body *,
      .capture-sandbox .capture-full .compat-detail-wrap,
      .capture-sandbox .capture-full .compat-detail-wrap *,
      .capture-sandbox .capture-full .deep-compat,
      .capture-sandbox .capture-full .deep-compat *,
      .capture-sandbox .capture-full .support-note,
      .capture-sandbox .capture-full .support-note *,
      .capture-sandbox .capture-full .rec-couple-extra-grid,
      .capture-sandbox .capture-full .rec-couple-extra-grid *,
      .capture-sandbox .capture-full .flower-detail-section,
      .capture-sandbox .capture-full .flower-detail-section * {
        font-size: 10.5px !important;
        line-height: 1.65 !important;
      }

      /* 화면용 광택 레이어는 저장할 때만 제거합니다. 계절색은 위 실제 배경으로 유지됩니다. */
      .capture-sandbox .capture-clean::before,
      .capture-sandbox .capture-clean::after {
        content: none !important;
        display: none !important;
      }

      /* 실제 기기 화면 폭과 무관하게 저장 이미지는 PC 레이아웃으로 고정 */
      .capture-sandbox .capture-clean .rec-details,
      .capture-sandbox .capture-clean .relation-explain-body .re-lover-friend,
      .capture-sandbox .capture-clean .dc-grid,
      .capture-sandbox .capture-clean .compat-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      }
      .capture-sandbox .capture-clean .relation-explain-body .re-lover-friend.re-single-mode {
        grid-template-columns: 1fr !important;
      }
      .capture-sandbox .capture-clean .relation-explain-body .re-single-mode .re-label {
        width: fit-content !important;
        text-align: left !important;
      }
      .capture-sandbox .capture-clean .flower-detail-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
      }

      /* 애니메이션/호버 변형만 정지하고 카드 내부 디자인은 유지 */
      .capture-sandbox .capture-clean *,
      .capture-sandbox .capture-clean *::before,
      .capture-sandbox .capture-clean *::after {
        animation: none !important;
        transition: none !important;
        filter: none !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
        transform: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  async function waitForCaptureAssets(root) {
    if (document.fonts && document.fonts.ready) {
      try { await document.fonts.ready; } catch (_) {}
    }

    const images = Array.from(root.querySelectorAll('img'));
    await Promise.all(images.map(img => {
      if (img.complete) {
        if (typeof img.decode === 'function') return img.decode().catch(() => {});
        return Promise.resolve();
      }
      return new Promise(resolve => {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
      });
    }));

    /* 복제본의 최종 레이아웃이 확정된 다음 프레임에 캡처 */
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }

  const CAPTURE_FONT_SIZE = '10.5px';
  const CAPTURE_LINE_HEIGHT = '1.65';

  function normalizeCaptureTypography(root) {
    if (!root) return;
    // rec-detail-card 계열은 클래스뿐 아니라 자기 자신 + id로도 함께 잡아
    // "추천 시간대"(#recTime/#recTimeDetail)처럼 구조가 살짝 다른 블록도
    // 절대 빠지지 않고 다른 카드와 동일한 크기로 캡처되게 합니다.
    const selectors = [
      '.rec-detail-card', '.rec-detail-card *',
      '#recTime', '#recTimeDetail', '#recColors', '#recFlowers', '#recPlaces',
      '.tag', '.color-swatch', '.swatch',
      '.relation-explain-body', '.relation-explain-body *',
      '.compat-detail-wrap', '.compat-detail-wrap *',
      '.deep-compat', '.deep-compat *',
      '.support-note', '.support-note *',
      '.rec-couple-extra-grid', '.rec-couple-extra-grid *',
      '.flower-detail-section', '.flower-detail-section *',
      '.rec-date-list', '.rec-date-list *',
      '.rec-touch-list', '.rec-touch-list *',
      '.rec-touch-summary', '.rec-touch-why', '.rec-touch-caution',
    ];
    root.querySelectorAll(selectors.join(',')).forEach(element => {
      element.style.setProperty('font-size', CAPTURE_FONT_SIZE, 'important');
      element.style.setProperty('line-height', CAPTURE_LINE_HEIGHT, 'important');
    });
  }


  function canvasToPngBlob(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('PNG 파일을 만들지 못했어요.'));
      }, 'image/png', 1);
    });
  }

  function isMobileOrTabletDevice() {
    return window.matchMedia?.('(pointer: coarse)').matches
      || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '')
      || (navigator.maxTouchPoints > 1 && window.innerWidth <= 1366);
  }

  async function deliverSavedImage(blob, filename) {
    const file = new File([blob], filename, { type: 'image/png' });
    const mobileDevice = isMobileOrTabletDevice();

    // iOS/Android에서는 data URL 다운로드가 실패하는 경우가 많으므로
    // 파일 공유 API를 우선 사용해 사진 앱·파일 앱으로 바로 저장할 수 있게 합니다.
    if (mobileDevice && navigator.share && navigator.canShare) {
      try {
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Season 궁합 결과',
            text: 'Season에서 만든 궁합 결과 이미지예요.',
          });
          return;
        }
      } catch (error) {
        if (error?.name === 'AbortError') return;
        console.warn('모바일 공유 저장 실패, 일반 다운로드로 전환합니다.', error);
      }
    }

    // 데스크톱 및 공유 API 미지원 브라우저용 Blob 다운로드
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.rel = 'noopener';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();

    // 일부 모바일 브라우저는 download 속성을 무시하므로 새 탭으로 한 번 더 열어줍니다.
    if (mobileDevice && !('download' in HTMLAnchorElement.prototype)) {
      window.open(blobUrl, '_blank', 'noopener');
    }
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  }

  async function handleSaveResultImage(btn) {
    if (typeof html2canvas === 'undefined') {
      alert('이미지 저장 기능을 불러오지 못했어요. 네트워크 연결을 확인한 뒤 다시 시도해주세요.');
      return;
    }
    const recHero = document.getElementById('recHero');
    if (!recHero) return;

    /* 현재 화면에 표시된 계절색을 저장용 실제 배경에도 그대로 사용 */
    const accentGlow = getComputedStyle(recHero).getPropertyValue('--accent-glow').trim()
      || 'rgba(148,151,163,0.16)';

    ensureSaveImageStyles();
    const originalLabel = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '이미지 만드는 중…';

    // 캡처용으로 rec-hero를 복제한 뒤, 관계궁합 이후의 자세한 설명 블록들은 제거
    const clone = recHero.cloneNode(true);
    clone.removeAttribute('id');
    clone.classList.add('capture-clean');
    clone.classList.remove('result-mobile-layout', 'result-desktop-layout');
    clone.style.setProperty('--capture-accent-glow', accentGlow);
    clone.style.setProperty('--capture-width', `${RESULT_CAPTURE_WIDTH}px`);
    clone.style.setProperty('--accent-glow', accentGlow);
    clone.style.borderRadius = '24px';
    clone.style.overflow = 'hidden';
    normalizeCaptureTypography(clone);

    // relationExplainBody 안에서 짧은 관계궁합 요약(re-heading/re-lover-friend/re-quote)만 남기고
    // 그 뒤에 이어붙는 상세 해설(compat-detail-wrap)은 제거
    clone.querySelectorAll('.compat-detail-wrap').forEach(el => el.remove());
    clone.querySelectorAll('.re-caveat').forEach(el => el.remove());

    // "관계궁합" 카드 이후에 이어지는 심층 설명(년지/일지 궁합), 서포트 노트,
    // 데이트 아이디어, 꽃말 상세 설명은 이미지에서 제외
    ['#deepCompat', '#supportNote', '#recCoupleExtraGrid', '#recDateIdeasBlock', '#recTouchBlock', '#flowerMeaningDetails']
      .forEach(sel => { const el = clone.querySelector(sel); if (el) el.remove(); });

    const sandbox = document.createElement('div');
    sandbox.className = 'capture-sandbox';

    /* 모든 기기에서 PC 저장본과 동일한 992px 기준으로 저장합니다. scale 2이므로 결과 폭은 1984px입니다. */
    const captureWidth = RESULT_CAPTURE_WIDTH;
    sandbox.style.width = `${captureWidth}px`;
    clone.style.width = `${captureWidth}px`;
    sandbox.appendChild(clone);
    document.body.appendChild(sandbox);

    try {
      await waitForCaptureAssets(clone);

      /* 바깥 sandbox가 아니라 정리된 카드 자체만 캡처해 여백/모서리 잔상을 차단 */
      const canvas = await html2canvas(clone, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
        imageTimeout: 15000,
        scrollX: 0,
        scrollY: 0,
        windowWidth: RESULT_CAPTURE_WIDTH,
        onclone: clonedDocument => {
          const captured = clonedDocument.querySelector('.capture-clean');
          if (!captured) return;

          /* clone이 새 문서에 재배치되며 상속 폰트 크기가 흔들릴 수 있어
             캡처 직전 시점에 한 번 더 강제 적용합니다. */
          normalizeCaptureTypography(captured);

          /* 가상 요소 없이도 화면과 같은 계절색과 둥근 테두리가 저장되도록 고정 */
          captured.style.setProperty('width', `${captureWidth}px`, 'important');
          captured.style.setProperty('--capture-width', `${captureWidth}px`);
          captured.style.maxWidth = 'none';
          captured.style.zoom = '1';
          captured.style.setProperty('--capture-accent-glow', accentGlow);
          captured.style.setProperty('--accent-glow', accentGlow);
          captured.style.backgroundColor = '#ffffff';
          captured.style.backgroundImage = `radial-gradient(ellipse 95% 85% at 50% 0%, ${accentGlow}, transparent 75%)`;
          captured.style.backgroundRepeat = 'no-repeat';
          captured.style.border = '1px solid #e6e7eb';
          captured.style.borderRadius = '24px';
          captured.style.overflow = 'hidden';
          captured.style.boxShadow = 'none';
          captured.style.filter = 'none';
        },
      });
      const stamp = new Date().toISOString().slice(0, 10);
      const filename = `season-궁합-${stamp}.png`;
      const blob = await canvasToPngBlob(canvas);
      await deliverSavedImage(blob, filename);
    } catch (e) {
      console.error(e);
      alert('이미지를 저장하는 중 문제가 생겼어요: ' + e.message);
    } finally {
      document.body.removeChild(sandbox);
      btn.disabled = false;
      btn.innerHTML = originalLabel;
    }
  }

  async function handleSaveFullImage(btn) {
    if (typeof html2canvas === 'undefined') {
      alert('이미지 저장 기능을 불러오지 못했어요. 네트워크 연결을 확인한 뒤 다시 시도해주세요.');
      return;
    }
    const result = document.getElementById('result');
    if (!result) return;

    ensureSaveImageStyles();
    const originalLabel = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '전체 결과 만드는 중…';

    const clone = result.cloneNode(true);
    clone.removeAttribute('id');
    clone.classList.add('capture-full');
    clone.style.setProperty('--capture-width', `${RESULT_CAPTURE_WIDTH}px`);
    clone.style.display = 'block';
    clone.querySelector('.save-image-row')?.remove();
    normalizeCaptureTypography(clone);

    const sandbox = document.createElement('div');
    sandbox.className = 'capture-sandbox';
    sandbox.style.width = `${RESULT_CAPTURE_WIDTH}px`;
    sandbox.appendChild(clone);
    document.body.appendChild(sandbox);

    try {
      await waitForCaptureAssets(clone);
      const canvas = await html2canvas(clone, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
        imageTimeout: 15000,
        scrollX: 0,
        scrollY: 0,
        windowWidth: RESULT_CAPTURE_WIDTH,
        onclone: clonedDocument => {
          const captured = clonedDocument.querySelector('.capture-full');
          if (!captured) return;

          /* clone이 새 문서에 재배치되며 상속 폰트 크기가 흔들릴 수 있어
             캡처 직전 시점에 한 번 더 강제 적용합니다. (추천 시간대 등
             블록별 폰트 크기 불일치를 막는 핵심 처리) */
          normalizeCaptureTypography(captured);

          captured.style.display = 'block';
          captured.style.setProperty('width', `${RESULT_CAPTURE_WIDTH}px`, 'important');
          captured.style.maxWidth = 'none';
          captured.style.margin = '0';
          captured.style.paddingBottom = '24px';
          captured.style.background = '#ffffff';
          captured.style.overflow = 'visible';
        },
      });
      const stamp = new Date().toISOString().slice(0, 10);
      const blob = await canvasToPngBlob(canvas);
      await deliverSavedImage(blob, `season-궁합-전체-${stamp}.png`);
    } catch (e) {
      console.error(e);
      alert('전체 결과를 저장하는 중 문제가 생겼어요: ' + e.message);
    } finally {
      document.body.removeChild(sandbox);
      btn.disabled = false;
      btn.innerHTML = originalLabel;
    }
  }

  const saveImageBtn = document.getElementById('saveImageBtn');
  if (saveImageBtn) {
    saveImageBtn.addEventListener('click', () => handleSaveResultImage(saveImageBtn));
  }
  const saveFullImageBtn = document.getElementById('saveFullImageBtn');
  if (saveFullImageBtn) {
    saveFullImageBtn.addEventListener('click', () => handleSaveFullImage(saveFullImageBtn));
  }
})();
