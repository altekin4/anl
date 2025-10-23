const http = require('http');
const fs = require('fs');
const path = require('path');

// Load environment variables
try {
  require('dotenv').config();
} catch (error) {
  console.log('dotenv not installed, using environment variables');
}

// Load YÖK Atlas data (2024 güncel)
let universitiesData = [];
let departmentsData = [];
let scoresData = [];
let futureCareersData = [];
let comprehensiveUniversitiesData = [];

try {
  universitiesData = JSON.parse(fs.readFileSync('./data/universities.json', 'utf8'));
  departmentsData = JSON.parse(fs.readFileSync('./data/departments.json', 'utf8'));
  scoresData = JSON.parse(fs.readFileSync('./data/scores.json', 'utf8'));
  futureCareersData = JSON.parse(fs.readFileSync('./data/future-careers.json', 'utf8'));
  comprehensiveUniversitiesData = JSON.parse(fs.readFileSync('./data/comprehensive-universities.json', 'utf8'));
  console.log('✅ 2024 YÖK Atlas verileri yüklendi:', {
    universities: universitiesData.length,
    departments: departmentsData.length,
    scores: scoresData.length,
    futureCareers: futureCareersData.length,
    comprehensiveUniversities: comprehensiveUniversitiesData.length
  });
} catch (error) {
  console.log('⚠️  YÖK Atlas verileri yüklenemedi, mock veriler kullanılacak:', error.message);
}

// Polyfill for fetch in Node.js
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const PORT = 3005;

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

  // API Routes
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

  // Base scores by department endpoint
  if (url === '/api/base-scores' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const results = getBaseScoresByDepartment(data.department, data.scoreType, data.userScore);

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: true,
          data: {
            department: data.department,
            scoreType: data.scoreType,
            userScore: data.userScore,
            universities: results,
            totalFound: results.length
          }
        }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: {
            code: 'PROCESSING_ERROR',
            message: 'Taban puan sorgusu işlenirken hata oluştu'
          }
        }));
      }
    });
    return;
  }

  // University recommendations by score endpoint
  if (url === '/api/university-recommendations' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const recommendations = getUniversityRecommendationsByScore(data.userScore, data.scoreType, data.department);

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: true,
          data: {
            userScore: data.userScore,
            scoreType: data.scoreType,
            department: data.department,
            recommendations: recommendations,
            totalRecommendations: recommendations.safe.length + recommendations.target.length + recommendations.risky.length
          }
        }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: {
            code: 'PROCESSING_ERROR',
            message: 'Üniversite önerisi oluşturulurken hata oluştu'
          }
        }));
      }
    });
    return;
  }

  // Future careers recommendation endpoint
  if (url === '/api/career-recommendation' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const recommendation = generateCareerRecommendation(data.tytNet, data.aytNet, data.scoreType);

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: true,
          data: recommendation
        }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: {
            code: 'PROCESSING_ERROR',
            message: 'Kariyer önerisi oluşturulurken hata oluştu'
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

// AI Response Generation - Anthropic Claude with 2024 data
async function generateResponse(userMessage) {
  // Önce OpenAI'yi deneyelim (daha stabil)
  try {
    console.log('🤖 Using OpenAI GPT for response generation');
    const openaiResponse = await generateOpenAIResponse(userMessage);
    if (openaiResponse) {
      return openaiResponse;
    }
  } catch (error) {
    console.error('❌ OpenAI API Error:', error.message);
  }

  // Anthropic'i backup olarak kullan
  try {
    console.log('🔄 Falling back to Anthropic Claude');
    const anthropicResponse = await generateAnthropicResponse(userMessage);
    if (anthropicResponse) {
      return anthropicResponse;
    }
  } catch (error) {
    console.error('❌ Anthropic API Error:', error.message);
  }

  return {
    intent: 'error',
    entities: {},
    message: `Üzgünüm, şu anda AI servislerimizde teknik sorun yaşıyoruz. Lütfen daha sonra tekrar deneyin.`,
    suggestions: ['Tekrar deneyin', 'Daha sonra tekrar gelin'],
    source: 'error'
  };
}

async function generateAnthropicResponse(userMessage) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  console.log('🔍 Checking Anthropic API key:', apiKey ? `Present (${apiKey.substring(0, 20)}...)` : 'Missing');

  if (!apiKey || apiKey === 'your_anthropic_api_key_here') {
    console.log('❌ Anthropic API key not configured');
    return null;
  }

  try {
    console.log('🤖 Trying Anthropic Claude API with message:', userMessage.substring(0, 50) + '...');
    console.log('🔑 API Key length:', apiKey.length);
    console.log('🔑 API Key starts with:', apiKey.substring(0, 15));
    
    const requestBody = {
      model: process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307',
      max_tokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS || '500'),
      messages: [
        {
          role: 'user',
          content: `Sen "Tercih Sihirbazı" adlı bir AI asistanısın. Türkiye'deki lise öğrencilerine üniversite tercih sürecinde yardımcı oluyorsun.

GÜNCEL VERİLER (2024):
- 15 üniversite, farklı seviyelerden (Üst, Orta-Üst, Orta, Orta-Alt)
- Taban puanları üniversite bazında detaylı

ÜST SEVİYE ÜNİVERSİTELER:
- İTÜ Bilgisayar: SAY 545 puan (8.5K sıralama)
- Boğaziçi Bilgisayar: SAY 550 puan (7.5K sıralama)
- ODTÜ Bilgisayar: SAY 540 puan (9.5K sıralama)

ORTA SEVİYE ÜNİVERSİTELER:
- Gazi Bilgisayar: SAY 505 puan (25K sıralama)
- Marmara Bilgisayar: SAY 510 puan (22K sıralama)
- YTÜ Bilgisayar: SAY 495 puan (30K sıralama)

ORTA-ALT SEVİYE ÜNİVERSİTELER:
- Sakarya Bilgisayar: SAY 475 puan (42K sıralama)
- Kocaeli Bilgisayar: SAY 470 puan (45K sıralama)
- ESOGÜ Bilgisayar: SAY 460 puan (52K sıralama)

GELECEĞİ PARLAK MESLEKLER (2024-2030):
1. Yapay Zeka Mühendisliği (%300 büyüme, 25-50K TL maaş)
2. Siber Güvenlik Mühendisliği (%250 büyüme, 20-40K TL maaş)
3. Veri Bilimi (%200 büyüme, 18-35K TL maaş)
4. Biyomedikal Mühendisliği (%180 büyüme, 15-30K TL maaş)
5. Yenilenebilir Enerji Mühendisliği (%170 büyüme, 14-28K TL maaş)
6. Oyun Tasarımı ve Programlama (%160 büyüme, 15-35K TL maaş)
7. Çevre Mühendisliği (%150 büyüme, 12-25K TL maaş)
8. Dijital Pazarlama (%140 büyüme, 10-25K TL maaş)
9. UX/UI Tasarım (%130 büyüme, 12-30K TL maaş)
10. Psikoloji (Klinik) (%120 büyüme, 8-20K TL maaş)

GÖREVLER:
1. TYT/AYT net hesaplamaları (Doğru - Yanlış/4 formülü)
2. Üniversite ve bölüm bilgileri (2024 güncel)
3. Taban puan bilgileri (2024 YÖK Atlas verileri)
4. Tercih stratejileri ve tavsiyeleri
5. Başarılı öğrencilerden motivasyon hikayeleri
6. GELECEĞİ PARLAK MESLEKLER ÖNERİSİ (net sayısına göre)

YANIT KURALLARI:
- Sadece Türkçe yanıt ver
- Samimi, destekleyici ve motive edici ol
- Net hesaplamalarında kesin formül kullan: Net = Doğru - (Yanlış ÷ 4)
- TYT: Türkçe(40), Matematik(40), Fen(20), Sosyal(20) soru
- AYT SAY: Matematik(40), Fizik(14), Kimya(13), Biyoloji(13) soru
- 2024 güncel verilerini kullan
- Geleceği parlak meslekleri öner
- Net sayısına göre uygun bölümleri öner
- Emoji kullan ama abartma
- Kısa ve öz yanıtlar ver
- Örnekler ver

ÖZEL DURUMLAR:
- Net hesaplama sorularında mutlaka hesaplama yap
- Taban puan sorularında MUTLAKA üniversite adını belirt
- Farklı seviyedeki üniversiteleri (üst, orta, orta-alt) öner
- Kullanıcının puanına göre güvenli/hedef/riskli tercihler öner
- Bölüm sorularında iş imkanlarından ve gelecek potansiyelinden bahset
- Çalışma tavsiyesi sorularında başarılı öğrenci hikayeleri paylaş
- "Geleceği parlak meslekler" sorularında yukarıdaki listeyi kullan
- Net sayısı verildiğinde uygun bölümleri ve üniversiteleri öner

Kullanıcı mesajı: "${userMessage}"`
        }
      ]
    };

    console.log('📤 Request body model:', requestBody.model);
    console.log('📤 Request body max_tokens:', requestBody.max_tokens);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    });

    if (response.ok) {
      const data = await response.json();
      const aiMessage = data.content[0].text;

      console.log('✅ Anthropic response received');

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

function classifyIntent(message) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('merhaba') || lowerMessage.includes('selam') ||
    lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return 'greeting';
  }

  if (lowerMessage.includes('teşekkür') || lowerMessage.includes('sağol')) {
    return 'thanks';
  }

  if (lowerMessage.includes('tyt')) {
    return 'tyt_calculation';
  }

  if (lowerMessage.includes('ayt')) {
    return 'ayt_calculation';
  }

  if (lowerMessage.includes('tavsiye') || lowerMessage.includes('başarılı öğrenci') ||
    lowerMessage.includes('motivasyon') || lowerMessage.includes('çalışma yöntemi')) {
    return 'study_advice';
  }

  if (lowerMessage.includes('taban puan') || 
    (lowerMessage.includes('taban') && lowerMessage.includes('puan'))) {
    return 'base_score';
  }

  if (lowerMessage.includes('bölüm') || lowerMessage.includes('mühendislik')) {
    return 'department_search';
  }

  if (lowerMessage.includes('üniversite hakkında') ||
    lowerMessage.includes('üniversite bilgi')) {
    return 'university_info';
  }

  // Career recommendation patterns
  if (lowerMessage.includes('geleceği parlak') || lowerMessage.includes('gelecek meslek') ||
    lowerMessage.includes('kariyer öner') || lowerMessage.includes('meslek öner') ||
    lowerMessage.includes('hangi bölüm oku') || lowerMessage.includes('ne okumalı') ||
    lowerMessage.includes('iş imkanı') || lowerMessage.includes('maaş yüksek')) {
    return 'career_recommendation';
  }

  if (lowerMessage.includes('net') || lowerMessage.includes('hesap') ||
    lowerMessage.includes('doğru') || lowerMessage.includes('yanlış')) {
    return 'tyt_calculation';
  }

  return 'general';
}

function extractEntities(message) {
  const entities = {};
  const lowerMessage = message.toLowerCase();

  const universities = ['itü', 'odtü', 'boğaziçi', 'marmara', 'istanbul', 'ankara'];
  for (const uni of universities) {
    if (lowerMessage.includes(uni)) {
      entities.university = uni.toUpperCase();
      break;
    }
  }

  const departments = ['bilgisayar', 'elektrik', 'makine', 'işletme', 'hukuk', 'tıp'];
  for (const dept of departments) {
    if (lowerMessage.includes(dept)) {
      entities.department = dept;
      break;
    }
  }

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
    'study_advice': ['Çalışma yöntemi', 'Zaman yönetimi', 'Motivasyon'],
    'base_score': ['Kontenjan bilgisi', 'Benzer bölümler', '2024 karşılaştırması'],
    'greeting': ['TYT netimi hesapla', 'AYT hesaplama yap', 'Geleceği parlak meslekler'],
    'general': ['TYT netimi hesapla', 'AYT hesaplama', 'Geleceği parlak meslekler']
  };

  return suggestions[intent] || suggestions['general'];
}

// Kariyer önerisi fonksiyonu
function generateCareerRecommendation(tytNet, aytNet, scoreType = 'SAY') {
  console.log(`🎯 Generating career recommendation for TYT: ${tytNet}, AYT: ${aytNet}, Type: ${scoreType}`);
  
  const recommendations = [];
  
  // Net sayısına göre uygun meslekleri filtrele
  futureCareersData.forEach(career => {
    const requiredTYT = career.requiredNets.TYT;
    const requiredAYT = career.requiredNets[`AYT_${scoreType}`] || career.requiredNets.AYT_SAY || 0;
    
    // Net sayısı yeterli mi kontrol et
    if (tytNet >= requiredTYT - 10 && aytNet >= requiredAYT - 10) {
      const suitabilityScore = calculateSuitabilityScore(tytNet, aytNet, career);
      
      recommendations.push({
        ...career,
        suitabilityScore,
        netGap: {
          tyt: Math.max(0, requiredTYT - tytNet),
          ayt: Math.max(0, requiredAYT - aytNet)
        },
        recommendation: generateRecommendationText(career, tytNet, aytNet)
      });
    }
  });
  
  // Uygunluk skoruna göre sırala
  recommendations.sort((a, b) => b.suitabilityScore - a.suitabilityScore);
  
  return {
    totalRecommendations: recommendations.length,
    topRecommendations: recommendations.slice(0, 5),
    userNets: { tyt: tytNet, ayt: aytNet, scoreType },
    message: generateCareerMessage(recommendations.slice(0, 3), tytNet, aytNet)
  };
}

function calculateSuitabilityScore(tytNet, aytNet, career) {
  const requiredTYT = career.requiredNets.TYT;
  const requiredAYT = career.requiredNets.AYT_SAY || 0;
  
  // Net fazlalığı bonus puanı
  const tytBonus = Math.max(0, tytNet - requiredTYT) * 2;
  const aytBonus = Math.max(0, aytNet - requiredAYT) * 2;
  
  // Gelecek skoru
  const futureScore = career.futureScore;
  
  return futureScore + tytBonus + aytBonus;
}

function generateRecommendationText(career, tytNet, aytNet) {
  const requiredTYT = career.requiredNets.TYT;
  const requiredAYT = career.requiredNets.AYT_SAY || 0;
  
  let text = `${career.department} - ${career.category}\n`;
  text += `💰 Maaş: ${career.averageSalary}\n`;
  text += `📈 Büyüme: ${career.jobGrowth}\n`;
  
  if (tytNet >= requiredTYT && aytNet >= requiredAYT) {
    text += `✅ Net sayın yeterli! Güvenle tercih edebilirsin.\n`;
  } else {
    const tytGap = Math.max(0, requiredTYT - tytNet);
    const aytGap = Math.max(0, requiredAYT - aytNet);
    if (tytGap > 0) text += `📚 TYT'de ${tytGap} net daha yapmalısın\n`;
    if (aytGap > 0) text += `📚 AYT'de ${aytGap} net daha yapmalısın\n`;
  }
  
  return text;
}

function generateCareerMessage(topCareers, tytNet, aytNet) {
  if (topCareers.length === 0) {
    return `🎯 **Kariyer Önerisi**\n\nMevcut net sayılarınla (TYT: ${tytNet}, AYT: ${aytNet}) henüz geleceği parlak mesleklere yönelik önerimiz yok. Biraz daha çalışarak net sayılarını artırabilirsin!\n\n💪 Hedef: TYT 60+ net, AYT 50+ net`;
  }
  
  let message = `🎯 **Geleceği Parlak Meslekler - Kişisel Öneriler**\n\n`;
  message += `📊 **Mevcut Netlerin:** TYT ${tytNet}, AYT ${aytNet}\n\n`;
  
  topCareers.forEach((career, index) => {
    message += `${index + 1}. **${career.department}**\n`;
    message += `   💰 Maaş: ${career.averageSalary}\n`;
    message += `   📈 Büyüme: ${career.jobGrowth}\n`;
    message += `   🎯 Gerekli Net: TYT ${career.requiredNets.TYT}, AYT ${career.requiredNets.AYT_SAY || 0}\n`;
    
    if (career.netGap.tyt > 0 || career.netGap.ayt > 0) {
      message += `   📚 Eksik: `;
      if (career.netGap.tyt > 0) message += `TYT ${career.netGap.tyt} net `;
      if (career.netGap.ayt > 0) message += `AYT ${career.netGap.ayt} net`;
      message += `\n`;
    } else {
      message += `   ✅ Net sayın yeterli!\n`;
    }
    message += `\n`;
  });
  
  return message;
}

// Taban puan sorgulama fonksiyonu
function getBaseScoresByDepartment(departmentName, scoreType = 'SAY', userScore = null) {
  console.log(`🔍 Searching base scores for: ${departmentName}, Type: ${scoreType}, User Score: ${userScore}`);
  
  const results = [];
  
  comprehensiveUniversitiesData.forEach(university => {
    const departments = university.departments;
    
    // Bölüm adını esnek arama ile bul
    const matchingDept = Object.keys(departments).find(dept => 
      dept.toLowerCase().includes(departmentName.toLowerCase()) ||
      departmentName.toLowerCase().includes(dept.toLowerCase())
    );
    
    if (matchingDept && departments[matchingDept][scoreType]) {
      const deptData = departments[matchingDept][scoreType];
      
      results.push({
        university: university.name,
        shortName: university.shortName,
        city: university.city,
        tier: university.tier,
        ranking: university.ranking,
        department: matchingDept,
        scoreType: scoreType,
        baseScore: deptData.baseScore,
        quota: deptData.quota,
        rank: deptData.rank,
        isReachable: userScore ? userScore >= deptData.baseScore : null,
        scoreDifference: userScore ? userScore - deptData.baseScore : null
      });
    }
  });
  
  // Taban puana göre sırala (en yüksekten en düşüğe)
  results.sort((a, b) => b.baseScore - a.baseScore);
  
  return results;
}

// Kullanıcının puanına göre uygun üniversiteleri öner
function getUniversityRecommendationsByScore(userScore, scoreType = 'SAY', departmentName = null) {
  console.log(`🎯 Getting recommendations for score: ${userScore}, Type: ${scoreType}, Department: ${departmentName}`);
  
  const recommendations = {
    safe: [], // Güvenli tercihler (kullanıcı puanı > taban puanı + 20)
    target: [], // Hedef tercihler (kullanıcı puanı > taban puanı + 5)
    risky: [] // Riskli tercihler (kullanıcı puanı > taban puanı - 5)
  };
  
  comprehensiveUniversitiesData.forEach(university => {
    const departments = university.departments;
    
    Object.keys(departments).forEach(deptName => {
      // Eğer belirli bir bölüm aranıyorsa filtrele
      if (departmentName && !deptName.toLowerCase().includes(departmentName.toLowerCase())) {
        return;
      }
      
      const deptData = departments[deptName][scoreType];
      if (!deptData) return;
      
      const scoreDiff = userScore - deptData.baseScore;
      
      const recommendation = {
        university: university.name,
        shortName: university.shortName,
        city: university.city,
        tier: university.tier,
        ranking: university.ranking,
        department: deptName,
        baseScore: deptData.baseScore,
        quota: deptData.quota,
        rank: deptData.rank,
        scoreDifference: scoreDiff,
        probability: calculateAdmissionProbability(scoreDiff)
      };
      
      if (scoreDiff >= 20) {
        recommendations.safe.push(recommendation);
      } else if (scoreDiff >= 5) {
        recommendations.target.push(recommendation);
      } else if (scoreDiff >= -5) {
        recommendations.risky.push(recommendation);
      }
    });
  });
  
  // Her kategoriyi taban puana göre sırala
  recommendations.safe.sort((a, b) => b.baseScore - a.baseScore);
  recommendations.target.sort((a, b) => b.baseScore - a.baseScore);
  recommendations.risky.sort((a, b) => b.baseScore - a.baseScore);
  
  return recommendations;
}

function calculateAdmissionProbability(scoreDifference) {
  if (scoreDifference >= 20) return 95;
  if (scoreDifference >= 10) return 85;
  if (scoreDifference >= 5) return 75;
  if (scoreDifference >= 0) return 60;
  if (scoreDifference >= -5) return 40;
  if (scoreDifference >= -10) return 25;
  return 10;
}

server.listen(PORT, () => {
  console.log('✅ 2024 YÖK Atlas verileri yüklendi:', {
    universities: universitiesData.length,
    departments: departmentsData.length,
    scores: scoresData.length
  });
  console.log('🚀 Tercih Sihirbazı sunucusu başlatıldı! (2024 Güncel)');
  console.log('🌐 URL: http://localhost:' + PORT);
  console.log('🔗 Tarayıcınızda http://localhost:' + PORT + ' adresini açın');
  console.log('📁 Dosyalar: ' + __dirname + '/public');
  console.log('⏰ Başlatma zamanı: ' + new Date().toLocaleString('tr-TR'));
  console.log('');
  console.log('📊 Mevcut özellikler:');
  console.log('  ✅ Static dosya servisi');
  console.log('  ✅ Anthropic Claude API (2024 güncel veriler)');
  console.log('  ✅ Chat interface');
  console.log('  ✅ Responsive tasarım');
  console.log('  ✅ 2024 YÖK Atlas verileri');

});

async function generateOpenAIResponse(userMessage) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || apiKey === 'demo-key') {
    console.log('OpenAI API key not configured');
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

2024 GÜNCEL VERİLER:
- Bilgisayar Mühendisliği: SAY 535, EA 525 puan
- Makine Mühendisliği: SAY 520, EA 510 puan
- İşletme: SAY 495, EA 485 puan
- Tıp: SAY 565, EA 555 puan

Görevlerin:
- Üniversite ve bölüm bilgileri vermek (2024 güncel)
- Net hesaplama yardımı yapmak
- Tercih stratejileri önermek
- Taban puanları hakkında bilgi vermek

Yanıt verirken:
- Türkçe kullan
- Samimi ve yardımsever ol
- Kısa ve net yanıtlar ver
- 2024 güncel verilerini kullan
- Örnekler ver
- Öğrenciyi motive et`
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