// ===== TV : rendu, course, championnat, réseau =====
const $=id=>document.getElementById(id);
const R=new THREE.WebGLRenderer({antialias:true});R.setSize(innerWidth,innerHeight);R.setPixelRatio(Math.min(devicePixelRatio,1.5));R.domElement.id='gl';document.body.prepend(R.domElement);
addEventListener('resize',()=>R.setSize(innerWidth,innerHeight));
const scene=new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xffffff,0x9aa4b8,.7));
const sun=new THREE.DirectionalLight(0xffffff,.75);sun.position.set(60,120,40);scene.add(sun);
let TR=null;
function loadTrack(i){if(TR)scene.remove(TR.g);TR=buildTrack(TRACKS[i],i);scene.add(TR.g);scene.background=TR.bg;scene.fog=new THREE.Fog(TR.def.th.fog,160,520)}
loadTrack(0);

// ---- État ----
const ZERO={s:0,g:0,b:0,i:0};
const players=[];      // humains : {pid,conn,off,offAt,seen,name,cfg,ready,in,key,pts}
let bots=[],racers=[],useBots=true,phase='lobby',race=0,t0=0,fin=0,endAt=Infinity,hz=[],fx=[];
const BOT_NAMES=['Gédéon','Bérénice','Zaza','Léon','Pépito','Mamie Turbo'];
const now=()=>performance.now();
const online=()=>players.filter(p=>!p.off);
const leader=()=>players.find(p=>!p.off&&!p.key);
const send=(p,m)=>{if(p.conn&&p.conn.open)try{p.conn.send(m)}catch(e){}};
const bc=m=>players.forEach(p=>send(p,m));

// ---- Réseau (hôte) ----
// L'identifiant de la TV est gardé dans sessionStorage : recharger la page garde le même QR code
// et les manettes se reconnectent toutes seules.
let hostId=sessionStorage.getItem('kp-host')||'kart-'+Math.random().toString(36).slice(2,8),peer,idTries=0;
function openPeer(){peer=new Peer(hostId);
 peer.on('open',id=>{idTries=0;sessionStorage.setItem('kp-host',id);showQR(id);netMsg('')});
 peer.on('disconnected',()=>netMsg('Serveur de connexion perdu, reconnexion…'));
 peer.on('error',e=>{
  if(e.type=='unavailable-id'){peer.destroy();if(++idTries>3)hostId='kart-'+Math.random().toString(36).slice(2,8);setTimeout(openPeer,2500);return}
  if(e.type=='peer-unavailable')return;netMsg('Souci réseau ('+e.type+'), on réessaie…')});
 peer.on('connection',c=>{toast('📱 Un téléphone se connecte…');c.on('data',m=>onMsg(c,m));c.on('close',()=>onClose(c));c.on('error',()=>onClose(c))})}
// Chien de garde : reconnecte au serveur de signalisation si besoin
setInterval(()=>{if(peer&&!peer.destroyed&&peer.disconnected)try{peer.reconnect()}catch(e){}},4000);
function showQR(id){const u=new URL('controller.html?host='+id,location.href).href;const q=qrcode(0,'M');q.addData(u);q.make();$('qr').innerHTML=q.createImgTag(8,0);$('url').textContent=u}
let toastT;function toast(t){const e=$('toast');e.textContent=t;e.style.display='block';clearTimeout(toastT);toastT=setTimeout(()=>e.style.display='none',3000)}
function netMsg(t){$('net').textContent=t;$('net').style.display=t?'block':'none'}
const closeQuiet=c=>{if(!c)return;try{c.close()}catch(e){}};
function reject(c,why){try{c.send({t:'full',why})}catch(e){}setTimeout(()=>closeQuiet(c),500)}

function onMsg(c,m){if(!m||typeof m!='object')return;let p=players.find(p=>p.conn===c);const t=now();
 if(m.t=='hello'){
  const pid=String(m.pid||'').slice(0,40);let name=String(m.name||'').trim().slice(0,12)||randomName();
  // Même téléphone (même pid) → on reprend sa place ; sinon même pseudo hors ligne (autre navigateur du même téléphone)
  p=players.find(q=>pid&&q.pid===pid)||players.find(q=>q.off&&!q.key&&q.name==name);
  if(p){if(p.conn&&p.conn!==c){send(p,{t:'replaced'});const o=p.conn;p.conn=null;setTimeout(()=>closeQuiet(o),300)}p.pid=pid}
  else{if(phase!='lobby')return reject(c,'Championnat en cours ! Tu pourras rejoindre à la fin.');
   if(players.filter(q=>!q.key).length+players.filter(q=>q.key).length>=4)return reject(c,'Partie pleine (4 joueurs max).');
   p={pid,name,cfg:cleanCfg(m.cfg),ready:false,in:ZERO,pts:0};players.push(p);toast('🏎️ '+name+' a rejoint !');CMT.say('join',{n:name},1)}
  p.conn=c;p.off=false;p.seen=t;
  if(players.some(q=>q!==p&&q.name==name))name=name.slice(0,10)+(players.length+1);
  if(phase=='lobby'){p.name=name;p.cfg=cleanCfg(m.cfg);p.ready=!!m.ready}
  sendPhase(p);lobby();return}
 if(!p)return;p.seen=t;
 if(m.t=='in'&&m.v)p.in={s:Math.max(-1,Math.min(1,+m.v.s||0)),g:m.v.g?1:0,b:m.v.b?1:0,i:m.v.i?1:0};
 else if(m.t=='cfg'&&phase=='lobby'){p.cfg=cleanCfg(m.cfg);p.ready=!!m.ready;if(m.name)p.name=String(m.name).trim().slice(0,12)||p.name;lobby()}
 else if(m.t=='start'&&p===leader())tryStart();
 else if(m.t=='next'&&p===leader())next();
 else if(m.t=='bots'&&p===leader()&&phase=='lobby'){useBots=!!m.v;lobby()}
 else if(m.t=='voice'&&p===leader()){toggleVoice()}
 else if(m.t=='horn'&&phase=='race'&&p.hud&&t-(p.hornT||0)>800){p.hornT=t;pop(p,'TUUT !','#fff176')}}
function onClose(c){const p=players.find(p=>p.conn===c);if(p)markOff(p)}
function markOff(p){const c=p.conn;p.conn=null;closeQuiet(c);if(p.off)return;p.off=true;p.offAt=now();p.in=ZERO;lobby()}
// Battement de cœur : un téléphone muet depuis 6 s est considéré déconnecté (WebRTC ne prévient pas toujours)
setInterval(()=>{const t=now();
 for(const p of[...players]){if(p.key)continue;
  if(!p.off&&t-p.seen>6000)markOff(p);
  else send(p,{t:'ping'});
  if(p.off&&phase=='lobby'&&t-p.offAt>45000){players.splice(players.indexOf(p),1);lobby()}}},1000);
function sendPhase(p){const m={t:'phase',p:phase,race,nr:TRACKS.length,track:TRACKS[race].n,lead:p===leader(),bots:useBots,voice:CMT.mode(),hasVoice:CMT.hasVoice()};
 if(phase=='results'||phase=='podium'){const o=standings();m.pos=(p.lastPos||0);m.gain=p.gain||0;m.pts=p.pts;m.rank=o.indexOf(p)+1;m.n=o.length}
 send(p,m)}

// ---- Lobby ----
const embCache={};const embImg=e=>{const k=JSON.stringify(e);return embCache[k]||(embCache[k]=emblemURL(e))};
function card(p,extra=''){return`<div class=card style="--c:${p.cfg.col}"><img src="${embImg(p.cfg.emb)}"><div><b>${CHARS[p.cfg.ch].e} ${esc(p.name)}</b><small>${KARTS[p.cfg.ka].n}${extra}</small></div></div>`}
function lobby(){players.forEach(p=>sendPhase(p));if(phase!='lobby')return;
 $('pl').innerHTML=players.map(p=>card(p,p.off?' · 📵 reconnexion…':p.ready?' · ✅ prêt':' · …')).join('')||'<div class=empty>Personne pour l’instant…</div>';
 const ok=canStart();
 $('msg').textContent=ok?'Tout le monde est prêt ! Le joueur 1 lance (ou Entrée sur la TV)':players.length?'En attente des joueurs…':'Test sans téléphone : touche K = joueur clavier (flèches + espace)';
 $('opts').innerHTML=`🏆 Championnat ${TRACKS.length} courses : ${TRACKS.map(t=>t.n).join(' · ')}<br>🤖 Bots : ${useBots?'oui':'non'} (B) — 🎙️ Commentateur : ${CMT.mode()=='voice'?'vraie voix':'blabla'} (V) — ${SFX.isOn()?'🔊 Son : oui':'🔇 Son : coupé'} (M)${SFX.unlocked()?'':'<br><b>🔈 Appuie sur une touche ou clique pour activer le son</b>'}`}
function toggleVoice(){CMT.setMode(CMT.mode()=='voice'?'blabla':'voice');if(CMT.mode()=='voice'&&!CMT.hasVoice())toast('Pas de voix française sur ce navigateur : blabla à la place');lobby();CMT.say('join',{n:'tout le monde'},3)}
// Musique uniquement hors course
function music(){if(phase=='race'||!SFX.isOn())SFX.music.stop();else SFX.music.play()}
const canStart=()=>online().length>0&&online().every(p=>p.ready);
function tryStart(){if(phase=='lobby'&&canStart())startChamp()}

// ---- Championnat ----
function startChamp(){for(const p of[...players])if(p.off)players.splice(players.indexOf(p),1);
 players.forEach(p=>{p.pts=0;p.lastPos=0;p.gain=0});
 const nb=useBots?Math.max(0,6-players.length):0,sh=BOT_NAMES.slice().sort(()=>Math.random()-.5);
 bots=Array.from({length:nb},(_,k)=>({bot:1,name:sh[k],pts:0,sf:.9+Math.random()*.06,
  cfg:{ch:(k+2)%CHARS.length,ka:k%KARTS.length,col:COLORS[(k*5+3)%COLORS.length],emb:{sh:k%SHAPES.length,bg:COLORS[(k*7+2)%COLORS.length],fg:'#212121',s:SYMBOLS[(k*3+5)%SYMBOLS.length]}}}));
 race=0;startRace()}
const standings=()=>[...players,...bots].sort((a,b)=>b.pts-a.pts||(a.lastPos||9)-(b.lastPos||9));
function startRace(){loadTrack(race);clearRace();phase='race';fin=0;endAt=Infinity;$('ui').className='hide';
 // Grille : course 1 → bots devant ; ensuite ordre inverse du classement (le leader part dernier)
 racers=race==0?[...bots,...players]:standings().reverse();
 const H=TR.h0,fx=Math.sin(H),fz=Math.cos(H),a=TR.C[0];
 racers.forEach((p,k)=>{const lat=(k%2?1:-1)*3.5,bk=6+Math.floor(k/2)*6;
  Object.assign(p,{h:H,pos:[a[0]-fz*lat-fx*bk,a[1]+fx*lat-fz*bk],v:0,lap:0,fin:0,finT:0,item:null,roll:0,boost:0,spin:0,spinA:0,shield:0,safe:0,maxLap:0,blockT:0,lastI:0,cool:{},aiUse:0,seed:Math.random()*99,cam:null});
  p.idx=nearest(TR,p.pos[0],p.pos[1])[1];p.mesh=mkKart(p.cfg);scene.add(p.mesh)});
 views=racers.filter(p=>!p.bot);
 $('huds').innerHTML='';const cs=views.length>1?2:1,rs=views.length>2?2:1;
 views.forEach((p,k)=>{const d=document.createElement('div');d.className='vp';
  Object.assign(d.style,{left:(k%cs)*100/cs+'%',top:Math.floor(k/cs)*100/rs+'%',width:100/cs+'%',height:100/rs+'%'});
  d.innerHTML=`<div class=pos></div><div class=lap></div><div class=slot><span></span></div><div class=tag style="--c:${p.cfg.col}"><img src="${embImg(p.cfg.emb)}">${esc(p.name)}</div>`;
  $('huds').appendChild(d);p.hud=d});
 $('mini').className=views.length>2?'mid':'';
 t0=now()+3500;lastCount=0;lastLeader=null;lastLapSaid=false;CMT.reset();music();
 if(race==TRACKS.length-1&&race>0){const l=standings()[0];CMT.say('final',{n:l.name,pts:l.pts},2)}else CMT.say('start',{track:TRACKS[race].n},2);
 lobby()}
function clearRace(){racers.forEach(p=>{p.mesh&&scene.remove(p.mesh);p.mesh=null;p.hud=null});hz.forEach(h=>scene.remove(h.m));fx.forEach(f=>scene.remove(f.m));hz=[];fx=[];racers=[];$('huds').innerHTML=''}
function endRace(){const o=[...racers].sort((a,b)=>prog(b)-prog(a));
 o.forEach((p,i)=>{p.lastPos=i+1;p.gain=POINTS[i]||0;p.pts+=p.gain});
 phase='results';$('big').textContent='';music();
 const last=race==TRACKS.length-1;
 racers.forEach(p=>p.hud=null);$('huds').innerHTML='';
 const row=(p,a,b,c)=>`<tr style="--c:${p.cfg.col}"><td class=n>${a}</td><td><img src="${embImg(p.cfg.emb)}"></td><td class=nm>${b}</td><td class=g>${c}</td></tr>`;
 $('ui').className='res';$('ui').innerHTML=`<h1>${esc(TRACKS[race].n)}</h1><div class=cols>
  <div><h2>Résultats de la course</h2><table>${o.map((p,i)=>row(p,ord(i+1),`${CHARS[p.cfg.ch].e} ${esc(p.name)}${p.bot?' 🤖':''}`,'+'+p.gain)).join('')}</table></div>
  <div><h2>Championnat — course ${race+1}/${TRACKS.length}</h2><table>${standings().map((p,i)=>row(p,i+1+'.',esc(p.name),p.pts+' pts')).join('')}</table></div></div>
  <div class=msg>${last?'🏆 Entrée / joueur 1 : voir le podium':'▶ Entrée / joueur 1 : course suivante — '+esc(TRACKS[race+1].n)}</div>`;
 lobby()}
function podium(){phase='podium';clearRace();const o=standings(),top=[o[1],o[0],o[2]];SFX.lib.fanfare();setTimeout(()=>SFX.lib.cheer(1.5),1500);CMT.say('champion',{n:o[0].name},3);setTimeout(music,4000);
 $('ui').className='res pod';$('ui').innerHTML=`<h1>🏆 Champion : ${esc(o[0].name)} !</h1><div class=podium>${top.map((p,i)=>p?`<div class="step s${[2,1,3][i]}" style="--c:${p.cfg.col}"><img src="${embImg(p.cfg.emb)}"><b>${esc(p.name)}</b><small>${p.pts} pts</small><div class=blk>${[2,1,3][i]}</div></div>`:'').join('')}</div>
  <div class=msg>Entrée / joueur 1 : retour au garage</div><div class=confetti>${Array.from({length:60},(_,i)=>`<i style="left:${Math.random()*100}%;animation-delay:${Math.random()*3}s;background:${COLORS[i%COLORS.length]}"></i>`).join('')}</div>`;
 lobby()}
function next(){if(phase=='results'){if(race<TRACKS.length-1){race++;startRace()}else podium()}else if(phase=='podium')backToLobby()}
function backToLobby(){clearRace();phase='lobby';CMT.reset();music();race=0;loadTrack(0);bots=[];players.forEach(p=>p.ready=!!p.key);
 $('ui').className='';$('ui').innerHTML=LOBBY_HTML;if(peer&&peer.id)showQR(peer.id);lobby()}
const LOBBY_HTML=$('ui').innerHTML;

// ---- Course ----
const prog=p=>p.fin?1e9-p.fin*1e3:p.lap*N+p.idx;
const rankOf=p=>racers.filter(q=>prog(q)>prog(p)).length+1;
let views=[];
function pop(p,word,col='#ffeb3b'){if(p.hud){const d=document.createElement('div');d.className='boom';d.textContent=word;d.style.setProperty('--c',col);d.style.setProperty('--r',(Math.random()*20-10)+'deg');p.hud.appendChild(d);setTimeout(()=>d.remove(),1000)}}
function vib(p,k,x){if(!p.bot)send(p,{t:'fx',k,x})}
let lastCount=0,lastLeader=null,lastLapSaid=false;
function hit(p,dur,word,kind,by){if(p.shield>0){if(!p.blockT||now()-p.blockT>1000){p.blockT=now();pop(p,'BLOQUÉ !','#4fc3f7');vib(p,'block');CMT.hit(p,'block',by)}return}
 if(p.safe>0)return;p.spin=dur;p.safe=dur+.8;p.v*=.3;pop(p,word,'#ff5252');vib(p,{bomb:'boom',banana:'slip',oil:'oil'}[kind]||'hit');CMT.hit(p,kind,by)}
function ai(p,t){const look=Math.round(7+Math.max(0,p.v)*.22),j=(p.idx+look)%N,lat=Math.sin(t/2600+p.seed)*4,c=TR.C[j],n=TR.Nr[j];
 let d=Math.atan2(c[0]+n[0]*lat-p.pos[0],c[1]+n[1]*lat-p.pos[1])-p.h;d=Math.atan2(Math.sin(d),Math.cos(d));
 if(p.item&&!p.aiUse)p.aiUse=t+800+Math.random()*3500;
 const use=p.item&&t>p.aiUse;if(use)p.aiUse=0;
 return{s:Math.max(-1,Math.min(1,-d*2.6)),g:1,b:Math.abs(d)>1.1?1:0,i:use?1:0}}
function pickItem(p){const r=racers.length>1?(rankOf(p)-1)/(racers.length-1):0,w={banana:4-3*r,bomb:1.5+1.5*r,pepper:1+4*r,shield:.4+2*r};
 let x=Math.random()*Object.values(w).reduce((a,b)=>a+b);for(const k in w)if((x-=w[k])<0)return k;return'banana'}
function useItem(p,t){const it=p.item;p.item=null;vib(p,'use',it);const fx=Math.sin(p.h),fz=Math.cos(p.h);
 if(it=='banana'){const m=mkBanana();m.position.set(p.pos[0]-fx*3.4,0,p.pos[1]-fz*3.4);scene.add(m);hz.push({k:'banana',pos:[m.position.x,m.position.z],own:p,m})}
 else if(it=='bomb'){const m=mkBomb();scene.add(m);hz.push({k:'bomb',pos:[p.pos[0]+fx*3.5,p.pos[1]+fz*3.5],h:p.h,v:Math.max(75,p.v+30),ttl:4,idx:p.idx,own:p,m});pop(p,'FIOUU !','#ffab00')}
 else if(it=='pepper'){p.boost=1.7;pop(p,'VROOM !','#ff7043')}
 else if(it=='shield'){p.shield=6;pop(p,'BOUCLIER !','#4fc3f7')}}
// Arrivées : commentaires du podium, photo-finish, acclamations
function finished(p){const first=racers.find(q=>q.fin==1);
 if(p.fin<=3){SFX.lib.cheer(p.fin==1?1.4:1);
  if(p.fin==2&&first&&p.finT-first.finT<400)CMT.say('photo',{n:first.name,m:p.name},3);else CMT.say('fin'+p.fin,{n:p.name},3)}
 else if(!p.bot&&p.fin==racers.length)CMT.say('finLast',{n:p.name},1)}
function boom(x,z,own){const m=new THREE.Mesh(G.sph,new THREE.MeshBasicMaterial({color:0xffab00,transparent:true}));m.position.set(x,1.5,z);scene.add(m);fx.push({m,t:0});
 for(const p of racers)if(Math.hypot(p.pos[0]-x,p.pos[1]-z)<5.5)hit(p,1.4,'BOUM !','bomb',own)}
const keys={};
function step(dt,t){const left=(t0-t)/1000,go=left<=0;
 $('big').textContent=left>3?'':left>0?Math.ceil(left):left>-.9?'PARTEZ !':'';
 const cnt=left>3?0:left>0?Math.ceil(left):-1;if(cnt!=lastCount){if(cnt>0)SFX.lib.count();else if(cnt<0&&lastCount>0)SFX.lib.go();lastCount=cnt}
 for(const p of racers){
  if(p.key&&!p.fin)p.in={s:(keys.ArrowRight?1:0)-(keys.ArrowLeft?1:0),g:keys.ArrowUp?1:0,b:keys.ArrowDown?1:0,i:keys.Space?1:0};
  // Bots, joueurs déconnectés et joueurs arrivés : pilote automatique
  let inp=!go?ZERO:(p.bot||p.off||p.fin)?ai(p,t):p.in;
  const ka=KARTS[p.cfg.ka];
  for(const k of['boost','shield','safe'])p[k]=Math.max(0,p[k]-dt);
  if(p.spin>0){p.spin=Math.max(0,p.spin-dt);p.spinA+=dt*16;inp=ZERO}else p.spinA=0;
  if(p.roll&&t>p.roll){p.roll=0;p.item=pickItem(p);vib(p,'got')}
  if(inp.i&&!p.lastI&&p.item&&!p.roll)useItem(p,t);p.lastI=inp.i;
  const[d,i]=nearest(TR,p.pos[0],p.pos[1],p.idx),off=d>W+1.6;
  // Les bots trichent un peu moins quand ils sont loin devant les humains
  let sf=p.bot?p.sf:1;if(p.bot&&views.length){const best=Math.max(...views.map(prog));sf*=prog(p)>best+40?.9:prog(p)<best-60?1.1:1}
  const max=ka.spd*sf*(off?.5:1)*(p.boost>0?1.45:1)*(p.shield>0?1.08:1),target=inp.g?max:inp.b?-max*.3:0;
  p.v+=(target-p.v)*Math.min(1,(p.boost>0?4:ka.acc)*dt*(inp.g||inp.b?1:.6));
  if(p.v>max)p.v+=(max-p.v)*Math.min(1,3*dt);
  p.h-=inp.s*ka.han*dt*Math.max(-1,Math.min(1,p.v/12));
  p.pos[0]+=Math.sin(p.h)*p.v*dt;p.pos[1]+=Math.cos(p.h)*p.v*dt;
  if(d>W*2.4){const c=TR.C[i],k=(d-W*2.4)/d;p.pos[0]+=(c[0]-p.pos[0])*k;p.pos[1]+=(c[1]-p.pos[1])*k;p.v*=.9}
  if(p.idx>N*.8&&i<N*.2){p.lap++;if(p.lap>=2&&p.lap<=LAPS&&p.lap>(p.maxLap||0)){vib(p,p.lap==LAPS?'last':'lap');
    if(p.lap==LAPS&&!p.bot&&!lastLapSaid){lastLapSaid=true;CMT.say('last',{n:p.name},2)}}p.maxLap=Math.max(p.maxLap||0,p.lap)}
  else if(p.idx<N*.2&&i>N*.8)p.lap--;
  p.idx=i;
  if(p.lap>LAPS&&!p.fin){p.fin=++fin;p.finT=t-t0;pop(p,ord(p.fin)+' !','#69f0ae');vib(p,'fin',p.fin);finished(p);
   if(!p.bot&&endAt==Infinity)endAt=t+25000}
  // Boîtes, boosts, obstacles
  for(const b of TR.boxes)if(b.on&&(b.pos[0]-p.pos[0])**2+(b.pos[1]-p.pos[1])**2<6.5){b.on=false;b.t=t+3000;if(!p.item&&!p.roll){p.roll=t+1000;vib(p,'roll')}}
  for(const pd of TR.pads){const dx=p.pos[0]-pd.pos[0],dz=p.pos[1]-pd.pos[1],al=dx*Math.sin(pd.h)+dz*Math.cos(pd.h),la=dx*Math.cos(pd.h)-dz*Math.sin(pd.h);
   if(Math.abs(al)<3.2&&Math.abs(la)<2.6){if(p.boost<.5){pop(p,'ZOOM !','#ff9100');vib(p,'boost')}p.boost=Math.max(p.boost,1.1)}}
  for(const o of TR.obst){const dx=p.pos[0]-o.pos[0],dz=p.pos[1]-o.pos[1],dd=Math.hypot(dx,dz);
   if(o.k=='barrel'&&dd<2.5){p.pos[0]=o.pos[0]+dx/dd*2.5;p.pos[1]=o.pos[1]+dz/dd*2.5;if(p.v>8){p.v*=.3;pop(p,'BONK !','#ffeb3b');vib(p,'bonk');CMT.hit(p,'bonk',null)}}
   else if(o.k=='oil'&&dd<2.2)hit(p,.9,'SPLOTCH !','oil',null)}
  for(const h of hz)if(h.k=='banana'&&!h.dead&&Math.hypot(p.pos[0]-h.pos[0],p.pos[1]-h.pos[1])<1.9){h.dead=1;hit(p,1.1,'SPLAT !','banana',h.own)}}
 // Changement de leader (seulement si un humain est concerné)
 if(left<-4){const L=racers.reduce((a,b)=>prog(b)>prog(a)?b:a);if(lastLeader&&L!==lastLeader&&!L.fin&&(!L.bot||!lastLeader.bot))CMT.say('lead',{n:L.name},L.bot?1:2);lastLeader=L}
 // Chocs entre karts
 for(let a=0;a<racers.length;a++)for(let b=a+1;b<racers.length;b++){const p=racers[a],q=racers[b],dx=q.pos[0]-p.pos[0],dz=q.pos[1]-p.pos[1],d=Math.hypot(dx,dz);
  if(d<2.6&&d>1e-3){const k=(2.6-d)/2/d;p.pos[0]-=dx*k;p.pos[1]-=dz*k;q.pos[0]+=dx*k;q.pos[1]+=dz*k;
   if(p.shield>0&&!q.shield)hit(q,.8,'PAF !','ram',p);else if(q.shield>0&&!p.shield)hit(p,.8,'PAF !','ram',q)}}
 // Bombes
 for(const h of hz)if(h.k=='bomb'&&!h.dead){h.ttl-=dt;const[,i]=nearest(TR,h.pos[0],h.pos[1],h.idx);h.idx=i;const c=TR.C[(i+5)%N];
  let d=Math.atan2(c[0]-h.pos[0],c[1]-h.pos[1])-h.h;d=Math.atan2(Math.sin(d),Math.cos(d));h.h+=Math.max(-3*dt,Math.min(3*dt,d));
  h.pos[0]+=Math.sin(h.h)*h.v*dt;h.pos[1]+=Math.cos(h.h)*h.v*dt;
  const tgt=racers.find(p=>(p!==h.own||h.ttl<3.6)&&Math.hypot(p.pos[0]-h.pos[0],p.pos[1]-h.pos[1])<2.4);
  if(tgt||h.ttl<=0){h.dead=1;boom(h.pos[0],h.pos[1],h.own)}}
 hz=hz.filter(h=>{if(h.dead)scene.remove(h.m);else{h.m.position.x=h.pos[0];h.m.position.z=h.pos[1];if(h.k=='bomb')h.m.rotation.y+=dt*8}return!h.dead});
 fx=fx.filter(f=>{f.t+=dt;f.m.scale.setScalar(1+f.t*14);f.m.material.opacity=1-f.t/.45;if(f.t>.45)scene.remove(f.m);return f.t<=.45});
 for(const b of TR.boxes){if(!b.on&&t>b.t)b.on=true;b.m.visible=b.on;b.m.rotation.y+=dt*1.5;b.m.position.y=1.8+Math.sin(t/300+b.ph)*.3}
 // Fin de course : tous les humains arrivés (+3 s) ou 25 s après le premier humain
 const hum=racers.filter(p=>!p.bot);if(hum.length&&hum.every(p=>p.fin))endAt=Math.min(endAt,t+3000);
 if(racers.every(p=>p.fin)||t>endAt)endRace()}

function animate(dt,t){for(const p of racers){const u=p.mesh.userData;p.mesh.position.set(p.pos[0],0,p.pos[1]);p.mesh.rotation.y=p.h+p.spinA;
 u.body.position.y=Math.abs(Math.sin(t/70+p.seed))*Math.min(.12,Math.abs(p.v)/250)+(p.spin>0?Math.abs(Math.sin(p.spinA))*.6:0);
 u.body.rotation.z=-(p.in&&!p.bot&&!p.off?p.in.s:0)*.08*Math.min(1,p.v/20);
 u.wheels.forEach(w=>w.rotation.x+=p.v*dt/.6);u.bub.visible=p.shield>0;if(p.shield>0)u.bub.scale.setScalar(1+Math.sin(t/90)*.05)}}

// ---- HUD ----
let hudT=0,stT=0;
function hud(t){const items=Object.values(ITEMS).map(i=>i.e);
 for(const p of views){const h=p.hud;if(!h)continue;const r=rankOf(p);
  h.querySelector('.pos').innerHTML=p.fin?`${ord(p.fin)}<small>arrivé</small>`:`${r}<sup>${r==1?'er':'e'}</sup><small>/${racers.length}</small>`;
  h.querySelector('.lap').textContent=p.fin?'🏁':`TOUR ${Math.min(Math.max(p.lap,1),LAPS)}/${LAPS}`;
  const it=p.roll?items[Math.floor(t/90)%items.length]:p.item?ITEMS[p.item].e:'';h.querySelector('.slot span').textContent=it;h.querySelector('.slot').classList.toggle('empty',!it);
  h.classList.toggle('boost',p.boost>0);h.classList.toggle('off',!!p.off)}
 const x=$('mini').getContext('2d'),S=$('mini').width;x.clearRect(0,0,S,S);if(!TR)return;
 let a=1e9,b=-1e9,c=1e9,d=-1e9;for(const[u,v]of TR.C){a=Math.min(a,u);b=Math.max(b,u);c=Math.min(c,v);d=Math.max(d,v)}
 const sc=(S-24)/Math.max(b-a,d-c),X=u=>S/2+(u-(a+b)/2)*sc,Y=v=>S/2-(v-(c+d)/2)*sc;
 x.lineJoin='round';x.beginPath();TR.C.forEach(([u,v],i)=>i?x.lineTo(X(u),Y(v)):x.moveTo(X(u),Y(v)));x.closePath();
 x.lineWidth=11;x.strokeStyle='#111';x.stroke();x.lineWidth=6;x.strokeStyle='#fff';x.stroke();
 for(const p of[...racers].reverse()){x.beginPath();x.arc(X(p.pos[0]),Y(p.pos[1]),p.bot?5:7,0,7);x.fillStyle=p.cfg.col;x.fill();x.lineWidth=2.5;x.strokeStyle='#111';x.stroke()}}
function sendStatus(){for(const p of views)if(!p.key)send(p,{t:'st',rk:rankOf(p),n:racers.length,lap:Math.min(Math.max(p.lap,1),LAPS),laps:LAPS,fin:p.fin,it:p.roll?'🎲':p.item?ITEMS[p.item].e:''})}

// ---- Clavier / souris (TV) ----
addEventListener('keydown',e=>{keys[e.code]=1;
 if(e.code=='Enter'){phase=='lobby'?tryStart():next()}
 if(e.code=='KeyB'&&phase=='lobby'){useBots=!useBots;lobby()}
 if(e.code=='KeyV')toggleVoice();
 if(e.code=='KeyM'){SFX.setOn(!SFX.isOn());music();lobby()}
 if(e.code=='KeyK'&&phase=='lobby'&&players.length<4&&!players.some(p=>p.key)){players.push({key:1,pid:'kbd',name:'Clavier',cfg:{...DEFAULT_CFG,ch:3,col:'#00acc1',emb:{sh:2,bg:'#e53935',fg:'#fff',s:'K'}},ready:true,in:ZERO,pts:0,seen:now()});lobby()}
 if(e.code.startsWith('Arrow')||e.code=='Space')e.preventDefault()});
addEventListener('keyup',e=>keys[e.code]=0);
addEventListener('click',e=>{if(e.target.closest('#qr'))return;phase=='lobby'?tryStart():next()});

// ---- Rendu ----
const cams=[0,1,2,3].map(()=>new THREE.PerspectiveCamera(70,1,.5,700));
function render(t,dt){const Wd=innerWidth,H=innerHeight;R.setScissorTest(false);R.clear();R.setScissorTest(true);
 const list=phase=='race'&&views.length?views:[null],n=list.length,cs=n>1?2:1,rs=n>2?2:1;
 list.forEach((p,k)=>{const w=Wd/cs,h=H/rs,x=(k%cs)*w,y=H-(Math.floor(k/cs)+1)*h,c=cams[k];
  R.setViewport(x,y,w,h);R.setScissor(x,y,w,h);c.aspect=w/h;
  if(p){const fx=Math.sin(p.h),fz=Math.cos(p.h),want=[p.pos[0]-fx*9.5,5,p.pos[1]-fz*9.5];
   p.cam=p.cam||want;const k2=Math.min(1,dt*8);for(let j=0;j<3;j++)p.cam[j]+=(want[j]-p.cam[j])*k2;
   c.position.set(...p.cam);c.lookAt(p.pos[0]+fx*6,1.6,p.pos[1]+fz*6);c.fov+=((p.boost>0?82:70)-c.fov)*Math.min(1,dt*5)}
  else{c.fov=60;c.position.set(Math.cos(t/6000)*200,90,Math.sin(t/6000)*150);c.lookAt(0,0,0)}
  c.updateProjectionMatrix();R.render(scene,c)})}
let last=now();
(function loop(t){requestAnimationFrame(loop);const dt=Math.min((t-last)/1000,.05);last=t;
 if(phase=='race'){step(dt,t);if(phase=='race'){animate(dt,t);if(t-hudT>100){hudT=t;hud(t)}if(t-stT>200){stT=t;sendStatus()}}}
 else if(TR)for(const b of TR.boxes)b.m.rotation.y+=dt*1.5;
 $('mini').style.display=phase=='race'?'block':'none';
 render(t,dt)})(last);
lobby();
// Premier geste sur la TV : le son est débloqué → on lance la musique du lobby
addEventListener('pointerdown',()=>setTimeout(()=>{music();lobby()},50));addEventListener('keydown',()=>setTimeout(()=>{music();if(phase=='lobby')lobby()},50));
if(typeof Peer=='function')openPeer();else netMsg('PeerJS indisponible : seul le mode clavier (touche K) fonctionne.');
