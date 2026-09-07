// 식단을 짜는 데 쓰는 음식 표.
//
// 값은 **100g 당**으로 적고 1인분 그램수(serveG)를 따로 둔다. 처음에는
// '1인분당 칼로리' 만 적었는데, 그러면 목표 칼로리에 맞춰 양을 줄이거나
// 늘릴 때 계산이 안 된다 — 식단은 '무엇을 먹나' 보다 '얼마나 먹나' 가
// 대부분이라, 양을 못 움직이면 표가 아니라 사진이 된다.
//
// 출처: 농촌진흥청 국가표준식품성분표 / 식품의약품안전처 식품영양성분DB.
// 조리 상태를 함께 적는다(생것·삶은것·찐것) — 같은 재료라도 두 배 가까이
// 차이가 나서, 상태를 안 적으면 표가 맞는지 틀린지 확인할 방법이 없어진다.
//
// tag 가 식단 조합의 규칙이다: 한 끼 = carb 1 + protein 1 + veg 1~2 (+ fat).

/** @type {{key:string,tag:string,serveG:number,per100:{kcal:number,p:number,c:number,f:number}}[]} */
export const FOODS = [
  // ── 탄수화물 ────────────────────────────────────────────────
  { key:'rice-white', tag:'carb', serveG:210, per100:{kcal:145, p:3.0, c:33.2, f:0.1},
    label:{ko:'백미밥', en:'White rice', zh:'白米饭'},
    serve:{ko:'1공기(210g)', en:'1 bowl (210g)', zh:'1碗(210g)'} },
  { key:'rice-brown', tag:'carb', serveG:210, per100:{kcal:148, p:3.4, c:32.4, f:0.9},
    label:{ko:'현미밥', en:'Brown rice', zh:'糙米饭'},
    serve:{ko:'1공기(210g)', en:'1 bowl (210g)', zh:'1碗(210g)'} },
  { key:'rice-multi', tag:'carb', serveG:210, per100:{kcal:155, p:4.0, c:32.0, f:1.2},
    label:{ko:'잡곡밥', en:'Multigrain rice', zh:'杂粮饭'},
    serve:{ko:'1공기(210g)', en:'1 bowl (210g)', zh:'1碗(210g)'} },
  { key:'sweet-potato', tag:'carb', serveG:150, per100:{kcal:141, p:1.7, c:33.0, f:0.2},
    label:{ko:'고구마(찐것)', en:'Steamed sweet potato', zh:'蒸红薯'},
    serve:{ko:'중간 것 1개(150g)', en:'1 medium (150g)', zh:'中等1个(150g)'} },
  { key:'potato', tag:'carb', serveG:200, per100:{kcal:66, p:1.9, c:15.0, f:0.1},
    label:{ko:'감자(삶은것)', en:'Boiled potato', zh:'水煮土豆'},
    serve:{ko:'중간 것 2개(200g)', en:'2 medium (200g)', zh:'中等2个(200g)'} },
  { key:'bread-whole', tag:'carb', serveG:70, per100:{kcal:260, p:10.0, c:46.0, f:4.0},
    label:{ko:'통밀식빵', en:'Whole wheat bread', zh:'全麦面包'},
    serve:{ko:'2쪽(70g)', en:'2 slices (70g)', zh:'2片(70g)'} },
  { key:'oatmeal', tag:'carb', serveG:40, per100:{kcal:380, p:13.0, c:66.0, f:7.0},
    label:{ko:'오트밀(건조)', en:'Oats (dry)', zh:'燕麦(干)'},
    serve:{ko:'40g', en:'40g', zh:'40g'} },

  // ── 단백질 ──────────────────────────────────────────────────
  { key:'chicken-breast', tag:'protein', serveG:150, per100:{kcal:106, p:23.3, c:0, f:1.0},
    label:{ko:'닭가슴살(생것)', en:'Chicken breast (raw)', zh:'鸡胸肉(生)'},
    serve:{ko:'150g', en:'150g', zh:'150g'} },
  { key:'chicken-tender', tag:'protein', serveG:150, per100:{kcal:105, p:23.6, c:0, f:0.8},
    label:{ko:'닭안심(생것)', en:'Chicken tenderloin (raw)', zh:'鸡里脊(生)'},
    serve:{ko:'150g', en:'150g', zh:'150g'} },
  { key:'egg', tag:'protein', serveG:100, per100:{kcal:143, p:12.4, c:0.8, f:9.6},
    label:{ko:'달걀', en:'Egg', zh:'鸡蛋'},
    serve:{ko:'2개(100g)', en:'2 eggs (100g)', zh:'2个(100g)'} },
  { key:'tofu', tag:'protein', serveG:150, per100:{kcal:84, p:8.5, c:2.4, f:4.9},
    label:{ko:'두부', en:'Tofu', zh:'豆腐'},
    serve:{ko:'반 모(150g)', en:'Half block (150g)', zh:'半块(150g)'} },
  { key:'salmon', tag:'protein', serveG:120, per100:{kcal:183, p:20.6, c:0, f:9.8},
    label:{ko:'연어(생것)', en:'Salmon (raw)', zh:'三文鱼(生)'},
    serve:{ko:'120g', en:'120g', zh:'120g'} },
  { key:'whitefish', tag:'protein', serveG:150, per100:{kcal:78, p:17.5, c:0, f:0.4},
    label:{ko:'흰살생선(대구)', en:'White fish (cod)', zh:'白肉鱼(鳕鱼)'},
    serve:{ko:'150g', en:'150g', zh:'150g'} },
  { key:'shrimp', tag:'protein', serveG:150, per100:{kcal:84, p:18.0, c:0.2, f:0.7},
    label:{ko:'새우(생것)', en:'Shrimp (raw)', zh:'虾(生)'},
    serve:{ko:'150g', en:'150g', zh:'150g'} },
  { key:'beef-round', tag:'protein', serveG:120, per100:{kcal:129, p:21.4, c:0, f:4.2},
    label:{ko:'소고기 우둔', en:'Beef round', zh:'牛后腿肉'},
    serve:{ko:'120g', en:'120g', zh:'120g'} },
  { key:'pork-loin', tag:'protein', serveG:120, per100:{kcal:121, p:22.8, c:0.2, f:2.8},
    label:{ko:'돼지 안심', en:'Pork tenderloin', zh:'猪里脊'},
    serve:{ko:'120g', en:'120g', zh:'120g'} },
  { key:'tuna-can', tag:'protein', serveG:100, per100:{kcal:110, p:26.0, c:0, f:0.8},
    label:{ko:'참치캔(기름 뺀 것)', en:'Canned tuna (drained)', zh:'金枪鱼罐头(沥油)'},
    serve:{ko:'1캔(100g)', en:'1 can (100g)', zh:'1罐(100g)'} },
  { key:'greek-yogurt', tag:'protein', serveG:150, per100:{kcal:59, p:10.0, c:3.6, f:0.4},
    label:{ko:'그릭요거트(무가당)', en:'Greek yogurt (plain)', zh:'希腊酸奶(无糖)'},
    serve:{ko:'150g', en:'150g', zh:'150g'} },
  { key:'whey', tag:'protein', serveG:30, per100:{kcal:400, p:80.0, c:8.0, f:5.0},
    label:{ko:'유청 단백 파우더', en:'Whey protein powder', zh:'乳清蛋白粉'},
    serve:{ko:'1스쿱(30g)', en:'1 scoop (30g)', zh:'1勺(30g)'} },

  // ── 채소·국 ─────────────────────────────────────────────────
  { key:'broccoli', tag:'veg', serveG:100, per100:{kcal:33, p:3.0, c:5.2, f:0.4},
    label:{ko:'브로콜리(데친것)', en:'Broccoli (blanched)', zh:'西兰花(焯)'},
    serve:{ko:'100g', en:'100g', zh:'100g'} },
  { key:'spinach', tag:'veg', serveG:80, per100:{kcal:45, p:3.5, c:3.5, f:2.0},
    label:{ko:'시금치나물', en:'Seasoned spinach', zh:'拌菠菜'},
    serve:{ko:'80g', en:'80g', zh:'80g'} },
  { key:'kimchi', tag:'veg', serveG:60, per100:{kcal:33, p:1.7, c:5.0, f:0.7},
    label:{ko:'배추김치', en:'Kimchi', zh:'泡菜'},
    serve:{ko:'60g', en:'60g', zh:'60g'} },
  { key:'cabbage', tag:'veg', serveG:100, per100:{kcal:24, p:1.3, c:5.4, f:0.1},
    label:{ko:'양배추 샐러드', en:'Cabbage salad', zh:'卷心菜沙拉'},
    serve:{ko:'100g', en:'100g', zh:'100g'} },
  { key:'cherry-tomato', tag:'veg', serveG:150, per100:{kcal:18, p:0.9, c:3.9, f:0.2},
    label:{ko:'방울토마토', en:'Cherry tomatoes', zh:'圣女果'},
    serve:{ko:'150g', en:'150g', zh:'150g'} },
  { key:'seaweed-soup', tag:'veg', serveG:300, per100:{kcal:20, p:1.4, c:1.2, f:0.9},
    label:{ko:'미역국', en:'Seaweed soup', zh:'海带汤'},
    serve:{ko:'1그릇(300g)', en:'1 bowl (300g)', zh:'1碗(300g)'} },
  { key:'doenjang-soup', tag:'veg', serveG:250, per100:{kcal:28, p:2.0, c:2.4, f:1.0},
    label:{ko:'된장국', en:'Soybean paste soup', zh:'大酱汤'},
    serve:{ko:'1그릇(250g)', en:'1 bowl (250g)', zh:'1碗(250g)'} },
  { key:'namul', tag:'veg', serveG:100, per100:{kcal:55, p:2.8, c:5.5, f:2.6},
    label:{ko:'모듬 나물', en:'Assorted namul', zh:'什锦拌菜'},
    serve:{ko:'100g', en:'100g', zh:'100g'} },

  // ── 지방 ────────────────────────────────────────────────────
  { key:'almond', tag:'fat', serveG:15, per100:{kcal:597, p:21.2, c:21.6, f:52.2},
    label:{ko:'아몬드', en:'Almonds', zh:'杏仁'},
    serve:{ko:'약 12알(15g)', en:'about 12 (15g)', zh:'约12颗(15g)'} },
  { key:'avocado', tag:'fat', serveG:70, per100:{kcal:187, p:2.0, c:8.5, f:17.3},
    label:{ko:'아보카도', en:'Avocado', zh:'牛油果'},
    serve:{ko:'반 개(70g)', en:'Half (70g)', zh:'半个(70g)'} },
  { key:'olive-oil', tag:'fat', serveG:10, per100:{kcal:884, p:0, c:0, f:100},
    label:{ko:'올리브유', en:'Olive oil', zh:'橄榄油'},
    serve:{ko:'2작은술(10g)', en:'2 tsp (10g)', zh:'2小勺(10g)'} },
  { key:'peanut-butter', tag:'fat', serveG:16, per100:{kcal:590, p:25.0, c:20.0, f:50.0},
    label:{ko:'땅콩버터', en:'Peanut butter', zh:'花生酱'},
    serve:{ko:'1큰술(16g)', en:'1 tbsp (16g)', zh:'1大勺(16g)'} },

  // ── 과일·유제품 (간식) ──────────────────────────────────────
  { key:'banana', tag:'fruit', serveG:120, per100:{kcal:84, p:1.2, c:22.0, f:0.2},
    label:{ko:'바나나', en:'Banana', zh:'香蕉'},
    serve:{ko:'1개(120g)', en:'1 (120g)', zh:'1根(120g)'} },
  { key:'apple', tag:'fruit', serveG:200, per100:{kcal:53, p:0.3, c:14.0, f:0.1},
    label:{ko:'사과', en:'Apple', zh:'苹果'},
    serve:{ko:'중간 것 1개(200g)', en:'1 medium (200g)', zh:'中等1个(200g)'} },
  { key:'blueberry', tag:'fruit', serveG:100, per100:{kcal:57, p:0.7, c:14.5, f:0.3},
    label:{ko:'블루베리', en:'Blueberries', zh:'蓝莓'},
    serve:{ko:'100g', en:'100g', zh:'100g'} },
  { key:'tangerine', tag:'fruit', serveG:160, per100:{kcal:40, p:0.7, c:10.5, f:0.1},
    label:{ko:'귤', en:'Tangerine', zh:'橘子'},
    serve:{ko:'2개(160g)', en:'2 (160g)', zh:'2个(160g)'} },
  { key:'milk-low', tag:'dairy', serveG:200, per100:{kcal:46, p:3.4, c:5.0, f:1.0},
    label:{ko:'저지방우유', en:'Low-fat milk', zh:'低脂牛奶'},
    serve:{ko:'200mL', en:'200mL', zh:'200毫升'} },
  { key:'soymilk', tag:'dairy', serveG:200, per100:{kcal:45, p:3.5, c:2.0, f:2.2},
    label:{ko:'무가당 두유', en:'Unsweetened soy milk', zh:'无糖豆浆'},
    serve:{ko:'200mL', en:'200mL', zh:'200毫升'} },
];

/** key → 항목. 조합기가 매번 find 하지 않게. */
export const FOOD_BY_KEY = Object.fromEntries(FOODS.map((f) => [f.key, f]));

/** tag → 항목 목록. */
export const FOOD_BY_TAG = FOODS.reduce((acc, f) => {
  (acc[f.tag] = acc[f.tag] || []).push(f);
  return acc;
}, {});

/**
 * 한 끼 칼로리 배분. 합이 1.00 이어야 한다.
 * 저녁을 점심보다 낮춘 이유: 이 앱의 운동은 대부분 저녁에 일어나고,
 * 저녁을 크게 잡으면 남는 칼로리가 그날의 초과분이 되기 쉽다.
 */
export const MEAL_SPLIT = [
  { id:'breakfast', ratio:0.25, label:{ko:'아침', en:'Breakfast', zh:'早餐'} },
  { id:'lunch',     ratio:0.35, label:{ko:'점심', en:'Lunch', zh:'午餐'} },
  { id:'dinner',    ratio:0.30, label:{ko:'저녁', en:'Dinner', zh:'晚餐'} },
  { id:'snack',     ratio:0.10, label:{ko:'간식', en:'Snack', zh:'加餐'} },
];

/**
 * 외식 표. 집에서 차려 먹는 것만 적어 두면 이 앱은 실제 하루에 못 붙는다 —
 * 한 끼는 거의 늘 밖에서 먹기 때문이다. 그래서 '먹지 마라' 대신
 * **얼마인지와 어떻게 줄이는지**를 적는다.
 * 값은 식품의약품안전처 외식 영양성분 자료의 1인분 기준(어림수)이다.
 */
export const EATING_OUT = [
  { key:'kimchi-stew', kcal:700,
    label:{ko:'김치찌개 백반', en:'Kimchi stew set', zh:'泡菜汤套餐'},
    tip:{ko:'국물을 반만 먹으면 나트륨이 절반으로 줄어듭니다', en:'Leaving half the broth halves the sodium', zh:'汤只喝一半，钠就减半'} },
  { key:'doenjang-set', kcal:650,
    label:{ko:'된장찌개 백반', en:'Doenjang stew set', zh:'大酱汤套餐'},
    tip:{ko:'나물 반찬을 먼저 비우면 밥이 자연히 줄어듭니다', en:'Eat the vegetable sides first and the rice shrinks by itself', zh:'先吃小菜，米饭自然吃得少'} },
  { key:'bibimbap', kcal:600,
    label:{ko:'비빔밥', en:'Bibimbap', zh:'拌饭'},
    tip:{ko:'고추장 반, 참기름 반이면 100kcal 가 빠집니다', en:'Half the gochujang and sesame oil saves about 100 kcal', zh:'辣酱和香油各减半，可省约100千卡'} },
  { key:'gimbap', kcal:480,
    label:{ko:'김밥 1줄', en:'Gimbap roll', zh:'紫菜包饭1条'},
    tip:{ko:'단백질이 적습니다 — 삶은 달걀 하나를 더하십시오', en:'Low in protein — add a boiled egg', zh:'蛋白质偏少 — 加一个水煮蛋'} },
  { key:'jeyuk', kcal:890,
    label:{ko:'제육볶음 백반', en:'Stir-fried pork set', zh:'辣炒猪肉套餐'},
    tip:{ko:'밥을 반 공기로 줄이면 150kcal 가 빠집니다', en:'Half a bowl of rice saves about 150 kcal', zh:'米饭减半可省约150千卡'} },
  { key:'samgyeopsal', kcal:1100,
    label:{ko:'삼겹살 200g + 밥', en:'Pork belly 200g + rice', zh:'五花肉200g+米饭'},
    tip:{ko:'상추쌈을 먼저 두 번 하고 시작하십시오', en:'Start with two lettuce wraps before the rest', zh:'先吃两口生菜包再开动'} },
  { key:'jjajang', kcal:800,
    label:{ko:'짜장면', en:'Jajangmyeon', zh:'炸酱面'},
    tip:{ko:'면을 3분의 2만 — 소스는 그대로 두면 맛이 안 줄어듭니다', en:'Eat two-thirds of the noodles; keep the sauce', zh:'面只吃三分之二，酱照旧'} },
  { key:'ramyeon', kcal:500,
    label:{ko:'라면', en:'Instant ramyeon', zh:'方便面'},
    tip:{ko:'달걀과 채소를 넣으면 같은 칼로리로 더 오래 버팁니다', en:'Add egg and vegetables — same calories, lasts longer', zh:'加蛋加菜，同样热量更耐饿'} },
  { key:'fried-chicken', kcal:880,
    label:{ko:'후라이드 치킨 반 마리', en:'Half fried chicken', zh:'炸鸡半只'},
    tip:{ko:'껍질을 벗기면 200kcal 가 빠집니다', en:'Removing the skin saves about 200 kcal', zh:'去皮可省约200千卡'} },
  { key:'sundae-soup', kcal:700,
    label:{ko:'순대국밥', en:'Sundae gukbap', zh:'血肠汤饭'},
    tip:{ko:'단백질은 충분합니다 — 밥만 반 공기로', en:'Protein is plenty — just halve the rice', zh:'蛋白质够了 — 只把米饭减半'} },
  { key:'naengmyeon', kcal:550,
    label:{ko:'물냉면', en:'Cold buckwheat noodles', zh:'冷面'},
    tip:{ko:'수육이나 달걀을 추가해 단백질을 채우십시오', en:'Add boiled meat or egg for protein', zh:'加水煮肉或鸡蛋补蛋白'} },
  { key:'salad-chicken', kcal:350,
    label:{ko:'닭가슴살 샐러드', en:'Chicken salad', zh:'鸡胸沙拉'},
    tip:{ko:'드레싱이 절반입니다 — 오리엔탈보다 발사믹', en:'Half of it is dressing — pick balsamic over oriental', zh:'一半热量在酱汁 — 选香醋别选和风'} },
  { key:'conv-lunchbox', kcal:600,
    label:{ko:'편의점 도시락', en:'Convenience-store bento', zh:'便利店便当'},
    tip:{ko:'삶은 달걀 하나를 더하면 단백질이 기준에 닿습니다', en:'One boiled egg brings the protein up to target', zh:'加一个水煮蛋，蛋白质就够了'} },
  { key:'latte', kcal:180,
    label:{ko:'카페라떼(톨)', en:'Caffe latte (tall)', zh:'拿铁(中杯)'},
    tip:{ko:'아메리카노로 바꾸면 170kcal 가 빠집니다', en:'Switching to americano saves about 170 kcal', zh:'换美式可省约170千卡'} },
];
