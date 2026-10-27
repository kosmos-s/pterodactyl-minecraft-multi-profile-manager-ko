const fs=require('node:fs');
const path=require('node:path');
const repo=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(repo,p),'utf8').replace(/\r\n/g,'\n');
const egg=JSON.parse(read('src/egg.template.json'));
const launcher=read('src/profile-launcher.sh').trimEnd();
const installer=read('src/install.sh');
if(installer.split('@PROFILE_LAUNCHER@').length!==2) throw new Error('Expected one launcher placeholder');
egg.scripts.installation.script=installer.replace('@PROFILE_LAUNCHER@',()=>launcher);
const output=JSON.stringify(egg,null,2)+'\n';
const target=path.join(repo,'egg/egg-minecraft-multi-profile-manager-v'+require('../package.json').version+'.json');
if(process.argv.includes('--check')) {
  if(fs.readFileSync(target,'utf8').replace(/\r\n/g,'\n')!==output) {
    console.error('Egg is out of date. Run npm run build.');process.exitCode=1;
  } else console.log('Generated Egg matches source.');
} else { fs.writeFileSync(target,output);console.log('Generated '+path.relative(repo,target)); }
