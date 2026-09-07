// 신체정보 → 운동 계획 + 식단 계획.
//
// 순수 함수만 둔다. 저장·화면은 각각 src/health/store.js 와 src/ui/plan.js 다.
// 여기에 DOM 이 들어오면 계산을 눈으로만 확인하게 되고, 그때부터 숫자가
// 맞는지 아무도 모르게 된다.
//
// ── 어디서 온 숫자인가 ────────────────────────────────────────
// BMR        Mifflin-St Jeor 식. 남 10W+6.25H-5A+5 / 여 10W+6.25H-5A-161
// 활동계수    1.2 / 1.375 / 1.55 / 1.725 / 1.9 (앉아서 지냄 ~ 매우 활동적)
// 단백질      ISSN 스포츠영양 포지션 스탠드 1.4~2.0 g/kg. 감량기에는 제지방
//            보존을 위해 위쪽을 쓴다. 하한은 2020 한국인 영양소 섭취기준의
//            권장섭취량 0.91 g/kg — 그 아래로는 절대 내려가지 않게 막는다.
// 탄수화물    같은 기준의 권장섭취량 하루 130g 이 바닥이다. 지방·단백질을
//            떼고 남은 몫이 130g 아래로 떨어지면 목표 칼로리 쪽을 올린다.
// 에너지비율  탄 55~65% · 단 7~20% · 지 15~30% (에너지적정비율, AMDR)
// BMI 구간    대한비만학회 / 아시아-태평양 기준(비만 25 이상). WHO 의 30 이
//            아니다 — 한국인에게 30 을 쓰면 과체중 구간이 통째로 사라진다.
// 운동량      WHO 신체활동 지침: 중강도 주 150~300분 + 근력 주 2일 이상
// 소모칼로리   MET × 체중(kg) × 시간(h). MET 은 exercises.js 에 있다.

import { EXERCISES } from './exercises.js';
import { MUSCLE_GROUPS } from './muscle-groups.js';
import { FOOD_BY_TAG, FOOD_BY_KEY, MEAL_SPLIT } from './foods.js';
import { INTENSITY } from './checkin.js';

// ── 선택지 ────────────────────────────────────────────────────

export const SEX_OPTIONS = [
  { id:'male',   label:{ko:'남성', en:'Male', zh:'男'} },
  { id:'female', label:{ko:'여성', en:'Female', zh:'女'} },
];

export const ACTIVITY_OPTIONS = [
  { id:'sedentary', factor:1.2,
    label:{ko:'거의 안 움직임', en:'Sedentary', zh:'几乎不动'},
    sub:{ko:'앉아서 일하고 따로 운동은 안 함', en:'Desk job, no regular exercise', zh:'久坐办公，不额外运动'} },
  { id:'light', factor:1.375,
    label:{ko:'가볍게 움직임', en:'Lightly active', zh:'轻度活动'},
    sub:{ko:'주 1~3회 가벼운 운동', en:'Light exercise 1-3 days a week', zh:'每周1~3次轻度运动'} },
  { id:'moderate', factor:1.55,
    label:{ko:'보통', en:'Moderately active', zh:'中度活动'},
    sub:{ko:'주 3~5회 운동', en:'Exercise 3-5 days a week', zh:'每周3~5次运动'} },
  { id:'active', factor:1.725,
    label:{ko:'많이 움직임', en:'Very active', zh:'高度活动'},
    sub:{ko:'주 6~7회 운동, 또는 몸 쓰는 일', en:'Exercise 6-7 days a week, or physical job', zh:'每周6~7次运动，或体力工作'} },
  { id:'athlete', factor:1.9,
    label:{ko:'선수 수준', en:'Extra active', zh:'运动员级'},
    sub:{ko:'하루 두 번 훈련', en:'Training twice a day', zh:'一天两练'} },
];

export const GOAL_OPTIONS = [
  { id:'loss',
    label:{ko:'체중 감량', en:'Lose weight', zh:'减重'},
    sub:{ko:'주 0.5kg 정도를 목표로 합니다', en:'Aiming for about 0.5kg a week', zh:'目标每周约0.5公斤'} },
  { id:'keep',
    label:{ko:'현재 유지', en:'Maintain', zh:'保持'},
    sub:{ko:'체중은 그대로, 체력을 올립니다', en:'Same weight, better fitness', zh:'体重不变，提升体能'} },
  { id:'gain',
    label:{ko:'근육 증가', en:'Build muscle', zh:'增肌'},
    sub:{ko:'천천히 늘려 지방을 덜 붙입니다', en:'Slow gain, less fat', zh:'缓慢增加，少长脂肪'} },
];

// ── 계산 ──────────────────────────────────────────────────────

const round = (n, step = 1) => Math.round(n / step) * step;

/** Mifflin-St Jeor. 값이 없으면 null — 0 으로 때우면 화면에 0kcal 가 나온다. */
export function bmrOf({ sex, age, heightCm, weightKg }) {
  if (!age || !heightCm || !weightKg) return null;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(sex === 'female' ? base - 161 : base + 5);
}

export function tdeeOf(body) {
  const bmr = bmrOf(body);
  if (!bmr) return null;
  const act = ACTIVITY_OPTIONS.find((a) => a.id === body.activity) || ACTIVITY_OPTIONS[1];
  return Math.round(bmr * act.factor);
}

/** BMI 와 구간. 구간은 대한비만학회(아시아-태평양) 기준이다. */
export function bmiOf({ heightCm, weightKg }) {
  if (!heightCm || !weightKg) return null;
  const m = heightCm / 100;
  const v = weightKg / (m * m);
  return Math.round(v * 10) / 10;
}

export const BMI_BANDS = [
  { max:18.5, id:'under', label:{ko:'저체중', en:'Underweight', zh:'体重过轻'} },
  { max:23,   id:'normal', label:{ko:'정상', en:'Normal', zh:'正常'} },
  { max:25,   id:'over', label:{ko:'과체중', en:'Overweight', zh:'超重'} },
  { max:30,   id:'obese1', label:{ko:'비만 1단계', en:'Obesity I', zh:'肥胖1级'} },
  { max:35,   id:'obese2', label:{ko:'비만 2단계', en:'Obesity II', zh:'肥胖2级'} },
  { max:Infinity, id:'obese3', label:{ko:'비만 3단계', en:'Obesity III', zh:'肥胖3级'} },
];

export function bmiBand(bmi) {
  if (bmi == null) return null;
  return BMI_BANDS.find((b) => bmi < b.max) || BMI_BANDS[BMI_BANDS.length - 1];
}

/** 목표 체중 범위 — BMI 18.5~23 을 kg 으로 되돌린 것. */
export function healthyWeightRange(heightCm) {
  if (!heightCm) return null;
  const m = heightCm / 100;
  return { min: Math.round(18.5 * m * m * 10) / 10, max: Math.round(22.9 * m * m * 10) / 10 };
}

/**
 * 하루 목표 칼로리와 3대 영양소.
 *
 * 감량에서 500kcal 를 그냥 빼지 않는다. 마른 사람에게 500 은 기초대사량을
 * 밑도는 값이 될 수 있어서, **TDEE 의 20% 와 500 중 작은 쪽**을 빼고
 * 그러고도 기초대사량 아래로 내려가면 기초대사량에 맞춘다. 굶는 식단을
 * 앱이 먼저 권하는 일은 없어야 한다.
 */
export function nutritionPlan(body) {
  const tdee = tdeeOf(body);
  const bmr = bmrOf(body);
  if (!tdee || !bmr) return null;

  const w = body.weightKg;
  const goal = body.goal || 'keep';

  let target = tdee;
  if (goal === 'loss') {
    target = tdee - Math.min(500, Math.round(tdee * 0.2));
  } else if (goal === 'gain') {
    target = tdee + Math.min(300, Math.round(tdee * 0.12));
  }
  target = round(target, 10);

  // 기초대사량 아래로는 내리지 않는다.
  //
  // ⚠ 이 확인은 **10 단위로 반올림한 뒤에** 해야 한다. 앞에서 하면
  // 기초대사량(1152)에 맞춘 값이 반올림에 1150 으로 깎여 다시 아래로
  // 내려간다 — 45kg 여성에서 실제로 그랬다. 그래서 여기서는 올림이다.
  let floored = false;
  if (goal === 'loss' && target < bmr) {
    target = Math.ceil(bmr / 10) * 10;
    floored = true;
  }

  // 단백질: 감량·증량은 1.8, 유지는 1.4 g/kg. 하한은 KDRI 권장 0.91 g/kg.
  const perKg = goal === 'keep' ? 1.4 : 1.8;
  const proteinG = Math.max(Math.round(w * perKg), Math.round(w * 0.91));
  // 지방: 총 열량의 25% (에너지적정비율 15~30% 의 가운데).
  let fatG = Math.round((target * 0.25) / 9);
  // 탄수화물: 남은 몫. 권장섭취량 130g 이 바닥이다.
  let carbG = Math.round((target - proteinG * 4 - fatG * 9) / 4);
  let carbFloored = false;
  if (carbG < 130) {
    carbG = 130;
    // 지방을 깎아 자리를 만든다. 총 열량의 15%(AMDR 하한) 아래로는 안 내린다.
    const minFat = Math.round((target * 0.15) / 9);
    fatG = Math.max(minFat, Math.round((target - proteinG * 4 - carbG * 4) / 9));
    carbFloored = true;
  }

  return {
    bmr, tdee, target, floored, carbFloored,
    protein: proteinG, carb: carbG, fat: fatG,
    // 수분: 체중 1kg 당 30~35mL. 200mL 컵으로 환산해 보여 준다.
    waterMl: Math.round((w * 33) / 50) * 50,
    waterCups: Math.max(6, Math.round((w * 33) / 200)),
    // 끼니별 칼로리.
    meals: MEAL_SPLIT.map((m) => ({ ...m, kcal: round(target * m.ratio, 10) })),
  };
}

// ── 운동 계획 ─────────────────────────────────────────────────

const groupKeys = (id) => (MUSCLE_GROUPS.find((g) => g.id === id) || { keys: [] }).keys;
const EX_BY_KEY = Object.fromEntries(EXERCISES.map((e) => [e.key, e]));

/**
 * 주간 계획 뼈대. 목표마다 다른 것은 '며칠 하나' 와 '무엇을 하나' 다.
 *
 * WHO 지침(중강도 주 150~300분 + 근력 주 2일 이상)을 이 앱의 단위로 옮기면:
 * 한 세션이 2~5분이라 주 5일을 해도 지침의 시간에는 못 미친다. 그래서
 * 계획에 '오늘의 추가 활동'(걷기 등)을 한 줄씩 같이 적는다 — 앱만 하면
 * 충분하다고 말하면 그건 거짓말이다.
 */
const SPLITS = {
  loss: [
    { focus:'full',  add:'walk30' },
    { focus:'lower', add:'walk20' },
    { focus:'full',  add:'walk30' },
    { focus:'core',  add:'walk20' },
    { focus:'full',  add:'walk30' },
    { focus:'rest',  add:'stretch' },
    { focus:'upper', add:'walk20' },
  ],
  keep: [
    { focus:'lower', add:'walk20' },
    { focus:'rest',  add:'walk30' },
    { focus:'upper', add:'walk20' },
    { focus:'rest',  add:'stretch' },
    { focus:'full',  add:'walk30' },
    { focus:'core',  add:'walk20' },
    { focus:'rest',  add:'stretch' },
  ],
  gain: [
    { focus:'lower', add:'stretch' },
    { focus:'upper', add:'walk20' },
    { focus:'rest',  add:'stretch' },
    { focus:'core',  add:'walk20' },
    { focus:'lower', add:'stretch' },
    { focus:'upper', add:'walk20' },
    { focus:'rest',  add:'stretch' },
  ],
};

export const ADD_ONS = {
  walk20: { min:20,
    label:{ko:'빠르게 걷기 20분', en:'Brisk walk 20 min', zh:'快走20分钟'} },
  walk30: { min:30,
    label:{ko:'빠르게 걷기 30분', en:'Brisk walk 30 min', zh:'快走30分钟'} },
  stretch: { min:10,
    label:{ko:'스트레칭 10분', en:'Stretching 10 min', zh:'拉伸10分钟'} },
};

export const FOCUS_LABEL = {
  full:  {ko:'전신', en:'Full body', zh:'全身'},
  lower: {ko:'하체', en:'Lower body', zh:'下肢'},
  upper: {ko:'상체', en:'Upper body', zh:'上肢'},
  core:  {ko:'코어', en:'Core', zh:'核心'},
  rest:  {ko:'쉬는 날', en:'Rest day', zh:'休息日'},
};

export const DOW_LABEL = [
  {ko:'월', en:'Mon', zh:'一'}, {ko:'화', en:'Tue', zh:'二'}, {ko:'수', en:'Wed', zh:'三'},
  {ko:'목', en:'Thu', zh:'四'}, {ko:'금', en:'Fri', zh:'五'}, {ko:'토', en:'Sat', zh:'六'},
  {ko:'일', en:'Sun', zh:'日'},
];

/**
 * 한 세션의 예상 소모 칼로리.
 *
 * 식과 상수를 **결과 화면(app.js)과 똑같이** 쓴다 — kcal = MET × 3.5 × 체중 ÷ 200
 * × 분, 여기에 짧고 센 서킷의 애프터번(EPOC) 1.2배, 그리고 세트 사이 자리 잡는
 * 시간을 MET 3.0 으로 더한다. 두 곳이 다른 식을 쓰면 "계획은 40kcal 라더니
 * 끝나고 보니 18kcal" 가 되고, 그러면 둘 중 어느 쪽도 못 믿게 된다.
 */
export function sessionKcal(exKeys, sets, secPerSet, weightKg) {
  if (!exKeys.length || !weightKg) return 0;
  const avgMet = exKeys.reduce((s, k) => s + ((EX_BY_KEY[k] || {}).met || 4), 0) / exKeys.length;
  const per = (met, minutes) => (met * 3.5 * weightKg) / 200 * minutes;
  const workMin = (sets * secPerSet) / 60;
  const moveMin = (sets * 5) / 60; // 자리 잡는 시간
  return Math.max(1, Math.round(per(avgMet, workMin) * 1.2 + per(3.0, moveMin)));
}

/**
 * 주간 운동 계획 7일치.
 *
 * intensity 는 그날의 설문(체크인)이 정한다 — 계획은 주 단위로 세우되,
 * 오늘 얼마나 할지는 오늘 아침의 컨디션이 정하는 게 맞다.
 */
export function workoutPlan(body, intensity = 'normal') {
  const goal = body.goal || 'keep';
  const split = SPLITS[goal] || SPLITS.keep;
  // 세트 수와 초는 checkin.js 의 INTENSITY 한 곳에서만 온다. 여기에 다시
  // 적어 두었다가 두 표가 갈라졌다 — 계획은 8초, 설정 화면은 6초였다.
  const level = INTENSITY[intensity] || INTENSITY.normal;
  const sets = level.sets;
  const secPerSet = level.secPerSet;
  const exLevel = body.level === 'pro' ? 'pro' : 'novice';

  return split.map((day, i) => {
    if (day.focus === 'rest') {
      return { dow:i, focus:'rest', exKeys:[], sets:0, secPerSet:0, preset:level.preset, kcal:0, add:day.add };
    }
    let pool = day.focus === 'full'
      ? EXERCISES.map((e) => e.key)
      : groupKeys(day.focus);
    // 초보자에게는 pro 동작(버피·점프스쿼트 등)을 빼 준다. 다만 그 결과
    // 후보가 비어 버리면 안 되므로, 비면 원래 목록으로 되돌린다.
    if (exLevel === 'novice') {
      const easy = pool.filter((k) => !(EX_BY_KEY[k] || {}).pro);
      if (easy.length >= 3) pool = easy;
    }
    // 요일마다 다른 조합이 나오되 같은 요일은 늘 같도록, 요일을 씨앗으로 돌린다.
    const exKeys = [];
    for (let n = 0; n < Math.min(4, pool.length); n++) {
      exKeys.push(pool[(i * 3 + n * 2) % pool.length]);
    }
    const uniq = [...new Set(exKeys)];
    return {
      dow: i,
      focus: day.focus,
      exKeys: uniq,
      sets,
      secPerSet,
      // 어느 프리셋인지도 같이 넘긴다. 계획 화면이 초 수를 보고 프리셋을
      // 되짚어 고르면(6초→short 처럼) 표가 바뀔 때 그 되짚기가 먼저 틀어진다.
      preset: level.preset,
      kcal: sessionKcal(uniq, sets, secPerSet, body.weightKg),
      add: day.add,
    };
  });
}

/** 오늘이 주간 계획의 몇 번째 날인가. 월요일이 0. */
export function todayIndex(date = new Date()) {
  return (date.getDay() + 6) % 7;
}

// ── 식단 계획 ─────────────────────────────────────────────────

// 날짜를 씨앗으로 쓰는 작은 난수. 같은 날에는 몇 번을 다시 그려도 같은
// 식단이 나와야 한다 — 화면을 나갔다 들어올 때마다 메뉴가 바뀌면
// 그건 계획이 아니라 추천기다.
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function dateSeed(dateStr) {
  let h = 2166136261;
  for (let i = 0; i < dateStr.length; i++) {
    h ^= dateStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const ITEM_KCAL = (food, mult) => Math.round((food.per100.kcal * food.serveG * mult) / 100);
const ITEM_MACRO = (food, mult, key) =>
  Math.round((food.per100[key] * food.serveG * mult) / 100 * 10) / 10;

// 끼니별로 어울리는 후보만 쓴다. 아침에 제육볶음을 권하지 않기 위해서다.
const MEAL_POOLS = {
  breakfast: { carb:['oatmeal','bread-whole','sweet-potato','rice-white'],
               protein:['egg','greek-yogurt','tofu','whey'],
               veg:['cherry-tomato','cabbage','broccoli'],
               fat:['almond','peanut-butter','avocado'] },
  lunch:     { carb:['rice-white','rice-brown','rice-multi','potato'],
               protein:['chicken-breast','beef-round','pork-loin','tuna-can'],
               veg:['kimchi','namul','broccoli','doenjang-soup'],
               fat:['olive-oil','almond','avocado'] },
  dinner:    { carb:['rice-brown','rice-multi','sweet-potato','potato'],
               protein:['salmon','whitefish','tofu','shrimp','chicken-tender'],
               veg:['spinach','seaweed-soup','cabbage','kimchi'],
               fat:['olive-oil','almond','avocado'] },
  snack:     { protein:['greek-yogurt','whey','milk-low','soymilk'],
               fruit:['banana','apple','blueberry','tangerine'],
               fat:['almond','peanut-butter'] },
};

const pick = (rnd, list) => list[Math.floor(rnd() * list.length)];

// 배수는 0.25 단위로만 움직인다. 소수 셋째 자리까지 나오는 '1.37인분' 은
// 사람이 계량할 수 없는 숫자라, 맞아도 못 쓴다. 위 한계 3배는 증량 목표에서
// 필요하다 — 1.5 로 막아 두니 2900kcal 목표에 2100kcal 짜리 식단이 나왔다.
const MULT_MAX = 3;
// 지방 항목만 0.25 배까지 내려간다. 1인분이 아몬드 12알·기름 2작은술이라
// 0.25 배도 '아몬드 3알' 로 셀 수 있다. 반면 밥 0.25공기는 계량이 어렵고,
// 하한을 0.5 로 묶어 두니 적게 먹어야 하는 사람에게서 오차가 몰려 나왔다.
const MULT_MIN = { fat: 0.25 };
const snapMult = (v, tag) =>
  Math.min(MULT_MAX, Math.max(MULT_MIN[tag] || 0.5, Math.round(v * 4) / 4));

/** 한 항목의 배수를 '이 영양소를 need 만큼' 이 되도록 맞춘다. */
function fitTo(item, key, need) {
  const perServe = (item.food.per100[key] * item.food.serveG) / 100;
  if (perServe <= 0) return;
  item.mult = snapMult(need / perServe, item.food.tag);
}

/**
 * 하루 식단.
 *
 * 순서가 곧 규칙이다. **단백질 → 지방 → 탄수화물** 순으로 양을 맞춘다:
 *  · 단백질은 목표를 채우는 것이 목적이라 먼저 못 박는다. 마지막에 맞추면
 *    남은 칼로리에 밀려 늘 부족해진다.
 *  · 지방은 총열량의 25%(에너지적정비율의 가운데)로 정해져 있으니 그다음.
 *  · 탄수화물이 남은 칼로리를 받는다. 밥은 반 공기 단위로 조절이 쉬운
 *    유일한 항목이라, 오차를 여기서 흡수하는 것이 실제로 지킬 수 있다.
 * 채소는 절대 줄이지 않는다 — 칼로리를 채소에서 깎는 것은 방향이 반대다.
 */
export function mealPlan(nutrition, dateStr) {
  if (!nutrition) return null;
  const rnd = seeded(dateSeed(dateStr));

  return nutrition.meals.map((meal) => {
    const pool = MEAL_POOLS[meal.id];
    const items = [];
    let carbItem = null, proteinItem = null, fatItem = null;

    if (meal.id === 'snack') {
      proteinItem = { food: FOOD_BY_KEY[pick(rnd, pool.protein)], mult: 1 };
      carbItem = { food: FOOD_BY_KEY[pick(rnd, pool.fruit)], mult: 1 };
      fatItem = { food: FOOD_BY_KEY[pick(rnd, pool.fat)], mult: 1 };
      items.push(proteinItem, carbItem, fatItem);
    } else {
      carbItem = { food: FOOD_BY_KEY[pick(rnd, pool.carb)], mult: 1 };
      proteinItem = { food: FOOD_BY_KEY[pick(rnd, pool.protein)], mult: 1 };
      const veg1 = { food: FOOD_BY_KEY[pick(rnd, pool.veg)], mult: 1 };
      // 채소는 두 가지가 기본이다. 한 가지만 두면 실제 밥상과 안 닮는다.
      const rest = pool.veg.filter((k) => k !== veg1.food.key);
      const veg2 = rest.length ? { food: FOOD_BY_KEY[pick(rnd, rest)], mult: 1 } : null;
      fatItem = { food: FOOD_BY_KEY[pick(rnd, pool.fat)], mult: 1 };
      items.push(carbItem, proteinItem, veg1);
      if (veg2) items.push(veg2);
      items.push(fatItem);
    }

    const sumOf = (key, skip) =>
      items.reduce((s, it) => (it === skip ? s : s + (it.food.per100[key] * it.food.serveG * it.mult) / 100), 0);

    // 1) 단백질
    fitTo(proteinItem, 'p', Math.max(0, nutrition.protein * meal.ratio - sumOf('p', proteinItem)));
    // 2) 지방
    fitTo(fatItem, 'f', Math.max(0, nutrition.fat * meal.ratio - sumOf('f', fatItem)));
    // 3) 탄수화물이 남은 칼로리를 받는다
    fitTo(carbItem, 'kcal', Math.max(0, meal.kcal - sumOf('kcal', carbItem)));
    // 4) 넘쳤으면 지방부터 깎고 탄수를 다시 맞춘다. 0.25 배 단위로 끊는
    //    반올림이 세 항목에서 겹치면 한 끼가 10% 넘게 넘칠 수 있는데,
    //    그게 네 끼 모이면 감량 계획의 적자가 그대로 사라진다.
    for (let pass = 0; pass < 3; pass++) {
      const over = sumOf('kcal', null) - meal.kcal;
      if (over <= meal.kcal * 0.04) break;
      const next = snapMult(fatItem.mult - 0.25, 'fat');
      if (next === fatItem.mult) break;
      fatItem.mult = next;
      fitTo(carbItem, 'kcal', Math.max(0, meal.kcal - sumOf('kcal', carbItem)));
    }

    const rows = items.map((it) => ({
      key: it.food.key,
      food: it.food,
      mult: it.mult,
      kcal: ITEM_KCAL(it.food, it.mult),
      p: ITEM_MACRO(it.food, it.mult, 'p'),
      c: ITEM_MACRO(it.food, it.mult, 'c'),
      f: ITEM_MACRO(it.food, it.mult, 'f'),
    }));

    return {
      id: meal.id,
      label: meal.label,
      targetKcal: meal.kcal,
      kcal: rows.reduce((s, r) => s + r.kcal, 0),
      p: Math.round(rows.reduce((s, r) => s + r.p, 0)),
      c: Math.round(rows.reduce((s, r) => s + r.c, 0)),
      f: Math.round(rows.reduce((s, r) => s + r.f, 0)),
      rows,
    };
  });
}

/** 짠 식단이 실제로 목표에 닿았는지. 화면이 이 값을 그대로 보여 준다. */
export function mealPlanTotals(meals) {
  if (!meals) return null;
  return meals.reduce(
    (acc, m) => ({ kcal: acc.kcal + m.kcal, p: acc.p + m.p, c: acc.c + m.c, f: acc.f + m.f }),
    { kcal:0, p:0, c:0, f:0 }
  );
}

/** 식단 조합에 실제로 쓰이는 tag 만 노출한다(화면의 범례가 이걸 읽는다). */
export const MEAL_TAGS = Object.keys(FOOD_BY_TAG);
