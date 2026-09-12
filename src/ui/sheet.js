// 아래에서 올라오는 시트.
//
// "버튼 안에 기능을 숨기고, 누르면 고를 것이 나온다"를 담는 그릇이다.
// 첫 화면에는 행동 하나만 두고 선택지는 누른 뒤에 보여 주면, 처음 여는 사람이
// 무엇부터 해야 하는지 헤매지 않는다.
//
// 화면을 통째로 바꾸지 않는 것이 핵심이다. 뒤가 비쳐 보이니까 "잠깐 고르는 중"
// 이라는 게 읽히고, 취소하면 원래 있던 자리로 돌아온다.
// 예전 모드 패널은 화면 안에서 펼쳐지면서 시작 버튼을 숨겼는데,
// **닫는 길이 아예 없어서** 한 번 열면 홈으로 되돌릴 수가 없었다.

import { ICON } from './icons.js';

let sheet = null;
let backdrop = null;
let body = null;
let titleEl = null;

let openEl = null; // 지금 시트에 들어와 있는 요소
let homeParent = null; // 그 요소가 원래 있던 자리
let homeNext = null;
let opener = null; // 시트를 연 버튼 (닫으면 여기로 초점을 돌려준다)

function build() {
  backdrop = document.createElement('div');
  backdrop.className = 'sheet-backdrop';
  backdrop.addEventListener('click', () => closeSheet());

  sheet = document.createElement('div');
  sheet.className = 'sheet';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  // 닫는 길을 셋으로 둔다 — 우상단 44px 버튼 · Esc · 배경 탭 · 아래로 끌기.
  // 손잡이만 두면 끌어내릴 수 있다는 걸 모르는 사람은 갇힌 것처럼 느낀다.
  sheet.innerHTML =
    '<div class="sheet-grab" aria-hidden="true"></div>' +
    '<div class="sheet-head">' +
    '<h2 class="sheet-title"></h2>' +
    '<button class="icb sheet-close" type="button" data-icon="close"></button>' +
    '</div>' +
    '<div class="sheet-body"></div>';
  titleEl = sheet.querySelector('.sheet-title');
  body = sheet.querySelector('.sheet-body');

  const closeBtn = sheet.querySelector('.sheet-close');
  closeBtn.setAttribute('aria-label', document.documentElement.lang === 'en' ? 'Close' : '닫기');
  closeBtn.addEventListener('click', () => closeSheet());
  if (ICON.close) closeBtn.innerHTML = ICON.close;

  const app = document.getElementById('app');
  app.appendChild(backdrop);
  app.appendChild(sheet);

  attachDrag();
}

// 아래로 끌어내려 닫기. 폰에서는 닫기 버튼을 찾는 것보다 이게 빠르다.
//
// 손잡이만 잡게 하면 못 찾은 사람이 갇힌 것처럼 느끼므로 시트 전체를
// 끌 수 있게 뒀는데, 그러면서 버튼을 누르다가 손가락이 살짝 떨리기만
// 해도 시트 전체가 손가락을 따라 밀려나 버튼을 놓치는 문제가 있었다
// (2026-09-12, "드래그하면 전체가 드래그된다" 피드백). 그래서 두 가지로
// 막는다 — 버튼 등 누르는 요소 위에서 시작한 터치는 애초에 끌기로
// 치지 않고, 그 밖의 자리에서 시작했더라도 아주 작게 흔들린 정도(6px
// 미만)는 아직 끌기로 옮기지 않는다.
const DRAG_ARM_PX = 6;
function attachDrag() {
  let startY = 0;
  let dy = 0;
  let dragging = false; // 끌기로 확정됐다(6px 넘게 움직였다)
  let tracking = false; // 손을 뗄 때까지 지켜보는 중(아직 확정 전)

  const grabArea = () => sheet;

  grabArea().addEventListener(
    'touchstart',
    (e) => {
      // 시트 안의 목록을 스크롤하는 중이면 끌기로 치지 않는다
      if (body.scrollTop > 0) return;
      // 버튼·링크·입력칸을 누르는 터치는 탭이지 끌기가 아니다 — 이걸 안 걸러서
      // 시트 전체가 버튼과 함께 밀려나며 탭이 씹혔다.
      if (e.target.closest('button, a, input, select, textarea')) return;
      tracking = true;
      dragging = false;
      startY = e.touches[0].clientY;
      dy = 0;
    },
    { passive: true }
  );

  grabArea().addEventListener(
    'touchmove',
    (e) => {
      if (!tracking) return;
      const raw = e.touches[0].clientY - startY;
      if (!dragging) {
        if (raw < DRAG_ARM_PX) return; // 아직 흔들림 수준 — 시트를 움직이지 않는다
        dragging = true;
        sheet.style.transition = 'none';
      }
      dy = Math.max(0, raw); // 위로는 안 끌린다
      sheet.style.transform = `translateY(${dy}px)`;
      backdrop.style.opacity = String(Math.max(0, 1 - dy / 320));
    },
    { passive: true }
  );

  grabArea().addEventListener('touchend', () => {
    tracking = false;
    if (!dragging) return;
    dragging = false;
    sheet.style.transition = '';
    sheet.style.transform = '';
    backdrop.style.opacity = '';
    // 100px 넘게 내렸으면 닫는다. 그보다 적으면 제자리로 돌아간다.
    if (dy > 100) closeSheet();
  });
}

function onKey(e) {
  if (e.key === 'Escape') closeSheet();
}

export function openSheet(el, { title = '', from = null } = {}) {
  if (!sheet) build();
  if (openEl === el) return;
  if (openEl) closeSheet();

  openEl = el;
  opener = from || document.activeElement;
  homeParent = el.parentNode;
  homeNext = el.nextSibling;

  titleEl.textContent = title;
  titleEl.hidden = !title;

  // 화면 안에 있던 요소를 시트로 옮긴다. DOM 이동은 이벤트 핸들러를 유지하므로
  // 이미 붙어 있는 동작이 그대로 따라온다 — 다시 연결하지 않아도 된다.
  el.hidden = false;
  el.style.display = '';
  body.appendChild(el);

  document.body.classList.add('sheet-open');
  document.addEventListener('keydown', onKey);

  // 시트도 히스토리에 한 칸을 쌓는다.
  // 안 쌓으면 앱을 열자마자 시트를 열고 뒤로가기를 눌렀을 때 되돌아갈 항목이
  // 없어서 앱이 그대로 종료된다 — 안드로이드에서 제일 흔한 이탈 경로다.
  history.pushState({ ...history.state, sheet: true }, '', location.hash);

  // 초점을 시트 안으로. 안 옮기면 키보드 사용자는 뒤쪽 화면을 계속 돌아다닌다.
  requestAnimationFrame(() => {
    sheet.classList.add('on');
    backdrop.classList.add('on');
    const first = el.querySelector('button, [href], input, select, textarea');
    (first || sheet).focus?.();
  });
}

// keepHistory: 뒤로가기로 닫히는 중이거나 화면이 넘어가는 중이라
// 히스토리는 부르는 쪽이 이미 정리한 경우. 여기서 또 건드리면 두 칸이 되돌아간다.
export function closeSheet({ keepHistory = false } = {}) {
  if (!openEl) return;
  const el = openEl;
  openEl = null;

  sheet.classList.remove('on');
  backdrop.classList.remove('on');
  document.body.classList.remove('sheet-open');
  document.removeEventListener('keydown', onKey);

  // 애니메이션이 끝난 뒤 원래 자리로 돌려놓는다. 바로 옮기면 사라지는 모습이 안 보인다.
  const restore = () => {
    if (homeParent) homeParent.insertBefore(el, homeNext);
    el.style.display = 'none';
    homeParent = null;
    homeNext = null;
  };
  setTimeout(restore, 240);

  // 열 때 쌓아 둔 칸을 도로 뺀다. 안 빼면 시트를 닫은 뒤 뒤로가기를 눌렀을 때
  // 아무 일도 안 일어나는 헛걸음이 한 번 생긴다.
  if (!keepHistory && history.state?.sheet) history.back();

  opener?.focus?.();
  opener = null;
}

export function isSheetOpen() {
  return !!openEl;
}
