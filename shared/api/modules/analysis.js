;(function(){
  const cfg = window.APP_CONFIG || {};
  const BASE = cfg.BASE_URL || "/api";
  const TIMEOUT = cfg.TIMEOUT || 15000;
  const getToken = typeof cfg.getToken === "function" ? cfg.getToken : () => "";
  function qs(obj){
    const p = new URLSearchParams();
    Object.entries(obj || {}).forEach(([k,v])=>{
      if(v!==undefined && v!==null && v!=="") p.append(k, v);
    });
    return p.toString();
  }
  async function get(path, params){
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(), TIMEOUT);
    const isAbs = /^https?:\/\//i.test(path);
    const url = (isAbs ? path : (BASE + path)) + (params ? ("?" + qs(params)) : "");
    const headers = {};
    const token = getToken();
    if(token) headers.Authorization = "Bearer " + token;
    try{
      const res = await fetch(url, { method:"GET", headers, signal: controller.signal });
      clearTimeout(timer);
      if(!res.ok){
        const text = await res.text();
        throw new Error(text || ("HTTP " + res.status));
      }
      return res.json();
    }catch(e){
      clearTimeout(timer);
      throw e;
    }
  }
  const api = {
    // 交易量趋势图（单位：吨）→ 分析页“交易量趋势”折线图
    getVolume(date, opts){ return get("/metrics/volume", { date, ...(opts||{}) }); },
    // 交易额趋势图（单位：元）→ 分析页“交易额趋势”折线图
    getAmount(date, opts){ return get("/metrics/amount", { date, ...(opts||{}) }); },
    // 交易均价趋势图（单位：元；双线：工厂均价 vs 市场均价不含异常）→ 分析页“交易均价趋势”
    getAvgPrice(date, opts){ return get("/metrics/avg-price", { date, ...(opts||{}) }); },
    // 佣金双轴趋势（左轴：‰，右轴：元）→ 分析页“佣金趋势”双轴折线图
    getCommission(date, opts){ return get("/metrics/commission", { date, ...(opts||{}) }); },
    // 16省均价（单位：元；双线）→ “16省平均出厂价与市场交易均价”图，需要传入 province
    getProvincePrice(province, date, opts){ return get("/metrics/province-price", { province, date, ...(opts||{}) }); },
    // 分析报告列表分页/搜索 → 报告卡片与分页控件
    getReports(page, pageSize, keyword){ return get("/reports", { page, pageSize, keyword }); },
    // 页面日期范围初始化 → 顶部日期筛选可用范围
    getDateRange(){ return get("/date-range"); },
    // 省份下拉数据 → “16省均价”筛选项
    getProvinces(){ return get("/provinces"); },
    // 市场下拉数据 → 顶部市场筛选项
    getMarkets(){ return get("/markets"); }
  };
  api.getCountTrend = function(marketId, countType, paramsDate, extra){
    const path = "http://xu9sp2bdxt3d.guyubao.com/analysisData/countTrend";
    const params = { marketId, countType, paramsDate, ...(extra||{}) };
    return get(path, params);
  };
  api.getCommissionFeeLvTrend = function(marketId, paramsDate, extra){
    const path = "http://xu9sp2bdxt3d.guyubao.com/analysisData/commissionFeeLvTrend";
    const params = { marketId, paramsDate, ...(extra||{}) };
    return get(path, params);
  };
  api.getPriceTrend = function(marketId, provinceCode, paramsDate, extra){
    const path = "http://xu9sp2bdxt3d.guyubao.com/analysisData/priceTrend";
    const params = { marketId, provinceCode, paramsDate, ...(extra||{}) };
    return get(path, params);
  };
  api.getReportDateType = function(marketId, extra){
    const path = "http://xu9sp2bdxt3d.guyubao.com/analysisData/getReportDateType";
    const params = { marketId, ...(extra||{}) };
    return get(path, params);
  };
  api.getCustomReports = function(marketId, pageNum, pageSize, reportType, reportTitle, extra){
    const path = "http://xu9sp2bdxt3d.guyubao.com/analysisData/analysisData";
    const params = { marketId, pageNum, pageSize, ...(extra||{}) };
    if(reportType!==undefined && reportType!==null && reportType!=="") params.reportType = reportType;
    if(reportTitle) params.reportTitle = reportTitle;
    return get(path, params);
  };
  window.AnalysisAPI = api;
})(); 
