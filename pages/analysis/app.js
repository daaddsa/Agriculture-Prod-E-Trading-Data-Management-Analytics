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
    },
  }).mount("#app");
})();
