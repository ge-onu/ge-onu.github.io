(() => {
 const rail=document.querySelector('.section-rail');
 const names={'#top':'소개','#main-content':'소개','#work':'프로젝트','#incidents':'트러블슈팅','#focus':'주요 기술','#overview-title':'프로젝트 개요','#decisions-at-a-glance':'핵심 판단','#chat-comparison':'두 실험의 비교','#evidence-title':'검증 결과와 근거','#stories-title':'구성과 문제 진단','#question':'문제와 범위','#failure':'실패와 수정','#measurement':'개발 평가','#limits':'남은 한계','#sources':'평가 기록'};
 if(rail){
  rail.querySelectorAll('a').forEach(a=>{const text=names[a.getAttribute('href')];if(text){a.setAttribute('aria-label',text);a.querySelector('.section-rail-label').textContent=text;}});
  const sync=()=>{const active=rail.querySelector('[aria-current]')?.getAttribute('href');document.querySelectorAll('.topbar .nav > a[href^="#"]').forEach(a=>{if(a.getAttribute('href')===active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});};
  new MutationObserver(sync).observe(rail,{subtree:true,attributes:true,attributeFilter:['aria-current']});sync();
  document.addEventListener('keydown',e=>{if(e.key==='Escape')rail.setAttribute('data-dismissed','');});
 }
 document.querySelectorAll('main > .detail-nav').forEach(nav=>{
  const box=document.createElement('details');box.className='mobile-contents';
  const summary=document.createElement('summary');summary.textContent='이 페이지 목차';
  nav.before(box);box.append(summary,nav);
  const media=matchMedia('(max-width:680px)');const resize=()=>{box.open=!media.matches;};resize();media.addEventListener('change',resize);
  nav.addEventListener('click',e=>{const a=e.target.closest('a');if(!a||!media.matches)return;box.open=false;requestAnimationFrame(()=>document.querySelector(a.getAttribute('href'))?.scrollIntoView());});
 });
})();

/* Animate native disclosures; retain their built-in keyboard semantics. */
(() => {
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const reduceMotion=()=>reduced.matches;
 const nodes=[...document.querySelectorAll('details')];
 const states=new Map();
 function settle(d,s){ if(s.animation){s.animation.cancel();s.animation=null;} d.style.height='';d.style.overflow=''; }
 function change(d,open,startOverride){
  const s=states.get(d);if(!s)return;
  const start=startOverride ?? d.getBoundingClientRect().height;
  settle(d,s);s.target=open;
  if(reduceMotion()){d.open=open;return;}
  d.open=true;
  const end=open?d.getBoundingClientRect().height:d.querySelector(':scope > summary').getBoundingClientRect().height+parseFloat(getComputedStyle(d).borderTopWidth)+parseFloat(getComputedStyle(d).borderBottomWidth);
  d.style.overflow='hidden';
  s.animation=d.animate([{height:start+'px'},{height:end+'px'}],{duration:420,easing:'cubic-bezier(.25,.1,.25,1)'});
  s.animation.onfinish=()=>{d.open=s.target;settle(d,s);};
 }
 nodes.forEach(d=>{
  const s={target:d.open,animation:null};states.set(d,s);
  d.querySelector(':scope > summary')?.addEventListener('click',e=>{e.preventDefault();change(d,s.animation?!s.target:!d.open);});
 });
 // Capture bulk actions before the original immediate toggle handler.
 for(const [selector,open] of [['[data-expand-all]',true],['[data-collapse-all]',false]]){
  document.querySelector(selector)?.addEventListener('click',e=>{
   e.stopImmediatePropagation();
   const targets=nodes.filter(d=>d.matches('.cat,.case,.incident'));
   const roots=targets.filter(d=>!d.parentElement.closest('details'));
   const starts=new Map(roots.map(d=>[d,d.getBoundingClientRect().height]));
   targets.filter(d=>d.parentElement.closest('details')).forEach(d=>{settle(d,states.get(d));d.open=open;states.get(d).target=open;});
   roots.forEach(d=>change(d,open,starts.get(d)));
  },true);
 }
 window.addEventListener('hashchange',()=>nodes.forEach(d=>settle(d,states.get(d))));
 reduced.addEventListener('change',()=>{if(reduceMotion())nodes.forEach(d=>{const s=states.get(d);if(s.animation){d.open=s.target;settle(d,s);}});});
})();


(() => {
 const grid=document.querySelector('.incident-grid');if(!grid)return;
 const cards=[...grid.querySelectorAll(':scope > .incident')];
 let lastWidth=0;
 const sync=()=>{
  cards.forEach(d=>d.style.removeProperty('--incident-summary-height'));
  const cols=getComputedStyle(grid).gridTemplateColumns.split(' ').length;
  if(cols<2)return;
  const height=Math.max(...cards.map(d=>d.querySelector(':scope > summary').getBoundingClientRect().height));
  cards.forEach(d=>d.style.setProperty('--incident-summary-height',height+'px'));
 };
 new ResizeObserver(entries=>{const width=entries[0].contentRect.width;if(Math.abs(width-lastWidth)>.5){lastWidth=width;sync();}}).observe(grid);
 document.fonts.ready.then(sync);sync();
})();
