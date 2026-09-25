import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname);
// 설정 화면 맨 아래에 찍히는 판 번호. package.json 한 곳에서만 정한다 —
// 코드에 손으로 적으면 배포마다 고쳐야 하고, 한 번 잊으면 거짓말을 시작한다.
const PKG_VERSION = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
// 판 표시에 같이 찍을 날짜. 판 번호(0.1.0)는 처음 만든 뒤로 한 번도 안
// 올렸고 앞으로도 올릴 일이 드물어서, 그것만으로는 "지금 보고 있는 게 언제
// 것이냐" 를 못 가린다 — 홈 화면에 설치한 앱이 옛 판에 묶여 있어도 번호는
// 같다. 날짜가 있으면 설정 화면 한 줄만 보고 판별할 수 있다.
//
// ⚠ new Date() 를 쓰면 안 된다. 산출물이 저장소에 커밋되고 워크플로가
// 'push 마다 다시 빌드해서 달라졌으면 되커밋' 하는 구조라(deploy.yml),
// 빌드할 때마다 바뀌는 값을 심으면 **고친 게 없어도 매번 산출물이 달라진다**
// — 되커밋이 끝없이 붙고, 자산 파일 해시가 매번 바뀌어 사용자가 468KB 를
// 다시 받는다. 그래서 커밋 시각을 쓴다. 같은 커밋을 다시 빌드하면 결과가
// 바이트까지 같다.
function commitTime() {
  try {
    // --date=format: 을 쓰지 않는다 — 그 서식 문자열에 공백이 있어서
    // 셸을 거치며 인자가 쪼개진다(윈도우에서 실제로 'unknown' 이 나왔다).
    // %cI 는 공백이 없는 ISO 형식이라 안전하고, 자르는 일은 여기서 한다.
    const iso = execSync('git log -1 --format=%cI', {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return iso.slice(0, 16).replace('T', ' ');
  } catch {
    // git 이 없는 곳(내려받은 압축본 등)에서도 빌드는 되어야 한다.
    return 'unknown';
  }
}
const BUILD_TIME = commitTime();

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(PKG_VERSION),
    __BUILD_TIME__: JSON.stringify(BUILD_TIME),
  },
  plugins: [
    // 서비스 워커를 빌드가 만든다.
    //
    // 손으로 쓰던 예전 sw.js 는 두 가지가 문제였다:
    //  1. 미디어 45개를 install 때 전부 프리캐시했다 — 첫 방문에 22.5MB 다운로드.
    //     3G 나 저가 요금제에서는 사실상 이탈이다.
    //  2. 캐시 이름('zip-v28')을 손으로 올려야 했다. 잊으면 cache-first 때문에
    //     사용자에게 영원히 구버전 미디어가 나간다. 그게 제일 디버깅하기 어렵다.
    //
    // 이제 앱 껍데기(HTML·CSS·JS·아이콘)만 미리 받고 — 파일 해시가 곧 버전이라
    // 잊을 수가 없다 — 미디어는 실제로 볼 때 받아서 캐시에 남긴다.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: false, // public/manifest.webmanifest 를 그대로 쓴다
      workbox: {
        // 담을 것을 **열거한다**. 산출물 폴더가 곧 저장소 루트라
        // '**/*.js' 로 잡으면 vite.config.js 같은 소스까지 프리캐시된다.
        // 실제로 그렇게 들어갔다 — 제외 목록을 늘리는 쪽은 새 파일이 생길
        // 때마다 또 새므로, 담을 것을 적는 쪽이 맞다.
        globPatterns: ['index.html', 'assets/**/*.{js,css}', 'icons/*.png', 'manifest.webmanifest'],
        // 4일 주기 웹푸시(2026-09-16) 의 push/notificationclick 처리.
        // generateSW 모드라 워크박스 코드를 직접 못 고치므로, sw.js 맨 위에서
        // 이 파일을 importScripts() 로 불러 붙인다 — public/sw-push.js 가
        // 빌드로 산출물 루트에 그대로 복사되어 있어야 한다.
        importScripts: ['sw-push.js'],
        globIgnores: [
          // 미디어는 프리캐시에서 뺀다. 이 한 줄이 첫 로드 22.5MB 를 없앴다.
          '**/media/**',
          // Supabase SDK(약 219KB)도 뺀다. 로그인은 선택 기능인데 프리캐시에
          // 남겨 두면 결국 모두가 받게 되어, 지연 로딩으로 만든 뜻이 사라진다.
          '**/supabase-*.js',
          // 산출물이 저장소 루트에 놓이므로 소스도 같은 폴더에 있다.
          // 걸러 내지 않으면 워크박스가 src/·scripts/·legacy/ 까지 프리캐시한다.
          'src/**',
          'scripts/**',
          'legacy/**',
          'app/**',
          'public/**',
          'node_modules/**',
        ],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // 운동 사진·영상. 한 번 본 것은 남겨 두어 다음엔 오프라인에서도 나온다.
            urlPattern: ({ url }) => url.pathname.includes('/media/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'qfit-media',
              // 비디오는 Range 요청으로 조각을 받는다. 이게 없으면 사파리에서
              // 캐시된 영상이 재생되지 않는 일이 생긴다.
              rangeRequests: true,
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 60 },
            },
          },
          {
            // 폰트. 없으면 오프라인에서 타이포가 통째로 달라진다.
            urlPattern: ({ url }) => url.origin === 'https://cdn.jsdelivr.net',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'qfit-font',
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  // 상대 경로로 뽑는다. GitHub Pages 가 저장소 이름이 붙은 하위 경로로 서빙하기 때문에
  // 절대 경로('/assets/...')로 뽑으면 배포본이 전부 404 가 된다.
  // 화면 이동이 해시(#records-screen)라 주소의 경로가 깊어지지 않는다 — 그래서
  // 상대 경로가 안전하다. 경로 라우팅으로 바꾸는 날 이게 먼저 깨진다.
  base: './',

  // 소스 index.html 은 app/ 에 둔다.
  //
  // 이 저장소의 Pages 는 'main 브랜치의 루트를 그대로 서빙' 으로 잡혀 있고 그 설정은
  // 저장소 관리자만 바꿀 수 있다(우리는 push 권한뿐이다). 그래서 배포하려면 빌드
  // 결과가 루트에 있어야 하는데, 소스 index.html 도 루트면 빌드가 자기 입력을
  // 덮어쓴다. 둘 중 하나는 비켜야 하고, 비킬 수 있는 쪽은 소스다.
  root: 'app',
  publicDir: path.join(ROOT, 'public'),

  server: {
    port: 5173,
    // src/ 는 Vite 루트(app/) 바깥에 있다. 같이 옮기면 스크립트 열두 개의 경로가
    // 따라 바뀌는데, 그 값에 비해 얻는 게 없다.
    fs: { allow: [ROOT] },
    // 챗봇 서버(server/chat.mjs, `npm run dev:chat`)로 넘긴다. 브라우저
    // 입장에서는 같은 출처의 /api/chat 이라 CORS 를 신경 쓸 필요가 없다.
    // 이 프록시는 개발 전용이다 — 배포본(Cloudflare Worker)엔 이 서버가
    // 없으므로 그대로 안 옮겨진다.
    proxy: {
      '/api': { target: `http://127.0.0.1:${process.env.CHAT_PORT || 8787}`, changeOrigin: true },
    },
  },

  build: {
    // 저장소 루트로 뽑는다. Pages 가 거기를 서빙한다.
    //
    // emptyOutDir 은 반드시 꺼 둔다 — 켜면 빌드가 src/·scripts/·legacy/ 를 통째로
    // 지운다. 지난 산출물은 `npm run build` 가 먼저 부르는 scripts/clean.mjs 가
    // 이름을 아는 것만 골라 지운다.
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Supabase 를 이름이 정해진 청크로 뽑는다. 해시 이름 그대로 두면
        // 프리캐시 제외 규칙을 쓸 수가 없다.
        manualChunks(id) {
          if (id.includes('@supabase')) return 'supabase';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
      },
    },
    // 미디어가 12MB 라 인라인 임계값을 낮게 둔다
    assetsInlineLimit: 4096,
  },
});
