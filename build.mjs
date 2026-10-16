// 모빌리티 가든 빌드: src/app.html + src/photos → index.html
// 화면(스크립트·사진·데이터·폰트)은 '화면 열쇠'(src/secrets.json 의 appKey, 고정)로 암호화한다.
// 계정마다 화면 열쇠를 그 계정 비밀번호로 잠근 값을 Supabase mg_keys 에 두고, 기본 리더 계정 하나는 이 페이지에 내장한다.
// 사용법: MG_PASSWORD=총괄관리자비밀번호 node build.mjs   (총괄 관리자 이메일·이름은 src/secrets.json 의 masterId·masterName)
import fs from 'fs';
import { webcrypto as crypto } from 'crypto';

const PASSWORD = process.env.MG_PASSWORD;
if (!PASSWORD) { console.error('MG_PASSWORD 환경변수로 기본 리더 계정 비밀번호를 넣어 주세요.'); process.exit(1); }

const FONT_DIR = process.env.MG_FONT_DIR || 'C:/Users/linkagelab/AppData/Local/Microsoft/Windows/Fonts/';
const ITER = 310000;
const b64 = u => Buffer.from(u).toString('base64');
const enc = new TextEncoder();

// ── 비밀 설정 (저장소 제외) ──
let SEC = {}; try { SEC = JSON.parse(fs.readFileSync('src/secrets.json', 'utf8')); } catch {}
if (!SEC.masterToken) { SEC.masterToken = Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString('base64url'); fs.writeFileSync('src/secrets.json', JSON.stringify(SEC, null, 2)); }
if (!SEC.appKey) { SEC.appKey = b64(crypto.getRandomValues(new Uint8Array(32))); fs.writeFileSync('src/secrets.json', JSON.stringify(SEC, null, 2)); console.log('화면 열쇠를 새로 만들었어요 (src/secrets.json)'); }
const MASTER_ID = (process.env.MG_MASTER_ID || SEC.masterId || 'jamie').trim().toLowerCase(); // 총괄 관리자 로그인 이메일(로그인 창에 jamie 만 써도 됨)
const MASTER_NAME = process.env.MG_MASTER_NAME || SEC.masterName || '총괄 관리자';
const SB_URL = (process.env.MG_SB_URL || SEC.sbUrl || '').replace(/\/+$/, ''), SB_KEY = process.env.MG_SB_KEY || SEC.sbKey || '', SB_TOKEN = process.env.MG_SB_TOKEN || SEC.sbToken || '';
if (SB_TOKEN) for (const n of ['schema', 'storage', 'accounts', 'delete'])
  fs.writeFileSync(`src/${n}.filled.sql`, fs.readFileSync(`supabase/${n}.sql`, 'utf8').replaceAll('__MG_TOKEN__', SB_TOKEN).replaceAll('__MG_MASTER__', SEC.masterToken));

// ── 앱 조립 ──
let html = fs.readFileSync('src/app.html', 'utf8');
const photos = fs.readdirSync('src/photos').filter(f => f.endsWith('.jpg'))
  .map(f => `${f.slice(0, -4)}:"data:image/jpeg;base64,${fs.readFileSync('src/photos/' + f).toString('base64')}"`).join(',');
html = html.replace('/*__IMGS__*/', photos).replace('/*__FONTS__*/', '')
  .replace('/*__SB_URL__*/', SB_URL).replace('/*__SB_KEY__*/', SB_KEY).replace('/*__SB_TOKEN__*/', SB_TOKEN);
console.log(SB_URL && SB_KEY ? 'Supabase 연결: ' + SB_URL : 'Supabase 미설정 — 기록은 각 기기에만 저장돼요');

const s = html.indexOf('<script>'), e = html.indexOf('</script>', s);
const js = html.slice(s + 8, e);
html = html.slice(0, s) + html.slice(e + 9);

let css = '';
const font = (f, w) => `@font-face{font-family:"Kakao Big Sans";font-weight:${w};font-display:swap;src:url(data:font/ttf;base64,${fs.readFileSync(FONT_DIR + f).toString('base64')}) format("truetype")}`;
try { css = [font('KAKAOBIGSANS-REGULAR.TTF', 400), font('KAKAOBIGSANS-BOLD.TTF', 700), font('KAKAOBIGSANS-EXTRABOLD.TTF', '800 900')].join('\n'); }
catch { console.warn('Kakao Big Sans를 찾지 못해 기본 서체로 빌드해요.'); }

// ── 암호화 ──
const seal = async (key, data) => { const iv = crypto.getRandomValues(new Uint8Array(12)); return { iv: b64(iv), ct: b64(new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(data)))) }; };
const appKey = await crypto.subtle.importKey('raw', Buffer.from(SEC.appKey, 'base64'), 'AES-GCM', false, ['encrypt']);
const payload = await seal(appKey, JSON.stringify({ css, js }));

// 기본 리더 계정 칸 (Supabase 에 같은 아이디 칸이 생기면 그쪽이 우선)
const idh = Buffer.from(await crypto.subtle.digest('SHA-256', enc.encode('mg:' + MASTER_ID))).toString('hex');
const salt = crypto.getRandomValues(new Uint8Array(16));
const pwBase = await crypto.subtle.importKey('raw', enc.encode(PASSWORD), 'PBKDF2', false, ['deriveKey']);
const pwKey = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' }, pwBase, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
const blob = await seal(pwKey, JSON.stringify({ k: SEC.appKey, id: MASTER_ID, name: MASTER_NAME, role: 'leader', mt: SEC.masterToken }));
const master = { idh, salt: b64(salt), iter: ITER, iv: blob.iv, blob: blob.ct }; // 이메일·이름은 넣지 않는다(공개 페이지)

const titleEnd = html.indexOf('</title>') + 8;
const head = html.slice(0, titleEnd), rest = html.slice(titleEnd);
const gate = `
<div class="gate" id="gate">
  <form class="gate-card" id="gate-form" autocomplete="on">
    <b class="gate-brand">MOBILITY GARDEN</b>
    <span class="gate-sub">카카오모빌리티 식물 교체 기록 · 링키지랩</span>
    <label for="gate-id">이메일</label>
    <input id="gate-id" type="text" inputmode="email" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="name@company.com" required>
    <label for="gate-pw">비밀번호</label>
    <input id="gate-pw" type="password" autocomplete="current-password" required>
    <label class="gate-keep"><input type="checkbox" id="gate-keep"> 이 기기에서 로그인 유지</label>
    <button type="submit" id="gate-btn">로그인</button>
    <p class="gate-err" id="gate-err" role="alert"></p>
  </form>
</div>
<style>
body.locked .app,body.locked .scrim{display:none}
.gate{position:fixed;inset:0;z-index:100;display:grid;place-items:center;padding:16px;background:var(--bg)}
.gate-card{width:min(360px,100%);display:flex;flex-direction:column;gap:10px;background:var(--panel);border:1px solid var(--line-soft);border-radius:var(--r-lg);padding:28px 24px;box-shadow:var(--shadow)}
.gate-brand{font-size:18px;font-weight:800;letter-spacing:.3px}
.gate-sub{font-size:12.5px;color:var(--ink-3);margin-bottom:10px}
.gate-card label{font-size:13px;font-weight:700;color:var(--ink-2)}
.gate-card input[type=password],.gate-card input[type=text]{min-height:52px;border-radius:12px;border:2px solid var(--line);background:var(--panel-2);color:var(--ink);font:inherit;font-size:18px;padding:0 14px}
.gate-card input:focus{outline:none;border-color:var(--accent-text)}
.gate-keep{display:flex;align-items:center;gap:8px;font-weight:400!important}
.gate-keep input{width:18px;height:18px}
.gate-card button{min-height:52px;border:0;border-radius:12px;background:var(--accent);color:var(--accent-ink);font:inherit;font-size:16px;font-weight:800;cursor:pointer}
.gate-card button[disabled]{opacity:.5}
.gate-err{margin:0;min-height:20px;font-size:13px;color:#dc2f28}
</style>
<script>
(()=>{
const D={iv:"${payload.iv}",ct:"${payload.ct}"};
const M=${JSON.stringify(master)};
const SB={url:"${SB_URL}",key:"${SB_KEY}"};
const S="mg-session";
const u8=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const hex=async s=>[...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,"0")).join("");
async function slotFor(idh){
  if(SB.url){ try{ const r=await fetch(SB.url+"/rest/v1/mg_keys?select=idh,salt,iter,iv,blob&idh=eq."+idh,{headers:{apikey:SB.key}}); if(r.ok){ const a=await r.json(); if(a.length) return a[0]; } }catch(e){} }
  return idh===M.idh ? M : null;
}
async function unlock(slot,pw){
  const b=await crypto.subtle.importKey("raw",new TextEncoder().encode(pw),"PBKDF2",false,["deriveKey"]);
  const k=await crypto.subtle.deriveKey({name:"PBKDF2",salt:u8(slot.salt),iterations:slot.iter,hash:"SHA-256"},b,{name:"AES-GCM",length:256},false,["decrypt"]);
  return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:u8(slot.iv)},k,u8(slot.blob))));
}
async function open(sess){
  const k=await crypto.subtle.importKey("raw",u8(sess.k),"AES-GCM",false,["decrypt"]);
  const {css,js}=JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:u8(D.iv)},k,u8(D.ct))));
  window.MG_USER={id:sess.id,name:sess.name,role:sess.role,idh:sess.idh};
  window.MG_KRAW=sess.k; window.MG_MT=sess.mt||""; window.MG_MASTER={idh:M.idh};
  const st=document.createElement("style"); st.textContent=css; document.head.appendChild(st);
  document.body.classList.remove("locked"); document.getElementById("gate").remove();
  const sc=document.createElement("script"); sc.textContent=js; document.body.appendChild(sc);
}
document.body.classList.add("locked");
(async()=>{ try{ const raw=localStorage.getItem(S); if(raw){ await open(JSON.parse(raw)); return; } }catch(e){ try{localStorage.removeItem(S)}catch(_){} }
  document.getElementById("gate-id").focus(); })();
document.getElementById("gate-form").addEventListener("submit",async ev=>{
  ev.preventDefault(); const btn=document.getElementById("gate-btn"), err=document.getElementById("gate-err");
  const id=document.getElementById("gate-id").value.trim().toLowerCase(), pw=document.getElementById("gate-pw").value;
  btn.disabled=true; btn.textContent="확인하는 중…"; err.textContent="";
  try{
    const idh=id==="jamie" ? M.idh : await hex("mg:"+id), slot=await slotFor(idh);
    if(!slot) throw new Error("no");
    const x=await unlock(slot,pw);
    const sess={k:x.k,id:x.id,name:x.name,role:x.role,idh,mt:x.mt||""};
    if(document.getElementById("gate-keep").checked){ try{ localStorage.setItem(S,JSON.stringify(sess)); }catch(e){} }
    await open(sess);
  }catch(e){ err.textContent="이메일 또는 비밀번호가 맞지 않아요."; btn.disabled=false; btn.textContent="로그인"; }
});
})();
</script>`;

const favicon = `<link rel="icon" href="data:image/svg+xml,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><circle cx='32' cy='32' r='32' fill='#1d4ed8'/><text x='32' y='33' text-anchor='middle' dominant-baseline='central' font-family='Arial, Helvetica, sans-serif' font-weight='800' font-size='21' letter-spacing='-0.5' fill='#ffffff'>LKG</text></svg>")}">`;
const out = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
${favicon}
${head}
</head>
<body>
${rest.trim()}
${gate}
</body>
</html>
`;
fs.writeFileSync('index.html', out);
console.log(`index.html ${(out.length / 1e6).toFixed(2)}MB · 사진 ${photos.split('data:image').length - 1}장 · 기본 리더 계정: ${MASTER_ID}`);
