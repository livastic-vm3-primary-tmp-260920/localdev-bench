/**
 * LocalDev Bench UI: one original free developer tool per URL.
 * Every calculation is local. No analytics or ad requests on this domain.
 */
import {
  runRegex, nextCronRuns, unixToDates, dateToUnix, formatInTimeZone,
  decodeJwt, base64Encode, base64Decode, encodeUrlComponent, decodeUrlComponent,
  inspectUrl, makeUuids, validateJsonl
} from "./core.mjs";

const tool=document.body.dataset.tool;
const lang=document.documentElement.lang==="ko"?"ko":"en";
const byId=id=>document.getElementById(id);
const txt=(en,ko)=>lang==="ko"?ko:en;
let validDownload=null;
let currentRegexWorker=null;

function status(message,kind="info"){
 const field=byId("status");
 if(field){field.textContent=message;field.dataset.kind=kind;}
}
function output(value){
 const field=byId("result");
 field.textContent=value;
 const copy=byId("copy");
 if(copy)copy.disabled=!value;
}
function get(id){return byId(id)?.value??"";}
function set(id,value){if(byId(id))byId(id).value=value;}
function lineReport(labels,values){
 return labels.map((label,i)=>label+": "+values[i]).join("\n");
}
function destroyRegexWorker(){
 if(currentRegexWorker)currentRegexWorker.terminate();
 currentRegexWorker=null;
}
function regexWithDeadline(pattern,flags,text,replacement){
 destroyRegexWorker();
 return new Promise((resolve,reject)=>{
   const worker=new Worker(new URL("./regex-worker.mjs",import.meta.url),{type:"module"});
   currentRegexWorker=worker;
   let settled=false;
   const end=(err,result)=>{
     if(settled)return;
     settled=true;
     clearTimeout(timer);
     if(worker===currentRegexWorker)currentRegexWorker=null;
     worker.terminate();
     if(err)reject(err);else resolve(result);
   };
   const timer=setTimeout(()=>end(new Error(
     txt("Regex timed out: shorten the pattern or test text.",
     "정규식 시간이 초과됐습니다. 패턴이나 테스트 문장을 줄여주세요."))),800);
   worker.onmessage=event=>{
     const data=event.data||{};
     if(data.ok) end(null,data.result);
     else end(new Error(data.error||"Regex failed."));
   };
   worker.onerror=()=>end(new Error(
     txt("Regex worker could not start.","정규식 실행기가 시작되지 않았습니다.")));
   worker.postMessage({pattern,flags,text,replacement});
 });
}
function renderRegexHighlights(text,matches){
 const host=byId("highlights");
 if(!host)return;
 host.replaceChildren();
 const fragment=document.createDocumentFragment();
 let cursor=0;
 for(const match of matches){
   const start=match.start,end=match.end;
   if(start<cursor || end<=start || end>text.length)continue;
   fragment.append(document.createTextNode(text.slice(cursor,start)));
   const mark=document.createElement("mark");
   mark.textContent=text.slice(start,end);
   fragment.append(mark);
   cursor=end;
 }
 fragment.append(document.createTextNode(text.slice(cursor)));
 host.append(fragment);
}
async function run(){
 status(txt("Processing locally…","이 기기에서 처리하는 중…"));
 validDownload=null;
 if(byId("download"))byId("download").disabled=true;
 output("");
 if(byId("highlights"))byId("highlights").replaceChildren();
 try{
   let result="";
   switch(tool){
    case "regex-tester":{
      const source=get("source");
      const data=await regexWithDeadline(get("pattern"),get("flags"),source,get("replacement"));
      renderRegexHighlights(source,data.matches);
      const rows=data.matches.map((m,i)=>
        "#"+(i+1)+" ["+m.start+".."+m.end+"]: "+JSON.stringify(m.text)+
        (m.groups.length ? "\n  groups: "+JSON.stringify(m.groups):"")+
        (Object.keys(m.namedGroups).length?"\n  named: "+JSON.stringify(m.namedGroups):""));
      result=txt("JavaScript matches","JavaScript 일치 결과")+": "+data.matches.length+
        (data.truncated?" (first 100)":"")+"\n\n"+rows.join("\n")+
        "\n\n"+txt("Replace preview (not applied to input)","치환 미리보기(원본 변경 없음)")+
        ":\n"+data.replaced;
      break;
    }
    case "cron-explainer":{
      const data=nextCronRuns(get("expression"),new Date(),get("zone"),5);
      const zone=data.zone==="UTC"?"UTC":txt("Your device","내 기기");
      result=txt("5-field Unix cron only (not Quartz)","5필드 Unix cron 전용(Quartz 아님)")+
        "\n"+txt("Interpretation zone","해석 시간대")+": "+zone+
        "\n"+txt("Day-of-month + weekday use OR when both restricted.",
          "일자와 요일을 함께 지정하면 표준 cron의 OR 규칙을 적용합니다.")+
        "\n\n"+data.next.map((iso,i)=>
          (i+1)+". "+formatInTimeZone(new Date(iso).getTime(),
            data.zone==="UTC"?"UTC":Intl.DateTimeFormat().resolvedOptions().timeZone,lang)).join("\n");
      if(data.truncated)result+="\n\n"+txt(
        "Not enough future runs found within 370 days; this expression may be rare or unsatisfiable.",
        "향후 370일에서 충분한 실행 시각을 찾지 못했습니다. 일정이 드물거나 조건이 충돌할 수 있습니다.");
      break;
    }
    case "unix-timestamp":{
      const data=get("epoch").trim()?unixToDates(get("epoch"),get("unit")):
        dateToUnix(get("iso"));
      const t=Number(data.epochMilliseconds);
      const zone=get("zone")||"UTC";
      const actualZone=zone==="device"?
        Intl.DateTimeFormat().resolvedOptions().timeZone:zone;
      result=lineReport(
        [txt("Detected unit","입력 단위"),"ISO 8601 (UTC)",txt("Unix seconds","유닉스 초"),
         txt("Unix milliseconds","유닉스 밀리초"),txt("Selected zone","선택한 시간대"),
         txt("South Korea","대한민국")],
        [data.unit,data.iso,data.seconds,data.milliseconds,
         formatInTimeZone(t,actualZone,lang),
         formatInTimeZone(t,"Asia/Seoul",lang)]);
      break;
    }
    case "jwt-decoder":{
      const data=decodeJwt(get("source"));
      result=txt("WARNING: JWT signature NOT verified. Do not paste real access tokens.",
        "경고: JWT 서명을 검증하지 않습니다. 실제 액세스 토큰을 붙여 넣지 마세요.")+
        "\n\nHEADER\n"+JSON.stringify(data.header,null,2)+
        "\n\nPAYLOAD\n"+JSON.stringify(data.payload,null,2)+
        "\n\n"+txt("Expiration claim","만료 클레임")+": "+data.expiry+
        "\n"+txt("Not-before claim","사용 시작 클레임")+": "+data.notBefore+
        "\n\n"+data.warning;
      break;
    }
    case "base64-converter":{
      result=get("mode")==="decode"?base64Decode(get("source")):
        base64Encode(get("source"));
      break;
    }
    case "url-encoder":{
      const mode=get("mode"), source=get("source");
      if(mode==="encode")result=encodeUrlComponent(source);
      else if(mode==="decode")result=decodeUrlComponent(source);
      else {
        const info=inspectUrl(source);
        result=lineReport(
          ["Protocol","Host","Path","Fragment","Query parameters"],
          [info.protocol,info.hostname,info.pathname,info.fragment,
            String(info.parameterCount)])+
          "\n\n"+info.query.map(([k,v])=>k+" = "+v).join("\n")+
          "\n\n"+txt("Text inspection only; the URL was not opened.",
            "문자열 분석만 수행했으며 URL에 접속하지 않았습니다.");
      }
      break;
    }
    case "uuid-generator":{
      result=makeUuids(Number(get("count"))).join("\n");
      break;
    }
    case "jsonl-validator":{
      const data=validateJsonl(get("source"));
      result=txt("Valid records","유효 레코드")+": "+data.records+
        "\n"+txt("Blank lines skipped","건너뛴 빈 줄")+": "+data.skippedBlankLines+
        "\n"+txt("Objects","객체")+": "+data.recordTypes.objects+
        ", "+txt("Arrays","배열")+": "+data.recordTypes.arrays+
        ", "+txt("Primitives","원시값")+": "+data.recordTypes.primitives+
        "\n\n"+(data.valid?
          txt("Valid JSONL. JSON array preview:","정상적인 JSONL입니다. JSON 배열 미리보기:")+
            "\n"+data.jsonArray.slice(0,12000):
          txt("Errors (line numbers):","오류(줄 번호):")+
            "\n"+data.errors.map(e=>e.line+": "+e.message).join("\n"));
      if(data.valid) {
        validDownload=data.jsonArray;
        if(byId("download"))byId("download").disabled=false;
      }
      if(!data.valid) {
        output(result);
        status(txt("Validation failed; fix highlighted line numbers.",
          "검증 실패: 표시된 줄 번호를 수정하세요."),"warning");
        return;
      }
      break;
    }
    default:throw new Error("Unknown tool.");
   }
   output(result);
   status(txt("Completed in your browser. No data sent.","브라우저에서 완료했습니다. 데이터는 전송하지 않았습니다."),"success");
 }catch(error){
   const msg=String(error?.message||error).slice(0,400);
   status(msg,"error");
 }
}
function fillSample(){
 destroyRegexWorker();
 const samples={
  "regex-tester":()=>{set("pattern","(?<sku>TEE-[A-Z]{3}-\\d+)");set("flags","g");
    set("source","Order TEE-BLK-42 sent; replacement TEE-RED-19 ready.");
    set("replacement","SKU:$<sku>");},
  "cron-explainer":()=>{set("expression","*/15 9-17 * * 1-5");set("zone","UTC");},
  "unix-timestamp":()=>{set("epoch","1761652800");set("iso","");set("unit","auto");set("zone","Asia/Seoul");},
  "jwt-decoder":()=>set("source",
    "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJmaWN0aW9uYWwtdGVzdCIsImV4cCI6MjAwMDAwMDAwMH0.c2lnbmF0dXJl"),
  "base64-converter":()=>{set("mode","encode");set("source",lang==="ko"?"안녕하세요, CSV!":"Hello, CSV!");},
  "url-encoder":()=>{set("mode","inspect");set("source","https://example.org/tools?q=SKU%20audit&utm_source=docs");},
  "uuid-generator":()=>set("count","5"),
  "jsonl-validator":()=>set("source",'{"sku":"TEE-BLK-42","price":29}\n{"sku":"TEE-RED-19","price":31}\n')
 };
 samples[tool]?.();
 status(txt("Fictional sample loaded. Click Run.","가상 예제를 불러왔습니다. 실행을 눌러주세요."));
}
function clearEverything(){
 destroyRegexWorker();
 for(const item of document.querySelectorAll(".tool-workspace textarea,.tool-workspace input")) {
   if(item.type==="number")item.value="1"; else item.value="";
 }
 output("");
 status(txt("Cleared. Browser inputs are not stored.","지웠습니다. 입력은 서버에 저장되지 않습니다."));
 validDownload=null;
 if(byId("download"))byId("download").disabled=true;
 if(byId("highlights"))byId("highlights").replaceChildren();
}
byId("run")?.addEventListener("click",run);
byId("sample")?.addEventListener("click",fillSample);
byId("clear")?.addEventListener("click",clearEverything);
byId("copy")?.addEventListener("click",async()=>{
 try {
   await navigator.clipboard.writeText(byId("result").textContent);
   status(txt("Copied to clipboard.","클립보드에 복사했습니다."),"success");
 }catch{
   status(txt("Clipboard blocked. Select and copy output manually.",
     "클립보드 접근이 차단되었습니다. 결과를 직접 선택해 복사하세요."),"warning");
 }
});
byId("download")?.addEventListener("click",()=>{
 if(!validDownload)return;
 const blob=new Blob([validDownload],{type:"application/json;charset=utf-8"});
 const link=document.createElement("a");
 const uri=URL.createObjectURL(blob);
 link.href=uri;
 link.download="validated-jsonl-array.json";
 document.body.append(link);
 link.click();
 link.remove();
 setTimeout(()=>URL.revokeObjectURL(uri),2500);
 status(txt("JSON array downloaded locally.","JSON 배열을 기기에서 내려받았습니다."),"success");
});
