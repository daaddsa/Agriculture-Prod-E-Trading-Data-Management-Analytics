(function () {
  var createApp = Vue.createApp;

  // ======================== 常量 ========================

  /** 16省省份代码映射（与后端 provinceCode 参数对应） */
  var PROVINCE_LIST = [
    { label: "北京市",   value: "110000" },
    { label: "天津市",   value: "120000" },
    { label: "河北省",   value: "130000" },
    { label: "辽宁省",   value: "210000" },
    { label: "吉林省",   value: "220000" },
    { label: "黑龙江省", value: "230000" },
    { label: "江苏省",   value: "320000" },
    { label: "浙江省",   value: "330000" },
    { label: "安徽省",   value: "340000" },
    { label: "福建省",   value: "350000" },
    { label: "山东省",   value: "370000" },
    { label: "河南省",   value: "410000" },
    { label: "湖北省",   value: "420000" },
    { label: "湖南省",   value: "430000" },
    { label: "广东省",   value: "440000" },
    { label: "四川省",   value: "510000" },
  ];

  /** 市场列表 — 静态兜底，mounted 后会从 API 动态刷新 */
  var MARKET_LIST = [
    { value: 1, label: "上海西郊国际农产品交易中心" },
    { value: 2, label: "上海农产品中心批发市场" },
    { value: 3, label: "江苏无锡朝阳农产品大市场" },
    { value: 4, label: "江苏苏州农产品大市场" },
  ];

  // ======================== URL 参数解析 ========================

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

  // ======================== ECharts 实例管理 ========================
  // 用普通对象存储实例（不纳入 Vue 响应式，避免代理开销）

  var _charts = {};
  var _resizeRegistered = false;

  /**
   * 获取 ECharts 实例：自动销毁旧实例 → 创建新实例
   * 全局 resize 监听器只注册一次，统一管理所有图表 resize
   */
  function getChart(key, el) {
    if (_charts[key]) {
      _charts[key].dispose();
      _charts[key] = null;
    }
    var inst = echarts.init(el);
    _charts[key] = inst;
    if (!_resizeRegistered) {
      _resizeRegistered = true;
      window.addEventListener("resize", function () {
        Object.keys(_charts).forEach(function (k) {
          if (_charts[k] && !_charts[k].isDisposed()) {
            _charts[k].resize();
          }
        });
      });
    }
    return inst;
  }

  // ======================== Vue App ========================

  createApp({
    data: function () {
      return {
        market: parseUrlMarketId(),
        date: new Date().toISOString().split("T")[0],
        markets: MARKET_LIST,
        provinces: PROVINCE_LIST,
        province16: "410000",         // 默认河南省
        reportKeyword: "",
        minDate: "2024-01-01",        // 放宽：允许查询历史数据
        maxDate: "",
        reports: [],
        reportTypes: [],
        reportTypeValue: "",          // 空字符串 = 全部
        totalCount: 0,
        pageSize: 6,
        currentPage: 1,
        showPreview: false,
        previewReport: null,
        activeMenu: "volume",
      };
    },

    mounted: function () {
      var self = this;
      var today = new Date();
      var future7 = new Date(today);
      future7.setDate(today.getDate() + 7);
      this.maxDate = future7.toISOString().split("T")[0];

      this.loadMarkets();
      // 先加载报告类型（含默认选中日报），完成后再拉取报告列表
      this.loadReportTypes()
        .then(function () { self.fetchReports(); })
        .catch(function () { self.fetchReports(); });
      this.calcPageSize();
      window.addEventListener("resize", this.calcPageSize);

      // 默认显示交易量走势图表
      this.$nextTick(function () {
        requestAnimationFrame(function () {
          self.initChart();
        });
      });
    },

    methods: {
      // ==================== 市场列表动态加载 ====================

      /** 从大屏接口 /tradeDynamicData/getTradeMarket 动态获取市场列表 */
      loadMarkets: function () {
        var self = this;
        ApiHelper.getData("/tradeDynamicData/getTradeMarket")
          .then(function (list) {
            if (Array.isArray(list) && list.length > 0) {
              self.markets = list.map(function (m) {
                return { value: Number(m.marketId), label: m.marketName };
              });
              // 若当前 market 值不在列表中，默认选第一个
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

      // ==================== 工具方法 ====================

      /** 日期数组 ["2024-12-01",...] → 短格式 ["12-1",...] 用于 X 轴 */
      _toMD: function (list) {
        return (list || []).map(function (d) {
          var m = Number(String(d).slice(5, 7));
          var day = Number(String(d).slice(8, 10));
          return m + "-" + day;
        });
      },

      /** 字符串数组 → 数字数组 */
      _toNums: function (list) {
        return (list || []).map(function (v) { return Number(v); });
      },

      /** 字符串数组 → 数字数组（空值 → null，用于出厂价有空缺的场景） */
      _toNumsNullable: function (list) {
        return (list || []).map(function (v) {
          if (v === undefined || v === null || v === "") return null;
          return Number(v);
        });
      },

      /** 截取最近 N 天的数据（对齐 xList 和 yList） */
      _lastN: function (xList, yList, n) {
        n = n || 30;
        if (!Array.isArray(xList)) xList = [];
        if (!Array.isArray(yList)) yList = [];
        if (xList.length <= n) return { xList: xList, yList: yList };
        return { xList: xList.slice(-n), yList: yList.slice(-n) };
      },

      /** 截取最近 N 天的数据（多个 y 系列对齐同一 xList） */
      _lastNMulti: function (xList, yLists, n) {
        n = n || 30;
        if (!Array.isArray(xList)) xList = [];
        if (xList.length <= n) return { xList: xList, yLists: yLists };
        var slicedX = xList.slice(-n);
        var slicedYs = (yLists || []).map(function (yl) {
          return (yl || []).slice(-n);
        });
        return { xList: slicedX, yLists: slicedYs };
      },

      // ==================== 全局事件 ====================

      handleMarketChange: function () {
        var self = this;
        this.currentPage = 1;
        this._allReportsCache = null; // 市场变化，清除报告缓存
        // 切换市场：先重新加载报告类型，完成后再拉取报告
        this.loadReportTypes()
          .then(function () { self.fetchReports(); })
          .catch(function () { self.fetchReports(); });
        this.$nextTick(this._refreshCurrentChart.bind(this));
      },

      handleDateChange: function () {
        this.$nextTick(this._refreshCurrentChart.bind(this));
      },

      handleProvince16Change: function () {
        var self = this;
        this.$nextTick(function () {
          if (self.activeMenu === "province16") self.initProvinceChart();
        });
      },

      selectMenu: function (key) {
        this.activeMenu = key;
        var self = this;
        // $nextTick 确保 Vue 完成 DOM 更新（v-if 插入元素）
        // requestAnimationFrame 确保浏览器完成布局计算，容器拥有正确尺寸
        this.$nextTick(function () {
          requestAnimationFrame(function () {
            if (key === "volume")     self.initChart();
            if (key === "amount")     self.initAmountChart();
            if (key === "avgprice")   self.initAvgPriceChart();
            if (key === "commission") self.initCommissionChart();
            if (key === "province16") self.initProvinceChart();
          });
        });
      },

      /** 刷新当前显示的图表 */
      _refreshCurrentChart: function () {
        var m = this.activeMenu;
        if (m === "volume")     this.initChart();
        if (m === "amount")     this.initAmountChart();
        if (m === "avgprice")   this.initAvgPriceChart();
        if (m === "commission") this.initCommissionChart();
        if (m === "province16") this.initProvinceChart();
      },

      // ==================== 交易量走势 (countType=1) ====================

      initChart: async function () {
        var el = document.getElementById("trendChart");
        if (!el) return;
        var chart = getChart("trend", el);

        var xAxisData = [];
        var aData = [];
        try {
          var res = await AnalysisAPI.getCountTrend(this.market, 1, this.date, { countDay: 30 });
          var d = (res && res.data) || {};
          var trimmed = this._lastN(d.xList, d.yList, 30);
          xAxisData = this._toMD(trimmed.xList);
          aData = this._toNums(trimmed.yList);
        } catch (e) {
          console.error("交易量走势加载失败:", e);
        }

        var hasData = aData.length > 0 && aData.some(function (v) { return Number.isFinite(v); });
        chart.setOption({
          tooltip: { trigger: "axis", axisPointer: { type: "line" } },
          legend: { show: false },
          grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
          xAxis: {
            type: "category",
            data: xAxisData,
            axisLabel: { fontSize: 11 },
            axisTick: { alignWithLabel: true },
          },
          yAxis: {
            type: "value",
            name: "单位：公斤",
            nameTextStyle: { color: "#64748b" },
            axisLine: { show: true },
            axisTick: { show: true },
            axisLabel: { show: hasData },
            splitLine: { show: true },
          },
          series: [{
            name: "交易量",
            type: "line",
            smooth: true,
            showSymbol: false,
            sampling: "lttb",
            lineStyle: { width: 2, color: "#1f8a98" },
            itemStyle: { color: "#1f8a98" },
            data: aData,
          }],
        });
        chart.resize(); // 强制刷新尺寸，修复 v-if 导致的容器尺寸异常
      },

      // ==================== 交易额走势 (countType=2) ====================

      initAmountChart: async function () {
        var el = document.getElementById("amountChart");
        if (!el) return;
        var chart = getChart("amount", el);

        var xAxisData = [];
        var amtData = [];
        try {
          var res = await AnalysisAPI.getCountTrend(this.market, 2, this.date, { countDay: 30 });
          var d = (res && res.data) || {};
          var trimmed = this._lastN(d.xList, d.yList, 30);
          xAxisData = this._toMD(trimmed.xList);
          amtData = this._toNums(trimmed.yList);
        } catch (e) {
          console.error("交易额走势加载失败:", e);
        }

        var hasData = amtData.length > 0 && amtData.some(function (v) { return Number.isFinite(v); });
        chart.setOption({
          tooltip: { trigger: "axis", axisPointer: { type: "line" } },
          legend: { show: false },
          grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
          xAxis: {
            type: "category",
            data: xAxisData,
            axisLabel: { fontSize: 11 },
            axisTick: { alignWithLabel: true },
          },
          yAxis: {
            type: "value",
            name: "单位：元",
            nameTextStyle: { color: "#64748b" },
            axisLine: { show: true },
            axisTick: { show: true },
            axisLabel: { show: hasData },
            splitLine: { show: true },
          },
          series: [{
            name: "交易额",
            type: "line",
            smooth: true,
            showSymbol: false,
            sampling: "lttb",
            lineStyle: { width: 2, color: "#1f8a98" },
            itemStyle: { color: "#1f8a98" },
            data: amtData,
          }],
        });
        chart.resize(); // 强制刷新尺寸，修复 v-if 导致的容器尺寸异常
      },

      // ==================== 交易均价走势 (countType=3 交易均价 + countType=4 交易均价剔除异常交易) ====================

      initAvgPriceChart: async function () {
        var el = document.getElementById("avgPriceChart");
        if (!el) return;
        var chart = getChart("avgprice", el);

        var xAxisData = [];
        var avgData = [];
        var avgCleanData = [];
        try {
          // 并行请求：交易均价(countType=3) + 交易均价剔除异常交易(countType=4)
          // 每个 Promise 独立 catch，避免一个失败导致另一个数据也丢失
          var results = await Promise.all([
            AnalysisAPI.getCountTrend(this.market, 3, this.date, { countDay: 30 })
              .catch(function (e) { console.warn("交易均价(countType=3)请求失败:", e); return null; }),
            AnalysisAPI.getCountTrend(this.market, 4, this.date, { countDay: 30 })
              .catch(function (e) { console.warn("交易均价剔除异常(countType=4)请求失败:", e); return null; }),
          ]);

          var avgD      = (results[0] && results[0].data) || {};
          var avgCleanD = (results[1] && results[1].data) || {};
          console.log("[交易均价] countType=3 响应 data:", JSON.stringify(avgD));
          console.log("[交易均价] countType=4 响应 data:", JSON.stringify(avgCleanD));

          // 优先用 countType=3 的 xList，备用 countType=4 的
          var rawX = avgD.xList || avgCleanD.xList || [];
          var rawAvgY      = avgD.yList || [];
          var rawAvgCleanY = avgCleanD.yList || [];

          // 如果两个接口返回不同长度的 xList，用较长的那个做对齐
          if (avgCleanD.xList && avgCleanD.xList.length > rawX.length) {
            rawX = avgCleanD.xList;
          }

          var trimmed = this._lastNMulti(rawX, [rawAvgY, rawAvgCleanY], 30);
          xAxisData    = this._toMD(trimmed.xList);
          avgData      = this._toNums(trimmed.yLists[0]);
          avgCleanData = this._toNums(trimmed.yLists[1]);

          console.log("[交易均价] avgData长度:", avgData.length, "avgCleanData长度:", avgCleanData.length);
        } catch (e) {
          console.error("交易均价走势加载失败:", e);
        }

        var hasData = (avgData.length > 0 && avgData.some(function (v) { return Number.isFinite(v); }))
                   || (avgCleanData.length > 0 && avgCleanData.some(function (v) { return Number.isFinite(v); }));
        chart.setOption({
          tooltip: { trigger: "axis", axisPointer: { type: "line" } },
          legend: { show: false },
          grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
          xAxis: {
            type: "category",
            data: xAxisData,
            axisLabel: { fontSize: 11 },
            axisTick: { alignWithLabel: true },
          },
          yAxis: {
            type: "value",
            name: "单位：元/公斤",
            nameTextStyle: { color: "#64748b" },
            axisLine: { show: true },
            axisTick: { show: true },
            axisLabel: { show: hasData },
            splitLine: { show: true },
          },
          series: [
            {
              name: "交易均价",
              type: "line",
              smooth: true,
              showSymbol: false,
              sampling: "lttb",
              lineStyle: { width: 2, color: "#1f8a98" },
              itemStyle: { color: "#1f8a98" },
              data: avgData,
            },
            {
              name: "交易均价剔除异常交易",
              type: "line",
              smooth: true,
              showSymbol: false,
              sampling: "lttb",
              lineStyle: { width: 2, color: "#f97316", type: "dashed" },
              itemStyle: { color: "#f97316" },
              data: avgCleanData,
            },
          ],
        });
        chart.resize(); // 强制刷新尺寸，修复 v-if 导致的容器尺寸异常
      },

      // ==================== 佣金费率与佣金费走势 ====================

      initCommissionChart: async function () {
        var el = document.getElementById("commissionChart");
        if (!el) return;
        var chart = getChart("commission", el);

        var xAxisData = [];
        var rateData = [];
        var feeData = [];
        try {
          // 并行请求：佣金费率 + 交易佣金费(countType=5)
          var results = await Promise.all([
            AnalysisAPI.getCommissionFeeLvTrend(this.market, this.date, { countDay: 30 }),
            AnalysisAPI.getCountTrend(this.market, 5, this.date, { countDay: 30 }),
          ]);
          var rateD = (results[0] && results[0].data) || {};
          var feeD  = (results[1] && results[1].data) || {};
          var rawX = rateD.xList || feeD.xList || [];
          var rawRateY = rateD.yList || [];
          var rawFeeY  = feeD.yList || [];
          var trimmed = this._lastNMulti(rawX, [rawRateY, rawFeeY], 30);
          xAxisData = this._toMD(trimmed.xList);
          rateData  = this._toNums(trimmed.yLists[0]);
          feeData   = this._toNums(trimmed.yLists[1]);
        } catch (e) {
          console.error("佣金费走势加载失败:", e);
        }

        var hasData = (rateData.length > 0 && rateData.some(function (v) { return Number.isFinite(v); }))
                   || (feeData.length > 0 && feeData.some(function (v) { return Number.isFinite(v); }));

        chart.setOption({
          tooltip: { trigger: "axis", axisPointer: { type: "line" } },
          legend: { show: true, data: ["交易佣金费率", "交易佣金费"], top: 8, right: 8 },
          grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
          xAxis: {
            type: "category",
            data: xAxisData,
            axisLabel: { fontSize: 11 },
            axisTick: { alignWithLabel: true },
          },
          yAxis: [
            {
              type: "value",
              name: "单位：‰",
              nameTextStyle: { color: "#64748b" },
              axisLine: { show: true },
              axisTick: { show: true },
              axisLabel: { show: hasData },
              splitLine: { show: true },
            },
            {
              type: "value",
              name: "单位：万元",
              nameTextStyle: { color: "#64748b" },
              axisLine: { show: true },
              axisTick: { show: true },
              axisLabel: { show: hasData },
              splitLine: { show: false },
            },
          ],
          series: [
            {
              name: "交易佣金费率",
              type: "line",
              smooth: true,
              showSymbol: false,
              sampling: "lttb",
              yAxisIndex: 0,
              lineStyle: { width: 2, color: "#1f8a98" },
              itemStyle: { color: "#1f8a98" },
              data: rateData,
            },
            {
              name: "交易佣金费",
              type: "line",
              smooth: true,
              showSymbol: false,
              sampling: "lttb",
              yAxisIndex: 1,
              lineStyle: { width: 2, color: "#fbbf24" },
              itemStyle: { color: "#fbbf24" },
              data: feeData,
            },
          ],
        });
        chart.resize(); // 强制刷新尺寸，修复 v-if 导致的容器尺寸异常
      },

      // ==================== 16省出厂价与市场均价走势 ====================

      initProvinceChart: async function () {
        var el = document.getElementById("provinceChart");
        if (!el) return;
        var chart = getChart("province", el);

        var xAxisData = [];
        var factoryData = [];
        var marketCleanData = [];
        try {
          var res = await AnalysisAPI.getPriceTrend(this.market, this.province16, this.date, { countDay: 30 });
          var d = (res && res.data) || {};
          var rawX = d.xList || [];
          var rawFactory  = d.provincePriceList || [];
          var rawMarket   = d.tradePriceList || [];
          var trimmed = this._lastNMulti(rawX, [rawFactory, rawMarket], 30);
          xAxisData       = this._toMD(trimmed.xList);
          factoryData     = this._toNumsNullable(trimmed.yLists[0]);
          marketCleanData = this._toNumsNullable(trimmed.yLists[1]);
        } catch (e) {
          console.error("省份价格走势加载失败:", e);
        }

        var hasData = (factoryData.some(function (v) { return v != null; }))
                   || (marketCleanData.some(function (v) { return v != null; }));

        chart.setOption({
          tooltip: { trigger: "axis", axisPointer: { type: "line" } },
          legend: { show: false },
          grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
          xAxis: {
            type: "category",
            data: xAxisData,
            axisLabel: { show: hasData, fontSize: 11 },
            axisTick: { show: true, alignWithLabel: true },
            axisLine: { show: true },
          },
          yAxis: {
            type: "value",
            name: "单位：元/公斤",
            nameTextStyle: { color: "#64748b" },
            axisLine: { show: true },
            axisTick: { show: true },
            axisLabel: { show: hasData },
            splitLine: { show: true },
          },
          series: [
            {
              name: "该省平均出厂价",
              type: "line",
              smooth: true,
              showSymbol: false,
              sampling: "lttb",
              connectNulls: false,
              lineStyle: { width: 2, color: "#1f8a98" },
              itemStyle: { color: "#1f8a98" },
              data: factoryData,
            },
            {
              name: "市场交易均价（不含异常交易）",
              type: "line",
              smooth: true,
              showSymbol: false,
              sampling: "lttb",
              lineStyle: { width: 2, color: "#fbbf24" },
              itemStyle: { color: "#fbbf24" },
              data: marketCleanData,
            },
          ],
        });
        chart.resize(); // 强制刷新尺寸，修复 v-if 导致的容器尺寸异常
      },

      // ==================== 报告时间类型 ====================

      loadReportTypes: async function () {
        try {
          var res = await AnalysisAPI.getReportDateType(this.market);
          var list = (res && res.data) || [];
          var mapped = Array.isArray(list)
            ? list.map(function (it) {
                return { label: String(it.dictLabel || ""), value: String(it.dictValue || "") };
              })
            : [];
          // 在前面加上"全部"选项
          this.reportTypes = [{ label: "全部", value: "" }].concat(mapped);
          // 默认选中"全部"，展示所有类型报告
          this.reportTypeValue = "";
        } catch (e) {
          console.error("报告类型加载失败:", e);
          this.reportTypes = [
            { label: "全部", value: "" },
            { label: "周报", value: "1" },
            { label: "月报", value: "2" },
            { label: "季报", value: "3" },
            { label: "半年报", value: "4" },
            { label: "年报", value: "5" },
            { label: "专报", value: "6" },
          ];
          this.reportTypeValue = "";
        }
      },

      // ==================== 报告列表 ====================

      searchReports: function () {
        this.currentPage = 1;
        this._allReportsCache = null; // 关键词变化，清除缓存
        this.fetchReports();
      },

      setReportType: function (t) {
        this.reportTypeValue = t;
        this.currentPage = 1;
        this._allReportsCache = null; // 类型变化，清除缓存
        this.fetchReports();
      },

      /**
       * 拉取报告列表
       * - 选择具体类型时：直接调用后端分页接口
       * - 选择"全部"时：并行请求所有已知类型，合并后客户端分页
       *   （后端不传 reportType 时查询不稳定，此方案更可靠）
       */
      fetchReports: async function () {
        var pageNum = this.currentPage;
        var pageSize = this.pageSize;
        var rt = this.reportTypeValue;
        var title = (this.reportKeyword || "").trim();

        try {
          if (rt !== "") {
            // ---- 具体类型：服务端分页 ----
            var res = await AnalysisAPI.getCustomReports(this.market, pageNum, pageSize, rt, title);
            var rows = (res && res.rows) || [];
            var total = Number((res && res.total) || 0);
            this.totalCount = Number.isFinite(total) ? total : 0;
            this._allReportsCache = null; // 清除缓存
            this.reports = this._mapReportRows(rows, pageNum);
          } else {
            // ---- 全部：并行请求各类型 → 合并 → 客户端分页 ----
            if (this._allReportsCache) {
              // 翻页时直接用缓存，无需重新请求
              this.totalCount = this._allReportsCache.length;
              var start = (pageNum - 1) * pageSize;
              var pageRows = this._allReportsCache.slice(start, start + pageSize);
              this.reports = this._mapReportRows(pageRows, pageNum);
            } else {
              await this._fetchAllTypes(pageNum, pageSize, title);
            }
          }
        } catch (e) {
          console.error("报告列表加载失败:", e);
          this.totalCount = 0;
          this.reports = [];
        }
      },

      /** "全部"模式：并行请求各报告类型，合并去重后客户端分页 */
      _fetchAllTypes: async function (pageNum, pageSize, title) {
        // 取所有已知类型值（排除"全部"本身的空值）
        var types = this.reportTypes
          .filter(function (t) { return t.value !== ""; })
          .map(function (t) { return t.value; });

        var self = this;
        var promises = types.map(function (type) {
          // 每个类型取前 50 条（远超实际数量，确保不丢数据）
          return AnalysisAPI.getCustomReports(self.market, 1, 50, type, title)
            .catch(function () { return { rows: [], total: 0 }; });
        });

        var results = await Promise.all(promises);

        // 合并所有结果
        var allRows = [];
        results.forEach(function (res) {
          var rows = (res && res.rows) || [];
          allRows = allRows.concat(rows);
        });

        // 按报告时间倒序排序
        allRows.sort(function (a, b) {
          return String(b.reportTime || "").localeCompare(String(a.reportTime || ""));
        });

        // 去重（以 reportTitle + reportTime 为唯一键）
        var seen = {};
        allRows = allRows.filter(function (it) {
          var key = (it.reportTitle || "") + "|" + (it.reportTime || "");
          if (seen[key]) return false;
          seen[key] = true;
          return true;
        });

        // 客户端分页
        this.totalCount = allRows.length;
        this._allReportsCache = allRows;
        var start = (pageNum - 1) * pageSize;
        var pageRows = allRows.slice(start, start + pageSize);
        this.reports = this._mapReportRows(pageRows, pageNum);
      },

      /** 统一的行数据映射 */
      _mapReportRows: function (rows, pageNum) {
        return (rows || []).map(function (it, idx) {
          return {
            id: pageNum + "-" + (idx + 1),
            name: String(it.reportTitle || ""),
            uploadedAt: String(it.reportTime || ""),
            summary: String(it.reportContent || ""),
            fileUrl: it.reportFileUrl ? (APP_CONFIG.BASE_URL + it.reportFileUrl) : "",
            fileName: String(it.reportFileName || ""),
          };
        });
      },

      // ==================== 分页 ====================

      calcPageSize: function () {
        this.pageSize = 6;
        var maxPage = Math.max(1, Math.ceil((this.totalCount || 0) / this.pageSize));
        this.currentPage = Math.min(this.currentPage, maxPage);
      },

      nextPage: function () {
        var maxPage = Math.max(1, Math.ceil((this.totalCount || 0) / this.pageSize));
        if (this.currentPage < maxPage) {
          this.currentPage++;
          this.fetchReports();
        }
      },

      prevPage: function () {
        if (this.currentPage > 1) {
          this.currentPage--;
          this.fetchReports();
        }
      },

      // ==================== 预览 & 下载 ====================

      preview: function (r) {
        this.previewReport = r;
        this.showPreview = true;
      },

      closePreview: function () {
        this.showPreview = false;
        this.previewReport = null;
      },

      download: function (r) {
        if (r.fileUrl) {
          // 跨域 PDF 直接用 window.open 打开新标签页下载
          window.open(r.fileUrl, "_blank");
        } else {
          var blob = new Blob(
            ["报告名称: " + r.name + "\n上传时间: " + r.uploadedAt + "\n\n摘要:\n" + r.summary + "\n"],
            { type: "text/plain;charset=utf-8" }
          );
          var url = URL.createObjectURL(blob);
          var a = document.createElement("a");
          a.href = url;
          a.download = r.name.replace(/\s+/g, "_") + ".txt";
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        }
      },
    },

    computed: {
      totalPages: function () {
        return Math.max(1, Math.ceil((this.totalCount || 0) / this.pageSize));
      },
      pageReports: function () {
        var page = this.reports.slice();
        if (page.length < this.pageSize) {
          var need = this.pageSize - page.length;
          for (var i = 0; i < need; i++) {
            page.push({ id: "ph-" + (i + 1), placeholder: true });
          }
        }
        return page;
      },
    },
  }).mount("#app");
})();
