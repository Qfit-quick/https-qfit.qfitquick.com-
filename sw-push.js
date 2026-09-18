// 웹푸시 수신 처리(2026-09-16, 4일 쉬면 알리는 기능).
//
// vite-plugin-pwa 가 만드는 sw.js 는 generateSW 모드라 워크박스 캐싱
// 코드를 직접 손댈 수 없다 — 대신 vite.config.js 의
// workbox.importScripts 로 이 파일을 sw.js 맨 위에서 importScripts() 해
// 붙인다. 그래서 이 파일은 캐싱과 완전히 무관하게, push/notificationclick
// 두 이벤트만 다룬다. public/ 에 두면 빌드가 그대로 산출물 루트에 복사한다
// (다른 정적 파일들과 같은 방식).

self.addEventListener('push', function (event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) {}
  var title = data.title || 'Q-fit';
  var body = data.body || '4일 쉬었습니다. 1분이면 다시 시작할 수 있어요.';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: body,
      icon: './icons/icon-192.png',
      tag: 'qfit-reminder', // 같은 태그는 덮어쓴다 — 알림이 쌓이지 않는다
    })
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(clients.openWindow('./'));
});
