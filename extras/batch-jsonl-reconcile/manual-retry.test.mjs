import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileBatch,retryCandidateCount,buildManualFailureRetryJsonl,MAX_BYTES} from './core.mjs';
const line=r=>JSON.stringify(r);
const req=(id,extra={})=>({custom_id:id,method:'POST',url:'/v1/responses',body:{model:'fictional-valid-for-structure-only',input:`DO NOT RUN ${id}`},...extra});
const good=id=>({custom_id:id,response:{status_code:200},error:null});
const failure=id=>({custom_id:id,response:null,error:{code:'batch_expired',message:'fictional'}});
const httpError=(id,code)=>({custom_id:id,response:{status_code:code},error:null});
const join=rows=>rows.map(line).join('\n')+'\n';

test('exports only explicit provider failures, preserving original requests and input order',()=>{
 const input=join([req('one'),req('two'),req('three'),req('four')]);
 const output=join([good('two'),good('one')]);
 const errors=join([failure('three')]);
 const report=reconcileBatch(input,output,errors);
 assert.equal(report.counts.succeeded,2); assert.equal(report.counts.failed,1);
 assert.equal(report.counts.missing,1); assert.equal(report.issueCount,0);
 assert.equal(retryCandidateCount(report),1);
 const payload=buildManualFailureRetryJsonl(input,report);
 assert.equal(payload.count,1);
 assert.equal(payload.jsonl,join([req('three')]));
 assert.match(payload.warning,/manual REVIEW/);
 assert.ok(!payload.jsonl.includes('one'));
 assert.ok(!payload.jsonl.includes('four'));
});
test('exports explicitly failed 429 and provider-error while excluding 200 and unknown results',()=>{
 const input=join([req('p'),req('q'),req('r'),req('s')]);
 const report=reconcileBatch(input,join([httpError('p',429),good('q'),{custom_id:'s',response:null,error:null}]),join([failure('r')]));
 assert.equal(report.counts.failed,2); assert.equal(report.counts.unrecognized,1);
 const payload=buildManualFailureRetryJsonl(input,report);
 assert.equal(payload.count,2);
 assert.deepEqual(payload.jsonl.trim().split('\n').map(x=>JSON.parse(x).custom_id),['p','r']);
});
test('no failed result -> refuse, no hallucinated retry for missing',()=>{
 const input=join([req('ok'),req('not-in-file')]);
 const report=reconcileBatch(input,join([good('ok')]),'');
 assert.equal(retryCandidateCount(report),0);
 assert.throws(()=>buildManualFailureRetryJsonl(input,report),/No explicitly failed/);
});
test('never export duplicate input IDs or duplicate results',()=>{
 const input=join([req('duplicate'),req('duplicate')]);
 const report=reconcileBatch(input,join([httpError('duplicate',500)]),'');
 assert.equal(report.issueCount,1);
 assert.equal(retryCandidateCount(report),0);
 assert.throws(()=>buildManualFailureRetryJsonl(input,report),/structural and mapping/);
 const input2=join([req('one')]);
 const report2=reconcileBatch(input2,join([httpError('one',503),httpError('one',503)]),'');
 assert.equal(retryCandidateCount(report2),0);
 assert.throws(()=>buildManualFailureRetryJsonl(input2,report2),/structural and mapping/);
});
test('even one malformed line in provided output blocks any retry export',()=>{
 const input=join([req('fail')]);
 const report=reconcileBatch(input,'{not-valid-json\n',join([failure('fail')]));
 assert.equal(retryCandidateCount(report),0);
 assert.throws(()=>buildManualFailureRetryJsonl(input,report),/structural and mapping/);
});
test('changed source lines, incorrect request method and model mixing fail closed',()=>{
 const input=join([req('a'),req('b')]);
 const report=reconcileBatch(input,'',join([failure('a'),failure('b')]));
 assert.equal(report.issueCount,0);
 assert.throws(()=>buildManualFailureRetryJsonl(join([req('a-changed'),req('b')]),report),/ambiguous or structurally invalid/);
 assert.throws(()=>buildManualFailureRetryJsonl(join([req('a',{method:'GET'}),req('b')]),report),/ambiguous or structurally invalid/);
 const different=join([req('a'),req('b',{body:{model:'other-model'}})]);
 const review=reconcileBatch(different,'',join([failure('a')]));
 assert.equal(retryCandidateCount(review),0);
 assert.throws(()=>buildManualFailureRetryJsonl(different,review),/structural and mapping/);
});
test('oversized input and input source reparse errors cannot generate a retry file',()=>{
 const r=reconcileBatch(join([req('a')]),'',join([failure('a')]));
 assert.throws(()=>buildManualFailureRetryJsonl('a'.repeat(MAX_BYTES+1),r),/8 MiB/);
 assert.throws(()=>buildManualFailureRetryJsonl('invalid\n',r),/re-parsed/);
});
test('Windows CRLF and BOM allowed; preserve Unicode prompts inside downloaded file only',()=>{
 const input='\uFEFF'+join([req('다국어',{body:{model:'demo',input:'한글 데이터'}})]).replace(/\n/g,'\r\n');
 const result=reconcileBatch(input,'',join([failure('다국어')]));
 const exportFile=buildManualFailureRetryJsonl(input,result);
 assert.equal(JSON.parse(exportFile.jsonl.trim()).body.input,'한글 데이터');
 assert.equal(exportFile.count,1);
 assert.ok(!JSON.stringify(result).includes('한글 데이터'));
});
