# CSS 变更记录：交易量趋势图页面色块优化

## 目标
- 色块宽度增加 20–30%，高度减少 15–20%
- 色块内文字提升到 18–20px，字重 >= 500
- 色块间距保持不变
- 1920×1080、1366×768 无横向滚动条
- QA 压力测试：5 组不同数据量

## 文件
- `pages/procurement-dashboard/styles.css`
- `pages/procurement-dashboard/app.js`

## 关键变更（styles.css）
1) 侧栏宽度（影响色块宽度）
- `.sidebar width: 200px → 250px`（+25%）

2) 色块高度（菜单色块）
- `--block-height: 116px → 94px`（约 -19%）
- 小屏（<=720px）：`--block-height: 80px`

3) 色块文字
- `--block-menu-size: 13px → 18px`（统一提升至 18–20 区间）
- `.menu-item font-weight: 600`

4) 防止悬停位移导致横向滚动
- `.sidebar overflow-x: hidden`

## QA 压力测试（app.js）
- 通过 URL 参数：`pages/procurement-dashboard/index.html?qa=N`
  - N=0：12 个类目（默认）
  - N=1：24 个类目
  - N=2：60 个类目
  - N=3：120 个类目
  - N=4：240 个类目
  - N=5：360 个类目

验收要点：
- 1366×768 / 1920×1080 下无横向滚动条
- 图表可正常渲染并随 resize 自适应
- 色块高度更紧凑、字体更清晰，间距未改变（margin-bottom/gap 保持原值）
