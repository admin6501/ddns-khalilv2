<div align="center">

<br>

```
 ██████╗ ██████╗ ███╗   ██╗███████╗    ██████╗ ███╗   ██╗███████╗
██╔════╝██╔═══██╗████╗  ██║██╔════╝    ██╔══██╗████╗  ██║██╔════╝
██║     ██║   ██║██╔██╗ ██║█████╗      ██║  ██║██╔██╗ ██║███████╗
██║     ██║   ██║██║╚██╗██║██╔══╝      ██║  ██║██║╚██╗██║╚════██║
╚██████╗╚██████╔╝██║ ╚████║██║         ██████╔╝██║ ╚████║███████║
 ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝         ╚═════╝ ╚═╝  ╚═══╝╚══════╝
```

<br>

# پلتفرم مدیریت DNS رایگان

**ساب‌دامین رایگان برای همه — یک‌بار نصب کن، روی دامنه خودت اجرا کن**

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://www.cloudflare.com/)
[![Nginx](https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white)](https://nginx.org/)
[![Let's Encrypt](https://img.shields.io/badge/Let's_Encrypt-003A70?style=for-the-badge&logo=letsencrypt&logoColor=white)](https://letsencrypt.org/)

<br>

[نصب سریع](#-نصب-سریع) •
[قابلیت‌ها](#-قابلیتها) •
[پیکربندی](#%EF%B8%8F-پیکربندی) •
[API](#-مستندات-api) •
[English](README.md)

<br>

</div>

---

<br>

## 🌐 درباره پروژه

یک پلتفرم **مدیریت DNS متن‌باز** که با دامنه دلخواه شما کار می‌کنه. کاربران می‌تونن رکوردهای **A**، **AAAA**، **CNAME** و **NS** رو به صورت رایگان ایجاد کنن. رکوردها مستقیم از طریق **Cloudflare API** روی DNS واقعی اعمال میشن.

> **مثال:** اگه دامنه شما `example.com` باشه، کاربران می‌تونن ساب‌دامین‌هایی مثل `mysite.example.com` بسازن.

<br>

## ✨ قابلیت‌ها

<table>
<tr>
<td width="50%">

### 👤 کاربران
- ثبت‌نام و ورود با ایمیل و رمز عبور
- **ورود با گوگل** (OAuth) — ورود یک‌کلیکی
- **بازیابی رمز عبور** با کد ۶ رقمی ایمیلی (نیازمند SMTP)
- تایید ایمیل با کد ۶ رقمی (اختیاری، قابل تنظیم توسط ادمین)
- ساخت رکوردهای A، AAAA، CNAME، NS
- رکوردهای رایگان برای هر کاربر (طبق پلن Free قابل تنظیم)
- ویرایش و حذف رکوردها
- **خروجی/ورودی دسته‌ای (CSV)** برای رکوردهای شخصی
- سیستم دعوت دوستان (Referral)
- دریافت رکورد اضافی به ازای هر دعوت

</td>
<td width="50%">

### 🛡 پنل مدیریت
- مدیریت کامل کاربران (حذف / تغییر پلن / تغییر رمز)
- مشاهده و مدیریت تمام رکوردهای DNS
- **خروجی CSV** از تمام رکوردهای کل کاربران
- **ورود CSV** برای ساخت رکوردها به نام کاربران (با اعمال محدودیت هر کاربر و وضعیت زون)
- مدیریت پلن‌ها (ایجاد / ویرایش / حذف)
- **پشتیبانی از چندین زون Cloudflare** با قابلیت فعال/غیرفعال کردن هر زون
- **پیکربندی Google OAuth** مستقیم از پنل ادمین
- **کلید فعال/غیرفعال کردن فرم ثبت‌نام ایمیلی** — می‌تونی ثبت‌نام ایمیلی رو ببندی و فقط گوگل بذاری
- تنظیمات سایت (تماس تلگرام، جایزه رفرال، تایید ایمیل)
- مدیریت SMTP برای تایید ایمیل و بازیابی رمز عبور
- مدیریت توکن Cloudflare و تست زنده
- عملیات دسته‌ای (Bulk Actions)
- لاگ فعالیت‌ها با فیلتر
- بک‌آپ خودکار MongoDB

</td>
</tr>
<tr>
<td width="50%">

### 🤖 ربات تلگرام
- مدیریت کامل DNS از طریق تلگرام
- ثبت‌نام و ورود کاربران
- ایجاد، ویرایش و حذف رکوردها
- **انتخاب زون چندگانه** هنگام افزودن رکورد (زون‌های غیرفعال خودکار فیلتر می‌شوند)
- مشاهده لیست رکوردها و اطلاعات اکانت
- اطلاع‌رسانی ثبت‌نام جدید به ادمین
- قابل پیکربندی از پنل وب (توکن، آیدی ادمین، شروع/توقف)
- پشتیبانی دوزبانه (فارسی/انگلیسی)

</td>
<td width="50%">

### 🎨 طراحی و فنی
- **طراحی ترمینال مدرن** با رنگ emerald روشن
- **دوزبانه**: فارسی (راست‌به‌چپ واقعی) و انگلیسی
- تم تاریک و روشن (پیش‌فرض روشن)
- طراحی ریسپانسیو با Shadcn UI
- احراز هویت JWT + Google OAuth
- اتصال مستقیم به Cloudflare API
- دیتابیس MongoDB با بک‌آپ خودکار
- **نام دامنه کاملاً داینامیک** (برند = دامنه نصب؛ ارجاع زون = دامنه‌ی Cloudflare)
- منبع حقیقت یکتا برای محدودیت پلن (پلن Free تعداد رکورد رایگان رو تعیین می‌کنه)
- نصب خودکار با اسکریپت Bash
- SSL رایگان با Let's Encrypt
- دستور `ddns-menu` برای دسترسی سریع به منوی مدیریت

</td>
</tr>
</table>

<br>

## 🏗 معماری

```
                    ┌─────────────────────────────────────────┐
                    │              Nginx (443/80)              │
                    │         SSL + Reverse Proxy              │
                    └──────────┬───────────────┬──────────────┘
                               │               │
                    ┌──────────▼──────┐ ┌──────▼──────────────┐
                    │   React SPA     │ │   FastAPI Backend    │
                    │   (Build)       │ │   Port 8001          │
                    │                 │ │                      │
                    │  • Landing Page │ │  • /api/auth/*       │
                    │  • Dashboard    │ │  • /api/dns/*        │
                    │  • Admin Panel  │ │  • /api/admin/*      │
                    │  • Auth Pages   │ │  • /api/referral/*   │
                    │  • i18n (FA/EN) │ │  • /api/plans        │
                    └─────────────────┘ │  • /api/telegram/*   │
                                        └───────┬──────┬───────┘
                                                │      │
                                     ┌──────────▼──┐ ┌─▼────────────┐
                                     │  MongoDB    │ │  Cloudflare  │
                                     │  Database   │ │  DNS API     │
                                     └─────────────┘ └──────────────┘
```

<br>

## 🚀 نصب سریع

### پیش‌نیازها

| نرم‌افزار | نسخه | توضیحات |
|-----------|-------|---------|
| Ubuntu / Debian | 20.04+ / 11+ | سیستم‌عامل |
| دسترسی Root | — | برای نصب سرویس‌ها |
| دامنه | — | باید به IP سرور اشاره کنه |
| Cloudflare | — | API Token + Zone ID |

### نصب یک‌مرحله‌ای

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/admin6501/ddns-khalilv2/main/install.sh)
```

یا:

```bash
git clone https://github.com/admin6501/ddns-khalilv2.git
cd ddns-khalilv2
sudo bash install.sh
```

اسکریپت نصب از شما این اطلاعات رو میپرسه:

| سؤال | مثال | توضیحات |
|------|------|---------|
| نام دامنه | `yourdomain.com` | دامنه‌ای که می‌خواید ساب‌دامین روش بسازید |
| ایمیل SSL | `you@email.com` | برای Let's Encrypt |
| Cloudflare API Token | — | [ساخت توکن](https://dash.cloudflare.com/profile/api-tokens) (دسترسی Edit DNS) |
| Cloudflare Zone ID | — | از داشبورد Overview دامنه |
| ایمیل ادمین | `admin@yourdomain.com` | برای ورود به پنل مدیریت |
| رمز ادمین | — | حداقل ۶ کاراکتر |
| آدرس MongoDB | `mongodb://localhost:27017` | پیش‌فرض: لوکال |
| نام دیتابیس | `dns_management` | دلخواه |

### منوی مدیریت

بعد از نصب، هر وقت خواستید منوی مدیریت رو باز کنید:

```bash
sudo ddns-menu
```

```
  1 )  Install          نصب کامل از صفر
  2 )  Start            استارت همه سرویس‌ها
  3 )  Stop             استاپ همه سرویس‌ها
  4 )  Restart          ری‌استارت
  5 )  Uninstall        حذف کامل (سرویس + دیتابیس + SSL + فایل‌ها)
  6 )  Status           وضعیت سرویس‌ها + مصرف RAM + تاریخ SSL
  7 )  Logs             مشاهده لاگ‌های بک‌اند
  8 )  Update           آپدیت از GitHub + بازسازی
  9 )  SSL Renew        تمدید گواهی SSL
  t )  Telegram Bot     تنظیم ربات تلگرام
  d )  Change Domain    تغییر دامنه
  e )  Export           بکاپ برای انتقال سرور
  i )  Import           بازیابی از بکاپ
```

همچنین میتونید مستقیم از CLI هم استفاده کنید:

```bash
sudo bash install.sh start
sudo bash install.sh stop
sudo bash install.sh restart
sudo bash install.sh update
sudo bash install.sh status
sudo bash install.sh export
sudo bash install.sh import
```

<br>

## 🔄 انتقال سرور (Migration)

برای انتقال سایت از یک سرور به سرور دیگه **بدون از دست رفتن دیتا**:

**۱. در سرور قدیم — بکاپ بگیرید:**

```bash
sudo bash install.sh export
```

این دستور یک فایل بکاپ شامل موارد زیر میسازه:
- دیتابیس MongoDB (کاربران، رکوردها، پلن‌ها، تنظیمات)
- فایل‌های پیکربندی (`.env` بک‌اند و فرانت‌اند)
- متادیتا (دامنه، تاریخ، سیستم‌عامل)

**۲. فایل بکاپ رو به سرور جدید منتقل کنید:**

```bash
scp ~/ddns-backup-*.tar.gz root@NEW_SERVER_IP:~/
```

**۳. در سرور جدید — نصب کنید:**

```bash
sudo bash install.sh
# گزینه 1 (Install) رو انتخاب کنید
# اطلاعات دامنه و Cloudflare رو وارد کنید
```

**۴. در سرور جدید — بکاپ رو بازیابی کنید:**

```bash
sudo bash install.sh import
# مسیر فایل بکاپ رو وارد کنید
```

هنگام Import می‌تونید انتخاب کنید:
- **دیتابیس + کانفیگ** — بازیابی کامل (پیشنهادی)
- **فقط دیتابیس** — کانفیگ فعلی حفظ بشه
- **فقط کانفیگ** — دیتابیس فعلی حفظ بشه

> **نکته:** DNS دامنه رو به IP سرور جدید تغییر بدید و SSL رو تمدید کنید (`sudo ddns-menu` → گزینه 9)

<br>

## ⚙️ پیکربندی

### نام دامنه داینامیک

نام دامنه **هاردکد نیست** و از متغیرهای محیطی خوانده میشه. وقتی پروژه رو با `install.sh` نصب کنید، دامنه‌ای که وارد می‌کنید به صورت خودکار در تمام بخش‌های سایت نمایش داده میشه:

| متغیر | فایل | توضیحات |
|--------|------|---------|
| `DOMAIN_NAME` | `backend/.env` | نام دامنه در بک‌اند |
| `REACT_APP_DOMAIN_NAME` | `frontend/.env` | نام دامنه در فرانت‌اند |

### فایل‌های محیطی

<details>
<summary><b>backend/.env</b></summary>

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=dns_management
CLOUDFLARE_API_TOKEN=your_token_here
CLOUDFLARE_ZONE_ID=your_zone_id_here
JWT_SECRET=auto_generated_on_install
DOMAIN_NAME=yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=your_password
TELEGRAM_BOT_TOKEN=your_bot_token (اختیاری)
TELEGRAM_ADMIN_ID=your_telegram_id (اختیاری)
SMTP_EMAIL=your_gmail@gmail.com (اختیاری)
SMTP_PASSWORD=your_app_password (اختیاری)
```
</details>

<details>
<summary><b>frontend/.env</b></summary>

```env
REACT_APP_BACKEND_URL=https://yourdomain.com
REACT_APP_DOMAIN_NAME=yourdomain.com
```
</details>

<br>

## 🔐 راه‌اندازی Google OAuth (اختیاری)

این پلتفرم از **ورود با گوگل** برای ثبت‌نام و ورود یک‌کلیکی پشتیبانی می‌کنه. برای فعال‌سازی، نیاز به **Google OAuth Client ID و Client Secret** از Google Cloud Console داری.

### مرحله ۱ — ساخت پروژه Google Cloud

1. به [console.cloud.google.com](https://console.cloud.google.com/) برو
2. روی **Select a project** → **New Project** کلیک کن
3. یک نام بذار (مثلاً `dns-management`) و **Create** رو بزن

### مرحله ۲ — پیکربندی OAuth Consent Screen

1. از منوی سمت چپ برو به **APIs & Services** → **OAuth consent screen**
2. گزینه‌ی **External** رو انتخاب کن → **Create**
3. این فیلدها رو پر کن:
   - **App name**: اسم سایتت (مثلاً `yourdomain.com`)
   - **User support email**: ایمیل خودت
   - **Developer contact email**: ایمیل خودت
4. Scopeهای **email** و **profile** رو اضافه کن (معمولاً از قبل انتخاب شده‌ن)
5. تا انتها Save & Continue بزن

### مرحله ۳ — ساخت OAuth Credentials

1. برو به **APIs & Services** → **Credentials**
2. روی **+ Create Credentials** → **OAuth client ID** کلیک کن
3. نوع اپلیکیشن: **Web application**
4. **Authorized JavaScript origins** (مبدا مجاز):
   ```
   https://yourdomain.com
   ```
5. **Authorized redirect URIs** (آدرس‌های بازگشت مجاز):
   ```
   https://yourdomain.com
   https://yourdomain.com/login
   https://yourdomain.com/register
   ```
6. دکمه‌ی **Create** رو بزن

گوگل **Client ID** و **Client Secret** رو بهت نشون می‌ده. هر دو رو کپی کن.

### مرحله ۴ — اضافه کردن کلیدها به پنل ادمین

1. به‌عنوان ادمین وارد سایتت شو
2. برو به **پنل مدیریت** → تب **تنظیمات** → کارت **Google OAuth**
3. **Client ID** و **Client Secret** رو پیست کن
4. **Enabled** رو روشن کن و ذخیره بزن

دکمه‌ی «ورود با گوگل» به‌صورت خودکار توی صفحات ورود و ثبت‌نام ظاهر می‌شه.

> **نکته:** برای تست روی لوکال از `http://localhost:3000` به‌جای URL پروداکشن توی هر دو قسمت origins و redirect URIs استفاده کن.

<br>

## 📧 راه‌اندازی SMTP (اختیاری)

SMTP برای قابلیت **بازیابی رمز عبور** و **تایید ایمیل** (اختیاری) لازمه.

1. برو به **پنل مدیریت** → **تنظیمات** → **پیکربندی SMTP**
2. برای Gmail:
   - **SMTP Email**: `you@gmail.com`
   - **SMTP Password**: یک [Gmail App Password](https://myaccount.google.com/apppasswords) (نه رمز عادی جیمیل)
3. ذخیره و تست بزن

بدون SMTP، صفحه‌ی بازیابی رمز به کاربر پیام «بازیابی غیرفعال است» نشون می‌ده.

<br>

## 📡 مستندات API

تمام مسیرهای API با پیشوند `/api` شروع میشن.

### احراز هویت

| متد | مسیر | توضیحات | احراز هویت |
|-----|-------|---------|------------|
| `POST` | `/api/auth/register` | ثبت‌نام (با کد رفرال اختیاری) | — |
| `POST` | `/api/auth/login` | ورود | — |
| `GET` | `/api/auth/me` | اطلاعات کاربر فعلی | Bearer Token |
| `POST` | `/api/auth/verify-email` | تایید ایمیل با کد | — |
| `POST` | `/api/auth/resend-code` | ارسال مجدد کد تایید | — |
| `GET` | `/api/auth/verification-status` | وضعیت فعال بودن تایید ایمیل | — |
| `GET` | `/api/auth/signup-status` | وضعیت فعال بودن فرم ثبت‌نام ایمیلی | — |
| `GET` | `/api/auth/password-reset-status` | در دسترس بودن بازیابی رمز (وابسته به SMTP) | — |
| `POST` | `/api/auth/forgot-password` | درخواست کد ۶ رقمی بازیابی رمز | — |
| `POST` | `/api/auth/reset-password` | تنظیم رمز جدید با استفاده از کد بازیابی | — |
| `GET` | `/api/auth/google/config` | پیکربندی عمومی Google OAuth (client_id) | — |
| `POST` | `/api/auth/google` | تبدیل توکن گوگل به نشست کاربر | — |
| `POST` | `/api/auth/set-initial-password` | تنظیم رمز اولیه برای کاربران ثبت‌نام‌شده از گوگل | Bearer Token |

### رکوردهای DNS

| متد | مسیر | توضیحات | احراز هویت |
|-----|-------|---------|------------|
| `GET` | `/api/dns/records` | لیست رکوردهای کاربر | Bearer Token |
| `POST` | `/api/dns/records` | ایجاد رکورد جدید | Bearer Token |
| `PUT` | `/api/dns/records/{id}` | ویرایش رکورد | Bearer Token |
| `DELETE` | `/api/dns/records/{id}` | حذف رکورد | Bearer Token |
| `GET` | `/api/dns/zones` | لیست زون‌های فعال قابل انتخاب | Bearer Token |
| `GET` | `/api/dns/records/export` | خروجی CSV از رکوردهای کاربر | Bearer Token |
| `POST` | `/api/dns/records/import` | ورود دسته‌ای رکوردها از CSV | Bearer Token |
| `GET` | `/api/dns/records/import/template` | دانلود قالب نمونه CSV | Bearer Token |

### رفرال

| متد | مسیر | توضیحات | احراز هویت |
|-----|-------|---------|------------|
| `GET` | `/api/referral/stats` | آمار دعوت‌ها | Bearer Token |

### پلن‌ها و تنظیمات عمومی

| متد | مسیر | توضیحات | احراز هویت |
|-----|-------|---------|------------|
| `GET` | `/api/plans` | لیست پلن‌ها | — |
| `GET` | `/api/config` | تنظیمات سایت (دامنه، تماس) | — |
| `GET` | `/api/settings/contact` | اطلاعات تماس تلگرام | — |

### پنل ادمین

<details>
<summary><b>مدیریت کاربران</b></summary>

| متد | مسیر | توضیحات |
|-----|-------|---------|
| `GET` | `/api/admin/users` | لیست همه کاربران |
| `DELETE` | `/api/admin/users/{id}` | حذف کاربر |
| `PUT` | `/api/admin/users/{id}/plan` | تغییر پلن کاربر |
| `PUT` | `/api/admin/users/{id}/password` | تغییر رمز عبور کاربر |
| `GET` | `/api/admin/users/{id}/records` | رکوردهای یک کاربر |
| `POST` | `/api/admin/users/bulk/plan` | تغییر پلن دسته‌ای |
| `POST` | `/api/admin/users/bulk/delete` | حذف دسته‌ای |

</details>

<details>
<summary><b>مدیریت رکوردها</b></summary>

| متد | مسیر | توضیحات |
|-----|-------|---------|
| `GET` | `/api/admin/records` | لیست تمام رکوردها |
| `GET` | `/api/admin/records/export` | خروجی CSV از تمام رکوردها (با ستون user_email) |
| `GET` | `/api/admin/records/import/template` | دانلود قالب نمونه CSV ادمین |
| `POST` | `/api/admin/records/import` | ورود دسته‌ای رکوردها به نام کاربران (CSV با ستون user_email) |
| `POST` | `/api/admin/dns/records` | ایجاد رکورد برای کاربر |
| `DELETE` | `/api/admin/dns/records/{id}` | حذف هر رکورد |

</details>

<details>
<summary><b>مدیریت زون‌های Cloudflare</b></summary>

| متد | مسیر | توضیحات |
|-----|-------|---------|
| `GET` | `/api/admin/zones` | لیست همه زون‌ها (اصلی + اضافی) با وضعیت فعال/غیرفعال |
| `POST` | `/api/admin/zones` | افزودن زون اضافی Cloudflare (با اعتبارسنجی Cloudflare) |
| `PATCH` | `/api/admin/zones/{zone_id}` | فعال/غیرفعال کردن زون (شامل زون اصلی) |
| `DELETE` | `/api/admin/zones/{zone_id}` | حذف یک زون اضافی |

> زون‌های غیرفعال از انتخاب‌کننده‌های ساخت رکورد (وب + تلگرام) مخفی می‌شوند و ایجاد رکورد جدید روی آن‌ها رد می‌شود.

</details>

<details>
<summary><b>کنترل ربات تلگرام</b></summary>

| متد | مسیر | توضیحات |
|-----|-------|---------|
| `GET` | `/api/admin/bot/status` | وضعیت ربات (توکن mask شده، در حال اجرا، نام کاربری) |
| `PUT` | `/api/admin/bot/token` | به‌روزرسانی توکن ربات (راه‌اندازی مجدد خودکار) |
| `PUT` | `/api/admin/bot/admin-id` | تنظیم آیدی چت ادمین |
| `POST` | `/api/admin/bot/start` | شروع (یا ری‌استارت) ربات |
| `POST` | `/api/admin/bot/stop` | توقف ربات |

</details>

<details>
<summary><b>SMTP و توکن Cloudflare</b></summary>

| متد | مسیر | توضیحات |
|-----|-------|---------|
| `GET` | `/api/admin/smtp/status` | وضعیت SMTP و تایید ایمیل |
| `PUT` | `/api/admin/smtp/config` | به‌روزرسانی credentials SMTP |
| `PUT` | `/api/admin/smtp/toggle-verification` | فعال/غیرفعال کردن تایید ایمیل |
| `GET` | `/api/admin/cf-token` | اطلاعات توکن Cloudflare (mask شده) |
| `PUT` | `/api/admin/cf-token` | به‌روزرسانی توکن اصلی Cloudflare |
| `POST` | `/api/admin/cf-token/test` | تست زنده توکن Cloudflare |

</details>

<details>
<summary><b>Google OAuth و کنترل احراز هویت</b></summary>

| متد | مسیر | توضیحات |
|-----|-------|---------|
| `GET` | `/api/admin/google-oauth` | دریافت پیکربندی Google OAuth (client_id) |
| `PUT` | `/api/admin/google-oauth` | به‌روزرسانی Client ID / Client Secret / وضعیت فعال |
| `GET` | `/api/admin/auth/signup-status` | وضعیت فعال بودن فرم ثبت‌نام ایمیلی |
| `PUT` | `/api/admin/auth/toggle-email-signup` | فعال/غیرفعال کردن ثبت‌نام ایمیلی در کل سایت |

</details>

<details>
<summary><b>بک‌آپ</b></summary>

| متد | مسیر | توضیحات |
|-----|-------|---------|
| `GET` | `/api/admin/backup/settings` | دریافت زمان‌بندی بک‌آپ |
| `PUT` | `/api/admin/backup/settings` | به‌روزرسانی زمان‌بندی بک‌آپ |
| `POST` | `/api/admin/backup/run` | اجرای فوری بک‌آپ |

</details>

<details>
<summary><b>مدیریت پلن‌ها</b></summary>

| متد | مسیر | توضیحات |
|-----|-------|---------|
| `GET` | `/api/admin/plans` | لیست پلن‌ها |
| `POST` | `/api/admin/plans` | ایجاد پلن جدید |
| `PUT` | `/api/admin/plans/{plan_id}` | ویرایش پلن |
| `DELETE` | `/api/admin/plans/{plan_id}` | حذف پلن |

</details>

<details>
<summary><b>تنظیمات سایت</b></summary>

| متد | مسیر | توضیحات |
|-----|-------|---------|
| `GET` | `/api/admin/settings` | دریافت تنظیمات |
| `PUT` | `/api/admin/settings` | بروزرسانی تنظیمات |

</details>

<br>

## 📁 ساختار پروژه

```
├── install.sh                    # اسکریپت نصب و مدیریت
├── README.md                     # مستندات انگلیسی
├── README.fa.md                  # مستندات فارسی
│
├── backend/
│   ├── server.py                 # سرور FastAPI (تمام API ها + ربات تلگرام)
│   ├── requirements.txt          # وابستگی‌های Python
│   └── .env                      # متغیرهای محیطی
│
└── frontend/
    ├── package.json
    ├── tailwind.config.js
    ├── public/
    │   └── index.html
    └── src/
        ├── App.js                # مسیریابی اصلی
        ├── index.css             # استایل‌ها و تم‌ها
        ├── config/
        │   └── site.js           # پیکربندی دامنه (داینامیک از env var)
        ├── lib/
        │   ├── api.js            # کلاینت API
        │   └── i18n.js           # ترجمه‌ها (فارسی/انگلیسی)
        ├── contexts/
        │   ├── AuthContext.js     # مدیریت احراز هویت
        │   ├── ConfigContext.js   # تنظیمات سایت
        │   ├── ThemeContext.js    # مدیریت تم (تاریک/روشن)
        │   └── LanguageContext.js # مدیریت زبان
        ├── pages/
        │   ├── Landing.js         # صفحه اصلی (طراحی ترمینال)
        │   ├── Login.js           # ورود + Google OAuth
        │   ├── Register.js        # ثبت‌نام + fallback گوگل
        │   ├── ForgotPassword.js  # wizard بازیابی رمز (با پشتیبانی SMTP)
        │   ├── Dashboard.js       # داشبورد کاربر
        │   └── Admin.js           # پنل مدیریت
        └── components/
            ├── Navbar.js              # نوار ناوبری
            ├── GoogleLoginButton.js   # دکمه ورود با گوگل
            ├── SecurePasswordInit.js  # تنظیم رمز اولیه برای کاربران گوگل
            └── ui/                    # کامپوننت‌های Shadcn
```

<br>

## 🎯 سیستم پلن‌ها

پلن‌ها از پنل ادمین قابل مدیریت هستن (ایجاد / ویرایش / حذف):

| پلن | رکوردها | قیمت | توضیحات |
|-----|---------|------|---------|
| رایگان | ۲ | $0 | پیش‌فرض برای همه |
| حرفه‌ای | ۵۰ | $5/ماه | دکمه تماس تلگرام |
| سازمانی | ۵۰۰ | $20/ماه | دکمه تماس تلگرام |

> دکمه‌های پلن‌های پولی به پروفایل تلگرام ادمین لینک میشن. آیدی تلگرام از پنل ادمین قابل تنظیمه.

<br>

## 🤝 سیستم رفرال (دعوت دوستان)

```
                 لینک دعوت
  کاربر A  ─────────────────►  کاربر B ثبت‌نام میکنه
     │                                │
     │◄─────── +N رکورد جایزه ────────┘
     │
  تعداد N از پنل ادمین قابل تنظیمه
```

- هر کاربر یک **کد دعوت یکتا** داره
- لینک دعوت: `https://yourdomain.com/register?ref=CODE`
- به ازای هر دعوت موفق، **N رکورد اضافی** به دعوت‌کننده داده میشه
- مقدار N از بخش **تنظیمات پنل ادمین** قابل تغییره

<br>

## 🛠 توسعه محلی

### بک‌اند

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# متغیرهای محیطی .env رو تنظیم کنید
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### فرانت‌اند

```bash
cd frontend
# متغیرهای محیطی .env رو تنظیم کنید
yarn install
yarn start
```

<br>

## 🔧 عیب‌یابی

<details>
<summary><b>بک‌اند استارت نمیشه</b></summary>

```bash
# بررسی لاگ‌ها
journalctl -u ddns-backend -f

# بررسی MongoDB
systemctl status mongod

# بررسی .env
cat /path/to/install/backend/.env
```
</details>

<details>
<summary><b>مسیر /admin باز نمیشه (ریدایرکت به صفحه اصلی)</b></summary>

سرویس‌ها رو ری‌استارت کنید:
```bash
sudo ddns-menu
# گزینه 4 (Restart) رو انتخاب کنید
```

علت: بعد از نصب SSL توسط Certbot، تنظیمات `try_files` در Nginx ممکنه خراب بشه.
</details>

<details>
<summary><b>SSL نصب نمیشه</b></summary>

۱. مطمئن بشید دامنه به IP سرور اشاره میکنه:
```bash
dig +short yourdomain.com
```

۲. دستی تست کنید:
```bash
sudo certbot --nginx -d yourdomain.com --non-interactive --agree-tos -m your@email.com
```
</details>

<details>
<summary><b>رکورد DNS ایجاد نمیشه</b></summary>

- بررسی کنید API Token کلودفلر دسترسی **Edit DNS** داره
- Zone ID درست باشه
- نام ساب‌دامین تکراری نباشه
</details>

<br>

## 🔒 امنیت

- رمزهای عبور با **bcrypt** هش میشن
- احراز هویت با **JWT** (انقضا: ۷۲ ساعت)
- پنل ادمین فقط با نقش `admin` قابل دسترسیه
- CORS محدود به دامنه سایت
- هدرهای امنیتی Nginx (X-Frame-Options, X-Content-Type-Options)
- SSL/TLS با Let's Encrypt
- تایید ایمیل اختیاری برای ثبت‌نام‌های جدید

<br>

## 📄 مجوز

این پروژه تحت مجوز [MIT](LICENSE) منتشر شده.

<br>

---

<div align="center">

اگه این پروژه بهتون کمک کرد، یه ستاره بزنید ⭐

</div>
