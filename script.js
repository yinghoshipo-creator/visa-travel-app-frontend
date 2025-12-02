// --- 配置區 ---
// 請根據您的 Zeabur 部署端點修改此變數！
const API_BASE_URL = 'https://visa-travel-app.zeabur.app'; // 替換成您的後端 URL

// --- DOM 元素選取 ---
const countryInput = document.getElementById('countryInput');
const searchBtn = document.getElementById('searchBtn');
const messageArea = document.getElementById('messageArea');
const resultSection = document.getElementById('result');

// 結果顯示的 Span 元素
const elements = {
    countryName: document.getElementById('countryName'),
    visaRequirement: document.getElementById('visaRequirement'),
    stayDays: document.getElementById('stayDays'),
    process: document.getElementById('process'),
    documents: document.getElementById('documents'),
    fee: document.getElementById('fee'),
    officialLink: document.getElementById('officialLink'),
    visitedCheckbox: document.getElementById('visitedCheckbox')
};

// --- 狀態切換 UX 邏輯 ---

/**
 * 顯示載入中的訊息，並隱藏結果區
 */
function showLoading() {
    messageArea.innerHTML = '<div class="message-card">⏳ 資料查詢中... 請稍候。</div>';
    resultSection.classList.remove('visible'); // 移除顯示類別 (CSS 會處理平滑隱藏)
}

/**
 * 顯示錯誤訊息
 * @param {string} message - 錯誤內容
 */
function showError(message) {
    messageArea.innerHTML = `<div class="message-card error-card">⚠️ ${message}</div>`;
    resultSection.classList.remove('visible');
}

/**
 * 清除所有訊息區，準備顯示結果
 */
function clearMessage() {
    messageArea.innerHTML = '';
}

/**
 * 渲染簽證資料到頁面
 * @param {object} data - 簽證資料物件
 */
function renderVisaData(data) {
    // 渲染資料
    elements.countryName.textContent = data.countryName || 'N/A';
    elements.visaRequirement.textContent = data.requirement || 'N/A';
    elements.stayDays.textContent = data.days || 'N/A';
    elements.process.textContent = data.process || 'N/A';
    elements.documents.textContent = data.documents || 'N/A';
    elements.fee.textContent = data.fee || 'N/A';

    // 處理連結
    if (data.link) {
        elements.officialLink.href = data.link;
        elements.officialLink.textContent = '官方 / 更多資訊';
    } else {
        elements.officialLink.href = '#';
        elements.officialLink.textContent = '無官方連結';
    }

    // 處理已到過紀錄（LocalStorage 邏輯）
    const visited = JSON.parse(localStorage.getItem('visitedCountries')) || {};
    elements.visitedCheckbox.checked = !!visited[data.countryName]; // 檢查是否已存在

    // 顯示結果區 (利用 CSS Class 處理動畫)
    clearMessage();
    resultSection.classList.add('visible'); 
}


// --- API 請求與主邏輯 ---

async function fetchVisaData(country) {
    showLoading();
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/visa?country=${encodeURIComponent(country)}`);
        
        if (!response.ok) {
            // 處理 404 (找不到國家) 或 500 錯誤
            throw new Error(`查詢失敗: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            // 處理後端回傳的邏輯錯誤，例如：國家不存在
            throw new Error(data.error);
        }

        renderVisaData(data);

    } catch (error) {
        console.error('API 查詢錯誤:', error);
        showError('找不到該國家或伺服器錯誤。請確認輸入的名稱是否正確。');
    }
}

// --- 事件監聽器 ---

searchBtn.addEventListener('click', () => {
    const country = countryInput.value.trim();
    if (country) {
        fetchVisaData(country);
    } else {
        showError('請輸入國家名稱後再查詢！');
    }
});

countryInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchBtn.click(); // 按 Enter 鍵時觸發查詢
    }
});

elements.visitedCheckbox.addEventListener('change', (e) => {
    const countryName = elements.countryName.textContent;
    if (countryName && countryName !== '國家名稱') {
        const visited = JSON.parse(localStorage.getItem('visitedCountries')) || {};
        
        if (e.target.checked) {
            visited[countryName] = true; // 紀錄已造訪
            alert(`已將 ${countryName} 加入您的造訪紀錄！`);
        } else {
            delete visited[countryName]; // 取消造訪
            alert(`${countryName} 已從您的造訪紀錄中移除。`);
        }
        localStorage.setItem('visitedCountries', JSON.stringify(visited));
        // 這裡可以考慮觸發造訪紀錄頁面的更新邏輯
    }
});

// 初始設定：隱藏結果區，直到有資料
resultSection.classList.remove('visible');