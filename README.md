# UGRA-WEB (UĞRA Şehir İçi Zaman Asistanı)

**UĞRA.** — Gitmeye vakit bulamadığın her yere senin için Uğra'yalım. Şehir içi zaman asistanınız.

---

## 🚀 Öne Çıkan Özellikler

- **Şehir İçi Zaman Asistanlığı:** Kuru temizleme, kargo, anahtar, eczane ve özel sipariş teslimatları.
- **Canlı Mekân Seçimi:** Dinamik sağ panelden mekân bilgilerine ve duruma hızlı erişim.
- **Asistanlık Başvuru Sistemi:**
  - 🛵 **Motosikletli Asistan Başvurusu:** Ehliyet, motosiklet modeli ve deneyim formu.
  - 🚲 **Bisikletli Asistan Başvurusu:** Ehliyet şartı aranmaksızın aktif başvuru ve modal entegrasyonu.
- **Yönetim Paneli (Admin Panel):** Başvuruları, partnerleri, ürünleri ve siparişleri anlık takip ve statü güncelleme.
- **Partner & Mağaza Panelleri:** İş ortakları için ürün, sipariş ve restoran/mağaza yönetimi.
- **Responsive & Mobil Uyumlu:** Framer Motion animasyonları, modern karanlık tema ve PWA desteği.

---

## 🛠️ Teknolojiler

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS (v4)
- **Animasyon & İkonlar:** Framer Motion, Lucide React
- **Veritabanı / Backend Entegrasyonu:** Supabase JS Client & Dahili Sanal Veritabanı Fallback
- **Yönlendirme:** Wouter
- **PWA:** Vite Plugin PWA

---

## 💻 Yerel Kurulum (Local Setup)

### 1. Gereksinimler
- Node.js (v18+ önerilir)
- npm / yarn / pnpm

### 2. Bağımlılıkları Yükleyin
```bash
npm install
```

### 3. Çevre Değişkenlerini Ayarlayın (Opsiyonel)
Proje kök dizininde bir `.env.local` dosyası oluşturup `.env.example` içeriğini kopyalayabilirsiniz. Supabase değişkenleri tanımlanmazsa uygulama otomatik sanal veritabanı (Virtual LocalStorage Database) modunda çalışır.

```env
VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Geliştirici Sunucusunu Başlatın
```bash
npm run dev
```
Uygulama `http://localhost:3000` adresinde açılacaktır.

---

## 📦 Üretim Derlemesi (Production Build)

Projeyi üretime hazır hale getirmek için:

```bash
npm run build
```

Derlenmiş çıktılar `dist/` klasörüne oluşturulur. Yerel olarak önizlemek için:

```bash
npm run preview
```

---

## 🚀 Vercel Deployment (Vercel'e Canlıya Alma)

Bu proje Vercel ile %100 uyumludur ve hiçbir ek konfigürasyon gerektirmeden Vercel'e bağlanabilir.

1. **GitHub'a Yükleyin:**
   Kodu kendi GitHub hesabınızdaki **`UGRA-WEB`** reponuza push edin.

2. **Vercel Dashboard'a Gidin:**
   - [vercel.com](https://vercel.com) adresinden **"Add New Project"** butonuna tıklayın.
   - **`UGRA-WEB`** reponuzu seçin.

3. **Build Ayarları (Otomatik Algılanır):**
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

4. **Environment Variables (Opsiyonel):**
   - Supabase entegrasyonu kullanacaksanız `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY` değerlerini Vercel Environment Variables kısmına ekleyin.

5. **Deploy:**
   - **Deploy** butonuna tıklayın. Uygulamanız birkaç saniye içinde canlıya alınacaktır!

---

## 📁 Proje Yapısı (Directory Structure)

```
UGRA-WEB/
├── public/                 # Favicon, ikonlar, PWA manifest ve ses efektleri
├── scripts/                # İkon ve sitemap üretme script'leri
├── src/
│   ├── components/         # Modüler UI bileşenleri (Header, Hero, ApplicationModal, BecomeAssistant vb.)
│   ├── hooks/              # Custom React hook'ları
│   ├── lib/                # Supabase entegrasyonu & sanal veritabanı mantığı
│   ├── pages/              # Sayfalar (Home, AsistanPage, AdminPanel, PartnerDashboard, StoreFront vb.)
│   ├── App.tsx             # Ana uygulama yönlendirmeleri
│   ├── index.css           # Global Tailwind stilleri
│   └── main.tsx            # Vite React giriş noktası
├── .env.example            # Örnek çevre değişkenleri dosyası
├── .gitignore              # Git tarafından yoksayılacak dosyalar
├── components.json         # Shadcn / UI yapılandırması
├── index.html              # HTML ana şablonu
├── metadata.json           # Uygulama metadata bilgileri
├── package.json            # Proje bağımlılıkları ve npm script'leri
├── README.md               # Proje dokümantasyonu
├── tsconfig.json           # TypeScript konfigürasyonu
└── vite.config.ts          # Vite & PWA yapılandırması
```

---

## 📝 Lisans

Tüm hakları saklıdır © UĞRA.
