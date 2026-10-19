// 월간 리포트 공개 링크: 로그인 없이 그 달 리포트만 보는 링크 (r.html#<보관 이름>.<열쇠>)
// 리더·담당자가 '공개 링크 만들기'를 누르면 지금 화면의 리포트를 사본으로 만들어 암호화한 뒤 Storage mg-photos/share/ 에 올린다.
// 열쇠는 링크 # 뒤에만 있다. 교체 기록 사진(data:)은 먼저 사진 저장소에 올려 주소로 바꾼다.
// 사용법: node tools/patch-publink.mjs   (patch-reportlink.mjs 다음)
import fs from 'fs';
const F = 'src/app.html';
let h = fs.readFileSync(F, 'utf8');
if (h.includes('id="rshare"')) { console.log('이미 적용돼 있어요'); process.exit(0); }
fs.writeFileSync('src/app.before-publink.html', h);
const rep = (a, b) => { if (!h.includes(a)) throw new Error('찾지 못함: ' + a.slice(0, 60)); h = h.replace(a, b); };

rep(`.rlink-btn{background:var(--panel-2)!important;color:var(--ink)!important;border:1px solid var(--line)!important}`,
`.rlink-btn{background:var(--panel-2)!important;color:var(--ink)!important;border:1px solid var(--line)!important}
.rlink-btn[disabled]{opacity:.55;cursor:wait}
.rshare{display:flex;flex-direction:column;gap:10px;max-width:880px;padding:16px 18px;border-radius:var(--r-lg);background:var(--panel);border:1px solid var(--line-soft)}
.rshare-t{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 10px}
.rshare-t b{font-size:14px;font-weight:800}
.rshare-t small{font-size:12px;color:var(--ink-3)}
.rshare-row{display:flex;gap:8px;flex-wrap:wrap}
.rshare-row input{flex:1 1 260px;min-width:0;min-height:42px;border-radius:12px;border:1px solid var(--line);background:var(--panel-2);color:var(--ink);font:inherit;font-size:13px;padding:0 12px}
.rshare-row a,.rshare-row button{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:0 16px;border-radius:999px;font:inherit;font-size:13px;font-weight:800;cursor:pointer;text-decoration:none}
.rshare-row button{border:0;background:var(--ink);color:var(--bg)}
.rshare-row a{border:1px solid var(--line);color:var(--ink);background:var(--panel-2)}`);
rep(`.solo-bar,.rlink-btn{display:none!important}`, `.solo-bar,.rlink-btn,.rshare{display:none!important}`);

// 버튼: 링크 복사 → 공개 링크 만들기 (가드너에게는 숨김)
rep(`5.66l1-1"/></svg>링크 복사</button>`, `5.66l1-1"/></svg>공개 링크 만들기</button>`);
rep(`<div class="seg" id="rseg" role="group" aria-label="리포트 월">`, `<div class="rshare" id="rshare" hidden></div>
      <div class="seg" id="rseg" role="group" aria-label="리포트 월">`);

rep(`$("#rlink-btn").onclick = async () => {
  const u = reportLink();
  try{ await navigator.clipboard.writeText(u); toast(\`\${MLong(rMonth)} 리포트 링크를 복사했어요\`); }
  catch(e){ window.prompt("이 링크를 복사해 주세요", u); }
};`, `// 공개 링크: 지금 리포트의 사본(그 시점 기준)을 암호화해 올리고, 열쇠는 링크 # 뒤에만 둔다
$("#rlink-btn").hidden = !SB_ON || USER.role === "crew";
async function shareReport(){
  reportView();
  const el = $("#report").cloneNode(true), map = new Map();
  for(const im of el.querySelectorAll("img")){ const s = im.getAttribute("src")||"";
    if(s.startsWith("data:")){ if(!map.has(s)) map.set(s, await putPhoto(s, "share")); im.setAttribute("src", map.get(s)); } }
  if([...map.values()].some(v=>v.startsWith("data:"))) throw new Error("사진을 올리지 못했어요");
  const css = [...document.querySelectorAll("style")].map(s=>s.textContent).filter(t=>!t.includes("@font-face")).join("\\n");
  const doc = {v:1, month:rMonth, title:\`\${MLong(rMonth)} 월간 리포트 · MOBILITY GARDEN\`, file:\`모빌리티가든_월간리포트_\${rMonth}\`, html:el.innerHTML, css, at:new Date().toISOString(), by:USER.name||""};
  const raw = crypto.getRandomValues(new Uint8Array(32)), iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt"]);
  const ct = new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM", iv}, key, new TextEncoder().encode(JSON.stringify(doc))));
  const body = new Uint8Array(12 + ct.length); body.set(iv); body.set(ct, 12);
  const id = crypto.randomUUID();
  const r = await fetch(\`\${SB.url}/storage/v1/object/mg-photos/share/\${id}.bin\`, {method:"POST", body,
    headers:{apikey:SB.key, ...(SB.key.startsWith("eyJ")?{Authorization:\`Bearer \${SB.key}\`}:{}), "x-mg-token":SB.token, "Content-Type":"application/octet-stream", "x-upsert":"false"}});
  if(!r.ok) throw new Error("upload " + r.status + " " + (await r.text()).slice(0,200));
  const k = b64e(raw).replace(/\\+/g,"-").replace(/\\//g,"_").replace(/=+$/,"");
  return new URL("r.html", location.href).href.split("#")[0] + "#" + id + "." + k;
}
$("#rlink-btn").onclick = async () => {
  const btn = $("#rlink-btn"), m = rMonth; btn.disabled = true;
  try{
    const u = await shareReport(), box = $("#rshare");
    box.innerHTML = \`<div class="rshare-t"><b>\${MLong(m)} 리포트 공개 링크</b><small>로그인 없이 볼 수 있어요 · 지금 내용 기준 사본이라 이후 기록은 반영되지 않아요</small></div>
      <div class="rshare-row"><input readonly value="\${u}" aria-label="공개 링크"><button type="button">복사</button><a href="\${u}" target="_blank" rel="noopener">열어 보기</a></div>\`;
    box.hidden = false;
    const inp = box.querySelector("input"); inp.onclick = () => inp.select();
    const copy = async () => { try{ await navigator.clipboard.writeText(u); toast("공개 링크를 복사했어요"); }catch(e){ inp.select(); toast("링크를 길게 눌러 복사해 주세요"); } };
    box.querySelector("button").onclick = copy; copy();
  }catch(e){ console.warn(e); toast(/upload 4\\d\\d/.test(e.message) ? "공개 링크 저장이 아직 허용되지 않았어요 (설정 필요)" : "공개 링크를 만들지 못했어요. 잠시 뒤 다시 해 주세요"); }
  finally{ btn.disabled = false; }
};`);
// 달을 바꾸면 이전 달 링크 상자는 닫는다
rep(`v=>{rMonth=v; soloWant=null; reportView();`, `v=>{rMonth=v; soloWant=null; $("#rshare").hidden=true; reportView();`);

fs.writeFileSync(F, h);
console.log('월간 리포트 공개 링크 적용 완료');
