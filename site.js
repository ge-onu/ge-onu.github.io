/* 모든 페이지 공통: 이메일 복사, 머리말 높이, 사례 목차 위치. */
(() => {
 document.querySelectorAll('[data-copy]').forEach(btn=>{
  const label=btn.querySelector('.lbl'),row=btn.parentElement,status=row.querySelector('.copy-status');
  let timer;
  btn.addEventListener('click',async()=>{
   try{
    await navigator.clipboard.writeText(btn.dataset.copy);
    btn.setAttribute('data-done','');if(label)label.textContent='복사됨';
    if(status)status.textContent='이메일 주소를 복사했습니다.';
    clearTimeout(timer);timer=setTimeout(()=>{btn.removeAttribute('data-done');if(label)label.textContent='복사';},1600);
   }catch{
    // 복사가 막힌 환경에서는 주소를 선택해 두고 직접 복사하게 한다.
    const link=row.querySelector('a');if(link)getSelection().selectAllChildren(link);
    if(status)status.textContent='주소를 선택해 두었습니다. 직접 복사해 주세요.';
   }
  });
 });

 const header=document.querySelector('.hdr');
 if(header){
  const sync=()=>document.documentElement.style.setProperty('--header-height',header.getBoundingClientRect().height+'px');
  new ResizeObserver(sync).observe(header);sync();
 }

 const toc=[...document.querySelectorAll('.toc a')];
 if(toc.length){
  const ids=toc.map(a=>a.getAttribute('href').slice(1));
  let ticking=false;
  const update=()=>{
   ticking=false;
   let current=ids[0];const limit=innerHeight*.32;
   ids.forEach(id=>{const el=document.getElementById(id);if(el&&el.getBoundingClientRect().top<=limit)current=id;});
   toc.forEach(a=>{const on=a.getAttribute('href')==='#'+current;a.classList.toggle('on',on);if(on)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});
  };
  addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(update);}},{passive:true});
  update();
 }

 // 인쇄할 때는 접힌 기록도 모두 펼친다.
 addEventListener('beforeprint',()=>document.querySelectorAll('details').forEach(d=>{d.open=true;}));
})();

/* 움직임 (2026-10-13). 기기의 '동작 줄이기'와 관계없이 적용한다(사용자 요청). */
(() => {
 const $$=(s,r=document)=>[...r.querySelectorAll(s)];
 const raf=fn=>requestAnimationFrame(()=>requestAnimationFrame(fn));

 // 상단 막대 그림자
 const hdr=document.querySelector('.hdr');
 const onScrollHdr=()=>hdr&&hdr.classList.toggle('is-scrolled',scrollY>4);
 addEventListener('scroll',onScrollHdr,{passive:true});onScrollHdr();

 // 메뉴: 현재 구역 알약이 미끄러지고, 마우스를 올리면 옅은 알약이 따라간다.
 const nav=document.querySelector('.hdr-nav');
 if(nav){
  const pill=document.createElement('span');pill.className='nav-pill';pill.setAttribute('aria-hidden','true');
  const hov=document.createElement('span');hov.className='nav-hover';hov.setAttribute('aria-hidden','true');
  nav.prepend(pill,hov);nav.classList.add('has-pill');
  const place=(p,a)=>{if(!a||!a.offsetWidth){p.style.opacity='0';return;}p.style.opacity='1';p.style.width=a.offsetWidth+'px';p.style.height=a.offsetHeight+'px';p.style.transform=`translate(${a.offsetLeft}px,${a.offsetTop}px)`;};
  const links=$$(':scope > a',nav).filter(a=>!a.classList.contains('nav-contact'));
  const syncPill=()=>place(pill,nav.querySelector(':scope > a[aria-current]'));
  // 홈: 스크롤 위치를 따라 현재 구역을 표시한다.
  const local=links.filter(a=>a.getAttribute('href').startsWith('#'));
  if(local.length){
   const secs=local.map(a=>document.querySelector(a.getAttribute('href')));
   let tick=false;
   const spy=()=>{tick=false;
    // 메뉴로 미끄러지는 동안에는 지나가는 구역 대신 목적지를 바로 표시한다.
    if(window.__navGlideId){local.forEach(a=>{if(a.getAttribute('href')==='#'+window.__navGlideId)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});syncPill();return;}const line=(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height'))||68)+innerHeight*.25;
    let cur=-1;secs.forEach((s,k)=>{if(s&&s.getBoundingClientRect().top<=line)cur=k;});
    if(innerHeight+scrollY>=document.documentElement.scrollHeight-4)cur=secs.length-1;
    local.forEach((a,k)=>{if(k===cur)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});
    syncPill();};
   addEventListener('scroll',()=>{if(!tick){tick=true;requestAnimationFrame(spy);}},{passive:true});spy();
  }else syncPill();
  if(matchMedia('(hover:hover) and (pointer:fine)').matches){
   links.forEach(a=>a.addEventListener('pointerenter',()=>{if(!hov.style.width||hov.style.opacity==='0'){hov.classList.remove('x');}place(hov,a);}));
   nav.addEventListener('pointerleave',()=>{hov.style.opacity='0';});
  }
  new ResizeObserver(syncPill).observe(nav);document.fonts?.ready.then(syncPill);
  raf(()=>nav.classList.add('ready'));
 }

 // 스크롤하면 떠오르기 (한 번만)
 const sel='main .sec-head, main .case-card, main .card, main .incident, main .kpis li, main .kw-wrap, main .legend, main .about-copy, main .blk > *, main .deck';
 const items=$$(sel).filter(el=>!el.closest('.hero')&&!el.parentElement.closest(sel)&&!el.closest('details:not([open])'));
 if(items.length&&'IntersectionObserver' in window){
  const groups=new Map();
  items.forEach(el=>{const k=el.parentElement;const n=groups.get(k)||0;groups.set(k,n+1);el.style.setProperty('--rv-d',Math.min(n,5)*70+'ms');el.classList.add('rv');});
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;const el=e.target;io.unobserve(el);el.classList.add('in');
   const done=()=>{el.classList.remove('rv','in');el.style.removeProperty('--rv-d');};
   setTimeout(done,900+Math.min(groups.get(el.parentElement)||0,5)*70);}),{rootMargin:'0px 0px -8% 0px',threshold:.08});
  items.forEach(el=>io.observe(el));
  // 주소의 #으로 바로 들어온 경우 해당 위치 위쪽은 바로 보여 준다.
  if(location.hash)items.forEach(el=>{if(el.getBoundingClientRect().bottom<innerHeight){el.classList.remove('rv');}});
 }

 // KPI 숫자 올라가기. 166→247은 166에서 247로 올라간다.
 const fmt=(v,comma)=>comma?v.toLocaleString('ko-KR'):String(v);
 const kvs=$$('.k-v');
 if(kvs.length&&'IntersectionObserver' in window){
  const plans=new Map();
  kvs.forEach(el=>{const nodes=[];const w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let n;
   while((n=w.nextNode())){if(n.parentElement.closest('small'))continue;const m=n.nodeValue.match(/^(\s*)([\d,]+)(.*)$/s);if(m)nodes.push({n,pre:m[1],to:+m[2].replace(/,/g,''),comma:m[2].includes(','),rest:m[3]});}
   if(!nodes.length)return;
   const anim=nodes.length>1?nodes.slice(1).map((x,k)=>({...x,from:nodes[k].to})):[{...nodes[0],from:0}];
   anim.forEach(x=>{x.n.nodeValue=x.pre+fmt(x.from,x.comma)+x.rest;});
   plans.set(el,anim);});
  const run=el=>{const anim=plans.get(el);if(!anim)return;const t0=performance.now(),D=1100;
   const step=t=>{const p=Math.min(1,(t-t0)/D),e=1-Math.pow(1-p,3);anim.forEach(x=>{x.n.nodeValue=x.pre+fmt(Math.round(x.from+(x.to-x.from)*e),x.comma)+x.rest;});if(p<1)requestAnimationFrame(step);};
   requestAnimationFrame(step);};
  const io2=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){io2.unobserve(e.target);setTimeout(()=>run(e.target),250);}}),{threshold:.6});
  plans.forEach((_,el)=>io2.observe(el));
 }

 // 사례 페이지 목차: 읽는 구역 표시가 미끄러지고, 위쪽에 읽기 진행 막대
 const toc=document.querySelector('.toc');
 if(toc){
  const ol=toc.querySelector('ol');const ind=document.createElement('span');ind.className='toc-ind';ind.setAttribute('aria-hidden','true');ol.append(ind);toc.classList.add('has-ind');
  const bar=document.createElement('div');bar.className='read-prog';bar.setAttribute('aria-hidden','true');document.body.append(bar);
  const move=()=>{const a=toc.querySelector('a.on');if(!a){ind.style.opacity='0';return;}ind.style.opacity='1';ind.style.height=a.offsetHeight+'px';ind.style.transform=`translateY(${a.offsetTop}px)`;};
  new MutationObserver(move).observe(ol,{subtree:true,attributes:true,attributeFilter:['class']});move();
  let t=false;const prog=()=>{t=false;const h=document.documentElement.scrollHeight-innerHeight;bar.style.transform=`scaleX(${h>0?Math.min(1,scrollY/h):0})`;};
  addEventListener('scroll',()=>{if(!t){t=true;requestAnimationFrame(prog);}},{passive:true});prog();
  raf(()=>toc.classList.add('ready'));
 }

 // 이메일 복사 버튼: 복사 아이콘 자리에 체크 아이콘을 겹쳐 둔다.
 $$('.copy-btn').forEach(b=>{const ic=b.querySelector(':scope > svg.ic');if(!ic)return;const box=document.createElement('span');box.className='ic-swap';box.setAttribute('aria-hidden','true');ic.classList.add('ic-copy');ic.replaceWith(box);box.append(ic);
  box.insertAdjacentHTML('beforeend','<svg class="ic ic-ok" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>');});

 // 홈 → 사례 페이지: 누른 카드 제목이 사례 페이지 큰 제목으로 이어진다(지원하는 브라우저만).
 const titleOf=a=>a.closest('.card')?.querySelector('h3');
 document.addEventListener('click',e=>{const a=e.target.closest('.card a[href^="projects/"]');if(!a||a.getAttribute('href').includes('#'))return;const h=titleOf(a);if(h)h.style.viewTransitionName='proj-title';},true);
 addEventListener('pageshow',()=>$$('.card h3').forEach(h=>{h.style.viewTransitionName='';}));
 addEventListener('pageswap',()=>{const h=document.querySelector('main h1:not(#hero-title)');if(h&&h.getBoundingClientRect().bottom<0)h.style.viewTransitionName='none';});
 addEventListener('pagereveal',e=>{if(!e.viewTransition||!window.navigation?.activation?.from)return;
  const from=new URL(navigation.activation.from.url).pathname;
  const a=$$('.card a[href^="projects/"]').find(x=>new URL(x.href).pathname===from&&!x.getAttribute('href').includes('#'));const h=a&&titleOf(a);
  if(h){const r=h.getBoundingClientRect();if(r.bottom>0&&r.top<innerHeight){h.style.viewTransitionName='proj-title';e.viewTransition.finished.finally(()=>{h.style.viewTransitionName='';});}}});
})();

/* 거누 근거 링크로 이동한 경우: 스크롤이 멈춘 뒤 대상 영역을 회색으로 한 번 반짝인다.
 * 챗봇이 sessionStorage('geonu-flash')에 목적지를 적어 두고, 이 페이지가 같은 주소로 열렸을 때만 반짝인다. */
(() => {
 const KEY='geonu-flash';
 const settleThen=fn=>{let last=-1,still=0,n=0;const tick=()=>{const y=scrollY;if(Math.abs(y-last)<0.5){if(++still>=6)return fn();}else still=0;last=y;if(++n<240)requestAnimationFrame(tick);else fn();};setTimeout(()=>requestAnimationFrame(tick),150);};
 const flash=id=>{const el=document.getElementById(id);if(!el)return;el.classList.remove('flash-target');void el.offsetWidth;el.classList.add('flash-target');el.addEventListener('animationend',()=>el.classList.remove('flash-target'),{once:true});};
 const check=()=>{
  let want=null;try{want=sessionStorage.getItem(KEY);}catch{}
  if(!want)return;
  const u=new URL(want,location.href);
  if(u.pathname!==location.pathname||!u.hash||u.hash!==location.hash)return;
  try{sessionStorage.removeItem(KEY);}catch{}
  let id;try{id=decodeURIComponent(u.hash.slice(1));}catch{return;}
  settleThen(()=>flash(id));
 };
 addEventListener('hashchange',check);
 addEventListener('geonu:flash',check);
 if(document.readyState==='complete')check();else addEventListener('load',check,{once:true});
})();

/* 방문 통계: Cloudflare Web Analytics(쿠키 없음). 실제 사이트에서만 불러온다(로컬 미리보기·QA 제외). */
(() => {
 if(location.hostname!=='geonu.site')return;
 const s=document.createElement('script');s.defer=true;s.src='https://static.cloudflareinsights.com/beacon.min.js';
 s.setAttribute('data-cf-beacon','{"token": "516bf72bf17841ff82231f58536e6c77"}');document.head.append(s);
})();

/* 메뉴·목차로 이동할 때: 끊김 없이 한 번에 미끄러지듯 이동한다(2026-10-14).
 * 지나가는 구역의 떠오르기 효과는 미리 끝내고, 메뉴 표시는 목적지로 바로 옮긴다. 사용자가 휠·터치를 하면 바로 멈춘다. */
(() => {
 const root=document.documentElement;
 const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
 const pad=()=>(parseFloat(getComputedStyle(root).getPropertyValue('--header-height'))||68)+20;
 let raf=null;
 const stop=()=>{if(raf){cancelAnimationFrame(raf);raf=null;}window.__navGlideId=null;root.style.scrollBehavior='';};
 function glide(el,id){
  stop();
  const start=scrollY,max=root.scrollHeight-innerHeight;
  const target=Math.max(0,Math.min(max,Math.round(el.getBoundingClientRect().top+scrollY-pad())));
  const lo=Math.min(start,target)-innerHeight,hi=Math.max(start,target)+innerHeight*2;
  document.querySelectorAll('.rv').forEach(x=>{const y=x.getBoundingClientRect().top+scrollY;if(y>lo&&y<hi){x.classList.remove('rv','in');x.style.removeProperty('--rv-d');}});
  window.__navGlideId=id;dispatchEvent(new Event('scroll'));
  const dist=Math.abs(target-start);
  history.pushState(null,'','#'+id);
  if(dist<2){stop();return;}
  const dur=Math.min(900,360+dist*.11),t0=performance.now();
  root.style.scrollBehavior='auto';
  const step=t=>{const k=Math.min(1,(t-t0)/dur);scrollTo(0,start+(target-start)*ease(k));if(k<1)raf=requestAnimationFrame(step);else{raf=null;window.__navGlideId=null;root.style.scrollBehavior='';dispatchEvent(new Event('scroll'));}};
  raf=requestAnimationFrame(step);
 }
 document.addEventListener('click',e=>{
  const a=e.target.closest('.hdr-nav a[href^="#"], .toc a[href^="#"], a.wm[href^="#"]');
  if(!a||e.defaultPrevented||e.button||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
  const id=decodeURIComponent(a.getAttribute('href').slice(1));const el=document.getElementById(id);if(!el)return;
  e.preventDefault();glide(el,id);a.blur();
 });
 ['wheel','touchstart'].forEach(ev=>addEventListener(ev,()=>{if(raf)stop();},{passive:true}));
 addEventListener('keydown',e=>{if(raf&&['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(e.key))stop();});
})();
