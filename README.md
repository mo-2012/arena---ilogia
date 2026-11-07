# ilogia Arena

واجهة عربية ثابتة تُنشر على GitHub Pages. الامتحانات وتسجيل الدرجات والنقاط تتم على [exams.ilogia-eg.com](https://exams.ilogia-eg.com/)؛ هذا الموقع يعرض حساب الطالب ولوحة المتصدرين من Supabase فقط.

## إعداد لوحة المتصدرين

1. افتح Supabase → SQL Editor، وشغّل [supabase/arena_leaderboard.sql](./supabase/arena_leaderboard.sql). ينشئ هذا View للقراءة العامة يعرض الاسم العام والصف ونقاط Arena والمستوى فقط؛ ولا يفتح قراءة جدول `profiles` أو البريد الإلكتروني للزوار.
2. تأكد أن `public_profiles` يحتوي فقط على أسماء وصور مسموح بعرضها علنًا. يُستبعد غير النشطين والمعلمون والمشرفون.
3. راجع `assets/config.js`: يحتوي على رابط المشروع ومفتاح `anon`/publishable العام. هذا المفتاح مصمم للاستخدام في المتصفح؛ لا تضع `service_role` أو أي مفتاح سري في ملفات الموقع.
4. انشر الملفات على GitHub Pages. صفحة «المتصدّرون» تعرض أفضل ١٠٠ طالب، بترتيب النقاط ثم المستوى، وتستخدم الترتيب الكلي.

تحتاج قراءة الـ View إلى سماح سياسات قاعدة البيانات كما يحدده ملف SQL. لوحة المتصدرين للعرض فقط ولا تكتب درجات أو نقاطًا. تُسجّل الدرجات والنقاط من منصة الامتحانات فقط.

إذا ظهر خطأ `PGRST205`، شغّل ملف SQL أعلاه في المشروع نفسه، وتأكد أن نتيجته `Success`. إذا كان الـView موجودًا بالفعل، نفّذ `NOTIFY pgrst, 'reload schema';` من SQL Editor لتحديث مخطط REST API، ثم أعد تحميل صفحة المتصدرين.

## تسجيل الدخول وحساب الطالب

- شغّل [supabase/arena_student_onboarding.sql](./supabase/arena_student_onboarding.sql) في SQL Editor. الدالة تنشئ أو تكمل ملف الطالب للمستخدم المسجّل فقط، وتسمح له باختيار صفه؛ ولا تسمح بتغيير أعلام المعلم أو المشرف.
- في Supabase → Authentication → Sign In / Providers، فعّل Google واحتفظ بـ **Google Client Secret داخل لوحة Supabase فقط**؛ لا تضفه إلى `assets/config.js` أو ملفات الموقع.
- في Google Cloud OAuth Client، أضف Authorized redirect URI التالي: `https://zugwicbbfbefbbwugfxq.supabase.co/auth/v1/callback`.
- في Supabase → Authentication → URL Configuration، اضبط **Site URL** على `https://arena.ilogia-eg.com/` وأضف `https://arena.ilogia-eg.com/` إلى **Redirect URLs**. لا تجعل `ilogia-eg.com` هو عنوان الرجوع الخاص بـArena؛ Supabase يرجع إليه إذا لم يكن عنوان Arena مسموحًا. وللتطوير المحلي أضف عنوان localhost الفعلي المستخدم.
- زر Google يطلب الرجوع مباشرة إلى `https://arena.ilogia-eg.com/`، ثم يكمل الموقع تبادل الرمز ويعرض ملف الطالب داخل Arena. لن يرجع إلى `ilogia-eg.com` الرئيسي. يلزم نشر التعديل وضبط عناوين Supabase أعلاه حتى يصبح هذا السلوك فعالًا.
- سجّل الطالب من زر Google داخل ilogia Arena. Supabase يعيد المستخدم الموجود عند تطابق حساب Google الموثّق مع الهوية المرتبطة؛ المستخدم الجديد يُنشأ في Supabase Auth. إذا لم يكن لديه ملف طالب، تظهر له قائمة الصفوف، وبعد اختياره يُنشأ ملفه الأساسي بنفس UUID في `profiles`.
- البريد وكلمة المرور يظلان متاحين كخيار إضافي. بعد تسجيل الدخول يقرأ الموقع ملف الطالب ونقاطه من Supabase؛ لا يرسل الطالب إلى الموقع الرئيسي لتسجيل الدخول.
- زر «تسجيل الخروج» ينهي جلسة Supabase. الجلسة محفوظة في المتصفح لتبقى بعد تحديث الصفحة.

## الامتحانات والدرجات

لا توجد تحديات أو امتحانات داخل هذا الموقع، ولا يحتسب نقاطًا من التصفح أو من جهاز الطالب. وجّهنا الطلاب إلى [منصة الامتحانات](https://exams.ilogia-eg.com/)؛ الدرجات والنقاط التي يضيفها نظام الامتحانات إلى قاعدة البيانات هي المعتمدة في لوحة المتصدرين.

## النشر

1. ارفع محتوى المجلد إلى مستودع `mo-2012/arena---ilogia` (الفرع `main`).
2. Settings → Pages → Deploy from branch → `main` / root.
3. أضف سجل CNAME للنطاق `arena.ilogia-eg.com` يشير إلى `mo-2012.github.io`.
