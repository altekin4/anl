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
  console.log('⚠️  YÖK Atlas verileri yüklenemedi, mock veriler kullanılacak:', error.message);
}

// Polyfill for fetch in Node.js
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const PORT = 3001;

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
        sessionId: 'mock-session-' + Date.now(),
        userId: 'mock-user',
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
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: {
            code: 'PROCESSING_ERROR',
            message: 'Mesaj işlenirken hata oluştu'
          }
        }));
      }
    });
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
    console.log('🤖 Using Anthropic Claude for response generation');
    const anthropicResponse = await generateAnthropicResponse(userMessage);
    if (anthropicResponse) {
      return anthropicResponse;
    }
  } catch (error) {
    console.error('❌ Anthropic API Error:', error.message);

    // Return error response instead of mock
    return {
      intent: 'error',
      entities: {},
      message: `Üzgünüm, şu anda teknik bir sorun yaşıyorum. Lütfen daha sonra tekrar deneyin.\n\nHata: ${error.message}`,
      suggestions: ['Tekrar deneyin', 'Daha sonra tekrar gelin'],
      source: 'error'
    };
  }

  // This should never be reached
  throw new Error('No AI service available');
}

async function generateAnthropicResponse(userMessage) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  console.log('🔍 Checking Anthropic API key:', apiKey ? `Present (${apiKey.substring(0, 20)}...)` : 'Missing');
  console.log('🔍 All env vars:', Object.keys(process.env).filter(k => k.includes('ANTHROPIC')));

  if (!apiKey || apiKey === 'your_anthropic_api_key_here') {
    console.log('❌ Anthropic API key not configured, trying OpenAI');
    return null;
  }

  try {
    console.log('🤖 Trying Anthropic Claude API with message:', userMessage.substring(0, 50) + '...');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307',
        max_tokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS || '500'),
        messages: [
          {
            role: 'user',
            content: `Sen "Tercih Sihirbazı" adlı bir AI asistanısın. Türkiye'deki lise öğrencilerine üniversite tercih sürecinde yardımcı oluyorsun.

GÜNCEL VERİLER (2024):
- Taban puanları 2024 YÖK Atlas verilerine dayanıyor
- Bilgisayar Mühendisliği: SAY 535, EA 525 puan civarı
- Makine Mühendisliği: SAY 520, EA 510 puan civarı
- İşletme: SAY 495, EA 485 puan civarı
- Tıp: SAY 565, EA 555 puan civarı

GÖREVLER:
1. TYT/AYT net hesaplamaları (Doğru - Yanlış/4 formülü)
2. Üniversite ve bölüm bilgileri (2024 güncel)
3. Taban puan bilgileri (2024 YÖK Atlas verileri)
4. Tercih stratejileri ve tavsiyeleri
5. Başarılı öğrencilerden motivasyon hikayeleri

YANIT KURALLARI:
- Sadece Türkçe yanıt ver
- Samimi, destekleyici ve motive edici ol
- Net hesaplamalarında kesin formül kullan: Net = Doğru - (Yanlış ÷ 4)
- TYT: Türkçe(40), Matematik(40), Fen(20), Sosyal(20) soru
- AYT SAY: Matematik(40), Fizik(14), Kimya(13), Biyoloji(13) soru
- 2024 güncel verilerini kullan
- Emoji kullan ama abartma
- Kısa ve öz yanıtlar ver
- Örnekler ver

ÖZEL DURUMLAR:
- Net hesaplama sorularında mutlaka hesaplama yap
- Taban puan sorularında 2024 verilerini kullan
- Bölüm sorularında iş imkanlarından bahset
- Çalışma tavsiyesi sorularında başarılı öğrenci hikayeleri paylaş

Kullanıcı mesajı: "${userMessage}"`
          }
        ]
      })
    });

    if (response.ok) {
      const data = await response.json();
      const aiMessage = data.content[0].text;

      console.log('✅ Anthropic response received');

      // Classify intent based on message content
      const intent = classifyIntent(userMessage);
      const entities = extractEntities(userMessage);
      const suggestions = generateSuggestions(intent);

      return {
        intent,
        entities,
        message: aiMessage,
        suggestions,
        source: 'anthropic'
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

async function generateOpenAIResponse(userMessage) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || apiKey === 'demo-key') {
    console.log('OpenAI API key not configured, using enhanced mock responses');
    return null;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `Sen Tercih Sihirbazı'sın, Türkiye'deki üniversite tercih sürecinde öğrencilere yardımcı olan bir AI asistanısın. 

Görevlerin:
- Üniversite ve bölüm bilgileri vermek
- Net hesaplama yardımı yapmak
- Tercih stratejileri önermek
- Taban puanları hakkında bilgi vermek

Yanıt verirken:
- Türkçe kullan
- Samimi ve yardımsever ol
- Kısa ve net yanıtlar ver
- Örnekler ver
- Öğrenciyi motive et

Eğer kesin bilgi yoksa, genel tavsiyeler ver ve güncel verileri kontrol etmelerini söyle.`
          },
          {
            role: 'user',
            content: userMessage
          }
        ],
        max_tokens: 300,
        temperature: 0.7
      })
    });

    if (response.ok) {
      const data = await response.json();
      const aiMessage = data.choices[0].message.content;

      // Classify intent based on message content
      const intent = classifyIntent(userMessage);
      const entities = extractEntities(userMessage);
      const suggestions = generateSuggestions(intent);

      return {
        intent,
        entities,
        message: aiMessage,
        suggestions,
        source: 'openai'
      };
    } else {
      const error = await response.json();
      console.log('OpenAI API Error:', error);
      throw new Error(`OpenAI API Error: ${error.error?.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.log('OpenAI Request Error:', error.message);
    throw error;
  }
}

// Mock response generation (fallback)
function generateMockResponse(userMessage) {
  console.log('Generating mock response for:', userMessage);

  const intent = classifyIntent(userMessage);
  const entities = extractEntities(userMessage);

  console.log('Classified intent:', intent);
  console.log('Extracted entities:', entities);

  // Intent'e göre response oluştur
  switch (intent) {
    case 'tyt_calculation':
      return handleTYTCalculation(userMessage, entities);
    case 'ayt_calculation':
      return handleAYTCalculation(userMessage, entities);
    case 'study_advice':
      return handleStudyAdvice(userMessage, entities);
    case 'base_score':
      return handleBaseScoreInquiry(userMessage, entities);
    case 'department_search':
      return handleDepartmentSearch(userMessage, entities);
    case 'university_info':
      return handleUniversityInfo(userMessage, entities);
    case 'greeting':
      return handleGreeting();
    case 'thanks':
      return handleThanks();
    default:
      return handleGeneral(userMessage, entities);
  }
}

function handleTYTCalculation(userMessage, entities) {
  const numbers = userMessage.match(/\d+/g);

  if (!numbers || numbers.length === 0) {
    return {
      intent: 'tyt_calculation',
      entities: {},
      message: `📊 **TYT Net Hesaplama**

TYT net hesaplaması için doğru ve yanlış sayılarınızı belirtin:

**Örnek kullanım:**
• "TYT Türkçe 35 doğru 5 yanlış"
• "TYT Matematik 30 doğru 10 yanlış"
• "TYT Fen 25 doğru 15 yanlış"
• "TYT Sosyal 20 doğru 5 yanlış"

**TYT Soru Dağılımı:**
• **Türkçe:** 40 soru
• **Matematik:** 40 soru  
• **Fen Bilimleri:** 20 soru
• **Sosyal Bilimler:** 20 soru

Net hesaplama formülü: Doğru - (Yanlış ÷ 4)`,
      suggestions: ['TYT tam hesaplama yap', 'TYT hedef belirleme', 'TYT çalışma tavsiyesi'],
      source: 'mock'
    };
  }

  const correct = parseInt(numbers[0]);
  const wrong = numbers.length > 1 ? parseInt(numbers[1]) : Math.max(0, 40 - correct);
  const net = Math.max(0, correct - (wrong / 4));
  const score = 150 + (net * 3.5);

  const evaluation = net >= 30 ? '🌟 Harika! İyi bir performans.' :
    net >= 20 ? '📈 İyi! Biraz daha çalışmayla hedeflerinize ulaşabilirsiniz.' :
      '💪 Başlangıç seviyesi. Temel konulara odaklanın.';

  return {
    intent: 'tyt_calculation',
    entities: { correct, wrong, net: parseFloat(net.toFixed(2)) },
    message: `📊 **TYT Net Hesaplama Sonucu**

🎯 **Net Sonuçlarınız:**
• **${getSubjectFromMessage(userMessage) || 'Genel'}:** ${net.toFixed(1)} net (${correct} doğru, ${wrong} yanlış)

📈 **Tahmini TYT Puanı:** ${score.toFixed(1)} puan

💡 **Değerlendirme:**
${evaluation}

🎯 **Hedef Önerileri:**
• TYT Matematik için 30+ net hedefleyin
• Türkçe paragraf sorularına odaklanın
• Düzenli deneme sınavları çözün
• Zayıf alanlarınıza odaklanın

AYT hesaplaması da yapmak ister misiniz?`,
    suggestions: ['AYT hesaplama yap', 'TYT çalışma planı', 'Hedef üniversiteler'],
    source: 'mock'
  };
}

function handleAYTCalculation(userMessage, entities) {
  const numbers = userMessage.match(/\d+/g);

  if (!numbers || numbers.length === 0) {
    return {
      intent: 'ayt_calculation',
      entities: {},
      message: `📊 **AYT Net Hesaplama**

AYT net hesaplaması için alan türünüzü ve doğru/yanlış sayılarınızı belirtin:

**SAY Alanı (Sayısal):**
• **Matematik:** 40 soru
• **Fizik:** 14 soru
• **Kimya:** 13 soru
• **Biyoloji:** 13 soru

**EA Alanı (Eşit Ağırlık):**
• **Matematik:** 40 soru
• **Edebiyat:** 24 soru
• **Tarih:** 10 soru
• **Coğrafya:** 6 soru

**SÖZ Alanı (Sözel):**
• **Edebiyat:** 24 soru
• **Tarih:** 10 soru
• **Coğrafya:** 6 soru
• **Felsefe:** 12 soru
• **Din:** 6 soru

**Örnek:** "AYT SAY Matematik 35 doğru 5 yanlış"`,
      suggestions: ['AYT SAY hesaplama', 'AYT EA hesaplama', 'AYT SÖZ hesaplama'],
      source: 'mock'
    };
  }

  const correct = parseInt(numbers[0]);
  const wrong = numbers.length > 1 ? parseInt(numbers[1]) : Math.max(0, 40 - correct);
  const net = Math.max(0, correct - (wrong / 4));
  const score = 150 + (net * 4.2);

  const evaluation = net >= 25 ? '🌟 Mükemmel! Çok iyi bir performans.' :
    net >= 15 ? '📈 İyi! Biraz daha çalışmayla hedeflerinize ulaşabilirsiniz.' :
      '💪 Başlangıç seviyesi. Temel konuları güçlendirin.';

  return {
    intent: 'ayt_calculation',
    entities: { correct, wrong, net: parseFloat(net.toFixed(2)) },
    message: `📊 **AYT Net Hesaplama Sonucu**

🎯 **Net Sonuçlarınız:**
• **${getSubjectFromMessage(userMessage) || 'Genel'}:** ${net.toFixed(1)} net (${correct} doğru, ${wrong} yanlış)

📈 **Tahmini AYT Puanı:** ${score.toFixed(1)} puan

💡 **Değerlendirme:**
${evaluation}

🎯 **Hedef Önerileri:**
• AYT Matematik için 30+ net hedefleyin
• Fizik formüllerini sistematik çalışın
• Kimya reaksiyon sorularına odaklanın
• Biyoloji için sistematik ezber yapın

Başka bir alan hesaplaması yapmak ister misiniz?`,
    suggestions: ['Farklı alan hesapla', 'AYT çalışma planı', 'Bölüm önerileri'],
    source: 'mock'
  };
}

function handleStudyAdvice(userMessage, entities) {
  return {
    intent: 'study_advice',
    entities: {},
    message: `🎓 **Başarılı Öğrencilerden Tavsiyeler**

📚 **Aktif Çalışma Tekniği**
Sadece okumak yerine not alarak, özetleyerek ve kendinize sorular sorarak çalışın. Konuyu başkasına anlatabilecek seviyeye getirin.
👤 **Ahmet K. - İTÜ Bilgisayar Mühendisliği** - TYT: 115 net, AYT: 78 net ile İTÜ'ye yerleşti

📚 **Pomodoro Tekniği ile Verimlilik**
25 dakika odaklanarak çalış, 5 dakika mola ver. 4 pomodoro sonrası 30 dakika uzun mola. Bu teknikle konsantrasyonumu çok artırdım.
👤 **Zeynep M. - Boğaziçi İşletme** - EA puan türünde 520 puan alarak Boğaziçi'ne yerleşti

📚 **Hedef Görselleştirme**
Hedef üniversitenizin fotoğrafını çalışma masanıza asın. Her gün o hedefi görün ve motivasyonunuzu yüksek tutun.
👤 **Mehmet L. - ODTÜ Makine Mühendisliği** - SAY puan türünde 485 puan ile ODTÜ'ye yerleşti

💡 **Ek Öneriler:**
• Düzenli çalışma programı oluşturun
• Zayıf olduğunuz konulara odaklanın  
• Deneme sınavlarını düzenli çözün
• Motivasyonunuzu yüksek tutun

Hangi konuda daha detaylı tavsiye almak istersiniz?`,
    suggestions: ['Çalışma yöntemi', 'Zaman yönetimi', 'Motivasyon', 'Sınav stratejisi'],
    source: 'mock'
  };
}

function handleBaseScoreInquiry(userMessage, entities) {
  return {
    intent: 'base_score',
    entities: {},
    message: `📊 **2024 Güncel Taban Puan Bilgileri**

🎓 **Bilgisayar Mühendisliği (2024)**
• **SAY:** 535 puan (12K sıralama)
• **EA:** 525 puan (15K sıralama)
• **Kontenjan:** 120 kişi
• **Dil:** Türkçe

🎓 **Makine Mühendisliği (2024)**
• **SAY:** 520 puan (18K sıralama)
• **EA:** 510 puan (22K sıralama)
• **Kontenjan:** 100 kişi
• **Dil:** Türkçe

🎓 **Tıp Fakültesi (2024)**
• **SAY:** 565 puan (3K sıralama)
• **EA:** 555 puan (4K sıralama)
• **Kontenjan:** 80 kişi
• **Dil:** Türkçe

� **2n024 Trend Analizi:**
• 2023'e göre ortalama 20-25 puan artış
• Rekabet yoğunluğu maksimum seviyede
• Kontenjanlar genel olarak sabit

💡 **2024 Önerileri:**
• Güvenli tercih için taban puanın 30-40 puan üstünü hedefleyin
• Alternatif üniversiteleri mutlaka değerlendirin
• Burs imkanlarını araştırın
• Son güncelleme: 23 Ekim 2024

Başka üniversite veya bölüm bilgisi ister misiniz?`,
    suggestions: ['Alternatif üniversiteler', 'Burs imkanları', '2024 karşılaştırması'],
    source: 'mock'
  };
}

function handleDepartmentSearch(userMessage, entities) {
  return {
    intent: 'department_search',
    entities: {},
    message: `🎓 **Bölüm Listesi - Mühendislik Alanı**

📚 **Bilgisayar Mühendisliği**
• **Fakülte:** Mühendislik Fakültesi
• **Dil:** Türkçe
• **Taban Puan:** 485.5 (SAY)
• **Kontenjan:** 120 kişi
• **Özellik:** Yüksek iş imkanı

📚 **Yazılım Mühendisliği**
• **Fakülte:** Mühendislik Fakültesi
• **Dil:** %30 İngilizce
• **Taban Puan:** 475.2 (SAY)
• **Kontenjan:** 80 kişi
• **Özellik:** Güncel müfredat

💡 **Seçim Kriterleri:**
• İş imkanları ve sektör durumu
• Üniversitenin akademik kadrosu
• Laboratuvar ve teknik donanım
• Mezun memnuniyeti

Herhangi bir bölüm hakkında detaylı bilgi almak ister misiniz?`,
    suggestions: ['Bölüm detayları', 'İş imkanları', 'Benzer bölümler'],
    source: 'mock'
  };
}

function handleUniversityInfo(userMessage, entities) {
  return {
    intent: 'university_info',
    entities: {},
    message: `🏛️ **İstanbul Teknik Üniversitesi** Hakkında

📍 **Genel Bilgiler:**
• **Kuruluş:** 1773
• **Şehir:** İstanbul
• **Tür:** Devlet
• **Öğrenci Sayısı:** 35.000

🎓 **Akademik Bilgiler:**
• **Fakülte Sayısı:** 12
• **Bölüm Sayısı:** 85
• **Popüler Bölümler:** Bilgisayar Mühendisliği, Makine Mühendisliği, İnşaat Mühendisliği

🏆 **Öne Çıkan Özellikler:**
• Güçlü akademik kadro
• Modern laboratuvarlar
• Sanayi işbirlikleri
• Uluslararası değişim programları

📊 **Sıralama Bilgileri:**
• **Ulusal Sıralama:** 3
• **Uluslararası Sıralama:** 500-600

Bu üniversitenin belirli bir bölümü hakkında bilgi almak ister misiniz?`,
    suggestions: ['İTÜ bölümleri', 'İTÜ taban puanları', 'Kampüs yaşamı'],
    source: 'mock'
  };
}

function handleGreeting() {
  return {
    intent: 'greeting',
    entities: {},
    message: `Merhaba! 👋 Tercih Sihirbazı'na hoş geldiniz! 

Size üniversite tercihleri konusunda yardımcı olmak için buradayım. Şunları yapabilirim:

📊 **TYT/AYT Hesaplama:** "TYT netimi hesapla" veya "AYT SAY hesaplama"
🎯 **Net Hesaplama:** "Bilgisayar mühendisliği için kaç net gerekir?"
📈 **Taban Puanları:** "İTÜ taban puanları nedir?" (Güncel YÖK Atlas verileri)
🏛️ **Üniversite Bilgileri:** "Boğaziçi Üniversitesi hakkında bilgi ver"
📚 **Bölüm Arama:** "Mühendislik bölümleri nelerdir?"
💡 **Çalışma Tavsiyeleri:** "Başarılı öğrencilerden tavsiye al"

Hangi konuda yardım almak istersiniz?`,
    suggestions: ['TYT netimi hesapla', 'AYT hesaplama yap', 'Taban puanları göster', 'Çalışma tavsiyesi al'],
    source: 'mock'
  };
}

function handleThanks() {
  return {
    intent: 'thanks',
    entities: {},
    message: `Rica ederim! 😊 

Başka sorularınız olursa çekinmeden sorun. Size yardımcı olmak için buradayım!

🎓 Tercih sürecinizde başarılar dilerim!`,
    suggestions: ['Başka soru sor', 'Tercih stratejisi', 'Bölüm karşılaştırması'],
    source: 'mock'
  };
}

function handleGeneral(userMessage, entities) {
  return {
    intent: 'general',
    entities: {},
    message: `Anladığım kadarıyla "${userMessage}" hakkında bilgi istiyorsunuz.

Size daha iyi yardımcı olabilmem için sorunuzu şu şekillerde sorabilirsiniz:

📊 **TYT/AYT Hesaplama:** 
• "TYT Matematik 35 doğru 5 yanlış"
• "AYT SAY hesaplama yap"

🎯 **Net Hesaplama:** "X bölümü için kaç net gerekir?"
📈 **Taban Puanları:** "Y üniversitesi taban puanları" (Güncel YÖK Atlas verileri)
🏛️ **Üniversite Bilgisi:** "Z üniversitesi hakkında bilgi"
📚 **Bölüm Arama:** "Mühendislik bölümleri nelerdir?"
💡 **Çalışma Tavsiyeleri:** "Başarılı öğrencilerden tavsiye"

Hangi konuda yardım almak istersiniz?`,
    suggestions: ['TYT netimi hesapla', 'AYT hesaplama', 'Taban puanları', 'Çalışma tavsiyesi'],
    source: 'mock'
  };
}

function classifyIntent(message) {
  const lowerMessage = message.toLowerCase();

  // Greeting patterns
  if (lowerMessage.includes('merhaba') || lowerMessage.includes('selam') ||
    lowerMessage.includes('hello') || lowerMessage.includes('hi') ||
    lowerMessage.includes('hoş geldin') || lowerMessage.includes('başla')) {
    return 'greeting';
  }

  // Thanks patterns
  if (lowerMessage.includes('teşekkür') || lowerMessage.includes('sağol') ||
    lowerMessage.includes('thanks') || lowerMessage.includes('thank you')) {
    return 'thanks';
  }

  // TYT/AYT specific intents
  if (lowerMessage.includes('tyt')) {
    return 'tyt_calculation';
  }

  if (lowerMessage.includes('ayt')) {
    return 'ayt_calculation';
  }

  // Study advice patterns
  if (lowerMessage.includes('tavsiye') || lowerMessage.includes('başarılı öğrenci') ||
    lowerMessage.includes('motivasyon') || lowerMessage.includes('nasıl çalış') ||
    lowerMessage.includes('çalışma yöntemi') || lowerMessage.includes('strateji') ||
    lowerMessage.includes('zaman yönetimi')) {
    return 'study_advice';
  }

  // Base score patterns
  if (lowerMessage.includes('taban puan') ||
    (lowerMessage.includes('taban') && lowerMessage.includes('puan')) ||
    lowerMessage.includes('geçen yıl puan') ||
    (lowerMessage.includes('üniversite') && lowerMessage.includes('puan'))) {
    return 'base_score';
  }

  // Department search patterns
  if (lowerMessage.includes('bölüm') || lowerMessage.includes('hangi bölüm') ||
    lowerMessage.includes('mühendislik') || lowerMessage.includes('fakülte') ||
    lowerMessage.includes('hangi alan')) {
    return 'department_search';
  }

  // University info patterns
  if (lowerMessage.includes('üniversite hakkında') ||
    lowerMessage.includes('üniversite bilgi') ||
    (lowerMessage.includes('itü') || lowerMessage.includes('odtü') ||
      lowerMessage.includes('boğaziçi')) && lowerMessage.includes('hakkında')) {
    return 'university_info';
  }

  // Net calculation patterns (more general)
  if (lowerMessage.includes('net') || lowerMessage.includes('hesap') ||
    lowerMessage.includes('doğru') || lowerMessage.includes('yanlış') ||
    lowerMessage.includes('kaç soru')) {
    return 'tyt_calculation'; // Default to TYT if not specified
  }

  return 'general';
}

function extractEntities(message) {
  const entities = {};
  const lowerMessage = message.toLowerCase();

  // University detection
  const universities = ['itü', 'odtü', 'boğaziçi', 'marmara', 'istanbul', 'ankara', 'gazi', 'hacettepe'];
  for (const uni of universities) {
    if (lowerMessage.includes(uni)) {
      entities.university = uni.toUpperCase();
      break;
    }
  }

  // Department detection
  const departments = ['bilgisayar', 'elektrik', 'makine', 'işletme', 'hukuk', 'tıp', 'mühendislik'];
  for (const dept of departments) {
    if (lowerMessage.includes(dept)) {
      entities.department = dept;
      break;
    }
  }

  // Numbers extraction
  const numbers = message.match(/\d+/g);
  if (numbers) {
    entities.numbers = numbers.map(n => parseInt(n));
  }

  return entities;
}

function generateSuggestions(intent) {
  const suggestions = {
    'tyt_calculation': ['AYT hesaplama yap', 'TYT çalışma planı', 'Hedef üniversiteler'],
    'ayt_calculation': ['TYT hesaplama yap', 'AYT çalışma planı', 'Bölüm önerileri'],
    'study_advice': ['Çalışma yöntemi', 'Zaman yönetimi', 'Motivasyon', 'Sınav stratejisi'],
    'base_score': ['Kontenjan bilgisi', 'Benzer bölümler', 'Geçmiş yıl karşılaştırması'],
    'greeting': ['TYT netimi hesapla', 'AYT hesaplama yap', 'Çalışma tavsiyesi al'],
    'general': ['TYT netimi hesapla', 'AYT hesaplama', 'Çalışma tavsiyesi']
  };

  return suggestions[intent] || suggestions['general'];
}

function getSubjectFromMessage(message) {
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes('matematik')) return 'Matematik';
  if (lowerMessage.includes('türkçe')) return 'Türkçe';
  if (lowerMessage.includes('fen')) return 'Fen';
  if (lowerMessage.includes('sosyal')) return 'Sosyal';
  if (lowerMessage.includes('fizik')) return 'Fizik';
  if (lowerMessage.includes('kimya')) return 'Kimya';
  if (lowerMessage.includes('biyoloji')) return 'Biyoloji';
  return null;
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
  console.log('  ✅ Anthropic Claude API (2024 güncel veriler)');
  console.log('  ✅ Chat interface');
  console.log('  ✅ Responsive tasarım');
  console.log('  ✅ 2024 YÖK Atlas verileri');
  console.log('🔗 Tarayıcınızda http://localhost:3001 adresini açın');
});