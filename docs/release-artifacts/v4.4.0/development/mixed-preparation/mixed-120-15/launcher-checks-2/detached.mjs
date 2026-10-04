import fs from "node:fs";
import {runCurrentRecovery} from "file:///Users/dhseo/Workspace/mediaServer/scripts/internal/recording_current_observer.mjs";
await runCurrentRecovery({command:process.execPath,args:["-e","setInterval(()=>{},1000)"],observe:()=>null,onGroup:e=>{fs.appendFileSync("/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/v440-launcher-checks-fy297guh/recovery-groups.jsonl",JSON.stringify(e)+"\n");if(e.event==="started"){while(true){}}}});
