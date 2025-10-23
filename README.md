# 🧙‍♂️ Tercih Sihirbazı

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![AI Powered](https://img.shields.io/badge/AI-Anthropic%20Claude-blue)](https://www.anthropic.com/)

AI-powered university preference counseling chatbot for Turkish students with 2024 YÖK Atlas data.

## 🌟 Live Demo
Visit: `http://localhost:3005` (after running locally)

## 📂 Repository
GitHub: https://github.com/altekin4/anl

## 📸 Screenshots
![Tercih Sihirbazı Interface](https://via.placeholder.com/800x400/4CAF50/FFFFFF?text=Tercih+Sihirbazi+Interface)

*Add your actual screenshots here*

## 🆕 2024 Güncellemesi

- **Güncel YÖK Atlas Verileri**: 2024 taban puanları ve kontenjanlar
- **Gelişmiş AI**: Anthropic Claude API entegrasyonu
- **Güncel Hesaplamalar**: 2024 TYT/AYT formülleri
- **Gerçek Zamanlı Veriler**: Anlık güncellenen üniversite bilgileri

## Features

- 🤖 **AI Destekli Danışmanlık**: Anthropic Claude ile akıllı yanıtlar
- 📊 **2024 YÖK Atlas Verileri**: Güncel taban puanları ve kontenjanlar
- 🧮 **Net Hesaplama**: TYT/AYT net hesaplama ve puan tahmini
- 🔮 **Geleceği Parlak Meslekler**: Net sayısına göre kariyer önerileri
- 💼 **Akıllı Bölüm Önerisi**: İş imkanları ve maaş bilgileriyle
- 💬 **Doğal Dil İşleme**: Türkçe sorular için optimize edilmiş
- 📱 **Responsive Tasarım**: Tüm cihazlarda uyumlu
- ⚡ **Hızlı Yanıt**: Gerçek zamanlı chat arayüzü

## Tech Stack

- **Backend**: Node.js, HTTP Server
- **AI/NLP**: Anthropic Claude API
- **Data**: 2024 YÖK Atlas JSON verileri
- **Frontend**: Vanilla JavaScript, CSS3
- **Real-time**: HTTP/JSON API

## Getting Started

### Prerequisites

- Node.js 18+
- Anthropic API key (opsiyonel)
- 2024 YÖK Atlas verileri (dahil)

## 🚀 Hızlı Başlangıç

### Gereksinimler
- Node.js 18+ 
- npm veya yarn
- Anthropic API key (opsiyonel)

### Kurulum

1. **Repository'yi klonlayın**
```bash
git clone https://github.com/altekin4/anl.git
cd anl
```

2. **Bağımlılıkları yükleyin**
```bash
npm install
```

3. **Environment variables ayarlayın**
```bash
cp .env.example .env
# .env dosyasını düzenleyip API key'lerinizi ekleyin
```

4. **Güncel verileri yükleyin**
```bash
npm run import-data
```

5. **Serveri başlatın**
```bash
npm start
```

6. **Tarayıcıda açın**
```
http://localhost:3005
```

### Detaylı Kurulum

1. Repository'yi klonlayın
```bash
git clone <repository-url>
cd tercih-sihirbazi
```

2. Bağımlılıkları yükleyin
```bash
npm install
```

3. 2024 YÖK Atlas verilerini güncelleyin
```bash
node import-yok-data.js
```

4. Environment variables ayarlayın (opsiyonel)
```bash
cp .env.example .env
# .env dosyasını Anthropic API key ile düzenleyin
```

5. Serveri başlatın
```bash
node simple-server-updated.js
```

4. Set up database
```bash
# Create database and run migrations
npm run db:migrate
```

5. Start development server
```bash
npm run dev
```

## API Endpoints

- `GET /health` - Health check
- `POST /api/chat/sessions` - Create chat session
- `POST /api/chat/messages` - Send message
- `GET /api/universities` - Get universities
- `GET /api/departments` - Get departments
- `POST /api/calculate` - Calculate net requirements

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Deployment

```bash
# Build for production
npm run build

# Start production server
npm start
```

## License

MIT
##
 📊 2024 Veri Güncellemeleri

### Güncel Taban Puanları
- **Bilgisayar Mühendisliği**: SAY 535, EA 525 puan
- **Makine Mühendisliği**: SAY 520, EA 510 puan  
- **İşletme**: SAY 495, EA 485 puan
- **Tıp**: SAY 565, EA 555 puan

### Veri Kaynakları
- YÖK Atlas 2024 verileri
- Güncellenme: 23 Ekim 2024
- 10 üniversite, 40 bölüm, 320 puan kaydı

## 🚀 Kullanım

### Chat Örnekleri
```
"TYT matematik 35 doğru 5 yanlış"
"Bilgisayar mühendisliği taban puanları"
"İTÜ hakkında bilgi ver"
"Başarılı öğrencilerden tavsiye"
"Geleceği parlak meslekler nelerdir?"
"75 TYT net 65 AYT net ile hangi bölümü önerirsiniz?"
"Hangi mesleklerin geleceği parlak?"
```

### API Endpoints
```bash
# Chat API
POST /api/chat
{
  "message": "TYT netimi hesapla"
}

# Kariyer Önerisi API
POST /api/career-recommendation
{
  "tytNet": 75,
  "aytNet": 65,
  "scoreType": "SAY"
}
```

## 🔧 Yapılandırma

### Environment Variables
```env
ANTHROPIC_API_KEY=your_api_key_here
ANTHROPIC_MODEL=claude-3-haiku-20240307
ANTHROPIC_MAX_TOKENS=500
```

### Port Ayarları
- Default: 3005
- Değiştirmek için: `simple-server-updated.js` dosyasında `PORT` değişkenini düzenleyin

## 📁 Dosya Yapısı

```
├── data/                    # 2024 YÖK Atlas verileri
│   ├── universities.json    # Üniversite bilgileri
│   ├── departments.json     # Bölüm bilgileri
│   ├── scores.json         # Taban puanları
│   └── future-careers.json # Geleceği parlak meslekler
├── public/                 # Frontend dosyaları
├── simple-server-updated.js # Ana server (2024 güncel)
├── import-yok-data.js      # Veri import scripti
└── README.md
```

## 🎯 Özellikler

### AI Asistan
- Anthropic Claude 3 Haiku
- Türkçe optimize edilmiş promptlar
- 2024 güncel veri entegrasyonu
- Akıllı intent classification

### Hesaplamalar
- TYT Net: Doğru - (Yanlış ÷ 4)
- AYT Net: Doğru - (Yanlış ÷ 4)
- Puan tahmini: 2024 formülleri
- Sıralama tahminleri

### Veri Yönetimi
- JSON tabanlı veri depolama
- Hızlı arama ve filtreleme
- Gerçek zamanlı güncelleme
- Otomatik veri validasyonu

## 🔄 Veri Güncelleme

Verileri güncellemek için:
```bash
node import-yok-data.js
```

Bu script:
- YÖK Atlas'tan güncel verileri çeker
- JSON dosyalarını günceller
- Veri tutarlılığını kontrol eder
- 2024 yılı verilerini kullanır

## 🐛 Sorun Giderme

### Port Kullanımda Hatası
```bash
# Farklı port kullanın
const PORT = 3006; // simple-server-updated.js içinde
```

### API Key Hatası
```bash
# .env dosyasına ekleyin
ANTHROPIC_API_KEY=your_actual_api_key
```

### Veri Yükleme Hatası
```bash
# Veri dosyalarını kontrol edin
ls -la data/
node import-yok-data.js
```

## 📈 Performans

- **Yanıt Süresi**: < 2 saniye
- **Veri Boyutu**: ~1MB JSON
- **Bellek Kullanımı**: ~50MB
- **Eş Zamanlı Kullanıcı**: 100+

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun
3. Değişikliklerinizi commit edin
4. Pull request gönderin

## 📄 Lisans

MIT License - detaylar için LICENSE dosyasına bakın.

## 📞 İletişim

- **Proje**: Tercih Sihirbazı
- **Versiyon**: 2024.1
- **Güncelleme**: 23 Ekim 2024## 🔮 Ge
leceği Parlak Meslekler Özelliği

### Desteklenen Meslekler
1. **Yapay Zeka Mühendisliği** - %300 büyüme, 25-50K TL maaş
2. **Siber Güvenlik Mühendisliği** - %250 büyüme, 20-40K TL maaş
3. **Veri Bilimi** - %200 büyüme, 18-35K TL maaş
4. **Biyomedikal Mühendisliği** - %180 büyüme, 15-30K TL maaş
5. **Yenilenebilir Enerji Mühendisliği** - %170 büyüme, 14-28K TL maaş
6. **Oyun Tasarımı ve Programlama** - %160 büyüme, 15-35K TL maaş
7. **Çevre Mühendisliği** - %150 büyüme, 12-25K TL maaş
8. **Dijital Pazarlama** - %140 büyüme, 10-25K TL maaş
9. **UX/UI Tasarım** - %130 büyüme, 12-30K TL maaş
10. **Psikoloji (Klinik)** - %120 büyüme, 8-20K TL maaş

### Akıllı Öneri Sistemi
- **Net Analizi**: Kullanıcının TYT/AYT net sayılarını analiz eder
- **Uygunluk Skoru**: Her meslek için uygunluk skoru hesaplar
- **Eksik Net Hesabı**: Hedef meslek için kaç net daha gerektiğini söyler
- **Üniversite Önerileri**: Her meslek için uygun üniversiteleri listeler
- **Maaş ve Büyüme Bilgisi**: Güncel maaş aralıkları ve sektör büyüme oranları

### Kullanım Örnekleri
```bash
# Genel geleceği parlak meslekler
"Geleceği parlak meslekler nelerdir?"

# Net sayısına göre öneri
"75 TYT net 65 AYT net ile hangi bölümü önerirsiniz?"

# Spesifik meslek sorgusu
"Yapay zeka mühendisliği için kaç net gerekir?"

# Kariyer danışmanlığı
"Hangi mesleklerin geleceği parlak?"
```

## 🎯 Yeni Özellikler (v2024.2)

- ✅ **Geleceği Parlak Meslekler Veritabanı**: 10 meslek, büyüme oranları, maaş bilgileri
- ✅ **Akıllı Kariyer Önerisi**: Net sayısına göre kişiselleştirilmiş öneriler
- ✅ **Eksik Net Hesaplayıcısı**: Hedef meslek için kaç net daha gerektiğini hesaplar
- ✅ **Üniversite Eşleştirme**: Her meslek için uygun üniversite önerileri
- ✅ **API Endpoint**: `/api/career-recommendation` endpoint'i eklendi
- ✅ **Gelişmiş AI Promptları**: Geleceği parlak meslekler bilgisiyle zenginleştirildi##
 📊 Kapsamlı Üniversite Veritabanı (v2024.3)

### 15 Üniversite - Farklı Seviyeler

#### 🔝 Üst Seviye Üniversiteler
- **İTÜ Bilgisayar**: SAY 545 puan (8.5K sıralama)
- **Boğaziçi Bilgisayar**: SAY 550 puan (7.5K sıralama)
- **ODTÜ Bilgisayar**: SAY 540 puan (9.5K sıralama)
- **Hacettepe Tıp**: SAY 565 puan (3.5K sıralama)

#### 📈 Orta Seviye Üniversiteler
- **Gazi Bilgisayar**: SAY 505 puan (25K sıralama)
- **Marmara Bilgisayar**: SAY 510 puan (22K sıralama)
- **YTÜ Bilgisayar**: SAY 495 puan (30K sıralama)

#### 🏫 Orta-Alt Seviye Üniversiteler
- **Sakarya Bilgisayar**: SAY 475 puan (42K sıralama)
- **Kocaeli Bilgisayar**: SAY 470 puan (45K sıralama)
- **ESOGÜ Bilgisayar**: SAY 460 puan (52K sıralama)

### Akıllı Tercih Sistemi
- **Güvenli Tercihler**: Kullanıcı puanı > taban puanı + 20
- **Hedef Tercihler**: Kullanıcı puanı > taban puanı + 5
- **Riskli Tercihler**: Kullanıcı puanı > taban puanı - 5
- **Yerleşme Olasılığı**: Her tercih için hesaplanır

### Yeni API Endpoint'leri
```bash
# Taban puan sorgulama
POST /api/base-scores
{
  "department": "Bilgisayar Mühendisliği",
  "scoreType": "SAY",
  "userScore": 500
}

# Üniversite önerileri
POST /api/university-recommendations
{
  "userScore": 500,
  "scoreType": "SAY",
  "department": "Bilgisayar"
}
```

### Chat Örnekleri (Güncellenmiş)
```
"Bilgisayar mühendisliği taban puanları hangi üniversitelerde kaç?"
"500 puan ile bilgisayar mühendisliği okuyabileceğim üniversiteler hangileri?"
"480 puan ile hangi üniversitelerde işletme okuyabilirim?"
"Orta seviye üniversitelerde makine mühendisliği taban puanları"
```

## 🎯 Yeni Özellikler (v2024.3)

- ✅ **Kapsamlı Üniversite Veritabanı**: 15 üniversite, farklı seviyeler
- ✅ **Detaylı Taban Puanları**: Üniversite adı, şehir, sıralama bilgisi
- ✅ **Akıllı Tercih Sistemi**: Güvenli/Hedef/Riskli tercih kategorileri
- ✅ **Yerleşme Olasılığı**: Her tercih için hesaplanmış olasılık
- ✅ **Puan Bazlı Filtreleme**: Kullanıcının puanına göre uygun öneriler
- ✅ **Çok Seviyeli Analiz**: Üst, orta, orta-alt seviye üniversiteler
- ✅ **API Endpoint'leri**: `/api/base-scores` ve `/api/university-recommendations`