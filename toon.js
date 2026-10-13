// Rendu "BD" : matériaux toon à 3 tons + contours noirs (technique de la coque inversée)
const GRAD=(()=>{const t=new THREE.DataTexture(new Uint8Array([110,110,110,255,185,185,185,255,255,255,255,255]),3,1,THREE.RGBAFormat);
 t.minFilter=t.magFilter=THREE.NearestFilter;t.generateMipmaps=false;t.needsUpdate=true;return t})();
const _mats={};
function toon(c,o){const k=new THREE.Color(c).getHex()+(o?JSON.stringify(o):'');
 return _mats[k]||(_mats[k]=new THREE.MeshToonMaterial(Object.assign({color:new THREE.Color(c),gradientMap:GRAD},o)))}
const INK=new THREE.MeshBasicMaterial({color:0x111111,side:THREE.BackSide});
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
 mats.forEach((m,i)=>{a.setMatrixAt(i,m);b&&b.setMatrixAt(i,m)});parent.add(a);b&&parent.add(b)}
const mtx=(x,y,z,sx=1,sy=sx,sz=sx,ry=0)=>new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,ry,0)),new THREE.Vector3(sx,sy,sz));
function canvasTex(S,draw,w=S){const c=document.createElement('canvas');c.width=w;c.height=S;draw(c.getContext('2d'),w,S);const t=new THREE.CanvasTexture(c);t.anisotropy=4;return t}

// ---- Géométries partagées ----
const G={
 box:new THREE.BoxGeometry(1,1,1),sph:new THREE.SphereGeometry(1,16,12),cyl:new THREE.CylinderGeometry(1,1,1,16),
 wheel:new THREE.CylinderGeometry(.58,.58,.6,16).rotateZ(Math.PI/2),rwheel:new THREE.CylinderGeometry(.68,.68,.7,16).rotateZ(Math.PI/2),
 hub:new THREE.CylinderGeometry(.25,.25,.66,10).rotateZ(Math.PI/2),rhub:new THREE.CylinderGeometry(.3,.3,.76,10).rotateZ(Math.PI/2),
 chassis:new THREE.BoxGeometry(2.1,.5,3.4),hood:new THREE.BoxGeometry(1.7,.42,1.3),bump:new THREE.BoxGeometry(2.5,.38,.45),
 seat:new THREE.BoxGeometry(1.2,1,.32),torso:new THREE.CylinderGeometry(.42,.55,.8,12),head:new THREE.SphereGeometry(.62,16,12),
 cap:new THREE.SphereGeometry(.66,16,8,0,Math.PI*2,0,Math.PI/2),brim:new THREE.BoxGeometry(.85,.08,.5),eye:new THREE.SphereGeometry(.16,10,8),pupil:new THREE.SphereGeometry(.08,8,6),
 steer:new THREE.TorusGeometry(.3,.07,6,14),pipe:new THREE.CylinderGeometry(.13,.16,.6,8).rotateX(Math.PI/2),
 spoiler:new THREE.BoxGeometry(2.6,.12,.7),post:new THREE.BoxGeometry(.12,.6,.12),flare:new THREE.BoxGeometry(.35,.3,1.1),
 emb:new THREE.PlaneGeometry(1.15,1.15),shadow:new THREE.CircleGeometry(1.9,20).rotateX(-Math.PI/2),
 itemBox:new THREE.BoxGeometry(1.8,1.8,1.8),banana:new THREE.TorusGeometry(.55,.22,8,14,Math.PI*1.1),bomb:new THREE.SphereGeometry(.75,14,10),
 fuse:new THREE.CylinderGeometry(.08,.08,.5,6),barrel:new THREE.CylinderGeometry(1.1,1.1,2.2,14),band:new THREE.CylinderGeometry(1.14,1.14,.22,14),
 oil:new THREE.CircleGeometry(2.2,18).rotateX(-Math.PI/2),pad:new THREE.PlaneGeometry(4.4,6).rotateX(-Math.PI/2),bubble:new THREE.SphereGeometry(2.6,20,14)};
const SHADOW=new THREE.MeshBasicMaterial({color:0,transparent:true,opacity:.28,depthWrite:false});

// ---- Kart ----
function mkKart(cfg){const g=new THREE.Group(),body=new THREE.Group(),col=cfg.col,ch=CHARS[cfg.ch],ka=cfg.ka,dark=0x262626;g.add(body);
 const sh=new THREE.Mesh(G.shadow,SHADOW);sh.position.y=.04;g.add(sh);
 const w=ka==2?1.15:1;
 part(body,G.chassis,col,0,.7,0).scale.set(w,1,ka==1?1.1:1);
 part(body,G.hood,col,0,1.1,.95);
 part(body,G.bump,dark,0,.6,ka==1?2.05:1.85);part(body,G.bump,dark,0,.6,-1.85).scale.set(.9,1,1);
 if(ka==2)for(const s of[-1,1])part(body,G.flare,col,s*1.3,.9,-1.2);
 part(body,G.seat,dark,0,1.3,-1);
 part(body,G.torso,ch.c,0,1.35,-.5);
 const head=part(body,G.head,0xffd9b3,0,2.1,-.4);
 part(head,G.cap,ch.c,0,.12,0,.06);part(head,G.brim,ch.c,0,.18,.42,.05);
 for(const s of[-1,1]){part(head,G.eye,0xffffff,s*.22,.05,.5,.03);part(head,G.pupil,0x111111,s*.22,.05,.64,0)}
 part(body,G.steer,dark,0,1.55,.3,0).rotation.x=-.9;
 for(const s of[-1,1])part(body,G.pipe,0x9e9e9e,s*.5,.65,-2.05,.05);
 if(ka==1){part(body,G.spoiler,col,0,1.85,-1.85);for(const s of[-1,1])part(body,G.post,dark,s*.8,1.4,-1.85,0)}
 // Emblème : capot + flancs
 const tex=new THREE.CanvasTexture(drawEmblem(Object.assign(document.createElement('canvas'),{width:128,height:128}),cfg.emb)),em=new THREE.MeshBasicMaterial({map:tex,transparent:true,alphaTest:.1});
 const e1=new THREE.Mesh(G.emb,em);e1.rotation.set(-Math.PI/2,0,Math.PI);e1.position.set(0,1.33,.95);body.add(e1);
 const e2=new THREE.Mesh(G.emb,em);e2.scale.setScalar(.8);e2.rotation.y=Math.PI;e2.position.set(0,1.35,-1.17);body.add(e2);
 for(const s of[-1,1]){const e=new THREE.Mesh(G.emb,em);e.scale.setScalar(.75);e.rotation.y=s*Math.PI/2;e.position.set(s*(1.06*w+.01),.72,.2);body.add(e)}
 // Roues
 const wheels=[];for(const[x,z,r]of[[-1.25,1.2,0],[1.25,1.2,0],[-1.3,-1.2,1],[1.3,-1.2,1]]){const wh=new THREE.Group();wh.position.set(x*w,r?.68:.58,z);
  part(wh,r?G.rwheel:G.wheel,dark,0,0,0,.06);part(wh,r?G.rhub:G.hub,0xbdbdbd,0,0,0,0);g.add(wh);wheels.push(wh)}
 const bub=new THREE.Mesh(G.bubble,new THREE.MeshBasicMaterial({color:0x4fc3f7,transparent:true,opacity:.28,depthWrite:false}));bub.position.y=1.2;bub.visible=false;g.add(bub);
 g.userData={body,wheels,bub,head};return g}

// ---- Objets sur la piste ----
const BOX_TEX=canvasTex(128,(x,w,h)=>{const gr=x.createLinearGradient(0,0,w,h);['#ff5252','#ffeb3b','#69f0ae','#40c4ff','#e040fb'].forEach((c,i)=>gr.addColorStop(i/4,c));
 x.fillStyle=gr;x.fillRect(0,0,w,h);x.lineWidth=10;x.strokeStyle='#111';x.strokeRect(5,5,w-10,h-10);
 x.font='900 92px Bangers,system-ui,sans-serif';x.textAlign='center';x.textBaseline='middle';x.lineWidth=8;x.strokeText('?',w/2,h/2+4);x.fillStyle='#fff';x.fillText('?',w/2,h/2+4)});
function mkItemBox(){const m=part(new THREE.Group(),G.itemBox,0xffffff,0,0,0,.1,new THREE.MeshToonMaterial({map:BOX_TEX,gradientMap:GRAD}));const g=m.parent;g.userData.box=m;return g}
function mkBanana(){const g=new THREE.Group();const b=part(g,G.banana,0xffd600,0,.55,0,.06);b.rotation.set(0,0,Math.PI*.95);part(g,G.shadow,0,0,0,0,0,SHADOW).scale.setScalar(.4);return g}
function mkBomb(){const g=new THREE.Group();part(g,G.bomb,0x263238,0,.8,0,.08);part(g,G.fuse,0x8d6e63,0,1.6,0,.04);part(g,G.sph,0xffab00,0,1.9,0,0).scale.setScalar(.18);return g}
function mkBarrel(){const g=new THREE.Group();part(g,G.barrel,0xd84315,0,1.1,0,.1);part(g,G.band,0x37474f,0,.5,0,0);part(g,G.band,0x37474f,0,1.7,0,0);part(g,G.cyl,0xfdd835,0,2.22,0,0).scale.set(.5,.05,.5);return g}
const OIL_MAT=new THREE.MeshBasicMaterial({color:0x1a1a2e,transparent:true,opacity:.85,depthWrite:false});
const PAD_TEX=canvasTex(128,(x,w,h)=>{x.fillStyle='#ff6d00';x.fillRect(0,0,w,h);x.lineWidth=10;x.strokeStyle='#111';x.strokeRect(5,5,w-10,h-10);
 x.lineJoin='round';for(let i=0;i<3;i++){const y=h*(.12+i*.28);x.beginPath();x.moveTo(w*.18,y+h*.2);x.lineTo(w/2,y);x.lineTo(w*.82,y+h*.2);x.lineWidth=18;x.strokeStyle='#111';x.stroke();x.lineWidth=10;x.strokeStyle='#ffee58';x.stroke()}},96);
const PAD_MAT=new THREE.MeshBasicMaterial({map:PAD_TEX});
