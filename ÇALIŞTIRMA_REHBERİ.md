# Tercih Sihirbazı - Çalıştırma Rehberi

## 🚀 Hızlı Başlangıç

### Seçenek 1: Demo Versiyonu (Hemen Çalıştır)
Eğer sadece arayüzü görmek istiyorsanız:

1. `standalone.html` dosyasını web tarayıcınızda açın
2. Demo versiyonu sınırlı özelliklerle çalışır
3. Gerçek veriler olmadan temel arayüzü test edebilirsiniz

### Seçenek 2: Tam Özellikli Sürüm

#### Gereksinimler
- Node.js (v16 veya üzeri)
- npm veya yarn
- PostgreSQL (isteğe bağlı)
- Redis (isteğe bağlı)

#### Kurulum Adımları

1. **Bağımlılıkları kurun:**
   ```bash
   npm install
   ```

2. **Environment dosyasını ayarlayın:**
   - `.env` dosyası zaten oluşturuldu
   - Gerekirse değişkenleri düzenleyin

3. **Projeyi çalıştırın:**
   ```bash
   # Geliştirme modu
   npm run dev
   
   # Veya alternatif olarak
   node start-dev.js
   ```

4. **Tarayıcıda açın:**
   - http://localhost:3000

## 📋 Mevcut Özellikler

### ✅ Çalışan Özellikler
- ✅ Responsive web arayüzü
- ✅ Chat interface
- ✅ Temel routing yapısı
- ✅ Error handling sistemi
- ✅ WebSocket desteği
- ✅ TypeScript yapılandırması
- ✅ Docker konfigürasyonu
- ✅ Test altyapısı

### 🔄 Geliştirme Aşamasında
- 🔄 Database bağlantısı (mock data ile çalışır)
- 🔄 Redis cache (olmadan da çalışır)
- 🔄 OpenAI entegrasyonu
- 🔄 YÖK Atlas veri çekimi

## 🛠️ Geliştirme Komutları

```bash
# Geliştirme sunucusu
npm run dev

# Projeyi build et
npm run build

# Production'da çalıştır
npm start

# Testleri çalıştır
npm test

# E2E testleri
npm run test:e2e

# Docker ile çalıştır
npm run docker:dev

# Linting
npm run lint
```

## 🐳 Docker ile Çalıştırma

```bash
# Development ortamı
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Production ortamı
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d

# Servisleri durdur
docker-compose down
```

## 🔧 Sorun Giderme

### Node.js Kurulu Değilse
1. [Node.js resmi sitesinden](https://nodejs.org/) indirin
2. LTS versiyonunu seçin
3. Kurulum sonrası terminal/cmd'yi yeniden başlatın

### Port 3000 Kullanımda
```bash
# Farklı port kullanın
PORT=3001 npm run dev
```

### Database Bağlantı Hatası
- Proje PostgreSQL olmadan da çalışır (mock data ile)
- Gerçek database için PostgreSQL kurmanız gerekir

### Redis Bağlantı Hatası
- Proje Redis olmadan da çalışır
- Cache özelliği devre dışı kalır

## 📁 Proje Yapısı

```
tercih-sihirbazi/
├── public/                 # Static dosyalar
│   ├── index.html         # Ana HTML dosyası
│   ├── styles.css         # CSS stilleri
│   └── script.js          # Frontend JavaScript
├── src/                   # Backend kaynak kodu
│   ├── controllers/       # API kontrolcüleri
│   ├── services/          # İş mantığı servisleri
│   ├── models/           # Veri modelleri
│   ├── routes/           # API rotaları
│   ├── middleware/       # Middleware'ler
│   ├── utils/            # Yardımcı fonksiyonlar
│   └── index.ts          # Ana sunucu dosyası
├── docker-compose.yml    # Docker konfigürasyonu
├── package.json          # NPM bağımlılıkları
└── standalone.html       # Demo versiyonu
```

## 🌐 API Endpoints

- `GET /` - Ana sayfa
- `GET /health` - Sistem durumu
- `POST /api/chat/sessions` - Chat oturumu oluştur
- `POST /api/chat/sessions/:id/messages` - Mesaj gönder
- `GET /api/calculator/net-calculation` - Net hesaplama
- `GET /api/data/universities` - Üniversite listesi

## 📱 Responsive Tasarım

Proje tüm cihazlarda çalışacak şekilde tasarlanmıştır:
- 📱 Mobil (320px+)
- 📱 Tablet (768px+)
- 💻 Desktop (1024px+)

## 🔒 Güvenlik

- CORS koruması
- Rate limiting
- Input validation
- XSS koruması
- CSRF koruması

## 📊 Monitoring

- Performance monitoring
- Error tracking
- Request analytics
- Health checks

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun
3. Değişikliklerinizi commit edin
4. Pull request gönderin

## 📞 Destek

Sorunlarınız için:
1. GitHub Issues kullanın
2. Dokümantasyonu kontrol edin
3. Log dosyalarını inceleyin

---

**Not:** Bu proje eğitim amaçlı geliştirilmiştir. Production kullanımı için ek güvenlik önlemleri alınmalıdır.