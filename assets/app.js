// ilogia Arena — exam scores and points are managed by exams.ilogia-eg.com.
const DB=window.ILOGIA_SUPABASE||{};
const AUTH_KEY="ilogia_arena_auth";
const OAUTH_VERIFIER_KEY="ilogia_arena_oauth_verifier";
let session=null,authNotice="",authMode="signin",profileRequest=0;
try{const saved=JSON.parse(localStorage.getItem(AUTH_KEY)||"null");if(saved?.access_token&&saved?.refresh_token&&saved?.user?.id)session=saved}catch(e){session=null}
const $=(s,r=document)=>r.querySelector(s);
const ms=n=>`<span class="ms" aria-hidden="true">${n}</span>`;
const empty=(i,t,d)=>`<div class="empty">${ms(i)}<b>${t}</b><p>${d}</p></div>`;
const head=(e,t,s)=>`<span class="eye">${e}</span><h2>${t}</h2><p class="sub">${s||""}</p>`;
function storeSession(value){session=value;try{if(value)localStorage.setItem(AUTH_KEY,JSON.stringify(value));else localStorage.removeItem(AUTH_KEY)}catch(error){console.error("Could not persist the Supabase session:",error)}}
function authEndpoint(path){if(!DB.url||!DB.anonKey)throw new Error("إعدادات Supabase غير مكتملة. راجع assets/config.js.");return`${DB.url.replace(/\/+$/,"")}/auth/v1/${path}`}
async function authRequest(path,{method="POST",body,token}={}){
 const headers={apikey:DB.anonKey,"Content-Type":"application/json"};
 if(token)headers.Authorization=`Bearer ${token}`;
 let response;
 try{response=await fetch(authEndpoint(path),{method,headers,body:body===undefined?undefined:JSON.stringify(body)})}
 catch(error){throw new Error("تعذر الاتصال بخدمة تسجيل الدخول. تحقق من الإنترنت وحاول مرة أخرى.")}
 let result={};try{result=await response.json()}catch(error){if(response.ok)throw new Error("استجابة غير مفهومة من خدمة تسجيل الدخول.")}
 if(!response.ok)throw new Error(result.msg||result.message||result.error_description||result.error||"تعذر إكمال الطلب.");
 return result;
}
function base64Url(bytes){let binary="";bytes.forEach(byte=>binary+=String.fromCharCode(byte));return btoa(binary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}
async function startGoogleSignIn(button){
 const message=$("#auth-message"),originalText=button.textContent;
 button.disabled=true;button.textContent="جارٍ التحويل إلى Google...";
 try{
  if(!window.crypto?.subtle||!window.crypto?.getRandomValues||!window.sessionStorage)throw new Error("تسجيل Google يحتاج فتح الموقع عبر HTTPS.");
  const verifier=base64Url(window.crypto.getRandomValues(new Uint8Array(32)));
  const digest=await window.crypto.subtle.digest("SHA-256",new TextEncoder().encode(verifier));
  const authorize=new URL(authEndpoint("authorize"));
  const returnUrl=new URL(location.href);
  returnUrl.search="";
  if(!returnUrl.hash)returnUrl.hash="#/login";
  authorize.search=new URLSearchParams({provider:"google",redirect_to:returnUrl.toString(),code_challenge:base64Url(new Uint8Array(digest)),code_challenge_method:"s256"}).toString();
  window.sessionStorage.setItem(OAUTH_VERIFIER_KEY,verifier);
  location.assign(authorize.toString());
 }catch(error){message.textContent=error.message;button.disabled=false;button.textContent=originalText}
}
async function finishGoogleSignIn(){
 const callback=new URLSearchParams(location.search),code=callback.get("code"),oauthError=callback.get("error_description")||callback.get("error_code")||callback.get("error");
 if(!code&&!oauthError)return false;
 if(oauthError){history.replaceState(null,"",`${location.pathname}#/login`);authNotice=`تعذّر تسجيل الدخول باستخدام Google: ${oauthError}`;return true}
 let verifier;
 try{verifier=window.sessionStorage.getItem(OAUTH_VERIFIER_KEY);window.sessionStorage.removeItem(OAUTH_VERIFIER_KEY)}catch(error){console.error("Could not read the Google OAuth verifier:",error)}
 if(!verifier){history.replaceState(null,"",`${location.pathname}#/login`);authNotice="تعذّر التحقق من محاولة تسجيل الدخول. ابدأ تسجيل الدخول باستخدام Google مرة أخرى.";return true}
 history.replaceState(null,"",`${location.pathname}#/profile`);
 try{
  const tokens=await authRequest("token?grant_type=pkce",{body:{auth_code:code,code_verifier:verifier}});
  if(!tokens.access_token||!tokens.refresh_token||!tokens.user?.id)throw new Error(" جلسة صالحة.");
  saveAuthSession(tokens);authNotice="تم تسجيل الدخول باستخدام Google.";return true;
 }catch(error){history.replaceState(null,"",`${location.pathname}#/login`);console.error("Google OAuth exchange failed:",error);authNotice=error.message;return true}
}
function saveAuthSession(value){
 const expiresAt=value.expires_at||Math.floor(Date.now()/1000)+(value.expires_in||3600);
 storeSession({access_token:value.access_token,refresh_token:value.refresh_token,expires_at:expiresAt,user:value.user});
}
async function refreshAuthSession(){
 if(!session?.refresh_token)return false;
 try{const renewed=await authRequest("token?grant_type=refresh_token",{body:{refresh_token:session.refresh_token}});saveAuthSession(renewed);return true}
 catch(error){console.error("Supabase session refresh failed:",error);storeSession(null);return false}
}
async function authenticatedFetch(path,options={}){
 if(!session?.access_token)throw new Error("سجّل الدخول أولًا.");
 if(session.expires_at<Date.now()/1000+30&&!await refreshAuthSession())throw new Error("انتهت صلاحية تسجيل الدخول. سجّل الدخول مرة أخرى.");
 const send=token=>fetch(`${DB.url.replace(/\/+$/,"")}/rest/v1/${path}`,{...options,headers:{apikey:DB.anonKey,Authorization:`Bearer ${token}`,...options.headers}});
 let response;
 try{response=await send(session.access_token)}catch(error){throw new Error("تعذر الاتصال بقاعدة البيانات. تحقق من الإنترنت وحاول مرة أخرى.")}
 if(response.status===401&&await refreshAuthSession()){
  try{response=await send(session.access_token)}catch(error){throw new Error("تعذر الاتصال بقاعدة البيانات. تحقق من الإنترنت وحاول مرة أخرى.")}
 }
 return response;
}
function renderAccountLink(){
 const link=$("#account-link");if(link){link.href=session?"#/profile":"#/login";link.textContent=session?"حسابي":"تسجيل الدخول"}
}
async function handleAuthSubmit(form){
 const message=$("#auth-message",form),submit=$('button[type="submit"]',form);
 const email=$("#auth-email",form)?.value.trim(),password=$("#auth-password",form)?.value;
 if(!email||!password){message.textContent="اكتب البريد الإلكتروني وكلمة المرور.";return}
 if(authMode==="signup"&&password.length<6){message.textContent="كلمة المرور لازم تكون ٦ أحرف على الأقل.";return}
 submit.disabled=true;message.textContent="جارٍ التنفيذ...";
 try{
  if(authMode==="signup"){
   const fullName=$("#auth-name",form)?.value.trim();
   if(!fullName){message.textContent="اكتب اسم الطالب.";submit.disabled=false;return}
   const redirectTo=`${location.origin}${location.pathname}#/login`;
   const result=await authRequest(`signup?redirect_to=${encodeURIComponent(redirectTo)}`,{body:{email,password,data:{full_name:fullName}}});
   if(result.access_token){saveAuthSession(result);authNotice="تم إنشاء الحساب وتسجيل الدخول.";location.hash="#/profile"}
   else{authNotice="تم إنشاء الحساب. راجع بريدك الإلكتروني لتأكيده، ثم سجّل الدخول.";authMode="signin";location.hash="#/login";route()}
  }else{
   const result=await authRequest("token?grant_type=password",{body:{email,password}});
   saveAuthSession(result);authNotice="تم تسجيل الدخول بنجاح.";location.hash="#/profile";
  }
 }catch(error){message.textContent=error.message;submit.disabled=false}
}
function bindAuthPage(){
 const googleButton=$("#google-login");if(googleButton)googleButton.onclick=()=>startGoogleSignIn(googleButton);
 const form=$("#auth-form");if(form)form.onsubmit=event=>{event.preventDefault();handleAuthSubmit(form)};
 document.querySelectorAll("[data-auth-mode]").forEach(button=>button.onclick=()=>{authMode=button.dataset.authMode;authNotice="";route()});
 const logout=$("#logout");if(logout)logout.onclick=async()=>{
  logout.disabled=true;
  try{if(session?.access_token)await authRequest("logout",{token:session.access_token})}
  catch(error){console.error("Supabase sign-out request failed:",error)}
  storeSession(null);authNotice="تم تسجيل الخروج.";location.hash="#/login";route();
 };
}
async function loadGradeChoices(){
 const query=new URLSearchParams({select:"id,name,stage,sort_order",order:"sort_order.asc"});
 const response=await authenticatedFetch(`grades?${query}`);
 if(!response.ok)throw new Error(`تعذر تحميل قائمة الصفوف (${response.status}).`);
 const grades=await response.json();
 if(!Array.isArray(grades)||grades.some(grade=>!Number.isInteger(Number(grade.id))||typeof grade.name!=="string"))throw new Error("استجابة قائمة الصفوف غير صالحة.");
 return grades;
}
function renderStudentOnboarding(target,grades,request){
 target.innerHTML=`<div class="card onboarding-card"><span class="onboarding-icon ms" aria-hidden="true">school</span><h2>أهلًا بك في ilogia</h2><p class="mu">اختار صفك الدراسي عشان نكمّل حسابك ونجيب درجاتك وترتيبك الصحيح.</p><form id="student-grade-form"><label for="student-grade">الصف الدراسي</label><select id="student-grade" required><option value="">اختار صفك</option>${grades.map(grade=>`<option value="${Number(grade.id)}">${escapeHTML(grade.name)}${grade.stage?` — ${escapeHTML(grade.stage)}`:""}</option>`).join("")}</select><p id="grade-message" class="auth-message" role="alert"></p><button class="btn" type="submit">حفظ الصف ومتابعة</button></form></div>`;
 const form=$("#student-grade-form",target);
 form.onsubmit=async event=>{
  event.preventDefault();
  const gradeId=Number($("#student-grade",form).value),button=$('button[type="submit"]',form),message=$("#grade-message",form);
  if(!Number.isInteger(gradeId)||!grades.some(grade=>Number(grade.id)===gradeId)){message.textContent="اختار صفًا صحيحًا من القائمة.";return}
  button.disabled=true;message.textContent="جارٍ حفظ بياناتك...";
  try{
   const response=await authenticatedFetch("rpc/complete_arena_student_profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({p_grade_id:gradeId})});
   if(!response.ok){let details={};try{details=await response.json()}catch(error){console.error("Could not read the student onboarding error:",error)}throw new Error(details.message||`تعذر حفظ ملف الطالب (${response.status}).`)}
   if(request!==profileRequest)return;
   authNotice="تم تجهيز حسابك بنجاح.";await loadMyProfile();
  }catch(error){console.error("Could not complete student onboarding:",error);message.textContent=error.message;button.disabled=false}
 };
}
async function loadMyProfile(){
 const target=$("#my-profile");if(!target)return;
 const request=++profileRequest;
 if(!session?.access_token){target.innerHTML=`${empty("lock","سجّل الدخول لعرض ملفك","ملف الطالب وبياناته يظهران بعد تسجيل الدخول.")}<p style="text-align:center"><a class="btn" href="#/login">تسجيل الدخول</a></p>`;return}
 target.innerHTML=empty("progress_activity","جارٍ تحميل ملفك","");
 try{
  const query=new URLSearchParams({select:"id,full_name,email,student_id,grade_id,grade_level,is_active,is_teacher,is_platform_admin",id:`eq.${session.user.id}`,limit:"1"});
  const response=await authenticatedFetch(`profiles?${query}`);
  if(!response.ok)throw new Error(`تعذر تحميل ملف الطالب (${response.status}).`);
  const rows=await response.json(),profile=rows[0]||null;
  if(request!==profileRequest||!$("#my-profile"))return;
  if(!profile||(!profile.grade_id&&!profile.is_teacher&&!profile.is_platform_admin)){
   const grades=await loadGradeChoices();
   if(request!==profileRequest||!$("#my-profile"))return;
   if(!grades.length)throw new Error("لا توجد صفوف دراسية متاحة للاختيار.");
   renderStudentOnboarding(target,grades,request);return;
  }
  const pointsQuery=new URLSearchParams({select:"total_points,level",user_id:`eq.${session.user.id}`,limit:"1"});
  const pointsResponse=await authenticatedFetch(`arena_points?${pointsQuery}`);
  if(!pointsResponse.ok)throw new Error(`تعذر تحميل نقاطك ومستواك (${pointsResponse.status}).`);
  const pointsRows=await pointsResponse.json(),points=pointsRows[0]||null;
  let grade=profile.grade_level||"غير محدد";
  if(profile.grade_id){
   const gradeQuery=new URLSearchParams({select:"name,stage",id:`eq.${profile.grade_id}`,limit:"1"});
   const gradeResponse=await authenticatedFetch(`grades?${gradeQuery}`);
   if(!gradeResponse.ok)throw new Error(`تعذر تحميل الصف الدراسي (${gradeResponse.status}).`);
   const grades=await gradeResponse.json();
   if(grades[0])grade=[grades[0].name,grades[0].stage].filter(Boolean).join(" · ");
  }
  if(request!==profileRequest||!$("#my-profile"))return;
  const name=profile.full_name||session.user.user_metadata?.full_name||"طالب ilogia";
  const role=profile.is_platform_admin?"مشرف":profile.is_teacher?"معلم":"طالب";
  target.innerHTML=`<div class="card student-profile"><div class="av">${escapeHTML(name.trim().charAt(0)||"ط")}</div><div><h3>${escapeHTML(name)}</h3><span class="mu">${escapeHTML(role)} · ${escapeHTML(grade)}</span><div class="mu">${escapeHTML(session.user.email||"")}</div>${profile.student_id?`<div class="mu">رقم الطالب: ${escapeHTML(profile.student_id)}</div>`:""}</div></div><div class="grid profile-stats"><div class="card stat"><span class="ms" aria-hidden="true">stars</span><div><b>${points?new Intl.NumberFormat("ar-EG").format(Number(points.total_points)):"—"}</b><span class="mu">نقاط الامتحانات</span></div></div><div class="card stat"><span class="ms" aria-hidden="true">military_tech</span><div><b>${points?new Intl.NumberFormat("ar-EG").format(Number(points.level)):"—"}</b><span class="mu">المستوى</span></div></div></div>${!points?'<p class="mu">لم تُسجّل نقاط امتحانات لهذا الحساب بعد.</p>':""}${profile.is_active?'<p class="tag">الحساب نشط</p>':'<p class="tag demo">الحساب غير نشط</p>'}<p class="account-actions"><a class="btn gold" href="https://exams.ilogia-eg.com/" target="_blank" rel="noopener noreferrer">اذهب إلى الامتحانات</a> <button class="btn alt" id="logout">تسجيل الخروج</button></p>`;
  bindAuthPage();
 }catch(error){
  if(request!==profileRequest||!$("#my-profile"))return;
  console.error("Could not load the signed-in student's profile:",error);
  target.innerHTML=`${empty("cloud_off","تعذّر تحميل ملفك",escapeHTML(error.message))}<p style="text-align:center"><button class="btn alt" onclick="loadMyProfile()">إعادة المحاولة</button></p>`;
 }
}
// ===== Pages =====
const P={};
P["/"]=()=>`<div class="hero"><div class="wrap"><div><span class="eye">ساحة ilogia للمنافسة</span><h1>درجاتك ونقاطك من امتحانات ilogia الرسمية.</h1><p>قدّم امتحاناتك على منصة الامتحانات، وارجع هنا لمتابعة ترتيبك ومستواك بين الطلاب.</p><div class="acts"><a class="btn gold" href="https://exams.ilogia-eg.com/" target="_blank" rel="noopener noreferrer">اذهب إلى الامتحانات</a><a class="btn alt" href="#/leaderboard">شاهد المتصدرين</a></div></div><div class="lv"><span class="ms" aria-hidden="true">school</span><div class="big">الامتحانات الرسمية</div><p>الدرجات والنقاط تُسجّل من منصة الامتحانات فقط، ولا تُحتسب من هذا الموقع.</p><a class="btn gold" href="https://exams.ilogia-eg.com/" target="_blank" rel="noopener noreferrer">ابدأ الامتحان</a></div></div></div><div class="wrap"><section>${head("مصدر النقاط","كيف تتقدّم؟","لا توجد تحديات تدريبية أو نقاط تُحتسب داخل هذه الخدمة.")}<div class="card exam-info"><span class="ms" aria-hidden="true">assignment_turned_in</span><div><h3>قدّم امتحانًا على منصة ilogia</h3><p class="mu">بعد تسجيل درجات الامتحانات في قاعدة البيانات، تُحدّث لوحة المتصدرين بالنقاط والمستوى الرسميين.</p><a class="btn" href="https://exams.ilogia-eg.com/" target="_blank" rel="noopener noreferrer">فتح منصة الامتحانات</a></div></div></section><section><a class="btn alt" href="#/leaderboard">عرض لوحة المتصدرين</a></section></div>`;
P["/leaderboard"]=()=>`<div class="wrap"><section>${head("الترتيب","المتصدّرون","ترتيب كلي حسب نقاط Arena والمستوى المسجلين في قاعدة البيانات.")}<div id="leaderboard-results" aria-live="polite">${empty("progress_activity","جارٍ تحميل الترتيب","")}</div></section></div>`;
P["/login"]=()=>`<div class="wrap"><section class="auth-section">${head("حساب الطالب",authMode==="signin"?"تسجيل الدخول":"إنشاء حساب جديد","استخدم حساب Google الموجود، أو سجّل ببريدك الإلكتروني.")}${authNotice?`<p class="auth-notice" role="status">${escapeHTML(authNotice)}</p>`:""}<div class="card auth-card"><button class="btn google-login" id="google-login" type="button"><span class="google-mark" aria-hidden="true">G</span> المتابعة باستخدام Google</button><div class="auth-divider"><span>أو بالبريد الإلكتروني</span></div><div class="tabs auth-tabs" role="group" aria-label="نوع الحساب"><button type="button" data-auth-mode="signin" aria-pressed="${authMode==="signin"}">تسجيل الدخول</button><button type="button" data-auth-mode="signup" aria-pressed="${authMode==="signup"}">حساب جديد</button></div><form id="auth-form">${authMode==="signup"?'<label for="auth-name">اسم الطالب</label><input id="auth-name" name="name" autocomplete="name" maxlength="80" required>':""}<label for="auth-email">البريد الإلكتروني</label><input id="auth-email" name="email" type="email" autocomplete="email" required><label for="auth-password">كلمة المرور</label><input id="auth-password" name="password" type="password" autocomplete="${authMode==="signin"?"current-password":"new-password"}" minlength="6" required><p id="auth-message" class="auth-message" role="alert"></p><button class="btn" type="submit">${authMode==="signin"?"دخول":"إنشاء الحساب"}</button></form></div></section></div>`;
P["/profile"]=()=>`<div class="wrap"><section>${head("حساب الطالب","ملفي الشخصي","بيانات الحساب والصف من قاعدة بيانات ilogia.")}<div id="my-profile" aria-live="polite"></div></section></div>`;
// ===== Router =====
const NAV=[["/","الرئيسية","home"],["/leaderboard","المتصدّرون","leaderboard"],["/profile","ملفي","person"]];
let leaderboardRequest=0;
const escapeHTML=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
async function loadLeaderboard(){
 const target=$("#leaderboard-results");if(!target)return;
 const request=++leaderboardRequest;
 if(!DB.url||!DB.anonKey){target.innerHTML=empty("settings","إعدادات الاتصال غير مكتملة","أضف رابط Supabase ومفتاح anon العام في assets/config.js.");return}
 target.innerHTML=empty("progress_activity","جارٍ تحميل الترتيب","");
 try{
  const endpoint=new URL(`${DB.url.replace(/\/+$/,"")}/rest/v1/arena_leaderboard`);
  endpoint.search=new URLSearchParams({select:"rank,full_name,grade_name,grade_stage,level,total_points",order:"rank.asc,full_name.asc",limit:"100"}).toString();
  const response=await fetch(endpoint,{headers:{apikey:DB.anonKey,Authorization:`Bearer ${DB.anonKey}`}});
  if(!response.ok){
   let details={};try{details=await response.json()}catch(error){console.error("Could not read the Supabase error response:",error)}
   const error=new Error(details.message||`Supabase returned ${response.status}`);
   error.code=details.code;
   error.status=response.status;
   throw error;
  }
  const rows=await response.json();
  if(!Array.isArray(rows)||rows.some(row=>!Number.isFinite(Number(row.rank))||!Number.isFinite(Number(row.level))||!Number.isFinite(Number(row.total_points))||typeof row.full_name!=="string"))throw new Error("Unexpected leaderboard response");
  if(request!==leaderboardRequest||!$("#leaderboard-results"))return;
  if(!rows.length){target.innerHTML=empty("leaderboard","لا يوجد ترتيب بعد","ستظهر النتائج بعد تسجيل نقاط الطلاب في arena_points.");return}
  target.innerHTML=`<div class="leaderboard-list">${rows.map(row=>{
   const rank=Number(row.rank),initial=escapeHTML(row.full_name.trim().charAt(0)||"ط");
   const grade=[row.grade_name,row.grade_stage].filter(Boolean).map(escapeHTML).join(" · ")||"الصف غير محدد";
   return`<article class="card leaderboard-entry ${rank===1?"leaderboard-first":""}"><div class="leaderboard-rank"><span class="ms" aria-hidden="true">${rank===1?"emoji_events":"military_tech"}</span><b>#${rank}</b></div><div class="leaderboard-avatar" aria-hidden="true">${initial}</div><div class="leaderboard-student"><b>${escapeHTML(row.full_name)}</b><span class="mu">${grade}</span></div><div class="leaderboard-stats"><span><b>${new Intl.NumberFormat("ar-EG").format(Number(row.total_points))}</b><small>نقطة</small></span><span><b>${new Intl.NumberFormat("ar-EG").format(Number(row.level))}</b><small>المستوى</small></span></div></article>`;
  }).join("")}</div>`;
 }catch(error){
  if(request!==leaderboardRequest||!$("#leaderboard-results"))return;
  console.error("Could not load the Supabase leaderboard:",error);
  const missingView=error.code==="PGRST205";
  const message=missingView
   ?"شغّل ملف supabase/arena_leaderboard.sql من مجلد المشروع في Supabase → SQL Editor، ثم أعد المحاولة. لو شغّلت الملف بالفعل، نفّذ: NOTIFY pgrst, 'reload schema';"
   :"تحقق من إعداد Supabase وصلاحيات قراءة لوحة المتصدرين، ثم أعد المحاولة.";
  target.innerHTML=`${empty(missingView?"database":"cloud_off",missingView?"إعداد لوحة المتصدرين غير مكتمل":"تعذّر تحميل المتصدرين",message)}<p style="text-align:center"><button class="btn alt" onclick="loadLeaderboard()">إعادة المحاولة</button></p>`;
 }
}
function route(){
 const p=(location.hash.slice(1)||"/").split("?")[0];
 if(p==="/login"&&session){location.hash="#/profile";return}
 const pg=P[p]||(()=>`<div class="wrap"><section>${empty("explore_off","الصفحة غير موجودة",'<a class="btn" href="#/">الرئيسية</a>')}</section></div>`);
 const nav=NAV.filter(n=>session||n[0]!=="/profile").concat(session?[]:[["/login","تسجيل الدخول","login"]]);
 $("#tn").innerHTML=nav.filter(n=>n[0]!=="/profile").map(n=>`<a href="#${n[0]}" class="${n[0]===p?"on":""}" ${n[0]===p?'aria-current="page"':""}>${n[1]}</a>`).join("");
 $("#bn").innerHTML=nav.map(n=>`<a href="#${n[0]}" class="${n[0]===p?"on":""}">${ms(n[2])}<span>${n[1]}</span></a>`).join("");
 renderAccountLink();
 try{$("#m").innerHTML=pg()}catch(e){$("#m").innerHTML=`<div class="wrap"><section>${empty("error","حدث خطأ","تعذّر عرض الصفحة.")}</section></div>`}
 if(p==="/leaderboard")loadLeaderboard();
 if(p==="/login")bindAuthPage();
 if(p==="/profile")loadMyProfile();
}
addEventListener("hashchange",()=>{route();window.scrollTo(0,0);$("#m").focus({preventScroll:true})});
async function initialize(){await finishGoogleSignIn();route()}
initialize();
