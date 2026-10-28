import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,readdirSync,statSync} from "node:fs";
import {execFileSync} from "node:child_process";

const base="https://livastic-vm3-primary-tmp-260920.github.io/localdev-bench/";
const slugs=[
 "regex-tester","cron-explainer","unix-timestamp","jwt-decoder",
 "base64-converter","url-encoder","uuid-generator","jsonl-validator"
];
function read(path){return readFileSync("docs/"+path,"utf8");}

test("all 18 bilingual standalone HTML pages have truly distinct, crawlable SEO metadata",()=>{
 const out=execFileSync("python3",["scripts/build_site.py","--check"],{
   encoding:"utf8",timeout:9000});
 assert.match(out,/LOCALDEV_BENCH_BILINGUAL_8_REAL_TOOLS_18_SEARCH_CANONICALS_REPRODUCIBLE/);
 const titles=new Set();
 for(const lang of ["en","ko"]){
  const prefix=lang==="ko"?"ko/":"";
  const all=["",...slugs.map(x=>x+"/")];
  for(const path of all){
   const html=read(prefix+path+"index.html");
   const title=html.match(/<title>(.*?)<\/title>/)?.[1];
   assert.ok(title?.length>24,path);
   assert.ok(!titles.has(title),"duplicate title "+title);
   titles.add(title);
   assert.equal((html.match(/<h1[ >]/g)||[]).length,1);
   assert.equal((html.match(/rel="canonical"/g)||[]).length,1);
   assert.equal((html.match(/hreflang="en"/g)||[]).length,1);
   assert.equal((html.match(/hreflang="ko"/g)||[]).length,1);
   assert.ok(html.includes('<html lang="'+lang+'">'));
   assert.ok(html.includes('href="'+base+prefix+path+'"'));
   const canonicalBase="https://devtools.trendbridged.com/";
   const canonical=canonicalBase+prefix+path;
   assert.ok(html.includes('rel="canonical" href="'+canonical+'"'),
     "Demo pages choose real branded canonical: "+prefix+path);
   assert.ok(html.includes('hreflang="en" href="'+canonicalBase+path+'"'));
   assert.ok(html.includes('hreflang="ko" href="'+canonicalBase+"ko/"+path+'"'));

   assert.ok(html.includes('content="index,follow'));
   assert.ok(html.includes("connect-src 'none'"));
   assert.ok(html.includes("worker-src 'self'"));
   assert.ok(html.includes('name="description"'));
   assert.ok(html.includes("<link rel=\"icon\" href=\"data:,\"></link>")===false);
   assert.ok(html.length>5000);
   for(const bad of ["adsbygoogle","adsterra.com","googletagmanager",
      "<iframe","navigator.sendBeacon(","window.location.search",
      "document.cookie","api_key","data:text/javascript"]){
     assert.ok(!html.toLowerCase().includes(bad.toLowerCase()),bad+" "+prefix+path);
   }
   if(path){
     assert.ok(html.includes('id="run"'));
     assert.ok(html.includes('id="sample"'));
     assert.ok(html.includes('id="clear"'));
     assert.ok(html.includes('id="copy"'));
     assert.ok(html.includes('id="result"'));
     assert.ok(html.includes('id="status"'));
     assert.ok(html.includes('<details>'));
     assert.ok(html.includes("LocalCSV Lab")||html.includes("LocalCSV"));
     assert.equal((html.match(/<script type="module"/g)||[]).length,1);
   }
  }
 }
 assert.equal(titles.size,18);
});

test("all 18 visible pages offer voluntary Trendbridge navigation, and JSONL links to related JSON-to-CSV",()=>{
 const base="https://tools.trendbridged.com/";
 const ids=["regex-tester","cron-explainer","unix-timestamp","jwt-decoder",
  "base64-converter","url-encoder","uuid-generator","jsonl-validator"];
 for(const lang of ["en","ko"]){
   const prefix=lang==="ko"?"ko/":"";
   for(const file of ["index.html",...ids.map(x=>x+"/index.html")]){
     const html=read(prefix+file);
     assert.ok(html.includes('href="'+base+'" rel="noopener noreferrer"'),
       "Branded navigation exists: "+prefix+file);
     assert.ok(!html.includes("window.location.href="));
     assert.ok(!html.includes("<iframe"));
   }
   const jsonl=read(prefix+"jsonl-validator/index.html");
   assert.ok(jsonl.includes('href="'+base+'tools/json-to-csv/" rel="noopener noreferrer"'));
   assert.ok(jsonl.includes(lang==="ko"?"JSON 배열을 CSV로 변환":"Convert JSON arrays to CSV"));
 }
 // User must select a real link; no JavaScript navigation, ad injection or redirect.
 const app=read("assets/app.mjs");
 assert.ok(!app.includes("location.replace"));
 assert.ok(!app.includes("location.assign"));
 assert.ok(!app.includes("tools.trendbridged.com"));
});

test("all relevant source and public core files are synchronized without external runtime dependencies",()=>{
 assert.deepEqual(readFileSync("src/core.mjs"),readFileSync("docs/assets/core.mjs"));
 const ui=read("assets/app.mjs");
 const worker=read("assets/regex-worker.mjs");
 assert.ok(ui.includes("new Worker("));
 assert.ok(ui.includes("800"));
 assert.ok(worker.includes("runRegex"));
 assert.ok(ui.includes("textContent"));
 assert.ok(ui.includes("createTextNode"));
 assert.ok(!ui.includes("innerHTML"));
 assert.ok(!ui.includes("localStorage"));
 assert.ok(!ui.includes("fetch("));
 assert.ok(!ui.includes("XMLHttpRequest"));
 assert.ok(!ui.includes("eval("));
 assert.ok(!ui.includes("navigator.sendBeacon"));
 assert.ok(!worker.includes("fetch("));
 const css=read("assets/style.css");
 assert.ok(css.includes("@media(max-width:620px)"));
 assert.ok(css.includes(":focus-visible"));
 assert.equal(statSync("docs/.nojekyll").size,0);
});

test("18 canonicals in sitemap exactly match 18 actual unique HTML files",()=>{
 const sitemap=read("sitemap.xml");
 const urls=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
 const expected=[
   base,base+"ko/",
   ...slugs.map(s=>base+s+"/"),
   ...slugs.map(s=>base+"ko/"+s+"/")
 ];
 assert.deepEqual(urls,expected);
 assert.equal(new Set(urls).size,18);
 assert.match(sitemap,/sitemaps.org/);
 assert.ok(urls.every(u=>!u.includes("?")));
});

test("eight tools have real distinct workspaces and an opt-in-ads-disclosed contextual original site reference",()=>{
 const en=slugs.map(slug=>read(slug+"/index.html"));
 assert.equal(en.length,8);
 assert.ok(en[0].includes('id="pattern"'));
 assert.ok(en[0].includes('id="highlights"'));
 assert.ok(en[1].includes('id="expression"'));
 assert.ok(en[2].includes('id="epoch"'));
 assert.ok(en[3].includes('id="source"'));
 assert.ok(en[4].includes('id="mode"'));
 assert.ok(en[5].includes('id="mode"'));
 assert.ok(en[6].includes('id="count"'));
 assert.ok(en[7].includes('id="download"'));
 for(const html of en){
   assert.ok(html.includes('href="https://tools.trendbridged.com/"'));
   assert.ok(html.includes("only after explicit opt-in"));
   assert.ok(!html.includes("https://bauval.org/"));
   assert.ok(!html.includes("autoplay"));
 }
});
