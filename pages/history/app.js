(function () {
  const { createApp } = Vue;

  function parseQaLevel() {
    const params = new URLSearchParams(window.location.search);
    const v = Number(params.get("qa"));
    if (!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(5, Math.floor(v)));
  }

  /** 从 URL query 解析 marketId，兼容数字和旧版 A/B/C 格式 */
  function parseUrlMarketId() {
    var params = new URLSearchParams(window.location.search);
    var v = params.get("marketId");
    if (v !== null) {
      var n = Number(v);
      if (Number.isFinite(n) && n >= 1) return n;
      var map = { A: 1, B: 2, C: 3 };
      if (map[v]) return map[v];
    }
    return 1;
  }

  function generateTransactionData(count) {
    const arr = [];
    const origins = ["山东省聊城市东平县", "河北省石家庄市正定县", "河南省郑州市中牟县", "安徽省合肥市长丰县", "江苏省徐州市铜山区"];
    const destinations = ["河南...平顶山888号金华猪肉铺117号", "北京...新发地市场A区102号", "上海...曹安市场B区55号", "浙江...杭州农批C区22号"];
    
    for (let i = 1; i <= count; i++) {
      const m = (11 + i) % 60;
      const s = (55 + i * 3) % 60;
      const mStr = m.toString().padStart(2, '0');
      const sStr = s.toString().padStart(2, '0');
      
      arr.push({ 
        id: i, 
        time: `2023-12-31 21:${mStr}:${sStr}`,
        volume: (18.85 + (i % 5) * 1.2).toFixed(2),
        amount: (618 + (i % 5) * 45).toString(),
        price: (11649.3 + (i % 3) * 50 - 25).toFixed(1),
        origin: origins[(i - 1) % origins.length],
        destination: destinations[(i - 1) % destinations.length]
      });
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
        0: { price: 8, rows: 6 },
        1: { price: 8, rows: 20 },
        2: { price: 16, rows: 80 },
        3: { price: 24, rows: 200 },
        4: { price: 32, rows: 500 },
        5: { price: 48, rows: 1000 },
      };
      const s = qaMap[qa] || qaMap[0];

      // 计算当天日期
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;

      return {
        qaLevel: qa,
        market: parseUrlMarketId(),
        date: todayStr,
        markets: [
          { value: 1, label: "上海西郊国际农产品交易中心" },
          { value: 2, label: "上海农产品中心批发市场" },
          { value: 3, label: "江苏无锡朝阳农产品大市场" },
          { value: 4, label: "江苏苏州农产品大市场" },
        ],
        minDate: "2020-01-01",
        maxDate: todayStr,
        priceData: [],
        transactionRows: [],
        transactionTotal: 0,
        transactionTableKey: 0, // 每次成功拉取数据后 +1，强制表格重新渲染
        transactionLoading: false,
        abnormalData: [],
        pieChart: null,
        resizeHandler: null,
        pieDetailsData: [],
        maxActivityPeriod: "",
        maxActivityVolume: "",
        stats: {
          loading: false,
          error: null,
          data: [
            { id: 1, label: "日交易量", value: 0, unit: " 公斤", color: "primary" },
            { id: 2, label: "日交易额", value: 0, unit: " 万元", color: "primary" },
            { id: 3, label: "日交易均价", value: 0, unit: " 元 / 公斤", color: "primary" },
            { id: 4, label: "日交易均价（不含异常数据）", value: 0, unit: " 元 / 公斤", color: "primary" },
            { id: 5, label: "交易佣金费率", value: 0, unit: " ‰", color: "primary" },
            { id: 6, label: "交易佣金费", value: 0, unit: " 万元", color: "primary" },
            { id: 7, label: "货源企业数量", value: 0, unit: " 家", color: "primary" },
            { id: 8, label: "采购商数量", value: 0, unit: " 家", color: "primary" },
          ],
        },
        query: {
          origin: "",
          dest: "",
          page: 1,
          limit: 5, // Fixed to 5 rows per page
        },
        originOptions: [], // 产地下拉选项
        destOptions: [],   // 销地下拉选项
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
        
        // Ellipsis Pagination State
        ellipsisState: {
          left: { active: false, value: '', error: false },
          right: { active: false, value: '', error: false }
        },
      };
    },
    computed: {
      // Pagination Items Logic
      paginationItems() {
        const total = this.totalPages;
        const current = this.query.page;
        
        if (total <= 5) {
          return Array.from({ length: total }, (_, i) => ({ type: 'page', value: i + 1 }));
        }

        const items = [];
        items.push({ type: 'page', value: 1 });

        const start = Math.max(2, current - 1);
        const end = Math.min(total - 1, current + 1);

        // Left Ellipsis Logic
        if (start > 2) {
          items.push({ type: 'ellipsis', pos: 'left' });
        } else if (start === 3) {
          items.push({ type: 'page', value: 2 });
        }

        // Middle Pages
        for (let i = start; i <= end; i++) {
          items.push({ type: 'page', value: i });
        }

        // Right Ellipsis Logic
        if (end < total - 1) {
          if (end === total - 2) {
            items.push({ type: 'page', value: total - 1 });
          } else {
            items.push({ type: 'ellipsis', pos: 'right' });
          }
        }

        items.push({ type: 'page', value: total });
        
        // Remove duplicates just in case
        return items.filter((v,i,a)=>a.findIndex(t=>(t.type===v.type && t.value===v.value && t.pos===v.pos))===i);
      },

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
      // Computed property to pad empty rows (now uses server-side paginated data)
      displayTransactions() {
        const list = this.transactionRows;
        const totalRows = this.query.limit;
        const paddedList = [...list];
        
        // Pad with empty objects if fewer than limit
        while (paddedList.length < totalRows) {
          paddedList.push({ id: `empty-${paddedList.length}`, isEmpty: true });
        }
        
        return paddedList;
      },
      totalPages() {
        return Math.ceil(this.transactionTotal / this.query.limit) || 1;
      }
    },
    watch: {
    },
    mounted() {
      this.loadMarkets();
      this.initPieChart();
      this.loadOriginOptions();
      this.loadDestOptions();
      this.refreshAll();
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
      /** 从大屏接口 /tradeDynamicData/getTradeMarket 动态获取市场列表 */
      loadMarkets() {
        var self = this;
        ApiHelper.getData("/tradeDynamicData/getTradeMarket")
          .then(function (list) {
            if (Array.isArray(list) && list.length > 0) {
              self.markets = list.map(function (m) {
                return { value: Number(m.marketId), label: m.marketName };
              });
              var ids = self.markets.map(function (m) { return m.value; });
              if (ids.indexOf(self.market) === -1) {
                self.market = ids[0];
              }
            }
          })
          .catch(function () {
            // API 失败时保留静态兜底列表
          });
      },
      /** 加载产地下拉数据 */
      async loadOriginOptions() {
        try {
          // 产地接口依赖 marketId，虽然 API 文档只说 marketId，但为了保险还是都传
          const res = await window.historyApi.getProvinceData({
            marketId: this.market
          });
          if (res.code === 200 && Array.isArray(res.data)) {
            // 根据接口文档：productCode 是产地编号；兼容 name_prov/code_prov 或 provinceName/provinceCode 等常见命名
            this.originOptions = res.data.map(item => ({
              label: item.name_prov || item.provinceName || item.name || "",
              value: String(item.code_prov || item.provinceCode || item.code || "")
            })).filter(opt => opt.value !== "");
          }
        } catch (e) {
          console.error("加载产地数据失败", e);
        }
      },
      /** 加载销地下拉数据 */
      async loadDestOptions() {
        try {
          const res = await window.historyApi.getCountyData({
            marketId: this.market,
            paramsDate: this.date
          });
          if (res.code === 200 && Array.isArray(res.data)) {
            // 根据接口文档：sellCode 是销地编号
            // getCountyData 返回: countyName (如 "闵行区"), countyCode (如 "310112")
            // 因此下拉框 value 应该存 countyCode
            this.destOptions = res.data.map(item => ({
              label: item.countyName,
              value: item.countyCode
            }));
          }
        } catch (e) {
          console.error("加载销地数据失败", e);
        }
      },
      handleMarketChange() {
        this.loadOriginOptions(); // 市场变化可能影响产地列表（虽然通常省份是固定的，但接口要求传 marketId）
        this.loadDestOptions();   // 市场变化肯定影响销地列表
        this.refreshAll();
      },
      handleDateChange() {
        this.loadDestOptions();   // 日期变化影响销地列表（不同日期交易的销地可能不同）
        this.refreshAll();
      },
      /** market 现在直接是数字 1/2/3，无需映射 */
      async refreshAll() {
        this.query.page = 1;
        const tasks = [
          this.fetchStatsData(),
          this.fetchPriceData(),
          this.fetchAbnormalData(),
          this.fetchTransactions(),
          this.updatePieChart(),
        ];
        await Promise.allSettled(tasks);
        if (this.viewMode === "activity") {
          await this.fetchActivityData();
        }
      },
      async fetchPriceData() {
        try {
          const res = await window.historyApi.getFactoryTradePrice({
            marketId: this.market,
            paramsDate: this.date,
          });
          if (res.code === 200 && Array.isArray(res.data)) {
            this.priceData = res.data.map((it) => ({
              region: it.provinceName,
              factory: it.factoryPrice,
              wholesale: it.tradePrice,
            }));
          } else {
            this.priceData = [];
          }
        } catch (e) {
          this.priceData = [];
        }
      },
      async fetchAbnormalData() {
        try {
          const res = await window.historyApi.getAbnormal({
            marketId: this.market,
            paramsDate: this.date,
          });
          if (res.code === 200 && Array.isArray(res.data)) {
            this.abnormalData = res.data.map((it) => {
              const raw = it.abnormalCheckType;
              let reviewStatus = "未复核";
              if (raw === 1 || raw === "1" || raw === true) reviewStatus = "已复核";
              if (typeof raw === "string") {
                const s = raw.trim();
                if (s.includes("已")) reviewStatus = "已复核";
                if (s.includes("未")) reviewStatus = "未复核";
              }

              return {
                time: it.businessDate,
                origin: it.producAdd,
                dest: it.sellAdd,
                price: it.businessPrice,
                reviewStatus,
              };
            });
            if (this.qaLevel >= 1 && this.abnormalData.length > 0) {
              const target = this.qaLevel >= 2 ? 80 : 30;
              const base = [...this.abnormalData];
              const expanded = [];
              while (expanded.length < target) {
                expanded.push(...base);
              }
              this.abnormalData = expanded.slice(0, target);
            }
          } else {
            this.abnormalData = [];
          }
        } catch (e) {
          this.abnormalData = [];
        }
      },
      /**
       * 服务端分页查询日交易信息
       * 每次只请求当前页数据（pageSize=5），避免全量加载导致的性能问题
       */
      async fetchTransactions() {
        this.transactionLoading = true;
        // 读取当前筛选条件，确保点击「查询」时使用最新值
        const productCode = this.query.origin || "";
        const sellCode = this.query.dest || "";
        try {
          const res = await window.historyApi.getTradeList({
            marketId: this.market,
            paramsDate: this.date,
            productCode: productCode,
            sellCode: sellCode,
            pageNum: this.query.page,
            pageSize: this.query.limit,
          });

          // 兼容接口返回 rows 或 data 两种格式
          const rows = Array.isArray(res.rows) ? res.rows : (Array.isArray(res.data) ? res.data : []);
          if (res.code === 200) {
            this.transactionTotal = Number(res.total != null ? res.total : 0);
            this.transactionRows = rows.map((it, idx) => {
              const price = Number(it.businessPrice || 0);
              const volume = Number(it.businessUnit || 0);
              const amount = (price * volume).toFixed(2);
              return {
                id: it.tradeId || `${this.date}-${idx + 1}`,
                time: it.businessDate,
                price: it.businessPrice,
                volume: it.businessUnit,
                amount,
                origin: it.producAdd,
                destination: it.sellAdd,
              };
            });
            this.transactionTableKey += 1;
          } else {
            this.transactionRows = [];
            this.transactionTotal = 0;
          }
        } catch (e) {
          this.transactionRows = [];
          this.transactionTotal = 0;
          console.error("日交易信息查询失败", e);
        } finally {
          this.transactionLoading = false;
        }
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
      async updatePieChart() {
        if (!this.pieChart) return;
        
        this.pieLoading = true;
        this.pieError = null;
        this.selectedPieSource = null;
        this.piePage = 1;

        try {
          const type = this.pieViewMode === "volume" ? "1" : "2";
          const res = await window.historyApi.getProportion({
            marketId: this.market,
            paramsDate: this.date,
            type,
          });

          if (res.code !== 200 || !Array.isArray(res.data)) {
            throw new Error(res.msg || "数据加载异常");
          }

          const colors = ["#5470c6", "#91cc75", "#fac858", "#ee6666", "#73c0de", "#3ba272", "#fc8452", "#9a60b4", "#ea7ccc", "#1f8a98"];
          const total = res.data.reduce((sum, item) => sum + Number(item.tradeVolume || 0), 0) || 1;

          const finalData = res.data.map((item, index) => {
            const value = Number(item.tradeVolume || 0);
            return {
              name: item.areaName,
              value,
              count: Number(item.sum || 0),
              percent: Number(((value / total) * 100).toFixed(1)),
              itemStyle: { color: colors[index % colors.length] },
            };
          });

          this.fullPieData = finalData;
          this.pieDetailsData = finalData;

          const option = {
            tooltip: {
              trigger: "item",
              formatter: "{b}: {c} ({d}%)",
            },
            legend: { show: false },
            series: [
              {
                name: this.pieViewMode === "volume" ? "货源交易量占比" : "货源流向占比",
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
                  formatter: "{b}: {d}%",
                  position: "outside",
                },
                emphasis: {
                  itemStyle: {
                    shadowBlur: 10,
                    shadowOffsetX: 0,
                    shadowColor: "rgba(0, 0, 0, 0.5)",
                  },
                },
                data: finalData,
              },
            ],
          };

          this.pieChart.setOption(option, true);
        } catch (e) {
          this.pieError = e && e.message ? e.message : "数据加载异常";
        } finally {
          this.pieLoading = false;
        }
      },
      switchView(mode) {
        this.viewMode = mode;
        if (mode === "activity") {
          this.$nextTick(() => {
            this.initActivityChart();
            this.fetchActivityData();
          });
        }
      },
      initActivityChart() {
        const el = document.getElementById("activityChart");
        if (!el) return;
        if (this.activityChart) this.activityChart.dispose();

        this.activityChart = echarts.init(el);
        this.activityChart.setOption({
          tooltip: { trigger: "axis" },
          grid: {
            left: "3%",
            right: "4%",
            bottom: "3%",
            containLabel: true,
          },
          xAxis: {
            type: "category",
            boundaryGap: false,
            data: [],
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
              data: [],
            },
          ],
        });
      },
      async fetchActivityData() {
        try {
          if (!this.activityChart) this.initActivityChart();
          const res = await window.historyApi.getActivity({
            marketId: this.market,
            paramsDate: this.date,
          });

          if (res.code !== 200 || !res.data) return;

          const xList = Array.isArray(res.data.xList) ? res.data.xList : [];
          const yList = Array.isArray(res.data.yList) ? res.data.yList : [];
          const timeLabels = xList.map((t) => String(t).slice(11, 16));
          const volData = yList.map((v) => Number(v || 0));

          let stepMinutes = 10;
          if (xList.length >= 2) {
            const t0 = Date.parse(xList[0]);
            const t1 = Date.parse(xList[1]);
            const diff = (t1 - t0) / 60000;
            if (Number.isFinite(diff) && diff > 0) stepMinutes = diff;
          }
          const intervals = Math.max(1, Math.round(30 / stepMinutes));

          let maxSum = 0;
          let maxIdx = 0;
          for (let i = 0; i <= volData.length - intervals; i++) {
            let sum = 0;
            for (let j = 0; j < intervals; j++) sum += volData[i + j] || 0;
            if (sum > maxSum) {
              maxSum = sum;
              maxIdx = i;
            }
          }

          const endIdx = Math.min(maxIdx + intervals, timeLabels.length - 1);
          this.maxActivityPeriod = `${timeLabels[maxIdx] || ""} - ${timeLabels[endIdx] || ""}`;
          this.maxActivityVolume = maxSum.toFixed(2);

          this.activityChart.setOption({
            xAxis: { data: timeLabels },
            series: [{ data: volData }],
          });
        } catch (e) {
        }
      },
      /** 查询按钮：将筛选条件传给后端并重新加载第一页 */
      handleSearch() {
        // 无论当前在第几页，点击查询或筛选变化时，都应重置回第一页并重新加载
        this.query.page = 1;
        this.fetchTransactions();
      },
      /** 下拉框变化事件，自动触发查询 */
      handleFilterChange() {
        // 用户要求：不用下拉就刷新，点击再查询即可。
        // 所以这里不再自动调用 handleSearch
      },
      /** 重置筛选条件并重新加载 */
      resetQuery() {
        this.query.origin = "";
        this.query.dest = "";
        this.query.page = 1;
        this.fetchTransactions();
      },
      /** 跳转到指定页码并从后端拉取数据 */
      goToPage(page) {
        if (page < 1 || page > this.totalPages || page === this.query.page) return;
        this.query.page = page;
        this.fetchTransactions();
      },
      handleEllipsisClick(pos) {
        this.ellipsisState[pos].active = true;
        this.ellipsisState[pos].value = '';
        this.ellipsisState[pos].error = false;
        this.$nextTick(() => {
          const el = document.getElementById(`ellipsis-input-${pos}`);
          if (el) {
            el.focus();
            el.select();
          }
        });
      },
      handleEllipsisBlur(pos) {
        // Delay slightly to allow Enter key to trigger first if that was the cause
        // But here we just validate.
        // If the user clicked outside, we validate.
        this.validateEllipsis(pos);
      },
      handleEllipsisKeydown(pos, e) {
        if (e.key === 'Escape') {
          this.ellipsisState[pos].active = false;
          this.ellipsisState[pos].error = false;
          return;
        }
        if (e.key === 'Enter') {
          this.validateEllipsis(pos);
          // If valid, it will close. If invalid, it stays open.
          // We need to blur manually if valid to stop input? 
          // Actually validateEllipsis sets active=false if valid.
        }
      },
      validateEllipsis(pos) {
        if (!this.ellipsisState[pos].active) return;
        
        // If empty and blurring, maybe just close? 
        // User said: "Invalid (empty)... keep input state... show red tooltip"
        // So we must enforce input.
        
        const valStr = String(this.ellipsisState[pos].value).trim();
        if (!valStr) {
           this.setEllipsisError(pos);
           return;
        }

        const val = Number(valStr);
        const total = this.totalPages;
        
        if (Number.isInteger(val) && val >= 1 && val <= total) {
          this.ellipsisState[pos].active = false;
          this.ellipsisState[pos].error = false;
          if (val !== this.query.page) {
            this.query.page = val;
            this.fetchTransactions();
          }
        } else {
          this.setEllipsisError(pos);
        }
      },
      setEllipsisError(pos) {
        this.ellipsisState[pos].value = ''; // Clear input
        this.ellipsisState[pos].error = true;
        this.$nextTick(() => {
          const el = document.getElementById(`ellipsis-input-${pos}`);
          if (el) el.focus();
        });
      },
      changePage(delta) {
        this.goToPage(this.query.page + delta);
      },
      async fetchStatsData() {
        this.stats.loading = true;
        this.stats.error = null;
        
        try {
          const params = {
            marketId: this.market,
            paramsDate: this.date,
          };
          
          const res = await window.historyApi.getStats(params);

          if (res.code === 200 && res.data) {
            const d = res.data;
            // 按照任务书要求的字段映射表进行赋值
            // 1. 日交易量 ↔ businessSum
            this.stats.data[0].value = d.businessSum || 0;
            // 2. 日交易额 ↔ totalSum
            this.stats.data[1].value = d.totalSum || 0;
            // 3. 日交易均价 ↔ average
            this.stats.data[2].value = d.average || 0;
            // 4. 均价(无异常) ↔ averageNoCheck
            this.stats.data[3].value = d.averageNoCheck || 0;
            // 5. 交易佣金费率 ↔ commissionFeeLv
            this.stats.data[4].value = d.commissionFeeLv || 0;
            // 6. 交易佣金费 ↔ commissionFeeSum
            this.stats.data[5].value = d.commissionFeeSum || 0;
            // 7. 货源企业数量 ↔ abattoirNum
            this.stats.data[6].value = d.abattoirNum || 0;
            // 8. 采购商数量 ↔ purchaserNum
            this.stats.data[7].value = d.purchaserNum || 0;
          } else {
            console.warn("Stats API error:", res.msg);
            this.stats.error = "数据加载异常";
          }
        } catch (error) {
          console.error("Fetch stats failed:", error);
          this.stats.error = "网络请求失败";
          
          // 仅在演示/开发阶段保留部分模拟数据的逻辑作为兜底（可选）
          // 但根据任务书“端到端联调”要求，应优先展示真实错误状态
        } finally {
          this.stats.loading = false;
        }
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
