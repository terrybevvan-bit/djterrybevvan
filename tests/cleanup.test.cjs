const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const context={self:{},Float32Array,Float64Array,Math};
vm.createContext(context);
vm.runInContext(readFileSync(require('node:path').join(__dirname,'../studio/cleanup-worker.js'),'utf8'),context);
const clean=(channels,params)=>context.cleanup(channels,48000,params);
const rms=a=>Math.sqrt(a.reduce((sum,v)=>sum+v*v,0)/a.length);
let seed=42;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296*2-1;};
const noise=Float32Array.from({length:48000},()=>random()*.015);
const bypass=clean([noise],{}).channels[0];
assert.deepEqual(Array.from(bypass),Array.from(noise),'bypass must preserve samples');
for(const len of [1,100,2048,5000]){
  const silence=clean([new Float32Array(len)],{noise:100,shimmer:100}).channels[0];
  assert.equal(silence.length,len);assert(silence.every(v=>v===0),'silence must stay silent');
}
const reduced=clean([noise,noise],{noise:70,shimmer:30}).channels;
const reduction=20*Math.log10(rms(reduced[0])/rms(noise));
assert(reduction<-.8 && reduction>-7.1,`expected bounded noise reduction, got ${reduction}`);
assert.deepEqual(Array.from(reduced[0]),Array.from(reduced[1]),'identical stereo must stay identical');
const tone=Float32Array.from({length:48000},(_,i)=>i<12000?0:.3*Math.sin(2*Math.PI*440*i/48000));
const reconstructed=clean([tone],{noise:100}).channels[0];
const error=rms(Float32Array.from(tone,(v,i)=>v-reconstructed[i]));
assert(error<1e-6,`zero noise profile must reconstruct music, error ${error}`);
const impulse=new Float32Array(5000);impulse[2500]=.9;
const repaired=clean([impulse],{click:100});
assert.equal(repaired.channels[0][2500],0);assert.equal(repaired.repaired,1);
const transient=new Float32Array(5000);transient.fill(.8,2500,2510);
assert.deepEqual(Array.from(clean([transient],{click:100}).channels[0]),Array.from(transient),'multi-sample transient preserved');
// FFT round-trip validates phase and amplitude reconstruction independently.
const re=Float64Array.from({length:2048},()=>random()),original=re.slice(),im=new Float64Array(2048);
context.fft(re,im,false);context.fft(re,im,true);
assert(Math.max(...re.map((v,i)=>Math.abs(v-original[i])))<1e-10);
console.log(`Cleanup tests passed. Stationary-noise reduction: ${reduction.toFixed(2)} dB; reconstruction RMS error: ${error.toExponential(2)}.`);
