import assert from 'node:assert/strict';
import {test} from 'node:test';
import {POST} from '../api/song-creator/trends';
const sourceA='https://splice.com/trends',sourceB='https://www.midiaresearch.com/sounds-of-2026';
const report={summary:'Two independent publisher snapshots.',coverage:'2025 creator data; not live charts.',
  sources:[{url:sourceA,title:'Splice',publishedAt:'Not stated',period:'2025'},{url:sourceB,title:'MIDiA',publishedAt:'Not stated',period:'2025'}],
  cards:Array.from({length:3},(_,i)=>({genre:'Genre '+i,signal:'Creator activity',category:'rising',evidence:'A documented signal.',productionTip:'Leave rhythmic space.',sourceUrls:[sourceA,sourceB]}))};
test('Trends research requires auth, actual search, consulted citations and complete output',async()=>{
  const oldFetch=globalThis.fetch,oldPassword=process.env.ADMIN_PASSWORD,oldUser=process.env.ADMIN_USER;
  process.env.ADMIN_PASSWORD='local-password';process.env.ADMIN_USER='admin';let calls=0;
  const request=(key='local-key',auth=true,origin='https://studio.test')=>new Request('https://studio.test/api/song-creator/trends',{method:'POST',headers:{origin,'Content-Type':'application/json',...(auth?{authorization:'Basic '+btoa('admin:local-password')}:{})},body:JSON.stringify({key})});
  const result=(value:unknown,searched=true)=>({status:'completed',output:[...(searched?[{type:'web_search_call',status:'completed',action:{sources:[{url:sourceA},{url:sourceB}]}}]:[]),{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}]});
  try{
    globalThis.fetch=async(_url,options)=>{calls++;const payload=JSON.parse(options!.body as string);assert.equal(payload.store,false);assert.equal(payload.tool_choice,'required');assert.equal(payload.tools[0].type,'web_search');assert(payload.include.includes('web_search_call.action.sources'));return Response.json(result(report));};
    assert.equal((await POST(request('local-key',false))).status,401);assert.equal(calls,0);
    assert.equal((await POST(request('local-key',true,'https://other.test'))).status,403);
    assert.equal((await POST(request(''))).status,400);assert.equal(calls,0);
    let response=await POST(request());assert.equal(response.status,200);const body=await response.json();assert.match(body.reviewedOn,/^\d{4}-\d{2}-\d{2}$/);assert.equal(body.cards.length,3);assert(!(JSON.stringify(body)).includes('local-key'));
    globalThis.fetch=async()=>Response.json(result(report,false));assert.equal((await POST(request())).status,502,'must not present unsourced model memory as research');
    globalThis.fetch=async()=>Response.json(result({...report,sources:[{...report.sources[0],url:'https://splice.com/invented'},report.sources[1]]}));assert.equal((await POST(request())).status,502,'reject invented source URLs');
    globalThis.fetch=async()=>Response.json(result({...report,cards:[{...report.cards[0],sourceUrls:['javascript:alert(1)']},...report.cards.slice(1)]}));assert.equal((await POST(request())).status,502);
    globalThis.fetch=async()=>Response.json({status:'incomplete',output:[]});assert.equal((await POST(request())).status,502);
    globalThis.fetch=async()=>Response.json({error:{message:'private local-key'}},{status:401});response=await POST(request());assert.equal(response.status,401);assert(!(await response.text()).includes('local-key'));
  }finally{globalThis.fetch=oldFetch;if(oldPassword===undefined)delete process.env.ADMIN_PASSWORD;else process.env.ADMIN_PASSWORD=oldPassword;if(oldUser===undefined)delete process.env.ADMIN_USER;else process.env.ADMIN_USER=oldUser;}
});
