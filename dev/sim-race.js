// Usage : node dev/sim-race.js 12 0 1   — simule un championnat complet (ordre = circuits donnés) avec 2 joueurs auto + bots
const {open}=require('./lib.js');
(async()=>{const ids=process.argv.slice(2).map(Number);const {b,tv,errs}=await open();await tv.mouse.click(5,5);
 const out=await tv.evaluate(async ids=>{cup=ids;loadTrack(cup[0],true);
  for(let i=0;i<2;i++)players.push({key:1,pid:'k'+i,name:'Joueur'+i,cfg:cleanCfg({ch:i}),ready:true,in:ZERO,pts:0,seen:now()});
  startChamp();players.forEach(p=>p.off=true);const res=[];
  for(let r=0;r<cup.length;r++){let t=t0+10,n=0,nan=0,stuck=0;const st=new Map(racers.map(p=>[p,0]));
   while(phase=='race'&&n<60*300){step(1/60,t);t+=1000/60;n++;for(const p of racers){if(!isFinite(p.pos[0]+p.y+p.v))nan++;if(p.v<2&&!p.fin&&n>300){st.set(p,st.get(p)+1);stuck=Math.max(stuck,st.get(p))}else st.set(p,0)}}
   res.push({track:TR.def.n,secs:(n/60).toFixed(0),phase,nan,maxStuckSec:+(stuck/60).toFixed(1),finished:racers.filter(p=>p.fin).length+'/'+racers.length});
   if(phase=='results'){next();await new Promise(r=>setTimeout(r,300));players.forEach(p=>p.off=true)}}
  return res},ids);
 console.table(out);console.log('erreurs:',errs);await b.close()})();
