// Outils de test (hors jeu) : navigateur Chromium sans tête + faux PeerJS (BroadcastChannel) pour simuler TV + téléphones.
// Prérequis : playwright (global) et les 2 libs dans /tmp/kart-vendor (voir dev/README.md).
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/opt/node22/lib/node_modules/playwright');
const fs=require('fs'),path=require('path');const ROOT=path.join(__dirname,'..'),VENDOR=process.env.KART_VENDOR||'/tmp/kart-vendor';
exports.sleep=ms=>new Promise(r=>setTimeout(r,ms));
exports.open=async(opts={})=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required']});
 const ctx=await b.newContext({viewport:opts.vp||{width:1280,height:720}});
 await ctx.route('**/*',r=>{const u=r.request().url();
  if(u.includes('three'))return r.fulfill({path:VENDOR+'/three.min.js',contentType:'text/javascript'});
  if(u.includes('peerjs'))return r.fulfill({path:path.join(__dirname,'mockpeer.js'),contentType:'text/javascript'});
  if(u.includes('qrcode'))return r.fulfill({path:VENDOR+'/qrcode.js',contentType:'text/javascript'});
  if(u.startsWith('http://kart.test/')){const f=path.join(ROOT,new URL(u).pathname);if(fs.existsSync(f))return r.fulfill({path:f});}
  return r.abort()});
 const errs=[];const tv=await ctx.newPage();tv.on('pageerror',e=>errs.push('tv '+e.message));
 await tv.goto('http://kart.test/index.html');await exports.sleep(900);return{b,ctx,tv,errs}};
