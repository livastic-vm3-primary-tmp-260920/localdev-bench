/**
 * LocalDev Bench: eight original browser-local developer utilities.
 * No cookies, account data, analytics, advertising, external requests or deps.
 */
export const TOOL_IDS = Object.freeze([
  "regex-tester", "cron-explainer", "unix-timestamp", "jwt-decoder",
  "base64-converter", "url-encoder", "uuid-generator", "jsonl-validator"
]);
const TEXT_LIMIT = 120000;
const JSONL_LIMIT = 300000;

function bounded(raw, cap = TEXT_LIMIT) {
  if (typeof raw !== "string") throw new Error("Enter text.");
  if (raw.length > cap) throw new Error("Input is too large for this browser tool.");
  return raw;
}

export function runRegex(pattern, flags, text, replacement = "") {
  bounded(pattern, 512);
  bounded(flags, 12);
  bounded(text, 32000);
  bounded(replacement, 1000);
  if (/[^gimsu]/.test(flags) || new Set(flags).size !== flags.length) {
    throw new Error("Use unique JavaScript regex flags: g, i, m, s, u.");
  }
  const effective = flags.includes("g") ? flags : flags + "g";
  const re = new RegExp(pattern, effective);
  const matches = [];
  let match;
  let truncated = false;
  while ((match = re.exec(text)) !== null) {
    if (matches.length >= 100) {
      truncated = true;
      break;
    }
    matches.push({
      start:match.index,
      end:match.index + match[0].length,
      text:match[0],
      groups:match.slice(1).map(x => x ?? null),
      namedGroups:match.groups ? {...match.groups} : {}
    });
    if (match[0].length === 0) {
      // Always advance; otherwise /^/gm or /\b/g could lock the tab.
      if (re.unicode && re.lastIndex < text.length) {
        const cp = text.codePointAt(re.lastIndex);
        re.lastIndex += cp > 0xffff ? 2 : 1;
      } else re.lastIndex++;
    }
  }
  re.lastIndex = 0;
  const replaced = text.replace(re, replacement);
  return {matches, truncated, replaced, engine:"JavaScript RegExp"};
}

function rangeArray(min, max, mapping = x => x) {
  const result = [];
  for (let i = min; i <= max; i++) result.push(mapping(i));
  return result;
}
const CRON_RANGES = Object.freeze([[0,59],[0,23],[1,31],[1,12],[0,7]]);
function parseCronField(part, index) {
  const [min,max] = CRON_RANGES[index];
  if (!part || !/^[0-9*,/-]+$/.test(part)) {
    throw new Error("Cron accepts numbers, *, lists, ranges and steps only.");
  }
  const out = new Set();
  for (const item of part.split(",")) {
    if (!item) throw new Error("Cron has an empty list item.");
    const bits = item.split("/");
    if (bits.length > 2) throw new Error("Too many / step separators.");
    const [field, stepRaw] = bits;
    let step = 1;
    if (stepRaw !== undefined) {
      if (!/^\d+$/.test(stepRaw)) throw new Error("Cron step must be numeric.");
      step = Number(stepRaw);
      if (step < 1 || step > max - min + 1) throw new Error("Cron step is outside this field.");
    }
    let low,high;
    if (field === "*") {low=min;high=max;}
    else if (/^\d+$/.test(field)) {
      low=Number(field);high=stepRaw === undefined ? low : max;
    } else if (/^\d+-\d+$/.test(field)) {
      [low,high] = field.split("-").map(Number);
    } else throw new Error("Unsupported cron field: " + item);
    if (low < min || high > max || high < low) throw new Error("Cron field is out of range.");
    for (let v=low;v<=high;v+=step) out.add(index === 4 && v === 7 ? 0 : v);
  }
  return out;
}

export function parseCron(expression) {
  bounded(expression, 200);
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) {
    throw new Error("Enter exactly 5 fields: minute hour day month weekday (not Quartz).");
  }
  const sets = parts.map((s,i)=>parseCronField(s,i));
  return {
    expression:parts.join(" "),
    sets,
    domAny:parts[2] === "*",
    dowAny:parts[4] === "*",
    fields:["minute","hour","day of month","month","day of week"],
    kind:"standard Unix/crontab (5 fields)"
  };
}

export function cronMatches(parse, date, zone = "UTC") {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return false;
  if (zone !== "UTC" && zone !== "local") throw new Error("Choose UTC or device-local cron time.");
  const utc=zone === "UTC";
  const minute=utc?date.getUTCMinutes():date.getMinutes();
  const hour=utc?date.getUTCHours():date.getHours();
  const dom=utc?date.getUTCDate():date.getDate();
  const month=(utc?date.getUTCMonth():date.getMonth())+1;
  const dow=utc?date.getUTCDay():date.getDay();
  if (!parse.sets[0].has(minute) || !parse.sets[1].has(hour) ||
      !parse.sets[3].has(month)) return false;
  const domMatches=parse.sets[2].has(dom);
  const dowMatches=parse.sets[4].has(dow);
  if (parse.domAny && parse.dowAny) return true;
  if (parse.domAny) return dowMatches;
  if (parse.dowAny) return domMatches;
  // Standard Vixie cron uses OR when both day fields are restricted.
  return domMatches || dowMatches;
}

export function nextCronRuns(expression, start = new Date(), zone = "UTC", wanted = 5) {
  const parse = parseCron(expression);
  if (!(start instanceof Date) || Number.isNaN(start.getTime()) ||
      !["UTC","local"].includes(zone) || !Number.isInteger(wanted) ||
      wanted < 1 || wanted > 10) throw new Error("Invalid cron preview parameters.");
  const upcoming=[];
  const t0=Math.floor(start.getTime()/60000)*60000 + 60000;
  const horizon=370 * 24 * 60;
  let scanned=0;
  for (let i=0;i<horizon && upcoming.length<wanted;i++) {
    const candidate=new Date(t0+i*60000);
    scanned++;
    if (cronMatches(parse,candidate,zone)) upcoming.push(candidate.toISOString());
  }
  return {expression:parse.expression, zone, next:upcoming,
    truncated:upcoming.length<wanted, scannedMinutes:scanned,
    semantics:"5-field Unix cron; day-of-month/day-of-week OR when both restricted"};
}

export function unixToDates(raw, mode = "auto") {
  bounded(raw, 60);
  const input=raw.trim();
  if (!/^[+-]?\d{1,18}$/.test(input)) throw new Error("Enter an integer Unix timestamp.");
  if (!["auto","seconds","milliseconds"].includes(mode)) throw new Error("Invalid timestamp unit.");
  const big=BigInt(input);
  const unit=mode==="auto" ? (big >= 100000000000n || big <= -100000000000n ?
    "milliseconds":"seconds") : mode;
  const ms=unit==="seconds" ? big*1000n : big;
  if (ms > 8640000000000000n || ms < -8640000000000000n) {
    throw new Error("Timestamp is outside the JavaScript Date range.");
  }
  const date=new Date(Number(ms));
  if (Number.isNaN(date.getTime())) throw new Error("Invalid timestamp.");
  return {
    unit, iso:date.toISOString(), seconds:String(ms>=0n ? ms/1000n : (ms-999n)/1000n),
    milliseconds:String(ms), epochMilliseconds:Number(ms)
  };
}
export function dateToUnix(isoWithOffset) {
  bounded(isoWithOffset, 70);
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,3})?)?(?:Z|[+-]\d\d:\d\d)$/.test(isoWithOffset.trim())) {
    throw new Error("Use ISO 8601 with Z or explicit timezone, e.g. 2026-10-28T13:00:00Z.");
  }
  const date=new Date(isoWithOffset.trim());
  if (Number.isNaN(date.getTime())) throw new Error("Invalid ISO date or timezone.");
  const input=isoWithOffset.trim();
  const y=Number(input.slice(0,4)),mo=Number(input.slice(5,7)),day=Number(input.slice(8,10));
  const h=Number(input.slice(11,13)),m=Number(input.slice(14,16));
  const sec=input[16] === ":" ? Number(input.slice(17,19)) : 0;
  const offsetMatch=input.match(/([+-])(\d\d):(\d\d)$/);
  if (mo<1||mo>12||day<1||day>new Date(Date.UTC(y,mo,0)).getUTCDate()||
      h>23||m>59||sec>59|| (offsetMatch &&
      (Number(offsetMatch[2])>14 || (Number(offsetMatch[2])===14&&Number(offsetMatch[3])!==0) ||
       Number(offsetMatch[3])>59))) throw new Error("Invalid ISO calendar date or UTC offset.");
  return unixToDates(String(date.getTime()),"milliseconds");
}
export function formatInTimeZone(epochMs, zone = "UTC", locale = "en") {
  const date=new Date(epochMs);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid time.");
  return new Intl.DateTimeFormat(locale==="ko"?"ko-KR":"en-US",{
    year:"numeric",month:"long",day:"numeric",weekday:"short",
    hour:"2-digit",minute:"2-digit",second:"2-digit",timeZone:zone,
    timeZoneName:"short",hour12:false
  }).format(date);
}

function fromBase64Url(input) {
  if (!/^[A-Za-z0-9_-]+$/.test(input)) throw new Error("Invalid base64url JWT segment.");
  const text=input.replace(/-/g,"+").replace(/_/g,"/");
  const pad="=".repeat((4-text.length%4)%4);
  const binary=atob(text+pad);
  const buf=Uint8Array.from(binary, c=>c.charCodeAt(0));
  return new TextDecoder("utf-8",{fatal:true}).decode(buf);
}

export function decodeJwt(token) {
  bounded(token,40000);
  const pieces=token.trim().split(".");
  if (pieces.length !== 3 || pieces.some(x=>x.length===0)) {
    throw new Error("JWT needs exactly 3 nonempty dot-separated segments.");
  }
  let header,payload;
  try {
    header=JSON.parse(fromBase64Url(pieces[0]));
    payload=JSON.parse(fromBase64Url(pieces[1]));
  } catch {
    throw new Error("JWT header or payload is not valid UTF-8 JSON.");
  }
  if (!header || !payload || typeof header !== "object" ||
      typeof payload !== "object" || Array.isArray(header) || Array.isArray(payload)) {
    throw new Error("JWT header and payload should be JSON objects.");
  }
  const now=Math.floor(Date.now()/1000);
  const exp=Number.isSafeInteger(payload.exp) ? payload.exp : null;
  const nbf=Number.isSafeInteger(payload.nbf) ? payload.nbf : null;
  return {header,payload,signatureVerified:false,
    expiry:exp===null?"unknown":exp<=now?"expired":"timestamp-in-future",
    notBefore:nbf===null?"unknown":nbf>now?"timestamp-in-future":"elapsed",
    warning:"Decoded does NOT mean trusted. Signature, issuer, audience and token authorization were NOT verified. Avoid pasting live credentials."};
}

export function base64Encode(text) {
  bounded(text,100000);
  const buffer=new TextEncoder().encode(text);
  let binary="";
  for (let i=0;i<buffer.length;i+=4096) {
    binary+=String.fromCharCode(...buffer.subarray(i,i+4096));
  }
  return btoa(binary);
}
export function base64Decode(text) {
  bounded(text,160000);
  const normalized=text.trim().replace(/\s+/g,"");
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(normalized)){
    throw new Error("Enter valid standard Base64 (proper padding).");
  }
  const bytes=Uint8Array.from(atob(normalized),c=>c.charCodeAt(0));
  try{return new TextDecoder("utf-8",{fatal:true}).decode(bytes);}
  catch{throw new Error("Decoded bytes are not UTF-8 text.");}
}

export function encodeUrlComponent(text) {
  bounded(text,60000);
  return encodeURIComponent(text);
}
export function decodeUrlComponent(text) {
  bounded(text,180000);
  try{return decodeURIComponent(text.replace(/\+/g," "));}
  catch {throw new Error("Malformed % sequence or invalid UTF-8 URL component.");}
}
export function inspectUrl(text) {
  bounded(text,16000);
  let url;
  try {url=new URL(text.trim());}
  catch {throw new Error("Enter a complete URL including https://.");}
  if (!["http:","https:"].includes(url.protocol)) {
    throw new Error("Only http: or https: URL strings can be inspected.");
  }
  const entries=[...url.searchParams.entries()];
  if (entries.length > 100) throw new Error("Too many query parameters.");
  return {protocol:url.protocol,hostname:url.hostname,pathname:url.pathname,
    fragment:url.hash,query:entries,parameterCount:entries.length,
    safeNotice:"Parsed as text only; no requests sent or links followed."};
}

export function makeUuids(count=1) {
  const n=Number(count);
  if (!Number.isInteger(n)||n<1||n>100)throw new Error("Enter 1–100 UUIDs.");
  if (!globalThis.crypto?.randomUUID) throw new Error("Secure random UUID is unavailable.");
  return Array.from({length:n},()=>globalThis.crypto.randomUUID());
}

export function validateJsonl(raw) {
  bounded(raw,JSONL_LIMIT);
  const lines=raw.split(/\r?\n/);
  if (lines.length>10000) throw new Error("Too many JSONL lines (max 10,000).");
  const rows=[], errors=[];
  let skipped=0;
  for (let i=0;i<lines.length;i++) {
    const line=lines[i].trim();
    if(!line){skipped++;continue;}
    try {
      rows.push(JSON.parse(line));
    } catch(e) {
      if(errors.length<30)errors.push({line:i+1,message:String(e.message).slice(0,160)});
    }
  }
  const valid=errors.length===0 && rows.length>0;
  const kindCounts={objects:0,arrays:0,primitives:0};
  for(const item of rows) {
    if(Array.isArray(item))kindCounts.arrays++;
    else if(item!==null&&typeof item==="object")kindCounts.objects++;
    else kindCounts.primitives++;
  }
  return {
    valid,records:rows.length,skippedBlankLines:skipped,
    errors,recordTypes:kindCounts,
    jsonArray:valid?JSON.stringify(rows,null,2):null,
    warning:"Each nonempty line must be valid JSON. JSONL is not a Shopify product CSV."
  };
}
