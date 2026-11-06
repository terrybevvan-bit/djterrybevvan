const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../studio/index.html'), 'utf8');
const start = html.indexOf("  $('#playRawBtn').addEventListener");
const end = html.indexOf('  // ---------- WAV ENCODER', start);
assert(start >= 0 && end > start, 'comparison transport must exist');
const elements = new Map();
const $ = id => {
  if (!elements.has(id)) elements.set(id, {
    style: {}, classList: { toggle() {}, remove() {} },
    addEventListener() {}, setAttribute() {},
  });
  return elements.get(id);
};
const sources = [];
const clock = { currentTime: 0, state: 'running', destination: {},
  createBufferSource() {
    const source = { connect() {}, disconnect() {}, stop() {},
      start(_, offset) { this.offset = offset; } };
    sources.push(source);
    return source;
  },
};
const context = vm.createContext({ $, clock, Math,
  AC: function () { return clock; },
  requestAnimationFrame() { return 1; }, cancelAnimationFrame() {},
  fmtTime: seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`,
});
vm.runInContext(`
  let masteredBuffer={duration:60}, audioBuffer={duration:60};
  let cmpCtx=null, cmpSource=null, cmpPlaying=false, cmpWhich=null,
      cmpStartedAt=0, cmpOffset=0, cmpRaf=null;
  ${html.slice(start, end)}
`, context);
const run = code => vm.runInContext(code, context);
run('seekCompare(25); playCompare("raw")');
assert.equal(sources.at(-1).offset, 25, 'start at selected position');
clock.currentTime = 3;
run('playCompare("mst")');
assert.equal(sources.at(-1).offset, 28, 'A/B switch preserves elapsed position');
const oldSource = sources.at(-1);
run('seekCompare(8)');
assert.equal(sources.at(-1).offset, 8, 'seek backward while playing');
assert.equal(oldSource.onended, null, 'replaced sources cannot reset the new position');
run('seekCompare(45)');
assert.equal(sources.at(-1).offset, 45, 'seek forward while playing');
assert.equal($('#phRaw').style.left, $('#phMst').style.left, 'playheads stay aligned');
run('seekCompare(100)');
assert.equal(run('comparePosition()'), 60, 'clamp to track end');
assert.equal(run('cmpPlaying'), false, 'end seek stops playback');
run('playCompare("raw")');
assert.equal(sources.at(-1).offset, 0, 'replay from end starts at beginning');
run('stopCompare(); seekCompare(-10)');
assert.equal(run('comparePosition()'), 0, 'clamp to track start');
assert.equal($('#cmpCurrent').textContent, '0:00');
run('masteredBuffer=null; seekCompare(20)');
assert.equal(run('comparePosition()'), 0, 'ignore seeking before comparison is built');
console.log('Comparison transport tests passed.');
