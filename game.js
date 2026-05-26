'use strict';

// ===== Audio =====
const SOUND_SAVE_KEY = 'barTycoon_sound';

const soundSettings = {
  bgm:    true,
  sfx:    true,
  volume: 0.5,
};

const BGM_TRACKS = [
  'sounds/bgm_1.mp3',
  'sounds/bgm_2.wav',
  'sounds/bgm_3.wav',
  'sounds/bgm_4.wav',
  'sounds/bgm_5.mp3',
];
let bgmAudio = new Audio(BGM_TRACKS[0]);
bgmAudio.loop = true;
let currentBgmIndex = 0;

const sfxTapPool = Array.from({ length: 3 }, () => new Audio('sounds/glasstap_2.wav'));
let   sfxTapIdx  = 0;
const sfxSpend   = new Audio('sounds/coinuse.wav');

let bgmStarted = false;

function loadSoundSettings() {
  try {
    const raw = localStorage.getItem(SOUND_SAVE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      soundSettings.bgm    = s.bgm    ?? true;
      soundSettings.sfx    = s.sfx    ?? true;
      soundSettings.volume = s.volume ?? 0.5;
    }
  } catch (e) { /* ignore */ }
  applyAudioSettings();
}

function saveSoundSettings() {
  try { localStorage.setItem(SOUND_SAVE_KEY, JSON.stringify(soundSettings)); } catch (e) { /* ignore */ }
}

function applyAudioSettings() {
  bgmAudio.volume = soundSettings.volume;
  if (soundSettings.bgm) {
    if (bgmStarted && bgmAudio.paused) bgmAudio.play().catch(() => {});
  } else {
    bgmAudio.pause();
  }
}

function tryStartBGM() {
  if (bgmStarted || !soundSettings.bgm) return;
  bgmStarted = true;
  bgmAudio.play().catch(() => { bgmStarted = false; });
}

function duckBGM(on) {
  bgmAudio.volume = on ? soundSettings.volume * 0.25 : soundSettings.volume;
}

function switchBGM(rank) {
  const idx = rank - 1;
  if (idx === currentBgmIndex) return;
  currentBgmIndex = idx;
  bgmAudio.pause();
  bgmAudio = new Audio(BGM_TRACKS[idx] ?? BGM_TRACKS[0]);
  bgmAudio.loop = true;
  bgmAudio.volume = soundSettings.volume;
  if (bgmStarted && soundSettings.bgm) bgmAudio.play().catch(() => {});
}

function playTapSFX() {
  if (!soundSettings.sfx) return;
  const a = sfxTapPool[sfxTapIdx++ % sfxTapPool.length];
  a.volume = soundSettings.volume;
  a.currentTime = 0;
  a.play().catch(() => {});
}

function playSFX(src) {
  if (!soundSettings.sfx) return;
  const a = src === 'sounds/coinuse.wav' ? sfxSpend : new Audio(src);
  if (src === 'sounds/coinuse.wav') a.currentTime = 0;
  a.volume = soundSettings.volume;
  a.play().catch(() => {});
}

// ===== Game State =====
const state = {
  money: 0,
  totalEarned: 0,
  clickPower: 1,
  incomePerSec: 0,
  totalClicks: 0,
  buyMode: 1,        // 1 | 10 | 'max'
  barPoints: 0,
  totalBarPoints: 0,
  rebirthCount: 0,
  kanbanOwned:    [],   // 取得済み看板娘IDリスト
  kanbanSelected: '',   // 表示する看板娘ID（''=最新）
};

// ===== Achievements =====
const ACHIEVEMENTS = [
  // ── クリック数 ──
  {
    id: 'first_order',
    name: '初めての注文',
    desc: 'カクテルを1回作る',
    icon: '<img src="images/achievements_1.png" style="width:100%;height:100%;object-fit:contain;">',
    unlocked: false,
    check: () => state.totalClicks >= 1,
  },
  {
    id: 'clicks_100',
    name: '100回目の注文',
    desc: 'カクテルを100回作る',
    icon: '<img src="images/achievements_2.png" style="width:100%;height:100%;object-fit:contain;">',
    unlocked: false,
    check: () => state.totalClicks >= 100,
  },
  {
    id: 'clicks_1000',
    name: '1000回目の注文',
    desc: 'カクテルを1,000回作る',
    icon: '<img src="images/achievements_3.png" style="width:100%;height:100%;object-fit:contain;">',
    unlocked: false,
    check: () => state.totalClicks >= 1000,
  },
  {
    id: 'clicks_10000',
    name: '一万杯の夜',
    desc: 'カクテルを10,000回作る',
    icon: '<img src="images/achievements_4.png" style="width:100%;height:100%;object-fit:contain;">',
    unlocked: false,
    check: () => state.totalClicks >= 10000,
  },
  {
    id: 'clicks_100000',
    name: '伝説のカクテル職人',
    desc: 'カクテルを100,000回作る',
    icon: '<img src="images/achievements_5.png" style="width:100%;height:100%;object-fit:contain;">',
    unlocked: false,
    check: () => state.totalClicks >= 100000,
  },

  // ── 総収入 ──
  {
    id: 'earned_1k',
    name: '最初の千円',
    desc: '累計¥1,000を稼ぐ',
    icon: '<img src="images/achievements_6.png" style="width:100%;height:100%;object-fit:contain;">',
    unlocked: false,
    check: () => state.totalEarned >= 1000,
  },
  {
    id: 'earned_1m',
    name: '百万の夢',
    desc: '累計¥1,000,000を稼ぐ',
    icon: '<img src="images/achievements_7.png" style="width:100%;height:100%;object-fit:contain;">',
    unlocked: false,
    check: () => state.totalEarned >= 1_000_000,
  },
  {
    id: 'earned_100m',
    name: '億万長者',
    desc: '累計¥100,000,000を稼ぐ',
    icon: '<img src="images/achievements_8.png" style="width:100%;height:100%;object-fit:contain;">',
    unlocked: false,
    check: () => state.totalEarned >= 100_000_000,
  },
  {
    id: 'earned_1b',
    name: 'バー界の帝王',
    desc: '累計¥1,000,000,000を稼ぐ',
    icon: '<img src="images/achievements_9.png" style="width:100%;height:100%;object-fit:contain;">',
    unlocked: false,
    check: () => state.totalEarned >= 1_000_000_000,
  },

  // ── 自動収入 ──
  {
    id: 'income_1',
    name: '自動化の夜明け',
    desc: '自動収入を¥1/秒以上にする',
    icon: '<img src="images/achievements_10.png" style="width:100%;height:100%;object-fit:contain;">',
    unlocked: false,
    check: () => state.incomePerSec >= 1,
  },
  {
    id: 'income_100',
    name: '繁盛バー',
    desc: '自動収入を¥100/秒以上にする',
    icon: '<img src="images/achievements_11.png" style="width:100%;height:100%;object-fit:contain;">',
    unlocked: false,
    check: () => state.incomePerSec >= 100,
  },
  {
    id: 'income_10000',
    name: 'バー帝国',
    desc: '自動収入を¥10,000/秒以上にする',
    icon: '<img src="images/achievements_12.png" style="width:100%;height:100%;object-fit:contain;">',
    unlocked: false,
    check: () => state.incomePerSec >= 10000,
  },
  {
    id: 'income_1m',
    name: '百万の流れ',
    desc: '自動収入を¥1,000,000/秒以上にする',
    icon: '<img src="images/achievements_13.png" style="width:100%;height:100%;object-fit:contain;">',
    unlocked: false,
    check: () => state.incomePerSec >= 1_000_000,
  },
  {
    id: 'income_1b',
    name: '億の奔流',
    desc: '自動収入を¥1,000,000,000/秒以上にする',
    icon: '<img src="images/achievements_14.png" style="width:100%;height:100%;object-fit:contain;">',
    unlocked: false,
    check: () => state.incomePerSec >= 1_000_000_000,
  },

  // ── スタッフ雇用 ──
  {
    id: 'first_hire',
    name: '初めての雇用',
    desc: 'バイトくんを1人雇う',
    icon: '<img src="images/achievements_15.png" style="width:100%;height:100%;object-fit:contain;">',
    unlocked: false,
    check: () => (BARTENDERS.find(b => b.id === 'trainee')?.owned ?? 0) >= 1,
  },
  {
    id: 'hire_bartender',
    name: 'プロ採用',
    desc: 'バーテンダーを1人雇う',
    icon: '<img src="images/achievements_16.png" style="width:100%;height:100%;object-fit:contain;">',
    unlocked: false,
    check: () => (BARTENDERS.find(b => b.id === 'bartender')?.owned ?? 0) >= 1,
  },
  {
    id: 'hire_sommelier',
    name: 'ソムリエの称号',
    desc: 'ソムリエを1人雇う',
    icon: '<img src="images/achievements_17.png" style="width:100%;height:100%;object-fit:contain;">',
    unlocked: false,
    check: () => (BARTENDERS.find(b => b.id === 'sommelier')?.owned ?? 0) >= 1,
  },
  {
    id: 'hire_mixologist',
    name: '科学のカクテル',
    desc: 'ミクソロジストを1人雇う',
    icon: '<img src="images/achievements_18.png" style="width:100%;height:100%;object-fit:contain;">',
    unlocked: false,
    check: () => (BARTENDERS.find(b => b.id === 'mixologist')?.owned ?? 0) >= 1,
  },
  {
    id: 'hire_celebrity',
    name: 'スターを口説いた',
    desc: 'セレブバーテンダーを1人雇う',
    icon: '<img src="images/achievements_19.png" style="width:100%;height:100%;object-fit:contain;">',
    unlocked: false,
    check: () => (BARTENDERS.find(b => b.id === 'celebrity')?.owned ?? 0) >= 1,
  },
  {
    id: 'hire_michelin',
    name: 'ミシュランの星',
    desc: 'ミシュランシェフを1人雇う',
    icon: '<img src="images/achievements_20.png" style="width:100%;height:100%;object-fit:contain;">',
    unlocked: false,
    check: () => (BARTENDERS.find(b => b.id === 'michelin')?.owned ?? 0) >= 1,
  },
  {
    id: 'hire_owner',
    name: '経営者の仲間入り',
    desc: 'バーオーナーを1人雇う',
    icon: '<img src="images/achievements_21.png" style="width:100%;height:100%;object-fit:contain;">',
    unlocked: false,
    check: () => (BARTENDERS.find(b => b.id === 'owner')?.owned ?? 0) >= 1,
  },
  {
    id: 'hire_ceo',
    name: '業界の覇者',
    desc: 'フランチャイズ王を1人雇う',
    icon: '<img src="images/achievements_22.png" style="width:100%;height:100%;object-fit:contain;">',
    unlocked: false,
    check: () => (BARTENDERS.find(b => b.id === 'ceo')?.owned ?? 0) >= 1,
  },
  {
    id: 'hire_cocktail_god',
    name: '神の一滴',
    desc: 'カクテルの神を1人雇う',
    icon: '<img src="images/achievements_23.png" style="width:100%;height:100%;object-fit:contain;">',
    unlocked: false,
    check: () => (BARTENDERS.find(b => b.id === 'cocktail_god')?.owned ?? 0) >= 1,
  },
  {
    id: 'hire_bar_deity',
    name: 'バーの神様に出会った',
    desc: 'バーの神様を1人雇う',
    icon: '<img src="images/achievements_24.png" style="width:100%;height:100%;object-fit:contain;">',
    unlocked: false,
    check: () => (BARTENDERS.find(b => b.id === 'bar_deity')?.owned ?? 0) >= 1,
  },
  {
    id: 'super_trainee',
    name: 'スーパーバイトくん',
    desc: 'バイトくんを100人雇う',
    icon: '<img src="images/achievements_25.png" style="width:100%;height:100%;object-fit:contain;">',
    unlocked: false,
    check: () => (BARTENDERS.find(b => b.id === 'trainee')?.owned ?? 0) >= 100,
  },

  // ── メニュー強化 ──
  {
    id: 'first_upgrade',
    name: '最初の強化',
    desc: 'メニューを初めて強化する',
    icon: '<img src="images/achievements_26.png" style="width:100%;height:100%;object-fit:contain;">',
    unlocked: false,
    check: () => UPGRADES.some(u => u.level >= 1),
  },
  {
    id: 'all_max',
    name: 'パーフェクトバー',
    desc: '全メニューをMAXにする',
    icon: '<img src="images/achievements_27.png" style="width:100%;height:100%;object-fit:contain;">',
    unlocked: false,
    check: () => UPGRADES.every(u => u.level >= u.maxLevel),
  },
  {
    id: 'rank5',
    name: '伝説のバー',
    desc: '自動収入¥700,000/秒を達成してグラスをRank5に解放する',
    icon: '<img src="images/achievements_28.png" style="width:100%;height:100%;object-fit:contain;">',
    unlocked: false,
    check: () => state.incomePerSec >= 700000,
  },

  // ── スタッフ強化 ──
  {
    id: 'staff_first',
    name: '初めての育成',
    desc: 'スタッフ強化を1つ購入する',
    icon: '<img src="images/achievements_29.png" style="width:100%;height:100%;object-fit:contain;">',
    unlocked: false,
    check: () => STAFF_UPGRADES.some(u => u.purchased),
  },
  {
    id: 'staff_trainee_max',
    name: '伝説のバイト軍団',
    desc: 'バイトくんのスタッフ強化を全て解放する',
    icon: '<img src="images/achievements_30.png" style="width:100%;height:100%;object-fit:contain;">',
    unlocked: false,
    check: () => STAFF_UPGRADES.filter(u => u.bartenderId === 'trainee').every(u => u.purchased),
  },
  {
    id: 'staff_bartender_max',
    name: 'グランドマスター誕生',
    desc: 'バーテンダーのスタッフ強化を全て解放する',
    icon: '<img src="images/achievements_31.png" style="width:100%;height:100%;object-fit:contain;">',
    unlocked: false,
    check: () => STAFF_UPGRADES.filter(u => u.bartenderId === 'bartender').every(u => u.purchased),
  },
  {
    id: 'staff_sommelier_max',
    name: 'ワインの神',
    desc: 'ソムリエのスタッフ強化を全て解放する',
    icon: '<img src="images/achievements_32.png" style="width:100%;height:100%;object-fit:contain;">',
    unlocked: false,
    check: () => STAFF_UPGRADES.filter(u => u.bartenderId === 'sommelier').every(u => u.purchased),
  },
  {
    id: 'staff_mixologist_max',
    name: '錬金術師',
    desc: 'ミクソロジストのスタッフ強化を全て解放する',
    icon: '<img src="images/achievements_33.png" style="width:100%;height:100%;object-fit:contain;">',
    unlocked: false,
    check: () => STAFF_UPGRADES.filter(u => u.bartenderId === 'mixologist').every(u => u.purchased),
  },
  {
    id: 'staff_celebrity_max',
    name: 'ゴッドセレブ',
    desc: 'セレブバーテンダーのスタッフ強化を全て解放する',
    icon: '<img src="images/achievements_34.png" style="width:100%;height:100%;object-fit:contain;">',
    unlocked: false,
    check: () => STAFF_UPGRADES.filter(u => u.bartenderId === 'celebrity').every(u => u.purchased),
  },
  {
    id: 'staff_michelin_max',
    name: 'ミシュラン三つ星の誇り',
    desc: 'ミシュランシェフのスタッフ強化を全て解放する',
    icon: '<img src="images/achievements_35.png" style="width:100%;height:100%;object-fit:contain;">',
    unlocked: false,
    check: () => STAFF_UPGRADES.filter(u => u.bartenderId === 'michelin').every(u => u.purchased),
  },
  {
    id: 'staff_owner_max',
    name: '帝国のオーナー',
    desc: 'バーオーナーのスタッフ強化を全て解放する',
    icon: '<img src="images/achievements_36.png" style="width:100%;height:100%;object-fit:contain;">',
    unlocked: false,
    check: () => STAFF_UPGRADES.filter(u => u.bartenderId === 'owner').every(u => u.purchased),
  },
  {
    id: 'staff_ceo_max',
    name: '世界制覇',
    desc: 'フランチャイズ王のスタッフ強化を全て解放する',
    icon: '<img src="images/achievements_37.png" style="width:100%;height:100%;object-fit:contain;">',
    unlocked: false,
    check: () => STAFF_UPGRADES.filter(u => u.bartenderId === 'ceo').every(u => u.purchased),
  },
  {
    id: 'staff_cocktail_god_max',
    name: '究極の調合',
    desc: 'カクテルの神のスタッフ強化を全て解放する',
    icon: '<img src="images/achievements_38.png" style="width:100%;height:100%;object-fit:contain;">',
    unlocked: false,
    check: () => STAFF_UPGRADES.filter(u => u.bartenderId === 'cocktail_god').every(u => u.purchased),
  },
  {
    id: 'staff_bar_deity_max',
    name: '酒神の奇跡',
    desc: 'バーの神様のスタッフ強化を全て解放する',
    icon: '<img src="images/achievements_39.png" style="width:100%;height:100%;object-fit:contain;">',
    unlocked: false,
    check: () => STAFF_UPGRADES.filter(u => u.bartenderId === 'bar_deity').every(u => u.purchased),
  },
  {
    id: 'staff_all_max',
    name: '最強のバー',
    desc: '全スタッフ強化を解放する',
    icon: '<img src="images/achievements_40.png" style="width:100%;height:100%;object-fit:contain;">',
    unlocked: false,
    check: () => STAFF_UPGRADES.every(u => u.purchased),
  },

  // ── 転生 ──
  {
    id: 'rebirth_1',
    name: '生まれ変わり',
    desc: '初めて転生する',
    icon: '<img src="images/achievements_41.png" style="width:100%;height:100%;object-fit:contain;">',
    unlocked: false,
    check: () => state.rebirthCount >= 1,
  },
  {
    id: 'rebirth_5',
    name: '輪廻の修行',
    desc: '5回転生する',
    icon: '<img src="images/achievements_42.png" style="width:100%;height:100%;object-fit:contain;">',
    unlocked: false,
    check: () => state.rebirthCount >= 5,
  },
  {
    id: 'rebirth_10',
    name: '転生マスター',
    desc: '10回転生する',
    icon: '<img src="images/achievements_43.png" style="width:100%;height:100%;object-fit:contain;">',
    unlocked: false,
    check: () => state.rebirthCount >= 10,
  },
  {
    id: 'rebirth_50',
    name: '永遠のバーテンダー',
    desc: '50回転生する',
    icon: '<img src="images/achievements_44.png" style="width:100%;height:100%;object-fit:contain;">',
    unlocked: false,
    check: () => state.rebirthCount >= 50,
  },

  // ── 看板娘 ──
  {
    id: 'kanban_get_1',
    name: '看板娘登場',
    desc: '看板娘1を取得する',
    icon: '<img src="images/achievements_45.png" style="width:100%;height:100%;object-fit:contain;">',
    unlocked: false,
    check: () => state.kanbanOwned.includes('kanban_1'),
  },
  {
    id: 'kanban_get_2',
    name: '二人目の看板娘',
    desc: '看板娘2を取得する',
    icon: '<img src="images/achievements_46.png" style="width:100%;height:100%;object-fit:contain;">',
    unlocked: false,
    check: () => state.kanbanOwned.includes('kanban_2'),
  },
  {
    id: 'kanban_get_3',
    name: '三人目の看板娘',
    desc: '看板娘3を取得する',
    icon: '<img src="images/achievements_47.png" style="width:100%;height:100%;object-fit:contain;">',
    unlocked: false,
    check: () => state.kanbanOwned.includes('kanban_3'),
  },
  {
    id: 'kanban_get_4',
    name: '看板娘コンプリート',
    desc: '看板娘4を取得する',
    icon: '<img src="images/achievements_48.png" style="width:100%;height:100%;object-fit:contain;">',
    unlocked: false,
    check: () => state.kanbanOwned.includes('kanban_4'),
  },
];

// ===== Kanban Girls =====
const KANBAN_GIRLS = [
  { id: 'kanban_1', name: '看板娘1', img: 'images/thepostergirl_1.png', cost: 0,                minRank: 2, auto: true  },
  { id: 'kanban_2', name: '看板娘2', img: 'images/thepostergirl_2.png', cost: 100000000,        minRank: 3, auto: false },
  { id: 'kanban_3', name: '看板娘3', img: 'images/thepostergirl_3.png', cost: 1000000000000,    minRank: 4, auto: false },
  { id: 'kanban_4', name: '看板娘4', img: 'images/thepostergirl_4.png', cost: 1000000000000000, minRank: 4, auto: false },
];

// ===== Bartenders (auto income) =====
const BARTENDERS = [
  {
    id: 'trainee',
    name: 'バイトくん',
    icon: '<img src="images/bartender_1.png" style="width:100%;height:100%;object-fit:contain;">',
    desc: '+{income}/秒',
    baseCost: 25,
    baseIncome: 1,
    owned: 0,
    costMultiplier: 1.45,
  },
  {
    id: 'bartender',
    name: 'バーテンダー',
    icon: '<img src="images/bartender_2.png" style="width:100%;height:100%;object-fit:contain;">',
    desc: '+{income}/秒',
    baseCost: 400,
    baseIncome: 7,
    owned: 0,
    costMultiplier: 1.5,
  },
  {
    id: 'sommelier',
    name: 'ソムリエ',
    icon: '<img src="images/bartender_3.png" style="width:100%;height:100%;object-fit:contain;">',
    desc: '+{income}/秒',
    baseCost: 6000,
    baseIncome: 80,
    owned: 0,
    costMultiplier: 1.55,
  },
  {
    id: 'mixologist',
    name: 'ミクソロジスト',
    icon: '<img src="images/bartender_4.png" style="width:100%;height:100%;object-fit:contain;">',
    desc: '+{income}/秒',
    baseCost: 100000,
    baseIncome: 600,
    owned: 0,
    costMultiplier: 1.6,
  },
  {
    id: 'celebrity',
    name: 'セレブバーテンダー',
    icon: '<img src="images/bartender_5.png" style="width:100%;height:100%;object-fit:contain;">',
    desc: '+{income}/秒',
    baseCost: 1500000,
    baseIncome: 3000,
    owned: 0,
    costMultiplier: 1.65,
  },
  {
    id: 'michelin',
    name: 'ミシュランシェフ',
    icon: '<img src="images/bartender_6.png" style="width:100%;height:100%;object-fit:contain;">',
    desc: '+{income}/秒',
    baseCost: 20000000,
    baseIncome: 20000,
    owned: 0,
    costMultiplier: 1.7,
  },
  {
    id: 'owner',
    name: 'バーオーナー',
    icon: '<img src="images/bartender_7.png" style="width:100%;height:100%;object-fit:contain;">',
    desc: '+{income}/秒',
    baseCost: 300000000,
    baseIncome: 160000,
    owned: 0,
    costMultiplier: 1.75,
  },
  {
    id: 'ceo',
    name: 'フランチャイズ王',
    icon: '<img src="images/bartender_8.png" style="width:100%;height:100%;object-fit:contain;">',
    desc: '+{income}/秒',
    baseCost: 5000000000,
    baseIncome: 1300000,
    owned: 0,
    costMultiplier: 1.8,
  },
  {
    id: 'cocktail_god',
    name: 'カクテルの神',
    icon: '<img src="images/bartender_9.png" style="width:100%;height:100%;object-fit:contain;">',
    desc: '+{income}/秒',
    baseCost: 80000000000,
    baseIncome: 11000000,
    owned: 0,
    costMultiplier: 1.85,
  },
  {
    id: 'bar_deity',
    name: 'バーの神様',
    icon: '<img src="images/bartender_10.png" style="width:100%;height:100%;object-fit:contain;">',
    desc: '+{income}/秒',
    baseCost: 1500000000000,
    baseIncome: 90000000,
    owned: 0,
    costMultiplier: 1.9,
  },
];

// ===== Menu Upgrades (click power) =====
const UPGRADES = [
  {
    id: 'shaker',
    name: 'シェイカー購入',
    icon: '<img src="images/menuup_1.png" style="width:100%;height:100%;object-fit:contain;">',
    desc: 'クリック収入 +{bonus}/回',
    cost: 100,
    clickBonus: 2,
    maxLevel: 10,
    level: 0,
  },
  {
    id: 'recipe',
    name: 'カクテルレシピ',
    icon: '<img src="images/menuup_2.png" style="width:100%;height:100%;object-fit:contain;">',
    desc: 'クリック収入 +{bonus}/回',
    cost: 800,
    clickBonus: 10,
    maxLevel: 10,
    level: 0,
  },
  {
    id: 'premium_spirits',
    name: 'プレミアムスピリッツ',
    icon: '<img src="images/menuup_3.png" style="width:100%;height:100%;object-fit:contain;">',
    desc: 'クリック収入 +{bonus}/回',
    cost: 8000,
    clickBonus: 60,
    maxLevel: 10,
    level: 0,
  },
  {
    id: 'signature',
    name: 'シグネチャーカクテル',
    icon: '<img src="images/menuup_4.png" style="width:100%;height:100%;object-fit:contain;">',
    desc: 'クリック収入 +{bonus}/回',
    cost: 80000,
    clickBonus: 400,
    maxLevel: 10,
    level: 0,
  },
  {
    id: 'vip_menu',
    name: 'VIPメニュー',
    icon: '<img src="images/menuup_5.png" style="width:100%;height:100%;object-fit:contain;">',
    desc: 'クリック収入 +{bonus}/回',
    cost: 1000000,
    clickBonus: 3000,
    maxLevel: 3,
    level: 0,
  },
];

// ===== Staff Upgrades (bartender multipliers) =====
const STAFF_UPGRADES = [
  // バイトくん
  { id: 'trainee_1', bartenderId: 'trainee', name: 'バイトリーダー',    icon: '<img src="images/bartenderup_1.png" style="width:100%;height:100%;object-fit:contain;">', desc: 'バイトくん収入 ×2', cost: 2000,         multiplier: 2, purchased: false },
  { id: 'trainee_2', bartenderId: 'trainee', name: 'ベテランバイト',    icon: '<img src="images/bartenderup_1.png" style="width:100%;height:100%;object-fit:contain;">', desc: 'バイトくん収入 ×3', cost: 20000,        multiplier: 3, purchased: false, requires: 'trainee_1' },
  { id: 'trainee_3', bartenderId: 'trainee', name: 'レジェンドバイト',  icon: '<img src="images/bartenderup_1.png" style="width:100%;height:100%;object-fit:contain;">', desc: 'バイトくん収入 ×5', cost: 200000,       multiplier: 5, purchased: false, requires: 'trainee_2' },
  // バーテンダー
  { id: 'bartender_1', bartenderId: 'bartender', name: '熟練バーテンダー',    icon: '<img src="images/bartenderup_2.png" style="width:100%;height:100%;object-fit:contain;">', desc: 'バーテンダー収入 ×2', cost: 15000,      multiplier: 2, purchased: false },
  { id: 'bartender_2', bartenderId: 'bartender', name: 'マスターバーテンダー', icon: '<img src="images/bartenderup_2.png" style="width:100%;height:100%;object-fit:contain;">', desc: 'バーテンダー収入 ×3', cost: 150000,     multiplier: 3, purchased: false, requires: 'bartender_1' },
  { id: 'bartender_3', bartenderId: 'bartender', name: 'グランドマスター',     icon: '<img src="images/bartenderup_2.png" style="width:100%;height:100%;object-fit:contain;">', desc: 'バーテンダー収入 ×5', cost: 1500000,    multiplier: 5, purchased: false, requires: 'bartender_2' },
  // ソムリエ
  { id: 'sommelier_1', bartenderId: 'sommelier', name: 'ファーストソムリエ',  icon: '<img src="images/bartenderup_3.png" style="width:100%;height:100%;object-fit:contain;">', desc: 'ソムリエ収入 ×2', cost: 150000,      multiplier: 2, purchased: false },
  { id: 'sommelier_2', bartenderId: 'sommelier', name: 'グランソムリエ',      icon: '<img src="images/bartenderup_3.png" style="width:100%;height:100%;object-fit:contain;">', desc: 'ソムリエ収入 ×3', cost: 1500000,     multiplier: 3, purchased: false, requires: 'sommelier_1' },
  { id: 'sommelier_3', bartenderId: 'sommelier', name: 'マスターソムリエ',    icon: '<img src="images/bartenderup_3.png" style="width:100%;height:100%;object-fit:contain;">', desc: 'ソムリエ収入 ×5', cost: 15000000,    multiplier: 5, purchased: false, requires: 'sommelier_2' },
  // ミクソロジスト
  { id: 'mixologist_1', bartenderId: 'mixologist', name: 'シニアミクソロジスト', icon: '<img src="images/bartenderup_4.png" style="width:100%;height:100%;object-fit:contain;">', desc: 'ミクソロジスト収入 ×2', cost: 1500000,    multiplier: 2, purchased: false },
  { id: 'mixologist_2', bartenderId: 'mixologist', name: 'チーフミクソロジスト', icon: '<img src="images/bartenderup_4.png" style="width:100%;height:100%;object-fit:contain;">', desc: 'ミクソロジスト収入 ×3', cost: 15000000,   multiplier: 3, purchased: false, requires: 'mixologist_1' },
  { id: 'mixologist_3', bartenderId: 'mixologist', name: 'ヘッドミクソロジスト', icon: '<img src="images/bartenderup_4.png" style="width:100%;height:100%;object-fit:contain;">', desc: 'ミクソロジスト収入 ×5', cost: 150000000,  multiplier: 5, purchased: false, requires: 'mixologist_2' },
  // セレブバーテンダー
  { id: 'celebrity_1', bartenderId: 'celebrity', name: 'ダブルセレブ',   icon: '<img src="images/bartenderup_5.png" style="width:100%;height:100%;object-fit:contain;">', desc: 'セレブ収入 ×2', cost: 15000000,     multiplier: 2, purchased: false },
  { id: 'celebrity_2', bartenderId: 'celebrity', name: 'トリプルセレブ', icon: '<img src="images/bartenderup_5.png" style="width:100%;height:100%;object-fit:contain;">', desc: 'セレブ収入 ×3', cost: 150000000,    multiplier: 3, purchased: false, requires: 'celebrity_1' },
  { id: 'celebrity_3', bartenderId: 'celebrity', name: 'ゴッドセレブ',   icon: '<img src="images/bartenderup_5.png" style="width:100%;height:100%;object-fit:contain;">', desc: 'セレブ収入 ×5', cost: 1500000000,   multiplier: 5, purchased: false, requires: 'celebrity_2' },
  // ミシュランシェフ
  { id: 'michelin_1', bartenderId: 'michelin', name: 'ミシュラン一つ星', icon: '<img src="images/bartenderup_6.png" style="width:100%;height:100%;object-fit:contain;">', desc: 'ミシュランシェフ収入 ×2', cost: 200000000,       multiplier: 2, purchased: false },
  { id: 'michelin_2', bartenderId: 'michelin', name: 'ミシュラン二つ星', icon: '<img src="images/bartenderup_6.png" style="width:100%;height:100%;object-fit:contain;">', desc: 'ミシュランシェフ収入 ×3', cost: 2000000000,      multiplier: 3, purchased: false, requires: 'michelin_1' },
  { id: 'michelin_3', bartenderId: 'michelin', name: 'ミシュラン三つ星', icon: '<img src="images/bartenderup_6.png" style="width:100%;height:100%;object-fit:contain;">', desc: 'ミシュランシェフ収入 ×5', cost: 20000000000,     multiplier: 5, purchased: false, requires: 'michelin_2' },
  // バーオーナー
  { id: 'owner_1', bartenderId: 'owner', name: '支配人',     icon: '<img src="images/bartenderup_7.png" style="width:100%;height:100%;object-fit:contain;">', desc: 'バーオーナー収入 ×2', cost: 3000000000,       multiplier: 2, purchased: false },
  { id: 'owner_2', bartenderId: 'owner', name: 'GMオーナー', icon: '<img src="images/bartenderup_7.png" style="width:100%;height:100%;object-fit:contain;">', desc: 'バーオーナー収入 ×3', cost: 30000000000,      multiplier: 3, purchased: false, requires: 'owner_1' },
  { id: 'owner_3', bartenderId: 'owner', name: '帝国オーナー', icon: '<img src="images/bartenderup_7.png" style="width:100%;height:100%;object-fit:contain;">', desc: 'バーオーナー収入 ×5', cost: 300000000000,     multiplier: 5, purchased: false, requires: 'owner_2' },
  // フランチャイズ王
  { id: 'ceo_1', bartenderId: 'ceo', name: 'リージョナルCEO', icon: '<img src="images/bartenderup_8.png" style="width:100%;height:100%;object-fit:contain;">', desc: 'フランチャイズ王収入 ×2', cost: 50000000000,      multiplier: 2, purchased: false },
  { id: 'ceo_2', bartenderId: 'ceo', name: 'グローバルCEO',   icon: '<img src="images/bartenderup_8.png" style="width:100%;height:100%;object-fit:contain;">', desc: 'フランチャイズ王収入 ×3', cost: 500000000000,     multiplier: 3, purchased: false, requires: 'ceo_1' },
  { id: 'ceo_3', bartenderId: 'ceo', name: '業界の覇王',       icon: '<img src="images/bartenderup_8.png" style="width:100%;height:100%;object-fit:contain;">', desc: 'フランチャイズ王収入 ×5', cost: 5000000000000,    multiplier: 5, purchased: false, requires: 'ceo_2' },
  // カクテルの神
  { id: 'cocktail_god_1', bartenderId: 'cocktail_god', name: '神の使い',     icon: '<img src="images/bartenderup_9.png" style="width:100%;height:100%;object-fit:contain;">', desc: 'カクテルの神収入 ×2', cost: 800000000000,     multiplier: 2, purchased: false },
  { id: 'cocktail_god_2', bartenderId: 'cocktail_god', name: '神の息吹',     icon: '<img src="images/bartenderup_9.png" style="width:100%;height:100%;object-fit:contain;">', desc: 'カクテルの神収入 ×3', cost: 8000000000000,    multiplier: 3, purchased: false, requires: 'cocktail_god_1' },
  { id: 'cocktail_god_3', bartenderId: 'cocktail_god', name: '神の調合',     icon: '<img src="images/bartenderup_9.png" style="width:100%;height:100%;object-fit:contain;">', desc: 'カクテルの神収入 ×5', cost: 80000000000000,   multiplier: 5, purchased: false, requires: 'cocktail_god_2' },
  // バーの神様
  { id: 'bar_deity_1', bartenderId: 'bar_deity', name: '酒神の恵み',   icon: '<img src="images/bartenderup_10.png" style="width:100%;height:100%;object-fit:contain;">', desc: 'バーの神様収入 ×2', cost: 15000000000000,    multiplier: 2, purchased: false },
  { id: 'bar_deity_2', bartenderId: 'bar_deity', name: '酒神の加護',   icon: '<img src="images/bartenderup_10.png" style="width:100%;height:100%;object-fit:contain;">', desc: 'バーの神様収入 ×3', cost: 150000000000000,   multiplier: 3, purchased: false, requires: 'bar_deity_1' },
  { id: 'bar_deity_3', bartenderId: 'bar_deity', name: '酒神の奇跡',   icon: '<img src="images/bartenderup_10.png" style="width:100%;height:100%;object-fit:contain;">', desc: 'バーの神様収入 ×5', cost: 1500000000000000,  multiplier: 5, purchased: false, requires: 'bar_deity_2' },
];

// ===== BAR Upgrades (prestige shop) =====
const BAR_UPGRADES = [
  // 全体収入系
  { id: 'bar_income_1', name: '酒蔵の開業',     icon: '<img src="images/barpoint_1.png" style="width:100%;height:100%;object-fit:contain;">', desc: '全体収入 ×2',   category: 'income', cost: 1,   multiplier: 2,    purchased: false },
  { id: 'bar_income_2', name: '繁盛の秘訣',     icon: '<img src="images/barpoint_2.png" style="width:100%;height:100%;object-fit:contain;">', desc: '全体収入 ×4',   category: 'income', cost: 5,   multiplier: 4,    purchased: false, requires: 'bar_income_1' },
  { id: 'bar_income_3', name: 'プレミアムバー', icon: '<img src="images/barpoint_3.png" style="width:100%;height:100%;object-fit:contain;">', desc: '全体収入 ×6',   category: 'income', cost: 15,  multiplier: 6,    purchased: false, requires: 'bar_income_2' },
  { id: 'bar_income_4', name: '5つ星の誇り',   icon: '<img src="images/barpoint_4.png" style="width:100%;height:100%;object-fit:contain;">', desc: '全体収入 ×8',   category: 'income', cost: 40,  multiplier: 8,    purchased: false, requires: 'bar_income_3' },
  { id: 'bar_income_5', name: 'バー帝国の頂',  icon: '<img src="images/barpoint_5.png" style="width:100%;height:100%;object-fit:contain;">', desc: '全体収入 ×10',  category: 'income', cost: 100, multiplier: 10,   purchased: false, requires: 'bar_income_4' },
  // クリック強化系
  { id: 'bar_click_1', name: '職人の手',        icon: '<img src="images/barpoint_6.png" style="width:100%;height:100%;object-fit:contain;">', desc: 'クリック収入 ×1.5', category: 'click', cost: 1,  multiplier: 1.5,  purchased: false },
  { id: 'bar_click_2', name: '匠の技',          icon: '<img src="images/barpoint_7.png" style="width:100%;height:100%;object-fit:contain;">', desc: 'クリック収入 ×2',   category: 'click', cost: 6,  multiplier: 2,    purchased: false, requires: 'bar_click_1' },
  { id: 'bar_click_3', name: '神の一手',        icon: '<img src="images/barpoint_8.png" style="width:100%;height:100%;object-fit:contain;">', desc: 'クリック収入 ×5',   category: 'click', cost: 20, multiplier: 5,    purchased: false, requires: 'bar_click_2' },
  { id: 'bar_click_4', name: '伝説の調合',      icon: '<img src="images/barpoint_9.png" style="width:100%;height:100%;object-fit:contain;">', desc: 'クリック収入 ×10',  category: 'click', cost: 60, multiplier: 10,   purchased: false, requires: 'bar_click_3' },
];

function barUpgradeUnlocked(u) {
  if (!u.requires) return true;
  return BAR_UPGRADES.find(x => x.id === u.requires)?.purchased ?? false;
}

function barIncomeMultiplier() {
  return BAR_UPGRADES
    .filter(u => u.category === 'income' && u.purchased)
    .reduce((m, u) => m * u.multiplier, 1);
}

function barClickMultiplier() {
  return BAR_UPGRADES
    .filter(u => u.category === 'click' && u.purchased)
    .reduce((m, u) => m * u.multiplier, 1);
}

function staffMultiplier(b) {
  return STAFF_UPGRADES
    .filter(u => u.bartenderId === b.id && u.purchased)
    .reduce((m, u) => m * u.multiplier, 1);
}

function staffUpgradeUnlocked(u) {
  if (!u.requires) return true;
  return STAFF_UPGRADES.find(x => x.id === u.requires)?.purchased ?? false;
}

// ===== Save / Load =====
const SAVE_KEY = 'barTycoon_v1';
const SAVE_INTERVAL_MS = 10000;

function saveGame() {
  if (isResetting) return;
  const data = {
    money:        state.money,
    totalEarned:  state.totalEarned,
    totalClicks:  state.totalClicks,
    savedAt:      Date.now(),
    bartenders:    BARTENDERS.map(b => ({ id: b.id, owned: b.owned })),
    upgrades:      UPGRADES.map(u => ({ id: u.id, level: u.level })),
    staffUpgrades: STAFF_UPGRADES.map(u => ({ id: u.id, purchased: u.purchased })),
    barUpgrades:   BAR_UPGRADES.map(u => ({ id: u.id, purchased: u.purchased })),
    achievements:  ACHIEVEMENTS.map(a => ({ id: a.id, unlocked: a.unlocked })),
    barPoints:     state.barPoints,
    totalBarPoints: state.totalBarPoints,
    rebirthCount:  state.rebirthCount,
    kanbanOwned:    state.kanbanOwned,
    kanbanSelected: state.kanbanSelected,
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) {
    // localStorage unavailable (private mode etc.) — silently ignore
  }
}

function loadGame() {
  let raw;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch (e) {
    return false;
  }
  if (!raw) return false;

  try {
    const data = JSON.parse(raw);

    state.money          = data.money          ?? 0;
    state.totalEarned    = data.totalEarned    ?? 0;
    state.totalClicks    = data.totalClicks    ?? 0;
    state.barPoints      = data.barPoints      ?? 0;
    state.totalBarPoints = data.totalBarPoints ?? 0;
    state.rebirthCount   = data.rebirthCount   ?? 0;
    state.kanbanOwned    = data.kanbanOwned    ?? [];
    state.kanbanSelected = data.kanbanSelected ?? '';

    (data.barUpgrades ?? []).forEach(saved => {
      const u = BAR_UPGRADES.find(x => x.id === saved.id);
      if (u) u.purchased = saved.purchased ?? false;
    });

    (data.achievements ?? []).forEach(saved => {
      const a = ACHIEVEMENTS.find(x => x.id === saved.id);
      if (a) a.unlocked = saved.unlocked ?? false;
    });

    (data.bartenders ?? []).forEach(saved => {
      const b = BARTENDERS.find(x => x.id === saved.id);
      if (b) b.owned = saved.owned ?? 0;
    });

    (data.upgrades ?? []).forEach(saved => {
      const u = UPGRADES.find(x => x.id === saved.id);
      if (u) u.level = Math.min(saved.level ?? 0, u.maxLevel);
    });

    (data.staffUpgrades ?? []).forEach(saved => {
      const u = STAFF_UPGRADES.find(x => x.id === saved.id);
      if (u) u.purchased = saved.purchased ?? false;
    });

    // Offline earnings: income × elapsed seconds (capped at 8 hours)
    if (data.savedAt) {
      recalcIncome();
      const elapsed = Math.min((Date.now() - data.savedAt) / 1000, 8 * 3600);
      if (elapsed > 0 && state.incomePerSec > 0) {
        const bonus = state.incomePerSec * elapsed;
        addMoney(bonus);
        saveGame();
        return { offlineBonus: bonus, elapsed };
      }
    }

    return true;
  } catch (e) {
    return false;
  }
}

let isResetting = false;

function resetGame() {
  isResetting = true;
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
  try { localStorage.removeItem(SOUND_SAVE_KEY); } catch (e) { /* ignore */ }
  location.reload();
}

// ===== Helpers =====
const fmt = n => {
  const fmtVal = (val, unit) => {
    const i = Math.floor(val);
    if (i >= 10000) return '¥' + i.toLocaleString('ja-JP') + unit;
    if (i >= 100)   return '¥' + val.toFixed(1) + unit;
    return '¥' + val.toFixed(2) + unit;
  };
  if (n >= 1e13) return fmtVal(Math.min(n / 1e12, 9999999999999), 'T');
  if (n >= 1e10) return fmtVal(n / 1e9, 'B');
  if (n >= 1e7)  return fmtVal(n / 1e6, 'M');
  if (n >= 1e3)  return fmtVal(n / 1e3, 'K');
  return '¥' + Math.floor(n).toLocaleString('ja-JP');
};

function bartenderCost(b) {
  return Math.floor(b.baseCost * Math.pow(b.costMultiplier, b.owned));
}

function upgradeCost(u) {
  return Math.floor(u.cost * Math.pow(2.2, u.level));
}

function recalcIncome() {
  state.incomePerSec = BARTENDERS.reduce((sum, b) => sum + b.baseIncome * b.owned * staffMultiplier(b), 0) * barIncomeMultiplier();
  updateGlassRank();
}

function recalcClickPower() {
  state.clickPower = (1 + UPGRADES.reduce((sum, u) => sum + u.clickBonus * u.level, 0)) * barClickMultiplier();
}

// ===== Glass Rank =====
const GLASS_RANKS = [
  { rank: 1, minIncome: 0,       label: 'Rank 1' },
  { rank: 2, minIncome: 1000,    label: 'Rank 2' },
  { rank: 3, minIncome: 20000,   label: 'Rank 3' },
  { rank: 4, minIncome: 150000,  label: 'Rank 4' },
  { rank: 5, minIncome: 700000,  label: 'Rank 5' },
];

let currentRank = 1;

function updateGlassRank() {
  let newRank = 1;
  for (const r of GLASS_RANKS) {
    if (state.incomePerSec >= r.minIncome) newRank = r.rank;
  }
  if (newRank === currentRank) return;

  currentRank = newRank;
  switchBGM(newRank);
  const img   = document.getElementById('glass-img');
  const badge = document.getElementById('rank-badge');

  img.src = `images/glass_${newRank}b.png`;
  document.getElementById('rank-bg').src = `images/backgraund_${newRank}.png`;
  img.classList.remove('rank-up');
  void img.offsetWidth;
  img.classList.add('rank-up');
  img.addEventListener('animationend', () => img.classList.remove('rank-up'), { once: true });

  badge.textContent = `Rank ${newRank}`;
  badge.className   = `rank-${newRank}`;
  showToast(`グラスが Rank ${newRank} にランクアップ！`);

  // 看板娘1はランク2到達時に自動取得
  if (newRank >= 2 && !state.kanbanOwned.includes('kanban_1')) {
    state.kanbanOwned.push('kanban_1');
    if (!state.kanbanSelected) state.kanbanSelected = 'kanban_1';
    updateKanbanDisplay();
    renderKanban();
    checkAchievements();
    showToast('看板娘1 が加わりました！');
  }
}

// ===== Kanban Display =====
function updateKanbanDisplay() {
  const img = document.getElementById('kanban-img');
  if (!img) return;
  const owned = KANBAN_GIRLS.filter(k => state.kanbanOwned.includes(k.id));
  if (owned.length === 0) {
    img.classList.remove('visible');
    return;
  }
  const selected = owned.find(k => k.id === state.kanbanSelected) ?? owned[owned.length - 1];
  img.src = selected.img;
  img.classList.add('visible');
}

function renderKanban() {
  const el = document.getElementById('kanban-list');
  if (!el) return;
  el.innerHTML = '';
  KANBAN_GIRLS.forEach(k => {
    const owned    = state.kanbanOwned.includes(k.id);
    const rankOk   = currentRank >= k.minRank;
    const canAfford = !owned && rankOk && (k.auto || state.money >= k.cost);
    const locked   = !owned && !rankOk;
    const card = document.createElement('div');
    card.className = 'shop-card' + (owned ? ' maxed' : canAfford ? ' affordable' : ' disabled');
    card.innerHTML = `
      <div class="card-icon"><img src="${k.img}" style="width:100%;height:100%;object-fit:contain;"></div>
      <div class="card-body">
        <div class="card-name">${k.name}</div>
        <div class="card-desc">${
          owned      ? '取得済み' :
          locked     ? `Rank ${k.minRank} 以上で解放` :
          k.auto     ? '自動取得（ランク2到達時）' :
                       `必要ランク: ${k.minRank} / 価格: ${fmt(k.cost)}`
        }</div>
      </div>
      <div class="card-right">
        ${owned
          ? '<div class="card-maxed-badge">取得済</div>'
          : locked
            ? '<div class="card-owned">🔒</div>'
            : k.auto
              ? '<div class="card-owned">無料</div>'
              : `<div class="card-cost">${fmt(k.cost)}</div>`
        }
      </div>`;
    if (!owned && !locked && !k.auto) {
      card.addEventListener('click', () => buyKanban(k));
    }
    el.appendChild(card);
  });
  renderKanbanSelector();
}

function renderKanbanSelector() {
  const section = document.getElementById('kanban-selector');
  const group   = document.getElementById('kanban-radio-group');
  if (!section || !group) return;
  const owned = KANBAN_GIRLS.filter(k => state.kanbanOwned.includes(k.id));
  if (owned.length === 0) {
    section.classList.add('hidden');
    return;
  }
  section.classList.remove('hidden');
  // 選択中IDが所持済みでなければ最新に初期化
  if (!owned.find(k => k.id === state.kanbanSelected)) {
    state.kanbanSelected = owned[owned.length - 1].id;
  }
  group.innerHTML = '';
  owned.forEach(k => {
    const label = document.createElement('label');
    label.className = 'kanban-radio-label';
    const radio = document.createElement('input');
    radio.type  = 'radio';
    radio.name  = 'kanban-display';
    radio.value = k.id;
    radio.checked = k.id === state.kanbanSelected;
    radio.addEventListener('change', () => {
      state.kanbanSelected = k.id;
      updateKanbanDisplay();
      saveGame();
    });
    label.appendChild(radio);
    label.append(k.name);
    group.appendChild(label);
  });
}

function buyKanban(k) {
  if (state.kanbanOwned.includes(k.id)) return;
  if (currentRank < k.minRank) { showToast(`Rank ${k.minRank} 以上が必要です`); return; }
  if (state.money < k.cost) { showToast('所持金が足りません'); return; }
  state.money -= k.cost;
  state.kanbanOwned.push(k.id);
  state.kanbanSelected = k.id;  // 新規購入時は自動でその娘を選択
  updateKanbanDisplay();
  renderKanban();
  renderHeader();
  checkAchievements();
  playSFX('sounds/coinuse.wav');
  showToast(`${k.name} が加わりました！`);
}

// ===== DOM Refs =====
const elMoney      = document.getElementById('money-amount');
const elIncomeSec  = document.getElementById('income-per-sec');
const elPerClick   = document.getElementById('per-click-value');
const elGlass      = document.getElementById('cocktail-glass');
const elFloats     = document.getElementById('floats');
const elBartenders = document.getElementById('bartender-list');
const elUpgrades   = document.getElementById('upgrade-list');
const elToast      = document.getElementById('toast');

const elAchievementBtn     = document.getElementById('achievement-btn');
const elAchievementOverlay = document.getElementById('achievement-overlay');
const elAchievementClose   = document.getElementById('achievement-close');
const elAchievementList    = document.getElementById('achievement-list');
const elAchievementPopup   = document.getElementById('achievement-popup');
const elPopupIcon          = document.getElementById('achievement-popup-icon');
const elPopupName          = document.getElementById('achievement-popup-name');

// ===== Achievement Modal =====
function openAchievements() {
  renderAchievements();
  elAchievementOverlay.classList.remove('hidden');
}

function closeAchievements() {
  elAchievementOverlay.classList.add('hidden');
}

function renderAchievements() {
  elAchievementList.innerHTML = '';
  ACHIEVEMENTS.forEach(a => {
    const card = document.createElement('div');
    card.className = 'achievement-card ' + (a.unlocked ? 'unlocked' : 'locked');
    card.innerHTML = `
      <div class="achievement-card-icon">${a.icon}</div>
      <div class="achievement-card-body">
        <div class="achievement-card-name">${a.unlocked ? a.name : '???'}</div>
        <div class="achievement-card-desc">${a.unlocked ? a.desc : '未解除'}</div>
      </div>
      <div class="achievement-card-badge">${a.unlocked ? '✅' : '🔒'}</div>`;
    elAchievementList.appendChild(card);
  });
}

// ===== Rebirth =====
function calcRebirthPoints() {
  return Math.max(0, Math.floor(state.totalEarned / 1_000_000));
}

function openRebirthModal() {
  const pts = calcRebirthPoints();
  document.getElementById('rebirth-pts-earn').textContent = pts;
  document.getElementById('rebirth-pts-total').textContent = state.barPoints + pts;
  document.getElementById('rebirth-confirm-btn').disabled = pts <= 0;
  document.getElementById('rebirth-overlay').classList.remove('hidden');
}

function closeRebirthModal() {
  document.getElementById('rebirth-overlay').classList.add('hidden');
}

function doRebirth() {
  const pts = calcRebirthPoints();
  if (pts <= 0) return;

  state.barPoints      += pts;
  state.totalBarPoints += pts;
  state.rebirthCount++;
  state.money       = 0;
  state.totalEarned = 0;
  state.totalClicks = 0;

  BARTENDERS.forEach(b => { b.owned = 0; });
  UPGRADES.forEach(u => { u.level = 0; });
  STAFF_UPGRADES.forEach(u => { u.purchased = false; });

  recalcIncome();
  recalcClickPower();
  closeRebirthModal();
  render();
  saveGame();
  checkAchievements();
  showToast(`転生完了！ BARポイント +${pts} 獲得！`);
}

document.getElementById('rebirth-open-btn-shop').addEventListener('click', openRebirthModal);
document.getElementById('rebirth-cancel-btn').addEventListener('click', closeRebirthModal);
document.getElementById('rebirth-confirm-btn').addEventListener('click', doRebirth);
document.getElementById('rebirth-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('rebirth-overlay')) closeRebirthModal();
});

// ===== BAR Shop =====
function renderBarShop() {
  const elIncome = document.getElementById('bar-income-list');
  const elClick  = document.getElementById('bar-click-list');
  if (!elIncome || !elClick) return;

  const render1 = (el, category) => {
    el.innerHTML = '';
    BAR_UPGRADES.filter(u => u.category === category).forEach(u => {
      const unlocked  = barUpgradeUnlocked(u);
      const canAfford = unlocked && !u.purchased && state.barPoints >= u.cost;
      const card = document.createElement('div');
      card.className = 'shop-card bar-card' +
        (u.purchased ? ' maxed' : canAfford ? ' affordable' : ' disabled');
      card.innerHTML = `
        <div class="card-icon">${u.icon}</div>
        <div class="card-body">
          <div class="card-name">${u.name}</div>
          <div class="card-desc">${u.desc}</div>
        </div>
        <div class="card-right">
          ${u.purchased
            ? '<div class="card-maxed-badge">購入済</div>'
            : `<div class="card-cost bar-cost">${u.cost} <span class="bp-unit">BP</span></div>`
          }
        </div>`;
      if (!u.purchased && unlocked) card.addEventListener('click', () => buyBarUpgrade(u));
      el.appendChild(card);
    });
  };

  render1(elIncome, 'income');
  render1(elClick,  'click');

  document.getElementById('bar-points-display').textContent = state.barPoints;
}

function buyBarUpgrade(u) {
  if (u.purchased || !barUpgradeUnlocked(u) || state.barPoints < u.cost) return;
  state.barPoints -= u.cost;
  u.purchased = true;
  recalcIncome();
  recalcClickPower();
  render();
  checkAchievements();
  playSFX('sounds/coinuse.wav');
  showToast(`${u.name} を習得しました！`);
  saveGame();
}

// ===== Shop Panels =====
let openPanel = null;

function openShopPanel(id) {
  if (openPanel === id) { closeShopPanel(); return; }
  if (openPanel) {
    const prev = document.getElementById(openPanel);
    if (prev) { prev.classList.remove('open'); prev.classList.add('hidden'); }
  }
  openPanel = id;
  const panel = document.getElementById(id);
  panel.classList.remove('hidden');
  requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.add('open')));
  document.querySelectorAll('.nav-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.panel === id)
  );
  render();
}

function closeShopPanel() {
  if (!openPanel) return;
  const panel = document.getElementById(openPanel);
  if (panel) {
    panel.classList.remove('open');
    setTimeout(() => { if (!panel.classList.contains('open')) panel.classList.add('hidden'); }, 280);
  }
  openPanel = null;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => openShopPanel(btn.dataset.panel));
});

document.querySelectorAll('.panel-close').forEach(btn => {
  btn.addEventListener('click', closeShopPanel);
});

document.querySelectorAll('.panel-backdrop').forEach(bd => {
  bd.addEventListener('click', closeShopPanel);
});

// ===== Buy Mode Selector =====
function syncBuyModeBtns() {
  const modeStr = String(state.buyMode);
  document.querySelectorAll('.buy-mode-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.mode === modeStr)
  );
}

document.querySelectorAll('.buy-mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const raw = btn.dataset.mode;
    state.buyMode = raw === 'max' ? 'max' : Number(raw);
    syncBuyModeBtns();
    render();
  });
});

// ===== Options Modal =====
const elOptionsOverlay = document.getElementById('options-overlay');
const elOptBgm         = document.getElementById('opt-bgm');
const elOptSfx         = document.getElementById('opt-sfx');
const elOptVolume      = document.getElementById('opt-volume');

function openOptions() {
  elOptBgm.checked       = soundSettings.bgm;
  elOptSfx.checked       = soundSettings.sfx;
  elOptVolume.value      = Math.round(soundSettings.volume * 100);
  elOptionsOverlay.classList.remove('hidden');
}

function closeOptions() {
  elOptionsOverlay.classList.add('hidden');
}

document.getElementById('options-btn').addEventListener('click', openOptions);
document.getElementById('options-close').addEventListener('click', closeOptions);
elOptionsOverlay.addEventListener('click', e => { if (e.target === elOptionsOverlay) closeOptions(); });

elOptBgm.addEventListener('change', () => {
  soundSettings.bgm = elOptBgm.checked;
  applyAudioSettings();
  saveSoundSettings();
});

elOptSfx.addEventListener('change', () => {
  soundSettings.sfx = elOptSfx.checked;
  saveSoundSettings();
});

elOptVolume.addEventListener('input', () => {
  soundSettings.volume = elOptVolume.value / 100;
  applyAudioSettings();
  saveSoundSettings();
});

// ===== Data Reset Modal =====
const elDataResetOverlay = document.getElementById('data-reset-overlay');

function openDataResetModal() {
  closeOptions();
  elDataResetOverlay.classList.remove('hidden');
}

function closeDataResetModal() {
  elDataResetOverlay.classList.add('hidden');
}

document.getElementById('data-reset-btn').addEventListener('click', openDataResetModal);
document.getElementById('data-reset-cancel-btn').addEventListener('click', closeDataResetModal);
document.getElementById('data-reset-confirm-btn').addEventListener('click', () => {
  closeDataResetModal();
  resetGame();
});
elDataResetOverlay.addEventListener('click', e => { if (e.target === elDataResetOverlay) closeDataResetModal(); });

elAchievementBtn.addEventListener('click', openAchievements);
elAchievementClose.addEventListener('click', closeAchievements);
elAchievementOverlay.addEventListener('click', e => {
  if (e.target === elAchievementOverlay) closeAchievements();
});

// ===== Achievement Unlock Popup =====
let popupQueue = [];
let popupShowing = false;

function queueAchievementPopup(a) {
  popupQueue.push(a);
  if (!popupShowing) showNextPopup();
}

function showNextPopup() {
  if (popupQueue.length === 0) { popupShowing = false; return; }
  popupShowing = true;
  const a = popupQueue.shift();

  elPopupIcon.innerHTML   = a.icon;
  elPopupName.textContent = a.name;
  elAchievementPopup.classList.remove('hidden');
  playSFX('sounds/Fanfare.mp3');

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      elAchievementPopup.classList.add('show');
    });
  });

  setTimeout(() => {
    elAchievementPopup.classList.remove('show');
    setTimeout(() => {
      elAchievementPopup.classList.add('hidden');
      showNextPopup();
    }, 380);
  }, 2800);
}

// ===== Achievement Check =====
function checkAchievements() {
  ACHIEVEMENTS.forEach(a => {
    if (!a.unlocked && a.check()) {
      a.unlocked = true;
      queueAchievementPopup(a);
      // Update badge count on the medal button
      updateAchievementBadge();
    }
  });
}

function updateAchievementBadge() {
  const locked = ACHIEVEMENTS.filter(a => !a.unlocked).length;
  const unlocked = ACHIEVEMENTS.filter(a => a.unlocked).length;
  elAchievementBtn.setAttribute('aria-label', `実績 ${unlocked}/${ACHIEVEMENTS.length}`);
}

// ===== Render =====
function renderHeader() {
  elMoney.textContent     = fmt(state.money);
  elIncomeSec.textContent = fmt(state.incomePerSec) + ' / 秒';
  elPerClick.textContent  = fmt(state.clickPower);
  const bpEl = document.getElementById('bp-header-val');
  if (bpEl) bpEl.textContent = state.barPoints.toLocaleString('ja-JP');
}

function renderBartenders() {
  elBartenders.innerHTML = '';
  BARTENDERS.forEach(b => {
    const n         = resolveBartenderCount(b);
    const totalCost = n > 0 ? bartenderBulkCost(b, n) : bartenderCost(b);
    const canAfford = n > 0;
    const modeLabel = state.buyMode === 'max' ? `×MAX(${n})` : `×${state.buyMode}`;
    const card = document.createElement('div');
    card.className = 'shop-card' + (canAfford ? ' affordable' : ' disabled');
    card.dataset.id = b.id;
    card.innerHTML = `
      <div class="card-icon">${b.icon}</div>
      <div class="card-body">
        <div class="card-name">${b.name}</div>
        <div class="card-desc">${b.desc.replace('{income}', Math.floor(b.baseIncome * staffMultiplier(b) * barIncomeMultiplier()).toLocaleString('ja-JP'))}</div>
      </div>
      <div class="card-right">
        <div class="card-cost">${fmt(totalCost)}</div>
        <div class="card-owned">×${b.owned} <span class="buy-count-badge">${modeLabel}</span></div>
      </div>`;
    card.addEventListener('click', () => buyBartender(b));
    elBartenders.appendChild(card);
  });
}

function renderStaffUpgrades() {
  const el = document.getElementById('staff-upgrade-list');
  if (!el) return;
  el.innerHTML = '';

  let anyVisible = false;
  BARTENDERS.forEach(b => {
    if (b.owned <= 0) return;
    const tiers = STAFF_UPGRADES.filter(u => u.bartenderId === b.id);

    tiers.forEach(u => {
      if (u.purchased) return;
      if (!staffUpgradeUnlocked(u)) return;

      anyVisible = true;
      const canAfford = state.money >= u.cost;
      const mult = staffMultiplier(b);
      const card = document.createElement('div');
      card.className = 'shop-card staff-upgrade-card' + (canAfford ? ' affordable' : ' disabled');
      card.innerHTML = `
        <div class="card-icon">${u.icon}</div>
        <div class="card-body">
          <div class="card-name">${u.name}</div>
          <div class="card-desc">${b.name} &nbsp;${fmt(b.baseIncome * mult)}/秒 → ${fmt(b.baseIncome * mult * u.multiplier)}/秒</div>
        </div>
        <div class="card-right">
          <div class="card-cost">${fmt(u.cost)}</div>
          <div class="card-owned staff-mult-badge">×${u.multiplier}</div>
        </div>`;
      card.addEventListener('click', () => buyStaffUpgrade(u));
      el.appendChild(card);
    });
  });

  const emptyMsg = document.getElementById('staff-empty-msg');
  if (emptyMsg) emptyMsg.style.display = anyVisible ? 'none' : '';
}

function buyStaffUpgrade(u) {
  if (u.purchased || state.money < u.cost) return;
  state.money -= u.cost;
  u.purchased = true;
  recalcIncome();
  render();
  checkAchievements();
  playSFX('sounds/coinuse.wav');
  showToast(`${u.name} を取得しました！`);
  saveGame();
}

function renderUpgrades() {
  elUpgrades.innerHTML = '';
  UPGRADES.forEach(u => {
    const isMaxed   = u.level >= u.maxLevel;
    const n         = isMaxed ? 0 : resolveUpgradeCount(u);
    const totalCost = isMaxed ? 0 : (n > 0 ? upgradeBulkCost(u, n) : upgradeCost(u));
    const canAfford = !isMaxed && n > 0;
    const modeLabel = state.buyMode === 'max' ? `×MAX(${n})` : `×${state.buyMode}`;
    const card = document.createElement('div');
    card.className = 'shop-card' + (isMaxed ? ' maxed' : canAfford ? ' affordable' : ' disabled');
    card.dataset.id = u.id;
    card.innerHTML = `
      <div class="card-icon">${u.icon}</div>
      <div class="card-body">
        <div class="card-name">${u.name}</div>
        <div class="card-desc">${isMaxed
          ? 'MAX レベル達成！'
          : u.desc.replace('{bonus}', u.clickBonus.toLocaleString('ja-JP'))
        }</div>
      </div>
      <div class="card-right">
        ${isMaxed
          ? '<div class="card-maxed-badge">MAX</div>'
          : `<div class="card-cost">${fmt(totalCost)}</div>
             <div class="card-owned">Lv ${u.level}/${u.maxLevel} <span class="buy-count-badge">${modeLabel}</span></div>`
        }
      </div>`;
    if (!isMaxed) card.addEventListener('click', () => buyUpgrade(u));
    elUpgrades.appendChild(card);
  });
}

function render() {
  renderHeader();
  renderBartenders();
  renderStaffUpgrades();
  renderUpgrades();
  renderBarShop();
  renderKanban();
}

// ===== Bulk cost helpers =====

// How many of bartender b can be bought with current money
function bartenderAffordCount(b) {
  let count = 0;
  let owned = b.owned;
  let remaining = state.money;
  while (true) {
    const c = Math.floor(b.baseCost * Math.pow(b.costMultiplier, owned));
    if (remaining < c) break;
    remaining -= c;
    owned++;
    count++;
  }
  return count;
}

// Total cost to buy `n` of bartender b (from current owned count)
function bartenderBulkCost(b, n) {
  let total = 0;
  for (let i = 0; i < n; i++) {
    total += Math.floor(b.baseCost * Math.pow(b.costMultiplier, b.owned + i));
  }
  return total;
}

// How many upgrade levels can be bought with current money
function upgradeAffordCount(u) {
  let count = 0;
  let level = u.level;
  let remaining = state.money;
  while (level < u.maxLevel) {
    const c = Math.floor(u.cost * Math.pow(2.2, level));
    if (remaining < c) break;
    remaining -= c;
    level++;
    count++;
  }
  return count;
}

// Total cost to buy `n` upgrade levels from current level
function upgradeBulkCost(u, n) {
  let total = 0;
  for (let i = 0; i < n; i++) {
    total += Math.floor(u.cost * Math.pow(2.2, u.level + i));
  }
  return total;
}

// Resolve actual buy count for current buyMode
function resolveBartenderCount(b) {
  if (state.buyMode === 'max') return bartenderAffordCount(b);
  if (state.buyMode === 10)    return Math.min(10, bartenderAffordCount(b));
  return bartenderAffordCount(b) >= 1 ? 1 : 0;
}

function resolveUpgradeCount(u) {
  const remaining = u.maxLevel - u.level;
  if (state.buyMode === 'max') return upgradeAffordCount(u);
  if (state.buyMode === 10)    return Math.min(10, remaining, upgradeAffordCount(u));
  return upgradeAffordCount(u) >= 1 ? 1 : 0;
}

// ===== Actions =====
function addMoney(amount) {
  state.money       += amount;
  state.totalEarned += amount;
}

function buyBartender(b) {
  const n = resolveBartenderCount(b);
  if (n <= 0) return;
  const cost = bartenderBulkCost(b, n);
  state.money -= cost;
  b.owned += n;
  recalcIncome();
  render();
  checkAchievements();
  playSFX('sounds/coinuse.wav');
  showToast(`${b.name}を${n}人雇用しました！`);
  saveGame();
}

function buyUpgrade(u) {
  if (u.level >= u.maxLevel) return;
  const n = resolveUpgradeCount(u);
  if (n <= 0) return;
  const cost = upgradeBulkCost(u, n);
  state.money -= cost;
  u.level = Math.min(u.level + n, u.maxLevel);
  recalcClickPower();
  render();
  checkAchievements();
  playSFX('sounds/coinuse.wav');
  showToast(`${u.name} Lv${u.level} に強化しました！`);
  saveGame();
}

// ===== Click Handler =====
function onGlassClick(e) {
  tryStartBGM();
  playTapSFX();
  state.totalClicks++;
  addMoney(state.clickPower);
  renderHeader();
  updateAffordability();
  checkAchievements();
  spawnFloat(e, fmt(state.clickPower));

  elGlass.classList.remove('clicked');
  void elGlass.offsetWidth; // reflow
  elGlass.classList.add('clicked');
  setTimeout(() => elGlass.classList.remove('clicked'), 160);
}

// Only re-render shop affordability borders without full DOM rebuild
function updateAffordability() {
  document.querySelectorAll('#bartender-list .shop-card').forEach(card => {
    const b = BARTENDERS.find(x => x.id === card.dataset.id);
    if (!b) return;
    const n = resolveBartenderCount(b);
    const cost = n > 0 ? bartenderBulkCost(b, n) : bartenderCost(b);
    const modeLabel = state.buyMode === 'max' ? `×MAX(${n})` : `×${state.buyMode}`;
    card.classList.toggle('affordable', n > 0);
    card.classList.toggle('disabled', n <= 0);
    card.querySelector('.card-cost').textContent = fmt(cost);
    const badge = card.querySelector('.buy-count-badge');
    if (badge) badge.textContent = modeLabel;
  });
  document.querySelectorAll('#upgrade-list .shop-card').forEach(card => {
    const u = UPGRADES.find(x => x.id === card.dataset.id);
    if (!u || u.level >= u.maxLevel) return;
    const n = resolveUpgradeCount(u);
    const cost = n > 0 ? upgradeBulkCost(u, n) : upgradeCost(u);
    const modeLabel = state.buyMode === 'max' ? `×MAX(${n})` : `×${state.buyMode}`;
    card.classList.toggle('affordable', n > 0);
    card.classList.toggle('disabled', n <= 0);
    const costEl = card.querySelector('.card-cost');
    if (costEl) costEl.textContent = fmt(cost);
    const badge = card.querySelector('.buy-count-badge');
    if (badge) badge.textContent = modeLabel;
  });
}

// ===== Floating Coin Label =====
function spawnFloat(e, text) {
  const el = document.createElement('div');
  el.className = 'float-coin';
  el.textContent = '+' + text.replace('¥', '') ;

  const rect = elFloats.getBoundingClientRect();
  let x, y;

  if (e.touches && e.touches.length > 0) {
    x = e.touches[0].clientX - rect.left;
    y = e.touches[0].clientY - rect.top;
  } else {
    x = e.clientX - rect.left;
    y = e.clientY - rect.top;
  }

  // Slight random horizontal scatter
  x += (Math.random() - 0.5) * 40;
  el.style.left = x + 'px';
  el.style.top  = y + 'px';

  elFloats.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

// ===== Toast =====
let toastTimer = null;
function showToast(msg) {
  elToast.textContent = msg;
  elToast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elToast.classList.remove('show'), 2200);
}

// ===== Auto Income Tick =====
let lastTick             = performance.now();
let lastRender           = 0;
let lastAchievementCheck = 0;
const RENDER_INTERVAL    = 1000 / 30; // 30fps

function tick(now) {
  const delta = (now - lastTick) / 1000;
  lastTick = now;

  if (state.incomePerSec > 0) {
    addMoney(state.incomePerSec * delta);
  }

  if (now - lastRender >= RENDER_INTERVAL) {
    lastRender = now;
    if (state.incomePerSec > 0) {
      renderHeader();
      updateAffordability();
    }
  }

  // Check achievements once per second
  if (now - lastAchievementCheck >= 1000) {
    lastAchievementCheck = now;
    checkAchievements();
  }

  requestAnimationFrame(tick);
}

// ===== Event Listeners =====
const elClickSection = document.getElementById('click-section');
elClickSection.addEventListener('click', onGlassClick);
elClickSection.addEventListener('touchstart', e => { e.preventDefault(); onGlassClick(e); }, { passive: false });
elGlass.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') onGlassClick(e); });

// ===== Boot =====
loadSoundSettings();
const loadResult = loadGame();
recalcIncome();
recalcClickPower();

// Restore rank silently on load (no toast/animation)
for (const r of GLASS_RANKS) {
  if (state.incomePerSec >= r.minIncome) currentRank = r.rank;
}
currentBgmIndex = currentRank - 1;
bgmAudio.src  = BGM_TRACKS[currentBgmIndex];
bgmAudio.loop = true;
const _img   = document.getElementById('glass-img');
const _badge = document.getElementById('rank-badge');
_img.src         = `images/glass_${currentRank}b.png`;
_badge.textContent = `Rank ${currentRank}`;
_badge.className   = `rank-${currentRank}`;
document.getElementById('rank-bg').src = `images/backgraund_${currentRank}.png`;
updateKanbanDisplay();

render();
updateAchievementBadge();

function showOfflineModal(bonus, elapsed) {
  const secs  = Math.floor(elapsed);
  const mins  = Math.floor(secs / 60);
  const hours = Math.floor(mins / 60);
  const timeStr = hours >= 1
    ? `${hours}時間${mins % 60}分`
    : mins >= 1 ? `${mins}分${secs % 60}秒` : `${secs}秒`;

  const elOfflineOverlay = document.getElementById('offline-overlay');
  document.getElementById('offline-time').textContent = `${timeStr}の間、バーを留守にしていました`;
  document.getElementById('offline-amount').innerHTML =
    `<div class="amount-label">オフライン収入</div>
     <div class="amount-value">${fmt(bonus)}</div>`;
  elOfflineOverlay.classList.remove('hidden');
  duckBGM(true);
}

document.getElementById('offline-close').addEventListener('click', () => {
  document.getElementById('offline-overlay').classList.add('hidden');
  duckBGM(false);
  tryStartBGM();
});

if (loadResult && loadResult.offlineBonus) {
  showOfflineModal(loadResult.offlineBonus, loadResult.elapsed);
} else if (loadResult) {
  setTimeout(() => showToast('セーブデータを読み込みました'), 400);
}

// Try immediate autoplay; fall back to first user interaction anywhere on the page
tryStartBGM();
document.addEventListener('pointerdown', tryStartBGM, { once: true });

// Auto-save every 10 seconds
setInterval(saveGame, SAVE_INTERVAL_MS);

// Background / foreground handling
let backgroundedAt = null;

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    saveGame();
    bgmAudio.pause();
    backgroundedAt = Date.now();
  } else {
    if (backgroundedAt !== null) {
      const elapsed = Math.min((Date.now() - backgroundedAt) / 1000, 8 * 3600);
      backgroundedAt = null;
      if (elapsed >= 1 && state.incomePerSec > 0) {
        const bonus = state.incomePerSec * elapsed;
        addMoney(bonus);
        saveGame();
        showOfflineModal(bonus, elapsed);
      }
      // tickの時間ずれをリセット
      lastTick = performance.now();
    }
    if (bgmStarted && soundSettings.bgm) bgmAudio.play().catch(() => {});
  }
});

window.addEventListener('pagehide', () => {
  saveGame();
  bgmAudio.pause();
});


requestAnimationFrame(now => { lastTick = now; requestAnimationFrame(tick); });
