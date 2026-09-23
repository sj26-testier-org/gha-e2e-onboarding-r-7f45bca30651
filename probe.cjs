const fs = require('fs');
const crypto = require('crypto');
const cp = require('child_process');
const assert = require('assert/strict');
function canonical(x) {
  if (Array.isArray(x)) return '[' + x.map(canonical).join(',') + ']';
  if (x && typeof x === 'object') return '{' + Object.keys(x).sort().map(k => JSON.stringify(k)+':'+canonical(x[k])).join(',') + '}';
  return JSON.stringify(x);
}
const bytes = fs.readFileSync(process.env.GITHUB_EVENT_PATH);
const event = JSON.parse(bytes);
const head = cp.execFileSync('git', ['rev-parse', 'HEAD'], {encoding:'utf8'}).trim();
const marker = fs.readFileSync('source-marker.txt','utf8').trim();
const expressionEvent = JSON.parse(process.env.EXPR_EVENT);
const result = {
  case: process.env.LAB_CASE, event_name: process.env.GITHUB_EVENT_NAME,
  action: event.action ?? null, ref: process.env.GITHUB_REF, sha: process.env.GITHUB_SHA,
  repository: process.env.GITHUB_REPOSITORY, workflow: process.env.GITHUB_WORKFLOW,
  workflow_ref: process.env.GITHUB_WORKFLOW_REF, workflow_sha: process.env.GITHUB_WORKFLOW_SHA,
  run_id: process.env.GITHUB_RUN_ID, run_attempt: process.env.GITHUB_RUN_ATTEMPT,
  checkout_sha: head, marker, expression_ref: process.env.EXPR_REF,
  expression_sha: process.env.EXPR_SHA, expression_action: process.env.EXPR_ACTION,
  event_path: process.env.GITHUB_EVENT_PATH,
  canonical_event_sha256: crypto.createHash('sha256').update(canonical(event)).digest('hex'),
  raw_event_sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
  expression_event_sha256: crypto.createHash('sha256').update(canonical(expressionEvent)).digest('hex'),
  executed_marker: crypto.createHash('sha256').update(marker + '\0' + head + '\0' + process.env.LAB_CASE).digest('hex'),
};
fs.mkdirSync('evidence',{recursive:true});
fs.writeFileSync('evidence/event.json',bytes);
fs.writeFileSync('evidence/probe.json', JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
assert.equal(head, process.env.GITHUB_SHA);
assert.equal(process.env.EXPR_SHA, head);
assert.equal(process.env.EXPR_REF, process.env.GITHUB_REF);
assert.equal(process.env.EXPR_ACTION, event.action ?? '');
assert.equal(canonical(expressionEvent), canonical(event));
assert.match(marker, /^SOURCE-/);
assert.equal(process.env.GITHUB_EVENT_NAME, process.env.EVENT_FAMILY);
