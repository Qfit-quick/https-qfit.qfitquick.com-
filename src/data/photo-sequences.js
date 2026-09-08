// 운동하는 중에 화면에 뜨는 사진.
//
// **동작 설명은 여기가 아니라 영상이 맡는다**(video-clips.js). 이 사진들은
// '지금 이 동작을 하고 있다'를 보여 주는 자리에만 쓴다. 그래서 한 운동의
// 사진만 쓴다 — 팔굽혀펴기 세트에 다른 동작 사진이 섞이면 따라 하던 사람이
// 자기가 뭘 하는 중인지 놓친다.
//
// frames 는 **동작의 국면 순서**다. 1 번이 시작 자세, 뒤로 갈수록 진행된 자세.
// 되돌아오는 순서까지 여기 적지 않는다 — 그건 mode 가 정한다.
//
// mode:
//   pingpong  1→2→3→2→1→2… 갔다가 온 길로 돌아오는 동작. 대부분 이쪽이다.
//             스쿼트는 앉았으면 반드시 다시 일어난다.
//   loop      1→2→3→1… 앞으로 나아가거나 좌우가 번갈아 도는 동작.
//             배밀기를 왕복시키면 뒤로 기어가는 것처럼 보인다. 실제로 그랬다.
//   hold      바꿀 프레임이 없는 버티기 동작. 사진은 한 장이고 천천히 흐르는
//             화면 움직임만 준다.
//
// ms 는 한 프레임이 머무는 시간이다. 동작의 실제 속도를 따라간다 —
// 점프스쿼트와 레그레이즈가 같은 박자로 넘어가면 둘 다 거짓말이 된다.
export const PHOTO_SEQUENCES = {
  SQUAT:      { frames: ['squat-1.webp', 'squat-2.webp'],                                  mode: 'pingpong', ms: 950 },
  PUSHUP:     { frames: ['pushup-1.webp', 'pushup-2.webp'],                                mode: 'pingpong', ms: 850 },
  PIKEPUSHUP: { frames: ['pikepushup-1.webp', 'pikepushup-2.webp'],                        mode: 'pingpong', ms: 900 },
  CRUNCH:     { frames: ['crunch-1.webp', 'crunch-2.webp'],                                mode: 'pingpong', ms: 850 },
  LEGRAISE:   { frames: ['legraise-1.webp', 'legraise-2.webp'],                            mode: 'pingpong', ms: 1000 },
  HIPBRIDGE:  { frames: ['hipbridge-1.webp', 'hipbridge-2.webp'],                          mode: 'pingpong', ms: 950 },
  LUNGE:      { frames: ['lunge-1.webp', 'lunge-2.webp', 'lunge-3.webp'],                  mode: 'pingpong', ms: 900 },
  // 버피와 점프스쿼트는 빠르다. 느리게 넘기면 '폭발적으로' 라고 써 놓고
  // 화면은 느긋한 모순이 된다.
  BURPEE:     { frames: ['burpee-1.webp', 'burpee-2.webp', 'burpee-3.webp'],               mode: 'pingpong', ms: 620 },
  JUMPSQUAT:  { frames: ['jumpsquat-1.webp', 'jumpsquat-2.webp'],                          mode: 'pingpong', ms: 620 },
  // 제자리 달리기는 좌우 다리가 번갈아 나온다. 왕복시키면 같은 다리를
  // 두 번 딛는 모양이 되어 박자가 깨진다.
  RUNINPLACE: { frames: ['runinplace-1.webp', 'runinplace-2.webp'],                        mode: 'loop', ms: 380 },
  // 앞으로 나아가는 동작. loop 여야 한다.
  ARMYCRAWL:  { frames: ['armycrawl-1.webp', 'armycrawl-2.webp', 'armycrawl-3.webp', 'armycrawl-4.webp'],
                                                                                            mode: 'loop', ms: 520 },
  // 버티기. 사진이 한 장뿐이고, 그게 맞다 — 플랭크는 안 움직이는 것이 동작이다.
  PLANK:      { frames: ['plank-1.webp'],                                                   mode: 'hold', ms: 0 },

  // 12종 — src/ 개편 때 함께 빠졌다가 동작 자체와 같이 되살아난 사진들
  // (2026-09-08). 이 사진들 자체는 옛 빌드에도 있었지만, frames/mode/ms
  // 체계는 그 뒤에 새로 생긴 것이라 옛 판에 남은 값이 없다 — 옆 동작들의
  // 결을 따라 새로 정했다.
  CALFRAISE:       { frames: ['calfraise-1.webp', 'calfraise-2.webp'],                       mode: 'pingpong', ms: 900 },
  WIDEPUSHUP:      { frames: ['widepushup-1.webp', 'widepushup-2.webp'],                     mode: 'pingpong', ms: 850 },
  DIAMONDPUSHUP:   { frames: ['diamondpushup-1.webp', 'diamondpushup-2.webp'],               mode: 'pingpong', ms: 900 },
  COSSACKSQUAT:    { frames: ['cossacksquat-1.webp', 'cossacksquat-2.webp', 'cossacksquat-3.webp'], mode: 'pingpong', ms: 850 },
  VUP:             { frames: ['vup-1.webp', 'vup-2.webp'],                                   mode: 'pingpong', ms: 900 },
  DEADBUG:         { frames: ['deadbug-1.webp', 'deadbug-2.webp', 'deadbug-3.webp'],         mode: 'pingpong', ms: 950 },
  PLANKPUSHUP:     { frames: ['plankpushup-1.webp','plankpushup-2.webp','plankpushup-3.webp','plankpushup-4.webp','plankpushup-5.webp','plankpushup-6.webp','plankpushup-7.webp','plankpushup-8.webp','plankpushup-9.webp'], mode: 'pingpong', ms: 700 },
  YRAISE:          { frames: ['yraise-1.webp', 'yraise-2.webp'],                             mode: 'pingpong', ms: 950 },
  // 손으로 걸어 나갔다가 걸어 돌아오는 동작 — 왕복 자체가 동작이라 pingpong.
  ARMWALK:         { frames: ['armwalk-1.webp', 'armwalk-2.webp', 'armwalk-3.webp', 'armwalk-4.webp'], mode: 'pingpong', ms: 750 },
  // 버티기 둘. 하이플랭크·리버스플랭크 모두 안 움직이는 것이 동작이다.
  HIGHPLANK:       { frames: ['highplank-1.webp'],                                           mode: 'hold', ms: 0 },
  REVERSEPLANK:    { frames: ['reverseplank-1.webp'],                                        mode: 'hold', ms: 0 },
  // 제자리 달리기처럼 좌우 다리가 번갈아 나온다 — loop 여야 같은 다리를
  // 두 번 딛는 것처럼 안 보인다.
  MOUNTAINCLIMBER: { frames: ['mountainclimber-1.webp', 'mountainclimber-2.webp'],           mode: 'loop', ms: 380 },
};

/**
 * frames 와 mode 로 실제로 돌릴 순서를 만든다.
 *
 * pingpong 은 양 끝을 두 번 쓰지 않는다. [1,2,3] 은 1,2,3,2 로 돌아야
 * 3 에서 한 박 쉬었다가 내려오는 것처럼 보인다. 1,2,3,3,2,1 로 만들면
 * 위아래 끝에서 두 번씩 멈춘다.
 */
export function photoCycle(key) {
  const seq = PHOTO_SEQUENCES[key];
  if (!seq || !seq.frames || seq.frames.length === 0) return [];
  const { frames, mode } = seq;
  if (mode !== 'pingpong' || frames.length < 3) return frames.slice();
  return frames.concat(frames.slice(1, -1).reverse());
}
