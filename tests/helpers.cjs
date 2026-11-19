const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const repo = path.resolve(__dirname, '..');
const eggPath = path.join(repo, 'egg/egg-minecraft-multi-profile-manager-v'+require('../package.json').version+'.json');
const posix = p => p.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_, d) => '/' + d.toLowerCase());
const quote = s => "'" + s.replace(/'/g, "'\\''") + "'";
const windows = process.platform === 'win32';
const requestedShell = process.env.SH_BIN || 'sh';
let shellBin = requestedShell;
let toolsPath = [process.env.SH_BIN && path.dirname(process.env.SH_BIN), process.env.PATH]
  .filter(Boolean).join(path.delimiter);
if (windows) {
  // Git's bin/sh.exe prepends Git tools to PATH on every launch. Use it
  // once for discovery, then run the actual MSYS shell with our test PATH.
  const probe = cp.spawnSync(requestedShell, ['-ec', 'cygpath -aw /usr/bin/sh.exe; cygpath -wp "$PATH"'], {
    encoding: 'utf8', timeout: 10000
  });
  assert.equal(probe.status, 0, 'Set SH_BIN to a current Git for Windows sh.exe');
  [shellBin, toolsPath] = probe.stdout.trimEnd().split(/\r?\n/);
  assert.ok(fs.existsSync(shellBin) && toolsPath, 'Git for Windows shell or tool PATH not found');
}

function fixtureEnv(f, extra = {}) {
  const env = { ...process.env, ...extra };
  if (windows) {
    for (const key of Object.keys(env)) {
      if (key.toUpperCase() === 'PATH') delete env[key];
    }
  }
  env.PATH = f.runtimePath || [f.bin, toolsPath].filter(Boolean).join(path.delimiter);
  return env;
}

function findTool(name) {
  const result = cp.spawnSync(shellBin, ['-c', 'command -v "$1"', 'sh', name], {
    encoding: 'utf8', env: fixtureEnv({})
  });
  return result.status === 0 ? result.stdout.trim() : '';
}

if (windows) {
  for (const name of ['tar', 'unzip', 'sha256sum']) {
    assert.ok(findTool(name), `Git for Windows test prerequisite missing: ${name}`);
  }
}

function write(p, value) { fs.mkdirSync(path.dirname(p), {recursive:true}); fs.writeFileSync(p, value); fs.chmodSync(p,0o755); }
function fixture(t) {
  const parent = path.join(repo, '.test-tmp');
  fs.mkdirSync(parent,{recursive:true});
  const root = fs.mkdtempSync(path.join(parent, 'case-'));
  t.after(() => { assert.equal(path.dirname(root), parent); fs.rmSync(root,{recursive:true,force:true}); });
  const egg = JSON.parse(fs.readFileSync(eggPath,'utf8'));
  const installer = egg.scripts.installation.script;
  const launcher = installer.split("<<'MULTI_LAUNCHER'\n")[1].split('\nMULTI_LAUNCHER\n')[0];
  write(path.join(root,'launcher.sh'),launcher);
  const bin = path.join(root,'bin');
  fs.mkdirSync(bin);
  if (windows) {
    // Windows execution is not controlled by POSIX permission bits.
    write(path.join(bin,'chmod'), '#!/bin/sh\nexit 0\n');
  }
  return {root,bin,installer};
}
function run(f, profile='test', extra={}) {
  const env=fixtureEnv(f,{CONTAINER_ROOT:posix(f.root),SERVER_PROFILE:profile,SERVER_PORT:'25565',SERVER_MEMORY:'1024',ACCEPT_EULA:'false',MULTI_DRY_RUN:'true',...extra});
  return shell(path.join(f.root,'launcher.sh'),env);
}
function shell(file,env) {
  const r=cp.spawnSync(shellBin,[posix(file)],{env,encoding:'utf8',timeout:20000});
  if(r.error) throw r.error;
  return {status:r.status,output:r.stdout+r.stderr};
}
function profile(f,name='test',config='',jar='server.jar') {
  const dir=path.join(f.root,'servers',name);
  write(path.join(dir,'profile.conf'),'SERVER_TYPE=generic\nMINECRAFT_VERSION=1.21.1\nJAVA_VERSION=21\nLAUNCH_MODE=jar\nSERVER_JAR=server.jar\n'+config);
  if(jar) write(path.join(dir,jar),'placeholder');
  return dir;
}
function java(f,version='21') {
  write(path.join(f.root,'.multijava','temurin-'+version,'bin','java'),'#!/bin/sh\nprintf "JVM_ENV:%s\\n" "${_JAVA_OPTIONS:-}"\nprintf "ARG:<%s>\\n" "$@"\n');
}
function snapshot(root) {
  const result={};
  function walk(dir) {
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})) {
      const full=path.join(dir,entry.name);
      if(entry.isDirectory()) { result[path.relative(root,full)+'/']='directory'; walk(full); }
      else result[path.relative(root,full)]=crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex');
    }
  }
  walk(root); return result;
}
function zip(p,name,content) {
  const bytes=Buffer.from(content);
  let crc=0xffffffff;
  for(const b of bytes) { crc^=b; for(let n=0;n<8;n++) crc=(crc>>>1)^((crc&1)?0xedb88320:0); }
  crc=(crc^0xffffffff)>>>0;
  const filename=Buffer.from(name), local=Buffer.alloc(30), central=Buffer.alloc(46), end=Buffer.alloc(22);
  local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20,4); local.writeUInt32LE(crc,14);
  local.writeUInt32LE(bytes.length,18);local.writeUInt32LE(bytes.length,22);local.writeUInt16LE(filename.length,26);
  central.writeUInt32LE(0x02014b50);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt32LE(crc,16);
  central.writeUInt32LE(bytes.length,20);central.writeUInt32LE(bytes.length,24);central.writeUInt16LE(filename.length,28);
  end.writeUInt32LE(0x06054b50);end.writeUInt16LE(1,8);end.writeUInt16LE(1,10);
  end.writeUInt32LE(central.length+filename.length,12);end.writeUInt32LE(local.length+filename.length+bytes.length,16);
  write(p,Buffer.concat([local,filename,bytes,central,filename,end]));
}
function ok(r) { assert.equal(r.status,0,r.output); }
function onlyTools(f,names,overrides={}) {
  const dir=path.join(f.root,'restricted-bin');fs.mkdirSync(dir);
  for(const name of names) {
    const found=overrides[name] || findTool(name);
    assert.ok(found,'Test prerequisite missing: '+name);
    write(path.join(dir,name),'#!/bin/sh\nexec '+quote(posix(found))+' "$@"\n');
  }
  f.runtimePath=dir;
}
module.exports={fs,path,cp,assert,repo,eggPath,posix,quote,write,fixture,run,shell,profile,java,snapshot,zip,ok,onlyTools,fixtureEnv,findTool};
