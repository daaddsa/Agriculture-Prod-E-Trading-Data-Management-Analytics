// 检查 china.json 的 [34] 无名 feature 和海南 feature
const fs = require('fs');
const path = require('path');
const chinaPath = path.resolve(__dirname, '..', 'china.json');
const g = JSON.parse(fs.readFileSync(chinaPath, 'utf-8'));

// 检查第34个feature的全部properties和坐标范围
const f34 = g.features[34];
console.log('===== Feature [34] =====');
console.log('Properties:', JSON.stringify(f34.properties));
console.log('Geometry type:', f34.geometry.type);

// 计算坐标范围
let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
function scanCoords(arr) {
  if (typeof arr[0] === 'number') {
    if (arr[0] < minLng) minLng = arr[0];
    if (arr[0] > maxLng) maxLng = arr[0];
    if (arr[1] < minLat) minLat = arr[1];
    if (arr[1] > maxLat) maxLat = arr[1];
    return;
  }
  arr.forEach(a => scanCoords(a));
}
scanCoords(f34.geometry.coordinates);
console.log('坐标范围: lng [' + minLng.toFixed(2) + ', ' + maxLng.toFixed(2) + '], lat [' + minLat.toFixed(2) + ', ' + maxLat.toFixed(2) + ']');

// 多边形数量
const polys = f34.geometry.coordinates;
console.log('MultiPolygon 数量:', polys.length);
polys.forEach((p, i) => {
  let pMinLng = Infinity, pMaxLng = -Infinity, pMinLat = Infinity, pMaxLat = -Infinity;
  function scan2(arr) {
    if (typeof arr[0] === 'number') {
      if (arr[0] < pMinLng) pMinLng = arr[0];
      if (arr[0] > pMaxLng) pMaxLng = arr[0];
      if (arr[1] < pMinLat) pMinLat = arr[1];
      if (arr[1] > pMaxLat) pMaxLat = arr[1];
      return;
    }
    arr.forEach(a => scan2(a));
  }
  scan2(p);
  const pts = JSON.stringify(p).split(',').length / 2;
  console.log('  Polygon[' + i + '] lng:[' + pMinLng.toFixed(2) + ',' + pMaxLng.toFixed(2) + '] lat:[' + pMinLat.toFixed(2) + ',' + pMaxLat.toFixed(2) + '] ~pts:' + Math.round(pts));
});

// 检查海南feature
console.log('\n===== Feature [20] 海南 =====');
const hainan = g.features[20];
console.log('Geometry type:', hainan.geometry.type);
const hPolys = hainan.geometry.coordinates;
console.log('MultiPolygon 数量:', hPolys.length);
hPolys.forEach((p, i) => {
  let pMinLng = Infinity, pMaxLng = -Infinity, pMinLat = Infinity, pMaxLat = -Infinity;
  function scan3(arr) {
    if (typeof arr[0] === 'number') {
      if (arr[0] < pMinLng) pMinLng = arr[0];
      if (arr[0] > pMaxLng) pMaxLng = arr[0];
      if (arr[1] < pMinLat) pMinLat = arr[1];
      if (arr[1] > pMaxLat) pMaxLat = arr[1];
      return;
    }
    arr.forEach(a => scan3(a));
  }
  scan3(p);
  const pts = JSON.stringify(p).split(',').length / 2;
  console.log('  Polygon[' + i + '] lng:[' + pMinLng.toFixed(2) + ',' + pMaxLng.toFixed(2) + '] lat:[' + pMinLat.toFixed(2) + ',' + pMaxLat.toFixed(2) + '] ~pts:' + Math.round(pts));
});
