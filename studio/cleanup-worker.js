/* Local, phase-preserving spectral cleanup. No audio leaves this device. */
'use strict';
function fft(re, im, inverse) {
  const n = re.length;
  for (let i=1,j=0;i<n;i++) {
    let bit=n>>1; for (;j&bit;bit>>=1) j^=bit; j^=bit;
    if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]];}
  }
  for(let size=2;size<=n;size*=2){
    const angle=(inverse?2:-2)*Math.PI/size, wr=Math.cos(angle), wi=Math.sin(angle);
    for(let start=0;start<n;start+=size){
      let ar=1,ai=0;
      for(let j=0;j<size/2;j++){
        const a=start+j,b=a+size/2,tr=ar*re[b]-ai*im[b],ti=ar*im[b]+ai*re[b];
        re[b]=re[a]-tr;im[b]=im[a]-ti;re[a]+=tr;im[a]+=ti;
        const next=ar*wr-ai*wi;ai=ar*wi+ai*wr;ar=next;
      }
    }
  }
  if(inverse)for(let i=0;i<n;i++){re[i]/=n;im[i]/=n;}
}
function cleanup(channels, sampleRate, params, progress=()=>{}) {
  if(!channels.length || channels.some(c=>c.length!==channels[0].length)) throw Error('Invalid audio channels');
  const length=channels[0].length, n=2048, hop=512, bins=n/2+1;
  const noise=Math.max(0,Math.min(100,params.noise||0))/100;
  const shimmer=Math.max(0,Math.min(100,params.shimmer||0))/100;
  const click=Math.max(0,Math.min(100,params.click||0))/100;
  const audio=channels.map(c=>new Float32Array(c)); let repaired=0;
  // Repair only isolated impulses with a large deviation from BOTH neighbours.
  // Longer transients are deliberately left alone to protect drums.
  if(click)for(const a of audio){
    const original=a.slice();
    for(let i=2;i<length-2;i++){
      const mid=(original[i-1]+original[i+1])/2;
      const local=Math.max(Math.abs(original[i-1]-original[i-2]),Math.abs(original[i+2]-original[i+1]),.002);
      if(Math.abs(original[i]-mid)>Math.max(.12,local*(12-6*click)) && Math.abs(original[i-1]-original[i+1])<local*2){
        a[i]=original[i]+click*(mid-original[i]);repaired++;
      }
    }
  }
  if(!noise&&!shimmer)return {channels:audio,repaired};
  const win=Float64Array.from({length:n},(_,i)=>.5-.5*Math.cos(2*Math.PI*i/n));
  function spectrum(a,start){
    const re=new Float64Array(n),im=new Float64Array(n);
    for(let i=0;i<n;i++)re[i]=(a[start+i]||0)*win[i];
    fft(re,im,false);return {re,im};
  }
  // Sample the whole track with bounded memory; select quiet frames in two passes.
  const candidates=[], step=Math.max(hop,Math.floor(length/500/hop)*hop);
  for(let start=0;start+n<=length;start+=step){
    let power=0;for(const a of audio)for(let i=0;i<n;i++)power+=a[start+i]*a[start+i];
    candidates.push({start,power});
  }
  candidates.sort((a,b)=>a.power-b.power);
  const chosen=candidates.slice(0,Math.max(1,Math.ceil(candidates.length*.12)));
  const profile=new Float64Array(bins);
  for(const frame of chosen)for(const a of audio){
    const {re,im}=spectrum(a,frame.start);
    for(let k=0;k<bins;k++)profile[k]+=(re[k]*re[k]+im[k]*im[k])/(chosen.length*audio.length);
  }
  const out=audio.map(()=>new Float32Array(length)),norm=new Float64Array(length);
  const previous=new Float64Array(bins).fill(1),floor=Math.pow(10,-7/20);
  let frame=0;const total=Math.ceil((length+n)/hop);
  // Pad BOTH edges, then normalize weighted overlap-add for sample alignment.
  for(let start=-n+hop;start<length;start+=hop){
    const spectra=audio.map(a=>spectrum(a,start)),power=new Float64Array(bins),gain=new Float64Array(bins);
    for(const {re,im} of spectra)for(let k=0;k<bins;k++)power[k]+=(re[k]*re[k]+im[k]*im[k])/audio.length;
    for(let k=0;k<bins;k++){
      const hz=k*sampleRate/n;
      const strength=noise + shimmer*Math.max(0,Math.min(1,(hz-4500)/2500));
      gain[k]=Math.max(floor,Math.sqrt(Math.max(0,1-Math.min(1.8,strength)*profile[k]/(power[k]+1e-20))));
    }
    // One shared mask protects stereo placement; smoothing limits musical noise.
    for(let k=0;k<bins;k++){
      const target=(gain[Math.max(0,k-1)]+2*gain[k]+gain[Math.min(bins-1,k+1)])/4;
      previous[k]=.65*previous[k]+.35*target;
    }
    for(let c=0;c<audio.length;c++){
      const {re,im}=spectra[c];
      for(let k=0;k<n;k++){const g=previous[k<=n/2?k:n-k];re[k]*=g;im[k]*=g;}
      fft(re,im,true);
      for(let i=0;i<n;i++){const pos=start+i;if(pos>=0&&pos<length)out[c][pos]+=re[i]*win[i];}
    }
    for(let i=0;i<n;i++){const pos=start+i;if(pos>=0&&pos<length)norm[pos]+=win[i]*win[i];}
    if(++frame%100===0)progress(Math.min(99,Math.round(frame/total*100)));
  }
  for(const a of out)for(let i=0;i<length;i++)a[i]/=norm[i]||1;
  return {channels:out,repaired};
}
self.onmessage=({data})=>{
  try{
    const result=cleanup(data.channels.map(b=>new Float32Array(b)),data.sampleRate,data.params,pct=>self.postMessage({progress:pct}));
    self.postMessage(result,result.channels.map(c=>c.buffer));
  }catch(error){self.postMessage({error:error.message});}
};
