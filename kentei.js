// index.html（検定の道）と /print/（練習プリント）で共通に使う
// 検定（日本珠算連盟 10〜7級）の範囲の問題づくり・採点・珠の手順（DOMを使わない。検査スクリプトからも読む）
// 範囲の出典（確認日 2026-10-02）: shuzan.jp/kentei/shuzan/ ・ /kentei/shuzan/kihon.html（基本的考え方）・ /kentei/mihon/ の問題見本PDF
const SorobanKentei=(()=>{
const ri=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const P=r=>10**(6-r),dig=(n,r)=>Math.floor(n/P(r))%10;
const rnd=d=>ri(10**(d-1),10**d-1);
const pad2=n=>String(n).padStart(2,'0');
const MITORI9={n:10,kuchi:5,minus:1,pts:10},KAKE9={n:20,jitsu:2,hou:1,pts:5};
const GRADES={
 '10':{name:'10級',same:'9',mitori:MITORI9,kake:KAKE9,wari:null,min:20,pass:60},
 '9':{name:'9級',same:'10',mitori:MITORI9,kake:KAKE9,wari:null,min:20,pass:120},
 '8':{name:'8級',mitori:{n:10,kuchi:8,minus:2,pts:10},kake:{n:10,jitsu:3,hou:1,pts:5},wari:{n:10,hou:1,shou:2,pts:5},min:20,pass:120},
 '7':{name:'7級',mitori:{n:10,kuchi:10,minus:3,pts:10},kake:{n:10,jitsu:2,hou:2,pts:5},wari:{n:10,hou:1,shou:3,pts:5},min:20,pass:120}
};
const ORDER=['10','9','8','7'];
// みとり算10題のうち加減算は「前半2題・後半2題」（基本的考え方）。見本では No.3・5・7・9
const MINUS_AT=[2,4,6,8];
const KIND_NAME={mitori:'みとり算',kake:'かけ算',wari:'わり算'};
// 2けた揃いの数を kuchi 口。minus 口をひき算に（3口目以降・途中の合計が負にならない）
function mitori(kuchi,minus,digits){digits=digits||2;
 for(let tries=0;tries<500;tries++){let pos=new Set();while(pos.size<minus)pos.add(ri(2,kuchi-1));
  let nums=[],sum=0,ok=true;for(let i=0;i<kuchi;i++){if(pos.has(i)){let lo=10**(digits-1);if(sum<lo){ok=false;break}let x=ri(lo,Math.min(10**digits-1,sum));nums.push(-x);sum-=x}else{let x=rnd(digits);nums.push(x);sum+=x}}
  if(ok&&sum>0)return{kind:'mitori',nums,answer:sum,minus:minus>0}}
 throw Error('mitori')}
function kake(jitsu,hou){let a=rnd(jitsu),b=hou===1?ri(2,9):rnd(hou);return{kind:'kake',a,b,answer:a*b}}
function wari(hou,shou){let b=hou===1?ri(2,9):rnd(hou),q=rnd(shou);return{kind:'wari',a:b*q,b,answer:q}}
function gen(g,kind,opt){const s=GRADES[g];opt=opt||{};
 if(kind==='mitori'){let m=s.mitori,minus=opt.minus===undefined?Math.random()<.4:opt.minus;return mitori(opt.kuchi||m.kuchi,minus?m.minus:0)}
 if(kind==='kake')return kake(s.kake.jitsu,s.kake.hou);
 if(kind==='wari'){if(!s.wari)throw Error('no wari');return wari(s.wari.hou,s.wari.shou)}
 throw Error('kind '+kind)}
const key=p=>p.kind==='mitori'?p.nums.join(','):p.a+(p.kind==='kake'?'x':'/')+p.b;
function text(p){if(p.kind==='mitori')return p.nums.map((x,i)=>i?(x<0?' − ':' ＋ ')+Math.abs(x):String(x)).join('');return `${p.a.toLocaleString('ja-JP')} ${p.kind==='kake'?'×':'÷'} ${p.b.toLocaleString('ja-JP')}`}
function kinds(g){return GRADES[g].wari?['mitori','kake','wari']:['mitori','kake']}
// 模擬テスト（1枚・一括施行）。No. は通し番号
function makeTest(g){const s=GRADES[g],used=new Set(),items=[],sections=[];
 const uniq=f=>{for(let i=0;i<50;i++){let p=f();if(!used.has(key(p))){used.add(key(p));return p}}return f()};
 for(const kind of kinds(g)){let spec=s[kind],start=items.length;
  for(let i=0;i<spec.n;i++){let p=kind==='mitori'?uniq(()=>mitori(spec.kuchi,MINUS_AT.includes(i)?spec.minus:0)):uniq(()=>gen(g,kind));p.no=items.length+1;p.pts=spec.pts;items.push(p)}
  sections.push({kind,label:KIND_NAME[kind],from:start,to:items.length,max:spec.n*spec.pts})}
 return{grade:g,items,sections,min:s.min,max:sections.reduce((t,x)=>t+x.max,0)}}
// 入力の読み取り（全角・カンマ・空白を許す）
function parse(raw){if(raw===undefined||raw===null)return NaN;let s=String(raw).replace(/[０-９]/g,c=>String.fromCharCode(c.charCodeAt(0)-65248)).replace(/[,，、\s]/g,'');return /^\d+$/.test(s)?Number(s):NaN}
function score(test,answers){let total=0,right=[];
 const secs=test.sections.map(sec=>{let got=0,ok=0;for(let i=sec.from;i<sec.to;i++){let p=test.items[i],r=parse(answers[i])===p.answer;right[i]=r;if(r){got+=p.pts;ok++}}total+=got;return{kind:sec.kind,label:sec.label,got,max:sec.max,ok,n:sec.to-sec.from}});
 const g=test.grade,s=GRADES[g];let reached=[];
 if(s.same){if(total>=GRADES['9'].pass)reached=['10','9'];else if(total>=GRADES['10'].pass)reached=['10']}else if(total>=s.pass)reached=[g];
 return{sections:secs,total,max:test.max,pass:s.pass,passed:total>=s.pass,reached,right}}
// レベルチェック（約5分）。区切りごとに3問。2問以上できたら次の区切りへ
function makeCheck(){const one=()=>ri(1,9);
 const nyumon=[()=>{let a=ri(3,9),b=ri(10-a,9);return{kind:'mitori',nums:[a,b],answer:a+b}},()=>{let a=ri(11,18),b=ri(a%10+1,9);return{kind:'mitori',nums:[a,-b],answer:a-b}},()=>{let a=ri(2,4),b=ri(5-a,4),c=ri(1,a+b-1);return{kind:'mitori',nums:[a,b,-c],answer:a+b-c}}];
 return[{key:'nyumon',label:'入門',items:nyumon.map(f=>f())},
  {key:'10',label:'10級・9級',items:[mitori(3,0),kake(2,1),kake(2,1)]},
  {key:'8',label:'8級',items:[mitori(5,1),kake(3,1),wari(1,2)]},
  {key:'7',label:'7級',items:[mitori(6,2),kake(2,2),wari(1,3)]}]}
// okCounts: 区切りごとの正解数（途中で終わったら短い配列）。最初に2問未満だった区切りから始める
function recommend(okCounts){const keys=['nyumon','10','8','7'];for(let i=0;i<keys.length;i++){if(okCounts[i]===undefined||okCounts[i]<2)return keys[i]}return'test7'}
// ---- 珠の手順（各手順のあとのそろばん全体の数 target。teii=定位点の棒） ----
const ROD_NAME=['左から1本目','左から2本目','左から3本目','左から4本目','左から5本目','右から2本目','右端'];
function placeName(r,teii){let k=teii-r;return k===0?'一の位':k===1?'十の位':k===2?'百の位':k===3?'千の位':k===4?'万の位':k<0?'定位点の右':'上の位'}
function stepsMitori(nums){let cur=0,steps=[];
 nums.forEach((x,k)=>{let v=Math.abs(x),t=Math.floor(v/10)%10,o=v%10,h=Math.floor(v/100),word=x<0?'引く':'足す',lab=`${k+1}口目 ${k&&x>0?'＋':x<0?'−':''}${v}`;
  if(h){cur+=Math.sign(x)*h*100;steps.push({text:`${lab}：百の位に ${h} を${word}`,target:cur,rods:[4]})}
  if(t){cur+=Math.sign(x)*t*10;steps.push({text:`${lab}：十の位に ${t} を${word}`,target:cur,rods:[5],rod:5,v:t,minus:x<0})}
  if(o){cur+=Math.sign(x)*o;steps.push({text:`${lab}：一の位に ${o} を${word}`,target:cur,rods:[6],rod:6,v:o,minus:x<0})}});
 return{start:0,teii:6,steps,read:n=>n}}
// かけ算（定位法の一例）: 実の一の位を定位点から法のけた数だけ左に置き、実の一の位から順に「払って→法の左から九九の答えを2けたで足す」
function stepsKake(a,b){const hd=String(b).length,jOnes=6-hd,as=String(a),bs=String(b);let cur=a*10**hd;
 const rodsA=as.split('').map((_,i)=>jOnes-(as.length-1-i));
 let steps=[{text:`法（かける数）${b} は ${hd}けた。実（かけられる数）${a} を、定位点から ${hd}つ左の棒が一の位になるように置く。`,target:cur,rods:rodsA}];
 for(let i=as.length-1;i>=0;i--){let d=+as[i],r=rodsA[i];
  if(d===0){steps[steps.length-1].text+=` 実の${as.length-1-i===0?'一の位':'次の数字'}は 0 なので、とばす。`;continue}
  cur-=d*P(r);steps.push({text:`実の ${d} を覚えて、払う。`,target:cur,rods:[r]});
  bs.split('').forEach((fc,t)=>{let f=+fc,prod=d*f;if(!prod){steps[steps.length-1].text+=` ${d}×${f}＝00 なので、何も足さない。`;return}
   cur+=prod*10**(5-(r+t));steps.push({text:`${d}×${f}＝${pad2(prod)}。${t===0?`${d} を払った棒`:`その${t}つ右の棒`}から、2けたで ${pad2(prod)} を足す。`,target:cur,rods:[r+t,r+t+1]})})}
 return{start:0,teii:6,steps,read:n=>n}}
// わり算（定位法の一例・法1けた）: 定位点は右から3本目。わられる数は一の位を右端に置く（定位点から 法のけた数＋1 だけ右）
function stepsWari(a,b){if(b>9)throw Error('法は1けたのみ');const teii=4,ten=10**(6-teii);let cur=a,rem=a;
 const as=String(a),rodsA=as.split('').map((_,i)=>6-(as.length-1-i));
 let steps=[{text:`わられる数 ${a.toLocaleString('ja-JP')} を、一の位が右端にくるように置く。答えは定位点（右から3本目）を一の位にして読む。`,target:a,rods:rodsA}];
 for(let guard=0;rem>0&&guard<20;guard++){let h=0;while(dig(rem,h)===0)h++;let d=dig(rem,h),s,part,why;
  if(d>=b){s=h-2;part=d;why=`頭の ${d} は ${b} 以上。商は ${d} の2つ左に立てる。`}else{s=h-1;part=d*10+dig(rem,h+1);why=`頭の ${d} は ${b} より小さい。${part} で考えて、商は ${d} のすぐ左に立てる。`}
  let q=Math.floor(part/b);cur+=q*P(s);steps.push({text:`${why} ${part}÷${b} → ${q}。`,target:cur,rods:[s]});
  let val=q*b*10**(4-s);cur-=val;rem-=val;steps.push({text:`${q}×${b}＝${pad2(q*b)}。商の右隣から、2けたで ${pad2(q*b)} を引く。`,target:cur,rods:[s+1,s+2]})}
 return{start:0,teii,steps,read:n=>n/ten}}
function steps(p){return p.kind==='mitori'?stepsMitori(p.nums):p.kind==='kake'?stepsKake(p.a,p.b):stepsWari(p.a,p.b)}
return{GRADES,ORDER,MINUS_AT,KIND_NAME,gen,mitori,kake,wari,makeTest,score,parse,makeCheck,recommend,steps,text,key,kinds,dig,P,placeName,ROD_NAME}
})();
