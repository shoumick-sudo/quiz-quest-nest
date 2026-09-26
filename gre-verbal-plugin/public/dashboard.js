const app=document.querySelector("#app");
let dashboard=null,rpcId=0,pending=new Map();

function esc(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
function pct(v){return v==null?"—":Math.round(Number(v)*100)+"%"}
function when(v){if(!v)return"—";const d=new Date(v),now=new Date(),diff=d-now;if(Math.abs(diff)<60000)return"now";if(diff<0)return"due";const hrs=Math.round(diff/3600000);return hrs<24?"in "+hrs+"h":"in "+Math.round(hrs/24)+"d"}
function rpc(method,params){return new Promise((resolve,reject)=>{const id=++rpcId;pending.set(id,{resolve,reject});window.parent.postMessage({jsonrpc:"2.0",id,method,params},"*")})}
window.addEventListener("message",(e)=>{if(e.source!==window.parent)return;const m=e.data;if(!m||m.jsonrpc!=="2.0")return;if(typeof m.id==="number"){const p=pending.get(m.id);if(!p)return;pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result)}else if(m.method==="ui/notifications/tool-result"){hydrate(m.params)}});
const bridgeReady=(async()=>{try{await rpc("ui/initialize",{appInfo:{name:"gre-verbal-dashboard",version:"0.4.0"},appCapabilities:{},protocolVersion:"2026-01-26"});window.parent.postMessage({jsonrpc:"2.0",method:"ui/notifications/initialized",params:{}},"*")}catch(e){console.error(e)}})();
async function callTool(name,args){if(window.openai?.callTool)return window.openai.callTool(name,args);await bridgeReady;return rpc("tools/call",{name,arguments:args})}
function hydrate(out){const d=out?.structuredContent||out;if(d?.dashboard){dashboard=d.dashboard;render()}}
function evidenceAccuracy(s){if(!s?.attempts)return null;return (s.correct||0)/s.attempts}
function section(title,items,renderer,cls=""){return '<section class="panel '+cls+'"><h3>'+esc(title)+'</h3><div class="list">'+(items.length?items.map(renderer).join(""):'<div class="empty">Nothing here yet.</div>')+"</div></section>"}
function render(){
 if(!dashboard){app.innerHTML='<div class="dashboard"><div class="empty" style="padding:20px">Loading dashboard…</div></div>';return}
 const sessions=dashboard.recentSessions||[],last=sessions[0],skills=dashboard.skills||[],evidence=dashboard.evidenceSkills||[],due=dashboard.dueReviews||[],vocab=dashboard.vocabularyDue||[],errors=dashboard.topErrors||[],priorities=dashboard.nextPriorities||[];
 const skillRows=skills.length?skills:evidence.map(s=>({skill:s.skill,state:"EVIDENCE",accuracy:evidenceAccuracy(s),notes:(s.attempts||0)+" evidence point(s)"}));
 let html='<div class="dashboard"><header class="dash-head"><div><div class="dash-title">GRE Verbal Mastery</div><div class="muted">Dashboard cache · source: '+esc(dashboard.masterySource||"evaluation-evidence")+'</div></div><div class="dash-actions"><button class="btn" id="refresh">Refresh</button><button class="btn primary" id="startReview">Start due review</button></div></header>';
 html+='<div class="grid"><div class="metric"><span>Due reviews</span><strong>'+esc(dashboard.dueReviewCount||0)+'</strong></div><div class="metric"><span>Latest accuracy</span><strong>'+pct(last?.accuracy)+'</strong></div><div class="metric"><span>Vocabulary due</span><strong>'+vocab.length+'</strong></div><div class="metric"><span>Tracked skills</span><strong>'+skillRows.length+'</strong></div></div>';
 html+='<div class="sections">';
 html+=section("Skills",skillRows.slice(0,10),s=>'<div class="row"><div class="grow"><div class="name">'+esc(s.skill)+'</div><div class="small">'+esc(s.notes||"")+'</div><div class="bar"><div class="fill" style="width:'+Math.max(0,Math.min(100,Math.round((s.accuracy??evidenceAccuracy(s)??0)*100)))+'%"></div></div></div><span class="pill state">'+esc(s.state||"EVIDENCE")+'</span></div>');
 html+=section("Next priorities",priorities.slice(0,8),p=>'<div class="row"><div class="grow"><div class="name">'+esc(p)+'</div></div><button class="btn practicePriority" data-priority="'+esc(p)+'">Practice</button></div>',"priority");
 html+=section("Review queue",due.slice(0,10),r=>'<div class="row"><div class="grow"><div class="name">'+esc(r.target)+'</div><div class="small">'+esc(r.type)+" · "+esc(r.reason||"")+'</div></div><span class="pill due">'+esc(when(r.dueAt))+'</span></div>');
 html+=section("Vocabulary due",vocab.slice(0,10),v=>'<div class="row"><div class="grow"><div class="name">'+esc(v.word)+'</div><div class="small">'+esc(v.status||"DEVELOPING")+" · interval "+esc(v.intervalDays||0)+'d</div></div></div>');
 html+=section("Recurring errors",errors.slice(0,8),e=>'<div class="row"><div class="grow"><div class="name">'+esc(e.category)+'</div></div><span class="pill">'+esc(e.count)+'</span></div>');
 html+=section("Recent sessions",sessions.slice(0,6),s=>'<div class="row"><div class="grow"><div class="name">'+esc(s.sessionId)+'</div><div class="small">'+esc(s.pacingSummary||"")+'</div></div><span class="session-acc">'+pct(s.accuracy)+'</span></div>');
 html+='</div><div class="footer-note">Google Drive remains the authoritative mastery record. This dashboard visualizes cached tracker state plus evidence from completed sessions.</div></div>';
 app.innerHTML=html;bind();
}
function bind(){
 document.querySelector("#refresh")?.addEventListener("click",async()=>{const out=await callTool("render_gre_dashboard",{learnerKey:dashboard?.learnerKey||"default"});hydrate(out)});
 document.querySelector("#startReview")?.addEventListener("click",async()=>{const out=await callTool("get_due_gre_reviews",{learnerKey:dashboard?.learnerKey||"default",limit:5});const reviews=out?.structuredContent?.reviews||[];if(window.openai?.sendFollowUpMessage)await window.openai.sendFollowUpMessage({prompt:"Start a GRE REVIEW MISTAKES session using these due targets: "+JSON.stringify(reviews)+". Generate changed-context questions rather than replaying prior items. Give one interactive question at a time. After each response, record the retrieval outcome with record_gre_review_outcome.",scrollToBottom:true})});
 document.querySelectorAll(".practicePriority").forEach(el=>el.addEventListener("click",async()=>{if(window.openai?.sendFollowUpMessage)await window.openai.sendFollowUpMessage({prompt:"Start targeted GRE practice on this priority: "+el.dataset.priority+". Use GENERATED-PRACTICE unless official calibration is explicitly needed. Give one clickable question at a time.",scrollToBottom:true})}));
}
if(window.openai?.toolOutput)hydrate(window.openai.toolOutput);
