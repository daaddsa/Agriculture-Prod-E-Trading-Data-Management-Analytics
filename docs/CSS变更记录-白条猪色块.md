# CSS 变更记录：白条猪页面色块优化

## 目标
- 色块宽度增加 20–30%，高度减少 15–20%
- 色块内文字统一提升至 18–20px，字重 >= 500
- 色块间距保持不变（当前 gap=12px 不调整）
- 1920×1080、1366×768 下无横向滚动条

## 文件
- `pages/baitiao-pig-system/styles.css`

## 关键变更
### 1) 容器宽度（影响色块宽度）
- `.main-content max-width: 1400px → 1680px`
  - 在 1920×1080 下提升主内容承载宽度，从而使右侧统计色块整体宽度提升约 20%
  - 在 1366×768 下不会超过视口宽度，不会产生横向滚动条

### 2) 色块高度（统计卡片）
- `--block-height: 90px → 74px`（约 -18%）
- 移动端：`--block-height: 66px`

### 3) 色块文字（标题/数值）
- `--block-label-size: 16px → 18px`，并设置 `font-weight: 600`
- `--block-value-size: 24px → 20px`（统一到 18–20 范围），保留 `font-weight: 700`
- 小屏：`--block-label-size: 16px`、`--block-value-size: 18px`

### 4) 内边距与细节（保持视觉平衡）
- `.stat-card padding: 14px → 10px 12px`
- `.stat-label margin-bottom: 6px → 4px`
- `.stat-label line-height: 1.25 → 1.15`

## QA 压力测试（5 组数据量）
- 通过 URL 参数触发：`pages/baitiao-pig-system/index.html?qa=N`
  - N=1：约 20 行交易数据
  - N=2：约 80 行交易数据
  - N=3：约 200 行交易数据
  - N=4：约 500 行交易数据
  - N=5：约 1000 行交易数据
- 验收要点
  - 无横向滚动条（重点：1366×768 与 1920×1080）
  - 色块比例与间距稳定、文字不溢出
  - 表格与饼图组件正常渲染、滚动仅发生在纵向内容区域
