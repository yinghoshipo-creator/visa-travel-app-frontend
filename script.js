// =========================================================
// === script.js: 簽證頁面核心邏輯 (中英雙語兼容版) ===
// =========================================================

// --- 配置區 (Configuration) ---
const API_BASE_URL = 'https://visa-travel-app.zeabur.app'; 

// 【本地備用數據，用於 API 故障時】
const MOCK_VISA_DATA = [
    // 保持數據的中文和英文名稱
    { countryCn: '汶萊', countryEn: 'Brunei', visaType: 'Visa-Free', duration: '14天', notes: '觀光免簽。', category: '亞太地區' },
    { countryCn: '日本', countryEn: 'Japan', visaType: 'Visa-Free', duration: '90天', notes: '觀光、商務等短期停留。', category: '亞太地區' },
    { countryCn: '德國', countryEn: 'Germany', visaType: 'Visa-Free', duration: '90天', notes: '申根區免簽。', category: '歐洲地區(申根區)' }, 
    { countryCn: '美國', countryEn: 'United States of America', visaType: 'e-Visa', duration: '90天', notes: '須事先上網取得「旅行授權電子系統(ESTA)」授權許可。', category: '美洲地區' },
    { countryCn: '伊朗', countryEn: 'Iran', visaType: 'Required', duration: '依簽證核發', notes: '需辦理簽證。', category: '亞西地區' }, 
];
// 【本地備用地區列表】
const MOCK_REGIONS = ['亞太地區', '歐洲地區', '歐洲地區(申根區)', '美洲地區', '亞西地區', '非洲地區', '其他地區'];

let allVisaData = [];
let isDataLoaded = false;
let currentLanguage = 'zh-TW'; // ★ 預設為中文，但會被 detectLanguage 覆蓋

// =========================================================
// === 輔助函數：多語言翻譯與偵測 (核心修正) ===
// =========================================================

/**
 * 偵測當前頁面語言 (中文或英文)
 */
function detectLanguage() {
    const htmlLang = document.documentElement.lang.toLowerCase();
    currentLanguage = htmlLang.startsWith('en') ? 'en' : 'zh-TW';
}

/**
 * 核心翻譯函數：根據 currentLanguage 進行翻譯。
 */
function translate(text) {
    // 如果是中文頁面 (或找不到翻譯)，直接返回原始文本
    if (currentLanguage === 'zh-TW') {
        // 為了讓中文頁面能顯示「未知」
        if (text === '未知') return '未知'; 
        return text; 
    }

    // 英文頁面 (currentLanguage === 'en')
    switch (text) {
        // 簽證類型
        case '免簽證': return 'Visa-Free';
        case '落地簽證': return 'Visa-on-Arrival';
        case '電子簽證/eTA': return 'e-Visa / eTA';
        case '須辦理簽證': return 'Visa Required';

        // 統計儀表板標題
        case '總體免簽/便利數': return 'Total Visa-Free/Easy Access';
        case '總國家數 (已載入)': return 'Total Countries (Loaded)';
        case '須辦理簽證 (警示)': return 'Visa Required (Alert)';
        
        // 國家卡片標籤
        case '停留天數': return 'Max Stay';
        case '地區': return 'Region';
        case '📌 備註:': return '📌 Notes:';

        // 載入與篩選
        case '所有地區 (篩選)': return 'All Regions (Filter)';
        case '正在從 Zeabur 伺服器載入簽證數據...': return 'Loading visa data from Zeabur server...';
        case '無法從 API 載入數據': return 'Failed to load data from API';
        case '已切換至本地備用數據。': return 'switched to local mock data.';
        case '載入失敗': return 'Load Failed';
        case '未知': return 'Unknown';
        
        // 雜項
        case '請參考官方連結': return 'Please refer to official sources';
        case '全部簽證': return 'All'; 
        
        default: return text; 
    }
}


// =========================================================
// === 輔助函數：簽證類型與篩選值轉換 (保持穩定) ===
// =========================================================

function mapVisaType(chineseType) {
    if (!chineseType) return 'Required';
    const type = chineseType.toLowerCase().trim();

    if (type.includes('免簽')) return 'Visa-Free';
    if (type.includes('落地簽')) return 'Visa-on-Arrival';
    if (type.includes('電子簽') || type.includes('e-visa') || type.includes('eta')) return 'e-Visa';
    if (type.includes('須辦理') || type.includes('需辦理')) return 'Required';

    // 警告訊息不翻譯
    console.warn(`[mapVisaType Warning] Unmatched visa type: "${chineseType}". Defaulting to 'Required'.`);
    return 'Required'; 
}

/**
 * 核心函數：根據簽證類型回傳對應的 Tailwind CSS 顏色類別和標籤 (自動中英切換)。
 */
function getVisaStyle(type) {
    // 這裡調用 translate 函數來自動判斷應顯示中文還是英文標籤
    switch (type) {
        case 'Visa-Free':
            return { color: 'text-blue-600', bgColor: 'bg-blue-100', borderColor: 'border-blue-500', label: translate('免簽證') };
        case 'Visa-on-Arrival':
            return { color: 'text-teal-600', bgColor: 'bg-teal-100', borderColor: 'border-teal-500', label: translate('落地簽證') };
        case 'e-Visa':
            return { color: 'text-purple-600', bgColor: 'bg-purple-100', borderColor: 'border-purple-500', label: translate('電子簽證/eTA') };
        case 'Required':
            return { color: 'text-orange-600', bgColor: 'bg-orange-100', borderColor: 'border-orange-500', label: translate('須辦理簽證') };
        default:
            return { color: 'text-gray-600', bgColor: 'bg-gray-100', borderColor: 'border-gray-300', label: translate('未知') };
    }
}


function mapFilterValue(filterValue) {
    if (filterValue === 'All' || filterValue === translate('全部簽證') || filterValue === translate('所有地區')) return 'All';
    
    if (filterValue.includes('免簽證')) return 'Visa-Free'; 
    if (filterValue.includes('落地簽證')) return 'Visa-on-Arrival';
    if (filterValue.includes('電子簽證')) return 'e-Visa';
    if (filterValue.includes('須辦理簽證')) return 'Required';
    
    return filterValue;
}

// =========================================================
// === 動態載入地區篩選器選項 (根據語言排序) ===
// =========================================================

function renderRegionFilter(regions) {
    const categoryFilter = document.getElementById('categoryFilter');
    if (!categoryFilter) return;

    // 使用 translate 函數來設定默認選項
    categoryFilter.innerHTML = `<option value="All">${translate('所有地區 (篩選)')}</option>`; 

    // 根據當前語言選擇排序方式
    const locale = currentLanguage === 'en' ? 'en' : 'zh-TW';
    regions.sort((a, b) => a.localeCompare(b, locale));

    regions.forEach(region => {
        if (region && region !== 'N/A') { 
            const option = document.createElement('option');
            option.value = region; 
            // 由於地區名稱來自 API，我們直接使用 API 數據
            option.textContent = region;
            categoryFilter.appendChild(option);
        }
    });
}

async function fetchRegions() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/regions`);
        if (!response.ok) {
             throw new Error(`API response error: ${response.status}`);
        }
        
        const regions = await response.json();
        
        if (Array.isArray(regions) && regions.length > 0) {
            renderRegionFilter(regions);
        } else {
            renderRegionFilter(MOCK_REGIONS);
        }
        
    } catch (error) {
        console.error("Failed to load regions from API, using mock regions.", error);
        renderRegionFilter(MOCK_REGIONS);
    }
}

// =========================================================
// === 主要數據載入與處理 (修正 ArrayOfData 錯誤) ===
// =========================================================

async function fetchVisaData() {
    const loadingMessage = document.getElementById('loadingMessage');
    // 使用 translate 翻譯載入訊息
    if (loadingMessage) loadingMessage.textContent = translate('正在從 Zeabur 伺服器載入簽證數據...');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/visas`);
        
        if (!response.ok) {
            throw new Error(`API response error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // 核心修正點：使用 Array.isArray()
        if (!Array.isArray(data)) { 
            throw new Error('API returned incorrect data format');
        }

        // 轉換數據格式
        const transformedData = data.map(country => ({
            countryCn: country.countryNameZh || '', 
            countryEn: country.countryNameEn || '', 
            visaType: mapVisaType(country.visaType), 
            duration: country.stayDays || 'N/A', 
            category: country.region || translate('其他地區'), 
            notes: country.notes || country.requirementDetail || translate('請參考官方連結') 
        }));

        allVisaData = transformedData; 
        isDataLoaded = true;

        if (loadingMessage) loadingMessage.classList.add('hidden');
        
        updateCounts(allVisaData);
        filterAndSortData();

    } catch (error) {
        // 使用 translate 翻譯錯誤提示
        const errorMsg = `(${error.message || '連線錯誤'})，${translate('已切換至本地備用數據。')}`;
        // 由於 console.error 不翻譯，這裡保持英文以利開發者偵錯
        console.error(`Failed to load data from API: ${errorMsg}`, error);
        
        allVisaData = MOCK_VISA_DATA;
        isDataLoaded = true;

        if (loadingMessage) {
            loadingMessage.textContent = `${translate('載入失敗')} ${errorMsg}`;
            loadingMessage.classList.remove('hidden'); 
        }
        
        updateCounts(allVisaData);
        filterAndSortData();
    }
}


// =========================================================
// === 篩選與渲染函數 (自動中英切換) ===
// =========================================================

function updateCounts(data) {
    const statsContainer = document.getElementById('statsContainer');
    if (!statsContainer) return;

    const totalCountries = data.length;
    const visaFreeCount = data.filter(c => c.visaType === 'Visa-Free').length;
    const voaCount = data.filter(c => c.visaType === 'Visa-on-Arrival').length;
    const evisaCount = data.filter(c => c.visaType === 'e-Visa').length;
    const requiredCount = data.filter(c => c.visaType === 'Required').length;
    const passportPower = visaFreeCount + voaCount + evisaCount;

    // 所有的中文標籤都使用 translate() 函數
    statsContainer.innerHTML = `
        <div class="p-5 bg-blue-100 rounded-xl shadow-lg border border-blue-200 col-span-2 md:col-span-1">
            <div class="flex items-center space-x-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                <div>
                    <p class="text-sm font-medium text-blue-700">${translate('總體免簽/便利數')}</p>
                    <p class="text-3xl font-extrabold text-blue-800">${passportPower}</p>
                </div>
            </div>
        </div>
        <div class="p-5 bg-blue-100 rounded-xl shadow-md border border-blue-300"><p class="text-sm font-medium text-blue-700">${translate('免簽證')}</p><p class="text-2xl font-bold text-blue-600 mt-1">${visaFreeCount}</p></div>
        <div class="p-5 bg-teal-100 rounded-xl shadow-md border border-teal-300"><p class="text-sm font-medium text-teal-700">${translate('落地簽證')}</p><p class="text-2xl font-bold text-teal-600 mt-1">${voaCount}</p></div>
        <div class="p-5 bg-purple-100 rounded-xl shadow-md border border-purple-300"><p class="text-sm font-medium text-purple-700">${translate('電子簽證/eTA')}</p><p class="text-2xl font-bold text-purple-600 mt-1">${evisaCount}</p></div>
        <div class="p-5 bg-orange-100 rounded-xl shadow-md border border-orange-300 col-span-2 md:col-span-1">
             <div class="flex items-center space-x-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-orange-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <div>
                    <p class="text-sm font-medium text-orange-700">${translate('須辦理簽證 (警示)')}</p>
                    <p class="text-2xl font-extrabold text-orange-700">${requiredCount}</p>
                </div>
            </div>
        </div>
        <div class="p-5 bg-white rounded-xl shadow-md border border-gray-200 col-span-2 md:col-span-1">
             <div class="flex items-center space-x-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM12 4v8m0 0v8m0-8h8m-8 0H4" /></svg>
                <div>
                    <p class="text-sm font-medium text-gray-500">${translate('總國家數 (已載入)')}</p>
                    <p class="text-2xl font-extrabold text-gray-800">${totalCountries}</p>
                </div>
            </div>
        </div>
    `;
}

function filterAndSortData() {
    if (!isDataLoaded) {
        return;
    }

    const searchInput = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const rawVisaFilterValue = document.getElementById('visaFilter')?.value || 'All';
    const visaFilterValue = mapFilterValue(rawVisaFilterValue); 
    const categoryFilterValue = document.getElementById('categoryFilter')?.value || 'All'; 

    const sortValue = document.getElementById('sortOption')?.value || 'name_asc';

    let filteredData = allVisaData;

    if (visaFilterValue !== 'All') {
        filteredData = filteredData.filter(country => country.visaType === visaFilterValue);
    }
    
    if (categoryFilterValue !== 'All') {
        filteredData = filteredData.filter(country => country.category === categoryFilterValue);
    }

    if (searchInput) {
        filteredData = filteredData.filter(country => 
            country.countryCn.toLowerCase().includes(searchInput) || 
            country.countryEn.toLowerCase().includes(searchInput)
        );
    }

    // 根據當前語言決定排序依據
    const nameKey = currentLanguage === 'en' ? 'countryEn' : 'countryCn';

    filteredData.sort((a, b) => {
        if (sortValue === 'name_asc') {
            const nameA = a[nameKey] || '';
            const nameB = b[nameKey] || '';
            const locale = currentLanguage === 'en' ? 'en' : 'zh-TW';
            return nameA.localeCompare(nameB, locale);
        } else if (sortValue === 'days_desc' || sortValue === 'days_asc') {
            const parseDuration = (durationStr) => {
                if (!durationStr || typeof durationStr !== 'string') return 0;

                const match = durationStr.match(/(\d+)/);
                if (a.visaType === 'Required' || durationStr.includes('依核發結果') || durationStr.includes('依簽證核發')) {
                    return sortValue === 'days_desc' ? -1 : 9999; 
                }
                return match ? parseInt(match[1], 10) : 0;
            };

            const daysA = parseDuration(a.duration);
            const daysB = parseDuration(b.duration);
            
            if (sortValue === 'days_desc') {
                return daysB - daysA; 
            } else {
                return daysA - daysB; 
            }
        }
        return 0;
    });

    renderVisaList(filteredData);
}

function renderVisaList(data) {
    const visaList = document.getElementById('visaList');
    const noResults = document.getElementById('noResults');
    const nameKey = currentLanguage === 'en' ? 'countryEn' : 'countryCn';
    const altNameKey = currentLanguage === 'en' ? 'countryCn' : 'countryEn';
    
    if (!visaList) return;

    if (data.length === 0) {
        visaList.innerHTML = '';
        noResults?.classList.remove('hidden');
        return;
    }

    noResults?.classList.add('hidden');
    
    const cardsHtml = data.map(country => {
        const style = getVisaStyle(country.visaType); 
        
        return `
            <div class="${style.bgColor} p-5 rounded-xl shadow-md border-l-4 ${style.borderColor} transform transition duration-300 hover:shadow-xl hover:scale-[1.01]">
                <div class="flex justify-between items-start mb-3">
                    <h3 class="text-xl font-bold text-gray-900">${country[nameKey]} <span class="text-gray-500 text-sm font-normal">(${country[altNameKey]})</span></h3>
                    
                    <span class="flex items-center flex-shrink-0 px-3 py-1 text-xs font-semibold rounded-full ${style.color} bg-white border ${style.borderColor} ml-4 shadow-inner">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1 ${style.color.replace('text-', 'stroke-')}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                             <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a12 12 0 00-4.242 1.622M20 12h-4M4 12H8m12 0v4m0-4c0 4.418-4.03 8-9 8s-9-3.582-9-8 4.03-8 9-8c2.176 0 4.22.42 6.016 1.182" />
                        </svg>
                        ${style.label}
                    </span>
                </div>
                
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mt-3 border-t border-dashed ${style.borderColor.replace('500', '300')} pt-3">
                    <div class="flex items-center space-x-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-4 4V3m-2 4h4M4 11h16M4 15h16M4 19h16" /></svg>
                        <span class="text-gray-600 font-medium">${translate('停留天數')}:</span>
                        <span class="font-bold ${style.color}">${country.duration}</span>
                    </div>
                    <div class="flex items-center space-x-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" /></svg>
                        <span class="text-gray-600 font-medium">${translate('地區')}:</span>
                        <span class="font-bold text-gray-800">${country.category}</span>
                    </div>
                </div>

                <div class="text-xs ${style.color} pt-3 mt-3 border-t border-dashed ${style.borderColor.replace('500', '300')}">
                    <span class="font-semibold text-gray-700">${translate('📌 備註:')}</span>${country.notes}
                </div>
            </div>
        `;
    }).join('');

    visaList.innerHTML = cardsHtml;
}


/**
 * 【模組範圍內啟動】
 */
document.addEventListener('DOMContentLoaded', () => {
    // ★ 第一步：偵測當前頁面語言
    detectLanguage();

    fetchRegions();
    fetchVisaData();
    
    // 註冊事件監聽器 
    document.getElementById('searchInput')?.addEventListener('input', filterAndSortData);
    document.getElementById('visaFilter')?.addEventListener('change', filterAndSortData);
    document.getElementById('categoryFilter')?.addEventListener('change', filterAndSortData);
    document.getElementById('sortOption')?.addEventListener('change', filterAndSortData);
});