/**
 * Independent batch JSONL reconciliation (MIT): local-only, no API, storage,
 * advertising, network calls or dependencies. Never upload user request data.
 * Reconciles by exact custom_id, NOT result line order. Does not certify jobs.
 */
export const MAX_BYTES = 8 * 1024 * 1024;
export const MAX_LINES = 25000;
const KNOWN_ENDPOINTS = new Set([
  '/v1/responses', '/v1/chat/completions', '/v1/embeddings',
  '/v1/completions', '/v1/moderations', '/v1/images/generations',
  '/v1/images/edits', '/v1/videos'
]);
const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const addIssue = (issues, source, line, code, message) => {
  issues.push({source, line, code, message});
};
const byteCount = str => new TextEncoder().encode(str).length;

function parseFile(raw, source, issues) {
  if(typeof raw !== 'string') throw new Error(source + ': provide JSONL text or a local file.');
  if(byteCount(raw) > MAX_BYTES) throw new Error(source + ': maximum 8 MiB per file in this free browser tool.');
  const lines=raw.replace(/\r\n/g,'\n').split('\n');
  if(lines.length > MAX_LINES + 1) throw new Error(source + ': maximum 25,000 lines.');
  const records=[];
  let blanks=0;
  for(let index=0;index<lines.length;index++) {
    const content=(index===0?lines[index].replace(/^\uFEFF/,''):lines[index]).trim();
    if(!content){blanks++;continue;}
    let row;
    try {row=JSON.parse(content);}
    catch {
      addIssue(issues,source,index+1,'INVALID_JSON','Line is not valid JSON.');
      continue;
    }
    if(!isObj(row)){
      addIssue(issues,source,index+1,'NOT_OBJECT','Batch JSONL line must be a JSON object.');
      continue;
    }
    if(typeof row.custom_id!=='string' || !row.custom_id.trim() || row.custom_id.length > 512){
      addIssue(issues,source,index+1,'INVALID_ID','Missing, blank, non-string or oversized custom_id.');
      continue;
    }
    // Minimize retained data, never copy request bodies, model prompts or error text.
    const entry={id:row.custom_id,line:index+1,source};
    if(source==='input') {
      entry.method=row.method;
      entry.url=row.url;
      entry.bodyValid=isObj(row.body);
      entry.model=isObj(row.body)?row.body.model:null;
      entry.streaming=isObj(row.body)&&row.body.stream===true;
    } else {
      const code=row.response?.status_code;
      entry.httpCode=typeof code==='number'&&Number.isInteger(code)?code:null;
      entry.hasError=row.error!==null&&row.error!==undefined;
      entry.hasResponse=isObj(row.response);
    }
    records.push(entry);
  }
  return {records,blanks};
}

/** Evaluate supplied, possibly partial results with no truth claims about API state.
 * @returns {object} report including all matched rows and line-specific issues.
 */
export function reconcileBatch(inputText,outputText,errorText) {
  const issues=[];
  const input=parseFile(inputText,'input',issues);
  const output=parseFile(outputText,'output',issues);
  const error=parseFile(errorText,'error',issues);
  if(input.records.length===0)throw new Error('Input file has no parseable request with a custom_id.');
  if(output.records.length===0 && error.records.length===0)
    throw new Error('Provide at least one result or error record; no results can be inferred.');
  const original=new Map(), inputCount=new Map();
  let firstEndpoint=null,firstModel=null;
  for(const record of input.records){
    inputCount.set(record.id,(inputCount.get(record.id)||0)+1);
    if(original.has(record.id)){
      addIssue(issues,'input',record.line,'DUPLICATE_INPUT_ID',
        'custom_id duplicates input line '+original.get(record.id).line+'.');
    }else original.set(record.id,record);
    if(record.method!=='POST')addIssue(issues,'input',record.line,'METHOD_NOT_POST','Expected method POST.');
    if(typeof record.url!=='string'||!record.url.startsWith('/v1/'))
      addIssue(issues,'input',record.line,'INVALID_ENDPOINT','Expected a /v1/ endpoint path.');
    else if(!KNOWN_ENDPOINTS.has(record.url))
      addIssue(issues,'input',record.line,'UNRECOGNIZED_ENDPOINT','Endpoint is not in this tool\'s reference list; verify the current API documentation.');
    if(!record.bodyValid)addIssue(issues,'input',record.line,'INVALID_BODY','Request body must be a JSON object.');
    if(record.streaming)addIssue(issues,'input',record.line,'STREAMING','stream:true is not suitable for batch requests.');
    if(firstEndpoint===null)firstEndpoint=record.url;
    else if(record.url!==firstEndpoint)addIssue(issues,'input',record.line,'MIXED_ENDPOINTS','Requests use different endpoint paths.');
    if(typeof record.model==='string' && record.model.trim()){
      if(firstModel===null)firstModel=record.model;
      else if(firstModel!==record.model)addIssue(issues,'input',record.line,'MIXED_MODELS','Requests use different model values.');
    }
  }
  const linked=new Map();
  for(const record of [...output.records,...error.records]){
    const previous=linked.get(record.id)||[];
    if(previous.length){
      addIssue(issues,record.source,record.line,'DUPLICATE_RESULT_ID',
        'custom_id already appears in '+previous[0].source+' line '+previous[0].line+'.');
    }
    if(!original.has(record.id))addIssue(issues,record.source,record.line,
      'UNEXPECTED_RESULT_ID','Result custom_id is absent from input file.');
    previous.push(record);
    linked.set(record.id,previous);
  }
  const rows=[];
  const counts={succeeded:0,failed:0,missing:0,duplicates:0,unrecognized:0};
  for(const inputRecord of input.records){
    const matches=linked.get(inputRecord.id)||[];
    let status,code=null;
    if(inputCount.get(inputRecord.id)>1){status='duplicate-input';counts.duplicates++;}
    else if(matches.length>1){status='duplicate-result';counts.duplicates++;}
    else if(matches.length===0){status='not-in-supplied-results';counts.missing++;}
    else {
      const record=matches[0]; code=record.httpCode;
      if(record.hasError){status='provider-error';counts.failed++;}
      else if(code!==null && code>=200&&code<300){status='succeeded';counts.succeeded++;}
      else if(code!==null){status='http-error';counts.failed++;}
      else {status='unknown-result';counts.unrecognized++;}
    }
    rows.push({customId:inputRecord.id,inputLine:inputRecord.line,
      outputLine:matches.find(r=>r.source==='output')?.line??null,
      errorLine:matches.find(r=>r.source==='error')?.line??null,
      status,httpCode:code});
  }
  for(const [id,matches] of linked)if(!original.has(id)){
    counts.unrecognized++;
    rows.push({customId:id,inputLine:null,
      outputLine:matches.find(r=>r.source==='output')?.line??null,
      errorLine:matches.find(r=>r.source==='error')?.line??null,
      status:'unexpected-result',httpCode:matches[0].httpCode});
  }
  return {
    counts,
    inputRecords:input.records.length,
    outputRecords:output.records.length,
    errorRecords:error.records.length,
    blankLines:{input:input.blanks,output:output.blanks,error:error.blanks},
    status:(counts.failed===0&&counts.missing===0&&counts.duplicates===0&&
      counts.unrecognized===0&&issues.length===0)?'all-supplied-rows-matched':'review-needed',
    issueCount:issues.length,issues,rows,
    caveat:'Local structural reconciliation only. Not a batch job status, billing, delivery or provider acceptance check.'
  };
}

function quoteCsv(value){
  let s=value===null||value===undefined?'':String(value);
  // Defend CSV/spreadsheet formula injection from user-provided custom_id.
  if(/^[\s]*[=+\-@\t\r]/.test(s))s="'"+s;
  return '"'+s.replace(/"/g,'""')+'"';
}
export function rowsCsv(report){
  const lines=[['custom_id','input_line','output_line','error_line','status','http_status']];
  for(const r of report.rows)lines.push([r.customId,r.inputLine,r.outputLine,r.errorLine,r.status,r.httpCode]);
  return '\ufeff'+lines.map(row=>row.map(quoteCsv).join(',')).join('\r\n')+'\r\n';
}
export function issuesCsv(report){
  const lines=[['source','line','issue_code','message']];
  for(const r of report.issues)lines.push([r.source,r.line,r.code,r.message]);
  return '\ufeff'+lines.map(row=>row.map(quoteCsv).join(',')).join('\r\n')+'\r\n';
}
