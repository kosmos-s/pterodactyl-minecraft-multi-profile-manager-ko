const {test}=require('node:test');
const {fs,path,assert,write,fixture,profile,run,java,zip,snapshot,ok,onlyTools}=require('./helpers.cjs');
const jarTool=process.env.JAR_BIN_REAL || (process.env.JAVA_HOME&&path.join(process.env.JAVA_HOME,'bin','jar'));
const readTools=['sh','tr','sed','grep','head','tail','cut','basename','dirname','wc','sort','cat','mktemp','rm','awk'];

test('JDK jar reads current metadata without unzip and leaves the profile unchanged',{skip:!jarTool?'Set JAR_BIN_REAL or JAVA_HOME':false},t=>{
  const f=fixture(t),dir=profile(f,'test','MINECRAFT_VERSION=auto\nJAVA_VERSION=auto\n');
  zip(path.join(dir,'server.jar'),'version.json','{"id":"1.21.4"}');
  write(path.join(dir,'logs','latest.log'),'Starting minecraft server version 1.20.4\n');
  onlyTools(f,[...readTools,'jar'],{jar:jarTool});
  const scratch=path.join(f.root,'scratch');fs.mkdirSync(scratch);
  const before=snapshot(f.root),r=run(f,'test',{TMPDIR:scratch.replace(/\\/g,'/')});ok(r);
  assert.match(r.output,/Minecraft version:\s+1.21.4/);assert.match(r.output,/Java\s+:\s+21/);
  assert.deepEqual(snapshot(f.root),before);
});
test('missing both metadata readers produces an actionable warning',t=>{
  const f=fixture(t),dir=profile(f,'test','MINECRAFT_VERSION=auto\n');
  write(path.join(dir,'logs','latest.log'),'Starting minecraft server version 1.20.4\n');
  onlyTools(f,readTools);
  const r=run(f);ok(r);assert.match(r.output,/neither unzip nor.*jar|unzip.*jar.*unavailable/i);
});
test('script launcher-only JAVA_ARGS fail before touching profile state',t=>{
  const f=fixture(t),dir=profile(f,'test','SERVER_TYPE=forge\nLAUNCH_MODE=script\nJAVA_ARGS=-cp libs\n');
  write(path.join(dir,'run.sh'),'#!/bin/sh\nexit 0\n');java(f);
  const before=snapshot(f.root),r=run(f,'test',{MULTI_DRY_RUN:'false'});
  assert.notEqual(r.status,0);assert.match(r.output,/JAVA_ARGS.*script|script.*JAVA_ARGS/);
  assert.deepEqual(snapshot(f.root),before);
});
