// 全局运行时配置（纯静态站点场景：不依赖打包工具）
// 约定：前端请求永远走 /api，由 nginx 反向代理到后端
window.APP_CONFIG = {
  BASE_URL: "/api",
  TIMEOUT: 15000,
  // 如后端用 token（Bearer），可在此统一读取
  getToken() {
    return localStorage.getItem("token") || "";
  },
};

