const sb = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
const app = document.getElementById('app');
const modal = document.getElementById('modal');
const modalContent = document.getElementById('modalContent');

const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtMin = m => {m=Number(m||0); if(m>=60) return `${Math.floor(m/60)}h ${m%60}m`; return `${m} min`};
const todaySeoul = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'}).format(new Date());
const openModal = html => {modalContent.innerHTML=html; modal.classList.remove('hidden'); modal.setAttribute('aria-hidden','false')};
const closeModal = () => {modal.classList.add('hidden'); modal.setAttribute('aria-hidden','true')};
document.getElementById('closeModal').onclick=closeModal;
modal.addEventListener('click',e=>{if(e.target===modal)closeModal()});

function go(page){location.hash=page; render()}
document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>go(b.dataset.page));
window.addEventListener('hashchange',render);

async function getPlans(){let {data,error}=await sb.from('plans').select('*').is('deleted_at',null).order('start_date',{ascending:true}); if(error) throw error; return data||[]}
async function getTasks(){let {data,error}=await sb.from('tasks').select('*').is('deleted_at',null).order('due_date',{ascending:true}).order('id',{ascending:true}); if(error) throw error; return data||[]}
async function getLogs(){let {data,error}=await sb.from('execution_logs').select('*').order('started_at',{ascending:false}); if(error) throw error; return data||[]}

function shell(title,body,sub=''){return `<section class="page"><div class="paper"><div class="content"><p class="meta">MY PLAN-DO-SEE DIARY / ${esc(title)}</p><h1>${esc(title)}</h1>${sub?`<p class="subtitle">${esc(sub)}</p>`:''}${body}</div></div></section>`}

async function renderIndex(){
  app.innerHTML=shell('My PLAN-DO-SEE DIARY',`
  <div class="notice"> 현재 로그인 없이 이용할 수 있으며, 링크를 아는 사람은 내용을 볼 수 있습니다. 공개해도 괜찮은 내용만 작성하세요..</div>
  <p class="subtitle">A small study notebook for turning plans into action and reflection.</p>
  <div class="index-list">
    <div class="index-item" onclick="go('plan')"><strong>01 PLAN</strong><br>계획 세우기 · 기간 · 성공 기준 · 예상 시간</div>
    <div class="index-item" onclick="go('do')"><strong>02 DO</strong><br>실제로 한 일 · 할 일 · 실행 타임라인</div>
    <div class="index-item" onclick="go('see')"><strong>03 SEE</strong><br>숫자보다 기록을 보고 다음 계획을 생각하기</div>
    <div class="index-item" onclick="go('history')"><strong>04 HISTORY</strong><br>처음 계획과 수정 이력 보기</div>
  </div>`);
}

async function renderPlan(){
  const plans=await getPlans();
  app.innerHTML=shell('PLAN','<div class="controls"><button class="action" onclick="newPlan()">+ NEW PLAN</button></div><div id="plans" class="grid"></div>');
  document.getElementById('plans').innerHTML=plans.map(p=>`
  <article class="plan-card">
    <h3>${esc(p.title)}</h3>
    <span class="pill priority-${p.priority}">${p.priority}</span>
    <p class="meta">${p.start_date} — ${p.end_date}</p>
    <p><b>Success:</b> ${esc(p.success_criteria)}</p>
    <p><b>Estimate:</b> ${fmtMin(p.estimated_minutes)}</p>
    <button class="action" onclick="openPlan('${p.id}')">OPEN PLAN</button>
    <button class="action" onclick="editPlan('${p.id}')">EDIT</button>
  </article>`).join('') || '<div class="empty">No plans yet.</div>';
}
async function newPlan(){
 openModal(`<h2>New plan</h2>${planForm()}`);
 document.getElementById('planForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);const {error}=await sb.from('plans').insert({title:f.get('title'),start_date:f.get('start'),end_date:f.get('end'),priority:f.get('priority'),success_criteria:f.get('success'),estimated_minutes:Number(f.get('minutes'))});if(error)return alert(error.message);closeModal();renderPlan()};
}
function planForm(p={}){return `<form id="planForm" class="form">
<label>Plan name<input name="title" required value="${esc(p.title||'')}"></label>
<div class="split"><label>Start date<input type="date" name="start" required value="${p.start_date||''}"></label><label>End date<input type="date" name="end" required value="${p.end_date||''}"></label></div>
<label>Priority<select name="priority"><option ${p.priority==='LOW'?'selected':''}>LOW</option><option ${p.priority==='MID'?'selected':''}>MID</option><option ${p.priority==='HIGH'?'selected':''}>HIGH</option></select></label>
<label>Success criteria<textarea name="success" required>${esc(p.success_criteria||'')}</textarea></label>
<label>Estimated minutes<input type="number" min="0" name="minutes" required value="${p.estimated_minutes||0}"></label>
<button class="action">SAVE</button></form>`}
async function editPlan(id){
 const {data:p,error}=await sb.from('plans').select('*').eq('id',id).single();if(error)return alert(error.message);
 openModal(`<h2>Edit plan</h2><p class="meta">The old value will be saved to revision history before updating.</p>${planForm(p)}`);
 document.getElementById('planForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);
  const {data:rev,error:rerr}=await sb.from('plan_revisions').select('revision_number').eq('plan_id',id).order('revision_number',{ascending:false}).limit(1);
  if(rerr)return alert(rerr.message); const n=(rev?.[0]?.revision_number||0)+1;
  const {error:e1}=await sb.from('plan_revisions').insert({plan_id:id,title:p.title,start_date:p.start_date,end_date:p.end_date,priority:p.priority,success_criteria:p.success_criteria,estimated_minutes:p.estimated_minutes,revision_number:n});
  if(e1)return alert(e1.message);
  const {error:e2}=await sb.from('plans').update({title:f.get('title'),start_date:f.get('start'),end_date:f.get('end'),priority:f.get('priority'),success_criteria:f.get('success'),estimated_minutes:Number(f.get('minutes'))}).eq('id',id);
  if(e2)return alert(e2.message);closeModal();renderPlan();
 }
}
async function openPlan(id){location.hash='do'; sessionStorage.setItem('selectedPlan',id); render()}

async function renderDo(){
 const [plans,tasks,logs]=await Promise.all([getPlans(),getTasks(),getLogs()]);
 const selected=sessionStorage.getItem('selectedPlan')||plans[0]?.id;
 const plan=plans.find(p=>p.id===selected)||plans[0];
 if(!plan){app.innerHTML=shell('DO','<div class="empty">Create a plan first.</div>');return}
 let list=tasks.filter(t=>t.plan_id===plan.id);
 app.innerHTML=shell('DO',`
 <div class="controls">
 <select id="planSel">${plans.map(p=>`<option value="${p.id}" ${p.id===plan.id?'selected':''}>${esc(p.title)}</option>`).join('')}</select>
 <input id="q" placeholder="Search tasks...">
 <select id="status"><option value="">All status</option><option value="in_progress">In progress</option><option value="completed">Completed</option></select>
 <select id="priority"><option value="">All priority</option><option>HIGH</option><option>MID</option><option>LOW</option></select>
 <select id="tag"><option value="">All tags</option>${[...new Set(list.map(t=>t.tag))].map(t=>`<option>${esc(t)}</option>`).join('')}</select>
 <select id="sort"><option value="due">Due date ↑</option><option value="priority">Priority ↑</option><option value="title">Title A-Z</option></select>
 <button class="action" onclick="newTask('${plan.id}')">+ TASK</button>
 </div>
 <p class="meta">Sort rule: selected field ascending; ties are resolved by task ID ascending.</p>
 <div id="taskList"></div>`);
 const refresh=()=>{let x=list.filter(t=>(!q.value||t.title.toLowerCase().includes(q.value.toLowerCase()))&&(!status.value||t.status===status.value)&&(!priority.value||t.priority===priority.value)&&(!tag.value||t.tag===tag.value));
 const pr={HIGH:1,MID:2,LOW:3};x.sort((a,b)=>{let z=sort.value==='priority'?pr[a.priority]-pr[b.priority]:sort.value==='title'?a.title.localeCompare(b.title):a.due_date.localeCompare(b.due_date);return z||a.id.localeCompare(b.id)});document.getElementById('taskList').innerHTML=x.map(t=>taskCard(t,logs.filter(l=>l.task_id===t.id))).join('')||'<div class="empty">No matching tasks.</div>'};
 ['q','status','priority','tag','sort'].forEach(id=>document.getElementById(id).oninput=refresh);
 document.getElementById('planSel').onchange=e=>{sessionStorage.setItem('selectedPlan',e.target.value);renderDo()};
 refresh();
}
function taskCard(t,ls){return `<article class="task-card"><div class="task-row"><input type="checkbox" ${t.status==='completed'?'checked':''} onchange="toggleTask('${t.id}',this.checked)"><div><h3 class="${t.status==='completed'?'done':''}">${esc(t.title)}</h3><p class="meta">Due ${t.due_date} · ${t.priority} · ${esc(t.tag)} · ${fmtMin(t.estimated_minutes)} · ${t.status}</p>${ls.map(l=>`<div class="timeline"><b>${new Date(l.started_at).toLocaleString()}</b><br>Actual ${fmtMin(l.actual_minutes)}<br>${l.blocker?`Blocker: ${esc(l.blocker)}<br>`:''}${l.reflection?`See: ${esc(l.reflection)}`:''}</div>`).join('')}<div class="controls"><button class="action" onclick="editTask('${t.id}')">EDIT</button><button class="action" onclick="logExecution('${t.id}')">ADD DO</button><button class="action danger" onclick="deleteTask('${t.id}')">DELETE</button></div></div></div></article>`}
async function newTask(planId){openModal(`<h2>New task</h2>${taskForm()}`);document.getElementById('taskForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);const {error}=await sb.from('tasks').insert({plan_id:planId,title:f.get('title'),due_date:f.get('due'),priority:f.get('priority'),tag:f.get('tag'),estimated_minutes:Number(f.get('minutes'))});if(error)return alert(error.message);closeModal();renderDo()}}
function taskForm(t={}){return `<form id="taskForm" class="form"><label>Task<input name="title" required value="${esc(t.title||'')}"></label><label>Due date<input type="date" name="due" required value="${t.due_date||''}"></label><label>Priority<select name="priority"><option ${t.priority==='LOW'?'selected':''}>LOW</option><option ${t.priority==='MID'?'selected':''}>MID</option><option ${t.priority==='HIGH'?'selected':''}>HIGH</option></select></label><label>Tag<input name="tag" required value="${esc(t.tag||'')}"></label><label>Estimated minutes<input type="number" min="0" name="minutes" required value="${t.estimated_minutes||0}"></label><button class="action">SAVE</button></form>`}
async function editTask(id){const {data:t,error}=await sb.from('tasks').select('*').eq('id',id).single();if(error)return alert(error.message);openModal(`<h2>Edit task</h2>${taskForm(t)}`);document.getElementById('taskForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);const {error}=await sb.from('tasks').update({title:f.get('title'),due_date:f.get('due'),priority:f.get('priority'),tag:f.get('tag'),estimated_minutes:Number(f.get('minutes'))}).eq('id',id);if(error)return alert(error.message);closeModal();renderDo()}}
async function toggleTask(id,checked){const newStatus=checked?'completed':'in_progress';const {error}=await sb.from('tasks').update({status:newStatus}).eq('id',id).neq('status',newStatus);if(error)alert(error.message);renderDo()}
async function deleteTask(id){if(!confirm('Delete this task?'))return;const {error}=await sb.from('tasks').update({deleted_at:new Date().toISOString()}).eq('id',id);if(error)return alert(error.message);renderDo()}
async function logExecution(taskId){openModal(`<h2>Add execution record</h2><form id="logForm" class="form"><label>Start<input type="datetime-local" name="start" required></label><label>End<input type="datetime-local" name="end" required></label><label>Actual minutes<input type="number" min="0" name="minutes" required></label><label>Blocker<textarea name="blocker" placeholder="What blocked you?"></textarea></label><label>See<textarea name="reflection" placeholder="What did you learn?"></textarea></label><button class="action">SAVE DO</button></form>`);document.getElementById('logForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);const {error}=await sb.from('execution_logs').insert({task_id:taskId,started_at:new Date(f.get('start')).toISOString(),ended_at:new Date(f.get('end')).toISOString(),actual_minutes:Number(f.get('minutes')),blocker:f.get('blocker')||'',reflection:f.get('reflection')||''});if(error)return alert(error.message);closeModal();renderDo()}}
async function renderSee(){
 const [plans,tasks,logs]=await Promise.all([getPlans(),getTasks(),getLogs()]); const selected=sessionStorage.getItem('selectedPlan')||plans[0]?.id;const p=plans.find(x=>x.id===selected)||plans[0];if(!p)return;
 const ts=tasks.filter(t=>t.plan_id===p.id), ids=new Set(ts.map(t=>t.id));const ls=logs.filter(l=>ids.has(l.task_id));
 const completed=ts.filter(t=>t.status==='completed'), delayed=ts.filter(t=>t.status!=='completed'&&t.due_date<todaySeoul()), blocked=ts.filter(t=>ls.some(l=>l.task_id===t.id&&l.blocker.trim()));
 const est=ts.reduce((a,t)=>a+t.estimated_minutes,0), actual=ls.reduce((a,l)=>a+l.actual_minutes,0);
 app.innerHTML=shell('SEE',`<div class="controls"><select id="seePlan">${plans.map(x=>`<option value="${x.id}" ${x.id===p.id?'selected':''}>${esc(x.title)}</option>`).join('')}</select></div>
 <div class="grid">
 <div class="stat" onclick="showRecords('tasks')"><span>PLAN / TASKS</span><b>${ts.length}</b></div>
 <div class="stat" onclick="showRecords('completed')"><span>COMPLETED</span><b>${completed.length}</b></div>
 <div class="stat" onclick="showRecords('delayed')"><span>DELAYED</span><b>${delayed.length}</b></div>
 <div class="stat" onclick="showRecords('blocked')"><span>BLOCKED</span><b>${blocked.length}</b></div>
 </div>
 <div class="paper" style="margin-top:18px"><p><b>Estimated:</b> ${fmtMin(est)}</p><p><b>Actual:</b> ${fmtMin(actual)}</p><p><b>Difference:</b> ${actual-est>=0?'+':''}${fmtMin(Math.abs(actual-est))}${actual-est<0?' less':''}</p></div>
 <div style="margin-top:20px" class="form"><label>WHAT I LEARNED<textarea id="learn"></textarea></label><label>WHAT SHOULD I CHANGE?<textarea id="next"></textarea></label><button class="action" onclick="saveReflection('${p.id}')">SAVE REFLECTION</button></div>`);
 document.getElementById('seePlan').onchange=e=>{sessionStorage.setItem('selectedPlan',e.target.value);renderSee()};
}
async function saveReflection(planId){const text=document.getElementById('learn').value,next=document.getElementById('next').value;const {error}=await sb.from('reflections').insert({plan_id:planId,reflection_text:text,next_action:next});if(error)return alert(error.message);alert('Reflection saved. You can copy the next action into a new plan.')}
async function showRecords(kind){const [tasks,logs]=await Promise.all([getTasks(),getLogs()]);const selected=sessionStorage.getItem('selectedPlan');let ts=tasks.filter(t=>t.plan_id===selected);const blockedIds=new Set(logs.filter(l=>l.blocker.trim()).map(l=>l.task_id));if(kind==='completed')ts=ts.filter(t=>t.status==='completed');if(kind==='delayed')ts=ts.filter(t=>t.status!=='completed'&&t.due_date<todaySeoul());if(kind==='blocked')ts=ts.filter(t=>blockedIds.has(t.id));openModal(`<h2>Evidence records</h2>${ts.map(t=>`<p><b>${esc(t.title)}</b><br>Due ${t.due_date} · ${t.status} · ${esc(t.tag)}</p>`).join('')||'<p>No records.</p>'}`)}
async function renderHistory(){const plans=await getPlans();let html='';for(const p of plans){const {data:r}=await sb.from('plan_revisions').select('*').eq('plan_id',p.id).order('revision_number',{ascending:true});html+=`<article class="plan-card"><h3>${esc(p.title)}</h3><p>Current: ${p.start_date} — ${p.end_date} · ${p.priority} · ${fmtMin(p.estimated_minutes)}</p>${(r||[]).map(x=>`<div class="timeline"><b>Revision ${x.revision_number}</b><br>${x.start_date} — ${x.end_date}<br>${x.priority} · ${fmtMin(x.estimated_minutes)}<br>${esc(x.success_criteria)}</div>`).join('')||'<p class="meta">No revisions yet.</p>'}</article>`}
app.innerHTML=shell('HISTORY',`<div class="grid">${html}</div><button class="action" onclick="exportAll()">EXPORT ALL DATA</button>`)}
async function exportAll(){const [plans,tasks,logs]=await Promise.all([getPlans(),getTasks(),getLogs()]);const {data:rev}=await sb.from('plan_revisions').select('*');const {data:ref}=await sb.from('reflections').select('*');const blob=new Blob([JSON.stringify({exported_at:new Date().toISOString(),plans,tasks,execution_logs:logs,plan_revisions:rev||[],reflections:ref||[]},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='pds-diary-export.json';a.click();URL.revokeObjectURL(a.href)}
async function render(){try{const p=location.hash.slice(1)||'index';if(p==='plan')await renderPlan();else if(p==='do')await renderDo();else if(p==='see')await renderSee();else if(p==='history')await renderHistory();else await renderIndex()}catch(e){app.innerHTML=shell('Connection error',`<div class="notice">Supabase에 연결하지 못했습니다.</div><pre>${esc(e.message||e)}</pre><p>config.js의 URL/key와 Supabase SQL 실행 여부를 확인하세요.</p>`)}}render();
