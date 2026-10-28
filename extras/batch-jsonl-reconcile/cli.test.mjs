import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,rm,stat,symlink,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {reconcileLocalFiles,saveReview} from './cli.mjs';

const record=id=>({custom_id:id,method:'POST',url:'/v1/responses',body:{
  model:'fictional-batch-model-not-for-live-api',input:'SENSITIVE_ONLY_INSIDE_ORIGINAL_FILE_'+id}});
const success=id=>({custom_id:id,response:{status_code:200,request_id:'fictional'},error:null});
const fail=id=>({custom_id:id,response:null,error:{code:'example',message:'fictional failure'}});
const httpFail=id=>({custom_id:id,response:{status_code:429},error:null});
const asJsonl=rows=>rows.map(x=>JSON.stringify(x)).join('\n')+'\n';
async function fixture(input,output,errors){
 const root=await mkdtemp(join(tmpdir(),'vm3-batch-large-cli-tests-'));
 const files={root,input:join(root,'requests.jsonl'),output:join(root,'success.jsonl'),
    errors:join(root,'errors.jsonl'),reportDir:join(root,'reports')};
 await writeFile(files.input,input, {mode:0o600});
 if(output!==null)await writeFile(files.output,output,{mode:0o600});
 else files.output=null;
 if(errors!==null)await writeFile(files.errors,errors,{mode:0o600});
 else files.errors=null;
 return files;
}

const clean=async f=>rm(f.root,{recursive:true,force:true});

test('streamed out-of-order successes, real error and missing ID keep prompts out of reports',async()=>{
 const f=await fixture(asJsonl([record('fiction-101'),record('fiction-102'),record('fiction-103'),record('fiction-104')]),
  asJsonl([success('fiction-102'),success('fiction-101')]),asJsonl([fail('fiction-103')]));
 try{
  const r=await reconcileLocalFiles(f);
  assert.deepEqual(r.counts,{succeeded:2,failed:1,missing:1,duplicates:0,unrecognized:0});
  assert.equal(r.issueCount,0);
  assert.equal(r.rows[0].outputLine,2);assert.equal(r.rows[1].outputLine,1);
  assert.equal(r.rows[3].status,'not-in-supplied-results');
  assert.ok(!JSON.stringify(r).includes('SENSITIVE_ONLY'));
  const saved=await saveReview({report:r,input:f.input,reportDir:f.reportDir});
  assert.equal(saved.manualCount,0);
  const csv=await readFile(join(f.reportDir,'matches.csv'),'utf8');
  const errors=await readFile(join(f.reportDir,'issues.csv'),'utf8');
  const summary=await readFile(join(f.reportDir,'summary.json'),'utf8');
  assert.ok(csv.includes('not-in-supplied-results'));
  for(const text of [csv,errors,summary])assert.ok(!text.includes('SENSITIVE_ONLY'));
  const dir=await stat(f.reportDir);assert.equal(dir.mode&0o077,0);
  for(const n of ['matches.csv','issues.csv','summary.json']){
   const file=await stat(join(f.reportDir,n));assert.equal(file.mode&0o077,0);
  }
 }finally{await clean(f);}
});

test('failed-only mode emits only original definite provider/HTTP failures after explicit acknowledgement',async()=>{
 const inputs=[record('good'),record('provider'),record('http'),record('absent'),record('good-2')];
 const f=await fixture(asJsonl(inputs),asJsonl([success('good'),httpFail('http'),success('good-2')]),
  asJsonl([fail('provider')]));
 try{
  const r=await reconcileLocalFiles(f);
  assert.equal(r.issueCount,0);assert.equal(r.counts.failed,2);
  await assert.rejects(saveReview({report:r,input:f.input,reportDir:f.reportDir,manualFailedOnly:true}),
    /confirm-provider-state-and-cost/);
  await assert.rejects(stat(f.reportDir),{code:'ENOENT'});
  const saved=await saveReview({report:r,input:f.input,reportDir:f.reportDir,
    manualFailedOnly:true,confirmProviderStateAndCost:true});
  assert.equal(saved.manualCount,2);
  const failed=(await readFile(join(f.reportDir,'failed-original-requests-MANUAL-REVIEW.jsonl'),'utf8'))
    .trim().split('\n').map(JSON.parse);
  assert.deepEqual(failed,[inputs[1],inputs[2]]);
  assert.equal((await stat(join(f.reportDir,'failed-original-requests-MANUAL-REVIEW.jsonl'))).mode&0o077,0);
  assert.ok(!JSON.stringify(r).includes('SENSITIVE_ONLY'));
 }finally{await clean(f);}
});

test('a missing result is never inferred to be a retry candidate',async()=>{
 const f=await fixture(asJsonl([record('missing')]),asJsonl([success('other')]),null);
 try{
  const r=await reconcileLocalFiles(f);
  assert.equal(r.counts.missing,1);
  assert.equal(r.issues[0].code,'UNEXPECTED_RESULT_ID');
  await assert.rejects(saveReview({report:r,input:f.input,reportDir:f.reportDir,
    manualFailedOnly:true,confirmProviderStateAndCost:true}),/blocked/);
  await assert.rejects(stat(f.reportDir),{code:'ENOENT'});
 }finally{await clean(f);}
});

test('duplicate input, duplicate result and unexpected ID preserve review-required state',async()=>{
 const f=await fixture(asJsonl([record('same'),record('same'),record('other')]),
  asJsonl([httpFail('same'),httpFail('same'),success('alien')]),null);
 try{
  const r=await reconcileLocalFiles(f);
  assert.equal(r.status,'review-needed');
  assert.ok(r.issues.some(v=>v.code==='DUPLICATE_INPUT_ID'));
  assert.ok(r.issues.some(v=>v.code==='DUPLICATE_RESULT_ID'));
  assert.ok(r.issues.some(v=>v.code==='UNEXPECTED_RESULT_ID'));
  await assert.rejects(saveReview({report:r,input:f.input,reportDir:f.reportDir,
    manualFailedOnly:true,confirmProviderStateAndCost:true}),/blocked/);
 }finally{await clean(f);}
});

test('malformed JSON and mixed model issues never leak input text or enable failed-only replay',async()=>{
 const original=record('safe');
 const bad=record('mixed');bad.body.model='different';
 const f=await fixture(asJsonl([original,bad])+'{invalid_json_SECRET123\n',
   asJsonl([success('safe')]),asJsonl([fail('mixed')]));
 try{
  const report=await reconcileLocalFiles(f);
  assert.ok(report.issues.some(v=>v.code==='MIXED_MODELS'));
  assert.ok(report.issues.some(v=>v.code==='INVALID_JSON'));
  assert.ok(!JSON.stringify(report).includes('SECRET123'));
  const out=await saveReview({report,input:f.input,reportDir:f.reportDir});
  assert.equal(out.issueCount,2);
  assert.ok(!(await readFile(join(f.reportDir,'issues.csv'),'utf8')).includes('SECRET123'));
 }finally{await clean(f);}
});

test('malicious custom_id is neutralized for CSV formulas',async()=>{
 const injected=' =HYPERLINK("https://unowned.example.net","malicious")';
 const f=await fixture(asJsonl([record(injected)]),asJsonl([success(injected)]),null);
 try{
  const r=await reconcileLocalFiles(f);
  await saveReview({report:r,input:f.input,reportDir:f.reportDir});
  const text=await readFile(join(f.reportDir,'matches.csv'),'utf8');
  assert.ok(text.includes('"\' =HYPERLINK('));
  assert.ok(!text.includes('" =HYPERLINK('));
 }finally{await clean(f);}
});

test('reject same input/output, symlink, existing directory, zero-byte or missing files',async()=>{
 const f=await fixture(asJsonl([record('a')]),asJsonl([success('a')]),null);
 try{
  await assert.rejects(reconcileLocalFiles({input:f.input,output:f.input}),/distinct/);
  await symlink(f.input,join(f.root,'symlink.jsonl'));
  await assert.rejects(reconcileLocalFiles({input:join(f.root,'symlink.jsonl'),output:f.output}),/ordinary local regular file/);
  await mkdir(f.reportDir);
  const r=await reconcileLocalFiles(f);
  await assert.rejects(saveReview({report:r,input:f.input,reportDir:f.reportDir}),{code:'EEXIST'});
  await writeFile(join(f.root,'empty.jsonl'),'');
  await assert.rejects(reconcileLocalFiles({input:join(f.root,'empty.jsonl'),output:f.output}),/empty/);
 }finally{await clean(f);}
});

test('CLI flags, hidden confirm flag and safe counts protect operator',async()=>{
 const f=await fixture(asJsonl([record('one')]),asJsonl([success('one')]),null);
 const cli=join(import.meta.dirname,'cli.mjs');
 try{
  const p=spawnSync(process.execPath,[cli,'--input',f.input,'--output',f.output,
      '--report-dir',f.reportDir],{encoding:'utf8',timeout:7000});
  assert.equal(p.status,0,p.stderr);
  assert.ok(p.stdout.includes('LOCAL_REPORT_CREATED'));
  assert.ok(!p.stdout.includes('SENSITIVE_ONLY'));
  const wrong=spawnSync(process.execPath,[cli,'--input',f.input,'--output',f.output,
      '--report-dir',join(f.root,'fail'),'--manual-failed-only'],{encoding:'utf8',timeout:7000});
  assert.equal(wrong.status,2);
  assert.ok(!wrong.stderr.includes('SENSITIVE_ONLY'));
  assert.ok(wrong.stderr.includes('confirm-provider-state-and-cost'));
 }finally{await clean(f);}
});

test('stream reconciles 26,000 JSONL rows, exceeding the browser 25,000-line cap',async()=>{
 const n=26000;
 const batch=(id)=>JSON.stringify({custom_id:'bulk-'+id,method:'POST',url:'/v1/responses',
    body:{model:'synthetic-model',input:'test'}})+'\n';
 const response=(id)=>JSON.stringify(success('bulk-'+id))+'\n';
 const input=Array.from({length:n},(_,i)=>batch(i)).join('');
 const output=Array.from({length:n},(_,i)=>response(n-i-1)).join('');
 const f=await fixture(input,output,null);
 try{
  const r=await reconcileLocalFiles(f);
  assert.equal(r.inputRecords,n);assert.equal(r.outputRecords,n);
  assert.equal(r.issueCount,0);
  assert.equal(r.counts.succeeded,n);
  assert.equal(r.rows[0].outputLine,n);
  assert.equal(r.rows[n-1].outputLine,1);
  assert.equal(r.rows.length,n);
 }finally{await clean(f);}
});

test('large 9 MiB input lines are streamed without browser 8 MiB total limit',async()=>{
 const row=record('large');row.body.input='F'.repeat(9*1024*1024);
 const f=await fixture(asJsonl([row]),asJsonl([success('large')]),null);
 try{
  assert.ok((await stat(f.input)).size>8*1024*1024);
  const result=await reconcileLocalFiles(f);
  assert.equal(result.counts.succeeded,1);
  assert.ok(!JSON.stringify(result).includes('FFFF'));
 }finally{await clean(f);}
});

test('strict streaming UTF-8 decoder fails closed, even if a bad byte is in otherwise valid JSON',async()=>{
 const f=await fixture(asJsonl([record('bad-utf8')]),asJsonl([success('bad-utf8')]),null);
 try{
  let raw=Buffer.from(await readFile(f.input));
  const token=Buffer.from('SENSITIVE_ONLY_INSIDE_ORIGINAL_FILE_bad-utf8');
  const at=raw.indexOf(token);
  assert.ok(at>0);
  raw[at+9]=0xff;
  await writeFile(f.input,raw);
  await assert.rejects(reconcileLocalFiles(f),/invalid UTF-8/);
 }finally{await clean(f);}
});

test('safeguard hard-stops a single JSONL line greater than 16 MiB',async()=>{
 const row=record('oversized');row.body.input='Q'.repeat(17*1024*1024);
 const f=await fixture(asJsonl([row]),asJsonl([success('oversized')]),null);
 try{
  await assert.rejects(reconcileLocalFiles(f),/line exceeds 16 MiB/);
 }finally{await clean(f);}
});

test('missing model in Batch request is a review issue, never a failed-only retry source',async()=>{
 const request=record('invalid-model');delete request.body.model;
 const f=await fixture(asJsonl([request]),null,asJsonl([fail('invalid-model')]));
 try{
  const r=await reconcileLocalFiles(f);
  assert.equal(r.counts.failed,1);
  assert.ok(r.issues.some(x=>x.code==='INVALID_MODEL'));
  await assert.rejects(saveReview({report:r,input:f.input,reportDir:f.reportDir,
   manualFailedOnly:true,confirmProviderStateAndCost:true}),/blocked/);
 }finally{await clean(f);}
});
