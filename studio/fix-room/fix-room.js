(function(){
'use strict';
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), c01=v=>clamp(v,0,1);
const fmtT=s=>{s=Math.max(0,s||0);return Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0')};
const sg=(v,d=1)=>(v>0?'+':'')+v.toFixed(d);
const esc=s=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- controls ---------- */
const REP=[
 {id:'hiss',label:'De-hiss',min:0,max:100,step:1,val:45,fmt:v=>v+'%',desc:'The steady noise bed. Learns the hiss floor from the quietest moments of the track and pushes it down between the notes.'},
 {id:'shim',label:'De-shimmer',min:0,max:100,step:1,val:55,fmt:v=>v+'%',desc:'Glassy, metallic ringing from 7 kHz up. Flattens the narrow peaks that poke out of the top end, moment by moment.'},
 {id:'harsh',label:'De-harsh',min:0,max:100,step:1,val:30,fmt:v=>v+'%',desc:'The same treatment for 2 to 6 kHz, where vocals and synth stabs turn brittle.'},
 {id:'fizz',label:'Stereo fizz',min:0,max:100,step:1,val:30,fmt:v=>v+'%',desc:'Turns down the sides above 8 kHz, where the phasey spray lives. The centre is left alone.'},
 {id:'top',label:'Top cut',min:12,max:22,step:0.5,val:19,fmt:v=>v>=22?'Off':v+' kHz',desc:'Removes everything above this point. Suno puts very little real music up there.'},
 {id:'mono',label:'Mono bass below',min:0,max:200,step:10,val:100,fmt:v=>v?v+' Hz':'Off',desc:'Centres the low end so the kick and bass hit evenly on a club system.'}
];
const MAS=[
 {id:'hp',label:'Rumble filter',min:10,max:80,step:1,val:30,fmt:v=>v+' Hz',desc:'Clears sub-rumble below the kick.'},
 {id:'low',label:'Sub / low weight',min:-6,max:6,step:0.5,val:0.5,fmt:v=>sg(v)+' dB',desc:'Shelf at 90 Hz. Body of the kick and bassline.'},
 {id:'mud',label:'Low-mid mud',min:-6,max:3,step:0.5,val:-0.5,fmt:v=>sg(v)+' dB',desc:'Bell at 300 Hz. Pull down if the mix sounds boxy.'},
 {id:'pres',label:'Presence',min:-4,max:6,step:0.5,val:1,fmt:v=>sg(v)+' dB',desc:'Bell at 3.5 kHz. Vocal clarity and snare snap.'},
 {id:'air',label:'Air',min:-3,max:8,step:0.5,val:1,fmt:v=>sg(v)+' dB',desc:'Shelf at 11 kHz. Add it back after the repair has cleaned the top, never before.'},
 {id:'glue',label:'Glue compression',min:1,max:6,step:0.1,val:2.5,fmt:v=>v.toFixed(1)+' : 1',desc:'Bus compressor ratio. Holds the mix together.'},
 {id:'width',label:'Stereo width',min:0,max:180,step:5,val:100,fmt:v=>v+'%',desc:'Scales the sides. 100% leaves the image as it is.'},
 {id:'sat',label:'Saturation',min:0,max:100,step:1,val:12,fmt:v=>v+'%',desc:'Soft harmonic warmth for brittle digital tops.'},
 {id:'clip',label:'Clipper',min:0,max:4,step:0.5,val:2,fmt:v=>v?v.toFixed(1)+' dB':'Off',desc:'Shaves kick peaks before the limiter so the track gets loud without pumping.'},
 {id:'lufs',label:'Loudness target',min:-16,max:-5,step:0.5,val:-9,fmt:v=>v.toFixed(1)+' LUFS',desc:'Measured the way streaming platforms measure it. The limiter is driven until the whole track lands here.'},
 {id:'ceil',label:'True-peak ceiling',min:-2,max:-0.1,step:0.1,val:-1,fmt:v=>v.toFixed(1)+' dBTP',desc:'-1.0 is safe for every streaming platform and for MP3 conversion.'}
];
const REP_PRE={light:{hiss:25,shim:30,harsh:15,fizz:15,top:20,mono:0},standard:{hiss:45,shim:55,harsh:30,fizz:30,top:19,mono:100},heavy:{hiss:70,shim:80,harsh:50,fizz:55,top:17,mono:120}};
const MAS_PRE={
 club:{hp:32,low:1.5,mud:-1,pres:1.5,air:1.5,glue:3,width:110,sat:22,clip:3,lufs:-7,ceil:-1},
 stream:{hp:30,low:0.5,mud:-0.5,pres:1,air:1,glue:2.5,width:100,sat:12,clip:2,lufs:-9,ceil:-1},
 deep:{hp:28,low:2,mud:-1.5,pres:0.5,air:1,glue:2,width:105,sat:15,clip:1,lufs:-10,ceil:-1},
 liquid:{hp:26,low:1,mud:-1,pres:1.5,air:2,glue:1.8,width:120,sat:8,clip:0.5,lufs:-11,ceil:-1},
 transparent:{hp:24,low:0,mud:0,pres:0,air:0,glue:1.5,width:100,sat:0,clip:0,lufs:-13,ceil:-1}};
const ALL=REP.concat(MAS), byId={}; ALL.forEach(c=>byId[c.id]=c);
function buildCtl(host,list){
  host.innerHTML=list.map(c=>`<div class="ctl"><div class="top"><label for="${c.id}">${c.label}</label><span class="val" id="${c.id}V"></span></div><input type="range" id="${c.id}" min="${c.min}" max="${c.max}" step="${c.step}" value="${c.val}"><div class="desc">${c.desc}</div></div>`).join('');
}
buildCtl($('#repCtl'),REP); buildCtl($('#masCtl'),MAS);
function refresh(id){const el=$('#'+id),v=parseFloat(el.value),c=byId[id];$('#'+id+'V').textContent=c.fmt(v);el.style.setProperty('--fill',((v-c.min)/(c.max-c.min)*100)+'%');}
function setVals(o){for(const k in o){$('#'+k).value=o[k];refresh(k);}}
const stepOn={hiss:true,shim:true,harsh:true,fizz:true,tidy:true,tone:true,loud:true}; let masKey='stream';
function params(){const p={repairOn:true,masterOn:stepOn.loud};ALL.forEach(c=>p[c.id]=parseFloat($('#'+c.id).value));p.top=p.top>=22?22000:p.top*1000;
  ['hiss','shim','harsh','fizz'].forEach(k=>{if(!stepOn[k])p[k]=0;}); if(!stepOn.tidy){p.top=22000;p.mono=0;} if(!stepOn.tone){p.low=p.mud=p.pres=p.air=0;} return p;}
ALL.forEach(c=>{refresh(c.id);$('#'+c.id).addEventListener('input',()=>{refresh(c.id);if(REP.includes(c))$$('#repChips .chip').forEach(x=>x.classList.remove('on'));else masKey=null;if(track)buildPlan();schedule();});});
$('#repChips').addEventListener('click',e=>{const ch=e.target.closest('.chip');if(!ch)return;$$('#repChips .chip').forEach(x=>x.classList.remove('on'));ch.classList.add('on');
  if(ch.dataset.k==='auto'){if(track)setVals(suggest(track.scan));}else setVals(REP_PRE[ch.dataset.k]);if(track)buildPlan();schedule(0);});
const autoOn=()=>!!$('#repChips .chip.on[data-k=auto]');

/* ---------- reading the scan ---------- */
const REF=[8,10,4,0,-7,-13,-21], BN=['Sub','Bass','Low-mid','Mid','Presence','Brilliance','Air'], BR=['30-60 Hz','60-200','200-500','500-2k','2k-6k','6k-12k','12k-20k'];
const dev=s=>s.bands.map((v,i)=>v-REF[i]);
function sev(s){const d=dev(s);return {hiss:s.hissRel<-80?'none':s.hissRel>-48?'bad':s.hissRel>-58?'warn':'ok',shim:s.shimmer>13?'bad':s.shimmer>9?'warn':'ok',harsh:d[4]>6?'bad':d[4]>3?'warn':'ok',fizz:s.sideHF>-4?'bad':s.sideHF>-10?'warn':'ok'};}
const SEVW={bad:'Heavy',warn:'Noticeable',ok:'Light',none:'None found'};
function suggest(s){
  let hiss=s.hissRel<-80?10:Math.round(20+c01((s.hissRel+65)/25)*60); if(s.hissGap<8)hiss=Math.min(hiss,35);
  return {hiss,shim:Math.round(25+c01((s.shimmer-6)/10)*50),harsh:Math.round(15+c01((dev(s)[4]+2)/8)*40),fizz:Math.round(10+c01((s.sideHF+14)/14)*45),top:19,mono:100};
}
function toneSuggest(s){
  const d=dev(s),o={},n=[],r=v=>Math.round(v*2)/2,hi=(d[5]+d[6])/2;
  if(d[1]>5){o.low=r(clamp(-d[1]*0.3,-3,-0.5));n.push('low end is heavy');}else if(d[1]<-5){o.low=r(clamp(-d[1]*0.3,0.5,3));n.push('low end is thin');}
  if(d[2]>5){o.mud=r(clamp(-d[2]*0.4,-4,-1));n.push('low-mids are muddy');}
  if(d[4]<-5){o.pres=r(clamp(-d[4]*0.3,1,3));n.push('presence range is recessed');}
  if(hi<-5){o.air=r(clamp(-hi*0.4,1,4));n.push('top end is dull');}else if(hi>5){o.air=-1;n.push('top end is bright');}
  return n.length?{o,n}:null;
}
const listOf=a=>a.length<2?a.join(''):a.slice(0,-1).join(', ')+' and '+a[a.length-1];

/* ---------- worker ---------- */
/* The engine lives in fix-room-engine.js, next to this file. It runs in a Worker; if Workers are blocked it is fetched and run on the main thread. */
const ENGINE=new URL('fix-room-engine.js',(document.currentScript&&document.currentScript.src)||location.href).href;
let worker, rid=0; const pending=new Map();
function onMsg(m){const p=pending.get(m.id);if(!p)return;if(m.type==='progress'){p.onProg&&p.onProg(m.pct,m.label);return;}pending.delete(m.id);m.type==='error'?p.rej(new Error(m.message)):p.res(m);}
function localWorker(){let core=null,q=[];fetch(ENGINE).then(r=>r.text()).then(src=>{core=new Function(src+'\nreturn {handle};')();q.forEach(m=>core.handle(m,onMsg));q=null;});
  return {postMessage(m){core?setTimeout(()=>core.handle(m,onMsg),0):q.push(m);}};}
try{
  worker=new Worker(ENGINE);
  worker.onmessage=e=>onMsg(e.data);
  worker.onerror=()=>{worker=localWorker();pending.forEach(p=>p.rej(new Error('The audio engine restarted. Try again.')));pending.clear();};
}catch(e){worker=localWorker();}
function call(msg,transfer,onProg){return new Promise((res,rej)=>{const id=++rid;pending.set(id,{res,rej,onProg});msg.id=id;worker.postMessage(msg,transfer||[]);});}

/* ---------- files ---------- */
let queue=[],cur=-1,track=null,batching=false;
const drop=$('#drop'),fileInput=$('#fileInput');
drop.addEventListener('click',()=>fileInput.click());
drop.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fileInput.click();}});
drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('hot');});
drop.addEventListener('dragleave',()=>drop.classList.remove('hot'));
drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('hot');addFiles(e.dataTransfer.files);});
fileInput.addEventListener('change',e=>{addFiles(e.target.files);fileInput.value='';});
function addFiles(list){
  const files=Array.from(list).filter(f=>f.type.startsWith('audio/')||/\.(wav|mp3|flac|m4a|ogg|aiff?)$/i.test(f.name));
  if(!files.length||batching)return; const first=queue.length;
  files.forEach(f=>queue.push({file:f,name:f.name,status:''})); renderQueue(); if(cur<0)select(first);
}
function renderQueue(){
  const q=$('#queue'); q.classList.toggle('show',queue.length>0);
  q.innerHTML=queue.map((it,i)=>`<div class="qrow ${it.cls||''} ${i===cur?'cur':''}"><span>${i+1}</span><button class="qname" data-i="${i}" title="Load this track">${esc(it.name)}</button><span class="qstat">${it.status||(it.file.size/1048576).toFixed(1)+' MB'}</span><button class="qx" data-x="${i}" aria-label="Remove ${esc(it.name)}">✕</button></div>`).join('');
  $('#batchBtn').disabled=batching||queue.length<2;
}
$('#queue').addEventListener('click',e=>{if(batching)return;const x=e.target.closest('[data-x]'),l=e.target.closest('[data-i]');
  if(x){const i=+x.dataset.x;queue.splice(i,1);if(i===cur){cur=-1;if(queue.length)select(Math.min(i,queue.length-1));else unload();}else{if(i<cur)cur--;renderQueue();}}
  else if(l)select(+l.dataset.i);});
function unload(){track=null;pStop();P.bufs=null;renderQueue();['secScan','secPlan','secSpec','secExport'].forEach(s=>$('#'+s).classList.add('off'));$('#dock').classList.remove('show');}

function sniffRate(ab){
  const d=new DataView(ab),tag=o=>String.fromCharCode(d.getUint8(o),d.getUint8(o+1),d.getUint8(o+2),d.getUint8(o+3));
  try{
    if(tag(0)==='RIFF'&&tag(8)==='WAVE'){let o=12;while(o+8<d.byteLength){const sz=d.getUint32(o+4,true);if(tag(o)==='fmt ')return d.getUint32(o+12,true);o+=8+sz+(sz&1);}}
    if(tag(0)==='fLaC')return (d.getUint8(18)<<12)|(d.getUint8(19)<<4)|(d.getUint8(20)>>4);
  }catch(e){}
  return 48000;
}
async function decode(file){
  const ab=await file.arrayBuffer(), rate=clamp(sniffRate(ab),22050,96000);
  const OC=window.OfflineAudioContext||window.webkitOfflineAudioContext;
  const buf=await new OC(2,1,rate).decodeAudioData(ab);
  const L=buf.getChannelData(0).slice(),R=(buf.numberOfChannels>1?buf.getChannelData(1):buf.getChannelData(0)).slice();
  return {L,R,sr:buf.sampleRate};
}
async function select(i,quiet){
  if(i<0||i>=queue.length)return false; cur=i; const it=queue[i]; pStop(); P.bufs=null; $('#playBtn').disabled=true; renderQueue();
  $('#dock').classList.add('show'); dock('Decoding '+it.name,true);
  try{
    const a=await decode(it.file), n=a.L.length;
    const r=await call({type:'load',L:a.L,R:a.R,sr:a.sr},[a.L.buffer,a.R.buffer],(p,l)=>dock(l+' '+Math.round(p)+'%',true));
    track={name:it.name.replace(/\.[^.]+$/,'')||'track',sr:a.sr,n,dur:n/a.sr,scan:r.scan};
    const len=Math.min(30,track.dur); track.len=len; track.start=clamp(r.scan.busiest/a.sr,0,track.dur-len);
    if(autoOn())setVals(suggest(r.scan));
    showReport(); buildPlan(); ['secScan','secPlan','secSpec','secExport'].forEach(s=>$('#'+s).classList.remove('off'));
    if(!quiet)schedule(0); return true;
  }catch(err){it.status='could not read';it.cls='err';track=null;renderQueue();dock('Could not read '+it.name+'. Try the WAV download from Suno.',false);return false;}
}

/* ---------- diagnosis ---------- */
function showReport(){
  const s=track.scan;
  $('#trackMeta').textContent=`${track.name} · ${fmtT(track.dur)} · ${(track.sr/1000).toFixed(1)} kHz`;
  const tp=s.clips>0?'bad':s.tp>-0.3?'warn':'', rk=s.reach/1000;
  $('#facts').innerHTML=
    `<div class="fact"><span>Length</span>${fmtT(s.dur)}</div>`+
    `<div class="fact"><span><label for="bpmIn">Tempo, BPM</label></span><input type="number" id="bpmIn" min="60" max="200" step="0.1" value="${s.bpm||128}"></div>`+
    `<div class="fact"><span>32 beats / 8 bars</span><b id="f32"></b></div><div class="fact"><span>64 beats / 16 bars</span><b id="f64"></b></div>`+
    `<div class="fact"><span>Loudness</span>${s.lufs.toFixed(1)} LUFS</div>`+
    `<div class="fact ${tp}"><span>True peak</span>${s.tp.toFixed(1)} dBTP${s.clips?` · ${s.clips} clipped`:''}</div>`+
    `<div class="fact ${rk<15.5?'warn':''}"><span>Top end reaches</span>${rk.toFixed(1)} kHz</div>`+
    `<div class="fact"><span>Sample rate</span>${(track.sr/1000).toFixed(1)} kHz</div>`;
  const trim=()=>{const b=parseFloat($('#bpmIn').value)||128;$('#f32').textContent=(1920/b).toFixed(2)+' s';$('#f64').textContent=(3840/b).toFixed(2)+' s';};
  $('#bpmIn').addEventListener('input',trim); trim();
  drawTone(); drawWave(); placeRegion();
}
function headline(){
  const s=track.scan,sv=sev(s),nm={hiss:'a hiss bed',shim:'metallic shimmer',harsh:'a harsh 2 to 6 kHz range',fizz:'phasey stereo fizz'};
  const heavy=Object.keys(nm).filter(k=>sv[k]==='bad').map(k=>nm[k]),some=Object.keys(nm).filter(k=>sv[k]==='warn').map(k=>nm[k]),ts=toneSuggest(s),tg=parseFloat($('#lufs').value),d=tg-s.lufs;
  let h=`<b>${esc(track.name)}</b> runs ${fmtT(s.dur)}${s.bpm?` at about ${s.bpm} BPM`:''}. `;
  if(heavy.length)h+=`The main problem${heavy.length>1?'s are':' is'} <span class="bad">${listOf(heavy)}</span>${some.length?`, with <span class="warn">${listOf(some)}</span> as well`:''}. `;
  else if(some.length)h+=`It is in fair shape, with <span class="warn">${listOf(some)}</span> to clean up. `;
  else h+=`<span class="ok">It is a clean export</span> and needs only light repair. `;
  if(s.clips)h+=`The file is clipped in ${s.clips} places, which repair cannot fully undo. `;
  h+=ts?`Tonally, the ${listOf(ts.n.map((x,i)=>i?'the '+x:x))}. `:'Tonal balance is close to a typical club master. ';
  if(stepOn.loud)h+=`It sits at ${s.lufs.toFixed(1)} LUFS, ${Math.abs(d).toFixed(1)} dB ${d>=0?'quieter':'louder'} than your ${tg} LUFS target.`;
  $('#headline').innerHTML=h;
}
function drawTone(){
  if(!track)return; const [c,W]=sizeCanvas($('#cvTone'),170),H=170,d=dev(track.scan),x0=40,pw=W-x0-10,y0=14,ph=H-y0-40,R=15,Y=v=>y0+ph*(R-clamp(v,-R,R))/(2*R),bw=pw/7;
  c.fillStyle='rgba(74,222,128,.08)';c.fillRect(x0,Y(5),pw,Y(-5)-Y(5));
  c.font='10px JetBrains Mono, monospace';c.fillStyle='#8a94a2';c.strokeStyle='rgba(255,255,255,.08)';c.textAlign='right';
  [-10,-5,0,5,10].forEach(v=>{const y=Math.round(Y(v))+.5;c.beginPath();c.moveTo(x0,y);c.lineTo(W-10,y);c.stroke();c.fillText(sg(v,0),x0-6,y+3);});
  c.textAlign='center';
  d.forEach((v,i)=>{const x=x0+i*bw+bw*0.2,w=bw*0.6,a=Math.abs(v);c.fillStyle=a>9?'#ff4d5e':a>5?'#ffb302':'#b4bcc8';const y=Y(v);c.fillRect(x,Math.min(y,Y(0)),w,Math.max(2,Math.abs(y-Y(0))));
    c.fillStyle='#f4f6f9';c.fillText(sg(v,0)+' dB',x+w/2,v>=0?y-5:y+13);c.fillStyle='#b4bcc8';c.fillText(BN[i],x+w/2,H-22);c.fillStyle='#8a94a2';c.fillText(BR[i],x+w/2,H-9);});
}

/* ---------- fix plan ---------- */
function buildPlan(){
  if(!track)return; headline();
  const s=track.scan,sv=sev(s),v=id=>parseFloat($('#'+id).value),d=dev(s),ts=toneSuggest(s),hr=Math.round(-s.hissRel);
  const row=(k,cls,title,pill,find,doit,extra)=>`<div class="step ${cls} ${stepOn[k]?'':'isoff'}"><div class="s-main"><div class="s-title">${title}${pill?`<span class="pill">${pill}</span>`:''}</div><div class="s-find">${find}</div><div class="s-do">${doit}</div>${extra||''}</div><div class="s-res" id="res-${k}"></div><label class="switch"><input type="checkbox" data-step="${k}" ${stepOn[k]?'checked':''} aria-label="${title}: on or off"></label></div>`;
  const hf={bad:`A steady hiss bed sits ${hr} dB under the music. You will hear it in the intro, the breakdown and any fade.`,warn:`A hiss bed sits ${hr} dB under the music. It shows in quiet passages.`,ok:`Only a faint hiss bed, ${hr} dB under the music.`,none:'No steady hiss found.'}[sv.hiss];
  const sf={bad:`Strong narrow ringing between 7 and 15 kHz, standing ${s.shimmer.toFixed(0)} dB above the rest of the top end. This is the glassy Suno sheen.`,warn:`Noticeable narrow ringing between 7 and 15 kHz, ${s.shimmer.toFixed(0)} dB above the rest of the top end.`,ok:'Little ringing in the top end.'}[sv.shim];
  const xf=`The 2 to 6 kHz range sits ${sg(d[4],0)} dB against a typical club master.`+(sv.harsh==='ok'?' That is normal.':' Vocals and stabs will sound brittle.');
  const ff={bad:`The sides carry almost as much top end as the centre (${s.sideHF.toFixed(0)} dB). That is the phasey spray.`,warn:`Some top-end spray in the sides (${s.sideHF.toFixed(0)} dB against the centre).`,ok:'The top end sits mostly in the centre.'}[sv.fizz];
  const top=v('top'),mono=v('mono'),tg=v('lufs'),b=s.bpm;
  const hint=b>=165?'At this tempo it reads as drum and bass: Liquid / open keeps the breaks breathing.':b&&b<=123.5?'Around 122 BPM reads as deep or Afro house: Deep / warm suits it, or Club / DJ for peak-time sets.':'For your DJ sets pick Club / DJ. For SoundCloud or Spotify pick Streaming.';
  const lab={low:'low end',mud:'low-mids',pres:'presence',air:'air'};
  const chips='<div class="chips" id="masChips" style="--acc:var(--amber)">'+[['club','Club / DJ -7'],['stream','Streaming -9'],['deep','Deep / warm -10'],['liquid','Liquid / open -11'],['transparent','Transparent -13']].map(([k,l])=>`<button class="chip ${masKey===k?'on':''}" data-m="${k}">${l}</button>`).join('')+'</div>';
  $('#plan').innerHTML=
    row('hiss',sv.hiss==='none'?'ok':sv.hiss,'Hiss',SEVW[sv.hiss],hf,`turn the hiss down between the notes (De-hiss ${v('hiss')}%)`,`<button class="link" data-act="quiet">Audition the quietest moment, at ${fmtT(s.quietPos/track.sr)}</button>`)+
    row('shim',sv.shim,'Shimmer',SEVW[sv.shim],sf,`flatten the ringing peaks as they appear (De-shimmer ${v('shim')}%)`)+
    row('harsh',sv.harsh,'Harshness',SEVW[sv.harsh],xf,`smooth the sharpest peaks in that range (De-harsh ${v('harsh')}%)`)+
    row('fizz',sv.fizz,'Stereo fizz',SEVW[sv.fizz],ff,`turn down the sides above 8 kHz (${v('fizz')}%) and leave the centre alone`)+
    row('tidy','info','Tidy the edges','',`Content reaches ${(s.reach/1000).toFixed(1)} kHz. Club systems want the bass in the centre.`,`${top>=22?'leave the top open':'remove everything above '+top+' kHz'} and ${mono?'make the bass mono below '+mono+' Hz':'leave the bass width alone'}`)+
    row('tone',ts?'warn':'ok','Tone',ts?'Check':'Balanced',ts?`Against a typical club master the ${listOf(ts.n.map((x,i)=>i?'the '+x:x))}.`:'Tonal balance is close to a typical club master.',`shape the tone: low end ${sg(v('low'))} dB, low-mids ${sg(v('mud'))} dB, presence ${sg(v('pres'))} dB, air ${sg(v('air'))} dB`,ts?`<button class="link" data-act="tone">Use the suggested tone: ${Object.entries(ts.o).map(([k,x])=>lab[k]+' '+sg(x)+' dB').join(', ')}</button>`:'')+
    row('loud','info','Master to loudness','',`Exported at ${s.lufs.toFixed(1)} LUFS with peaks at ${s.tp.toFixed(1)} dBTP. Reaching ${tg} LUFS takes about ${sg(tg-s.lufs)} dB. ${hint}`,`glue, clip and limit to ${tg} LUFS under a ${v('ceil')} dBTP ceiling`,chips);
  fillResults();
}
function fillResults(){
  const set=(k,html)=>{const el=$('#res-'+k);if(el)el.innerHTML=stepOn[k]?html:'skipped';};
  if(!last||last.t!==track){Object.keys(stepOn).forEach(k=>set(k,'measuring'));return;}
  const r=last.r,big=(txt,flat)=>`<b class="${flat?'flat':''}">${txt}</b>`,dh=r.hissAfter-r.hissBefore,df=r.mFix.sideHF-r.mRaw.sideHF;
  set('hiss',big(dh.toFixed(1)+' dB',dh>-0.3)+'hiss at the quietest moment');
  set('shim',big(r.mRaw.shim.toFixed(1)+' to '+r.mFix.shim.toFixed(1),r.mRaw.shim-r.mFix.shim<0.3)+'shimmer index, lower is cleaner');
  set('harsh',big(r.mRaw.harsh.toFixed(1)+' to '+r.mFix.harsh.toFixed(1),r.mRaw.harsh-r.mFix.harsh<0.3)+'peak index, 2 to 6 kHz');
  set('fizz',big(df.toFixed(1)+' dB',df>-0.3)+'side highs against the centre');
  set('tidy',big('applied',true)); set('tone',big('applied',true)+'see the range chart below');
  set('loud',big(r.outLufs.toFixed(1)+' LUFS',false)+`peak ${r.outTp.toFixed(1)} dBTP · limiter ${r.gr.toFixed(1)} dB`);
}
$('#plan').addEventListener('change',e=>{const k=e.target.dataset.step;if(!k)return;stepOn[k]=e.target.checked;buildPlan();schedule(0);});
$('#plan').addEventListener('click',e=>{
  const m=e.target.closest('[data-m]'),a=e.target.closest('[data-act]'); if(!track||batching)return;
  if(m){masKey=m.dataset.m;setVals(MAS_PRE[masKey]);buildPlan();schedule(0);}
  else if(a&&a.dataset.act==='quiet'){track.start=clamp(track.scan.quietPos/track.sr-track.len/2,0,track.dur-track.len);placeRegion();P.offset=0;pSwitch('raw');schedule(0);$('#wave').scrollIntoView({block:'center',behavior:'smooth'});}
  else if(a&&a.dataset.act==='tone'){const ts=toneSuggest(track.scan);if(ts){setVals(ts.o);masKey=null;stepOn.tone=true;buildPlan();schedule(0);}}
});
function sizeCanvas(cv,h){const w=Math.max(300,Math.floor(cv.getBoundingClientRect().width)),dpr=window.devicePixelRatio||1;cv.width=w*dpr;cv.height=h*dpr;const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);return [c,w];}
function drawWave(){
  if(!track)return; const [c,W]=sizeCanvas($('#cvWave'),92),s=track.scan,H=92,mid=H/2,amp=H/2-5,cols=s.mins.length;
  c.fillStyle='rgba(180,188,200,.75)';
  for(let x=0;x<W;x++){const i=Math.min(cols-1,Math.floor(x/W*cols)),hi=s.maxs[i]*amp,lo=s.mins[i]*amp;c.fillRect(x,mid-hi,1,Math.max(1,hi-lo));}
}
function placeRegion(){const r=$('#region');r.style.left=(track.start/track.dur*100)+'%';r.style.width=(track.len/track.dur*100)+'%';}
$('#wave').addEventListener('click',e=>{if(!track||batching)return;const b=$('#wave').getBoundingClientRect();track.start=clamp((e.clientX-b.left)/b.width*track.dur-track.len/2,0,track.dur-track.len);placeRegion();P.offset=0;schedule(0);});

/* ---------- audition render ---------- */
let timer=null,rendering=false,dirty=false,last=null;
function schedule(ms){if(!track||batching)return;clearTimeout(timer);dock('Updating audition',true);timer=setTimeout(renderPreview,ms==null?350:ms);}
async function renderPreview(){
  if(!track||batching)return; if(rendering){dirty=true;return;} rendering=true;
  const t=track,p=params(),st=Math.round(t.start*t.sr),en=Math.min(t.n,st+Math.round(t.len*t.sr));
  try{
    const r=await call({type:'render',p,start:st,end:en,stages:true},[],(pc)=>dock('Updating audition '+Math.round(pc)+'%',true));
    if(t===track&&!batching){
      const mk=(l,rr)=>{const b=new AudioBuffer({length:l.length,numberOfChannels:2,sampleRate:r.sr});b.copyToChannel(l,0);b.copyToChannel(rr,1);return b;};
      const was=P.playing,pos=pPos(); pStop();
      P.bufs={raw:mk(r.rawL,r.rawR),fix:mk(r.L,r.R),rem:mk(r.remL,r.remR)}; P.dur=r.L.length/r.sr; P.offset=pos%P.dur;
      last={p,t,r:{inLufs:r.inLufs,outLufs:r.outLufs,outTp:r.outTp,gr:r.gr,removedDb:r.removedDb,specRaw:r.specRaw,specFix:r.specFix,mRaw:r.mRaw,mFix:r.mFix,hissBefore:r.hissBefore,hissAfter:r.hissAfter,heat:r.heat}};
      $('#playBtn').disabled=false; showStats(); showMeters(); drawSpec(); drawBands(); drawHeat(); fillResults(); if(was)pStart(P.offset);
      dock(`Audition ready · ${fmtT(t.start)} to ${fmtT(t.start+t.len)}`,false);
    }
  }catch(err){dock('Audition failed: '+err.message,false);}
  rendering=false; if(dirty){dirty=false;renderPreview();}
}
function dock(msg,work){const d=$('#dockStat');d.textContent=msg;d.classList.toggle('work',!!work);}
function showStats(){
  const {p,r}=last, parts=[`<span>Raw <b>${r.inLufs.toFixed(1)} LUFS</b></span>`,`<span>Fixed <b>${r.outLufs.toFixed(1)} LUFS</b> · <b>${r.outTp.toFixed(1)} dBTP</b></span>`];
  if(p.masterOn)parts.push(`<span>Limiter working <b>${r.gr.toFixed(1)} dB</b></span>`);
  if(p.repairOn)parts.push(`<span>Repair removed <b>${r.removedDb<-90?'nothing':r.removedDb.toFixed(0)+' dB'}</b>${r.removedDb<-90?'':' relative to the mix'}</span>`);
  if(p.masterOn&&r.outLufs<p.lufs-0.5)parts.push(`<span class="alert">Target not reached in this window. The limiter is already working ${r.gr.toFixed(0)} dB, so lower the target or raise the clipper. A quiet window such as a breakdown will also read low.</span>`);
  $('#statline').innerHTML=parts.join('');
}
function drawSpec(){
  if(!last)return; const [c,W]=sizeCanvas($('#cvSpec'),220),H=220,{r}=last,n=r.specRaw.length,hi=Math.min(22000,track.sr/2),lo=30;
  const sh=r.inLufs-r.outLufs, fx=Array.from(r.specFix,v=>v+sh), rw=Array.from(r.specRaw);
  let mx=-1e9; for(let i=0;i<n;i++)mx=Math.max(mx,rw[i],fx[i]); const top=mx+4,bot=top-66;
  const X=f=>36+(W-46)*Math.log(f/lo)/Math.log(hi/lo), Y=d=>10+(H-34)*(top-clamp(d,bot,top))/(top-bot);
  c.fillStyle='rgba(34,211,197,.06)'; c.fillRect(X(7000),10,X(Math.min(16000,hi))-X(7000),H-34);
  c.font='10px JetBrains Mono, monospace'; c.fillStyle='#8a94a2'; c.strokeStyle='rgba(255,255,255,.07)'; c.lineWidth=1;
  [50,100,200,500,1000,2000,5000,10000,16000].forEach(f=>{if(f>hi)return;const x=Math.round(X(f))+.5;c.beginPath();c.moveTo(x,10);c.lineTo(x,H-24);c.stroke();c.textAlign='center';c.fillText(f>=1000?(f/1000)+'k':f,x,H-10);});
  for(let d=Math.ceil(bot/12)*12;d<top;d+=12){const y=Math.round(Y(d))+.5;c.beginPath();c.moveTo(36,y);c.lineTo(W-10,y);c.stroke();c.textAlign='right';c.fillText(Math.round(d-top+4),30,y+3);}
  c.textAlign='left'; c.fillStyle='#22d3c5'; c.fillText('shimmer zone',X(7000)+6,22);
  const line=(a,col,w)=>{c.beginPath();for(let i=0;i<n;i++){const f=lo*Math.pow(hi/lo,i/(n-1)),x=X(f),y=Y(a[i]);i?c.lineTo(x,y):c.moveTo(x,y);}c.strokeStyle=col;c.lineWidth=w;c.stroke();};
  for(let i=0;i<n-1;i++){const f0=lo*Math.pow(hi/lo,i/(n-1)),f1=lo*Math.pow(hi/lo,(i+1)/(n-1)),df=(fx[i]+fx[i+1]-rw[i]-rw[i+1])/2;if(Math.abs(df)<0.25)continue;
    c.beginPath();c.moveTo(X(f0),Y(rw[i]));c.lineTo(X(f1),Y(rw[i+1]));c.lineTo(X(f1),Y(fx[i+1]));c.lineTo(X(f0),Y(fx[i]));c.closePath();c.fillStyle=df<0?'rgba(255,77,94,.55)':'rgba(74,222,128,.5)';c.fill();}
  line(rw,'rgba(180,188,200,.8)',1.25); line(fx,'#ffb302',1.75);
  c.fillStyle='rgba(180,188,200,.9)';c.fillText('— raw',46,H-32);c.fillStyle='#ffb302';c.fillText('— fixed',96,H-32);
}
window.addEventListener('resize',()=>{drawWave();drawTone();drawSpec();drawBands();drawHeat();});

function showMeters(){
  const r=last.r,m=(lbl,b,a,mn,mx,unit,d)=>{const w=x=>(c01((x-mn)/(mx-mn))*100).toFixed(1),dl=a-b;
    return `<div class="meter"><div class="lbl">${lbl}</div><div class="delta ${dl>-0.3?'flat':''}">${d||sg(dl)+unit}</div><div class="bar"><span>before</span><i style="width:${w(b)}%"></i><span>${b.toFixed(1)}</span></div><div class="bar after"><span>after</span><i style="width:${w(a)}%"></i><span>${a.toFixed(1)}</span></div></div>`;};
  $('#meters').innerHTML=m('Hiss, quietest moment',r.hissBefore,r.hissAfter,r.hissBefore-18,r.hissBefore+1,' dB')+m('Shimmer index',r.mRaw.shim,r.mFix.shim,3,18,'')+m('Harsh peaks, 2-6 kHz',r.mRaw.harsh,r.mFix.harsh,5,25,'')+m('Stereo fizz',r.mRaw.sideHF,r.mFix.sideHF,-24,0,' dB');
}
function drawBands(){
  if(!last)return; const [c,W]=sizeCanvas($('#cvBands'),170),H=170,{r}=last,n=r.specRaw.length,hi=Math.min(22000,track.sr/2),lo=30,sh=r.inLufs-r.outLufs;
  const E=[30,60,200,500,2000,6000,12000,20000],sum=new Array(7).fill(0),cnt=new Array(7).fill(0);
  for(let i=0;i<n;i++){const f=lo*Math.pow(hi/lo,i/(n-1));for(let b=0;b<7;b++)if(f>=E[b]&&f<E[b+1]){sum[b]+=r.specFix[i]+sh-r.specRaw[i];cnt[b]++;}}
  const d=sum.map((s,i)=>cnt[i]?s/cnt[i]:0),R=Math.max(3,Math.ceil(Math.max(...d.map(Math.abs))+1)),x0=40,pw=W-x0-10,y0=14,ph=H-y0-40,Y=v=>y0+ph*(R-clamp(v,-R,R))/(2*R),bw=pw/7;
  c.font='10px JetBrains Mono, monospace';c.strokeStyle='rgba(255,255,255,.08)';c.fillStyle='#8a94a2';c.textAlign='right';
  for(let v=-R;v<=R;v+=R>6?3:R>3?2:1){const y=Math.round(Y(v))+.5;c.beginPath();c.moveTo(x0,y);c.lineTo(W-10,y);c.stroke();c.fillText(sg(v,0),x0-6,y+3);}
  c.textAlign='center';
  d.forEach((v,i)=>{const x=x0+i*bw+bw*0.2,w=bw*0.6,y=Y(v);c.fillStyle=Math.abs(v)<0.25?'#39414d':v<0?'#ff4d5e':'#4ade80';c.fillRect(x,Math.min(y,Y(0)),w,Math.max(2,Math.abs(y-Y(0))));
    c.fillStyle='#f4f6f9';c.fillText(sg(v)+' dB',x+w/2,v>=0?y-5:y+13);c.fillStyle='#b4bcc8';c.fillText(BN[i],x+w/2,H-22);c.fillStyle='#8a94a2';c.fillText(BR[i],x+w/2,H-9);});
}
function drawHeat(){
  if(!last)return; const [c,W]=sizeCanvas($('#cvHeat'),200),H=200,h=last.r.heat,x0=40,pw=W-x0-10,ph=H-28;
  const off=document.createElement('canvas');off.width=h.cols;off.height=h.rows;const oc=off.getContext('2d'),im=oc.createImageData(h.cols,h.rows);
  for(let i=0;i<h.lvl.length;i++){const g=h.lvl[i]/255*150,k=Math.min(1,h.cut[i]/255*1.8),o=i*4;im.data[o]=g+(255-g)*k;im.data[o+1]=g+(77-g)*k;im.data[o+2]=g*1.08+(94-g*1.08)*k;im.data[o+3]=255;}
  oc.putImageData(im,0,0);c.imageSmoothingEnabled=true;c.drawImage(off,x0,8,pw,ph);
  c.font='10px JetBrains Mono, monospace';c.fillStyle='#8a94a2';c.textAlign='right';
  [2000,5000,10000,16000].forEach(f=>{if(f>h.hi)return;const y=8+ph*(1-Math.log(f/h.lo)/Math.log(h.hi/h.lo));c.fillText(f/1000+'k',x0-6,y+3);});
  c.textAlign='left';c.fillText(fmtT(track.start),x0,H-6);c.textAlign='right';c.fillText(fmtT(track.start+track.len),W-10,H-6);c.textAlign='center';c.fillText('time in the audition window',x0+pw/2,H-6);
}

/* ---------- player ---------- */
const AC=window.AudioContext||window.webkitAudioContext;
const P={ctx:null,src:null,which:'fix',playing:false,offset:0,t0:0,bufs:null,dur:1,raf:0};
function gainFor(w){if(!last||!$('#matchOn').checked)return 1;const d=last.r.outLufs-last.r.inLufs;return w==='fix'?(d>0?Math.pow(10,-d/20):1):(d<0?Math.pow(10,d/20):1);}
function pPos(){return P.playing?(((P.ctx.currentTime-P.t0)%P.dur)+P.dur)%P.dur:P.offset;}
function pStart(off){
  window.dispatchEvent(new CustomEvent('fix-room-playback',{detail:'repair'}));
  if(!P.bufs)return; if(!P.ctx)P.ctx=new AC(); P.ctx.resume();
  const s=P.ctx.createBufferSource(),g=P.ctx.createGain(); s.buffer=P.bufs[P.which]; s.loop=true; g.gain.value=gainFor(P.which);
  s.connect(g); g.connect(P.ctx.destination); off=off%P.dur; s.start(0,off); P.src=s; P.t0=P.ctx.currentTime-off; P.playing=true;
  $('#playBtn').textContent='Pause'; $('#ph').style.display='block'; tick();
}
function pStop(){if(P.src){P.offset=pPos();try{P.src.stop();}catch(e){}P.src.disconnect();P.src=null;}P.playing=false;cancelAnimationFrame(P.raf);$('#playBtn').textContent='Play';}
function tick(){if(!P.playing||!track)return;$('#ph').style.left=((track.start+pPos())/track.dur*100)+'%';P.raf=requestAnimationFrame(tick);}
function pSwitch(w){const was=P.playing;if(was)pStop();P.which=w;$$('#dock .seg button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.w===w));if(was)pStart(P.offset);}
$('#playBtn').addEventListener('click',()=>{P.playing?pStop():pStart(P.offset);});
$('#dock .seg').addEventListener('click',e=>{const b=e.target.closest('button');if(b)pSwitch(b.dataset.w);});
$('#matchOn').addEventListener('change',()=>{if(P.playing){pStop();pStart(P.offset);}});
document.addEventListener('keydown',e=>{
  if(e.target.matches('input,select,button,[role=button]')&&e.code==='Space'&&!e.target.matches('input[type=range]'))return;
  if(e.code==='Space'&&P.bufs){e.preventDefault();P.playing?pStop():pStart(P.offset);}
  else if(e.key==='1')pSwitch('raw'); else if(e.key==='2')pSwitch('fix'); else if(e.key==='3')pSwitch('rem');
});

/* ---------- print ---------- */
function encodeWAV(L,R,sr,bits){
  const n=L.length,bp=bits/8,data=n*2*bp,ab=new ArrayBuffer(44+data),v=new DataView(ab),w=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
  w(0,'RIFF');v.setUint32(4,36+data,true);w(8,'WAVE');w(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,2,true);
  v.setUint32(24,sr,true);v.setUint32(28,sr*2*bp,true);v.setUint16(32,2*bp,true);v.setUint16(34,bits,true);w(36,'data');v.setUint32(40,data,true);
  let o=44;
  if(bits===16){for(let i=0;i<n;i++){for(let c=0;c<2;c++){const s=(c?R:L)[i]*32767+(Math.random()-Math.random());v.setInt16(o,clamp(Math.round(s),-32768,32767),true);o+=2;}}}
  else{for(let i=0;i<n;i++){for(let c=0;c<2;c++){const s=clamp(Math.round((c?R:L)[i]*8388607),-8388608,8388607);v.setUint8(o,s&255);v.setUint8(o+1,(s>>8)&255);v.setUint8(o+2,(s>>16)&255);o+=3;}}}
  return ab;
}
function save(ab,name){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([ab],{type:'audio/wav'}));a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),20000);}
function prog(pct,label){$('#prog').classList.add('show');$('#pFill').style.width=clamp(pct,0,100)+'%';$('#pLabel').textContent=label;}
async function printTrack(prefix){
  const t=track,p=params();
  const r=await call({type:'render',p,start:0,end:t.n,stages:false},[],(pc,l)=>prog(pc,prefix+l+' '+Math.round(pc)+'%'));
  prog(99,prefix+'Writing WAV');
  save(encodeWAV(r.L,r.R,r.sr,+$('#fmt').value),t.name+(p.masterOn?'_fixed_master.wav':'_fixed.wav'));
  return {p,r,t};
}
function resultLine(o){
  const {p,r,t}=o, a=[`<span><b>${esc(t.name)}</b></span>`,`<span>${t.scan.lufs.toFixed(1)} to <b>${r.outLufs.toFixed(1)} LUFS</b></span>`,`<span>peak <b>${r.outTp.toFixed(1)} dBTP</b></span>`];
  if(p.masterOn){a.push(`<span>limiter ${r.gr.toFixed(1)} dB</span>`);if(r.outLufs<p.lufs-0.5)a.push(`<span class="alert">Stopped short of ${p.lufs} LUFS to avoid crushing the kick. Raise the clipper or lower the target.</span>`);}
  return a.join('');
}
function lock(on){batching=on;$('#fixBtn').disabled=on;$('#batchBtn').disabled=on||queue.length<2;}
$('#fixBtn').addEventListener('click',async()=>{
  if(!track||batching)return; clearTimeout(timer); lock(true); pStop(); $('#result').innerHTML='';
  try{const o=await printTrack('');$('#result').innerHTML=resultLine(o);prog(100,'Downloaded '+o.t.name);if(queue[cur]){queue[cur].status='fixed';queue[cur].cls='done';}}
  catch(err){prog(0,'Render failed: '+err.message);}
  lock(false); renderQueue(); dock('Audition ready',false);
});
$('#batchBtn').addEventListener('click',async()=>{
  if(batching||queue.length<2)return; clearTimeout(timer); lock(true); pStop(); const lines=[]; $('#result').innerHTML='';
  for(let i=0;i<queue.length;i++){
    const it=queue[i]; it.status='working';it.cls='active'; prog(0,`Track ${i+1} of ${queue.length}: loading`);
    try{ if(!(await select(i,true)))throw new Error('unreadable'); it.status='working';it.cls='active';renderQueue();
      const o=await printTrack(`Track ${i+1} of ${queue.length}: `); lines.push(resultLine(o)); it.status='fixed';it.cls='done';
      await new Promise(r=>setTimeout(r,400));
    }catch(err){it.status='failed';it.cls='err';}
    renderQueue(); $('#result').innerHTML=lines.map(l=>`<span style="flex-basis:100%;display:flex;flex-wrap:wrap;gap:6px 18px">${l}</span>`).join('');
  }
  prog(100,`Batch finished: ${lines.length} of ${queue.length} downloaded`); lock(false); renderQueue(); schedule(0);
});
window.addEventListener('fix-room-playback',e=>{if(e.detail==='comparison')pStop();});
window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===parent&&e.data?.type==='studio-tool-visibility'&&!e.data.visible)pStop();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pStop();});
renderQueue();
window.__fixroom={addFiles};
})();
