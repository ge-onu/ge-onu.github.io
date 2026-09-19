(() => {
const sendIcon=new URL('assets/chat-send.png',document.currentScript.src).href;
const avatar=new URL('assets/chat-mascot.png',document.currentScript.src).href;
const icon='<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 4h16v12H9l-5 4V4Z"/><path d="M8 8h8M8 12h5"/></svg>';
const nav=document.querySelector('.nav-profile-links');if(!nav)return;
const contact=document.createElement('button');contact.type='button';contact.className='github-button github-button--small contact-trigger';contact.innerHTML=icon+'<span>Contact</span>';contact.setAttribute('aria-label','Contact 메시지 작성');nav.insertBefore(contact,nav.querySelector('.theme-toggle'));
const dialog=document.createElement('dialog');dialog.className='contact-dialog';dialog.setAttribute('aria-labelledby','contact-title');dialog.innerHTML='<button class="panel-close" type="button" aria-label="Contact 닫기">×</button><h2 id="contact-title">메시지 남기기</h2><p>모든 문의에 대해 편하게 연락해 주세요.</p><form><label class="contact-inline-field"><span>이름</span><input name="name" autocomplete="name" required maxlength="80"></label><label class="contact-inline-field"><span>답장받을 이메일</span><input name="email" type="email" autocomplete="email" required maxlength="200"></label><label>문의내용<textarea name="message" rows="8" required maxlength="3000"></textarea></label><button class="primary-action" type="submit">메시지 보내기</button><p class="contact-note">이름·이메일·메시지는 문의 확인과 답장을 위해 저장됩니다.</p><p class="contact-status" role="status"></p></form>';
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
document.body.append(dialog);contact.addEventListener('click',()=>dialog.showModal());dialog.querySelector('.panel-close').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
function contactUnavailable(status,attempted=true){
 status.replaceChildren(document.createTextNode(attempted?'전송을 확인하지 못했습니다. 입력한 내용은 그대로 남아 있습니다. 잠시 후 다시 시도하거나 이메일로 연락해 주세요. ':'현재 메시지 전송 연결을 준비 중입니다. 이메일로 연락해 주세요. '));
 const link=document.createElement('a');link.href='mailto:goonbam009@gmail.com';link.textContent='goonbam009@gmail.com';status.append(link);
}
if(!window.PORTFOLIO_CONTACT?.endpoint){contactUnavailable(dialog.querySelector('.contact-status'),false);}
dialog.querySelector('form').addEventListener('submit',async e=>{
 e.preventDefault();const form=e.target,button=form.querySelector('[type=submit]'),status=form.querySelector('.contact-status');
 const endpoint=window.PORTFOLIO_CONTACT?.endpoint;
 if(!endpoint){contactUnavailable(status);return;}
 button.disabled=true;button.textContent='전송 중…';status.textContent='';
 try{
 const url=new URL(endpoint);if(url.protocol!=='https:')throw new Error('configuration');
 const f=new FormData(form);const name=String(f.get('name')).trim(),email=String(f.get('email')).trim(),message=String(f.get('message')).trim();
 if(!name||!email||!message)throw new Error('empty');
 const response=await fetch(url.href,{method:'POST',mode:'cors',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,email,message}),signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw new Error('send');
 const result=await response.json();if(result.ok!==true)throw new Error('send');
 form.reset();status.textContent='';showContactSuccess();
 }
 catch{contactUnavailable(status);}
 finally{button.disabled=false;button.textContent='메시지 보내기';}
});
const launch=document.createElement('button');launch.type='button';launch.className='chat-launcher';launch.setAttribute('aria-label','포트폴리오 챗봇 열기. 드래그 또는 방향키로 위치 이동');launch.setAttribute('aria-controls','portfolio-chat');launch.setAttribute('aria-expanded','false');launch.innerHTML='<img src="'+avatar+'" alt="" draggable="false" width="1254" height="1254" decoding="async">';
const panel=document.createElement('section');panel.id='portfolio-chat';panel.className='chat-panel';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-labelledby','chat-title');panel.innerHTML='<header><img class="chat-header-avatar" src="'+avatar+'" alt="" width="1254" height="1254" decoding="async"><div><small>건우 포트폴리오 챗봇</small><h2 id="chat-title">거누</h2></div><button type="button" class="panel-close" aria-label="챗봇 닫기">×</button></header><div class="chat-messages" role="log" aria-live="polite"><p class="chat-bubble">안녕하세요! 건우와 건우의 프로젝트 및 관련 경험에 대해 알고있는 거누에요!<br>무엇이든 물어보세요!</p></div><form><label class="chat-input-label" for="chat-input">질문</label><div class="chat-compose"><textarea id="chat-input" rows="1" placeholder="저에 대해 궁금한 내용을 물어보세요!" maxlength="1000" required></textarea><button type="submit" aria-label="질문 입력"><img src="'+sendIcon+'" alt="" width="1254" height="1254" decoding="async"></button></div></form>';
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
panel.querySelector('form').addEventListener('submit',e=>{e.preventDefault();const input=panel.querySelector('textarea'),value=input.value.trim();if(!value)return;const log=panel.querySelector('.chat-messages');const user=document.createElement('p');user.className='chat-bubble chat-bubble--user';user.textContent=value;log.append(user);const answer=document.createElement('p');answer.className='chat-bubble';answer.textContent='자동 응답 연결 전입니다. 지금 문의를 남기려면 상단 Contact를 이용해 주세요.';log.append(answer);input.value='';resizeInput();log.scrollTop=log.scrollHeight;});
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
const tips=['안녕하세요! 포트폴리오 챗봇 거누에요.','저를 드래그해 편한 곳으로 옮겨 보세요.','클릭하면 대화창이 열려요.','문의는 상단 Contact로 남겨 주세요.','궁금한 점이 생기면 저를 눌러 주세요.','화면을 둘러보는 동안 여기 있을게요.','제가 가리고 있다면 옆으로 옮겨 주세요.','대화창은 × 버튼으로 닫을 수 있어요.','상단의 해와 달로 화면 테마를 바꿔 보세요.','프로젝트 카드를 누르면 자세히 볼 수 있어요.'];
let last=-1,shown=0;
function showHint(){if(document.hidden||!panel.hidden||dialog.open||drag)return;let i;do{i=Math.floor(Math.random()*tips.length);}while(i===last);last=i;hint.textContent=tips[i];hint.hidden=false;const r=launch.getBoundingClientRect();const w=hint.getBoundingClientRect().width;hint.style.left=Math.max(10,Math.min(innerWidth-w-10,r.right-w))+'px';hint.classList.toggle('chat-hint--below',r.top<=90);hint.style.setProperty('--tail-x',Math.max(16,Math.min(w-16,r.left+r.width/2-parseFloat(hint.style.left)))+'px');hint.style.top=(r.top>90?r.top-hint.offsetHeight-12:r.bottom+12)+'px';setTimeout(()=>hint.hidden=true,5500);shown++;}
setTimeout(showHint,12000);const tipTimer=setInterval(()=>{if(shown>=4){clearInterval(tipTimer);return;}showHint();},45000);
document.addEventListener('visibilitychange',()=>{if(document.hidden)hint.hidden=true;});
window.addEventListener('resize',renderLauncher);
window.visualViewport?.addEventListener('resize',renderLauncher);
window.visualViewport?.addEventListener('scroll',renderLauncher);
})();















