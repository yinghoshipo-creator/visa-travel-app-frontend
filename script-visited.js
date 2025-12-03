// =========================================================
// === script-visited.js: 我的足跡頁面核心邏輯 (API 連接版) ===
// =========================================================

// --- 配置區 ---
const API_URL = 'https://visa-travel-app.zeabur.app/api/countries';
const USER_ID_KEY = 'travel_assistant_user_id';
// 使用英文國家名稱作為 localStorage 中的唯一鍵
const VISITED_KEY = 'travel_assistant_visited_countries'; 

// --- 變數聲明 ---
let allCountriesData = [];
let visitedCountries = new Set(); // 儲存已到訪國家的英文名稱
let currentLanguage = 'zh-TW'; // 追蹤當前頁面語言 (默認為中文)


// =========================================================
// === 1. 初始化與語言偵測 (修正: 增加語言切換重繪邏輯) ===
// =========================================================

/**
 * 偵測當前頁面語言 (中文或英文)
 */
function detectLanguage() {
    const htmlLang = document.documentElement.lang.toLowerCase();
    const newLanguage = htmlLang.startsWith('en') ? 'en' : 'zh-TW';

    // 修正: 如果語言發生變化且數據已載入，則重新渲染
    if (newLanguage !== currentLanguage && allCountriesData.length > 0) {
        currentLanguage = newLanguage;
        // 重新初始化篩選器 (更新 "所有地區" 的翻譯)
        initializeFilters(); 
        // 重新渲染列表 (更新國家名稱、狀態標籤和進度條)
        filterAndRenderCountries(); 
    } else {
        currentLanguage = newLanguage;
    }
}

/**
 * 獲取當前語言對應的國家名稱鍵
 */
function getNameKey() {
    // 這裡我們假設 API 數據已經被映射成 name_en/name_zh
    return currentLanguage === 'en' ? 'name_en' : 'name_zh';
}

/**
 * 根據當前語言翻譯文本
 */
function translate(text) {
    if (currentLanguage === 'en') {
        switch (text) {
            case '已到訪國家': return 'Visited Countries';
            case '總國家數': return 'Total Countries';
            case '正在載入國家列表...': return 'Loading country list...';
            case '所有地區': return 'All Regions';
            case '已到訪': return 'Visited';
            case '未到訪': return 'Not Visited';
            case '狀態篩選': return 'Status Filter';
            case '地區篩選': return 'Region Filter';
            case '搜尋國家...': return 'Search Country...';
            case '您的專屬使用者 ID (用於資料檢索和分享):': return 'Your Unique User ID (for data retrieval and sharing):';
            case '複製 ID': return 'Copy ID';
            case '載入國家列表失敗，請檢查網路或 API。': return 'Failed to load country list. Please check network or API.';
            case '沒有找到符合篩選條件的國家。': return 'No countries found matching the filter criteria.';
            case '未知': return 'Unknown';
            case '其他地區': return 'Other Regions';
            default: return text;
        }
    }
    return text;
}


// =========================================================
// === 2. User ID & LocalStorage 管理 (維持不變) ===
// =========================================================

function initializeUserId() {
    // 由於在 Canvas 環境中，我們應優先使用 Firestore 而非 localStorage，
    // 但為了保持與您腳本的相容性，這裡暫時維持使用 localStorage。
    let userId = localStorage.getItem(USER_ID_KEY);
    if (!userId) {
        // 使用更安全的 ID 生成方式，但保持結構
        userId = 'user_' + Math.random().toString(36).substring(2, 9) + Date.now().toString().substring(9);
        localStorage.setItem(USER_ID_KEY, userId);
    }
    const userIdDisplay = document.getElementById('userIdDisplay');
    if (userIdDisplay) {
        userIdDisplay.textContent = userId;
    }
    // 嘗試更新 ID 旁邊的 Label
    const userIdLabel = document.getElementById('userIdLabel');
    if (userIdLabel) {
        userIdLabel.textContent = translate('您的專屬使用者 ID (用於資料檢索和分享):');
    }
    const copyIdButton = document.getElementById('copyIdButton');
    if (copyIdButton) {
        copyIdButton.textContent = translate('複製 ID');
    }
}

function loadVisitedData() {
    const visitedArray = JSON.parse(localStorage.getItem(VISITED_KEY) || '[]');
    visitedCountries = new Set(visitedArray);
}

function saveVisitedData() {
    const visitedArray = Array.from(visitedCountries);
    localStorage.setItem(VISITED_KEY, JSON.stringify(visitedArray));
}

/**
 * 處理國家復選框點擊事件
 * @param {string} countryNameEn - 國家的英文名稱 (作為唯一 ID)
 */
window.handleCountryToggle = function(countryNameEn) {
    if (visitedCountries.has(countryNameEn)) {
        visitedCountries.delete(countryNameEn);
    } else {
        visitedCountries.add(countryNameEn);
    }
    saveVisitedData();
    filterAndRenderCountries(); // 重新渲染以更新進度條和列表
}


// =========================================================
// === 3. 數據獲取 (修正: 確保 API 鍵名映射) ===
// =========================================================

async function fetchCountryList() {
    const loadingMessage = document.getElementById('loadingMessage');
    if (loadingMessage) loadingMessage.textContent = translate('正在載入國家列表...');

    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const rawData = await response.json();
        
        // 確保數據有效
        if (!Array.isArray(rawData) || rawData.length === 0) {
            throw new Error("API 返回的數據無效或為空。");
        }

        // 修正: 執行數據映射，將 API 鍵名與前端邏輯使用的鍵名對齊
        allCountriesData = rawData.map(c => ({
            // API 鍵名 -> 前端邏輯鍵名
            name_zh: c.countryNameZh || c.name_zh || translate('未知'), 
            name_en: c.countryNameEn || c.name_en || translate('Unknown'), 
            regionZh: c.regionZh || c.region || translate('其他地區'), // 確保 regionZh 被正確提取
            ...c
        }));
        
        if (loadingMessage) loadingMessage.classList.add('hidden');

        // 數據載入後，初始化篩選器並渲染
        initializeFilters();
        filterAndRenderCountries();

    } catch (error) {
        console.error("無法載入國家列表：", error);
        if (loadingMessage) {
            loadingMessage.textContent = translate('載入國家列表失敗，請檢查網路或 API。');
            loadingMessage.classList.remove('hidden');
        }
    }
}

// =========================================================
// === 4. 篩選器與渲染邏輯 (修正: 修正地區鍵名) ===
// =========================================================

/**
 * 初始化篩選器選項 (地區)
 */
function initializeFilters() {
    const categoryFilter = document.getElementById('categoryFilter');
    if (!categoryFilter) return;
    
    // 修正: 應從 API 數據中使用 regionZh 鍵來提取地區列表
    const regions = [...new Set(allCountriesData.map(c => c.regionZh).filter(r => r && r !== 'N/A'))];
    
    // 清空現有選項，並添加 'All' 選項
    categoryFilter.innerHTML = `<option value="All">${translate('所有地區')}</option>`;
    
    // 根據當前語言選擇排序方式
    const locale = currentLanguage === 'en' ? 'en' : 'zh-TW';
    regions.sort((a, b) => a.localeCompare(b, locale));

    // 添加地區選項 (地區名稱使用 API 返回的中文名稱，因為篩選值是中文)
    regions.forEach(region => {
        const option = document.createElement('option');
        option.value = region;
        option.textContent = region;
        categoryFilter.appendChild(option);
    });
    
    // 確保篩選器的標籤被翻譯
    document.getElementById('visitedFilter').options[0].textContent = translate('狀態篩選');
    document.getElementById('visitedFilter').options[1].textContent = translate('已到訪');
    document.getElementById('visitedFilter').options[2].textContent = translate('未到訪');
    
    document.getElementById('searchInput').placeholder = translate('搜尋國家...');
}

/**
 * 根據篩選條件過濾並渲染國家列表
 */
function filterAndRenderCountries() {
    const visitedStatus = document.getElementById('visitedFilter')?.value || 'All';
    const region = document.getElementById('categoryFilter')?.value || 'All';
    const searchText = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const nameKey = getNameKey();

    let filteredData = allCountriesData.filter(country => {
        const isVisited = visitedCountries.has(country.name_en);
        const nameMatch = country.name_zh.toLowerCase().includes(searchText) || 
                          country.name_en.toLowerCase().includes(searchText);

        // 1. 篩選已到訪狀態
        if (visitedStatus === 'Visited' && !isVisited) return false;
        if (visitedStatus === 'Not-Visited' && isVisited) return false;

        // 2. 篩選地區 (這裡使用 regionZh 是正確的，因為 initializeFilters 也使用了 regionZh)
        if (region !== 'All' && country.regionZh !== region) return false;

        // 3. 篩選搜尋文字
        if (searchText && !nameMatch) return false;
        
        return true;
    });

    // 渲染過濾後的數據
    renderCountryChecklist(filteredData);
}


/**
 * 渲染國家列表的復選框
 * @param {Array} countriesToRender - 要渲染的國家數據數組
 */
function renderCountryChecklist(countriesToRender = allCountriesData) {
    const checklistContainer = document.getElementById('countryChecklist');
    const nameKey = getNameKey();
    
    if (!checklistContainer) return;

    // 國家列表按當前語言名稱排序
    const sortedData = countriesToRender.sort((a, b) => {
        const locale = currentLanguage === 'en' ? 'en' : 'zh-TW';
        return (a[nameKey] || '').localeCompare((b[nameKey] || ''), locale);
    });

    checklistContainer.innerHTML = '';
    
    if (sortedData.length === 0) {
        checklistContainer.innerHTML = `<p class="text-center text-gray-500 p-8 col-span-full">${translate('沒有找到符合篩選條件的國家。')}</p>`;
    }

    sortedData.forEach(country => {
        const countryName = country[nameKey];
        const countryNameEn = country.name_en; // 確保我們使用 name_en 作為 ID
        const isVisited = visitedCountries.has(countryNameEn);
        const id = `country-${countryNameEn.replace(/\s/g, '_')}`;

        // 使用橙色調來凸顯已到訪
        const itemHtml = `
            <div class="flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition duration-150 ease-in-out hover:bg-orange-50 ${isVisited ? 'bg-orange-100 border border-orange-400 shadow-md' : 'bg-white border border-gray-200'}"
                 onclick="handleCountryToggle('${countryNameEn}')">
                
                <input type="checkbox" id="${id}" ${isVisited ? 'checked' : ''}
                       class="h-5 w-5 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 flex-shrink-0 pointer-events-none">
                
                <label for="${id}" class="text-base font-medium text-gray-900 flex-grow leading-tight select-none">
                    ${countryName} 
                    <span class="text-xs text-gray-500 block">(${country.name_en})</span>
                </label>
            </div>
        `;
        checklistContainer.insertAdjacentHTML('beforeend', itemHtml);
    });

    updateProgress();
}


// =========================================================
// === 5. 進度條更新與統計數據 (修正: 更新標籤翻譯) ===
// =========================================================

function updateProgress() {
    const visitedCount = visitedCountries.size;
    const totalCount = allCountriesData.length;
    
    // 計算進度百分比
    let percentage = 0;
    if (totalCount > 0) {
        percentage = Math.round((visitedCount / totalCount) * 100);
    }
    
    // 更新 DOM 元素 (確保 ID 正確對應 HTML 結構)
    document.getElementById('visitedCount').textContent = visitedCount;
    document.getElementById('totalCountriesCount').textContent = totalCount;
    document.getElementById('percentageDisplay').textContent = `${percentage}%`;
    
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
    }
    
    // 更新標籤的翻譯
    const visitedLabel = document.getElementById('visitedCountLabel');
    const totalLabel = document.getElementById('totalCountriesCountLabel');
    if (visitedLabel) visitedLabel.textContent = translate('已到訪國家');
    if (totalLabel) totalLabel.textContent = translate('總國家數');
}


// =========================================================
// === 6. 啟動程序 ===
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. 偵測語言 (影響後續翻譯和國家名稱顯示)
    detectLanguage();

    // 2. 初始化 User ID
    initializeUserId();
    
    // 3. 載入已到訪記錄
    loadVisitedData();
    
    // 4. 獲取國家列表並啟動渲染
    fetchCountryList();
});