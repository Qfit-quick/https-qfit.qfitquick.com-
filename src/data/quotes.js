// 오늘의 명언.
//
// 시작 관문(gate)이 설문 답을 받아 이 중 하나를 뽑는다. 무작위로 뽑지 않고
// **답에 맞는 결(tone)** 안에서 뽑는다 — 귀찮다고 답한 사람에게 "쉬는 것도
// 계획의 일부" 를 띄우면 앱이 게으름을 거들게 되고, 이미 지친 사람에게
// "지금 하지 않으면 언제 하겠는가" 를 띄우면 앱을 닫는다. 같은 문장이
// 상황에 따라 약이 되거나 독이 된다는 것이 이 기능의 전부다.
//
//   drive  — 귀찮음·미루기를 정면으로 잡는다 (설문에서 의욕이 낮게 나온 날)
//   gentle — 지쳐 있다. 문턱을 낮춘다 (기분이 나쁜데 의욕은 남아 있는 날)
//   steady — 컨디션이 괜찮다. 꾸준함 쪽으로 민다
//
// author 는 **확인된 출처만** 적는다. 인터넷에 흔히 도는 오귀속(誤歸屬)을
// 그대로 실으면 앱이 거짓말을 하는 것이라, 출처가 흐린 문장은 아예 뺐다.
// 앱이 직접 쓴 문장은 저자를 'Q-fit' 으로 둔다 — 없는 위인을 만들지 않는다.
// (예: '탁월함은 습관' 은 아리스토텔레스가 아니라 그를 풀어 쓴 윌 듀랜트다.)
export const QUOTES = [
  // ── drive · 미루는 마음을 잡는다 ────────────────────────────
  { id:'franklin-today', tone:'drive',
    text:{ko:'오늘 할 수 있는 일을 내일로 미루지 마라.', en:'Never leave that till tomorrow which you can do today.', zh:'今天能做的事，别留到明天。'},
    author:{ko:'벤저민 프랭클린', en:'Benjamin Franklin', zh:'本杰明·富兰克林'} },
  { id:'hillel-now', tone:'drive',
    text:{ko:'지금이 아니면, 언제 하겠는가?', en:'If not now, when?', zh:'此刻不做，何时做？'},
    author:{ko:'힐렐', en:'Hillel the Elder', zh:'希列尔'} },
  { id:'picasso-action', tone:'drive',
    text:{ko:'행동은 모든 성공의 첫 열쇠다.', en:'Action is the foundational key to all success.', zh:'行动是一切成功的第一把钥匙。'},
    author:{ko:'파블로 피카소', en:'Pablo Picasso', zh:'巴勃罗·毕加索'} },
  { id:'earhart-decide', tone:'drive',
    text:{ko:'가장 어려운 것은 하기로 결심하는 일이다. 나머지는 그저 끈기다.', en:'The most difficult thing is the decision to act. The rest is merely tenacity.', zh:'最难的是下决心去做，其余的只是坚持。'},
    author:{ko:'아멜리아 에어하트', en:'Amelia Earhart', zh:'阿梅莉亚·埃尔哈特'} },
  { id:'seneca-dare', tone:'drive',
    text:{ko:'어려워서 못 하는 것이 아니다. 하지 않으니 어려워지는 것이다.', en:'It is not because things are difficult that we do not dare; it is because we do not dare that they are difficult.', zh:'并非因为难而不敢做，而是因为不敢做才显得难。'},
    author:{ko:'세네카', en:'Seneca', zh:'塞内卡'} },
  { id:'ziglar-daily', tone:'drive',
    text:{ko:'동기는 오래가지 않는다. 그래서 매일 다시 채우라고 하는 것이다.', en:"Motivation doesn't last — that's why we recommend it daily.", zh:'动力不会持久，所以要每天补充。'},
    author:{ko:'지그 지글러', en:'Zig Ziglar', zh:'金克拉'} },
  { id:'edison-percent', tone:'drive',
    text:{ko:'천재는 1퍼센트의 영감과 99퍼센트의 노력이다.', en:'Genius is one percent inspiration and ninety-nine percent perspiration.', zh:'天才是百分之一的灵感加百分之九十九的汗水。'},
    author:{ko:'토머스 에디슨', en:'Thomas Edison', zh:'托马斯·爱迪生'} },
  { id:'durant-habit', tone:'drive',
    text:{ko:'우리는 반복하는 것으로 만들어진다. 그러므로 탁월함은 행동이 아니라 습관이다.', en:'We are what we repeatedly do. Excellence, then, is not an act but a habit.', zh:'我们由重复的行为塑造。所以卓越不是一次行动，而是习惯。'},
    author:{ko:'윌 듀랜트', en:'Will Durant', zh:'威尔·杜兰特'} },
  { id:'proverb-halfway', tone:'drive',
    text:{ko:'시작이 반이다.', en:'Starting is half the work.', zh:'开始就是成功的一半。'},
    author:{ko:'우리 속담', en:'Korean proverb', zh:'韩国谚语'} },
  { id:'qfit-oneminute', tone:'drive',
    text:{ko:'0분과 1분의 차이가, 이번 달 전체의 차이가 된다.', en:'The gap between zero minutes and one minute becomes the gap of a whole month.', zh:'零分钟与一分钟之差，就是一整个月之差。'},
    author:{ko:'Q-fit', en:'Q-fit', zh:'Q-fit'} },

  // ── steady · 꾸준함 쪽으로 민다 ─────────────────────────────
  { id:'laozi-step', tone:'steady',
    text:{ko:'천 리 길도 발밑에서 시작된다.', en:'A journey of a thousand miles begins beneath your feet.', zh:'千里之行，始于足下。'},
    author:{ko:'노자 · 도덕경', en:'Laozi, Tao Te Ching', zh:'老子《道德经》'} },
  { id:'lee-onekick', tone:'steady',
    text:{ko:'만 가지 발차기를 한 번씩 연습한 사람은 두렵지 않다. 한 가지 발차기를 만 번 연습한 사람이 두렵다.', en:'I fear not the man who practiced 10,000 kicks once, but the man who practiced one kick 10,000 times.', zh:'我不怕练过一万种踢法各一次的人，只怕把一种踢法练了一万次的人。'},
    author:{ko:'이소룡', en:'Bruce Lee', zh:'李小龙'} },
  { id:'ali-suffer', tone:'steady',
    text:{ko:'지금 고통을 견디고, 남은 삶을 챔피언으로 살아라.', en:'Suffer now and live the rest of your life as a champion.', zh:'现在受苦，余生做冠军。'},
    author:{ko:'무하마드 알리', en:'Muhammad Ali', zh:'穆罕默德·阿里'} },
  { id:'jordan-missed', tone:'steady',
    text:{ko:'나는 9천 번 넘게 슛을 놓쳤다. 그래서 성공했다.', en:"I've missed more than 9,000 shots in my career. That's why I succeeded.", zh:'我投失过九千多次球，所以我成功了。'},
    author:{ko:'마이클 조던', en:'Michael Jordan', zh:'迈克尔·乔丹'} },
  { id:'proverb-thousandli', tone:'steady',
    text:{ko:'천 리 길도 한 걸음부터.', en:'Even a thousand-mile road starts with one step.', zh:'千里之路，始于一步。'},
    author:{ko:'우리 속담', en:'Korean proverb', zh:'韩国谚语'} },
  { id:'qfit-yesterday', tone:'steady',
    text:{ko:'어제의 나를 이기는 것이 가장 확실한 승리다.', en:'Beating yesterday is the only win that always counts.', zh:'胜过昨天的自己，是最可靠的胜利。'},
    author:{ko:'Q-fit', en:'Q-fit', zh:'Q-fit'} },
  { id:'qfit-streak', tone:'steady',
    text:{ko:'연속은 의지로 만드는 게 아니라, 문턱을 낮춰서 만드는 것이다.', en:'Streaks are built by lowering the bar, not by raising your willpower.', zh:'连续不是靠意志，而是靠把门槛放低。'},
    author:{ko:'Q-fit', en:'Q-fit', zh:'Q-fit'} },

  // ── gentle · 지친 날. 문턱을 낮춘다 ─────────────────────────
  { id:'ashe-where', tone:'gentle',
    text:{ko:'지금 있는 자리에서 시작하라. 가진 것을 쓰고, 할 수 있는 것을 하라.', en:'Start where you are. Use what you have. Do what you can.', zh:'从你所在的地方开始，用你拥有的，做你能做的。'},
    author:{ko:'아서 애시', en:'Arthur Ashe', zh:'阿瑟·阿什'} },
  { id:'voltaire-perfect', tone:'gentle',
    text:{ko:'완벽은 좋음의 적이다.', en:'The perfect is the enemy of the good.', zh:'完美是良好的敌人。'},
    author:{ko:'볼테르', en:'Voltaire', zh:'伏尔泰'} },
  { id:'wooden-cannot', tone:'gentle',
    text:{ko:'할 수 없는 일이 할 수 있는 일을 막게 두지 마라.', en:'Do not let what you cannot do interfere with what you can do.', zh:'别让做不到的事，妨碍你能做到的事。'},
    author:{ko:'존 우든', en:'John Wooden', zh:'约翰·伍登'} },
  { id:'proverb-rome', tone:'gentle',
    text:{ko:'로마는 하루아침에 이루어지지 않았다.', en:'Rome was not built in a day.', zh:'罗马不是一天建成的。'},
    author:{ko:'서양 속담', en:'Proverb', zh:'西方谚语'} },
  { id:'qfit-oneminuteok', tone:'gentle',
    text:{ko:'오늘은 1분만 해도 된다. 그것도 안 한 날보다 낫다.', en:'One minute is enough today. It still beats a day of none.', zh:'今天做一分钟就够了，也胜过一分钟都没做。'},
    author:{ko:'Q-fit', en:'Q-fit', zh:'Q-fit'} },
  { id:'qfit-rest', tone:'gentle',
    text:{ko:'쉬는 것도 계획의 일부다. 다만 쉬는 날을 정해 두고 쉬어라.', en:'Rest is part of the plan — just decide the rest day in advance.', zh:'休息也是计划的一部分，只要事先定好休息日。'},
    author:{ko:'Q-fit', en:'Q-fit', zh:'Q-fit'} },
];

/** tone 별로 갈라 둔 목록. 뽑을 때마다 filter 하지 않는다. */
export const QUOTES_BY_TONE = QUOTES.reduce((acc, q) => {
  (acc[q.tone] = acc[q.tone] || []).push(q);
  return acc;
}, {});
