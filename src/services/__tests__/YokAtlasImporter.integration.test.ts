import { YokAtlasImporter } from '../YokAtlasImporter';
import { University, Department, ScoreData } from '@/models';
import axios from 'axios';

// Mock axios for controlled testing
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('YokAtlasImporter Integration Tests', () => {
  let importer: YokAtlasImporter;

  beforeEach(() => {
    importer = new YokAtlasImporter();
    jest.clearAllMocks();
  });

  describe('Data Transformation and Validation Pipeline', () => {
    describe('University Data Processing', () => {
      it('should validate and transform university data correctly', async () => {
        const mockHtml = `
          <div class="university-list">
            <div class="university-item" data-university-id="1">
              <span class="university-name">  Marmara Üniversitesi  </span>
              <span class="university-city">İstanbul</span>
              <span class="university-type">Devlet</span>
            </div>
            <div class="university-item" data-university-id="2">
              <span class="university-name">Boğaziçi Üniversitesi</span>
              <span class="university-city">İstanbul</span>
              <span class="university-type">Devlet</span>
            </div>
          </div>
        `;

        mockedAxios.get.mockResolvedValue({ data: mockHtml });

        const universities = await importer.importUniversities();

        expect(universities).toHaveLength(2);
        
        const marmara = universities.find(u => u.id === 1);
        expect(marmara).toBeDefined();
        expect(marmara!.name).toBe('Marmara Üniversitesi'); // Trimmed
        expect(marmara!.city).toBe('İstanbul');
        expect(marmara!.type).toBe('Devlet');
        expect(marmara!.aliases).toContain('Marmara');
        expect(marmara!.aliases).toContain('M.Ü.');
      });

      it('should handle invalid university data gracefully', async () => {
        const mockHtml = `
          <div class="university-list">
            <div class="university-item" data-university-id="1">
              <span class="university-name">Valid University</span>
              <span class="university-city">İstanbul</span>
              <span class="university-type">Devlet</span>
            </div>
            <div class="university-item" data-university-id="invalid">
              <span class="university-name"></span>
              <span class="university-city">İstanbul</span>
              <span class="university-type">Devlet</span>
            </div>
            <div class="university-item" data-university-id="3">
              <span class="university-name">X</span>
              <span class="university-city">İstanbul</span>
              <span class="university-type">InvalidType</span>
            </div>
          </div>
        `;

        mockedAxios.get.mockResolvedValue({ data: mockHtml });

        const universities = await importer.importUniversities();

        // Should only return valid university
        expect(universities).toHaveLength(1);
        expect(universities[0].name).toBe('Valid University');
      });

      it('should generate proper university aliases', async () => {
        const mockHtml = `
          <div class="university-list">
            <div class="university-item" data-university-id="1">
              <span class="university-name">İstanbul Teknik Üniversitesi</span>
              <span class="university-city">İstanbul</span>
              <span class="university-type">Devlet</span>
            </div>
            <div class="university-item" data-university-id="2">
              <span class="university-name">Ankara Üniversitesi</span>
              <span class="university-city">Ankara</span>
              <span class="university-type">Devlet</span>
            </div>
          </div>
        `;

        mockedAxios.get.mockResolvedValue({ data: mockHtml });

        const universities = await importer.importUniversities();

        const itu = universities.find(u => u.name === 'İstanbul Teknik Üniversitesi');
        expect(itu!.aliases).toContain('İstanbul Teknik');
        expect(itu!.aliases).toContain('İ.T.Ü.');
        expect(itu!.aliases).toContain('İTÜ');
        expect(itu!.aliases).toContain('İst. Teknik Üniversitesi');

        const ankara = universities.find(u => u.name === 'Ankara Üniversitesi');
        expect(ankara!.aliases).toContain('Ankara');
        expect(ankara!.aliases).toContain('A.Ü.');
        expect(ankara!.aliases).toContain('Ank. Üniversitesi');
      });
    });

    describe('Department Data Processing', () => {
      it('should validate and transform department data correctly', async () => {
        const mockHtml = `
          <div class="department-list">
            <div class="department-item" data-department-id="101">
              <span class="department-name">  Bilgisayar Mühendisliği  </span>
              <span class="faculty-name">Mühendislik Fakültesi</span>
              <span class="language">Türkçe</span>
            </div>
            <div class="department-item" data-department-id="102">
              <span class="department-name">İşletme</span>
              <span class="faculty-name">İktisadi ve İdari Bilimler Fakültesi</span>
              <span class="language">İngilizce</span>
            </div>
          </div>
        `;

        mockedAxios.get.mockResolvedValue({ data: mockHtml });

        const departments = await importer.importDepartments(1);

        expect(departments).toHaveLength(2);
        
        const cs = departments.find(d => d.id === 101);
        expect(cs).toBeDefined();
        expect(cs!.name).toBe('Bilgisayar Mühendisliği'); // Trimmed
        expect(cs!.faculty).toBe('Mühendislik Fakültesi');
        expect(cs!.language).toBe('Türkçe');
        expect(cs!.universityId).toBe(1);
        expect(cs!.aliases).toContain('BM');
        expect(cs!.aliases).toContain('Bilgisayar');

        const business = departments.find(d => d.id === 102);
        expect(business!.language).toBe('İngilizce');
        expect(business!.aliases).toContain('İşl');
      });

      it('should normalize language fields correctly', async () => {
        const mockHtml = `
          <div class="department-list">
            <div class="department-item" data-department-id="101">
              <span class="department-name">Test Department 1</span>
              <span class="faculty-name">Test Faculty</span>
              <span class="language">ingilizce</span>
            </div>
            <div class="department-item" data-department-id="102">
              <span class="department-name">Test Department 2</span>
              <span class="faculty-name">Test Faculty</span>
              <span class="language">ENGLISH</span>
            </div>
            <div class="department-item" data-department-id="103">
              <span class="department-name">Test Department 3</span>
              <span class="faculty-name">Test Faculty</span>
              <span class="language">almanca</span>
            </div>
            <div class="department-item" data-department-id="104">
              <span class="department-name">Test Department 4</span>
              <span class="faculty-name">Test Faculty</span>
              <span class="language"></span>
            </div>
          </div>
        `;

        mockedAxios.get.mockResolvedValue({ data: mockHtml });

        const departments = await importer.importDepartments(1);

        expect(departments[0].language).toBe('İngilizce');
        expect(departments[1].language).toBe('İngilizce');
        expect(departments[2].language).toBe('Almanca');
        expect(departments[3].language).toBe('Türkçe'); // Default
      });

      it('should generate proper department aliases', async () => {
        const mockHtml = `
          <div class="department-list">
            <div class="department-item" data-department-id="101">
              <span class="department-name">Bilgisayar Mühendisliği</span>
              <span class="faculty-name">Mühendislik Fakültesi</span>
              <span class="language">Türkçe</span>
            </div>
            <div class="department-item" data-department-id="102">
              <span class="department-name">Elektrik Elektronik Mühendisliği</span>
              <span class="faculty-name">Mühendislik Fakültesi</span>
              <span class="language">Türkçe</span>
            </div>
            <div class="department-item" data-department-id="103">
              <span class="department-name">İşletme</span>
              <span class="faculty-name">İktisadi ve İdari Bilimler Fakültesi</span>
              <span class="language">Türkçe</span>
            </div>
          </div>
        `;

        mockedAxios.get.mockResolvedValue({ data: mockHtml });

        const departments = await importer.importDepartments(1);

        const cs = departments.find(d => d.name === 'Bilgisayar Mühendisliği');
        expect(cs!.aliases).toContain('BM');
        expect(cs!.aliases).toContain('Comp Eng');
        expect(cs!.aliases).toContain('Bilgisayar');

        const ee = departments.find(d => d.name === 'Elektrik Elektronik Mühendisliği');
        expect(ee!.aliases).toContain('EEM');
        expect(ee!.aliases).toContain('EE');
        expect(ee!.aliases).toContain('Elektrik');

        const business = departments.find(d => d.name === 'İşletme');
        expect(business!.aliases).toContain('İşl');
        expect(business!.aliases).toContain('Business');
      });
    });

    describe('Score Data Processing', () => {
      it('should validate and transform score data correctly', async () => {
        const mockHtml = `
          <table class="score-table">
            <tbody>
              <tr>
                <td class="score-type">SAY</td>
                <td class="base-score">450.567</td>
                <td class="ceiling-score">520.123</td>
                <td class="base-rank">15000</td>
                <td class="ceiling-rank">5000</td>
                <td class="quota">120</td>
              </tr>
              <tr>
                <td class="score-type">EA</td>
                <td class="base-score">380.999</td>
                <td class="ceiling-score">480.001</td>
                <td class="base-rank">25000</td>
                <td class="ceiling-rank">8000</td>
                <td class="quota">80</td>
              </tr>
            </tbody>
          </table>
        `;

        mockedAxios.get.mockResolvedValue({ data: mockHtml });

        const scoreData = await importer.importScoreData(101, 2023);

        expect(scoreData).toHaveLength(2);
        
        const sayScore = scoreData.find(s => s.scoreType === 'SAY');
        expect(sayScore).toBeDefined();
        expect(sayScore!.departmentId).toBe(101);
        expect(sayScore!.year).toBe(2023);
        expect(sayScore!.baseScore).toBe(450.57); // Rounded to 2 decimals
        expect(sayScore!.ceilingScore).toBe(520.12);
        expect(sayScore!.baseRank).toBe(15000);
        expect(sayScore!.ceilingRank).toBe(5000);
        expect(sayScore!.quota).toBe(120);

        const eaScore = scoreData.find(s => s.scoreType === 'EA');
        expect(eaScore!.baseScore).toBe(381.00); // Rounded to 2 decimals
        expect(eaScore!.ceilingScore).toBe(480.00);
      });

      it('should handle invalid score data gracefully', async () => {
        const mockHtml = `
          <table class="score-table">
            <tbody>
              <tr>
                <td class="score-type">SAY</td>
                <td class="base-score">450.5</td>
                <td class="ceiling-score">520.3</td>
                <td class="base-rank">15000</td>
                <td class="ceiling-rank">5000</td>
                <td class="quota">120</td>
              </tr>
              <tr>
                <td class="score-type">INVALID</td>
                <td class="base-score">380.2</td>
                <td class="ceiling-score">480.7</td>
                <td class="base-rank">25000</td>
                <td class="ceiling-rank">8000</td>
                <td class="quota">80</td>
              </tr>
              <tr>
                <td class="score-type">EA</td>
                <td class="base-score">700</td>
                <td class="ceiling-score">800</td>
                <td class="base-rank">25000</td>
                <td class="ceiling-rank">8000</td>
                <td class="quota">80</td>
              </tr>
              <tr>
                <td class="score-type">SOZ</td>
                <td class="base-score">500</td>
                <td class="ceiling-score">400</td>
                <td class="base-rank">25000</td>
                <td class="ceiling-rank">8000</td>
                <td class="quota">80</td>
              </tr>
            </tbody>
          </table>
        `;

        mockedAxios.get.mockResolvedValue({ data: mockHtml });

        const scoreData = await importer.importScoreData(101, 2023);

        // Should only return valid score data (SAY is valid, others are invalid)
        expect(scoreData).toHaveLength(1);
        expect(scoreData[0].scoreType).toBe('SAY');
      });

      it('should handle missing or malformed numeric data', async () => {
        const mockHtml = `
          <table class="score-table">
            <tbody>
              <tr>
                <td class="score-type">SAY</td>
                <td class="base-score">450.5</td>
                <td class="ceiling-score"></td>
                <td class="base-rank">invalid</td>
                <td class="ceiling-rank"></td>
                <td class="quota">-10</td>
              </tr>
            </tbody>
          </table>
        `;

        mockedAxios.get.mockResolvedValue({ data: mockHtml });

        const scoreData = await importer.importScoreData(101, 2023);

        expect(scoreData).toHaveLength(1);
        expect(scoreData[0].baseScore).toBe(450.5);
        expect(scoreData[0].ceilingScore).toBe(450.5); // Falls back to base score
        expect(scoreData[0].baseRank).toBe(0); // Falls back to 0
        expect(scoreData[0].ceilingRank).toBe(0);
        expect(scoreData[0].quota).toBe(0); // Invalid negative becomes 0
      });
    });

    describe('Fuzzy Matching', () => {
      it('should find best university match with high confidence', async () => {
        const existingUniversities = [
          new University({
            id: 1,
            name: 'Marmara Üniversitesi',
            city: 'İstanbul',
            type: 'Devlet',
            aliases: ['M.Ü.', 'Marmara'],
          }),
          new University({
            id: 2,
            name: 'Boğaziçi Üniversitesi',
            city: 'İstanbul',
            type: 'Devlet',
            aliases: ['B.Ü.', 'Boğaziçi'],
          }),
        ];

        // Test exact match
        let match = await importer.findBestUniversityMatch('Marmara Üniversitesi', existingUniversities);
        expect(match).toBeDefined();
        expect(match!.university.id).toBe(1);
        expect(match!.confidence).toBeGreaterThan(0.9);

        // Test alias match
        match = await importer.findBestUniversityMatch('M.Ü.', existingUniversities);
        expect(match).toBeDefined();
        expect(match!.university.id).toBe(1);

        // Test partial match
        match = await importer.findBestUniversityMatch('Marmara', existingUniversities);
        expect(match).toBeDefined();
        expect(match!.university.id).toBe(1);

        // Test no match (low confidence)
        match = await importer.findBestUniversityMatch('Completely Different University', existingUniversities);
        expect(match).toBeNull();
      });

      it('should find best department match within university', async () => {
        const existingDepartments = [
          new Department({
            id: 101,
            universityId: 1,
            name: 'Bilgisayar Mühendisliği',
            faculty: 'Mühendislik Fakültesi',
            language: 'Türkçe',
            aliases: ['BM', 'Comp Eng'],
          }),
          new Department({
            id: 102,
            universityId: 1,
            name: 'İşletme',
            faculty: 'İktisadi ve İdari Bilimler Fakültesi',
            language: 'Türkçe',
            aliases: ['İşl', 'Business'],
          }),
          new Department({
            id: 201,
            universityId: 2,
            name: 'Bilgisayar Mühendisliği',
            faculty: 'Mühendislik Fakültesi',
            language: 'Türkçe',
            aliases: ['BM', 'Comp Eng'],
          }),
        ];

        // Test exact match within university
        let match = await importer.findBestDepartmentMatch('Bilgisayar Mühendisliği', 1, existingDepartments);
        expect(match).toBeDefined();
        expect(match!.department.id).toBe(101); // Should match university 1, not 2
        expect(match!.confidence).toBeGreaterThan(0.9);

        // Test alias match
        match = await importer.findBestDepartmentMatch('BM', 1, existingDepartments);
        expect(match).toBeDefined();
        expect(match!.department.id).toBe(101);

        // Test no match in different university
        match = await importer.findBestDepartmentMatch('İşletme', 2, existingDepartments);
        expect(match).toBeNull(); // İşletme only exists in university 1
      });
    });

    describe('Batch Import with Progress', () => {
      it('should track progress correctly during batch import', async () => {
        // Mock successful responses for all stages
        const universityHtml = `
          <div class="university-list">
            <div class="university-item" data-university-id="1">
              <span class="university-name">Test University</span>
              <span class="university-city">İstanbul</span>
              <span class="university-type">Devlet</span>
            </div>
          </div>
        `;

        const departmentHtml = `
          <div class="department-list">
            <div class="department-item" data-department-id="101">
              <span class="department-name">Test Department</span>
              <span class="faculty-name">Test Faculty</span>
              <span class="language">Türkçe</span>
            </div>
          </div>
        `;

        const scoreHtml = `
          <table class="score-table">
            <tbody>
              <tr>
                <td class="score-type">SAY</td>
                <td class="base-score">450.5</td>
                <td class="ceiling-score">520.3</td>
                <td class="base-rank">15000</td>
                <td class="ceiling-rank">5000</td>
                <td class="quota">120</td>
              </tr>
            </tbody>
          </table>
        `;

        mockedAxios.get
          .mockResolvedValueOnce({ data: universityHtml })
          .mockResolvedValueOnce({ data: departmentHtml })
          .mockResolvedValueOnce({ data: scoreHtml });

        const progressUpdates: any[] = [];
        
        const result = await importer.importAllDataWithProgress(2023, (progress) => {
          progressUpdates.push(progress);
        });

        expect(result.universities).toHaveLength(1);
        expect(result.departments).toHaveLength(1);
        expect(result.scoreData).toHaveLength(1);
        expect(result.summary.successful).toBe(3);
        expect(result.summary.failed).toBe(0);
        expect(result.summary.errors).toHaveLength(0);

        // Verify progress updates
        expect(progressUpdates.length).toBeGreaterThan(0);
        expect(progressUpdates.some(p => p.stage === 'universities')).toBe(true);
        expect(progressUpdates.some(p => p.stage === 'departments')).toBe(true);
        expect(progressUpdates.some(p => p.stage === 'scoreData')).toBe(true);
      });

      it('should handle partial failures and continue processing', async () => {
        const universityHtml = `
          <div class="university-list">
            <div class="university-item" data-university-id="1">
              <span class="university-name">Valid University</span>
              <span class="university-city">İstanbul</span>
              <span class="university-type">Devlet</span>
            </div>
          </div>
        `;

        mockedAxios.get
          .mockResolvedValueOnce({ data: universityHtml })
          .mockRejectedValueOnce(new Error('Department fetch failed'))
          .mockResolvedValueOnce({ data: '<div></div>' }); // Empty score data

        const result = await importer.importAllDataWithProgress(2023);

        expect(result.universities).toHaveLength(1);
        expect(result.departments).toHaveLength(0);
        expect(result.scoreData).toHaveLength(0);
        expect(result.summary.failed).toBeGreaterThan(0);
        expect(result.summary.errors.length).toBeGreaterThan(0);
      });
    });

    describe('Error Handling and Retry Logic', () => {
      it('should retry failed requests up to maximum attempts', async () => {
        mockedAxios.get
          .mockRejectedValueOnce(new Error('Network error'))
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValueOnce({ data: '<div class="university-list"></div>' });

        // Should succeed after retries
        const universities = await importer.importUniversities();
        expect(universities).toBeDefined();
        expect(mockedAxios.get).toHaveBeenCalledTimes(3);
      });

      it('should fail after maximum retry attempts', async () => {
        mockedAxios.get.mockRejectedValue(new Error('Persistent network error'));

        await expect(importer.importUniversities()).rejects.toThrow('Persistent network error');
        expect(mockedAxios.get).toHaveBeenCalledTimes(3); // Initial + 2 retries
      });
    });
  });
});