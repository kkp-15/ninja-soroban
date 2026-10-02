// 「検定の道」の通し確認（ヘッドレスChrome + CDP。公開しない）
// 使い方: node _dev/e2e_course.js http://localhost:9021/ <スクショの保存先>
const {spawn}=require('child_process'),fs=require('fs'),path=require('path'),os=require('os');
const URL_=process.argv[2]||'http://localhost:9021/',OUT=process.argv[3]||'/tmp';
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){fs.mkdirSync(OUT,{recursive:true});
 const prof=fs.mkdtempSync(path.join(os.tmpdir(),'sorob-'));const port=9300+Math.floor(Math.random()*500);
 const ch=spawn(CHROME,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check',`--user-data-dir=${prof}`,`--remote-debugging-port=${port}`,'about:blank'],{stdio:'ignore'});
 let ver;for(let i=0;i<50;i++){try{ver=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();if(ver.length)break}catch{}await sleep(200)}
 const ws=new WebSocket(ver.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);
 let id=0;const pend={},errors=[];
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pend[m.id]){pend[m.id](m);delete pend[m.id]}
  if(m.method==='Runtime.exceptionThrown')errors.push('例外: '+(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text));
  if(m.method==='Runtime.consoleAPICalled'&&['error','warning'].includes(m.params.type))errors.push(m.params.type+': '+m.params.args.map(a=>a.value??a.description).join(' '));
  if(m.method==='Log.entryAdded'&&m.params.entry.level==='error'&&!/favicon/.test(m.params.entry.url||''))errors.push('log: '+m.params.entry.text+' '+(m.params.entry.url||''))};
 const send=(method,params={})=>new Promise(r=>{const i=++id;pend[i]=r;ws.send(JSON.stringify({id:i,method,params}))});
 const ev=async(expr)=>{const r=await send('Runtime.evaluate',{expression:`(async()=>{${expr}})()`,awaitPromise:true,returnByValue:true});if(r.result.exceptionDetails)throw Error(r.result.exceptionDetails.exception?.description||JSON.stringify(r.result.exceptionDetails));return r.result.result.value};
 await send('Runtime.enable');await send('Log.enable');await send('Page.enable');
 const shot=async name=>{const r=await send('Page.captureScreenshot',{format:'jpeg',quality:80,captureBeyondViewport:false});fs.writeFileSync(path.join(OUT,name+'.jpg'),Buffer.from(r.result.data,'base64'));return name};
 const overflow=async tag=>{const v=await ev(`return [document.documentElement.scrollWidth,innerWidth]`);if(v[0]>v[1])errors.push(`横スクロール ${tag}: ${v[0]}>${v[1]}`)};
 const report=[];
 for(const [w,h,label] of [[375,812,'375'],[320,568,'320'],[1280,900,'pc']]){
  const mobile=w<768;await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:mobile?2:1,mobile});
  await send('Network.clearBrowserCache').catch(()=>{});
  await send('Page.navigate',{url:URL_+'?e2e='+Date.now()});await sleep(1500);
  await ev(`localStorage.clear();location.reload()`).catch(()=>{});await sleep(1500);
  await ev(`window.confirm=()=>true;window.__setTo=function(t){let s=String(t).padStart(7,'0');for(let i=0;i<7;i++){let e=+s[i];for(let g=0;g<4&&digits[i]!==e;g++){let d=digits[i];if((d>=5)!==(e>=5))change(i,0,null);d=digits[i];let o=d%5,k=e%5;if(k>o)change(i,k,null);else if(k<o)change(i,k+1,null)}}};
   window.__ans=()=>{let txt=document.querySelector('.cQ').innerText;let m=txt.match(/([\\d,]+) ([×÷]) ([\\d,]+)/);if(m){let a=+m[1].replace(/,/g,''),b=+m[3].replace(/,/g,'');return m[2]==='×'?a*b:a/b}return [...document.querySelectorAll('.cQ .mitori td')].map(t=>t.textContent.replace('−','-')).filter(Boolean).reduce((s,x)=>s+Number(x),0)};return 1`);
  const mode=await ev(`return document.body.dataset.mode+'|'+document.querySelector('.tabs .active').textContent`);report.push(`[${label}] 初期表示: ${mode}`);
  await overflow(label+' home');if(label!=='320'||1)await shot(`soroban_${label}_home`);
  // タブが1行か
  const rows=await ev(`let t=[...document.querySelectorAll('.tabs button')].map(b=>b.getBoundingClientRect().top);return new Set(t.map(Math.round)).size`);if(rows!==1)errors.push(`[${label}] タブが${rows}行`);
  // レベルチェック（全問正解）
  await ev(`document.querySelector('[data-go="check"]').click();return 1`);await overflow(label+' check');await shot(`soroban_${label}_check`);
  const ck=await ev(`for(let i=0;i<12&&document.querySelector('#cAns');i++){document.querySelector('#cAns').value=String(__ans());document.querySelector('#cOk').click()}return document.querySelector('#course h2').innerText`);
  report.push(`[${label}] レベルチェック全問正解 → ${ck}`);await shot(`soroban_${label}_check_result`);
  // 各級: 学ぶ（手順を珠で最後まで）・練習・模擬テスト
  for(const g of ['10','9','8','7']){
   await ev(`window.__soroban.course.go('grade',{g:'${g}',sub:'learn'});return 1`);await overflow(`${label} ${g}級 学ぶ`);if(label==='375'&&g==='8')await shot(`soroban_${label}_learn8`);
   const walks=await ev(`let out=[];const C=window.__soroban.course;for(const k of [...document.querySelectorAll('[data-walk]')].map(x=>x.dataset.walk)){document.querySelector('[data-walk="'+k+'"]').click();let w=C.walk,n=0;while(C.walk&&C.walk.k<C.walk.S.steps.length&&n<60){__setTo(C.walk.S.steps[C.walk.k].target);n++}
     let read=document.querySelector('#teiiRead').hidden?document.querySelector('#value').textContent:document.querySelector('#teiiRead b').textContent;out.push(k+':'+(C.walk.k===C.walk.S.steps.length&&+read.replace(/,/g,'')===w.p.answer?'OK':'NG '+read+' '+w.p.answer));document.querySelector('#wBack').click()}return out.join(' ')`);
   report.push(`[${label}] ${g}級 学ぶ（手順を珠で通す）: ${walks}`);if(/NG/.test(walks))errors.push(`[${label}] ${g}級 手順NG ${walks}`);
   if(label==='375'&&g==='7'){await ev(`const C=window.__soroban.course;C.startWalk({kind:'wari',a:3945,b:5,answer:789},'learn');__setTo(3945);__setTo(73945);return 1`);await shot(`soroban_${label}_walk_wari7`);await ev(`document.querySelector('#wBack').click();return 1`)}
   const pr=await ev(`window.__soroban.course.go('grade',{g:'${g}',sub:'practice'});let out=[];for(const k of [...document.querySelectorAll('[data-k]')].map(x=>x.dataset.k)){document.querySelector('[data-k="'+k+'"]').click();let ok=0;for(let i=0;i<5;i++){let a=__ans();document.querySelector('#pAns').value=String(i===1?a+1:a);document.querySelector('#pOk').click();if(/正解/.test(document.querySelector('#cFb').innerText))ok++;document.querySelector('#pNext').click()}out.push(k+' '+ok+'/5 '+(/5問中 4問/.test(document.querySelector('.walkNow').innerText)?'OK':'NG'))}return out.join(' / ')`);
   report.push(`[${label}] ${g}級 練習: ${pr}`);if(/NG/.test(pr))errors.push(`[${label}] ${g}級 練習NG`);
   if(label==='375'&&g==='7'){await ev(`document.querySelector('[data-k="mitori"]').click();return 1`);await shot(`soroban_${label}_practice7_mitori`)}
   await overflow(`${label} ${g}級 練習`);
   // 模擬テスト: 全問正解
   const t=await ev(`const C=window.__soroban.course;C.go('grade',{g:'${g}',sub:'test'});document.querySelector('#tStart').click();let T=C.test.T;for(let i=0;i<T.items.length;i++){document.querySelector('#tAns').value=String(__ans());document.querySelector('#tAns').dispatchEvent(new Event('input'));if(i===${g==='7'?0:-1})break;document.querySelector('#tNext').click()}return [T.items.length,T.sections.map(s=>s.label+(s.to-s.from)).join('・'),document.querySelector('#cTime').textContent]`);
   if(label==='375'&&g==='7'){await shot(`soroban_${label}_test7_run`)}
   await overflow(`${label} ${g}級 テスト中`);
   if(g==='7'){await ev(`const C=window.__soroban.course,T=C.test.T;for(let i=1;i<T.items.length;i++){document.querySelector('[data-q="'+i+'"]')?.click();document.querySelector('#tAns').value=String(__ans());document.querySelector('#tAns').dispatchEvent(new Event('input'))}return 1`)}
   const res=await ev(`document.querySelector('#tEnd').click();return document.querySelector('.tScore').innerText+' '+document.querySelector('#cBody .walkNow').innerText`);
   report.push(`[${label}] ${g}級 模擬テスト ${t[0]}題（${t[1]}）${t[2]} → 全問正解: ${res.replace(/\s+/g,' ')}`);if(!/^200/.test(res))errors.push(`[${label}] ${g}級 満点にならない`);
   if(label==='375'&&g==='8')await shot(`soroban_${label}_test8_result`);
   // 時間切れ: 1題だけ答えて時間を過ぎさせる
   const tu=await ev(`const C=window.__soroban.course;document.querySelector('#tAgain').click();document.querySelector('#tStart').click();document.querySelector('#tAns').value=String(__ans());document.querySelector('#tAns').dispatchEvent(new Event('input'));C.test.end=Date.now()-5;await new Promise(r=>setTimeout(r,1400));return C.test.state+' '+C.test.timeUp+' '+C.test.r.total+' '+/時間になりました/.test(document.querySelector('#cBody').innerText)`);
   report.push(`[${label}] ${g}級 時間切れ: ${tu}`);if(tu!=='done true 10 true')errors.push(`[${label}] ${g}級 時間切れNG ${tu}`);
  }
  const home=await ev(`window.__soroban.course.go('home');return document.querySelector('.cNow').innerText.replace(/\\s+/g,' ')+' / '+document.querySelector('.cStats')?.innerText.split('\\n').length`);report.push(`[${label}] 道のり: ${home}`);
  await shot(`soroban_${label}_home_after`);await overflow(label+' home after');
  // 既存タブも開けるか
  const tabs=await ev(`let out=[];for(const m of ['learn','practice','mental','free','course']){document.querySelector('.tabs [data-mode="'+m+'"]').click();out.push(m+':'+(document.querySelector('#course').hidden===(m!=='course')))}return out.join(' ')`);report.push(`[${label}] タブ切替: ${tabs}`);
  const keys=await ev(`return Object.keys(localStorage).sort().join(',')`);report.push(`[${label}] localStorage: ${keys}`);
 }
 console.log(report.join('\n'));console.log(errors.length?'エラー:\n'+errors.join('\n'):'コンソールエラー0・横スクロールなし');
 ws.close();ch.kill();process.exit(errors.length?1:0)}
main().catch(e=>{console.error(e);process.exit(1)});
