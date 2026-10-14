// Usage : node dev/check-track.js [index]   — construit les circuits dans le vrai jeu et affiche tracé / relief / raccourci
const {open}=require('./lib.js');
(async()=>{const {b,tv,errs}=await open();const only=process.argv[2];
 const rows=await tv.evaluate(only=>TRACKS.map((def,i)=>({def,i})).filter(o=>only==null||o.i==only).map(({def,i})=>{const tr=buildTrack(def,i);let minR=1e9,len=0,maxG=0;
  for(let k=0;k<N;k++){const a=tr.C[(k-1+N)%N],b=tr.C[k],c=tr.C[(k+1)%N];len+=Math.hypot(c[0]-b[0],c[1]-b[1]);const ab=Math.hypot(b[0]-a[0],b[1]-a[1]),bc=Math.hypot(c[0]-b[0],c[1]-b[1]),ac=Math.hypot(c[0]-a[0],c[1]-a[1]),cr=Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]));minR=Math.min(minR,ab*bc*ac/(2*cr+1e-9));maxG=Math.max(maxG,Math.abs(tr.G[k]))}
  return{n:def.n,len:Math.round(len),minR:+minR.toFixed(1),maxGrade:+(maxG*100).toFixed(1),walls:tr.wall.filter(Boolean).length,shortcut:tr.sc?tr.sc.n:0}}),only);
 console.table(rows);console.log('erreurs:',errs);await b.close()})();
