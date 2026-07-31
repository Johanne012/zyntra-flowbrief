# أتمتة ZYNTRA — قوالب جاهزة

مستوحى من **awesome-n8n-templates** (280+ قالب) + atom + أنماط Prospex.

## سير العمل اليومية المقترحة (n8n أو يدوي)

### 1. تقرير صباحي يومي
- Trigger: كل يوم 9:00
- خطوات:
  1. قراءة بريد Gmail (طلبات جديدة)
  2. تلخيص في Notion
  3. إرسال ملخص قصير على الإيميل
- قالب مشابه: Gmail → Notion → Email في awesome-n8n-templates

### 2. متابعة العملاء المحتملين
- Trigger: lead جديد في Notion/CSV
- خطوات:
  1. توليد رسالة مخصصة (AI)
  2. إرسال واتساب/إيميل
  3. تحديث الحالة بعد 48 ساعة

### 3. نشر محتوى يومي
- Trigger: يومي
- خطوات:
  1. اختيار نص من SOCIAL.md / MARKETING.md
  2. نشر على X أو حفظ كمسودة
  3. تسجيل في سجل النشر

### 4. تأكيد الدفع
- Trigger: إيميل يحتوي TxID
- خطوات:
  1. استخراج TxID
  2. إنشاء مهمة في Linear/Notion
  3. الرد التلقائي: "تم استلام التأكيد، نبدأ خلال 24 ساعة"

## أدوات أتمتة موصى بها
| الأداة | الرابط | متى تستخدمها |
|--------|--------|---------------|
| n8n | https://github.com/enescingoz/awesome-n8n-templates | الأهم — ابدأ هنا |
| atom | https://github.com/rush86999/atom | وكلاء Gmail/Notion |
| nanobrowser | https://github.com/nanobrowser/nanobrowser | أتمتة متصفح |
| Grok Automations | مفعّل مسبقاً | تقرير يومي 9 ص |

## ما هو مفعّل حالياً في حسابك
- **ZYNTRA Daily Ops**: كل يوم 9:00 (توقيت الرياض) → إيميل بمنشورات جاهزة + قائمة مهام

## الخطوة التالية الموصى بها
1. ثبّت n8n (سحابي أو محلي)
2. استورد قالباً واحداً: Gmail → Notion
3. اربط بريد zyntrabusinesszyntraal@gmail.com
4. اختبر تدفق طلب جديد
