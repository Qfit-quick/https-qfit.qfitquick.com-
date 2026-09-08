// 어느 자리에 사진을 쓰고 어느 자리에 영상을 쓰는지 지킨다.
//
// 규칙은 둘이다.
//   1. 동작을 알려 주는 자리는 전부 영상이다.
//      고르기 카드 · 미리보기 줄 · 동작 도감 · 일시정지. 정지된 사진 한 장은
//      '무엇을 하는 동작인지' 를 못 알려 준다 — 스쿼트 맨 아래 자세만 보면
//      그냥 앉아 있는 사람이다.
//   2. 운동하는 중에는 그 운동의 사진만 순서대로 순환한다.
//      팔굽혀펴기 세트에 다른 동작 사진이 한 장이라도 섞이면, 따라 하던
//      사람은 자기가 뭘 하는 중인지 놓친다.
//
// 두 규칙 다 사람이 지키기로 하면 언젠가 깨진다. 실제로 한 번 섞여 있었다.
// 그래서 파일 이름으로 기계가 본다 — 사진 파일은 자기 운동 이름으로 시작해야 한다.
//
// 브라우저가 필요 없다. CI 가 빌드 전에 돌린다.
import fs from 'node:fs';
import path from 'node:path';
import { EXERCISES } from '../src/data/exercises.js';
import { VIDEO_CLIPS } from '../src/data/video-clips.js';
import { PHOTO_SEQUENCES, photoCycle } from '../src/data/photo-sequences.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const PHOTO_DIR = path.join(ROOT, 'public', 'media', 'photos');
const CLIP_DIR = path.join(ROOT, 'public', 'media', 'clips');
const MODES = new Set(['pingpong', 'loop', 'hold']);

const fail = [];
const line = (s) => console.log(s);

line('--- 동작 설명 영상 ---');
for (const ex of EXERCISES) {
  const clip = VIDEO_CLIPS.find((c) => c.key === ex.key);
  if (!clip) {
    fail.push(`${ex.key}: 설명 영상이 없다. 고르기 카드와 미리보기 줄이 빈칸으로 나온다`);
    continue;
  }
  if (!fs.existsSync(path.join(CLIP_DIR, clip.file))) {
    fail.push(`${ex.key}: ${clip.file} 이 public/media/clips 에 없다`);
  }
}
line(`  운동 ${EXERCISES.length}종 · 영상 ${VIDEO_CLIPS.length}개`);

line('--- 운동 중 사진 ---');
for (const ex of EXERCISES) {
  const seq = PHOTO_SEQUENCES[ex.key];
  if (!seq) {
    fail.push(`${ex.key}: 사진 시퀀스가 없다. 운동 화면이 막대인간으로 떨어진다`);
    continue;
  }
  if (!MODES.has(seq.mode)) {
    fail.push(`${ex.key}: mode 가 '${seq.mode}' 다. ${[...MODES].join('·')} 중 하나여야 한다`);
  }
  if (seq.mode !== 'hold' && seq.frames.length < 2) {
    fail.push(`${ex.key}: 프레임이 ${seq.frames.length}장인데 mode 가 '${seq.mode}' 다. 움직이지 않는다면 'hold' 여야 한다`);
  }

  // 핵심. 사진 파일은 자기 운동 이름으로 시작해야 한다.
  const want = ex.key.toLowerCase() + '-';
  for (const f of seq.frames) {
    if (!f.startsWith(want)) {
      fail.push(`${ex.key}: ${f} 는 다른 동작의 사진이다. '${want}…' 이어야 한다`);
    }
    if (!fs.existsSync(path.join(PHOTO_DIR, f))) {
      fail.push(`${ex.key}: ${f} 가 public/media/photos 에 없다`);
    }
  }

  const cycle = photoCycle(ex.key);
  if (cycle.length === 0) fail.push(`${ex.key}: 순환 순서가 비었다`);
  const shown = cycle.map((f) => f.replace(/^.*-(\d+)\.webp$/, '$1')).join(',');
  line(`  ${ex.key.padEnd(11)} ${seq.mode.padEnd(9)} ${String(seq.frames.length).padStart(2)}장 → ${shown}`);
}

// 쓰지 않는 사진이 남아 있는지. 지우라는 뜻은 아니다 — 새 사진을 넣고
// 시퀀스에 연결하는 것을 잊었을 때가 이렇게 보인다.
if (fs.existsSync(PHOTO_DIR)) {
  const used = new Set(Object.values(PHOTO_SEQUENCES).flatMap((s) => s.frames));
  const idle = fs.readdirSync(PHOTO_DIR).filter((f) => f.endsWith('.webp') && !used.has(f));
  if (idle.length) line(`\n  (연결 안 된 사진 ${idle.length}장: ${idle.join(', ')})`);
}

line('');
if (fail.length) {
  console.error(`실패 ${fail.length}건`);
  fail.forEach((f) => console.error('  - ' + f));
  process.exit(1);
}
line('통과');
