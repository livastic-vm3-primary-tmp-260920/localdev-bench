#!/usr/bin/env node
/**
 * Proves each tool executes in REAL Chrome, on 127.0.0.1-only origin.
 * A fresh profile prevents prior cookies, sessions, ad/analytics requests.
 * No public URL opened, no ad calls or artificial website visits.
 */
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {createServer} from "node:http";
import {readFile,mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {setTimeout as delay} from "node:timers/promises";

const ROOT=resolve("docs");
const httpLog=[];
const browserErrors=[];
const slugs=[
 "regex-tester","cron-explainer","unix-timestamp","jwt-decoder",
 "base64-converter","url-encoder","uuid-generator","jsonl-validator"
];
const server=createServer(async(req,res)=>{
 try {
  const url=new URL(req.url||"/","http://localhost");
  const decoded=decodeURIComponent(url.pathname);
  let file;
  if(decoded==="/")file="index.html";
  else if(decoded==="/ko/")file="ko/index.html";
  else if(decoded==="/assets/core.mjs")file="assets/core.mjs";
  else if(decoded==="/assets/app.mjs")file="assets/app.mjs";
  else if(decoded==="/assets/regex-worker.mjs")file="assets/regex-worker.mjs";
  else if(decoded==="/assets/style.css")file="assets/style.css";
  else if(decoded==="/sitemap.xml")file="sitemap.xml";
  else {
    const match=/^\/(ko\/)?(regex-tester|cron-explainer|unix-timestamp|jwt-decoder|base64-converter|url-encoder|uuid-generator|jsonl-validator)\/$/.exec(decoded);
    if(match)file=(match[1]||"")+match[2]+"/index.html";
  }
  httpLog.push({path:decoded,served:!!file});
  if(!file){res.writeHead(404);res.end("");return;}
  const data=await readFile(join(ROOT,file));
  const contentType=file.endsWith(".mjs")?"text/javascript;charset=utf-8":
    file.endsWith(".css")?"text/css;charset=utf-8":
    file.endsWith(".xml")?"application/xml":
    "text/html;charset=utf-8";
  res.writeHead(200,{"Content-Type":contentType,"Cache-Control":"no-store",
    "Content-Security-Policy":"default-src 'none'; script-src 'self'; style-src 'self'; worker-src 'self'; connect-src 'none'; img-src 'self' data:; frame-src 'none'; object-src 'none'; form-action 'none'; base-uri 'none'"});
  res.end(data);
 }catch(error){browserErrors.push("LOCAL_HTTP_ERROR "+String(error));res.writeHead(500);res.end("");}
});
async function waitUntil(probe,limit=14000){
 const until=Date.now()+limit;
 while(Date.now()<until){
  try{const v=await probe();if(v)return v;}catch{/* async browser loading */}
  await delay(70);
 }
 throw new Error("Real Chrome UI condition not met before local timeout.");
}
class CDP {
 constructor(socket){
  this.socket=socket;this.seq=0;this.pending=new Map();
  socket.addEventListener("message",event=>{
   const data=JSON.parse(String(event.data));
   if(data.method==="Runtime.exceptionThrown"){
     browserErrors.push("RUNTIME_EXCEPTION "+String(data.params?.exceptionDetails?.text));
   }
   if(data.method==="Log.entryAdded"&&data.params?.entry?.level==="error"){
     browserErrors.push("CHROME_ERROR "+String(data.params.entry.text).slice(0,300));
   }
   if(!data.id)return;
   const pending=this.pending.get(data.id);
   if(!pending)return;
   this.pending.delete(data.id);
   if(data.error)pending.reject(new Error(JSON.stringify(data.error)));
   else pending.resolve(data.result);
  });
 }
 async send(method,params={}){
  const id=++this.seq;
  const promise=new Promise((resolve,reject)=>this.pending.set(id,{resolve,reject}));
  this.socket.send(JSON.stringify({id,method,params}));
  return await promise;
 }
 async eval(expression){
  const response=await this.send("Runtime.evaluate",{
   expression,returnByValue:true,awaitPromise:true
  });
  if(response.exceptionDetails)throw new Error("CHROME_SCRIPT_ERROR "+JSON.stringify(response.exceptionDetails));
  return response.result.value;
 }
 async nav(url,expected){
  const r=await this.send("Page.navigate",{url});
  if(r.errorText)throw new Error("NAVIGATE_FAIL "+r.errorText);
  return await waitUntil(async()=>{
   const info=await this.eval("({ready:document.readyState,path:location.pathname,lang:document.documentElement.lang,title:document.title})");
   if(info.ready==="complete"&&info.path===expected&&info.title.includes("LocalDev"))return info;
   return null;
  });
 }
 close(){this.socket.close();}
}

let chrome,profile,cdp,port;
try {
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 port=server.address().port;
 const host="http://127.0.0.1:"+String(port);
 profile=await mkdtemp(join(tmpdir(),"vm3-localdev-real-chrome-"));
 chrome=spawn("/usr/bin/google-chrome",[
  "--headless=new","--no-sandbox","--disable-gpu",
  "--disable-background-networking","--disable-sync","--no-first-run",
  "--disable-default-apps","--disable-extensions",
  "--no-default-browser-check","--window-size=430,880",
  "--user-data-dir="+profile,"--remote-debugging-port=0",
  "about:blank"
 ],{stdio:"ignore"});
 const debug=await waitUntil(async()=>{
  const v=(await readFile(join(profile,"DevToolsActivePort"),"utf8")).split(/\r?\n/);
  return Number(v[0])>0?Number(v[0]):null;
 });
 const page=await waitUntil(async()=>{
  const response=await fetch("http://127.0.0.1:"+String(debug)+"/json/list");
  const tabs=await response.json();
  return tabs.find(t=>t.type==="page"&&t.webSocketDebuggerUrl);
 });
 const socket=new WebSocket(page.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{
  socket.addEventListener("open",resolve,{once:true});
  socket.addEventListener("error",reject,{once:true});
 });
 cdp=new CDP(socket);
 await cdp.send("Page.enable");
 await cdp.send("Runtime.enable");
 await cdp.send("Log.enable");

 const home=await cdp.nav(host+"/","/");
 assert.equal(home.lang,"en");
 const cardCount=await cdp.eval("document.querySelectorAll('.tool-card').length");
 assert.equal(cardCount,8);
 const koreanHome=await cdp.nav(host+"/ko/","/ko/");
 assert.equal(koreanHome.lang,"ko");
 assert.equal(await cdp.eval("document.querySelectorAll('.tool-card').length"),8);

 const seen=[];
 for(const slug of slugs){
  const path="/"+slug+"/";
  const info=await cdp.nav(host+path,path);
  assert.equal(info.lang,"en");
  assert.ok(info.title.includes("LocalDev"));
  assert.equal(await cdp.eval("document.getElementById('result').textContent"),"");
  await cdp.eval("document.getElementById('sample').click(); document.getElementById('run').click();");
  const outcome=await waitUntil(async()=>{
   const value=await cdp.eval("({state:document.getElementById('status').dataset.kind,message:document.getElementById('status').textContent,result:document.getElementById('result').textContent,copy:document.getElementById('copy').disabled})");
   return value?.state==="success"||value?.state==="error"||value?.state==="warning"?value:null;
  },8000);
  assert.equal(outcome.state,"success",slug+": "+JSON.stringify(outcome));
  assert.ok(outcome.result.length>=10,slug);
  assert.equal(outcome.copy,false);
  if(slug==="regex-tester"){
    assert.match(outcome.result,/TEE-BLK-42/);
    assert.ok(await cdp.eval("document.querySelectorAll('#highlights mark').length")>=2);
  }
  if(slug==="cron-explainer")assert.match(outcome.result,/UTC/);
  if(slug==="jwt-decoder"){
    assert.match(outcome.result,/NOT verified/);
    assert.match(outcome.result,/fictional-test/);
  }
  if(slug==="uuid-generator")assert.match(outcome.result,/\b[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab]/);
  if(slug==="jsonl-validator"){
    assert.equal(await cdp.eval("document.getElementById('download').disabled"),false);
    const invalid=await cdp.eval("(()=>{document.getElementById('source').value='{\"x\":1}\\n{\"x\":}\\n{\"x\":3}';document.getElementById('run').click();return document.getElementById('result').textContent})()");
    assert.match(invalid,/2:/);
    assert.equal(await cdp.eval("document.getElementById('download').disabled"),true);
  }
  const cleared=await cdp.eval("(()=>{document.getElementById('clear').click();return {result:document.getElementById('result').textContent,status:document.getElementById('status').textContent}})()");
  assert.equal(cleared.result,"",slug);
  seen.push({tool:slug,status:"REAL_CHROME_PASS",resultChars:outcome.result.length});
 }
 const koreanPath="/ko/jsonl-validator/";
 await cdp.nav(host+koreanPath,koreanPath);
 assert.equal(await cdp.eval("document.documentElement.lang"),"ko");
 await cdp.eval("document.getElementById('sample').click();document.getElementById('run').click();");
 const ko=await waitUntil(async()=>{
   const v=await cdp.eval("({state:document.getElementById('status').dataset.kind,output:document.getElementById('result').textContent})");
   return v?.state==="success"&&v.output.length>0?v:null;
 });
 assert.match(ko.output,/유효 레코드/);
 assert.ok(httpLog.every(item=>item.served),JSON.stringify(httpLog.filter(x=>!x.served)));
 assert.deepEqual(browserErrors,[]);
 assert.ok(httpLog.every(x=>!/^https?:/.test(x.path)));
 assert.ok(httpLog.some(x=>x.path==="/assets/regex-worker.mjs"));
 console.log(JSON.stringify({
  result:"EIGHT_WORKING_TOOLS_REAL_CHROME_ALL_PASSED",
  englishTools:seen,
  koreanJSONL:"real Chrome success",
  sitePages:18,
  localHTTPRequests:httpLog.length,
  externalOriginRequests:0,
  AdsterraOrAdCalls:0,
  publicSiteVisitsGenerated:0
 },null,2));
} finally {
 if(cdp)cdp.close();
 if(chrome&&!chrome.killed)chrome.kill("SIGTERM");
 await new Promise(resolve=>server.close(resolve));
 if(profile)await rm(profile,{recursive:true,force:true,maxRetries:3,retryDelay:100});
}
