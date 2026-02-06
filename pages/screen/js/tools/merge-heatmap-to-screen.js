/**
 * 将 map 中的「热力地图 含省市」集成到 pages/screen 大屏，替换「地图图片」组件
 *
 * 使用方法（在项目根目录执行）：
 *   node pages/screen/js/tools/merge-heatmap-to-screen.js
 *
 * 效果：
 *   - 从 map/js/app.data.readable.js 读取热力图组件配置
 *   - 替换 pages/screen/js/app.data.readable.js 中的「地图图片」为热力图
 *   - 保持原地图图片的位置与尺寸：x=317, y=-8, width=1252, height=930
 *
 * 集成后请执行：
 *   node pages/screen/js/tools/build-config.js
 * 以生成压缩的 app.data.js 供页面使用。
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..', '..', '..', '..');
const mapReadablePath = path.join(projectRoot, 'map', 'js', 'app.data.readable.js');
const screenReadablePath = path.join(projectRoot, 'pages', 'screen', 'js', 'app.data.readable.js');

const MAP_HEATMAP_KEY = 'cpmqAvPb19UjEb8VpWD2diEJ';
const SCREEN_MAP_IMG_KEY = 'cpmbd3a7549-e208-42e1-a158-fa080262956e';
const NEXT_KEY_AFTER_MAP_IMG = 'cpm85cd8c0d-1830-4331-a1e1-674b7b89af9a';

/** 从 DS_CONFIG 字符串中按括号匹配提取指定 key 的对象（含 key 本身） */
function extractComponentBlock(content, key) {
  const keyPattern = '"' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"';
  const idx = content.indexOf('"' + key + '"');
  if (idx === -1) return null;
  const start = content.indexOf('{', idx);
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  let quote = null;
  for (let i = start; i < content.length; i++) {
    const c = content[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === '\\' && inString) {
      escape = true;
      continue;
    }
    if (!inString) {
      if (c === '"' || c === "'") {
        inString = true;
        quote = c;
        continue;
      }
      if (c === '{') {
        depth++;
        continue;
      }
      if (c === '}') {
        depth--;
        if (depth === 0) {
          const block = content.slice(idx, i + 1);
          return block.endsWith(',') ? block : block + ',';
        }
        continue;
      }
      continue;
    }
    if (c === quote) inString = false;
  }
  return null;
}

/** 在 content 中定位「从 key 开始到下一个组件 key 之前」的整段，返回 [startIndex, endIndex] */
function findComponentBlockRange(content, key, nextKey) {
  const keyStr = '"' + key + '":';
  const nextKeyStr = '"' + nextKey + '":';
  const start = content.indexOf(keyStr);
  if (start === -1) return null;
  const end = content.indexOf(nextKeyStr, start);
  if (end === -1) return null;
  return [start, end];
}

function main() {
  console.log('🔄 开始将 map 热力图集成到 pages/screen 大屏...\n');

  if (!fs.existsSync(mapReadablePath)) {
    console.error('❌ 未找到 map 可读配置:', mapReadablePath);
    console.error('   请先执行: node pages/screen/js/tools/format-config.js map/js');
    process.exit(1);
  }
  if (!fs.existsSync(screenReadablePath)) {
    console.error('❌ 未找到大屏可读配置:', screenReadablePath);
    console.error('   请先执行: node pages/screen/js/tools/format-config.js');
    process.exit(1);
  }

  const mapContent = fs.readFileSync(mapReadablePath, 'utf-8');
  const screenContent = fs.readFileSync(screenReadablePath, 'utf-8');

  const heatmapBlock = extractComponentBlock(mapContent, MAP_HEATMAP_KEY);
  if (!heatmapBlock) {
    console.error('❌ 在 map 配置中未找到热力图组件:', MAP_HEATMAP_KEY);
    process.exit(1);
  }

  const range = findComponentBlockRange(screenContent, SCREEN_MAP_IMG_KEY, NEXT_KEY_AFTER_MAP_IMG);
  if (!range) {
    console.error('❌ 在大屏配置中未找到「地图图片」或下一组件:', SCREEN_MAP_IMG_KEY, NEXT_KEY_AFTER_MAP_IMG);
    process.exit(1);
  }

  let newBlock = heatmapBlock
    .replace(new RegExp('"' + MAP_HEATMAP_KEY + '"', 'g'), '"' + SCREEN_MAP_IMG_KEY + '"')
    .replace(/"x":\s*1048/, '"x": 317')
    .replace(/"y":\s*42/, '"y": -8')
    .replace(/"width":\s*832/, '"width": 1252')
    .replace(/"height":\s*953/, '"height": 930')
    .replace(/"id":\s*1743471423202/, '"id": 1770110536420')
    .replace(/"zindex":\s*6/, '"zindex": 14');

  const before = screenContent.slice(0, range[0]);
  const after = screenContent.slice(range[1]);
  const newScreenContent = before + newBlock + '\n  ' + after;

  fs.writeFileSync(screenReadablePath, newScreenContent, 'utf-8');

  console.log('✅ 集成完成！');
  console.log('   - 已将「地图图片」替换为「热力地图 含省市」');
  console.log('   - 位置与尺寸保持原地图区域：x=317, y=-8, 1252×930');
  console.log('\n📌 下一步：生成压缩配置供页面使用');
  console.log('   node pages/screen/js/tools/build-config.js');
  console.log('\n🚀 然后刷新大屏页面即可看到热力图。');
}

main();
