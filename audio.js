// Sons synthétisés (Web Audio, aucun fichier) : effets, klaxons, voix « blabla », musique de menu.
// Les navigateurs exigent un geste (toucher / touche) avant de jouer du son : on déverrouille au premier.
const SFX=(()=>{let ctx=null,master=null,musicBus=null,on=true,nbuf=null;
 function init(){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
  if(!ctx){ctx=new AC();master=ctx.createGain();master.gain.value=.8;master.connect(ctx.destination);musicBus=ctx.createGain();musicBus.gain.value=.5;musicBus.connect(master)}
  if(ctx.state=='suspended')ctx.resume();return ctx}
 ['pointerdown','keydown','touchend'].forEach(e=>addEventListener(e,init,{passive:true}));
 const ready=()=>ctx&&ctx.state=='running'&&on;
 function tone(f,d,o){o=o||{};if(!ready())return;const t0=ctx.currentTime+(o.t||0),os=ctx.createOscillator(),g=ctx.createGain(),v=o.v==null?.2:o.v;
  os.type=o.type||'square';os.frequency.setValueAtTime(f,t0);if(o.f2)os.frequency.exponentialRampToValueAtTime(o.f2,t0+d);
  if(o.vib){const l=ctx.createOscillator(),lg=ctx.createGain();l.frequency.value=o.vib;lg.gain.value=f*.03;l.connect(lg);lg.connect(os.frequency);l.start(t0);l.stop(t0+d+.05)}
  g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(v,t0+(o.att||.006));
  if(o.hold)g.gain.setValueAtTime(v,t0+d-.04);g.gain.exponentialRampToValueAtTime(.0005,t0+d);
  os.connect(g);g.connect(o.bus||master);os.start(t0);os.stop(t0+d+.05)}
 function noise(d,o){o=o||{};if(!ready())return;if(!nbuf){nbuf=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);const a=nbuf.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1}
  const t0=ctx.currentTime+(o.t||0),s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain(),v=o.v==null?.2:o.v;s.buffer=nbuf;s.loop=true;
  f.type=o.type||'bandpass';f.frequency.setValueAtTime(o.f||1000,t0);if(o.f2)f.frequency.exponentialRampToValueAtTime(o.f2,t0+d);f.Q.value=o.q||1;
  g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(v,t0+(o.att||.01));g.gain.exponentialRampToValueAtTime(.0005,t0+d);
  s.connect(f);f.connect(g);g.connect(o.bus||master);s.start(t0);s.stop(t0+d+.05)}
 const notes=(seq,o)=>seq.forEach(([f,t,d])=>tone(f,d||.12,Object.assign({},o,{t})));
 const lib={
  count:()=>tone(660,.2,{v:.15}),go:()=>{tone(990,.55,{v:.16,hold:1});tone(1320,.55,{v:.08,t:.02,hold:1})},
  roll:()=>{for(let i=0;i<11;i++)tone(i%2?1200:900,.04,{v:.06,t:i*.085})},
  got:()=>notes([[784,0],[1175,.08,.25]],{v:.13,type:'triangle'}),
  hit:()=>{tone(500,.4,{type:'sawtooth',v:.12,f2:70});noise(.25,{v:.18,f:700})},
  slip:()=>{tone(1400,.55,{type:'sine',v:.14,f2:180});noise(.45,{v:.08,f:3000,f2:700})},
  oil:()=>{noise(.35,{v:.25,f:300,type:'lowpass'});tone(260,.4,{type:'sine',v:.15,f2:60})},
  boom:()=>{noise(.9,{v:.45,f:500,f2:50,type:'lowpass'});tone(110,.7,{type:'sine',v:.35,f2:28})},
  bonk:()=>{tone(170,.18,{type:'triangle',v:.3,f2:80});noise(.07,{v:.15,f:600})},
  boost:()=>{tone(180,.6,{type:'sawtooth',v:.08,f2:900});noise(.55,{v:.08,f:1500,f2:6000})},
  banana:()=>tone(520,.12,{type:'sine',v:.2,f2:240}),
  bomb:()=>{noise(.35,{v:.15,f:400,f2:3000});tone(300,.3,{type:'triangle',v:.08,f2:900})},
  pepper:()=>{lib.boost();noise(.6,{v:.1,f:900,q:.5,t:.05})},
  shield:()=>notes([[660,0],[880,.07],[1320,.14,.35]],{type:'sine',v:.12}),
  block:()=>{tone(1800,.35,{type:'sine',v:.12});tone(2700,.25,{type:'sine',v:.07})},
  lap:()=>notes([[660,0],[990,.1,.2]],{v:.1}),
  last:()=>notes([[523,0],[659,.1],[784,.2],[1047,.3,.35]],{v:.11}),
  fin:p=>p<=3?notes([[523,0],[659,.12],[784,.24],[1047,.36,.18],[784,.56,.1],[1047,.68,.6]],{v:.12}):notes([[392,0],[523,.15,.4]],{v:.1}),
  // Foule qui acclame (TV) : souffle filtré qui gonfle + sifflets
  cheer:(n=1)=>{noise(2.2,{v:.12*n,f:1100,q:.4,att:.35});noise(1.6,{v:.06*n,f:2500,q:.8,att:.2,t:.1});
   for(let i=0;i<3;i++)tone(1800+Math.random()*900,.35,{type:'sine',v:.03,f2:2600+Math.random()*600,t:.2+i*.35})},
  fanfare:()=>notes([[392,0,.12],[392,.15,.12],[392,.3,.12],[523,.45,.5],[659,.95,.12],[523,1.1,.12],[659,1.25,.12],[784,1.4,.9]],{v:.12,type:'square',hold:1})};
 // Klaxons : un par type de kart
 const horns=[()=>{tone(415,.18,{v:.16,hold:1});tone(330,.3,{v:.16,t:.2,hold:1})},
  ()=>notes([[523,0,.09],[523,.11,.09],[523,.22,.09],[698,.33,.25],[880,.62,.3]],{v:.13,hold:1}),
  ()=>{tone(220,.5,{type:'sawtooth',v:.12,hold:1,vib:6});tone(277,.5,{type:'sawtooth',v:.08,hold:1,vib:6})}];
 // Voix « blabla » du commentateur : un petit son par syllabe, hauteur au hasard autour d'une note
 function blabla(text,base=230){if(!ready())return 0;let t=0;const s=text.replace(/[^\p{L}\s!?.]/gu,'');
  for(let i=0;i<s.length;i++){const c=s[i];if(/[aeiouyàâéèêëîïôûù]/i.test(c)){tone(base*(1+Math.random()*.5)*(s[i+1]=='!'||s[i+1]=='?'?1.3:1),.07,{type:'triangle',v:.09,t});t+=.075}
   else if(/[.!?]/.test(c))t+=.18;else if(c==' ')t+=.03}return t}
 // Musique de menu : petite boucle chiptune (do – la – fa – sol)
 let mT=0,mStep=0,mNext=0;const TEMPO=.13,MEL=[0,4,7,4,9,7,4,-1, 9,7,4,0,2,4,-1,-1, 5,9,12,9,7,5,4,5, 7,-1,7,9,11,12,-1,-1, 0,4,7,12,11,7,4,-1, 9,12,16,12,9,7,-1,-1, 5,4,5,9,12,9,5,4, 7,11,14,11,12,-1,12,-1],
  BASS=[0,-3,-7,-5,0,-3,-7,-5],hz=s=>523.25*Math.pow(2,s/12);
 function musicTick(){if(!ready()){mNext=0;return}if(!mNext)mNext=ctx.currentTime+.05;
  while(mNext<ctx.currentTime+.35){const i=mStep%MEL.length,bar=Math.floor(i/8),dt=mNext-ctx.currentTime,b={bus:musicBus};
   if(MEL[i]>=0)tone(hz(MEL[i]),TEMPO*1.6,Object.assign({type:'square',v:.045,t:dt},b));
   if(i%4==0)tone(hz(BASS[bar%8]-24),TEMPO*3.5,Object.assign({type:'triangle',v:.11,t:dt},b));
   if(i%4==2)tone(hz(BASS[bar%8]-12),TEMPO*1.5,Object.assign({type:'triangle',v:.07,t:dt},b));
   if(i%2==1)noise(.04,Object.assign({v:.025,f:8000,type:'highpass',t:dt},b));
   mStep++;mNext+=TEMPO}}
 const music={play(){if(!mT){mT=setInterval(musicTick,100);mNext=0}},stop(){clearInterval(mT);mT=0}};
 return{init,lib,horns,blabla,music,ready,unlocked:()=>!!ctx&&ctx.state=='running',setOn:v=>{on=v},isOn:()=>on}})();
