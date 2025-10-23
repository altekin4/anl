const http = require('http');
const fs = require('fs');
const path = require('path');

// Load environment variables
try {
  require('dotenv').config();
} catch (error) {
  console.log('dotenv not installed, using environment variables');
}

// Load YÖK Atlas data
let universitiesData = [];
let departmentsData = [];
let scoresData = [];

try {
  universitiesData = JSON.parse(fs.readFileSync('./data/universities.json', 'utf8'));
  departmentsData = JSON.parse(fs.readFileSync('./data/departments.json', 'utf8'));
  scoresData = JSON.parse(fs.readFileSync('./data/scores.json', 'utf8'));
  console.log('✅ YÖK Atlas verileri yüklendi:', {
    universities: universitiesData.length,
    departments: departmentsData.length,
    scores: scoresData.length
  });
} catch (error) {
  console.log('⚠️  YÖK Atlas verileri yüklenemedi, devam ediliyor:', error.message);
}

// Polyfill for fetch in Node.js
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const PORT = process.env.PORT || 3002;

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

  const url = req.url;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // API Routes - More specific routes first
  if (url === '/api/chat/sessions' && req.method === 'POST') {
    console.log('📝 Session creation endpoint hit');
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      data: {
        sessionId: 'claude-session-' + Date.now(),
        userId: 'claude-user',
        createdAt: new Date().toISOString(),
        isActive: true
      }
    }));
    return;
  }

  if (url.includes('/messages') && req.method === 'POST') {
    console.log('📨 Messages endpoint hit:', url);
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      console.log('📦 Message body:', body);
      try {
        const data = JSON.parse(body);
        const response = await generateResponse(data.content);
        
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: true,
          data: {
            userMessage: {
              content: data.content,
              type: 'user',
              timestamp: new Date().toISOString()
            },
            botMessage: {
              content: response.message,
              type: 'bot',
              timestamp: new Date().toISOString(),
              metadata: {
                intent: response.intent,
                entities: response.entities
              }
            },
            // Backward compatibility
            message: response.message,
            intent: response.intent,
            entities: response.entities,
            suggestions: response.suggestions
          }
        }));
      } catch (error) {
        console.error('❌ Error processing message:', error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: {
            code: 'PROCESSING_ERROR',
            message: 'Mesaj işlenirken hata oluştu: ' + error.message
          }
        }));
      }
    });
    return;
  }

  // YÖK Atlas data endpoint
  if (url === '/api/data/universities' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      success: true,
      data: universitiesData
    }));
    return;
  }

  if (url === '/api/data/departments' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      success: true,
      data: departmentsData
    }));
    return;
  }

  if (url === '/api/data/scores' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      success: true,
      data: scoresData
    }));
    return;
  }

  // General chat endpoint (fallback)
  if (url.startsWith('/api/chat') && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const response = await generateResponse(data.message);
        
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: true,
          content: response.message,
          intent: response.intent,
          entities: response.entities,
          suggestions: response.suggestions
        }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: {
            code: 'INVALID_JSON',
            message: 'Geçersiz JSON formatı'
          }
        }));
      }
    });
    return;
  }

  // Static file serving
  let filePath = path.join(__dirname, 'public', url === '/' ? 'index.html' : url);
  
  // Security check
  if (!filePath.startsWith(path.join(__dirname, 'public'))) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  try {
    const stats = fs.statSync(filePath);
    
    if (stats.isFile()) {
      const ext = path.extname(filePath);
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      
      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File not found');
    }
  } catch (error) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('File not found');
  }
});

// AI Response Generation - Only Anthropic Claude
async function generateResponse(userMessage) {
  try {
    console.log('🤖 Using Anthropic Claude for:', userMessage);
    const anthropicResponse = await generateAnthropicResponse(userMessage);
    if (anthropicResponse) {
      return anthropicResponse;
    }
  } catch (error) {
    console.error('❌ Anthropic API Error:', error.message);
    
    // Return error response
    return {
      intent: 'error',
      entities: {},
      message: `Üzgünüm, şu anda teknik bir sorun yaşıyorum. Lütfen daha sonra tekrar deneyin.\n\nDetay: ${error.message}`,
      suggestions: ['Tekrar deneyin', 'Daha sonra tekrar gelin'],
      source: 'error'
    };
  }
  
  throw new Error('No AI service available');
}

function generateSmartDemoResponse(userMessage) {
  const lowerMessage = userMessage.toLowerCase();
  
  // TYT Net Hesaplama
  if (lowerMessage.includes('tyt') || (lowerMessage.includes('matematik') && lowerMessage.includes('doğru'))) {
    const numbers = userMessage.match(/\d+/g);
    if (numbers && numbers.length >= 2) {
      const correct = parseInt(numbers[0]);
      const wrong = parseInt(numbers[1]);
      const net = Math.max(0, correct - (wrong / 4));
      const score = net * 1.34;
      
      return {
        intent: 'tyt_calculation',
        entities: { correct, wrong, net },
        message: `📊 **TYT Net Hesaplama Sonucu**

🎯 **Matematik:** ${net.toFixed(2)} net (${correct} doğru, ${wrong} yanlış)
📈 **TYT Puanı:** ${score.toFixed(1)} puan (Net × 1.34)

💡 **Değerlendirme:**
${net >= 30 ? '🌟 Mükemmel! Çok iyi bir performans.' : net >= 20 ? '📈 İyi! Biraz daha çalışmayla hedeflerinize ulaşabilirsiniz.' : '💪 Başlangıç seviyesi. Temel konulara odaklanın.'}

🎯 **Hedef Öneriler:**
• TYT'de toplam 100+ net hedefleyin
• Diğer derslerde de bu performansı koruyun
• Düzenli deneme sınavları çözün

*Claude AI ile güçlendirilmiş Tercih Sihirbazı*`,
        suggestions: ['AYT hesaplama', 'Diğer dersler', 'Çalışma tavsiyesi'],
        source: 'claude_demo'
      };
    }
  }
  
  // AYT Net Hesaplama
  if (lowerMessage.includes('ayt')) {
    const numbers = userMessage.match(/\d+/g);
    if (numbers && numbers.length >= 2) {
      const correct = parseInt(numbers[0]);
      const wrong = parseInt(numbers[1]);
      const net = Math.max(0, correct - (wrong / 4));
      const score = net * 3;
      
      return {
        intent: 'ayt_calculation',
        entities: { correct, wrong, net },
        message: `📊 **AYT Net Hesaplama Sonucu**

🎯 **${lowerMessage.includes('matematik') ? 'Matematik' : 'Genel'}:** ${net.toFixed(2)} net (${correct} doğru, ${wrong} yanlış)
📈 **AYT Puanı:** ${score.toFixed(1)} puan (Net × 3)

💡 **Değerlendirme:**
${net >= 25 ? '🌟 Mükemmel! Çok iyi bir performans.' : net >= 15 ? '📈 İyi! Biraz daha çalışmayla hedeflerinize ulaşabilirsiniz.' : '💪 Başlangıç seviyesi. Temel konuları güçlendirin.'}

🎯 **SAY Alanı Önerileri:**
• Matematik: 30+ net hedefleyin
• Fizik: Formül ve problem çözme
• Kimya: Reaksiyon ve hesaplama
• Biyoloji: Sistematik ezber

*Claude AI ile güçlendirilmiş Tercih Sihirbazı*`,
        suggestions: ['TYT hesaplama', 'Bölüm önerileri', 'Çalışma planı'],
        source: 'claude_demo'
      };
    }
  }
  
  // Çalışma Tavsiyesi
  if (lowerMessage.includes('tavsiye') || lowerMessage.includes('nasıl çalış') || lowerMessage.includes('başarılı')) {
    return {
      intent: 'study_advice',
      entities: {},
      message: `🎓 **Başarılı Öğrencilerden Tavsiyeler**

📚 **Aktif Çalışma Yöntemi**
"Sadece okumak yerine not alarak, özetleyerek çalışın. Konuyu başkasına anlatabilecek seviyeye getirin."
👤 **Ahmet K. - İTÜ Bilgisayar Mühendisliği** (TYT: 115 net, AYT: 78 net)

⏰ **Pomodoro Tekniği**
"25 dakika odaklanarak çalış, 5 dakika mola ver. Bu teknikle konsantrasyonumu çok artırdım."
👤 **Zeynep M. - Boğaziçi İşletme** (EA: 520 puan)

🎯 **Hedef Görselleştirme**
"Hedef üniversitenizin fotoğrafını çalışma masanıza asın. Motivasyonunuzu yüksek tutun."
👤 **Mehmet L. - ODTÜ Makine Mühendisliği** (SAY: 485 puan)

💡 **Ek Öneriler:**
• Düzenli çalışma programı oluşturun
• Zayıf konulara odaklanın
• Deneme sınavlarını düzenli çözün

*Claude AI ile güçlendirilmiş Tercih Sihirbazı*`,
      suggestions: ['Net hesaplama', 'Zaman yönetimi', 'Motivasyon'],
      source: 'claude_demo'
    };
  }
  
  // Bölüm/Üniversite Bilgisi
  if (lowerMessage.includes('bölüm') || lowerMessage.includes('üniversite') || lowerMessage.includes('taban puan')) {
    return {
      intent: 'university_info',
      entities: {},
      message: `🏛️ **Üniversite ve Bölüm Rehberi**

🎓 **Popüler Mühendislik Bölümleri:**
• **Bilgisayar Mühendisliği:** 480-520 puan (SAY)
• **Elektrik-Elektronik:** 460-500 puan (SAY)
• **Makine Mühendisliği:** 450-490 puan (SAY)
• **Endüstri Mühendisliği:** 470-510 puan (SAY)

📊 **Tıp Fakülteleri:**
• **Hacettepe Tıp:** 550+ puan (SAY)
• **İstanbul Tıp:** 540+ puan (SAY)
• **Ankara Tıp:** 535+ puan (SAY)

💼 **İş İmkanları:**
• Mühendislik: Yüksek istihdam, teknoloji sektörü
• Tıp: Garantili iş, prestijli meslek
• İşletme: Geniş kariyer seçenekleri

⚠️ **Not:** Güncel taban puanları için YÖK Atlas'ı kontrol edin.

*Claude AI ile güçlendirilmiş Tercih Sihirbazı*`,
      suggestions: ['Net hesaplama', 'Tercih stratejisi', 'Çalışma planı'],
      source: 'claude_demo'
    };
  }
  
  // Karşılama
  if (lowerMessage.includes('merhaba') || lowerMessage.includes('selam') || lowerMessage.includes('hoş geldin')) {
    return {
      intent: 'greeting',
      entities: {},
      message: `Merhaba! 👋 Ben Tercih Sihirbazı, Claude AI ile güçlendirilmiş üniversite tercih danışmanınızım!

🎯 **Size nasıl yardımcı olabilirim:**

📊 **Net Hesaplama:**
• "TYT matematik 35 doğru 5 yanlış"
• "AYT SAY fizik 12 doğru 2 yanlış"

🏛️ **Üniversite Bilgileri:**
• "İTÜ Bilgisayar Mühendisliği taban puanı"
• "Tıp fakülteleri hakkında bilgi"

💡 **Çalışma Tavsiyeleri:**
• "Başarılı öğrencilerden tavsiye"
• "Matematik nasıl çalışılır"

🎓 **Tercih Stratejileri:**
• "Tercih listesi nasıl yapılır"
• "Güvenli tercih nedir"

Hangi konuda yardım almak istersiniz?

*Claude AI ile güçlendirilmiş Tercih Sihirbazı*`,
      suggestions: ['Net hesaplama', 'Bölüm bilgisi', 'Çalışma tavsiyesi', 'Tercih stratejisi'],
      source: 'claude_demo'
    };
  }
  
  // Genel Cevap
  return {
    intent: 'general',
    entities: {},
    message: `Anladığım kadarıyla "${userMessage}" hakkında bilgi istiyorsunuz.

🎯 **Size şu konularda yardımcı olabilirim:**

📊 **Net Hesaplama:** "TYT matematik 35 doğru 5 yanlış hesapla"
🏛️ **Üniversite Bilgileri:** "İTÜ hakkında bilgi ver"
📚 **Bölüm Rehberi:** "Mühendislik bölümleri nelerdir"
💡 **Çalışma Tavsiyeleri:** "Nasıl çalışmalıyım"
🎓 **Tercih Stratejisi:** "Tercih listesi nasıl yapılır"

Lütfen sorunuzu daha spesifik olarak sorar mısınız?

*Claude AI ile güçlendirilmiş Tercih Sihirbazı*`,
    suggestions: ['Net hesaplama', 'Üniversite bilgisi', 'Çalışma tavsiyesi'],
    source: 'claude_demo'
  };
}

async function generateAnthropicResponse(userMessage) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  console.log('🔑 API Key check:', apiKey ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 10)}` : 'NOT FOUND');
  
  if (!apiKey || apiKey === 'sk-ant-api03-your-actual-key-here') {
    console.log('⚠️ Anthropic API key not configured, using smart demo mode');
    return generateSmartDemoResponse(userMessage);
  }

  try {
    console.log('🤖 Calling Anthropic Claude API...');
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307',
        max_tokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS || '2000'),
        messages: [
          {
            role: 'user',
            content: `Sen "Tercih Sihirbazı" adlı bir AI asistanısın. Türkiye'deki lise öğrencilerine YKS (Yükseköğretim Kurumları Sınavı) sürecinde yardımcı oluyorsun.

GÖREVLER:
1. YKS net hesaplamaları ve puan hesaplamaları (Güncellenmiş sistem)
2. Üniversite ve bölüm bilgileri
3. Taban puan bilgileri (YÖK Atlas verileri)
4. Tercih stratejileri ve tavsiyeleri
5. Başarılı öğrencilerden motivasyon hikayeleri

YKS HESAPLAMA SİSTEMİ (YENİ GÜNCEL FORMÜL):

A. GENEL KURALLAR:
1. Net hesaplama: Net = Doğru - (Yanlış ÷ 4) (Her test için)
2. Diploma/OBP sabiti: Diploma = 90 (varsayılan)
   - OBP = Diploma × 5 = 90 × 5 = 450
   - OBP Katkısı = OBP × 0.12 = 450 × 0.12 = 54 puan
3. Final puan aralığı: 100-560
   - Her öğrenci 100 puanla başlar
   - TYT maksimum katkı: 160 puan (0-160 arası)
   - AYT maksimum katkı: 240 puan (0-240 arası)
   - OBP maksimum katkı: 60 puan (bizim sabit: 54)

B. NET → BÖLÜM PUANINA DÖNÜŞÜM:
1. TYT Bölüm Puanı (0-160):
   - TYT_net_toplam = Türkçe_net + TemelMat_net + Sosyal_net + Fen_net
   - TYT_max_net = 120 (tüm TYT soruları doğru olduğunda)
   - TYT_scaled = (TYT_net_toplam / TYT_max_net) × 160

2. AYT Bölüm Puanı (0-240):
   - SAY için: Matematik + Fizik + Kimya + Biyoloji netleri
   - EA için: Matematik + Edebiyat + Tarih + Coğrafya netleri
   - SÖZ için: Edebiyat + Tarih + Coğrafya + Felsefe netleri
   - AYT_scaled = (AYT_net_toplam / AYT_max_net) × 240

C. NİHAİ PUAN HESABI:
1. Başlangıç = 100
2. Nihai Puan = 100 + TYT_scaled + AYT_scaled + OBP_katkısı
3. Sadece TYT: Nihai = 100 + TYT_scaled + 54
4. DİL puanı: Nihai = 100 + TYT_scaled + YDT_scaled + 54

SORU DAĞILIMLARI:
- TYT (120 soru): Türkçe(40), Matematik(40), Fen(20), Sosyal(20)
- AYT: Matematik(40), Fizik(14), Kimya(13), Biyoloji(13), Edebiyat(24), Tarih(10), Coğrafya(6), Felsefe(12), Din(6)
- YDT: 80 soru

YANIT KURALLARI:
- Sadece Türkçe yanıt ver
- Kullanıcının sorusuna direkt cevap ver
- Hesaplama formüllerini açıklama, sadece sonucu söyle
- Net hesaplama: Sadece "X net" de, formül gösterme
- Puan hesaplama: Sadece nihai puanı söyle
- Kısa, net ve öz cevaplar ver
- Gereksiz açıklama yapma
- Samimi ve destekleyici ol
- Emoji kullan ama abartma
- Tam cevap ver, kesme

YÖK ATLAS VERİLERİ:
- Gerçek üniversite, bölüm ve taban puan verileri mevcut
- Taban puan sorularında gerçek verileri kullan
- Üniversite/bölüm sorularında güncel bilgileri ver
- "YÖK Atlas verilerine göre" ifadesini kullan
- Veri sayıları: ${universitiesData.length} üniversite, ${departmentsData.length} bölüm, ${scoresData.length} taban puan verisi

ÖZEL DURUMLAR:
- Net hesaplama sorularında mutlaka hesaplama yap
- Puan hesaplamalarında scaled değerleri göster
- Taban puan sorularında YÖK Atlas verilerini kullan
- Çalışma tavsiyesi sorularında başarılı öğrenci hikayeleri paylaş

Kullanıcı mesajı: "${userMessage}"`
          }
        ]
      })
    });

    if (response.ok) {
      const data = await response.json();
      const aiMessage = data.content[0].text;
      
      console.log('✅ Anthropic response received:', aiMessage.substring(0, 100) + '...');
      
      return {
        intent: 'claude_response',
        entities: {},
        message: aiMessage,
        suggestions: ['Başka soru sor', 'Net hesaplama yap', 'Bölüm bilgisi al'],
        source: 'anthropic',
        dataStats: {
          universities: universitiesData.length,
          departments: departmentsData.length,
          scores: scoresData.length
        }
      };
    } else {
      const error = await response.json();
      console.log('❌ Anthropic API Error:', error);
      throw new Error(`Anthropic API Error: ${error.error?.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.log('💥 Anthropic Request Error:', error.message);
    throw error;
  }
}

server.listen(PORT, () => {
  console.log('✅ YÖK Atlas verileri yüklendi:', {
    universities: universitiesData.length,
    departments: departmentsData.length,
    scores: scoresData.length
  });
  console.log('🚀 Tercih Sihirbazı sunucusu başlatıldı!');
  console.log('🌐 URL: http://localhost:' + PORT);
  console.log('📁 Dosyalar: ' + __dirname + '/public');
  console.log('⏰ Başlatma zamanı: ' + new Date().toLocaleString('tr-TR'));
  console.log('');
  console.log('📊 Mevcut özellikler:');
  console.log('  ✅ Static dosya servisi');
  console.log('  ✅ Anthropic Claude API');
  console.log('  ✅ Chat interface');
  console.log('  ✅ Responsive tasarım');
  console.log('🔗 Tarayıcınızda http://localhost:3001 adresini açın');
});