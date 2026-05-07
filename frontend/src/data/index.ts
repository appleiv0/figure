const BASE = import.meta.env.BASE_URL || '/';

export const selectedFigures = [
  {
    imageUrl: "04-hedgehog.png",
    name: "고슴도치",
    josa: 0,
  },
  {
    imageUrl: "04-hedgehog.png",
    name: "고슴도치",
    josa: 0,
  },
  {
    imageUrl: "04-hedgehog.png",
    name: "고슴도치",
    josa: 0,
  },
  {
    imageUrl: "04-hedgehog.png",
    name: "고슴도치",
    josa: 0,
  },
];

export const dragFigures = [
  {
    direction: "left",
    figure: "상어",
    relation: "나",
    josa: 0,
  },
  {
    direction: "left",
    figure: "돼지",
    relation: "아빠",
    josa: 0,
  },
  {
    direction: "left",
    figure: "도마뱀",
    relation: "엄마",
    josa: 0,
  },
  {
    direction: "left",
    figure: "토끼",
    relation: "엄마",
    josa: 0,
  },
  {
    direction: "left",
    figure: "병아리",
    relation: "엄마",
    josa: 0,
  },
];

export const defaultStage4Figures = [
  {
    imageUrl: "01-puppy.png",
    name: "강아지",
    josa: 0,
  },
  {
    imageUrl: "03-frog.png",
    name: "개구리",
    josa: 0,
  },
  {
    imageUrl: "06-butterfly.png",
    name: "나비",
    josa: 0,
  },
];

export type Gender = 'M' | 'F';
export type Kinship =
  | 'mother' | 'father'
  | 'maternal_grandfather' | 'paternal_grandfather'
  | 'maternal_grandmother' | 'paternal_grandmother'
  | 'older_brother' | 'older_sister'
  | 'younger_brother' | 'younger_sister'
  | 'husband' | 'wife'
  | 'paternal_uncle_older' | 'paternal_uncle_younger' | 'paternal_uncle'
  | 'maternal_uncle'
  | 'paternal_aunt_older' | 'paternal_aunt_younger' | 'paternal_aunt'
  | 'maternal_aunt'
  | 'self' | 'other';

export type FamilyGroup = 'parents' | 'grandparents' | 'siblings' | 'relatives';

export interface FamilyMemberOption {
  index: number;
  name: string;
  josa: number;
  kinship: Kinship;
  visibleFor: Gender[];
  group: FamilyGroup;
  maxCount?: number;
}

export const chooseFamily: FamilyMemberOption[] = [
  // 부모
  { index: 0,  name: "엄마",       josa: 0, kinship: "mother",                visibleFor: ["M","F"], group: "parents",      maxCount: 1 },
  { index: 1,  name: "아빠",       josa: 0, kinship: "father",                visibleFor: ["M","F"], group: "parents",      maxCount: 1 },

  // 배우자 (성별 기반)
  { index: 20, name: "아내",       josa: 0, kinship: "wife",                  visibleFor: ["M"],     group: "parents",      maxCount: 1 },
  { index: 21, name: "남편",       josa: 0, kinship: "husband",               visibleFor: ["F"],     group: "parents",      maxCount: 1 },

  // 조부모 (외/친 분리)
  { index: 2,  name: "외할아버지", josa: 0, kinship: "maternal_grandfather",  visibleFor: ["M","F"], group: "grandparents", maxCount: 1 },
  { index: 3,  name: "친할아버지", josa: 0, kinship: "paternal_grandfather",  visibleFor: ["M","F"], group: "grandparents", maxCount: 1 },
  { index: 4,  name: "외할머니",   josa: 0, kinship: "maternal_grandmother",  visibleFor: ["M","F"], group: "grandparents", maxCount: 1 },
  { index: 5,  name: "친할머니",   josa: 0, kinship: "paternal_grandmother",  visibleFor: ["M","F"], group: "grandparents", maxCount: 1 },

  // 형제자매 (성별 기반 표시)
  { index: 6,  name: "형",         josa: 1, kinship: "older_brother",         visibleFor: ["M"],     group: "siblings" },
  { index: 7,  name: "오빠",       josa: 0, kinship: "older_brother",         visibleFor: ["F"],     group: "siblings" },
  { index: 8,  name: "누나",       josa: 0, kinship: "older_sister",          visibleFor: ["M"],     group: "siblings" },
  { index: 9,  name: "언니",       josa: 0, kinship: "older_sister",          visibleFor: ["F"],     group: "siblings" },
  { index: 10, name: "남동생",     josa: 1, kinship: "younger_brother",       visibleFor: ["M","F"], group: "siblings" },
  { index: 11, name: "여동생",     josa: 1, kinship: "younger_sister",        visibleFor: ["M","F"], group: "siblings" },

  // 친척 (B-2에서 펼침 메뉴로 표시 예정. 데이터는 미리 추가)
  { index: 12, name: "큰아빠",     josa: 0, kinship: "paternal_uncle_older",  visibleFor: ["M","F"], group: "relatives" },
  { index: 13, name: "작은아빠",   josa: 0, kinship: "paternal_uncle_younger",visibleFor: ["M","F"], group: "relatives" },
  { index: 14, name: "삼촌",       josa: 0, kinship: "paternal_uncle",        visibleFor: ["M","F"], group: "relatives" },
  { index: 15, name: "외삼촌",     josa: 0, kinship: "maternal_uncle",        visibleFor: ["M","F"], group: "relatives" },
  { index: 16, name: "큰엄마",     josa: 0, kinship: "paternal_aunt_older",   visibleFor: ["M","F"], group: "relatives" },
  { index: 17, name: "작은엄마",   josa: 0, kinship: "paternal_aunt_younger", visibleFor: ["M","F"], group: "relatives" },
  { index: 18, name: "고모",       josa: 0, kinship: "paternal_aunt",         visibleFor: ["M","F"], group: "relatives" },
  { index: 19, name: "이모",       josa: 0, kinship: "maternal_aunt",         visibleFor: ["M","F"], group: "relatives" },
];

export const Family = [
  {
    index: 0,
    name: "엄마",
    josa: 0,
  },
  {
    index: 1,
    name: "아빠",
    josa: 0,
  },
  {
    index: 2,
    name: "할아버지",
    josa: 0,
  },
  {
    index: 3,
    name: "할머니",
    josa: 0,
  },
  {
    index: 4,
    name: "형",
    josa: 1,
  },
  {
    index: 5,
    name: "누나",
    josa: 0,
  },
  {
    index: 6,
    name: "오빠",
    josa: 0,
  },
  {
    index: 7,
    name: "언니",
    josa: 0,
  },
  {
    index: 8,
    name: "여동생",
    josa: 1,
  },
  {
    index: 9,
    name: "둘째 여동생",
    josa: 1,
  },
  {
    index: 10,
    name: "남동생",
    josa: 1,
  },
  {
    index: 11,
    name: "둘째 남동생",
    josa: 1,
  },
];

export const Animal = [
  {
    index: 0,
    name: "강아지",
    img: `${BASE}assets/images/Animal/01-puppy.png`,
    josa: 0,
    category: "victim",
  },
  {
    index: 1,
    name: "개",
    img: `${BASE}assets/images/Animal/02-dog.png`,
    josa: 0,
    category: "hope",
  },
  {
    index: 2,
    name: "개구리",
    img: `${BASE}assets/images/Animal/03-frog.png`,
    josa: 0,
    category: "victim",
  },
  {
    index: 3,
    name: "고슴도치",
    img: `${BASE}assets/images/Animal/04-hedgehog.png`,
    josa: 0,
    category: "victim",
  },
  {
    index: 4,
    name: "나비",
    img: `${BASE}assets/images/Animal/06-butterfly.png`,
    josa: 0,
    category: ["victim", "hope"],
  },
  {
    index: 5,
    name: "독수리",
    img: `${BASE}assets/images/Animal/08-eagle.png`,
    josa: 0,
    category: "abuser",
  },
  {
    index: 6,
    name: "돌고래",
    img: `${BASE}assets/images/Animal/10-dolphin.png`,
    josa: 0,
    category: "hope",
  },
  {
    index: 7,
    name: "돼지",
    img: `${BASE}assets/images/Animal/11-pig.png`,
    josa: 0,
    category: "abuser",
  },
  {
    index: 8,
    name: "병아리",
    img: `${BASE}assets/images/Animal/14-chick.png`,
    josa: 0,
    category: "victim",
  },
  {
    index: 9,
    name: "사자",
    img: `${BASE}assets/images/Animal/16-lion.png`,
    josa: 0,
    category: "abuser",
  },
  {
    index: 10,
    name: "상어",
    img: `${BASE}assets/images/Animal/17-shark.png`,
    josa: 0,
    category: "abuser",
  },
  {
    index: 11,
    name: "악어",
    img: `${BASE}assets/images/Animal/19-crocodile.png`,
    josa: 0,
    category: "abuser",
  },
  {
    index: 12,
    name: "알에서-나오는-병아리",
    img: `${BASE}assets/images/Animal/20-hatching-chick.png`,
    josa: 0,
    category: "victim",
  },
  {
    index: 13,
    name: "새",
    img: `${BASE}assets/images/Animal/22-bird.png`,
    josa: 0,
    category: "hope",
  },
  {
    index: 14,
    name: "젖소",
    img: `${BASE}assets/images/Animal/23-cow.png`,
    josa: 0,
    category: "hope",
  },
  {
    index: 15,
    name: "조개",
    img: `${BASE}assets/images/Animal/24-clam.png`,
    josa: 0,
    category: "victim",
  },
  {
    index: 16,
    name: "캥거루",
    img: `${BASE}assets/images/Animal/25-kangaroo.png`,
    josa: 0,
    category: "hope",
  },
  {
    index: 17,
    name: "코끼리",
    img: `${BASE}assets/images/Animal/26-elephant.png`,
    josa: 0,
    category: ["abuser", "hope"],
  },
  {
    index: 18,
    name: "코브라",
    img: `${BASE}assets/images/Animal/27-cobra.png`,
    josa: 0,
    category: "abuser",
  },
  {
    index: 19,
    name: "토끼",
    img: `${BASE}assets/images/Animal/28-rabbit.png`,
    josa: 0,
    category: "victim",
  },

  {
    index: 20,
    name: "호랑이",
    img: `${BASE}assets/images/Animal/30-tiger.png`,
    josa: 0,
    category: "abuser",
  },
  {
    index: 21,
    name: "흑표범",
    img: `${BASE}assets/images/Animal/31-panther.png`,
    josa: 1,
    category: "abuser",
  },
  {
    index: 22,
    name: "새끼팬더",
    img: `${BASE}assets/images/Animal/32-panda.png`,
    josa: 0,
    category: "hope",
  },
  {
    index: 23,
    name: "공룡",
    img: `${BASE}assets/images/Animal/05-dinosaur.png`,
    josa: 1,
    category: "abuser",
  },
  {
    index: 24,
    name: "도마뱀",
    img: `${BASE}assets/images/Animal/07-lizard.png`,
    josa: 1,
    category: "abuser",
  },
  {
    index: 25,
    name: "돌",
    img: `${BASE}assets/images/Animal/09-rock.png`,
    josa: 1,
    category: "victim",
  },
  {
    index: 26,
    name: "말",
    img: `${BASE}assets/images/Animal/12-horse.png`,
    josa: 1,
    category: "hope",
  },
  {
    index: 27,
    name: "불곰",
    img: `${BASE}assets/images/Animal/15-grizzly.png`,
    josa: 1,
    category: "abuser",
  },
  {
    index: 28,
    name: "새끼-양",
    img: `${BASE}assets/images/Animal/18-lamb.png`,
    josa: 1,
    category: ["victim", "hope"],
  },
  {
    index: 29,
    name: "양",
    img: `${BASE}assets/images/Animal/21-sheep.png`,
    josa: 1,
    category: ["victim", "hope"],
  },
  {
    index: 32,
    name: "버팔로",
    img: `${BASE}assets/images/Animal/33-buffalo.png`,
    josa: 0,
    category: "hope",
  },
  {
    index: 35,
    name: "여우",
    img: `${BASE}assets/images/Animal/35-fox.png`,
    josa: 0,
    category: "abuser",
  },
];
