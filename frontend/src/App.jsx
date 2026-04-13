import { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const COINS = ["btc", "doge", "trx", "ltc", "bnb", "eth"];

const css = `
:root{--bg:#08101b;--card:#10192a;--line:#24324a;--text:#eef4ff;--muted:#93a3c4;--cyan:#48d9ff;--green:#4ef0a1;--yellow:#f7c948;--red:#ff6b87}
*{box-sizing:border-box}body{margin:0;background:linear-gradient(180deg,#08101b,#0d1524);color:var(--text);font-family:Inter,system-ui,sans-serif}
.wrap{max-width:1180px;margin:0 auto;padding:20px}.card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:18px}.grid{display:grid;gap:16px}.g2{grid-template-columns:1fr 1fr}.g3{grid-template-columns:repeat(3,1fr)}
input,select,button{font:inherit}input,select{width:100%;background:#0a1423;border:1px solid var(--line);border-radius:12px;padding:10px 12px;color:var(--text)}button{border:none;border-radius:12px;padding:10px 14px;font-weight:800;cursor:pointer}.btn{background:linear-gradient(135deg,var(--cyan),var(--green));color:#04111a}.btn2{background:#0a1423;color:var(--text);border:1px solid var(--line)}
.row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.muted{color:var(--muted)}.pill{padding:6px 10px;border-radius:999px;background:#0a1423;border:1px solid var(--line)}.kpi{font-size:28px;font-weight:900}.list{display:flex;flex-direction:column;gap:10px}.item{padding:12px;border-radius:14px;background:#0a1423;border:1px solid var(--line)}table{width:100%;border-collapse:collapse}th,td{padding:10px 8px;border-bottom:1px solid var(--line);text-align:left}
@media(max-width:900px){.g2,.g3{grid-template-columns:1fr}}
`;

function fmt(n){ return Math.floor(Number(n||0)).toLocaleString("en-US") }

async function api(path, { method = "GET", body, token } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Error");
  return data;
}

export default function App(){
  const [token, setToken] = useState(localStorage.getItem("cdrop_token") || "");
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [profile, setProfile] = useState(null);
  const [coin, setCoin] = useState("btc");
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState(5000);
  const [message, setMessage] = useState("");

  const currentBalance = useMemo(() => {
    const row = profile?.balances?.find((x) => x.coin_id === coin);
    return Number(row?.amount || 0);
  }, [profile, coin]);

  async function loadMe() {
    if (!token) return;
    const data = await api("/api/me", { token });
    setProfile(data);
  }

  useEffect(() => {
    if (!token) return;
    localStorage.setItem("cdrop_token", token);
    loadMe().catch((e) => setMessage(e.message));
  }, [token]);

  async function submitAuth(e){
    e.preventDefault();
    setMessage("");
    try {
      const data = await api(`/api/auth/${mode}`, {
        method: "POST",
        body: mode === "register" ? { email, password, referralCode } : { email, password }
      });
      setToken(data.token);
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function doClaim(){
    try {
      await api("/api/faucet/claim", { method: "POST", token, body: { coinId: coin, captchaToken: "demo" } });
      await loadMe();
      setMessage("Claim hecho");
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function earn(kind){
    const amount = kind === "offerwall" ? 1200 : kind === "survey" ? 800 : kind === "rewarded_ad" ? 80 : 140;
    try {
      await api("/api/earn/credit", { method: "POST", token, body: { kind, coinId: coin, amount } });
      await loadMe();
      setMessage(`Reward ${kind} acreditado`);
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function buyTickets(qty){
    try {
      await api("/api/lottery/buy", { method: "POST", token, body: { coinId: coin, qty } });
      await loadMe();
      setMessage(`Compraste ${qty} tickets`);
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function requestWithdraw(){
    try {
      await api("/api/wallet/withdraw-request", { method: "POST", token, body: { coinId: coin, amount: Number(withdrawAmount), address: withdrawAddress } });
      await loadMe();
      setMessage("Retiro enviado a revisión");
    } catch (err) {
      setMessage(err.message);
    }
  }

  function logout(){
    localStorage.removeItem("cdrop_token");
    setToken("");
    setProfile(null);
  }

  if (!token || !profile) {
    return <div className="wrap"><style>{css}</style><div className="card" style={{maxWidth:460,margin:"60px auto"}}>
      <h1 style={{marginTop:0}}>CryptoDrop Real</h1>
      <p className="muted">Faucet real starter con backend, ledger, cooldown y retiros a revisión.</p>
      <form className="grid" onSubmit={submitAuth}>
        <div className="row"><button type="button" className={mode === "login" ? "btn" : "btn2"} onClick={() => setMode("login")}>Login</button><button type="button" className={mode === "register" ? "btn" : "btn2"} onClick={() => setMode("register")}>Registro</button></div>
        <input placeholder="correo" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {mode === "register" && <input placeholder="código referido opcional" value={referralCode} onChange={(e) => setReferralCode(e.target.value)} />}
        <button className="btn" type="submit">Entrar</button>
      </form>
      {message && <p style={{color:"#ffd3dd"}}>{message}</p>}
    </div></div>
  }

  return <div className="wrap"><style>{css}</style>
    <div className="row" style={{justifyContent:"space-between",marginBottom:18}}>
      <div><h1 style={{margin:"0 0 6px"}}>CryptoDrop Real</h1><div className="muted">{profile.user.email}</div></div>
      <div className="row"><span className="pill">Streak {profile.user.streak}</span><span className="pill">XP {fmt(profile.user.xp)}</span><button className="btn2" onClick={logout}>Salir</button></div>
    </div>
    <div className="grid g2">
      <div className="card">
        <h2 style={{marginTop:0}}>Faucet</h2>
        <div className="row">
          <select value={coin} onChange={(e) => setCoin(e.target.value)}>{COINS.map((c) => <option key={c} value={c}>{c.toUpperCase()}</option>)}</select>
          <button className="btn" onClick={doClaim}>Claim</button>
        </div>
        <div className="grid g3" style={{marginTop:14}}>
          <div className="item"><div className="muted">Saldo</div><div className="kpi">{fmt(currentBalance)}</div></div>
          <div className="item"><div className="muted">Tickets</div><div className="kpi">{fmt(profile.lotteryTickets)}</div></div>
          <div className="item"><div className="muted">Pool</div><div className="kpi">{fmt(profile.lotteryPool)}</div></div>
        </div>
      </div>
      <div className="card">
        <h2 style={{marginTop:0}}>Earn</h2>
        <div className="row">
          <button className="btn" onClick={() => earn("offerwall")}>Offerwall demo</button>
          <button className="btn2" onClick={() => earn("survey")}>Survey demo</button>
          <button className="btn2" onClick={() => earn("rewarded_ad")}>Rewarded ad</button>
        </div>
        <p className="muted" style={{marginTop:12}}>Estos botones simulan la acreditación después de un callback real del proveedor.</p>
      </div>
    </div>

    <div className="grid g2" style={{marginTop:16}}>
      <div className="card">
        <h2 style={{marginTop:0}}>Lotería</h2>
        <div className="row"><button className="btn" onClick={() => buyTickets(1)}>Comprar 1</button><button className="btn2" onClick={() => buyTickets(10)}>Comprar 10</button></div>
      </div>
      <div className="card">
        <h2 style={{marginTop:0}}>Retiro</h2>
        <div className="grid">
          <input placeholder="wallet / FaucetPay username / address" value={withdrawAddress} onChange={(e) => setWithdrawAddress(e.target.value)} />
          <input type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} />
          <button className="btn" onClick={requestWithdraw}>Solicitar retiro</button>
        </div>
      </div>
    </div>

    <div className="grid g2" style={{marginTop:16}}>
      <div className="card">
        <h2 style={{marginTop:0}}>Balances</h2>
        <div className="list">{profile.balances.map((b) => <div className="item" key={b.coin_id}><strong>{b.coin_id.toUpperCase()}</strong> · {fmt(b.amount)}</div>)}</div>
      </div>
      <div className="card">
        <h2 style={{marginTop:0}}>Ledger reciente</h2>
        <div className="list">{profile.recent.map((row) => <div className="item" key={row.id}><strong>{row.type}</strong> · {row.note || "—"}<div className="muted">{fmt(row.amount)} {row.coin_id.toUpperCase()}</div></div>)}</div>
      </div>
    </div>

    {message && <p style={{marginTop:16,color:"#c7ffe0"}}>{message}</p>}
  </div>
}
