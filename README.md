<div align="center">

<br>

```
 ▄█   ▄█▄    ▄█    █▄      ▄████████  ▄█        ▄█   ▄█▄ 
 ███ ▄███▀   ███    ███    ███    ███ ███       ███ ▄███▀  
 ███▐██▀     ███    ███    ███    ███ ███       ███▐██▀    
 ███▐██▄     ███▄▄▄▄███▄▄ ███    ███ ███       ███▐██▄    
 ███ ▀███▄   ▀▀▀▀▀▀███▀▀▀ ▀███████████ ███       ███ ▀███▄  
 ███   ▀██▀        ███    ███    ███ ███       ███   ▀██▀ 
 ███     ▀         ███    ███    ███ ███▌    ▄ ███     ▀  
 █▀                ███    ████████▀  █████▄▄██ █▀        
```

<br>

# پلتفرم مدیریت DNS — khalilv2.com

**ساخت رکوردهای DNS رایگان روی دامنه khalilv2.com**

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://www.cloudflare.com/)
[![Nginx](https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white)](https://nginx.org/)
[![Let's Encrypt](https://img.shields.io/badge/Let's_Encrypt-003A70?style=for-the-badge&logo=letsencrypt&logoColor=white)](https://letsencrypt.org/)

<br>

[نصب سریع](#-نصب-سریع) •
[قابلیت‌ها](#-قابلیت‌ها) •
[اسکرین‌شات](#-اسکرین‌شات) •
[API](#-مستندات-api) •
[مشارکت](#-مشارکت)

<br>

</div>

---

<br>

## پلتفرمی که هر کسی بتونه ساب‌دامین رایگان داشته باشه

khalilv2.com یک پلتفرم مدیریت DNS هست که به کاربران اجازه میده رکوردهای **A**، **AAAA** و **CNAME** رو به صورت رایگان روی دامنه ایجاد کنن. رکوردها مستقیم از طریق **Cloudflare API** روی DNS واقعی اعمال میشن.

<br>

## ✨ قابلیت‌ها

<table>
<tr>
<td width="50%">

### کاربران
- ثبت‌نام و ورود با ایمیل و رمز عبور
- ساخت رکوردهای A، AAAA، CNAME
- ۲ رکورد رایگان برای هر کاربر
- ویرایش و حذف رکوردها
- سیستم دعوت دوستان (Referral)
- دریافت رکورد اضافی به ازای هر دعوت

</td>
<td width="50%">

### پنل مدیریت
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

### طراحی
- دوزبانه: فارسی (راست‌به‌چپ) و انگلیسی
- تم تاریک و روشن
- طراحی ریسپانسیو
- رابط کاربری مدرن با Shadcn UI

</td>
<td width="50%">

### فنی
- احراز هویت JWT
- اتصال مستقیم به Cloudflare API
- دیتابیس MongoDB
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
                    │   Port 3000     │ │   Port 8001          │
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

### منوی اسکریپت نصب

اسکریپت نصب یک منوی اینتراکتیو داره:

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
```

همچنین میتونید مستقیم از CLI هم استفاده کنید:

```bash
sudo bash install.sh start
sudo bash install.sh stop
sudo bash install.sh restart
sudo bash install.sh update
sudo bash install.sh status
```

<br>

## ⚙️ پیکربندی

### اطلاعات مورد نیاز هنگام نصب

اسکریپت نصب این اطلاعات رو ازتون میپرسه:

| متغیر | توضیحات | مثال |
|--------|---------|------|
| Domain | نام دامنه شما | `khalilv2.com` |
| SSL Email | ایمیل برای Let's Encrypt | `you@email.com` |
| CF API Token | توکن API کلودفلر | [ساخت توکن](https://dash.cloudflare.com/profile/api-tokens) |
| CF Zone ID | شناسه زون کلودفلر | از داشبورد Overview دامنه |
| Admin Email | ایمیل ادمین | `admin@khalilv2.com` |
| Admin Password | رمز عبور ادمین (حداقل ۶ کاراکتر) | — |
| MongoDB URL | آدرس MongoDB | `mongodb://localhost:27017` |
| DB Name | نام دیتابیس | `khalilv2_dns` |

### فایل‌های محیطی

<details>
<summary><b>backend/.env</b></summary>

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=khalilv2_dns
CORS_ORIGINS=https://khalilv2.com
CLOUDFLARE_API_TOKEN=your_token_here
CLOUDFLARE_ZONE_ID=your_zone_id_here
JWT_SECRET=auto_generated_on_install
DOMAIN_NAME=khalilv2.com
ADMIN_EMAIL=admin@khalilv2.com
ADMIN_PASSWORD=your_password
```
</details>

<details>
<summary><b>frontend/.env</b></summary>

```env
REACT_APP_BACKEND_URL=https://khalilv2.com
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

### پلن‌ها و تماس

| متد | مسیر | توضیحات | احراز هویت |
|-----|-------|---------|------------|
| `GET` | `/api/plans` | لیست پلن‌ها | — |
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
<summary><b>تنظیمات</b></summary>

| متد | مسیر | توضیحات |
|-----|-------|---------|
| `GET` | `/api/admin/settings` | دریافت تنظیمات |
| `PUT` | `/api/admin/settings` | بروزرسانی تنظیمات |

</details>

<br>

## 📁 ساختار پروژه

```
ddns-khalilv2/
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
    │   └── index.html
    └── src/
        ├── App.js                # مسیریابی اصلی
        ├── index.css             # استایل‌ها و تم‌ها
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
- لینک دعوت: `https://khalilv2.com/register?ref=CODE`
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
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### فرانت‌اند

```bash
cd frontend
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
cat /opt/ddns-khalilv2/backend/.env
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
dig +short khalilv2.com
```

۲. دستی تست کنید:
```bash
sudo certbot --nginx -d khalilv2.com --non-interactive --agree-tos -m your@email.com
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

ساخته شده با عشق توسط **[admin6501](https://github.com/admin6501)**

<br>

اگه این پروژه بهتون کمک کرد، یه ستاره بزنید ⭐

</div>
