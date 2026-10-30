const menu=document.querySelector('.mobile-menu');
if(menu){
  menu.addEventListener('click',e=>{if(e.target.closest('a'))menu.open=false});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.open){menu.open=false;menu.querySelector('summary')?.focus()}});
  document.addEventListener('click',e=>{if(!menu.contains(e.target))menu.open=false});
}
const year=document.querySelector('#year');if(year)year.textContent=String(new Date().getFullYear());
const hardwarePreorderLink=document.getElementById('hardware-preorder-link');
if(hardwarePreorderLink){
  const isMobileDevice=window.matchMedia('(pointer: coarse)').matches||/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if(isMobileDevice){hardwarePreorderLink.href=hardwarePreorderLink.dataset.mobileHref;hardwarePreorderLink.removeAttribute('target');hardwarePreorderLink.removeAttribute('rel')}
  else{hardwarePreorderLink.href=hardwarePreorderLink.dataset.desktopHref}
}
const downloadMenu=document.querySelector('.download-menu');
if(downloadMenu){
  document.addEventListener('click',e=>{
    if(downloadMenu.open&&!downloadMenu.contains(e.target)){
      downloadMenu.open=false;
    }
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&downloadMenu.open){
      downloadMenu.open=false;
      downloadMenu.querySelector('summary')?.focus();
    }
  });
}

const newsTrack=document.getElementById('news-track');
const newsButtons=document.querySelectorAll('[data-news-direction]');
if(newsTrack&&newsButtons.length){
  const updateNewsArrows=()=>{
    const maxScroll=Math.max(0,newsTrack.scrollWidth-newsTrack.clientWidth);
    newsButtons.forEach(button=>{
      const direction=Number(button.dataset.newsDirection);
      button.disabled=direction<0?newsTrack.scrollLeft<=2:newsTrack.scrollLeft>=maxScroll-2;
    });
  };
  newsButtons.forEach(button=>{
    button.addEventListener('click',()=>{
      const card=newsTrack.querySelector('.news-card');
      if(!card)return;
      const gap=parseFloat(getComputedStyle(newsTrack).gap)||0;
      const step=card.getBoundingClientRect().width+gap;
      newsTrack.scrollBy({
        left:Number(button.dataset.newsDirection)*step,
        behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'
      });
    });
  });
  newsTrack.addEventListener('scroll',updateNewsArrows,{passive:true});
  window.addEventListener('resize',updateNewsArrows);
  updateNewsArrows();
}
