// 어르신·재활 모드(2026-09-27)의 동작 9종.
//
// src/data/exercises.js 의 24종과는 다른 카탈로그다 — 전부 의자에 앉거나
// 벽·의자를 짚고 하는 저강도 동작이라 그 24종(전부 바닥 운동)과 안 겹치고,
// 영상도 없다(scripts/media.mjs 가 지키는 "동작은 영상으로 보여준다" 규칙을
// 새로 촬영하지 않고는 못 지킨다 — src/ui/quickStart.js 의 difficultyExercises
// 표와 같은 사정). 대신 pictogram(아래) 을 하나씩 붙인다.
//
// duration 은 전부 고정이다(성장 없음) — 이 모드는 빨리 많이 하는 게
// 아니라 다치지 않고 끝까지 하는 게 목적이라, 공용 미션 엔진의 "라운드마다
// 1.1배씩 길어짐"을 안 쓴다.
export const SENIOR_EXERCISE_DURATION_SEC = 30;
export const SENIOR_REST_DURATION_SEC = 15;

// pictogram: src/ui/seniorPictograms.js 의 키. 실루엣 하나(SEATED/STANDING)에
// 팔다리 궤적만 동작마다 다르게 그린다 — 전부 새로 그리지 않고도 9종을
// 일관된 그림체로 만들 수 있다.
export const SENIOR_EXERCISES = [
  {
    key: 'CHAIR_SIT_STAND',
    pictogram: 'sitStand',
    name: { ko: '의자 잡고 앉았다 일어나기', en: 'Sit-to-stand with a chair', zh: '扶椅起坐' },
    cue: { ko: '양손으로 짚고 천천히 일어났다 앉기를 반복합니다.', en: 'Hands on the seat, slowly stand up and sit back down.', zh: '双手撑住座面，缓慢起立后坐下，重复进行。' },
  },
  {
    key: 'WALL_PUSHUP',
    pictogram: 'wallPushup',
    name: { ko: '벽 짚고 팔굽혀펴기', en: 'Wall push-up', zh: '靠墙俯卧撑' },
    cue: { ko: '벽을 짚고 팔을 굽혔다 펴며 천천히 밉니다.', en: 'Hands on the wall, slowly bend and push with your arms.', zh: '双手扶墙，缓慢屈伸手臂推墙。' },
  },
  {
    key: 'SEATED_MARCH',
    pictogram: 'seatedMarch',
    name: { ko: '앉아서 제자리 걷기', en: 'Seated marching', zh: '坐姿原地踏步' },
    cue: { ko: '무릎을 한쪽씩 천천히 들어올립니다.', en: 'Slowly lift one knee at a time.', zh: '双膝交替缓慢抬起。' },
  },
  {
    key: 'SEATED_ANKLE_PUMP',
    pictogram: 'anklePump',
    name: { ko: '앉아서 발목 위아래로 움직이기', en: 'Seated ankle pumps', zh: '坐姿踝泵' },
    cue: { ko: '발끝을 천천히 위아래로 움직입니다.', en: 'Slowly pump your toes up and down.', zh: '脚尖缓慢上下活动。' },
  },
  {
    key: 'SEATED_ARM_RAISE',
    pictogram: 'armRaise',
    name: { ko: '앉아서 양팔 들어올리기', en: 'Seated arm raises', zh: '坐姿举臂' },
    cue: { ko: '양팔을 앞으로 천천히 들어올렸다 내립니다.', en: 'Slowly raise both arms forward, then lower.', zh: '双臂缓慢前举后放下。' },
  },
  {
    key: 'SEATED_KNEE_EXTENSION',
    pictogram: 'kneeExtension',
    name: { ko: '앉아서 무릎 펴기', en: 'Seated knee extension', zh: '坐姿伸膝' },
    cue: { ko: '한쪽 다리를 천천히 펴 들었다 내립니다. 양쪽 번갈아.', en: 'Slowly straighten one leg, then lower. Alternate.', zh: '一侧腿缓慢伸直抬起后放下，两侧交替。' },
  },
  {
    key: 'SHOULDER_ROLL',
    pictogram: 'shoulderRoll',
    name: { ko: '어깨 천천히 돌리기', en: 'Slow shoulder rolls', zh: '缓慢转肩' },
    cue: { ko: '양쪽 어깨를 천천히 크게 돌려줍니다.', en: 'Slowly roll both shoulders in a big circle.', zh: '双肩缓慢画大圈转动。' },
  },
  {
    key: 'NECK_TILT',
    pictogram: 'neckTilt',
    name: { ko: '목 좌우로 천천히 기울이기', en: 'Slow neck tilts', zh: '缓慢侧倾颈部' },
    cue: { ko: '고개를 좌우로 천천히 기울입니다.', en: 'Slowly tilt your head side to side.', zh: '头部缓慢左右倾斜。' },
  },
  {
    key: 'SEATED_TORSO_TWIST',
    pictogram: 'torsoTwist',
    name: { ko: '앉아서 상체 살짝 틀기', en: 'Seated torso twist', zh: '坐姿转体' },
    cue: { ko: '상체를 좌우로 살짝 천천히 돌려줍니다.', en: 'Slowly twist your upper body side to side.', zh: '上身缓慢左右轻转。' },
  },
];
