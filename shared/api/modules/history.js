// =====================================================
// 历史查询页 API（依赖 config.js → ApiHelper）
// 接口前缀: /tradeInfoData
// 响应格式: 原始 JSON → 使用 ApiHelper.get
// =====================================================
;(function () {
  var get = ApiHelper.get;
  var DEFAULT_PARAMS_DATE = "2024-12-31";

  /** 标准化公共参数 marketId + paramsDate */
  function normalizeCommonParams(params) {
    var p = params || {};
    var marketId   = p.marketId || p.market || "1";
    var paramsDate = p.paramsDate || p.businessDate || p.date || DEFAULT_PARAMS_DATE;
    return { marketId: String(marketId), paramsDate: String(paramsDate) };
  }

  window.historyApi = {
    /** 交易统计概览 */
    getStats: function (params) {
      var common = normalizeCommonParams(params);
      return get("/tradeInfoData/count", common);
    },

    /** 货源占比/流向占比 */
    getProportion: function (params) {
      params = params || {};
      var common = normalizeCommonParams(params);
      var type = params.type != null ? String(params.type) : "1";
      return get("/tradeInfoData/proportion", Object.assign({}, common, { type: type }));
    },

    /** 省份下拉数据 */
    getProvinceData: function () {
      return get("/tradeInfoData/getProvinceData");
    },

    /** 区县数据 */
    getCountyData: function (params) {
      var common = normalizeCommonParams(params);
      return get("/tradeInfoData/getCountyData", common);
    },

    /** 日交易信息查询（分页） */
    getTradeList: function (params) {
      params = params || {};
      var common = normalizeCommonParams(params);
      return get("/tradeInfoData/tradeInfoData", Object.assign({}, common, {
        productCode: params.productCode != null ? String(params.productCode) : "",
        sellCode:    params.sellCode != null ? String(params.sellCode) : "",
        pageNum:     params.pageNum != null ? String(params.pageNum) : "1",
        pageSize:    params.pageSize != null ? String(params.pageSize) : "10",
      }));
    },

    /** 屠宰场出厂价/批发价表格 */
    getFactoryTradePrice: function (params) {
      var common = normalizeCommonParams(params);
      return get("/tradeInfoData/tradeFactoryPriceData", common);
    },

    /** 日交易活跃度 */
    getActivity: function (params) {
      var common = normalizeCommonParams(params);
      return get("/tradeInfoData/activity", common);
    },

    /** 异常交易数据 */
    getAbnormal: function (params) {
      var common = normalizeCommonParams(params);
      return get("/tradeInfoData/abnormal", common);
    },
  };
})();
