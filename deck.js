/* 발표 자료 뷰어. 같은 슬라이드 안의 단계(Canva에서 여러 장으로 나눠 만든 애니메이션)는 겹쳐 넘기고,
 * 슬라이드가 바뀔 때는 옆으로 밀어 넘긴다. 데이터는 #deck-data(JSON)에 있다.
 * data.fx(tools/deck/fx.py가 만듦)가 있으면 단계 사이를 실제 움직임으로 잇는다:
 *   lift = 새로 또렷해진 영역이 튀어나오듯 나타남, out = 강조가 풀린 영역이 작아지며 사라짐, mv = 캐릭터가 앞 위치에서 새 위치로 이동,
 *   bar/focus/unfocus = 진행 막대가 옆으로 미끄러지고 지금 볼 화면은 커진 채 머물며 지난 화면은 작아지며 흐려짐,
 *   spot = 나머지가 어두워질 때 남은 설명 영역이 한 번 크게 숨 쉬듯 강조됨,
 *   hdr = 슬라이드를 넘겨도 움직이지 않는 위쪽 높이. */
(() => {
 const root=document.querySelector('[data-deck]');const dataEl=document.getElementById('deck-data');
 if(!root||!dataEl)return;
 const data=JSON.parse(dataEl.textContent);const S=data.slides;const base=data.base;
 // 사용자 요청(2026-10-13): 기기의 '동작 줄이기' 설정과 관계없이 애니메이션을 보여 준다.
 const reduce={matches:false};
 const $=s=>root.querySelector(s);
 const stage=$('.deck-stage'),frame=$('.deck-frame'),count=$('.deck-count'),title=$('.deck-title'),steps=$('.deck-steps'),bar=$('.deck-progress i'),play=$('.deck-play'),tabs=[...root.querySelectorAll('.deck-chapters button')];
 const src=p=>`${base}p${String(p).padStart(3,'0')}.webp`;
 const A=data.anim||{};const pad=p=>String(p).padStart(3,'0');
 const FX=data.fx||{};const sprites=new Map();const spr=n=>{if(!sprites.has(n)){const im=new Image();im.src=base+n;sprites.set(n,im);}return sprites.get(n);};
 const total=S.length;let i=0,j=0,timer=null,busy=false;
 // Canva 요소 애니메이션: 앞으로 넘길 때만 짧은 영상으로 재생하고, 끝나면 선명한 이미지로 바꾼다.
 const vids=new Map();
 const preVid=p=>{if(!A[p]||reduce.matches)return null;if(!vids.has(p)){const v=document.createElement('video');v.className='deck-layer deck-anim';v.muted=true;v.defaultMuted=true;v.setAttribute('muted','');v.playsInline=true;v.preload='auto';v.setAttribute('aria-hidden','true');v.src=`${base}a${pad(p)}.mp4`;v.load();vids.set(p,v);}return vids.get(p);};
 const ready=v=>v.readyState>=3?Promise.resolve(true):new Promise(r=>{const t=setTimeout(()=>r(false),700);v.addEventListener('canplay',()=>{clearTimeout(t);r(true);},{once:true});v.addEventListener('error',()=>{clearTimeout(t);r(false);},{once:true});});
 const cache=new Map();
 const load=p=>{if(!cache.has(p)){const im=new Image();im.decoding='async';im.src=src(p);cache.set(p,im.decode?im.decode().catch(()=>{}).then(()=>im):Promise.resolve(im));}return cache.get(p);};
 const warm=()=>{[i+1,i+2,i-1].forEach(k=>{if(S[k])S[k].p.forEach((p,n)=>{if(n<3||k===i+1)load(p);});});S[i].p.forEach(load);[S[i],S[i+1]].forEach(s=>s&&s.p.forEach(preVid));const nx=S[i].p[j+1]??(S[i+1]&&S[i+1].p[0]);const f=nx&&FX[S[i].p[j]+'-'+nx];if(f&&f.mv)spr(f.mv.s);};
 // 단계 사이 움직임: 바뀐 영역만 오버레이로 움직이고, 끝나면 지운다.
 let fxLayer=null;
 let held=false,heldS=1.06;
 const clearFx=()=>{if(fxLayer){fxLayer.getAnimations({subtree:true}).forEach(a=>{try{a.finish();}catch(e){}});fxLayer.remove();fxLayer=null;}};
 function patch(box,url,fw,fh){const d=document.createElement('div');d.className='deck-patch';const [x,y,w,h]=box;
  Object.assign(d.style,{left:x*fw+'px',top:y*fh+'px',width:w*fw+'px',height:h*fh+'px',backgroundImage:`url("${url}")`,backgroundSize:`${fw}px ${fh}px`,backgroundPosition:`${-x*fw}px ${-y*fh}px`});return d;}
 function runFx(f,fromP,toP,mode){
  const wasHeld=held;held=false;clearFx();if(!f)return 0;const fw=frame.clientWidth,fh=frame.clientHeight;if(!fw)return 0;
  const L=document.createElement('div');L.className='deck-fx';L.setAttribute('aria-hidden','true');let end=0;
  if(mode==='step'){
   (f.out||[]).forEach(b=>{const d=patch(b,src(fromP),fw,fh);L.append(d);
    d.animate([{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(.94)'}],{duration:480,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'});end=Math.max(end,480);});
   (f.lift||[]).forEach((b,k)=>{const d=patch(b,src(toP),fw,fh);d.classList.add('pop');L.append(d);const delay=120+k*90;
    d.animate([{opacity:0,transform:'scale(.88)'},{opacity:1,transform:'scale(1.035)',offset:.62},{opacity:1,transform:'none'}],{duration:680,delay,easing:'cubic-bezier(.2,.8,.2,1)',fill:'backwards'});end=Math.max(end,delay+680);});
   if(f.spot){const d=patch(f.spot,src(toP),fw,fh);d.classList.add('spotp');L.append(d);
    d.animate([{transform:'scale(1)'},{transform:'scale(1.045)',offset:.45},{transform:'scale(1)'}],{duration:900,delay:260,easing:'cubic-bezier(.3,0,.2,1)'});end=Math.max(end,1160);}
   if(f.unfocus){const d=patch(f.unfocus,src(fromP),fw,fh);d.classList.add('foc');L.append(d);
    d.animate([{opacity:1,transform:`scale(${wasHeld?heldS:1})`},{opacity:0,transform:'scale(.9)'}],{duration:560,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'});end=Math.max(end,560);}
   if(f.bar){const to=f.bar.to;L.append(patch(to,src(fromP),fw,fh));if(f.bar.from)L.append(patch(f.bar.from,src(toP),fw,fh));
    const bar=patch(to,src(toP),fw,fh);L.append(bar);
    if(f.bar.from){const dx=(f.bar.from[0]-to[0])*fw;bar.animate([{transform:`translateX(${dx}px)`},{transform:'none'}],{duration:620,easing:'cubic-bezier(.65,0,.35,1)',fill:'backwards'});}
    else bar.animate([{opacity:0,transform:'scaleX(.3)'},{opacity:1,transform:'none'}],{duration:520,easing:'cubic-bezier(.2,.8,.2,1)',fill:'backwards'});end=Math.max(end,620);}
   if(f.focus){const d=patch(f.focus,src(toP),fw,fh);d.classList.add('foc','held');L.append(d);
    // 아래(진행 막대)를 기준으로 커지므로 위로 솟는다. 위 글자(소제목)를 덮지 않을 만큼만 키운다(rise, fx.py).
    const sc=f.rise!=null?Math.min(1.06,Math.max(1,1+f.rise/f.focus[3])):1.06;heldS=sc;
    const dx=f.unfocus?(f.unfocus[0]-f.focus[0])*fw*.35:0;
    d.animate([{opacity:0,transform:`translateX(${dx}px) scale(.9)`},{opacity:1,transform:`scale(${sc})`}],{duration:700,delay:90,easing:'cubic-bezier(.2,.8,.2,1)',fill:'both'});
    held=true;}
   if(f.mv){const m=f.mv,to=m.to;const hide=patch(to,src(fromP),fw,fh);L.append(hide);
    if(m.from){L.append(patch(m.from,src(toP),fw,fh));}
    const im=spr(m.s).cloneNode();im.className='deck-sprite';im.alt='';const s0=m.from||to;
    Object.assign(im.style,{left:s0[0]*fw+'px',top:s0[1]*fh+'px',width:to[2]*fw+'px',height:to[3]*fh+'px'});L.append(im);
    let a;if(m.from){const dx=(to[0]-m.from[0])*fw,dy=(to[1]-m.from[1])*fh,dist=Math.hypot(dx,dy),hop=Math.min(70,dist*.28+8),dur=Math.min(1150,520+dist*.9);
     a=im.animate([{transform:'translate(0,0) scale(1)'},{transform:`translate(${dx*.5}px,${dy*.5-hop}px) scale(1.12)`,offset:.5},{transform:`translate(${dx}px,${dy}px) scale(1)`}],{duration:dur,delay:80,easing:'cubic-bezier(.45,0,.25,1)',fill:'both'});end=Math.max(end,dur+80);}
    else{a=im.animate([{opacity:0,transform:'scale(.4)'},{opacity:1,transform:'scale(1.12)',offset:.6},{opacity:1,transform:'scale(1)'}],{duration:460,delay:120,easing:'cubic-bezier(.2,.8,.2,1)',fill:'both'});end=Math.max(end,580);}
    a.finished.then(()=>{hide.remove();}).catch(()=>{});}
  }
  if(f.hdr&&mode!=='step'){const h=patch([0,0,1,f.hdr],src(toP),fw,fh);h.classList.add('hdr');L.append(h);h.animate([{opacity:1},{opacity:1}],{duration:520});end=Math.max(end,520);}
  if(!L.childElementCount)return 0;frame.append(L);fxLayer=L;const me=L;
  if(held){setTimeout(()=>{if(fxLayer===me)me.querySelectorAll('.deck-patch:not(.held)').forEach(x=>x.remove());},Math.max(end,800)+40);}
  else setTimeout(()=>{if(fxLayer===me)clearFx();},end+40);return end;
 }

 function layer(kind){const el=document.createElement(kind);el.className='deck-layer';if(kind==='img'){el.alt='';el.draggable=false;}return el;}
 function current(){return frame.querySelector('.deck-layer.on');}
 let pending=null;
 // 넘기는 중에 누른 이동은 버리지 않고, 끝난 뒤 마지막 요청 하나를 실행한다.
 const release=()=>{busy=false;if(pending){const q=pending;pending=null;show(...q);}};
 async function show(nextI,nextJ,mode){
  if(busy){pending=[nextI,nextJ,mode];return;}busy=true;
  const s=S[nextI],p=s.p[nextJ],isVideo=s.v&&nextJ===s.p.length-1;
  await load(p);
  let anim=!isVideo&&(mode==='next'||mode==='step')&&preVid(p);
  if(anim&&!(await ready(anim))){vids.delete(p);anim=null;}
  const el=anim||layer(isVideo?'video':'img');
  if(anim){vids.delete(p);el.currentTime=0;const alt=`${s.t}${s.p.length>1?` (${nextJ+1}/${s.p.length}단계)`:''}`;
   const settle=()=>{if(!el.isConnected)return;const im=layer('img');im.src=src(p);im.alt=alt;im.classList.add('on');el.after(im);setTimeout(()=>el.remove(),60);};
   el.addEventListener('ended',settle,{once:true});el.addEventListener('error',settle,{once:true});}
  if(isVideo){Object.assign(el,{src:base+s.v,poster:src(p),muted:true,playsInline:true,controls:true,preload:'metadata'});el.setAttribute('aria-label',s.t);el.addEventListener('ended',()=>{if(timer)advance();});}
  else if(!anim){el.src=src(p);el.alt=`${s.t}${s.p.length>1?` (${nextJ+1}/${s.p.length}단계)`:''}`;}
  const old=current();const prevP=S[i]&&S[i].p[j];
  if(old&&old.tagName==='VIDEO')old.pause();frame.querySelectorAll('.deck-layer:not(.on)').forEach(x=>{if(x!==old)x.remove();});
  el.classList.add('on');
  const quick=reduce.matches||!old||mode==='init';
  if(!quick){el.classList.add(mode==='step'?'enter-fade':mode==='back'?'enter-left':'enter-right');}
  frame.append(el);
  if(!quick){requestAnimationFrame(()=>requestAnimationFrame(()=>{el.classList.remove('enter-fade','enter-left','enter-right');}));}
  if(old){old.classList.remove('on');old.classList.add(mode==='step'?'leave-fade':mode==='back'?'leave-right':'leave-left');setTimeout(()=>old.remove(),quick?0:560);}
  let fxEnd=0;if(old&&!anim&&!isVideo&&mode!=='init'&&prevP!==undefined){const fwd=FX[prevP+'-'+p],bwd=FX[p+'-'+prevP];
   if(mode==='step'&&fwd&&(nextI===i&&nextJ===j+1))fxEnd=runFx(fwd,prevP,p,'step');
   else if(mode!=='step'&&(fwd||bwd)&&Math.abs(nextI-i)===1)fxEnd=runFx({hdr:(fwd||bwd).hdr},prevP,p,mode);
   else{clearFx();held=false;}}else{clearFx();held=false;}
  i=nextI;j=nextJ;render();warm();
  if(isVideo&&root.dataset.visible==='1')el.play().catch(()=>{});
  if(anim)el.play().catch(()=>el.dispatchEvent(new Event('ended')));
  setTimeout(release,quick?0:mode==='step'?380:400);
 }
 const chapBar=root.querySelector('.deck-chapters');const chapInd=document.createElement('span');chapInd.className='deck-chap-ind';chapInd.setAttribute('aria-hidden','true');chapBar.append(chapInd);chapBar.classList.add('has-ind');
 const moveChap=()=>{const t=tabs.find(t=>t.getAttribute('aria-selected')==='true');if(!t)return;chapInd.style.width=(t.offsetWidth-24)+'px';chapInd.style.transform=`translateX(${t.offsetLeft+12}px)`;};
 new ResizeObserver(moveChap).observe(chapBar);
 let fw0=0;new ResizeObserver(()=>{const w=frame.clientWidth;if(fw0&&Math.abs(w-fw0)>2){clearFx();held=false;}fw0=w;}).observe(frame);requestAnimationFrame(()=>requestAnimationFrame(()=>chapBar.classList.add('ready')));
 function render(){
  const s=S[i];const desc=root.querySelector(".deck-desc");if(desc){desc.textContent=s.d||"";desc.hidden=!s.d;}count.textContent=`${i+1} / ${total}`;title.textContent=s.t;
  bar.style.width=`${((i+(s.p.length>1?j/(s.p.length-1):1))/total)*100}%`;
  steps.replaceChildren(...(s.p.length>1?s.p.map((_,n)=>{const d=document.createElement('i');if(n<=j)d.className='done';return d;}):[]));
  steps.setAttribute('aria-label',s.p.length>1?`${s.p.length}단계 중 ${j+1}단계`:'');
  tabs.forEach(t=>{const on=t.dataset.chapter===s.c;t.setAttribute('aria-selected',String(on));t.tabIndex=on?0:-1;});moveChap();
  $('.deck-prev').disabled=i===0&&j===0;$('.deck-next').disabled=i===total-1&&j===S[i].p.length-1;
 }
 function advance(){const s=S[i];if(j<s.p.length-1)return show(i,j+1,'step');if(i<total-1)return show(i+1,0,'next');stop();}
 function back(){if(j>0)return show(i,j-1,'step');if(i>0)return show(i-1,S[i-1].p.length-1,'back');}
 function delay(){const s=S[i];if(s.v&&j===s.p.length-1)return null;const extra=(A[s.p[j]]||0)*1000;const f=j>0&&FX[s.p[j-1]+'-'+s.p[j]];const mv=f&&f.mv?900:f&&f.focus?700:f&&(f.lift||f.out)?400:0;return (s.p.length>1&&j<s.p.length-1?1700:3600)+extra+mv;}
 function tick(){clearTimeout(timer);const d=delay();if(d===null){timer=true;return;}timer=setTimeout(async()=>{await advance();if(timer)tick();},d);}
 function start(){play.setAttribute('aria-pressed','true');play.querySelector('.lbl').textContent='멈춤';tick();}
 function stop(){clearTimeout(timer);timer=null;play.setAttribute('aria-pressed','false');play.querySelector('.lbl').textContent='자동 재생';}
 const user=fn=>()=>{stop();fn();};
 $('.deck-next').addEventListener('click',user(advance));
 $('.deck-prev').addEventListener('click',user(back));
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
