(function(){
const bc=new BroadcastChannel('mockpeer');const peers={};
class Em{constructor(){this._h={}}on(e,f){(this._h[e]=this._h[e]||[]).push(f);return this}emit(e,...a){(this._h[e]||[]).forEach(f=>{try{f(...a)}catch(x){console.error(x)}})}}
class Conn extends Em{constructor(peer,remote,cid){super();this.peer=peer.id;this._p=peer;this.remote=remote;this.cid=cid;this.open=false;peer._conns[cid]=this}
 send(d){if(!this.open||window.__mute)return;bc.postMessage({to:this.remote,type:'data',cid:this.cid,data:JSON.parse(JSON.stringify(d))})}
 close(){if(!this.open&&this._closed)return;this._closed=1;const w=this.open;this.open=false;bc.postMessage({to:this.remote,type:'close',cid:this.cid});this.emit('close')}}
class Peer extends Em{constructor(id){super();this.id=id||('auto'+Math.random().toString(36).slice(2,8));this._conns={};this.open=false;this.disconnected=false;this.destroyed=false;
 setTimeout(()=>{peers[this.id]=this;this.open=true;bc.postMessage({type:'reg',id:this.id});this.emit('open',this.id)},50);window.__peers=(window.__peers||[]).concat(this)}
 connect(id){const c=new Conn(this,id,Math.random().toString(36).slice(2));bc.postMessage({to:id,type:'connect',cid:c.cid,from:this.id});
  c._t=setTimeout(()=>{if(!c.open)this.emit('error',{type:'peer-unavailable'})},1500);return c}
 reconnect(){this.disconnected=false;setTimeout(()=>this.emit('open',this.id),30)}
 destroy(){this.destroyed=true;Object.values(this._conns).forEach(c=>c.close())}
 _msg(m){if(this.destroyed)return;
  if(m.type=='connect'){const c=new Conn(this,m.from,m.cid);c.open=true;this.emit('connection',c);setTimeout(()=>{bc.postMessage({to:m.from,type:'open',cid:m.cid});c.emit('open')},20)}
  const c=this._conns[m.cid];if(!c)return;
  if(m.type=='open'){c.open=true;clearTimeout(c._t);c.emit('open')}
  if(m.type=='data'&&c.open&&!window.__mute)c.emit('data',m.data);
  if(m.type=='close'&&c.open){c.open=false;c.emit('close')}}}
bc.onmessage=e=>{const m=e.data;Object.values(peers).forEach(p=>{if(m.to===p.id)p._msg(m)})};
// Coupure "silencieuse" : plus rien ne passe, aucun événement close (comme un téléphone qui se met en veille)
window.__silentKill=()=>{window.__mute=true};window.__unmute=()=>{window.__mute=false};
window.Peer=Peer;})();
