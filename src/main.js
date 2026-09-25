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
// 큐피드 하트 슈팅 미니게임(2026-09-12). 이 화면은 다른 화면과 겹치지 않는
// 자기만의 색·레이아웃을 쓰므로 순서가 앞뒤 어디에 와도 상관없다.
import './styles/heartgame.css';
// 챌린지 트래커(2026-09-13). 마찬가지로 자기만의 색을 쓴다.
import './styles/challengeTracker.css';

import './app.js';
import { t, showScreenById, startRoutine } from './app.js';
import { paintIcons } from './ui/icons.js';
import { initNav } from './ui/nav.js';
import { hideSplash } from './ui/splash.js';
import { initHeaders } from './ui/header.js';
import { initGate } from './ui/gate.js';
import { initPlan, renderPlanScreen } from './ui/plan.js';
import { initLog, renderLogScreen, renderTodayCard } from './ui/log.js';
import { initPrograms, renderProgramsScreen, quickStartCircuit } from './ui/programs.js';
import { initAmrap, startAmrap } from './ui/amrap.js';
import { initCircuit, startCircuit } from './ui/circuit.js';
import { initQuickStart } from './ui/quickStart.js';
import { initTabata } from './ui/tabata.js';
import { initHeartGame } from './ui/heartgame.js';
import { initChallengeTracker } from './ui/challengeTracker.js';
import { initChatbot } from './ui/chatbot.js';
import { initBilling } from './ui/billing.js';
import { ICON } from './ui/icons.js';
import { STATIC_UI } from './data/i18n-strings.js';
import { initUpdate } from './pwa/update.js';
import { Sound } from './audio/sound.js';

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
// 다만 Cindy(amrap)·QCE(circuit) 처럼 고정 서킷인 프로그램은 그 문으로
// 못 들어간다 — startAmrap/startCircuit 이 따로 맡는다.
initAmrap({ translate: t, STATIC_UI, onShowScreen: showScreenById });
initCircuit({ translate: t, STATIC_UI, onShowScreen: showScreenById });
// 홈의 '10초 후 시작'(2026-09-23, 대규모 교체) — 예전 AI 질문 2개 흐름을
// 대신한다. 위 둘과 같은 이유로 여기서 붙인다 — app.js 는 이 화면을 모른다.
initQuickStart({ translate: t, STATIC_UI, onShowScreen: showScreenById });
// 타바타 타이머(2026-09-24 되살림) — 위와 같은 이유.
initTabata({ translate: t, STATIC_UI, onShowScreen: showScreenById });
initPrograms({ translate: t, STATIC_UI, onStartDay: startRoutine, onStartAmrap: startAmrap, onStartCircuit: startCircuit, onShowScreen: showScreenById });
renderProgramsScreen();

// 홈 '1분 시작' 시트의 QCE 서킷 줄(2026-09-21) — 직접선택·랜덤선택과 같은
// 자리에 있지만 저 둘과 달리 app.js 가 아니라 여기서 붙인다. app.js 는
// startCircuit/PROGRAMS 를 모르고(고정 서킷은 startRoutine 문으로 못
// 들어간다, 위 주석 참고), 이 조립부에만 둘 다 있다.
document.getElementById('mode-qce-btn')?.addEventListener('click', () => {
  Sound.unlock();
  quickStartCircuit('qce1');
});
initHeartGame({ translate: t, STATIC_UI });
initChallengeTracker({ translate: t, STATIC_UI });
initChatbot({ translate: t, STATIC_UI, onShowScreen: showScreenById });

// data-icon 이 적힌 자리에 선 아이콘을 채운다
paintIcons();
// 하단 탭바와 뒤로가기. app.js 가 화면을 다 만든 뒤여야 한다.
initNav({ translate: t, STATIC_UI });
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
//
// 다만 '등록' 과 '갱신' 은 다른 일이다. 등록만으로는 홈 화면에 설치한 앱이
// 옛 판에 묶인 채 몇 주가 간다 — 그 사정은 pwa/update.js 맨 위에 적어 두었다.
initUpdate();

initBilling({ translate: t, STATIC_UI });
