(function () {
  const { calculateSaju, calculateSajuApprox, generateCoupleRecommendation,
          generateCoupleRecommendationApprox, OHAENG_INFO } = window.SajuCore;

  const OHAENG_COLOR = {
    목: '#7fa473', 화: '#d98a7c', 토: '#b3a077', 금: '#a6a190', 수: '#7ba0c4',
  };
  const OHAENG_GLOW = {
    목: 'rgba(127,164,115,0.10)', 화: 'rgba(217,138,124,0.10)', 토: 'rgba(179,160,119,0.10)',
    금: 'rgba(166,161,144,0.09)', 수: 'rgba(123,160,196,0.10)',
  };

  // 일간 관계(상생/상극/동기/중립)에 대한 연인·친구 궁합 해설
  const RELATION_EXPLAIN = {
    상생: {
      emoji: '🌱',
      title: '상생 — 가장 편안하고 오래가는 관계',
      lover: ['함께 있으면 서로 더 좋은 사람이 되는 느낌', '자연스럽게 응원하고 배려함', '싸워도 금방 풀림', '서로의 장점을 키워줌'],
      friend: ['힘들 때 가장 먼저 찾게 되는 친구', '같이 있으면 에너지가 충전됨', '서로 도움을 주고받으며 오래 감'],
      quote: '너랑 있으면 내가 더 좋아지는 것 같아.',
    },
    상극: {
      emoji: '⚔️',
      title: '상극 — 강하게 끌리기도 하지만 자주 부딪히는 관계',
      lover: ['첫인상이 강렬하거나 끌릴 수도 있음', '하지만 가치관이나 생활 방식이 자주 충돌', '자존심 싸움이 생기기 쉬움', '서로 맞춰가면 크게 성장하기도 함'],
      friend: ['친하지만 자주 티격태격', '서로 지적을 많이 함', '가끔은 스트레스를 주기도 함'],
      quote: '좋아하긴 하는데 왜 이렇게 싸우지?',
      caveat: '※ 상극이 반드시 나쁜 관계는 아닙니다. 서로를 변화시키고 성장시키는 계기가 되기도 합니다.',
    },
    동기: {
      emoji: '🤝',
      title: '동기 — 너무 잘 통하는 관계',
      lover: ['취향과 생각이 비슷함', '말이 잘 통함', '서로를 잘 이해함', '하지만 둘 다 고집이 세면 양보를 안 할 수도 있음'],
      friend: ['베스트프렌드가 되기 쉬움', '같이 놀면 시간 가는 줄 모름', '관심사가 비슷해서 편함'],
      quote: '너랑 있으면 나를 보는 것 같아.',
    },
    중립: {
      emoji: '⚖️',
      title: '중립 — 편안하지만 특별한 자극은 적은 관계',
      lover: ['크게 싸우지도 않고 크게 불타지도 않음', '안정적이지만 심심하게 느껴질 수도 있음', '시간이 지나며 정이 드는 스타일'],
      friend: ['만나면 반갑지만 자주 연락하지는 않음', '필요할 때 편하게 만날 수 있음'],
      quote: '편하긴 한데, 엄청 특별한 느낌은 아니야.',
    },
  };
  const RELATION_GENERAL_CAVEAT = '사주에서 이 관계를 볼 때는 오행 궁합 하나만으로 판단하지 않아요. 상극이라도 전체 사주가 잘 맞으면 좋은 인연이 될 수 있고, 상생이라도 다른 요소가 맞지 않으면 어려움을 겪을 수 있어요. 상생·상극은 두 사람 관계의 한 가지 성향을 보여주는 지표로 이해해주세요.';

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
    목: '새로운 데이트를 정하거나 둘의 다음 계획을 세울 때 서로 눈치만 보며 시작이 늦어질 수 있어요. 여행 날짜, 이번 달에 해볼 일처럼 첫 행동을 미리 정해두면 편합니다.',
    화: '좋아하는 마음이 있어도 말이나 표정으로 잘 드러나지 않아 관계가 심심하게 느껴질 수 있어요. “보고 싶었어”, “오늘 좋았어”처럼 짧은 표현을 자주 해주는 게 도움이 됩니다.',
    토: '약속, 돈, 일정, 집안일처럼 반복해서 챙겨야 하는 일을 서로 미루기 쉬워요. 누가 무엇을 언제까지 할지 정해두면 사소한 다툼을 줄일 수 있습니다.',
    금: '싫은 점이나 지켜야 할 선을 분명하게 말하지 못해 문제가 오래 끌 수 있어요. 연락 빈도, 돈 쓰는 방식, 친구 관계처럼 민감한 기준은 미리 말로 맞춰두는 편이 좋습니다.',
    수: '감정이 올라왔을 때 잠깐 멈추거나 상대 이야기를 끝까지 듣는 여유가 부족할 수 있어요. 바로 결론 내리기보다 20분 정도 쉬고 다시 이야기할 시간을 정해두는 방식이 잘 맞습니다.',
  };

  const ELEMENT_HELP_TEXT = {
    목: (supporter, receiver) => `${supporter}님은 ${receiver}님이 앞으로 무엇을 해야 할지 막막해할 때, 새로운 선택지를 꺼내고 첫 단계를 정하는 데 도움을 주는 편입니다.`,
    화: (supporter, receiver) => `${supporter}님은 ${receiver}님이 기분이 가라앉거나 표현을 망설일 때, 먼저 말을 걸고 분위기를 풀어주는 역할을 하기 쉽습니다.`,
    토: (supporter, receiver) => `${supporter}님은 ${receiver}님이 일정·약속·생활 문제로 흔들릴 때, 해야 할 일을 차근차근 정리하고 꾸준히 챙겨주는 편입니다.`,
    금: (supporter, receiver) => `${supporter}님은 ${receiver}님이 결정을 미루거나 기준을 잡지 못할 때, 선택지를 정리하고 분명한 결론을 내리도록 돕는 편입니다.`,
    수: (supporter, receiver) => `${supporter}님은 ${receiver}님이 감정이 복잡할 때, 서둘러 답을 요구하기보다 이야기를 들어주고 마음을 정리할 시간을 주는 편입니다.`,
  };

  const ELEMENT_SHARED_STRONG = {
    목: '둘 다 새로운 장소나 활동을 찾는 데 적극적이라 데이트가 단조롭지 않은 편입니다. 다만 계획이 자주 바뀌거나 시작만 하고 마무리가 늦어질 수 있어요.',
    화: '둘 다 반응과 애정 표현이 빠르기 때문에 즐거울 때는 분위기가 금방 달아오릅니다. 반대로 서운할 때도 말이 빨라져 싸움이 커지기 쉬워요.',
    토: '둘 다 약속과 익숙한 생활을 중요하게 여겨 안정적인 관계를 만들기 쉽습니다. 다만 한 번 정한 방식에서 물러서지 않아 고집 대결이 생길 수 있어요.',
    금: '둘 다 약속, 예의, 관계의 기준을 중요하게 여겨 서로 믿을 만한 사람이라고 느끼기 쉽습니다. 다만 상대의 부족한 점을 빠르게 지적하는 분위기가 될 수 있어요.',
    수: '둘 다 조용히 생각하고 깊게 대화하는 시간을 편하게 느낍니다. 다만 속마음을 먼저 꺼내지 않아 서로 괜찮은 줄 알고 지나칠 수 있어요.',
  };

  const ELEMENT_SHARED_GAP = {
    목: '둘 다 새로운 계획을 먼저 꺼내는 데 약할 수 있으니, 한 달에 한 번은 번갈아 데이트 장소나 여행 계획을 정하는 방식이 좋습니다.',
    화: '둘 다 애정 표현을 기다리는 편이 될 수 있으니, 고맙거나 보고 싶을 때는 상대가 알아주길 기다리지 말고 바로 말해주세요.',
    토: '돈, 일정, 집안일처럼 꾸준히 관리해야 하는 부분이 흐트러질 수 있으니 공동 캘린더나 역할표를 사용하는 편이 좋습니다.',
    금: '연락 기준이나 서로 지켜야 할 선이 애매해질 수 있으니, 불편한 일이 생기기 전에 구체적인 기준을 말로 정해주세요.',
    수: '싸운 뒤 감정을 가라앉히고 천천히 대화하는 과정이 부족할 수 있으니, 잠시 쉬었다가 다시 이야기할 시간을 약속하는 것이 좋습니다.',
  };

  const SANGSAENG_PAIR_SCENE = {
    '목>화': (a, b) => `${a}님이 새로운 데이트나 계획을 꺼내면 ${b}님이 반응과 추진력을 더하는 조합입니다. 아이디어만 있던 일을 실제 약속으로 옮길 때 손발이 잘 맞을 수 있어요.`,
    '화>토': (a, b) => `${a}님이 따뜻한 말과 애정 표현으로 관계의 분위기를 만들면 ${b}님이 그것을 꾸준한 연락과 약속으로 이어가는 조합입니다. 즐거움이 일상의 안정감으로 연결되기 쉬워요.`,
    '토>금': (a, b) => `${a}님이 차분하게 상황을 정리하고 기다려주면 ${b}님이 기준을 세우고 결정을 내리는 조합입니다. 돈, 일정, 장기 계획처럼 현실적인 문제를 함께 처리할 때 장점이 잘 드러납니다.`,
    '금>수': (a, b) => `${a}님이 복잡한 문제의 핵심을 정리해주면 ${b}님이 감정과 상황을 살펴 더 부드러운 방법을 찾는 조합입니다. 한 사람은 결론을 잡고 다른 사람은 분위기를 조율하는 식으로 역할이 나뉘기 쉬워요.`,
    '수>목': (a, b) => `${a}님이 충분히 들어주고 생각할 여유를 만들어주면 ${b}님이 자신감을 얻어 새로운 시도를 시작하는 조합입니다. ${b}님은 ${a}님 곁에서 막막했던 생각을 실제 계획으로 바꾸기 쉬워요.`,
  };

  const SANGGEUK_PAIR_SCENE = {
    '목>토': (a, b) => `${a}님은 변화를 빨리 시작하려 하고 ${b}님은 익숙한 방식과 안정성을 지키려는 편이라, ${a}님은 답답함을 느끼고 ${b}님은 재촉받는다고 느낄 수 있습니다. 여행·이사·돈처럼 큰 결정은 바로 결론 내기보다 검토 기간을 함께 정하는 것이 좋아요.`,
    '토>수': (a, b) => `${a}님은 관계를 분명하고 안정적으로 만들고 싶어 하지만 ${b}님은 상황에 따라 움직일 여유가 필요합니다. ${a}님이 답을 재촉하면 ${b}님이 말을 줄일 수 있으니, 언제까지 생각한 뒤 답할지 시간을 정해주는 방식이 잘 맞습니다.`,
    '수>화': (a, b) => `${a}님은 먼저 상황을 지켜보고 생각하려 하고 ${b}님은 바로 표현하고 반응하려는 편입니다. ${b}님은 무시당한다고 느끼고 ${a}님은 감정에 압도될 수 있으니, 잠시 쉬되 다시 대화할 시각을 확실히 약속해주세요.`,
    '화>금': (a, b) => `${a}님은 순간의 감정과 즐거움을 중요하게 여기고 ${b}님은 약속과 기준을 정확히 지키려는 편입니다. ${a}님은 지적받는다고 느끼고 ${b}님은 말이 자주 바뀐다고 느낄 수 있으니, 즉흥적인 선택이 가능한 범위를 미리 정해두면 좋습니다.`,
    '금>목': (a, b) => `${a}님은 문제를 정확히 짚고 고치려 하지만 ${b}님은 자유롭게 시도하며 배우는 편입니다. ${a}님의 조언이 잦아지면 ${b}님은 통제받는다고 느낄 수 있으니, 지적보다 “나는 이렇게 해줬으면 좋겠어”라는 요청으로 말하는 것이 좋습니다.`,
  };

  function buildElementHelpSentences(supporter, receiver, elements) {
    return elements.slice(0, 2).map(k => (ELEMENT_HELP_TEXT[k] ? ELEMENT_HELP_TEXT[k](supporter, receiver) : '')).filter(Boolean);
  }

  function buildWeakEverydayText(stats) {
    const targets = stats.missing.length ? stats.missing : stats.weak.slice(0, 2);
    return targets.slice(0, 2).map(k => ELEMENT_LOW_GUIDE[k]).filter(Boolean).join(' ');
  }

  function buildCombinedEverydayText(stats) {
    const strongText = stats.dominant.slice(0, 2).map(k => ELEMENT_SHARED_STRONG[k]).filter(Boolean).join(' ');
    const lowTargets = stats.missing.length ? stats.missing : stats.weak;
    const lowText = lowTargets.slice(0, 2).map(k => ELEMENT_SHARED_GAP[k]).filter(Boolean).join(' ');
    return `${strongText} ${lowText}`.trim();
  }

  const RELATION_DIRECTION_TEXT = {
    aGeneratesB: ({ nameA, nameB, aDay, bDay }) => {
      const scene = SANGSAENG_PAIR_SCENE[`${aDay}>${bDay}`];
      return scene ? scene(nameA, nameB) : `${nameA}님이 먼저 힘을 보태고 ${nameB}님이 그 도움을 받아 움직이기 쉬운 관계입니다.`;
    },
    bGeneratesA: ({ nameA, nameB, aDay, bDay }) => {
      const scene = SANGSAENG_PAIR_SCENE[`${bDay}>${aDay}`];
      return scene ? scene(nameB, nameA) : `${nameB}님이 먼저 힘을 보태고 ${nameA}님이 그 도움을 받아 움직이기 쉬운 관계입니다.`;
    },
    aControlsB: ({ nameA, nameB, aDay, bDay }) => {
      const scene = SANGGEUK_PAIR_SCENE[`${aDay}>${bDay}`];
      return scene ? scene(nameA, nameB) : `${nameA}님이 기준을 먼저 정하고 ${nameB}님이 맞춰야 하는 상황이 반복될 수 있습니다. 역할과 결정 범위를 미리 나누는 것이 좋아요.`;
    },
    bControlsA: ({ nameA, nameB, aDay, bDay }) => {
      const scene = SANGGEUK_PAIR_SCENE[`${bDay}>${aDay}`];
      return scene ? scene(nameB, nameA) : `${nameB}님이 기준을 먼저 정하고 ${nameA}님이 맞춰야 하는 상황이 반복될 수 있습니다. 역할과 결정 범위를 미리 나누는 것이 좋아요.`;
    },
    same: ({ nameA, nameB, aDay }) =>
      `두 사람은 ${aDay}(${OHAENG_HANJA[aDay]}) 성향을 함께 가지고 있어, 중요하게 여기는 점과 반응 속도가 비슷합니다. 설명하지 않아도 통하는 순간이 많지만 같은 문제에서 동시에 고집을 부릴 수도 있어요. “나도 같을 거야”라고 넘기지 말고, 원하는 결론과 속도를 따로 확인하는 것이 좋습니다.`,
    neutral: ({ nameA, nameB }) =>
      `${nameA}님과 ${nameB}님은 처음부터 누가 이끌고 누가 맞춰주는지가 정해지는 관계는 아닙니다. 같은 취미를 정기적으로 함께 하거나, 여행·공연·맛집 탐방처럼 둘 다 즐거웠던 경험을 하나씩 쌓을수록 신뢰와 친밀감이 커지는 조합입니다.`,
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
    const day = getDayOhaeng(saju);
    const stats = analyzeOhaengCount(saju?.ohaengCount);
    const dominant = stats.dominant[0] || day || '토';
    const trait = OHAENG_RELATION_TRAITS[dominant];
    const weakText = buildWeakEverydayText(stats);
    return {
      name,
      day,
      stats,
      dominant,
      trait,
      summary: `${name}님은 사주에서 ${day ? `${day}(${OHAENG_HANJA[day]})` : '확인되지 않은'} 성향을 중심으로 보고, 실제 관계에서는 ${trait.core}입니다. 특히 ${trait.love}을 느낄 때 상대의 마음을 확실히 믿는 편이에요.`,
      caution: `잘하는 점은 ${trait.strength}입니다. 다만 갈등이 생기면 ${trait.shadow}가 나타나기 쉬워요. ${weakText}`,
    };
  }

  function getJijiSignal(relInfo) {
    if (!relInfo) return 0;
    if (relInfo.tone === 'good') return 2;
    if (relInfo.tone === 'clash') return -2;
    if (relInfo.tone === 'friction') return -1;
    return 0;
  }

  function buildJijiSynthesis(compat, nameA, nameB) {
    const year = compat?.yearJijiRelation || { type: '평', tone: 'neutral' };
    const day = compat?.dayJijiRelation || { type: '평', tone: 'neutral' };
    const yearSignal = getJijiSignal(year);
    const daySignal = getJijiSignal(day);

    if (daySignal > 0 && yearSignal > 0) {
      return `일지의 ${day.type}과 년지의 ${year.type}이 모두 긍정적으로 작용합니다. 가까이 지낼수록 편안한 정서적 호흡이 생기고, 가족·생활환경·장기 계획에서도 방향을 맞추기 쉬운 조합이에요.`;
    }
    if (daySignal > 0 && yearSignal < 0) {
      return `둘만 있을 때의 정서적 호흡은 일지 ${day.type}으로 좋은 편이지만, 년지 ${year.type}의 영향으로 가족관계·사회생활·생활 습관에서는 차이가 커질 수 있습니다. 애정 자체보다 주변 환경을 조율하는 일이 장기 관계의 핵심이에요.`;
    }
    if (daySignal < 0 && yearSignal > 0) {
      return `겉으로 보이는 생활 방향과 사회적 호흡은 년지 ${year.type}으로 잘 맞지만, 가까워질수록 일지 ${day.type}의 긴장이 드러날 수 있습니다. 바깥에서는 좋은 팀인데 사적인 감정 문제를 미루기 쉬운 조합이므로, 둘만의 대화 시간을 따로 확보하는 것이 좋아요.`;
    }
    if (daySignal < 0 && yearSignal < 0) {
      return `일지 ${day.type}과 년지 ${year.type}이 모두 마찰 신호를 보여, 감정 표현과 생활 방식 양쪽에서 차이가 반복될 가능성이 있습니다. 끌림이 강하더라도 관계 규칙을 구체적으로 정하지 않으면 같은 갈등이 되풀이될 수 있어요.`;
    }
    if (day.type === '동일' || year.type === '동일') {
      return `지지에 동일 관계가 있어 익숙함과 친밀감이 빠르게 생기기 쉽습니다. 다만 비슷한 약점과 생활 습관도 함께 증폭될 수 있어, 서로가 못하는 부분을 상대가 자동으로 채워줄 것이라 기대하지 않는 편이 좋아요.`;
    }
    return `${nameA}님과 ${nameB}님의 년지·일지 관계는 한쪽으로 강하게 기울기보다 무난한 편입니다. 연락을 얼마나 자주 할지, 돈과 주말 일정을 어떻게 나눌지, 어떤 취미를 함께 즐길지처럼 실제 생활에서 맞춰가는 방식이 관계 만족도를 더 크게 좌우해요.`;
  }

  function buildComplementInsight(profileA, profileB, compat) {
    const aFillsB = compat?.complement?.aFillsB || [];
    const bFillsA = compat?.complement?.bFillsA || [];
    const sharedMissing = profileA.stats.missing.filter(k => profileB.stats.missing.includes(k));
    const sharedDominant = profileA.stats.dominant.filter(k => profileB.stats.dominant.includes(k));
    const lines = [];

    if (aFillsB.length && bFillsA.length) {
      lines.push('두 사람은 서로에게 도움이 되는 방식이 다릅니다. 한쪽만 계속 챙기는 관계라기보다, 상황에 따라 도움을 주고받기 쉬운 조합이에요.');
      lines.push(...buildElementHelpSentences(profileA.name, profileB.name, aFillsB));
      lines.push(...buildElementHelpSentences(profileB.name, profileA.name, bFillsA));
    } else if (aFillsB.length) {
      lines.push(...buildElementHelpSentences(profileA.name, profileB.name, aFillsB));
      lines.push(`${profileA.name}님이 먼저 챙기는 상황이 반복될 수 있으니, ${profileB.name}님도 상대가 힘들어할 때 연락을 먼저 하거나 약속을 대신 준비하는 식으로 행동으로 되돌려주는 것이 중요합니다.`);
    } else if (bFillsA.length) {
      lines.push(...buildElementHelpSentences(profileB.name, profileA.name, bFillsA));
      lines.push(`${profileB.name}님이 먼저 챙기는 상황이 반복될 수 있으니, ${profileA.name}님도 상대가 힘들어할 때 연락을 먼저 하거나 약속을 대신 준비하는 식으로 행동으로 되돌려주는 것이 중요합니다.`);
    } else {
      lines.push('두 사람은 잘하는 점과 어려워하는 부분이 비슷한 편입니다. 서로 편하게 느끼기는 쉽지만, 둘 다 미루는 문제는 상대가 알아서 해결해주기를 기다리기보다 담당을 정하는 것이 좋아요.');
    }

    sharedDominant.slice(0, 2).forEach(k => {
      if (ELEMENT_SHARED_STRONG[k]) lines.push(ELEMENT_SHARED_STRONG[k]);
    });
    sharedMissing.slice(0, 2).forEach(k => {
      if (ELEMENT_SHARED_GAP[k]) lines.push(ELEMENT_SHARED_GAP[k]);
    });
    return lines;
  }

  function buildConflictScenario(profileA, profileB, direction, compat) {
    const dayTone = compat?.dayJijiRelation?.tone;
    const yearTone = compat?.yearJijiRelation?.tone;
    const base = [];

    if (direction === 'aControlsB' || direction === 'bControlsA') {
      const controller = direction === 'aControlsB' ? profileA : profileB;
      const receiver = direction === 'aControlsB' ? profileB : profileA;
      base.push(`${controller.name}님이 해결책과 기준을 먼저 제시하고, ${receiver.name}님이 통제받는다고 느끼는 패턴을 조심해야 합니다.`);
    } else if (direction === 'same') {
      base.push('두 사람이 같은 논리와 감정으로 동시에 버티면서, 작은 문제가 자존심 대결로 길어지는 패턴을 조심해야 합니다.');
    } else if (direction === 'aGeneratesB' || direction === 'bGeneratesA') {
      const giver = direction === 'aGeneratesB' ? profileA : profileB;
      const receiver = direction === 'aGeneratesB' ? profileB : profileA;
      base.push(`${giver.name}님이 계속 이해하고 북돋우다가 지치고, ${receiver.name}님은 문제를 늦게 알아차리는 비대칭을 조심해야 합니다.`);
    } else {
      base.push('서로 나쁘게 생각하지 않지만 기대하는 방식이 달라, 설명 없이 기다리다가 서운함이 누적되는 패턴을 조심해야 합니다.');
    }

    if (dayTone === 'clash') base.push('특히 감정이 가까워질수록 즉각 반응하지 말고, 사실·감정·요청을 나누어 말하는 방식이 필요합니다.');
    else if (dayTone === 'friction') base.push('큰 사건보다 잔소리, 말투, 연락 속도 같은 작은 마찰을 그날그날 정리하는 것이 효과적입니다.');

    if (yearTone === 'clash' || yearTone === 'friction') base.push('가족, 돈, 시간 사용, 공개적인 관계 방식은 초기에 기준을 맞춰두는 것이 좋습니다.');
    return base;
  }

  function buildRelationshipFlow(profileA, profileB, compat) {
    const relation = compat?.relation;
    const daySignal = getJijiSignal(compat?.dayJijiRelation);
    const complementCount = (compat?.complement?.aFillsB?.length || 0) + (compat?.complement?.bFillsA?.length || 0);

    if (relation === '상생' && daySignal > 0 && complementCount >= 2) {
      return '초반의 호감뿐 아니라 시간이 지날수록 신뢰가 쌓이는 장기 안정형입니다. 한 사람은 계획을 세우고 다른 사람은 분위기를 풀어주는 식으로 역할이 자연스럽게 나뉘기 쉬워, 여행·저축·운동처럼 함께할 목표를 정하면 관계가 더 단단해집니다.';
    }
    if (relation === '상극' && daySignal < 0) {
      return '끌림과 긴장이 동시에 큰 고자극형입니다. 관계가 빠르게 깊어질 수 있지만, 갈등 규칙이 없으면 좋을 때와 힘들 때의 진폭도 커집니다. 속도 조절과 경계 존중이 핵심입니다.';
    }
    if (relation === '동기' && complementCount === 0) {
      return '친구처럼 빠르게 가까워지는 관계입니다. 말이 잘 통하고 같은 취미를 즐기기 쉽지만, 약속 잡기·돈 관리·사과하기처럼 둘 다 어려워하는 일은 함께 미룰 수 있어요. 이런 일은 번갈아 맡는 편이 좋습니다.';
    }
    if (daySignal > 0) {
      return '겉보기보다 가까워질수록 편안함이 커지는 관계입니다. 큰 이벤트보다 일상적인 연락, 식사, 생활 리듬을 꾸준히 공유할 때 애정이 안정됩니다.';
    }
    if (daySignal < 0) {
      return '초반의 매력과 별개로 가까워진 뒤 조정이 필요한 관계입니다. 서로를 바꾸려 하기보다 각자 절대 양보하기 어려운 기준과 조정 가능한 부분을 나눠야 합니다.';
    }
    return '처음부터 강하게 끌리기보다 함께 지내며 정이 쌓이는 관계입니다. 같은 운동이나 게임, 영화 감상처럼 꾸준히 할 취미를 하나 만들고, 여행·공연·맛집 탐방처럼 둘 다 즐거웠던 경험을 반복해서 쌓을수록 가까워집니다.';
  }

  function buildActionTips(profileA, profileB, direction, compat) {
    const tips = [];
    tips.push(`${profileA.name}님에게는 ${profileA.trait.repair}이 효과적입니다.`);
    tips.push(`${profileB.name}님에게는 ${profileB.trait.repair}이 효과적입니다.`);

    if (direction === 'aGeneratesB' || direction === 'bGeneratesA') {
      tips.push('배려를 받은 사람이 “고마워”에서 끝내지 않고, 다음 행동으로 되돌려주는 순환을 만드는 것이 좋습니다.');
    } else if (direction === 'aControlsB' || direction === 'bControlsA') {
      tips.push('상대의 행동을 교정하려 하기 전에 “내가 필요한 것은 무엇인지”를 요청형 문장으로 말해주세요.');
    } else if (direction === 'same') {
      tips.push('의견이 같아 보여도 각자 원하는 결론과 속도가 같은지 한 번 더 확인해주세요.');
    }

    if (compat?.dayJijiRelation?.tone === 'clash') tips.push('격한 순간에는 최소 20~30분의 냉각 시간을 갖고, 다시 대화할 시각을 반드시 정하세요.');
    if (compat?.yearJijiRelation?.tone === 'clash') tips.push('돈·가족·주말 일정·연락 공개 범위처럼 생활 문제는 감정이 좋을 때 미리 합의해두세요.');
    return tips.slice(0, 5);
  }

  function ensureCompatDetailStyles() {
    if (document.getElementById('compat-detail-styles')) return;
    const style = document.createElement('style');
    style.id = 'compat-detail-styles';
    style.textContent = `
      .compat-detail-wrap{margin-top:20px;padding-top:18px;border-top:1px solid rgba(107,99,85,.16)}
      .compat-detail-title{font-weight:800;font-size:17px;margin-bottom:12px;color:#4f493f}
      .compat-summary-card{padding:14px 16px;margin:10px 0;border-radius:14px;background:rgba(163,128,63,.07);line-height:1.75}
      .compat-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:12px 0}
      .compat-card{padding:14px;border:1px solid rgba(107,99,85,.14);border-radius:14px;background:rgba(255,255,255,.55);line-height:1.7}
      .compat-card h4{margin:0 0 8px;font-size:14px;color:#6b5328}
      .compat-card p{margin:6px 0}
      .compat-chip-row{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
      .compat-chip{display:inline-flex;padding:4px 9px;border-radius:999px;background:rgba(163,128,63,.10);font-size:12px}
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
    const directionText = RELATION_DIRECTION_TEXT[direction]({ nameA, nameB, aDay: profileA.day, bDay: profileB.day });
    const complements = buildComplementInsight(profileA, profileB, compat);
    const conflicts = buildConflictScenario(profileA, profileB, direction, compat);
    const tips = buildActionTips(profileA, profileB, direction, compat);
    const flow = buildRelationshipFlow(profileA, profileB, compat);
    const combinedCount = Object.fromEntries(OHAENG_ORDER.map(k => [k, profileA.stats.count[k] + profileB.stats.count[k]]));
    const combinedStats = analyzeOhaengCount(combinedCount);

    const chipsA = [
      `일간 ${profileA.day}(${OHAENG_HANJA[profileA.day]})`,
      `강점 ${formatOhaengList(profileA.stats.dominant)}`,
      profileA.stats.missing.length ? `적게 나타남 ${formatOhaengList(profileA.stats.missing)}` : `덜 두드러짐 ${formatOhaengList(profileA.stats.weak.slice(0, 1))}`,
      `균형 ${profileA.stats.balanceScore}`,
    ];
    const chipsB = [
      `일간 ${profileB.day}(${OHAENG_HANJA[profileB.day]})`,
      `강점 ${formatOhaengList(profileB.stats.dominant)}`,
      profileB.stats.missing.length ? `적게 나타남 ${formatOhaengList(profileB.stats.missing)}` : `덜 두드러짐 ${formatOhaengList(profileB.stats.weak.slice(0, 1))}`,
      `균형 ${profileB.stats.balanceScore}`,
    ];

    return `
      <section class="compat-detail-wrap">
        <div class="compat-detail-title">두 사람의 사주를 함께 본 상세 궁합</div>
        <div class="compat-summary-card"><b>관계의 핵심 흐름</b><br>${directionText}</div>

        <div class="compat-grid">
          <article class="compat-card">
            <h4>${nameA}님의 관계 성향</h4>
            <div class="compat-chip-row">${chipsA.map(x => `<span class="compat-chip">${x}</span>`).join('')}</div>
            <p>${profileA.summary}</p>
            <p>${profileA.caution}</p>
          </article>
          <article class="compat-card">
            <h4>${nameB}님의 관계 성향</h4>
            <div class="compat-chip-row">${chipsB.map(x => `<span class="compat-chip">${x}</span>`).join('')}</div>
            <p>${profileB.summary}</p>
            <p>${profileB.caution}</p>
          </article>
        </div>

        <div class="compat-card">
          <h4>가까워졌을 때 나타나는 궁합</h4>
          <p>${buildJijiSynthesis(compat, nameA, nameB)}</p>
          <p><b>관계의 진행 방식:</b> ${flow}</p>
        </div>

        <div class="compat-grid">
          <article class="compat-card">
            <h4>상대에게 실제로 도움이 되는 부분</h4>
            <ul class="compat-list">${complements.map(x => `<li>${x}</li>`).join('')}</ul>
          </article>
          <article class="compat-card">
            <h4>반복되기 쉬운 갈등</h4>
            <ul class="compat-list">${conflicts.map(x => `<li>${x}</li>`).join('')}</ul>
          </article>
        </div>

        <div class="compat-card">
          <h4>두 사람이 함께 있을 때 두드러지는 모습</h4>
          <p>${buildCombinedEverydayText(combinedStats)}</p>
          <p>데이트나 공동 활동은 ${profileA.trait.activity}, 그리고 ${profileB.trait.activity}을 번갈아 선택하면 두 사람의 만족도를 고르게 맞추는 데 도움이 됩니다.</p>
        </div>

        <div class="compat-card">
          <h4>관계를 오래 유지하는 실천법</h4>
          <ol class="compat-list">${tips.map(x => `<li>${x}</li>`).join('')}</ol>
        </div>
        <div class="compat-muted">※ ‘균형’ 수치는 사주에 같은 성향이 얼마나 몰려 있는지 보여주는 참고값입니다. 점수가 높다고 무조건 좋은 관계라는 뜻은 아닙니다.</div>
      </section>
    `;
  }

  function buildApproxCompatHtml(entryA, entryB, rawNameA, rawNameB) {
    ensureCompatDetailStyles();
    const nameA = escapeHtml(rawNameA);
    const nameB = escapeHtml(rawNameB);
    const countA = entryA.exact ? entryA.exact.ohaengCount : buildApproxCount(entryA.approx);
    const countB = entryB.exact ? entryB.exact.ohaengCount : buildApproxCount(entryB.approx);
    const statsA = analyzeOhaengCount(countA);
    const statsB = analyzeOhaengCount(countB);
    const sharedStrong = statsA.dominant.filter(k => statsB.dominant.includes(k));
    const aFillsB = statsA.dominant.filter(k => statsB.weak.includes(k) || statsB.missing.includes(k));
    const bFillsA = statsB.dominant.filter(k => statsA.weak.includes(k) || statsA.missing.includes(k));
    const observations = [];

    if (aFillsB.length) observations.push(...buildElementHelpSentences(nameA, nameB, aFillsB));
    if (bFillsA.length) observations.push(...buildElementHelpSentences(nameB, nameA, bFillsA));
    if (sharedStrong.length) sharedStrong.slice(0, 2).forEach(k => observations.push(ELEMENT_SHARED_STRONG[k]));
    if (!observations.length) observations.push('현재 입력값만으로는 누가 더 이끌거나 챙기는지가 뚜렷하지 않습니다. 연락 속도, 약속을 잡는 방식, 돈과 시간을 쓰는 습관이 실제 관계에서 더 중요하게 작용합니다.');

    return `
      <section class="compat-detail-wrap">
        <div class="compat-detail-title">확인 가능한 오행으로 본 참고 궁합</div>
        <div class="compat-summary-card">연도가 없는 사람의 일간과 년지·일지는 확정할 수 없지만, 월지와 입력된 시간에서 나타나는 오행 경향으로 두 사람의 분위기를 제한적으로 비교했습니다.</div>
        <div class="compat-grid">
          <article class="compat-card"><h4>${nameA}님</h4><p>두드러지는 성향은 ${formatOhaengList(statsA.dominant)}, 상대적으로 덜 드러나는 성향은 ${formatOhaengList(statsA.weak)}입니다.</p></article>
          <article class="compat-card"><h4>${nameB}님</h4><p>두드러지는 성향은 ${formatOhaengList(statsB.dominant)}, 상대적으로 덜 드러나는 성향은 ${formatOhaengList(statsB.weak)}입니다.</p></article>
        </div>
        <div class="compat-card"><h4>두 사람 사이에서 예상되는 흐름</h4><ul class="compat-list">${observations.map(x => `<li>${x}</li>`).join('')}</ul></div>
        <div class="compat-muted">※ 연도 미상 결과는 일부 기둥만 반영한 추정 해설입니다. 상생·상극, 부부궁, 띠 궁합은 연도를 확인한 뒤에만 정확하게 설명할 수 있습니다.</div>
      </section>
    `;
  }

  function relationExplainHtml(relationKey, nameA, nameB) {
    const r = RELATION_EXPLAIN[relationKey];
    if (!r) return '';
    const li = arr => arr.map(x => `<li>${x}</li>`).join('');
    const namesLabel = (nameA && nameB) ? `${escapeHtml(nameA)} · ${escapeHtml(nameB)}` : '';
    return `
      <div class="re-heading">${r.emoji} ${r.title}${namesLabel ? `<span class="re-names">${namesLabel}</span>` : ''}</div>
      <div class="re-lover-friend">
        <div class="re-block">
          <div class="re-label">연인 ❤️</div>
          <ul>${li(r.lover)}</ul>
        </div>
        <div class="re-block">
          <div class="re-label">친구 🤝</div>
          <ul>${li(r.friend)}</ul>
        </div>
      </div>
      <div class="re-quote">"${r.quote}"</div>
      ${r.caveat ? `<div class="re-block" style="margin-top:10px;">${r.caveat}</div>` : ''}
      <div class="re-caveat">${RELATION_GENERAL_CAVEAT}</div>
    `;
  }

  // 추천 색상 이름 -> 실제 표시용 hex (스와치 렌더링용)
  const COLOR_NAME_HEX = {
    '초록색': '#84ab78', '연두색': '#bcd89a', '청록색': '#7fbcb2',
    '빨간색': '#d98a7c', '주황색': '#eab08a', '핑크색': '#f0b8c4',
    '갈색': '#b08b6e', '황토색': '#cbab7a', '베이지': '#e6dac0',
    '흰색': '#f5f4f0', '금색': '#dcc48f', '은색·그레이': '#c2c2bd',
    '검은색': '#4a4a4a', '남색': '#7186a8', '짙은 파란색': '#82a0bd',
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
    const defaultName = prefix === 'a' ? '첫 번째 사람' : '두 번째 사람';
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
        return { error: `존재하지 않는 날짜입니다 (${month}월 ${day}일)`, name };
      }
      return { yearUnknown: true, month, day, hour, minute, hourUnknown, name };
    }

    const year = parseInt(document.getElementById(prefix + '-year').value, 10);
    const d = new Date(year, month - 1, day);
    if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
      return { error: `존재하지 않는 날짜입니다 (${year}년 ${month}월 ${day}일)`, name };
    }
    return { yearUnknown: false, year, month, day, hour, minute, hourUnknown, name };
  }

  // ---------------------------------------------------------------
  // 계산 실행
  // ---------------------------------------------------------------
  const calcBtn = document.getElementById('calcBtn');
  const errorMsg = document.getElementById('errorMsg');
  const loading = document.getElementById('loading');
  const resultEl = document.getElementById('result');

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
        resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (e) {
        loading.style.display = 'none';
        errorMsg.textContent = '계산 중 오류가 발생했습니다: ' + e.message;
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

    svgContent += `<polygon points="${points.join(' ')}" fill="rgba(163,128,63,0.14)" stroke="#a3803f" stroke-width="2"/>`;

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

  function renderResult(entryA, entryB, rec, inputA, inputB) {
    const anyApprox = !!(entryA.approx || entryB.approx);

    document.getElementById('pillarsDividerLabel').textContent = anyApprox ? '오행 경향 추정' : '사주팔자 명식';

    const approxNoteEl = document.getElementById('approxNote');
    if (anyApprox) {
      approxNoteEl.style.display = 'block';
      approxNoteEl.innerHTML =
        '<b>연도 미상 안내.</b> 사주는 연·월·일·시 네 기둥 모두 태어난 해에 뿌리를 두기 때문에, ' +
        '연도를 모르면 60갑자를 정확히 특정할 수 없어요. 아래 결과는 <b>월지는 절기로 확정</b>하고, ' +
        '<b>일간은 최근 60년을 가정했을 때 가장 흔히 나오는 오행</b>을 보여주는 참고용 추정치입니다. ' +
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
    if (anyApprox) {
      document.getElementById('relationBadge').textContent = '연도 미상으로 일간 간 관계는 추정이 어려워요';
      explainEl.innerHTML =
        '<div class="re-caveat" style="margin-top:0; border-top:none; padding-top:0;">태어난 연도를 몰라 일간을 특정할 수 없어, 상생·상극·동기 같은 관계는 단정하지 않아요. 대신 현재 확인 가능한 오행 경향만으로 제한적인 참고 궁합을 제공합니다.</div>' +
        buildApproxCompatHtml(entryA, entryB, nameA, nameB);
      // 년지/일지 궁합도 연도를 모르면 확정 불가하므로 숨김
      deepCompatEl.style.display = 'none';
    } else {
      const relationLabels = {
        상생: `${nameA}님과 ${nameB}님은 서로를 북돋는 상생(相生) 관계예요`,
        상극: `${nameA}님과 ${nameB}님은 팽팽하게 부딪히는 상극(相剋) 관계예요`,
        동기: `${nameA}님과 ${nameB}님은 반응 방식이 비슷한 동기(同氣) 관계예요`,
        중립: `${nameA}님과 ${nameB}님은 특별한 상호작용 없이 독립적인 관계예요`,
      };
      document.getElementById('relationBadge').textContent = relationLabels[rec.compat.relation];
      explainEl.innerHTML =
        relationExplainHtml(rec.compat.relation, nameA, nameB) +
        buildDetailedCompatHtml(entryA.exact, entryB.exact, rec.compat, nameA, nameB);

      // 더 깊이 본 궁합: 년지(띠)/일지(부부궁) 관계 + 서로에게 도움이 되는 방식
      renderDeepCompat(rec.compat, nameA, nameB);
      deepCompatEl.style.display = 'block';
    }

    // 메인 추천
    const p = rec.primary;
    const hanjaMap = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' };
    document.getElementById('recHanja').textContent = hanjaMap[rec.primaryOhaeng];
    document.getElementById('recHanja').style.color = OHAENG_COLOR[rec.primaryOhaeng];
    document.getElementById('recSeason').textContent = p.season;
    document.getElementById('recKeyword').textContent = `${p.seasonDetail} · ${p.keyword}의 분위기`;

    document.getElementById('recTime').textContent = p.timeRange;
    document.getElementById('recTimeDetail').textContent = p.timeDetail;

    document.getElementById('recColors').innerHTML = colorSwatchesHtml(p.colors);

    const flowersEl = document.getElementById('recFlowers');
    flowersEl.innerHTML = p.flowers.map(f => `<span class="tag">${f}</span>`).join('');

    const placesEl = document.getElementById('recPlaces');
    placesEl.innerHTML = p.places.map(pl => `<span class="tag">${pl}</span>`).join('');

    // 글로우 컬러
    document.getElementById('recHero').style.setProperty('--accent-glow', OHAENG_GLOW[rec.primaryOhaeng]);

    // 추천 이유를 생활 언어로 설명
    const s = rec.support;
    const recommendationEffect = {
      목: '새로운 장소를 찾고 함께 계획을 시작하는 분위기',
      화: '애정 표현이 자연스럽고 활기찬 분위기',
      토: '서두르지 않고 편안하게 머물 수 있는 분위기',
      금: '복잡하지 않고 깔끔하게 정리된 분위기',
      수: '조용히 이야기하고 충분히 쉬어갈 수 있는 분위기',
    }[rec.primaryOhaeng];
    let note =
      `${escapeHtml(nameA)}님과 ${escapeHtml(nameB)}님의 결과에서는 <b>${recommendationEffect}</b>이 상대적으로 덜 드러나는 편이라, ` +
      `${p.season}의 계절감과 ${p.colors[0]} 계열처럼 그 분위기를 쉽게 만들 수 있는 색상·장소를 추천했어요. ` +
      `${s.season}(${s.timeRange})의 느낌을 함께 섞으면 데이트가 한쪽 취향으로만 치우치는 것을 줄일 수 있습니다. 색이나 계절이 관계를 바꾼다는 뜻은 아니며, 데이트 테마를 고르는 참고용이에요.`;
    if (anyApprox) {
      note += ' (연도 미상 추정치를 포함한 결과입니다.)';
    }
    document.getElementById('supportNote').innerHTML = note;
  }

  // 년지(띠)/일지(부부궁) 관계 뱃지와 서로에게 도움이 되는 방식를 렌더링
  function renderDeepCompat(compat, nameA, nameB) {
    const toneLabelMap = { good: '좋은 궁합', clash: '충돌 주의', friction: '마찰 주의', neutral: '무난' };

    function fillItem(prefix, relInfo) {
      const badgeEl = document.getElementById(prefix + 'Badge');
      const descEl = document.getElementById(prefix + 'Desc');
      if (!badgeEl || !descEl || !relInfo) return;
      const tone = relInfo.tone || 'neutral';
      const type = relInfo.type || '평';
      badgeEl.innerHTML = `<span class="dc-tone-badge dc-tone-${tone}">${type} · ${toneLabelMap[tone] || toneLabelMap.neutral}</span>`;
      descEl.textContent = JIJI_RELATION_DESC[type] || JIJI_RELATION_DESC.평;
    }

    fillItem('dcYear', compat.yearJijiRelation);
    fillItem('dcDay', compat.dayJijiRelation);

    // 두 사람이 실제로 어떤 방식으로 서로에게 도움이 되는지 설명
    const { aFillsB = [], bFillsA = [] } = compat.complement || {};
    const parts = [];
    if (bFillsA.length > 0) parts.push(...buildElementHelpSentences(escapeHtml(nameB), escapeHtml(nameA), bFillsA));
    if (aFillsB.length > 0) parts.push(...buildElementHelpSentences(escapeHtml(nameA), escapeHtml(nameB), aFillsB));

    let complementHtml = '';
    if (parts.length === 0) {
      complementHtml = `${escapeHtml(nameA)}님과 ${escapeHtml(nameB)}님은 잘하는 방식과 어려워하는 부분이 비슷한 편입니다. 서로 편하게 느끼기는 쉽지만, 둘 다 미루는 문제는 상대가 알아서 처리해주기를 기다리지 말고 역할을 정하는 것이 좋아요.`;
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
})();
