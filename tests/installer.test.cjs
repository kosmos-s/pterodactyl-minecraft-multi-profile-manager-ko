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
test('installer refuses a CRC-blind unzip when a verifier cannot be installed',t=>{
  const f=setup(t);
  write(path.join(f.bin,'unzip'),'#!/bin/sh\ncase "$1" in -v) printf "BusyBox unzip\\n"; exit 1 ;; *) exit 0 ;; esac\n');
  write(path.join(f.bin,'apk'),'#!/bin/sh\nexit 1\n');
  const r=install(f);assert.notEqual(r.status,0);assert.match(r.output,/Info-ZIP|CRC/);noFinalJar(f);
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
test('TERM sent only to the installer shell stops curl and cleans promptly',{skip:process.platform==='win32'?'POSIX signals are covered in Linux CI':false},async t=>{
  const f=setup(t);
  const child=cp.spawn(process.env.SH_BIN||'sh',[posix(path.join(f.root,'installer.sh'))],{env:{...f.env,CURL_MODE:'wait'},detached:true,stdio:'ignore'});
  const closed=new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',(code,signal)=>resolve({code,signal}));});
  try {
    const dest=path.join(f.root,'servers','default'),deadline=Date.now()+5000;
    while(Date.now()<deadline) {
      if(fs.existsSync(dest)&&fs.readdirSync(dest).some(n=>n.includes('.download')&&fs.statSync(path.join(dest,n)).size>0)) break;
      await new Promise(resolve=>setTimeout(resolve,20));
    }
    assert.equal(fs.readdirSync(dest).some(n=>n.includes('.download')&&fs.statSync(path.join(dest,n)).size>0),true);
    const start=Date.now();child.kill('SIGTERM');
    const result=await Promise.race([closed,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Installer did not stop promptly after shell-only TERM')),3000))]);
    assert.notEqual(result.code,0);assert.ok(Date.now()-start<3000);noFinalJar(f);
    assert.equal(fs.readdirSync(dest).some(n=>n.includes('.download')),false);
  } finally {
    try {process.kill(-child.pid,'SIGKILL');} catch(error) {if(error.code!=='ESRCH') throw error;}
    await closed;
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
  write(jar,'existing server');
  const cfg=path.join(f.root,'servers','default','profile.conf'),props=path.join(f.root,'servers','default','server.properties');
  write(cfg,'NAME=Keep this profile\nJAVA_VERSION=17\n');write(props,'motd=Keep this motd\n');
  write(path.join(f.root,'profile-launcher.sh'),'old launcher');
  ok(install(f,{CURL_MODE:'partial'}));assert.equal(fs.readFileSync(jar,'utf8'),'existing server');
  assert.equal(fs.readFileSync(cfg,'utf8'),'NAME=Keep this profile\nJAVA_VERSION=17\n');
  assert.equal(fs.readFileSync(props,'utf8'),'motd=Keep this motd\n');
  assert.notEqual(fs.readFileSync(path.join(f.root,'profile-launcher.sh'),'utf8'),'old launcher');
});
const jq=cp.spawnSync(process.env.SH_BIN||'sh',['-c','command -v jq'],{encoding:'utf8'});
for(const mismatch of [false,true]) {
  test('official Paper checksum '+(mismatch?'mismatch blocks install':'allows verified install'),{skip:jq.status!==0?'jq is required; covered in Linux CI':false},t=>{
    const f=setup(t),r=install(f,{DL_PATH:'',FIXTURE_SHA:mismatch?'0'.repeat(64):f.hash});
    if(mismatch) {assert.notEqual(r.status,0);noFinalJar(f);} else ok(r);
  });
}
