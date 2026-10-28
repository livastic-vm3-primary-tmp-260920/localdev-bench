/* Isolated regex execution: the caller terminates this worker after 800 ms. */
import {runRegex} from "./core.mjs";
self.addEventListener("message", event=>{
  const {pattern,flags,text,replacement}=event.data||{};
  try {
    const result=runRegex(pattern,flags,text,replacement);
    self.postMessage({ok:true,result});
  } catch(error) {
    self.postMessage({ok:false,error:String(error?.message||error).slice(0,300)});
  }
});
