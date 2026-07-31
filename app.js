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
        return { error: `존재하지 않는 날짜입니다 (${month}월 ${day}일)` };
      }
      return { yearUnknown: true, month, day, hour, minute, hourUnknown };
    }

    const year = parseInt(document.getElementById(prefix + '-year').value, 10);
    const d = new Date(year, month - 1, day);
    if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
      return { error: `존재하지 않는 날짜입니다 (${year}년 ${month}월 ${day}일)` };
    }
    return { yearUnknown: false, year, month, day, hour, minute, hourUnknown };
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

    if (a.error) { errorMsg.textContent = 'Person A: ' + a.error; return; }
    if (b.error) { errorMsg.textContent = 'Person B: ' + b.error; return; }

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
      ? `Person A · ${String(inputA.month).padStart(2,'0')}.${String(inputA.day).padStart(2,'0')} (연도 미상)`
      : `Person A · ${inputA.year}.${String(inputA.month).padStart(2,'0')}.${String(inputA.day).padStart(2,'0')}`;
    const labelB = inputB.yearUnknown
      ? `Person B · ${String(inputB.month).padStart(2,'0')}.${String(inputB.day).padStart(2,'0')} (연도 미상)`
      : `Person B · ${inputB.year}.${String(inputB.month).padStart(2,'0')}.${String(inputB.day).padStart(2,'0')}`;

    if (entryA.approx) renderPillarCardApprox('A', entryA.approx, labelA);
    else renderPillarCardExact('A', entryA.exact, labelA);

    if (entryB.approx) renderPillarCardApprox('B', entryB.approx, labelB);
    else renderPillarCardExact('B', entryB.exact, labelB);

    // 휠 표시용 각자의 오행 합산치 (근사 모드는 확정 가능한 기둥만 반영)
    const wheelCountA = entryA.exact ? entryA.exact.ohaengCount : buildApproxCount(entryA.approx);
    const wheelCountB = entryB.exact ? entryB.exact.ohaengCount : buildApproxCount(entryB.approx);
    renderWheel(wheelCountA, wheelCountB);

    // 관계 배지 (근사 모드에서는 일간 비교가 불확실하므로 문구를 다르게)
    if (anyApprox) {
      document.getElementById('relationBadge').textContent = '연도 미상으로 일간 간 관계는 추정이 어려워요';
    } else {
      const relationLabels = {
        상생: '두 일간이 서로를 북돋는 상생(相生) 관계예요',
        상극: '두 일간이 팽팽하게 부딪히는 상극(相剋) 관계예요',
        동기: '두 일간이 같은 기운을 공유하는 동기(同氣) 관계예요',
        중립: '두 일간이 특별한 상호작용 없이 독립적인 관계예요',
      };
      document.getElementById('relationBadge').textContent = relationLabels[rec.compat.relation];
    }

    // 메인 추천
    const p = rec.primary;
    const hanjaMap = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' };
    document.getElementById('recHanja').textContent = hanjaMap[rec.primaryOhaeng];
    document.getElementById('recHanja').style.color = OHAENG_COLOR[rec.primaryOhaeng];
    document.getElementById('recSeason').textContent = p.season;
    document.getElementById('recKeyword').textContent = `${p.seasonDetail} · ${p.keyword}의 기운`;

    document.getElementById('recTime').textContent = p.timeRange;
    document.getElementById('recTimeDetail').textContent = p.timeDetail;

    document.getElementById('recColors').innerHTML = colorSwatchesHtml(p.colors);

    const flowersEl = document.getElementById('recFlowers');
    flowersEl.innerHTML = p.flowers.map(f => `<span class="tag">${f}</span>`).join('');

    const placesEl = document.getElementById('recPlaces');
    placesEl.innerHTML = p.places.map(pl => `<span class="tag">${pl}</span>`).join('');

    // 글로우 컬러
    document.getElementById('recHero').style.setProperty('--accent-glow', OHAENG_GLOW[rec.primaryOhaeng]);

    // 보완 설명
    const s = rec.support;
    let note =
      `두 분의 사주 기운 중 <b>${rec.primaryOhaeng}(${hanjaMap[rec.primaryOhaeng]}) 기운이 가장 적어</b> 이를 보완할 상징들을 우선 추천했습니다. ` +
      `오행 상생 이론에 따르면 <b>${rec.supportOhaeng}(${hanjaMap[rec.supportOhaeng]})의 기운이 ${rec.primaryOhaeng}을 낳아 북돋우므로</b>, ` +
      `${s.season}(${s.timeRange})의 분위기나 ${s.colors[0]} 계열을 함께 곁들이는 것도 좋은 조합이에요.`;
    if (anyApprox) {
      note += ' (연도 미상 추정치를 포함한 결과입니다.)';
    }
    document.getElementById('supportNote').innerHTML = note;
  }

  function buildApproxCount(approx) {
    const count = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
    count[approx.month.ohaeng] += 1;
    count[approx.day.likelyOhaeng[0]] += 1;
    if (approx.hour) count[approx.hour.ohaeng] += 1;
    return count;
  }
})();
