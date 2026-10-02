const fs=require('fs');const src=fs.readFileSync(process.argv[2],'utf8');
const m=src.match(/<script id="drill-engine">([\s\S]*?)<\/script>/);const code=m?m[1]:src;
const SorobanDrill=new Function(code+';return SorobanDrill')();
let bad=0,summary=[];
// 方法の独立判定（生成側のタグを使わない）
function indep(li,p){const L=p.moves.map(m=>m.label),c=p.calc||{},u=c.a%10;
 if(li===5){if(!(c.a<5&&c.b<5&&c.a+c.b>=5))return'not five-add';if(L.join()!==['＋5','−'+(5-c.b)].join())return'order'}
 if(li===6){if(!(c.a>=5&&c.b<5&&c.a%5<c.b))return'not five-sub';if(L.join()!==['−5','＋'+(5-c.b)].join())return'order'}
 if(li===4){const d=c.a;if(c.op==='+'){if(!(d+c.b<=9&&d%5+c.b%5<=4))return'not direct'}else if(!(d>=c.b&&d%5>=c.b%5))return'not direct';if(L.some(l=>l==='＋10'||l==='−10'))return'tens'}
 if(li===7){const k=10-c.b;if(!(u+c.b>=10&&u%5>=k%5))return'not ten-add';if(L[L.length-1]!=='＋10')return'last not +10';if(L.slice(0,-1).some(l=>l[0]!=='−'))return'order'}
 if(li===8){const k=10-c.b;if(!(u<c.b&&u%5+k%5<=4))return'not ten-sub';if(L[0]!=='−10')return'first not -10';if(L.slice(1).some(l=>l[0]!=='＋'))return'order'}
 if(li===9){let s=c.a;for(let i=1;i<c.b;i++){const d=s%10;if(d+c.a>=10&&d%5<(10-c.a)%5)return'mixed';s+=c.a}if(s!==p.answer)return'sum'}
 if(li===10){let s=c.a,n=0;while(s>0){s-=c.b;n++}if(s!==0||n!==p.answer)return'count'}
 if(li<=3&&p.moves.some(m=>m.label[0]==='−')!==(p.target<p.start))return'set dir';
 return null}
for(let li=0;li<SorobanDrill.count;li++){const seen=new Set();let tagsSeen=new Set();
 for(let k=0;k<100;k++){const p=SorobanDrill.make(li);const e=SorobanDrill.validate(p);if(e){bad++;console.log('NG',li,p.text,e)}
  // 独立した答えの検算
  let exp;const c=p.calc;if(c)exp=c.op==='+'?c.a+c.b:c.op==='-'?c.a-c.b:c.op==='×'?c.a*c.b:c.a/c.b;else exp=p.target;
  if(exp!==p.answer){bad++;console.log('ANS',li,p.text,p.answer,exp)}
  const ind=indep(li,p);if(ind){bad++;console.log('INDEP',li+1,p.text,ind,p.moves.map(m=>m.label))}
  seen.add(p.text);[...p.tags].forEach(t=>tagsSeen.add(t))}
 // 似た問題（同じ型）
 for(let k=0;k<20;k++){const p=SorobanDrill.make(li);const q=SorobanDrill.make(li,p.variant,p.text);if(SorobanDrill.validate(q)){bad++;console.log('SIM NG',li)}}
 summary.push(`L${li+1}: 100問OK 種類${seen.size} 方法[${[...tagsSeen]}] 例: ${[...seen].slice(0,4).join(' / ')}`)}
console.log(summary.join('\n'));console.log(bad?'FAIL '+bad:'ALL PASS (11レッスン×100問)');
// ---- 検定（日珠連 10〜7級）の問題・手順・採点 ----
const km=src.match(/<script id="kentei-engine">([\s\S]*?)<\/script>/);
if(!km){console.log('kentei-engine なし');process.exit(1)}
const K=new Function(km[1]+';return SorobanKentei')();
let kbad=0;const NG=(...a)=>{kbad++;if(kbad<30)console.log('NG',...a)};
const D=n=>String(Math.abs(n)).length,digs=n=>String(n).padStart(7,'0').split('').map(Number);
// 範囲の独立チェック（出典: 日珠連 基本的考え方・問題見本）
const SPEC={'10':{k:5,m:1,jk:[2,1],w:null},'9':{k:5,m:1,jk:[2,1],w:null},'8':{k:8,m:2,jk:[3,1],w:[1,2]},'7':{k:10,m:3,jk:[2,2],w:[1,3]}};
function checkSteps(p,tag){const S=K.steps(p);let n=S.start,prev=digs(n),digitRod=null;
 S.steps.forEach((st,si)=>{const t=st.target;if(!Number.isInteger(t)||t<0||t>9999999){NG(tag,'範囲外',t);return}
  const cur=digs(t),changed=[];for(let r=0;r<7;r++)if(cur[r]!==prev[r])changed.push(r);
  const lo=Math.min(...st.rods),hi=Math.max(...st.rods);
  if(!changed.length)NG(tag,'変化なし',st.text);
  if(changed.some(r=>r>hi))NG(tag,'指定より右が変化',st.text);
  if(p.kind==='kake'){
   if(si===0){if(changed.join()!==st.rods.filter(r=>cur[r]).join())NG(tag,'実の置き方',st.text)}
   else if(st.rods.length===1){digitRod=st.rods[0];if(changed.join()!==String(digitRod)||cur[digitRod]!==0)NG(tag,'払い方',st.text)}
   else if(changed.some(r=>r<digitRod))NG(tag,'まだ使う実の数字が変わった',st.text,prev.join(''),cur.join(''))}
  if(p.kind==='wari'){
   if(si>0&&st.rods.length===1){if(prev[lo]!==0||changed.join()!==String(lo))NG(tag,'商の位置が空いていない',st.text)}
   else if(changed.some(r=>!st.rods.includes(r)))NG(tag,'指定外の棒',st.text,prev.join(''),cur.join(''))}
  prev=cur;n=t});
 const ans=S.read(n);if(ans!==p.answer)NG(tag,'答え',K.text(p),ans,p.answer);
 if(p.kind==='wari'&&n%100!==0)NG(tag,'余りが残る',n);
 return S}
for(const g of K.ORDER){const sp=SPEC[g],G=K.GRADES[g];
 for(const kind of K.kinds(g)){const seen=new Set();
  for(let i=0;i<3000;i++){const p=K.gen(g,kind,i%2?{minus:true}:{minus:false});seen.add(K.key(p));const tag=g+'級 '+kind+' '+K.text(p);
   if(kind==='mitori'){if(p.nums.length!==sp.k)NG(tag,'口数');if(p.nums.some(x=>D(x)!==2))NG(tag,'2けた揃いでない');
    const mc=p.nums.filter(x=>x<0).length;if(mc!==(i%2?sp.m:0))NG(tag,'ひき算の口数',mc);if(p.nums[0]<0||p.nums[1]<0)NG(tag,'1・2口目がひき算');
    let s=0;for(const x of p.nums){s+=x;if(s<0)NG(tag,'途中が負')}if(s!==p.answer||s<=0)NG(tag,'答え',s)}
   if(kind==='kake'){if(D(p.a)!==sp.jk[0]||D(p.b)!==sp.jk[1])NG(tag,'けた数');if(sp.jk[1]===1&&p.b<2)NG(tag,'法1');if(p.a*p.b!==p.answer)NG(tag,'答え')}
   if(kind==='wari'){if(D(p.b)!==sp.w[0]||p.b<2)NG(tag,'法');if(D(p.answer)!==sp.w[1])NG(tag,'商のけた');if(p.answer*p.b!==p.a)NG(tag,'答え・割り切れ')}
   checkSteps(p,tag)}
  console.log(`${g}級 ${K.KIND_NAME[kind]}: 3000問OK 種類${seen.size}`)}
 // 模擬テスト
 for(let t=0;t<200;t++){const T=K.makeTest(g),tag=g+'級テスト';
  const want=G.wari?[['mitori',10,10],['kake',10,5],['wari',10,5]]:[['mitori',10,10],['kake',20,5]];
  if(T.sections.length!==want.length)NG(tag,'種目数');T.sections.forEach((s,i)=>{if(s.kind!==want[i][0]||s.to-s.from!==want[i][1]||s.max!==want[i][1]*want[i][2])NG(tag,'題数・配点',s)});
  if(T.max!==200)NG(tag,'満点',T.max);if(T.min!==20)NG(tag,'時間');
  T.items.forEach((p,i)=>{if(p.no!==i+1)NG(tag,'No.');if(p.kind==='mitori'){const mc=p.nums.filter(x=>x<0).length;if(mc!==([2,4,6,8].includes(i)?sp.m:0))NG(tag,"加減算の並び（No.3・5・7・9）",i,mc)}});
  if(new Set(T.items.map(K.key)).size!==T.items.length)NG(tag,'同じ問題が重複');
  // 採点: 全問正解・全問空欄・ランダム
  let r=K.score(T,T.items.map(p=>String(p.answer)));if(r.total!==200||!r.passed)NG(tag,'満点採点',r.total);
  r=K.score(T,[]);if(r.total!==0||r.passed||r.reached.length)NG(tag,'0点採点');
  const ans=T.items.map(p=>Math.random()<.6?String(p.answer):Math.random()<.5?'':String(p.answer+1));let exp=0;T.items.forEach((p,i)=>{if(ans[i]===String(p.answer))exp+=p.pts});
  r=K.score(T,ans);if(r.total!==exp)NG(tag,'採点',r.total,exp);if(r.passed!==(exp>=G.pass))NG(tag,'合否',exp);}
 // 合格点ちょうど・1題足りない
 const T=K.makeTest(g);const fill=pts=>{let a=[],left=pts;T.items.forEach((p,i)=>{if(left>=p.pts){a[i]=String(p.answer);left-=p.pts}else a[i]=''});return a};
 const at=K.score(T,fill(G.pass)),under=K.score(T,fill(G.pass-5));
 if(!at.passed||at.total!==G.pass)NG(g,'合格点ちょうど',at.total);if(under.passed)NG(g,'合格点未満で合格',under.total);
 console.log(`${g}級 模擬テスト: 200回OK 合格点 ${G.pass}/200（${G.pass}点=合格、${G.pass-5}点=不合格）`)}
// 9・10級は同じ問題で、点数により判定
{const T=K.makeTest('9');const fill=pts=>{let a=[],left=pts;T.items.forEach((p,i)=>{if(left>=p.pts){a[i]=String(p.answer);left-=p.pts}else a[i]=''});return a};
 const c=[[55,[]],[60,['10']],[115,['10']],[120,['10','9']],[200,['10','9']]];
 for(const [pts,exp] of c){const r=K.score(T,fill(pts));if(r.reached.join()!==exp.join())NG('9・10級判定',pts,r.reached)}
 const r10=K.score(Object.assign({},T,{grade:'10'}),fill(60));if(!r10.passed)NG('10級60点');console.log('9・10級の判定: 55点→なし／60点→10級／120点→9級 OK')}
// 入力の読み取り
for(const [raw,exp] of [['1234',1234],['１，２３４',1234],[' 1,234 ',1234],['',NaN],['12a',NaN],['-3',NaN]]){const v=K.parse(raw);if(!(Number.isNaN(exp)?Number.isNaN(v):v===exp))NG('parse',raw,v)}
// レベルチェック
for(let t=0;t<500;t++){const C=K.makeCheck();if(C.length!==4||C.some(s=>s.items.length!==3))NG('check 形');
 C.forEach(s=>s.items.forEach(p=>{let a=p.kind==='mitori'?p.nums.reduce((x,y)=>x+y,0):p.kind==='kake'?p.a*p.b:p.a/p.b;if(a!==p.answer||a<0||!Number.isInteger(a))NG('check 答え',K.text(p));checkSteps(p,'check '+K.text(p))}))}
for(const [ok,exp] of [[[0],'nyumon'],[[1],'nyumon'],[[3,1],'10'],[[2,2,0],'7'.replace('7','8')],[[3,3,3,1],'7'],[[3,2,2,2],'test7']]){if(K.recommend(ok)!==exp)NG('recommend',ok,K.recommend(ok))}
console.log('レベルチェック: 500回OK・おすすめの判定OK');
console.log(kbad?'KENTEI FAIL '+kbad:'KENTEI ALL PASS');
process.exit(bad||kbad?1:0)
