// ===== Les 12 circuits =====
// Chaque circuit : un tracé fermé (N points à pas constant), un relief (collines + ponts quand le tracé se croise),
// un thème (couleurs, décor). Les tracés sont validés hors-jeu : pas de virage trop serré, pas de croisement « à plat ».
const N=300,W=10,DECK=9;
function rng(s){return()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const sstep=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
// B-spline cubique fermée : on dessine un polygone de contrôle, la courbe est lisse
function bspline(pts){const n=pts.length;return t=>{const u=(((t/(Math.PI*2))%1)+1)%1*n,i=Math.floor(u),f=u-i,g=k=>pts[(i+k+n)%n],a=g(-1),b=g(0),c=g(1),d=g(2);
 const w0=(1-f)**3/6,w1=(3*f**3-6*f*f+4)/6,w2=(-3*f**3+3*f*f+3*f+1)/6,w3=f**3/6;return[w0*a[0]+w1*b[0]+w2*c[0]+w3*d[0],w0*a[1]+w1*b[1]+w2*c[1]+w3*d[1]]}}
// Courbe → N points équidistants, puis lissage (moyenne mobile) pour adoucir les virages trop serrés
function resample(P,smooth){const M=N*8,D=[];for(let i=0;i<M;i++)D.push(P(i/M*Math.PI*2));const L=[0];for(let i=1;i<=M;i++){const a=D[i-1],b=D[i%M];L.push(L[i-1]+Math.hypot(b[0]-a[0],b[1]-a[1]))}
 let C=[],j=0;for(let i=0;i<N;i++){const tg=i/N*L[M];while(L[j+1]<tg)j++;const f=(tg-L[j])/(L[j+1]-L[j]),a=D[j],b=D[(j+1)%M];C.push([a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f])}
 for(let it=0;it<(smooth||0);it++)C=C.map((_,i)=>{let x=0,z=0;for(let k=-3;k<=3;k++){const q=C[(i+k+N)%N];x+=q[0];z+=q[1]}return[x/7,z/7]});return C}
const arcd=(i,j)=>{const d=Math.abs(i-j);return Math.min(d,N-d)};
// Zones où le tracé passe tout près d'une autre partie du tracé (croisements)
function crossZones(C){const z=new Array(N).fill(false);for(let i=0;i<N;i++)for(let j=i+1;j<N;j++){if(arcd(i,j)<=45)continue;if((C[i][0]-C[j][0])**2+(C[i][1]-C[j][1])**2<34*34)z[i]=z[j]=true}return z}

const SC=(P,k)=>t=>{const p=P(t);return[p[0]*k,p[1]*k]};
const FIGURE8=SC(t=>[165*Math.cos(t)+10*Math.cos(3*t),95*Math.sin(2*t)],.8);
const LOOP=SC(t=>{const r=46*(1+2.4*Math.cos(t));return[(r*Math.cos(t)-70)*1.05,r*Math.sin(t)]},1.15);
const SKEW=SC(t=>[160*Math.cos(t),75*Math.sin(2*t)+45*Math.sin(t)],.9);
const PTS={
 plage:[[-150,-10],[-110,-85],[-40,-70],[10,-105],[85,-85],[150,-60],[165,10],[110,50],[55,25],[10,70],[-30,110],[-100,95],[-140,50]],
 volcan:[[-160,-60],[-120,-100],[-30,-100],[40,-70],[110,-100],[165,-70],[160,-10],[90,10],[130,50],[150,100],[70,115],[0,80],[-70,110],[-140,90],[-165,30]],
 bonbon:[[-150,-90],[-70,-110],[0,-60],[70,-110],[150,-90],[165,-20],[100,10],[160,50],[130,105],[60,90],[0,115],[-60,70],[-120,110],[-165,60],[-130,-10],[-165,-40]],
 foret:[[-150,-80],[-40,-105],[60,-60],[150,-100],[160,0],[100,40],[150,100],[30,110],[-40,60],[-100,110],[-165,50],[-120,-10]],
 nuit:[[-150,-100],[-60,-110],[20,-90],[40,-30],[100,-10],[160,-50],[170,30],[120,100],[30,110],[-40,70],[-110,100],[-165,60],[-150,-10]],
 ferme:[[-165,-85],[-40,-105],[110,-105],[165,-70],[165,30],[110,80],[40,50],[-30,95],[-100,110],[-165,70]]};

const TH={ // th : sky[haut,bas] fog gnd spot road[2] kerb[2] hill decor + options (island, sea, stars, nohill, noclouds, cloud, barrel, oil, skirt, rail[2])
 prairie:{sky:['#3fb4ff','#c9f0ff'],fog:0xc9f0ff,gnd:0x7ccf4a,spot:0x5fb53a,road:[0x6b6b7d,0x75758a],kerb:[0xe53935,0xffffff],hill:0x58a83a,decor:'tree',skirt:0x5fb53a},
 desert:{sky:['#ff9d4d','#ffe7b0'],fog:0xffe2a8,gnd:0xf2c46b,spot:0xe0a94e,road:[0x8a6a55,0x95735d],kerb:[0xff7043,0xfff3e0],hill:0xd9894a,decor:'cactus',skirt:0xe0a94e},
 glacier:{sky:['#7e8cff','#e3ecff'],fog:0xe3ecff,gnd:0xf4f8ff,spot:0xd6e6fb,road:[0x5f7fa8,0x6a8cb6],kerb:[0x1e88e5,0xffffff],hill:0xc5d8f5,decor:'pine',skirt:0xd6e6fb},
 plage:{sky:['#29b6f6','#e1f5fe'],fog:0xe1f5fe,gnd:0xffe0a3,spot:0xf5cd7a,road:[0xa1785a,0xad8564],kerb:[0x00acc1,0xffffff],decor:'palm',island:[240,175],sea:0x26c6da,nohill:1,skirt:0xf5cd7a},
 volcan:{sky:['#3e1f1f','#ff7043'],fog:0x6b2a1f,gnd:0x4e342e,spot:0xff5722,road:[0x37474f,0x455a64],kerb:[0xff6d00,0x212121],hill:0x3e2723,decor:'rock',cloud:0x6d4c41,barrel:0x546e7a,oil:0xff7043,skirt:0x3e2723},
 bonbon:{sky:['#f48fb1','#fff3e0'],fog:0xffe4ec,gnd:0xffc1e3,spot:0xff80ab,road:[0x9575cd,0xa58ad6],kerb:[0xff4081,0xffffff],hill:0xf8bbd0,decor:'candy',barrel:0xff4081,oil:0x6d4c41,skirt:0xff80ab,rail:[0xff4081,0xffffff]},
 espace:{sky:['#0d0221','#3b1c6e'],fog:0x2a1458,gnd:0x1a1040,spot:0x311b92,road:[0x5c6bc0,0x6573c3],kerb:[0x00e5ff,0xea80fc],decor:'crystal',island:[240,175],sea:0x05010f,nohill:1,noclouds:1,stars:1,barrel:0x00bfa5,oil:0x7c4dff,skirt:0x311b92,rail:[0x00e5ff,0xffffff]},
 foret:{sky:['#7e57c2','#d1c4e9'],fog:0xd1c4e9,gnd:0x558b2f,spot:0x7cb342,road:[0x6d4c41,0x795548],kerb:[0xffc107,0x4e342e],hill:0x7e57c2,decor:'mushroom',skirt:0x7cb342},
 jungle:{sky:['#00bfa5','#b2ff59'],fog:0xb9f6ca,gnd:0x2e7d32,spot:0x1b5e20,road:[0x8d6e63,0x9a7b6f],kerb:[0xffeb3b,0x33691e],hill:0x1b5e20,decor:'jungle',skirt:0x1b5e20,rail:[0xffeb3b,0x33691e]},
 nuit:{sky:['#050a30','#283593'],fog:0x1a237e,gnd:0x1b3a4b,spot:0x14303d,road:[0x3a4a6b,0x44567a],kerb:[0xffee58,0x1a237e],hill:0x0d1b3a,decor:'night',noclouds:1,stars:1,barrel:0x6a1b9a,skirt:0x14303d},
 ferme:{sky:['#4fc3f7','#fffde7'],fog:0xfffde7,gnd:0xaed581,spot:0x9ccc65,road:[0xa1887f,0xad9488],kerb:[0xffffff,0xd84315],hill:0x81c784,decor:'farm',barrel:0x8d6e63,skirt:0x9ccc65},
 canyon:{sky:['#4dd0e1','#ffe0b2'],fog:0xffe0b2,gnd:0xd7a26a,spot:0xc98a52,road:[0x6d5a4a,0x786452],kerb:[0xffffff,0xbf360c],hill:0xbf6a3a,decor:'canyon',skirt:0xc98a52,rail:[0xbf360c,0xffffff]}};
// hill : [[amplitude, ondulations par tour, phase],…]
const TRACKS=[
 {P:t=>[135*Math.cos(t)+14*Math.cos(3*t),88*Math.sin(t)+14*Math.sin(2*t)],sm:4,th:TH.prairie,hill:[[3,2,0]]},
 {P:t=>{const r=120+28*Math.sin(3*t);return[r*Math.cos(t)*1.15,r*Math.sin(t)*.85]},sm:0,th:TH.desert,hill:[[5,3,1]]},
 {P:t=>[150*Math.cos(t)+10*Math.cos(2*t),70*Math.sin(t)-45*Math.cos(2*t)*Math.sin(t)+18*Math.sin(3*t)],sm:0,th:TH.glacier,hill:[[6,2,0],[2,5,2]]},
 {P:bspline(PTS.plage),sm:6,th:TH.plage,hill:[[3.5,3,.5]]},
 {P:bspline(PTS.volcan),sm:6,th:TH.volcan,hill:[[7,2,1],[2.5,4,0]]},
 {P:bspline(PTS.bonbon),sm:6,th:TH.bonbon,hill:[[5,3,2]]},
 {P:FIGURE8,sm:0,th:TH.espace,hill:[[3,4,0]]},
 {P:bspline(PTS.foret),sm:6,th:TH.foret,hill:[[5,3,1]]},
 {P:SKEW,sm:0,th:TH.jungle,hill:[[4,3,0]]},
 {P:bspline(PTS.nuit),sm:6,th:TH.nuit,hill:[[4,2,3]]},
 {P:bspline(PTS.ferme),sm:6,th:TH.ferme,hill:[[3,2,2]]},
 {P:LOOP,sm:0,th:TH.canyon,hill:[[3,3,1]]}];
TRACKS.forEach((t,i)=>{t.n=TRACK_META[i].n;t.e=TRACK_META[i].e});

// ---- Décors : chaque fonction reçoit les positions [x,z,échelle] choisies hors de la route ----
const DECOR={
 tree(g,pos){instanced(g,G.cyl,0x8d5a3b,pos.map(([x,z,s])=>mtx(x,3*s,z,.8*s,6*s,.8*s)));instanced(g,G.sph,0x2e9d3a,pos.map(([x,z,s])=>mtx(x,8*s,z,4*s,3.6*s,4*s)));
  instanced(g,G.sph,0xe53935,pos.filter((_,i)=>i%4==0).map(([x,z,s])=>mtx(x+2.5*s,7*s,z+2.5*s,.6*s)),.04)},
 cactus(g,pos){const c=pos.filter((_,i)=>i%3),r=pos.filter((_,i)=>i%3==0);
  instanced(g,G.cyl,0x43a047,c.map(([x,z,s])=>mtx(x,5*s,z,1.1*s,10*s,1.1*s)));instanced(g,G.sph,0x43a047,c.map(([x,z,s])=>mtx(x,10*s,z,1.1*s)));
  instanced(g,G.cyl,0x43a047,c.map(([x,z,s])=>mtx(x+1.8*s,6*s,z,.7*s,4*s,.7*s)));instanced(g,G.sph,0xff4081,c.filter((_,i)=>i%2).map(([x,z,s])=>mtx(x,11*s,z,.45*s)),.04);
  instanced(g,G.dodeca,0xc76b3b,r.map(([x,z,s])=>mtx(x,1.5*s,z,4*s,3*s,3.5*s,s*4)))},
 pine(g,pos){instanced(g,G.cyl,0x6d4c41,pos.map(([x,z,s])=>mtx(x,1.5*s,z,.6*s,3*s,.6*s)));
  instanced(g,G.cone,0x1b5e20,pos.map(([x,z,s])=>mtx(x,6*s,z,4*s,7*s,4*s)));instanced(g,G.cone,0x2e7d32,pos.map(([x,z,s])=>mtx(x,10*s,z,3*s,5*s,3*s)));
  instanced(g,G.cone,0xffffff,pos.map(([x,z,s])=>mtx(x,12.6*s,z,1.5*s,2*s,1.5*s)),.06)},
 palm(g,pos){instanced(g,G.cyl,0x8d6e63,pos.map(([x,z,s])=>mtx(x,5*s,z,.6*s,10*s,.6*s)));
  for(let a=0;a<3;a++)instanced(g,G.box,0x2e9d3a,pos.map(([x,z,s],i)=>mtx(x,10.3*s,z,8*s,.35*s,1.9*s,a*Math.PI/3+i)),.08);
  instanced(g,G.sph,0x6d4c41,pos.map(([x,z,s])=>mtx(x+.7*s,9.6*s,z,.5*s)),.04)},
 rock(g,pos){const big=pos.filter((_,i)=>i%5==0),rest=pos.filter((_,i)=>i%5);
  instanced(g,G.cone,0x4e342e,big.map(([x,z,s])=>mtx(x,6*s,z,7*s,12*s,7*s)));instanced(g,G.cone,0xff7043,big.map(([x,z,s])=>mtx(x,12.2*s,z,2.4*s,2.6*s,2.4*s)),.05);
  instanced(g,G.dodeca,0x5d4037,rest.filter((_,i)=>i%2).map(([x,z,s])=>mtx(x,2*s,z,3.4*s,2.6*s,3*s,s*5)));instanced(g,G.dodeca,0x37474f,rest.filter((_,i)=>i%2==0).map(([x,z,s])=>mtx(x,2*s,z,3*s,2.4*s,3.4*s,s*3)))},
 mushroom(g,pos){instanced(g,G.cyl,0xfff8e1,pos.map(([x,z,s])=>mtx(x,2.6*s,z,.95*s,5.2*s,.95*s)));
  [0xe53935,0x8e24aa,0xff7043].forEach((c,k)=>instanced(g,G.sph,c,pos.filter((_,i)=>i%3==k).map(([x,z,s])=>mtx(x,5.6*s,z,3.7*s,2.2*s,3.7*s))));
  instanced(g,G.sph,0xffffff,pos.map(([x,z,s])=>mtx(x+1.3*s,7.1*s,z+.8*s,.55*s)),.03);instanced(g,G.sph,0xffffff,pos.map(([x,z,s])=>mtx(x-1.2*s,6.8*s,z-1*s,.48*s)),.03)},
 candy(g,pos,rnd){instanced(g,G.cyl,0xffffff,pos.map(([x,z,s])=>mtx(x,3.6*s,z,.38*s,7.2*s,.38*s)));
  [0xff4081,0x00e5ff,0xffeb3b,0xb388ff].forEach((c,k)=>instanced(g,G.sph,c,pos.filter((_,i)=>i%4==k).map(([x,z,s],i)=>mtx(x,8.2*s,z,3.2*s,3.2*s,.9*s,i*1.7+k))));
  instanced(g,G.sph,0xff80ab,pos.filter((_,i)=>i%3==0).map(([x,z,s])=>mtx(x+4*s,1.6*s,z+3*s,2*s,1.6*s,2*s)),.06)},
 crystal(g,pos,rnd){[0x00e5ff,0xe040fb,0x76ff03].forEach((c,k)=>instanced(g,G.octa,c,pos.filter((_,i)=>i%3==k).map(([x,z,s],i)=>mtx(x,4.5*s,z,1.7*s,5.5*s,1.7*s,i))));
  [[-260,150,-330,52,0xff7043],[240,190,-300,70,0x7c4dff],[40,120,-420,40,0x26c6da],[-80,210,300,60,0xf06292]].forEach(([x,y,z,r,c])=>{const m=part(g,G.sph,c,x,y,z,.05);m.scale.setScalar(r);m.material=new THREE.MeshToonMaterial({color:c,gradientMap:GRAD,fog:false})})},
 jungle(g,pos,rnd,ctx){instanced(g,G.cyl,0x6d4c41,pos.map(([x,z,s])=>mtx(x,7*s,z,.9*s,14*s,.9*s)));
  instanced(g,G.sph,0x2e7d32,pos.map(([x,z,s])=>mtx(x,15*s,z,6*s,2.6*s,6*s)));instanced(g,G.sph,0x43a047,pos.map(([x,z,s])=>mtx(x+1,16.6*s,z,4*s,2*s,4*s)));
  const f=ctx.extra(70,W+5);instanced(g,G.sph,0xff4081,f.filter((_,i)=>i%2).map(([x,z])=>mtx(x,.6,z,.7)),.04);instanced(g,G.sph,0xffeb3b,f.filter((_,i)=>i%2==0).map(([x,z])=>mtx(x,.6,z,.7)),.04);
  instanced(g,G.cone,0x388e3c,ctx.extra(45,W+5).map(([x,z])=>mtx(x,1.3,z,1.5,2.6,1.5)),.05)},
 night(g,pos,rnd,ctx){instanced(g,G.cyl,0x3e2723,pos.map(([x,z,s])=>mtx(x,1.5*s,z,.6*s,3*s,.6*s)));
  instanced(g,G.cone,0x0d3b3b,pos.map(([x,z,s])=>mtx(x,6*s,z,4*s,7*s,4*s)));instanced(g,G.cone,0x145a5a,pos.map(([x,z,s])=>mtx(x,10*s,z,3*s,5*s,3*s)));
  const ff=ctx.extra(140,2).map(([x,z],i)=>mtx(x,1+rnd()*9,z,.32));instBasic(g,G.sph,0xffee58,ff.filter((_,i)=>i%2),true);instBasic(g,G.sph,0xb2ff59,ff.filter((_,i)=>i%2==0),true);
  const moon=new THREE.Mesh(G.sph,new THREE.MeshBasicMaterial({color:0xfff9c4,fog:false}));moon.scale.setScalar(34);moon.position.set(-230,150,-390);g.add(moon)},
 farm(g,pos,rnd,ctx){const b=pos.filter((_,i)=>i%6==0),h=pos.filter((_,i)=>i%6==1||i%6==2),t=pos.filter((_,i)=>i%6>2);
  instanced(g,G.cyl,0xfdd835,h.map(([x,z,s])=>mtx(x,1.7*s,z,2.4*s,3.4*s,2.4*s)));instanced(g,G.sph,0xfdd835,h.map(([x,z,s])=>mtx(x,3.4*s,z,2.4*s,1.2*s,2.4*s)),.06);
  instanced(g,G.box,0xc62828,b.map(([x,z,s],i)=>mtx(x,4*s,z,12*s,8*s,9*s,i)));instanced(g,G.prism,0x8d6e63,b.map(([x,z,s],i)=>mtx(x,9.75*s,z,13*s,3.5*s,5.4*s,i)));
  instanced(g,G.box,0xffffff,b.map(([x,z,s],i)=>mtx(x+Math.sin(i)*6.1*s,3*s,z+Math.cos(i)*6.1*s,.5*s,5*s,3*s,i)),.05);
  instanced(g,G.cyl,0x8d5a3b,t.map(([x,z,s])=>mtx(x,2*s,z,.7*s,4*s,.7*s)));instanced(g,G.sph,0x66bb6a,t.map(([x,z,s])=>mtx(x,6*s,z,3.4*s,3.2*s,3.4*s)))},
 canyon(g,pos){const cols=[0xd2691e,0xc65a2e,0xe08a4b];cols.forEach((c,k)=>instanced(g,G.cyl,c,pos.filter((_,i)=>i%3==k&&i%7).map(([x,z,s])=>mtx(x,12*s,z,4.2*s,24*s,4.2*s))));
  instanced(g,G.cyl,0x8d4a2b,pos.filter((_,i)=>i%7).map(([x,z,s])=>mtx(x,24.6*s,z,5.4*s,1.8*s,5.4*s)),.08);
  instanced(g,G.cone,0x2e7d32,pos.filter((_,i)=>i%7==0).map(([x,z,s])=>mtx(x,5*s,z,3.4*s,10*s,3.4*s)))}};

function buildTrack(def,ti){const g=new THREE.Group(),th=def.th,rnd=rng(ti*999+7);
 let C=resample(def.P,def.sm);
 // Départ : on cherche la ligne droite la plus longue, à l'écart des croisements
 const rad=C.map((b,i)=>{const a=C[(i-3+N)%N],c=C[(i+3)%N],ab=Math.hypot(b[0]-a[0],b[1]-a[1]),bc=Math.hypot(c[0]-b[0],c[1]-b[1]),ac=Math.hypot(c[0]-a[0],c[1]-a[1]),cr=Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]));return ab*bc*ac/(2*cr+1e-9)});
 let z0=crossZones(C),bestS=-1,bk=0;
 const zd=i=>{let m=N;for(let j=0;j<N;j++)if(z0[j])m=Math.min(m,arcd(i,j));return m};
 for(let k=0;k<N;k++){if(zd(k)<55)continue;let m=1e9;for(let q=-10;q<=4;q++)m=Math.min(m,rad[(k+q+N)%N]);if(m>bestS){bestS=m;bk=k}}
 C=C.slice(bk).concat(C.slice(0,bk));
 const T=[],Nr=[];for(let i=0;i<N;i++){const a=C[(i-1+N)%N],b=C[(i+1)%N];let dx=b[0]-a[0],dz=b[1]-a[1];const l=Math.hypot(dx,dz);dx/=l;dz/=l;T.push([dx,dz]);Nr.push([-dz,dx])}
 // ---- Relief : collines + ponts aux croisements ----
 const zone=crossZones(C),cd=new Array(N).fill(N);for(let i=0;i<N;i++)for(let j=0;j<N;j++)if(zone[j])cd[i]=Math.min(cd[i],arcd(i,j));
 const runs=[];{const s=zone.findIndex(z=>!z);if(s>=0){let cur=null;for(let k=1;k<=N;k++){const i=(s+k)%N;if(zone[i]){if(!cur)cur={a:i,n:0};cur.n++;cur.b=i}else if(cur){cur.m=(cur.a+Math.floor(cur.n/2))%N;runs.push(cur);cur=null}}}}
 const bridge=new Array(N).fill(0);
 for(const r of runs){const o=runs.find(q=>q!==r&&arcd(q.m,r.m)>45&&Math.hypot(C[q.m][0]-C[r.m][0],C[q.m][1]-C[r.m][1])<45);if(!o||r.m<o.m)continue; // le passage « tardif » du tour passe dessus
  const PL=Math.floor(r.n/2)+9,RP=50;for(let i=0;i<N;i++){const d=arcd(i,r.m);bridge[i]=Math.max(bridge[i],d<=PL?1:1-sstep((d-PL)/RP))}}
 const H=new Float32Array(N);for(let i=0;i<N;i++){let h=0;for(const[a,w,p]of def.hill||[])h+=a*(.5+.5*Math.sin(Math.PI*2*w*i/N+p));
  H[i]=h*sstep((cd[i]-14)/34)*sstep((Math.min(i,N-i)-16)/36)+DECK*bridge[i]}
 const G_=new Float32Array(N);for(let i=0;i<N;i++){const a=(i-1+N)%N,b=(i+1)%N;G_[i]=(H[b]-H[a])/(Math.hypot(C[b][0]-C[a][0],C[b][1]-C[a][1])||1)}
 const wall=new Array(N).fill(false);for(let i=0;i<N;i++)wall[i]=zone[i]||bridge[i]>.12;
 const P3=(i,lat,y)=>[C[i][0]+Nr[i][0]*lat,y,C[i][1]+Nr[i][1]*lat];
 const at=(f,lat=0)=>{const i=Math.round(((f%1)+1)%1*N)%N;return[C[i][0]+Nr[i][0]*lat,C[i][1]+Nr[i][1]*lat,Math.atan2(T[i][0],T[i][1]),i]};
 // ---- Rubans (route, vibreurs, murs, talus) fusionnés dans une seule géométrie ----
 const V=[],CL=[],IX=[];
 function ribbon(f,colorOf){for(let i=0;i<N;i++){const col=colorOf(i);if(col==null)continue;const j=(i+1)%N,cl=new THREE.Color(col),A=f(i),B=f(j),k=V.length/3;
   V.push(...A[0],...A[1],...B[0],...B[1]);for(let n=0;n<4;n++)CL.push(cl.r,cl.g,cl.b);IX.push(k,k+2,k+1,k+1,k+2,k+3)}}
 const flat=(l0,l1,yo)=>i=>[P3(i,l0,H[i]+yo),P3(i,l1,H[i]+yo)];
 ribbon(flat(-W,W,.06),i=>th.road[(i>>3)%2]);
 const KE=W+1.6,KO=W+2.1;
 for(const s of[-1,1]){ribbon(flat(s*W,s*KE,.09),i=>th.kerb[(i>>1)%2]);ribbon(flat(s*KE,s*KO,.09),()=>0x111111)}
 ribbon(flat(-.25,.25,.08),i=>(i>>1)%3==0?0xffffff:null);
 // Talus (collines) et dessous de pont
 const deck=i=>bridge[i]>.97&&H[i]>3;
 for(const s of[-1,1])ribbon(i=>deck(i)?[P3(i,s*KO,H[i]),P3(i,s*KO,H[i]-1.4)]:[P3(i,s*KO,H[i]),P3(i,s*(KO+H[i]*1.1),0)],i=>H[i]>.25?(deck(i)?0x546e7a:th.skirt):null);
 ribbon(i=>[P3(i,-KO,H[i]-1.4),P3(i,KO,H[i]-1.4)],i=>deck(i)?0x37474f:null);
 // Murs : zones de croisement et ponts (empêchent de tomber ou de couper)
 const rail=th.rail||[0xe53935,0xffffff];
 for(const s of[-1,1]){ribbon(i=>[P3(i,s*KO,H[i]+.05),P3(i,s*KO,H[i]+1.7)],i=>wall[i]?rail[(i>>1)%2]:null);ribbon(i=>[P3(i,s*KO,H[i]+1.7),P3(i,s*(KO+.9),H[i]+1.7)],i=>wall[i]?0x111111:null)}
 {const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(V,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(CL,3));geo.setIndex(IX);
  g.add(new THREE.Mesh(geo,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide})))}
 // Pylônes sous les ponts
 {const pl=[];for(let i=0;i<N;i+=6)if(deck(i)&&!zone[i])for(const s of[-1,1]){const[x,,z]=P3(i,s*(W+2.6),0),h=H[i]-1.4;pl.push(mtx(x,h/2,z,1.5,h,1.5))}instanced(g,G.cyl,0x78909c,pl,.1)}
 // Ligne d'arrivée + portique
 const h0=Math.atan2(T[0][0],T[0][1]),y0=H[0];
 const fin=new THREE.Mesh(new THREE.PlaneGeometry(W*2,2.5).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({map:canvasTex(32,(x,w,h)=>{for(let a=0;a<16;a++)for(let b=0;b<2;b++){x.fillStyle=(a+b)%2?'#111':'#fff';x.fillRect(a*w/16,b*h/2,w/16,h/2)}},256)}));
 fin.position.set(C[0][0],y0+.1,C[0][1]);fin.rotation.y=h0;g.add(fin);
 const gate=new THREE.Group();gate.position.copy(fin.position);gate.rotation.y=h0;g.add(gate);
 const pole=new THREE.CylinderGeometry(.45,.45,8,10);for(const s of[-1,1])part(gate,pole,0x37474f,s*(W+2.5),4,0,.1);
 part(gate,new THREE.BoxGeometry(2*W+6,2.4,.5),0xffffff,0,8.6,0,.12,new THREE.MeshToonMaterial({gradientMap:GRAD,map:canvasTex(64,(x,w,h)=>{x.fillStyle='#ffeb3b';x.fillRect(0,0,w,h);
  x.font='900 46px Bangers,Impact,system-ui,sans-serif';x.textAlign='center';x.textBaseline='middle';x.lineWidth=6;x.strokeStyle='#111';x.strokeText('KART PARTY !',w/2,h/2+3);x.fillStyle='#e53935';x.fillText('KART PARTY !',w/2,h/2+3)},512)}));
 // Sol (ou île entourée par la mer / le vide)
 const isl=th.island;
 if(isl){const sea=new THREE.Mesh(new THREE.PlaneGeometry(3000,3000).rotateX(-Math.PI/2),toon(th.sea));sea.position.y=-.6;g.add(sea);
  const foam=new THREE.Mesh(new THREE.CircleGeometry(1,56).rotateX(-Math.PI/2),toon(th.stars?0x7e57c2:0xffffff));foam.scale.set(isl[0]+12,1,isl[1]+12);foam.position.y=-.25;g.add(foam);
  const land=new THREE.Mesh(new THREE.CircleGeometry(1,56).rotateX(-Math.PI/2),toon(th.gnd));land.scale.set(isl[0],1,isl[1]);g.add(land)}
 else g.add(new THREE.Mesh(new THREE.PlaneGeometry(2000,2000).rotateX(-Math.PI/2),toon(th.gnd)));
 const inIsl=(x,z)=>!isl||(x/isl[0])**2+(z/isl[1])**2<.8;
 const far=(x,z,m)=>{if(!inIsl(x,z))return false;for(let i=0;i<N;i+=3)if((C[i][0]-x)**2+(C[i][1]-z)**2<m*m)return false;return true};
 const spots=[];for(let k=0;k<60;k++){const x=(rnd()-.5)*700,z=(rnd()-.5)*560;if(far(x,z,W+8))spots.push(mtx(x,.02,z,6+rnd()*10,1,4+rnd()*8,rnd()*3))}
 const sg=new THREE.InstancedMesh(new THREE.CircleGeometry(1,14).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:th.spot}),spots.length);sg.frustumCulled=false;spots.forEach((m,i)=>sg.setMatrixAt(i,m));g.add(sg);
 if(!th.nohill){const hills=[];for(let k=0;k<22;k++){const a=k/22*Math.PI*2+rnd()*.2,r=330+rnd()*90,s=40+rnd()*50;hills.push(mtx(Math.cos(a)*r*1.2,-s*.3,Math.sin(a)*r,s*1.3,s*(.6+rnd()*.5),s))}instanced(g,G.sph,th.hill,hills,.03)}
 if(!th.noclouds){const clouds=[];for(let k=0;k<14;k++){const a=rnd()*Math.PI*2,r=180+rnd()*200,y=70+rnd()*40;for(let j=0;j<4;j++){const s=7+rnd()*7;clouds.push(mtx(Math.cos(a)*r+(j-1.5)*9,y+rnd()*5,Math.sin(a)*r+rnd()*6,s*1.3,s,s))}}instanced(g,G.sph,th.cloud||0xffffff,clouds,.06)}
 // Décor
 const rx=isl?isl[0]*.95:280,rz=isl?isl[1]*.95:220;
 const spawn=(n,m,sc)=>{const o=[];for(let k=0;k<n*8&&o.length<n;k++){const x=(rnd()*2-1)*rx,z=(rnd()*2-1)*rz;if(far(x,z,m))o.push([x,z,.8+rnd()*.7])}return o};
 const ctx={extra:(n,m)=>spawn(n,m)};
 DECOR[th.decor](g,spawn(90,W+9),rnd,ctx);
 // Boîtes, plaques, obstacles (jamais dans les zones à murs)
 const wallAt=f=>wall[Math.round(((f%1)+1)%1*N)%N];
 const used=[],ok=(f,m)=>f>.07&&f<.94&&used.every(u=>Math.abs(u-f)>m),place=(f0,m,step)=>{let f=f0,t=0;while((!ok(f,m)||wallAt(f))&&t++<30)f+=step;return ok(f,m)&&!wallAt(f)?f:null};
 const boxF=[],padF=[],obF=[];
 for(let k=0;k<4;k++){const f=place(.15+.2*k+(rnd()-.5)*.04,.04,.012);if(f!=null){used.push(f);boxF.push(f)}}
 for(let k=0;k<4;k++){const f=place(.12+.24*k+(rnd()-.5)*.05,.035,.01);if(f!=null){used.push(f);padF.push([f,(rnd()-.5)*8])}}
 for(let k=0;k<6;k++){const f=place(.11+.14*k+(rnd()-.5)*.05,.03,.01);if(f!=null){used.push(f);obF.push([rnd()<.55?'barrel':'oil',f,(rnd()<.5?-1:1)*(3+rnd()*3)])}}
 const boxes=[];for(const f of boxF)for(const lat of[-6,-2,2,6]){const[x,z,,i]=at(f,lat),m=mkItemBox();m.position.set(x,H[i]+1.8,z);g.add(m);boxes.push({pos:[x,z],y:H[i],m,on:true,t:0,ph:rnd()*6})}
 const pads=padF.map(([f,lat])=>{const[x,z,h,i]=at(f,lat),m=new THREE.Mesh(G.pad,PAD_MAT);m.position.set(x,H[i]+.4,z);m.rotation.y=h+Math.PI;g.add(m);return{pos:[x,z],h,y:H[i]}});
 const obst=obF.map(([k,f,lat])=>{const[x,z,,i]=at(f,lat);let m;if(k=='barrel')m=mkBarrel(th.barrel);else{m=new THREE.Mesh(G.oil,oilMat(th.oil));m.position.y=.14}m.position.x=x;m.position.y+=H[i];m.position.z=z;g.add(m);return{k,pos:[x,z],y:H[i],m}});
 const bg=canvasTex(256,(x,w,h)=>{const gr=x.createLinearGradient(0,0,0,h);gr.addColorStop(0,th.sky[0]);gr.addColorStop(1,th.sky[1]);x.fillStyle=gr;x.fillRect(0,0,w,h);
  if(th.stars)for(let k=0;k<140;k++){x.fillStyle='rgba(255,255,255,'+(.35+rnd()*.65)+')';const s=1+rnd()*2.2;x.fillRect(rnd()*w,rnd()*h*.78,s,s)}},th.stars?512:4);
 return{def,idx:ti,g,C,T,Nr,at,H,G:G_,wall,zone,bridge,boxes,pads,obst,bg,h0}}

// Point du tracé le plus proche (recherche locale autour de l'indice précédent : au croisement on reste sur la bonne branche)
function nearest(tr,x,z,hint){const C=tr.C;let best=1e9,bi=0;const scan=i=>{const d=(C[i][0]-x)**2+(C[i][1]-z)**2;if(d<best){best=d;bi=i}};
 if(hint!=null){for(let k=-25;k<=25;k++)scan((hint+k+N)%N);if(best<(W*3)**2)return[Math.sqrt(best),bi]}
 for(let i=0;i<N;i++)scan(i);return[Math.sqrt(best),bi]}
// Hauteur de la route sous (x,z), interpolée entre deux points du tracé
function surf(tr,x,z,i){const C=tr.C,T=tr.T[i],f=(x-C[i][0])*T[0]+(z-C[i][1])*T[1],n=f>=0?(i+1)%N:(i-1+N)%N,seg=Math.hypot(C[n][0]-C[i][0],C[n][1]-C[i][1])||1,k=Math.min(1,Math.abs(f)/seg);return tr.H[i]+(tr.H[n]-tr.H[i])*k}
