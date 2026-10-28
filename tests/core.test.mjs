import test from "node:test";
import assert from "node:assert/strict";
import {
 TOOL_IDS, runRegex, parseCron, cronMatches, nextCronRuns, unixToDates,
 dateToUnix, formatInTimeZone, decodeJwt, base64Encode,base64Decode,
 encodeUrlComponent,decodeUrlComponent,inspectUrl,makeUuids,validateJsonl
} from "../src/core.mjs";

test("eight distinct real tool implementations",()=>{
 assert.equal(TOOL_IDS.length,8);
 assert.equal(new Set(TOOL_IDS).size,8);
});
test("regex detects match offsets, named groups, replacement and zero-width expressions",()=>{
 const v=runRegex("(?<sku>TEE-[A-Z]{3}-\\d+)","g",
   "SKU TEE-BLK-42 then TEE-RED-19","[SKU:$<sku>]");
 assert.equal(v.matches.length,2);
 assert.equal(v.matches[0].start,4);
 assert.equal(v.matches[0].namedGroups.sku,"TEE-BLK-42");
 assert.equal(v.matches[1].text,"TEE-RED-19");
 assert.equal(v.truncated,false);
 assert.ok(v.replaced.includes("[SKU:TEE-BLK-42]"));
 assert.equal(runRegex("NO-MATCH","g","yes").matches.length,0);
 const zero=runRegex("^","gm","a\nb");
 assert.equal(zero.matches.length,2);
 assert.equal(zero.truncated,false);
 assert.throws(()=>runRegex("(","g","hello"),SyntaxError);
 assert.throws(()=>runRegex("a","gg","a"),/unique/);
 assert.throws(()=>runRegex("a","e","a"),/unique/);
 assert.throws(()=>runRegex("a","g","x".repeat(32001)),/too large/);
});
test("regex stops at 100 results and marks truncation instead of making a false full-result claim",()=>{
 const result=runRegex(".","g","a".repeat(150));
 assert.equal(result.matches.length,100);
 assert.equal(result.truncated,true);
});
test("five-field cron parser validates ranges, steps, lists, Vixie day OR behavior",()=>{
 const hourly=parseCron("0 */4 * * *");
 assert.equal(hourly.sets[1].has(0),true);
 assert.equal(hourly.sets[1].has(4),true);
 assert.equal(hourly.sets[1].has(5),false);
 assert.equal(cronMatches(hourly,new Date("2026-10-28T08:00:00Z")),true);
 assert.equal(cronMatches(hourly,new Date("2026-10-28T09:00:00Z")),false);
 const split=parseCron("0 9 1 * 1");
 assert.equal(cronMatches(split,new Date("2026-06-01T09:00:00Z")),true);
 assert.equal(cronMatches(split,new Date("2026-06-08T09:00:00Z")),true);
 assert.equal(cronMatches(split,new Date("2026-06-09T09:00:00Z")),false);
 assert.throws(()=>parseCron("0 0 * * * *"),/5 fields/);
 assert.throws(()=>parseCron("0 0 ? * *"),/numbers/);
 assert.throws(()=>parseCron("0 24 * * *"),/out of range/);
 assert.throws(()=>parseCron("*/0 * * * *"),/step/);
 assert.throws(()=>parseCron("0 0 31-1 * *"),/out of range/);
 assert.throws(()=>parseCron("0 0 1,,2 * *"),/empty/);
});
test("cron preview returns real next five UTC runs and bounded empty schedule",()=>{
 const from=new Date("2026-10-28T07:12:00Z");
 const result=nextCronRuns("0 9 * * *",from,"UTC",5);
 assert.equal(result.next.length,5);
 assert.equal(result.next[0],"2026-10-28T09:00:00.000Z");
 assert.equal(result.next[1],"2026-10-29T09:00:00.000Z");
 assert.equal(result.truncated,false);
 const none=nextCronRuns("0 9 31 2 *",from,"UTC",1);
 assert.equal(none.next.length,0);
 assert.equal(none.truncated,true);
 assert.throws(()=>nextCronRuns("* * * * *",from,"Mars"),/Invalid cron/);
});
test("timestamp seconds, milliseconds, negative, explicit timezone and date validity",()=>{
 const a=unixToDates("1761652800","seconds");
 const b=unixToDates("1761652800000","milliseconds");
 assert.equal(a.iso,b.iso);
 assert.equal(a.unit,"seconds");
 assert.equal(b.unit,"milliseconds");
 assert.equal(unixToDates("0","seconds").iso,"1970-01-01T00:00:00.000Z");
 const before=unixToDates("-1","milliseconds");
 assert.equal(before.iso,"1969-12-31T23:59:59.999Z");
 assert.equal(before.seconds,"-1");
 assert.equal(dateToUnix("2026-10-28T21:00:00+09:00").iso,"2026-10-28T12:00:00.000Z");
 assert.match(formatInTimeZone(Date.parse("2026-10-28T12:00:00Z"),"Asia/Seoul","ko"),/21시 0분/);
 assert.throws(()=>dateToUnix("2026-02-30T12:00Z"),/Invalid ISO calendar/);
 assert.throws(()=>dateToUnix("2026-10-28T12:00"),/explicit timezone/);
 assert.throws(()=>unixToDates("123abc"),/integer/);
 assert.throws(()=>unixToDates("999999999999999999"),/outside/);
});
const encodeSegment=value=>Buffer.from(JSON.stringify(value)).toString("base64url");
test("JWT decodes fictional claims but NEVER asserts signature, audience or authorization",()=>{
 const input=[
   encodeSegment({alg:"none",typ:"JWT"}),
   encodeSegment({sub:"fictional",exp:2000000000,iat:1700000000}),
   "fake-signature"
 ].join(".");
 const j=decodeJwt(input);
 assert.equal(j.header.alg,"none");
 assert.equal(j.payload.sub,"fictional");
 assert.equal(j.signatureVerified,false);
 assert.match(j.warning,/NOT verified/);
 assert.equal(j.expiry,"timestamp-in-future");
 assert.throws(()=>decodeJwt("a.b"),/3 nonempty/);
 assert.throws(()=>decodeJwt("eyJldmlsIjpmYWxzZX0.!!!!.sig"),/UTF-8 JSON/);
});
test("Base64 UTF-8 Unicode roundtrip and binary/invalid padding rejection",()=>{
 const input="안녕하세요 😀 Hello 世界";
 assert.equal(base64Decode(base64Encode(input)),input);
 assert.equal(base64Encode("hi"),"aGk=");
 assert.equal(base64Decode("aGk="),"hi");
 assert.throws(()=>base64Decode("aGk"),/valid standard/);
 assert.throws(()=>base64Decode("!!!!"),/valid standard/);
 assert.throws(()=>base64Decode("//8="),/not UTF-8/);
 assert.throws(()=>base64Encode("x".repeat(100001)),/too large/);
});
test("URL component encode, percent/plus decode, and duplicate UTM query inspection without fetching",()=>{
 const text="한글 & a=b ?";
 assert.equal(decodeUrlComponent(encodeUrlComponent(text)),text);
 assert.equal(decodeUrlComponent("hello+world"),"hello world");
 const info=inspectUrl("https://example.com/a/b?q=first&q=second&utm_source=demo#faq");
 assert.equal(info.hostname,"example.com");
 assert.equal(info.query[0][0],"q");
 assert.equal(info.query[1][1],"second");
 assert.equal(info.parameterCount,3);
 assert.equal(info.fragment,"#faq");
 assert.match(info.safeNotice,/no requests sent/);
 assert.throws(()=>inspectUrl("javascript:alert(1)"),/http/);
 assert.throws(()=>decodeUrlComponent("%ZZ"),/Malformed/);
});
test("UUID v4 uses cryptographic random generator and 100 values follow format",()=>{
 const list=makeUuids(100);
 assert.equal(list.length,100);
 assert.equal(new Set(list).size,100);
 for(const uuid of list)assert.match(uuid,
   /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
 assert.throws(()=>makeUuids(0),/1–100/);
 assert.throws(()=>makeUuids(101),/1–100/);
 assert.throws(()=>makeUuids(2.3),/1–100/);
});
test("JSONL validator counts, finds line numbers and exports only fully valid records",()=>{
 const good=validateJsonl('{"x":1}\n\n{"x":2}\n[1,2]\n');
 assert.equal(good.valid,true);
 assert.equal(good.records,3);
 assert.equal(good.recordTypes.objects,2);
 assert.equal(good.recordTypes.arrays,1);
 assert.equal(good.skippedBlankLines,2);
 assert.deepEqual(JSON.parse(good.jsonArray),[{x:1},{x:2},[1,2]]);
 const bad=validateJsonl('{"x":1}\n{"x":}\n{"x":3}');
 assert.equal(bad.valid,false);
 assert.equal(bad.errors[0].line,2);
 assert.equal(bad.jsonArray,null);
 const none=validateJsonl("\n   \n");
 assert.equal(none.valid,false);
 assert.equal(none.records,0);
 assert.throws(()=>validateJsonl("x".repeat(300001)),/too large/);
});
