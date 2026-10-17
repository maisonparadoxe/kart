// Rendu "BD" : matériaux toon à 3 tons + contours noirs (technique de la coque inversée)
const GRAD=(()=>{const t=new THREE.DataTexture(new Uint8Array([110,110,110,255,185,185,185,255,255,255,255,255]),3,1,THREE.RGBAFormat);
 t.minFilter=t.magFilter=THREE.NearestFilter;t.generateMipmaps=false;t.needsUpdate=true;return t})();
const _mats={};
function toon(c,o){const k=new THREE.Color(c).getHex()+(o?JSON.stringify(o):'');
 return _mats[k]||(_mats[k]=new THREE.MeshToonMaterial(Object.assign({color:new THREE.Color(c),gradientMap:GRAD},o)))}
const INK=new THREE.MeshBasicMaterial({color:0x111111,side:THREE.BackSide});
const TOON_VC=new THREE.MeshToonMaterial({vertexColors:true,gradientMap:GRAD});
// Copie de la géométrie agrandie d'une épaisseur t sur chaque axe (pour le contour)
const _ink=new Map();
function inkGeo(g,t=.08){const k=g.uuid+t;if(_ink.has(k))return _ink.get(k);
 g.computeBoundingBox();const b=g.boundingBox,s=new THREE.Vector3(),c=new THREE.Vector3();b.getSize(s);b.getCenter(c);
 const f=v=>v>1e-3?(v+2*t)/v:1,o=g.clone().translate(-c.x,-c.y,-c.z).scale(f(s.x),f(s.y),f(s.z)).translate(c.x,c.y,c.z);_ink.set(k,o);return o}
// Crée un mesh toon (avec contour) et l'ajoute au parent
function part(parent,geo,col,x=0,y=0,z=0,t=.07,mat){const m=new THREE.Mesh(geo,mat||toon(col));m.position.set(x,y,z);
 if(t)m.add(new THREE.Mesh(inkGeo(geo,t),INK));parent.add(m);return m}
// InstancedMesh toon + son contour, à partir d'une liste de matrices
function instanced(parent,geo,col,mats,t=.12){if(!mats.length)return;
 const a=new THREE.InstancedMesh(geo,toon(col),mats.length),b=t&&new THREE.InstancedMesh(inkGeo(geo,t),INK,mats.length);
 mats.forEach((m,i)=>{a.setMatrixAt(i,m);b&&b.setMatrixAt(i,m)});a.frustumCulled=false;parent.add(a);if(b){b.frustumCulled=false;parent.add(b)}}
// Instances lumineuses (lucioles…) : matériau non éclairé
function instBasic(parent,geo,col,mats,nofog){if(!mats.length)return;const a=new THREE.InstancedMesh(geo,new THREE.MeshBasicMaterial({color:col,fog:!nofog}),mats.length);mats.forEach((m,i)=>a.setMatrixAt(i,m));a.frustumCulled=false;parent.add(a)}
const mtx=(x,y,z,sx=1,sy=sx,sz=sx,ry=0)=>new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,ry,0)),new THREE.Vector3(sx,sy,sz));
function canvasTex(S,draw,w=S){const c=document.createElement('canvas');c.width=w;c.height=S;draw(c.getContext('2d'),w,S);const t=new THREE.CanvasTexture(c);t.anisotropy=4;return t}

// ---- Fusion de pièces : un kart = quelques meshes au lieu d'une centaine (indispensable à 6 joueurs) ----
const _n3=new THREE.Matrix3(),_v=new THREE.Vector3();
function mergeParts(list){let nv=0,ni=0;for(const p of list){const g=p.g;nv+=g.attributes.position.count;ni+=g.index?g.index.count:g.attributes.position.count}
 const pos=new Float32Array(nv*3),nor=new Float32Array(nv*3),col=new Float32Array(nv*3),idx=nv<65535?new Uint16Array(ni):new Uint32Array(ni);let vo=0,io=0;
 for(const p of list){const g=p.g,pa=g.attributes.position,na=g.attributes.normal,n=pa.count;_n3.getNormalMatrix(p.m);
  for(let i=0;i<n;i++){const o=(vo+i)*3;_v.fromBufferAttribute(pa,i).applyMatrix4(p.m);pos[o]=_v.x;pos[o+1]=_v.y;pos[o+2]=_v.z;
   if(na){_v.fromBufferAttribute(na,i).applyMatrix3(_n3).normalize();nor[o]=_v.x;nor[o+1]=_v.y;nor[o+2]=_v.z}col[o]=p.c.r;col[o+1]=p.c.g;col[o+2]=p.c.b}
  if(g.index){for(let i=0;i<g.index.count;i++)idx[io+i]=g.index.getX(i)+vo;io+=g.index.count}else{for(let i=0;i<n;i++)idx[io+i]=vo+i;io+=n}vo+=n}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.BufferAttribute(nor,3));geo.setAttribute('color',new THREE.BufferAttribute(col,3));geo.setIndex(new THREE.BufferAttribute(idx,1));return geo}
// Constructeur : add(géométrie, couleur, x,y,z, {sx,sy,sz,rx,ry,rz,t}) ; build() → [mesh coloré, mesh du contour]
function KB(){const parts=[],inks=[],black=new THREE.Color(0);
 return{add(geo,col,x,y,z,o){o=o||{};const m=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(o.rx||0,o.ry||0,o.rz||0)),
   new THREE.Vector3(o.sx==null?1:o.sx,o.sy==null?1:o.sy,o.sz==null?1:o.sz));parts.push({g:geo,m,c:new THREE.Color(col)});const t=o.t==null?.07:o.t;if(t)inks.push({g:inkGeo(geo,t),m,c:black})},
  build(){return[new THREE.Mesh(mergeParts(parts),TOON_VC),new THREE.Mesh(mergeParts(inks),INK)]}}}

// ---- Géométries partagées ----
const G={
 box:new THREE.BoxGeometry(1,1,1),sph:new THREE.SphereGeometry(1,16,12),cyl:new THREE.CylinderGeometry(1,1,1,16),cone:new THREE.ConeGeometry(1,1,10),
 octa:new THREE.OctahedronGeometry(1),dodeca:new THREE.DodecahedronGeometry(1),prism:new THREE.CylinderGeometry(1,1,1,3).rotateZ(Math.PI/2).rotateX(-Math.PI/2),
 wheel:new THREE.CylinderGeometry(.58,.58,.6,16).rotateZ(Math.PI/2),rwheel:new THREE.CylinderGeometry(.68,.68,.7,16).rotateZ(Math.PI/2),
 hub:new THREE.CylinderGeometry(.25,.25,.66,10).rotateZ(Math.PI/2),rhub:new THREE.CylinderGeometry(.3,.3,.76,10).rotateZ(Math.PI/2),
 chassis:new THREE.BoxGeometry(2.1,.5,3.4),hood:new THREE.BoxGeometry(1.7,.42,1.3),bump:new THREE.BoxGeometry(2.5,.38,.45),
 seat:new THREE.BoxGeometry(1.2,1,.32),torso:new THREE.CylinderGeometry(.42,.55,.8,12),head:new THREE.SphereGeometry(.62,16,12),
 eye:new THREE.SphereGeometry(.16,10,8),pupil:new THREE.SphereGeometry(.08,8,6),
 steer:new THREE.TorusGeometry(.3,.07,6,14),pipe:new THREE.CylinderGeometry(.13,.16,.6,8).rotateX(Math.PI/2),
 spoiler:new THREE.BoxGeometry(2.6,.12,.7),post:new THREE.BoxGeometry(.12,.6,.12),flare:new THREE.BoxGeometry(.35,.3,1.1),
 emb:new THREE.PlaneGeometry(1.15,1.15),shadow:new THREE.CircleGeometry(1.9,20).rotateX(-Math.PI/2),
 itemBox:new THREE.BoxGeometry(1.8,1.8,1.8),banana:new THREE.TorusGeometry(.55,.22,8,14,Math.PI*1.1),bomb:new THREE.SphereGeometry(.75,14,10),
 fuse:new THREE.CylinderGeometry(.08,.08,.5,6),barrel:new THREE.CylinderGeometry(1.1,1.1,2.2,14),band:new THREE.CylinderGeometry(1.14,1.14,.22,14),
 oil:new THREE.CircleGeometry(2.2,18).rotateX(-Math.PI/2),pad:new THREE.PlaneGeometry(4.4,6).rotateX(-Math.PI/2),bubble:new THREE.SphereGeometry(2.6,20,14)};
const SHADOW=new THREE.MeshBasicMaterial({color:0,transparent:true,opacity:.28,depthWrite:false});

// ---- Pilotes : des animaux (tête, oreilles, museau, queue). K = constructeur, c = couleur du pelage ----
function animal(K,ch){const c=ch.c,H=(geo,col,x,y,z,o)=>K.add(geo,col,x,2.1+y,-.4+z,o),S=s=>({sx:s,sy:s,sz:s,t:.03}),P=s=>({sx:s,sy:s,sz:s,t:0}),
 eyes=(dx,dy,dz,s)=>{for(const sd of[-1,1]){H(G.eye,0xffffff,sd*dx,dy,dz,S(s));H(G.pupil,0x111111,sd*dx*1.03,dy,dz+.13*s,P(s))}};
 K.add(G.torso,c,0,1.35,-.5);
 switch(ch.k){
 case'trex':H(G.head,c,0,0,0);H(G.box,0x81c784,0,-.14,.5,{sx:.7,sy:.4,sz:.62});for(const s of[-1,1])H(G.sph,0x1b5e20,s*.15,0,.82,{sx:.05,sy:.05,sz:.05,t:0});eyes(.3,.2,.38,1.1);
  H(G.cone,0xff7043,0,.62,-.05,{sx:.16,sy:.4,sz:.16});H(G.cone,0xff7043,0,.5,-.38,{sx:.16,sy:.36,sz:.16});H(G.cone,0xff7043,0,.3,-.6,{sx:.15,sy:.32,sz:.15});
  K.add(G.cone,c,0,1.05,-2.35,{sx:.5,sy:1.3,sz:.5,rx:-Math.PI/2});break;
 case'panda':H(G.head,c,0,0,0);for(const s of[-1,1]){H(G.sph,0x212121,s*.46,.5,-.05,{sx:.22,sy:.22,sz:.16});H(G.sph,0x212121,s*.24,.08,.5,{sx:.2,sy:.26,sz:.1,rz:s*.4,t:.02})}
  eyes(.24,.1,.58,.7);H(G.sph,0x212121,0,-.1,.6,{sx:.12,sy:.09,sz:.09,t:0});K.add(G.cyl,0x212121,0,1.6,-.5,{sx:.58,sy:.18,sz:.58,t:.04});K.add(G.sph,c,0,1.1,-1.95,{sx:.3,sy:.3,sz:.3});break;
 case'dog':H(G.head,c,0,0,0);for(const s of[-1,1])H(G.sph,0x6d4c41,s*.58,.05,-.08,{sx:.14,sy:.38,sz:.26,rz:s*.25});H(G.sph,0x6d4c41,.25,.12,.5,{sx:.2,sy:.2,sz:.1,t:0});
  H(G.box,0xe8c9a0,0,-.2,.55,{sx:.4,sy:.3,sz:.38});H(G.sph,0x111111,0,-.08,.8,{sx:.11,sy:.09,sz:.09,t:0});H(G.box,0xff8a80,0,-.42,.72,{sx:.14,sy:.04,sz:.2,t:.02});eyes(.22,.1,.5,1);
  K.add(G.cone,c,0,1.7,-2.0,{sx:.2,sy:.8,sz:.2,rx:-.9});break;
 case'cat':H(G.head,c,0,0,0);for(const s of[-1,1]){H(G.cone,c,s*.38,.62,-.05,{sx:.24,sy:.5,sz:.18,rz:-s*.2});H(G.cone,0xf8bbd0,s*.38,.6,.05,{sx:.14,sy:.34,sz:.1,rz:-s*.2,t:0});
   H(G.box,0xffffff,s*.42,-.08,.55,{sx:.5,sy:.02,sz:.02,rz:s*.12,t:0});H(G.box,0xffffff,s*.42,-.16,.55,{sx:.5,sy:.02,sz:.02,rz:-s*.1,t:0});H(G.box,0xe65100,s*.18,.6,0,{sx:.06,sy:.04,sz:.3,t:0})}
  H(G.box,0xe65100,0,.62,0,{sx:.06,sy:.04,sz:.34,t:0});H(G.sph,0xff6f91,0,-.05,.62,{sx:.08,sy:.06,sz:.06,t:0});eyes(.22,.12,.5,1.05);
  K.add(G.cyl,c,0,1.95,-2.05,{sx:.13,sy:1.6,sz:.13,rx:-.45});K.add(G.sph,0x5d4037,0,2.7,-2.4,{sx:.18,sy:.18,sz:.18});break;
 case'pig':H(G.head,c,0,0,0);for(const s of[-1,1])H(G.cone,0xf06292,s*.4,.5,.05,{sx:.2,sy:.3,sz:.12,rz:-s*.6,rx:.4});H(G.cyl,0xf8bbd0,0,-.1,.62,{sx:.3,sy:.2,sz:.3,rx:Math.PI/2});
  for(const s of[-1,1])H(G.sph,0xad1457,s*.1,-.1,.74,{sx:.05,sy:.07,sz:.04,t:0});eyes(.24,.14,.5,.9);K.add(G.sph,c,0,1.2,-1.9,{sx:.16,sy:.16,sz:.16});K.add(G.sph,c,.13,1.36,-1.98,{sx:.12,sy:.12,sz:.12});break;
 case'bunny':H(G.head,c,0,0,0);for(const s of[-1,1]){H(G.sph,c,s*.2,.98,-.1,{sx:.14,sy:.62,sz:.1,rz:-s*.12});H(G.sph,0xf8bbd0,s*.2,.98,-.02,{sx:.08,sy:.5,sz:.05,rz:-s*.12,t:0})}
  H(G.sph,0xf48fb1,0,-.04,.62,{sx:.08,sy:.06,sz:.06,t:0});H(G.box,0xffffff,0,-.22,.58,{sx:.1,sy:.14,sz:.03,t:.02});eyes(.22,.12,.5,1);K.add(G.sph,0xffffff,0,1.1,-1.95,{sx:.3,sy:.3,sz:.3});break;
 case'frog':H(G.head,c,0,-.05,0,{sx:1.15,sy:.85,sz:1});for(const s of[-1,1]){H(G.sph,c,s*.3,.45,.2,{sx:.26,sy:.26,sz:.26});H(G.eye,0xffffff,s*.3,.55,.38,S(1.2));H(G.pupil,0x111111,s*.3,.55,.53,P(1.2));H(G.sph,0xff8a80,s*.42,-.1,.42,{sx:.1,sy:.1,sz:.05,t:0})}
  H(G.box,0x33691e,0,-.22,.55,{sx:.62,sy:.04,sz:.06,t:0});break;
 case'tri':H(G.sph,0xff8a65,0,.1,-.55,{sx:.92,sy:.88,sz:.16});H(G.sph,0x1e88e5,0,.1,-.5,{sx:.8,sy:.76,sz:.16});H(G.head,c,0,0,0);H(G.box,0xffe0b2,0,-.2,.5,{sx:.4,sy:.28,sz:.4});
  for(const s of[-1,1])H(G.cone,0xfff3e0,s*.28,.4,.4,{sx:.1,sy:.55,sz:.1,rx:.7});H(G.cone,0xfff3e0,0,0,.76,{sx:.1,sy:.3,sz:.1,rx:1.1});eyes(.3,.15,.4,1);K.add(G.cone,c,0,1.05,-2.35,{sx:.5,sy:1.3,sz:.5,rx:-Math.PI/2});break;
 default:H(G.head,c,0,0,0);eyes(.22,.1,.5,1)}}

// Roues : géométrie fusionnée une seule fois, partagée par tous les karts
const _wh=[];
function wheelMeshes(r){if(!_wh[r]){const K=KB();K.add(r?G.rwheel:G.wheel,0x262626,0,0,0,{t:.06});K.add(r?G.rhub:G.hub,0xbdbdbd,0,0,0,{t:0});const[a,b]=K.build();_wh[r]=[a.geometry,b.geometry]}
 return[new THREE.Mesh(_wh[r][0],TOON_VC),new THREE.Mesh(_wh[r][1],INK)]}
const _emb={};
function embMat(emb){const k=JSON.stringify(emb);return _emb[k]||(_emb[k]=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(drawEmblem(Object.assign(document.createElement('canvas'),{width:128,height:128}),emb)),transparent:true,alphaTest:.1}))}

// ---- Kart ----
function mkKart(cfg){const g=new THREE.Group(),body=new THREE.Group(),col=cfg.col,ch=CHARS[cfg.ch],ka=cfg.ka,dark=0x262626,K=KB();g.add(body);
 const sh=new THREE.Mesh(G.shadow,SHADOW);sh.position.y=.04;g.add(sh);
 const w=ka==2?1.15:1;
 K.add(G.chassis,col,0,.7,0,{sx:w,sz:ka==1?1.1:1});K.add(G.hood,col,0,1.1,.95);
 K.add(G.bump,dark,0,.6,ka==1?2.05:1.85);K.add(G.bump,dark,0,.6,-1.85,{sx:.9});
 if(ka==2)for(const s of[-1,1])K.add(G.flare,col,s*1.3,.9,-1.2);
 K.add(G.seat,dark,0,1.3,-1);
 animal(K,ch);
 K.add(G.steer,dark,0,1.55,.3,{rx:-.9,t:0});
 for(const s of[-1,1])K.add(G.pipe,0x9e9e9e,s*.5,.65,-2.05,{t:.05});
 if(ka==1){K.add(G.spoiler,col,0,1.85,-1.85);for(const s of[-1,1])K.add(G.post,dark,s*.8,1.4,-1.85,{t:0})}
 const[bm,bi]=K.build();body.add(bm,bi);
 // Emblème : capot, flancs et dossier (visible par la caméra)
 const em=embMat(cfg.emb);
 const e1=new THREE.Mesh(G.emb,em);e1.rotation.set(-Math.PI/2,0,Math.PI);e1.position.set(0,1.33,.95);body.add(e1);
 const e2=new THREE.Mesh(G.emb,em);e2.scale.setScalar(.8);e2.rotation.y=Math.PI;e2.position.set(0,1.35,-1.17);body.add(e2);
 for(const s of[-1,1]){const e=new THREE.Mesh(G.emb,em);e.scale.setScalar(.75);e.rotation.y=s*Math.PI/2;e.position.set(s*(1.06*w+.01),.72,.2);body.add(e)}
 const wheels=[];for(const[x,z,r]of[[-1.25,1.2,0],[1.25,1.2,0],[-1.3,-1.2,1],[1.3,-1.2,1]]){const wh=new THREE.Group();wh.position.set(x*w,r?.68:.58,z);wh.add(...wheelMeshes(r));g.add(wh);wheels.push(wh)}
 const bub=new THREE.Mesh(G.bubble,new THREE.MeshBasicMaterial({color:0x4fc3f7,transparent:true,opacity:.28,depthWrite:false}));bub.position.y=1.2;bub.visible=false;g.add(bub);
 g.rotation.order='YXZ'; // lacet puis tangage (pente)
 g.userData={body,wheels,bub,sh};return g}

// ---- Tremplin : coin qui monte dans le sens de la marche (+z), flèches sur la pente ----
function mkRamp(w,L,h){const g=new THREE.Group(),geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute([-w,0,0, w,0,0, w,h,L, -w,h,L, -w,0,L, w,0,L],3));geo.setIndex([0,2,1,0,3,2, 4,5,2,4,2,3, 0,4,3, 1,2,5]);geo.computeVertexNormals();
 const m=new THREE.Mesh(geo,new THREE.MeshToonMaterial({color:0xffa000,gradientMap:GRAD,side:THREE.DoubleSide}));m.add(new THREE.Mesh(inkGeo(geo,.12),INK));g.add(m);
 const tilt=new THREE.Group(),pl=new THREE.Mesh(new THREE.PlaneGeometry(2*w*.86,Math.hypot(L,h)*.9).rotateX(-Math.PI/2),PAD_MAT);pl.rotation.y=Math.PI;tilt.add(pl);tilt.position.set(0,h/2+.07,L/2);tilt.rotation.x=-Math.atan2(h,L);g.add(tilt);return g}

// ---- Objets sur la piste ----
const BOX_TEX=canvasTex(128,(x,w,h)=>{const gr=x.createLinearGradient(0,0,w,h);['#ff5252','#ffeb3b','#69f0ae','#40c4ff','#e040fb'].forEach((c,i)=>gr.addColorStop(i/4,c));
 x.fillStyle=gr;x.fillRect(0,0,w,h);x.lineWidth=10;x.strokeStyle='#111';x.strokeRect(5,5,w-10,h-10);
 x.font='900 92px Bangers,system-ui,sans-serif';x.textAlign='center';x.textBaseline='middle';x.lineWidth=8;x.strokeText('?',w/2,h/2+4);x.fillStyle='#fff';x.fillText('?',w/2,h/2+4)});
function mkItemBox(){const m=part(new THREE.Group(),G.itemBox,0xffffff,0,0,0,.1,new THREE.MeshToonMaterial({map:BOX_TEX,gradientMap:GRAD}));const g=m.parent;g.userData.box=m;return g}
function mkBanana(){const g=new THREE.Group();const b=part(g,G.banana,0xffd600,0,.55,0,.06);b.rotation.set(0,0,Math.PI*.95);part(g,G.shadow,0,0,0,0,0,SHADOW).scale.setScalar(.4);return g}
function mkBomb(){const g=new THREE.Group();part(g,G.bomb,0x263238,0,.8,0,.08);part(g,G.fuse,0x8d6e63,0,1.6,0,.04);part(g,G.sph,0xffab00,0,1.9,0,0).scale.setScalar(.18);return g}
function mkBarrel(col=0xd84315){const g=new THREE.Group();part(g,G.barrel,col,0,1.1,0,.1);part(g,G.band,0x37474f,0,.5,0,0);part(g,G.band,0x37474f,0,1.7,0,0);part(g,G.cyl,0xfdd835,0,2.22,0,0).scale.set(.5,.05,.5);return g}
const _oil={};const oilMat=(c=0x1a1a2e)=>_oil[c]||(_oil[c]=new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:.85,depthWrite:false}));
const PAD_TEX=canvasTex(128,(x,w,h)=>{x.fillStyle='#ff6d00';x.fillRect(0,0,w,h);x.lineWidth=10;x.strokeStyle='#111';x.strokeRect(5,5,w-10,h-10);
 x.lineJoin='round';for(let i=0;i<3;i++){const y=h*(.12+i*.28);x.beginPath();x.moveTo(w*.18,y+h*.2);x.lineTo(w/2,y);x.lineTo(w*.82,y+h*.2);x.lineWidth=18;x.strokeStyle='#111';x.stroke();x.lineWidth=10;x.strokeStyle='#ffee58';x.stroke()}},96);
const PAD_MAT=new THREE.MeshBasicMaterial({map:PAD_TEX});

// ---- Décor qui traverse : canards (file indienne), vache, escargot ; trou dans la route ----
// Chaque modèle regarde vers +z (sens de la marche) ; « ex » = point d'exclamation d'avertissement.
function bang(g,y){const e=new THREE.Group(),m=new THREE.MeshBasicMaterial({color:0xffd600});const a=new THREE.Mesh(G.box,m);a.scale.set(.35,1.1,.35);a.position.y=.7;const b=new THREE.Mesh(G.sph,m);b.scale.setScalar(.22);b.position.y=0;e.add(a,b);e.position.y=y;e.visible=false;g.add(e);g.userData.ex=e}
function eyes2(g,y,z,dx,s){for(const sd of[-1,1]){part(g,G.sph,0xffffff,sd*dx,y,z,.03).scale.setScalar(s);part(g,G.sph,0x111111,sd*dx,y,z+s*.7,0).scale.setScalar(s*.5)}}
function mkDuck(n=3,gap=2.6){const g=new THREE.Group();g.userData.mem=[];
 for(let k=0;k<n;k++){const d=new THREE.Group();d.position.z=-k*gap;
  part(d,G.sph,0xffee58,0,.8,0).scale.set(.85,.7,1.05);part(d,G.sph,0xfff59d,0,1.0,-.9,.05).scale.set(.45,.4,.45);
  part(d,G.sph,0xffee58,0,1.65,.7).scale.setScalar(.5);part(d,G.cone,0xff9800,0,1.6,1.25,.04).scale.set(.22,.5,.22);d.children[3].rotation.x=Math.PI/2;
  eyes2(d,1.8,.95,.22,.12);g.add(d);g.userData.mem.push(d)}
 bang(g,3.6);return g}
function mkCow(){const g=new THREE.Group();g.userData.mem=[g];
 part(g,G.box,0xfafafa,0,2.1,0).scale.set(1.9,1.6,3.2);
 for(const[x,y,z]of[[.97,2.4,.4],[-.97,1.9,-.6],[0,3.0,-.5],[.97,1.8,-1]])part(g,G.box,0x37474f,x,y,z,0).scale.set(.1+Math.abs(x)*.3,.6,.7);
 part(g,G.box,0xfafafa,0,2.9,2.1).scale.set(1.1,1.0,1.1);part(g,G.box,0xf8bbd0,0,2.65,2.75,.04).scale.set(.8,.5,.35);
 for(const sd of[-1,1]){part(g,G.cone,0xfff3e0,sd*.55,3.6,2.0,.04).scale.set(.18,.5,.18);eyes2(g,3.1,2.62,sd*.4,.14);
  for(const z of[-1.1,1.1])part(g,G.box,0xeeeeee,sd*.65,.7,z).scale.set(.45,1.4,.45)}
 part(g,G.box,0xf8bbd0,0,1.45,.3,0).scale.set(.6,.18,.9);part(g,G.box,0x37474f,0,2.8,-1.9,.04).scale.set(.15,1.1,.15);
 bang(g,5.2);return g}
function mkSnail(){const g=new THREE.Group();g.userData.mem=[g];
 part(g,G.sph,0xaed581,0,.8,0).scale.set(1.0,.8,2.6);part(g,G.sph,0xaed581,0,1.8,1.9).scale.set(.6,.9,.6);
 const sh=part(g,G.sph,0x8d6e63,0,2.3,-.5);sh.scale.setScalar(1.6);sh.rotation.z=.2;part(g,G.sph,0xffcc80,.95,2.4,-.5,.04).scale.set(.12,.9,.9);
 for(const sd of[-1,1]){part(g,G.cyl,0xaed581,sd*.3,2.7,2.0,.03).scale.set(.08,.8,.08);part(g,G.sph,0x111111,sd*.3,3.2,2.0,0).scale.setScalar(.16)}
 bang(g,4.8);return g}
function mkHole(){const g=new THREE.Group(),rim=new THREE.Mesh(new THREE.CircleGeometry(3.4,20).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x6d4c2a})),d=new THREE.Mesh(new THREE.CircleGeometry(2.3,20).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x1b1208})),d2=new THREE.Mesh(new THREE.CircleGeometry(1.3,16).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0}));
 rim.position.y=.1;d.position.y=.14;d2.position.y=.18;g.add(rim,d,d2);return g}
