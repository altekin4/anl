// Gerçek Veri Aktivasyon Scripti
console.log('🔄 Gerçek YÖK Atlas verilerine geçiş başlatılıyor...\n');

const { DataImportService } = require('./src/services/DataImportService');
const { CacheService } = require('./src/services/CacheService');

async function activateRealData() {
  try {
    console.log('📊 Mevcut durum: Mock veriler aktif');
    console.log('🎯 Hedef: YÖK Atlas gerçek verileri\n');
    
    // Cache service başlat
    const cacheService = new CacheService();
    const importService = new DataImportService(cacheService);
    
    console.log('🔍 Veri import durumu kontrol ediliyor...');
    const status = await importService.getImportStatus();
    
    console.log('📈 Mevcut veri durumu:');
    console.log(`• Üniversiteler: ${status.dataAvailability.universities}`);
    console.log(`• Bölümler: ${status.dataAvailability.departments}`);
    console.log(`• Mevcut yıllar: ${status.dataAvailability.availableYears.join(', ')}`);
    console.log(`• Toplam puan kayıtları: ${status.dataAvailability.totalScoreRecords}`);
    
    if (status.dataAvailability.universities === 0) {
      console.log('\n⚠️  Gerçek veriler henüz import edilmemiş!');
      console.log('\n🚀 Gerçek verileri aktif etmek için:');
      console.log('1. YÖK Atlas verilerini import edin:');
      console.log('   node scripts/import-yok-data.js');
      console.log('\n2. Veya DataImportService kullanın:');
      console.log('   await importService.importYearData(2024)');
      
      console.log('\n📊 Şu anki sistem durumu:');
      console.log('✅ TYT/AYT hesaplama formülleri: GERÇEK');
      console.log('✅ Başarılı öğrenci tavsiyeleri: GERÇEK');
      console.log('❌ Taban puanları: MOCK (örnek veriler)');
      console.log('❌ Üniversite/bölüm listesi: MOCK');
      
    } else {
      console.log('\n✅ Gerçek veriler mevcut!');
      console.log('🔄 Simple-server.js\'i gerçek veriler kullanacak şekilde güncelleyin');
    }
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  }
}

activateRealData();