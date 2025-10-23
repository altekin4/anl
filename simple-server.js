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
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

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

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  let filePath = req.url === '/' ? '/index.html' : req.url;
  
  // Remove query parameters
  filePath = filePath.split('?')[0];
  
  // Security: prevent directory traversal
  if (filePath.includes('..')) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // Try to serve from public directory first
  let fullPath = path.join(__dirname, 'public', filePath);
  
  // If not found in public, try root directory
  if (!fs.existsSync(fullPath)) {
    fullPath = path.join(__dirname, filePath);
  }

  // API endpoints (mock responses)
  if (req.url.startsWith('/api/')) {
    await handleApiRequest(req, res);
    return;
  }

  // Health check
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'mock',
        cache: 'disabled'
      }
    }));
    return;
  }

  // Serve static files
  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>404 - Sayfa Bulunamadı</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            h1 { color: #e74c3c; }
            a { color: #3498db; text-decoration: none; }
          </style>
        </head>
        <body>
          <h1>404 - Sayfa Bulunamadı</h1>
          <p>Aradığınız sayfa bulunamadı.</p>
          <a href="/">Ana Sayfaya Dön</a>
        </body>
        </html>
      `);
      return;
    }

    const ext = path.extname(fullPath);
    const contentType = mimeTypes[ext] || 'text/plain';
    
    res.writeHead(200, { 
      'Content-Type': contentType + (contentType.startsWith('text/') ? '; charset=utf-8' : '')
    });
    res.end(data);
  });
});

async function handleApiRequest(req, res) {
  const url = req.url;
  
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }
  
  // Basit /api/chat endpoint'i
  if (url === '/api/chat' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const response = await generateResponse(data.message);
        
        res.writeHead(200, { 
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        });
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
          error: error.message
        }));
      }
    });
    return;
  }
  
  // Mock API responses
  if (url.startsWith('/api/chat/sessions') && url.endsWith('/messages') && req.method === 'POST') {
    // Handle session messages
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const response = await generateResponse(data.content);
        
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: true,
          data: {
            message: response.message,
            intent: response.intent,
            entities: response.entities,
            suggestions: response.suggestions,
            source: response.source
          }
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

  if (url.startsWith('/api/chat/sessions') && req.method === 'POST') {
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
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const response = await generateResponse(data.content);
        
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: true,
          data: {
            message: response.message,
            intent: response.intent,
            entities: response.entities,
            suggestions: response.suggestions,
            source: response.source
          }
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

  // Default API response
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    success: true,
    message: 'Mock API endpoint',
    timestamp: new Date().toISOString()
  }));
}

// OpenAI API integration with fallback to mock responses
async function generateResponse(userMessage) {
  // Try OpenAI first, fallback to mock if fails
  try {
    const openaiResponse = await generateOpenAIResponse(userMessage);
    if (openaiResponse) {
      return openaiResponse;
    }
  } catch (error) {
    console.log('OpenAI failed, using mock response:', error.message);
  }
  
  // Fallback to mock responses
  return generateMockResponse(userMessage);
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
    return null;
  }
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
  
  // Score type detection
  if (lowerMessage.includes('say') || lowerMessage.includes('fen')) {
    entities.scoreType = 'SAY';
  } else if (lowerMessage.includes('ea') || lowerMessage.includes('eşit ağırlık')) {
    entities.scoreType = 'EA';
  } else if (lowerMessage.includes('söz') || lowerMessage.includes('sosyal')) {
    entities.scoreType = 'SÖZ';
  }
  
  return entities;
}

function generateSuggestions(intent) {
  const suggestions = {
    'tyt_calculation': ['AYT hesaplama yap', 'TYT çalışma planı', 'Hedef üniversiteler'],
    'ayt_calculation': ['TYT hesaplama yap', 'AYT çalışma planı', 'Bölüm önerileri'],
    'study_advice': ['Çalışma yöntemi', 'Zaman yönetimi', 'Motivasyon', 'Sınav stratejisi'],
    'net_calculation': ['Hedef puanınızı belirtin', 'Hangi sınav türü?', 'Geçmiş yıl verilerini göster'],
    'base_score': ['Kontenjan bilgisi', 'Benzer bölümler', 'Geçmiş yıl karşılaştırması'],
    'quota_inquiry': ['Taban puanı', 'Benzer bölümler', 'Tercih stratejisi'],
    'department_search': ['Popüler bölümler', 'Puan aralıkları', 'Tercih önerileri'],
    'help': ['Net hesaplama', 'Bölüm öner', 'Üniversite ara'],
    'greeting': ['TYT netimi hesapla', 'AYT hesaplama yap', 'Çalışma tavsiyesi al'],
    'general': ['TYT netimi hesapla', 'AYT hesaplama', 'Çalışma tavsiyesi']
  };
  
  return suggestions[intent] || suggestions['general'];
}

function generateMockResponse(userMessage) {
  console.log('Generating mock response for:', userMessage);
  
  const message = userMessage.toLowerCase();
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
    message: `📊 **Taban Puan Bilgileri**

🎓 **Bilgisayar Mühendisliği**
• **SAY:** 485.5 puan (15K sıralama)
• **EA:** 475.2 puan (18K sıralama)
• **Kontenjan:** 120 kişi
• **Dil:** Türkçe

🎓 **Makine Mühendisliği**
• **SAY:** 465.8 puan (25K sıralama)
• **EA:** 455.1 puan (28K sıralama)
• **Kontenjan:** 100 kişi
• **Dil:** Türkçe

📈 **Trend Analizi:**
• Geçen yıla göre ortalama 15-20 puan artış
• Kontenjanlar sabit kaldı
• Rekabet yoğunluğu arttı

💡 **Öneriler:**
• Güvenli tercih için taban puanın 20-30 puan üstünü hedefleyin
• Alternatif üniversiteleri de değerlendirin
• Burs imkanlarını araştırın

Başka üniversite veya bölüm bilgisi ister misiniz?`,
    suggestions: ['Alternatif üniversiteler', 'Burs imkanları', 'Geçen yıl karşılaştırması'],
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
• Matematik: 40 soru  
• Fen Bilimleri: 20 soru
• Sosyal Bilimler: 20 soru

Net hesaplama formülü: Doğru - (Yanlış ÷ 4)`,
        suggestions: ['TYT tam hesaplama yap', 'TYT hedef belirleme', 'TYT çalışma tavsiyesi'],
        source: 'mock'
      };
    }
  }
  
  // AYT Hesaplama
  if (message.includes('ayt')) {
    const numbers = message.match(/\d+/g);
    if (numbers && numbers.length >= 1) {
      const correct = parseInt(numbers[0]);
      const wrong = numbers.length > 1 ? parseInt(numbers[1]) : 0;
      const net = Math.max(0, correct - (wrong / 4));
      
      return {
        intent: 'ayt_calculation',
        entities: { correct, wrong, net },
        message: `📊 AYT Net Hesaplama Sonucu:

🎯 ${correct} doğru, ${wrong} yanlış → ${net.toFixed(1)} net

💡 Değerlendirme: ${net >= 25 ? '🌟 Mükemmel! Çok iyi bir performans.' : '📈 Biraz daha çalışmayla hedeflerinize ulaşabilirsiniz.'}

🎯 Hedef Öneriler:
• AYT Matematik için 30+ net hedefleyin
• Fizik formüllerini sistematik çalışın
• Kimya reaksiyon sorularına odaklanın

Başka bir alan hesaplaması yapmak ister misiniz?`,
        suggestions: ['Farklı alan hesapla', 'AYT çalışma planı', 'Bölüm önerileri'],
        source: 'mock'
      };
    } else {
      return {
        intent: 'ayt_calculation',
        entities: {},
        message: `📊 AYT Net Hesaplama

AYT net hesaplaması için alan türünüzü ve doğru/yanlış sayılarınızı belirtin:

**SAY Alanı (Sayısal):**
• Matematik: 40 soru
• Fizik: 14 soru
• Kimya: 13 soru
• Biyoloji: 13 soru

**EA Alanı (Eşit Ağırlık):**
• Matematik: 40 soru
• Edebiyat: 24 soru
• Tarih: 10 soru
• Coğrafya: 6 soru

**Örnek:** "AYT SAY Matematik 35 doğru 5 yanlış"`,
        suggestions: ['AYT SAY hesaplama', 'AYT EA hesaplama', 'AYT SÖZ hesaplama'],
        source: 'mock'
      };
    }
  }
  
  // Çalışma Tavsiyeleri
  if (message.includes('tavsiye') || message.includes('başarılı öğrenci') || 
      message.includes('nasıl çalış') || message.includes('çalışmalı') || 
      message.includes('motivasyon')) {
    return {
      intent: 'study_advice',
      entities: {},
      message: `🎓 Başarılı Öğrencilerden Tavsiyeler

📚 **Aktif Çalışma Tekniği**
Sadece okumak yerine not alarak, özetleyerek ve kendinize sorular sorarak çalışın. Konuyu başkasına anlatabilecek seviyeye getirin.
👤 **Ahmet K. - İTÜ Bilgisayar Mühendisliği** - TYT: 115 net, AYT: 78 net ile İTÜ'ye yerleşti

📚 **Pomodoro Tekniği ile Verimlilik**
25 dakika odaklanarak çalış, 5 dakika mola ver. 4 pomodoro sonrası 30 dakika uzun mola. Bu teknikle konsantrasyonumu çok artırdım.
👤 **Zeynep M. - Boğaziçi İşletme** - EA puan türünde 520 puan alarak Boğaziçi'ne yerleşti

💡 **Ek Öneriler:**
• Düzenli çalışma programı oluşturun
• Zayıf olduğunuz konulara odaklanın  
• Deneme sınavlarını düzenli çözün
• Motivasyonunuzu yüksek tutun`,
      suggestions: ['Çalışma yöntemi', 'Zaman yönetimi', 'Motivasyon', 'Sınav stratejisi'],
      source: 'mock'
    };
  }
  
  if (message.includes('merhaba') || message.includes('selam')) {
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
  
  if (message.includes('net') || message.includes('hesap')) {
    return {
      intent: 'net_calculation',
      entities: { scoreType: 'SAY' },
      message: 'Net hesaplama için üniversite ve bölüm bilgisi gerekiyor. Örneğin: "İTÜ Bilgisayar Mühendisliği için kaç net gerekir?" şeklinde sorabilirsiniz.',
      suggestions: ['İTÜ Bilgisayar Mühendisliği', 'ODTÜ Elektrik Mühendisliği', 'Boğaziçi İşletme'],
      source: 'mock'
    };
  }
  
  // Üniversite bilgi sorguları - Gerçek veriler
  if (message.includes('hakkında') || message.includes('bilgi')) {
    let universityName = null;
    if (message.includes('itü') || message.includes('istanbul teknik')) universityName = 'İTÜ';
    if (message.includes('boğaziçi')) universityName = 'Boğaziçi';
    if (message.includes('odtü')) universityName = 'ODTÜ';
    
    if (universityName) {
      const realInfo = getRealUniversityInfo(universityName);
      
      if (realInfo) {
        const content = `🏛️ **${realInfo.name}** Hakkında (YÖK Atlas)

📍 **Genel Bilgiler:**
• **Şehir:** ${realInfo.city}
• **Tür:** ${realInfo.type}
• **Kuruluş:** ${realInfo.founded}
• **Bölüm Sayısı:** ${realInfo.departmentCount}

🎓 **Popüler Bölümler:**
${realInfo.popularDepartments.map(dept => `• ${dept}`).join('\n')}

🔍 **Diğer Adları:**
${realInfo.aliases.map(alias => `• ${alias}`).join('\n')}

📊 **Güncel Veriler:**
• YÖK Atlas'tan gerçek bilgiler
• ${new Date().getFullYear()} yılı verileri

Hangi bölüm hakkında detaylı bilgi almak istersiniz?`;

        return {
          intent: 'university_info',
          entities: { university: universityName },
          message: content,
          suggestions: [`${universityName} bölümleri`, `${universityName} taban puanları`, 'Diğer üniversiteler'],
          source: 'yok_atlas'
        };
      }
    }
  }

  if (message.includes('itü') || message.includes('istanbul teknik')) {
    const realData = getRealScoreData('İTÜ', 'Bilgisayar');
    
    if (realData && realData.length > 0) {
      const score = realData[0].scores.SAY;
      return {
        intent: 'base_score',
        entities: { university: 'İTÜ', department: 'Bilgisayar Mühendisliği' },
        message: `🎓 **İTÜ Bilgisayar Mühendisliği** (YÖK Atlas)

📊 **Güncel Taban Puan:** ${score} puan (SAY)
🎯 **Net Hedefleri:**
• TYT: 35+ net
• AYT SAY: 30+ net

💡 **Tavsiyeler:**
• Güvenli tercih için ${(parseFloat(score) + 20).toFixed(1)} puan hedefleyin
• Matematik ağırlığı yüksek, matematik çalışmaya odaklanın
• YÖK Atlas'tan güncel ${new Date().getFullYear()} verileri`,
        suggestions: ['Diğer mühendislik bölümleri', 'İTÜ diğer bölümler', 'Net hesaplama'],
        source: 'yok_atlas'
      };
    }
    
    // Fallback
    return {
      intent: 'net_calculation',
      entities: { university: 'İTÜ', department: 'Bilgisayar Mühendisliği' },
      message: 'İTÜ Bilgisayar Mühendisliği çok prestijli bir bölüm! Güncel veriler yükleniyor...',
      suggestions: ['Diğer mühendislik bölümleri', 'Benzer puanlı bölümler', 'Tercih stratejisi'],
      source: 'mock'
    };
  }
  
  if (message.includes('tıp') || message.includes('doktor')) {
    return {
      intent: 'base_score',
      entities: { department: 'Tıp' },
      message: 'Tıp fakülteleri için çok yüksek puanlar gerekiyor. En düşük taban puanı bile 530+ civarında. TYT\'de 38+, AYT SAY\'da 35+ net hedeflemelisiniz.',
      suggestions: ['Tıp fakülteleri listesi', 'Sağlık bilimleri alternatifleri', 'Hazırlık stratejisi'],
      source: 'mock'
    };
  }
  
  // Taban puan sorguları - Gerçek YÖK Atlas verileri
  if (message.includes('puan') || message.includes('itü') || message.includes('boğaziçi') || message.includes('odtü')) {
    let universityName = null;
    
    // Türkçe karakter sorunları için regex kullan (bozuk karakterler dahil)
    if (/bo[gğ]azi[cç�]i|bosphorus|bogazi.*i/i.test(message)) {
      universityName = 'Boğaziçi';
    } else if (/od[tţ][uü�]|metu/i.test(message)) {
      universityName = 'ODTÜ';
    } else if (/i[tţ][uü�]|istanbul.*teknik/i.test(message)) {
      universityName = 'İTÜ';
    } else if (/puan/i.test(message)) {
      // Sadece "puan" kelimesi varsa default İTÜ
      universityName = 'İTÜ';
    }
    
    const realData = getRealScoreData(universityName);
    
    if (realData && realData.length > 0) {
      const university = findUniversity(universityName);
      
      let content = `📊 **${university.name} Taban Puanları** (2025 - YÖK Atlas)\n\n🎓 **Bölümler:**\n`;
      
      realData.forEach(dept => {
        content += `\n📚 **${dept.department}**\n`;
        content += `• **Fakülte:** ${dept.faculty}\n`;
        content += `• **SAY:** ${dept.scores.SAY} puan\n`;
        content += `• **EA:** ${dept.scores.EA} puan\n`;
        content += `• **Kontenjan:** ${dept.quota} kişi\n`;
        content += `• **Dil:** ${dept.language}\n`;
      });
      
      content += `\n📈 **Gerçek Veriler:**\n`;
      content += `• YÖK Atlas'tan güncel veriler\n`;
      content += `• ${new Date().getFullYear()} yılı taban puanları\n`;
      content += `• Güvenli tercih için +15-20 puan hedefleyin\n`;
      
      return {
        intent: 'base_score',
        entities: { university: universityName },
        message: content,
        suggestions: ['Diğer üniversiteler', 'Net hesaplama', 'Bölüm detayları'],
        source: 'yok_atlas'
      };
    }
    
    // Fallback to mock if no real data
    return {
      intent: 'base_score',
      entities: { university: universityName },
      message: `📊 **${universityName} Taban Puanları**\n\n⚠️ Güncel veriler yükleniyor...\nLütfen daha sonra tekrar deneyin.`,
      suggestions: ['Diğer üniversiteler', 'Net hesaplama'],
      source: 'mock'
    };
  }

  if (message.includes('yardım') || message.includes('help')) {
    return {
      intent: 'help',
      entities: {},
      message: `Size şu konularda yardımcı olabilirim:

🎯 Net hesaplama ve puan tahmini
🏫 Üniversite ve bölüm bilgileri  
📊 Taban puanları ve kontenjanlar
💡 Tercih stratejileri

Örnek sorular:
• "İTÜ Bilgisayar Mühendisliği için kaç net gerekir?"
• "Matematik 25, Fen 20 net ile hangi bölümleri tercih edebilirim?"
• "Ankara'daki tıp fakültelerinin taban puanları nedir?"`,
      suggestions: ['Net hesaplama', 'Bölüm öner', 'Üniversite ara'],
      source: 'mock'
    };
  }
  
  // Default response
  return {
    intent: 'general',
    entities: {},
    message: 'Sorunuzu anlayamadım. Üniversite tercihleri, net hesaplama veya bölüm bilgileri hakkında daha spesifik sorular sorabilirsiniz.',
    suggestions: ['Yardım al', 'Örnek sorular', 'Net hesaplama'],
    source: 'mock'
  };
}

// YÖK Atlas veri sorgulama fonksiyonları
function normalizeText(text) {
  return text.toLowerCase()
    .replace(/i̇/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

function findUniversity(query) {
  const normalizedQuery = normalizeText(query);
  return universitiesData.find(uni => 
    normalizeText(uni.name).includes(normalizedQuery) ||
    uni.aliases.some(alias => normalizeText(alias).includes(normalizedQuery))
  );
}

function findDepartments(universityId, departmentQuery = null) {
  let departments = departmentsData.filter(dept => dept.universityId === universityId);
  
  if (departmentQuery) {
    const lowerQuery = departmentQuery.toLowerCase();
    departments = departments.filter(dept => 
      dept.name.toLowerCase().includes(lowerQuery)
    );
  }
  
  return departments;
}

function findScores(departmentId, year = 2025) {
  return scoresData.filter(score => 
    score.departmentId === departmentId && score.year === year
  );
}

function getRealUniversityInfo(universityName) {
  const university = findUniversity(universityName);
  if (!university) return null;
  
  const departments = findDepartments(university.id);
  const popularDepts = departments.slice(0, 5).map(d => d.name);
  
  return {
    name: university.name,
    city: university.city,
    type: university.type,
    founded: university.founded,
    departmentCount: departments.length,
    popularDepartments: popularDepts,
    aliases: university.aliases
  };
}

function getRealScoreData(universityName, departmentName = null) {
  const university = findUniversity(universityName);
  if (!university) return null;
  
  let departments = findDepartments(university.id, departmentName);
  if (departments.length === 0) return null;
  
  const results = [];
  
  for (const dept of departments.slice(0, 3)) { // İlk 3 bölüm
    const scores = findScores(dept.id);
    if (scores.length > 0) {
      const sayScore = scores.find(s => s.scoreType === 'SAY');
      const eaScore = scores.find(s => s.scoreType === 'EA');
      
      results.push({
        department: dept.name,
        faculty: dept.faculty,
        language: dept.language,
        scores: {
          SAY: sayScore ? sayScore.baseScore.toFixed(1) : 'N/A',
          EA: eaScore ? eaScore.baseScore.toFixed(1) : 'N/A'
        },
        quota: sayScore ? sayScore.quota : 'N/A'
      });
    }
  }
  
  return results;
}

server.listen(PORT, () => {
  console.log(`🚀 Tercih Sihirbazı sunucusu başlatıldı!`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`📁 Dosyalar: ${__dirname}/public`);
  console.log(`⏰ Başlatma zamanı: ${new Date().toLocaleString('tr-TR')}`);
  console.log('');
  console.log('📊 Mevcut özellikler:');
  console.log('  ✅ Static dosya servisi');
  console.log('  ✅ Mock API endpoints');
  console.log('  ✅ Chat interface');
  console.log('  ✅ Responsive tasarım');
  console.log('');
  console.log('🔗 Tarayıcınızda http://localhost:3000 adresini açın');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Sunucu kapatılıyor...');
  server.close(() => {
    console.log('✅ Sunucu başarıyla kapatıldı');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n👋 Sunucu kapatılıyor...');
  server.close(() => {
    console.log('✅ Sunucu başarıyla kapatıldı');
    process.exit(0);
  });
});