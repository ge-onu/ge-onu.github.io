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
