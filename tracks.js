// Circuits du championnat. P(t) : tracé centré (t de 0 à 2π). Les tracés sont vérifiés sans croisement
// et avec un rayon de courbure > demi-largeur pour que la route ne se replie pas.
const TRACKS=[
 {n:'Prairie Pétillante',P:t=>[135*Math.cos(t)+14*Math.cos(3*t),88*Math.sin(t)+14*Math.sin(2*t)],
  th:{sky:['#3fb4ff','#c9f0ff'],fog:0xc9f0ff,gnd:0x7ccf4a,spot:0x5fb53a,road:[0x6b6b7d,0x75758a],kerb:[0xe53935,0xffffff],hill:0x58a83a,decor:'tree'},
  boxes:[.18,.48,.76],pads:[[.06,0],[.33,-4],[.6,4],[.88,0]],obst:[['barrel',.26,5],['oil',.4,-3],['barrel',.55,-5],['oil',.7,3],['barrel',.83,4]]},
 {n:'Désert Dingo',P:t=>{const r=120+28*Math.sin(3*t);return[r*Math.cos(t)*1.15,r*Math.sin(t)*.85]},
  th:{sky:['#ff9d4d','#ffe7b0'],fog:0xffe2a8,gnd:0xf2c46b,spot:0xe0a94e,road:[0x8a6a55,0x95735d],kerb:[0xff7043,0xfff3e0],hill:0xd9894a,decor:'cactus'},
  boxes:[.15,.42,.7,.9],pads:[[.08,3],[.28,-3],[.5,0],[.78,3]],obst:[['barrel',.2,-4],['barrel',.22,4],['oil',.36,0],['barrel',.6,-5],['oil',.65,4],['barrel',.85,0]]},
 {n:'Glacier Givré',P:t=>[150*Math.cos(t)+10*Math.cos(2*t),70*Math.sin(t)-45*Math.cos(2*t)*Math.sin(t)+18*Math.sin(3*t)],
  th:{sky:['#7e8cff','#e3ecff'],fog:0xe3ecff,gnd:0xf4f8ff,spot:0xd6e6fb,road:[0x5f7fa8,0x6a8cb6],kerb:[0x1e88e5,0xffffff],hill:0xc5d8f5,decor:'pine'},
  boxes:[.16,.4,.64,.86],pads:[[.1,-3],[.3,3],[.52,0],[.74,-3],[.94,3]],obst:[['oil',.2,3],['barrel',.33,-4],['barrel',.46,4],['oil',.58,-2],['barrel',.8,0],['oil',.9,-4]]}];
const N=300,W=10;

function rng(s){return()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

function buildTrack(def,ti){const g=new THREE.Group(),th=def.th,rnd=rng(ti*999+7);
 const C=[],T=[],Nr=[];for(let i=0;i<N;i++)C.push(def.P(i/N*Math.PI*2));
 for(let i=0;i<N;i++){const a=C[(i-1+N)%N],b=C[(i+1)%N];let dx=b[0]-a[0],dz=b[1]-a[1];const l=Math.hypot(dx,dz);dx/=l;dz/=l;T.push([dx,dz]);Nr.push([-dz,dx])}
 const at=(f,lat=0)=>{const i=Math.round(((f%1)+1)%1*N)%N;return[C[i][0]+Nr[i][0]*lat,C[i][1]+Nr[i][1]*lat,Math.atan2(T[i][0],T[i][1]),i]};
 // Bandes le long du tracé (route, vibreurs, contour encré, ligne centrale)
 function strip(l0,l1,y,colorOf,step=1){const v=[],c=[],idx=[];
  for(let i=0;i<N;i+=step){const j=(i+1)%N,col=colorOf(i);if(!col)continue;const k=v.length/3,cl=new THREE.Color(col);
   for(const q of[i,j])for(const l of[l0,l1])v.push(C[q][0]+Nr[q][0]*l,y,C[q][1]+Nr[q][1]*l);
   for(let n=0;n<4;n++)c.push(cl.r,cl.g,cl.b);idx.push(k,k+2,k+1,k+1,k+2,k+3)}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(v,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(c,3));geo.setIndex(idx);
  g.add(new THREE.Mesh(geo,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide})))}
 strip(-W,W,.06,i=>th.road[(i>>3)%2]);
 for(const s of[-1,1]){strip(s*W,s*(W+1.6),.09,i=>th.kerb[(i>>1)%2]);strip(s*(W+1.6),s*(W+2.1),.09,()=>0x111111)}
 strip(-.25,.25,.08,i=>(i>>1)%3==0?0xffffff:0);
 // Ligne d'arrivée en damier
 const fin=new THREE.Mesh(new THREE.PlaneGeometry(W*2,2.5).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({map:canvasTex(32,(x,w,h)=>{for(let a=0;a<16;a++)for(let b=0;b<2;b++){x.fillStyle=(a+b)%2?'#111':'#fff';x.fillRect(a*w/16,b*h/2,w/16,h/2)}},256)}));
 fin.position.set(C[0][0],.1,C[0][1]);fin.rotation.y=Math.atan2(T[0][0],T[0][1]);g.add(fin);
 // Portique d'arrivée
 const gate=new THREE.Group();gate.position.copy(fin.position);gate.rotation.y=fin.rotation.y;g.add(gate);
 const pole=new THREE.CylinderGeometry(.45,.45,8,10);for(const s of[-1,1])part(gate,pole,0x37474f,s*(W+2.5),4,0,.1);
 part(gate,new THREE.BoxGeometry(2*W+6,2.4,.5),0xffffff,0,8.6,0,.12,new THREE.MeshToonMaterial({gradientMap:GRAD,map:canvasTex(64,(x,w,h)=>{x.fillStyle='#ffeb3b';x.fillRect(0,0,w,h);
  x.font='900 46px Bangers,system-ui,sans-serif';x.textAlign='center';x.textBaseline='middle';x.lineWidth=6;x.strokeStyle='#111';x.strokeText('KART PARTY !',w/2,h/2+3);x.fillStyle='#e53935';x.fillText('KART PARTY !',w/2,h/2+3)},512)}));
 // Sol, taches et collines
 const gnd=new THREE.Mesh(new THREE.PlaneGeometry(2000,2000).rotateX(-Math.PI/2),toon(th.gnd));g.add(gnd);
 const far=(x,z,m)=>{for(let i=0;i<N;i+=3)if((C[i][0]-x)**2+(C[i][1]-z)**2<m*m)return false;return true};
 const spots=[];for(let k=0;k<60;k++){const x=(rnd()-.5)*700,z=(rnd()-.5)*560;if(far(x,z,W+8))spots.push(mtx(x,.02,z,6+rnd()*10,1,4+rnd()*8,rnd()*3))}
 const sg=new THREE.InstancedMesh(new THREE.CircleGeometry(1,14).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:th.spot}),spots.length);spots.forEach((m,i)=>sg.setMatrixAt(i,m));g.add(sg);
 const hills=[];for(let k=0;k<22;k++){const a=k/22*Math.PI*2+rnd()*.2,r=330+rnd()*90,s=40+rnd()*50;hills.push(mtx(Math.cos(a)*r*1.2,-s*.3,Math.sin(a)*r,s*1.3,s*(.6+rnd()*.5),s))}
 instanced(g,G.sph,th.hill,hills,.03);
 const clouds=[];for(let k=0;k<14;k++){const a=rnd()*Math.PI*2,r=180+rnd()*200,y=70+rnd()*40;for(let j=0;j<4;j++){const s=7+rnd()*7;clouds.push(mtx(Math.cos(a)*r+(j-1.5)*9,y+rnd()*5,Math.sin(a)*r+rnd()*6,s*1.3,s,s))}}
 instanced(g,G.sph,0xffffff,clouds,.06);
 // Décor selon le thème
 const pos=[];for(let k=0;k<400&&pos.length<90;k++){const x=(rnd()-.5)*560,z=(rnd()-.5)*440;if(far(x,z,W+9))pos.push([x,z,.8+rnd()*.7])}
 if(th.decor=='tree'){instanced(g,G.cyl,0x8d5a3b,pos.map(([x,z,s])=>mtx(x,3*s,z,.8*s,6*s,.8*s)));instanced(g,G.sph,0x2e9d3a,pos.map(([x,z,s])=>mtx(x,8*s,z,4*s,3.6*s,4*s)));
  instanced(g,G.sph,0xe53935,pos.filter((_,i)=>i%4==0).map(([x,z,s])=>mtx(x+2.5*s,7*s,z+2.5*s,.6*s)),.04)}
 else if(th.decor=='cactus'){const c=pos.filter((_,i)=>i%3),r=pos.filter((_,i)=>i%3==0);
  instanced(g,G.cyl,0x43a047,c.map(([x,z,s])=>mtx(x,5*s,z,1.1*s,10*s,1.1*s)));instanced(g,G.sph,0x43a047,c.map(([x,z,s])=>mtx(x,10*s,z,1.1*s)));
  instanced(g,G.cyl,0x43a047,c.map(([x,z,s])=>mtx(x+1.8*s,6*s,z,.7*s,4*s,.7*s)));instanced(g,G.sph,0xff4081,c.filter((_,i)=>i%2).map(([x,z,s])=>mtx(x,11*s,z,.45*s)),.04);
  instanced(g,new THREE.DodecahedronGeometry(1),0xc76b3b,r.map(([x,z,s])=>mtx(x,1.5*s,z,4*s,3*s,3.5*s,s*4)))}
 else{const cone=new THREE.ConeGeometry(1,1,10);instanced(g,G.cyl,0x6d4c41,pos.map(([x,z,s])=>mtx(x,1.5*s,z,.6*s,3*s,.6*s)));
  instanced(g,cone,0x1b5e20,pos.map(([x,z,s])=>mtx(x,6*s,z,4*s,7*s,4*s)));instanced(g,cone,0x2e7d32,pos.map(([x,z,s])=>mtx(x,10*s,z,3*s,5*s,3*s)));
  instanced(g,cone,0xffffff,pos.map(([x,z,s])=>mtx(x,12.6*s,z,1.5*s,2*s,1.5*s)),.06)}
 // Boîtes à objets, plaques de boost, obstacles
 const boxes=[];for(const f of def.boxes)for(const lat of[-6,-2,2,6]){const[x,z,,i]=at(f,lat),m=mkItemBox();m.position.set(x,1.8,z);g.add(m);boxes.push({pos:[x,z],m,on:true,t:0,ph:rnd()*6})}
 const pads=def.pads.map(([f,lat])=>{const[x,z,h]=at(f,lat),m=new THREE.Mesh(G.pad,PAD_MAT);m.position.set(x,.11,z);m.rotation.y=h+Math.PI;g.add(m);return{pos:[x,z],h}});
 const obst=def.obst.map(([k,f,lat])=>{const[x,z]=at(f,lat);let m;if(k=='barrel')m=mkBarrel();else{m=new THREE.Mesh(G.oil,OIL_MAT);m.position.y=.12}m.position.x=x;m.position.z=z;g.add(m);return{k,pos:[x,z],m}});
 const bg=canvasTex(256,(x,w,h)=>{const gr=x.createLinearGradient(0,0,0,h);gr.addColorStop(0,th.sky[0]);gr.addColorStop(1,th.sky[1]);x.fillStyle=gr;x.fillRect(0,0,w,h)},4);
 return{def,g,C,T:T,Nr,at,boxes,pads,obst,bg,h0:Math.atan2(T[0][0],T[0][1])}}

// Point du tracé le plus proche (recherche locale autour de l'indice précédent, globale si on s'est perdu)
function nearest(tr,x,z,hint){const C=tr.C;let best=1e9,bi=0;const scan=i=>{const d=(C[i][0]-x)**2+(C[i][1]-z)**2;if(d<best){best=d;bi=i}};
 if(hint!=null){for(let k=-25;k<=25;k++)scan((hint+k+N)%N);if(best<(W*3)**2)return[Math.sqrt(best),bi]}
 for(let i=0;i<N;i++)scan(i);return[Math.sqrt(best),bi]}
