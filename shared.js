// Données et utilitaires partagés entre la TV (index.html) et la manette (controller.html)
// Personnages : des animaux. c = couleur du pelage, k = modèle 3D/2D (voir toon.js et controller.html)
const CHARS=[{n:'T-Rex',e:'🦖',c:0x4caf50,k:'trex'},{n:'Panda',e:'🐼',c:0xffffff,k:'panda'},{n:'Chien',e:'🐶',c:0xc68642,k:'dog'},{n:'Chat',e:'🐱',c:0xff9800,k:'cat'},
 {n:'Cochon',e:'🐷',c:0xf48fb1,k:'pig'},{n:'Lapin',e:'🐰',c:0xeeeeee,k:'bunny'},{n:'Grenouille',e:'🐸',c:0x7cb342,k:'frog'},{n:'Tricéra',e:'🦕',c:0x42a5f5,k:'tri'}];
const KARTS=[{n:'Équilibré',spd:36,acc:1.5,han:1.9},{n:'Fusée',spd:41,acc:1.0,han:1.5},{n:'Drifteur',spd:33,acc:2.2,han:2.5}];
const COLORS=['#e53935','#fb8c00','#fdd835','#7cb342','#00acc1','#1e88e5','#5e35b1','#d81b60','#f5f5f5','#212121','#6d4c41','#ff80ab'];
const SHAPES=['Rond','Bouclier','Étoile','Losange','Hexagone','Cœur'];
const SYMBOLS=['⚡','🔥','💀','👑','🌙','⭐','🐉','🦊','🍕','🎯','❤️','☠️','🌈','🚀','🐙','🍀'];
const ITEMS={banana:{e:'🍌',n:'Banane'},bomb:{e:'💣',n:'Bombe'},pepper:{e:'🌶️',n:'Piment turbo'},shield:{e:'🛡️',n:'Bouclier'}};
const LAPS=3,POINTS=[15,12,10,8,6,4],MAXP=6,CUP_LEN=3;
// Les 12 circuits (le tracé et le décor sont dans tracks.js, côté TV). Le championnat = 3 circuits au choix.
const TRACK_META=[{n:'Prairie Pétillante',e:'🌳'},{n:'Désert Dingo',e:'🌵'},{n:'Glacier Givré',e:'❄️'},{n:'Plage Paradisiaque',e:'🏖️'},{n:'Volcan Vorace',e:'🌋'},{n:'Pays des Bonbons',e:'🍭'},
 {n:'Circuit Cosmique',e:'🚀'},{n:'Forêt des Champignons',e:'🍄'},{n:'Jungle Joyeuse',e:'🦜'},{n:'Nuit des Lucioles',e:'✨'},{n:'Ferme Folle',e:'🐮'},{n:'Canyon Coloré',e:'🏔️'},
 {n:'Oasis Secrète',e:'🌴'},{n:'Volcan en Éruption',e:'☄️'},{n:'Cirque Céleste',e:'🎪'}];
// Championnats : chaque coupe regroupe des circuits (3 ou 4 courses). Les nouveaux circuits compliqués s'ajoutent un par un dans différentes coupes.
const CUPS=[{n:'Coupe Prairie',e:'🌳',t:[0,7,10]},{n:'Coupe Soleil',e:'☀️',t:[1,3,11,12]},{n:'Coupe Frisson',e:'🌋',t:[2,4,8,13]},{n:'Coupe Féérie',e:'✨',t:[5,6,9,14]}];
const cupLabel=c=>{const f=CUPS.find(q=>q.t.length==c.length&&q.t.every((x,i)=>x==c[i]));return f?f.e+' '+f.n:'✏️ Sur mesure'};
// Cri affiché sur la TV quand un joueur klaxonne (le son est joué sur son téléphone)
const CRY_WORD={trex:'GRAOUH !',panda:'GRRR !',dog:'WOUAF !',cat:'MIAOU !',pig:'GROIN !',bunny:'COUIC !',frog:'COAAA !',tri:'TROUUT !'};
const DEFAULT_CUP=CUPS[0].t.slice();
// Découpage de l'écran de la TV selon le nombre de joueurs : [colonnes, lignes]
const gridFor=n=>n<=1?[1,1]:n==2?[2,1]:n<=4?[2,2]:[3,2];
const cleanCup=v=>{if(!Array.isArray(v)||v.length<3||v.length>5)return null;const a=v.map(x=>x|0);return a.every(x=>x>=0&&x<TRACK_META.length)&&new Set(a).size==a.length?a:null};
const DEFAULT_CFG={ch:0,ka:0,col:'#e53935',emb:{sh:0,bg:'#fdd835',fg:'#212121',s:'⚡'}};
const hex=c=>'#'+c.toString(16).padStart(6,'0');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// Pseudo amusant généré quand le joueur n'en saisit pas
const NAMES_A=['Turbo','Bolide','Zigzag','Fusée','Ninja','Pirate','Comète','Tornade','Pépite','Castor'];
const randomName=()=>NAMES_A[Math.floor(Math.random()*NAMES_A.length)]+Math.floor(10+Math.random()*90);
const ord=n=>n==1?'1er':n+'e';
const isCol=c=>/^#[0-9a-f]{6}$/i.test(c);
// Nettoie une config reçue du réseau (jamais de confiance aveugle)
function cleanCfg(c){c=c||{};const e=c.emb||{};
 return{ch:Math.abs(c.ch|0)%CHARS.length,ka:Math.abs(c.ka|0)%KARTS.length,col:isCol(c.col)?c.col:DEFAULT_CFG.col,
  emb:{sh:Math.abs(e.sh|0)%SHAPES.length,bg:isCol(e.bg)?e.bg:DEFAULT_CFG.emb.bg,fg:isCol(e.fg)?e.fg:DEFAULT_CFG.emb.fg,s:[...String(e.s==null?'⚡':e.s)].slice(0,2).join('')}}}

// Trace la forme d'un emblème centrée en (0,0), rayon ~1
function embPath(x,sh){x.beginPath();
 if(sh==0)x.arc(0,0,1,0,Math.PI*2);
 else if(sh==1){x.moveTo(-.85,-.9);x.lineTo(.85,-.9);x.lineTo(.85,-.1);x.quadraticCurveTo(.8,.65,0,1);x.quadraticCurveTo(-.8,.65,-.85,-.1);x.closePath()}
 else if(sh==2){for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?.5:1.05;x.lineTo(Math.cos(a)*r,Math.sin(a)*r+.06)}x.closePath()}
 else if(sh==3){x.moveTo(0,-1.05);x.lineTo(.85,0);x.lineTo(0,1.05);x.lineTo(-.85,0);x.closePath()}
 else if(sh==4){for(let i=0;i<6;i++){const a=i*Math.PI/3;x.lineTo(Math.cos(a),Math.sin(a))}x.closePath()}
 else{x.moveTo(0,1);x.bezierCurveTo(-1.3,.1,-.9,-1.1,0,-.45);x.bezierCurveTo(.9,-1.1,1.3,.1,0,1);x.closePath()}}
// Dessine un emblème dans un canvas carré
function drawEmblem(cv,e){const x=cv.getContext('2d'),S=cv.width;x.clearRect(0,0,S,S);x.save();x.translate(S/2,S/2);x.scale(S*.42,S*.42);
 embPath(x,e.sh);x.fillStyle=e.bg;x.fill();x.lineWidth=.12;x.strokeStyle='#111';x.lineJoin='round';x.stroke();
 x.save();embPath(x,e.sh);x.clip();x.fillStyle='rgba(255,255,255,.35)';x.beginPath();x.ellipse(-.35,-.5,.6,.3,-.5,0,Math.PI*2);x.fill();x.restore();
 x.restore();const s=e.s||'';if(s){const fs=S*([...s].length>1?.32:.42);x.font=`900 ${fs}px "Bangers",system-ui,sans-serif`;x.textAlign='center';x.textBaseline='middle';
  x.lineWidth=S*.05;x.strokeStyle='#111';x.lineJoin='round';const y=S/2+S*(e.sh==2?.04:.02);x.strokeText(s,S/2,y);x.fillStyle=e.fg;x.fillText(s,S/2,y)}
 return cv}
function emblemURL(e,S=96){const c=document.createElement('canvas');c.width=c.height=S;return drawEmblem(c,e).toDataURL()}
