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

  let relationshipMode = 'lover';
  let lastRenderPayload = null;
  let couplePhoto = null;

  // ---------------------------------------------------------------
  // 사진 첨부 (생년월일 입력 단계) — 두 사람이 함께 나온 사진 1장을 첨부하면
  // 원형 미리보기 및 결과 화면에 반영됩니다.
  // ---------------------------------------------------------------
  function setupCouplePhotoUpload() {
    const fileInput = document.getElementById('couple-photo');
    const chooseBtn = document.getElementById('couple-photo-btn');
    const removeBtn = document.getElementById('couple-photo-remove');
    const preview = document.getElementById('couple-photo-preview');
    if (!fileInput || !chooseBtn || !preview) return;

    chooseBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        fileInput.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        couplePhoto = reader.result;
        preview.innerHTML = `<img src="${reader.result}" alt="">`;
        if (removeBtn) removeBtn.style.display = 'inline-flex';
      };
      reader.readAsDataURL(file);
    });

    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        couplePhoto = null;
        fileInput.value = '';
        preview.innerHTML = '<span>+</span>';
        removeBtn.style.display = 'none';
      });
    }
  }
  setupCouplePhotoUpload();

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
      summary: `${name}님은 사주에서 ${day ? `${day}(${OHAENG_HANJA[day]})` : '확인되지 않은'} 성향을 중심으로 보여요. 실제 관계에서는 ${trait.core}이에요. 특히 ‘${trait.love}’가 느껴질 때 상대의 마음을 더 확실히 믿는 편이에요.`,
      caution: `관계에서 특히 잘하는 점은 ${trait.strength}이에요. 다만 갈등이 생기면 ${trait.shadow}가 나타나기 쉬워요. ${weakText}`,
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
      return `일지 관계는 ${day.type}, 년지 관계는 ${year.type}에 해당해요. 두 관계 모두 좋은 흐름이라 가까이 지낼수록 편안한 정서적 호흡이 생기고, 가족·생활환경·장기 계획에서도 방향을 맞추기 쉬워요.`;
    }
    if (daySignal > 0 && yearSignal < 0) {
      return `일지 관계에서는 ${day.type}의 편안함이 드러나 둘만 있을 때 정서적 호흡이 좋은 편이에요. 다만 년지 관계에서는 ${year.type}의 영향으로 가족관계·사회생활·생활 습관의 차이가 커질 수 있어요. 애정 자체보다 주변 환경을 조율하는 일이 장기 관계의 핵심이에요.`;
    }
    if (daySignal < 0 && yearSignal > 0) {
      return `년지 관계에서는 ${year.type}의 장점이 드러나 생활 방향과 사회적 호흡이 잘 맞아요. 다만 가까워질수록 일지 관계의 ${day.type} 긴장이 드러날 수 있어요. 바깥에서는 좋은 팀인데 사적인 감정 문제를 미루기 쉬우니 둘만의 대화 시간을 따로 확보하는 편이 좋아요.`;
    }
    if (daySignal < 0 && yearSignal < 0) {
      return `일지 관계는 ${day.type}, 년지 관계는 ${year.type}에 해당해요. 두 관계 모두 마찰 신호가 있어 감정 표현과 생활 방식의 차이가 반복될 수 있어요. 끌림이 강하더라도 관계 규칙을 구체적으로 정하지 않으면 같은 갈등이 되풀이될 수 있어요.`;
    }
    if (day.type === '동일' || year.type === '동일') {
      return `지지에 동일 관계가 있어 익숙함과 친밀감이 빠르게 생기기 쉬워요. 다만 비슷한 약점과 생활 습관도 함께 증폭될 수 있어, 서로가 못하는 부분을 상대가 자동으로 채워줄 것이라 기대하지 않는 편이 좋아요.`;
    }
    return `${nameA}님과 ${nameB}님의 년지·일지 관계는 한쪽으로 강하게 기울기보다 무난한 편이에요. 연락을 얼마나 자주 할지, 돈과 주말 일정을 어떻게 나눌지, 어떤 취미를 함께 즐길지처럼 실제 생활에서 맞춰가는 방식이 관계 만족도를 더 크게 좌우해요.`;
  }

  function buildComplementInsight(profileA, profileB, compat) {
    const aFillsB = compat?.complement?.aFillsB || [];
    const bFillsA = compat?.complement?.bFillsA || [];
    const sharedMissing = profileA.stats.missing.filter(k => profileB.stats.missing.includes(k));
    const sharedDominant = profileA.stats.dominant.filter(k => profileB.stats.dominant.includes(k));
    const lines = [];

    if (aFillsB.length && bFillsA.length) {
      lines.push('한 사람만 계속 챙기는 관계라기보다, 상황에 따라 먼저 손을 내미는 사람이 자연스럽게 바뀌는 편이에요.');
      lines.push(...buildElementHelpSentences(profileA.name, profileB.name, aFillsB));
      lines.push(...buildElementHelpSentences(profileB.name, profileA.name, bFillsA));
    } else if (aFillsB.length) {
      lines.push(...buildElementHelpSentences(profileA.name, profileB.name, aFillsB));
      lines.push(`${profileB.name}님도 ${profileA.name}님이 지쳐 보이는 날에는 먼저 안부를 묻거나 약속을 준비해주면, 도움을 받기만 한다는 느낌 없이 애정이 자연스럽게 오갈 수 있어요.`);
    } else if (bFillsA.length) {
      lines.push(...buildElementHelpSentences(profileB.name, profileA.name, bFillsA));
      lines.push(`${profileA.name}님도 ${profileB.name}님이 지쳐 보이는 날에는 먼저 안부를 묻거나 약속을 준비해주면, 도움을 받기만 한다는 느낌 없이 애정이 자연스럽게 오갈 수 있어요.`);
    } else {
      lines.push('둘 다 어려워하는 일을 상대가 알아서 해결해주길 기다리기보다, 일정 잡기나 예약처럼 작은 역할부터 나누면 서로를 훨씬 든든하게 느낄 수 있어요.');
    }

    if (compat?.relation === '상생') {
      lines.push('한 사람이 아이디어를 꺼내거나 힘든 마음을 말하면 다른 사람이 실제 행동이나 따뜻한 반응으로 이어주기 쉬워, 같이 있을 때 혼자 감당한다는 느낌이 줄어들어요.');
    } else if (compat?.relation === '상극') {
      lines.push('생각이 달라 처음에는 부딪혀도, 한쪽이 놓친 현실적인 문제나 감정적인 부분을 다른 쪽이 발견해줘 중요한 결정을 더 균형 있게 내릴 수 있어요.');
    } else if (compat?.relation === '동기') {
      lines.push('말을 길게 설명하지 않아도 상대의 기분이나 취향을 빠르게 알아차려, 지친 날에는 조용히 쉬어주고 즐거운 날에는 바로 함께 움직이는 호흡이 좋아요.');
    } else {
      lines.push('상대를 몰아붙이기보다 필요한 순간에 곁을 지켜주는 편이라, 큰 도움보다 꾸준한 연락과 약속을 통해 편안한 믿음을 쌓기 쉬워요.');
    }

    if (compat?.dayJijiRelation?.tone === 'good') {
      lines.push('둘만 있을 때는 긴장을 풀고 속마음을 나누기 쉬워요. 힘든 일이 생기면 해결책부터 말하기보다 함께 밥을 먹거나 산책하며 마음을 가라앉혀주는 방식이 잘 맞아요.');
    } else if (compat?.yearJijiRelation?.tone === 'good') {
      lines.push('여행 일정, 모임, 장기 계획처럼 둘 밖의 생활을 함께 꾸릴 때 손발이 잘 맞아, 서로의 일상에 실제로 도움이 되는 연인이 되기 쉬워요.');
    }

    sharedDominant.slice(0, 1).forEach(k => {
      if (ELEMENT_SHARED_STRONG[k]) lines.push(ELEMENT_SHARED_S
