// =====================================================
// 全局 API 配置 + 共享请求工具
// HTML加载顺序：config.js → modules/xxx.js → app.js
// =====================================================
;(function () {
  // ---------- 常量 ----------
  var BASE_URL = "http://xu9sp2bdxt3d.guyubao.com";
  var TIMEOUT  = 15000;

  // ---------- Token ----------
  function getToken() {
    return localStorage.getItem("token") || "";
  }

  // ---------- 工具函数 ----------
  /** 拼接 URL：base + path + queryString */
  function buildUrl(path, params) {
    var base = String(BASE_URL).replace(/\/$/, "");
    var p = String(path).startsWith("/") ? path : ("/" + path);
    if (!params) return base + p;
    // 过滤掉 undefined / null 的参数（保留空字符串 ""，因日交易查询接口需要 productCode=&sellCode= 表示全部）
    var filtered = {};
    Object.entries(params).forEach(function (kv) {
      if (kv[1] !== undefined && kv[1] !== null) {
        filtered[kv[0]] = kv[1];
      }
    });
    var qs = new URLSearchParams(filtered).toString();
    return qs ? (base + p + "?" + qs) : (base + p);
  }

  /**
   * 通用 GET 请求（带超时、Token、错误处理）
   * @param {string}  path    接口路径，如 "/tradeDynamicData/visualData"
   * @param {object}  params  查询参数（可选）
   * @returns {Promise<any>}  返回完整的 response JSON
   */
  async function get(path, params) {
    var url = buildUrl(path, params);
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, TIMEOUT);

    var headers = {};
    var token = getToken();
    if (token) headers["Authorization"] = "Bearer " + token;

    try {
      var res = await fetch(url, { method: "GET", headers: headers, signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) {
        var text = await res.text();
        throw new Error(text || ("HTTP " + res.status));
      }
      return await res.json();
    } catch (e) {
      clearTimeout(timer);
      throw e;
    }
  }

  /**
   * GET 请求 + 自动解包 {code, data, msg} 格式
   * 后端统一返回 {code:200, data:..., msg:...} 时使用
   * @returns {Promise<any>}  直接返回 data 字段
   */
  async function getData(path, params) {
    var resData = await get(path, params);
    if (resData.code === 200) return resData.data;
    throw new Error(resData.msg || ("API error, code: " + resData.code));
  }

  // ---------- 导出 ----------
  window.APP_CONFIG = {
    BASE_URL: BASE_URL,
    TIMEOUT:  TIMEOUT,
    getToken: getToken,
  };

  /** 共享请求工具，供各模块使用 */
  window.ApiHelper = {
    buildUrl: buildUrl,
    get:      get,      // 返回原始 JSON
    getData:  getData,  // 自动解包 {code:200, data}
  };
})();
