#!/usr/bin/env python3
"""Generate 8 original, useful bilingual developer tools + bilingual directory.

No external API, tracker, accounts, advertising, network calls or dependencies.
Distinct functionality, content, canonical pages; no search-volume claims.
"""
from __future__ import annotations
import argparse
from pathlib import Path
from hashlib import sha256
from html import escape
from xml.etree import ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
DOCS=ROOT/"docs"
SITE="https://livastic-vm3-primary-tmp-260920.github.io/localdev-bench/"
ORIGINAL="https://tools.trendbridged.com/"
RELEASE_DAY="2026-10-28"
ORDER=["regex-tester","cron-explainer","unix-timestamp","jwt-decoder",
       "base64-converter","url-encoder","uuid-generator","jsonl-validator"]
D={
"regex-tester":{
 "en":{
  "name":"JavaScript Regex Tester","tag":"Patterns & log extraction",
  "title":"JavaScript Regex Tester — Matches, Groups & Replacement | LocalDev Bench",
  "description":"Free browser-local JavaScript regex tester. Try patterns with g/i/m/s/u flags, named captures, match offsets, highlighting and replace previews. Timeout-protected; no uploads.",
  "lead":"Extract order IDs, verify SKUs, or test a new regular expression without sending the sample text to a server.",
  "problem":"A seemingly simple regex can match the wrong rows, silently skip capture groups, or freeze an editor on pathological input. This tester shows each match, its text offsets, numbered and named groups, a non-destructive replacement preview, and a separate worker deadline.",
  "how":"Enter a JavaScript regular expression without enclosing slashes, select supported flags, and paste disposable sample text. Run the test and inspect the match list and highlighted spans. This deliberately runs the JavaScript engine, not PCRE, Python, Rust or .NET syntax.",
  "safety":"Potentially expensive expressions execute in a dedicated Web Worker with a bounded timeout. Results are capped at 100 matches and test input at 32,000 characters. No matches prove only that this test text didn't match—not that a pattern is safe for all inputs.",
  "faq":[
   ("Can this test Python's regex syntax?","No. It uses the browser JavaScript RegExp engine; Python named capture syntax and lookbehind availability differ. Test production expressions in the actual target runtime."),
   ("What happens if an expression hangs?","An isolated worker is terminated after a short deadline. This reduces the chance that a pathological pattern freezes the main page; it is not a security analysis of regular expressions."),
   ("Is the replacement applied to my original text?","No. The tester creates a separate preview. Your pasted test text remains unchanged until you edit or clear it.")
  ]
 },
 "ko":{
  "name":"JavaScript 정규식 테스트","tag":"패턴·로그 추출",
  "title":"정규식 테스트기 — JavaScript 매치·그룹·치환 미리보기 | LocalDev Bench",
  "description":"무료 JavaScript 정규식 테스트. g/i/m/s/u 플래그, 캡처 그룹·매치 위치·하이라이트·치환 미리보기를 브라우저에서 확인하세요. 업로드 없이 제한 시간 실행.",
  "lead":"주문번호·SKU·로그 패턴을 직접 검사하세요. 테스트 문장을 서버에 전송하지 않습니다.",
  "problem":"정규식은 일부 행만 매칭되거나 캡처 그룹이 빠질 수 있고, 지나치게 복잡하면 화면을 멈추게 할 수 있습니다. 매치별 시작·끝 위치와 번호·이름 캡처 그룹, 원본을 변경하지 않는 치환 미리보기를 제공합니다.",
  "how":"슬래시 없이 JavaScript 패턴을 입력하고 지원하는 플래그를 고른 뒤 가상의 테스트 문장을 붙여 넣으세요. 결과에서 일치 위치와 하이라이트를 확인합니다. Python·PCRE 문법과 완전히 같지는 않습니다.",
  "safety":"복잡한 정규식은 별도 작업자에서 제한 시간으로 실행합니다. 최대 100개 매치, 32,000자 샘플을 지원합니다. 한 샘플에서 성공했다고 모든 실제 입력에 안전한 패턴이라는 보장은 없습니다.",
  "faq":[
   ("Python 정규식 문법도 되나요?","아니요. 브라우저의 JavaScript RegExp 엔진을 사용하며 Python의 이름 있는 그룹 문법이나 지원 기능이 다를 수 있습니다."),
   ("무한 반복되는 정규식은 어떻게 되나요?","별도 작업자를 제한 시간 이후 종료합니다. 화면 멈춤 위험을 줄이지만 정규식 전체 보안 검증 기능은 아닙니다."),
   ("입력한 텍스트가 자동으로 바뀌나요?","아니요. 치환은 결과 창에만 표시합니다. 원본 테스트 문장은 직접 지울 때까지 유지됩니다.")
  ]
 }
},
"cron-explainer":{
 "en":{
  "name":"5-Field Cron Schedule Preview","tag":"Scheduling & timezone",
  "title":"Cron Expression Tester — Next 5 Runs in UTC or Local Time | LocalDev Bench",
  "description":"Preview the next five occurrences for standard 5-field Unix crontab expressions. Compare UTC and local timezone, ranges, lists, steps and weekday behavior. No login.",
  "lead":"Check whether a server job will run on Monday at 09:00 UTC or local time before you put it into production.",
  "problem":"A single timezone assumption can run a data import at the wrong hour. This tool calculates actual upcoming dates for standard five-field Unix cron schedules in either UTC or your device-local timezone, including day-of-month and day-of-week rules.",
  "how":"Enter minute, hour, day of month, month and weekday. Examples: 0 9 * * 1 (Monday at 09:00), */15 9-17 * * 1-5 (weekday quarter-hours). Select UTC for most hosted schedulers if the service documents UTC, or local when your runtime uses local time.",
  "safety":"Supports standard numeric Unix cron: asterisk, steps, lists and ranges. It does not accept Quartz seconds, ? or AWS EventBridge syntax. Preview searches up to 370 days; confirm your actual scheduler's timezone, DST interpretation and day-field semantics.",
  "faq":[
   ("Is this the same as AWS EventBridge or Quartz?","No. Those cron dialects use different numbers of fields and day-of-week rules. This is standard five-field Unix cron only."),
   ("What if both day-of-month and weekday are specified?","This tool follows the common Vixie crontab OR rule when both day fields are restricted; some schedulers use different behavior."),
   ("Are these guaranteed future executions?","No. They are matching calendar times. A paused server, disabled workflow, DST policy or scheduler configuration can prevent a job.")
  ]
 },
 "ko":{
  "name":"5필드 Cron 실행 시각 계산","tag":"예약 작업·시간대",
  "title":"Cron 표현식 계산기 — UTC·한국 시간 다음 실행 5회 | LocalDev Bench",
  "description":"무료 5필드 Unix cron 계산기. 분·시·일·월·요일 표현식, */15 간격, 범위, 다음 실행 시각 5개를 UTC 또는 내 기기 시간으로 확인하세요.",
  "lead":"예약 작업이 한국 시각인지 UTC인지 헷갈릴 때 실제 다음 실행 시각을 확인하세요.",
  "problem":"UTC와 로컬 시간대를 혼동하면 상품 가격 동기화나 백업 작업이 잘못된 시간에 실행됩니다. 표준 5필드 cron을 계산해 실제 앞으로의 날짜 5개를 보여주고, 일자·요일 동시 지정의 규칙도 설명합니다.",
  "how":"분, 시, 일, 월, 요일 순서로 5필드를 입력합니다. 예: 0 9 * * 1은 월요일 9시, */15 9-17 * * 1-5는 평일 근무 시간대 15분 간격입니다. 서버가 UTC 기준이라면 UTC를 선택해야 합니다.",
  "safety":"표준 숫자 Unix cron의 *, 간격, 쉼표 목록, 범위를 지원합니다. Quartz 초 단위 필드나 AWS EventBridge 표현식은 지원하지 않습니다. 실행 가능 날짜만 계산할 뿐 서버가 실제 실행된다고 보장하지 않습니다.",
  "faq":[
   ("AWS EventBridge와 Quartz도 지원하나요?","아니요. 필드 개수·요일 규칙이 달라 표준 5필드 Unix crontab으로 제한했습니다."),
   ("일자와 요일을 함께 지정하면요?","일반적인 Vixie crontab처럼 둘 중 하나만 맞아도 실행 후보로 판단합니다. 플랫폼별 규칙을 확인하세요."),
   ("다음 실행 시각이 실제 실행을 보장하나요?","아니요. 서버 정지·워크플로 비활성화·일광절약시간 설정으로 실제 실행 여부는 달라집니다.")
  ]
 }
},
"unix-timestamp":{
 "en":{
  "name":"Unix Timestamp Converter","tag":"Epoch time & debugging",
  "title":"Unix Timestamp Converter — Seconds, Milliseconds, Seoul & UTC | LocalDev Bench",
  "description":"Free Unix epoch converter. Paste a seconds or milliseconds timestamp, convert to UTC, Seoul or local time, and convert explicit-offset ISO 8601 dates back to epoch values.",
  "lead":"Paste a 10-digit epoch in seconds or a 13-digit millisecond timestamp and see the same moment across time zones.",
  "problem":"APIs, log lines, JSON responses and JavaScript Date values use different timestamp units. Confusing seconds and milliseconds changes a date by decades. The converter displays the detected unit, ISO UTC date, both integer epochs and human readable timezone versions.",
  "how":"Enter an integer epoch and choose Auto, Seconds or Milliseconds. Auto uses magnitude rather than digit count and can guess wrong for historical or unusual dates: use an explicit unit when known. Alternatively enter a full ISO timestamp with Z or an explicit offset.",
  "safety":"Conversion is deterministic but your device's clock/timezone and origin system's date semantics may differ. Epoch ranges outside JavaScript Date are rejected. DST gaps, historical calendars and server-side time libraries require additional verification.",
  "faq":[
   ("What is the difference between 10 and 13 digits?","A 10-digit contemporary epoch usually represents seconds; 13-digit values usually represent milliseconds. This is only a convention, so choose the unit explicitly for ambiguous input."),
   ("Does this convert between KST and UTC?","Yes. It shows absolute ISO UTC plus Korean standard time and a selected zone."),
   ("Can I enter a date without its timezone?","For converting ISO to epoch, no. Provide Z or an explicit offset such as +09:00 to avoid guessing which instant you intended.")
  ]
 },
 "ko":{
  "name":"Unix 타임스탬프 변환","tag":"Epoch·API 디버깅",
  "title":"Unix 타임스탬프 변환기 — 초·밀리초·한국시간·UTC | LocalDev Bench",
  "description":"Unix epoch 초·밀리초 변환기. 10자리/13자리 타임스탬프를 한국시간(KST), UTC, 내 시간대로 확인하고 ISO 8601 시간대 포함 시각을 변환합니다.",
  "lead":"로그와 API에서 나온 10자리 초·13자리 밀리초 시각을 한국 시간과 UTC로 확인합니다.",
  "problem":"Python 서버의 Unix 초와 JavaScript Date의 밀리초를 혼동하면 날짜가 수십 년 차이 날 수 있습니다. 입력 단위, ISO UTC, 초·밀리초 정수값과 한국·선택 시간대를 한 번에 보여줍니다.",
  "how":"타임스탬프 정수와 단위를 입력하거나 Z·+09:00 등이 붙은 ISO 시각을 입력합니다. 자동 단위 판별은 크기로 추정하므로 예전 날짜나 특이한 값에는 초/밀리초 단위를 직접 지정하세요.",
  "safety":"브라우저 Date가 지원하는 범위를 벗어난 값은 거부합니다. 기기 시계나 서버의 시간대 설정이 잘못된 경우 실제 이벤트 시간을 뜻하지 않을 수 있으므로 원본 로그와 비교하세요.",
  "faq":[
   ("10자리와 13자리 타임스탬프 차이는 뭔가요?","일반적으로 현재 시점의 10자리는 초, 13자리는 밀리초이지만 확정 규칙은 아닙니다. 확실한 단위를 직접 선택하세요."),
   ("UTC와 한국시간을 동시에 보여주나요?","예. 하나의 절대 시각을 UTC와 Asia/Seoul, 선택한 기기 시간대로 각각 변환합니다."),
   ("시간대가 없는 ISO 날짜를 입력할 수 있나요?","혼동을 막기 위해 Z 또는 +09:00처럼 명시적인 오프셋이 있어야 변환합니다.")
  ]
 }
},
"jwt-decoder":{
 "en":{
  "name":"JWT Header & Payload Decoder","tag":"Token structure inspection",
  "title":"JWT Decoder — Inspect Header, Payload & Expiry (No Verification) | LocalDev Bench",
  "description":"Decode a fictional JWT header and payload in your browser to inspect exp, nbf and fields. No network calls. Does NOT verify signatures or authorize a token; avoid real credentials.",
  "lead":"Inspect the JSON inside a disposable JSON Web Token without sending it to a server or pretending its signature is valid.",
  "problem":"Developers need to understand JWT fields such as alg, typ, sub, iss, exp and nbf. A token that decodes successfully is NOT a token whose signature, issuer, audience or authorization have been checked.",
  "how":"Use the fictional example or paste a disposable three-part token. The tool base64url-decodes the first two segments into readable JSON, reports expiry/not-before claims relative to your device clock, and explicitly leaves signature verification undone.",
  "safety":"Never paste real access tokens, refresh tokens or customer authentication data into websites. This source-visible browser-only decoder has no network requests, but decoded payloads are untrusted JSON. Claims alone never prove token authenticity.",
  "faq":[
   ("Is a decoded JWT valid?","No. Decoding is not signature verification. The tool does not verify alg keys, issuer, audience, intended use or revocation."),
   ("Does it use my OpenAI or Shopify account?","No. No token is transmitted or used for an API call. Use fictional test tokens only."),
   ("Does exp equal the true logout time?","Not necessarily. The exp claim is inside unverified payload data and your device clock may be inaccurate; a server can reject a token earlier.")
  ]
 },
 "ko":{
  "name":"JWT 헤더·페이로드 분석","tag":"토큰 구조 분석",
  "title":"JWT 디코더 — 헤더·페이로드·만료 클레임 확인(서명 미검증) | LocalDev Bench",
  "description":"JWT 테스트 토큰의 헤더·페이로드·exp/nbf 필드를 브라우저에서 확인하세요. 서명 검증이나 인증을 수행하지 않으며 실제 액세스 토큰 입력은 권장하지 않습니다.",
  "lead":"JWT 안의 JSON 필드를 이해하기 위한 로컬 분석 도구입니다. 실제 인증 성공 여부는 확인하지 않습니다.",
  "problem":"개발자는 alg, typ, sub, iss, exp와 nbf 같은 필드를 살펴볼 때가 많습니다. 하지만 토큰 내용이 디코딩된다고 서명이 올바르거나 접근 권한이 확인된 것은 아닙니다.",
  "how":"가상 예제를 사용하거나 폐기 가능한 테스트 JWT 세 조각을 입력하세요. 헤더·페이로드를 base64url에서 JSON으로 읽고 만료·사용 시작 클레임을 기기 시계와 비교합니다. 서명은 검사하지 않습니다.",
  "safety":"실제 액세스 토큰, 갱신 토큰 또는 타인 인증 정보를 웹사이트에 붙여 넣지 마세요. 이 서비스는 서버 요청이 없지만 JWT의 클레임 내용은 검증되지 않은 값으로 취급해야 합니다.",
  "faq":[
   ("디코딩되면 유효한 JWT인가요?","아니요. alg 서명, 발급자, 대상, 권한 또는 폐기 여부를 전혀 검증하지 않습니다."),
   ("OpenAI나 Shopify 계정에 접속하나요?","아니요. 어떤 토큰도 API 호출에 사용하지 않습니다. 가상 테스트 값만 사용하세요."),
   ("exp가 지나면 반드시 로그아웃되나요?","보장되지 않습니다. exp는 검증되지 않은 데이터이고 서버는 해당 시각 이전에도 토큰을 거부할 수 있습니다.")
  ]
 }
},
"base64-converter":{
 "en":{
  "name":"UTF-8 Base64 Encoder & Decoder","tag":"Encoding & API payloads",
  "title":"Base64 Encode/Decode — UTF-8 Text, Unicode & Validation | LocalDev Bench",
  "description":"Free browser-local Base64 encoder and decoder for UTF-8 text, including Korean and emojis. Strict padding validation and clear binary-versus-text errors, no uploads.",
  "lead":"Encode non-ASCII JSON text for a test payload or decode a Base64 string without losing Korean or emoji characters.",
  "problem":"Classic btoa/atob can corrupt or reject Unicode strings because Base64 operates on bytes, not text characters. This tool explicitly uses UTF-8 for input and output, rejects malformed padding and explains binary data that isn't valid UTF-8.",
  "how":"Choose Encode or Decode, paste disposable text, then click Run. The result can be copied into your test request. Base64 is an encoding, not encryption or confidentiality protection.",
  "safety":"Text mode only. This UI does not decode arbitrary binary files, PEM certificates or data URLs. It never submits input or output to any API, but you should still avoid placing confidential secrets in shareable URLs.",
  "faq":[
   ("Will Korean characters work?","Yes. The encoder converts Unicode text to UTF-8 bytes before Base64. The decoder requires valid UTF-8 output."),
   ("Is Base64 a way to secure a password?","No. It only changes representation. Anyone can decode it; use proper encryption and credential handling."),
   ("Can I decode images or zip files?","Not in this text-only tool. Binary files may not be UTF-8 and are intentionally rejected.")
  ]
 },
 "ko":{
  "name":"Base64 인코딩·디코딩","tag":"UTF-8 인코딩",
  "title":"Base64 인코더·디코더 — 한글·UTF-8 텍스트 변환 | LocalDev Bench",
  "description":"한글·이모지 UTF-8 Base64 무료 인코딩 및 디코딩. 올바른 패딩을 검사하고 텍스트만 변환합니다. 업로드·회원가입 없음.",
  "lead":"한글·이모지 등의 문자가 깨지지 않도록 UTF-8을 사용한 Base64 변환을 합니다.",
  "problem":"Base64는 문자가 아니라 바이트를 처리하므로 단순 btoa/atob는 한글에서 오류가 날 수 있습니다. 텍스트를 UTF-8로 인코딩하고 패딩과 잘못된 UTF-8 복원 오류를 명확히 구분합니다.",
  "how":"인코딩 또는 디코딩을 고른 후 가상 텍스트를 입력하고 실행하면 됩니다. 결과는 테스트 API 요청에 복사할 수 있습니다. 단, Base64는 암호화가 아닙니다.",
  "safety":"텍스트 전용입니다. 이미지·압축파일 등의 바이너리 데이터를 무리하게 텍스트로 해독하지 않습니다. 서버 전송이 없지만 비밀번호를 공유 URL에 넣지 마세요.",
  "faq":[
   ("한글과 이모지도 되나요?","예. Unicode 텍스트를 UTF-8 바이트로 바꾼 뒤 Base64 인코딩합니다."),
   ("Base64면 비밀번호가 안전한가요?","아니요. 누구나 디코딩할 수 있습니다. 비밀 데이터는 별도의 암호화가 필요합니다."),
   ("이미지나 압축파일도 되나요?","이 기능은 UTF-8 텍스트 전용이며 바이너리 파일 해독은 지원하지 않습니다.")
  ]
 }
},
"url-encoder":{
 "en":{
  "name":"URL Encoder, Decoder & Query Inspector","tag":"Web request debugging",
  "title":"URL Encode/Decode & Query String Inspector — LocalDev Bench",
  "description":"Encode or decode URL query-component text and inspect URL path, host, fragment and UTM parameters in your browser. No requests to the inspected URL.",
  "lead":"Check exactly what an API parameter or marketing UTM query string contains without opening that link.",
  "problem":"A space, percent sign or double-encoded query value can silently break links and webhook parameters. This tool supports component encoding, percent/plus decoding and readable query parameter inspection with duplicate keys preserved.",
  "how":"For a single query value choose Encode; for a percent-encoded value choose Decode. Inspect takes a complete http(s) URL and splits protocol, hostname, path, fragment and every query key/value without contacting the destination.",
  "safety":"URLs are treated as text. Inspection is never a network test of the destination, redirect or tracking endpoint. A copied URL may still contain personal information or tokens; avoid sharing such links.",
  "faq":[
   ("What is the difference between encodeURI and encodeURIComponent?","Component encoding escapes reserved separators such as ampersand, equals and question mark, making it suitable for an individual query value."),
   ("Does the inspector click or fetch the URL?","No. It parses the URL locally without navigating to it or resolving its host."),
   ("Can I inspect duplicate UTM or query keys?","Yes. The query list retains duplicate keys in order so you can spot accidental repeated parameters.")
  ]
 },
 "ko":{
  "name":"URL 인코딩·디코딩·쿼리 분석","tag":"웹 요청 디버깅",
  "title":"URL 인코더·디코더·쿼리 파라미터 분석기 | LocalDev Bench",
  "description":"URL 쿼리 인코딩·디코딩, UTM 파라미터·중복 키·경로·도메인 검사. 입력한 URL에 접속하지 않고 브라우저에서만 처리합니다.",
  "lead":"UTM 링크나 API 요청의 % 인코딩과 쿼리 파라미터를 실제 접속 없이 분석하세요.",
  "problem":"공백이나 %기호, 이중 인코딩으로 webhook 및 광고 캠페인 URL이 깨질 수 있습니다. 쿼리 값 인코딩, +/% 디코딩, 중복 키를 포함한 URL 세부 항목을 표시합니다.",
  "how":"한 개의 쿼리 값은 인코딩, 퍼센트 값은 디코딩, 완전한 https URL은 분석을 선택합니다. 도메인·경로·fragment·UTM 등 모든 파라미터를 순서대로 볼 수 있습니다.",
  "safety":"URL은 문자열로만 해석하고 접속이나 리디렉션을 수행하지 않습니다. URL에 개인 정보·비밀 토큰이 포함돼 있다면 복사해 공유하지 마세요.",
  "faq":[
   ("encodeURI와 encodeURIComponent 차이는 뭔가요?","쿼리 값 인코딩은 &, =, ? 등 구분 문자를 이스케이프하므로 개별 파라미터에 적합합니다."),
   ("검사하면 해당 사이트에 접속하나요?","아니요. 외부 호스트에 요청하지 않고 브라우저 안에서 문자열만 분석합니다."),
   ("중복된 UTM 파라미터도 보이나요?","예. 반복된 같은 이름의 쿼리 키를 순서 그대로 보여줍니다.")
  ]
 }
},
"uuid-generator":{
 "en":{
  "name":"UUID v4 Generator","tag":"Identifiers & fixtures",
  "title":"Random UUID v4 Generator — Bulk Secure IDs | LocalDev Bench",
  "description":"Generate 1–100 cryptographically random UUID v4 identifiers directly in your browser. Local crypto.randomUUID, copy as lines, no signup or database calls.",
  "lead":"Need safe unique-looking IDs for fixtures, migration samples or request correlation without a server round trip?",
  "problem":"Hand-written test identifiers can accidentally collide or use an invalid format. A real UUID v4 uses random bytes and carries a recognizable version/variant structure; this generator uses the browser's cryptographic random source.",
  "how":"Choose a count from 1 to 100, click Generate and copy the result. Each button press creates new UUID v4 strings locally, suitable for non-secret fixture identifiers and request correlation.",
  "safety":"UUIDs are identifiers, not passwords or authentication tokens. Collision risk is low but not mathematically impossible. An application must still enforce uniqueness at its own storage boundary.",
  "faq":[
   ("Are generated UUIDs guaranteed unique forever?","No finite random generator guarantees uniqueness. UUID v4 collisions are extraordinarily unlikely at ordinary scale, but databases should enforce unique constraints."),
   ("Is this secure enough for passwords?","No. Do not use plain UUIDs as passwords, bearer tokens or encryption keys."),
   ("Do you log the generated values?","No. They are created in browser memory and shown only in the current tab.")
  ]
 },
 "ko":{
  "name":"UUID v4 랜덤 생성기","tag":"테스트 데이터·식별자",
  "title":"UUID v4 생성기 — 안전한 랜덤 ID 최대 100개 | LocalDev Bench",
  "description":"브라우저 crypto.randomUUID로 UUID v4를 1~100개 생성합니다. 테스트 고유 ID·요청 추적용, 회원가입·저장·서버 통신 없음.",
  "lead":"개발·테스트에 사용할 새 UUID v4 식별자를 1~100개 생성하고 복사하세요.",
  "problem":"규칙 없이 만든 테스트 ID는 형식이 틀리거나 충돌할 수 있습니다. UUID v4는 표준 버전·변형 비트와 랜덤 값이 있으며 브라우저의 암호학적 난수원을 사용합니다.",
  "how":"필요한 개수를 1~100 사이로 고르고 실행하면 한 줄에 하나씩 새 UUID가 생성됩니다. 가상 데이터, 요청 로그 추적, 테스트 레코드에 활용하세요.",
  "safety":"UUID는 비밀번호나 액세스 토큰이 아닙니다. 충돌 가능성은 매우 작지만 0이 아니므로 실제 DB에서는 고유 제약 조건을 따로 유지하세요.",
  "faq":[
   ("UUID가 100% 영원히 유일한가요?","아니요. 일반적인 규모에서 충돌 가능성은 극히 낮지만 DB의 고유키 검증이 필요합니다."),
   ("비밀번호로 사용해도 되나요?","안 됩니다. UUID를 인증 비밀이나 암호화 키로 사용하면 안 됩니다."),
   ("생성된 값은 서버에 저장되나요?","아니요. 브라우저 메모리에서 생성하고 현재 화면에만 보여줍니다.")
  ]
 }
},
"jsonl-validator":{
 "en":{
  "name":"JSONL / NDJSON Validator","tag":"Automation & data pipelines",
  "title":"JSONL Validator — Check NDJSON Lines & Export JSON Array | LocalDev Bench",
  "description":"Validate JSONL/NDJSON line by line, find exact line numbers for parse errors, count record types and download a JSON array. Browser-local, no data upload.",
  "lead":"Validate OpenAI batch requests, n8n logs or NDJSON streams before they enter a data pipeline.",
  "problem":"A file can contain individually valid JSON objects separated by newlines but fail as one JSON document. JSONL requires one parseable JSON value per nonempty line; a stray comma or newline inside a record can break a batch. This tool identifies the exact lines and exports a standard JSON array when all lines pass.",
  "how":"Paste a few fictional NDJSON lines, then click Validate. Inspect line-specific errors, record counts and object/array/value types. Export JSON only when validation succeeds. For CSV/JSON table conversion, the separate free LocalCSV Lab tools may be more suitable.",
  "safety":"This is a syntactic parser only; it does not verify OpenAI Batch schema, n8n node types or business-level data correctness. It doesn't submit your rows to any API. Avoid huge or sensitive production dumps in any third-party page.",
  "faq":[
   ("How is JSONL different from a JSON array?","JSONL has one complete JSON value per line. A JSON array encloses all records in [ ] with commas; this validator can produce an array only if every nonblank line parses."),
   ("Can I use this as an OpenAI Batch API validator?","It checks JSON syntax by line only, not request shape, model access or API eligibility."),
   ("Will it upload the NDJSON file?","No. Pasted text is parsed and converted on your device, and the download is generated locally.")
  ]
 },
 "ko":{
  "name":"JSONL·NDJSON 파일 검사","tag":"자동화·배치 데이터",
  "title":"JSONL·NDJSON 검사기 — 오류 줄 번호·JSON 배열 변환 | LocalDev Bench",
  "description":"JSONL/NDJSON을 줄마다 검사하고 파싱 오류 줄 번호를 찾아줍니다. 정상 레코드를 JSON 배열로 내보냅니다. 업로드 없는 무료 브라우저 도구.",
  "lead":"OpenAI 배치 요청이나 n8n 로그처럼 한 줄에 하나씩 있는 JSON 데이터를 검사하세요.",
  "problem":"각 줄은 정상 JSON인데 파일 전체를 하나의 JSON 객체로 처리해 실패하는 경우가 있습니다. JSONL은 비어 있지 않은 줄마다 완전한 JSON 값이어야 합니다. 잘못된 쉼표·따옴표 등의 줄 번호를 찾아줍니다.",
  "how":"가상의 JSONL 텍스트를 붙여 넣고 검사하면 오류 줄 번호, 정상 레코드 수와 자료형이 표시됩니다. 모든 줄이 정상일 때만 JSON 배열로 내보낼 수 있습니다. 표 형태 CSV로 변환하려면 별도 LocalCSV Lab 도구를 활용하세요.",
  "safety":"JSON 구문만 검사합니다. OpenAI Batch API 요청 구조나 n8n 노드 규격, 업무용 필드 정확성을 확인하는 기능은 아닙니다. 데이터는 서버에 업로드하지 않습니다.",
  "faq":[
   ("JSONL과 JSON 배열의 차이는 뭔가요?","JSONL은 한 줄에 완전한 JSON 값이 하나씩 있습니다. JSON 배열은 대괄호 안에 쉼표로 구분된 값들이 들어 있습니다."),
   ("OpenAI Batch API 요청도 검증하나요?","줄별 JSON 구문만 검사하며 API 요청 형식이나 모델·권한은 검증하지 않습니다."),
   ("원본 NDJSON 파일을 업로드하나요?","아니요. 입력한 텍스트를 내 브라우저에서 처리하고 다운로드 파일도 기기에서 만듭니다.")
  ]
 }
}
}

def esc(text:object)->str:
 return escape(str(text),quote=True)
def field(label:str,id:str,tag:str="textarea",extra:str="")->str:
 if tag=="textarea":
  return f'<label for="{id}">{esc(label)}</label><textarea id="{id}" rows="7" spellcheck="false" {extra}></textarea>'
 if tag=="text":
  return f'<label for="{id}">{esc(label)}</label><input type="text" id="{id}" spellcheck="false" autocomplete="off" {extra}>'
 if tag=="number":
  return f'<label for="{id}">{esc(label)}</label><input type="number" id="{id}" min="1" max="100" value="5" {extra}>'
 raise ValueError(tag)

def select(label:str,id:str,options:list[tuple[str,str]])->str:
 parts=[f'<label for="{id}">{esc(label)}</label><select id="{id}">']
 for key,text in options:
  parts.append(f'<option value="{esc(key)}">{esc(text)}</option>')
 return ''.join(parts)+'</select>'

def workspace(tool:str,lang:str)->str:
 ko=lang=="ko"
 t=lambda en,k: k if ko else en
 if tool=="regex-tester":
  return (f'<div class="fields two">{field(t("Regex pattern","정규식 패턴"),"pattern","text")}'
          f'{field(t("JavaScript flags (gimsu)","JS 플래그 (gimsu)"),"flags","text")}</div>'
          +field(t("Test text (disposable sample only)","테스트 문장(가상 데이터)"),"source")
          +field(t("Replacement preview (optional)","치환 미리보기(선택)"),"replacement","text")
          +'<div class="highlight-label">'+esc(t("Highlighted matches","강조된 일치 문자열"))+
          '</div><div class="highlights" id="highlights" aria-label="Highlighted regex results"></div>')
 if tool=="cron-explainer":
  return field(t("5-field cron expression","5필드 Cron 표현식"),"expression","text",'placeholder="*/15 9-17 * * 1-5"')+select(t("Interpretation zone","해석 시간대"),"zone",[
    ("UTC","UTC"),("local",t("Device local time","기기 현지 시간"))])
 if tool=="unix-timestamp":
  return (field(t("Unix integer timestamp (preferred)","Unix 정수 타임스탬프"),"epoch","text",'placeholder="1761652800"')+
          select(t("Unit","단위"),"unit",[("auto",t("Auto (magnitude guess)","자동(크기 추정)")),("seconds",t("Seconds","초")),("milliseconds",t("Milliseconds","밀리초"))])+
          field(t("Or ISO 8601 with Z / offset (if epoch empty)","또는 Z/시간대가 포함된 ISO 8601(위 항목 비울 때)"),"iso","text",'placeholder="2026-10-28T12:00:00+09:00"')+
          select(t("Show local result in","변환 결과 시간대"),"zone",[("Asia/Seoul","Seoul / KST"),("UTC","UTC"),("device",t("My device","내 기기"))]))
 if tool=="jwt-decoder":
  return field(t("Fictional three-part JWT (never a real access token)","가상 3부분 JWT(실제 인증 토큰 금지)"),"source")
 if tool=="base64-converter":
  return select(t("Action","처리 방식"),"mode",[("encode",t("Encode UTF-8 text","UTF-8 인코딩")),("decode",t("Decode Base64 into UTF-8","Base64→UTF-8 디코딩"))])+field(t("Text or Base64 string","텍스트 또는 Base64 문자열"),"source")
 if tool=="url-encoder":
  return select(t("Action","처리 방식"),"mode",[
    ("encode",t("Encode query component","쿼리 값 인코딩")),("decode",t("Decode percent-encoded component","% 인코딩 디코딩")),("inspect",t("Inspect URL without opening it","URL 접속 없이 분석"))])+field(t("URL or component text","URL 또는 쿼리 텍스트"),"source")
 if tool=="uuid-generator":
  return field(t("Number of UUID v4 IDs (1–100)","UUID v4 생성 개수(1–100)"),"count","number")
 if tool=="jsonl-validator":
  return field(t("NDJSON: one JSON value per line","NDJSON: 한 줄에 JSON 값 하나씩"),"source")
 raise ValueError(tool)

def page(tool:str,lang:str)->str:
 data=D[tool][lang];ko=lang=="ko"
 words={
  "en":{
   "brand":"LocalDev Bench","subtitle":"Original privacy-first developer tools",
   "home":"All tools","back":"Back to tools",
   "label":"Free tool · Runs entirely in your browser","workspace":"Try it with a fictional sample",
   "formNote":"No uploads, cookies, tracking or third-party scripts. Your input stays in browser memory.",
   "run":"Run tool","sample":"Load fictional example","clear":"Clear inputs","copy":"Copy output",
   "download":"Download JSON array","results":"Output","status":"Ready. Enter a test value.",
   "usage":"How to use it","problem":"What problem does this solve?","safety":"Scope and limitations",
   "faq":"Common questions","also":"Other independent free developer tools",
   "related":"Related free CSV and JSON tools","relatedText":"For actual spreadsheet CSV/JSON transformation, LocalCSV Lab offers separate free, privacy-first tools. Informational pages show optional ads only after explicit opt-in; the file editors are ad-free.",
   "relatedLink":"Open CSV/JSON tools","sources":"Source code","footer":"Free, original and independent. No analytics or advertising on this site. Hosting may log ordinary HTTP metadata for file delivery. Test with fictional data.",
   "privacy":"Never paste production passwords, live JWT access tokens or private customer records."
  },
  "ko":{
   "brand":"LocalDev Bench","subtitle":"개인정보를 존중하는 독립 개발 도구",
   "home":"전체 도구","back":"도구 목록",
   "label":"무료 도구 · 브라우저 내부에서만 실행","workspace":"가상 예제로 직접 사용해 보세요",
   "formNote":"파일 업로드·쿠키·분석 추적·외부 스크립트 없음. 입력은 브라우저 메모리에서만 처리합니다.",
   "run":"실행","sample":"가상 예제 불러오기","clear":"입력 지우기","copy":"결과 복사",
   "download":"JSON 배열 다운로드","results":"결과","status":"준비됐습니다. 테스트 데이터를 입력하세요.",
   "usage":"사용 방법","problem":"어떤 문제를 해결하나요?","safety":"지원 범위와 주의사항",
   "faq":"자주 묻는 질문","also":"다른 독립 무료 개발자 도구",
   "related":"관련 무료 CSV·JSON 도구","relatedText":"스프레드시트 CSV와 JSON 변환이 필요하면 LocalCSV Lab에서 이용할 수 있습니다. 정보 페이지의 광고는 명시적으로 동의했을 때만 선택적으로 표시되고 파일 편집기는 무광고입니다.",
   "relatedLink":"무료 CSV·JSON 도구 열기","sources":"공개 소스코드","footer":"무료·독립·자체 개발 도구이며 이 사이트에는 분석 추적이나 광고가 없습니다. 호스팅에서는 파일 제공에 필요한 기본 HTTP 정보가 처리될 수 있습니다.",
   "privacy":"실제 비밀번호·JWT 액세스 토큰·고객 개인정보는 붙여 넣지 마세요."
  }
 }[lang]
 base=SITE+("ko/" if ko else "")
 canonical=base+tool+"/"
 asset="../../assets/"
 links=''.join(f'<a href="{base}{name}/">{esc(D[name][lang]["name"])}</a>' for name in ORDER if name!=tool)
 questions=''.join(f'<details><summary>{esc(question)}</summary><p>{esc(answer)}</p></details>' for question,answer in data["faq"])
 actions=f'''<div class="actions">
  <button type="button" id="run" class="primary">{esc(words["run"])}</button>
  <button type="button" id="sample">{esc(words["sample"])}</button>
  <button type="button" id="clear">{esc(words["clear"])}</button>
  <button type="button" id="copy" disabled>{esc(words["copy"])}</button>'''
 if tool=="jsonl-validator":actions+=f'<button type="button" id="download" disabled>{esc(words["download"])}</button>'
 actions+='</div>'
 return f"""<!doctype html>
<html lang="{lang}">
<head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="index,follow,max-snippet:-1">
<meta name="referrer" content="no-referrer">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self'; worker-src 'self'; connect-src 'none'; img-src 'self' data:; frame-src 'none'; object-src 'none'; form-action 'none'; base-uri 'none'">
<title>{esc(data["title"])}</title>
<meta name="description" content="{esc(data["description"])}">
<link rel="canonical" href="{canonical}">
<link rel="alternate" hreflang="en" href="{SITE}{tool}/">
<link rel="alternate" hreflang="ko" href="{SITE}ko/{tool}/">
<link rel="alternate" hreflang="x-default" href="{SITE}{tool}/">
<meta name="theme-color" content="#0b1417">
<link rel="icon" href="data:,">
<link rel="stylesheet" href="{asset}style.css">
<script type="module" src="{asset}app.mjs"></script>
</head>
<body data-tool="{tool}">
<a class="skip" href="#workspace">{esc(words["workspace"])}</a>
<header class="site-header">
 <div class="wrap header-inner">
  <a href="{base}" class="brand">◇ <span>{esc(words["brand"])}<small>{esc(words["subtitle"])}</small></span></a>
  <nav class="header-nav" aria-label="Navigation">
    <a href="{base}">{esc(words["home"])}</a>
    <a href="{SITE}{tool}/" lang="en" {'aria-current="page"' if not ko else ''}>EN</a>
    <a href="{SITE}ko/{tool}/" lang="ko" {'aria-current="page"' if ko else ''}>한국어</a>
  </nav>
 </div>
</header>
<main class="wrap">
 <nav class="breadcrumbs"><a href="{base}">{esc(words["back"])}</a> / {esc(data["name"])}</nav>
 <section class="intro">
  <span class="eyebrow">{esc(words["label"])}</span>
  <h1>{esc(data["name"])}</h1>
  <p class="lead">{esc(data["lead"])}</p>
  <p class="privacy">{esc(words["privacy"])}</p>
 </section>
 <section class="work-grid" id="workspace" aria-label="{esc(data["name"])}">
  <div class="tool-workspace">
   <div class="section-top"><h2>{esc(words["workspace"])}</h2><span class="tag">{esc(data["tag"])}</span></div>
   <p class="form-note">{esc(words["formNote"])}</p>
   <div class="form-fields">{workspace(tool,lang)}</div>
   {actions}
  </div>
  <div class="results" aria-label="{esc(words["results"])}">
   <div class="section-top"><h2>{esc(words["results"])}</h2><span class="tag">LOCAL</span></div>
   <p class="status" id="status" data-kind="info" role="status" aria-live="polite">{esc(words["status"])}</p>
   <pre id="result" tabindex="0" aria-label="{esc(words["results"])}"></pre>
  </div>
 </section>
 <div class="editorial">
  <article><h2>{esc(words["problem"])}</h2><p>{esc(data["problem"])}</p></article>
  <article><h2>{esc(words["usage"])}</h2><p>{esc(data["how"])}</p></article>
  <article><h2>{esc(words["safety"])}</h2><p>{esc(data["safety"])}</p></article>
 </div>
 <section class="faq"><h2>{esc(words["faq"])}</h2>{questions}</section>
 <section class="other-tools"><h2>{esc(words["also"])}</h2><div class="other-links">{links}</div></section>
 <aside class="external-cta">
   <div><h2>{esc(words["related"])}</h2><p>{esc(words["relatedText"])}</p></div>
   <a href="{ORIGINAL}" rel="noopener noreferrer">{esc(words["relatedLink"])}</a>
 </aside>
</main>
<footer class="site-footer"><div class="wrap"><p>{esc(words["footer"])}</p>
 <p><a href="https://github.com/livastic-vm3-primary-tmp-260920/localdev-bench" rel="noopener noreferrer">{esc(words["sources"])}</a></p></div></footer>
</body></html>"""

def home(lang:str)->str:
 ko=lang=="ko"
 base=SITE+("ko/" if ko else "")
 title=("무료 개발자 도구 8종 — 정규식·Cron·JWT·Base64·JSONL | LocalDev Bench"
        if ko else "8 Free Browser Developer Tools — Regex, Cron, JWT, Base64 & JSONL | LocalDev Bench")
 desc=("정규식·Cron·Unix 타임스탬프·JWT·Base64·URL·UUID·JSONL 도구 8종. "
       "브라우저에서만 처리하며 광고·회원가입·입력 전송이 없습니다." if ko else
       "Eight real browser-based tools: JavaScript regex, cron, epoch time, JWT structure, Base64, URL parsing, UUID and JSONL. No login, ads or uploaded inputs.")
 heading=("작고 반복적인 개발 작업을\n더 빠르고 안전하게." if ko else
         "Small dev tasks.\nSolved locally.")
 intro=("클릭하는 순간 바로 쓰는 여덟 가지 무료 개발 도구입니다. API 응답·로그·자동화 설정을 내 브라우저에서 검사하세요. 등록이나 광고 동의가 필요하지 않습니다." if ko else
        "Eight original utilities for the tasks that interrupt a coding session: regex matching, cron schedules, timestamps, token structure, encoding and NDJSON. Everything runs on your device.")
 cards=''.join(
    f'<article class="tool-card"><span class="tag">{esc(D[tool][lang]["tag"])}</span>'
    f'<h2><a href="{base}{tool}/">{esc(D[tool][lang]["name"])}</a></h2>'
    f'<p>{esc(D[tool][lang]["lead"])}</p><a class="card-link" href="{base}{tool}/">'
    f'{"무료로 열기" if ko else "Open free tool"} ↗</a></article>' for tool in ORDER)
 return f"""<!doctype html><html lang="{lang}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="index,follow,max-snippet:-1">
<meta name="referrer" content="no-referrer">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self'; worker-src 'self'; connect-src 'none'; img-src 'self' data:; frame-src 'none'; object-src 'none'; form-action 'none'; base-uri 'none'">
<title>{esc(title)}</title><meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{base}">
<link rel="alternate" hreflang="en" href="{SITE}">
<link rel="alternate" hreflang="ko" href="{SITE}ko/">
<link rel="alternate" hreflang="x-default" href="{SITE}">
<meta name="theme-color" content="#0b1417"><link rel="icon" href="data:,">
<link rel="stylesheet" href="{"../" if ko else ""}assets/style.css">
</head><body>
<header class="site-header"><div class="wrap header-inner">
<a class="brand" href="{base}">◇ <span>LocalDev Bench<small>{"개인정보를 존중하는 무료 개발 도구" if ko else "Original privacy-first developer tools"}</small></span></a>
<nav class="header-nav"><a href="{SITE}" lang="en" {'aria-current="page"' if not ko else ''}>EN</a>
<a href="{SITE}ko/" lang="ko" {'aria-current="page"' if ko else ''}>한국어</a></nav>
</div></header>
<main class="wrap">
<section class="home-hero">
 <div class="eyebrow">{"무료 · 광고 없음 · 회원가입 없음" if ko else "Free · No ads · No account"}</div>
 <h1>{esc(heading).replace(chr(10),'<br>')}</h1>
 <p>{esc(intro)}</p>
 <a class="primary hero-link" href="#tools">{"도구 선택하기" if ko else "Choose a tool"} ↓</a>
 <div class="trust"><span>{"8개 실제 실행 도구" if ko else "8 working utilities"}</span>
 <span>{"외부 입력 전송 없음" if ko else "No input sent off-device"}</span>
 <span>{"오픈소스" if ko else "Original open source"}</span></div>
</section>
<section class="cards-section" id="tools"><div class="section-top">
<h2>{"어떤 작업이 필요한가요?" if ko else "What do you need to do?"}</h2><span class="tag">8 TOOLS</span></div>
<div class="cards">{cards}</div></section>
<section class="principles">
<h2>{"왜 브라우저에서 실행하나요?" if ko else "Why browser-local?"}</h2>
<p>{"사용자가 붙여 넣은 텍스트·JWT 구조·정규식·JSONL은 원격 API로 보내지지 않습니다. 광고나 통계 추적 스크립트도 없습니다. 다만 실제 비밀번호나 개인 토큰은 웹사이트에 붙여 넣지 않는 것이 안전합니다."
 if ko else "Text, JWT examples, regex samples and JSONL records are processed locally. No analytics or advertising SDK is loaded. Avoid pasting live passwords and bearer tokens into websites, even privacy-conscious ones."}</p>
<p>{"이 목록은 경쟁 제품의 코드를 복사하지 않고 새로 구현했습니다. 실제 사용 수요를 테스트하기 위한 무료 도구이며 트래픽·Google 상위노출·수익을 보장하지 않습니다."
 if ko else "These are original implementations of common developer workflows—not copies of another site's code or interface. A useful new page does not guarantee Google search ranking or visitors."}</p>
</section>
<aside class="external-cta"><div><h2>{"스프레드시트 CSV 문제도 있나요?" if ko else "Working with CSV spreadsheets?"}</h2>
<p>{"별도 LocalCSV Lab 무료 CSV·JSON 편집기를 이용해 보세요. 정보 페이지의 광고는 명시적으로 동의한 경우에만 제공하며 파일 편집기는 무광고입니다."
if ko else "Try the separate free LocalCSV Lab CSV/JSON workflow tools. Informational pages may show optional ads only after affirmative consent; file editors remain ad-free."}</p></div>
<a href="{ORIGINAL}" rel="noopener noreferrer">{"CSV·JSON 도구 열기" if ko else "Explore CSV tools"} ↗</a></aside>
</main><footer class="site-footer"><div class="wrap">
<p>{"독립 무료 오픈소스 · 입력 수집 없음 · GitHub Pages 호스팅은 파일 제공에 필요한 일반 HTTP 정보를 처리할 수 있습니다."
if ko else "Independent open-source utilities. No input collection; GitHub Pages may process ordinary HTTP metadata to serve files."}</p>
<p><a href="https://github.com/livastic-vm3-primary-tmp-260920/localdev-bench" rel="noopener noreferrer">{"소스코드" if ko else "Source code"}</a></p>
</div></footer></body></html>"""

def build()->dict[Path,bytes]:
 out={
   DOCS/"index.html":home("en").encode("utf8"),
   DOCS/"ko"/"index.html":home("ko").encode("utf8"),
   DOCS/".nojekyll":b"",
   DOCS/"assets"/"core.mjs":(ROOT/"src/core.mjs").read_bytes()
 }
 for lang in ("en","ko"):
  for slug in ORDER:
   out[DOCS/("ko" if lang=="ko" else "")/slug/"index.html"]=page(slug,lang).encode("utf8")
 urls=[SITE,SITE+"ko/"]+[SITE+slug+"/" for slug in ORDER]+[
  SITE+"ko/"+slug+"/" for slug in ORDER]
 sitemap='<?xml version="1.0" encoding="UTF-8"?>\n'
 sitemap+='<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
 for url in urls:
  sitemap+="<url><loc>"+url+"</loc><lastmod>"+RELEASE_DAY+"</lastmod></url>\n"
 sitemap+="</urlset>\n"
 out[DOCS/"sitemap.xml"]=sitemap.encode("utf8")
 return out

def validate(out:dict[Path,bytes])->None:
 assert len(ORDER)==len(set(ORDER))==8
 assert all(len(D[t][lng]["lead"])>=35 for t in ORDER for lng in ("en","ko"))
 titles=set()
 for p,v in out.items():
  if p.suffix!=".html":continue
  body=v.decode("utf8")
  assert body.count("<h1")==1
  assert body.count('rel="canonical"')==1
  assert body.count('hreflang="en"')==1
  assert body.count('hreflang="ko"')==1
  assert "connect-src 'none'" in body and "worker-src 'self'" in body
  assert "adsbygoogle" not in body and "googletagmanager" not in body
  assert "localStorage" not in body and "<iframe" not in body
  assert "index,follow" in body
  assert len(body)>4100
  title=body.split("<title>",1)[1].split("</title>",1)[0]
  assert title not in titles,("Duplicate title",title)
  titles.add(title)
 assert len(titles)==18
 assert len([p for p in out if p.suffix==".html"])==18
 xml=out[DOCS/"sitemap.xml"]
 entries=ET.fromstring(xml).findall(".//{*}loc")
 assert len(entries)==18
 assert len({x.text for x in entries})==18

def main()->None:
 parser=argparse.ArgumentParser()
 parser.add_argument("--check",action="store_true")
 args=parser.parse_args()
 files=build();validate(files)
 for path,byte in files.items():
  if args.check:
   if not path.exists() or path.read_bytes()!=byte:
    raise SystemExit("Built file differs: "+str(path))
  else:
   path.parent.mkdir(parents=True,exist_ok=True)
   path.write_bytes(byte)
  print(("VERIFIED" if args.check else "BUILT"),str(path.relative_to(ROOT)),len(byte),sha256(byte).hexdigest())
 print("LOCALDEV_BENCH_BILINGUAL_8_REAL_TOOLS_18_SEARCH_CANONICALS_REPRODUCIBLE")

if __name__=="__main__":main()
