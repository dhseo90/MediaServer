import fs from "node:fs";
import {runCurrentRecovery} from "file:///Users/dhseo/Workspace/mediaServer/scripts/internal/recording_current_observer.mjs";
const r=await runCurrentRecovery({command:process.execPath,args:["-e","setInterval(()=>{},1000)"],observe:()=>null,onGroup:()=>{throw Error("fixture registration failure")}});console.log(JSON.stringify(r));
