/* Architecture tabs and illustrative request/reply motion. */
(() => {
 const figure=document.querySelector('.infra-diagram'),img=figure?.querySelector('img');if(!img)return;
 const base=new URL('assets/diagrams/',document.currentScript.src);
 const views=[
  ['service','서비스 · HA','사용자 요청이 Router와 active LB를 거쳐 Backend로 전달되고 응답이 돌아오는 경로입니다.'],
  ['vpn','VPN','External Client가 WireGuard의 Router HA endpoint를 통해 허용된 내부 서비스에 접근하는 경로입니다.'],
  ['operations','관리 · 관측','Bastion의 관리 대상과 로그·메트릭 수집 경로입니다.'],
  ['all','모두 보기','서비스·HA, VPN, 관리·관측 구조를 한눈에 볼 수 있습니다.']
 ];
 const tabs=document.createElement('div');tabs.className='infra-view-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','아키텍처 보기');
 const panel=document.createElement('div');panel.className='infra-view-panel';panel.id='infra-view-panel';panel.setAttribute('role','tabpanel');panel.tabIndex=0;img.replaceWith(panel);panel.append(img);figure.prepend(tabs);
 const caption=document.createElement('figcaption');figure.append(caption);
 let selected=-1,transition;
 function select(i,focus=false){const previous=selected;selected=i;transition?.cancel();figure.dataset.view=views[i][0];views.forEach((v,j)=>{const b=tabs.children[j];b.setAttribute('aria-selected',String(i===j));b.tabIndex=i===j?0:-1;});img.src=new URL(i===3?'infrastructure-lab-series-animated.svg':'infrastructure-lab-'+views[i][0]+'.svg',base).href;img.alt=views[i][2];panel.setAttribute('aria-labelledby','infra-tab-'+views[i][0]);caption.textContent=views[i][2]+(i<2?' 거누의 이동은 흐름 설명용입니다.':'');if(previous!==-1&&previous!==i)transition=panel.animate([{opacity:0,transform:'translateY(7px)'},{opacity:1,transform:'translateY(0)'}],{duration:260,easing:'cubic-bezier(.22,.61,.36,1)'});if(focus)tabs.children[i].focus();}
 views.forEach((v,i)=>{const b=document.createElement('button');b.type='button';b.id='infra-tab-'+v[0];b.dataset.view=v[0];b.textContent=v[1];b.setAttribute('role','tab');b.setAttribute('aria-controls',panel.id);b.addEventListener('click',()=>select(i));b.addEventListener('keydown',e=>{let next;if(e.key==='ArrowRight')next=(i+1)%views.length;else if(e.key==='ArrowLeft')next=(i+views.length-1)%views.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=views.length-1;if(next!==undefined){e.preventDefault();select(next,true);}});tabs.append(b);});select(0);
})();

