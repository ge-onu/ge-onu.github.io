(() => {
 const root=document.documentElement, media=matchMedia('(prefers-color-scheme: dark)');
 let saved;try{saved=localStorage.getItem('portfolio-theme');}catch{}
 let mode=['light','dark'].includes(saved)?saved:(media.matches?'dark':'light');
 function apply(){root.dataset.theme=mode;document.querySelector('meta[name="theme-color"]')?.setAttribute('content',mode==='dark'?'#151a22':'#f7f8fa');}
 apply();
 document.addEventListener('DOMContentLoaded',()=>{
 const nav=document.querySelector('.topbar .nav');if(!nav)return;
 const button=document.createElement('button');button.type='button';button.className='theme-toggle';button.setAttribute('role','switch');
 button.innerHTML='<svg class="theme-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg><svg class="theme-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"/></svg>';
 const sync=()=>{button.setAttribute('aria-label','다크 모드');button.setAttribute('aria-checked',String(mode==='dark'));button.title=mode==='dark'?'Light 모드로 전환':'Dark 모드로 전환';};
 button.addEventListener('click',()=>{mode=mode==='dark'?'light':'dark';saved=mode;try{localStorage.setItem('portfolio-theme',mode);}catch{}apply();sync();});
 (nav.querySelector('.nav-profile-links')||nav).append(button);sync();
 media.addEventListener('change',e=>{if(!saved){mode=e.matches?'dark':'light';apply();sync();}});
 });
})();
