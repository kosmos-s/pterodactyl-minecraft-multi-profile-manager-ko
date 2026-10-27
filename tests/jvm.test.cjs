const {test}=require('node:test');
const {path,posix,quote,write,fixture,profile,run,ok,assert}=require('./helpers.cjs');
const realJava=process.env.JAVA_BIN_REAL || (process.env.JAVA_HOME&&path.join(process.env.JAVA_HOME,'bin','java'));
test('real HotSpot JVM honors manager heap settings over script arguments',{skip:!realJava?'Set JAVA_BIN_REAL to run the real JVM check':false},t=>{
  const f=fixture(t);
  const dir=profile(f,'test','SERVER_TYPE=forge\nLAUNCH_MODE=script\nJAVA_VERSION=21\nXMS_MB=128\nMEMORY_PERCENT=50\nJAVA_ARGS=-Dreview.probe=1\n');
  write(path.join(f.root,'.multijava','temurin-21','bin','java'),'#!/bin/sh\nexec '+quote(posix(realJava))+' "$@"\n');
  write(path.join(dir,'HeapProbe.java'),'class HeapProbe { public static void main(String[] args) { System.out.println("HEAP_MB=" + Runtime.getRuntime().maxMemory()/1024/1024); System.out.println("PROBE=" + System.getProperty("review.probe")); } }\n');
  write(path.join(dir,'user_jvm_args.txt'),'-Xmx900M\n');
  write(path.join(dir,'run.sh'),'#!/bin/sh\nexec "$JAVA_HOME/bin/java" @user_jvm_args.txt HeapProbe.java\n');
  const r=run(f,'test',{MULTI_DRY_RUN:'false'});ok(r);
  assert.match(r.output,/HEAP_MB=512/);
  assert.match(r.output,/PROBE=1/);
});
test('script JAVA_ARGS accept separated module options',{skip:!realJava?'Set JAVA_BIN_REAL':false},t=>{
  const f=fixture(t),dir=profile(f,'test','SERVER_TYPE=neoforge\nLAUNCH_MODE=script\nJAVA_ARGS=--add-opens java.base/java.lang=ALL-UNNAMED --add-exports java.base/sun.security.x509=ALL-UNNAMED --add-modules java.sql -Dreview.probe="two words"\n');
  write(path.join(f.root,'.multijava','temurin-21','bin','java'),'#!/bin/sh\nexec '+quote(posix(realJava))+' "$@"\n');
  write(path.join(dir,'Probe.java'),'class Probe { public static void main(String[] args) throws Exception { System.out.println("OPEN=" + Object.class.getModule().isOpen("java.lang", Probe.class.getModule())); System.out.println("PROBE=" + System.getProperty("review.probe")); } }\n');
  write(path.join(dir,'run.sh'),'#!/bin/sh\nexec "$JAVA_HOME/bin/java" Probe.java\n');
  const r=run(f,'test',{MULTI_DRY_RUN:'false'});ok(r);assert.match(r.output,/OPEN=true/);assert.match(r.output,/PROBE=two words/);
});
test('script memory mode preserves an argfile heap smaller than configured Xms',{skip:!realJava?'Set JAVA_BIN_REAL':false},t=>{
  const f=fixture(t),dir=profile(f,'test','SERVER_TYPE=forge\nLAUNCH_MODE=script\nSCRIPT_MEMORY_MODE=script\nXMS_MB=768\n');
  write(path.join(f.root,'.multijava','temurin-21','bin','java'),'#!/bin/sh\nexec '+quote(posix(realJava))+' "$@"\n');
  write(path.join(dir,'Probe.java'),'class Probe { public static void main(String[] args) { System.out.println("HEAP_MB=" + Runtime.getRuntime().maxMemory()/1024/1024); } }\n');
  write(path.join(dir,'user_jvm_args.txt'),'-Xmx512M\n');
  write(path.join(dir,'run.sh'),'#!/bin/sh\nexec "$JAVA_HOME/bin/java" @user_jvm_args.txt Probe.java\n');
  const r=run(f,'test',{MULTI_DRY_RUN:'false',SERVER_MEMORY:'0'});ok(r);assert.match(r.output,/HEAP_MB=512/);
});
