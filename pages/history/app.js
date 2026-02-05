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
    /**
     * Source Transaction Volume Component
     * 
     * Props/Data Interfaces:
     * @property {string} pieViewMode - Current view mode ('volume' | 'flow')
     * @property {boolean} pieLoading - Loading state for pie chart data
     * @property {string|null} pieError - Error message if data fetch fails
     * @property {string} pieSortKey - Current sort column key
     * @property {string} pieSortOrder - Sort order ('asc' | 'desc')
     * @property {number} piePage - Current pagination page
     * @property {number} piePageSize - Items per page
     * @property {string|null} selectedPieSource - Currently selected source filter (from chart click)
     * @property {Array} fullPieData - Raw data array from API/Mock
     * 
     * Key Methods:
     * - updatePieChart(): Fetches data and updates ECharts instance
     * - handlePieClick(params): Handles chart click interactions for filtering
     * - sortPieTable(key): Sorts the data table by column
     * - changePiePage(delta): Handles pagination
     */
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
          { time: "2023-03-05 01:13:00", origin: "河南省", dest: "普陀区", price: "8.97元/公斤", reviewStatus: "已复核" },
          { time: "2023-03-05 01:44:00", origin: "河南省", dest: "普陀区", price: "8.67元/公斤", reviewStatus: "未复核" },
          { time: "2023-03-05 01:55:51", origin: "河南省", dest: "普陀区", price: "9.27元/公斤", reviewStatus: "已复核" },
          { time: "2023-03-05 02:13:00", origin: "河南省", dest: "普陀区", price: "8.81元/公斤", reviewStatus: "已复核" },
          { time: "2023-03-05 02:43:00", origin: "河南省", dest: "普陀区", price: "8.83元/公斤", reviewStatus: "未复核" },
          { time: "2023-03-05 03:13:00", origin: "河南省", dest: "普陀区", price: "8.72元/公斤", reviewStatus: "已复核" },
        ],
        pieChart: null,
        resizeHandler: null,
        pieDetailsData: [],
        maxActivityPeriod: "",
        maxActivityVolume: "",
        stats: {
          loading: false,
          error: null,
          data: [
            { id: 1, label: "日交易量", value: 0, unit: "斤", color: "primary" },
            { id: 2, label: "日交易额", value: 0, unit: "元", color: "primary" },
            { id: 3, label: "日交易均价", value: 0, unit: "元/公斤", color: "primary" },
            { id: 4, label: "日交易均价（不含异常数据）", value: 0, unit: "元/公斤", color: "primary" },
            { id: 5, label: "交易佣金费率", value: 0, unit: "%", color: "primary" },
            { id: 6, label: "交易佣金费", value: 0, unit: "元", color: "primary" },
            { id: 7, label: "货源企业数量", value: 0, unit: "家", color: "primary" },
            { id: 8, label: "采购商数量", value: 0, unit: "家", color: "primary" },
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
        pieError: null,
        
        // Pie Table State
        pieSortKey: 'percent',
        pieSortOrder: 'desc',
        piePage: 1,
        piePageSize: 5,
        selectedPieSource: null, // Filter by clicking pie sector
        fullPieData: [], // Store all generated data
      };
    },
    computed: {
      // ... existing computed properties ...
      processedPieData() {
        let data = [...this.fullPieData];
        
        // 1. Filter
        if (this.selectedPieSource) {
          data = data.filter(item => item.name === this.selectedPieSource);
        }
        
        // 2. Sort
        if (this.pieSortKey) {
          data.sort((a, b) => {
            let valA = a[this.pieSortKey];
            let valB = b[this.pieSortKey];
            
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
            
            if (valA < valB) return this.pieSortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return this.pieSortOrder === 'asc' ? 1 : -1;
            return 0;
          });
        }
        
        return data;
      },
      paginatedPieData() {
        const start = (this.piePage - 1) * this.piePageSize;
        return this.processedPieData.slice(start, start + this.piePageSize);
      },
      totalPiePages() {
        return Math.ceil(this.processedPieData.length / this.piePageSize) || 1;
      },
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
      },
      uniqueOrigins() {
        const origins = new Set(this.transactionData.map(item => item.origin));
        return Array.from(origins);
      },
      uniqueDestinations() {
        // Extract city from destination string for cleaner dropdown? 
        // Or just use full destination string? The filter logic used 'includes', so full string is safer for now,
        // but user asked for "Destinations". Let's stick to full strings or simplified if they are too long.
        // The mock data has long addresses. Let's use the full string to ensure matching works.
        const dests = new Set(this.transactionData.map(item => item.destination));
        return Array.from(dests);
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
      handlePieClick(params) {
        if (params.componentType === 'series') {
          // Toggle filter
          if (this.selectedPieSource === params.name) {
            this.selectedPieSource = null;
            // Clear ECharts highlight
            this.pieChart.dispatchAction({
              type: 'downplay',
              seriesIndex: 0
            });
          } else {
            this.selectedPieSource = params.name;
            // Highlight selected
            this.pieChart.dispatchAction({
              type: 'highlight',
              seriesIndex: 0,
              name: params.name
            });
          }
          this.piePage = 1; // Reset to first page
        }
      },
      sortPieTable(key) {
        if (this.pieSortKey === key) {
          this.pieSortOrder = this.pieSortOrder === 'asc' ? 'desc' : 'asc';
        } else {
          this.pieSortKey = key;
          this.pieSortOrder = 'desc'; // Default desc for numbers
        }
      },
      changePiePage(delta) {
        const newPage = this.piePage + delta;
        if (newPage >= 1 && newPage <= this.totalPiePages) {
          this.piePage = newPage;
        }
      },
      getSortIcon(key) {
        if (this.pieSortKey !== key) return '↕';
        return this.pieSortOrder === 'asc' ? '↑' : '↓';
      },
      updatePieChart() {
        if (!this.pieChart) return;
        
        this.pieLoading = true;
        this.pieError = null;
        this.selectedPieSource = null;
        
        // Simulate async load
        setTimeout(() => {
            try {
                let data = [];
                let name = "";
                const colors = ["#5470c6", "#91cc75", "#fac858", "#ee6666", "#73c0de", "#3ba272", "#fc8452", "#9a60b4", "#ea7ccc", "#1f8a98"];

                // Generate more mock data for pagination
                if (this.pieViewMode === 'volume') {
                  name = "货源交易量占比";
                  const provinces = ["山东", "河南", "湖北", "安徽", "河北", "江苏", "四川", "湖南", "黑龙江", "辽宁"];
                  data = provinces.map((p, i) => ({
                    name: p,
                    value: Math.floor(Math.random() * 500) + 50,
                    count: Math.floor(Math.random() * 50) + 5,
                    itemStyle: { color: colors[i % colors.length] }
                  }));
                } else {
                  name = "货源流向占比";
                  const cities = ["上海", "北京", "南京", "杭州", "苏州", "宁波", "合肥", "武汉", "长沙", "广州"];
                  data = cities.map((c, i) => ({
                    name: c,
                    value: Math.floor(Math.random() * 600) + 60,
                    count: Math.floor(Math.random() * 150) + 10,
                    itemStyle: { color: colors[i % colors.length] }
                  }));
                }

                // Calculate percents
                const total = data.reduce((sum, item) => sum + item.value, 0);
                data.forEach(item => {
                    item.percent = ((item.value / total) * 100).toFixed(1);
                });
                
                // Sort by value desc initially
                data.sort((a, b) => b.value - a.value);

                this.fullPieData = data;
                this.pieDetailsData = data; // Keep for legacy if needed, but we use computed now

                const option = {
                  title: {
                    text: name,
                    left: 'center',
                    top: '5%',
                    textStyle: { fontSize: 16, color: '#333' },
                    show: false // Hidden as per design, controlled by external tabs
                  },
                  legend: {
                    show: false,
                    type: 'scroll',
                    orient: 'vertical',
                    right: 10,
                    top: 20,
                    bottom: 20,
                    textStyle: { color: '#666' }
                  },
                  series: [
                    {
                      name: name,
                      data: data,
                      label: {
                        show: true,
                        formatter: '{b}: {d}%',
                        position: 'outside'
                      },
                      emphasis: {
                        itemStyle: {
                          shadowBlur: 10,
                          shadowOffsetX: 0,
                          shadowColor: 'rgba(0, 0, 0, 0.5)'
                        }
                      }
                    }
                  ]
                };
                
                this.pieChart.setOption(option);
                this.pieLoading = false;
            } catch (e) {
                this.pieError = "数据加载异常";
                this.pieLoading = false;
            }
        }, 300);
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
        
        // Generate time slots from 20:30 previous day to 07:30 current day (10 min interval)
        const times = [];
        const values = [];
        
        // Start: 20:30, End: 07:30 next day
        // Total minutes: 3.5h (20:30-24:00) + 7.5h (00:00-07:30) = 11h = 660 mins
        // Steps: 660 / 10 = 66 steps + 1 (start) = 67 points
        
        let currentHour = 20;
        let currentMin = 30;
        
        for (let i = 0; i <= 66; i++) {
            const h = currentHour.toString().padStart(2, '0');
            const m = currentMin.toString().padStart(2, '0');
            times.push(`${h}:${m}`);
            
            // Mock volume data: peak around 02:00
            let baseVol = 5000;
            if ((currentHour >= 1 && currentHour <= 3) || (currentHour >= 25 && currentHour <= 27)) { // 01:00 - 03:00
                baseVol = 12000;
            }
            const val = (baseVol + Math.random() * 3000).toFixed(2);
            values.push(Number(val));
            
            currentMin += 10;
            if (currentMin >= 60) {
                currentMin = 0;
                currentHour++;
                if (currentHour >= 24) currentHour = 0; // Wrap around for display logic, but loop handles sequence
            }
            // Fix wrap around logic for the loop variable `currentHour` handling is tricky with 0 reset
            // Simplified:
        }

        // Correct generation
        const timeLabels = [];
        const volData = [];
        let time = new Date();
        time.setHours(20, 30, 0, 0); // Start 20:30
        
        for (let i = 0; i <= 66; i++) {
            const h = time.getHours().toString().padStart(2, '0');
            const m = time.getMinutes().toString().padStart(2, '0');
            timeLabels.push(`${h}:${m}`);
            
            // Mock data
            let val = 4000 + Math.random() * 2000;
            // Peak at 02:00 (which is i approx 33)
            const diff = Math.abs(i - 33);
            if (diff < 15) {
                val += (15 - diff) * 600;
            }
            volData.push(Number(val.toFixed(2)));
            
            time.setMinutes(time.getMinutes() + 10);
        }
        
        // Find max activity period (30 mins = 3 intervals)
        let maxSum = 0;
        let maxIdx = 0;
        
        for (let i = 0; i < volData.length - 2; i++) {
            const sum = volData[i] + volData[i+1] + volData[i+2];
            if (sum > maxSum) {
                maxSum = sum;
                maxIdx = i;
            }
        }
        
        this.maxActivityPeriod = `${timeLabels[maxIdx]} - ${timeLabels[maxIdx+3] || 'End'}`;
        this.maxActivityVolume = maxSum.toFixed(2);

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
            data: timeLabels,
            axisLine: { lineStyle: { color: "#999" } },
          },
          yAxis: {
            type: "value",
            name: "交易量(公斤)",
            splitLine: { lineStyle: { type: "dashed", color: "#eee" } },
          },
          series: [
            {
              name: "交易量",
              type: "line",
              smooth: true,
              symbol: "none",
              areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: "rgba(84, 112, 198, 0.5)" },
                  { offset: 1, color: "rgba(84, 112, 198, 0.05)" },
                ]),
              },
              data: volData,
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
        this.$nextTick(() => {
            const el = document.getElementById("pieChart");
            if (!el) {
                console.error("Pie chart element not found");
                return;
            }

            this.pieChart = echarts.init(el);
            this.pieChart.on('click', this.handlePieClick);

            // Set initial options without data to render empty chart structure
            const option = {
              tooltip: {
                trigger: "item",
                formatter: "{b}: {c} ({d}%)",
              },
              legend: {
                show: false,
                type: 'scroll',
                orient: 'vertical',
                right: 10,
                top: 20,
                bottom: 20,
                textStyle: { color: '#666' }
              },
              series: [
                {
                  type: "pie",
                  radius: ["40%", "70%"],
                  center: ["50%", "50%"],
                  avoidLabelOverlap: false,
                  itemStyle: {
                    borderRadius: 10,
                    borderColor: "#fff",
                    borderWidth: 2,
                  },
                  label: {
                    show: true,
                    formatter: '{b}: {d}%',
                    position: 'outside'
                  },
                  data: [], 
                },
              ],
            };
            this.pieChart.setOption(option);

            // Now fetch data
            this.updatePieChart(); 
            
            const resizeObserver = new ResizeObserver(() => {
                this.pieChart && this.pieChart.resize();
            });
            resizeObserver.observe(el);
        });
      },
    },
  }).mount("#app");
})();
