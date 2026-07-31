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
      if (ELEMENT_SHARED_STRONG[k]) lines.push(ELEMENT_SHARED_STRONG[k]);
    });
    sharedMissing.slice(0, 1).forEach(k => {
      if (ELEMENT_SHARED_GAP[k]) lines.push(ELEMENT_SHARED_GAP[k]);
    });
    return [...new Set(lines)].slice(0, 4);
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

  function getElementPairConflict(profileA, profileB) {
    const pair = [profileA.dominant, profileB.dominant].sort((a, b) => OHAENG_ORDER.indexOf(a) - OHAENG_ORDER.indexOf(b)).join('+');
    return ELEMENT_PAIR_CONFLICT[pair] || '서로 중요하게 여기는 기준이 다른 상황에서는 애정의 크기보다 연락 시점, 약속 방식, 말투 같은 작은 차이가 더 크게 느껴질 수 있어요.';
  }

  function buildConflictScenario(profileA, profileB, direction, compat) {
    const dayTone = compat?.dayJijiRelation?.tone;
    const yearTone = compat?.yearJijiRelation?.tone;
    const base = [];

    if (direction === 'aControlsB' || direction === 'bControlsA') {
      const controller = direction === 'aControlsB' ? profileA : profileB;
      const receiver = direction === 'aControlsB' ? profileB : profileA;
      base.push(`여행 계획이나 중요한 결정을 할 때 ${controller.name}님이 기준과 해결책을 먼저 정하면, ${receiver.name}님은 함께 상의하기보다 정해진 답을 따라야 한다고 느낄 수 있어요.`);
    } else if (direction === 'same') {
      base.push('둘 다 같은 결론을 원한다고 생각해 세부 내용을 확인하지 않으면, 막상 약속 시간·비용·역할을 정할 때 서로 다른 기대가 드러날 수 있어요.');
    } else if (direction === 'aGeneratesB' || direction === 'bGeneratesA') {
      const giver = direction === 'aGeneratesB' ? profileA : profileB;
      const receiver = direction === 'aGeneratesB' ? profileB : profileA;
      base.push(`${giver.name}님이 연락·예약·분위기 조율을 계속 맡고 ${receiver.name}님이 자연스럽게 따라가는 패턴이 굳어지면, 어느 순간 데이트를 혼자 준비한다는 서운함이 생길 수 있어요.`);
    } else {
      base.push('큰 문제는 없어 보여도 누가 먼저 연락하고 약속을 잡을지 서로 기다리면, 관심이 줄었다고 오해하거나 관계가 정체된 느낌을 받을 수 있어요.');
    }

    base.push(getElementPairConflict(profileA, profileB));

    if (dayTone === 'clash') {
      base.push('둘만 있는 가까운 상황에서는 한 번 서운해진 일이 다른 이야기까지 번지기 쉬워요. 한꺼번에 과거 일을 꺼내기보다 지금 다루는 문제 하나만 정해서 말하는 편이 좋아요.');
    } else if (dayTone === 'friction') {
      base.push('답장 속도, 말투, 약속 변경처럼 사소한 일이 반복되면서 피로가 쌓일 수 있어요. 참았다가 크게 말하기보다 그날 불편했던 행동 하나만 짧게 알려주세요.');
    } else {
      base.push('크게 싸우지 않는 대신 불편한 일을 괜찮다고 넘기기 쉬워요. 데이트가 끝난 뒤 좋았던 점과 아쉬웠던 점을 하나씩 나누면 뒤늦은 서운함을 줄일 수 있어요.');
    }

    if (yearTone === 'clash' || yearTone === 'friction') {
      base.push('가족·친구 모임에 참여하는 정도, 기념일 비용, 주말 시간을 쓰는 방식처럼 둘 밖의 생활에서 차이가 커질 수 있어요. 일정이 잡히기 전에 각자의 기준부터 확인하는 게 좋아요.');
    } else {
      base.push('데이트 장소와 예약, 이동 경로, 연락 시간을 한 사람이 계속 맡으면 부담이 한쪽에 쌓일 수 있어요. 준비하는 역할과 결정권을 번갈아 나누는 편이 좋아요.');
    }

    return [...new Set(base)].slice(0, 4);
  }

  function buildRelationshipFlow(profileA, profileB, compat) {
    const relation = compat?.relation;
    const daySignal = getJijiSignal(compat?.dayJijiRelation);
    const complementCount = (compat?.complement?.aFillsB?.length || 0) + (compat?.complement?.bFillsA?.length || 0);

    if (relation === '상생' && daySignal > 0 && complementCount >= 2) {
      return '초반의 호감이 시간이 지나면서 신뢰로 이어지는 관계예요. 한 사람은 계획을 세우고 다른 사람은 분위기를 풀어주는 식으로 역할이 자연스럽게 나뉘기 쉬워요. 여행·저축·운동처럼 둘이 함께할 목표를 정하면 관계가 더 단단해져요.';
    }
    if (relation === '상극' && daySignal < 0) {
      return '서로에게 끌리는 힘도 크지만 긴장도 함께 큰 관계예요. 관계가 빠르게 깊어질 수 있는 만큼, 다툴 때의 규칙이 없으면 감정의 오르내림도 커져요. 서로의 속도를 맞추고 선을 존중하는 게 중요해요.';
    }
    if (relation === '동기' && complementCount === 0) {
      return '친구처럼 빠르게 가까워지는 관계예요. 말이 잘 통하고 같은 취미를 즐기기 쉽지만, 약속 잡기·돈 관리·사과하기처럼 둘 다 어려워하는 일은 함께 미룰 수 있어요. 이런 일은 번갈아 맡는 편이 좋아요.';
    }
    if (daySignal > 0) {
      return '겉보기보다 가까워질수록 편안함이 커지는 관계예요. 큰 이벤트보다 일상적인 연락과 식사, 생활 리듬을 꾸준히 나눌 때 애정이 안정돼요.';
    }
    if (daySignal < 0) {
      return '초반의 매력과 별개로 가까워진 뒤에는 조율이 필요한 관계예요. 서로를 바꾸려 하기보다 꼭 지키고 싶은 기준과 서로 맞출 수 있는 부분을 나눠 이야기해보세요.';
    }
    return '처음부터 강하게 끌리기보다 함께 지내면서 정이 차곡차곡 쌓이는 관계예요. 같은 운동이나 게임, 영화 감상처럼 꾸준히 할 취미를 하나 만들고, 여행·공연·맛집 탐방처럼 둘 다 즐거웠던 경험을 반복해서 쌓을수록 가까워져요.';
  }

  const ROMANTIC_ELEMENT_SCENE = {
    목: '새로운 식당이나 여행지를 함께 찾아보고, 다음에 할 일을 자연스럽게 이야기하는 연인이에요. 서로의 목표를 응원하는 말이 애정 표현처럼 느껴지는 편이에요.',
    화: '만나면 표정과 말투가 밝아지고, 보고 싶었다는 말이나 사진·기념일 같은 표현을 적극적으로 나누는 연인이에요. 짧게 만나도 데이트 분위기가 금방 살아나요.',
    토: '정해진 날에 만나 밥을 먹고 서로의 일상을 챙기는, 생활 속에서 안정감을 주는 연인이에요. 아플 때 필요한 것을 챙기거나 약속을 지키는 행동으로 사랑을 보여줘요.',
    금: '시간과 약속을 소중히 여기고, 관계를 애매하게 두기보다 서로의 계획과 기준을 분명히 공유하는 연인이에요. 함께 세운 목표를 지켜갈 때 애정이 깊어져요.',
    수: '시끄러운 자리보다 둘만의 카페나 밤 산책에서 속이야기를 오래 나누는 연인이에요. 계속 붙어 있기보다 각자의 시간을 보낸 뒤 다시 만날 때 편안함을 느껴요.',
  };

  function buildRomanticTogetherScenes(profileA, profileB, compat, direction, combinedStats) {
    const scenes = [];
    const relation = compat?.relation;
    const daySignal = getJijiSignal(compat?.dayJijiRelation);
    const dominant = combinedStats.dominant[0] || profileA.dominant;

    if (relation === '상생') {
      scenes.push('연인으로 지낼 때는 한 사람이 먼저 마음이나 계획을 꺼내면 다른 사람이 자연스럽게 호응해주는 모습이 많아요. 거창한 이벤트보다 안부를 챙기고, 필요한 순간에 먼저 움직여주는 행동에서 사랑을 확인하는 커플이에요.');
    } else if (relation === '상극') {
      scenes.push('연인으로서는 서로에게 없는 매력이 강하게 보여 설렘과 긴장감이 함께 살아 있는 커플이에요. 데이트할 때는 활기가 넘치지만, 의견이 다를 때도 감정이 크게 움직일 수 있어 화해 방식까지 둘만의 연애 습관으로 만드는 게 중요해요.');
    } else if (relation === '동기') {
      scenes.push('친구 같은 편안함과 연인다운 장난스러움이 함께 있는 커플이에요. 같은 이야기에 웃고, 별일 없는 날에도 메시지나 밈을 주고받으며 친밀감을 쌓지만 가끔은 익숙함에 기대지 않고 애정 표현을 분명히 해주는 게 좋아요.');
    } else {
      scenes.push('처음부터 불꽃처럼 달아오르기보다 자주 밥을 먹고 일상을 공유하면서 천천히 연인다운 정이 깊어지는 커플이에요. 조용히 곁에 있어주는 시간과 꾸준한 연락이 화려한 이벤트보다 더 큰 애정 표현이 되기 쉬워요.');
    }

    if (daySignal > 0) {
      scenes.push('둘만 있을 때는 경계가 빨리 풀려 스킨십이나 속마음 표현도 비교적 자연스러워요. 피곤한 날에는 특별한 일을 하지 않아도 함께 쉬고 식사하는 것만으로 충분히 가까워졌다고 느낄 수 있어요.');
    } else if (daySignal < 0) {
      scenes.push('좋아하는 마음과 별개로 가까워질수록 각자의 방식이 선명해져요. 한 사람은 바로 확인받고 싶고 다른 사람은 생각할 시간이 필요할 수 있어서, 애정 표현의 속도를 맞추는 과정 자체가 이 커플의 중요한 연애 과제가 돼요.');
    } else {
      scenes.push('애정이 안정되면 서로의 일상에 무리하게 끼어들기보다, 각자 할 일을 하다가 자연스럽게 만나 쉬는 연애를 하기 쉬워요. 연락 횟수보다 약속한 순간에 성실하게 반응하는 것이 더 중요하게 느껴져요.');
    }

    if (ROMANTIC_ELEMENT_SCENE[dominant]) scenes.push(ROMANTIC_ELEMENT_SCENE[dominant]);

    if (direction === 'aGeneratesB' || direction === 'bGeneratesA') {
      const giver = direction === 'aGeneratesB' ? profileA : profileB;
      const receiver = direction === 'aGeneratesB' ? profileB : profileA;
      scenes.push(`${giver.name}님이 데이트의 흐름이나 감정 표현을 먼저 열고, ${receiver.name}님이 그 분위기를 이어가는 모습이 자주 보여요. 다만 늘 같은 사람이 먼저 움직이지 않도록 가끔은 역할을 바꿔주는 게 좋아요.`);
    }

    return [...new Set(scenes)].slice(0, 3);
  }

  function buildActionTips(profileA, profileB, direction, compat) {
    const tips = [];
    tips.push(`${profileA.name}님과 이야기할 때는 ‘${profileA.trait.repair}’ 방식을 써보세요.`);
    tips.push(`${profileB.name}님과 이야기할 때는 ‘${profileB.trait.repair}’ 방식을 써보세요.`);

    if (direction === 'aGeneratesB' || direction === 'bGeneratesA') {
      tips.push('배려를 받은 사람이 “고마워”에서 끝내지 않고, 다음 행동으로 되돌려주는 순환을 만드는 것이 좋아요.');
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
    const directionText = RELATION_DIRECTION_TEXT[direction]({ nameA, nameB, aDay: profileA.day, bDay: profileB.day });
    const complements = buildComplementInsight(profileA, profileB, compat);
    const conflicts = buildConflictScenario(profileA, profileB, direction, compat);
    const tips = buildActionTips(profileA, profileB, direction, compat);
    const flow = buildRelationshipFlow(profileA, profileB, compat);
    const combinedCount = Object.fromEntries(OHAENG_ORDER.map(k => [k, profileA.stats.count[k] + profileB.stats.count[k]]));
    const combinedStats = analyzeOhaengCount(combinedCount);
    const romanticScenes = buildRomanticTogetherScenes(profileA, profileB, compat, direction, combinedStats);

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
        <div class="compat-detail-title">두 사람의 관계를 조금 더 자세히 볼게요</div>
        <div class="compat-summary-card"><b>두 사람 사이의 기본 분위기</b><br>${directionText}</div>

        <div class="compat-grid">
          <article class="compat-card">
            <h4>${nameA}님은 사랑할 때 이런 편이에요</h4>
            <div class="compat-chip-row">${chipsA.map(x => `<span class="compat-chip">${x}</span>`).join('')}</div>
            <p>${profileA.summary}</p>
            <p>${profileA.caution}</p>
          </article>
          <article class="compat-card">
            <h4>${nameB}님은 사랑할 때 이런 편이에요</h4>
            <div class="compat-chip-row">${chipsB.map(x => `<span class="compat-chip">${x}</span>`).join('')}</div>
            <p>${profileB.summary}</p>
            <p>${profileB.caution}</p>
          </article>
        </div>

        <div class="compat-card">
          <h4>가까워질수록 이런 모습이 보여요</h4>
          <p>${buildJijiSynthesis(compat, nameA, nameB)}</p>
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
        <div class="compat-muted">※ ‘균형’ 수치는 사주에 같은 성향이 얼마나 몰려 있는지 보여주는 참고용으로 봐주세요. 점수가 높다고 무조건 좋은 관계라는 뜻은 아니에요.</div>
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
    if (!observations.length) observations.push('현재 입력값만으로는 누가 더 이끌거나 챙기는지가 뚜렷하지 않아요. 연락 속도, 약속을 잡는 방식, 돈과 시간을 쓰는 습관이 실제 관계에서 더 중요하게 작용해요.');

    return `
      <section class="compat-detail-wrap">
        <div class="compat-detail-title">지금 확인할 수 있는 정보로 두 사람을 살펴봤어요</div>
        <div class="compat-summary-card">연도가 없는 사람은 일간과 년지·일지를 정확히 정하기 어려워요. 그래서 지금 확인할 수 있는 월지와 태어난 시간의 흐름만으로 두 사람의 분위기를 가볍게 살펴봤어요.</div>
        <div class="compat-grid">
          <article class="compat-card"><h4>${nameA}님</h4><p>두드러지는 성향은 ${formatOhaengList(statsA.dominant)}, 상대적으로 덜 드러나는 성향은 ${formatOhaengList(statsA.weak)}이에요.</p></article>
          <article class="compat-card"><h4>${nameB}님</h4><p>두드러지는 성향은 ${formatOhaengList(statsB.dominant)}, 상대적으로 덜 드러나는 성향은 ${formatOhaengList(statsB.weak)}이에요.</p></article>
        </div>
        <div class="compat-card"><h4>두 사람 사이에는 이런 흐름이 보여요</h4><ul class="compat-list">${observations.map(x => `<li>${x}</li>`).join('')}</ul></div>
        <div class="compat-muted">※ 연도 미상 결과는 확인 가능한 일부 정보만 반영한 참고 내용이에요. 상생·상극, 부부궁, 띠 궁합은 연도를 확인한 뒤에만 정확하게 설명할 수 있어요.</div>
      </section>
    `;
  }

  function relationExplainHtml(relationKey, nameA, nameB, mode) {
    const r = RELATION_EXPLAIN[relationKey];
    if (!r) return '';
    const selectedMode = mode === 'friend' ? 'friend' : 'lover';
    const list = r[selectedMode] || [];
    const li = arr => arr.map(x => `<li>${x}</li>`).join('');
    const namesLabel = (nameA && nameB) ? `${escapeHtml(nameA)} · ${escapeHtml(nameB)}` : '';
    const modeLabel = selectedMode === 'lover' ? '연인으로 보면 ❤️' : '친구로 보면 🤝';
    const displayTitle = RELATION_SUMMARY_TEXT[relationKey] || `${r.emoji} ${selectedMode === 'friend' ? (r.friendTitle || r.title) : r.title}`;
    const quote = selectedMode === 'lover' ? r.quote : (r.friendQuote || '함께 있을 때 편안한 관계예요.');
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

    '흰색': '#f5f4f0', '금색': '#dcc48f', '은색·그레이': '#c2c2bd',
    '샴페인골드': '#d8c3a5', '펄그레이': '#d5d6d3', '쿨그레이': '#aeb3b8',
    '라이트그레이': '#d8dadc', '스틸색': '#8f9aa3', '아이보리화이트': '#f2efe5',
    '백금색': '#d9d7d2', '차콜그레이': '#66686a', '크림화이트': '#f4efe4',

    '검은색': '#4a4a4a', '남색': '#7186a8', '짙은 파란색': '#82a0bd',
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
    const defaultName = prefix === 'a' ? '첫 번째 사람' : '두 번째 사람';
    const name = nameInput || defaultName;

    const yearUnknown = document.getElementById(prefix + '-year-unknown').checked;
    const month = parseInt(document.getElementById(prefix + '-month').value, 10);
    const day = parseInt(document.getElementById(prefix + '-day').value, 10);
    const hour = parseInt(document.getElementById(prefix + '-hour').value, 10);
    const minute = parseInt(document.getElementById(prefix + '-minute').value, 10);
    const hourUnknown = document.getElementById(prefix + '-unknown').checked;

    const photo = couplePhoto || null;

    if (yearUnknown) {
      // 연도 없이도 실제 존재하는 월/일인지만 검증 (윤년 2/29는 통과시키되
      // 계산 시 통계 샘플에서 자연스럽게 처리됨)
      const leapCheckYear = 2024; // 2/29 검증용 임의 윤년
      const d = new Date(leapCheckYear, month - 1, day);
      if (d.getMonth() !== month - 1 || d.getDate() !== day) {
        return { error: `존재하지 않는 날짜예요 (${month}월 ${day}일)`, name };
      }
      return { yearUnknown: true, month, day, hour, minute, hourUnknown, name, photo };
    }

    const year = parseInt(document.getElementById(prefix + '-year').value, 10);
    const d = new Date(year, month - 1, day);
    if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
      return { error: `존재하지 않는 날짜예요 (${year}년 ${month}월 ${day}일)`, name };
    }
    return { yearUnknown: false, year, month, day, hour, minute, hourUnknown, name, photo };
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

  // 데스크톱은 기존 992px 결과를 유지하고, 모바일·태블릿은 1200px 기준의
  // 더 촘촘한 동일 레이아웃을 화면 폭에 맞춰 축소합니다. 저장 이미지도 같은 기준을 사용합니다.
  const RESULT_DESKTOP_WIDTH = 992;
  const RESULT_MOBILE_WIDTH = 1200;
  let resultScaleFrame = 0;

  function usesMobileResultLayout() {
    return isMobileOrTabletDevice() || (window.innerWidth || 0) <= 900;
  }

  function getCurrentResultLayoutWidth() {
    return usesMobileResultLayout() ? RESULT_MOBILE_WIDTH : RESULT_DESKTOP_WIDTH;
  }

  function updateResultDesktopScale() {
    if (!resultEl) return;
    const parent = resultEl.parentElement;
    const parentStyle = parent ? getComputedStyle(parent) : null;
    const horizontalPadding = parentStyle
      ? (parseFloat(parentStyle.paddingLeft) || 0) + (parseFloat(parentStyle.paddingRight) || 0)
      : 0;
    const parentInnerWidth = parent
      ? parent.clientWidth - horizontalPadding
      : (window.innerWidth || RESULT_DESKTOP_WIDTH);
    const availableWidth = Math.max(240, Math.floor(parentInnerWidth));
    const mobileLayout = usesMobileResultLayout();
    const layoutWidth = mobileLayout ? RESULT_MOBILE_WIDTH : RESULT_DESKTOP_WIDTH;
    const scale = Math.min(1, availableWidth / layoutWidth);
    const needsScale = scale < 0.999;

    resultEl.dataset.resultLayoutWidth = String(layoutWidth);
    resultEl.classList.toggle('result-mobile-layout', mobileLayout);
    resultEl.classList.toggle('result-desktop-layout', needsScale);
    if (needsScale) {
      resultEl.style.width = `${layoutWidth}px`;
      resultEl.style.maxWidth = 'none';
      resultEl.style.zoom = String(scale);
    } else {
      resultEl.style.width = '';
      resultEl.style.maxWidth = '';
      resultEl.style.zoom = '';
    }
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
    if (anyApprox) {
      document.getElementById('relationBadge').textContent = '연도 미상으로 일간 간 관계는 추정이 어려워요';
      explainEl.innerHTML =
        '<div class="re-caveat" style="margin-top:0; border-top:none; padding-top:0;">태어난 연도를 몰라 일간을 특정할 수 없어, 상생·상극·동기 같은 관계는 단정하지 않아요. 대신 현재 확인 가능한 오행 경향만으로 제한적인 참고 궁합을 보여드려요.</div>' +
        (isLover ? buildApproxCompatHtml(entryA, entryB, nameA, nameB) : '');
      // 년지/일지 궁합도 연도를 모르면 확정 불가하므로 숨김
      deepCompatEl.style.display = 'none';
    } else {
      document.getElementById('relationBadge').textContent =
        RELATION_SUMMARY_TEXT[rec.compat.relation] || '🍃 부담 없이 편안한 사이예요';
      explainEl.innerHTML =
        relationExplainHtml(rec.compat.relation, nameA, nameB, relationshipMode) +
        (isLover ? buildDetailedCompatHtml(entryA.exact, entryB.exact, rec.compat, nameA, nameB) : '');

      // 년지(띠)/일지(부부궁)와 연애용 심층 해설은 연인 선택에서만 보여줘요.
      if (isLover) renderDeepCompat(rec.compat, nameA, nameB);
      deepCompatEl.style.display = isLover ? 'block' : 'none';
    }

    // 메인 추천
    const p = rec.primary;
    const hanjaMap = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' };
    document.getElementById('recHanja').textContent = hanjaMap[rec.primaryOhaeng];
    document.getElementById('recHanja').style.color = OHAENG_COLOR[rec.primaryOhaeng];
    document.getElementById('recSeason').textContent = p.season;
    document.getElementById('recKeyword').textContent = `${p.seasonDetail} · ${p.keyword}의 분위기`;

    // 커플 사진 둥근 정사각형 프레임 — 계절(오행)에 맞는 연한 단일 색상 테두리
    const photoWrap = document.getElementById('recPhotoWrap');
    const photoInner = document.getElementById('recPhotoInner');
    const ringColorDim = { 목: '#dbe8d3', 화: '#f6e1dc', 토: '#ede4d1', 금: '#edeae1', 수: '#dde8f1' }[rec.primaryOhaeng];
    document.getElementById('recHero').style.setProperty('--photo-ring-color', ringColorDim);

    const hasPhoto = !!(inputA.photo || inputB.photo);
    photoInner.innerHTML = hasPhoto ? `<img src="${inputA.photo || inputB.photo}" alt="${escapeHtml(nameA)} · ${escapeHtml(nameB)}">` : '';
    photoWrap.style.display = hasPhoto ? 'flex' : 'none';
    const heroTopEl = document.getElementById('recHeroTop');
    if (heroTopEl) heroTopEl.classList.toggle('has-photo', hasPhoto);

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
    const fallbackSummary = {
      목: '둘이 먼저 계획을 꺼내고 새로운 경험을 시작하는 모습',
      화: '좋아하는 마음을 말과 표정으로 분명하게 보여주는 모습',
      토: '약속과 일정을 꾸준히 지키며 관계를 편안하게 만드는 모습',
      금: '연락·약속·돈 문제의 기준을 분명하게 맞추는 모습',
      수: '서둘러 결론을 내리지 않고 서로의 이야기를 끝까지 듣는 모습',
    }[rec.primaryOhaeng];

    const primarySummaryRaw = p.summary || fallbackSummary;
    const primarySummary = escapeHtml(withSubjectParticle(primarySummaryRaw));
    const primaryPlaces = (p.places || []).slice(0, 2).map(escapeHtml).join(' 또는 ');
    const primaryColors = (p.colors || []).slice(0, 2).map(escapeHtml).join('·');
    let note =
      `${escapeHtml(nameA)}님과 ${escapeHtml(nameB)}님의 결과에서는 <b>${primarySummary}</b> 상대적으로 덜 나타나는 편이에요. ` +
      `${primaryPlaces ? `추천 장소는 ${primaryPlaces} 중에서 골라보세요. ` : ''}` +
      `${primaryColors ? `옷이나 작은 소품은 ${primaryColors} 계열 중 하나만 가볍게 활용해도 충분해요. ` : ''}` +
      `<br><span style="opacity:.78;">아래 추천은 두 사람의 일간 관계, 강한 오행, 년지·일지 관계를 함께 반영한 결과예요.</span>`;
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
      complementHtml = `${escapeHtml(nameA)}님과 ${escapeHtml(nameB)}님은 잘하는 방식과 어려워하는 부분이 비슷한 편이에요. 서로 편하게 느끼기는 쉽지만, 둘 다 미루는 문제는 상대가 알아서 처리해주기를 기다리지 말고 역할을 정하는 것이 좋아요.`;
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

      /* 화면용 광택 레이어는 저장할 때만 제거합니다. 계절색은 위 실제 배경으로 유지됩니다. */
      .capture-sandbox .capture-clean::before,
      .capture-sandbox .capture-clean::after {
        content: none !important;
        display: none !important;
      }

      /* 실제 기기 화면 폭과 무관하게 저장 이미지는 PC 레이아웃으로 고정 */
      .capture-sandbox .capture-clean .rec-hero-top.has-photo {
        display: grid !important;
        grid-template-columns: 232px minmax(0, 1fr) !important;
        align-items: center !important;
        width: 100% !important;
        text-align: left !important;
        gap: 68px !important;
      }
      .capture-sandbox .capture-clean .rec-hero-top.has-photo .rec-photo-wrap {
        margin: 0 !important;
        flex-shrink: 0 !important;
      }
      .capture-sandbox .capture-clean .rec-hero-top.has-photo .rec-hero-text {
        text-align: left !important;
      }
      .capture-sandbox .capture-clean .rec-details,
      .capture-sandbox .capture-clean .relation-explain-body .re-lover-friend,
      .capture-sandbox .capture-clean .dc-grid,
      .capture-sandbox .capture-clean .compat-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      }
      .capture-sandbox .capture-clean .relation-explain-body .re-lover-friend.re-single-mode {
        grid-template-columns: 1fr !important;
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
    const mobileResultLayout = resultEl?.classList.contains('result-mobile-layout') || usesMobileResultLayout();
    if (mobileResultLayout) clone.classList.add('result-mobile-layout');
    clone.style.setProperty('--capture-accent-glow', accentGlow);
    clone.style.setProperty('--capture-width', `${Number(resultEl?.dataset.resultLayoutWidth) || getCurrentResultLayoutWidth()}px`);
    clone.style.setProperty('--accent-glow', accentGlow);
    clone.style.borderRadius = '24px';
    clone.style.overflow = 'hidden';

    // relationExplainBody 안에서 짧은 관계궁합 요약(re-heading/re-lover-friend/re-quote)만 남기고
    // 그 뒤에 이어붙는 상세 해설(compat-detail-wrap)은 제거
    clone.querySelectorAll('.compat-detail-wrap').forEach(el => el.remove());

    // "관계궁합" 카드 이후에 이어지는 심층 설명(년지/일지 궁합), 서포트 노트,
    // 데이트 아이디어, 꽃말 상세 설명은 이미지에서 제외
    ['#deepCompat', '#supportNote', '#recCoupleExtraGrid', '#recDateIdeasBlock', '#recTouchBlock', '#flowerMeaningDetails']
      .forEach(sel => { const el = clone.querySelector(sel); if (el) el.remove(); });

    const sandbox = document.createElement('div');
    sandbox.className = 'capture-sandbox';

    /* 현재 화면과 동일한 기준 폭으로 저장: 모바일·태블릿 1200px, 데스크톱 992px */
    const captureWidth = Number(resultEl?.dataset.resultLayoutWidth) || getCurrentResultLayoutWidth();
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
        windowWidth: 1200,
        onclone: clonedDocument => {
          const captured = clonedDocument.querySelector('.capture-clean');
          if (!captured) return;

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

  const saveImageBtn = document.getElementById('saveImageBtn');
  if (saveImageBtn) {
    saveImageBtn.addEventListener('click', () => handleSaveResultImage(saveImageBtn));
  }
})();
