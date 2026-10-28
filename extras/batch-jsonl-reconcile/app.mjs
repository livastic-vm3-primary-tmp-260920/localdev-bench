/** Independent Batch JSONL Result Matcher, no analytics, no network, no cookies. */
import {reconcileBatch,rowsCsv,issuesCsv,MAX_BYTES,
  retryCandidateCount,buildManualFailureRetryJsonl} from './core.mjs';
const isKo=document.documentElement.lang==='ko';
const T=(en,ko)=>isKo?ko:en;
const by=id=>document.getElementById(id);
const keys=['input','output','error'];
const chosen=Object.fromEntries(keys.map(k=>[k,null]));
let report=null;
const format=new Intl.NumberFormat(isKo?'ko-KR':'en-US');
const cell=(tr,value)=>{const td=document.createElement('td');td.textContent=value==null?'—':String(value);tr.append(td);};
const labelStatus={
 'succeeded':T('Succeeded','성공'),
 'provider-error':T('Provider error','제공자 오류'),
 'http-error':T('HTTP error','HTTP 오류'),
 'not-in-supplied-results':T('Not in supplied files','제공 파일에서 찾지 못함'),
 'duplicate-input':T('Duplicate input ID','입력 ID 중복'),
 'duplicate-result':T('Duplicate output ID','결과 ID 중복'),
 'unexpected-result':T('Unexpected result ID','예상하지 못한 결과 ID'),
 'unknown-result':T('Unclassified response','상태 확인 불가')
};
function status(msg,isError=false){
 const node=by('notice');node.textContent=msg;node.dataset.kind=isError?'error':'info';
}
function retryState(){
 const count=report?retryCandidateCount(report):0;
 by('retry-count').textContent=report && report.issueCount>0 ?
   T('Fix all structural or mapping issues before reviewing any retry file.',
     '재처리 검토 파일을 만들기 전에 모든 구조·대조 오류를 먼저 해결하세요.') :
   T('Explicitly failed requests available for manual review: ',
     '수동 재처리 검토 대상인 명확한 실패 요청: ')+format.format(count);
 by('retry-download').disabled=!(report && report.issueCount===0 && count>0 &&
   by('retry-confirm').checked);
}
function cleanResults(){
 report=null;by('summary').hidden=true;by('issues-section').hidden=true;
 by('rows-download').disabled=true;by('issues-download').disabled=true;
 by('retry-confirm').checked=false;
 by('preview-body').replaceChildren();by('issue-body').replaceChildren();
 retryState();
}
for(const key of keys){
 const file=by('file-'+key),textbox=by('text-'+key);
 const chosenInfo=by('loaded-'+key);
 file.addEventListener('change',async()=>{
   const localFile=file.files?.[0];
   if(!localFile){chosen[key]=null;return;}
   cleanResults();
   if(localFile.size>MAX_BYTES){
     chosen[key]=null;file.value='';
     chosenInfo.textContent=T('File exceeds this tool\'s 8 MiB limit.','파일이 이 도구의 8 MiB 제한을 초과했습니다.');
     status(chosenInfo.textContent,true);return;
   }
   try{
     const data=await localFile.text();
     if(file.files?.[0]!==localFile)return;
     chosen[key]=data;textbox.value='';
     chosenInfo.textContent=localFile.name+' · '+format.format(localFile.size)+' bytes';
     status(T('File loaded locally; nothing was uploaded.','브라우저에서 파일을 읽었습니다. 서버로 전송하지 않았습니다.'));
   }catch{
     chosen[key]=null;file.value='';
     chosenInfo.textContent=T('Could not read this local file.','로컬 파일을 읽지 못했습니다.');
     status(chosenInfo.textContent,true);
   }
 });
 textbox.addEventListener('input',()=>{
   if(chosen[key]!==null){chosen[key]=null;file.value='';chosenInfo.textContent='';}
   cleanResults();
 });
}
function getValue(key){return chosen[key]!==null?chosen[key]:by('text-'+key).value;}
function fillExample(){
 const req=(id)=>JSON.stringify({custom_id:id,method:'POST',url:'/v1/responses',body:{model:'fictional-demo-model',input:'Synthetic '+id}});
 const good=id=>JSON.stringify({id:'fictional-result',custom_id:id,response:{status_code:200,request_id:'fictional',body:{output_text:'Illustrative result'}},error:null});
 const bad=id=>JSON.stringify({id:'fictional-error',custom_id:id,response:null,error:{code:'fictional_error',message:'Illustrative problem only'}});
 const demo={input:[req('example-1'),req('example-2'),req('example-3')].join('\n'),
  output:[good('example-2'),good('example-1')].join('\n'),error:bad('example-3')};
 for(const key of keys){by('text-'+key).value=demo[key];chosen[key]=null;
  by('file-'+key).value='';by('loaded-'+key).textContent='';}
 cleanResults();
 status(T('Fictional demo: two successes in reversed order and one error. Press Reconcile.',
          '가상 예제: 순서가 뒤바뀐 성공 2건과 오류 1건입니다. 대조 실행을 누르세요.'));
 by('run').focus();
}
function render(report){
 by('summary').hidden=false;
 const stats=[
  ['total-input',report.inputRecords],['total-ok',report.counts.succeeded],
  ['total-failed',report.counts.failed],['total-missing',report.counts.missing],
  ['total-duplicates',report.counts.duplicates],['total-issues',report.issueCount]
 ];
 for(const [id,n] of stats)by(id).textContent=format.format(n);
 const preview=by('preview-body');
 for(const row of report.rows.slice(0,150)){
   const tr=document.createElement('tr');
   cell(tr,row.customId);cell(tr,row.inputLine);cell(tr,row.outputLine);cell(tr,row.errorLine);
   cell(tr,labelStatus[row.status]||row.status);cell(tr,row.httpCode);
   preview.append(tr);
 }
 by('rows-preview-count').textContent=T(
    'Previewing '+Math.min(150,report.rows.length)+' of '+report.rows.length+' rows (download all).',
    '총 '+format.format(report.rows.length)+'건 중 '+Math.min(150,report.rows.length)+'건 미리보기(전체 다운로드 가능).');
 by('rows-download').disabled=false;
 retryState();
 by('issues-section').hidden=report.issues.length===0;
 by('issues-download').disabled=report.issues.length===0;
 const issueBody=by('issue-body');
 for(const issue of report.issues.slice(0,80)){
  const tr=document.createElement('tr');cell(tr,issue.source);cell(tr,issue.line);
  cell(tr,issue.code);cell(tr,issue.message);issueBody.append(tr);
 }
 by('issue-preview-count').textContent=T(
    'Showing first '+Math.min(80,report.issues.length)+' of '+report.issues.length+' issues.',
    '총 '+format.format(report.issues.length)+'개 중 '+Math.min(80,report.issues.length)+'개 문제 표시.');
 const intro=report.status==='all-supplied-rows-matched'?
 T('All provided request IDs were matched. This is not API/job verification.',
   '제공된 결과에서 모든 요청 ID를 찾았습니다. 실제 API 작업의 완료·승인은 검증하지 않습니다.'):
 T('Review required. Missing means “not found in the files you supplied,” not that the provider never processed it.',
   '검토가 필요합니다. 누락은 제공된 파일에서 찾지 못했다는 뜻이며, 실제 제공자가 처리하지 않았다는 증거는 아닙니다.');
 status(intro,report.status!=='all-supplied-rows-matched');
}
function run(){
 cleanResults();
 try{
  report=reconcileBatch(getValue('input'),getValue('output'),getValue('error'));
  render(report);
  by('summary').scrollIntoView({behavior:'smooth',block:'start'});
 }catch(e){status(T('Cannot reconcile: ','대조할 수 없습니다: ')+String(e.message||e),true);}
}
function saveLocalFile(content,name,type){
 const blob=new Blob([content],{type});
 const url=URL.createObjectURL(blob);
 const link=document.createElement('a');
 link.href=url;link.download=name;
 document.body.append(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function downloadManualFailureReview(){
 if(!report || !by('retry-confirm').checked ||
    report.issueCount>0 || retryCandidateCount(report)<1){
   status(T('Select the explicit manual-review acknowledgment after checking the report.',
            '보고서를 확인한 뒤 수동 재처리 위험에 관한 확인란을 직접 선택하세요.'),true);
   return;
 }
 try{
  const extracted=buildManualFailureRetryJsonl(getValue('input'),report);
  saveLocalFile(extracted.jsonl,'batch-failed-requests-manual-review.jsonl','application/x-ndjson;charset=utf-8');
  // Never show sensitive request contents in UI logs or any telemetry.
  status(T('Generated '+extracted.count+' explicitly failed original request(s) locally. This is a MANUAL review file. Verify final Batch status, pricing and duplicate-charge risk before any resubmission.',
           '명확히 실패한 원본 요청 '+extracted.count+'건을 브라우저에서 저장했습니다. 수동 검토용 파일입니다. 실제 재제출 전 배치 완료 상태·요금·중복 과금 위험을 직접 확인하세요.'));
 }catch(e){
  status(T('Failed-request export blocked: ','실패 요청 내보내기를 차단했습니다: ')+String(e.message||e),true);
 }
}
function downloadCsv(kind){
 if(!report)return;
 const body=kind==='rows'?rowsCsv(report):issuesCsv(report);
 saveLocalFile(body,kind==='rows'?'batch-jsonl-review.csv':'batch-jsonl-issues.csv',
               'text/csv;charset=utf-8');
 status(T('Local CSV review file generated. Original prompts and response bodies are not included.',
 '브라우저에서 CSV 보고서를 만들었습니다. 원본 프롬프트·응답 본문은 보고서에 포함하지 않습니다.'));
}
by('example').addEventListener('click',fillExample);
by('run').addEventListener('click',run);
by('clear').addEventListener('click',()=>{
 for(const key of keys){chosen[key]=null;by('text-'+key).value='';by('file-'+key).value='';by('loaded-'+key).textContent='';}
 cleanResults();status(T('Cleared all local inputs and results.','이 브라우저의 입력과 결과를 모두 지웠습니다.'));
 by('file-input').focus();
});
by('rows-download').addEventListener('click',()=>downloadCsv('rows'));
by('issues-download').addEventListener('click',()=>downloadCsv('issues'));
by('retry-confirm').addEventListener('change',retryState);
by('retry-download').addEventListener('click',downloadManualFailureReview);
retryState();
status(T('Start with fictional data or choose your own files. They never leave this browser.',
         '가상 예제나 내 파일로 시작하세요. 파일 내용은 이 브라우저를 벗어나지 않습니다.'));
