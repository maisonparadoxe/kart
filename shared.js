const CHARS=[{n:'Rouge',c:0xe53935,e:'🍄'},{n:'Bleu',c:0x1e88e5,e:'🐢'},{n:'Vert',c:0x43a047,e:'🦖'},{n:'Jaune',c:0xfdd835,e:'⭐'}];
const KARTS=[{n:'Équilibré',spd:36,acc:1.5,han:1.9},{n:'Fusée',spd:44,acc:0.9,han:1.4},{n:'Drifteur',spd:32,acc:2.2,han:2.5}];
const hex=c=>'#'+c.toString(16).padStart(6,'0');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
