import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "cryptodrop_ultra_v3";
const APP_VERSION = 3;
const CLAIM_COOLDOWN_SECONDS = 300;
const LOTTERY_TICKET_PRICE = 25;

const COINS = [
  { id: "btc", sym: "BTC", name: "Bitcoin", icon: "₿", color: "#f7931a", minWithdraw: 5000, faucetMin: 20, faucetMax: 200 },
  { id: "doge", sym: "DOGE", name: "Dogecoin", icon: "Ð", color: "#c2a633", minWithdraw: 25000, faucetMin: 80, faucetMax: 2500 },
  { id: "trx", sym: "TRX", name: "Tron", icon: "◈", color: "#eb0029", minWithdraw: 12000, faucetMin: 50, faucetMax: 900 },
  { id: "ltc", sym: "LTC", name: "Litecoin", icon: "Ł", color: "#b8b8b8", minWithdraw: 9000, faucetMin: 45, faucetMax: 550 },
  { id: "bnb", sym: "BNB", name: "BNB", icon: "◆", color: "#f3ba2f", minWithdraw: 3000, faucetMin: 8, faucetMax: 90 },
  { id: "eth", sym: "ETH", name: "Ethereum", icon: "Ξ", color: "#627eea", minWithdraw: 1800, faucetMin: 5, faucetMax: 45 },
];

const LEVELS = [
  { xp: 0, label: "Novato", icon: "🌱", claimBonus: 0 },
  { xp: 400, label: "Aprendiz", icon: "🧪", claimBonus: 8 },
  { xp: 1200, label: "Grinder", icon: "⛏️", claimBonus: 15 },
  { xp: 3500, label: "Pro", icon: "🎮", claimBonus: 25 },
  { xp: 9000, label: "Veterano", icon: "⚔️", claimBonus: 35 },
  { xp: 25000, label: "Leyenda", icon: "👑", claimBonus: 50 },
  { xp: 60000, label: "Titán", icon: "💎", claimBonus: 75 },
];

const LOGIN_REWARDS = [120, 150, 180, 250, 350, 500, 900];

const MISSIONS = [
  { id: "claim3", label: "Haz 3 claims", target: 3, reward: 250, xp: 80, icon: "⚡" },
  { id: "play5", label: "Juega 5 rondas", target: 5, reward: 400, xp: 110, icon: "🎮" },
  { id: "win2", label: "Gana 2 veces", target: 2, reward: 350, xp: 120, icon: "🏆" },
  { id: "offer1", label: "Completa 1 tarea earn", target: 1, reward: 500, xp: 140, icon: "📋" },
  { id: "watch2", label: "Ve 2 ads recompensados", target: 2, reward: 220, xp: 60, icon: "📺" },
];

const ACHIEVEMENTS = [
  { id: "a_claim10", label: "10 claims", type: "claims", target: 10, reward: 800, xp: 150 },
  { id: "a_claim50", label: "50 claims", type: "claims", target: 50, reward: 3000, xp: 450 },
  { id: "a_wins20", label: "20 victorias", type: "wins", target: 20, reward: 2500, xp: 350 },
  { id: "a_offer5", label: "5 tareas earn", type: "offers", target: 5, reward: 2200, xp: 280 },
  { id: "a_ads10", label: "10 ads recompensados", type: "ads", target: 10, reward: 900, xp: 160 },
  { id: "a_refs5", label: "5 referidos", type: "refs", target: 5, reward: 5000, xp: 500 },
];

const EARN_TASKS = [
  { id: "survey", title: "Surveys", reward: "x5-x40 claim", note: "CPX Research / inBrain / BitLabs", tag: "high value", icon: "📝" },
  { id: "offerwall", title: "Offerwall", reward: "x10-x100 claim", note: "Torox / AdGate / Adscend", tag: "best ARPU", icon: "🧱" },
  { id: "rewarded", title: "Rewarded Ads", reward: "x1-x2 claim", note: "1 click, alta conversión", tag: "fast", icon: "📺" },
  { id: "quests", title: "Quests", reward: "XP + tickets", note: "retención diaria", tag: "sticky", icon: "🎯" },
  { id: "social", title: "Social Tasks", reward: "bonus puntual", note: "X / Telegram / Discord", tag: "growth", icon: "📣" },
  { id: "referrals", title: "Referrals", reward: "LTV alto", note: "comisión vitalicia", tag: "compounding", icon: "🤝" },
];

const WHEEL = [
  { label: "25", value: 25, weight: 24, color: "#2563eb" },
  { label: "50", value: 50, weight: 20, color: "#16a34a" },
  { label: "75", value: 75, weight: 16, color: "#f59e0b" },
  { label: "100", value: 100, weight: 12, color: "#db2777" },
  { label: "150", value: 150, weight: 10, color: "#7c3aed" },
  { label: "250", value: 250, weight: 8, color: "#06b6d4" },
  { label: "500", value: 500, weight: 6, color: "#e11d48" },
  { label: "1000", value: 1000, weight: 4, color: "#facc15" },
];

const GAME_META = [
  { id: "dice", icon: "🎲", title: "Dice", note: "simple y claro" },
  { id: "crash", icon: "🚀", title: "Crash", note: "salida rápida" },
  { id: "mines", icon: "💣", title: "Mines", note: "alto engagement" },
  { id: "limbo", icon: "📈", title: "Limbo", note: "riesgo configurable" },
  { id: "tower", icon: "🗼", title: "Tower", note: "sesión larga" },
  { id: "plinko", icon: "🔴", title: "Plinko", note: "casual y viral" },
];

const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const fmt = (n) => Math.floor(Number(n || 0)).toLocaleString("en-US");
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const todayKey = () => new Date().toISOString().slice(0, 10);
const isYesterday = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr + "T00:00:00");
  const y = new Date();
  y.setHours(0, 0, 0, 0);
  y.setDate(y.getDate() - 1);
  return d.toDateString() === y.toDateString();
};

function usePersistentState(key, initialValue) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // ignore localStorage failures
    }
  }, [key, state]);

  return [state, setState];
}

function getLevel(xp) {
  for (let i = LEVELS.length - 1; i >= 0; i -= 1) {
    if (xp >= LEVELS[i].xp) {
      const current = LEVELS[i];
      const next = LEVELS[i + 1] || null;
      const progress = next ? ((xp - current.xp) / (next.xp - current.xp)) * 100 : 100;
      return { current, next, progress: clamp(progress, 0, 100), index: i };
    }
  }
  return { current: LEVELS[0], next: LEVELS[1], progress: 0, index: 0 };
}

function coinById(id) {
  return COINS.find((c) => c.id === id) || COINS[0];
}

function makeDefaultState() {
  const balances = {};
  COINS.forEach((c) => {
    balances[c.id] = c.id === "btc" ? 1000 : 0;
  });

  return {
    version: APP_VERSION,
    page: "dashboard",
    coin: "btc",
    balances,
    stats: {
      claims: 0,
      wins: 0,
      offers: 0,
      ads: 0,
      refs: 0,
      sessions: 1,
    },
    xp: 0,
    streak: 1,
    loginIndex: 0,
    lastLoginDay: null,
    claimCooldownUntil: 0,
    lastClaimRoll: null,
    lotteryTickets: 4,
    lotteryPool: 325000,
    wheelUsedDay: null,
    chestUsedDay: null,
    missionDay: todayKey(),
    missionProgress: {},
    claimedMissions: [],
    claimedAchievements: [],
    referrals: { code: "CDROP-" + Math.random().toString(36).slice(2, 8).toUpperCase(), count: 0, earned: 0 },
    history: [],
    adInventory: {
      topLeaderboard: true,
      nativeGrid: true,
      stickyFooter: true,
      rewardWall: true,
    },
    appFlags: {
      mode: "demo",
      offerwallEnabled: true,
      surveysEnabled: true,
      rewardedAdsEnabled: true,
      faucetEnabled: true,
      casinoEnabled: true,
    },
  };
}

const CSS = `
:root{
  --bg:#070912;
  --bg2:#0d1120;
  --bg3:#11182c;
  --card:#121a30;
  --card2:#18223f;
  --line:#24314f;
  --text:#ecf2ff;
  --muted:#93a1c6;
  --soft:#62708f;
  --cyan:#44d8ff;
  --green:#44f08e;
  --yellow:#f7c948;
  --red:#ff5d7d;
  --pink:#ff75d8;
  --purple:#a78bfa;
  --radius:18px;
}
*{box-sizing:border-box}
body{margin:0;background:radial-gradient(circle at top left,rgba(68,216,255,.08),transparent 30%),radial-gradient(circle at bottom right,rgba(68,240,142,.06),transparent 30%),var(--bg);color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,sans-serif}
button,input,select{font:inherit}
.app{min-height:100vh}
.topbar{position:sticky;top:0;z-index:30;backdrop-filter:blur(18px);background:rgba(7,9,18,.85);border-bottom:1px solid var(--line)}
.topbar-inner{max-width:1320px;margin:0 auto;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.brand{display:flex;align-items:center;gap:10px;font-weight:800;letter-spacing:.4px;cursor:pointer}
.brand-badge{width:38px;height:38px;border-radius:14px;background:linear-gradient(135deg,var(--cyan),var(--green));color:#031018;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 10px 25px rgba(68,216,255,.22)}
.brand-text{display:flex;flex-direction:column}
.brand-text strong{font-size:15px}
.brand-text span{font-size:11px;color:var(--muted);font-weight:600}
.top-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.pill{display:flex;align-items:center;gap:8px;background:var(--bg2);border:1px solid var(--line);padding:8px 12px;border-radius:999px;cursor:pointer;color:var(--text)}
.pill small{color:var(--muted)}
.container{max-width:1320px;margin:0 auto;padding:18px;display:grid;grid-template-columns:280px minmax(0,1fr);gap:18px}
.sidebar{position:sticky;top:78px;height:max-content;display:flex;flex-direction:column;gap:12px}
.card{background:linear-gradient(180deg,rgba(255,255,255,.02),transparent),var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:16px;box-shadow:0 20px 50px rgba(0,0,0,.18)}
.hero{background:linear-gradient(135deg,rgba(68,216,255,.12),rgba(68,240,142,.08)),var(--card);border:1px solid rgba(68,216,255,.25);border-radius:24px;padding:22px}
.hero h1{margin:0 0 8px;font-size:34px;line-height:1.05}
.hero p{margin:0;color:var(--muted);max-width:840px}
.hero-grid{display:grid;grid-template-columns:1.3fr .9fr;gap:16px;margin-top:18px}
.grid{display:grid;gap:14px}
.grid-2{grid-template-columns:repeat(2,minmax(0,1fr))}
.grid-3{grid-template-columns:repeat(3,minmax(0,1fr))}
.grid-4{grid-template-columns:repeat(4,minmax(0,1fr))}
.stats-row{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:16px}
.stat{background:var(--bg2);border:1px solid var(--line);border-radius:16px;padding:14px}
.stat span{display:block;color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.08em}
.stat strong{display:block;font-size:24px;margin-top:4px}
.label{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}
.kpi{font-size:28px;font-weight:800}
.section-title{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 12px}
.section-title h2,.section-title h3{margin:0;font-size:18px}
.section-title p{margin:2px 0 0;color:var(--muted);font-size:13px}
.nav-btn{width:100%;text-align:left;border:1px solid var(--line);background:var(--bg2);color:var(--text);padding:12px 14px;border-radius:14px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px;transition:.15s}
.nav-btn:hover{transform:translateY(-1px);border-color:rgba(68,216,255,.4)}
.nav-btn.active{background:linear-gradient(135deg,rgba(68,216,255,.12),rgba(68,240,142,.08));border-color:rgba(68,216,255,.35)}
.badge{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:999px;background:rgba(68,216,255,.12);border:1px solid rgba(68,216,255,.22);color:var(--cyan);font-size:12px;font-weight:700}
.badge.green{background:rgba(68,240,142,.12);border-color:rgba(68,240,142,.22);color:var(--green)}
.badge.yellow{background:rgba(247,201,72,.12);border-color:rgba(247,201,72,.22);color:var(--yellow)}
.badge.red{background:rgba(255,93,125,.12);border-color:rgba(255,93,125,.22);color:var(--red)}
.main{display:flex;flex-direction:column;gap:18px}
.ad-slot{border:1px dashed rgba(255,255,255,.2);border-radius:16px;padding:12px;text-align:center;color:var(--soft);background:repeating-linear-gradient(45deg,transparent,transparent 12px,rgba(255,255,255,.015) 12px,rgba(255,255,255,.015) 24px)}
.ad-slot strong{display:block;color:var(--muted);margin-bottom:4px}
.cta-row,.toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.btn{border:none;background:linear-gradient(135deg,var(--cyan),var(--green));color:#031018;padding:11px 16px;border-radius:14px;font-weight:800;cursor:pointer;transition:.15s;box-shadow:0 10px 30px rgba(68,216,255,.18)}
.btn:hover{transform:translateY(-1px)}
.btn.secondary{background:var(--bg2);color:var(--text);border:1px solid var(--line);box-shadow:none}
.btn.yellow{background:linear-gradient(135deg,var(--yellow),#ff9f43);color:#241500}
.btn.red{background:linear-gradient(135deg,var(--red),#ff8c66);color:#fff}
.btn:disabled{opacity:.45;cursor:not-allowed;transform:none}
.input, .select{background:var(--bg2);border:1px solid var(--line);color:var(--text);padding:10px 12px;border-radius:12px;outline:none}
.input:focus,.select:focus{border-color:rgba(68,216,255,.4)}
.coin-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.coin-btn{border:1px solid var(--line);border-radius:14px;background:var(--bg2);color:var(--text);padding:11px;cursor:pointer;text-align:left}
.coin-btn.active{border-color:rgba(68,216,255,.45);background:rgba(68,216,255,.09)}
.coin-line{display:flex;align-items:center;gap:8px}
.coin-icon{width:28px;height:28px;border-radius:999px;display:flex;align-items:center;justify-content:center;color:#061018;font-weight:900}
.progress{width:100%;height:10px;border-radius:999px;background:var(--bg2);border:1px solid var(--line);overflow:hidden}
.progress > div{height:100%;background:linear-gradient(90deg,var(--cyan),var(--green));border-radius:999px}
.feed{display:flex;flex-direction:column;gap:8px;max-height:280px;overflow:auto}
.feed-item{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border-radius:12px;background:var(--bg2);border:1px solid var(--line);font-size:13px}
.feed-item small{color:var(--muted)}
.task-grid,.game-grid,.earn-grid,.wallet-grid,.setup-grid{display:grid;gap:12px}
.task-grid,.game-grid,.earn-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
.wallet-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
.setup-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
.tile{background:var(--bg2);border:1px solid var(--line);border-radius:16px;padding:14px}
.tile h4{margin:0 0 6px;font-size:16px}
.tile p{margin:0;color:var(--muted);font-size:13px}
.list{display:flex;flex-direction:column;gap:10px}
.mission{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;padding:12px;border-radius:14px;background:var(--bg2);border:1px solid var(--line)}
.mission strong{display:block}
.mission small{color:var(--muted)}
.reward{font-weight:800;color:var(--green)}
.game-stage{background:linear-gradient(180deg,rgba(68,216,255,.08),transparent),var(--bg2);border:1px solid var(--line);border-radius:18px;padding:18px;min-height:240px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center}
.game-big{font-size:58px;font-weight:900;line-height:1}
.game-sub{color:var(--muted);margin-top:8px}
.mines-board,.tower-board,.plinko-row{display:grid;gap:8px}
.mines-board{grid-template-columns:repeat(5,52px)}
.mine-cell{width:52px;height:52px;border-radius:14px;border:1px solid var(--line);display:flex;align-items:center;justify-content:center;background:var(--card2);cursor:pointer;font-size:22px}
.mine-cell:hover{transform:translateY(-1px)}
.mine-cell.revealed.safe{background:rgba(68,240,142,.10);border-color:rgba(68,240,142,.3)}
.mine-cell.revealed.bomb{background:rgba(255,93,125,.12);border-color:rgba(255,93,125,.35)}
.tower-board{grid-template-columns:repeat(3,84px)}
.tower-cell{width:84px;height:64px;border-radius:14px;border:1px solid var(--line);background:var(--card2);display:flex;align-items:center;justify-content:center;font-size:26px;cursor:pointer}
.table{width:100%;border-collapse:collapse}
.table th,.table td{padding:10px 12px;border-bottom:1px solid var(--line);text-align:left;font-size:13px}
.table th{color:var(--muted);font-weight:700}
.callout{padding:14px 16px;border-radius:16px;background:rgba(247,201,72,.08);border:1px solid rgba(247,201,72,.22);color:#fde7a7}
.warning{padding:14px 16px;border-radius:16px;background:rgba(255,93,125,.08);border:1px solid rgba(255,93,125,.2);color:#ffd3dd}
.success{padding:14px 16px;border-radius:16px;background:rgba(68,240,142,.08);border:1px solid rgba(68,240,142,.2);color:#c7ffe0}
.footer-ad{position:sticky;bottom:0;z-index:20}
@media (max-width:1080px){
  .container{grid-template-columns:1fr}
  .sidebar{position:static}
  .hero-grid,.stats-row,.task-grid,.game-grid,.earn-grid,.wallet-grid,.setup-grid,.coin-grid{grid-template-columns:1fr}
}
`;

function weightedPrize(items) {
  const total = items.reduce((acc, x) => acc + x.weight, 0);
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return items[0];
}

function appendHistory(state, entry) {
  const next = [{ id: Math.random().toString(36).slice(2), at: Date.now(), ...entry }, ...state.history].slice(0, 80);
  return next;
}

function GameDice({ balance, onBet, onWin, toast, progressMission }) {
  const [bet, setBet] = useState(100);
  const [target, setTarget] = useState(55);
  const [over, setOver] = useState(true);
  const [result, setResult] = useState(null);
  const [rolling, setRolling] = useState(false);

  const chance = over ? 100 - target : target;
  const multiplier = Number((99 / Math.max(1, chance)).toFixed(2));

  const roll = async () => {
    if (rolling || bet <= 0 || bet > balance) return;
    onBet(bet, "Dice");
    progressMission("play5");
    setRolling(true);
    setResult(null);
    await sleep(600);
    const value = Number((Math.random() * 100).toFixed(2));
    const win = over ? value > target : value < target;
    if (win) {
      const prize = Math.floor(bet * multiplier);
      onWin(prize, "Dice");
      progressMission("win2");
      setResult({ ok: true, text: `🎲 ${value} → +${fmt(prize)} sat` });
      toast(`Dice ganó +${fmt(prize)}`, "ok");
    } else {
      setResult({ ok: false, text: `🎲 ${value} → fallaste` });
    }
    setRolling(false);
  };

  return (
    <div className="grid">
      <div className="game-stage">
        <div className="game-big">{rolling ? "🎲" : result ? result.text.split("→")[0] : "—"}</div>
        <div className="game-sub">Multiplicador actual: x{multiplier.toFixed(2)}</div>
      </div>
      {result && <div className={result.ok ? "success" : "warning"}>{result.text}</div>}
      <div className="toolbar">
        <input className="input" type="number" value={bet} onChange={(e) => setBet(Math.max(1, Number(e.target.value || 0)))} />
        <button className="btn secondary" onClick={() => setOver(false)}>Menor</button>
        <input className="input" type="range" min="5" max="95" value={target} onChange={(e) => setTarget(Number(e.target.value))} />
        <button className="btn secondary" onClick={() => setOver(true)}>Mayor</button>
        <span className="badge">Objetivo {target}</span>
        <button className="btn" onClick={roll} disabled={rolling || bet > balance}>Lanzar</button>
      </div>
    </div>
  );
}

function GameCrash({ balance, onBet, onWin, toast, progressMission }) {
  const [bet, setBet] = useState(100);
  const [auto, setAuto] = useState(2.0);
  const [running, setRunning] = useState(false);
  const [multiplier, setMultiplier] = useState(1.0);
  const [crashed, setCrashed] = useState(false);
  const [cashed, setCashed] = useState(false);
  const [text, setText] = useState("Esperando");
  const timerRef = useRef(null);
  const crashAtRef = useRef(1.0);

  useEffect(() => () => clearInterval(timerRef.current), []);

  const cashOut = (forced) => {
    if (!running || cashed || crashed) return;
    clearInterval(timerRef.current);
    const prize = Math.floor(bet * (forced || multiplier));
    onWin(prize, "Crash");
    progressMission("win2");
    setCashed(true);
    setRunning(false);
    setText(`💰 Cash out x${(forced || multiplier).toFixed(2)} = +${fmt(prize)}`);
    toast(`Crash cobrado +${fmt(prize)}`, "ok");
  };

  const start = () => {
    if (running || bet <= 0 || bet > balance) return;
    onBet(bet, "Crash");
    progressMission("play5");
    setRunning(true);
    setCashed(false);
    setCrashed(false);
    setMultiplier(1.0);
    setText("Subiendo...");
    crashAtRef.current = Math.max(1.05, 0.98 / (1 - Math.random()));
    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const next = Math.max(1.0, Number((Math.exp(elapsed * 0.08)).toFixed(2)));
      setMultiplier(next);
      if (auto > 1 && next >= auto && !cashed) {
        cashOut(next);
        return;
      }
      if (next >= crashAtRef.current) {
        clearInterval(timerRef.current);
        setCrashed(true);
        setRunning(false);
        setText(`💥 Crash en x${crashAtRef.current.toFixed(2)}`);
      }
    }, 80);
  };

  return (
    <div className="grid">
      <div className="game-stage">
        <div className="game-big">{crashed ? "💥" : cashed ? "💰" : "🚀"}</div>
        <div style={{ fontSize: 48, fontWeight: 900, marginTop: 8 }}>{multiplier.toFixed(2)}x</div>
        <div className="game-sub">{text}</div>
      </div>
      <div className="toolbar">
        <input className="input" type="number" value={bet} onChange={(e) => setBet(Math.max(1, Number(e.target.value || 0)))} />
        <input className="input" type="number" step="0.1" value={auto} onChange={(e) => setAuto(Number(e.target.value || 0))} />
        {!running ? <button className="btn" onClick={start} disabled={bet > balance}>Iniciar</button> : <button className="btn yellow" onClick={() => cashOut()}>Cash out</button>}
      </div>
    </div>
  );
}

function GameMines({ balance, onBet, onWin, toast, progressMission }) {
  const [bet, setBet] = useState(100);
  const [bombs, setBombs] = useState(4);
  const [board, setBoard] = useState([]);
  const [revealed, setRevealed] = useState([]);
  const [active, setActive] = useState(false);
  const [safeClicks, setSafeClicks] = useState(0);
  const [message, setMessage] = useState(null);

  const payoutFor = (hits, mines) => Number((1 + hits * (0.24 + mines * 0.04)).toFixed(2));

  const start = () => {
    if (bet <= 0 || bet > balance) return;
    onBet(bet, "Mines");
    progressMission("play5");
    const map = Array(25).fill("safe");
    const set = new Set();
    while (set.size < bombs) set.add(rand(0, 24));
    [...set].forEach((i) => { map[i] = "bomb"; });
    setBoard(map);
    setRevealed(Array(25).fill(false));
    setActive(true);
    setSafeClicks(0);
    setMessage(null);
  };

  const reveal = (index) => {
    if (!active || revealed[index]) return;
    const next = [...revealed];
    next[index] = true;
    setRevealed(next);
    if (board[index] === "bomb") {
      setActive(false);
      setRevealed(Array(25).fill(true));
      setMessage({ ok: false, text: "💣 Pisaste bomba" });
      return;
    }
    const hits = safeClicks + 1;
    setSafeClicks(hits);
    setMessage({ ok: true, text: `💎 x${payoutFor(hits, bombs)}` });
  };

  const cashOut = () => {
    if (!active || safeClicks === 0) return;
    const payout = Math.floor(bet * payoutFor(safeClicks, bombs));
    onWin(payout, "Mines");
    progressMission("win2");
    setActive(false);
    setRevealed(Array(25).fill(true));
    setMessage({ ok: true, text: `💰 +${fmt(payout)} sat` });
    toast(`Mines ganó +${fmt(payout)}`, "ok");
  };

  return (
    <div className="grid">
      <div className="game-stage">
        <div className="mines-board">
          {Array.from({ length: 25 }).map((_, i) => {
            const open = revealed[i];
            const kind = open ? board[i] : null;
            return (
              <button
                key={i}
                className={`mine-cell ${open ? `revealed ${kind === "bomb" ? "bomb" : "safe"}` : ""}`}
                onClick={() => reveal(i)}
              >
                {open ? (kind === "bomb" ? "💣" : "💎") : ""}
              </button>
            );
          })}
        </div>
        <div className="game-sub">Seguras: {safeClicks} · Mult x{payoutFor(safeClicks, bombs)}</div>
      </div>
      {message && <div className={message.ok ? "success" : "warning"}>{message.text}</div>}
      <div className="toolbar">
        <input className="input" type="number" value={bet} onChange={(e) => setBet(Math.max(1, Number(e.target.value || 0)))} />
        <input className="input" type="number" min="1" max="12" value={bombs} onChange={(e) => setBombs(clamp(Number(e.target.value || 1), 1, 12))} />
        {!active ? <button className="btn" onClick={start} disabled={bet > balance}>Nueva partida</button> : <button className="btn yellow" onClick={cashOut}>Cobrar</button>}
      </div>
    </div>
  );
}

function GameLimbo({ balance, onBet, onWin, toast, progressMission }) {
  const [bet, setBet] = useState(100);
  const [target, setTarget] = useState(2.0);
  const [rolling, setRolling] = useState(false);
  const [landed, setLanded] = useState(null);
  const [message, setMessage] = useState(null);

  const play = async () => {
    if (rolling || bet <= 0 || bet > balance) return;
    onBet(bet, "Limbo");
    progressMission("play5");
    setRolling(true);
    setMessage(null);
    await sleep(600);
    const generated = Number((1 / (1 - Math.random() * 0.96)).toFixed(2));
    setLanded(generated);
    if (generated >= target) {
      const payout = Math.floor(bet * target);
      onWin(payout, "Limbo");
      progressMission("win2");
      setMessage({ ok: true, text: `📈 Cayó ${generated}x → +${fmt(payout)}` });
      toast(`Limbo ganó +${fmt(payout)}`, "ok");
    } else {
      setMessage({ ok: false, text: `📉 Cayó ${generated}x y buscabas ${target}x` });
    }
    setRolling(false);
  };

  return (
    <div className="grid">
      <div className="game-stage">
        <div className="game-big">{rolling ? "⏳" : landed ? `${landed}x` : "2.00x"}</div>
        <div className="game-sub">Apunta a un multiplicador y cobra si el resultado lo supera</div>
      </div>
      {message && <div className={message.ok ? "success" : "warning"}>{message.text}</div>}
      <div className="toolbar">
        <input className="input" type="number" value={bet} onChange={(e) => setBet(Math.max(1, Number(e.target.value || 0)))} />
        <input className="input" type="number" step="0.1" value={target} onChange={(e) => setTarget(Math.max(1.1, Number(e.target.value || 0)))} />
        <button className="btn" onClick={play} disabled={rolling || bet > balance}>Jugar</button>
      </div>
    </div>
  );
}

function GameTower({ balance, onBet, onWin, toast, progressMission }) {
  const [bet, setBet] = useState(100);
  const [level, setLevel] = useState(0);
  const [active, setActive] = useState(false);
  const [safeIndex, setSafeIndex] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [message, setMessage] = useState(null);
  const multiplier = Number((1 + level * 0.45).toFixed(2));

  const start = () => {
    if (bet <= 0 || bet > balance) return;
    onBet(bet, "Tower");
    progressMission("play5");
    setLevel(0);
    setActive(true);
    setRevealed(false);
    setMessage(null);
    setSafeIndex(rand(0, 2));
  };

  const pick = (index) => {
    if (!active || revealed) return;
    setRevealed(true);
    if (index === safeIndex) {
      const nextLevel = level + 1;
      setLevel(nextLevel);
      setMessage({ ok: true, text: `✅ Subiste al nivel ${nextLevel}` });
      setTimeout(() => {
        setRevealed(false);
        setSafeIndex(rand(0, 2));
      }, 650);
    } else {
      setMessage({ ok: false, text: "💥 Fallaste la escalada" });
      setActive(false);
    }
  };

  const cashOut = () => {
    if (!active || level === 0) return;
    const payout = Math.floor(bet * multiplier);
    onWin(payout, "Tower");
    progressMission("win2");
    setActive(false);
    setMessage({ ok: true, text: `🗼 +${fmt(payout)} sat en nivel ${level}` });
    toast(`Tower ganó +${fmt(payout)}`, "ok");
  };

  return (
    <div className="grid">
      <div className="game-stage">
        <div className="game-big">Nivel {level}</div>
        <div className="tower-board" style={{ marginTop: 18 }}>
          {[0, 1, 2].map((i) => (
            <button key={i} className="tower-cell" onClick={() => pick(i)}>
              {revealed ? (i === safeIndex ? "💎" : "💣") : "❓"}
            </button>
          ))}
        </div>
        <div className="game-sub">Multiplicador actual x{multiplier}</div>
      </div>
      {message && <div className={message.ok ? "success" : "warning"}>{message.text}</div>}
      <div className="toolbar">
        <input className="input" type="number" value={bet} onChange={(e) => setBet(Math.max(1, Number(e.target.value || 0)))} />
        {!active ? <button className="btn" onClick={start} disabled={bet > balance}>Subir</button> : <button className="btn yellow" onClick={cashOut}>Cobrar</button>}
      </div>
    </div>
  );
}

function GamePlinko({ balance, onBet, onWin, toast, progressMission }) {
  const [bet, setBet] = useState(100);
  const [pegs, setPegs] = useState(8);
  const [dropping, setDropping] = useState(false);
  const [slot, setSlot] = useState(null);
  const [message, setMessage] = useState(null);

  const multipliers = useMemo(() => {
    if (pegs <= 8) return [0.5, 0.8, 1, 1.2, 1.5, 1.2, 1, 0.8, 0.5];
    return [0.3, 0.5, 0.8, 1, 1.3, 1.8, 1.3, 1, 0.8, 0.5, 0.3];
  }, [pegs]);

  const drop = async () => {
    if (dropping || bet <= 0 || bet > balance) return;
    onBet(bet, "Plinko");
    progressMission("play5");
    setDropping(true);
    setMessage(null);
    await sleep(700);
    const index = rand(0, multipliers.length - 1);
    setSlot(index);
    const payout = Math.floor(bet * multipliers[index]);
    if (payout >= bet) {
      onWin(payout, "Plinko");
      progressMission("win2");
      setMessage({ ok: true, text: `🔴 Slot ${index + 1} → +${fmt(payout)}` });
      toast(`Plinko ganó +${fmt(payout)}`, "ok");
    } else {
      onWin(payout, "Plinko partial");
      setMessage({ ok: false, text: `🔴 Slot ${index + 1} devolvió ${fmt(payout)}` });
    }
    setDropping(false);
  };

  return (
    <div className="grid">
      <div className="game-stage">
        <div className="game-big">{dropping ? "🔴" : slot !== null ? `#${slot + 1}` : "Plinko"}</div>
        <div className="plinko-row" style={{ gridTemplateColumns: `repeat(${multipliers.length},minmax(0,1fr))`, width: "100%", marginTop: 18 }}>
          {multipliers.map((m, i) => (
            <div key={i} className="tile" style={{ textAlign: "center", borderColor: slot === i ? "rgba(68,216,255,.45)" : "var(--line)" }}>
              <strong>x{m}</strong>
            </div>
          ))}
        </div>
      </div>
      {message && <div className={message.ok ? "success" : "warning"}>{message.text}</div>}
      <div className="toolbar">
        <input className="input" type="number" value={bet} onChange={(e) => setBet(Math.max(1, Number(e.target.value || 0)))} />
        <select className="select" value={pegs} onChange={(e) => setPegs(Number(e.target.value))}>
          <option value={8}>8 filas</option>
          <option value={10}>10 filas</option>
        </select>
        <button className="btn" onClick={drop} disabled={dropping || bet > balance}>Soltar</button>
      </div>
    </div>
  );
}

export default function App() {
  const [app, setApp] = usePersistentState(STORAGE_KEY, makeDefaultState());
  const [toast, setToast] = useState(null);
  const [captcha, setCaptcha] = useState(null);
  const [captchaInput, setCaptchaInput] = useState("");
  const [game, setGame] = useState("dice");

  const currentCoin = coinById(app.coin);
  const balance = app.balances[app.coin] || 0;
  const level = getLevel(app.xp);
  const now = Date.now();
  const claimRemaining = Math.max(0, Math.ceil((app.claimCooldownUntil - now) / 1000));

  const toastNow = useCallback((msg, type = "info") => {
    const obj = { id: Date.now(), msg, type };
    setToast(obj);
    setTimeout(() => setToast((prev) => (prev?.id === obj.id ? null : prev)), 2800);
  }, []);

  useEffect(() => {
    if (app.version === APP_VERSION) return;
    setApp((prev) => ({ ...makeDefaultState(), ...prev, version: APP_VERSION }));
  }, [app.version, setApp]);

  useEffect(() => {
    const today = todayKey();
    if (app.lastLoginDay === today) return;
    setApp((prev) => {
      const streak = prev.lastLoginDay ? (isYesterday(prev.lastLoginDay) ? prev.streak + 1 : 1) : 1;
      const loginIndex = prev.lastLoginDay && isYesterday(prev.lastLoginDay) ? (prev.loginIndex + 1) % LOGIN_REWARDS.length : 0;
      const loginReward = LOGIN_REWARDS[loginIndex];
      const next = structuredClone(prev);
      next.lastLoginDay = today;
      next.streak = streak;
      next.loginIndex = loginIndex;
      next.balances[next.coin] += loginReward;
      next.lotteryPool += rand(40, 140);
      next.claimedMissions = [];
      next.missionProgress = {};
      next.missionDay = today;
      next.history = appendHistory(next, { kind: "login", text: `Login diario +${fmt(loginReward)} sat` });
      return next;
    });
    toastNow(`Login diario: +${fmt(LOGIN_REWARDS[(app.loginIndex + 1) % LOGIN_REWARDS.length])} sat`, "ok");
  }, [app.lastLoginDay, app.loginIndex, setApp, toastNow]);

  useEffect(() => {
    const timer = setInterval(() => {
      setApp((prev) => {
        if (prev.claimCooldownUntil <= Date.now()) return prev;
        return { ...prev };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [setApp]);

  const setPage = (page) => setApp((prev) => ({ ...prev, page }));

  const patchApp = (fn) => setApp((prev) => fn(structuredClone(prev)));

  const progressMission = (id, step = 1) => {
    patchApp((next) => {
      next.missionProgress[id] = (next.missionProgress[id] || 0) + step;
      return next;
    });
  };

  const addBalance = (coinId, amount, reason = "") => {
    patchApp((next) => {
      next.balances[coinId] = Math.max(0, (next.balances[coinId] || 0) + amount);
      if (reason) next.history = appendHistory(next, { kind: amount >= 0 ? "credit" : "debit", text: `${reason} ${amount >= 0 ? "+" : ""}${fmt(amount)} ${coinById(coinId).sym}` });
      return next;
    });
  };

  const addXp = (amount) => patchApp((next) => {
    next.xp += amount;
    return next;
  });

  const onBet = (amount, name) => {
    patchApp((next) => {
      next.balances[next.coin] = Math.max(0, next.balances[next.coin] - amount);
      next.xp += Math.max(4, Math.floor(amount / 10));
      next.history = appendHistory(next, { kind: "bet", text: `${name}: -${fmt(amount)} ${coinById(next.coin).sym}` });
      return next;
    });
  };

  const onWin = (amount, name) => {
    if (amount <= 0) return;
    patchApp((next) => {
      next.balances[next.coin] += amount;
      next.stats.wins += 1;
      next.xp += Math.max(8, Math.floor(amount / 14));
      next.history = appendHistory(next, { kind: "win", text: `${name}: +${fmt(amount)} ${coinById(next.coin).sym}` });
      return next;
    });
  };

  const missionRows = MISSIONS.map((mission) => ({
    ...mission,
    progress: app.missionProgress[mission.id] || 0,
    claimed: app.claimedMissions.includes(mission.id),
  }));

  const achievementRows = ACHIEVEMENTS.map((a) => {
    const current =
      a.type === "claims" ? app.stats.claims :
      a.type === "wins" ? app.stats.wins :
      a.type === "offers" ? app.stats.offers :
      a.type === "ads" ? app.stats.ads :
      app.stats.refs;
    return { ...a, current, claimed: app.claimedAchievements.includes(a.id) };
  });

  const fakeFeed = useMemo(() => {
    const names = ["SatoshiFox", "EarnByte", "MoonClip", "HashQueen", "PlinkoNinja", "OfferKing", "BTCNova"];
    return Array.from({ length: 8 }).map((_, i) => ({
      id: i,
      user: names[i % names.length],
      action: ["completó offerwall", "ganó en plinko", "cobró crash", "hizo claim", "retiró a FaucetPay"][i % 5],
      amount: rand(40, 2500),
      sym: COINS[i % COINS.length].sym,
    }));
  }, []);

  const generateCaptcha = () => {
    const a = rand(2, 15);
    const b = rand(2, 15);
    setCaptcha({ q: `${a} + ${b}`, answer: a + b });
    setCaptchaInput("");
  };

  const doClaim = () => {
    if (claimRemaining > 0) return;
    if (!captcha) {
      generateCaptcha();
      return;
    }
    if (Number(captchaInput) !== captcha.answer) {
      toastNow("Captcha incorrecto", "err");
      generateCaptcha();
      return;
    }

    const roll = rand(0, 10000);
    let reward = currentCoin.faucetMin;
    if (roll >= 9999) reward = currentCoin.faucetMax * 30;
    else if (roll >= 9995) reward = currentCoin.faucetMax * 8;
    else if (roll >= 9988) reward = currentCoin.faucetMax * 3;
    else if (roll >= 9900) reward = currentCoin.faucetMax;
    else reward = rand(currentCoin.faucetMin, Math.max(currentCoin.faucetMin + 5, Math.floor(currentCoin.faucetMax * 0.2)));

    const levelBonus = Math.floor((reward * level.current.claimBonus) / 100);
    const streakBonus = Math.floor((reward * clamp(app.streak * 4, 0, 40)) / 100);
    const total = reward + levelBonus + streakBonus;

    patchApp((next) => {
      next.stats.claims += 1;
      next.balances[next.coin] += total;
      next.xp += 25;
      next.claimCooldownUntil = Date.now() + CLAIM_COOLDOWN_SECONDS * 1000;
      next.lastClaimRoll = roll;
      next.lotteryTickets += 2;
      next.lotteryPool += rand(10, 55);
      next.history = appendHistory(next, { kind: "claim", text: `Claim +${fmt(total)} ${coinById(next.coin).sym} (roll ${roll})` });
      return next;
    });
    progressMission("claim3");
    setCaptcha(null);
    setCaptchaInput("");
    toastNow(`Claim correcto: +${fmt(total)} ${currentCoin.sym}`, "ok");
  };

  const claimMission = (mission) => {
    patchApp((next) => {
      if (next.claimedMissions.includes(mission.id)) return next;
      next.claimedMissions.push(mission.id);
      next.balances[next.coin] += mission.reward;
      next.xp += mission.xp;
      next.history = appendHistory(next, { kind: "mission", text: `Misión ${mission.label}: +${fmt(mission.reward)} sat` });
      return next;
    });
    toastNow(`Misión completada: +${fmt(mission.reward)} sat`, "ok");
  };

  const claimAchievement = (achievement) => {
    patchApp((next) => {
      if (next.claimedAchievements.includes(achievement.id)) return next;
      next.claimedAchievements.push(achievement.id);
      next.balances[next.coin] += achievement.reward;
      next.xp += achievement.xp;
      next.history = appendHistory(next, { kind: "achievement", text: `Achievement ${achievement.label}: +${fmt(achievement.reward)} sat` });
      return next;
    });
    toastNow(`Logro desbloqueado: ${achievement.label}`, "ok");
  };

  const spinWheel = () => {
    if (app.wheelUsedDay === todayKey()) return;
    const prize = weightedPrize(WHEEL);
    patchApp((next) => {
      next.wheelUsedDay = todayKey();
      next.balances[next.coin] += prize.value;
      next.xp += 55;
      next.history = appendHistory(next, { kind: "wheel", text: `Ruleta +${fmt(prize.value)} sat` });
      return next;
    });
    toastNow(`Ruleta: +${fmt(prize.value)} sat`, "ok");
  };

  const openChest = () => {
    if (app.chestUsedDay === todayKey()) return;
    const prize = rand(120, 700);
    patchApp((next) => {
      next.chestUsedDay = todayKey();
      next.balances[next.coin] += prize;
      next.lotteryTickets += 3;
      next.xp += 35;
      next.history = appendHistory(next, { kind: "chest", text: `Cofre diario +${fmt(prize)} sat` });
      return next;
    });
    toastNow(`Cofre diario: +${fmt(prize)} sat`, "ok");
  };

  const runEarnTask = (task) => {
    const base = task.id === "offerwall" ? rand(600, 2800) : task.id === "survey" ? rand(350, 1700) : task.id === "rewarded" ? rand(40, 140) : rand(90, 300);
    patchApp((next) => {
      next.balances[next.coin] += base;
      next.xp += task.id === "rewarded" ? 20 : 60;
      next.stats.offers += task.id === "rewarded" ? 0 : 1;
      next.stats.ads += task.id === "rewarded" ? 1 : 0;
      next.history = appendHistory(next, { kind: "earn", text: `${task.title}: +${fmt(base)} sat` });
      return next;
    });
    if (task.id === "rewarded") progressMission("watch2");
    else progressMission("offer1");
    toastNow(`${task.title}: +${fmt(base)} sat`, "ok");
  };

  const buyLotteryTicket = (amount) => {
    const total = LOTTERY_TICKET_PRICE * amount;
    if (balance < total) return;
    patchApp((next) => {
      next.balances[next.coin] -= total;
      next.lotteryTickets += amount;
      next.lotteryPool += total;
      next.history = appendHistory(next, { kind: "lottery", text: `Tickets x${amount}` });
      return next;
    });
    toastNow(`Compraste ${amount} tickets`, "ok");
  };

  const addReferral = () => {
    patchApp((next) => {
      next.stats.refs += 1;
      next.referrals.count += 1;
      next.referrals.earned += 500;
      next.balances[next.coin] += 500;
      next.history = appendHistory(next, { kind: "ref", text: "Referido demo +500 sat" });
      return next;
    });
    toastNow("Referido demo agregado", "ok");
  };

  const withdrawDemo = () => {
    if (balance < currentCoin.minWithdraw) {
      toastNow(`Mínimo de retiro: ${fmt(currentCoin.minWithdraw)} ${currentCoin.sym}`, "err");
      return;
    }
    patchApp((next) => {
      next.balances[next.coin] -= currentCoin.minWithdraw;
      next.history = appendHistory(next, { kind: "withdraw", text: `Retiro demo -${fmt(currentCoin.minWithdraw)} ${currentCoin.sym}` });
      return next;
    });
    toastNow(`Retiro demo enviado a FaucetPay`, "ok");
  };

  const pages = [
    ["dashboard", "📊", "Dashboard"],
    ["faucet", "⚡", "Faucet"],
    ["earn", "🧱", "Earn Hub"],
    ["casino", "🎮", "Casino"],
    ["lottery", "🎟️", "Lotería"],
    ["growth", "📣", "Growth"],
    ["wallet", "💼", "Wallet"],
    ["setup", "🛠️", "Setup real"],
  ];

  const GameComponent = {
    dice: GameDice,
    crash: GameCrash,
    mines: GameMines,
    limbo: GameLimbo,
    tower: GameTower,
    plinko: GamePlinko,
  }[game];

  return (
    <div className="app">
      <style>{CSS}</style>
      {toast && (
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 40 }}>
          <div className={toast.type === "err" ? "warning" : toast.type === "ok" ? "success" : "card"}>{toast.msg}</div>
        </div>
      )}

      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand" onClick={() => setPage("dashboard")}>
            <div className="brand-badge">⚡</div>
            <div className="brand-text">
              <strong>CryptoDrop Ultra</strong>
              <span>Faucet + Earn Hub + Arcade</span>
            </div>
          </div>
          <div className="top-actions">
            <button className="pill" onClick={() => setPage("wallet")}>
              <div className="coin-icon" style={{ background: currentCoin.color }}>{currentCoin.icon}</div>
              <div>
                <strong>{fmt(balance)}</strong>
                <small>{currentCoin.sym}</small>
              </div>
            </button>
            <div className="pill">
              <span>{level.current.icon}</span>
              <div>
                <strong>{level.current.label}</strong>
                <small>+{level.current.claimBonus}% claim</small>
              </div>
            </div>
            <button className="btn" onClick={() => setPage("faucet")}>Claim</button>
          </div>
        </div>
      </header>

      <div className="container">
        <aside className="sidebar">
          <div className="card">
            <div className="section-title">
              <div>
                <h3>Navegación</h3>
                <p>La versión fuerte de la faucet</p>
              </div>
              <span className="badge">v3</span>
            </div>
            <div className="list">
              {pages.map(([id, icon, label]) => (
                <button key={id} className={`nav-btn ${app.page === id ? "active" : ""}`} onClick={() => setPage(id)}>
                  <span>{icon} {label}</span>
                  {id === "faucet" && claimRemaining === 0 ? <span className="badge green">ready</span> : null}
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="section-title">
              <div>
                <h3>Perfil</h3>
                <p>Retención y progresión</p>
              </div>
              <span className="badge yellow">{app.streak} días</span>
            </div>
            <div className="label">Nivel actual</div>
            <div className="kpi">{level.current.icon} {level.current.label}</div>
            <div style={{ color: "var(--muted)", marginTop: 6 }}>{fmt(app.xp)} XP</div>
            <div className="progress" style={{ marginTop: 10 }}><div style={{ width: `${level.progress}%` }} /></div>
            <div style={{ marginTop: 10, color: "var(--muted)", fontSize: 13 }}>
              {level.next ? `${fmt(level.next.xp - app.xp)} XP para ${level.next.label}` : "Nivel máximo alcanzado"}
            </div>
          </div>

          <div className="card">
            <div className="section-title">
              <div>
                <h3>Live feed</h3>
                <p>Actividad simulada</p>
              </div>
            </div>
            <div className="feed">
              {fakeFeed.map((item) => (
                <div className="feed-item" key={item.id}>
                  <div>
                    <strong>{item.user}</strong>
                    <small> · {item.action}</small>
                  </div>
                  <strong style={{ color: "var(--green)" }}>+{fmt(item.amount)} {item.sym}</strong>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <main className="main">
          <section className="hero">
            <div className="badge">Modo {app.appFlags.mode}</div>
            <h1>Más que una faucet: centro de earning, juegos casuales y loops de retención.</h1>
            <p>
              Esta versión ya viene pensada para lo que más suele funcionar en productos de este tipo: claim recurrente, offerwall,
              rewarded ads, lotería, progresión, referidos, tareas diarias y juegos casuales para aumentar tiempo de sesión.
            </p>
            <div className="hero-grid">
              <div className="card" style={{ padding: 0, background: "transparent", border: "none", boxShadow: "none" }}>
                <div className="stats-row">
                  <div className="stat"><span>Claims</span><strong>{fmt(app.stats.claims)}</strong></div>
                  <div className="stat"><span>Victorias</span><strong>{fmt(app.stats.wins)}</strong></div>
                  <div className="stat"><span>Earn tasks</span><strong>{fmt(app.stats.offers)}</strong></div>
                  <div className="stat"><span>Ads reward</span><strong>{fmt(app.stats.ads)}</strong></div>
                </div>
              </div>
              <div className="ad-slot">
                <strong>Header Leaderboard</strong>
                728x90 / 970x90 · Coinzilla / A-ADS / house campaigns
              </div>
            </div>
          </section>

          {app.page === "dashboard" && (
            <>
              <section className="grid grid-2">
                <div className="card">
                  <div className="section-title">
                    <div>
                      <h2>Faucet core</h2>
                      <p>Claim, ruleta, cofre y racha</p>
                    </div>
                    <span className="badge green">retención diaria</span>
                  </div>
                  <div className="cta-row" style={{ marginBottom: 12 }}>
                    <button className="btn" onClick={() => setPage("faucet")}>Ir al faucet</button>
                    <button className="btn secondary" onClick={spinWheel} disabled={app.wheelUsedDay === todayKey()}>Ruleta diaria</button>
                    <button className="btn secondary" onClick={openChest} disabled={app.chestUsedDay === todayKey()}>Cofre diario</button>
                  </div>
                  <div className="grid grid-3">
                    <div className="tile"><div className="label">Cooldown</div><div className="kpi">{claimRemaining}s</div></div>
                    <div className="tile"><div className="label">Tickets</div><div className="kpi">{fmt(app.lotteryTickets)}</div></div>
                    <div className="tile"><div className="label">Último roll</div><div className="kpi">{app.lastClaimRoll ?? "—"}</div></div>
                  </div>
                </div>
                <div className="card">
                  <div className="section-title">
                    <div>
                      <h2>Earn hub</h2>
                      <p>Donde de verdad suele estar el ingreso serio</p>
                    </div>
                    <span className="badge yellow">ARPU</span>
                  </div>
                  <div className="earn-grid">
                    {EARN_TASKS.slice(0, 3).map((task) => (
                      <div className="tile" key={task.id}>
                        <div className="badge">{task.icon} {task.tag}</div>
                        <h4 style={{ marginTop: 10 }}>{task.title}</h4>
                        <p>{task.note}</p>
                        <div style={{ marginTop: 10, color: "var(--green)", fontWeight: 800 }}>{task.reward}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="grid grid-2">
                <div className="card">
                  <div className="section-title">
                    <div>
                      <h2>Misiones diarias</h2>
                      <p>Objetivos cortos para aumentar DAU y recurrencia</p>
                    </div>
                  </div>
                  <div className="list">
                    {missionRows.map((mission) => {
                      const done = mission.progress >= mission.target;
                      return (
                        <div className="mission" key={mission.id}>
                          <div style={{ fontSize: 26 }}>{mission.icon}</div>
                          <div>
                            <strong>{mission.label}</strong>
                            <small>{Math.min(mission.progress, mission.target)}/{mission.target} · +{mission.xp} XP</small>
                            <div className="progress" style={{ marginTop: 8 }}><div style={{ width: `${Math.min(100, (mission.progress / mission.target) * 100)}%` }} /></div>
                          </div>
                          {done && !mission.claimed ? <button className="btn" onClick={() => claimMission(mission)}>+{fmt(mission.reward)}</button> : <span className="reward">{mission.claimed ? "✓" : `+${fmt(mission.reward)}`}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="card">
                  <div className="section-title">
                    <div>
                      <h2>Achievements</h2>
                      <p>Meta-progresión para retención de mediano plazo</p>
                    </div>
                  </div>
                  <div className="list">
                    {achievementRows.map((a) => {
                      const done = a.current >= a.target;
                      return (
                        <div className="mission" key={a.id}>
                          <div style={{ fontSize: 26 }}>🏅</div>
                          <div>
                            <strong>{a.label}</strong>
                            <small>{Math.min(a.current, a.target)}/{a.target}</small>
                            <div className="progress" style={{ marginTop: 8 }}><div style={{ width: `${Math.min(100, (a.current / a.target) * 100)}%` }} /></div>
                          </div>
                          {done && !a.claimed ? <button className="btn yellow" onClick={() => claimAchievement(a)}>Claim</button> : <span className="reward">{a.claimed ? "✓" : `+${fmt(a.reward)}`}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>

              <section className="grid grid-2">
                <div className="card">
                  <div className="section-title"><div><h2>Historial</h2><p>Eventos recientes del usuario</p></div></div>
                  <div className="feed">
                    {app.history.length === 0 ? <div className="feed-item">Sin actividad aún</div> : app.history.map((row) => (
                      <div className="feed-item" key={row.id}>
                        <div>{row.text}</div>
                        <small>{new Date(row.at).toLocaleTimeString()}</small>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="card">
                  <div className="section-title"><div><h2>Loops que conviene mantener</h2><p>Diseñados para aumentar sesiones</p></div></div>
                  <div className="grid grid-2">
                    <div className="tile"><h4>Daily login</h4><p>7-day calendar con racha y pérdida de progreso suave.</p></div>
                    <div className="tile"><h4>Offerwall</h4><p>Monetiza no-payers con payouts más altos que display.</p></div>
                    <div className="tile"><h4>Rewarded ads</h4><p>Rápidos, poco fricción, buenos para revivir sesiones.</p></div>
                    <div className="tile"><h4>Referidos</h4><p>LTV compuesto con comisiones de por vida.</p></div>
                  </div>
                </div>
              </section>
            </>
          )}

          {app.page === "faucet" && (
            <>
              <section className="card">
                <div className="section-title">
                  <div>
                    <h2>Faucet principal</h2>
                    <p>Claim con bonus por nivel y racha</p>
                  </div>
                  <span className="badge">Lv bonus +{level.current.claimBonus}%</span>
                </div>
                <div className="coin-grid">
                  {COINS.map((coin) => (
                    <button key={coin.id} className={`coin-btn ${app.coin === coin.id ? "active" : ""}`} onClick={() => patchApp((next) => { next.coin = coin.id; return next; })}>
                      <div className="coin-line">
                        <div className="coin-icon" style={{ background: coin.color }}>{coin.icon}</div>
                        <div>
                          <strong>{coin.sym}</strong>
                          <div style={{ color: "var(--muted)", fontSize: 12 }}>min wd {fmt(coin.minWithdraw)}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="grid grid-2" style={{ marginTop: 16 }}>
                  <div className="tile" style={{ textAlign: "center" }}>
                    <div className="label">Último roll</div>
                    <div className="kpi">{app.lastClaimRoll ?? "—"}</div>
                    <div style={{ color: "var(--muted)", marginTop: 8 }}>Claim range {currentCoin.faucetMin} - {currentCoin.faucetMax} sat</div>
                  </div>
                  <div className="tile">
                    <div className="label">Verificación</div>
                    {!captcha ? <p style={{ marginTop: 12 }}>Pulsa reclamar para generar captcha.</p> : (
                      <div className="cta-row" style={{ marginTop: 12 }}>
                        <span className="badge">{captcha.q}</span>
                        <input className="input" value={captchaInput} onChange={(e) => setCaptchaInput(e.target.value)} placeholder="respuesta" />
                      </div>
                    )}
                    <div className="cta-row" style={{ marginTop: 12 }}>
                      <button className="btn" onClick={doClaim} disabled={claimRemaining > 0}>{claimRemaining > 0 ? `Espera ${claimRemaining}s` : captcha ? "Verificar y reclamar" : "Generar captcha"}</button>
                      <button className="btn secondary" onClick={spinWheel} disabled={app.wheelUsedDay === todayKey()}>Ruleta</button>
                      <button className="btn secondary" onClick={openChest} disabled={app.chestUsedDay === todayKey()}>Cofre</button>
                    </div>
                  </div>
                </div>
              </section>
              <div className="ad-slot"><strong>Inline banner</strong> 300x250 o native unit entre faucet y earn wall</div>
            </>
          )}

          {app.page === "earn" && (
            <>
              <section className="card">
                <div className="section-title">
                  <div>
                    <h2>Earn Hub</h2>
                    <p>Centro de monetización y retención</p>
                  </div>
                  <span className="badge green">alto potencial</span>
                </div>
                <div className="earn-grid">
                  {EARN_TASKS.map((task) => (
                    <div className="tile" key={task.id}>
                      <div className="badge">{task.icon} {task.tag}</div>
                      <h4 style={{ marginTop: 10 }}>{task.title}</h4>
                      <p>{task.note}</p>
                      <div style={{ marginTop: 10, fontWeight: 800, color: "var(--green)" }}>{task.reward}</div>
                      <button className="btn" style={{ marginTop: 12 }} onClick={() => runEarnTask(task)}>Demo reward</button>
                    </div>
                  ))}
                </div>
              </section>
              <section className="grid grid-2">
                <div className="card">
                  <div className="section-title"><div><h2>Offerwall strategy</h2><p>Lo más rentable suele estar aquí</p></div></div>
                  <div className="list">
                    <div className="tile"><h4>Survey wall</h4><p>Mejor para Tier 1 y payout medio-alto.</p></div>
                    <div className="tile"><h4>Offerwall CPA</h4><p>Installs, trials, signups, game progression.</p></div>
                    <div className="tile"><h4>Rewarded ads</h4><p>Muy útil como “quick win” entre claims.</p></div>
                  </div>
                </div>
                <div className="card">
                  <div className="section-title"><div><h2>Qué quitar o no priorizar</h2><p>Para no dañar retención y reputación</p></div></div>
                  <div className="warning">
                    Evita que la experiencia dependa demasiado de shortlinks agresivos, captchas interminables o PTC de mala calidad.
                    Úsalos solo como capa secundaria, no como corazón del producto.
                  </div>
                </div>
              </section>
            </>
          )}

          {app.page === "casino" && (
            <>
              <section className="card">
                <div className="section-title">
                  <div>
                    <h2>Arcade / Casino</h2>
                    <p>Más juegos casuales para subir tiempo de sesión</p>
                  </div>
                  <span className="badge red">revísalo legalmente antes de monetizar real</span>
                </div>
                <div className="game-grid">
                  {GAME_META.map((meta) => (
                    <button key={meta.id} className={`coin-btn ${game === meta.id ? "active" : ""}`} onClick={() => setGame(meta.id)}>
                      <div className="coin-line"><span style={{ fontSize: 24 }}>{meta.icon}</span><div><strong>{meta.title}</strong><div style={{ color: "var(--muted)", fontSize: 12 }}>{meta.note}</div></div></div>
                    </button>
                  ))}
                </div>
              </section>
              <section className="card">
                <div className="section-title"><div><h2>{GAME_META.find((g) => g.id === game)?.title}</h2><p>Balance disponible: {fmt(balance)} {currentCoin.sym}</p></div></div>
                {GameComponent && <GameComponent balance={balance} onBet={onBet} onWin={onWin} toast={toastNow} progressMission={progressMission} />}
              </section>
              <div className="ad-slot"><strong>In-game ad slot</strong> 300x250 / native rewards / house promo</div>
            </>
          )}

          {app.page === "lottery" && (
            <section className="grid grid-2">
              <div className="card">
                <div className="section-title"><div><h2>Lotería semanal</h2><p>Buen loop para volver a entrar</p></div></div>
                <div className="kpi" style={{ color: "var(--yellow)" }}>{fmt(app.lotteryPool)} sat</div>
                <p style={{ color: "var(--muted)" }}>Tus tickets: {fmt(app.lotteryTickets)} · obtienes 2 por claim</p>
                <div className="cta-row" style={{ marginTop: 14 }}>
                  <button className="btn" onClick={() => buyLotteryTicket(1)}>Comprar 1</button>
                  <button className="btn secondary" onClick={() => buyLotteryTicket(10)}>Comprar 10</button>
                </div>
              </div>
              <div className="card">
                <div className="section-title"><div><h2>Premios sugeridos</h2><p>Modelo simple y entendible</p></div></div>
                <table className="table">
                  <thead><tr><th>Puesto</th><th>Pool</th></tr></thead>
                  <tbody>
                    <tr><td>1°</td><td>50%</td></tr>
                    <tr><td>2°</td><td>20%</td></tr>
                    <tr><td>3°</td><td>10%</td></tr>
                    <tr><td>4°-10°</td><td>reparto restante</td></tr>
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {app.page === "growth" && (
            <>
              <section className="grid grid-2">
                <div className="card">
                  <div className="section-title"><div><h2>Referidos</h2><p>Motor principal de crecimiento orgánico</p></div></div>
                  <div className="tile">
                    <div className="label">Código</div>
                    <div className="kpi">{app.referrals.code}</div>
                    <p style={{ marginTop: 8, color: "var(--muted)" }}>Comisión sugerida: 50% del claim base + 5-10% del ingreso neto de rewarded/offerwall.</p>
                    <div className="cta-row" style={{ marginTop: 12 }}>
                      <button className="btn secondary" onClick={() => navigator.clipboard?.writeText(`https://tu-faucet.com/r/${app.referrals.code}`)}>Copiar link</button>
                      <button className="btn" onClick={addReferral}>Simular referido</button>
                    </div>
                  </div>
                </div>
                <div className="card">
                  <div className="section-title"><div><h2>Embudo de crecimiento</h2><p>Qué debes empujar primero</p></div></div>
                  <div className="list">
                    <div className="tile"><h4>1. Listing</h4><p>Faucet directories y comunidades crypto.</p></div>
                    <div className="tile"><h4>2. Community</h4><p>Telegram, Discord y X con drops y códigos.</p></div>
                    <div className="tile"><h4>3. Paid traffic</h4><p>Crypto ad networks y campañas referidas a earn hub.</p></div>
                    <div className="tile"><h4>4. SEO</h4><p>Contenido útil sobre “earn free crypto”, “best offerwalls”, “how payouts work”.</p></div>
                  </div>
                </div>
              </section>
              <section className="card">
                <div className="section-title"><div><h2>KPI board</h2><p>Lo mínimo que deberías medir desde el día 1</p></div></div>
                <div className="grid grid-4">
                  <div className="tile"><div className="label">D1 Retention</div><div className="kpi">—</div></div>
                  <div className="tile"><div className="label">ARPDAU</div><div className="kpi">—</div></div>
                  <div className="tile"><div className="label">Claim → Earn</div><div className="kpi">—</div></div>
                  <div className="tile"><div className="label">Reward cost / rev</div><div className="kpi">—</div></div>
                </div>
              </section>
            </>
          )}

          {app.page === "wallet" && (
            <>
              <section className="grid grid-2">
                <div className="card">
                  <div className="section-title"><div><h2>Billetera</h2><p>Saldo por moneda</p></div></div>
                  <div className="wallet-grid">
                    {COINS.map((coin) => (
                      <div className="tile" key={coin.id}>
                        <div className="coin-line"><div className="coin-icon" style={{ background: coin.color }}>{coin.icon}</div><strong>{coin.name}</strong></div>
                        <div className="kpi" style={{ fontSize: 22, marginTop: 12 }}>{fmt(app.balances[coin.id])}</div>
                        <div style={{ color: "var(--muted)", marginTop: 6 }}>min withdraw {fmt(coin.minWithdraw)} {coin.sym}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="card">
                  <div className="section-title"><div><h2>Acciones</h2><p>Demo de integración de pagos</p></div></div>
                  <div className="cta-row">
                    <button className="btn" onClick={() => addBalance(app.coin, 5000, "Depósito demo")}>Depositar demo</button>
                    <button className="btn secondary" onClick={withdrawDemo}>Retirar demo</button>
                  </div>
                  <div className="callout" style={{ marginTop: 14 }}>
                    Para modo real, este bloque debe conectarse a backend, ledger, validación anti-fraude y payout provider.
                  </div>
                </div>
              </section>
            </>
          )}

          {app.page === "setup" && (
            <>
              <section className="card">
                <div className="section-title"><div><h2>Checklist para montarla real</h2><p>Desde cero y sin improvisar</p></div></div>
                <div className="setup-grid">
                  <div className="tile"><h4>Backend real</h4><p>Autenticación, ledger, cooldown server-side, webhooks, payout queue, antifraude y panel admin.</p></div>
                  <div className="tile"><h4>Monetización</h4><p>Offerwall + surveys + rewarded ads + banners + house campaigns + referidos.</p></div>
                  <div className="tile"><h4>Seguridad</h4><p>Turnstile, rate limits, fingerprints, detección multi-cuenta, revisión manual de outliers.</p></div>
                  <div className="tile"><h4>Economía</h4><p>Cap de claims, reward budgets por GEO, bloqueo si payout/revenue se rompe.</p></div>
                </div>
                <div className="warning" style={{ marginTop: 14 }}>
                  Si vas a mantener juegos de azar con valor real o retiros convertibles, no lo lances “a ver qué pasa”.
                  Revisa regulación del país desde donde operas y de los países a los que vas a captar usuarios.
                </div>
              </section>
              <section className="card">
                <div className="section-title"><div><h2>Espacios publicitarios incluidos</h2><p>Listos para conectar redes o campañas internas</p></div></div>
                <table className="table">
                  <thead><tr><th>Ubicación</th><th>Uso recomendado</th><th>Objetivo</th></tr></thead>
                  <tbody>
                    <tr><td>Header leaderboard</td><td>Coinzilla / A-ADS / house ads</td><td>eCPM y awareness</td></tr>
                    <tr><td>Inline faucet</td><td>Rewarded / sticky mid-page</td><td>monetizar session depth</td></tr>
                    <tr><td>In-game slot</td><td>native promo / cross-sell</td><td>más clicks internos</td></tr>
                    <tr><td>Sticky footer</td><td>house campaign</td><td>push a offerwall y referrals</td></tr>
                  </tbody>
                </table>
              </section>
            </>
          )}

          <div className="footer-ad ad-slot">
            <strong>Sticky footer unit</strong>
            CTA a offerwall / referral contest / promo code / sponsor
          </div>
        </main>
      </div>
    </div>
  );
}
