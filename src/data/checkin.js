// 하루 첫 설문(체크인) 두 문항.
//
// 두 문항인 이유: 앱을 열자마자 나오는 관문이라, 문항이 셋이 되면 관문이
// 아니라 양식(form)이 된다. 그리고 이 앱은 이미 AI 퀴즈를 두 문항으로
// 자르는 판단을 한 번 했다(설계 04) — 같은 규칙을 여기서도 쓴다.
//
// 답은 두 곳에 쓰인다:
//   1) 명언의 결(tone)을 고른다 — src/data/quotes.js
//   2) 오늘 권하는 운동 강도를 고른다 — src/data/plan.js
// 그래서 선택지 값에 점수(score)와 강도(intensity)를 같이 달아 둔다.
// 라벨만 두고 점수를 화면 코드에서 계산하면, 문항을 고칠 때 두 곳을 고쳐야 한다.

import { DURATION_PRESETS } from './durations.js';

/** 문항 1 — 오늘 기분. score 는 0(나쁨) ~ 4(아주 좋음). */
export const MOOD_OPTIONS = [
  { id:'great', emoji:'🔥', score:4,
    label:{ko:'아주 좋아요', en:'Great', zh:'非常好'} },
  { id:'good', emoji:'🙂', score:3,
    label:{ko:'좋아요', en:'Good', zh:'不错'} },
  { id:'soso', emoji:'😐', score:2,
    label:{ko:'그저 그래요', en:'So-so', zh:'一般'} },
  { id:'tired', emoji:'😪', score:1,
    label:{ko:'피곤해요', en:'Tired', zh:'很累'} },
  { id:'bad', emoji:'😞', score:0,
    label:{ko:'안 좋아요', en:'Not good', zh:'不太好'} },
];

/** 문항 2 — 오늘 운동을 어떻게 생각하나. intensity 가 오늘 추천 강도가 된다. */
export const DRIVE_OPTIONS = [
  { id:'fired', emoji:'💪', score:3, intensity:'hard',
    label:{ko:'제대로 하고 싶어요', en:'I want to go hard', zh:'想好好练一场'},
    sub:{ko:'풀 세션으로 권해 드립니다', en:'We will suggest the full session', zh:'会推荐完整训练'} },
  { id:'ok', emoji:'👍', score:2, intensity:'normal',
    label:{ko:'할 만해요', en:'I can do it', zh:'还可以'},
    sub:{ko:'평소 강도로 권해 드립니다', en:'We will suggest your usual', zh:'会推荐常规强度'} },
  { id:'meh', emoji:'😮‍💨', score:1, intensity:'easy',
    label:{ko:'솔직히 귀찮아요', en:'Honestly, I do not feel like it', zh:'说实话有点懒'},
    sub:{ko:'1분짜리 최소 버전으로 낮춥니다', en:'We will drop it to the 1-minute version', zh:'会降到一分钟的最简版'} },
  { id:'no', emoji:'🛑', score:0, intensity:'easy',
    label:{ko:'전혀 하고 싶지 않아요', en:'Not at all', zh:'完全不想动'},
    sub:{ko:'가장 짧은 것 하나만 권해 드립니다', en:'We will suggest just one short set', zh:'只推荐最短的一组'} },
];

/**
 * 설문 답에서 명언의 결을 정한다.
 *
 * 규칙이 하나뿐이라 순서가 곧 뜻이다:
 *  · 의욕이 낮으면 무엇보다 그것을 먼저 잡는다(drive). 기분이 좋든 나쁘든,
 *    "귀찮다" 는 답에 위로를 얹으면 앱이 그 마음을 거들게 된다.
 *  · 의욕은 있는데 기분이 바닥이면 문턱을 낮춘다(gentle). 여기서 몰아붙이면
 *    다치거나, 다음 날 앱을 안 켠다.
 *  · 그 밖에는 꾸준함(steady).
 */
export function toneFor(moodId, driveId) {
  const mood = MOOD_OPTIONS.find((o) => o.id === moodId);
  const drive = DRIVE_OPTIONS.find((o) => o.id === driveId);
  const m = mood ? mood.score : 2;
  const d = drive ? drive.score : 2;
  if (d <= 1) return 'drive';
  if (m <= 1) return 'gentle';
  return 'steady';
}

/** 오늘 권하는 강도. 기분이 바닥이면 의욕과 무관하게 한 단 낮춘다. */
export function intensityFor(moodId, driveId) {
  const mood = MOOD_OPTIONS.find((o) => o.id === moodId);
  const drive = DRIVE_OPTIONS.find((o) => o.id === driveId);
  const wanted = drive ? drive.intensity : 'normal';
  if (mood && mood.score <= 1 && wanted === 'hard') return 'normal';
  return wanted;
}

/**
 * 강도 한 단의 뜻. 관문·계획·설정 화면이 모두 이 표 하나를 읽는다.
 *
 * ⚠ 초 수를 여기 적지 않는다. 실제로 몇 초를 도는지는 durations.js 의
 * 프리셋이 정하므로, 여기에 따로 적으면 두 숫자가 갈라진다 —
 * 실제로 갈라졌다: 계획이 "세트당 8초" 라고 써 놓고 설정 화면은 6초를
 * 보여 줬다. 프리셋 이름만 가리키고 초는 거기서 읽어 온다.
 */
const SEC = (preset) => DURATION_PRESETS[preset].base;

export const INTENSITY = {
  easy: { sets: 4, preset: 'short', get secPerSet() { return SEC('short'); },
    label:{ko:'가볍게', en:'Light', zh:'轻松'},
    note:{ko:'4세트 · 세트당 6초. 1분도 안 걸립니다.', en:'4 sets x 6s — under a minute.', zh:'4组 x 6秒，不到一分钟。'} },
  normal: { sets: 8, preset: 'normal', get secPerSet() { return SEC('normal'); },
    label:{ko:'보통', en:'Normal', zh:'适中'},
    note:{ko:'8세트 · 세트당 9초. 평소 강도입니다.', en:'8 sets x 9s — your usual.', zh:'8组 x 9秒，常规强度。'} },
  hard: { sets: 12, preset: 'long', get secPerSet() { return SEC('long'); },
    label:{ko:'세게', en:'Hard', zh:'强'},
    note:{ko:'12세트 · 세트당 13초. 오늘은 제대로 갑니다.', en:'12 sets x 13s — going hard today.', zh:'12组 x 13秒，今天认真练。'} },
};
