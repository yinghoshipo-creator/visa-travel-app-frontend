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
        emptyMessage.style.display = 'block';
        clearBtn.style.display = 'none';
        return;
    }

    emptyMessage.style.display = 'none';
    clearBtn.style.display = 'inline-block';

    countries.forEach(country => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${country}</span>
            <button class="remove-btn" data-country="${country}" title="移除紀錄">
                <i class="fas fa-trash-alt"></i>
            </button>
        `;
        visitedList.appendChild(li);
    });
}

/**
 * 移除單一國家紀錄
 * @param {string} countryName - 要移除的國家名稱
 */
function removeCountry(countryName) {
    if (confirm(`確定要從全球足跡中移除 ${countryName} 嗎？`)) {
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
    if (confirm('確定要清空所有全球足跡紀錄嗎？此操作不可逆。')) {
        localStorage.removeItem('visitedCountries');
        renderVisitedList(); // 重新渲染列表
    }
}

// --- 事件監聽器 ---

visitedList.addEventListener('click', (e) => {
    const removeButton = e.target.closest('.remove-btn');
    if (removeButton) {
        const country = removeButton.dataset.country;
        removeCountry(country);
    }
});

clearBtn.addEventListener('click', clearAllRecords);

// --- 初始化 ---
document.addEventListener('DOMContentLoaded', renderVisitedList);