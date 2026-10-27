const {test}=require('node:test');
const {fs,path,assert,write,fixture,run,profile,java,snapshot,zip,ok}=require('./helpers.cjs');

for(const [name,jar] of [['Fabric','fabric-server-launch.jar'],['Paperclip','paperclip.jar']]) {
  test('one '+name+' JAR is not counted twice',t=>{
    const f=fixture(t);
    profile(f,'test','SERVER_TYPE=auto\nSERVER_JAR=auto\n',jar);
    const r=run(f); ok(r); assert.match(r.output,/Server jar\s+:/);
  });
}
test('genuinely different runnable JARs are rejected',t=>{
  const f=fixture(t),dir=profile(f,'test','SERVER_TYPE=paper\nSERVER_JAR=auto\n','paper-1.21.1.jar');
  write(path.join(dir,'paper-1.21.2.jar'),'other');
  const r=run(f);assert.notEqual(r.status,0);assert.match(r.output,/Multiple possible server jars/);
});
test('new profile configuration inherits global backup defaults',t=>{
  const f=fixture(t),dir=path.join(f.root,'servers','test');
  write(path.join(dir,'paper-1.21.1.jar'),'placeholder');java(f);
  const r=run(f,'test',{MULTI_DRY_RUN:'false',AUTO_BACKUP_ON_SWITCH:'false',BACKUP_KEEP:'2'});ok(r);
  assert.equal(fs.existsSync(path.join(dir,'profile.conf')),true);
  write(path.join(f.root,'.multi-profile-state','last_profile'),'test\n');
  profile(f,'next');java(f);
  ok(run(f,'next',{MULTI_DRY_RUN:'false',AUTO_BACKUP_ON_SWITCH:'false',BACKUP_KEEP:'2'}));
  assert.equal(fs.existsSync(path.join(f.root,'profile-backups','test')),false);
});
test('generated profiles inherit the global backup retention count',t=>{
  const f=fixture(t),dir=path.join(f.root,'servers','old');
  write(path.join(dir,'paper-1.21.1.jar'),'placeholder');java(f);
  ok(run(f,'old',{MULTI_DRY_RUN:'false',BACKUP_KEEP:'2'}));
  for(const name of ['a','b','c']) write(path.join(f.root,'profile-backups','old',name+'.tar.gz'),name);
  profile(f,'next');
  ok(run(f,'next',{MULTI_DRY_RUN:'false',BACKUP_KEEP:'2'}));
  assert.equal(fs.readdirSync(path.join(f.root,'profile-backups','old')).length,2);
});
test('explicit backup override wins over the global setting',t=>{
  const f=fixture(t);
  profile(f,'old','BACKUP_ON_SWITCH=true\nBACKUP_KEEP=1\n');
  profile(f,'next');java(f);
  write(path.join(f.root,'.multi-profile-state','last_profile'),'old\n');
  write(path.join(f.root,'profile-backups','old','previous.tar.gz'),'old');
  ok(run(f,'next',{MULTI_DRY_RUN:'false',AUTO_BACKUP_ON_SWITCH:'false'}));
  const backups=fs.readdirSync(path.join(f.root,'profile-backups','old'));
  assert.equal(backups.length,1);assert.notEqual(backups[0],'previous.tar.gz');
});
test('dry-run never modifies configuration, backups, EULA or active state',t=>{
  const f=fixture(t);
  profile(f,'old','BACKUP_ON_SWITCH=true\nBACKUP_KEEP=1\n');
  profile(f,'test');
  write(path.join(f.root,'.multi-profile-state','last_profile'),'old\n');
  write(path.join(f.root,'profile-backups','old','previous.tar.gz'),'old');
  const before=snapshot(f.root);
  ok(run(f,'test',{ACCEPT_EULA:'true'}));
  assert.deepEqual(snapshot(f.root),before);
});
test('dry-run on an imported profile does not create profile.conf',t=>{
  const f=fixture(t);
  write(path.join(f.root,'servers','test','paper-1.21.1.jar'),'placeholder');
  const before=snapshot(f.root);ok(run(f));assert.deepEqual(snapshot(f.root),before);
});
for(const type of ['forge','neoforge']) {
  test(type+' script receives manager JVM settings without editing its files',t=>{
    const f=fixture(t);
    const dir=profile(f,'test','SERVER_TYPE='+type+'\nLAUNCH_MODE=script\nJAVA_ARGS=-Dreview.probe=1\nXMS_MB=256\nMEMORY_PERCENT=50\n');
    write(path.join(dir,'run.sh'),'#!/bin/sh\nexec "$JAVA_HOME/bin/java" @user_jvm_args.txt "$@"\n');
    write(path.join(dir,'user_jvm_args.txt'),'-Xmx900M\n');
    java(f);
    const before=fs.readFileSync(path.join(dir,'user_jvm_args.txt'),'utf8');
    const r=run(f,'test',{MULTI_DRY_RUN:'false',_JAVA_OPTIONS:'-Dexisting=1'});ok(r);
    assert.match(r.output,/JVM_ENV:.*-Xms256M.*-Xmx512M.*-Dreview.probe=1/);
    assert.match(r.output,/-Dexisting=1/);
    assert.equal(fs.readFileSync(path.join(dir,'user_jvm_args.txt'),'utf8'),before);
  });
}
test('direct JAR launch receives heap limits and Java arguments',t=>{
  const f=fixture(t);profile(f,'test','JAVA_ARGS=-Dreview.probe=1\nXMS_MB=256\nMEMORY_PERCENT=50\n');java(f);
  const r=run(f,'test',{MULTI_DRY_RUN:'false'});ok(r);
  assert.match(r.output,/ARG:<-Xms256M>/);assert.match(r.output,/ARG:<-Xmx512M>/);assert.match(r.output,/ARG:<-Dreview.probe=1>/);
});
test('unlimited memory does not add an artificial maximum heap',t=>{
  const f=fixture(t);profile(f);java(f);
  const r=run(f,'test',{MULTI_DRY_RUN:'false',SERVER_MEMORY:'0'});ok(r);assert.doesNotMatch(r.output,/ARG:<-Xmx/);
});
test('multiple cached Minecraft versions require an explicit version',t=>{
  const f=fixture(t),dir=profile(f,'test','MINECRAFT_VERSION=auto\nJAVA_VERSION=auto\n');
  fs.mkdirSync(path.join(dir,'versions','1.21.1'),{recursive:true});
  fs.mkdirSync(path.join(dir,'versions','26.2'),{recursive:true});
  const r=run(f);assert.notEqual(r.status,0);assert.match(r.output,/ambiguous|multiple.*version/i);
});
test('explicit Minecraft version resolves ambiguous cached versions',t=>{
  const f=fixture(t),dir=profile(f);
  fs.mkdirSync(path.join(dir,'versions','1.21.1'),{recursive:true});
  fs.mkdirSync(path.join(dir,'versions','26.2'),{recursive:true});
  const r=run(f);ok(r);assert.match(r.output,/Minecraft version:\s+1.21.1/);
});
test('current JAR metadata outranks old logs and version caches',t=>{
  const f=fixture(t),dir=profile(f,'test','MINECRAFT_VERSION=auto\nJAVA_VERSION=auto\n');
  zip(path.join(dir,'server.jar'),'version.json','{"id":"1.21.1"}');
  write(path.join(dir,'logs','latest.log'),'Starting minecraft server version 26.2\n');
  fs.mkdirSync(path.join(dir,'versions','26.2'),{recursive:true});
  const r=run(f);ok(r);assert.match(r.output,/Minecraft version:\s+1.21.1/);assert.match(r.output,/Java\s+:\s+21/);
});
test('Korean profile names still launch',t=>{
  const f=fixture(t);profile(f,'마크서버');const r=run(f,'마크서버');ok(r);assert.match(r.output,/마크서버/);
});
test('missing profile fails before creating state or properties',t=>{
  const f=fixture(t),before=snapshot(f.root);const r=run(f,'missing');
  assert.notEqual(r.status,0);assert.deepEqual(snapshot(f.root),before);
});
