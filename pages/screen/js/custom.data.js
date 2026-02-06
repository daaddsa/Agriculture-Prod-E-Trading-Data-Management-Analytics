//自定义获取数据代码, 详细教程请参考https://www.data-show.cn/newsDetail.html?no=92
window._DS_DATA = {
    enable: true, // 是否开启数据自定义,如果要自定义请设置为true
    dataSet: {} // 数据集: 大屏中每个组件的数据，key为编辑器中设置的数据集名称，value为组件数据必须和编辑器中静态数据格式一致
}
// window._DS_DATA.dataSet对象里的数据发生变化时，会自动触发大屏数据更新
// 数据集名称请在编辑器中设置

// 省份代码 → 显示名称（GB/T 2260 前两位，用于地图/排名等动态映射）
const PROVINCE_CODE_TO_NAME = {
    '11': '北京', '12': '天津', '13': '河北', '14': '山西', '15': '内蒙古',
    '21': '辽宁', '22': '吉林', '23': '黑龙江', '31': '上海', '32': '江苏',
    '33': '浙江', '34': '安徽', '35': '福建', '36': '江西', '37': '山东',
    '41': '河南', '42': '湖北', '43': '湖南', '44': '广东', '45': '广西',
    '46': '海南', '50': '重庆', '51': '四川', '52': '贵州', '53': '云南',
    '54': '西藏', '61': '陕西', '62': '甘肃', '63': '青海', '64': '宁夏',
    '65': '新疆', '71': '台湾', '81': '香港', '82': '澳门'
};

// --- 模拟数据 (Mock Data) ---
// 当接口无法访问或无数据时使用
const MOCK_DATA = {
    visualData: {
        tradeFactoryPrices: [
            { nameProv: '山东', factoryPrice: '24.5' },
            { nameProv: '河北', factoryPrice: '23.8' },
            { nameProv: '河南', factoryPrice: '24.1' },
            { nameProv: '江苏', factoryPrice: '25.2' },
            { nameProv: '安徽', factoryPrice: '24.8' },
            { nameProv: '湖北', factoryPrice: '23.9' }
        ],
        provinceNameRank: ['山东', '河北', '河南', '江苏', '安徽'],
        provinceTradeVolumeRank: [1200, 980, 850, 720, 600],
        countyNameRank: ['市场A', '市场B', '市场C', '市场D', '市场E'],
        countyTradeVolumeRank: [500, 450, 400, 350, 300]
    },
    tradeDataProvinces: [
        { provinceName: '山东', volume: 1500 },
        { provinceName: '河北', volume: 1200 },
        { provinceName: '河南', volume: 1000 },
        { provinceName: '江苏', volume: 800 },
        { provinceName: '湖北', volume: 600 },
        { provinceName: '广东', volume: 400 },
        { provinceName: '四川', volume: 300 }
    ],
    activityData: {
        xList: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'],
        yList: [120, 132, 101, 134, 90, 230]
    },
    abnormalData: [
        { businessDate: '2023-10-01', producAdd: '山东', sellAdd: '北京', businessPrice: '12.5' },
        { businessDate: '2023-10-01', producAdd: '河北', sellAdd: '天津', businessPrice: '13.2' },
        { businessDate: '2023-10-02', producAdd: '河南', sellAdd: '上海', businessPrice: '11.8' }
    ]
};

/** 将省份代码或已有名称动态映射为显示名称；若已是名称或未知代码则原样返回 */
function mapProvinceCodeToName(codeOrName) {
    if (codeOrName == null || codeOrName === '') return '';
    const s = String(codeOrName).trim();
    const two = s.length >= 2 ? s.substring(0, 2) : s;
    return PROVINCE_CODE_TO_NAME[two] != null ? PROVINCE_CODE_TO_NAME[two] : s;
}

/**
 * 从带代码/名称的数据中生成「仅含有效数据」的排名用 titles + values，并在名称后加排名数字
 * @param {Array} list 如 [{ provinceCode, volume }] 或 [{ name, value }]，或由 visualData 拆成的 titles+values
 * @param {Object} options { codeKey, valueKey, nameKey } 字段名，用于兼容不同接口
 * @returns {{ titles: string[], values: number[] }}
 */
function buildProvinceRankWithLabel(list, options = {}) {
    const { codeKey = 'provinceCode', valueKey = 'volume', nameKey = 'name' } = options;
    if (!Array.isArray(list) || list.length === 0) return { titles: [], values: [] };
    const pairs = list
        .map(item => {
            const rawName = item[codeKey] != null ? item[codeKey] : item[nameKey];
            const name = mapProvinceCodeToName(rawName);
            const val = item[valueKey] != null ? parseFloat(item[valueKey]) : parseFloat(item.value);
            return { name, value: isNaN(val) ? 0 : val };
        })
        .filter(p => p.value > 0); // 只保留有数据的省份
    pairs.sort((a, b) => b.value - a.value);
    const titles = pairs.map(p => p.name);
    const values = pairs.map(p => p.value);
    return { titles, values };
}

// 这里自定义你的数据更新逻辑，window._DS_DATA.dataSet 里的数据发生改变时，页面上会自动触发数据更新

async function getData() {
    // 优先从 URL 参数中获取 marketId，如果没有则默认为 1
    // 例如: index.html?marketId=2 将会加载市场 2 的数据
    const urlParams = new URLSearchParams(window.location.search);
    const marketId = urlParams.get('marketId') || 1;
    
    // 使用 HTTP 而不是 HTTPS，以避免在 HTTP 环境下出现 Mixed Content 问题
    // 如果您的环境强制 HTTPS，请手动修改为 https
    const baseUrl = 'http://xu9sp2bdxt3d.guyubao.com/tradeDynamicData';
    
    console.log(`[CustomData] Starting update... MarketID: ${marketId}, BaseURL: ${baseUrl}`);
    
    const endpoints = {
        visualData: `${baseUrl}/visualData?marketId=${marketId}`,
        tradeDataProvinces: `${baseUrl}/tradeDataProvinces?marketId=${marketId}`, // 可视化指标数据
        abnormalData: `${baseUrl}/abnormal?marketId=${marketId}`,
        activityData: `${baseUrl}/activity?marketId=${marketId}`
    };

    try {
        const promises = Object.entries(endpoints).map(async ([key, url]) => {
            try {
                console.log(`[CustomData] Fetching ${key}: ${url}`);
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const resData = await response.json();
                if (resData.code === 200) {
                    return { key, data: resData.data };
                } else {
                    console.warn(`[CustomData] API Error ${key}:`, resData.msg);
                    return null;
                }
            } catch (err) {
                console.error(`[CustomData] Network Error ${key}:`, err);
                return null;
            }
        });

        const results = await Promise.all(promises);
        
        // 更新数据集
        const newDataSet = {};
        
        // 映射结果
        const rawResults = {};
        results.forEach(item => {
            if (item) rawResults[item.key] = item.data;
        });

        // --- 模拟数据回退逻辑 ---
        // 如果关键数据为空，则使用 MOCK_DATA
        if (!rawResults.visualData && !rawResults.tradeDataProvinces) {
            console.warn('[CustomData] No valid data from API. Switching to MOCK_DATA.');
            Object.assign(rawResults, MOCK_DATA);
        }

        // 1. 商品销售排行 (visualData) -> 商品表
        if (rawResults.visualData && rawResults.visualData.tradeFactoryPrices) {
            const rawList = rawResults.visualData.tradeFactoryPrices;
            // 使用 mapProvinceCodeToName 确保省份名称统一，并支持代码映射
            const flatItems = rawList.map(item => {
                const name = mapProvinceCodeToName(item.nameProv);
                // 如果需要将数值追加到名称后 (如 "北京 23.13")，可在此修改:
                // const displayName = `${name} ${item.factoryPrice}`;
                // 目前保持两列结构
                return [name, item.factoryPrice];
            });
            
            const body = [];
            for (let i = 0; i < flatItems.length; i += 2) {
                const item1 = flatItems[i];
                const item2 = flatItems[i+1];
                if (item2) {
                    body.push([...item1, ...item2]);
                } else {
                    body.push([...item1, "", ""]);
                }
            }
            newDataSet['商品销售排行'] = { body: body };
            // ID mapping for robustness
            newDataSet['cpm5znQAaRPBgPONPpN0ce87'] = { body: body };
        }

        // 2. 产地销售量排名（用代码动态映射到名称 + 仅显示有数据的省份 + 名称后加排名数字）
        const tradeProvinces = rawResults.tradeDataProvinces;
        const visualData = rawResults.visualData || {};

        // --- 准备动态地图数据 ---
        let mapData = [];
        if (Array.isArray(tradeProvinces)) {
            mapData = tradeProvinces.map(item => ({
                name: mapProvinceCodeToName(item.provinceName || item.provinceCode),
                value: parseFloat(item.volume || item.value)
            })).filter(p => p.value > 0);
        }

        // 更新 "动态地图数据" 数据集
        // 注意：ECharts 地图通常需要 series data 为 [{name: '北京', value: 100}, ...]
        // 这里我们需要适配大屏组件的数据格式，通常是 titles/values 或 body
        // 假设通用 EChart 组件接受 factoryData 格式
        if (mapData.length > 0) {
            const mapFactoryData = {
                titles: mapData.map(d => d.name),
                values: [{
                    name: "交易量",
                    data: mapData.map(d => d.value)
                }]
            };
            newDataSet['动态地图数据'] = mapFactoryData;
            console.log('[CustomData] Prepared 动态地图数据:', mapFactoryData);
        }

        if (Array.isArray(tradeProvinces) && tradeProvinces.length > 0) {
            // 优先使用 tradeDataProvinces：接口通常为 [{ provinceCode, volume }] 或 [{ name, value }]
            const { titles, values } = buildProvinceRankWithLabel(tradeProvinces, {
                codeKey: 'provinceCode',
                valueKey: 'volume',
                nameKey: 'provinceName'
            });
            if (titles.length > 0) {
                const factoryData = {
                    titles,
                    values: [{ data: values, name: "产地销售量排名" }]
                };
                newDataSet['产地销售量排名'] = factoryData;
                newDataSet['cpm46a6db0a-dae1-42f4-a476-e5be47b52121'] = factoryData;
                console.log('[CustomData] Prepared 产地销售量排名 (from tradeDataProvinces):', JSON.stringify(factoryData));
            }
        }
        if (!newDataSet['产地销售量排名'] && visualData.provinceNameRank && visualData.provinceTradeVolumeRank) {
            // 回退：用 visualData，仍做「仅保留有数据 + 名称加排名数字」
            const rawTitles = visualData.provinceNameRank;
            const rawValues = visualData.provinceTradeVolumeRank.map(v => parseFloat(v));
            const list = rawTitles.slice(0, rawValues.length).map((name, i) => ({
                name: mapProvinceCodeToName(name),
                value: isNaN(rawValues[i]) ? 0 : rawValues[i]
            }));
            const { titles, values } = buildProvinceRankWithLabel(list, { nameKey: 'name', valueKey: 'value' });
            if (titles.length > 0) {
                const factoryData = {
                    titles,
                    values: [{ data: values, name: "产地销售量排名" }]
                };
                newDataSet['产地销售量排名'] = factoryData;
                newDataSet['cpm46a6db0a-dae1-42f4-a476-e5be47b52121'] = factoryData;
                console.log('[CustomData] Prepared 产地销售量排名 (from visualData):', JSON.stringify(factoryData));
            }
        }

        // 2.2 销地采购量排名（仅保留有数据；若接口以后提供代码可同样用映射 + 数字）
        if (visualData.countyNameRank && visualData.countyTradeVolumeRank) {
            let titles = visualData.countyNameRank;
            let values = visualData.countyTradeVolumeRank.map(v => parseFloat(v));
            const len = Math.min(titles.length, values.length);
            const withData = [];
            for (let i = 0; i < len; i++) {
                const v = values[i];
                if (v != null && !isNaN(v) && v > 0) withData.push({ name: titles[i], value: v });
            }
            withData.sort((a, b) => b.value - a.value);
            const outTitles = withData.map(p => p.name);
            const outValues = withData.map(p => p.value);
            if (outTitles.length > 0) {
                const purchaseData = {
                    titles: outTitles,
                    values: [{ data: outValues, name: "销地采购量排名" }]
                };
                newDataSet['销地采购量排名'] = purchaseData;
                newDataSet['cpm392223cb-81f8-4803-8377-3d3661ebf467'] = purchaseData;
                console.log('[CustomData] Prepared 销地采购量排名:', JSON.stringify(purchaseData));
            }
        }

        // 3. 堆叠折线图 (activityData)
        if (rawResults.activityData) {
            const { xList, yList } = rawResults.activityData;
            const lineData = {
                titles: xList || [],
                values: [{ data: yList || [], name: "销量1" }]
            };
            newDataSet['堆叠折线图'] = lineData;
            newDataSet['cpme9af1839-ea89-4c7d-8163-afb4bdbe0c5f'] = lineData;
        }

        // 4. 异常交易数据 (abnormalData) - 使用 abnormal 接口数据
        if (rawResults.abnormalData) {
            const rawList = rawResults.abnormalData;
            
            if (Array.isArray(rawList)) {
                let body = rawList.map(item => [
                    item.businessDate,
                    item.producAdd,
                    item.sellAdd,
                    parseFloat(item.businessPrice).toFixed(2) + '元/公斤'
                ]);
                
                const abnormalData = {
                    body: body,
                    header: ["交易时间", "货源省份", "流向地区", "交易单价"]
                };
                
                newDataSet['异常交易数据'] = abnormalData;
                newDataSet['cpm817f187b-80cb-47eb-b250-a6a559a3cc8d'] = abnormalData;
                console.log('[CustomData] Prepared 异常交易数据 (Rows):', body.length);
                console.log('[CustomData] Prepared 异常交易数据 (Content):', JSON.stringify(abnormalData, null, 2));
            } else {
                console.error('[CustomData] abnormalData is not an array:', rawList);
            }
        }

        if (Object.keys(newDataSet).length > 0) {
            // 合并到 window._DS_DATA.dataSet
            Object.assign(window._DS_DATA.dataSet, newDataSet);
            console.log('[CustomData] Data updated successfully. Keys:', Object.keys(newDataSet));
            
            // 强制更新 Hack
            try {
                 window._DS_DATA.dataSet = JSON.parse(JSON.stringify(window._DS_DATA.dataSet));
            } catch(e) {}
        } else {
            console.warn('[CustomData] No data prepared to update!');
        }
    } catch (error) {
        console.error('[CustomData] Global Error:', error);
    }
}

// 立即调用一次
setTimeout(getData, 1000); // 延迟 1000ms 确保页面加载

// 定时轮询 (每10秒)
setInterval(getData, 10000);
