// --- DOM 元素選取 ---
const visitedList = document.getElementById('visitedList');
const countryCountElement = document.getElementById('countryCount');
const emptyMessage = document.getElementById('emptyMessage');
const clearBtn = document.getElementById('clearBtn');

// --- 核心邏輯 ---

/**
 * 從 LocalStorage 讀取造訪國家名單
 * @returns {Array<string>} 國家名稱陣列
 */
function getVisitedCountries() {
    const visited = JSON.parse(localStorage.getItem('visitedCountries')) || {};
    // 將物件的 keys (國家名稱) 轉為陣列並按字母排序
    return Object.keys(visited).sort((a, b) => a.localeCompare(b, 'zh'));
}

/**
 * 渲染國家列表到頁面
 */
function renderVisitedList() {
    const countries = getVisitedCountries();
    visitedList.innerHTML = ''; // 清空現有列表

    countryCountElement.textContent = countries.length;

    if (countries.length === 0) {
        // 沒有紀錄時顯示提示訊息，隱藏清空按鈕
        emptyMessage.style.display = 'block';
        clearBtn.style.display = 'none';
        return;
    }

    // 有紀錄時隱藏提示訊息，顯示清空按鈕
    emptyMessage.style.display = 'none';
    clearBtn.style.display = 'inline-block';

    countries.forEach(country => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${country}</span>
            <button class="remove-btn" data-country="${country}" title="移除紀錄">
                <i class="fas fa-trash-alt"></i> </button>
        `;
        visitedList.appendChild(li);
    });
}

/**
 * 移除單一國家紀錄
 * @param {string} countryName - 要移除的國家名稱
 */
function removeCountry(countryName) {
    if (confirm(`確定要從造訪紀錄中移除 ${countryName} 嗎？`)) {
        const visited = JSON.parse(localStorage.getItem('visitedCountries')) || {};
        delete visited[countryName];
        localStorage.setItem('visitedCountries', JSON.stringify(visited));
        renderVisitedList(); // 重新渲染列表
    }
}

/**
 * 清空所有造訪紀錄
 */
function clearAllRecords() {
    if (confirm('確定要清空所有造訪紀錄嗎？此操作不可逆。')) {
        localStorage.removeItem('visitedCountries');
        renderVisitedList(); // 重新渲染列表
    }
}

// --- 事件監聽器 ---

// 監聽單一國家移除按鈕的點擊
visitedList.addEventListener('click', (e) => {
    // 確保點擊的是 'remove-btn' 或其子圖示
    const removeButton = e.target.closest('.remove-btn');
    if (removeButton) {
        const country = removeButton.dataset.country;
        removeCountry(country);
    }
});

// 監聽清空紀錄按鈕
clearBtn.addEventListener('click', clearAllRecords);

// --- 初始化 ---
document.addEventListener('DOMContentLoaded', renderVisitedList);