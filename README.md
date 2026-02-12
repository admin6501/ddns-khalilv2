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
[قابلیت‌ها](#-قابلیت‌ها) •
[پیکربندی](#%EF%B8%8F-پیکربندی) •
[API](#-مستندات-api) •
[مشارکت](#-مشارکت)

<br>

</div>

---

<br>

## 🌐 درباره پروژه

یک پلتفرم **مدیریت DNS متن‌باز** که با دامنه دلخواه شما کار می‌کنه. کاربران می‌تونن رکوردهای **A**، **AAAA** و **CNAME** رو به صورت رایگان ایجاد کنن. رکوردها مستقیم از طریق **Cloudflare API** روی DNS واقعی اعمال میشن.

> **مثال:** اگه دامنه شما `example.com` باشه، کاربران می‌تونن ساب‌دامین‌هایی مثل `mysite.example.com` بسازن.

<br>

## ✨ قابلیت‌ها

<table>
<tr>
<td width="50%">

### 👤 کاربران
- ثبت‌نام و ورود با ایمیل و رمز عبور
- ساخت رکوردهای A، AAAA، CNAME
- رکوردهای رایگان برای هر کاربر (قابل تنظیم)
- ویرایش و حذف رکوردها
- سیستم دعوت دوستان (Referral)
- دریافت رکورد اضافی به ازای هر دعوت

</td>
<td width="50%">

### 🛡 پنل مدیریت
- مدیریت کامل کاربران (حذف / تغییر پلن / تغییر رمز)
- مشاهده و مدیریت تمام رکوردهای DNS
- مدیریت پلن‌ها (ایجاد / ویرایش / حذف)
- تنظیم آیدی تلگرام برای تماس
- تنظیم جایزه رفرال
- عملیات دسته‌ای (Bulk Actions)

</td>
</tr>
<tr>
<td width="50%">

### 🎨 طراحی
- **دوزبانه**: فارسی (راست‌به‌چپ) و انگلیسی
- تم تاریک و روشن
- طراحی ریسپانسیو
- رابط کاربری مدرن با Shadcn UI

</td>
<td width="50%">

### ⚙️ فنی
- احراز هویت JWT
- اتصال مستقیم به Cloudflare API
- دیتابیس MongoDB
- **نام دامنه کاملاً داینامیک** (از env var خوانده میشه)
- نصب خودکار با اسکریپت Bash
- SSL رایگان با Let's Encrypt

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
                    └─────────────────┘ └───────┬──────┬───────┘
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

### منوی اسکریپت نصب

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

### مراحل:

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

> **نکته:** DNS دامنه رو به IP سرور جدید تغییر بدید و SSL رو تمدید کنید (`sudo bash install.sh` → گزینه 9)

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
CORS_ORIGINS=https://yourdomain.com
CLOUDFLARE_API_TOKEN=your_token_here
CLOUDFLARE_ZONE_ID=your_zone_id_here
JWT_SECRET=auto_generated_on_install
DOMAIN_NAME=yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=your_password
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

## 📡 مستندات API

تمام مسیرهای API با پیشوند `/api` شروع میشن.

### احراز هویت

| متد | مسیر | توضیحات | احراز هویت |
|-----|-------|---------|------------|
| `POST` | `/api/auth/register` | ثبت‌نام (با کد رفرال اختیاری) | — |
| `POST` | `/api/auth/login` | ورود | — |
| `GET` | `/api/auth/me` | اطلاعات کاربر فعلی | Bearer Token |

### رکوردهای DNS

| متد | مسیر | توضیحات | احراز هویت |
|-----|-------|---------|------------|
| `GET` | `/api/dns/records` | لیست رکوردهای کاربر | Bearer Token |
| `POST` | `/api/dns/records` | ایجاد رکورد جدید | Bearer Token |
| `PUT` | `/api/dns/records/{id}` | ویرایش رکورد | Bearer Token |
| `DELETE` | `/api/dns/records/{id}` | حذف رکورد | Bearer Token |

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
| `POST` | `/api/admin/dns/records` | ایجاد رکورد برای کاربر |
| `DELETE` | `/api/admin/dns/records/{id}` | حذف هر رکورد |

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
├── fix-server.sh                 # اسکریپت رفع مشکلات سرور
├── README.md
│
├── backend/
│   ├── server.py                 # سرور FastAPI (تمام API ها)
│   ├── requirements.txt          # وابستگی‌های Python
│   └── .env                      # متغیرهای محیطی
│
└── frontend/
    ├── package.json
    ├── tailwind.config.js
    ├── public/
    │   └── index.html            # از %REACT_APP_DOMAIN_NAME% استفاده میکنه
    └── src/
        ├── App.js                # مسیریابی اصلی
        ├── index.css             # استایل‌ها و تم‌ها
        ├── config/
        │   └── site.js           # ◀ پیکربندی دامنه (داینامیک از env var)
        ├── lib/
        │   ├── api.js            # کلاینت API
        │   └── i18n.js           # ترجمه‌ها (FA/EN)
        ├── contexts/
        │   ├── AuthContext.js     # مدیریت احراز هویت
        │   ├── ThemeContext.js    # مدیریت تم (تاریک/روشن)
        │   └── LanguageContext.js # مدیریت زبان
        ├── pages/
        │   ├── Landing.js        # صفحه اصلی
        │   ├── Login.js          # ورود
        │   ├── Register.js       # ثبت‌نام
        │   ├── Dashboard.js      # داشبورد کاربر
        │   └── Admin.js          # پنل مدیریت
        └── components/
            ├── Navbar.js          # نوار ناوبری
            └── ui/                # کامپوننت‌های Shadcn
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

```bash
# اجرای اسکریپت فیکس
sudo bash fix-server.sh
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

<br>

## 🗺 نقشه راه

- [ ] درگاه پرداخت (Stripe / زرین‌پال)
- [ ] تأیید ایمیل هنگام ثبت‌نام
- [ ] بازیابی رمز عبور
- [ ] پشتیبانی MX، TXT، SRV
- [ ] ایمپورت/اکسپورت رکوردها (CSV)
- [ ] API Key اختصاصی هر کاربر
- [ ] داشبورد آماری ادمین
- [ ] لاگ فعالیت
- [ ] احراز هویت دو مرحله‌ای (2FA)

<br>

## 📄 مجوز

این پروژه تحت مجوز [MIT](LICENSE) منتشر شده.

<br>

---

<div align="center">

اگه این پروژه بهتون کمک کرد، یه ستاره بزنید ⭐

</div>
