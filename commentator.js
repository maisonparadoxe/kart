// Commentateur de la TV : bulle de BD + voix « blabla » ou vraie voix (synthèse vocale du navigateur).
// Pour rester drôle sans saouler : priorités, pause minimale entre deux phrases, pas de répétition,
// les carambolages sont regroupés et on parle surtout des humains.
const LINES={
 shortcut:['{n} prend le raccourci !','{n} s’engouffre dans le passage secret !','{n} coupe par le raccourci, quel culot !','Raccourci pour {n} ! Pourvu qu’il passe les tonneaux.'],
 join:['Bienvenue {n} !','{n} entre dans l’arène !','Tiens, voilà {n} ! Joli emblème.','{n} est dans la place !'],
 start:['Bienvenue sur {track} ! Attachez vos casques !','{track} ! Les moteurs rugissent… enfin, ils toussent.','Ça va chauffer sur {track} !','Silence dans les tribunes… c’est parti pour {track} !'],
 final:['Dernière course ! {n} mène le championnat avec {pts} points !','Tout se joue maintenant ! {n} est en tête du championnat.','Dernière manche ! Qui va détrôner {n} ?'],
 lead:['{n} prend la tête !','Et c’est {n} qui passe devant !','{n} double tout le monde, quelle audace !','Nouveau leader : {n} !','{n} en tête ! Les autres mangent la poussière.'],
 last:['Dernier tour pour {n} !','Plus qu’un tour ! {n} sent l’odeur de l’arrivée.','Dernier tour ! {n} ne lâche rien !'],
 bomb:['BOUM ! {v} se prend une bombe !','{a} a envoyé un cadeau explosif à {v} !','Aïe aïe aïe, {v} a fini en confettis !','{v} ne l’a pas vue venir, celle-là ! Merci {a} !','Et {v} décolle ! Joli tir de {a} !'],
 bombSelf:['{v} s’est fait sauter tout seul… classique.','Oups ! {v} a raté son lancer.'],
 banana:['{v} glisse sur une banane ! Quelle élégance !','Peau de banane pour {v} ! Le grand classique.','{v} fait une pirouette. Note du jury : 9 sur 10 !','Merci {a} pour la banane, {v} adore !','{v} découvre la banane de {a}. Délicieux !'],
 oil:['{v} fait du patinage artistique dans l’huile !','Splotch ! {v} a trouvé la flaque d’huile.','{v} tourne en rond… c’est voulu ?'],
 bonk:['{v} embrasse un tonneau !','BONK ! Le tonneau gagne contre {v}.'],
 block:['Le bouclier de {v} encaisse tout !','Raté ! {v} est protégé !'],
 ram:['{a} fonce dans le tas, protégé par son bouclier !','Bouclier en avant ! {a} bouscule {v} !'],
 pileup:['Carambolage général !','Quel chaos ! {k} pilotes au tapis !','C’est la fête foraine sur la piste !'],
 fin1:['{n} remporte la course ! Incroyable !','Victoire de {n} ! Le public est en délire !','{n} franchit la ligne en premier ! Champagne… enfin, jus de pomme !'],
 fin2:['{n} termine deuxième !','Deuxième place pour {n}, pas mal du tout !'],
 fin3:['Et {n} complète le podium !','Troisième ! {n} grimpe sur le podium.'],
 photo:['Photo-finish entre {n} et {m} !','Au millimètre ! {n} devance {m} !'],
 finLast:['Et voilà {n}… qui a pris le chemin touristique.','{n} arrive enfin ! On avait commandé une pizza.','{n} termine. L’important, c’est de participer !'],
 champion:['{n} est champion ! Bravo à tous !','Et le grand champion est… {n} !','{n} soulève la coupe ! Quelle saison !']};
const CMT=(()=>{let freeAt=0,lastEnd=-1e9,queue=[],recent=[],last={},hits=[],hitT=0,voice=null,tm=0;
 let mode=(()=>{try{return localStorage.getItem('kp-voice')||'blabla'}catch(e){return'blabla'}})();
 const COOL={shortcut:14000,lead:12000,bonk:20000,oil:8000,join:3000,block:8000,ram:10000},GAP=[6000,4500,1500,0],t=()=>performance.now();
 const pickVoice=()=>{if(!window.speechSynthesis)return null;const v=speechSynthesis.getVoices().filter(v=>/^fr/i.test(v.lang));return v.find(v=>/google|natural|premium|enhanced/i.test(v.name))||v[0]||null};
 if(window.speechSynthesis){voice=pickVoice();speechSynthesis.onvoiceschanged=()=>{voice=pickVoice()}}
 const fill=(s,o)=>s.replace(/\{(\w)(\w*)\}/g,(_,a,b)=>o[a+b]!=null?o[a+b]:'');
 function pick(type){const arr=LINES[type],pool=arr.filter(s=>!recent.includes(s)),s=(pool.length?pool:arr)[Math.floor(Math.random()*(pool.length||arr.length))];recent.push(s);if(recent.length>14)recent.shift();return s}
 // prio 0 : anecdotique, 1 : normal, 2 : important, 3 : incontournable (arrivées, podium)
 function say(type,o={},prio=1){const n=t();if(COOL[type]&&last[type]&&n-last[type]<COOL[type])return;
  if(n<freeAt||n-lastEnd<GAP[prio]){if(prio>=3)queue.push({type,o,prio,exp:n+12000});else if(prio==2){queue=queue.filter(q=>q.prio>2);queue.push({type,o,prio,exp:n+4000})}return}
  speak(type,o)}
 function speak(type,o){const n=t();last[type]=n;const text=fill(pick(type),o);
  const el=document.getElementById('cmt');el.querySelector('p').textContent=text;el.className='on';
  let dur=Math.max(2200,text.length*60+1200);
  if(mode=='voice'&&voice&&SFX.ready()){try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.voice=voice;u.lang=voice.lang;u.rate=1.12;u.pitch=1.15;speechSynthesis.speak(u);dur=Math.max(dur,text.length*75+800)}catch(e){}}
  else{const s=SFX.blabla(text);if(s)dur=Math.max(dur,s*1000+900)}
  freeAt=n+dur;lastEnd=freeAt;clearTimeout(tm);tm=setTimeout(()=>{el.className=''},dur)}
 setInterval(()=>{const n=t();queue=queue.filter(q=>n<q.exp);const q=queue[0];if(q&&n>=freeAt&&n-lastEnd>=GAP[q.prio]){queue.shift();speak(q.type,q.o)}
  // Coups reçus : on attend un court instant pour regrouper un éventuel carambolage
  if(hits.length&&n>hitT){const h=hits;hits=[];
   const k=new Set(h.map(x=>x.o.v)).size;if(k>=3)return say('pileup',{k},2);
   const best=h.sort((a,b)=>b.w-a.w)[0];say(best.type,best.o,best.w>=3?1:0)}},150);
 // victime v, cause k, auteur a (peut être null). On ignore les histoires de bots entre eux.
 function hit(v,k,a){if(v.bot&&(!a||a.bot))return;
  const type=k=='bomb'?(a===v?'bombSelf':'bomb'):k,w={bomb:3,bombSelf:3,banana:2,ram:2,oil:1,block:1,bonk:0}[type];
  if(!hits.length)hitT=t()+450;hits.push({type,w,o:{v:v.name,a:a?a.name:'quelqu’un'}})}
 function reset(){queue=[];hits=[];freeAt=0;lastEnd=-1e9;clearTimeout(tm);const el=document.getElementById('cmt');if(el)el.className='';try{window.speechSynthesis&&speechSynthesis.cancel()}catch(e){}}
 return{say,hit,reset,mode:()=>mode,hasVoice:()=>!!voice,setMode:m=>{mode=m;try{localStorage.setItem('kp-voice',m)}catch(e){}}}})();
