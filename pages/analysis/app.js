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

  function generateDateAxis(endDateStr, count) {
    const out = [];
    const end = endDateStr ? new Date(endDateStr) : new Date();
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(end.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      out.push(`${yyyy}-${mm}-${dd}`);
    }
    return out;
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
        provinces: [],
        province16: "河南",
        reportKeyword: "",
        minDate: "",
        maxDate: "",
        reports: [],
        reportTypes: [],
        reportTypeValue: "",
        totalCount: 0,
        pageSize: 6,
        currentPage: 1,
        showPreview: false,
        previewReport: null,
        activeMenu: "reports",
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

      this.loadProvinces().then(()=>{}).catch(()=>{});
      this.loadReportTypes().then(()=>{}).catch(()=>{});
      this.initChart();
      this.fetchReports();
      this.calcPageSize();
      window.addEventListener("resize", this.calcPageSize);
    },
    methods: {
      _mapMarketId(code){
        const map = { A: 1, B: 2, C: 3 };
        return map[code] || 1;
      },
      _toMD(list){
        return (list || []).map(d=>{
          const m = Number(String(d).slice(5,7));
          const day = Number(String(d).slice(8,10));
          return `${m}-${day}`;
        });
      },
      _toNums(list){
        return (list || []).map(v=>Number(v));
      },
      _toNumsNullable(list){
        return (list || []).map(v=>{
          if(v===undefined || v===null || v==="") return null;
          return Number(v);
        });
      },
      async loadProvinces(){
        try{
          const res = await AnalysisAPI.getProvinces();
          const list = ((res && (res.data || res)) || []);
          const mapped = Array.isArray(list) ? list.map(it=>{
            const label = it.label || it.name || it.value || "";
            const value = it.value || label;
            return { label, value };
          }) : [];
          this.provinces = mapped.length ? mapped : [
            { label: "北京市", value: "北京市" },{ label: "天津市", value: "天津市" },{ label: "河北省", value: "河北省" },
            { label: "辽宁省", value: "辽宁省" },{ label: "吉林省", value: "吉林省" },{ label: "黑龙江省", value: "黑龙江省" },
            { label: "江苏省", value: "江苏省" },{ label: "浙江省", value: "浙江省" },{ label: "安徽省", value: "安徽省" },
            { label: "福建省", value: "福建省" },{ label: "山东省", value: "山东省" },{ label: "河南省", value: "河南省" },
            { label: "湖北省", value: "湖北省" },{ label: "湖南省", value: "湖南省" },{ label: "广东省", value: "广东省" },
            { label: "四川省", value: "四川省" }
          ];
          const def = this.provinces.find(p=>String(p.value).includes("河南")) || this.provinces[0];
          this.province16 = def ? def.value : "河南";
        }catch(e){
          this.provinces = [
            { label: "北京市", value: "北京市" },{ label: "天津市", value: "天津市" },{ label: "河北省", value: "河北省" },
            { label: "辽宁省", value: "辽宁省" },{ label: "吉林省", value: "吉林省" },{ label: "黑龙江省", value: "黑龙江省" },
            { label: "江苏省", value: "江苏省" },{ label: "浙江省", value: "浙江省" },{ label: "安徽省", value: "安徽省" },
            { label: "福建省", value: "福建省" },{ label: "山东省", value: "山东省" },{ label: "河南省", value: "河南省" },
            { label: "湖北省", value: "湖北省" },{ label: "湖南省", value: "湖南省" },{ label: "广东省", value: "广东省" },
            { label: "四川省", value: "四川省" }
          ];
          this.province16 = "河南";
        }
      },
      handleMarketChange() {
        console.log("Market changed to:", this.market);
        this.loadReportTypes().then(()=>{}).catch(()=>{});
        this.currentPage = 1;
        this.fetchReports();
      },
      searchReports(){
        this.currentPage = 1;
        this.fetchReports();
      },
      setReportType(t){
        this.reportTypeValue = t;
        this.currentPage = 1;
        this.fetchReports();
      },
      selectMenu(key){
        this.activeMenu = key;
        this.$nextTick(()=>{
          if(key==='volume') this.initChart();
          if(key==='amount') this.initAmountChart();
          if(key==='avgprice') this.initAvgPriceChart();
          if(key==='commission') this.initCommissionChart();
          if(key==='province16') this.initProvinceChart();
        });
      },
      handleDateChange() {
        console.log("Date changed to:", this.date);
        this.$nextTick(()=>{
          if(this.activeMenu==='volume') this.initChart();
          if(this.activeMenu==='amount') this.initAmountChart();
          if(this.activeMenu==='avgprice') this.initAvgPriceChart();
          if(this.activeMenu==='commission') this.initCommissionChart();
          if(this.activeMenu==='province16') this.initProvinceChart();
        });
      },
      handleProvince16Change(){
        this.$nextTick(()=>{
          if(this.activeMenu==='province16') this.initProvinceChart();
        });
      },
      async initAmountChart(){
        const el = document.getElementById("amountChart");
        if(!el) return;
        const chart = echarts.init(el);
        let xAxisData = [];
        let amtData = [];
        try{
          const month = String(this.date || "").slice(0,7);
          const res = await AnalysisAPI.getAmount(month, { market: this.market });
          const points = (res && res.points) || [];
          xAxisData = this._toMD(points.map(p=>p.date));
          amtData = points.map(p=>Number(p.value));
        }catch(e){
          xAxisData = [];
          amtData = [];
        }
        const maxY = Math.max(1000, ...amtData);
        const niceMax = Math.ceil(maxY / 100) * 100;
        const option = {
          tooltip: { trigger: "axis", axisPointer: { type: "line" } },
          legend: { show: false },
          grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
          xAxis: {
            type: "category",
            data: xAxisData,
            axisLabel: { interval: 0 },
            axisTick: { alignWithLabel: true, interval: 0 },
          },
          yAxis: {
            type: "value",
            min: 0,
            max: niceMax,
            interval: 100,
            name: "单位：元",
            nameTextStyle: { color: "#64748b" },
            axisLine: { show: true },
            axisTick: { show: true },
            axisLabel: { show: true },
            splitLine: { show: true },
          },
          series: [{
            name: "交易额",
            type: "line",
            smooth: true,
            showSymbol: false,
            symbol: "none",
            sampling: "lttb",
            lineStyle: { width: 2, color: "#1f8a98" },
            itemStyle: { color: "#1f8a98" },
            data: amtData,
          }],
        };
        chart.setOption(option);
        window.addEventListener("resize", () => chart.resize());
      },
      async initAvgPriceChart(){
        const el = document.getElementById("avgPriceChart");
        if(!el) return;
        const chart = echarts.init(el);
        let xAxisData = [];
        let avgData = [];
        try{
          const month = String(this.date || "").slice(0,7);
          const res = await AnalysisAPI.getAvgPrice(month, { market: this.market });
          const series = (res && res.series) || [];
          const s0 = series[0] || { points: [] };
          const points = s0.points || [];
          xAxisData = this._toMD(points.map(p=>p.date));
          avgData = points.map(p=>Number(p.value));
        }catch(e){
          xAxisData = [];
          avgData = [];
        }
        const maxY = Math.max(30, ...avgData);
        const niceMax = Math.ceil(maxY / 10) * 10;
        const option = {
          tooltip: { trigger: "axis", axisPointer: { type: "line" } },
          legend: { show: true, data: ["交易均价"], top: 8, right: 8 },
          grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
          xAxis: {
            type: "category",
            data: xAxisData,
            axisLabel: { interval: 0 },
            axisTick: { alignWithLabel: true, interval: 0 },
          },
          yAxis: {
            type: "value",
            min: 0,
            max: niceMax,
            interval: 10,
            name: "单位：元",
            nameTextStyle: { color: "#64748b" },
            axisLine: { show: true },
            axisTick: { show: true },
            axisLabel: { show: true },
            splitLine: { show: true },
          },
          series: [
            {
              name: "交易均价",
              type: "line",
              smooth: true,
              showSymbol: false,
              symbol: "none",
              sampling: "lttb",
              lineStyle: { width: 2, color: "#1f8a98" },
              itemStyle: { color: "#1f8a98" },
              data: avgData,
            },
          ],
        };
        chart.setOption(option);
        window.addEventListener("resize", () => chart.resize());
      },
      async initCommissionChart(){
        const el = document.getElementById("commissionChart");
        if(!el) return;
        const chart = echarts.init(el);
        let xAxisData = [];
        let rateData = [];
        let feeData = [];
        try{
          const month = String(this.date || "").slice(0,7);
          const res = await AnalysisAPI.getCommission(month, { market: this.market });
          const left = (res && res.seriesLeft) || [];
          const right = (res && res.seriesRight) || [];
          const lp = left[0] ? left[0].points || [] : [];
          const rp = right[0] ? right[0].points || [] : [];
          const base = lp.length ? lp : rp;
          xAxisData = this._toMD(base.map(p=>p.date));
          rateData = lp.map(p=>Number(p.value));
          feeData = rp.map(p=>Number(p.value));
        }catch(e){
          xAxisData = [];
          rateData = [];
          feeData = [];
        }
        const option = {
          tooltip: { trigger: "axis", axisPointer: { type: "line" } },
          legend: { show: true, data: ["交易佣金费率", "交易佣金费"], top: 8, right: 8 },
          grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
          xAxis: {
            type: "category",
            data: xAxisData,
            axisLabel: { interval: 0 },
            axisTick: { alignWithLabel: true, interval: 0 },
          },
          yAxis: [
            {
              type: "value",
              axisLine: { show: true },
              axisTick: { show: true },
              axisLabel: { show: true },
              splitLine: { show: true },
              name: "单位：‰",
              nameTextStyle: { color: "#64748b" },
            },
            {
              type: "value",
              axisLine: { show: true },
              axisTick: { show: true },
              axisLabel: { show: true },
              splitLine: { show: false },
              name: "单位：元",
              nameTextStyle: { color: "#64748b" },
            },
          ],
          series: [
            {
              name: "交易佣金费率",
              type: "line",
              smooth: true,
              showSymbol: false,
              symbol: "none",
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
              symbol: "none",
              sampling: "lttb",
              yAxisIndex: 1,
              lineStyle: { width: 2, color: "#fbbf24" },
              itemStyle: { color: "#fbbf24" },
              data: feeData,
            },
          ],
        };
        chart.setOption(option);
        window.addEventListener("resize", () => chart.resize());
      },
      async initProvinceChart(){
        const el = document.getElementById("provinceChart");
        if(!el) return;
        const chart = echarts.init(el);
        let xAxisData = [];
        let factoryData = [];
        let marketCleanData = [];
        try{
          const month = String(this.date || "").slice(0,7);
          const res = await AnalysisAPI.getProvincePrice(this.province16, month, { market: this.market });
          const series = (res && res.series) || [];
          const sA = series[0] || { points: [] };
          const sB = series[1] || { points: [] };
          const base = (sA.points || []).length ? sA.points : (sB.points || []);
          xAxisData = this._toMD((base || []).map(p=>p.date));
          factoryData = (sA.points || []).map(p=>p.value===null || p.value==="" ? null : Number(p.value));
          marketCleanData = (sB.points || []).map(p=>p.value===null || p.value==="" ? null : Number(p.value));
        }catch(e){
          xAxisData = [];
          marketCleanData = [];
          factoryData = [];
        }
        const maxY = Math.max(30, ...(factoryData.filter(v=>v!=null)), ...(marketCleanData.filter(v=>v!=null)));
        const niceMax = Math.ceil(maxY / 10) * 10;
        const option = {
          tooltip: { trigger: "axis", axisPointer: { type: "line" } },
          legend: { show: false },
          grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
          xAxis: {
            type: "category",
            data: xAxisData,
            axisLabel: { interval: 0 },
            axisTick: { alignWithLabel: true, interval: 0 },
          },
          yAxis: {
            type: "value",
            min: 0,
            max: niceMax,
            interval: 10,
            name: "单位：元",
            nameTextStyle: { color: "#64748b" },
            axisLine: { show: true },
            axisTick: { show: true },
            axisLabel: { show: true },
            splitLine: { show: true },
          },
          series: [
            {
              name: "该省平均出厂价",
              type: "line",
              smooth: true,
              showSymbol: false,
              symbol: "none",
              sampling: "lttb",
              lineStyle: { width: 2, color: "#1f8a98" },
              itemStyle: { color: "#1f8a98" },
              data: factoryData,
            },
            {
              name: "市场交易均价（不含异常交易）",
              type: "line",
              smooth: true,
              showSymbol: false,
              symbol: "none",
              sampling: "lttb",
              lineStyle: { width: 2, color: "#fbbf24" },
              itemStyle: { color: "#fbbf24" },
              data: marketCleanData,
            },
          ],
        };
        chart.setOption(option);
        window.addEventListener("resize", () => chart.resize());
      },
      async initChart() {
        const el = document.getElementById("trendChart");
        if (!el) return;

        const chart = echarts.init(el);

        let xAxisData = [];
        let aData = [];
        try{
          const month = String(this.date || "").slice(0,7);
          const res = await AnalysisAPI.getVolume(month, { market: this.market });
          const points = (res && res.points) || [];
          xAxisData = this._toMD(points.map(p=>p.date));
          aData = points.map(p=>Number(p.value));
        }catch(e){
          xAxisData = [];
          aData = [];
        }
        const maxY = Math.max(200, ...aData);

        const option = {
          tooltip: {
            trigger: "axis",
            axisPointer: { type: "line" },
          },
          legend: { show: false },
          grid: {
            left: "3%",
            right: "4%",
            bottom: "3%",
            containLabel: true,
          },
          xAxis: {
            type: "category",
            data: xAxisData,
            axisLabel: {
              interval: 0,
            },
            axisTick: {
              alignWithLabel: true,
              interval: 0,
            },
          },
          yAxis: {
            type: "value",
            max: maxY,
            name: "单位：吨",
            nameTextStyle: { color: "#64748b" },
            axisLine: { show: true },
            axisTick: { show: true },
            axisLabel: { show: true },
            splitLine: { show: true },
          },
          series: [{
            name: "交易量",
            type: "line",
            smooth: true,
            showSymbol: false,
            symbol: "none",
            sampling: "lttb",
            lineStyle: { width: 2, color: "#1f8a98" },
            itemStyle: { color: "#1f8a98" },
            data: aData,
          }],
        };

        chart.setOption(option);

        window.addEventListener("resize", () => chart.resize());
      },
      async loadReportTypes(){
        try{
          const marketId = this._mapMarketId(this.market);
          const res = await AnalysisAPI.getReportDateType(marketId);
          const list = ((res && res.data) || []);
          const mapped = Array.isArray(list) ? list.map(it=>({ label: String(it.dictLabel||""), value: String(it.dictValue||"") })) : [];
          this.reportTypes = mapped;
          const def = this.reportTypes[0];
          this.reportTypeValue = def ? def.value : "";
        }catch(e){
          this.reportTypes = [
            { label: "周报", value: "1" },
            { label: "月报", value: "2" },
            { label: "季报", value: "3" },
            { label: "半年报", value: "4" },
            { label: "年报", value: "5" },
            { label: "专报", value: "6" }
          ];
          this.reportTypeValue = this.reportTypes[0].value;
        }
      },
      async fetchReports(){
        try{
          const marketId = this._mapMarketId(this.market);
          const pageNum = this.currentPage;
          const pageSize = this.pageSize;
          const rt = this.reportTypeValue;
          const title = (this.reportKeyword || "").trim();
          const res = await AnalysisAPI.getCustomReports(marketId, pageNum, pageSize, rt, title);
          const rows = ((res && res.rows) || []);
          const total = Number((res && res.total) || 0);
          this.totalCount = Number.isFinite(total) ? total : 0;
          this.reports = rows.map((it, idx)=>({
            id: `${pageNum}-${idx+1}`,
            name: String(it.reportTitle||""),
            uploadedAt: String(it.reportTime||""),
            summary: String(it.reportContent||""),
            fileUrl: String(it.reportFileUrl||"") || null
          }));
        }catch(e){
          this.totalCount = 0;
          this.reports = [];
        }
      },
      calcPageSize() {
        this.pageSize = 6;
        const maxPage = Math.max(1, Math.ceil((this.totalCount||0) / this.pageSize));
        this.currentPage = Math.min(this.currentPage, maxPage);
      },
      nextPage() {
        const maxPage = Math.max(1, Math.ceil((this.totalCount||0) / this.pageSize));
        if (this.currentPage < maxPage) {
          this.currentPage++;
          this.fetchReports();
        }
      },
      prevPage() {
        if (this.currentPage > 1) {
          this.currentPage--;
          this.fetchReports();
        }
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
        return Math.max(1, Math.ceil((this.totalCount||0) / this.pageSize));
      },
      pageReports() {
        const page = this.reports.slice();
        if (page.length < this.pageSize) {
          const need = this.pageSize - page.length;
          for (let i = 0; i < need; i++) {
            page.push({
              id: `ph-${i + 1}`,
              placeholder: true,
            });
          }
        }
        return page;
      },
    },
  }).mount("#app");
})();
