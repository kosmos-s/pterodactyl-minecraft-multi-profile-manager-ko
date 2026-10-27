const {test}=require('node:test');
const crypto=require('node:crypto');
const {fs,path,cp,assert,repo,posix,quote,write,fixture,shell,zip,ok}=require('./helpers.cjs');
function setup(t) {
  const f=fixture(t);
  const jar=path.join(f.root,'download.jar');
  zip(jar,'version.json','{"id":"1.21.1"}');
  write(path.join(f.bin,'curl'),'#!/bin/sh\nexec '+quote(posix(process.execPath))+' '+quote(posix(path.join(__dirname,'curl-fixture.cjs')))+' "$@"\n');
  write(path.join(f.root,'installer.sh'),f.installer.replace('ROOT="/mnt/server"','ROOT='+quote(posix(f.root))));
  f.env={...process.env,PATH:[f.bin,process.env.SH_BIN&&path.dirname(process.env.SH_BIN),process.env.PATH].filter(Boolean).join(path.delimiter),
    DL_PATH:'https://example.invalid/server.jar',MINECRAFT_VERSION:'latest',FIXTURE_JAR:jar,CURL_MODE:'good'};
  f.hash=crypto.createHash('sha256').update(fs.readFileSync(jar)).digest('hex');
  return f;
}
function install(f,extra={}) {return shell(path.join(f.root,'installer.sh'),{...f.env,...extra});}
function noFinalJar(f) {assert.equal(fs.existsSync(path.join(f.root,'servers','default','server.jar')),false);}
test('interrupted download never becomes server.jar and temporary data is cleaned',t=>{
  const f=setup(t),r=install(f,{CURL_MODE:'partial'});
  assert.notEqual(r.status,0);noFinalJar(f);
  assert.equal(fs.readdirSync(path.join(f.root,'servers','default')).some(n=>n.includes('.download')),false);
});
test('HTML returned by a custom download URL is rejected',t=>{
  const f=setup(t),r=install(f,{CURL_MODE:'invalid'});assert.notEqual(r.status,0);noFinalJar(f);
});
test('CRC-corrupt ZIP content is rejected before promotion',t=>{
  const f=setup(t),bytes=fs.readFileSync(f.env.FIXTURE_JAR);
  bytes[42]^=1;fs.writeFileSync(f.env.FIXTURE_JAR,bytes);
  const r=install(f);assert.notEqual(r.status,0);noFinalJar(f);
});
test('TERM during download cleans the temporary file',{skip:process.platform==='win32'?'POSIX process groups are covered in Linux CI':false},async t=>{
  const f=setup(t);
  const child=cp.spawn(process.env.SH_BIN||'sh',[posix(path.join(f.root,'installer.sh'))],{env:{...f.env,CURL_MODE:'wait'},detached:true,stdio:'ignore'});
  const closed=new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',(code,signal)=>resolve({code,signal}));});
  let killed=false;
  try {
    const dest=path.join(f.root,'servers','default');
    const deadline=Date.now()+5000;
    while(Date.now()<deadline) {
      if(fs.existsSync(dest)&&fs.readdirSync(dest).some(n=>n.includes('.download')&&fs.statSync(path.join(dest,n)).size>0)) break;
      await new Promise(resolve=>setTimeout(resolve,20));
    }
    assert.equal(fs.readdirSync(dest).some(n=>n.includes('.download')&&fs.statSync(path.join(dest,n)).size>0),true);
    process.kill(-child.pid,'SIGTERM');killed=true;
    const result=await closed;assert.notEqual(result.code,0);noFinalJar(f);
    assert.equal(fs.readdirSync(dest).some(n=>n.includes('.download')),false);
  } finally {
    if(!killed) {try {process.kill(-child.pid,'SIGTERM');} catch(error) {if(error.code!=='ESRCH') throw error;} await closed;}
  }
});
test('checksum mismatch blocks promotion of a valid custom JAR',t=>{
  const f=setup(t),r=install(f,{DL_SHA256:'0'.repeat(64)});assert.notEqual(r.status,0);noFinalJar(f);
});
test('valid custom JAR is promoted after checksum validation without pinning latest as its version',t=>{
  const f=setup(t),r=install(f,{DL_SHA256:f.hash});ok(r);
  assert.deepEqual(fs.readFileSync(path.join(f.root,'servers','default','server.jar')),fs.readFileSync(f.env.FIXTURE_JAR));
  const cfg=fs.readFileSync(path.join(f.root,'servers','default','profile.conf'),'utf8');
  assert.match(cfg,/^MINECRAFT_VERSION=auto$/m);
});
test('installer can retry after an interrupted download',t=>{
  const f=setup(t);assert.notEqual(install(f,{CURL_MODE:'partial'}).status,0);
  ok(install(f));assert.deepEqual(fs.readFileSync(path.join(f.root,'servers','default','server.jar')),fs.readFileSync(f.env.FIXTURE_JAR));
});
test('existing server JAR is preserved during reinstall',t=>{
  const f=setup(t),jar=path.join(f.root,'servers','default','server.jar');
  write(jar,'existing server');ok(install(f,{CURL_MODE:'partial'}));assert.equal(fs.readFileSync(jar,'utf8'),'existing server');
});
const jq=cp.spawnSync(process.env.SH_BIN||'sh',['-c','command -v jq'],{encoding:'utf8'});
for(const mismatch of [false,true]) {
  test('official Paper checksum '+(mismatch?'mismatch blocks install':'allows verified install'),{skip:jq.status!==0?'jq is required; covered in Linux CI':false},t=>{
    const f=setup(t),r=install(f,{DL_PATH:'',FIXTURE_SHA:mismatch?'0'.repeat(64):f.hash});
    if(mismatch) {assert.notEqual(r.status,0);noFinalJar(f);} else ok(r);
  });
}
