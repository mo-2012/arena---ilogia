// ilogia Arena — static frontend. DEMO DATA only; official scoring needs the server (see README).
const CFG={pts:{1:10,2:15,3:20},perfect:20,dailyBonus:15,secPerQ:20,levels:[["مبتدئ",0],["مستكشف",100],["متعلّم",300],["متقدّم",600],["خبير",1000],["محترف",1600],["بطل",2500]]};
const DIFF={1:"سهل",2:"متوسط",3:"صعب"};
const Q=[ // DEMO DATA
{s:"رياضيات",d:1,q:"ما ناتج ٧ × ٨؟",o:["٥٦","٤٨","٦٤","٦٣"],a:0},
{s:"رياضيات",d:1,q:"ما ناتج ١٢٠ ÷ ٦؟",o:["٢٠","٢٤","١٥","١٨"],a:0},
{s:"رياضيات",d:2,q:"مساحة مستطيل طوله ٥ وعرضه ٤ تساوي:",o:["١٨","٢٠","٩","٢٥"],a:1},
{s:"رياضيات",d:3,q:"إذا كان ٢س + ٦ = ١٤ فإن س =",o:["٣","٤","٥","٦"],a:1},
{s:"علوم",d:1,q:"الشمس نجم وليست كوكبًا.",o:["صح","خطأ"],a:0},
{s:"علوم",d:2,q:"يغلي الماء النقي عند ١٠٠° س عند مستوى سطح البحر.",o:["صح","خطأ"],a:0},
{s:"علوم",d:2,q:"أكبر كواكب المجموعة الشمسية:",o:["الأرض","المشتري","المريخ","زحل"],a:1},
{s:"علوم",d:3,q:"الغاز الذي تمتصه النباتات في البناء الضوئي:",o:["الأكسجين","النيتروجين","ثاني أكسيد الكربون","الهيدروجين"],a:2},
{s:"لغة عربية",d:1,q:"أي الكلمات التالية فعل؟",o:["كتاب","مدرسة","يكتب","جميل"],a:2},
{s:"لغة عربية",d:2,q:"جمع كلمة «كتاب»:",o:["كاتبون","كتب","مكتبة","كتّاب"],a:1},
{s:"لغة عربية",d:3,q:"الفاعل في الجملة الفعلية يكون مرفوعًا.",o:["صح","خطأ"],a:0},
{s:"دراسات",d:1,q:"ما عاصمة مصر؟",o:["الإسكندرية","القاهرة","أسوان","الجيزة"],a:1},
{s:"دراسات",d:2,q:"يصب نهر النيل في البحر المتوسط.",o:["صح","خطأ"],a:0}];
const SUBJ=[...new Set(Q.map(x=>x.s))];
const ACH=[
["first","أول تحدٍّ","أكمل تحديًا واحدًا","flag",s=>s.done,1],
["perfect","الدرجة الكاملة","أجب عن كل الأسئلة صحيحًا","stars",s=>s.perfect,1],
["streak3","متعلّم مثابر","٣ أيام متتالية من النشاط","local_fire_department",s=>s.best,3],
["explorer","مستكشف المعرفة","جرّب تحديات في ٣ مواد","explore",s=>s.subj.length,3],
["daily","بطل اليوم","أكمل التحدي اليومي","today",s=>s.dailyN,1],
["master","سيد التحديات","أكمل ٥ تحديات","emoji_events",s=>s.done,5]];
const KEY="ilogia_arena_demo",D0={xp:0,done:0,perfect:0,days:[],best:0,log:[],unlocked:{},subj:[],dailyN:0,dailyDate:"",name:"",theme:""};
let S;try{S=Object.assign({},D0,JSON.parse(localStorage.getItem(KEY)))}catch(e){S={...D0}}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}};
const $=(s,r=document)=>r.querySelector(s),ymd=d=>d.toISOString().slice(0,10),today=()=>ymd(new Date());
const fmt=t=>new Date(t).toLocaleDateString("ar-EG",{year:"numeric",month:"short",day:"numeric"});
const ms=n=>`<span class="ms" aria-hidden="true">${n}</span>`;
const empty=(i,t,d)=>`<div class="empty">${ms(i)}<b>${t}</b><p>${d}</p></div>`;
const head=(e,t,s)=>`<span class="eye">${e}</span><h2>${t}</h2><p class="sub">${s||""}</p>`;
function toast(m){const t=$("#toast");t.innerHTML=`<div>${m}</div>`;clearTimeout(toast.t);toast.t=setTimeout(()=>t.innerHTML="",3500)}
function streak(){const s=new Set(S.days);let c=0,d=new Date();if(!s.has(ymd(d)))d.setDate(d.getDate()-1);while(s.has(ymd(d))){c++;d.setDate(d.getDate()-1)}return c}
function level(){let i=0;CFG.levels.forEach((l,k)=>{if(S.xp>=l[1])i=k});const n=CFG.levels[i+1];return{n:i+1,name:CFG.levels[i][0],next:n,pct:n?Math.round((S.xp-CFG.levels[i][1])/(n[1]-CFG.levels[i][1])*100):100}}
function seeded(seed,arr){let h=0;for(const c of seed)h=(h*31+c.charCodeAt(0))>>>0;return arr.map(x=>[x,(Math.sin(h+=7919)*1e4)%1]).sort((a,b)=>a[1]-b[1]).map(x=>x[0])}
function record(set,score,daily){ // practice-only scoring; official scores must be computed server-side
 let gain=set.reduce((g,q,i)=>g+(q.ok?CFG.pts[q.d]:0),0)+(score===set.length?CFG.perfect:0),dup=false;
 if(daily){if(S.dailyDate===today())dup=true;else{gain+=CFG.dailyBonus;S.dailyDate=today();S.dailyN++}}
 if(!S.days.includes(today()))S.days.push(today());
 S.xp+=gain;S.done++;if(score===set.length)S.perfect++;set.forEach(q=>{if(!S.subj.includes(q.s))S.subj.push(q.s)});S.best=Math.max(S.best,streak());
 S.log.unshift({t:Date.now(),score,total:set.length,gain,daily:!!daily});
 const fresh=[];ACH.forEach(a=>{if(!S.unlocked[a[0]]&&a[4](S)>=a[5]){S.unlocked[a[0]]=Date.now();fresh.push(a[1])}});save();
 if(fresh.length)toast("أحسنت! إنجاز جديد: "+fresh.join("، "));return{gain,fresh,dup}}
// ===== Pages =====
const P={};
P["/"]=()=>{const l=level();return`<div class="hero"><div class="wrap"><div><span class="eye">ساحة منافسة تعليمية</span><h1>تنافس بذكاء، وتقدّم بخطوات محسوبة.</h1><p>تحديات ومسابقات تبني الفهم قبل الحفظ، وتكافئ الاجتهاد الحقيقي بنقاط ومستويات وإنجازات.</p><div class="acts"><a class="btn gold" href="#/challenges">ابدأ تحديًا</a><a class="btn alt" href="#/competitions">المسابقات</a></div></div>
<div class="lv"><div class="ring" style="--p:${l.pct}"><i>${l.pct}٪</i></div><span class="mu" style="color:#ffffffb0">المستوى ${l.n}</span><div class="big">${l.name}</div><p style="margin:0;opacity:.85">${S.xp} نقطة · ${l.next?`${l.next[1]-S.xp} نقطة للمستوى «${l.next[0]}»`:"أعلى مستوى"}</p></div></div></div>
<div class="wrap"><section>${head("لوحتك","ملخص تقدّمك")}<div class="grid">
${[["bolt","النقاط",S.xp],["task_alt","تحديات مكتملة",S.done],["local_fire_department","السلسلة الحالية",streak()+" يوم"],["workspace_premium","الإنجازات",Object.keys(S.unlocked).length+"/"+ACH.length]].map(x=>`<div class="card stat">${ms(x[0])}<div><b>${x[2]}</b><span class="mu">${x[1]}</span></div></div>`).join("")}</div></section>
<section>${head("اليوم","التحدي اليومي","مكافأة إضافية مرة واحدة كل يوم.")}<div class="card"><span class="tag demo">DEMO</span> ${S.dailyDate===today()?'<p>أكملت تحدي اليوم. عد غدًا للمزيد.</p>':'<p>٤ أسئلة متنوعة بمستوى مختلط.</p><a class="btn" href="#/challenges?m=daily">ابدأ التحدي اليومي</a>'}</div></section>
<section>${head("المسابقات","المسابقات النشطة والقادمة")}${empty("emoji_events","لا توجد مسابقات منشورة","ستظهر المسابقات الرسمية هنا عند ربط المنصة بقاعدة البيانات ونشرها.")}</section>
<section>${head("رحلة الطالب","من المعرفة إلى الإنجاز")}<div class="steps">${[["المعرفة","اقرأ السؤال وافهم المطلوب."],["الفهم","اربط الفكرة بما تعرفه."],["التفكير","استنتج الإجابة بنفسك."],["التدريب","كرّر التحدي لتتقن."],["الإنجاز","اجمع النقاط وافتح الإنجازات."],["التحوّل","ثقة أكبر واستقلالية في التعلم."]].map((x,i)=>`<div class="card"><b>٠${"١٢٣٤٥٦"[i]}</b><strong>${x[0]}</strong><p class="mu" style="margin:0">${x[1]}</p></div>`).join("")}</div></section>
<section>${head("مركز المساعدة","أسئلة شائعة")}${[["هل النقاط هنا رسمية؟","لا. التحديات الحالية تدريبية ومحلية على جهازك. النقاط الرسمية تُحسب من الخادم فقط."],["كيف تُحسب السلسلة؟","بيوم واحد على الأقل من النشاط الفعلي، ولا يزيد التكرار في اليوم نفسه من السلسلة."],["متى تظهر المسابقات الرسمية؟","عند ربط المنصة بالنظام الخلفي ونشر المسابقات من لوحة الإدارة."]].map(x=>`<details><summary>${x[0]}</summary><p class="mu">${x[1]}</p></details>`).join("")}</section></div>`};
P["/competitions"]=()=>`<div class="wrap"><section>${head("المسابقات","كل المسابقات","الحالات: قادمة · نشطة · منتهية · مغلقة")}<div class="tools"><input type="search" placeholder="ابحث عن مسابقة" aria-label="بحث"><select aria-label="المادة"><option>كل المواد</option>${SUBJ.map(s=>`<option>${s}</option>`).join("")}</select><select aria-label="الصعوبة"><option>كل المستويات</option>${Object.values(DIFF).map(s=>`<option>${s}</option>`).join("")}</select></div>${empty("emoji_events","لا توجد مسابقات بعد","لم يتم ربط مصدر بيانات المسابقات. لا نعرض أعداد مشاركين أو جوائز غير حقيقية.")}</section></div>`;
P["/leaderboard"]=()=>`<div class="wrap"><section>${head("الترتيب","المتصدّرون")}<div class="tabs" role="group" aria-label="الفترة">${["اليوم","الأسبوع","الشهر","الكل"].map((t,i)=>`<button aria-pressed="${i==3}">${t}</button>`).join("")}</div>${empty("leaderboard","لا يوجد ترتيب بعد","يظهر الترتيب عند وجود مشاركين ومسابقات حقيقية. لا نعرض أسماء أو نتائج مُختلقة.")}</section></div>`;
P["/achievements"]=()=>`<div class="wrap"><section>${head("الإنجازات","إنجازاتك","تُفتح بالنشاط الفعلي فقط.")}<div class="grid">${ACH.map(a=>{const v=Math.min(a[4](S),a[5]),u=S.unlocked[a[0]];return`<div class="card ach ${u?"":"lock"}">${ms(a[3])}<h3>${a[1]}</h3><p class="mu">${a[2]}</p><div class="bar"><i style="width:${v/a[5]*100}%"></i></div><p class="mu" style="margin:6px 0 0">${v}/${a[5]}${u?" · فُتح "+fmt(u):""}</p></div>`}).join("")}</div></section></div>`;
P["/profile"]=()=>{const l=level(),nm=S.name||"طالب ilogia";return`<div class="wrap"><section><div class="card stat"><div class="av">${nm[0]}</div><div><h3>${nm}</h3><span class="mu">المستوى ${l.n}: ${l.name} · ${S.xp} نقطة</span></div></div>
<h2 style="margin-top:28px">السلسلة</h2><p class="sub">الحالية ${streak()} · الأفضل ${S.best}</p><div class="cal" aria-label="آخر ٢٨ يومًا">${Array.from({length:28},(_,i)=>{const d=new Date();d.setDate(d.getDate()-27+i);return`<i class="${S.days.includes(ymd(d))?"f":""}"></i>`}).join("")}</div>
<div class="grid" style="margin-top:28px">${[["/achievements","workspace_premium","الإنجازات"],["/activity","history","سجل النشاط"],["/settings","settings","الإعدادات"]].map(x=>`<a class="card hv stat" href="#${x[0]}">${ms(x[1])}<b style="font-size:18px">${x[2]}</b></a>`).join("")}</div>
<p class="mu">تسجيل الدخول وربط الحساب غير مفعّل بعد.</p></section></div>`};
P["/activity"]=()=>`<div class="wrap"><section>${head("السجل","سجل النشاط")}${S.log.length?`<div class="card">${S.log.map(e=>`<div class="row"><span>${e.daily?"التحدي اليومي":"تحدٍّ تدريبي"}: ${e.score}/${e.total}</span><span class="mu">+${e.gain} نقطة · ${fmt(e.t)}</span></div>`).join("")}</div>`:empty("history","لا نشاط بعد","سيظهر هنا ما تنجزه.")}</section></div>`;
P["/settings"]=()=>`<div class="wrap"><section>${head("حسابك","الإعدادات")}<div class="card"><div class="row"><label for="nm">الاسم المعروض</label><input id="nm" value="${S.name.replace(/"/g,"&quot;")}" maxlength="30"></div><div class="row"><label for="th">المظهر</label><select id="th"><option value="">تلقائي</option><option value="light">فاتح</option></select></div><div class="row"><span>اللغة</span><span class="mu">العربية (الإنجليزية قيد الإعداد)</span></div><div class="row"><span>الإشعارات والخصوصية</span><span class="mu">تتطلب تسجيل الدخول</span></div><p><button class="btn alt" id="rs">مسح بيانات التجربة المحلية</button></p></div></section></div>`;
P["/challenges"]=()=>`<div class="wrap"><section id="ch"></section></div>`;
// ===== Challenge engine =====
function challenge(){
 const el=$("#ch"),qs=new URLSearchParams(location.hash.split("?")[1]||"");let mode=qs.get("m")||"quick",subj="",diff=0,tm;
 const modes=[["quick","bolt","تحدٍّ سريع","٥ أسئلة"],["timed","timer","تحدٍّ بوقت","٢٠ ث لكل سؤال"],["daily","today","التحدي اليومي","مكافأة يومية"],["subject","menu_book","حسب المادة","اختر المادة"]];
 function setup(){clearInterval(tm);el.innerHTML=head("التحديات","ساحة التحديات","اختر النوع ثم راجع القواعد وابدأ.")+`<div class="tabs" role="group" aria-label="نوع التحدي">${modes.map(m=>`<button data-m="${m[0]}" aria-pressed="${m[0]===mode}">${m[2]}</button>`).join("")}</div><div class="card"><span class="tag demo">DEMO · تدريبي</span>
 <div class="tools" style="margin-top:12px"><select id="sj" aria-label="المادة"><option value="">كل المواد</option>${SUBJ.map(s=>`<option ${s===subj?"selected":""}>${s}</option>`).join("")}</select><select id="df" aria-label="الصعوبة"><option value="0">كل المستويات</option>${[1,2,3].map(d=>`<option value="${d}" ${d===diff?"selected":""}>${DIFF[d]}</option>`).join("")}</select></div>
 <p class="mu">القواعد: يمكنك تغيير إجابتك قبل التسليم. الدرجات هنا للتدريب ولا تُحتسب رسميًا. ${mode==="timed"?"عند انتهاء الوقت يُسلَّم التحدي تلقائيًا.":""}</p>
 ${mode==="daily"&&S.dailyDate===today()?'<p>أكملت تحدي اليوم. يمكنك التدرّب دون مكافأة إضافية.</p>':""}
 <label><input type="checkbox" id="cf"> أفهم القواعد وأرغب بالبدء</label><p><button class="btn" id="go" disabled>ابدأ</button></p></div>`;
  el.querySelectorAll("[data-m]").forEach(b=>b.onclick=()=>{mode=b.dataset.m;setup()});
  $("#sj").onchange=e=>subj=e.target.value;$("#df").onchange=e=>diff=+e.target.value;$("#cf").onchange=e=>$("#go").disabled=!e.target.checked;$("#go").onclick=start}
 function start(){let pool=Q.filter(q=>(!subj||q.s===subj)&&(!diff||q.d===diff));
  pool=mode==="daily"?seeded(today(),Q).slice(0,4):[...pool].sort(()=>Math.random()-.5).slice(0,mode==="quick"?5:6);
  if(!pool.length)return el.innerHTML=empty("search_off","لا توجد أسئلة مطابقة",'<button class="btn alt" onclick="route()">رجوع</button>');
  const set=pool.map(q=>({...q,pick:-1,ok:false})),end=Date.now()+(mode==="timed"?set.length*CFG.secPerQ*1000:0),t0=Date.now();let i=0;
  const draw=()=>{const q=set[i];el.innerHTML=`<div class="card"><div style="display:flex;justify-content:space-between"><span class="mu">سؤال ${i+1} من ${set.length} · ${q.s} · ${DIFF[q.d]}</span><span class="timer" id="tt"></span></div><div class="bar" style="margin:10px 0"><i style="width:${set.filter(x=>x.pick>=0).length/set.length*100}%"></i></div>
   <h2 id="qq" style="font-size:22px">${q.q}</h2><div role="group" aria-labelledby="qq">${q.o.map((o,k)=>`<button class="opt" data-k="${k}" aria-pressed="${q.pick===k}">${o}</button>`).join("")}</div>
   <div class="qnav" aria-label="التنقل بين الأسئلة">${set.map((x,k)=>`<button data-n="${k}" class="${x.pick>=0?"a":""} ${k===i?"c":""}" aria-label="سؤال ${k+1}">${k+1}</button>`).join("")}</div>
   <div style="display:flex;gap:8px;justify-content:space-between"><button class="btn alt" id="pv" ${i?"":"disabled"}>السابق</button>${i<set.length-1?'<button class="btn" id="nx">التالي</button>':'<button class="btn gold" id="sb">تسليم</button>'}</div></div>`;
   el.querySelectorAll(".opt").forEach(b=>b.onclick=()=>{q.pick=+b.dataset.k;draw()});el.querySelectorAll("[data-n]").forEach(b=>b.onclick=()=>{i=+b.dataset.n;draw()});
   $("#pv").onclick=()=>{i--;draw()};const nx=$("#nx");if(nx)nx.onclick=()=>{i++;draw()};const sb=$("#sb");if(sb)sb.onclick=finish;tick()};
  const tick=()=>{const t=$("#tt");if(!t||mode!=="timed"){if(t)t.textContent="";return}const r=Math.max(0,Math.ceil((end-Date.now())/1000));t.textContent=`${Math.floor(r/60)}:${String(r%60).padStart(2,"0")}`;t.classList.toggle("low",r<=10)};
  clearInterval(tm);if(mode==="timed")tm=setInterval(()=>{tick();if(Date.now()>=end)finish()},500);
  function finish(){clearInterval(tm);set.forEach(q=>q.ok=q.pick===q.a);const sc=set.filter(q=>q.ok).length,r=record(set,sc,mode==="daily"),sec=Math.round((Date.now()-t0)/1000);
   el.innerHTML=`<div class="card"><h2>النتيجة: ${sc} من ${set.length}</h2><p>صحيحة ${sc} · خاطئة ${set.length-sc} · الوقت ${sec} ث</p><p><b>+${r.gain} نقطة</b> ${r.dup?'<span class="mu">(لا مكافأة يومية إضافية اليوم)</span>':""}</p>${r.fresh.length?`<p>إنجازات جديدة: ${r.fresh.join("، ")}</p>`:""}
   <h3 style="margin:16px 0 4px">مراجعة الإجابات</h3>${set.map(q=>`<div class="row"><span>${q.q}</span><span class="${q.ok?"tag":"tag demo"}">${q.ok?"صحيحة":"الصحيح: "+q.o[q.a]}</span></div>`).join("")}<p style="margin-top:16px"><button class="btn" onclick="route()">تحدٍّ جديد</button> <a class="btn alt" href="#/achievements">الإنجازات</a></p></div>`}
  draw()}
 setup()}
// ===== Router =====
const NAV=[["/","الرئيسية","home"],["/competitions","المسابقات","emoji_events"],["/challenges","التحديات","bolt"],["/leaderboard","المتصدّرون","leaderboard"],["/profile","ملفي","person"]];
function route(){
 document.documentElement.dataset.theme=S.theme||"";clearTimeouts();
 const p=(location.hash.slice(1)||"/").split("?")[0],pg=P[p]||(()=>`<div class="wrap"><section>${empty("explore_off","الصفحة غير موجودة",'<a class="btn" href="#/">الرئيسية</a>')}</section></div>`);
 const on=p==="/achievements"||p==="/activity"||p==="/settings"?"/profile":p;
 $("#tn").innerHTML=NAV.concat([["/achievements","الإنجازات"],["/activity","النشاط"]]).filter(n=>n[0]!=="/profile").map(n=>`<a href="#${n[0]}" class="${n[0]===p?"on":""}" ${n[0]===p?'aria-current="page"':""}>${n[1]}</a>`).join("");
 $("#bn").innerHTML=NAV.map(n=>`<a href="#${n[0]}" class="${n[0]===on?"on":""}">${ms(n[2])}<span>${n[1]}</span></a>`).join("");
 try{$("#m").innerHTML=pg()}catch(e){$("#m").innerHTML=`<div class="wrap"><section>${empty("error","حدث خطأ","تعذّر عرض الصفحة.")}</section></div>`}
 if(p==="/challenges")challenge();
 const th=$("#th");if(th){th.value=S.theme;th.onchange=()=>{S.theme=th.value;save();route()}}
 const nm=$("#nm");if(nm)nm.onchange=()=>{S.name=nm.value.trim().slice(0,30);save()};
 const rs=$("#rs");if(rs)rs.onclick=()=>{try{localStorage.removeItem(KEY)}catch(e){}S={...D0};route()};
}
function clearTimeouts(){}
addEventListener("hashchange",()=>{route();window.scrollTo(0,0);$("#m").focus({preventScroll:true})});route();
