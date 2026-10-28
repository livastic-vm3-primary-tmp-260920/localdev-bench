import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileBatch,rowsCsv,issuesCsv,MAX_BYTES} from './core.mjs';
const l=x=>x.map(r=>JSON.stringify(r)).join('\n');
const request=id=>({custom_id:id,method:'POST',url:'/v1/responses',body:{model:'test-fictional-model',input:'fictional input'}});
const success=id=>({custom_id:id,response:{status_code:200,body:{output_text:'fictional'}} ,error:null});
const failure=id=>({custom_id:id,response:null,error:{code:'fictional_failure'}});
test('matches out-of-order outputs and separate errors by custom_id, not line order',()=>{
 const r=reconcileBatch(l([request('A'),request('B'),request('C')]),l([success('B'),success('A')]),l([failure('C')]));
 assert.equal(r.inputRecords,3);assert.equal(r.outputRecords,2);assert.equal(r.errorRecords,1);
 assert.deepEqual(r.rows.map(x=>x.status),['succeeded','succeeded','provider-error']);
 assert.equal(r.rows[0].outputLine,2);assert.equal(r.rows[2].errorLine,1);
 assert.deepEqual(r.counts,{succeeded:2,failed:1,missing:0,duplicates:0,unrecognized:0});
 assert.equal(r.status,'review-needed');
});
test('success when every request matches without errors',()=>{
 const r=reconcileBatch(l([request('x'),request('y')]),l([success('y'),success('x')]),'');
 assert.equal(r.status,'all-supplied-rows-matched');assert.equal(r.issueCount,0);
 assert.equal(r.counts.succeeded,2);
});
test('distinguishes missing output, extra id and duplicate result, no fabricated success',()=>{
 const r=reconcileBatch(l([request('a'),request('b')]),l([success('a'),success('a'),success('outside')]),'');
 assert.deepEqual(r.rows.map(x=>x.status),['duplicate-result','not-in-supplied-results','unexpected-result']);
 assert.equal(r.counts.succeeded,0);assert.equal(r.counts.missing,1);
 assert.ok(r.issues.some(e=>e.code==='DUPLICATE_RESULT_ID'));
 assert.ok(r.issues.some(e=>e.code==='UNEXPECTED_RESULT_ID'));
});
test('detects duplicate input IDs without treating response as successful',()=>{
 const r=reconcileBatch(l([request('same'),request('same')]),l([success('same')]),'');
 assert.equal(r.counts.duplicates,2);assert.equal(r.counts.succeeded,0);
 assert.equal(r.issues[0].code,'DUPLICATE_INPUT_ID');
});
test('reports malformed input and provider responses, not raw secrets',()=>{
 const r=reconcileBatch(l([request('valid')])+'\n{password:secret}\n[1,2]',l([success('valid')])+'\n{token:secret}','');
 assert.ok(r.issues.some(e=>e.source==='input'&&e.line===2&&e.code==='INVALID_JSON'));
 assert.ok(r.issues.some(e=>e.source==='output'&&e.line===2&&e.code==='INVALID_JSON'));
 assert.ok(!JSON.stringify(r).includes('password:secret'));
 assert.ok(!JSON.stringify(r).includes('token:secret'));
});
test('flags mismatched endpoint/models and unsafe batch method',()=>{
 const a=request('a'),b=request('b');a.method='GET';b.url='/v1/embeddings';b.body.model='different';b.body.stream=true;
 const r=reconcileBatch(l([a,b]),l([success('a'),success('b')]),'');
 for(const code of ['METHOD_NOT_POST','MIXED_ENDPOINTS','MIXED_MODELS','STREAMING'])
 assert.ok(r.issues.some(x=>x.code===code),code);
 assert.equal(r.status,'review-needed');
});
test('formulas from custom_id are neutralized in local review CSV',()=>{
 const r=reconcileBatch(l([request('=HYPERLINK("evil")')]),l([success('=HYPERLINK("evil")')]),'');
 assert.ok(rowsCsv(r).includes('"\'=HYPERLINK(""evil"")"'));
 assert.ok(issuesCsv(r).startsWith('\ufeff"source"'));
});
test('safety limits, empty files, all invalid, non-object values',()=>{
 assert.throws(()=>reconcileBatch('x'.repeat(MAX_BYTES+1),'',''),/8 MiB/);
 assert.throws(()=>reconcileBatch(l([request('a')]),'',''),/at least one result/);
 assert.throws(()=>reconcileBatch('[1,2]','{}',''),/no parseable request/);
 assert.throws(()=>reconcileBatch(l([request('a')]),Array.from({length:25002},()=>'{"a":1}').join('\n'),''),/25,000 lines/);
});
test('Windows CRLF, BOM, blank lines, valid UTF-8 and exact case-sensitive IDs',()=>{
 const r=reconcileBatch('\ufeff'+l([request('a'),request('A')]).replace('\n','\r\n')+'\r\n',l([success('A'),success('a')]),'');
 assert.equal(r.counts.succeeded,2);assert.equal(r.blankLines.input,1);
});
