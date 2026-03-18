// =====================================================
// 分析报告页 API（依赖 config.js → ApiHelper）
// 接口前缀: /analysisData
// 响应格式: 原始 JSON → 使用 ApiHelper.get
// =====================================================
;(function () {
  var get = ApiHelper.get;

  window.AnalysisAPI = {
    /** 交易量/交易额趋势（countType: 1=交易量, 2=交易额, 3=交易均价, 4=交易均价剔除异常交易, 5=交易佣金费） */
    getCountTrend: function (marketId, countType, paramsDate, extra) {
      return get("/analysisData/countTrend", Object.assign(
        { marketId: marketId, countType: countType, paramsDate: paramsDate },
        extra || {}
      ));
    },

    /** 佣金费率走势 */
    getCommissionFeeLvTrend: function (marketId, paramsDate, extra) {
      return get("/analysisData/commissionFeeLvTrend", Object.assign(
        { marketId: marketId, paramsDate: paramsDate },
        extra || {}
      ));
    },

    /** 16省均价走势 */
    getPriceTrend: function (marketId, provinceCode, paramsDate, extra) {
      return get("/analysisData/priceTrend", Object.assign(
        { marketId: marketId, provinceCode: provinceCode, paramsDate: paramsDate },
        extra || {}
      ));
    },

    /** 报告日期类型下拉 */
    getReportDateType: function (marketId, extra) {
      return get("/analysisData/getReportDateType", Object.assign(
        { marketId: marketId },
        extra || {}
      ));
    },

    /** 分析报告列表（分页 + 搜索） */
    getCustomReports: function (marketId, pageNum, pageSize, reportType, reportTitle, extra) {
      var params = Object.assign({ marketId: marketId, pageNum: pageNum, pageSize: pageSize }, extra || {});
      if (reportType !== undefined && reportType !== null && reportType !== "") {
        params.reportType = reportType;
      }
      if (reportTitle) {
        params.reportTitle = reportTitle;
      }
      return get("/analysisData/analysisReport", params);
    },
  };
})();
