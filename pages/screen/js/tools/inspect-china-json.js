// 检查 china.json 的 feature 结构
const fs = require('fs');
const path = require('path');
const chinaPath = path.resolve(__dirname, '..', 'china.json');
const g = JSON.parse(fs.readFileSync(chinaPath, 'utf-8'));

console.log('Feature 数量:', g.features.length);
g.features.forEach((f, i) => {
  const props = f.properties || {};
  const name = props.name || props.Name || props.NAME || '(无名)';
  const id = props.id || f.id || '';
  const t = f.geometry ? f.geometry.type : '(无geometry)';
  const coordLen = f.geometry && f.geometry.coordinates ? JSON.stringify(f.geometry.coordinates).length : 0;
  console.log('[' + i + '] name="' + name + '", id="' + id + '", type=' + t + ', coordSize=' + coordLen);
});
