import fs from "node:fs";
import {runCurrentRecovery} from "file:///Users/dhseo/Workspace/mediaServer/scripts/internal/recording_current_observer.mjs";
const r=await runCurrentRecovery({command:process.execPath,args:["-e","process.exit(0)"],observe:()=>null});console.log(JSON.stringify(r));
