// 使い方: node _dev/usersim.js http://localhost:9021/
// 初めての人の操作を、本物のボタンを押してたどる。押した数・画面外で探した回数（スクロール）・入力回数を数える
const {spawn}=require('child_process'),fs=require('fs'),path=require('path'),os=require('os');
const URL_=process.argv[2];const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const prof=fs.mkdtempSync(path.join(os.tmpdir(),'us-'));const port=9600+Math.floor(Math.random()*90);
const ch=spawn(CHROME,['--headless=new','--disable-gpu','--no-first-run',`--user-data-dir=${prof}`,`--remote-debugging-port=${port}`,'about:blank'],{stdio:'ignore'});
let v;for(let i=0;i<50;i++){try{v=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();if(v.length)break}catch{}await sleep(200)}
const ws=new WebSocket(v.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);let id=0;const pend={},errs=[];
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pend[m.id]){pend[m.id](m);delete pend[m.id]}if(m.method==='Runtime.exceptionThrown')errs.push((m.params.exceptionDetails.exception?.description||'')+' @'+(m.params.exceptionDetails.url||'').slice(0,80))};
const send=(method,params={})=>new Promise(r=>{const i=++id;pend[i]=r;ws.send(JSON.stringify({id:i,method,params}))});
const ev=async x=>{const r=await send('Runtime.evaluate',{expression:`(async()=>{${x}})()`,awaitPromise:true,returnByValue:true});if(r.result.exceptionDetails)throw Error(r.result.exceptionDetails.exception?.description);return r.result.result.value};
await send('Runtime.enable');await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride',{width:375,height:812,deviceScaleFactor:2,mobile:true});
await send('Page.navigate',{url:URL_+'?u='+Date.now()});await sleep(1200);await ev(`localStorage.clear();location.reload()`).catch(()=>{});await sleep(1800);
await ev(`window.S={tap:0,scroll:0,type:0,log:[]};
// 画面に見えていなければスクロールして探す（1回と数える）
window.seeAll=(els)=>{els=els.filter(Boolean);let top=Math.min(...els.map(e=>e.getBoundingClientRect().top)),bot=Math.max(...els.map(e=>e.getBoundingClientRect().bottom));let dock=document.querySelector('#dock');let lim=innerHeight-(dock&&!dock.classList.contains('empty')&&getComputedStyle(dock).position==='fixed'?dock.offsetHeight:0);if(top>=0&&bot<=lim)return 0;S.scroll++;return 1};
window.tapText=(t,root)=>{let e=[...(root||document).querySelectorAll('button')].find(b=>b.offsetParent&&b.innerText.replace(/\\s/g,'').includes(t));if(!e)throw Error('no button '+t);let r=e.getBoundingClientRect();let dock=document.querySelector('#dock');let lim=innerHeight-(dock&&!dock.contains(e)&&!dock.classList.contains('empty')&&getComputedStyle(dock).position==='fixed'?dock.offsetHeight:0);if(r.top<0||r.bottom>lim){S.scroll++;e.scrollIntoView({block:'center'})}S.tap++;S.log.push(t);e.click();return e};
window.getBoard=()=>document.querySelector('#board');
window.setTo=function(t){let s=String(t).padStart(7,'0');for(let i=0;i<7;i++){let e=+s[i];for(let g=0;g<4&&digits[i]!==e;g++){let d=digits[i];if((d>=5)!==(e>=5))change(i,0,null);d=digits[i];let o=d%5,k=e%5;if(k>o)change(i,k,null);else if(k<o)change(i,k+1,null)}}};
window.ans=()=>{let txt=document.querySelector('.cQ').innerText;let m=txt.match(/([\\d,]+) ([×÷]) ([\\d,]+)/);if(m){let a=+m[1].replace(/,/g,''),b=+m[3].replace(/,/g,'');return m[2]==='×'?a*b:a/b}return [...document.querySelectorAll('.cQ .mitori td')].map(t=>t.textContent.replace('−','-')).filter(Boolean).reduce((s,x)=>s+Number(x),0)};
// 画面のそろばんで答えを作る→（入力欄が空なら）入力する→答える
window.solve=async(btn,inputSel)=>{let q=document.querySelector('.cQ');seeAll([q,getBoard()]);let a=ans();setTo(a);
 let inp=document.querySelector(inputSel);let canAuto=!!document.querySelector('#cClear');
 if(!canAuto){ // 入力しないと答えられない
  let r=inp.getBoundingClientRect();if(r.top<0||r.bottom>innerHeight){S.scroll++;inp.scrollIntoView({block:'center'})}S.tap++;S.type++;inp.value=String(a);inp.dispatchEvent(new Event('input'))}
 tapText(btn);await new Promise(r=>setTimeout(r,120))};
return 1`);
const res={};
// A レベルチェック（全問）
await ev(`S.tap=0;S.scroll=0;S.type=0;window.scrollTo(0,0);tapText('レベルチェック');return 1`);await sleep(300);
await ev(`for(let i=0;i<12&&document.querySelector('#cAns');i++){await solve('答える','#cAns')}return 1`);
res.check=await ev(`return {tap:S.tap,scroll:S.scroll,type:S.type,q:12}`);
// B 10級の練習5問
await ev(`S.tap=0;S.scroll=0;S.type=0;tapText('道のり');window.scrollTo(0,0);await new Promise(r=>setTimeout(r,200));
 let row=[...document.querySelectorAll('.cRow')].find(r=>/^10級/.test(r.innerText.trim()));let b=row.querySelector('button');let rr=b.getBoundingClientRect();if(rr.bottom>innerHeight){S.scroll++;b.scrollIntoView({block:'center'})}S.tap++;b.click();await new Promise(r=>setTimeout(r,200));
 tapText('練習',document.querySelector('.cSeg'));await new Promise(r=>setTimeout(r,200));
 for(let i=0;i<5;i++){await solve('答えあわせ','#pAns');tapText(i<4?'次の問題':'結果を見る');await new Promise(r=>setTimeout(r,120))}return 1`);
res.practice10=await ev(`return {tap:S.tap,scroll:S.scroll,type:S.type,result:document.querySelector('.walkNow')?.innerText.slice(0,12)}`);
// C 模擬テスト開始→3題
await ev(`S.tap=0;S.scroll=0;S.type=0;tapText('模擬テスト',document.querySelector('.cSeg'));await new Promise(r=>setTimeout(r,200));tapText('20分で始める');await new Promise(r=>setTimeout(r,200));
 for(let i=0;i<3;i++){await solve('次へ','#tAns')}return 1`);
res.test3=await ev(`return {tap:S.tap,scroll:S.scroll,type:S.type,answered:document.querySelector('#tCount').innerText}`);
console.log(JSON.stringify(res),'errors',JSON.stringify(errs));ch.kill();process.exit(0)})();
