import logger from '../utils/logger';

export interface EntityMatch {
  entity: string;
  value: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
}

export class EntityExtractor {
  // Turkish character normalization map
  private readonly turkishCharMap: Record<string, string> = {
    'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
    'Ç': 'C', 'Ğ': 'G', 'I': 'I', 'Ö': 'O', 'Ş': 'S', 'Ü': 'U'
  };

  // Common Turkish abbreviations and their full forms
  private readonly turkishAbbreviations: Record<string, string> = {
    'üni': 'üniversitesi',
    'üniv': 'üniversitesi',
    'univ': 'üniversitesi',
    'müh': 'mühendisliği',
    'muh': 'mühendisliği',
    'bil': 'bilgisayar',
    'elk': 'elektrik',
    'end': 'endüstri',
    'mak': 'makine',
    'ins': 'inşaat',
    'çev_müh': 'çevre',
    'işl': 'işletme',
    'ikt': 'iktisat',
    'eko': 'ekonomi',
    'mal': 'maliye',
    'ula': 'uluslararası',
    'siy': 'siyaset',
    'sos': 'sosyoloji',
    'psi': 'psikoloji',
    'tar': 'tarih',
    'coğ': 'coğrafya',
    'türk': 'türk dili',
    'ing': 'ingiliz dili',
    'çev': 'çevirmenlik'
  };

  // University name variations and aliases
  private readonly universityAliases: Record<string, string[]> = {
    'İstanbul Üniversitesi': ['İÜ', 'İ.Ü.', 'istanbul üni', 'istanbul university'],
    'İstanbul Teknik Üniversitesi': ['İTÜ', 'İ.T.Ü.', 'ITU', 'teknik üni'],
    'Boğaziçi Üniversitesi': ['Boğaziçi', 'BÜ', 'B.Ü.', 'Bosphorus'],
    'Orta Doğu Teknik Üniversitesi': ['ODTÜ', 'O.D.T.Ü.', 'METU', 'orta doğu'],
    'Ankara Üniversitesi': ['AÜ', 'A.Ü.', 'ankara üni'],
    'Hacettepe Üniversitesi': ['Hacettepe', 'HÜ', 'H.Ü.'],
    'Gazi Üniversitesi': ['Gazi', 'GÜ', 'G.Ü.'],
    'Marmara Üniversitesi': ['Marmara', 'MÜ', 'M.Ü.'],
    'Ege Üniversitesi': ['Ege', 'EÜ', 'E.Ü.'],
    'Dokuz Eylül Üniversitesi': ['DEÜ', 'D.E.Ü.', 'dokuz eylül'],
    'Bilkent Üniversitesi': ['Bilkent'],
    'Koç Üniversitesi': ['Koç', 'KÜ', 'K.Ü.'],
    'Sabancı Üniversitesi': ['Sabancı', 'SÜ', 'S.Ü.']
  };

  // Department name variations
  private readonly departmentAliases: Record<string, string[]> = {
    'Bilgisayar Mühendisliği': ['bil müh', 'bilgisayar müh', 'computer engineering', 'cs'],
    'Elektrik Mühendisliği': ['elk müh', 'elektrik müh', 'electrical engineering'],
    'Endüstri Mühendisliği': ['end müh', 'endüstri müh', 'industrial engineering'],
    'Makine Mühendisliği': ['mak müh', 'makine müh', 'mechanical engineering'],
    'İnşaat Mühendisliği': ['ins müh', 'inşaat müh', 'civil engineering'],
    'Çevre Mühendisliği': ['çev müh', 'çevre müh', 'environmental engineering'],
    'İşletme': ['işl', 'business', 'management'],
    'İktisat': ['ikt', 'economics', 'ekonomi'],
    'Hukuk': ['law', 'hukuk fakültesi'],
    'Tıp': ['medicine', 'tıp fakültesi'],
    'Diş Hekimliği': ['dentistry', 'diş'],
    'Eczacılık': ['pharmacy', 'eczane'],
    'Hemşirelik': ['nursing', 'hemşire'],
    'Psikoloji': ['psi', 'psychology'],
    'Sosyoloji': ['sos', 'sociology'],
    'Siyaset Bilimi': ['siy bil', 'political science'],
    'Uluslararası İlişkiler': ['ula ili', 'international relations', 'ir'],
    'Türk Dili ve Edebiyatı': ['türk dili', 'turkish literature'],
    'İngiliz Dili ve Edebiyatı': ['ing dili', 'english literature'],
    'Çevirmenlik': ['çev', 'translation']
  };

  /**
   * Extract entities from Turkish text with language-specific processing
   */
  extractEntities(text: string, entityTypes: string[] = ['university', 'department', 'scoreType', 'language', 'numbers']): EntityMatch[] {
    const entities: EntityMatch[] = [];
    const normalizedText = this.normalizeText(text);

    for (const entityType of entityTypes) {
      const matches = this.extractEntityType(normalizedText, entityType);
      entities.push(...matches);
    }

    return entities.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Normalize Turkish text for better matching
   */
  normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\sçğıöşü%]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Convert Turkish characters to ASCII equivalents for fuzzy matching
   */
  toAscii(text: string): string {
    return text.replace(/[çğıöşüÇĞIÖŞÜ]/g, (char) => this.turkishCharMap[char] || char);
  }

  /**
   * Expand Turkish abbreviations
   */
  expandAbbreviations(text: string): string {
    let expandedText = text;
    
    for (const [abbrev, full] of Object.entries(this.turkishAbbreviations)) {
      const regex = new RegExp(`\\b${abbrev}\\b`, 'gi');
      expandedText = expandedText.replace(regex, full);
    }

    return expandedText;
  }

  /**
   * Extract specific entity type from text
   */
  private extractEntityType(text: string, entityType: string): EntityMatch[] {
    switch (entityType) {
      case 'university':
        return this.extractUniversityEntities(text);
      case 'department':
        return this.extractDepartmentEntities(text);
      case 'scoreType':
        return this.extractScoreTypeEntities(text);
      case 'language':
        return this.extractLanguageEntities(text);
      case 'numbers':
        return this.extractNumberEntities(text);
      default:
        return [];
    }
  }

  /**
   * Extract university entities with Turkish language support
   */
  private extractUniversityEntities(text: string): EntityMatch[] {
    const entities: EntityMatch[] = [];
    const expandedText = this.expandAbbreviations(text);

    // Check against university aliases
    for (const [universityName, aliases] of Object.entries(this.universityAliases)) {
      for (const alias of aliases) {
        const normalizedAlias = this.normalizeText(alias);
        const index = expandedText.indexOf(normalizedAlias);
        
        if (index !== -1) {
          entities.push({
            entity: 'university',
            value: universityName,
            confidence: 0.9,
            startIndex: index,
            endIndex: index + normalizedAlias.length
          });
        }
      }
    }

    // Pattern-based extraction for university names
    const universityPatterns = [
      /(\w+(?:\s+\w+)*)\s*(?:üniversitesi|üni\.?|university)/gi,
      /([A-ZÇĞIÖŞÜ]{2,6}\.?(?:Ü\.?|ÜNİ\.?))/gi
    ];

    for (const pattern of universityPatterns) {
      let match;
      while ((match = pattern.exec(expandedText)) !== null) {
        entities.push({
          entity: 'university',
          value: match[1].trim(),
          confidence: 0.7,
          startIndex: match.index,
          endIndex: match.index + match[0].length
        });
      }
    }

    return entities;
  }

  /**
   * Extract department entities with Turkish language support
   */
  private extractDepartmentEntities(text: string): EntityMatch[] {
    const entities: EntityMatch[] = [];
    const expandedText = this.expandAbbreviations(text);

    // Check against department aliases
    for (const [departmentName, aliases] of Object.entries(this.departmentAliases)) {
      for (const alias of aliases) {
        const normalizedAlias = this.normalizeText(alias);
        const index = expandedText.indexOf(normalizedAlias);
        
        if (index !== -1) {
          entities.push({
            entity: 'department',
            value: departmentName,
            confidence: 0.9,
            startIndex: index,
            endIndex: index + normalizedAlias.length
          });
        }
      }
    }

    // Pattern-based extraction for department names
    const departmentPatterns = [
      /((?:bilgisayar|elektrik|endüstri|makine|inşaat|çevre)\s*(?:mühendisliği|müh\.?))/gi,
      /(tıp|diş\s*hekimliği|eczacılık|hemşirelik)/gi,
      /(işletme|iktisat|ekonomi|maliye)/gi,
      /(hukuk|siyaset\s*bilimi|sosyoloji|psikoloji|tarih|coğrafya)/gi,
      /(türk\s*(?:dili|edebiyatı)|ingiliz\s*(?:dili|edebiyatı)|çevirmenlik)/gi
    ];

    for (const pattern of departmentPatterns) {
      let match;
      while ((match = pattern.exec(expandedText)) !== null) {
        entities.push({
          entity: 'department',
          value: match[1].trim(),
          confidence: 0.8,
          startIndex: match.index,
          endIndex: match.index + match[0].length
        });
      }
    }

    return entities;
  }

  /**
   * Extract score type entities
   */
  private extractScoreTypeEntities(text: string): EntityMatch[] {
    const entities: EntityMatch[] = [];
    
    const scoreTypeMap: Record<string, string> = {
      'tyt': 'TYT',
      'ayt': 'AYT',
      'say': 'SAY',
      'ea': 'EA',
      'söz': 'SÖZ',
      'soz': 'SÖZ',
      'dil': 'DIL',
      'temel yeterlilik': 'TYT',
      'alan yeterlilik': 'AYT',
      'sayısal': 'SAY',
      'eşit ağırlık': 'EA',
      'sözel': 'SÖZ'
    };

    for (const [pattern, scoreType] of Object.entries(scoreTypeMap)) {
      const regex = new RegExp(`\\b${pattern}\\b`, 'gi');
      let match;
      while ((match = regex.exec(text)) !== null) {
        entities.push({
          entity: 'scoreType',
          value: scoreType,
          confidence: 0.95,
          startIndex: match.index,
          endIndex: match.index + match[0].length
        });
      }
    }

    return entities;
  }

  /**
   * Extract language entities
   */
  private extractLanguageEntities(text: string): EntityMatch[] {
    const entities: EntityMatch[] = [];
    
    const languagePatterns = [
      { pattern: /(%?\d+)\s*(?:ingilizce|ing|english)/gi, getValue: (match: RegExpExecArray) => `%${match[1]} İngilizce` },
      { pattern: /(%?\d+)\s*(?:türkçe|tr|turkish)/gi, getValue: (match: RegExpExecArray) => `%${match[1]} Türkçe` },
      { pattern: /\b(?:ingilizce|english)\b/gi, getValue: () => 'İngilizce' },
      { pattern: /\b(?:türkçe|turkish)\b/gi, getValue: () => 'Türkçe' }
    ];

    for (const { pattern, getValue } of languagePatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          entity: 'language',
          value: getValue(match),
          confidence: 0.9,
          startIndex: match.index,
          endIndex: match.index + match[0].length
        });
      }
    }

    return entities;
  }

  /**
   * Extract numerical entities for TYT/AYT calculations
   */
  private extractNumberEntities(text: string): EntityMatch[] {
    const entities: EntityMatch[] = [];
    
    // TYT/AYT subject patterns with numbers
    const subjectPatterns = [
      // TYT subjects
      { pattern: /(?:tyt\s*)?türkçe\s*(\d+)(?:\s*doğru)?(?:\s*(\d+)\s*yanlış)?/gi, subject: 'turkish' },
      { pattern: /(?:tyt\s*)?matematik\s*(\d+)(?:\s*doğru)?(?:\s*(\d+)\s*yanlış)?/gi, subject: 'math' },
      { pattern: /(?:tyt\s*)?fen\s*(?:bilimleri?)?\s*(\d+)(?:\s*doğru)?(?:\s*(\d+)\s*yanlış)?/gi, subject: 'science' },
      { pattern: /(?:tyt\s*)?sosyal\s*(?:bilimler?)?\s*(\d+)(?:\s*doğru)?(?:\s*(\d+)\s*yanlış)?/gi, subject: 'social' },
      
      // AYT subjects
      { pattern: /(?:ayt\s*)?matematik\s*(\d+)(?:\s*doğru)?(?:\s*(\d+)\s*yanlış)?/gi, subject: 'math' },
      { pattern: /(?:ayt\s*)?fizik\s*(\d+)(?:\s*doğru)?(?:\s*(\d+)\s*yanlış)?/gi, subject: 'physics' },
      { pattern: /(?:ayt\s*)?kimya\s*(\d+)(?:\s*doğru)?(?:\s*(\d+)\s*yanlış)?/gi, subject: 'chemistry' },
      { pattern: /(?:ayt\s*)?biyoloji\s*(\d+)(?:\s*doğru)?(?:\s*(\d+)\s*yanlış)?/gi, subject: 'biology' },
      { pattern: /(?:ayt\s*)?edebiyat\s*(\d+)(?:\s*doğru)?(?:\s*(\d+)\s*yanlış)?/gi, subject: 'literature' },
      { pattern: /(?:ayt\s*)?tarih\s*(\d+)(?:\s*doğru)?(?:\s*(\d+)\s*yanlış)?/gi, subject: 'history' },
      { pattern: /(?:ayt\s*)?coğrafya\s*(\d+)(?:\s*doğru)?(?:\s*(\d+)\s*yanlış)?/gi, subject: 'geography' },
      { pattern: /(?:ayt\s*)?felsefe\s*(\d+)(?:\s*doğru)?(?:\s*(\d+)\s*yanlış)?/gi, subject: 'philosophy' },
      { pattern: /(?:ayt\s*)?din\s*(?:kültürü?)?\s*(\d+)(?:\s*doğru)?(?:\s*(\d+)\s*yanlış)?/gi, subject: 'religion' }
    ];

    for (const { pattern, subject } of subjectPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const correct = parseInt(match[1]);
        const wrong = match[2] ? parseInt(match[2]) : 0;
        
        entities.push({
          entity: subject,
          value: JSON.stringify({ correct, wrong }),
          confidence: 0.95,
          startIndex: match.index,
          endIndex: match.index + match[0].length
        });
      }
    }

    // General number patterns
    const numberPatterns = [
      { pattern: /(\d+)\s*doğru/gi, type: 'correct' },
      { pattern: /(\d+)\s*yanlış/gi, type: 'wrong' },
      { pattern: /(\d+)\s*net/gi, type: 'net' },
      { pattern: /(\d+)\s*puan/gi, type: 'score' }
    ];

    for (const { pattern, type } of numberPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          entity: type,
          value: match[1],
          confidence: 0.8,
          startIndex: match.index,
          endIndex: match.index + match[0].length
        });
      }
    }

    return entities;
  }

  /**
   * Calculate similarity between two Turkish texts
   */
  calculateSimilarity(text1: string, text2: string): number {
    const normalized1 = this.toAscii(this.normalizeText(text1));
    const normalized2 = this.toAscii(this.normalizeText(text2));
    
    return this.levenshteinSimilarity(normalized1, normalized2);
  }

  /**
   * Calculate Levenshtein similarity between two strings
   */
  private levenshteinSimilarity(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    const maxLength = Math.max(str1.length, str2.length);
    return maxLength === 0 ? 1 : (maxLength - matrix[str2.length][str1.length]) / maxLength;
  }
}