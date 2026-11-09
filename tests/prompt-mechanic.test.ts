import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POST } from '../api/song-creator/prompt';

test('prompt generation protects access, preserves refinement context and rejects incomplete output', async () => {
  const previousPassword=process.env.ADMIN_PASSWORD, originalFetch=globalThis.fetch;
  process.env.ADMIN_PASSWORD='test-password';
  const request=(body:object,origin='https://studio.test')=>new Request('https://studio.test/api/song-creator/prompt',{method:'POST',headers:{authorization:'Basic '+btoa('admin:test-password'),origin},body:JSON.stringify(body)});
  const body={key:'test-key',reference:'bongo drum',current:'Dry bongo loop',refinement:'Add swing'};
  try {
    assert.equal((await POST(new Request('https://studio.test/api/song-creator/prompt',{method:'POST'}))).status,401);
    assert.equal((await POST(request(body,'https://elsewhere.test'))).status,403);
    assert.equal((await POST(request({...body,reference:''}))).status,400);
    globalThis.fetch=async (_url,init)=>{
      const payload=JSON.parse(String(init?.body));
      assert.deepEqual(JSON.parse(payload.messages[1].content),{reference:body.reference,current:body.current,refinement:body.refinement});
      return Response.json({choices:[{finish_reason:'stop',message:{content:'Dry syncopated bongo loop with swung accents'}}]});
    };
    const result=await POST(request(body));
    assert.equal(result.status,200);
    assert.equal((await result.json()).style,'Dry syncopated bongo loop with swung accents');
    globalThis.fetch=async()=>Response.json({choices:[{finish_reason:'length',message:{content:'unfinished'}}]});
    assert.equal((await POST(request(body))).status,502);
    globalThis.fetch=async()=>new Response(null,{status:429});
    assert.equal((await POST(request(body))).status,429);
  } finally {
    globalThis.fetch=originalFetch;
    if(previousPassword===undefined)delete process.env.ADMIN_PASSWORD;else process.env.ADMIN_PASSWORD=previousPassword;
  }
});
