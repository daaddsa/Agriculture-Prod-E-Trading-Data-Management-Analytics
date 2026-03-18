// =====================================================
// 大屏页 API（依赖 config.js → ApiHelper）
// 接口前缀: /tradeDynamicData
// 响应格式: {code:200, data:...} → 使用 ApiHelper.getData 自动解包
// =====================================================
;(function () {
  var api = ApiHelper.getData;

  window.screenApi = {
    /** 可视化指标总览（交易总量、金额、均价、排名等） */
    getVisualData: function (marketId) {
      return api("/tradeDynamicData/visualData", { marketId: marketId });
    },
    /** 省份均价数据（地图热力图用） */
    getTradeDataProvinces: function (marketId) {
      return api("/tradeDynamicData/tradeDataProvinces", { marketId: marketId });
    },
    /** 异常交易数据 */
    getAbnormalData: function (marketId) {
      return api("/tradeDynamicData/abnormal", { marketId: marketId });
    },
    /** 交易动态（折线图用） */
    getActivityData: function (marketId) {
      return api("/tradeDynamicData/activity", { marketId: marketId });
    },
    /** 交易市场列表 */
    getTradeMarkets: function () {
      return api("/tradeDynamicData/getTradeMarket");
    },
  };
})();
