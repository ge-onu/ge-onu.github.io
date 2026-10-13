(() => {
// 거누: 건우에 대한 RAG 챗봇. 응답 서버(Cloudflare Worker)가 안 되면 브라우저 안의 같은 엔진으로 간단히 답한다.
const chatEnabled=true;
const chatEndpoint=(window.PORTFOLIO_CHAT&&window.PORTFOLIO_CHAT.endpoint)||'';
const ragBase=new URL('rag/',document.currentScript.src).href;
const sendIcon=new URL('assets/chat-send-72.png',document.currentScript.src).href;
const avatar=new URL('assets/chat-mascot-160.png',document.currentScript.src).href;
// 머리말의 "연락하기"(data-contact)가 이 창을 연다. 스크립트가 없으면 홈의 연락 구간으로 이동한다.
const triggers=[...document.querySelectorAll('[data-contact]')];if(!triggers.length)return;
let contact=triggers[0];
const dialog=document.createElement('dialog');dialog.className='contact-dialog';dialog.setAttribute('aria-labelledby','contact-title');dialog.innerHTML='<button class="panel-close" type="button" aria-label="Contact 닫기">×</button><h2 id="contact-title">메시지 남기기</h2><p>모든 문의에 대해 편하게 연락해 주세요.</p><form><label class="contact-inline-field"><span>이름</span><input name="name" autocomplete="name" required maxlength="80"></label><label class="contact-inline-field"><span>답장받을 이메일</span><input name="email" type="email" autocomplete="email" required maxlength="200"></label><label>문의내용<textarea name="message" rows="8" required maxlength="3000"></textarea></label><label class="contact-hp" aria-hidden="true">웹사이트<input name="website" tabindex="-1" autocomplete="off"></label><button class="btn btn-primary" type="submit">메시지 보내기</button><p class="contact-note">보낸 내용은 건우의 Slack으로 바로 전달되고, 확인과 답장에만 씁니다. 메일이 편하시면 <a href="mailto:goonbam009@gmail.com">goonbam009@gmail.com</a></p><p class="contact-status" role="status"></p></form>';
const success=document.createElement('div');success.className='contact-success';success.setAttribute('role','status');success.innerHTML='<div class="contact-success-icon"><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="28" fill="currentColor"/><path d="m19 32 9 9 18-19" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg></div><p>성공적으로 전송 요청을 보냈습니다.</p>';dialog.append(success);
let successTimer;
dialog.addEventListener('close',()=>{clearTimeout(successTimer);dialog.classList.remove('is-sent');});
function showContactSuccess(){
 dialog.classList.add('is-sent');
 successTimer=setTimeout(async()=>{
  if(!dialog.open)return;
  await dialog.animate([{opacity:1,transform:'translateY(0) scale(1)'},{opacity:0,transform:'translateY(8px) scale(.97)'}],{duration:220,easing:'ease-in'}).finished;
  dialog.close();contact.focus();
 },1600);
}
document.body.append(dialog);triggers.forEach(t=>{t.setAttribute('aria-haspopup','dialog');t.addEventListener('click',e=>{e.preventDefault();contact=t;dialog.showModal();});});dialog.querySelector('.panel-close').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
function contactUnavailable(status,attempted=true){
 status.replaceChildren(document.createTextNode(attempted?'전송을 확인하지 못했습니다. 입력한 내용은 그대로 남아 있습니다. 잠시 후 다시 시도하거나 이메일로 연락해 주세요. ':'현재 메시지 전송 연결을 준비 중입니다. 이메일로 연락해 주세요. '));
 const link=document.createElement('a');link.href='mailto:goonbam009@gmail.com';link.textContent='goonbam009@gmail.com';status.append(link);
}
dialog.querySelector('form').addEventListener('submit',async e=>{
 e.preventDefault();const form=e.target,button=form.querySelector('[type=submit]'),status=form.querySelector('.contact-status');
 const endpoint=window.PORTFOLIO_CONTACT?.endpoint;
 if(!endpoint){contactUnavailable(status);return;}
 button.disabled=true;button.textContent='전송 중…';status.textContent='';
 try{
 const url=new URL(endpoint);if(url.protocol!=='https:')throw new Error('configuration');
 const f=new FormData(form);const name=String(f.get('name')).trim(),email=String(f.get('email')).trim(),message=String(f.get('message')).trim();
 if(!name||!email||!message)throw new Error('empty');
 const response=await fetch(url.href,{method:'POST',mode:'cors',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,email,message,website:String(f.get('website')||''),page:location.pathname+location.hash}),signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw new Error('send');
 const result=await response.json();if(result.ok!==true)throw new Error('send');
 form.reset();status.textContent='';showContactSuccess();
 }
 catch{contactUnavailable(status);}
 finally{button.disabled=false;button.textContent='메시지 보내기';}
});
if(!window.PORTFOLIO_CONTACT?.endpoint){
 // 전송 서버가 없으면 폼 대신 메일 주소와 복사 버튼을 보여 준다.
 const mail='goonbam009@gmail.com',box=document.createElement('div');box.className='contact-mail';
 box.innerHTML='<a class="contact-mail-address" href="mailto:'+mail+'">'+mail+'</a><div class="contact-mail-actions"><a class="btn btn-primary" href="mailto:'+mail+'">메일 쓰기</a><button class="btn btn-secondary contact-copy" type="button">이메일 복사</button></div><p class="contact-status" role="status"></p>';
 dialog.querySelector('form').replaceWith(box);dialog.querySelector('h2').textContent='이메일로 연락하기';
 const status=box.querySelector('.contact-status');
 box.querySelector('.contact-copy').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(mail);status.textContent='이메일 주소를 복사했습니다.';}
  catch{getSelection().selectAllChildren(box.querySelector('.contact-mail-address'));status.textContent='주소를 선택해 두었습니다. 직접 복사해 주세요.';}
 });
}
if(!chatEnabled)return;
const launch=document.createElement('button');launch.type='button';launch.className='chat-launcher';launch.setAttribute('aria-label','거누 열기: 건우에 대한 RAG 챗봇. 드래그 또는 방향키로 위치 이동');launch.setAttribute('aria-controls','portfolio-chat');launch.setAttribute('aria-expanded','false');launch.innerHTML='<img src="'+avatar+'" alt="" draggable="false" width="160" height="160" decoding="async">';
const panel=document.createElement('section');panel.id='portfolio-chat';panel.className='chat-panel';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-labelledby','chat-title');panel.innerHTML='<header><img class="chat-header-avatar" src="'+avatar+'" alt="" width="160" height="160" decoding="async"><div><small>건우에 대한 RAG 챗봇</small><h2 id="chat-title">거누 <span class="chat-rag-badge">RAG</span></h2></div><button type="button" class="panel-close" aria-label="챗봇 닫기">×</button></header><div class="chat-messages" role="log" aria-live="polite"><div class="chat-bubble"><p>안녕하세요, 거누예요. 건우의 포트폴리오와 공개 기록을 검색해서, 찾은 근거로만 답하는 RAG 챗봇이에요.</p><p>기록에 없는 건 모른다고 말하고, 답마다 근거 링크를 붙여요.</p></div><div class="chat-suggest" aria-label="추천 질문"><button type="button">Mealplanning에서 맡은 역할은?</button><button type="button">서버리스는 어디까지 했어요?</button><button type="button">장애 원인은 어떻게 좁혀 가나요?</button></div></div><p class="chat-foot">geonu.site 공개 기록만 검색 · 문장은 AI가 근거 안에서 작성</p><form><label class="chat-input-label" for="chat-input">질문</label><div class="chat-compose"><textarea id="chat-input" rows="1" placeholder="건우에 대해 궁금한 점을 물어보세요" maxlength="1000" required></textarea><button type="submit" aria-label="질문 입력"><img src="'+sendIcon+'" alt="" width="72" height="72" decoding="async"></button></div></form>';
document.body.append(launch,panel);
const launcherGap=24;
let launcherAnchor={right:launcherGap,bottom:launcherGap};
function viewportBounds(){const v=window.visualViewport;return {left:v?.offsetLeft||0,top:v?.offsetTop||0,width:v?.width||innerWidth,height:v?.height||innerHeight};}
function renderLauncher(){
 const v=viewportBounds(),w=launch.offsetWidth||56,h=launch.offsetHeight||56;
 const right=Math.min(launcherAnchor.right,Math.max(launcherGap,v.width-w-launcherGap));
 const bottom=Math.min(launcherAnchor.bottom,Math.max(launcherGap,v.height-h-launcherGap));
 Object.assign(launch.style,{left:(v.left+Math.max(0,v.width-w-right))+'px',top:(v.top+Math.max(0,v.height-h-bottom))+'px',right:'auto',bottom:'auto'});
 positionPanel();
}
function place(x,y){
 const v=viewportBounds();launcherAnchor={right:Math.max(launcherGap,v.left+v.width-x-56),bottom:Math.max(launcherGap,v.top+v.height-y-56)};renderLauncher();
}
function positionPanel(){const r=launch.getBoundingClientRect(),v=viewportBounds(),w=Math.min(360,v.width-24),h=Math.min(470,v.height-24);panel.style.width=w+'px';panel.style.height=h+'px';panel.style.left=Math.max(v.left+12,Math.min(v.left+v.width-w-12,r.right-w))+'px';panel.style.top=Math.max(v.top+12,Math.min(v.top+v.height-h-12,r.bottom-h))+'px';}
let morphing=false;
async function toggle(open){
 if(morphing)return;hint.hidden=true;morphing=true;
 const r=launch.getBoundingClientRect();positionPanel();
 if(open){
 panel.hidden=false;launch.style.visibility='hidden';const t=panel.getBoundingClientRect();
 const start=`translate(${r.left-t.left}px,${r.top-t.top}px) scale(${r.width/t.width},${r.height/t.height})`;
 const scaleAt=s=>`translate(${(1-s)*t.width}px,${(1-s)*t.height}px) scale(${s})`;
 await panel.animate([
  {transform:start,offset:0,easing:'cubic-bezier(.42,0,.2,1)'},
  {transform:scaleAt(1.045),offset:.68,easing:'cubic-bezier(.42,0,.58,1)'},
  {transform:scaleAt(.993),offset:.88,easing:'cubic-bezier(.42,0,.58,1)'},
  {transform:'none',offset:1}
 ],{duration:620,easing:'linear'}).finished;
 panel.querySelector('textarea').focus();
 }else{const t=panel.getBoundingClientRect();await panel.animate([{transform:'none',opacity:1},{transform:`translate(${r.left-t.left}px,${r.top-t.top}px) scale(${r.width/t.width},${r.height/t.height})`,opacity:.2}],{duration:240,easing:'ease-in'}).finished;panel.hidden=true;launch.style.visibility='';launch.focus();}
 launch.setAttribute('aria-expanded',String(open));morphing=false;
}

let drag=null,moved=false;
launch.addEventListener('pointerdown',e=>{hint.hidden=true;if(e.button!==0)return;const r=launch.getBoundingClientRect();drag={x:e.clientX,y:e.clientY,left:r.left,top:r.top};moved=false;launch.setPointerCapture(e.pointerId);});
launch.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>5)moved=true;if(moved)place(drag.left+dx,drag.top+dy);});
function end(){if(drag&&moved){const r=launch.getBoundingClientRect();try{localStorage.setItem('portfolio-chat-position',JSON.stringify(launcherAnchor));}catch{}}drag=null;}
launch.addEventListener('pointerup',end);launch.addEventListener('pointercancel',end);launch.addEventListener('click',()=>{if(moved){moved=false;return;}toggle(panel.hidden);});
launch.addEventListener('keydown',e=>{const d={ArrowLeft:[-16,0],ArrowRight:[16,0],ArrowUp:[0,-16],ArrowDown:[0,16]}[e.key];if(d){e.preventDefault();const r=launch.getBoundingClientRect();place(r.left+d[0],r.top+d[1]);}});
panel.querySelector('.panel-close').addEventListener('click',()=>toggle(false));panel.addEventListener('keydown',e=>{if(e.key==='Escape')toggle(false);});
const history=[];let asking=false,local=null;
async function localAnswer(q){
 if(!local)local=Promise.all([import(ragBase+'engine.js'),import(ragBase+'answer.js'),fetch(ragBase+'data/geonu-rag.json').then(r=>r.json())]).then(([E,A,d])=>({E:new E.Engine(d,{chat:true}),A}));
 const {E,A}=await local;const ans=E.answer(A.retrievalQuery(q,history));
 if(ans.decision==='refuse')return {text:A.refusalText(ans),sources:[],mode:'refuse'};
 return {text:A.plainAnswer(E,ans),sources:A.sources(E,ans),mode:'plain'};
}
async function ask(q){
 if(chatEndpoint){try{const ctl=new AbortController();const t=setTimeout(()=>ctl.abort(),25000);
  const r=await fetch(chatEndpoint.replace(/\/$/,'')+'/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({q,history:history.slice(-6)}),signal:ctl.signal,credentials:'omit'});clearTimeout(t);
  const j=await r.json();if(j&&j.text)return j;}catch{}}
 return localAnswer(q);
}
function bubble(cls){const b=document.createElement('div');b.className='chat-bubble'+(cls?' '+cls:'');return b;}
async function submitQuestion(value){
 if(asking||!value)return;asking=true;
 const log=panel.querySelector('.chat-messages');panel.querySelector('.chat-suggest')?.remove();
 const user=bubble('chat-bubble--user');user.textContent=value;log.append(user);
 const wait=bubble('chat-bubble--wait');wait.setAttribute('aria-label','근거를 찾는 중');wait.innerHTML='<i></i><i></i><i></i>';log.append(wait);log.scrollTop=log.scrollHeight;
 let res;try{res=await ask(value);}catch{res={text:'지금은 답을 만들지 못했어요. 잠시 뒤 다시 물어봐 주세요.',sources:[],mode:'error'};}
 wait.remove();
 const b=bubble(res.mode==='refuse'?'chat-bubble--refuse':'');
 res.text.split(/\n+/).filter(Boolean).forEach(t=>{const p=document.createElement('p');p.textContent=t;b.append(p);});
 if(res.sources&&res.sources.length){const s=document.createElement('div');s.className='chat-sources';const h=document.createElement('span');h.textContent='근거';s.append(h);
  res.sources.forEach(x=>{const a=document.createElement('a');a.href=x.url;a.textContent=x.label;s.append(a);});b.append(s);}
 if(res.mode==='plain'){const n=document.createElement('small');n.className='chat-mode';n.textContent='간단 모드: 근거 문장을 그대로 보여 드려요';b.append(n);}
 log.append(b);log.scrollTop=log.scrollHeight;
 history.push({role:'user',text:value},{role:'bot',text:res.text});asking=false;
}
panel.querySelector('.chat-messages').addEventListener('click',e=>{const btn=e.target.closest('.chat-suggest button');if(btn)submitQuestion(btn.textContent);
 // 근거 링크: 이동한 페이지가 스크롤을 마친 뒤 그 영역을 반짝이도록 목적지를 남긴다(site.js).
 const a=e.target.closest('.chat-sources a');if(!a)return;
 const u=new URL(a.href,location.href);if(!u.hash)return;
 try{sessionStorage.setItem('geonu-flash',u.pathname+u.hash);}catch{}
 if(u.pathname===location.pathname){
  if(innerWidth<640)toggle(false); // 좁은 화면에서는 대화창이 영역을 가리므로 닫는다
  if(u.hash===location.hash){e.preventDefault();let id;try{id=decodeURIComponent(u.hash.slice(1));}catch{return;}
   document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'});window.dispatchEvent(new Event('geonu:flash'));}
 }
});
panel.querySelector('form').addEventListener('submit',e=>{e.preventDefault();const input=panel.querySelector('textarea'),value=input.value.trim();if(!value||asking)return;input.value='';resizeInput();submitQuestion(value);});
try{const p=JSON.parse(localStorage.getItem('portfolio-chat-position'));if(p&&Number.isFinite(p.right)&&Number.isFinite(p.bottom))launcherAnchor={right:Math.max(launcherGap,p.right),bottom:Math.max(launcherGap,p.bottom)};}catch{}
renderLauncher();
const compose=panel.querySelector('textarea');
function resizeInput(){
 const log=panel.querySelector('.chat-messages'),atBottom=log.scrollHeight-log.scrollTop-log.clientHeight<24;
 const css=getComputedStyle(compose),line=parseFloat(css.lineHeight),pad=parseFloat(css.paddingTop)+parseFloat(css.paddingBottom),border=parseFloat(css.borderTopWidth)+parseFloat(css.borderBottomWidth);
 const max=line*3+pad;
 compose.style.height='0px';const needed=compose.scrollHeight;compose.style.height=(Math.min(max,needed)+border)+'px';compose.style.overflowY=needed>max?'auto':'hidden';
 if(atBottom)log.scrollTop=log.scrollHeight;
}
compose.addEventListener('input',resizeInput);
compose.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();panel.querySelector('form').requestSubmit();}});
const hint=document.createElement('div');hint.className='chat-hint';hint.hidden=true;hint.setAttribute('aria-hidden','true');document.body.append(hint);
const tips=['안녕하세요! 건우에 대한 RAG 챗봇 거누예요.','건우의 공개 기록을 검색해서 답해 드려요.','저를 드래그해 편한 곳으로 옮겨 보세요.','클릭하면 대화창이 열려요.','문의는 상단 "연락하기"로 남겨 주세요.','궁금한 점이 생기면 저를 눌러 주세요.','화면을 둘러보는 동안 여기 있을게요.','제가 가리고 있다면 옆으로 옮겨 주세요.','대화창은 × 버튼으로 닫을 수 있어요.','상단의 해와 달로 화면 테마를 바꿔 보세요.','프로젝트 카드를 누르면 자세히 볼 수 있어요.'];
let last=-1,shown=0;
function showHint(){if(document.hidden||!panel.hidden||dialog.open||drag)return;let i;do{i=Math.floor(Math.random()*tips.length);}while(i===last);last=i;hint.textContent=tips[i];hint.hidden=false;const r=launch.getBoundingClientRect();const w=hint.getBoundingClientRect().width;hint.style.left=Math.max(10,Math.min(innerWidth-w-10,r.right-w))+'px';hint.classList.toggle('chat-hint--below',r.top<=90);hint.style.setProperty('--tail-x',Math.max(16,Math.min(w-16,r.left+r.width/2-parseFloat(hint.style.left)))+'px');hint.style.top=(r.top>90?r.top-hint.offsetHeight-12:r.bottom+12)+'px';setTimeout(()=>hint.hidden=true,5500);shown++;}
setTimeout(showHint,12000);const tipTimer=setInterval(()=>{if(shown>=4){clearInterval(tipTimer);return;}showHint();},45000);
document.addEventListener('visibilitychange',()=>{if(document.hidden)hint.hidden=true;});
window.addEventListener('resize',renderLauncher);
window.visualViewport?.addEventListener('resize',renderLauncher);
window.visualViewport?.addEventListener('scroll',renderLauncher);
})();















