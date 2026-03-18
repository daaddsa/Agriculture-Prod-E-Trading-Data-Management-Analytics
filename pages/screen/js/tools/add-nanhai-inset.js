/**
 * 为 china.json 添加南海诸岛缩略框
 *
 * 原理：
 * 1. 从海南 feature 中提取南海诸岛多边形（polygon 1-132）
 * 2. 将九段线 feature 的坐标一并处理
 * 3. 缩放 + 平移到大陆右下角形成缩略框
 * 4. 添加矩形边框 feature
 * 5. 海南只保留本岛（polygon 0）
 *
 * 运行: node pages/screen/js/tools/add-nanhai-inset.js
 */

const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, '..', 'china.backup.json'); // 从备份读取原始数据
const OUTPUT = path.resolve(__dirname, '..', 'china.json');
const BACKUP = path.resolve(__dirname, '..', 'china.backup.json');

// ========== 配置 ==========

// 源区域（南海诸岛实际地理范围）
const SRC_BOX = {
  minLng: 104, maxLng: 123,
  minLat: 2, maxLat: 25
};

// 目标缩略框位置（大陆右下方，缩小版）
const DST_BOX = {
  minLng: 126.7, maxLng: 130.2,
  minLat: 18.2, maxLat: 23.5
};

// 边框内边距
const BORDER_PADDING = 0.2;

// ========== 坐标转换 ==========

function transformCoord(lng, lat) {
  const srcW = SRC_BOX.maxLng - SRC_BOX.minLng;
  const srcH = SRC_BOX.maxLat - SRC_BOX.minLat;
  const dstW = DST_BOX.maxLng - DST_BOX.minLng;
  const dstH = DST_BOX.maxLat - DST_BOX.minLat;

  const newLng = DST_BOX.minLng + ((lng - SRC_BOX.minLng) / srcW) * dstW;
  const newLat = DST_BOX.minLat + ((lat - SRC_BOX.minLat) / srcH) * dstH;

  return [Math.round(newLng * 100) / 100, Math.round(newLat * 100) / 100];
}

function transformCoords(arr) {
  if (typeof arr[0] === 'number') {
    return transformCoord(arr[0], arr[1]);
  }
  return arr.map(a => transformCoords(a));
}

// ========== 主逻辑 ==========

function main() {
  console.log('读取 china.json...');
  const raw = fs.readFileSync(INPUT, 'utf-8');
  const geo = JSON.parse(raw);

  // 备份原文件
  fs.writeFileSync(BACKUP, raw, 'utf-8');
  console.log('已备份到:', BACKUP);

  // 找到海南和九段线 feature
  const hainanIdx = geo.features.findIndex(f => f.properties.name === '海南');
  const jdIdx = geo.features.findIndex(f => f.properties.adchar === 'JD' || (f.properties.adcode && f.properties.adcode.toString().includes('JD')));

  console.log('海南 feature index:', hainanIdx);
  console.log('九段线 feature index:', jdIdx);

  if (hainanIdx < 0) {
    console.error('找不到海南 feature!');
    process.exit(1);
  }

  const hainan = geo.features[hainanIdx];
  const hainanPolys = hainan.geometry.coordinates;
  console.log('海南多边形数:', hainanPolys.length);

  // 提取南海诸岛（polygon 1-132）
  const islandPolys = hainanPolys.slice(1);
  console.log('提取南海诸岛多边形:', islandPolys.length, '个');

  // 海南只保留本岛
  hainan.geometry.coordinates = [hainanPolys[0]];
  console.log('海南只保留本岛');

  // 转换岛礁坐标
  const transformedIslands = islandPolys.map(poly => transformCoords(poly));

  // 转换九段线坐标
  let transformedJD = null;
  if (jdIdx >= 0) {
    const jd = geo.features[jdIdx];
    transformedJD = {
      type: 'Feature',
      properties: { name: '' },
      geometry: {
        type: jd.geometry.type,
        coordinates: transformCoords(jd.geometry.coordinates)
      }
    };
    // 删除原九段线 feature
    geo.features.splice(jdIdx, 1);
    console.log('九段线已转换并移除原 feature');

    // 如果删除九段线导致海南索引变化，需要调整
    // (九段线在海南之后，所以不影响)
  }

  // 计算缩略框边框坐标
  const bMinLng = DST_BOX.minLng - BORDER_PADDING;
  const bMaxLng = DST_BOX.maxLng + BORDER_PADDING;
  const bMinLat = DST_BOX.minLat - BORDER_PADDING;
  const bMaxLat = DST_BOX.maxLat + BORDER_PADDING;

  // 创建南海诸岛缩略框 feature
  // 外圈是边框矩形，内部是转换后的岛礁
  const borderPoly = [[
    [bMinLng, bMinLat],
    [bMaxLng, bMinLat],
    [bMaxLng, bMaxLat],
    [bMinLng, bMaxLat],
    [bMinLng, bMinLat]
  ]];

  // 构建 MultiPolygon: 边框 + 岛礁
  const nanhaiCoords = [borderPoly, ...transformedIslands];

  const nanhaiFeature = {
    type: 'Feature',
    properties: {
      name: '南海诸岛',
      adcode: '100000_NH',
      childrenNum: 0
    },
    geometry: {
      type: 'MultiPolygon',
      coordinates: nanhaiCoords
    }
  };

  // 添加转换后的九段线
  if (transformedJD) {
    // 将九段线坐标也加入南海诸岛 feature 的多边形中
    if (transformedJD.geometry.type === 'MultiPolygon') {
      nanhaiFeature.geometry.coordinates.push(...transformedJD.geometry.coordinates);
    }
  }

  // 添加南海诸岛 feature 到末尾
  geo.features.push(nanhaiFeature);

  console.log('\n===== 新的 feature 列表 =====');
  geo.features.forEach((f, i) => {
    const name = f.properties.name || '(无名)';
    const type = f.geometry.type;
    const coordSize = JSON.stringify(f.geometry.coordinates).length;
    console.log('[' + i + '] ' + name + ' (' + type + ', size=' + coordSize + ')');
  });

  // 验证南海诸岛坐标范围
  let vMinLng = Infinity, vMaxLng = -Infinity, vMinLat = Infinity, vMaxLat = -Infinity;
  function scan(arr) {
    if (typeof arr[0] === 'number') {
      if (arr[0] < vMinLng) vMinLng = arr[0];
      if (arr[0] > vMaxLng) vMaxLng = arr[0];
      if (arr[1] < vMinLat) vMinLat = arr[1];
      if (arr[1] > vMaxLat) vMaxLat = arr[1];
      return;
    }
    arr.forEach(a => scan(a));
  }
  scan(nanhaiFeature.geometry.coordinates);
  console.log('\n南海诸岛缩略框坐标范围:');
  console.log('  lng: [' + vMinLng.toFixed(2) + ', ' + vMaxLng.toFixed(2) + ']');
  console.log('  lat: [' + vMinLat.toFixed(2) + ', ' + vMaxLat.toFixed(2) + ']');

  // 写入
  fs.writeFileSync(OUTPUT, JSON.stringify(geo), 'utf-8');
  const size = (fs.statSync(OUTPUT).size / 1024).toFixed(1);
  console.log('\n已保存到:', OUTPUT);
  console.log('文件大小:', size, 'KB');
}

main();
