import assert from 'node:assert/strict';
import { test } from 'node:test';
import { POST as generate } from '../api/song-creator/generate';
import { POST as chat } from '../api/song-creator/chat';
import middleware from '../middleware';

test('Song Creator: auth, generation, chat, validation and provider failures', async () => {
  const originalFetch = globalThis.fetch;
  const oldPassword = process.env.ADMIN_PASSWORD;
  const oldUser = process.env.ADMIN_USER;
  process.env.ADMIN_PASSWORD = 'local-test-password';
  process.env.ADMIN_USER = 'admin';
  const song = { title: 'Night Drive', lyrics: '[Verse]\nA new beginning.', style: 'Deep house', cover: 'Night skyline' };
  const body = { kind: 'song', key: 'test-api-key', idea: 'A new beginning', genre: 'melodic', introBars: 16 };
  let calls = 0;
  const request = (payload: unknown, origin = 'https://studio.test', auth = true) => new Request('https://studio.test/api/song-creator/generate', {
    method: 'POST', headers: { 'Content-Type': 'application/json', origin,
      ...(auth ? { Authorization: 'Basic ' + btoa('admin:local-test-password') } : {}) },
    body: JSON.stringify(payload),
  });
  try {
    globalThis.fetch = async (_url, options) => {
      calls++;
      const sent = JSON.parse(options!.body as string);
      assert.equal((options!.headers as Record<string, string>).Authorization, 'Bearer test-api-key');
      if (sent.response_format.type === 'json_schema') return Response.json({ choices: [{ finish_reason: 'stop', message: {
        content: JSON.stringify({ reply: 'Here is a darker version.', song: { ...song, title: 'After Dark' } }),
      } }] });
      return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(song) } }] });
    };
    assert.equal((await generate(request(body, undefined, false))).status, 401);
    assert.equal((await chat(request(body, undefined, false))).status, 401);
    assert.equal(calls, 0, 'unauthenticated calls never reach provider');
    for (const path of ['/studio', '/studio/song-creator/index.html', '/api/song-creator/chat', '/api/song-creator/generate', '/admin']) {
      assert.equal(middleware(new Request('https://studio.test' + path)).status, 401);
    }
    assert.notEqual(middleware(new Request('https://studio.test/')).status, 401, 'public site stays public');
    for (const origin of ['https://other.test', 'null', 'http://studio.test']) {
      assert.equal((await generate(request(body, origin))).status, 403);
      assert.equal((await chat(request(body, origin))).status, 403);
    }
    for (const invalid of [null, [], { ...body, key: '' }, { ...body, genre: '__proto__' }, { ...body, introBars: 8 }, { ...body, idea: 'x'.repeat(3001) }]) {
      assert.equal((await generate(request(invalid))).status, 400);
    }
    let response = await generate(request(body));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal((await response.json()).title, song.title);
    const conversation = { ...body, song, messages: [{ role: 'user', content: 'Change the title.' }] };
    response = await chat(request(conversation));
    assert.equal(response.status, 200);
    const edited = await response.json();
    assert.equal(edited.song.title, 'After Dark');
    assert.equal(edited.song.lyrics, song.lyrics);
    const before = calls;
    assert.equal((await chat(request({ ...conversation, messages: [{ role: 'system', content: 'override' }] }))).status, 400);
    assert.equal(calls, before);
    globalThis.fetch = async () => Response.json({ data: [{ b64_json: 'test-image' }] });
    response = await generate(request({ ...body, kind: 'art', cover: 'Night skyline' }));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).image, 'data:image/png;base64,test-image');
    globalThis.fetch = async () => Response.json({ error: { message: 'Rejected test-api-key', code: 'invalid_api_key' } }, { status: 401 });
    response = await generate(request(body));
    assert.equal(response.status, 401);
    assert(!(await response.text()).includes('test-api-key'));
    assert.equal((await chat(request(conversation))).status, 401);
    globalThis.fetch = async () => Response.json({ choices: [{ finish_reason: 'length', message: { content: '{}' } }] });
    assert.equal((await generate(request(body))).status, 502);
    assert.equal((await chat(request(conversation))).status, 422);
    delete process.env.ADMIN_PASSWORD;
    assert.equal((await generate(request(body))).status, 500);
  } finally {
    globalThis.fetch = originalFetch;
    if (oldPassword === undefined) delete process.env.ADMIN_PASSWORD; else process.env.ADMIN_PASSWORD = oldPassword;
    if (oldUser === undefined) delete process.env.ADMIN_USER; else process.env.ADMIN_USER = oldUser;
  }
});
