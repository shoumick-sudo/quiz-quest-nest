const app=document.querySelector("#app");
let rpcId=0,pending=new Map(),kind="single",section=null,questions=[],index=0,responses={},marked={},spent={},started=Date.now(),deadline=null,entered=Date.now(),submitted=false,statusText="",timerHandle=null;

function rpc(method,params){return new Promise((resolve,reject)=>{const id=++rpcId;pending.set(id,{resolve,reject});window.parent.postMessage({jsonrpc:"2.0",id,method,params},"*")})}
function notify(method,params){window.parent.postMessage({jsonrpc:"2.0",method,params},"*")}
window.addEventListener("message",(e)=>{if(e.source!==window.parent)return;const m=e.data;if(!m||m.jsonrpc!=="2.0")return;if(typeof m.id==="number"){const p=pending.get(m.id);if(!p)return;pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result)}else if(m.method==="ui/notifications/tool-result")hydrate(m.params)});

const bridgeReady=(async()=>{try{await rpc("ui/initialize",{appInfo:{name:"gre-verbal-test-engine",version:"0.4.0"},appCapabilities:{},protocolVersion:"2026-01-26"});notify("ui/notifications/initialized",{})}catch(e){console.error(e)}})();

async function callTool(name,args){if(window.openai?.callTool)return window.openai.callTool(name,args);await bridgeReady;return rpc("tools/call",{name,arguments:args})}
function typeOf(q){if(q.responseType)return q.responseType;if(q.questionType==="SE")return"multi";if(q.blanks?.length)return"tc_blanks";if(q.passageSentences?.length)return"select_in_passage";return q.choiceMode||"single"}
function current(){return questions[index]||null}
function isAnswered(q){const r=responses[q.questionId];if(!r)return false;const t=typeOf(q);if(t==="single")return(r.selected||[]).length===1;if(t==="multi"){const n=(r.selected||[]).length;return n>=(q.minSelections||1)&&n<=(q.maxSelections||99)}if(t==="tc_blanks"){const ids=new Set((r.blankSelections||[]).map(x=>x.blankId));return(q.blanks||[]).every(b=>ids.has(b.id))}return t==="select_in_passage"?Boolean(r.sentenceId):false}
function addTime(){const q=current();if(!q||submitted)return;spent[q.questionId]=(spent[q.questionId]||0)+Math.max(0,(Date.now()-entered)/1000);entered=Date.now()}
function persist(){if(!window.openai?.setWidgetState)return;window.openai.setWidgetState({modelContent:kind==="section"?"Learner is taking GRE section "+section.sessionId+", question "+(index+1)+" of "+questions.length+".":"Learner is viewing GRE question "+(current()?.questionId||"")+".",privateContent:{sessionId:section?.sessionId||null,index,responses,marked,spent,started,deadline,submitted}})}
function restore(id){const s=window.openai?.widgetState?.privateContent;if(!s)return;if(id&&s.sessionId&&id!==s.sessionId)return;index=Math.max(0,Math.min(Number(s.index||0),Math.max(questions.length-1,0)));responses=s.responses||responses;marked=s.marked||marked;spent=s.spent||spent;started=Number(s.started||started);deadline=s.deadline||deadline;submitted=Boolean(s.submitted)}
function hydrate(out){const d=out?.structuredContent||out;if(!d)return;if(d.section?.questions){kind="section";section=d.section;questions=section.questions;responses={};marked={};(d.savedResponses||[]).forEach(r=>responses[r.questionId]=r);(d.markedQuestionIds||[]).forEach(id=>marked[id]=true);index=0;started=Date.now();deadline=section.durationSeconds?started+section.durationSeconds*1000:null;submitted=false;restore(section.sessionId);entered=Date.now();startTimer();render()}else if(d.question){kind="single";section={sessionId:"single:"+d.question.questionId,title:d.question.title||"GRE Verbal Practice",mode:d.question.mode||"practice"};questions=[d.question];responses={};marked={};spent={};index=0;started=Date.now();deadline=null;submitted=false;restore(section.sessionId);entered=Date.now();stopTimer();render()}}
function stopTimer(){if(timerHandle)clearInterval(timerHandle);timerHandle=null}
function startTimer(){stopTimer();if(!deadline||submitted)return;timerHandle=setInterval(()=>{updateTimer();if(timeLeft()<=0){stopTimer();finishSection(true)}},1000)}
function timeLeft(){return deadline?Math.max(0,Math.ceil((deadline-Date.now())/1000)):null}
function formatTime(s){return s==null?"":Math.floor(s/60)+":"+String(s%60).padStart(2,"0")}
function updateTimer(){const el=document.querySelector("#timer");if(el){el.textContent=formatTime(timeLeft());el.classList.toggle("warn",timeLeft()<=300)}}
