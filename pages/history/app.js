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
        market: "A",
        date: new Date().toISOString().split("T")[0],
        markets: [
          { value: "A", label: "市场A" },
          { value: "B", label: "市场B" },
          { value: "C", label: "市场C" },
        ],
        minDate: "",
        maxDate: "",
        priceData: generatePriceData(s.price),
        transactionData: generateTransactionData(s.rows),
        abnormalData: [
          { time: "2023-03-05 01:13:00", origin: "河南省", dest: "普陀区", price: "8.97元/公斤" },
          { time: "2023-03-05 01:44:00", origin: "河南省", dest: "普陀区", price: "8.67元/公斤" },
          { time: "2023-03-05 01:55:51", origin: "河南省", dest: "普陀区", price: "9.27元/公斤" },
          { time: "2023-03-05 02:13:00", origin: "河南省", dest: "普陀区", price: "8.81元/公斤" },
          { time: "2023-03-05 02:43:00", origin: "河南省", dest: "普陀区", price: "8.83元/公斤" },
          { time: "2023-03-05 03:13:00", origin: "河南省", dest: "普陀区", price: "8.72元/公斤" },
        ],
        pieChart: null,
        resizeHandler: null,
        stats: {
          loading: false,
          error: null,
          data: [
            { id: 1, label: "日交易量", value: 0, unit: "斤", color: "teal" },
            { id: 2, label: "日交易额", value: 0, unit: "元", color: "orange" },
            { id: 3, label: "日交易均价", value: 0, unit: "元/公斤", color: "teal" },
            { id: 4, label: "日交易均价（不含异常数据）", value: 0, unit: "元/公斤", color: "orange" },
            { id: 5, label: "交易佣金费率", value: 0, unit: "%", color: "gray" },
            { id: 6, label: "交易佣金费", value: 0, unit: "元", color: "orange" },
            { id: 7, label: "货源企业数量", value: 0, unit: "家", color: "orange" },
            { id: 8, label: "采购商数量", value: 0, unit: "家", color: "orange" },
          ],
        },
        query: {
          origin: "",
          dest: "",
          page: 1,
          limit: 6,
        },
        viewMode: "price", // 'price' | 'activity'
        activityChart: null,
        pieViewMode: "volume", // 'volume' | 'flow'
        pieLoading: false,
      };
    },
    computed: {
      filteredTransactions() {
        let list = this.transactionData.filter(item => {
          const matchOrigin = !this.query.origin || item.origin.includes(this.query.origin);
          const matchDest = !this.query.dest || item.destination.includes(this.query.dest.replace("市", "")); // Simple match
          return matchOrigin && matchDest;
        });
        
        // Pagination logic
        const start = (this.query.page - 1) * this.query.limit;
        const end = start + this.query.limit;
        
        // Return sliced data but also expose total count for pagination controls
        return list.slice(start, end);
      },
      totalFiltered() {
        return this.transactionData.filter(item => {
          const matchOrigin = !this.query.origin || item.origin.includes(this.query.origin);
          const matchDest = !this.query.dest || item.destination.includes(this.query.dest.replace("市", ""));
          return matchOrigin && matchDest;
        }).length;
      },
      totalPages() {
        return Math.ceil(this.totalFiltered / this.query.limit) || 1;
      }
    },
    mounted() {
      const today = new Date();
      const past30 = new Date(today);
      past30.setDate(today.getDate() - 30);
      const future7 = new Date(today);
      future7.setDate(today.getDate() + 7);

      this.minDate = past30.toISOString().split("T")[0];
      this.maxDate = future7.toISOString().split("T")[0];

      this.initPieChart();
      this.fetchStatsData();
      this.resizeHandler = () => {
        if (this.pieChart) this.pieChart.resize();
        if (this.activityChart) this.activityChart.resize();
      };
      window.addEventListener("resize", this.resizeHandler);
    },
    beforeUnmount() {
      if (this.resizeHandler) window.removeEventListener("resize", this.resizeHandler);
      if (this.pieChart) {
        this.pieChart.dispose();
        this.pieChart = null;
      }
      if (this.activityChart) {
        this.activityChart.dispose();
        this.activityChart = null;
      }
    },
    methods: {
      handleMarketChange() {
        console.log("Market changed to:", this.market);
        this.fetchStatsData(); // Refresh data
      },
      handleDateChange() {
        console.log("Date changed to:", this.date);
        this.fetchStatsData(); // Refresh data
      },
      switchPieView(mode) {
        if (this.pieViewMode === mode) return;
        this.pieViewMode = mode;
        this.updatePieChart();
      },
      updatePieChart() {
        if (!this.pieChart) return;
        
        let data = [];
        let name = "";
        
        if (this.pieViewMode === 'volume') {
          name = "货源交易量占比";
          data = [
            { value: 435, name: "山东", itemStyle: { color: "#5470c6" } },
            { value: 310, name: "河南", itemStyle: { color: "#91cc75" } },
            { value: 234, name: "湖北", itemStyle: { color: "#fac858" } },
            { value: 135, name: "安徽", itemStyle: { color: "#ee6666" } },
            { value: 154, name: "其他", itemStyle: { color: "#73c0de" } },
          ];
        } else {
          name = "货源流向占比";
          data = [
            { value: 535, name: "上海", itemStyle: { color: "#3ba272" } },
            { value: 410, name: "北京", itemStyle: { color: "#fc8452" } },
            { value: 334, name: "南京", itemStyle: { color: "#9a60b4" } },
            { value: 235, name: "杭州", itemStyle: { color: "#ea7ccc" } },
            { value: 154, name: "其他", itemStyle: { color: "#73c0de" } },
          ];
        }

        const option = {
          series: [
            {
              name: name,
              data: data,
            }
          ]
        };
        
        this.pieChart.setOption(option);
      },
      switchView(mode) {
        this.viewMode = mode;
        if (mode === "activity") {
          this.$nextTick(() => {
            this.initActivityChart();
          });
        }
      },
      initActivityChart() {
        const el = document.getElementById("activityChart");
        if (!el) return;
        if (this.activityChart) this.activityChart.dispose();

        this.activityChart = echarts.init(el);
        
        // Mock 30 days data
        const dates = [];
        const values = [];
        const today = new Date();
        for (let i = 29; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          dates.push(`${d.getMonth() + 1}/${d.getDate()}`);
          values.push((Math.random() * 50 + 50).toFixed(1));
        }

        const option = {
          tooltip: {
            trigger: "axis",
          },
          grid: {
            left: "3%",
            right: "4%",
            bottom: "3%",
            containLabel: true,
          },
          xAxis: {
            type: "category",
            boundaryGap: false,
            data: dates,
            axisLine: { lineStyle: { color: "#999" } },
          },
          yAxis: {
            type: "value",
            splitLine: { lineStyle: { type: "dashed", color: "#eee" } },
          },
          series: [
            {
              name: "活跃度指数",
              type: "line",
              smooth: true,
              symbol: "none",
              areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: "rgba(84, 112, 198, 0.5)" },
                  { offset: 1, color: "rgba(84, 112, 198, 0.05)" },
                ]),
              },
              data: values,
            },
          ],
        };
        this.activityChart.setOption(option);
      },
      resetQuery() {
        this.query.origin = "";
        this.query.dest = "";
        this.query.page = 1;
      },
      changePage(delta) {
        const newPage = this.query.page + delta;
        if (newPage >= 1 && newPage <= this.totalPages) {
          this.query.page = newPage;
        }
      },
      fetchStatsData() {
        this.stats.loading = false;
        this.stats.error = null;
        
        // Mock data fetching without delay
        // Simulate 10% error rate
        if (Math.random() < 0.1) {
            this.stats.error = "数据加载失败，点击重试";
            return;
        }

        this.stats.data[0].value = 12580; // 日交易量
        this.stats.data[1].value = 2365.42; // 日交易额
        this.stats.data[2].value = 18.25; // 日交易均价
        this.stats.data[3].value = 17.88; // 日交易均价（不含异常）
        this.stats.data[4].value = 1.5; // 交易佣金费率
        this.stats.data[5].value = 35.48; // 交易佣金费
        this.stats.data[6].value = 126; // 货源企业数量
        this.stats.data[7].value = 342; // 采购商数量
      },
      retryStats() {
        this.fetchStatsData();
      },
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
              data: [], // Initial empty, will be filled by updatePieChart
            },
          ],
        };

        this.pieChart.setOption(option);
        this.updatePieChart(); // Initial render with volume data
      },
    },
  }).mount("#app");
})();
