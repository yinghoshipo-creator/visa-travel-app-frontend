// --- 配置區 (Configuration) ---
// **請將此處替換為您的 Zeabur 服務 API 端點**
const API_BASE_URL = 'https://visa-travel-app.zeabur.app'; 

// 【本地備用數據，用於 API 故障時】
const MOCK_VISA_DATA = [
    { countryCn: '汶萊', countryEn: 'Brunei', visaType: 'Visa-Free', duration: '14天', notes: '觀光免簽。', category: '亞太地區' },
    { countryCn: '日本', countryEn: 'Japan', visaType: 'Visa-Free', duration: '90天', notes: '觀光、商務等短期停留。', category: '亞太地區' },
    { countryCn: '德國', countryEn: 'Germany', visaType: 'Visa-Free', duration: '90天', notes: '申根區免簽。', category: '歐洲地區(申根區)' }, // 新增申根區範例
    { countryCn: '英國', countryEn: 'United Kingdom', visaType: 'Visa-Free', duration: '180天', notes: '觀光免簽。', category: '歐洲地區' },
    { countryCn: '美國', countryEn: 'United States of America', visaType: 'e-Visa', duration: '90天', notes: '須事先上網取得「旅行授權電子系統(ESTA)」授權許可。', category: '美洲地區' },
    { countryCn: '伊朗', countryEn: 'Iran', visaType: 'Required', duration: '依簽證核發', notes: '需辦理簽證。', category: '亞西地區' }, 
];
// 【本地備用地區列表】: 確保涵蓋所有實際地區，包括帶括號的
const MOCK_REGIONS = ['亞太地區', '歐洲地區', '歐洲地區(申根區)', '美洲地區', '亞西地區', '非洲地區', '其他地區'];

let allVisaData = [];
let isDataLoaded = false;


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

    console.warn(`[mapVisaType 警告] 未匹配到的簽證類型: "${chineseType}". 預設為 'Required'。`);
    return 'Required'; 
}

function mapFilterValue(filterValue) {
    if (filterValue === 'All' || filterValue === '全部簽證' || filterValue === '所有地區') return 'All';
    if (filterValue.includes('免簽證')) return 'Visa-Free';
    if (filterValue.includes('落地簽證')) return 'Visa-on-Arrival';
    if (filterValue.includes('電子簽證')) return 'e-Visa';
    if (filterValue.includes('須辦理簽證')) return 'Required';
    return filterValue;
}

function getVisaStyle(type) {
    switch (type) {
        case 'Visa-Free':
            return { color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-500', label: '免簽證' };
        case 'Visa-on-Arrival':
            return { color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-500', label: '落地簽證' };
        case 'e-Visa':
            return { color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-500', label: '電子簽證/eTA' };
        case 'Required':
            return { color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-500', label: '須辦理簽證' };
        default:
            return { color: 'text-gray-600', bgColor: 'bg-gray-100', borderColor: 'border-gray-300', label: '未知' };
    }
}


// =========================================================
// === 動態載入地區篩選器選項 (保持穩定) ===
// =========================================================

function renderRegionFilter(regions) {
    const categoryFilter = document.getElementById('categoryFilter');
    if (!categoryFilter) return;

    categoryFilter.innerHTML = '<option value="All">所有地區 (篩選)</option>'; 

    regions.sort((a, b) => a.localeCompare(b, 'zh-TW'));

    regions.forEach(region => {
        if (region && region !== 'N/A') { 
            const option = document.createElement('option');
            // 確保 option.value 完整，包括括號
            option.value = region; 
            option.textContent = region;
            categoryFilter.appendChild(option);
        }
    });
}

async function fetchRegions() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/regions`);
        if (!response.ok) {
             throw new Error(`API 響應錯誤: ${response.status}`);
        }
        
        const regions = await response.json();
        
        if (Array.isArray(regions) && regions.length > 0) {
            renderRegionFilter(regions);
        } else {
            renderRegionFilter(MOCK_REGIONS);
        }
        
    } catch (error) {
        console.error("無法從 API 載入地區列表，使用本地備用地區。", error);
        renderRegionFilter(MOCK_REGIONS);
    }
}

// =========================================================
// === 主要數據載入與處理 (保持穩定) ===
// =========================================================

async function fetchVisaData() {
    const loadingMessage = document.getElementById('loadingMessage');
    if (loadingMessage) loadingMessage.textContent = '正在從 Zeabur 伺服器載入簽證數據...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/visas`);
        
        if (!response.ok) {
            throw new Error(`API 響應錯誤: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!Array.isArray(data)) {
            throw new Error('API 返回的數據格式不正確');
        }

        const transformedData = data.map(country => ({
            countryCn: country.countryNameZh || '', 
            countryEn: country.countryNameEn || '', 
            visaType: mapVisaType(country.visaType), 
            duration: country.stayDays || 'N/A', 
            // 這裡的 country.region 必須是完整名稱，例如 '歐洲地區(申根區)'
            category: country.region || '其他地區', 
            notes: country.notes || country.requirementDetail || '請參考官方連結' 
        }));

        allVisaData = transformedData; 
        isDataLoaded = true;

        if (loadingMessage) loadingMessage.classList.add('hidden');
        
        updateCounts(allVisaData);
        filterAndSortData();

    } catch (error) {
        console.error(`無法從 API 載入數據: ${error.message}，使用本地備用數據。`, error);
        
        allVisaData = MOCK_VISA_DATA;
        isDataLoaded = true;

        if (loadingMessage) {
            loadingMessage.textContent = `數據載入失敗 (${error.message || '連線錯誤'})，已切換至本地備用數據。`;
            loadingMessage.classList.remove('hidden'); 
        }
        
        updateCounts(allVisaData);
        filterAndSortData();
    }
}


// =========================================================
// === 篩選與渲染函數 (保持穩定) ===
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

    statsContainer.innerHTML = `
        <div class="p-5 bg-blue-100 rounded-xl shadow-lg border border-blue-200 col-span-2 md:col-span-1">
            <div class="flex items-center space-x-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                <div>
                    <p class="text-sm font-medium text-blue-700">總體免簽/便利數</p>
                    <p class="text-3xl font-extrabold text-blue-800">${passportPower}</p>
                </div>
            </div>
        </div>
        <div class="p-5 bg-white rounded-xl shadow-md border border-gray-200"><p class="text-sm font-medium text-gray-500">免簽證</p><p class="text-2xl font-bold text-blue-600 mt-1">${visaFreeCount}</p></div>
        <div class="p-5 bg-white rounded-xl shadow-md border border-gray-200"><p class="text-sm font-medium text-gray-500">落地簽證</p><p class="text-2xl font-bold text-blue-600 mt-1">${voaCount}</p></div>
        <div class="p-5 bg-white rounded-xl shadow-md border border-gray-200"><p class="text-sm font-medium text-gray-500">電子簽證</p><p class="text-2xl font-bold text-blue-600 mt-1">${evisaCount}</p></div>
        <div class="p-5 bg-red-50 rounded-xl shadow-md border border-red-300 col-span-2 md:col-span-1">
             <div class="flex items-center space-x-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-red-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <div>
                    <p class="text-sm font-medium text-red-700">須辦理簽證 (警示)</p>
                    <p class="text-2xl font-extrabold text-red-700">${requiredCount}</p>
                </div>
            </div>
        </div>
        <div class="p-5 bg-white rounded-xl shadow-md border border-gray-200 col-span-2 md:col-span-1">
             <div class="flex items-center space-x-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM12 4v8m0 0v8m0-8h8m-8 0H4" /></svg>
                <div>
                    <p class="text-sm font-medium text-gray-500">總國家數 (已載入)</p>
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
        // 由於 option.value 和 country.category 都包含括號/地區字眼，這裡使用精確匹配 (===) 是正確的。
        filteredData = filteredData.filter(country => country.category === categoryFilterValue);
    }

    if (searchInput) {
        filteredData = filteredData.filter(country => 
            country.countryCn.toLowerCase().includes(searchInput) || 
            country.countryEn.toLowerCase().includes(searchInput)
        );
    }

    // 排序邏輯 (保持穩定)
    filteredData.sort((a, b) => {
        if (sortValue === 'name_asc') {
            const nameA = a.countryEn || '';
            const nameB = b.countryEn || '';
            return nameA.localeCompare(nameB);
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
                <div class="flex justify-between items-center mb-3">
                    <h3 class="text-xl font-bold text-gray-900">${country.countryCn} <span class="text-gray-500 text-sm font-normal">(${country.countryEn})</span></h3>
                    <span class="flex items-center flex-shrink-0 px-3 py-1 text-sm font-semibold rounded-full ${style.color} bg-white border ${style.borderColor} ml-4 shadow-inner">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 ${style.color.replace('text-', 'stroke-')}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            ${country.visaType === 'Visa-Free' ? 
                                '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a12 12 0 00-4.242 1.622M20 12h-4M4 12H8m12 0v4m0-4c0 4.418-4.03 8-9 8s-9-3.582-9-8 4.03-8 9-8c2.176 0 4.22.42 6.016 1.182" />' : 
                            country.visaType === 'Visa-on-Arrival' ? 
                                '<path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />' : 
                            country.visaType === 'e-Visa' ?
                                '<path stroke-linecap="round" stroke-linejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1v-3m-6 0h6m-5-5a1 1 0 110-2 1 1 0 010 2zm1-9.75v5.25a.75.75 0 01-.75.75H5.25a.75.75 0 01-.75-.75V5.25m8.25-1.5h.008v.008h-.008V3.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />' : 
                            country.visaType === 'Required' ?
                                '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />' : 
                            '' }
                        </svg>
                        ${style.label}
                    </span>
                </div>
                
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div class="flex items-center space-x-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-4 4V3m-2 4h4M4 11h16M4 15h16M4 19h16" /></svg>
                        <span class="text-gray-600 font-medium">停留天數:</span>
                        <span class="font-bold ${style.color}">${country.duration}</span>
                    </div>
                    <div class="flex items-center space-x-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" /></svg>
                        <span class="text-gray-600 font-medium">地區:</span>
                        <span class="font-bold text-gray-800">${country.category}</span>
                    </div>
                </div>

                <div class="text-xs ${style.color} pt-3 mt-3 border-t border-dashed ${style.borderColor.replace('500', '300')}">
                    <span class="font-semibold text-gray-700">📌 備註: </span>${country.notes}
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
    // 1. 動態載入地區列表
    fetchRegions();
    
    // 2. 執行異步簽證數據抓取
    fetchVisaData();
    
    // 3. 註冊事件監聽器 
    document.getElementById('searchInput')?.addEventListener('input', filterAndSortData);
    document.getElementById('visaFilter')?.addEventListener('change', filterAndSortData);
    document.getElementById('categoryFilter')?.addEventListener('change', filterAndSortData);
    document.getElementById('sortOption')?.addEventListener('change', filterAndSortData);
});