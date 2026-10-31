/* Mesh Playground v2. Browser-only simulation; no external requests. */
(() => {
  "use strict";
  const el = id => document.getElementById(id);
  const stage=el("mesh-stage"), svg=el("mesh-links"), packet=el("mesh-packet");
  if (!stage) return;
  const sender=el("mesh-sender"), receiver=el("mesh-receiver"), send=el("mesh-send");
  const add=el("mesh-add"), remove=el("mesh-remove"), random=el("mesh-random");
  const status=el("mesh-status"), count=el("mesh-count"), stats=el("mesh-stats"), guide=el("mesh-guide");
  const SVG="http://www.w3.org/2000/svg", MAX=16;
  let nodes=[], elements=new Map(), index=2, mode="drag", packetState=null;
  let revision=0, animating=false, drawing=false, focused=null;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const rand=(a,b)=>a+Math.random()*(b-a);
  const nodeBy=id=>nodes.find(n=>n.id===id);
  const width=()=>Math.max(1,stage.clientWidth), height=()=>Math.max(1,stage.clientHeight);
  const range=()=>Math.min(138,Math.min(width(),height())*.31);
  const pos=n=>({x:n.x/100*width(),y:n.y/100*height()});
  const dist=(a,b)=>{const p=pos(a),q=pos(b);return Math.hypot(p.x-q.x,p.y-q.y)};
  const connected=(a,b)=>!!a&&!!b&&dist(a,b)<=range();
  const neighbours=id=>nodes.filter(n=>n.id!==id&&connected(n,nodeBy(id)));
  const edgeKey=(a,b)=>[a,b].sort().join(":");
  function pathBetween(start,end) {
    if(start===end)return [start];
    const seen=new Set([start]), queue=[[start]];
    for(let i=0;i<queue.length;i++){
      const route=queue[i];
      for(const n of neighbours(route[route.length-1])){
        if(seen.has(n.id))continue;
        const next=route.concat(n.id);
        if(n.id===end)return next;
        seen.add(n.id);queue.push(next);
      }
    }
    return null;
  }
  function tell(message,state="idle"){status.textContent=message;status.dataset.state=state}
  function positionPacket(x,y){packet.style.left=x+"%";packet.style.top=y+"%"}
  function drawNow(){
    drawing=false;
    const fragment=document.createDocumentFragment(),r=range();
    const selected=packetState?packetState.current:sender.value;
    const path=pathBetween(selected,receiver.value),highlight=new Set();
    if(path)for(let i=1;i<path.length;i++)highlight.add(edgeKey(path[i-1],path[i]));
    svg.setAttribute("viewBox","0 0 "+width()+" "+height());
    for(const n of nodes){
      const p=pos(n),c=document.createElementNS(SVG,"circle");
      c.setAttribute("cx",p.x);c.setAttribute("cy",p.y);c.setAttribute("r",r);
      c.setAttribute("class","mesh-range"+(n.id===focused||n.id===packetState?.current?" is-active":""));
      fragment.appendChild(c);
    }
    let edges=0;
    for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
      const a=nodes[i],b=nodes[j];
      if(!connected(a,b))continue;
      edges++;
      const l=document.createElementNS(SVG,"line"),p=pos(a),q=pos(b);
      l.setAttribute("x1",p.x);l.setAttribute("y1",p.y);
      l.setAttribute("x2",q.x);l.setAttribute("y2",q.y);
      l.setAttribute("class",highlight.has(edgeKey(a.id,b.id))?"is-route":"");
      fragment.appendChild(l);
    }
    svg.replaceChildren(fragment);
    for(const n of nodes){
      const button=elements.get(n.id);
      button.style.left=n.x+"%";button.style.top=n.y+"%";
      button.classList.toggle("is-source",n.id===sender.value);
      button.classList.toggle("is-target",n.id===receiver.value);
      button.classList.toggle("is-current",n.id===packetState?.current);
    }
    if(packetState&&!animating){
      const n=nodeBy(packetState.current);
      if(n)positionPacket(n.x,n.y);
    }
    count.textContent=nodes.length+" "+(nodes.length%10===1&&nodes.length%100!==11?"узел":nodes.length%10>=2&&nodes.length%10<=4&&(nodes.length%100<12||nodes.length%100>14)?"узла":"узлов");
    stats.textContent=edges+" связей · "+(path?"есть маршрут":"нет маршрута");
  }
  function render(){
    if(drawing)return;
    drawing=true;
    requestAnimationFrame(drawNow);
  }
  function cancelPacket(){
    revision++;packetState=null;animating=false;packet.hidden=true;
    packet.classList.remove("is-waiting");send.disabled=false;
  }
  function animate(from,to,token,done){
    let started=null;
    const duration=window.matchMedia("(prefers-reduced-motion: reduce)").matches?40:700;
    function tick(timestamp){
      if(token!==revision)return;
      if(started===null)started=timestamp;
      const t=clamp((timestamp-started)/duration,0,1),e=t*t*(3-2*t);
      const a=nodeBy(from),b=nodeBy(to);
      if(!a||!b){done(false);return}
      positionPacket(a.x+(b.x-a.x)*e,a.y+(b.y-a.y)*e);
      if(t<1)requestAnimationFrame(tick);else done(connected(a,b));
    }
    requestAnimationFrame(tick);
  }
  function advance(token){
    if(token!==revision||!packetState||animating||packetState.state==="delivered")return;
    const p=packetState;
    if(p.current===p.destination){
      p.state="delivered";send.disabled=false;
      packet.classList.remove("is-waiting");
      tell("Доставлено! Переходов: "+p.hops+".","delivered");render();return;
    }
    if(p.hops>=20){
      p.state="ended";send.disabled=false;
      tell("Лимит 20 переходов достигнут. Отправьте новый пакет.","waiting");render();return;
    }
    const route=pathBetween(p.current,p.destination),destination=nodeBy(p.destination);
    let next=route?.[1];
    if(!next){
      const current=nodeBy(p.current);
      const candidates=neighbours(p.current).filter(n=>!p.visited.has(n.id)&&dist(n,destination)+1<dist(current,destination));
      candidates.sort((a,b)=>dist(a,destination)-dist(b,destination));
      next=candidates[0]?.id;
    }
    if(!next){
      p.state="waiting";send.disabled=false;packet.classList.add("is-waiting");
      tell("Пакет хранится на узле "+p.current+". Нет следующего узла в радиусе связи. Добавьте или переместите ретранслятор.","waiting");
      render();return;
    }
    const from=p.current;
    p.state="moving";animating=true;send.disabled=true;packet.classList.remove("is-waiting");
    tell("Передача пакета: "+from+" → "+next+". Переход "+(p.hops+1)+" из 20.","moving");
    render();
    animate(from,next,token,success=>{
      if(token!==revision||!packetState)return;
      animating=false;
      if(success){p.current=next;p.hops++;p.visited.add(next)}
      advance(token);
    });
  }
  function attemptResume(){
    if(packetState?.state==="waiting"&&!animating&&packetState.hops<20)advance(revision);
    else render();
  }
  function start(){
    if(animating)return;
    if(sender.value===receiver.value){tell("Выберите разные узлы для отправки и получения.");return}
    cancelPacket();
    const token=revision;
    packetState={current:sender.value,destination:receiver.value,hops:0,state:"waiting",visited:new Set([sender.value])};
    packet.hidden=false;
    positionPacket(nodeBy(sender.value).x,nodeBy(sender.value).y);
    render();advance(token);
  }
  function refreshSelects(){
    const a=sender.value||"A",b=receiver.value||"B";
    for(const select of [sender,receiver]){
      const f=document.createDocumentFragment();
      for(const n of nodes){
        const opt=document.createElement("option");opt.value=n.id;opt.textContent="Узел "+n.id;f.appendChild(opt);
      }
      select.replaceChildren(f);
    }
    sender.value=nodeBy(a)?a:"A";receiver.value=nodeBy(b)?b:"B";
  }
  function attach(n){
    const button=document.createElement("button");
    button.type="button";button.className="playground-node";button.textContent=n.id;
    button.setAttribute("aria-label","Узел "+n.id+". Перемещать мышью, пальцем или стрелками.");
    stage.appendChild(button);elements.set(n.id,button);
    let pointer=null;
    button.addEventListener("pointerdown",ev=>{
      if(mode!=="drag"||ev.button!==0)return;
      ev.preventDefault();pointer=ev.pointerId;focused=n.id;
      button.setPointerCapture(pointer);button.classList.add("is-dragging");render();
    });
    button.addEventListener("pointermove",ev=>{
      if(pointer!==ev.pointerId)return;
      const rect=stage.getBoundingClientRect();
      n.x=clamp((ev.clientX-rect.left)/rect.width*100,8,92);
      n.y=clamp((ev.clientY-rect.top)/rect.height*100,10,90);render();
    });
    const end=ev=>{
      if(pointer!==ev.pointerId)return;
      pointer=null;focused=null;button.classList.remove("is-dragging");
      if(button.hasPointerCapture(ev.pointerId))button.releasePointerCapture(ev.pointerId);
      attemptResume();
    };
    button.addEventListener("pointerup",end);button.addEventListener("pointercancel",end);
    button.addEventListener("lostpointercapture",()=>{
      if(pointer===null)return;
      pointer=null;focused=null;button.classList.remove("is-dragging");attemptResume();
    });
    button.addEventListener("keydown",ev=>{
      if(mode!=="drag")return;
      const movement={ArrowLeft:[-3,0],ArrowRight:[3,0],ArrowUp:[0,-4],ArrowDown:[0,4]}[ev.key];
      if(!movement)return;
      ev.preventDefault();n.x=clamp(n.x+movement[0],8,92);n.y=clamp(n.y+movement[1],10,90);attemptResume();
    });
    button.addEventListener("click",ev=>{
      ev.stopPropagation();
      if(mode!=="remove")return;
      if(n.id==="A"||n.id==="B"){tell("A и B — базовые узлы. Их можно перемещать.");return}
      if(packetState?.current===n.id){tell("На этом узле сейчас хранится пакет.","waiting");return}
      if(packetState&&(n.id===packetState.destination||n.id===sender.value)){cancelPacket()}
      else if(packetState&&animating){revision++;animating=false;packetState.state="waiting";send.disabled=false}
      nodes=nodes.filter(other=>other!==n);button.remove();elements.delete(n.id);
      refreshSelects();render();
      tell("Ретранслятор "+n.id+" удалён.");
      attemptResume();
    });
  }
  function addRelay(x,y){
    if(nodes.length>=MAX){tell("Достигнут лимит 16 узлов. Удалите один, чтобы добавить другой.","waiting");return}
    const candidate={id:index<26?String.fromCharCode(65+index):"R"+(index-25),x:clamp(x,8,92),y:clamp(y,10,90)};
    if(nodes.some(n=>dist(n,candidate)<55)){tell("Слишком близко к другому узлу. Выберите свободное место.");return}
    index++;nodes.push(candidate);attach(candidate);refreshSelects();render();
    tell("Ретранслятор "+candidate.id+" добавлен. Можно разместить следующий.");
    attemptResume();
  }
  function setMode(next){
    mode=mode===next?"drag":next;
    add.classList.toggle("is-active",mode==="add");
    remove.classList.toggle("is-active",mode==="remove");
    add.setAttribute("aria-pressed",String(mode==="add"));remove.setAttribute("aria-pressed",String(mode==="remove"));
    stage.classList.toggle("is-adding",mode==="add");stage.classList.toggle("is-removing",mode==="remove");
    guide.textContent=mode==="add"?"НАЖМИТЕ НА ПУСТОЕ МЕСТО ДЛЯ ДОБАВЛЕНИЯ":mode==="remove"?"НАЖМИТЕ НА РЕТРАНСЛЯТОР ДЛЯ УДАЛЕНИЯ":"ПЕРЕТАСКИВАЙТЕ УЗЛЫ · МЕНЯЙТЕ МАРШРУТ";
    if(mode==="add")tell("Режим добавления: коснитесь свободного места на схеме.");
    if(mode==="remove")tell("Режим удаления: выберите промежуточный узел.");
  }
  function randomNetwork(){
    cancelPacket();for(const b of elements.values())b.remove();
    elements.clear();
    nodes=[{id:"A",x:rand(10,17),y:rand(25,75)},{id:"B",x:rand(83,90),y:rand(25,75)}];
    index=2;
    const extras=1+Math.floor(Math.random()*3);
    for(let i=0;i<extras;i++)for(let attempt=0;attempt<75;attempt++){
      const n={id:index<26?String.fromCharCode(65+index):"R"+(index-25),x:rand(22,78),y:rand(14,86)};
      if(nodes.every(other=>dist(other,n)>65)){nodes.push(n);index++;break}
    }
    for(const n of nodes)attach(n);
    sender.value="A";receiver.value="B";refreshSelects();
    mode="remove";setMode("drag");render();
    tell("Случайная сеть готова. Отправьте пакет и достройте путь, если он застрянет.");
  }
  stage.addEventListener("click",ev=>{
    if(mode!=="add"||ev.target.closest(".playground-node"))return;
    const rect=stage.getBoundingClientRect();
    addRelay((ev.clientX-rect.left)/rect.width*100,(ev.clientY-rect.top)/rect.height*100);
  });
  for(const select of [sender,receiver])select.addEventListener("change",()=>{
    cancelPacket();render();tell("Узлы выбраны. Отправьте новый пакет.");
  });
  send.addEventListener("click",start);
  add.addEventListener("click",()=>setMode("add"));
  remove.addEventListener("click",()=>setMode("remove"));
  random.addEventListener("click",randomNetwork);
  if("ResizeObserver" in window)new ResizeObserver(render).observe(stage);
  else window.addEventListener("resize",render,{passive:true});
  randomNetwork();
})();