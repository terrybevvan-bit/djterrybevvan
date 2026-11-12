const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'../studio/fix-room');
// Exercise the supplied engine through its Worker protocol, including exact bypass.
const engine=vm.createContext({Float32Array,Float64Array,Math});
vm.runInContext(fs.readFileSync(path.join(root,'fix-room-engine.js'),'utf8'),engine);
const sr=24000,L=Float32Array.from({length:sr*2},(_,i)=>0.1*Math.sin(2*Math.PI*440*i/sr)),R=L.slice();
let reply;
engine.handle({type:'load',id:1,L,R,sr},m=>{if(m.type!=='progress')reply=m;});
assert.equal(reply.type,'loaded');assert(Number.isFinite(reply.scan.lufs));
engine.handle({type:'render',id:2,p:{repairOn:false,masterOn:false},start:100,end:sr,stages:true},m=>{if(m.type!=='progress')reply=m;});
assert.equal(reply.type,'rendered');assert.deepEqual(Array.from(reply.L),Array.from(L.slice(100,sr)));
assert(reply.remL.every(v=>v===0));

// Test A/B transport against a controllable audio clock.
const elements=new Map(),events={},sources=[],gains=[];
function element(id){if(!elements.has(id))elements.set(id,{value:0,checked:true,files:[],addEventListener(type,fn){this[type]=fn;},setAttribute(key,val){this[key]=val;}});return elements.get(id);}
const clock={currentTime:0,destination:{},resume:()=>Promise.resolve(),
 createBufferSource(){const s={connect(){},disconnect(){},stop(){},start(_,offset,duration){this.offset=offset;this.duration=duration;}};sources.push(s);return s;},
 createGain(){const g={gain:{value:1},connect(){},disconnect(){}};gains.push(g);return g;}};
let code=fs.readFileSync(path.join(root,'compare.js'),'utf8');
code=code.replace('  function controls()',"  globalThis.test={slots,setClock(){ctx=clock;},switchTo,start,stop,position};\n  function controls()");
const context=vm.createContext({document:{getElementById:element,addEventListener(){}},window:{addEventListener(type,fn){events[type]=fn;},dispatchEvent(){}},CustomEvent:function(type,init){this.type=type;this.detail=init.detail;},requestAnimationFrame:()=>1,cancelAnimationFrame(){},clock,Math,Number});
vm.runInContext(code,context);
const t=context.test;t.setClock();t.slots.A={buffer:{duration:60},lufs:-10};t.slots.B={buffer:{duration:55},lufs:-7};
t.start();clock.currentTime=3;t.switchTo('B');
assert.equal(sources.at(-1).offset,3,'switch preserves playback position');
assert.equal(sources.at(-1).duration,52,'stop at the shorter export');
assert(Math.abs(gains.at(-1).gain.value-Math.pow(10,-3/20))<1e-9,'attenuate louder master by measured LUFS difference');
element('abSeek').value=20;element('abSeek').input({target:element('abSeek')});
assert.equal(sources.at(-1).offset,20,'seek uses requested position while playing');
element('abMatch').checked=false;element('abMatch').change();assert.equal(gains.at(-1).gain.value,1,'match can be bypassed');
events['fix-room-playback']({detail:'repair'});assert.equal(element('abPlay').textContent,'Play comparison','repair and comparison do not play together');
console.log('Fix Room engine bypass, A/B timing, seeking and loudness matching passed.');
