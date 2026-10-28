#!/usr/bin/env node
/**
 * LocalDev Bench Batch JSONL Large-File Matcher (MIT; Node.js 22+, zero deps).
 * Read local files with streams. Retain only request IDs and line metadata,
 * never prompt/response/error text in CSV reports or terminal output.
 * User-invoked failed-only manual review makes a second input-file pass;
 * it does not contact any API, upload content or automatically retry jobs.
 */
import {createReadStream} from 'node:fs';
import {lstat, mkdir, open, realpath, rename, rm, writeFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {rowsCsv,issuesCsv} from './core.mjs';

const MAX_INPUT_BYTES=220*1024*1024;
const MAX_RESULT_BYTES=350*1024*1024;
const MAX_SINGLE_LINE_BYTES=16*1024*1024;
const MAX_REQUEST_ROWS=100000;
const ENDPOINTS=new Set([
 '/v1/responses','/v1/chat/completions','/v1/embeddings',
 '/v1/completions','/v1/moderations','/v1/images/generations',
 '/v1/images/edits','/v1/videos'
]);
const isObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const add=(issues,source,line,code,message)=>issues.push({source,line,code,message});

async function preflightFile(path,source){
 const absolute=resolve(path);
 const stat=await lstat(absolute);
 if(!stat.isFile()||stat.isSymbolicLink())throw new Error(source+': expected ordinary local regular file; symlinks are refused.');
 const max=source==='input'?MAX_INPUT_BYTES:MAX_RESULT_BYTES;
 if(stat.size>max)throw new Error(source+': file exceeds local CLI maximum ('+Math.round(max/1024/1024)+' MiB).');
 if(stat.size===0)throw new Error(source+': source file is empty.');
 return {path:absolute,real:await realpath(absolute),stat};
}

/** Strict UTF-8 streaming line parser with a hard 16 MiB line buffer bound.
 * Never silently replace broken UTF-8 in the user's original prompt data.
 * A single maliciously long line fails before reaching full-file length.
 */
async function* boundedUtf8Lines(path,source){
 const stream=createReadStream(path,{highWaterMark:64*1024});
 const decoder=new TextDecoder('utf-8',{fatal:true});
 let carry='';
 try{
  for await(const bytes of stream){
   let text;
   try{text=decoder.decode(bytes,{stream:true});}
   catch{throw new Error(source+': invalid UTF-8 bytes; no report generated.');}
   let start=0;
   while(true){
    const end=text.indexOf('\n',start);
    if(end===-1){
     carry+=text.slice(start);
     if(Buffer.byteLength(carry,'utf8')>MAX_SINGLE_LINE_BYTES)
      throw new Error(source+': JSONL line exceeds 16 MiB; stop before unbounded buffering.');
     break;
    }
    const line=carry+text.slice(start,end);
    if(Buffer.byteLength(line,'utf8')>MAX_SINGLE_LINE_BYTES)
      throw new Error(source+': JSONL line exceeds 16 MiB.');
    yield line.endsWith('\r')?line.slice(0,-1):line;
    carry='';start=end+1;
   }
  }
  try{carry+=decoder.decode();}
  catch{throw new Error(source+': invalid UTF-8 at end of file.');}
  if(Buffer.byteLength(carry,'utf8')>MAX_SINGLE_LINE_BYTES)
    throw new Error(source+': JSONL final line exceeds 16 MiB.');
  if(carry)yield carry.endsWith('\r')?carry.slice(0,-1):carry;
 }finally{stream.destroy();}
}

/** Stream local newline-delimited JSON. Every returned object is ephemeral. */
async function* parsedLines(path,source,issues){
 let lineNo=0;
 for await(const content of boundedUtf8Lines(path,source)){
   lineNo++;
   if(lineNo>MAX_REQUEST_ROWS)throw new Error(source+': over 100,000 lines; refuse unsafe processing.');
   const stripped=(lineNo===1?content.replace(/^\uFEFF/,''):content).trim();
   if(!stripped)continue;
   let row;
   try{row=JSON.parse(stripped);}
   catch{add(issues,source,lineNo,'INVALID_JSON','Malformed JSON on this line.');continue;}
   if(!isObject(row)){
     add(issues,source,lineNo,'NOT_OBJECT','JSONL request/result must be an object.');continue;
   }
   if(typeof row.custom_id!=='string'||!row.custom_id.trim()||row.custom_id.length>512){
     add(issues,source,lineNo,'INVALID_ID','custom_id missing, blank or oversized.');continue;
   }
   yield {row,line:lineNo};
 }
}

/** Reconcile up to provider-sized files without retaining customer request bodies. */
export async function reconcileLocalFiles({input,output=null,errors=null}){
 if(!input||(!output&&!errors))throw new Error('Provide --input and at least one of --output or --errors.');
 const paths={input:await preflightFile(input,'input')};
 if(output)paths.output=await preflightFile(output,'output');
 if(errors)paths.error=await preflightFile(errors,'error');
 if(new Set(Object.values(paths).map(p=>p.real)).size!==Object.keys(paths).length)
  throw new Error('Input, output and error files must be distinct ordinary local files.');
 const issues=[],original=new Map(),inputOrder=[],inputCount=new Map(),results=new Map();
 let firstModel=null,firstEndpoint=null,inputRecords=0,outputRecords=0,errorRecords=0;
 for await(const {row,line} of parsedLines(paths.input.path,'input',issues)){
  inputRecords++;
  const id=row.custom_id;
  inputCount.set(id,(inputCount.get(id)||0)+1);
  if(original.has(id))add(issues,'input',line,'DUPLICATE_INPUT_ID',
     'custom_id duplicates an earlier input line.');
  else{original.set(id,{line});inputOrder.push(id);}
  if(row.method!=='POST')add(issues,'input',line,'METHOD_NOT_POST','Batch request method should be POST.');
  if(typeof row.url!=='string'||!row.url.startsWith('/v1/'))
   add(issues,'input',line,'INVALID_ENDPOINT','Expected a /v1/ endpoint path.');
  else if(!ENDPOINTS.has(row.url))
   add(issues,'input',line,'UNRECOGNIZED_ENDPOINT','Endpoint not in local reference list; confirm provider documentation.');
  if(!isObject(row.body))add(issues,'input',line,'INVALID_BODY','Input body must be a JSON object.');
  if(isObject(row.body)&&(typeof row.body.model!=='string'||!row.body.model.trim()))
   add(issues,'input',line,'INVALID_MODEL','Input body.model must name a nonempty model.');
  if(row.body?.stream===true)add(issues,'input',line,'STREAMING','Streaming requests are not supported by Batch API.');
  if(firstEndpoint===null)firstEndpoint=row.url;
  else if(row.url!==firstEndpoint)add(issues,'input',line,'MIXED_ENDPOINTS','Input contains multiple endpoint paths.');
  const model=isObject(row.body)?row.body.model:null;
  if(typeof model==='string'&&model.trim()){
   if(firstModel===null)firstModel=model;
   else if(firstModel!==model)add(issues,'input',line,'MIXED_MODELS','Input contains multiple model values.');
  }
 }
 if(!inputRecords)throw new Error('No parseable input requests with custom_id.');
 for(const source of ['output','error']){
  if(!paths[source])continue;
  for await(const {row,line} of parsedLines(paths[source].path,source,issues)){
   if(source==='output')outputRecords++;else errorRecords++;
   const id=row.custom_id;
   if(results.has(id))add(issues,source,line,'DUPLICATE_RESULT_ID',
       'More than one result with this custom_id across supplied files.');
   if(!original.has(id))add(issues,source,line,'UNEXPECTED_RESULT_ID',
       'Result custom_id is absent from supplied original input.');
   const statusCode=Number.isInteger(row.response?.status_code)?row.response.status_code:null;
   const hasError=row.error!==null&&row.error!==undefined;
   const result={source,line,statusCode,hasError,hasResponse:isObject(row.response)};
   const entries=results.get(id)||[];entries.push(result);results.set(id,entries);
  }
 }
 if(outputRecords===0 && errorRecords===0)
  throw new Error('No parseable output or errors; cannot infer provider state from absent files.');
 const rows=[],counts={succeeded:0,failed:0,missing:0,duplicates:0,unrecognized:0};
 for(const id of inputOrder){
  const originalRecord=original.get(id);
  const found=results.get(id)||[];
  let status,code=null;
  if(inputCount.get(id)>1){status='duplicate-input';counts.duplicates++;}
  else if(found.length>1){status='duplicate-result';counts.duplicates++;}
  else if(found.length===0){status='not-in-supplied-results';counts.missing++;}
  else{
   const result=found[0];code=result.statusCode;
   if(result.hasError){status='provider-error';counts.failed++;}
   else if(code!==null&&code>=200&&code<300){status='succeeded';counts.succeeded++;}
   else if(code!==null){status='http-error';counts.failed++;}
   else{status='unknown-result';counts.unrecognized++;}
  }
  rows.push({customId:id,inputLine:originalRecord.line,
    outputLine:found.find(x=>x.source==='output')?.line??null,
    errorLine:found.find(x=>x.source==='error')?.line??null,
    status,httpCode:code});
 }
 for(const [id,found] of results)if(!original.has(id)){
  counts.unrecognized++;
  rows.push({customId:id,inputLine:null,
    outputLine:found.find(x=>x.source==='output')?.line??null,
    errorLine:found.find(x=>x.source==='error')?.line??null,
    status:'unexpected-result',httpCode:found[0].statusCode});
 }
 return {
  counts,inputRecords,outputRecords,errorRecords,issues,issueCount:issues.length,rows,
  status:(issues.length===0&&counts.failed===0&&counts.missing===0&&
          counts.duplicates===0&&counts.unrecognized===0)?'all-supplied-rows-matched':'review-needed',
  caveat:'LOCAL structural matching only. Missing rows refer ONLY to supplied files. Verify actual Batch status, file completeness, billing and API provider response separately.'
 };
}

/** Requires explicit manual-review flags, clean structure and uniquely failed IDs. */
async function writeFailedOnly(path,report,destination){
 if(report.issues.length>0)throw new Error('Structural/mapping issues block failed-only manual review file.');
 const selected=report.rows.filter(r=>r.status==='provider-error'||r.status==='http-error');
 if(!selected.length)throw new Error('No uniquely matched explicit failures; absent/unknown rows are NEVER eligible.');
 const expected=new Map(selected.map(r=>[r.customId,r.inputLine]));
 if(expected.size!==selected.length)throw new Error('Ambiguous duplicate failures; cannot export.');
 const temp=destination+'.partial';
 const out=await open(temp,'wx',0o600);
 let emitted=0;
 try{
  for await(const {row,line} of parsedLines(path,'input',[])){
   const matchLine=expected.get(row.custom_id);
   if(matchLine===undefined)continue;
   if(matchLine!==line||row.method!=='POST'||!ENDPOINTS.has(row.url)||
     !isObject(row.body)||row.body.stream===true)
      throw new Error('Original failed input line mismatches reviewed request ID.');
   await out.write(JSON.stringify(row)+'\n');
   emitted++;
  }
  if(emitted!==selected.length)throw new Error('Failed request count mismatched source; export blocked.');
 }catch(err){
  await out.close();await rm(temp,{force:true});throw err;
 }
 await out.close();
 await rename(temp,destination);
 return emitted;
}

export async function saveReview({report,input,reportDir,manualFailedOnly=false,
   confirmProviderStateAndCost=false}){
 if(!isObject(report)||!Array.isArray(report.rows)||!Array.isArray(report.issues))
  throw new Error('A valid local reconciliation report is required.');
 if(manualFailedOnly && !confirmProviderStateAndCost)
  throw new Error('Failed-only export requires --confirm-provider-state-and-cost explicitly.');
 if(manualFailedOnly && (report.issues.length>0||
    !report.rows.some(r=>r.status==='provider-error'||r.status==='http-error')))
  throw new Error('Failed-only export blocked: structural issues or no definite failures.');
 const destination=resolve(reportDir);
 await mkdir(destination,{mode:0o700,recursive:false});
 const matches=join(destination,'matches.csv');
 const issues=join(destination,'issues.csv');
 const stats=join(destination,'summary.json');
 await writeFile(matches,rowsCsv(report),{mode:0o600,flag:'wx'});
 await writeFile(issues,issuesCsv(report),{mode:0o600,flag:'wx'});
 const summary={inputRecords:report.inputRecords,outputRecords:report.outputRecords,
  errorRecords:report.errorRecords,counts:report.counts,issueCount:report.issueCount,
  status:report.status,caveat:report.caveat,
  manualReviewFileCreated:manualFailedOnly,
  realBatchStatusVerified:false,actualProviderRevenueVerified:false,
  noRequestsOrAdsGenerated:true};
 let manualCount=0;
 if(manualFailedOnly){
  // Explicit original request bodies/prompts are ONLY in this deliberately
  // requested local file, never in CSV/JSON summary or terminal output.
  manualCount=await writeFailedOnly(resolve(input),report,
    join(destination,'failed-original-requests-MANUAL-REVIEW.jsonl'));
 }
 summary.manualReviewFileCreated=manualCount>0;
 await writeFile(stats,JSON.stringify(summary,null,2)+'\n',{mode:0o600,flag:'wx'});
 return {destination,manualCount,counts:report.counts,issueCount:report.issueCount};
}

const HELP=`Batch JSONL Large-File Reconciler (MIT, free, local-only, Node 22+)

Usage:
  node cli.mjs --input requests.jsonl --output results.jsonl \\
    --errors errors.jsonl --report-dir ./new-review-directory

Options:
  --input PATH                  Original Batch input JSONL (required)
  --output PATH                 Downloaded output_file_id JSONL (optional)
  --errors PATH                 Downloaded error_file_id JSONL (optional)
  --report-dir PATH             NEW local directory; existing directory refused
  --manual-failed-only          ALSO export explicitly failed original requests
  --confirm-provider-state-and-cost
                                Explicit acknowledgment required with failed-only
  --help                        Show this help

Never sends files to a server, calls OpenAI/Adsterra or automatically retries.
Supports local provider-sized input files up to 220 MiB / 100,000 lines,
350 MiB per result file, and 16 MiB maximum per JSONL line. Reports hold
request IDs/line numbers, not prompts. Any failed-only file CONTAINS your
original request body/prompts, so treat it as sensitive and review billing,
final Batch status, and duplicate-charge risks before any manual resubmission.
Missing IDs are absent from supplied files, NOT proof of failed processing.
Official guide: https://developers.openai.com/api/docs/guides/batch
Free browser tool: https://devtools.trendbridged.com/batch-jsonl-reconcile/
`;

function argsOf(args){
 const parsed={input:null,output:null,errors:null,reportDir:null,
   manualFailedOnly:false,confirmProviderStateAndCost:false};
 const options={'--input':'input','--output':'output','--errors':'errors','--report-dir':'reportDir'};
 for(let i=0;i<args.length;i++){
  const a=args[i];
  if(a==='--help'){if(args.length!==1)throw new Error('Use --help by itself.');return {help:true};}
  if(a==='--manual-failed-only'||a==='--confirm-provider-state-and-cost'){
   const key=a==='--manual-failed-only'?'manualFailedOnly':'confirmProviderStateAndCost';
   if(parsed[key])throw new Error('Duplicate flag '+a);parsed[key]=true;continue;
  }
  const key=options[a];
  if(!key||parsed[key]!==null||i+1>=args.length||args[i+1].startsWith('--'))
    throw new Error('Unknown, duplicated or incomplete option '+a);
  parsed[key]=args[++i];
 }
 if(!parsed.input||!parsed.reportDir||(!parsed.output&&!parsed.errors))
  throw new Error('Provide --input, --report-dir, and --output and/or --errors.');
 if(parsed.confirmProviderStateAndCost&&!parsed.manualFailedOnly)
  throw new Error('The acknowledgment flag is only valid with --manual-failed-only.');
 return parsed;
}

async function main(){
 let options;
 try{options=argsOf(process.argv.slice(2));}
 catch(err){process.stderr.write('CLI options: '+err.message+'\n');process.exitCode=2;return;}
 if(options.help){process.stdout.write(HELP);return;}
 try{
  const report=await reconcileLocalFiles(options);
  const result=await saveReview({report,input:options.input,
      reportDir:options.reportDir,manualFailedOnly:options.manualFailedOnly,
      confirmProviderStateAndCost:options.confirmProviderStateAndCost});
  process.stdout.write('LOCAL_REPORT_CREATED count_input='+report.inputRecords+
    ' count_output='+report.outputRecords+' count_errors='+report.errorRecords+
    ' succeeded='+report.counts.succeeded+' failed='+report.counts.failed+
    ' absent_from_supplied_files='+report.counts.missing+
    ' issues='+report.issues.length+' manual_failed_only='+result.manualCount+'\n'+
    'Provider Batch status, billing and real-user usage NOT VERIFIED. No network or ads.\n');
 }catch(err){
  // No exception stack, filename or user-supplied JSON content in terminal logs.
  process.stderr.write('LOCAL_RECONCILIATION_FAILED: '+String(err.message||err)+'\n');
  process.exitCode=2;
 }
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await main();
