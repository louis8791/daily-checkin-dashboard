# PUBLIC_SCOPE

## 可公開

- 不含真實姓名的產品程式碼。
- AGENTS、PRD、TDD、ROADMAP、README 等通用規格。
- 明確標示為合成的假名測試資料。
- 不含真實資料的測試、CI 與 UI 示意。

## 永遠不得公開

- 真實姓名、暱稱、別名及名冊。
- 每日接龍原文、完成狀態、統計與更正紀錄。
- 含真實姓名的 PDF、圖表、截圖、錄影及分享訊息。
- 資料庫、試算表、CSV、備份、壓縮檔、log、分析事件。
- 密碼、token、加密金鑰、復原碼、環境檔及部署密鑰。
- 正式系統保存的密文資料；加密不代表適合進 source repository。

## 私人資料位置

真實資料只可位於：

- `E:\打卡\private-data`
- 正式產品的瀏覽器端加密資料區
- Owner 明確管理的加密備份

上述位置都不得成為本 Git repo 的子目錄、worktree、artifact 或 CI cache。

## 開發規則

- 所有測試與示意只用小明、小王、老陳等假名。
- 不把真實資料複製進 repo 來重現錯誤；用結構相同的合成案例重現。
- 不在 issue、PR、commit message、CI output 或錯誤追蹤貼入真實資料。
- 不使用 AI、LLM、OCR 或 AI PDF 服務處理姓名。
- 不公開真實畫面截圖；需要視覺驗收時使用假名環境。

## 每次公開前

1. 執行 `pwsh -File scripts/check-public-scope.ps1`。
2. 檢查 `git status --short`。
3. 檢查 `git diff --cached --name-only` 與 staged diff。
4. 確認所有姓名、接龍、PDF、圖片與匯出檔都是假資料或未被追蹤。
5. 只推送本次核准範圍。

自動檢查只能攔截已知高風險格式，不能證明內容沒有個資；人工 staged diff 檢查仍是必要 gate。
