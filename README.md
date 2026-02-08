# 农产品电子交易数据管理分析交互平台

批发市场子系统（白条猪），包含数据大屏、历史查询、数据分析三个页面。

## 目录说明

```
pages/
  screen/     数据大屏
  history/    历史查询
  analysis/   数据分析
shared/
  api/        接口配置与请求工具
  assets/     公共资源
  logo/       Logo
```

## 技术栈

- 大屏页面：Vue 2  + ECharts + DataV
- 历史查询 / 数据分析：Vue 3 (CDN) + ECharts (CDN)
- 接口请求：原生 fetch，统一封装在 `shared/api/` 下

纯静态项目，没有构建步骤，不需要 npm install。

## 配置

接口地址在 `shared/api/config.js`：

```js
var BASE_URL = "http://xu9sp2bdxt3d.guyubao.com";
```

部署前改成实际的后端地址就行。

## 部署

整个项目都是静态文件，丢到任意 Web 服务器（Nginx、Apache 等）即可。

需要部署的目录只有两个：`pages/` 和 `shared/`。

打包示例（PowerShell）：

```powershell
Compress-Archive -Path pages, shared -DestinationPath dist.zip
```

Nginx 基本配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/agriculture-platform;

    gzip_static on;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

## 页面入口

| 页面 | 路径 |
|------|------|
| 数据大屏 | `pages/screen/index.html` |
| 历史查询 | `pages/history/index.html` |
| 数据分析 | `pages/analysis/index.html` |

三个页面通过顶部导航栏用相对路径互相跳转，目录结构不要改。

## 注意

- 前后端分离部署时注意跨域，后端配 CORS 或 Nginx 加反向代理
- 大屏目录下自带 `.gz` 压缩文件，Nginx 开 `gzip_static on` 可直接用
- `pages/screen/js/tools/` 和 `pages/screen/docs/` 是开发辅助文件，不用部署
