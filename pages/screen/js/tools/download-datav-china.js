/**
 * 下载 DataV 中国地图 GeoJSON 并处理省份名称
 * 1. 去除省份名称后缀（市/省/自治区/特别行政区 等）
 * 2. 保留南海诸岛等特殊 feature
 * 3. 输出到 china-datav.json
 *
 * 运行: node pages/screen/js/tools/download-datav-china.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const URL = 'https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json';
const OUTPUT = path.resolve(__dirname, '..', 'china-datav.json');

// 省份名称后缀去除规则
function stripSuffix(name) {
  if (!name) return name;
  return name
    .replace(/维吾尔自治区$/, '')
    .replace(/壮族自治区$/, '')
    .replace(/回族自治区$/, '')
    .replace(/自治区$/, '')
    .replace(/特别行政区$/, '')
    .replace(/省$/, '')
    .replace(/市$/, '');
}

function download(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  console.log('下载 DataV GeoJSON...');
  console.log('URL:', URL);

  const raw = await download(URL);
  const geo = JSON.parse(raw);

  console.log('Feature 数量:', geo.features.length);
  console.log('\n===== 原始名称 → 处理后名称 =====');

  let hasNanhai = false;

  geo.features.forEach((f, i) => {
    const originalName = f.properties.name || '';
    const newName = stripSuffix(originalName);

    if (originalName !== newName) {
      console.log(`  [${i}] "${originalName}" → "${newName}"`);
      f.properties.name = newName;
    } else {
      console.log(`  [${i}] "${originalName}" (不变)`);
    }

    if (originalName.includes('南海') || newName.includes('南海')) {
      hasNanhai = true;
      console.log('  ★ 发现南海诸岛 feature!');
    }
  });

  console.log('\n===== 结果 =====');
  console.log('南海诸岛 feature:', hasNanhai ? '有 ✓' : '无 ✗');
  console.log('总 feature 数:', geo.features.length);

  // 列出所有名称
  const names = geo.features.map(f => f.properties.name).filter(Boolean);
  console.log('省份列表:', names.join('、'));

  // 写入文件
  fs.writeFileSync(OUTPUT, JSON.stringify(geo), 'utf-8');
  console.log('\n已保存到:', OUTPUT);
  console.log('文件大小:', (fs.statSync(OUTPUT).size / 1024).toFixed(1), 'KB');
}

main().catch(err => {
  console.error('错误:', err.message);
  process.exit(1);
});
