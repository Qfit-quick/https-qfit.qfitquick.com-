// 시작 관문 · 신체정보 · 계획 · 기록지가 실제로 도는지 본다.
//
// 이 네 가지는 서로 물려 있다 — 관문의 답이 오늘 강도를 정하고, 강도가
// 주간 계획의 세트 수를 정하고, 계획이 설정 화면에 그 값을 넘기고, 운동을
// 끝내면 기록지가 켜진다. 한 고리만 끊겨도 화면은 멀쩡해 보이는데 숫자만
// 조용히 달라진다. 그래서 고리마다 값을 확인한다.
//
// 계산(기초대사량·목표 열량·식단)은 브라우저 없이 순수 함수로 먼저 잰다.
// 그쪽이 틀리면 화면을 봐도 무엇이 틀렸는지 알 수 없다.
import { launch, context, DEFAULT_URL, seedCheckin } from './_browser.mjs';
import { nutritionPlan, workoutPlan, mealPlan, mealPlanTotals, bmiOf } from '../src/data/plan.js';
import { INTENSITY, toneFor, intensityFor } from '../src/data/checkin.js';
import { QUOTES } from '../src/data/quotes.js';

const URL = process.env.PLAN_URL || DEFAULT_URL;
let fail = 0;
const ok = (cond, label, got = '') => {
  if (!cond) fail++;
  console.log(`  ${cond ? '통과' : '실패'}  ${label}${got === '' ? '' : '  ' + got}`);
};

// ── 1. 계산 ───────────────────────────────────────────────────
console.log('--- 계산 (순수 함수) ---');
{
  // 남 30세 175cm 78kg, 가볍게 움직임(1.375), 감량
  const body = { sex:'male', age:30, heightCm:175, weightKg:78, activity:'light', goal:'loss', level:'novice' };
  const n = nutritionPlan(body);
  // Mifflin-St Jeor: 10*78 + 6.25*175 - 5*30 + 5 = 780 + 1093.75 - 150 + 5 = 1728.75 → 1729
  ok(n.bmr === 1729, '기초대사량', `${n.bmr} (기대 1729)`);
  // 1729 * 1.375 = 2377.375 → 2377
  ok(n.tdee === 2377, '하루 소모량', `${n.tdee} (기대 2377)`);
  // 감량: TDEE 의 20%(475)와 500 중 작은 쪽을 뺀다 → 1902 → 10 단위로 1900
  ok(n.target === 1900, '목표 열량', `${n.target} (기대 1900)`);
  // 단백질 1.8 g/kg = 140.4 → 140
  ok(n.protein === 140, '단백질', `${n.protein}g (기대 140)`);
  // 세 영양소의 열량 합이 목표와 1% 안에 있어야 한다
  const macroKcal = n.protein * 4 + n.carb * 4 + n.fat * 9;
  ok(Math.abs(macroKcal - n.target) <= n.target * 0.01, '3대 영양소 합 = 목표',
    `${macroKcal} vs ${n.target}`);
  // 지방은 에너지적정비율 15~30% 안
  const fatPct = (n.fat * 9) / n.target;
  ok(fatPct >= 0.15 && fatPct <= 0.3, '지방 비율 15~30%', `${Math.round(fatPct * 100)}%`);
  // 탄수화물은 권장섭취량 130g 이 바닥
  ok(n.carb >= 130, '탄수화물 하한 130g', `${n.carb}g`);
  ok(bmiOf(body) === 25.5, '체질량지수', `${bmiOf(body)} (기대 25.5)`);
  ok(n.meals.length === 4, '끼니 네 개', String(n.meals.length));

  // 마른 사람에게 500 을 그냥 빼면 기초대사량 아래로 내려간다 — 그걸 막는가
  const small = { sex:'female', age:25, heightCm:158, weightKg:45, activity:'sedentary', goal:'loss' };
  const ns = nutritionPlan(small);
  ok(ns.target >= ns.bmr, '감량 목표가 기초대사량 아래로 안 내려간다',
    `목표 ${ns.target} · 기초 ${ns.bmr}`);

  // 값이 없으면 0 이 아니라 null 이어야 한다(0kcal 식단이 나오면 안 된다)
  ok(nutritionPlan({ sex:'male', activity:'light', goal:'keep' }) === null,
    '값이 비면 null', '');
}

// ── 2. 식단이 목표에 닿는가 ───────────────────────────────────
console.log('\n--- 식단 (목표에서 몇 % 벗어나나) ---');
{
  const bodies = [
    { sex:'male', age:30, heightCm:175, weightKg:78, activity:'light', goal:'loss' },
    { sex:'female', age:25, heightCm:160, weightKg:48, activity:'sedentary', goal:'loss' },
    { sex:'female', age:45, heightCm:165, weightKg:62, activity:'moderate', goal:'keep' },
    { sex:'male', age:22, heightCm:180, weightKg:65, activity:'moderate', goal:'gain' },
  ];
  for (const body of bodies) {
    const n = nutritionPlan(body);
    // 사흘을 잰다. 하루만 재면 그날 뽑힌 조합이 우연히 맞은 것일 수 있다.
    let worst = 0;
    for (const d of ['2026-01-05', '2026-06-17', '2026-11-30']) {
      const totals = mealPlanTotals(mealPlan(n, d));
      worst = Math.max(worst, Math.abs(totals.kcal - n.target) / n.target);
    }
    // 1인분을 0.25 단위로만 끊으므로 정확히 맞을 수는 없다. 10% 를 넘으면
    // 계획이라고 부를 수 없다 — 하루 200kcal 이 넘게 벌어진다.
    ok(worst <= 0.1, `${body.sex} ${body.weightKg}kg ${body.goal}`,
      `최대 오차 ${Math.round(worst * 100)}% (목표 ${n.target}kcal)`);
  }

  // 같은 날에는 몇 번을 다시 그려도 같은 식단이 나와야 한다
  const n = nutritionPlan(bodies[0]);
  const a = JSON.stringify(mealPlan(n, '2026-03-03').map((m) => m.rows.map((r) => r.key + r.mult)));
  const b = JSON.stringify(mealPlan(n, '2026-03-03').map((m) => m.rows.map((r) => r.key + r.mult)));
  ok(a === b, '같은 날 = 같은 식단');
  const c = JSON.stringify(mealPlan(n, '2026-03-04').map((m) => m.rows.map((r) => r.key + r.mult)));
  ok(a !== c, '다른 날 = 다른 식단');
}

// ── 3. 관문의 답이 강도와 명언을 정하는가 ─────────────────────
console.log('\n--- 설문 → 결(tone) · 강도 ---');
{
  ok(toneFor('great', 'meh') === 'drive', '기분 좋아도 귀찮으면 drive', toneFor('great', 'meh'));
  ok(toneFor('bad', 'ok') === 'gentle', '기분 나쁘고 의욕 있으면 gentle', toneFor('bad', 'ok'));
  ok(toneFor('good', 'fired') === 'steady', '둘 다 좋으면 steady', toneFor('good', 'fired'));
  ok(intensityFor('bad', 'fired') === 'normal', '기분 바닥이면 hard 를 한 단 낮춘다', intensityFor('bad', 'fired'));
  ok(intensityFor('good', 'no') === 'easy', '전혀 안 하고 싶으면 easy', intensityFor('good', 'no'));
  // 결마다 명언이 있어야 한다 — 비면 그 답에서만 화면이 빈다
  for (const tone of ['drive', 'gentle', 'steady']) {
    ok(QUOTES.some((q) => q.tone === tone), `명언 결 '${tone}' 이 비어 있지 않다`,
      String(QUOTES.filter((q) => q.tone === tone).length) + '개');
  }
}

// ── 4. 강도 표가 실제 프리셋과 같은 초를 말하는가 ─────────────
console.log('\n--- 강도 ↔ 동작 시간 프리셋 ---');
{
  const body = { sex:'male', age:30, heightCm:175, weightKg:78, activity:'light', goal:'loss' };
  for (const [name, level] of Object.entries(INTENSITY)) {
    const plan = workoutPlan(body, name);
    const day = plan.find((d) => d.focus !== 'rest');
    ok(day.sets === level.sets && day.secPerSet === level.secPerSet && day.preset === level.preset,
      `'${name}' 강도가 계획에 그대로 간다`,
      `${day.sets}세트 · ${day.secPerSet}초 · ${day.preset}`);
  }
  const plan = workoutPlan(body, 'normal');
  ok(plan.length === 7, '주간 계획은 7일', String(plan.length));
  ok(plan.some((d) => d.focus === 'rest'), '쉬는 날이 있다');
  ok(plan.filter((d) => d.focus !== 'rest').every((d) => d.exKeys.length >= 2),
    '운동하는 날은 동작이 2개 이상');
  ok(plan.every((d) => d.add), '요일마다 추가 활동이 붙는다');
}

// ── 5. 브라우저: 관문 → 신체정보 → 계획 → 기록지 ──────────────
console.log('\n--- 관문 (실제 화면) ---');
const browser = await launch();
{
  // 설문을 심지 않고 연다 — 관문이 뜨는 것이 정상이다.
  const page = await (await context(browser, { skipGate: false })).newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);

  ok(await page.evaluate(() => { const g = document.getElementById('gate'); return !!g && !g.hidden; }),
    '처음 열면 관문이 뜬다');
  ok(await page.evaluate(() => document.querySelectorAll('#gate-mood-opts button').length === 5),
    '기분 선택지 5개');

  await page.click('#gate-mood-opts button:nth-child(4)');   // 피곤해요
  await page.waitForTimeout(250);
  ok(await page.evaluate(() => !document.getElementById('gate-step-drive').hidden),
    '고르면 2번 문항으로 넘어간다');
  ok(await page.evaluate(() => document.querySelectorAll('#gate-drive-opts button').length === 4),
    '운동 의욕 선택지 4개');

  await page.click('#gate-drive-opts button:nth-child(3)');   // 솔직히 귀찮아요
  await page.waitForTimeout(300);
  const q = await page.evaluate(() => ({
    shown: !document.getElementById('gate-step-quote').hidden,
    text: document.getElementById('gate-quote-text')?.textContent || '',
    author: document.getElementById('gate-quote-author')?.textContent || '',
  }));
  ok(q.shown && q.text.length > 5 && q.author.length > 2, '명언 한 장이 나온다', q.text.slice(0, 24) + '…');
  // '귀찮다' 고 답했으므로 미루는 마음을 잡는 결이어야 한다
  ok(QUOTES.filter((x) => x.tone === 'drive').some((x) => q.text.includes(x.text.ko.slice(0, 10))),
    "'귀찮다' 답에는 drive 결의 명언");

  await page.click('#gate-quote-card');
  await page.waitForTimeout(600);
  ok(await page.evaluate(() => !document.getElementById('gate')), '명언을 누르면 관문이 걷힌다');
  ok(await page.evaluate(() => document.querySelector('.screen.active')?.id === 'start-screen'),
    '앱의 첫 화면으로 들어간다');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  ok(await page.evaluate(() => !document.getElementById('gate')), '같은 날 다시 열면 관문이 없다');

  ok(errs.length === 0, '콘솔 오류 없음', errs.slice(0, 2).join(' / '));
  await page.close();
}

console.log('\n--- 신체정보 → 계획 → 기록지 (실제 화면) ---');
{
  const page = await (await context(browser)).newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);

  await page.click('.tab[data-screen="plan-screen"]');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => !document.getElementById('plan-empty').hidden),
    '신체정보가 없으면 빈 안내가 나온다');

  await page.click('#plan-empty-btn');
  await page.waitForTimeout(300);
  await page.fill('#body-age', '30');
  await page.fill('#body-height', '175');
  await page.fill('#body-weight', '78');
  await page.click('#body-activity button:nth-child(2)');   // 가볍게 움직임
  await page.click('#body-goal button:nth-child(1)');       // 체중 감량
  await page.click('#body-save-btn');
  await page.waitForTimeout(600);
  ok(await page.evaluate(() => document.querySelector('.screen.active')?.id === 'plan-screen'),
    '저장하면 계획 화면으로 나간다');

  const paneCounts = await page.evaluate(() => {
    const out = {};
    for (const k of ['today', 'week', 'diet', 'numbers']) {
      document.querySelector(`.plan-tab[data-plan-tab="${k}"]`).click();
      out[k] = document.getElementById('plan-pane-' + k).children.length;
    }
    return out;
  });
  ok(Object.values(paneCounts).every((n) => n > 0), '네 판이 다 채워졌다', JSON.stringify(paneCounts));
  ok(await page.evaluate(() => document.querySelectorAll('#plan-pane-week .plan-week-row').length === 7),
    '주간 판에 7일이 있다');
  ok(await page.evaluate(() => document.querySelectorAll('#plan-pane-diet .plan-meal').length === 4),
    '식단 판에 네 끼가 있다');

  // 계획이 정한 값이 설정 화면으로 그대로 넘어가는가
  await page.click('.plan-tab[data-plan-tab="today"]');
  await page.waitForTimeout(300);
  const hasStart = await page.evaluate(() => !!document.querySelector('[data-plan-start]'));
  if (hasStart) {
    const expected = await page.evaluate(() => {
      const meta = document.querySelector('#plan-pane-today .plan-day-meta')?.textContent || '';
      const m = meta.match(/(\d+)\D+(\d+)/);
      return m ? { sets: m[1], secs: m[2] } : null;
    });
    await page.click('[data-plan-start]');
    await page.waitForTimeout(600);
    const got = await page.evaluate(() => ({
      screen: document.querySelector('.screen.active')?.id,
      sets: document.getElementById('summary-sets')?.textContent,
      secs: document.getElementById('summary-secs')?.textContent,
      picked: document.querySelectorAll('#ex-grid .ex-card.checked').length,
    }));
    ok(got.screen === 'setup-screen', '계획에서 누르면 설정 화면으로 간다', got.screen);
    ok(expected && got.sets === expected.sets && got.secs === expected.secs,
      '계획이 말한 세트·초가 설정에 그대로 있다',
      `계획 ${expected?.sets}세트 ${expected?.secs}초 → 설정 ${got.sets}세트 ${got.secs}초`);
    ok(got.picked >= 2, '계획의 동작이 골라져 있다', `${got.picked}개`);
  } else {
    console.log('  건너뜀  오늘은 계획상 쉬는 날이라 시작 버튼이 없다');
  }

  // 기록지: 상태 네 가지가 실제로 갈리는가
  await page.click('.tab[data-screen="log-screen"]');
  await page.waitForTimeout(450);
  const statusLine = () => page.evaluate(() =>
    document.querySelector('#log-status .log-status-line')?.textContent || '');
  const status = () => page.evaluate(() => document.getElementById('log-status')?.dataset.status);

  ok((await status()) === 'none', '아무것도 안 하면 none', await statusLine());
  for (const meal of ['breakfast', 'lunch']) {
    await page.click(`#log-check .log-row[data-id="${meal}"]`);
    await page.waitForTimeout(200);
  }
  ok((await status()) === 'none', '세 끼 중 두 끼는 아직 식단 완료가 아니다', await statusLine());
  ok(await page.evaluate(() => !!document.querySelector('.log-chip.partial')),
    '대신 일부 표시가 켜진다');
  await page.click('#log-check .log-row[data-id="dinner"]');
  await page.waitForTimeout(250);
  ok((await status()) === 'diet', '세 끼가 다 차면 diet', await statusLine());
  await page.click('#log-check .log-row[data-id="workout"]');
  await page.waitForTimeout(250);
  ok((await status()) === 'both', '운동까지 하면 both', await statusLine());
  await page.click('#log-check .log-row[data-id="breakfast"]');
  await page.waitForTimeout(250);
  ok((await status()) === 'workout', '식단 한 칸을 빼면 workout', await statusLine());

  // 홈 카드가 같은 말을 하는가
  await page.click('.tab[data-screen="start-screen"]');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => document.getElementById('today-card')?.dataset.status === 'workout'),
    '홈 카드도 같은 상태를 말한다',
    await page.evaluate(() => document.querySelector('#today-card .tc-status')?.textContent));

  // 체중을 기록지에 적으면 신체정보도 따라 바뀌는가
  await page.click('#today-card-open');
  await page.waitForTimeout(400);
  await page.fill('#log-weight-input', '76.5');
  await page.dispatchEvent('#log-weight-input', 'change');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() =>
    JSON.parse(localStorage.getItem('qfit_body_v1') || '{}').weightKg === 76.5),
    '기록지의 체중이 신체정보로 넘어간다');
  ok(await page.evaluate(() => Number(localStorage.getItem('wodrush_weight_kg_v1')) === 76.5),
    '결과 화면의 칼로리 추정이 쓰는 옛 키에도 같이 쓴다');

  ok(errs.length === 0, '콘솔 오류 없음', errs.slice(0, 2).join(' / '));
  await page.close();
}

await browser.close();
console.log(fail ? `\n실패 ${fail}건` : '\n전부 통과');
process.exit(fail ? 1 : 0);
