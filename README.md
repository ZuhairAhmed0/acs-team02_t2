# بنزيناك - محفظة الوقود الرقمية

تطبيق محفظة رقمية لمحطات الوقود في السودان، يتيح للمستخدمين شحن الرصيد، الدفع في المحطات، تحويل الأموال بين المحطات، وتتبع المعاملات.

## المميزات

- **المصادقة**: تسجيل الدخول وإنشاء الحساب باستخدام Supabase
- **شحن الرصيد**: إضافة أموال إلى المحفظة
- **الدفع**: دفع الوقود في المحطات المختارة
- **التحويل**: نقل الأموال بين محطات الوقود
- **سجل المعاملات**: عرض تاريخ كامل لجميع العمليات
- **دعم اللغة العربية**: واجهة مستخدم باللغة العربية مع دعم RTL

## التقنيات المستخدمة

- React 19
- Vite
- React Router
- Supabase (المصادقة وقاعدة البيانات)
- CSS (تصميم متجاوب)

## الإعداد

### المتطلبات

- Node.js (الإصدار 18 أو أحدث)
- حساب Supabase

### خطوات التثبيت

1. **استنساخ المشروع**

   ```bash
   cd benzinak
   ```

2. **تثبيت المكتبات**

   ```bash
   npm install
   ```

3. **إعداد Supabase**
   - أنشئ مشروعاً جديداً في [Supabase](https://supabase.com)
   - انتقل إلى Settings > API وانسخ:
     - Project URL
     - anon public key
   - افتح ملف `.env` وأضف:
     ```
     VITE_SUPABASE_URL=your_supabase_project_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

4. **إنشاء جداول قاعدة البيانات**
   - افتح لوحة تحكم Supabase
   - انتقل إلى SQL Editor
   - قم بتنفيذ الملف `supabase-schema.sql`
   - سيتم إنشاء الجداول التالية:
     - `users`: معلومات المستخدمين
     - `wallets`: محافظ المستخدمين
     - `stations`: محطات الوقود
     - `transactions`: سجل المعاملات

5. **إعداد سياسات الأمان (Row Level Security)**

   في Supabase SQL Editor، نفذ:

   ```sql
   -- Enable RLS
   ALTER TABLE users ENABLE ROW LEVEL SECURITY;
   ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
   ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

   -- Users policies
   CREATE POLICY "Users can view own data" ON users
     FOR SELECT USING (auth.uid() = user_id);

   CREATE POLICY "Users can insert own data" ON users
     FOR INSERT WITH CHECK (auth.uid() = user_id);

   -- Wallets policies
   CREATE POLICY "Users can view own wallet" ON wallets
     FOR SELECT USING (auth.uid() = user_id);

   CREATE POLICY "Users can update own wallet" ON wallets
     FOR UPDATE USING (auth.uid() = user_id);

   CREATE POLICY "Users can insert own wallet" ON wallets
     FOR INSERT WITH CHECK (auth.uid() = user_id);

   -- Transactions policies
   CREATE POLICY "Users can view own transactions" ON transactions
     FOR SELECT USING (auth.uid() = user_id);

   CREATE POLICY "Users can insert own transactions" ON transactions
     FOR INSERT WITH CHECK (auth.uid() = user_id);

   -- Stations policies (public read)
   CREATE POLICY "Anyone can view stations" ON stations
     FOR SELECT USING (true);
   ```

6. **تشغيل التطبيق**

   ```bash
   npm run dev
   ```

   سيفتح التطبيق في `http://localhost:5173`

## هيكل المشروع

```
benzinak/
├── src/
│   ├── components/
│   │   └── ProtectedRoute.jsx
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Signup.jsx
│   │   └── Dashboard.jsx
│   ├── App.jsx
│   ├── App.css
│   ├── main.jsx
│   └── supabaseClient.js
├── supabase-schema.sql
├── .env
└── package.json
```

## الاستخدام

1. **إنشاء حساب**: انتقل إلى صفحة التسجيل وأنشئ حساباً جديداً
2. **تسجيل الدخول**: أدخل البريد الإلكتروني وكلمة المرور
3. **شحن الرصيد**: اضغط على زر "شحن الرصيد" وأدخل المبلغ
4. **اختيار محطة**: اختر محطة الوقود من القائمة
5. **الدفع**: اضغط على "دفع الوقود" وأدخل المبلغ
6. **التحويل**: اضغط على "تحويل الرصيد" لتحويل الأموال بين المحطات
7. **سجل المعاملات**: عرض جميع العمليات في الأسفل

## التطوير

```bash
# تشغيل بيئة التطوير
npm run dev

# بناء للإنتاج
npm run build

# معاينة بناء الإنتاج
npm run preview
```

## الأمان

- يتم استخدام Supabase Auth للمصادقة الآمنة
- Row Level Security (RLS) لحماية البيانات
- جميع البيانات مشفرة أثناء النقل

## الدعم

للدعم والاستفسارات، يرجى فتح issue في المستودع.

## الترخيص

هذا المشروع مفتوح المصدر ومتاح للاستخدام الحر.
