const fs = require('node:fs');
const crypto = require('node:crypto');
const posix = p => p.replace(/^\/([a-z])\//i,(_,drive)=>drive.toUpperCase()+':/');
const args=process.argv.slice(2);
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(posix(p))).digest('hex');
if(args[0]==='-c') {
  const line=fs.readFileSync(0,'utf8').trim();
  const match=line.match(/^([0-9a-f]{64})[ \t]+[* ]?(.+)$/i);
  process.exit(match && hash(match[2])===match[1].toLowerCase()?0:1);
} else {
  console.log(hash(args[0])+'  '+args[0]);
}
