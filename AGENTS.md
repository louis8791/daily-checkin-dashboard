# AGENTS.md

## 專案目標

建立一個不使用 AI 處理姓名的私人行動紀錄網頁：管理者可貼上每日接龍，系統即時統計 10 人在八週內的完成次數、達成率、圖表與 PDF；群組成員可用手機或電腦唯讀查看。

## 必讀順序

1. `C:\Users\user\OneDrive\문서\Obsidian Vault\00_Index\Agent Skill Router Index.md`
2. `C:\Users\user\OneDrive\문서\Obsidian Vault\30_Projects\打卡\Project State.md`
3. 本檔
4. `PRD.md`
5. `TDD.md`
6. `ROADMAP.md`
7. `PUBLIC_SCOPE.md`

只讀目前 Task 需要的內容，不遍歷整個 Vault。

## 權威順序

1. 使用者當下明確指令
2. repo 內 `AGENTS.md`、`PRD.md`、`TDD.md`、`ROADMAP.md`
3. Obsidian `Project State.md`
4. `Reusable Lessons.md`
5. Run Note 與 Change Log

Run Note 與 Change Log 只提供歷史證據，不得取代目前權威。

## 單一正式根目錄

- Canonical root：`E:\打卡`
- 公開 Git repo：`E:\打卡\repo`
- 真實資料：`E:\打卡\private-data`
- 驗收證據：`E:\打卡\evidence`

不得建立 `E:\打卡-test`、`E:\打卡-rc` 等兄弟根目錄。所有 worktree、測試、交付與 scratch 必須位於 `E:\打卡` 內。

## 公開與私人資料硬邊界

- 本 repo 為公開程式碼區，只能出現假名與合成資料。
- 真實姓名、別名、名冊、每日接龍、每日完成狀態、統計結果、PDF、截圖、備份、匯出檔及解密金鑰，禁止進入本 repo。
- 真實資料只可寫入 `E:\打卡\private-data` 或正式系統的加密資料區，不得複製到 repo 內測試。
- 不把真實姓名貼入任何 AI、LLM、提示詞、issue、commit message、CI log、分析服務或錯誤回報。
- 開發、測試、截圖與文件只使用合成字串或明確假名；本機正式使用者輸入的姓名不得回填到公開 source。
- 任何無法確認是否含真實資料的檔案，一律不得 stage、commit 或 push。

## Product Contract

- 管理者在手機或電腦直接貼上接龍原文、檢查辨識結果並確認；日期與本機成員索引由原文自動建立，不要求先選日期或輸入名冊。
- 貼上內容可直接是群組原文：標語、日期／星期行、編號姓名與外層括號都可保留；解析只取編號姓名行。
- 確認後，所有週次、個人、排行與 PDF 資料立即更新。
- 群組成員只能透過受保護的唯讀入口查看。
- 系統不得把「尚未匯入某日資料」冒充為 10 人皆未完成。

## Data Contract

- 日期區間固定為 2026-08-18 至 2026-10-12，共 8 週、56 天。
- 成員固定 10 人，期間不加入、不退出、無同名者；原型從首次貼上的編號姓名自動建立本機索引，不要求手動輸入名冊。
- 姓名出現在指定日期的接龍中，即計完成 1 次；同日重複只計 1 次。
- 23:59 後可以補登，補登後算完成，不顯示遲交。
- 不設請假排除；未出現在已確認接龍中的日期，該日完成次數為 0。
- 原始輸入、解析結果、顯示統計與 PDF 必須可追溯到同一份已確認日紀錄。

## Model Contract

- 正式產品不使用任何 AI 模型或 AI API。
- 姓名辨識只可用原文編號行與本機索引的確定性字串解析與比對。
- 不得為了方便接入 OCR、聊天模型、AI 分析、AI 圖表或 AI PDF 服務。

## State Boundary

- `fixture`：公開 repo 內的合成測試字串與數值；原型不預填姓名或日紀錄。
- `browser-local`：使用者在本機頁面貼上的接龍、由編號行自動建立的成員索引與統計，僅存瀏覽器 `localStorage`，不得送入 AI 或公開 repo。
- `private-data`：repo 外的真實名冊與接龍資料。
- `runtime encrypted data`：正式網站僅保存加密內容；伺服器不得取得姓名明文。
- `exports`：使用者裝置產生的 PDF／匯出檔，不回存公開 repo。
- 上述狀態不得互相混用。

## AI 改動範圍閘門

使用者直接要求即授權完成範圍內必要動作，不重複詢問權限。修改前先凍結目標、會改範圍、不會改範圍、驗收與風險；只有缺失資訊會實質改變核心結果時才問最少問題。不得順手擴充、刪除、覆寫或修正無關內容。

## 修改前後檢查

修改前：

1. 讀本檔與相關權威段落。
2. 確認使用的是假名資料。
3. 檢查 Git branch、status 與本次範圍。

修改後：

1. 執行 `pwsh -File scripts/check-public-scope.ps1`。
2. 執行與改動相稱的 focused tests。
3. 檢查 `git diff`、`git status` 與 staged 檔案。
4. 更新四份權威文件、Project State、Run Note 與 Obsidian Change Log 中需要同步的狀態。
5. 只有實際完成手機、桌機、權限、加密、PDF 與重新整理驗收後，才可宣稱對應功能完成。

## No Fake Success

- 原始接龍缺失、解析異常、沒有日期／編號姓名、重複資料、解密失敗或 PDF 產生失敗時，必須顯示原因並停止寫入。
- 自動測試通過不等於手機與群組實際使用已驗收。
- source、build、部署、群組入口與 Owner 驗收必須分開回報。

## Current Prototype Boundary

- `index.html`、`styles.css`、`app.mjs` 是可在本機瀏覽器執行的原型；一般腳本載入支援直接檔案入口，HTTP 本機入口仍是主要驗收入口。
- 原型可在每日頁直接貼上接龍、預覽、去重、將新編號姓名加入本機索引並自動判斷常見日期格式；找不到日期或沒有編號姓名時必須停止並提示。
- 原型沒有模型輔助、登入、正式加密、雲端同步、群組唯讀權限或五種正式 PDF 報表；不得把本機 self-check／smoke test 當成上述功能完成。
