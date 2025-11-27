/* script.js - 前端邏輯 (純 Vanilla JS)
   簡單說明：
   - API_BASE: 改成你部署在 Zeabur 的後端位置，例如 "https://your-zeabur-app.fly.dev"
   - LocalStorage: key = "visitedCountries" (存成陣列的 JSON 字串)
*/

/* ===== 設定 ===== */
const API_BASE = "https://visa-travel-app.zeabur.app/"; 
// 本機測試時可改為 http://localhost:3000

/* ===== 共用幫手函式 ===== */
// 取得訪問紀錄陣列（LocalStorage）
function loadVisited(){
  const raw = localStorage.getItem("visitedCountries");
  try{
    return raw ? JSON.parse(raw) : [];
  }catch(e){
    return [];
  }
}
// 儲存訪問紀錄
function saveVisited(arr){
  localStorage.setItem("visitedCountries", JSON.stringify(arr));
}

/* ===== 首页 / 初始化 ===== */
document.addEventListener("DOMContentLoaded", () => {
  // 如果在每個頁面都引入，本段保守，不會出錯
  initVisaPage();
  initVisitedPage();
});

/* ===== 簽證查詢頁面邏輯 ===== */
function initVisaPage(){
  const countryInput = document.getElementById("countryInput");
  const searchBtn = document.getElementById("searchBtn");
  if(!searchBtn) return;

  const result = document.getElementById("result");
  const countryNameEl = document.getElementById("countryName");
  const visaRequirement = document.getElementById("visaRequirement");
  const stayDays = document.getElementById("stayDays");
  const processEl = document.getElementById("process");
  const documentsEl = document.getElementById("documents");
  const feeEl = document.getElementById("fee");
  const officialLink = document.getElementById("officialLink");
  const visitedCheckbox = document.getElementById("visitedCheckbox");

  // 搜尋按鈕
  searchBtn.addEventListener("click", async () => {
    const q = countryInput.value.trim();
    if(!q){ alert("請輸入國家名稱"); return; }
    // 呼叫後端 API
    try{
      const resp = await fetch(`${API_BASE}/api/visa/${encodeURIComponent(q)}`);
      if(!resp.ok){
        alert("查無資料（可能後端未啟動或國家不存在）");
        return;
      }
      const data = await resp.json();

      // 顯示資料
      result.classList.remove("hidden");
      countryNameEl.textContent = data.name;
      visaRequirement.textContent = data.visa_requirement;
      stayDays.textContent = data.stay_days || "（未提供）";
      processEl.textContent = data.process || "請參考官方網站步驟。";
      documentsEl.textContent = data.documents || "一般護照、照片等。";
      feeEl.textContent = data.fee || "依各國官方公告";
      officialLink.href = data.official_link || "#";
      officialLink.textContent = data.official_link ? "官方 / 更多資訊" : "暫無官方連結";

      // 設定勾選框（是否已到過）
      const visitedArr = loadVisited();
      visitedCheckbox.checked = visitedArr.includes(data.code || data.name);

      // 勾選變更 -> 寫 LocalStorage
      visitedCheckbox.onchange = () => {
        const arr = loadVisited();
        const id = data.code || data.name;
        if(visitedCheckbox.checked){
          if(!arr.includes(id)) arr.push(id);
        } else {
          const idx = arr.indexOf(id);
          if(idx>-1) arr.splice(idx,1);
        }
        saveVisited(arr);
        // 更新造訪頁面（如果已開啟）
        updateVisitedUI();
      };

    }catch(err){
      console.error(err);
      alert("伺服器連線錯誤，請確認後端有啟動或 API_BASE 是否正確。");
    }
  });
}

/* ===== 造訪紀錄頁面邏輯 ===== */
function initVisitedPage(){
  // 這會在 DOMContentLoaded 呼叫
  updateVisitedUI();
}

function updateVisitedUI(){
  const visitedListEl = document.getElementById("visitedList");
  const visitedCountEl = document.getElementById("visitedCount");
  const progressFill = document.getElementById("progressFill");
  const percentText = document.getElementById("percentText");
  if(!visitedListEl) return;
  const arr = loadVisited();
  visitedListEl.innerHTML = "";
  if(arr.length===0){
    visitedListEl.innerHTML = "<p>目前尚未勾選任何國家。</p>";
  } else {
    arr.forEach(id=>{
      const div = document.createElement("div");
      div.className = "visitedItem";
      div.textContent = id;
      visitedListEl.appendChild(div);
    });
  }

  // 已造訪國家數量與進度（全球 195 國）
  const total = 195;
  const count = arr.length;
  const percent = Math.round((count/total)*100);
  visitedCountEl.textContent = count;
  percentText.textContent = percent + "%";
  progressFill.style.width = percent + "%";
}
