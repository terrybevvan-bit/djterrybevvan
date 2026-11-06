const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const script=fs.readFileSync(require('node:path').join(__dirname,'../studio/track-store.js'),'utf8');
const legacy={id:'legacy',title:'Existing track',lyrics:'Original words',savedAt:1};
let stored=JSON.stringify([legacy]),blocked=false;
function open(){
  const window={dispatchEvent(){},parent:null};window.parent=window;
  vm.runInNewContext(script,{window,Event,Date,Math,localStorage:{
    getItem(){return stored;},setItem(_key,value){if(blocked)throw Error('Storage full');stored=value;}
  }});
  return window.TrackStore;
}
let store=open();
const id=store.save({source:'song-creator',title:'New song',lyrics:'New words',style:'Deep house',cover:'Teal skyline',genreKey:'melodic',introBars:32});
assert.equal(store.count(),2);assert.equal(store.get('legacy').lyrics,'Original words');
store.save({...store.get(id),title:'Edited song'});assert.equal(store.count(),2,'updating must not duplicate');
store=open();assert.equal(store.get(id).title,'Edited song','saved song must survive a new page context');
assert.equal(store.get(id).introBars,32);assert.equal(store.get(id).cover,'Teal skyline');
const before=stored;blocked=true;
assert.throws(()=>store.save({title:'Must not report saved'}));assert.equal(stored,before);
blocked=false;stored='{broken';assert.equal(store.count(),0,'damaged storage must not crash the studio');
assert.throws(()=>store.save({title:'Do not overwrite damaged library'}));assert.equal(stored,'{broken');
console.log('Track store tests passed: existing library, update, reload, quota and damaged-storage protection.');
