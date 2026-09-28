// 파일 용도: 고정 server.sh dispatch 패턴만 인식한다. 임의 shell 파서가 아니다.
export function parseServerDispatches(server) {
  const dispatches=[];
  const cases=/^ {2}([a-zA-Z0-9_.|-]+)\)\r?\n((?:(?!^ {2}[a-zA-Z0-9_.|-]+\))[^])*?)^ {4};;[ \t]*$/gm;
  const pair=/^[ \t]+require_internal ["']?([a-zA-Z0-9_-][a-zA-Z0-9_.-]*)["']?[ \t]*\r?\n[ \t]+exec (?:bash |node )?"(?:\$\{INTERNAL_DIR\}\/|\$(?:\{ROOT_DIR\}|ROOT_DIR)\/scripts\/internal\/)([a-zA-Z0-9_-][a-zA-Z0-9_.-]*)"(?:[ \t]+(?:[a-zA-Z0-9_.,:=\/-]+|"\$@"))*[ \t]*$/gm;
  for(const match of server.matchAll(cases)){
    for(const target of match[2].matchAll(pair)){
      if(target[1]!==target[2])continue;
      for(const command of match[1].split('|'))dispatches.push({command,script:target[2]});
    }
  }
  return dispatches;
}
