/* 라이트/다크 테마. <head>에서 바로 읽어 첫 화면부터 저장된 테마로 그린다.
 * 버튼은 머리말의 #theme 하나이며, 고른 값은 portfolio-theme에 남긴다. */
(() => {
 const root=document.documentElement, media=matchMedia('(prefers-color-scheme: dark)');
 let saved;try{saved=localStorage.getItem('portfolio-theme');}catch{}
 let mode=['light','dark'].includes(saved)?saved:(media.matches?'dark':'light');
 function apply(){root.dataset.theme=mode;document.querySelector('meta[name="theme-color"]')?.setAttribute('content',mode==='dark'?'#0a0a0d':'#ffffff');}
 apply();
 document.addEventListener('DOMContentLoaded',()=>{
  const button=document.getElementById('theme');if(!button)return;
  const sync=()=>{button.setAttribute('aria-pressed',String(mode==='dark'));button.title=mode==='dark'?'라이트 모드로 전환':'다크 모드로 전환';};
  // 바꿀 때 버튼에서 원이 퍼지며 새 테마가 드러난다(View Transitions를 지원하는 브라우저).
  button.addEventListener('click',()=>{
   const go=()=>{mode=mode==='dark'?'light':'dark';saved=mode;try{localStorage.setItem('portfolio-theme',mode);}catch{}apply();sync();};
   button.classList.remove('spin');void button.offsetWidth;button.classList.add('spin');setTimeout(()=>button.classList.remove('spin'),700);
   if(!document.startViewTransition){go();return;}
   const r=button.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,R=Math.hypot(Math.max(x,innerWidth-x),Math.max(y,innerHeight-y));
   root.classList.add('theme-vt');
   const t=document.startViewTransition(go);
   t.ready.then(()=>root.animate({clipPath:[`circle(0px at ${x}px ${y}px)`,`circle(${R}px at ${x}px ${y}px)`]},{duration:650,easing:'cubic-bezier(.32,.72,0,1)',pseudoElement:'::view-transition-new(root)'})).catch(()=>{});
   t.finished.finally(()=>root.classList.remove('theme-vt'));
  });
  sync();
  media.addEventListener('change',e=>{if(!saved){mode=e.matches?'dark':'light';apply();sync();}});
 });
})();
