const fs=require('node:fs');
const path=require('node:path');
const args=process.argv.slice(2), index=args.indexOf('-o');
const native=p=>process.platform==='win32'?p.replace(/^\/([a-z])\//i,(_,d)=>d.toUpperCase()+':/'):p;
if(index<0) {
  const url=args[args.length-1];
  if(url.endsWith('/builds')) {
    console.log(JSON.stringify([{id:1,channel:'STABLE',downloads:{'server:default':{url:'https://example.invalid/paper.jar',checksums:{sha256:process.env.FIXTURE_SHA}}}}]));
  } else console.log(JSON.stringify({versions:{'1.21':['1.21.1']}}));
} else {
  const out=native(args[index+1]);
  fs.mkdirSync(path.dirname(out),{recursive:true});
  const bytes=fs.readFileSync(process.env.FIXTURE_JAR);
  if(process.env.CURL_MODE==='partial') {fs.writeFileSync(out,bytes.subarray(0,20));process.exit(22);}
  if(process.env.CURL_MODE==='wait') {fs.writeFileSync(out,bytes.subarray(0,20));setTimeout(()=>process.exit(22),10000);}
  else
  fs.writeFileSync(out,process.env.CURL_MODE==='invalid'?Buffer.from('<html>not a jar</html>'):bytes);
}
