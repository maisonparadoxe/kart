// ===== Effets de jeu : caméra dynamique, particules, ondes de choc, étoiles, éclair =====
// Tous les réglages sont ici (FX) pour pouvoir ajuster le « ressenti » facilement.
// Mode « calme » (touche C sur la TV) : intensité réduite, pour les joueurs sensibles aux mouvements d'écran.
const FX={back:9.5,height:5,fovBase:68,
 accelBack:3.2,speedBack:2.2,brakeIn:2.6,boostBack:2,          // recul de la caméra (accélération, vitesse, freinage, boost)
 accelFov:7,speedFov:8,brakeFov:5,boostFov:7,                   // ouverture du champ de vision
 roll:.04,lead:3.5,shakeHit:1,shakeSpeed:.025,hitStop:.07,
 calm:.3};
let camMode=(()=>{try{return localStorage.getItem('kp-cam')||'dyn'}catch(e){return'dyn'}})();
const camK=()=>camMode=='calm'?FX.calm:1;
function toggleCam(){camMode=camMode=='calm'?'dyn':'calm';try{localStorage.setItem('kp-cam',camMode)}catch(e){}}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

// ---- Caméra : suit le kart avec du « retard » qui dépend de l'accélération ----
function camUpdate(p,c,dt){const ka=KARTS[p.cfg.ka],k=camK(),s=p.cs||(p.cs={ac:0,pv:p.v,dist:FX.back,fov:FX.fovBase,roll:0,lead:0,shk:0,fp:0,y:p.y});
 const a=(p.v-s.pv)/Math.max(dt,.001);s.pv=p.v;s.ac+=(a-s.ac)*Math.min(1,dt*5);
 const sr=clamp(p.v/ka.spd,0,1.3),an=clamp(s.ac/38,-1,1),acc=Math.max(0,an),brk=Math.max(0,-an),bo=(p.boost>0||p.rb>.02)?1:0;
 // distance et champ de vision cibles : accélère → la caméra se laisse distancer et s'ouvre ; freine → elle rattrape et se resserre
 const tDist=FX.back+k*(FX.speedBack*sr+FX.accelBack*acc-FX.brakeIn*brk+FX.boostBack*bo),
  tFov=FX.fovBase+k*(FX.speedFov*sr+FX.accelFov*acc-FX.brakeFov*brk+FX.boostFov*bo+(p.air?4:0));
 s.dist+=(tDist-s.dist)*Math.min(1,dt*4);s.fov+=(tFov+s.fp-s.fov)*Math.min(1,dt*6);s.fp*=Math.exp(-dt*7);
 const st=p.st||0;s.roll+=(-st*FX.roll*sr*k-s.roll)*Math.min(1,dt*4);s.lead+=(st*FX.lead*sr*k-s.lead)*Math.min(1,dt*3);
 const fx=Math.sin(p.h),fz=Math.cos(p.h),rx=-Math.cos(p.h),rz=Math.sin(p.h),want=[p.pos[0]-fx*s.dist,p.y+FX.height+.6*sr*k,p.pos[1]-fz*s.dist];
 p.cam=p.cam||want;const k2=Math.min(1,dt*8);for(let j=0;j<3;j++)p.cam[j]+=(want[j]-p.cam[j])*k2;
 // tremblement : coups reçus (décroît vite) + vibration légère à grande vitesse / sous boost
 s.shk*=Math.exp(-dt*4.5);const A=(s.shk*FX.shakeHit+(bo?.05:0)+FX.shakeSpeed*sr*sr)*k;
 c.position.set(p.cam[0]+(Math.random()-.5)*A,p.cam[1]+(Math.random()-.5)*A,p.cam[2]+(Math.random()-.5)*A);
 c.lookAt(p.pos[0]+fx*6+rx*s.lead,p.y+1.6,p.pos[1]+fz*6+rz*s.lead);c.rotateZ(s.roll+(Math.random()-.5)*A*.08);c.fov=s.fov}
// Impulsion de caméra (coup reçu, atterrissage) : tremblement + « pop » du champ de vision
function camHit(p,amp){if(!p.cs)return;const k=camK();p.cs.shk=Math.max(p.cs.shk,amp*k);p.cs.fp=Math.max(p.cs.fp,amp*9*k)}
// Explosion vue par les autres joueurs : tremblement selon la distance
function camNear(x,y,z,amp,range){for(const p of views){const d=Math.hypot(p.pos[0]-x,p.pos[1]-z);if(d<range)camHit(p,amp*(1-d/range))}}

// ---- Éclair d'écran ----
function flashView(p,col){const f=p.hud&&p.hud.querySelector('.flash');if(!f||camK()<.5)return;f.style.setProperty('--fc',col||'#fff');f.classList.remove('on');void f.offsetWidth;f.classList.add('on')}

// ---- Particules (un seul InstancedMesh, pool circulaire) ----
const PN=360,PA=new THREE.SphereGeometry(1,6,5),PM=new THREE.InstancedMesh(PA,new THREE.MeshBasicMaterial({color:0xffffff}),PN),PQ=[],_pm=new THREE.Matrix4(),_pc=new THREE.Color(),_q=new THREE.Quaternion(),_v1=new THREE.Vector3(),_v2=new THREE.Vector3();
PM.frustumCulled=false;PM.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
for(let i=0;i<PN;i++){PQ.push({i,l:0,m:1,x:0,y:0,z:0,vx:0,vy:0,vz:0,g:0,s:1,d:0,sh:0});PM.setColorAt(i,_pc.set(0xffffff));PM.setMatrixAt(i,_pm.makeScale(0,0,0))}
let pPtr=0; // PM est ajouté à la scène par game.js
const R_=(a,b)=>a+Math.random()*(b-a);
// puff(x,y,z, n, {col:[couleurs], sp:vitesse, up:poussée verticale, g:gravité, size:[min,max], life:[min,max], drag})
function puff(x,y,z,n,o){const cols=o.col;for(let i=0;i<n;i++){const q=PQ[pPtr=(pPtr+1)%PN],a=Math.random()*6.283,sp=R_(.3,1)*o.sp;
  q.x=x+R_(-.4,.4);q.y=y+R_(-.2,.4);q.z=z+R_(-.4,.4);q.vx=Math.cos(a)*sp;q.vz=Math.sin(a)*sp;q.vy=R_(.4,1)*o.up;q.g=o.g;q.s=R_(o.size[0],o.size[1]);q.m=q.l=R_(o.life[0],o.life[1]);q.d=o.drag==null?1.5:o.drag;
  PM.setColorAt(pPtr,_pc.set(cols[(Math.random()*cols.length)|0]));PM.instanceColor.needsUpdate=true}}
// ---- Ondes de choc (anneaux au sol) ----
const rings=[];
function ring(x,y,z,col,max,dur){const m=new THREE.Mesh(new THREE.RingGeometry(.72,1,36).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.9,depthWrite:false,side:THREE.DoubleSide}));m.position.set(x,y+.4,z);scene.add(m);rings.push({m,t:0,max,dur})}
// ---- Explosion selon le type d'impact ----
function explode(kind,x,y,z){
 if(kind=='geyser'){puff(x,y+1,z,28,{col:[0xe1f5fe,0x80deea,0xffffff],sp:7,up:20,g:28,size:[.3,.6],life:[.6,1.1]});ring(x,y,z,0x80deea,7,.5);return}
 if(kind=='banana'||kind=='oil'){puff(x,y+.8,z,10,{col:kind=='banana'?[0xffee58,0xffffff,0xfff59d]:[0x1a1a2e,0x4a148c,0x311b92],sp:6,up:8,g:20,size:[.3,.55],life:[.4,.7]});return}
 if(kind=='bonk'||kind=='ram'){puff(x,y+1,z,10,{col:[0xfff176,0xffffff,0xffcc80],sp:8,up:7,g:24,size:[.25,.45],life:[.3,.6]});return}
 const lava=kind=='lava';
 puff(x,y+1,z,24,{col:lava?[0xff3d00,0xff6d00,0xffab00]:[0xffee58,0xffab00,0xff6d00,0xffffff],sp:16,up:16,g:30,size:[.3,.65],life:[.45,.9]});     // étincelles
 puff(x,y+1,z,10,{col:[0x37474f,0x5d4037,0x263238],sp:10,up:14,g:38,size:[.5,.9],life:[.8,1.3]});                                              // débris
 puff(x,y+1.5,z,9,{col:[0x9e9e9e,0x757575,0x616161],sp:4,up:5,g:-3,size:[1.4,2.4],life:[1.1,1.7],drag:1});                                     // fumée
 ring(x,y,z,lava?0xff3d00:0xffab00,11,.5);ring(x,y,z,0xffffff,6,.3)}

// ---- Étoiles au-dessus d'un kart assommé ----
function mkStars(){const g=new THREE.Group(),m=new THREE.MeshBasicMaterial({color:0xffee58});for(let i=0;i<3;i++){const s=new THREE.Mesh(G.octa,m);s.scale.set(.32,.45,.32);s.userData.a=i/3*6.283;g.add(s)}g.position.y=3.7;g.visible=false;return g}
function animStars(u,p,dt,t){if(!u.stars){u.stars=mkStars();u.body.add(u.stars)}const sg=u.stars;sg.visible=p.spin>0;if(!sg.visible)return;
 sg.children.forEach((s,i)=>{const a=s.userData.a+t/150;s.position.set(Math.cos(a)*1.15,Math.sin(t/120+i)*.15,Math.sin(a)*1.15);s.rotation.y=t/90})}

function stepFx(dt){
 for(const q of PQ){if(q.l>0){q.l-=dt;q.vy-=q.g*dt;const f=Math.exp(-q.d*dt);q.vx*=f;q.vz*=f;q.x+=q.vx*dt;q.y+=q.vy*dt;q.z+=q.vz*dt;if(q.y<.1&&q.g>0){q.y=.1;q.vy*=-.3}
   const s=q.s*Math.max(0,q.l/q.m);_pm.compose(_v1.set(q.x,q.y,q.z),_q,_v2.set(s,s,s));PM.setMatrixAt(q.i,_pm)}
  else if(q.sh!==1){q.sh=1;PM.setMatrixAt(q.i,_pm.makeScale(0,0,0))}if(q.l>0)q.sh=0}
 PM.instanceMatrix.needsUpdate=true;
 for(let i=rings.length-1;i>=0;i--){const r=rings[i];r.t+=dt;const u=r.t/r.dur;if(u>=1){scene.remove(r.m);r.m.geometry.dispose();r.m.material.dispose();rings.splice(i,1);continue}
  const s=1+(r.max-1)*(1-(1-u)*(1-u));r.m.scale.set(s,1,s);r.m.material.opacity=.9*(1-u)}}
function fxClear(){for(const q of PQ){q.l=0;q.sh=0}for(const r of rings){scene.remove(r.m);r.m.geometry.dispose();r.m.material.dispose()}rings.length=0}
