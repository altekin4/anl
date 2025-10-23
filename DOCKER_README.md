# Tercih Sihirbazı - Docker Deployment

Bu proje Docker ve Docker Compose kullanılarak kolayca çalıştırılabilir.

## Gereksinimler

- Docker (20.10+)
- Docker Compose (2.0+)

## Hızlı Başlangıç

### 1. Simple Server (Hızlı Test)

Veritabanı olmadan sadece mock verilerle test etmek için:

```bash
# Linux/Mac
./docker-run.sh simple

# Windows PowerShell
.\docker-run.ps1 simple
```

Bu komut:
- Simple server'ı port 3001'de başlatır
- Mock API responses kullanır
- Veritabanı gerektirmez

### 2. Full Stack (Production)

Tam özellikli uygulama için:

```bash
# Linux/Mac
./docker-run.sh full

# Windows PowerShell
.\docker-run.ps1 full
```

Bu komut:
- PostgreSQL veritabanını başlatır
- Redis cache'i başlatır
- Backend API'yi başlatır
- Tüm servisleri birbirine bağlar

### 3. Frontend ile Birlikte

Nginx frontend ile birlikte:

```bash
# Linux/Mac
./docker-run.sh frontend

# Windows PowerShell
.\docker-run.ps1 frontend
```

### 4. Geliştirme Araçları ile

Adminer (veritabanı yönetimi) dahil:

```bash
# Linux/Mac
./docker-run.sh tools

# Windows PowerShell
.\docker-run.ps1 tools
```

## Servis Portları

| Servis | Port | URL |
|--------|------|-----|
| Frontend (Nginx) | 80 | http://localhost |
| Backend API | 3000 | http://localhost:3000 |
| Simple Server | 3001 | http://localhost:3001 |
| PostgreSQL | 5432 | localhost:5432 |
| Redis | 6379 | localhost:6379 |
| Adminer | 8080 | http://localhost:8080 |

## Yönetim Komutları

### Durumu Kontrol Et
```bash
./docker-run.sh status
```

### Logları Görüntüle
```bash
./docker-run.sh logs
```

### Servisleri Durdur
```bash
./docker-run.sh stop
```

### Her Şeyi Temizle
```bash
./docker-run.sh clean
```

## Manuel Docker Compose Kullanımı

### Basit Sunucu
```bash
docker-compose --profile simple up -d
```

### Tam Stack
```bash
docker-compose up -d database redis backend
```

### Frontend ile
```bash
docker-compose --profile frontend up -d
```

### Araçlar ile
```bash
docker-compose --profile tools --profile frontend up -d
```

## Environment Variables

`.env.docker` dosyasını kopyalayıp `.env` olarak kaydedin ve gerekli değişkenleri ayarlayın:

```bash
cp .env.docker .env
```

Önemli değişkenler:
- `OPENAI_API_KEY`: OpenAI API anahtarı (isteğe bağlı)
- `JWT_SECRET`: JWT için güvenli anahtar
- `POSTGRES_PASSWORD`: Veritabanı şifresi
- `REDIS_PASSWORD`: Redis şifresi

## Veritabanı Bağlantısı

### Adminer ile
1. http://localhost:8080 adresini açın
2. Bağlantı bilgileri:
   - Server: `database`
   - Username: `postgres`
   - Password: `password`
   - Database: `tercih_sihirbazi`

### Doğrudan bağlantı
```bash
docker exec -it tercih-sihirbazi-db psql -U postgres -d tercih_sihirbazi
```

## Troubleshooting

### Port çakışması
Eğer portlar kullanımda ise, `docker-compose.yml` dosyasındaki port mapping'lerini değiştirin.

### Veritabanı bağlantı hatası
```bash
# Veritabanı loglarını kontrol edin
docker logs tercih-sihirbazi-db

# Veritabanını yeniden başlatın
docker-compose restart database
```

### Disk alanı sorunu
```bash
# Kullanılmayan Docker objelerini temizle
docker system prune -a

# Volumes'ları da temizle (DİKKAT: Veri kaybı!)
docker system prune -a --volumes
```

## Development

### Hot reload için
Development sırasında kod değişikliklerini görmek için volume mount kullanın:

```yaml
# docker-compose.override.yml
version: '3.8'
services:
  backend:
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      NODE_ENV: development
```

### Debug modu
```bash
# Backend container'ına bağlan
docker exec -it tercih-sihirbazi-backend sh

# Logları takip et
docker logs -f tercih-sihirbazi-backend
```

## Production Deployment

Production için:

1. `.env` dosyasında güvenli şifreler kullanın
2. `JWT_SECRET` değiştirin
3. SSL sertifikası ekleyin
4. Firewall kurallarını ayarlayın
5. Backup stratejisi oluşturun

```bash
# Production build
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```