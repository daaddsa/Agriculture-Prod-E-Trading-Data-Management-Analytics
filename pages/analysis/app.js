(function () {
  const { createApp } = Vue;

  function parseQaLevel() {
    const params = new URLSearchParams(window.location.search);
    const v = Number(params.get("qa"));
    if (!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(5, Math.floor(v)));
  }

  function generateXAxis(count) {
    const arr = [];
    for (let i = 1; i <= count; i++) arr.push(String(i));
    return arr;
  }

  function generateSeriesData(count, seed, base, variance) {
    const out = [];
    for (let i = 0; i < count; i++) {
      const t = Math.sin((i + seed) * 0.63) + Math.cos((i + seed) * 0.23);
      const v = Math.max(0, Math.round(base + t * variance + (i % 7) * 3));
      out.push(v);
    }
    return out;
  }

  createApp({
    data() {
      return {
        market: "A",
        date: new Date().toISOString().split("T")[0],
        markets: [
          { value: "A", label: "市场A" },
          { value: "B", label: "市场B" },
          { value: "C", label: "市场C" },
        ],
        minDate: "",
        maxDate: "",
        reports: [],
        pageSize: 8,
        currentPage: 1,
        showPreview: false,
        previewReport: null,
      };
    },
    mounted() {
      const today = new Date();
      const past30 = new Date(today);
      past30.setDate(today.getDate() - 30);
      const future7 = new Date(today);
      future7.setDate(today.getDate() + 7);

      this.minDate = past30.toISOString().split("T")[0];
      this.maxDate = future7.toISOString().split("T")[0];

      this.initChart();
      this.initReports();
      this.calcPageSize();
      window.addEventListener("resize", this.calcPageSize);
    },
    methods: {
      handleMarketChange() {
        console.log("Market changed to:", this.market);
        // Add data refresh logic here if needed
      },
      handleDateChange() {
        console.log("Date changed to:", this.date);
        // Add data refresh logic here if needed
      },
      initChart() {
        const el = document.getElementById("trendChart");
        if (!el) return;

        const chart = echarts.init(el);

        const qa = parseQaLevel();
        const qaMap = {
          0: 12,
          1: 24,
          2: 60,
          3: 120,
          4: 240,
          5: 360,
        };
        const points = qaMap[qa] || 12;
        const dense = points > 60;
        const xAxisData = generateXAxis(points);
        const aData = generateSeriesData(points, 1, 110, 35);
        const bData = generateSeriesData(points, 2, 130, 45);
        const cData = generateSeriesData(points, 3, 70, 28);
        const maxY = Math.max(200, ...aData, ...bData, ...cData);

        const option = {
          tooltip: {
            trigger: "axis",
            axisPointer: { type: "line" },
          },
          legend: {
            data: ["A类", "B类", "C类"],
            right: "10%",
          },
          grid: {
            left: "3%",
            right: "4%",
            bottom: "3%",
            containLabel: true,
          },
          xAxis: {
            type: "category",
            data: xAxisData,
          },
          yAxis: {
            type: "value",
            max: maxY,
          },
          series: [
            {
              name: "A类",
              type: "line",
              smooth: true,
              showSymbol: !dense,
              symbol: "circle",
              symbolSize: 5,
              sampling: "lttb",
              lineStyle: { width: 2, color: "#2563eb" },
              itemStyle: { color: "#2563eb" },
              data: aData,
            },
            {
              name: "B类",
              type: "line",
              smooth: true,
              showSymbol: !dense,
              symbol: "circle",
              symbolSize: 5,
              sampling: "lttb",
              lineStyle: { width: 2, color: "#1f8a98" },
              itemStyle: { color: "#1f8a98" },
              data: bData,
            },
            {
              name: "C类",
              type: "line",
              smooth: true,
              showSymbol: !dense,
              symbol: "circle",
              symbolSize: 5,
              sampling: "lttb",
              lineStyle: { width: 2, color: "#fbbf24" },
              itemStyle: { color: "#fbbf24" },
              data: cData,
            },
          ],
        };

        chart.setOption(option);

        window.addEventListener("resize", () => chart.resize());
      },
      initReports() {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, "0");
        const dateStr = (d) =>
          `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
            d.getHours()
          )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        const samples = [
          "交易量与交易额相关性分析",
          "交易均价走势周期性分析",
          "佣金费率变动影响研究",
          "异常交易识别与校验报告",
          "供需结构对价格的影响",
          "区域间价格传导效应",
          "节假日前后交易活跃度",
          "周度行情综述与预测",
          "批发市场品类结构分析",
          "价格波动的风险提示",
          "流向地区分布特征分析",
          "月度交易综合分析",
        ];
        this.reports = samples.map((name, i) => {
          const d = new Date(now);
          d.setDate(now.getDate() - i);
          return {
            id: i + 1,
            name,
            uploadedAt: dateStr(d),
            summary:
              "该报告从交易量、交易额、交易均价、佣金费率等维度进行统计分析，并对趋势进行解读，提供策略建议与风险提示。",
            fileUrl: null,
          };
        });
      },
      calcPageSize() {
        this.pageSize = 8;
        const maxPage = Math.max(1, Math.ceil(this.reports.length / this.pageSize));
        this.currentPage = Math.min(this.currentPage, maxPage);
      },
      nextPage() {
        const maxPage = Math.ceil(this.reports.length / this.pageSize);
        if (this.currentPage < maxPage) this.currentPage++;
      },
      prevPage() {
        if (this.currentPage > 1) this.currentPage--;
      },
      preview(r) {
        this.previewReport = r;
        this.showPreview = true;
      },
      closePreview() {
        this.showPreview = false;
        this.previewReport = null;
      },
      download(r) {
        const blob = new Blob(
          [
            `报告名称: ${r.name}\n上传时间: ${r.uploadedAt}\n\n摘要:\n${r.summary}\n`,
          ],
          { type: "text/plain;charset=utf-8" }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${r.name.replace(/\\s+/g, "_")}.txt`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      },
    },
    computed: {
      totalPages() {
        return Math.max(1, Math.ceil(this.reports.length / this.pageSize));
      },
      pageReports() {
        const start = (this.currentPage - 1) * this.pageSize;
        const page = this.reports.slice(start, start + this.pageSize);
        if (page.length < this.pageSize) {
          const need = this.pageSize - page.length;
          for (let i = 0; i < need; i++) {
            page.push({
              id: `ph-${start + i + 1}`,
              placeholder: true,
            });
          }
        }
        return page;
      },
    },
  }).mount("#app");
})();
