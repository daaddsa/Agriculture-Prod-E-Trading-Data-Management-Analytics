(function () {
  const DEFAULT_REMOTE_BASE_URL = "http://xu9sp2bdxt3d.guyubao.com";
  const DEFAULT_PARAMS_DATE = "2024-12-31";

  const cfg = window.APP_CONFIG || {};
  let baseURL = cfg.BASE_URL || DEFAULT_REMOTE_BASE_URL;
  const host = (typeof location !== "undefined" && location.hostname) ? location.hostname : "";
  if ((host === "localhost" || host === "127.0.0.1") && baseURL === "/api") {
    baseURL = DEFAULT_REMOTE_BASE_URL;
  }

  function normalizeCommonParams(params) {
    const p = params || {};
    const marketId = p.marketId || p.market || "1";
    const paramsDate = p.paramsDate || p.businessDate || p.date || DEFAULT_PARAMS_DATE;
    return { marketId: String(marketId), paramsDate: String(paramsDate) };
  }

  function buildUrl(path, params) {
    const qs = params ? new URLSearchParams(params).toString() : "";
    const base = String(baseURL).replace(/\/$/, "");
    const p = String(path).startsWith("/") ? path : `/${path}`;
    return qs ? `${base}${p}?${qs}` : `${base}${p}`;
  }

  async function get(path, params) {
    const url = buildUrl(path, params);
    const headers = {};
    const token = typeof cfg.getToken === "function" ? (cfg.getToken() || "") : "";
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(url, { method: "GET", headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  }

  window.historyApi = {
    getStats(params = {}) {
      const common = normalizeCommonParams(params);
      return get("/tradeInfoData/count", common);
    },

    getProportion(params = {}) {
      const common = normalizeCommonParams(params);
      const type = params.type != null ? String(params.type) : "1";
      return get("/tradeInfoData/proportion", { ...common, type });
    },

    getProvinceData() {
      return get("/tradeInfoData/getProvinceData");
    },

    getCountyData(params = {}) {
      const common = normalizeCommonParams(params);
      return get("/tradeInfoData/getCountyData", common);
    },

    getTradeList(params = {}) {
      const common = normalizeCommonParams(params);
      const pageNum = params.pageNum != null ? String(params.pageNum) : "1";
      const pageSize = params.pageSize != null ? String(params.pageSize) : "10";
      const productCode = params.productCode != null ? String(params.productCode) : "";
      const sellCode = params.sellCode != null ? String(params.sellCode) : "";
      return get("/tradeInfoData/tradeInfoData", { ...common, productCode, sellCode, pageNum, pageSize });
    },

    getFactoryTradePrice(params = {}) {
      const common = normalizeCommonParams(params);
      return get("/tradeInfoData/tradeFactoryPriceData", common);
    },

    getActivity(params = {}) {
      const common = normalizeCommonParams(params);
      return get("/tradeInfoData/activity", common);
    },

    getAbnormal(params = {}) {
      const common = normalizeCommonParams(params);
      return get("/tradeInfoData/abnormal", common);
    },
  };
})();
