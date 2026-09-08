// 동작 국면(src/data/exercise-phases.js)이 실제 클립과 맞는지 본다.
//
// 이 자료의 실패 방식이 고약하다: t1 이 클립 길이를 넘으면 그 국면은 그냥
// **아무것도 안 보이는 검은 화면**이 되고, 오류는 하나도 안 난다. 국면 순서가
// 뒤집혀 있어도 조용히 엉뚱한 구간이 돈다. 둘 다 화면을 하나하나 눌러 봐야
// 알게 되는 종류라, 열두 동작 쉰다섯 국면을 손으로 볼 수는 없다.
//
// 그래서 세 가지를 센다:
//   1. 클립이 실제로 있는가 (EXERCISES · VIDEO_CLIPS 와 이어지는가)
//   2. t0 < t1 이고, t1 이 클립 길이 안에 드는가
//   3. 국면이 시간 순서대로인가 (겹치는 것은 허용 — 플랭크처럼 같은
//      장면을 여러 점검 지점으로 나눈 경우가 있다)
//
// SHEET=1 로 돌리면 국면마다 시작 프레임을 뽑아 한 장으로 붙인다.
// 숫자를 새로 잴 때 쓰는 길이다 — 클립을 갈아 끼웠으면 반드시 다시 본다.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { EXERCISE_PHASES } from '../src/data/exercise-phases.js';
import { VIDEO_CLIPS } from '../src/data/video-clips.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const CLIPS = path.join(ROOT, 'public', 'media', 'clips');
const OUT = path.join(ROOT, 'screenshots', 'phases');
const LANGS = ['ko', 'en', 'zh'];

// ffmpeg 은 개발 의존성이다. 없으면 길이 검사만 건너뛰고 나머지는 다 본다 —
// 여기서 통째로 멈추면 CI 에서 이 검사가 사라진 것과 같다.
let ffmpeg = null;
try {
  ffmpeg = (await import('ffmpeg-static')).default;
} catch {
  console.log('ffmpeg-static 없음 — 클립 길이 검사는 건너뛴다');
}

function durationOf(file) {
  if (!ffmpeg) return null;
  try {
    const out = execFileSync(ffmpeg, ['-nostdin', '-i', path.join(CLIPS, file)], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return parseDuration(out);
  } catch (e) {
    // -i 만 주면 ffmpeg 은 "출력이 없다"며 1 로 끝난다. 정보는 stderr 에 다 있다.
    return parseDuration(String(e.stderr || ''));
  }
}
function parseDuration(text) {
  const m = /Duration:\s*(\d+):(\d+):([\d.]+)/.exec(text);
  if (!m) return null;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

let bad = 0;
let phaseCount = 0;
const rows = [];

for (const [key, phases] of Object.entries(EXERCISE_PHASES)) {
  const clip = VIDEO_CLIPS.find((c) => c.key === key);
  if (!clip) {
    console.log(`  ✗ ${key} — VIDEO_CLIPS 에 이 key 가 없다`);
    bad++;
    continue;
  }
  const file = path.join(CLIPS, clip.file);
  if (!fs.existsSync(file)) {
    console.log(`  ✗ ${key} — ${clip.file} 이 public/media/clips 에 없다`);
    bad++;
    continue;
  }
  const dur = durationOf(clip.file);
  let prevStart = -Infinity;

  phases.forEach((p, i) => {
    phaseCount++;
    const at = `${key} #${i + 1}`;
    if (!(p.t1 > p.t0)) {
      console.log(`  ✗ ${at} — t0(${p.t0}) 가 t1(${p.t1}) 보다 앞서지 않는다`);
      bad++;
    }
    if (dur != null && p.t1 > dur) {
      console.log(`  ✗ ${at} — t1 ${p.t1}s 가 클립 길이 ${dur.toFixed(2)}s 를 넘는다 (검은 화면이 된다)`);
      bad++;
    }
    if (p.t0 < prevStart) {
      console.log(`  ✗ ${at} — 앞 국면보다 이른 시각에서 시작한다 (순서가 뒤집혔다)`);
      bad++;
    }
    prevStart = p.t0;
    // 0.25 초보다 짧으면 0.55 배속으로 틀어도 반 초가 안 된다 — 못 본다.
    if (p.t1 - p.t0 < 0.25) {
      console.log(`  ✗ ${at} — 구간이 ${(p.t1 - p.t0).toFixed(2)}s 뿐이라 눈으로 못 좇는다`);
      bad++;
    }
    for (const f of ['name', 'form', 'breath']) {
      const miss = LANGS.filter((l) => !p[f] || !String(p[f][l] || '').trim());
      if (miss.length) {
        console.log(`  ✗ ${at} — ${f} 에 ${miss.join(',')} 가 없다`);
        bad++;
      }
    }
  });

  rows.push({ key, file: clip.file, n: phases.length, dur });
}

// 국면이 없는 동작. 오류는 아니다 — 다만 어느 것이 남았는지는 보여야 한다.
const missing = VIDEO_CLIPS.filter((c) => !EXERCISE_PHASES[c.key]).map((c) => c.key);

console.log('\n동작 국면');
rows.forEach((r) =>
  console.log(`  ${r.key.padEnd(12)} ${String(r.n).padStart(2)}국면  ${r.file}  ${r.dur ? r.dur.toFixed(2) + 's' : '?'}`)
);
if (missing.length) console.log(`\n아직 국면이 없는 동작 ${missing.length}개: ${missing.join(' ')}`);

// ── 눈으로 볼 판 ────────────────────────────────────────
if (process.env.SHEET && ffmpeg) {
  fs.mkdirSync(OUT, { recursive: true });
  for (const [key, phases] of Object.entries(EXERCISE_PHASES)) {
    const clip = VIDEO_CLIPS.find((c) => c.key === key);
    if (!clip) continue;
    phases.forEach((p, i) => {
      const out = path.join(OUT, `${key}-${i + 1}.png`);
      try {
        execFileSync(ffmpeg, [
          '-nostdin', '-y', '-ss', String(p.t0 + 0.02), '-i', path.join(CLIPS, clip.file),
          '-frames:v', '1', '-vf', 'scale=200:-1', out,
        ], { stdio: 'ignore' });
      } catch (e) {
        console.log(`  ! ${key} #${i + 1} 프레임 추출 실패`);
      }
    });
  }
  console.log(`\n국면 시작 프레임을 ${path.relative(ROOT, OUT)} 에 뽑았다`);
}

console.log(`\n동작 ${rows.length}개 · 국면 ${phaseCount}개 · 잘못된 곳 ${bad}개`);
if (bad) process.exit(1);
console.log('통과');
