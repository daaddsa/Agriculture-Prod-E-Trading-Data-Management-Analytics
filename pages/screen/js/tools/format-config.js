/**
 * 格式化工具 - 将 app.data.js 转换为可读的 JSON 格式
 * 
 * 使用方法：
 *   node format-config.js                    # 格式化 pages/screen/js/app.data.js
 *   node format-config.js map/js             # 格式化指定目录下的 app.data.js
 * 
 * 输出：
 *   生成 app.data.readable.js（可读格式，value 字段也转为可读对象）
 */

const fs = require('fs');
const path = require('path');

// 支持指定目标目录，默认为 tools 的上一级（pages/screen/js）
const targetDir = process.argv[2]
    ? path.resolve(process.cwd(), process.argv[2])
    : path.join(__dirname, '..');

// 文件路径
const inputFile = path.join(targetDir, 'app.data.js');
const outputFile = path.join(targetDir, 'app.data.readable.js');

console.log('🔄 开始格式化 app.data.js ...');
console.log(`   输入: ${inputFile}\n`);

/**
 * 递归解析对象中的 JSON 字符串字段
 * 将 data.value 等字符串字段解析为对象
 */
function parseJsonStrings(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }
    
    if (Array.isArray(obj)) {
        return obj.map(item => parseJsonStrings(item));
    }
    
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        if (key === 'value' && typeof value === 'string') {
            // 尝试解析 value 字段的 JSON 字符串
            try {
                const parsed = JSON.parse(value);
                result[key] = parsed;
                result['__value_was_string__'] = true; // 标记原来是字符串
            } catch {
                result[key] = value; // 解析失败保持原样
            }
        } else if (key === 'dataFormatter' && typeof value === 'string' && value.startsWith('{')) {
            // 尝试解析 dataFormatter 字段
            try {
                const parsed = JSON.parse(value);
                result[key] = parsed;
                result['__dataFormatter_was_string__'] = true;
            } catch {
                result[key] = value;
            }
        } else if (typeof value === 'object') {
            result[key] = parseJsonStrings(value);
        } else {
            result[key] = value;
        }
    }
    return result;
}

/**
 * 从 JS 源码中提取 window.DS_DATA = {...} 的赋值对象（按括号匹配，避免正则贪婪截断）
 */
function extractDsDataObject(content) {
    const prefix = 'window.DS_DATA';
    const idx = content.indexOf(prefix);
    if (idx === -1) return null;
    const start = content.indexOf('{', idx + prefix.length);
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
                if (depth === 0) return content.slice(start, i + 1);
                continue;
            }
            continue;
        }
        if (c === quote) inString = false;
    }
    return null;
}

try {
    // 读取原始文件
    const content = fs.readFileSync(inputFile, 'utf-8');
    
    // 提取 window.DS_DATA = {...} 中的内容（括号匹配，支持长字符串内的 } {）
    const jsonStr = extractDsDataObject(content);
    
    if (!jsonStr) {
        throw new Error('无法解析 app.data.js 文件格式（未找到有效的 window.DS_DATA 对象）');
    }
    
    // 解析 JSON
    const dsData = JSON.parse(jsonStr);
    
    // 解析 config 字符串为对象
    let configObj = null;
    if (typeof dsData.config === 'string') {
        configObj = JSON.parse(dsData.config);
    } else {
        configObj = dsData.config;
    }
    
    // 递归解析所有 JSON 字符串字段（包括 value）
    configObj = parseJsonStrings(configObj);
    
    // 生成可读的 JavaScript 代码
    const formattedConfig = JSON.stringify(configObj, null, 2);
    
    const readableContent = `/**
 * 大屏配置文件（可读格式）
 * 
 * 直接编辑此文件，刷新浏览器即可看到效果
 * 
 * 注意：data.value 字段现在是对象格式，方便编辑
 *       导出时会自动转回字符串格式
 * 
 * 生成时间: ${new Date().toLocaleString('zh-CN')}
 */

// ==================== 配置对象（可直接编辑）====================
const DS_CONFIG = ${formattedConfig};

// ==================== 辅助函数（请勿修改）====================
/**
 * 将 value 对象转回字符串格式（应用程序需要字符串格式）
 */
function stringifyValues(obj) {
    if (typeof obj !== 'object' || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map(item => stringifyValues(item));
    
    const result = {};
    for (const [key, val] of Object.entries(obj)) {
        if (key === '__value_was_string__' || key === '__dataFormatter_was_string__') {
            continue; // 跳过标记字段
        }
        if (key === 'value' && typeof val === 'object' && obj['__value_was_string__']) {
            result[key] = JSON.stringify(val);
        } else if (key === 'dataFormatter' && typeof val === 'object' && obj['__dataFormatter_was_string__']) {
            result[key] = JSON.stringify(val);
        } else if (typeof val === 'object') {
            result[key] = stringifyValues(val);
        } else {
            result[key] = val;
        }
    }
    return result;
}

// ==================== 导出数据（请勿修改此部分）====================
window.DS_DATA = {
  "config": JSON.stringify(stringifyValues(DS_CONFIG)),
  "device_type": "${dsData.device_type || 'pc'}",
  "title": "${dsData.title || '大屏'}"
};
`;

    // 写入可读文件
    fs.writeFileSync(outputFile, readableContent, 'utf-8');
    
    console.log('✅ 格式化成功！');
    console.log(`📄 输出文件: ${outputFile}`);
    console.log('\n📝 现在你可以编辑 app.data.readable.js 文件了');
    console.log('💡 data.value 字段现在是可读的对象格式');
    console.log('💡 编辑后刷新浏览器即可生效');
    
    // 统计组件数量
    const componentCount = Object.keys(configObj).length;
    console.log(`\n📊 统计: 共 ${componentCount} 个组件`);
    
    // 列出主要组件
    console.log('\n📋 组件列表:');
    Object.entries(configObj).forEach(([key, value]) => {
        if (value.name) {
            console.log(`   - ${value.name} (${key})`);
        }
    });
    
} catch (error) {
    console.error('❌ 格式化失败:', error.message);
    process.exit(1);
}
