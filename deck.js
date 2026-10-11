/* 발표 자료 뷰어. 같은 슬라이드 안의 단계(Canva에서 여러 장으로 나눠 만든 애니메이션)는 겹쳐 넘기고,
 * 슬라이드가 바뀔 때는 옆으로 밀어 넘긴다. 데이터는 #deck-data(JSON)에 있다. */
(() => {
 const root=document.querySelector('[data-deck]');const dataEl=document.getElementById('deck-data');
 if(!root||!dataEl)return;
 const data=JSON.parse(dataEl.textContent);const S=data.slides;const base=data.base;
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const $=s=>root.querySelector(s);
 const stage=$('.deck-stage'),frame=$('.deck-frame'),count=$('.deck-count'),title=$('.deck-title'),steps=$('.deck-steps'),bar=$('.deck-progress i'),play=$('.deck-play'),tabs=[...root.querySelectorAll('.deck-chapters button')];
 const src=p=>`${base}p${String(p).padStart(3,'0')}.webp`;
 const total=S.length;let i=0,j=0,timer=null,busy=false;
 const cache=new Map();
 const load=p=>{if(!cache.has(p)){const im=new Image();im.decoding='async';im.src=src(p);cache.set(p,im.decode?im.decode().catch(()=>{}).then(()=>im):Promise.resolve(im));}return cache.get(p);};
 const warm=()=>{[i+1,i+2,i-1].forEach(k=>{if(S[k])S[k].p.forEach((p,n)=>{if(n<3||k===i+1)load(p);});});S[i].p.forEach(load);};

 function layer(kind){const el=document.createElement(kind);el.className='deck-layer';if(kind==='img'){el.alt='';el.draggable=false;}return el;}
 function current(){return frame.querySelector('.deck-layer.on');}
 async function show(nextI,nextJ,mode){
  if(busy)return;busy=true;
  const s=S[nextI],p=s.p[nextJ],isVideo=s.v&&nextJ===s.p.length-1;
  await load(p);
  const el=layer(isVideo?'video':'img');
  if(isVideo){Object.assign(el,{src:base+s.v,poster:src(p),muted:true,playsInline:true,controls:true,preload:'metadata'});el.setAttribute('aria-label',s.t);el.addEventListener('ended',()=>{if(timer)advance();});}
  else{el.src=src(p);el.alt=`${s.t}${s.p.length>1?` (${nextJ+1}/${s.p.length}단계)`:''}`;}
  const old=current();
  if(old&&old.tagName==='VIDEO')old.pause();
  el.classList.add('on');
  const quick=reduce.matches||!old||mode==='init';
  if(!quick){el.classList.add(mode==='step'?'enter-fade':mode==='back'?'enter-left':'enter-right');}
  frame.append(el);
  if(!quick){requestAnimationFrame(()=>requestAnimationFrame(()=>{el.classList.remove('enter-fade','enter-left','enter-right');}));}
  if(old){old.classList.remove('on');old.classList.add(mode==='step'?'leave-fade':mode==='back'?'leave-right':'leave-left');setTimeout(()=>old.remove(),quick?0:560);}
  i=nextI;j=nextJ;render();warm();
  if(isVideo&&root.dataset.visible==='1')el.play().catch(()=>{});
  setTimeout(()=>{busy=false;},quick?0:mode==='step'?260:380);
 }
 function render(){
  const s=S[i];count.textContent=`${i+1} / ${total}`;title.textContent=s.t;
  bar.style.width=`${((i+(s.p.length>1?j/(s.p.length-1):1))/total)*100}%`;
  steps.replaceChildren(...(s.p.length>1?s.p.map((_,n)=>{const d=document.createElement('i');if(n<=j)d.className='done';return d;}):[]));
  steps.setAttribute('aria-label',s.p.length>1?`${s.p.length}단계 중 ${j+1}단계`:'');
  tabs.forEach(t=>{const on=t.dataset.chapter===s.c;t.setAttribute('aria-selected',String(on));t.tabIndex=on?0:-1;});
  $('.deck-nav.prev').disabled=i===0&&j===0;$('.deck-nav.next').disabled=i===total-1&&j===S[i].p.length-1;
 }
 function advance(){const s=S[i];if(j<s.p.length-1)return show(i,j+1,'step');if(i<total-1)return show(i+1,0,'next');stop();}
 function back(){if(j>0)return show(i,j-1,'step');if(i>0)return show(i-1,S[i-1].p.length-1,'back');}
 function delay(){const s=S[i];if(s.v&&j===s.p.length-1)return null;return s.p.length>1&&j<s.p.length-1?1500:3600;}
 function tick(){clearTimeout(timer);const d=delay();if(d===null){timer=true;return;}timer=setTimeout(async()=>{await advance();if(timer)tick();},d);}
 function start(){play.setAttribute('aria-pressed','true');play.querySelector('.lbl').textContent='멈춤';tick();}
 function stop(){clearTimeout(timer);timer=null;play.setAttribute('aria-pressed','false');play.querySelector('.lbl').textContent='자동 재생';}
 const user=fn=>()=>{stop();fn();};
 $('.deck-nav.next').addEventListener('click',user(advance));
 $('.deck-nav.prev').addEventListener('click',user(back));
 play.addEventListener('click',()=>{timer?stop():start();});
 tabs.forEach(t=>t.addEventListener('click',()=>{stop();const k=S.findIndex(s=>s.c===t.dataset.chapter);if(k>=0&&k!==i)show(k,0,k<i?'back':'next');}));
 root.querySelector('.deck-chapters').addEventListener('keydown',e=>{const k=tabs.findIndex(t=>t.getAttribute('aria-selected')==='true');if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();const n=tabs[(k+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length];n.focus();n.click();}});
 stage.addEventListener('keydown',e=>{
  if(e.key==='ArrowRight'||e.key===' '||e.key==='PageDown'){e.preventDefault();stop();advance();}
  else if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();stop();back();}
  else if(e.key==='Home'){e.preventDefault();stop();show(0,0,'back');}
  else if(e.key==='End'){e.preventDefault();stop();show(total-1,S[total-1].p.length-1,'next');}
 });
 let sx=null,sy=0;
 stage.addEventListener('pointerdown',e=>{if(e.target.closest('button,video'))return;sx=e.clientX;sy=e.clientY;});
 stage.addEventListener('pointerup',e=>{if(sx===null)return;const dx=e.clientX-sx,dy=e.clientY-sy;sx=null;
  if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy)){stop();dx<0?advance():back();}
  else if(Math.abs(dx)<6&&Math.abs(dy)<6&&e.pointerType!=='mouse'){stop();advance();}});
 const fs=$('.deck-fs');
 if(fs){if(!stage.requestFullscreen)fs.hidden=true;fs.addEventListener('click',()=>{document.fullscreenElement?document.exitFullscreen():stage.requestFullscreen().then(()=>stage.focus()).catch(()=>{});});
  document.addEventListener('fullscreenchange',()=>{const on=document.fullscreenElement===stage;fs.setAttribute('aria-pressed',String(on));fs.querySelector('.lbl').textContent=on?'전체 화면 끝내기':'전체 화면';});}
 // 화면 밖에서는 영상과 자동 재생을 멈춘다.
 new IntersectionObserver(es=>es.forEach(e=>{root.dataset.visible=e.isIntersecting?'1':'0';const v=current();if(v&&v.tagName==='VIDEO'){e.isIntersecting?v.play().catch(()=>{}):v.pause();}if(!e.isIntersecting&&timer)stop();}),{threshold:.35}).observe(stage);
 root.classList.add('ready');
 show(0,0,'init');
})();
