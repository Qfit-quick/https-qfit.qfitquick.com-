// 미디어 경로는 여기 한 곳에서만 만든다.
//
// GitHub Pages 는 저장소 이름이 붙은 하위 경로(/https-qfit.qfitquick.com-/)로 서빙되고
// 로컬 dev 서버는 루트(/)로 서빙된다. 파일마다 경로를 적으면 한쪽에서만 404 가 나는데,
// 그게 로컬에서는 멀쩡하고 배포하면 이미지가 통째로 사라지는 종류의 사고다.
// import.meta.env.BASE_URL 이 그 차이를 흡수한다.

const BASE = import.meta.env.BASE_URL;

export const photoUrl = (file) => `${BASE}media/photos/${file}`;
export const clipUrl = (file) => `${BASE}media/clips/${file}`;
// 알(성장 펫) 그림 두 장. 배포본에는 예전부터 있었지만 public/ 에는 없었다 —
// scripts/clean.mjs 가 media/ 를 안 지우는 덕에 라이브에서만 살아남아 있었다.
// 이제 public/media/pet/ 이 원본이고 빌드가 그대로 복사한다.
export const petUrl = (file) => `${BASE}media/pet/${file}`;
