// 월간 리포트 단독 링크: <주소>#report/2026-10 으로 열면 메뉴 없이 리포트 한 장만 보인다 (로그인은 그대로 필요)
// 리포트 화면에 '링크 복사' 버튼 추가. 사용법: node tools/patch-reportlink.mjs
import fs from 'fs';
const F = 'src/app.html';
let h = fs.readFileSync(F, 'utf8');
if (h.includes('id="rlink-btn"')) { console.log('이미 적용돼 있어요'); process.exit(0); }
fs.writeFileSync('src/app.before-reportlink.html', h);
const rep = (a, b) => { if (!h.includes(a)) throw new Error('찾지 못함: ' + a.slice(0, 60)); h = h.replace(a, b); };

// 1) 스타일
rep('@media print{', `/* 월간 리포트 단독 링크 (#report/YYYY-MM) */
.r-btns{display:flex;flex-wrap:wrap;gap:8px}
.rlink-btn{background:var(--panel-2)!important;color:var(--ink)!important;border:1px solid var(--line)!important}
.solo-bar{display:none}
body.solo .side,body.solo .detail,body.solo .topbar,body.solo .scrim,body.solo .vocpop{display:none!important}
body.solo .app{display:block}
body.solo .main{max-width:940px;margin:0 auto;padding:20px 16px 60px}
body.solo .solo-bar{display:flex;align-items:center;gap:10px;font-size:11px;letter-spacing:1px;color:var(--ink-3)}
body.solo .solo-bar b{font-size:13px;font-weight:800;letter-spacing:.3px;color:var(--ink)}
body.solo .solo-bar .sp{flex:1}
body.solo .solo-bar a{color:var(--ink-2);font-size:12px;letter-spacing:0;text-decoration:none;border:1px solid var(--line);border-radius:999px;padding:7px 12px}
body.solo .solo-bar a:hover{color:var(--ink);background:var(--panel-2)}
body.solo #view-report .head p{display:none}
@media print{
  .solo-bar,.rlink-btn{display:none!important}
  body.solo .main{max-width:none;padding:0}`);

// 2) 단독 화면 상단 줄 + 링크 복사 버튼
rep('<div class="topbar">', `<div class="solo-bar"><b>MOBILITY GARDEN</b><span>KAKAO MOBILITY · LINKAGELAB</span><span class="sp"></span><a href="./" id="solo-home">모빌리티 가든 열기</a></div>
    <div class="topbar">`);
rep(`<button type="button" class="add-btn pdf-btn" id="pdf-btn">`, `<div class="r-btns"><button type="button" class="add-btn rlink-btn" id="rlink-btn"><svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/></svg>링크 복사</button><button type="button" class="add-btn pdf-btn" id="pdf-btn">`);
rep(`PDF로 저장</button></div>`, `PDF로 저장</button></div></div>`);

// 3) 월을 바꾸면 단독 화면 주소도 그 달로
rep(`segment($("#rseg"), ms, rMonth, v=>{rMonth=v; reportView();}, false);`,
    `segment($("#rseg"), ms, rMonth, v=>{rMonth=v; soloWant=null; reportView(); if(SOLO) history.replaceState(null,"","#report/"+rMonth);}, false);`);

rep(`  if(!rMonth || !ms.includes(rMonth)) rMonth = ms[ms.length-1];`,
    `  if(soloWant && ms.includes(soloWant)) rMonth = soloWant;   // 단독 링크의 달은 기록이 늦게 와도 지킨다
  if(!rMonth || !ms.includes(rMonth)) rMonth = ms[ms.length-1];`);

// 4) 링크 복사 + 단독 화면 진입
rep(`$("#pdf-btn").onclick =`, `let soloWant = null;
const SOLO = /^#report(\\/\\d{4}-\\d{2})?$/.test(location.hash);
const reportLink = () => location.origin + location.pathname + "#report/" + rMonth;
$("#rlink-btn").onclick = async () => {
  const u = reportLink();
  try{ await navigator.clipboard.writeText(u); toast(\`\${MLong(rMonth)} 리포트 링크를 복사했어요\`); }
  catch(e){ window.prompt("이 링크를 복사해 주세요", u); }
};
$("#pdf-btn").onclick =`);
rep(`summary(); board(); detail(false); locView(); monView(); setView(state.view);`,
    `summary(); board(); detail(false); locView(); monView(); setView(state.view);
// 리포트 단독 링크: 메뉴·상세 칸 없이 리포트만. 마지막으로 보던 화면(mg-ui)은 건드리지 않는다
if(SOLO){
  soloWant = location.hash.split("/")[1] || null; if(soloWant) rMonth = soloWant;
  document.body.classList.add("solo"); document.querySelector(".app").classList.remove("on-daily");
  state.view = "report"; Object.keys(VIEWS).forEach(k=>{ $("#view-"+k).hidden = k!=="report"; });
  document.title = "월간 리포트 · MOBILITY GARDEN"; reportView();
}
addEventListener("hashchange", ()=>{ if(SOLO !== /^#report(\\/\\d{4}-\\d{2})?$/.test(location.hash)) location.reload(); else if(SOLO){ const m=location.hash.split("/")[1]; if(m && m!==rMonth){ rMonth=m; reportView(); } } });`);
rep(`if(location.hash==="#crew" || USER.role==="crew") recordChooser();`, `if(!SOLO && (location.hash==="#crew" || USER.role==="crew")) recordChooser();`);

fs.writeFileSync(F, h);
console.log('월간 리포트 단독 링크 적용 완료');
