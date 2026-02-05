/**
 * 构建工具 - 将可读的 app.data.readable.js 转换回压缩格式
 * 
 * 使用方法：
 *   node build-config.js
 * 
 * 输出：
 *   覆盖 app.data.js（压缩格式，用于生产环境）
 */

const fs = require('fs');
const path = require('path');

// 文件路径
const inputFile = path.join(__dirname, '..', 'app.data.readable.js');
const outputFile = path.join(__dirname, '..', 'app.data.js');
const backupFile = path.join(__dirname, '..', 'app.data.backup.js');

console.log('🔄 开始构建 app.data.js ...\n');

try {
    // 检查可读文件是否存在
    if (!fs.existsSync(inputFile)) {
        throw new Error('app.data.readable.js 不存在，请先运行 format-config.js');
    }
    
    // 备份原文件
    if (fs.existsSync(outputFile)) {
        fs.copyFileSync(outputFile, backupFile);
        console.log('📦 已备份原文件到 app.data.backup.js');
    }
    
    // 读取可读文件
    const content = fs.readFileSync(inputFile, 'utf-8');
    
    // 提取 window.DS_DATA = {...} 中的内容
    const match = content.match(/window\.DS_DATA\s*=\s*(\{[\s\S]*\});?\s*$/);
    
    if (!match) {
        throw new Error('无法解析 app.data.readable.js 文件格式');
    }
    
    // 解析 JSON
    const dsData = JSON.parse(match[1]);
    
    // 将 config 对象转换为字符串
    if (typeof dsData.config === 'object') {
        dsData.config = JSON.stringify(dsData.config);
    }
    
    // 生成压缩的 JavaScript 代码（单行）
    const compressedContent = `window.DS_DATA = ${JSON.stringify(dsData)};
`;

    // 写入压缩文件
    fs.writeFileSync(outputFile, compressedContent, 'utf-8');
    
    console.log('✅ 构建成功！');
    console.log(`📄 输出文件: ${outputFile}`);
    console.log('\n🚀 现在可以刷新浏览器查看效果了');
    
} catch (error) {
    console.error('❌ 构建失败:', error.message);
    process.exit(1);
}
