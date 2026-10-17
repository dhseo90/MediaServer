// 두 내부 수집기의 byte framing만 공유한다. raw payload/전체 로그를 보유하지 않는다.
export function diagnosticLines(prefixes, maxWireBytes) {
  let carry=Buffer.alloc(0), skip=false;
  const buffers=prefixes.map(x=>Buffer.from(x));
  const relevant=b=>buffers.some(p=>b.subarray(0,Math.min(b.length,p.length)).equals(p.subarray(0,Math.min(b.length,p.length))));
  return {
    append(chunk, accept) {
      const input=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);
      let at=0;
      while(at<input.length){
        const end=input.indexOf(10,at), stop=end<0?input.length:end;
        if(!skip){
          const size=carry.length+stop-at;
          if(size+1>maxWireBytes){
            // Prefix 판별에 필요한 작은 범위만 복사한다. 무관한 큰 줄은 개행까지 건너뛴다.
            const head=Buffer.concat([carry.subarray(0,64),input.subarray(at,Math.min(stop,at+64))]).subarray(0,64);
            if(relevant(head))throw Error('diagnostic-wire-cap');
            skip=true;carry=Buffer.alloc(0);
          }else carry=Buffer.concat([carry,input.subarray(at,stop)]);
        }
        if(end<0)break;
        if(!skip&&carry.length&&relevant(carry)){
          const text=new TextDecoder('utf-8',{fatal:true}).decode(carry);
          accept(text,carry.length+1);
        }
        carry=Buffer.alloc(0);skip=false;at=end+1;
      }
    },
    finish(){if(carry.length&&relevant(carry))throw Error('diagnostic-incomplete-tail');}
  };
}
