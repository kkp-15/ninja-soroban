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
console.log(summary.join('\n'));console.log(bad?'FAIL '+bad:'ALL PASS (11レッスン×100問)');process.exit(bad?1:0)
