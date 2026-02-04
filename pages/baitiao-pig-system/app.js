(function () {
  const { createApp } = Vue;

  function parseQaLevel() {
    const params = new URLSearchParams(window.location.search);
    const v = Number(params.get("qa"));
    if (!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(5, Math.floor(v)));
  }

  function generateTransactionData(count) {
    const base = {
      time: "2023-12-31 21:11:55",
      volume: "18.85",
      amount: "618",
      price: "11649.3",
      origin: "山东省聊城市东平县",
      destination: "河南...平顶山888号金华猪肉铺117号",
    };
    const arr = [];
    for (let i = 1; i <= count; i++) {
      arr.push({ id: i, ...base });
    }
    return arr;
  }

  function generatePriceData(count) {
    const regions = ["北京", "天津", "河北", "辽宁", "吉林", "黑龙江", "江苏", "浙江", "山东", "河南", "安徽", "湖北", "湖南", "四川", "重庆", "广东"];
    const arr = [];
    for (let i = 0; i < count; i++) {
      const region = regions[i % regions.length] + (count > regions.length ? `-${Math.floor(i / regions.length) + 1}` : "");
      arr.push({
        region,
        factory: (22 + (i % 9) * 0.37).toFixed(2),
        wholesale: (24 + (i % 9) * 0.41).toFixed(2),
      });
    }
    return arr;
  }

  createApp({
    data() {
      const qa = parseQaLevel();
      const qaMap = {
        0: { price: 8, rows: 4 },
        1: { price: 8, rows: 20 },
        2: { price: 16, rows: 80 },
        3: { price: 24, rows: 200 },
        4: { price: 32, rows: 500 },
        5: { price: 48, rows: 1000 },
      };
      const s = qaMap[qa] || qaMap[0];

      return {
        qaLevel: qa,
        priceData: generatePriceData(s.price),
        transactionData: generateTransactionData(s.rows),
        pieChart: null,
        resizeHandler: null,
      };
    },
    mounted() {
      this.initPieChart();
      this.resizeHandler = () => {
        if (this.pieChart) this.pieChart.resize();
      };
      window.addEventListener("resize", this.resizeHandler);
    },
    beforeUnmount() {
      if (this.resizeHandler) window.removeEventListener("resize", this.resizeHandler);
      if (this.pieChart) {
        this.pieChart.dispose();
        this.pieChart = null;
      }
    },
    methods: {
      initPieChart() {
        const el = document.getElementById("pieChart");
        if (!el) return;

        this.pieChart = echarts.init(el);

        const option = {
          tooltip: {
            trigger: "item",
            formatter: "{b}: {c} ({d}%)",
          },
          legend: {
            orient: "vertical",
            right: "10%",
            top: "center",
          },
          series: [
            {
              type: "pie",
              radius: ["40%", "70%"],
              center: ["35%", "50%"],
              avoidLabelOverlap: false,
              itemStyle: {
                borderRadius: 10,
                borderColor: "#fff",
                borderWidth: 2,
              },
              label: { show: false },
              labelLine: { show: false },
              data: [
                { value: 335, name: "白条", itemStyle: { color: "#5470c6" } },
                { value: 234, name: "母猪", itemStyle: { color: "#91cc75" } },
                { value: 154, name: "肥猪", itemStyle: { color: "#fac858" } },
                { value: 135, name: "其他", itemStyle: { color: "#ee6666" } },
              ],
            },
          ],
        };

        this.pieChart.setOption(option);
      },
    },
  }).mount("#app");
})();
