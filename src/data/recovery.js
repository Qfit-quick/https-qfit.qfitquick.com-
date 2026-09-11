// 회복 화면 내용.
//
// 마크업에 박혀 있던 385줄을 데이터로 옮긴 것이다. 화면은 이걸 읽어 그린다.
// 언어를 하나 더 붙이는 일이 열 하나 채우는 일이 되고, 빠뜨린 자리는
// npm run i18n 이 세어 준다 — 마크업에 흩어져 있으면 둘 다 안 된다.
//
// <b> 는 그대로 둔다. 강조가 붙은 자리가 곧 요점이라 번역본도 같은 자리를
// 강조해야 하고, 렌더는 innerHTML 로 넣는다.

export const RECOVERY_CARDS = [
 { tag:{ko:'영양', en:'Food', zh:'营养'}, title:{ko:'운동 직후 영양 섭취', en:'Eat right after training', zh:'训练后的营养补充'},
  items:[
   {ko:'운동 종료 후 <b>30~60분</b> 이내가 회복의 골든타임', en:'The <b>30–60 minutes</b> after you finish is the recovery window', zh:'结束后 <b>30~60分钟</b> 是恢复的黄金时间'},
   {ko:'탄수화물 + 단백질 조합 추천 (예: 바나나+삶은 계란, 그릭요거트, 닭가슴살+과일)', en:'Pair carbs with protein (banana + boiled egg, Greek yogurt, chicken + fruit)', zh:'碳水搭配蛋白质（香蕉+水煮蛋、希腊酸奶、鸡胸肉+水果）'},
   {ko:'공복 상태가 길었다면 가벼운 간식이라도 챙기기', en:'If you trained on an empty stomach, at least have a light snack', zh:'如果空腹时间较长，至少吃点轻食'},
  ] },
 { tag:{ko:'스트레칭', en:'Stretch', zh:'拉伸'}, title:{ko:'스트레칭 & 마사지', en:'Stretching & massage', zh:'拉伸与按摩'},
  items:[
   {ko:'운동 직후 <b>5~10분</b> 가볍게 정적 스트레칭 (허벅지·종아리·둔근 위주)', en:'<b>5–10 minutes</b> of easy static stretching right after (thighs, calves, glutes)', zh:'训练后 <b>5~10分钟</b> 轻度静态拉伸（大腿、小腿、臀部为主）'},
   {ko:'폼롤러나 마사지볼로 뭉친 부위를 <b>천천히</b> 눌러가며 풀어주기', en:'Roll out tight spots <b>slowly</b> with a foam roller or massage ball', zh:'用泡沫轴或按摩球 <b>慢慢</b> 按压紧张的部位'},
   {ko:'급하게 늘리지 말고 숨을 내쉬며 <b>통증 없는</b> 선까지만', en:'Don\'t yank — breathe out and go only to the point of <b>no pain</b>', zh:'不要急着拉，边呼气边做，只到 <b>不痛</b> 为止'},
  ] },
 { tag:{ko:'수분', en:'Water', zh:'水分'}, title:{ko:'수분 보충', en:'Rehydrate', zh:'补充水分'},
  items:[
   {ko:'운동 중 흘린 땀만큼 <b>수분을 충분히</b> 보충하기', en:'Replace <b>as much fluid</b> as you sweated out', zh:'流了多少汗就 <b>补多少水</b>'},
   {ko:'땀을 많이 흘렸다면 물보다 <b>이온음료</b>를 권장해요 — 당분과 나트륨이 들어있어서 땀으로 빠져나간 전해질을 더 효과적으로 채워줘요', en:'If you sweated a lot, a <b>sports drink</b> beats plain water — the sugar and sodium replace the electrolytes you lost more effectively', zh:'出汗多时，<b>运动饮料</b> 比白水更合适 — 其中的糖分和钠能更有效地补回随汗流失的电解质'},
  ] },
 { tag:{ko:'찜질', en:'Ice/heat', zh:'冷热'}, title:{ko:'냉·온 찜질', en:'Ice & heat', zh:'冷敷与热敷'},
  items:[
   {ko:'운동 직후 붓거나 욱신거리면 <b>냉찜질</b> 15~20분', en:'Swelling or throbbing right after? <b>Ice</b> for 15–20 minutes', zh:'训练后肿胀或抽痛，<b>冷敷</b> 15~20分钟'},
   {ko:'다음날 뻐근함(근육통)에는 <b>온찜질</b>이나 미온수 샤워가 도움', en:'Next-day soreness responds better to <b>heat</b> or a warm shower', zh:'第二天的酸痛用 <b>热敷</b> 或温水淋浴更有效'},
  ] },
 { tag:{ko:'휴식', en:'Rest', zh:'休息'}, title:{ko:'수면 & 휴식일', en:'Sleep & rest days', zh:'睡眠与休息日'},
  items:[
   {ko:'근육은 운동할 때가 아니라 <b>잘 때</b> 회복됩니다 — 하루 7~8시간 수면 목표', en:'Muscle rebuilds while you <b>sleep</b>, not while you train — aim for 7–8 hours', zh:'肌肉是在 <b>睡觉时</b> 恢复的，不是训练时 — 目标每天7~8小时'},
   {ko:'같은 부위를 매일 강하게 자극하기보다 하루 정도 <b>휴식일</b>을 끼워넣기', en:'Rather than hitting the same area hard every day, slot in a <b>rest day</b>', zh:'与其每天都练同一部位，不如安排一个 <b>休息日</b>'},
  ] },
];

// id 는 부위별 부상 대처법을 다른 데이터(운동 회피 목록 등)와 연결하는
// 키다. part 는 언어별 표시용 문구라 그대로는 키로 못 쓴다.
export const INJURY_GUIDES = [
 { id:'neck', part:{ko:'목', en:'Neck', zh:'颈部'},
  groups:[
   { h:{ko:'흔한 원인', en:'Common causes', zh:'常见原因'}, items:[
    {ko:'크런치·레그레이즈할 때 손으로 머리를 억지로 당기며 목에 힘을 줌', en:'Yanking your head with your hands during crunches or leg raises', zh:'做卷腹、举腿时用手硬拉头部，颈部发力'},
    {ko:'플랭크·버피 자세에서 고개를 과도하게 들거나 떨어뜨림', en:'Craning your head up or letting it drop in a plank or burpee', zh:'平板支撑、波比跳时过度抬头或低头'},
    {ko:'제자리 달리기·점프스쿼트 중 착지 충격이 목까지 전달됨', en:'Landing impact from running in place or jump squats travelling up to the neck', zh:'原地跑、跳跃深蹲时落地冲击传到颈部'},
   ] },
   { h:{ko:'증상', en:'Symptoms', zh:'症状'}, items:[
    {ko:'목을 돌리거나 숙일 때 뻐근함, 당기는 느낌', en:'Stiffness or pulling when you turn or bend your neck', zh:'转头或低头时僵硬、有牵拉感'},
    {ko:'한쪽으로만 뻣뻣하거나 어깨까지 저림이 이어지는 경우', en:'Stiff on one side only, or tingling running down to the shoulder', zh:'只有一侧僵硬，或麻感延伸到肩部'},
   ] },
   { h:{ko:'즉시 대처', en:'What to do right away', zh:'立即处理'}, items:[
    {ko:'운동을 멈추고 목에 힘이 들어가지 않는 편한 자세로 휴식', en:'Stop and rest in a position where your neck isn\'t working', zh:'停止训练，用颈部不发力的舒适姿势休息'},
    {ko:'급성 통증이면 15~20분 냉찜질 (얼음은 수건에 싸서)', en:'For sharp pain, ice for 15–20 minutes (wrap the ice in a towel)', zh:'急性疼痛时冷敷15~20分钟（冰袋用毛巾包好）'},
    {ko:'목을 억지로 꺾거나 스트레칭으로 늘리려 하지 않기', en:'Don\'t crank or force-stretch the neck', zh:'不要硬掰或强行拉伸颈部'},
   ] },
   { h:{ko:'회복 관리', en:'Recovery', zh:'恢复与调整'}, items:[
    {ko:'통증이 가라앉으면 아주 천천히 좌우·상하로 작은 원을 그리듯 목을 움직여봅니다', en:'Once pain eases, slowly move your neck again with small circles side to side and up and down', zh:'疼痛缓解后，慢慢左右、上下画小圈活动脖子'},
    {ko:'크런치·레그레이즈할 때는 손으로 머리를 당기지 말고 손은 관자놀이 옆에 가볍게만 대기', en:'In crunches and leg raises, rest your hands lightly by your temples instead of pulling', zh:'做卷腹、举腿时手轻放在太阳穴旁，不要拉头'},
    {ko:'2~3일은 목에 부담 가는 복근 운동(크런치, 레그레이즈) 강도를 낮추거나 쉬기', en:'Ease off or skip neck-loading ab work (crunches, leg raises) for 2–3 days', zh:'2~3天内减轻或暂停加重颈部负担的腹部动作（卷腹、举腿）'},
   ] },
  ],
  warn:{ko:'병원 방문 신호: 팔로 저림·마비가 이어지거나, 두통이 심하거나, 3~4일이 지나도 호전이 없으면 정형외과·재활의학과 진료를 받아보십시오.', en:'See a doctor if: tingling or numbness runs into your arm, headaches are severe, or there\'s no improvement after 3–4 days.', zh:'就医信号：麻木或无力延伸到手臂、头痛严重，或3~4天仍无好转，请就诊骨科或康复科。'},
 },
 { id:'shoulder', part:{ko:'어깨', en:'Shoulder', zh:'肩部'},
  groups:[
   { h:{ko:'흔한 원인', en:'Common causes', zh:'常见原因'}, items:[
    {ko:'푸쉬업·파이크푸쉬업·플랭크에서 어깨가 으쓱 올라가거나 팔꿈치가 과도하게 벌어짐', en:'Shoulders shrugging up or elbows flaring wide in push-ups, pike push-ups or planks', zh:'俯卧撑、派克撑、平板支撑时耸肩或肘部过度外展'},
    {ko:'버피의 점프·플랭크 전환 구간에서 어깨로 착지 충격을 그대로 받음', en:'Taking the landing impact through the shoulders in the burpee transition', zh:'波比跳的跳跃与撑地转换时，冲击直接由肩部承受'},
    {ko:'배밀기에서 어깨보다 손목이 앞서 나가며 어깨 관절에 무리', en:'Wrists getting ahead of the shoulders in the army crawl, straining the joint', zh:'匍匐前进时手腕超过肩膀，肩关节受力过大'},
   ] },
   { h:{ko:'증상', en:'Symptoms', zh:'症状'}, items:[
    {ko:'팔을 들어 올릴 때 통증, 특정 각도에서만 걸리는 느낌', en:'Pain when raising the arm, catching at one particular angle', zh:'抬臂时疼痛，某个角度会卡住'},
    {ko:'어깨 앞쪽 또는 옆쪽이 욱신거림', en:'Throbbing at the front or side of the shoulder', zh:'肩前侧或外侧抽痛'},
   ] },
   { h:{ko:'즉시 대처', en:'What to do right away', zh:'立即处理'}, items:[
    {ko:'즉시 해당 세트 중단, 팔을 몸통에 붙인 편한 자세로 휴식', en:'Stop the set and rest with the arm tucked against your body', zh:'立即停止该组，手臂贴身休息'},
    {ko:'냉찜질 15~20분, 하루 2~3회', en:'Ice 15–20 minutes, 2–3 times a day', zh:'冷敷15~20分钟，每天2~3次'},
    {ko:'통증 있는 방향으로 팔 들어올리는 동작(특히 푸쉬업류) 며칠간 피하기', en:'Avoid raising the arm into the painful direction (especially push-up variants) for a few days', zh:'几天内避免朝疼痛方向抬臂的动作（尤其俯卧撑类）'},
   ] },
   { h:{ko:'회복 관리', en:'Recovery', zh:'恢复与调整'}, items:[
    {ko:'통증 없는 범위 내에서 어깨를 으쓱하거나 돌리는 등 가볍게 움직여 뻣뻣함을 막습니다', en:'Keep it from stiffening with light shrugs and circles, staying pain-free', zh:'在不痛的范围内做耸肩、绕肩等轻度活动，防止僵硬'},
    {ko:'복귀 시 무릎 대고 하는 푸쉬업처럼 강도를 낮춘 버전부터 시작', en:'Come back through easier versions first, like knee push-ups', zh:'复出时先从跪姿俯卧撑等低强度版本开始'},
    {ko:'팔꿈치를 몸통에서 45도 정도로 유지하며 어깨가 으쓱 올라가지 않게 신경쓰기', en:'Keep elbows about 45° from the body and don\'t let the shoulders shrug', zh:'肘部与身体约呈45度，注意不要耸肩'},
   ] },
  ],
  warn:{ko:'병원 방문 신호: 팔을 옆으로 들어 올리기 힘들 정도의 힘 빠짐, 밤에 통증으로 잠을 깨는 경우, 1주 이상 통증이 지속되면 정형외과 진료가 필요합니다.', en:'See a doctor if: you can barely lift the arm sideways, pain wakes you at night, or it lasts over a week.', zh:'就医信号：手臂难以侧举、夜间被痛醒，或疼痛持续一周以上，需就诊骨科。'},
 },
 { id:'elbow', part:{ko:'팔꿈치', en:'Elbow', zh:'肘部'},
  groups:[
   { h:{ko:'흔한 원인', en:'Common causes', zh:'常见原因'}, items:[
    {ko:'푸쉬업·파이크푸쉬업에서 팔꿈치를 완전히 편 상태로 \'탁\' 잠그듯 반복', en:'Snapping the elbows into a full lock at the top of push-ups or pike push-ups', zh:'俯卧撑、派克撑时反复把肘部“咔”地完全锁死'},
    {ko:'배밀기에서 팔꿈치 각도가 너무 좁거나 넓게 반복 사용됨', en:'Repeating the army crawl with elbows too narrow or too wide', zh:'匍匐前进时肘部角度过窄或过宽地反复使用'},
    {ko:'손목·어깨 정렬이 무너져 팔꿈치가 그 부담을 대신 떠안음', en:'Wrist or shoulder alignment breaking down so the elbow takes the load', zh:'手腕、肩膀排列失衡，负担转移到肘部'},
   ] },
   { h:{ko:'증상', en:'Symptoms', zh:'症状'}, items:[
    {ko:'팔꿈치 바깥쪽 또는 안쪽이 누르면 아픔 (테니스·골프 엘보와 비슷한 양상)', en:'Tender to press on the outside or inside of the elbow (like tennis or golfer\'s elbow)', zh:'按压肘部外侧或内侧疼痛（类似网球肘、高尔夫球肘）'},
    {ko:'물건을 쥐거나 팔을 펼 때 시큰거림', en:'Aching when gripping something or straightening the arm', zh:'抓握物品或伸直手臂时酸痛'},
   ] },
   { h:{ko:'즉시 대처', en:'What to do right away', zh:'立即处理'}, items:[
    {ko:'푸쉬업 계열 동작 즉시 중단', en:'Stop all push-up variants right away', zh:'立即停止俯卧撑类动作'},
    {ko:'냉찜질 15분씩, 하루 2~3회', en:'Ice 15 minutes at a time, 2–3 times a day', zh:'每次冷敷15分钟，每天2~3次'},
    {ko:'손목을 젖히거나 무거운 것을 쥐는 동작 최소화', en:'Minimise bending the wrist back or gripping heavy things', zh:'尽量减少手腕后翻或抓握重物的动作'},
   ] },
   { h:{ko:'회복 관리', en:'Recovery', zh:'恢复与调整'}, items:[
    {ko:'통증이 줄어들 때까지 며칠은 무릎 대고 하는 푸쉬업 등 저강도로 대체', en:'Swap in low-intensity options like knee push-ups until it settles', zh:'疼痛减轻前，用跪姿俯卧撑等低强度动作替代几天'},
    {ko:'팔꿈치를 완전히 펴서 잠그지 말고 살짝 여유를 남기는 느낌으로 동작', en:'Don\'t lock out — leave a little bend at the top', zh:'不要把肘部完全伸直锁死，留一点余量'},
    {ko:'손목·전완 스트레칭(손등 아래로 눌러 늘리기)을 통증 없는 범위에서 천천히', en:'Stretch wrist and forearm slowly (press the back of the hand down), staying pain-free', zh:'慢慢做手腕与前臂拉伸（手背向下按压），只在不痛范围内'},
   ] },
  ],
  warn:{ko:'병원 방문 신호: 부기가 눈에 띄게 있거나, 팔꿈치를 완전히 펴거나 굽히지 못하거나, 2주 이상 통증이 계속되면 진료를 받아보십시오.', en:'See a doctor if: there\'s visible swelling, you can\'t fully straighten or bend the elbow, or pain lasts over two weeks.', zh:'就医信号：明显肿胀、肘部无法完全伸直或弯曲，或疼痛持续两周以上，请就诊。'},
 },
 { id:'wrist', part:{ko:'손목', en:'Wrist', zh:'手腕'},
  groups:[
   { h:{ko:'흔한 원인', en:'Common causes', zh:'常见原因'}, items:[
    {ko:'푸쉬업·파이크푸쉬업·플랭크·배밀기에서 손목이 과도하게 꺾인 상태로 체중을 지탱', en:'Bearing weight on a sharply bent wrist in push-ups, pike push-ups, planks or crawls', zh:'俯卧撑、派克撑、平板支撑、匍匐前进时手腕过度后翻承重'},
    {ko:'바닥에 손바닥을 짚는 각도가 매번 달라 손목이 좌우로 흔들림', en:'Placing the palm at a different angle each rep so the wrist wobbles', zh:'每次撑地角度不同，手腕左右晃动'},
   ] },
   { h:{ko:'증상', en:'Symptoms', zh:'症状'}, items:[
    {ko:'손목을 젖히거나 체중을 실을 때 콕콕 쑤시는 통증', en:'Sharp stabbing when bending the wrist back or loading it', zh:'手腕后翻或承重时刺痛'},
    {ko:'손목 안쪽 또는 바깥쪽 부기', en:'Swelling on the inside or outside of the wrist', zh:'手腕内侧或外侧肿胀'},
   ] },
   { h:{ko:'즉시 대처', en:'What to do right away', zh:'立即处理'}, items:[
    {ko:'손으로 체중을 지탱하는 동작(푸쉬업류, 플랭크, 배밀기) 중단', en:'Stop anything that loads the hands (push-ups, planks, crawls)', zh:'停止用手承重的动作（俯卧撑类、平板支撑、匍匐前进）'},
    {ko:'냉찜질 15분씩, 손목을 심장보다 높게 두고 휴식', en:'Ice 15 minutes at a time and rest with the wrist above heart level', zh:'每次冷敷15分钟，把手腕抬到高于心脏的位置休息'},
   ] },
   { h:{ko:'회복 관리', en:'Recovery', zh:'恢复与调整'}, items:[
    {ko:'통증이 가라앉을 때까지는 주먹을 쥔 상태(너클 푸쉬업 자세)로 손목 꺾임을 줄여서 시도', en:'Until it settles, try a fist position (knuckle push-ups) to reduce wrist bend', zh:'疼痛缓解前，改用握拳姿势（指关节俯卧撑）减少手腕后翻'},
    {ko:'손목 스트레칭(손등·손바닥 방향으로 천천히 젖히기)을 통증 없는 범위에서만', en:'Stretch the wrist slowly both ways, only within a pain-free range', zh:'手腕向手背、手掌两个方向慢慢拉伸，只在不痛范围内'},
    {ko:'바닥이 미끄럽지 않은 매트 위에서, 손가락을 넓게 펴 체중을 분산', en:'Use a non-slip mat and spread your fingers wide to share the load', zh:'在防滑垫上，手指张开分散体重'},
   ] },
  ],
  warn:{ko:'병원 방문 신호: 손목이 붓고 시퍼렇게 멍이 들거나, 손가락 저림이 동반되거나, 며칠이 지나도 악화되면 정형외과 진료를 권합니다.', en:'See a doctor if: the wrist swells and bruises, fingers go numb, or it worsens over several days.', zh:'就医信号：手腕肿胀发青、伴手指麻木，或数日后仍在加重，建议就诊骨科。'},
 },
 { id:'back', part:{ko:'허리', en:'Lower back', zh:'腰部'},
  groups:[
   { h:{ko:'흔한 원인', en:'Common causes', zh:'常见原因'}, items:[
    {ko:'플랭크·배밀기에서 골반이 아래로 처져 허리가 과도하게 꺾임', en:'Hips sagging in planks or crawls so the lower back over-arches', zh:'平板支撑、匍匐前进时臀部下沉，腰部过度塌陷'},
    {ko:'레그레이즈·크런치에서 허리를 바닥에서 뜬 채로 반동을 이용', en:'Using momentum in leg raises or crunches with the back lifted off the floor', zh:'举腿、卷腹时腰部离地并借助反弹发力'},
    {ko:'버피·점프스쿼트 착지 시 허리로 충격을 그대로 받음', en:'Absorbing the landing through the lower back in burpees or jump squats', zh:'波比跳、跳跃深蹲落地时冲击直接由腰部承受'},
   ] },
   { h:{ko:'증상', en:'Symptoms', zh:'症状'}, items:[
    {ko:'허리 중앙 또는 한쪽이 뻐근하거나 콕 쑤심', en:'Aching or stabbing in the middle or one side of the lower back', zh:'腰部中间或一侧酸胀、刺痛'},
    {ko:'허리를 숙이거나 젖힐 때 통증이 심해짐', en:'Pain gets worse when bending forward or back', zh:'前弯或后仰时疼痛加剧'},
   ] },
   { h:{ko:'즉시 대처', en:'What to do right away', zh:'立即处理'}, items:[
    {ko:'운동 즉시 중단, 무릎을 세우고 눕는 등 허리 부담이 적은 자세로 휴식', en:'Stop and rest in a low-load position — lying down with knees bent', zh:'立即停止，采用屈膝仰卧等腰部负担小的姿势休息'},
    {ko:'급성 통증 초기 24~48시간은 냉찜질, 이후엔 온찜질로 전환', en:'Ice for the first 24–48 hours of sharp pain, then switch to heat', zh:'急性疼痛初期24~48小时冷敷，之后改为热敷'},
    {ko:'무리해서 허리를 늘리거나 꺾는 스트레칭 피하기', en:'Avoid forcing stretches that lengthen or arch the back', zh:'避免勉强拉伸或反折腰部'},
   ] },
   { h:{ko:'회복 관리', en:'Recovery', zh:'恢复与调整'}, items:[
    {ko:'통증이 줄면 무릎 껴안고 살살 좌우로 흔드는 정도의 가벼운 움직임부터', en:'As pain eases, start with gentle movement — hugging your knees and rocking side to side', zh:'疼痛减轻后，先从抱膝轻轻左右晃动这类小幅动作开始'},
    {ko:'복귀 시 플랭크는 골반을 살짝 말아 넣어 허리가 꺾이지 않게, 레그레이즈·크런치는 반동 없이 천천히', en:'Coming back: tuck the pelvis slightly in planks so the back doesn\'t arch; do leg raises and crunches slowly without momentum', zh:'复出时平板支撑略微收髋避免塌腰，举腿与卷腹要慢、不借力'},
    {ko:'복근·둔근에 힘을 주는 느낌을 유지하며 허리 힘으로만 버티지 않기', en:'Keep the abs and glutes engaged instead of holding with the lower back alone', zh:'保持腹部与臀部发力，不要只靠腰撑着'},
   ] },
  ],
  warn:{ko:'병원 방문 신호: 다리로 저림·힘 빠짐이 뻗치거나, 기침·재채기할 때 통증이 심해지거나, 1주 이상 지속되면 반드시 진료를 받아보십시오.', en:'See a doctor if: numbness or weakness runs down your leg, coughing or sneezing makes it worse, or it lasts over a week.', zh:'就医信号：麻木或无力延伸到腿部、咳嗽打喷嚏时加剧，或持续一周以上，务必就诊。'},
 },
 { id:'knee', part:{ko:'무릎', en:'Knee', zh:'膝盖'},
  groups:[
   { h:{ko:'흔한 원인', en:'Common causes', zh:'常见原因'}, items:[
    {ko:'스쿼트·점프스쿼트에서 무릎이 발끝보다 안쪽으로 모이며 반복', en:'Knees caving inward past the toes, rep after rep, in squats or jump squats', zh:'深蹲、跳跃深蹲时膝盖反复向内扣，超过脚尖'},
    {ko:'런지 착지 시 무릎이 발끝을 지나 앞으로 쏠림', en:'Knee shooting forward past the toes when landing a lunge', zh:'弓步落地时膝盖前移超过脚尖'},
    {ko:'점프스쿼트 착지를 \'쿵\' 하고 무릎으로 흡수', en:'Landing jump squats with a thud, absorbing it all through the knee', zh:'跳跃深蹲“咚”地落地，全靠膝盖缓冲'},
   ] },
   { h:{ko:'증상', en:'Symptoms', zh:'症状'}, items:[
    {ko:'계단 오르내리거나 앉았다 일어날 때 무릎 앞쪽이 시큰거림', en:'Front of the knee aches on stairs or when getting up from a chair', zh:'上下楼梯或起身时膝盖前侧酸痛'},
    {ko:'무릎을 완전히 굽히거나 펼 때 걸리는 느낌', en:'Catching when fully bending or straightening the knee', zh:'完全屈膝或伸直时有卡顿感'},
   ] },
   { h:{ko:'즉시 대처', en:'What to do right away', zh:'立即处理'}, items:[
    {ko:'하체 운동(스쿼트류, 런지, 점프스쿼트) 즉시 중단', en:'Stop lower-body work right away (squats, lunges, jump squats)', zh:'立即停止下肢动作（深蹲类、弓步、跳跃深蹲）'},
    {ko:'냉찜질 15~20분, 다리를 높게 올리고 휴식', en:'Ice 15–20 minutes and rest with the leg elevated', zh:'冷敷15~20分钟，抬高腿部休息'},
   ] },
   { h:{ko:'회복 관리', en:'Recovery', zh:'恢复与调整'}, items:[
    {ko:'통증이 가라앉으면 무릎에 충격이 적은 동작(제자리 걷기 수준)부터 서서히 복귀', en:'Once pain settles, return gradually with low-impact movement (walking in place level)', zh:'疼痛缓解后，从对膝盖冲击小的动作（原地走路强度）开始逐步恢复'},
    {ko:'스쿼트·런지 복귀 시 무릎이 발끝 방향과 같은 선을 유지하도록 거울로 확인하며 천천히', en:'Returning to squats and lunges, watch in a mirror that knees track over the toes, and go slow', zh:'恢复深蹲与弓步时对着镜子确认膝盖与脚尖同向，动作放慢'},
    {ko:'점프스쿼트는 통증이 완전히 없어질 때까지 스쿼트로 대체', en:'Swap jump squats for regular squats until pain is completely gone', zh:'疼痛完全消失前，用普通深蹲代替跳跃深蹲'},
   ] },
  ],
  warn:{ko:'병원 방문 신호: 무릎이 붓거나 힘이 풀려 꺾이는 느낌이 들거나, \'뚝\' 소리와 함께 통증이 시작됐다면 바로 정형외과 진료를 받아보십시오.', en:'See a doctor if: the knee swells, gives way under you, or the pain started with a pop.', zh:'就医信号：膝盖肿胀、发软打软腿，或伴随“啪”的一声开始疼痛，请立即就诊骨科。'},
 },
 { id:'ankle', part:{ko:'발목', en:'Ankle', zh:'脚踝'},
  groups:[
   { h:{ko:'흔한 원인', en:'Common causes', zh:'常见原因'}, items:[
    {ko:'점프스쿼트·버피 착지 시 발목이 옆으로 꺾임 (특히 미끄러운 바닥)', en:'Ankle rolling sideways on landing from jump squats or burpees (especially on a slick floor)', zh:'跳跃深蹲、波比跳落地时脚踝向外翻（尤其在滑的地面）'},
    {ko:'런지·제자리 달리기에서 발이 완전히 안 펴진 채로 방향이 틀어짐', en:'Foot twisting while not fully planted in lunges or running in place', zh:'弓步、原地跑时脚未完全放平就发生扭转'},
    {ko:'맨발이나 굽 낮은 신발 없이 딱딱한 바닥에서 착지 반복', en:'Repeated landings on a hard floor barefoot or without cushioned shoes', zh:'赤脚或没有缓冲鞋，在硬地面上反复落地'},
   ] },
   { h:{ko:'증상', en:'Symptoms', zh:'症状'}, items:[
    {ko:'발목 바깥쪽 또는 안쪽이 붓고 누르면 아픔', en:'Swelling and tenderness on the outside or inside of the ankle', zh:'脚踝外侧或内侧肿胀，按压疼痛'},
    {ko:'체중을 실을 때 시큰거리거나 절뚝이게 됨', en:'Aching when you put weight on it, or limping', zh:'承重时酸痛或跛行'},
   ] },
   { h:{ko:'즉시 대처 (PRICE)', en:'Right away (PRICE)', zh:'立即处理（PRICE）'}, items:[
    {ko:'<b>보호(P)</b> 추가 손상을 막기 위해 해당 부위를 보호합니다 (필요시 테이핑·보호대)', en:'<b>Protect (P)</b> the area from further injury (tape or a brace if needed)', zh:'<b>保护(P)</b> 保护受伤部位避免二次损伤（必要时用贴布或护具）'},
    {ko:'<b>휴식(R)</b> 즉시 운동을 멈추고 체중을 싣지 않습니다', en:'<b>Rest (R)</b> Stop training and keep weight off it', zh:'<b>休息(R)</b> 立即停止训练，不要负重'},
    {ko:'<b>냉찜질(I)</b> 15~20분씩, 2~3시간 간격으로 반복합니다 (첫 48시간)', en:'<b>Ice (I)</b> 15–20 minutes every 2–3 hours (first 48 hours)', zh:'<b>冰敷(I)</b> 冷敷15~20分钟，每2~3小时一次（前48小时）'},
    {ko:'<b>압박(C)</b> 붕대로 적당히 감싸줍니다 (너무 꽉 조이지 않게)', en:'<b>Compress (C)</b> Wrap with moderate pressure (not too tight)', zh:'<b>加压(C)</b> 用绷带适度加压（不要勒太紧）'},
    {ko:'<b>올리기(E)</b> 발목을 심장보다 높은 위치에 올려둡니다', en:'<b>Elevate (E)</b> Keep the ankle above heart level', zh:'<b>抬高(E)</b> 把脚踝抬到高于心脏的位置'},
   ] },
   { h:{ko:'회복 관리', en:'Recovery', zh:'恢复与调整'}, items:[
    {ko:'부기가 빠지면 발목을 알파벳 쓰듯 천천히 돌리는 것부터 시작해 서서히 회복합니다', en:'Once swelling drops, start rehab by slowly tracing letters with the ankle', zh:'消肿后，从用脚踝慢慢“写字母”开始，慢慢恢复'},
    {ko:'통증 없이 체중을 실을 수 있게 되면 제자리 걷기 → 스쿼트 순으로 복귀', en:'When you can bear weight painlessly, return via walking in place, then squats', zh:'能无痛承重后，按原地走路 → 深蹲的顺序恢复'},
    {ko:'점프스쿼트·버피 등 착지 동작은 가장 나중에, 쿠션 있는 신발과 안정된 바닥에서만 재개', en:'Bring landing moves like jump squats and burpees back last, in cushioned shoes on stable ground', zh:'跳跃深蹲、波比跳等落地动作最后恢复，且要穿有缓冲的鞋、在稳固地面上'},
   ] },
  ],
  warn:{ko:'병원 방문 신호: 체중을 전혀 실을 수 없거나, 심하게 붓고 변형된 것처럼 보이거나, 멍이 빠르게 번지면 골절 가능성도 있으니 바로 병원에 가보십시오.', en:'See a doctor if: you can\'t bear weight at all, it\'s badly swollen or looks deformed, or bruising spreads fast — a fracture is possible.', zh:'就医信号：完全无法承重、肿胀严重或看起来变形、淤青迅速扩散，可能骨折，请立即就医。'},
 },
];

// 대상별 가이드. 몸의 특정 부위가 아니라 '누구인가'로 나뉜다 — 위 부위별
// 목록과 같은 화면에 섞여 있으면 '다이어트용' 칩이 '목' 옆에 나란히 붙어
// 무엇이 부위이고 무엇이 대상인지 구별이 안 된다(2026-09-06 지적).
export const SPECIAL_GUIDES = [
 { part:{ko:'노인을 위한 운동', en:'For older adults', zh:'老年人训练'},
  groups:[
   { h:{ko:'추천 동작', en:'Suggested moves', zh:'推荐动作'}, items:[
    {ko:'<b>의자 잡고 앉았다 일어나기</b> 8~10회 — 무릎 강화에 좋고 낙상 예방에 직접 도움이 돼요', en:'<b>Sit-to-stand holding a chair</b> 8–10 reps — builds knee strength and directly helps prevent falls', zh:'<b>扶椅起坐</b> 8~10次 — 增强膝盖力量，直接有助于预防跌倒'},
    {ko:'<b>벽 짚고 팔굽혀펴기</b> 8~10회 — 바닥 푸쉬업보다 훨씬 안전해요', en:'<b>Wall push-ups</b> 8–10 reps — far safer than floor push-ups', zh:'<b>靠墙俯卧撑</b> 8~10次 — 比地面俯卧撑安全得多'},
    {ko:'<b>제자리에서 천천히 걷기</b> 30초 — 높이 뛰거나 빠르게 하지 않기', en:'<b>Slow walking in place</b> 30 seconds — no jumping high or rushing', zh:'<b>原地慢走</b> 30秒 — 不要跳高或加快'},
    {ko:'<b>앉아서 발목 위아래로 움직이기</b> 양발 각 10회 — 혈액순환에 도움', en:'<b>Seated ankle pumps</b> 10 reps each foot — helps circulation', zh:'<b>坐姿踝泵</b> 每只脚10次 — 有助于血液循环'},
   ] },
  ],
  warn:{ko:'어지러움, 가슴 통증, 심한 숨가쁨이 있으면 즉시 중단하고, 가능하면 보호자나 지팡이와 함께 진행하세요.', en:'Stop immediately if you feel dizzy, have chest pain or severe breathlessness. Where possible, train with someone nearby or with a cane.', zh:'如出现头晕、胸痛或严重气短，请立即停止；尽量在有人陪同或使用手杖的情况下进行。'},
 },
 { part:{ko:'어린이를 위한 활동', en:'For children', zh:'儿童活动'},
  groups:[
   { h:{ko:'추천 동작', en:'Suggested moves', zh:'推荐动作'}, items:[
    {ko:'<b>곰걸음·게걸음 흉내내기</b> 20초 — 놀이처럼 즐겁게', en:'<b>Bear walk and crab walk</b> 20 seconds — keep it playful', zh:'<b>模仿熊爬、螃蟹走</b> 20秒 — 当作游戏来玩'},
    {ko:'<b>가볍게 제자리 점프</b> 10회 — 세게 구르지 않기', en:'<b>Light jumps in place</b> 10 reps — no hard stomping', zh:'<b>轻轻原地跳</b> 10次 — 不要重重落地'},
    {ko:'<b>동물 흉내 스트레칭</b> (고양이처럼 등 구부리기 등) 10초씩', en:'<b>Animal stretches</b> (arching the back like a cat, etc.) 10 seconds each', zh:'<b>动物模仿拉伸</b>（像猫一样弓背等）各10秒'},
   ] },
  ],
  warn:{ko:'반드시 보호자가 지켜보는 상태에서, 아이가 힘들어하면 바로 멈추고 놀이처럼 짧게만 진행하세요.', en:'Always with an adult watching. Stop as soon as the child struggles, and keep it short and playful.', zh:'务必在成人看护下进行；孩子觉得吃力就立刻停止，保持短时间、游戏化。'},
 },
 { part:{ko:'부상 회복 중이신 분', en:'Coming back from injury', zh:'伤后恢复期'},
  groups:[
   { h:{ko:'진행 방법', en:'How to go about it', zh:'进行方式'}, items:[
    {ko:'위의 부위별 부상 대처법에서 해당 부위를 먼저 확인해보세요', en:'Start by checking that body part in the injury guide above', zh:'先在上面的部位指南中查看相应部位'},
    {ko:'통증이 전혀 없는 범위 내에서만, 아주 천천히 움직이는 것부터 시작하세요', en:'Begin by moving very slowly, staying completely pain-free', zh:'只在完全不痛的范围内，从非常缓慢的动作开始'},
   ] },
  ],
  warn:{ko:'이 내용은 일반적인 안내일 뿐, 의료 진단이나 물리치료를 대신할 수 없습니다. 부상 정도가 있다면 반드시 의사나 물리치료사와 상담 후 진행하세요.', en:'This is general guidance, not a diagnosis or physiotherapy. If you\'re injured, check with a doctor or physiotherapist first.', zh:'这些只是一般性建议，不能替代医疗诊断或物理治疗。如有伤情，请先咨询医生或理疗师。'},
 },
 { part:{ko:'오십견 · 골반 스트레칭', en:'Frozen shoulder & hip stretches', zh:'肩周炎与髋部拉伸'},
  groups:[
   { h:{ko:'오십견(어깨 굳음) 스트레칭', en:'Frozen shoulder stretches', zh:'肩周炎（肩部僵硬）拉伸'}, items:[
    {ko:'<b>테이블 슬라이드</b> 팔을 테이블 위에 올리고 몸을 숙이며 앞으로 천천히 밀어내기 20~30초', en:'<b>Table slide</b> Rest your arm on a table, lean forward and slide it out slowly, 20–30 seconds', zh:'<b>桌面滑行</b> 手臂放在桌上，身体前倾慢慢向前推 20~30秒'},
    {ko:'<b>추 흔들기(펜듈럼)</b> 상체를 숙이고 팔에 힘을 빼서 앞뒤·좌우로 가볍게 흔들기 30초', en:'<b>Pendulum swing</b> Bend forward, let the arm hang loose and swing gently front-back and side to side, 30 seconds', zh:'<b>钟摆摆动</b> 上身前倾，手臂放松前后、左右轻轻摆动 30秒'},
    {ko:'<b>벽 걷기</b> 손가락으로 벽을 짚고 천천히 위로 걸어 올라가기, 통증 시작 지점에서 멈추기', en:'<b>Wall walk</b> Walk your fingers slowly up the wall and stop where pain begins', zh:'<b>爬墙</b> 用手指沿墙慢慢向上走，到开始疼的位置就停'},
   ] },
   { h:{ko:'골반 스트레칭', en:'Hip stretches', zh:'髋部拉伸'}, items:[
    {ko:'<b>나비 자세</b> 앉아서 발바닥을 맞대고 무릎을 바닥 쪽으로 천천히 눌러주기 20~30초', en:'<b>Butterfly</b> Sit with soles together and press the knees slowly toward the floor, 20–30 seconds', zh:'<b>蝴蝶式</b> 坐姿脚掌相对，膝盖慢慢向地面下压 20~30秒'},
    {ko:'<b>비둘기 자세(약식)</b> 한쪽 다리를 앞으로 굽히고 골반 앞쪽을 천천히 늘려주기 20초씩 양쪽', en:'<b>Half pigeon</b> Bend one leg forward and slowly lengthen the front of the hip, 20 seconds each side', zh:'<b>简易鸽子式</b> 一腿向前屈，慢慢拉伸髋前侧，每侧20秒'},
    {ko:'<b>누워서 무릎 좌우로 넘기기</b> 무릎을 세우고 천천히 좌우로 눕혀 골반 회전 10회', en:'<b>Lying knee drops</b> Knees up, lower them slowly side to side to rotate the hips, 10 reps', zh:'<b>仰卧屈膝左右倒</b> 屈膝后慢慢左右放倒，转动髋部 10次'},
   ] },
  ],
  warn:{ko:'반동을 주지 말고 아주 천천히, 통증이 아닌 시원한 느낌까지만 늘리세요. 밤에 통증으로 잠을 깨거나 3~4주 이상 호전이 없으면 정형외과·재활의학과 진료를 받아보세요.', en:'No bouncing — go slowly and stretch only to a pleasant pull, never pain. If pain wakes you at night or there\'s no improvement after 3–4 weeks, see an orthopaedist or rehab specialist.', zh:'不要借助反弹，动作要慢，只拉伸到舒服的程度而非疼痛。若夜间被痛醒或3~4周仍无好转，请就诊骨科或康复科。'},
 },
];

// 식단 가이드. 부상 대처법이 아니라 목적별 식단 방향이라 위 두 목록과도
// 다른 이야기다(2026-09-06 지적) — 별도 화면 자리를 준다.
export const DIET_GUIDES = [
 { part:{ko:'다이어트용', en:'For weight loss', zh:'减脂'},
  groups:[
   { h:{ko:'방향', en:'Approach', zh:'方向'}, items:[
    {ko:'흰쌀밥·빵 같은 정제 탄수화물 비중을 줄이고 <b>채소·단백질 위주</b>로 식사 구성', en:'Cut back on refined carbs like white rice and bread; build meals around <b>vegetables and protein</b>', zh:'减少白米饭、面包等精制碳水，以<b>蔬菜和蛋白质为主</b>组织饮食'},
    {ko:'튀김·가공식품보다 <b>구이·찜</b> 조리법 선택', en:'Choose <b>grilled or steamed</b> over fried and processed', zh:'比起油炸和加工食品，优先选择<b>烤或蒸</b>'},
    {ko:'공복감이 심하면 오이·방울토마토 같은 저칼로리 간식 활용', en:'When hunger bites, reach for low-calorie snacks like cucumber or cherry tomatoes', zh:'特别饿时，可以吃黄瓜、小番茄等低热量零食'},
    {ko:'물을 충분히 마셔서 갈증을 배고픔으로 착각하지 않기', en:'Drink enough water so you don\'t mistake thirst for hunger', zh:'多喝水，避免把口渴误当成饥饿'},
   ] },
  ],
  warn:{ko:'무리한 굶기·극단적 식단은 오히려 요요와 건강 문제로 이어질 수 있어요. 급격한 체중 변화가 필요하다면 전문가와 상담하세요.', en:'Starving yourself or extreme diets tend to backfire into rebound weight and health problems. If you need rapid change, talk to a professional.', zh:'过度节食或极端饮食反而容易导致反弹和健康问题。若需要快速改变体重，请咨询专业人士。'},
 },
 { part:{ko:'근성장용', en:'For muscle growth', zh:'增肌'},
  groups:[
   { h:{ko:'방향', en:'Approach', zh:'方向'}, items:[
    {ko:'끼니마다 <b>단백질 급원</b>(닭가슴살·계란·두부·생선 등) 챙기기', en:'Include a <b>protein source</b> at every meal (chicken, eggs, tofu, fish)', zh:'每餐都安排<b>蛋白质来源</b>（鸡胸肉、鸡蛋、豆腐、鱼等）'},
    {ko:'운동 전후로는 탄수화물도 충분히 — 근성장엔 전체 칼로리가 부족하지 않아야 해요', en:'Get enough carbs around training — muscle growth needs enough total calories', zh:'训练前后碳水也要够 — 增肌需要总热量充足'},
    {ko:'운동 직후 30~60분 내 단백질+탄수화물 조합 섭취', en:'Eat protein plus carbs within 30–60 minutes after training', zh:'训练后30~60分钟内摄入蛋白质+碳水'},
    {ko:'수면 부족은 근성장을 방해하니 충분한 수면도 식단만큼 중요', en:'Too little sleep blocks growth — rest matters as much as diet', zh:'睡眠不足会阻碍增肌，充足睡眠和饮食一样重要'},
   ] },
  ],
 },
 { part:{ko:'비건용', en:'For vegans', zh:'纯素饮食'},
  groups:[
   { h:{ko:'방향', en:'Approach', zh:'方向'}, items:[
    {ko:'콩류·두부·템페·렌틸콩으로 <b>단백질 다양하게</b> 조합해서 섭취', en:'<b>Vary your protein</b> across beans, tofu, tempeh and lentils', zh:'用豆类、豆腐、天贝、扁豆<b>搭配多样蛋白质</b>'},
    {ko:'비타민 B12는 식물성 식품만으로 부족하기 쉬워 <b>보충제 고려</b>', en:'B12 is hard to get from plants alone — <b>consider a supplement</b>', zh:'仅靠植物性食物容易缺乏维生素B12，<b>可考虑补充剂</b>'},
    {ko:'철분·칼슘은 견과류·씨앗류·녹색채소로 보충, 비타민C와 함께 먹으면 철분 흡수 도움', en:'Get iron and calcium from nuts, seeds and greens; vitamin C alongside helps iron absorption', zh:'通过坚果、种子、绿叶蔬菜补充铁与钙；搭配维生素C有助于铁吸收'},
    {ko:'오메가3는 아마씨·들기름·호두 등으로 챙기기', en:'Cover omega-3 with flaxseed, perilla oil and walnuts', zh:'用亚麻籽、紫苏油、核桃等补充欧米伽3'},
   ] },
  ],
 },
 { part:{ko:'유지어터용', en:'For maintaining', zh:'保持体重'},
  groups:[
   { h:{ko:'방향', en:'Approach', zh:'方向'}, items:[
    {ko:'극단적인 제한보다 <b>골고루, 적당량</b>이 핵심', en:'<b>Varied and moderate</b> beats extreme restriction', zh:'关键是<b>均衡、适量</b>，而不是极端限制'},
    {ko:'매 끼니 탄수화물·단백질·지방·채소를 균형 있게 구성', en:'Balance carbs, protein, fat and vegetables at each meal', zh:'每餐均衡搭配碳水、蛋白质、脂肪和蔬菜'},
    {ko:'가끔의 외식·디저트에 죄책감 갖지 않기 — 전체적인 패턴이 중요해요', en:'Don\'t feel guilty about the occasional meal out or dessert — the overall pattern is what counts', zh:'偶尔外食或吃甜点不必有负罪感 — 重要的是整体的习惯'},
    {ko:'배고픔·포만감 신호에 귀 기울이며 자연스럽게 식사량 조절', en:'Listen to hunger and fullness cues and let portions settle naturally', zh:'留意饥饿与饱腹信号，自然地调整食量'},
   ] },
  ],
 },
];
