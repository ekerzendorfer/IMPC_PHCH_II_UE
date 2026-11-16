(() => {
 'use strict';
 const launcher = document.querySelector('[data-calculator-launch]');
 if (!launcher) return;
 const style = document.createElement('style');
 style.textContent = `
 .pc2-calc-reopen[hidden]{display:none!important}
 [data-calculator-launch]{display:inline-block;color:#baf5e8!important;font-weight:700;text-underline-offset:.17em;margin:.2rem 0}
 .pc2-calc-dock{box-sizing:border-box;position:fixed;z-index:4000;display:flex;flex-direction:column;
  width:min(25rem, calc(100vw - 16px));height:min(46rem, calc(78dvh));min-height:10rem;overflow:hidden;
  background:white;border:1px solid #7895a3;border-radius:.65rem;box-shadow:0 10px 32px #10283a55;
  color:#fff;font:15px/1.4 system-ui,sans-serif;top:8px;left:8px}
 .pc2-calc-dock[hidden]{display:none!important}
 .pc2-calc-dock-bar{display:flex;align-items:center;background:#10283a;padding:.23rem .4rem;gap:.28rem;min-width:0}
 .pc2-calc-dock button,.pc2-calc-dock a{box-sizing:border-box;background:#23475c;color:#fff;border:1px solid #63818f;
  border-radius:.32rem;padding:.26rem .48rem;white-space:nowrap;text-decoration:none;font:650 .82rem/1.4 system-ui,sans-serif;cursor:pointer}
 .pc2-calc-dock button:hover,.pc2-calc-dock a:hover{background:#315d73}
 .pc2-calc-dock button:focus-visible,.pc2-calc-dock a:focus-visible{outline:2px solid #ffcc73;outline-offset:1px}
 .pc2-calc-dock .pc2-calc-handle{flex:1;min-width:0;text-align:left;cursor:grab;touch-action:none;user-select:none;
  background:transparent;border-color:transparent;white-space:normal}
 .pc2-calc-dock .pc2-calc-handle:active{cursor:grabbing}
 .pc2-calc-dock iframe{width:100%;flex:1;min-height:0;display:block;background:white;border:0}
 .pc2-calc-reopen{position:fixed;bottom:.8rem;right:.8rem;z-index:3999;border:1px solid #315d73;
  border-radius:.45rem;background:#10283a;color:#fff;padding:.48rem .72rem;
  font:700 .875rem/1.4 system-ui,sans-serif;cursor:pointer;box-shadow:0 3px 12px #10283a40}
 .pc2-calc-reopen:hover{background:#23475c}
 @media(max-height:300px){.pc2-calc-dock{height:calc(100dvh - 16px);min-height:0}}
 @media print{.pc2-calc-dock,.pc2-calc-reopen,[data-calculator-launch]{display:none!important}}
 `;
 document.head.append(style);
 const dock=document.createElement('aside');
 dock.className='pc2-calc-dock'; dock.id='pc2-calculator-dock';dock.hidden=true;
 dock.setAttribute('aria-label','Floating scientific calculator');
 dock.innerHTML=`<div class="pc2-calc-dock-bar">
 <button type="button" class="pc2-calc-handle" aria-label="Calculator, drag to move or use arrow keys" title="Drag to move, or focus and use arrow keys">⠿ Calculator</button>
 <a href="calculator.html" target="_blank" rel="noopener" aria-label="Open calculator in its own tab" title="Open in its own tab">↗</a>
 <button type="button" class="pc2-calc-close" aria-label="Hide calculator" title="Hide calculator">Hide</button>
 </div><iframe title="Scientific calculator" allow="clipboard-write"></iframe>`;
 document.body.append(dock);
 launcher.setAttribute('aria-controls',dock.id);
 launcher.setAttribute('aria-expanded','false');
 const frame=dock.querySelector('iframe'), handle=dock.querySelector('.pc2-calc-handle');
 const reopen=document.createElement('button');
 reopen.type='button';reopen.className='pc2-calc-reopen';reopen.textContent='Calculator';reopen.hidden=true;
 reopen.setAttribute('aria-controls',dock.id);
 document.body.append(reopen);
 let point=null, drag=null, launcherVisible=true;
 function updateReopen(){reopen.hidden=launcherVisible||!dock.hidden;}
 if('IntersectionObserver' in window){
   const observer=new IntersectionObserver(entries=>{launcherVisible=entries[0].isIntersecting;updateReopen();});
   observer.observe(launcher);
 }else{launcherVisible=false;updateReopen();}
 reopen.addEventListener('click',open);
 function place(x,y) {
   const r=dock.getBoundingClientRect(), root=document.documentElement;
   x=Math.max(8,Math.min(x,root.clientWidth-r.width-8));
   y=Math.max(8,Math.min(y,root.clientHeight-r.height-8));
   dock.style.left=x+'px'; dock.style.top=y+'px'; point={x,y};
 }
 function open(){
   dock.hidden=false;updateReopen();
   launcher.setAttribute('aria-expanded','true');
   if(!frame.hasAttribute('src'))frame.src='calculator.html?embedded=1';
   place(point?.x??(document.documentElement.clientWidth-dock.offsetWidth-16),point?.y??60);
   handle.focus();
 }
 function close(){
   dock.hidden=true;updateReopen();
   launcher.setAttribute('aria-expanded','false');
   (launcherVisible?launcher:reopen).focus({preventScroll:true});
 }
 launcher.addEventListener('click',event=>{
   if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
   event.preventDefault();if(dock.hidden)open();else close();
 });
 dock.querySelector('.pc2-calc-close').addEventListener('click',close);
 handle.addEventListener('pointerdown',event=>{
   if(event.button!==0||drag)return;
   const b=dock.getBoundingClientRect();
   drag={id:event.pointerId,dx:event.clientX-b.left,dy:event.clientY-b.top};
   handle.setPointerCapture(event.pointerId);
 });
 handle.addEventListener('pointermove',event=>{
   if(drag?.id===event.pointerId)place(event.clientX-drag.dx,event.clientY-drag.dy);
 });
 handle.addEventListener('lostpointercapture',()=>{drag=null;});
 dock.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();close();return;}
    const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];
    if(!delta||event.target!==handle)return;
    event.preventDefault();
    const step=event.shiftKey?48:12;
    place(point.x+delta[0]*step,point.y+delta[1]*step);
 });
 window.addEventListener('resize',()=>{if(!dock.hidden&&point)place(point.x,point.y);});
 window.addEventListener('message',event=>{
    if(!dock.hidden&&event.origin===location.origin&&event.source===frame.contentWindow&&event.data==='impc-calculator-hide')close();
 });
})();
