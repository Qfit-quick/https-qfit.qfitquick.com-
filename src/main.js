// 진입점. CSS 를 순서대로 들이고 앱 본체를 띄운다.
//
// ⚠ CSS 순서를 바꾸지 말 것. 특이도가 같은 규칙끼리는 나중에 온 쪽이 이기므로,
// 순서가 바뀌면 어디가 어떻게 달라졌는지 알 수 없는 방식으로 화면이 틀어진다.
// 이 여섯 줄은 legacy/index.html 의 <style> 한 덩어리를 자른 것이고 순서가 곧 원본이다.
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/screens.css';
import './styles/game.css';
import './styles/result.css';
// 관문·계획·기록지의 스타일. 맨 뒤에 온다 — 위 일곱 장의 규칙을 덮어쓰는
// 곳이 있어서(카드 안쪽 여백 등) 순서가 바뀌면 그 자리부터 틀어진다.
import './styles/plan.css';

import './app.js';
import { t, showScreenById, startRoutine } from './app.js';
import { paintIcons } from './ui/icons.js';
import { initNav } from './ui/nav.js';
import { hideSplash } from './ui/splash.js';
import { initHeaders } from './ui/header.js';
import { initGate } from './ui/gate.js';
import { initPlan, renderPlanScreen } from './ui/plan.js';
import { initLog, renderLogScreen, renderTodayCard } from './ui/log.js';
import { initPrograms, renderProgramsScreen } from './ui/programs.js';
import { ICON } from './ui/icons.js';
import { STATIC_UI } from './data/i18n-strings.js';

// 계획과 기록지를 먼저 붙인다. 둘이 홈의 '오늘 두 칸' 카드와 계획 화면의
// 안쪽을 만들어 넣으므로, 아이콘 칠하기(paintIcons)와 머리 만들기보다
// 앞이어야 한다 — 나중에 붙이면 그 안의 data-icon 자리가 빈 채로 남는다.
initPlan({
  translate: t,
  STATIC_UI,
  onStartRoutine: startRoutine,
  onShowScreen: showScreenById,
});
initLog({ translate: t, STATIC_UI, onShowScreen: showScreenById });
// 프로그램의 '시작하기' 도 계획 화면과 같은 문(startRoutine)을 쓴다 —
// 둘 다 '동작을 미리 정해 두고 설정 화면으로 보낸다' 는 같은 일이다.
initPrograms({ translate: t, STATIC_UI, onStartDay: startRoutine });
renderProgramsScreen();

// data-icon 이 적힌 자리에 선 아이콘을 채운다
paintIcons();
// 하단 탭바와 뒤로가기. app.js 가 화면을 다 만든 뒤여야 한다.
initNav();
// 하위 화면의 머리(뒤로 + 제목). app.js 가 화면을 다 만든 뒤여야 한다.
initHeaders({ STATIC_UI, t, ICON });

// 하루 첫 설문과 오늘의 명언. 스플래시를 걷기 **전에** 세운다 —
// 뒤에 세우면 앱 화면이 한 번 보인 다음 관문이 덮어서, 관문이 앱을
// 가로막은 것처럼 보인다.
//
// 관문이 걷힌 뒤에 계획과 기록지를 한 번 다시 그린다. 위에서 붙일 때는
// 아직 오늘 설문 답이 없어서 '오늘 권장 강도' 가 기본값(보통)으로 그려지는데,
// 답을 마친 직후에 계획 탭에 들어가면 그 기본값을 보게 된다.
initGate({
  translate: t,
  STATIC_UI,
  onEnter: () => {
    try { renderPlanScreen(); } catch (e) { console.error('plan render after gate failed:', e); }
    try { renderTodayCard(); renderLogScreen(); } catch (e) { console.error('log render after gate failed:', e); }
  },
});

// 앱이 다 붙은 뒤에 스플래시를 걷는다
hideSplash();

// 서비스 워커 등록은 vite-plugin-pwa 가 넣는다(injectRegister: 'auto').
// 여기서 또 등록하면 두 벌이 서로를 덮어쓴다.
