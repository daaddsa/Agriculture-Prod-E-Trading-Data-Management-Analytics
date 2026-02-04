## 现状确认
- “交易量趋势图页面”对应子页面：`pages/procurement-dashboard/index.html`，仅有 1 个图表容器 `#trendChart`。
- 当前实现为堆叠柱状图：`pages/procurement-dashboard/app.js` 中三条 series 均为 `type: "bar"` 且 `stack: "total"`。

## 修改目标
- 将该页面所有图表（当前仅 `#trendChart`）改为折线图：series `type` 改为 `"line"`。
- 保持现有配色体系与图例结构一致，且在 `qa=5` 大数据量下仍可用。

## 具体改动
### 1) 调整 ECharts 配置为折线图
- 在 `pages/procurement-dashboard/app.js`：
  - 将三条 series 的 `type: "bar"` 改为 `type: "line"`。
  - 移除 `stack: "total"`，改为三条独立折线（更符合趋势图语义）。
  - 为折线增加简约可读性配置：
    - `smooth: true`
    - `lineStyle: { width: 2 }`
    - `symbol: "circle"`、`symbolSize: 5`
    - `showSymbol` 根据点数自动开关（点数大时关闭，避免拥挤/性能问题）。
  - `tooltip.axisPointer.type` 从 `shadow` 改为 `line`（折线图更匹配）。

### 2) 修正 y 轴最大值计算
- 目前 maxY 按“堆叠和”计算；移除 stack 后，maxY 改为三条数据的最大值（并留出缓冲）。

### 3) 性能与压力测试保持
- 保留现有 `qa=0..5` 的数据量机制。
- 对于 `qa>=3` 的大量点数：
  - `showSymbol: false`
  - 可选加 `sampling: "lttb"` 提升渲染稳定性（不改变视觉趋势）。

## 验证方式（执行阶段）
- 打开并对比：
  - `pages/procurement-dashboard/index.html`
  - `pages/procurement-dashboard/index.html?qa=5`
- 检查点：
  - 图表是否为折线，图例/tooltip 正常
  - resize 自适应正常
  - 大数据量下无明显卡顿、无报错

## 交付物
- 更新文件：`pages/procurement-dashboard/app.js`（仅改图表配置为折线图）。