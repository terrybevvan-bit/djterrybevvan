/* Audition gain affects only the removed-sound preview, never the master. */
(function(root){
  function prepareRemoved(original,cleaned,boost){
    const channels=original.map((a,c)=>Float32Array.from(a,(v,i)=>v-cleaned[c][i]));
    let peak=0,power=0,sourcePower=0,count=0;
    channels.forEach((a,c)=>{for(let i=0;i<a.length;i++){
      peak=Math.max(peak,Math.abs(a[i]));power+=a[i]*a[i];
      sourcePower+=original[c][i]*original[c][i];count++;
    }});
    const rms=Math.sqrt(power/Math.max(1,count)),sourceRms=Math.sqrt(sourcePower/Math.max(1,count));
    const negligible=peak<1e-7 || rms<Math.max(1e-9,sourceRms*1e-5);
    // Shared gain preserves stereo; cap at +24 dB and leave 12 dB peak headroom.
    const gain=boost&&!negligible?Math.max(1,Math.min(Math.pow(10,24/20),Math.pow(10,-12/20)/Math.max(peak,1e-20))):1;
    if(gain!==1)for(const a of channels)for(let i=0;i<a.length;i++)a[i]*=gain;
    return {channels,negligible,rmsDb:20*Math.log10(Math.max(rms,1e-20)),gainDb:20*Math.log10(gain)};
  }
  root.TerryCleanupAudition={prepareRemoved};
  if(typeof module!=='undefined')module.exports={prepareRemoved};
})(typeof window!=='undefined'?window:globalThis);
