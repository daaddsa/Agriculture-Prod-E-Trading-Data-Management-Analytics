
window._DS_DATA = {
    enable: true, // 是否开启数据自定义
    dataSet: {} // 数据集: 大屏中每个组件的数据，key为编辑器中设置的数据集名称，value为组件数据必须和编辑器中静态数据格式一致
}
// window._DS_DATA.dataSet对象里的数据发生变化时，会自动触发大屏数据更新
// 数据集名称请在编辑器中设置

// 这里自定义你的数据更新逻辑，window._DS_DATA.dataSet 里的数据发生改变时，页面上会自动触发数据更新

const DS_VISUAL_READY_ATTR = 'data-ds-visual-ready';
const DS_RANK_READY_ATTR = 'data-ds-rank-ready';
const DS_FACTORY_READY_ATTR = 'data-ds-factory-ready';
const DS_ABNORMAL_READY_ATTR = 'data-ds-abnormal-ready';
const DS_PENDING_STYLE_ID = 'ds-pending-visual-style';
const DS_MARKET_STORAGE_KEY = 'ds-screen-market-id';
const DS_MARKET_STORAGE_KEY_PERSIST = 'ds-screen-market-id-persist';
const DS_PROVINCE_MAP_COMPONENT_KEY = 'cpmbd3a7549-e208-42e1-a158-fa080262956e';
const DS_PROVINCE_HIGHLIGHT_FILL_FALLBACK = 9.49;
const DS_PENDING_HIDE_IDS = [
    'cpm8672efb1-ee30-4e48-acf8-23f0f26a7c29',
    'cpme55a84fd-cf3a-483b-adf8-301d6a611f22',
    'cpm14289986-335c-4e4f-a0c9-37f4cf6a82c0',
    'cpm8cbbc08a-cc47-42e5-b0c7-1c22b090f14a',
    'cpm18e89d42-8641-40e8-8884-db5ce5da24dc',
    'cpm9ce068f3-90b3-4556-a306-58c47635d1a2'
];
const DS_PENDING_HIDE_RANK_IDS = [
    'cpm46a6db0a-dae1-42f4-a476-e5be47b52121',
    'cpm392223cb-81f8-4803-8377-3d3661ebf467',
    'cpm17b89f9f-94ab-436f-acd1-12ea189ace09',
    'cpme7612333-ba11-4dc7-8cb8-e82dfb629692'
];
const DS_PENDING_HIDE_FACTORY_IDS = [
    'cpm5znQAaRPBgPONPpN0ce87',
    'cpmf3591fa9-ff54-48f7-bdd4-7d3bf5fab755',
    'cpmdf32aab5-1afb-455c-ac76-848a0b6fb189'
];
const DS_PENDING_HIDE_ABNORMAL_IDS = [
    'cpm817f187b-80cb-47eb-b250-a6a559a3cc8d',
    'cpmfaf24b6b-642d-4c12-80a3-f3f1009eb5d5'
];

function getProvinceHighlightFillValue() {
    try {
        const v = DS_CONFIG?.[DS_PROVINCE_MAP_COMPONENT_KEY]?.option?.config?.highlightFillValue;
        const n = Number(v);
        return Number.isFinite(n) ? n : DS_PROVINCE_HIGHLIGHT_FILL_FALLBACK;
    } catch (e) {
        return DS_PROVINCE_HIGHLIGHT_FILL_FALLBACK;
    }
}

function ensurePendingVisualStyle() {
    if (document.getElementById(DS_PENDING_STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = DS_PENDING_STYLE_ID;
    const visSel = DS_PENDING_HIDE_IDS.map(id => 'html:not([' + DS_VISUAL_READY_ATTR + '="1"]) [id="' + id + '"]').join(',\n');
    const rankSel = DS_PENDING_HIDE_RANK_IDS.map(id => 'html:not([' + DS_RANK_READY_ATTR + '="1"]) [id="' + id + '"]').join(',\n');
    const factorySel = DS_PENDING_HIDE_FACTORY_IDS.map(id => 'html:not([' + DS_FACTORY_READY_ATTR + '="1"]) [id="' + id + '"]').join(',\n');
    const abnormalSel = DS_PENDING_HIDE_ABNORMAL_IDS.map(id => 'html:not([' + DS_ABNORMAL_READY_ATTR + '="1"]) [id="' + id + '"]').join(',\n');
    s.textContent = [
        visSel + ' { visibility: hidden !important; }',
        rankSel + ' { visibility: hidden !important; }',
        factorySel + ' { visibility: hidden !important; }',
        abnormalSel + ' { visibility: hidden !important; }'
    ].join('\n');
    document.head.appendChild(s);
}

function setAttrFlag(attr, ready) {
    if (ready) document.documentElement.setAttribute(attr, '1');
    else document.documentElement.removeAttribute(attr);
}

ensurePendingVisualStyle();
setAttrFlag(DS_VISUAL_READY_ATTR, false);
setAttrFlag(DS_RANK_READY_ATTR, false);
setAttrFlag(DS_FACTORY_READY_ATTR, false);
setAttrFlag(DS_ABNORMAL_READY_ATTR, false);

async function getData() {
    // 优先读取 URL 中的 marketId 并写入 sessionStorage，随后清理地址栏参数
    const marketId = _getCurrentMarketId();
    
    console.log(`[CustomData] Starting update... MarketID: ${marketId}`);

    // 通过 shared/api/modules/screen.js 提供的 screenApi 统一调用接口
    const apiCalls = {
        visualData:        screenApi.getVisualData(marketId),
        tradeDataProvinces: screenApi.getTradeDataProvinces(marketId),
        abnormalData:      screenApi.getAbnormalData(marketId),
        activityData:      screenApi.getActivityData(marketId),
        tradeMarketData:   screenApi.getTradeMarkets(),
    };

    try {
        // 并发请求，任一失败不影响其他
        const entries = Object.entries(apiCalls);
        const settled = await Promise.allSettled(entries.map(([, p]) => p));

        // 映射结果
        const rawResults = {};
        entries.forEach(([key], i) => {
            if (settled[i].status === 'fulfilled') {
                rawResults[key] = settled[i].value;
                console.log(`[CustomData] Fetched ${key} OK`);
            } else {
                console.error(`[CustomData] Error ${key}:`, settled[i].reason);
            }
        });

        const hasVisualData = Object.prototype.hasOwnProperty.call(rawResults, 'visualData');
        const hasAbnormalData = Object.prototype.hasOwnProperty.call(rawResults, 'abnormalData');

        const visualData = rawResults.visualData;
        setAttrFlag(DS_VISUAL_READY_ATTR, hasVisualData);
        setAttrFlag(DS_RANK_READY_ATTR, hasVisualData);
        setAttrFlag(DS_FACTORY_READY_ATTR, !!(hasVisualData && visualData && Object.prototype.hasOwnProperty.call(visualData, 'tradeFactoryPrices')));
        setAttrFlag(DS_ABNORMAL_READY_ATTR, hasAbnormalData);

        // 更新数据集
        const newDataSet = {};

        // 1. 商品销售排行 (visualData) -> 商品表
        // 先重置所有核心指标为 0（防止切换市场时旧数据缓存残留）
        newDataSet['交易总量'] = 0;
        newDataSet['交易金额'] = 0;
        newDataSet['交易均价'] = 0;
        newDataSet['交易均价(不含异常)'] = 0;
        newDataSet['货源企业数量'] = 0;
        newDataSet['采购商数量'] = 0;

        if (rawResults.visualData) {
            const visualData = rawResults.visualData;
            console.log('[CustomData] visualData fields:', Object.keys(visualData));

            // --- 核心指标集成 ---
            if (visualData.businessSum != null) {
                newDataSet['交易总量'] = parseFloat(visualData.businessSum);
            }
            if (visualData.totalSum != null) {
                newDataSet['交易金额'] = parseFloat(visualData.totalSum);
            }
            if (visualData.average != null) {
                newDataSet['交易均价'] = parseFloat(visualData.average);
            }
            if (visualData.averageNoCheck != null) {
                newDataSet['交易均价(不含异常)'] = parseFloat(visualData.averageNoCheck);
            }
            if (visualData.abattoirNum != null) {
                newDataSet['货源企业数量'] = parseInt(visualData.abattoirNum);
            }
            if (visualData.purchaserNum != null) {
                newDataSet['采购商数量'] = parseInt(visualData.purchaserNum);
            }
            console.log('[CustomData] 核心指标:', {
                交易总量: newDataSet['交易总量'],
                交易金额: newDataSet['交易金额'],
                交易均价: newDataSet['交易均价'],
                货源企业数量: newDataSet['货源企业数量'],
                采购商数量: newDataSet['采购商数量']
            });
        }

        if (rawResults.visualData && rawResults.visualData.tradeFactoryPrices) {
            const rawList = rawResults.visualData.tradeFactoryPrices;
            const flatItems = rawList.map(item => [item.nameProv, item.factoryPrice]);
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

            // 提取屠宰场出厂价日期（取第一条数据的 factoryPriceDate）
            if (rawList.length > 0 && rawList[0].factoryPriceDate) {
                window._DS_FACTORY_PRICE_DATE = rawList[0].factoryPriceDate;
            }
        }

        // 2. 产地销售量排名 & 销地采购量排名 (visualData)
        // 使用 visualData 接口中的 provinceNameRank 和 countyNameRank 字段
        if (rawResults.visualData) {
            const visualData = rawResults.visualData;

            // 2.1 产地销售量排名
            if (visualData.provinceNameRank && visualData.provinceTradeVolumeRank) {
                let titles = visualData.provinceNameRank;
                // CRITICAL FIX: Convert string numbers to float
                let values = visualData.provinceTradeVolumeRank.map(v => parseFloat(v));

                // 校验长度
                const len = Math.min(titles.length, values.length);
                if (len < titles.length) titles = titles.slice(0, len);
                if (len < values.length) values = values.slice(0, len);

                // REVERSE ORDER: Display highest value at the top (Index 4) instead of bottom (Index 0)
                titles.reverse();
                values.reverse();

                const factoryData = {
                    titles: titles.map(t => truncateRightKeepHead(t, RANK_LABEL_MAX_UNITS)),
                    values: [{ data: values, name: "产地销售量排名" }]
                };
                newDataSet['产地销售量排名'] = factoryData;
                newDataSet['cpm46a6db0a-dae1-42f4-a476-e5be47b52121'] = factoryData;
                console.log('[CustomData] Prepared 产地销售量排名:', JSON.stringify(factoryData));
            }

            // 2.2 销地采购量排名
            if (visualData.countyNameRank && visualData.countyTradeVolumeRank) {
                let titles = visualData.countyNameRank;
                // CRITICAL FIX: Convert string numbers to float
                let values = visualData.countyTradeVolumeRank.map(v => parseFloat(v));

                // 校验长度
                const len = Math.min(titles.length, values.length);
                if (len < titles.length) titles = titles.slice(0, len);
                if (len < values.length) values = values.slice(0, len);

                // REVERSE ORDER: Display highest value at the top
                titles.reverse();
                values.reverse();

                const purchaseData = {
                    titles: titles.map(t => truncateRightKeepHead(t, RANK_LABEL_MAX_UNITS)),
                    values: [{ data: values, name: "销地采购量排名" }]
                };
                newDataSet['销地采购量排名'] = purchaseData;
                newDataSet['cpm392223cb-81f8-4803-8377-3d3661ebf467'] = purchaseData;
                console.log('[CustomData] Prepared 销地采购量排名:', JSON.stringify(purchaseData));
            }
        }

        // 3. 堆叠折线图 (activityData)
        if (rawResults.activityData) {
            const { xList, yList } = rawResults.activityData;
            const titles = (xList || []).map(v => {
                const s = String(v || '').trim();
                const p = s.split(' ');
                if (p.length < 2) return s;
                const d = p[0];
                const t = p[1];
                const mmdd = d.length >= 10 ? d.slice(5, 10) : d;
                const hhmm = t.length >= 5 ? t.slice(0, 5) : t;
                return mmdd + ' ' + hhmm;
            });
            const lineData = {
                titles: titles,
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
                
                // 列宽总和需 ≤ 表格组件宽度 560px，否则最后一列「交易单价」会被挤出看不见
                const abnormalData = {
                    body: body,
                    header: ["交易时间", "货源省份", "流向地区", "交易单价"],
                    columnWidth: [190, 100, 100, 170]
                };
                
                newDataSet['异常交易数据'] = abnormalData;
                newDataSet['cpm817f187b-80cb-47eb-b250-a6a559a3cc8d'] = abnormalData;
                console.log('[CustomData] Prepared 异常交易数据 (Rows):', body.length);
                console.log('[CustomData] Prepared 异常交易数据 (Content):', JSON.stringify(abnormalData, null, 2));
            } else {
                console.error('[CustomData] abnormalData is not an array:', rawList);
            }
        }

        // 5. 省份均价数据地图数据 (tradeDataProvinces) - 用于地图省份名称+数据标签显示
        if (rawResults.tradeDataProvinces) {
            const raw = rawResults.tradeDataProvinces;
            console.log('[CustomData] tradeDataProvinces raw:', JSON.stringify(raw).substring(0, 500));
            
            // 存储原始省份数据供地图 tooltip 使用
            window._DS_PROVINCE_RAW_DATA = raw;
            
            let provinceMapData = [];
            
            // 省份全称 → 地图简称 的转换函数
            // 例: "安徽省"→"安徽", "广西壮族自治区"→"广西", "新疆维吾尔自治区"→"新疆"
            const toShortName = (fullName) => {
                return fullName
                    .replace(/壮族自治区|维吾尔自治区|回族自治区|自治区|特别行政区|省|市$/, '')
                    .trim();
            };

            try {
                if (!Array.isArray(raw) && typeof raw === 'object') {
                    // 当前接口格式: {"编码-省份全称": {enterpriseNum, abnormalNum, yesterdayAverage, currentAverage}, ...}
                    // 例: {"340000-安徽省": {"currentAverage": "27.97", ...}, ...}
                    const keys = Object.keys(raw);
                    const looksLikeProvinceMap = keys.length > 0 && keys.some(k => k.includes('-'));
                    
                    if (looksLikeProvinceMap) {
                        for (const [key, info] of Object.entries(raw)) {
                            const fullName = key.split('-').slice(1).join('-'); // "340000-安徽省" → "安徽省"
                            const shortName = toShortName(fullName);
                            const value = parseFloat(info.currentAverage || 0);
                            if (shortName) {
                                provinceMapData.push({ name: shortName, value: value });
                            }
                        }
                    } else if (raw.provinces && raw.volumes) {
                        // 格式B: {provinces: ["北京",...], volumes: [590,...]}
                        const names = raw.provinces;
                        const values = raw.volumes;
                        const len = Math.min(names.length, values.length);
                        for (let i = 0; i < len; i++) {
                            provinceMapData.push({ name: names[i], value: parseFloat(values[i] || 0) });
                        }
                    } else if (raw.provinceNames && raw.tradeVolumes) {
                        // 格式C: {provinceNames: ["北京",...], tradeVolumes: [590,...]}
                        const names = raw.provinceNames;
                        const values = raw.tradeVolumes;
                        const len = Math.min(names.length, values.length);
                        for (let i = 0; i < len; i++) {
                            provinceMapData.push({ name: names[i], value: parseFloat(values[i] || 0) });
                        }
                    } else {
                        console.warn('[CustomData] tradeDataProvinces: 未识别的对象格式，请检查接口返回:', keys);
                    }
                } else if (Array.isArray(raw)) {
                    // 格式A: [{provinceName/name: "北京", tradeVolume/value: 590}, ...]
                    provinceMapData = raw.map(item => ({
                        name: item.provinceName || item.name || item.province || '',
                        value: parseFloat(item.tradeVolume || item.value || item.volume || item.count || 0)
                    })).filter(item => item.name);
                } else {
                    console.warn('[CustomData] tradeDataProvinces: 未识别的数据格式，类型:', typeof raw);
                }
            } catch (e) {
                console.error('[CustomData] tradeDataProvinces transform error:', e);
            }

            if (provinceMapData.length > 0) {
                // 将 NaN 的 value 替换为 0（避免地图显示异常颜色）
                provinceMapData = provinceMapData.map(item => ({
                    name: item.name,
                    value: isNaN(item.value) ? 0 : item.value
                }));
                
                // 补全所有省份：API 未返回的省份 value 设为 0，特定省份设为 4.38 以显示底色
                const allProvinces = [
                    '北京', '天津', '上海', '重庆', '河北', '河南', '云南', '辽宁',
                    '黑龙江', '湖南', '安徽', '山东', '新疆', '江苏', '浙江', '江西',
                    '湖北', '广西', '甘肃', '山西', '内蒙古', '陕西', '吉林', '福建',
                    '贵州', '广东', '青海', '西藏', '四川', '宁夏', '海南', '台湾',
                    '香港', '澳门'
                ];
                
                // 需要高亮显示底色的省份列表
                const highlightProvinces = [
                    '河南', '山东', '河北', '天津', '北京', '湖北', '辽宁', '吉林',
                    '黑龙江', '湖南', '四川', '广东', '浙江', '福建', '安徽', '江苏'
                ];

                const highlightFillValue = getProvinceHighlightFillValue();
                const existingNames = new Set(provinceMapData.map(item => item.name));
                allProvinces.forEach(name => {
                    if (!existingNames.has(name)) {
                        // 如果是需要高亮的省份，设置特定值 9.49；否则设为 0
                        const defaultVal = highlightProvinces.includes(name) ? highlightFillValue : 0;
                        provinceMapData.push({ name: name, value: defaultVal });
                    }
                });
                
                // 更新地图组件（内层+外层统一 dataSetName: "省份均价数据"）
                newDataSet['省份均价数据'] = provinceMapData;
                newDataSet['cpmbd3a7549-e208-42e1-a158-fa080262956e'] = provinceMapData;
                
                console.log('[CustomData] Prepared 省份均价数据 (地图):', provinceMapData.length, '个省份');
                console.log('[CustomData] 省份均价数据 sample:', JSON.stringify(provinceMapData.slice(0, 3)));
            }
        }

        // 6. 交易市场数据 - 更新下拉框显示当前市场名称 + 补充名称映射
        if (rawResults.tradeMarketData) {
            const markets = normalizeMarketList(rawResults.tradeMarketData);
            window._DS_MARKET_LIST = markets;
            console.log('[CustomData] 市场列表:', markets.map(m => m.marketId + '-' + m.marketName));
            _applyMarketDropdownState(markets);
            
            // 将 API 返回的市场名称补充到映射表中
            markets.forEach(m => {
                MARKET_NAME_MAP[m.marketName] = m.marketId;
            });
            
            // 把 API 市场列表注入框架 selectLink 组件配置，让原生下拉框自动更新
            syncFrameworkSelectOptions(markets);

            // 根据当前 marketId 更新下拉框显示文本
            const currentMarket = markets.find(m => String(m.marketId) === String(marketId));
            if (currentMarket) {
                updateMarketDropdownText(currentMarket.marketName);
            }
            // refreshMarketDropdownMenu(marketId);
        }

        if (Object.keys(newDataSet).length > 0) {
            // 合并到 window._DS_DATA.dataSet
            Object.assign(window._DS_DATA.dataSet, newDataSet);
            console.log('[CustomData] Data updated successfully. Keys:', Object.keys(newDataSet));
            
            // 强制更新 Hack
            try {
                 window._DS_DATA.dataSet = JSON.parse(JSON.stringify(window._DS_DATA.dataSet));
            } catch(e) {}

            // 数据更新后，延迟注入单位文本
            setTimeout(injectUnits, 200);
        
        // 如果左侧6项仍为 0 或非数值，则自动启用演示
        try {
            const ds = window._DS_DATA.dataSet || {};
            const leftVals = UNIT_LABELS.map(u => Number(unwrapDataSetValue(ds[u.dataSetName])));
            const allZeroOrNaN = leftVals.length > 0 && leftVals.every(v => !Number.isFinite(v) || v === 0);
            if (allZeroOrNaN) startLeftFlipDemoOnce();
        } catch(e){}
        } else {
            console.warn('[CustomData] No data prepared to update!');
            startLeftFlipDemoOnce();
        }
    } catch (error) {
        console.error('[CustomData] Global Error:', error);
    }
}

let _leftFlipDemoTimer = null;
function startLeftFlipDemoOnce() {
    if (_leftFlipDemoTimer) return;
    if (!LEFT_METRIC_FLIP_ENABLED) return;
    const dataSet = window._DS_DATA && window._DS_DATA.dataSet;
    if (!dataSet) return;
    setAttrFlag(DS_VISUAL_READY_ATTR, true);
    const seeds = {};
    UNIT_LABELS.forEach(({ dataSetName }) => {
        const base = Math.floor(1000 + Math.random() * 9000);
        seeds[dataSetName] = base;
        dataSet[dataSetName] = base;
    });
    try { window._DS_DATA.dataSet = JSON.parse(JSON.stringify(window._DS_DATA.dataSet)); } catch(e){}
    _leftFlipDemoTimer = setInterval(() => {
        UNIT_LABELS.forEach(({ dataSetName }) => {
            const delta = Math.floor((Math.random() * 200 - 100));
            seeds[dataSetName] = Math.max(0, seeds[dataSetName] + delta);
            dataSet[dataSetName] = seeds[dataSetName];
        });
        try { window._DS_DATA.dataSet = JSON.parse(JSON.stringify(window._DS_DATA.dataSet)); } catch(e){}
        setTimeout(injectUnits, 50);
    }, 1500);
    console.log('[CustomData] Left flip demo started');
}

// =====================================================
// 市场下拉框：名称同步 + 切换跳转
// 1. 更新下拉框显示文本为当前市场名称
// 2. 拦截下拉选项点击，使用 window.location.href 强制跳转
//    （绕过 selectLink 组件的 SPA 内部路由，确保页面真正刷新）
// =====================================================
const SELECT_COMPONENT_ID = 'cpme41cb160-0568-4114-90c8-c847a9d8aa0b';

// 市场名称 → marketId 映射（静态兜底 + 动态API补充）
const MARKET_NAME_MAP = {};

// =====================================================
// 将 API 返回的市场列表注入到框架 selectLink 组件的 config 中，
// 让框架原生下拉框自动显示 API 返回的市场名称（而非写死的静态选项）
// =====================================================
let _frameworkSelectSyncVersion = 0;
let _marketSelectObserver = null;
let _marketSelectObserverTimer = null;
let _marketSelectObservedEl = null;
let _marketDomSyncObserver = null;
let _marketDomSyncTimer = null;
let _marketDomSyncInterval = null;
let _marketDomSyncStopTimer = null;
let _frameworkSelectMountObserver = null;
let _frameworkSelectMountStopTimer = null;
let _marketDropdownEnabled = true;

function _getCurrentMarketId() {
    const urlParams = new URLSearchParams(window.location.search);
    const urlMarketId = String(urlParams.get('marketId') || '').trim();
    if (urlMarketId) {
        _persistMarketId(urlMarketId);
        _hideMarketIdFromAddressBar();
        return urlMarketId;
    }
    try {
        const storedMarketId = String(sessionStorage.getItem(DS_MARKET_STORAGE_KEY) || '').trim();
        if (storedMarketId) return storedMarketId;
    } catch (e) {}
    try {
        const persistedMarketId = String(localStorage.getItem(DS_MARKET_STORAGE_KEY_PERSIST) || '').trim();
        if (persistedMarketId) return persistedMarketId;
    } catch (e) {}
    return '1';
}

function _persistMarketId(marketId) {
    const normalizedId = String(marketId || '').trim();
    if (!normalizedId) return;
    try {
        sessionStorage.setItem(DS_MARKET_STORAGE_KEY, normalizedId);
    } catch (e) {}
    try {
        localStorage.setItem(DS_MARKET_STORAGE_KEY_PERSIST, normalizedId);
    } catch (e) {}
}

function _hideMarketIdFromAddressBar() {
    try {
        const url = new URL(window.location.href);
        if (!url.searchParams.has('marketId')) return;
        url.searchParams.delete('marketId');
        const nextUrl = url.pathname + (url.search ? url.search : '') + (url.hash || '');
        window.history.replaceState(window.history.state, document.title, nextUrl);
    } catch (e) {}
}

function _buildHiddenMarketUrl(targetPath, marketId) {
    const normalizedId = String(marketId || '').trim() || '1';
    _persistMarketId(normalizedId);
    const nextUrl = new URL(targetPath, window.location.href);
    const currentParams = new URLSearchParams(window.location.search);
    currentParams.delete('marketId');
    currentParams.forEach((value, key) => {
        if (!nextUrl.searchParams.has(key)) nextUrl.searchParams.set(key, value);
    });
    nextUrl.searchParams.delete('marketId');
    return nextUrl.pathname + (nextUrl.search ? nextUrl.search : '') + (nextUrl.hash || '');
}

function _shouldEnableMarketDropdown(markets) {
    return normalizeMarketList(markets).length > 1;
}

function _sortMarketList(a, b) {
    const aNum = Number(a.marketId);
    const bNum = Number(b.marketId);
    const aIsNum = Number.isFinite(aNum);
    const bIsNum = Number.isFinite(bNum);
    if (aIsNum && bIsNum) return aNum - bNum;
    return String(a.marketId).localeCompare(String(b.marketId), 'zh-CN');
}

function normalizeMarketList(markets) {
    if (!Array.isArray(markets)) return [];
    const map = new Map();
    markets.forEach(item => {
        const marketId = String(item && item.marketId != null ? item.marketId : '').trim();
        const marketName = String(item && item.marketName != null ? item.marketName : '').replace(/\s+/g, ' ').trim();
        if (!marketId || !marketName) return;
        if (!map.has(marketId)) {
            map.set(marketId, { marketId, marketName });
        }
    });
    return Array.from(map.values()).sort(_sortMarketList);
}

function _buildFrameworkSelectOptions(markets) {
    return markets.map(m => {
        const link = '?marketId=' + m.marketId;
        return {
            label: m.marketName,
            text: m.marketName,
            name: m.marketName,
            value: link,
            path: link,
            url: link,
            isLocal: true
        };
    });
}

function _replaceArrayContents(target, nextItems) {
    if (!Array.isArray(target)) return false;
    target.length = 0;
    nextItems.forEach(item => target.push(Object.assign({}, item)));
    return true;
}

function _setTextLikeValue(el, text) {
    if (!el || !text) return;
    if (el.getAttribute && el.getAttribute('data-ds-market-name') === text) return;
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'OPTION') {
        if (el.value !== text) el.value = text;
        el.setAttribute('value', text);
    }
    if (typeof el.textContent === 'string' && el.textContent.trim() !== text) {
        el.textContent = text;
    }
    el.setAttribute('title', text);
    el.setAttribute('aria-label', text);
    el.setAttribute('data-ds-market-name', text);
}

function _extractMarketIdFromLinkValue(raw) {
    const text = String(raw || '').trim();
    if (!text) return '';
    const match = text.match(/[?&]marketId=([^&#]+)/i);
    return match ? String(match[1]).trim() : '';
}

function _syncFrameworkSelectSerializedConfig() {
    try {
        if (window.DS_DATA) {
            window.DS_DATA.config = JSON.stringify(DS_CONFIG);
        }
    } catch (e) {}
}

function _setFrameworkSelectText(target, text) {
    if (!target || !text) return;
    if (target.style) target.style.text = text;
    if (target.config && target.config.style) target.config.style.text = text;
    if (target.option && target.option.style) target.option.style.text = text;
    if (target.$data) {
        if (typeof target.$data.text === 'string' || typeof target.$data.text === 'undefined') target.$data.text = text;
        if (target.$data.config && target.$data.config.style) target.$data.config.style.text = text;
    }
}

function _setFrameworkSelectOptions(target, options) {
    if (!target || !options) return;
    if (target.style && Array.isArray(target.style.options)) _replaceArrayContents(target.style.options, options);
    if (target.config && target.config.style && Array.isArray(target.config.style.options)) _replaceArrayContents(target.config.style.options, options);
    if (target.option && target.option.style && Array.isArray(target.option.style.options)) _replaceArrayContents(target.option.style.options, options);
    if (target.$data) {
        if (Array.isArray(target.$data.options)) target.$data.options = options.map(item => Object.assign({}, item));
        if (target.$data.config && target.$data.config.style && Array.isArray(target.$data.config.style.options)) {
            _replaceArrayContents(target.$data.config.style.options, options);
        }
    }
}

function _walkForVueInstance(node) {
    if (!node) return null;
    if (node.__vue__) return node.__vue__;
    for (let i = 0; i < (node.children || []).length; i++) {
        const vm = _walkForVueInstance(node.children[i]);
        if (vm) return vm;
    }
    return null;
}

function _getCurrentMarketNameFromList(markets) {
    const currentId = _getCurrentMarketId();
    const current = markets.find(m => String(m.marketId) === currentId);
    return current ? current.marketName : '';
}

function _syncRenderedMarketLabelsFromCache() {
    const markets = normalizeMarketList(window._DS_MARKET_LIST || []);
    if (!markets.length) return;
    _syncFrameworkSelectDomOptions(null, markets, _getCurrentMarketNameFromList(markets));
}

function _ensureMarketDomSyncObserver() {
    if (!document || !document.body) return;
    if (_marketDomSyncObserver) return;
    _marketDomSyncObserver = new MutationObserver(function () {
        clearTimeout(_marketDomSyncTimer);
        _marketDomSyncTimer = setTimeout(_syncRenderedMarketLabelsFromCache, 50);
    });
    _marketDomSyncObserver.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['href', 'value', 'data-value', 'data-path', 'data-url', 'title', 'aria-label']
    });
}

function _scheduleMarketDomSyncRetries() {
    clearInterval(_marketDomSyncInterval);
    clearTimeout(_marketDomSyncStopTimer);
    _marketDomSyncInterval = setInterval(_syncRenderedMarketLabelsFromCache, 300);
    _marketDomSyncStopTimer = setTimeout(function () {
        clearInterval(_marketDomSyncInterval);
        _marketDomSyncInterval = null;
    }, 10000);
}

function _setMarketDropdownDomDisabledState(wrap, disabled) {
    if (!wrap) return;
    wrap.setAttribute('aria-disabled', disabled ? 'true' : 'false');
    wrap.setAttribute('data-ds-market-dropdown-disabled', disabled ? '1' : '0');

    if (disabled) {
        wrap.setAttribute('tabindex', '-1');
    } else if (wrap.getAttribute('tabindex') === '-1') {
        wrap.removeAttribute('tabindex');
    }

    const interactiveEls = wrap.querySelectorAll('input, textarea, select, button, option, [role="button"], [role="option"], [tabindex]');
    interactiveEls.forEach(function (el) {
        if (disabled) {
            el.setAttribute('aria-disabled', 'true');
            if (typeof el.disabled === 'boolean') el.disabled = true;
            if (el.hasAttribute('tabindex')) {
                el.setAttribute('data-ds-prev-tabindex', el.getAttribute('tabindex') || '');
            }
            el.setAttribute('tabindex', '-1');
        } else {
            el.setAttribute('aria-disabled', 'false');
            if (typeof el.disabled === 'boolean') el.disabled = false;
            if (el.hasAttribute('data-ds-prev-tabindex')) {
                const prevTabindex = el.getAttribute('data-ds-prev-tabindex');
                if (prevTabindex === '') el.removeAttribute('tabindex');
                else el.setAttribute('tabindex', prevTabindex);
                el.removeAttribute('data-ds-prev-tabindex');
            } else if (el.getAttribute('tabindex') === '-1') {
                el.removeAttribute('tabindex');
            }
        }
    });
}

function _applyMarketDropdownState(markets) {
    const normalizedMarkets = normalizeMarketList(markets);
    _marketDropdownEnabled = _shouldEnableMarketDropdown(normalizedMarkets);
    const wrap = document.getElementById(SELECT_COMPONENT_ID);
    if (!wrap) return;
    wrap.setAttribute('data-ds-market-dropdown-enabled', _marketDropdownEnabled ? '1' : '0');
    wrap.setAttribute('data-ds-market-count', String(normalizedMarkets.length));
    _setMarketDropdownDomDisabledState(wrap, !_marketDropdownEnabled);
    if (!_marketDropdownEnabled) _closeMarketMenu();
}

function _syncFrameworkSelectDomOptions(wrap, markets, currentName) {
    if ((!wrap && !document) || !markets || !markets.length) return;

    const marketById = {};
    const allKnownNames = new Set(Object.keys(MARKET_NAME_MAP).concat(markets.map(m => m.marketName)));
    markets.forEach(m => {
        marketById[String(m.marketId)] = m.marketName;
    });

    const roots = [];
    if (wrap) roots.push(wrap);
    if (document && document.body && (!wrap || document.body !== wrap)) roots.push(document.body);

    const optionCandidates = [];
    roots.forEach(root => {
        Array.from(root.querySelectorAll('a[href*="marketId="], [href*="marketId="], option, li, [role="option"], [data-value], [data-path], [data-url], .option, .options *'))
            .forEach(el => {
                if (optionCandidates.indexOf(el) === -1) optionCandidates.push(el);
            });
    });
    optionCandidates.forEach(el => {
        const attrs = [
            el.getAttribute && el.getAttribute('href'),
            el.getAttribute && el.getAttribute('value'),
            el.getAttribute && el.getAttribute('data-value'),
            el.getAttribute && el.getAttribute('data-path'),
            el.getAttribute && el.getAttribute('data-url'),
            el.value
        ];
        let matchedName = '';
        for (const raw of attrs) {
            const marketId = _extractMarketIdFromLinkValue(raw);
            if (marketId && marketById[marketId]) {
                matchedName = marketById[marketId];
                break;
            }
        }
        if (!matchedName) return;
        _setTextLikeValue(el, matchedName);
    });

    const leafCandidates = [];
    roots.forEach(root => {
        Array.from(root.querySelectorAll('a, span, div, p, button, li, option'))
            .forEach(el => {
                if (leafCandidates.indexOf(el) === -1) leafCandidates.push(el);
            });
    });
    const normalizedLeafCandidates = leafCandidates.filter(el => el && el.isConnected && (!el.children || el.children.length === 0));
    const marketTextNodes = normalizedLeafCandidates.filter(el => {
        const txt = (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') ? String(el.value || '').trim() : String(el.textContent || '').trim();
        return txt && allKnownNames.has(txt);
    });

    if (marketTextNodes.length === markets.length) {
        marketTextNodes.forEach((el, index) => {
            if (markets[index]) _setTextLikeValue(el, markets[index].marketName);
        });
    } else if (marketTextNodes.length === markets.length + 1 && currentName) {
        _setTextLikeValue(marketTextNodes[0], currentName);
        marketTextNodes.slice(1).forEach((el, index) => {
            if (markets[index]) _setTextLikeValue(el, markets[index].marketName);
        });
    }
}

function _applyFrameworkSelectOptions(markets) {
    const normalizedMarkets = normalizeMarketList(markets);
    if (!normalizedMarkets.length) return false;

    const cfg = DS_CONFIG[SELECT_COMPONENT_ID];
    const currentName = _getCurrentMarketNameFromList(normalizedMarkets) || normalizedMarkets[0].marketName;
    const newOptions = _buildFrameworkSelectOptions(normalizedMarkets);

    if (cfg) {
        _setFrameworkSelectOptions(cfg, newOptions);
        _setFrameworkSelectText(cfg, currentName);
    }
    _syncFrameworkSelectSerializedConfig();
    _ensureMarketDomSyncObserver();

    const el = document.getElementById(SELECT_COMPONENT_ID);
    if (el) {
        const vm = _walkForVueInstance(el);
        if (vm) {
            _setFrameworkSelectOptions(vm, newOptions);
            _setFrameworkSelectText(vm, currentName);
            if (vm.$forceUpdate) vm.$forceUpdate();
        }
        _syncFrameworkSelectDomOptions(el, normalizedMarkets, currentName);
    }
    _applyMarketDropdownState(normalizedMarkets);
    _syncFrameworkSelectDomOptions(null, normalizedMarkets, currentName);
    _scheduleMarketDomSyncRetries();

    if (currentName) updateMarketDropdownText(currentName);
    return true;
}

function _scheduleFrameworkSelectMountSync(markets, syncVersion) {
    if (!document || !document.body) return;
    if (_frameworkSelectMountObserver) {
        _frameworkSelectMountObserver.disconnect();
        _frameworkSelectMountObserver = null;
    }
    clearTimeout(_frameworkSelectMountStopTimer);

    const normalizedMarkets = normalizeMarketList(markets);
    if (!normalizedMarkets.length) return;

    const tryApply = function () {
        if (syncVersion !== _frameworkSelectSyncVersion) return true;
        const wrap = document.getElementById(SELECT_COMPONENT_ID);
        const cfg = DS_CONFIG[SELECT_COMPONENT_ID];
        if (!wrap && !cfg) return false;
        _applyFrameworkSelectOptions(normalizedMarkets);
        _observeMarketSelectText();
        return true;
    };

    if (tryApply()) return;

    _frameworkSelectMountObserver = new MutationObserver(function () {
        if (!tryApply()) return;
        if (_frameworkSelectMountObserver) {
            _frameworkSelectMountObserver.disconnect();
            _frameworkSelectMountObserver = null;
        }
        clearTimeout(_frameworkSelectMountStopTimer);
    });
    _frameworkSelectMountObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
    _frameworkSelectMountStopTimer = setTimeout(function () {
        if (_frameworkSelectMountObserver) {
            _frameworkSelectMountObserver.disconnect();
            _frameworkSelectMountObserver = null;
        }
    }, 15000);
}

function _observeMarketSelectText() {
    const wrap = document.getElementById(SELECT_COMPONENT_ID);
    if (!wrap) return;
    if (_marketSelectObserver && _marketSelectObservedEl === wrap) return;
    if (_marketSelectObserver) {
        _marketSelectObserver.disconnect();
        _marketSelectObserver = null;
    }
    _marketSelectObservedEl = wrap;

    _marketSelectObserver = new MutationObserver(function () {
        clearTimeout(_marketSelectObserverTimer);
        _marketSelectObserverTimer = setTimeout(function () {
            const currentName = _getCurrentMarketNameFromList(normalizeMarketList(window._DS_MARKET_LIST || []));
            if (currentName) updateMarketDropdownText(currentName);
        }, 60);
    });
    _marketSelectObserver.observe(wrap, {
        childList: true,
        subtree: true,
        characterData: true
    });
}

function syncFrameworkSelectOptions(markets) {
    const normalizedMarkets = normalizeMarketList(markets);
    if (!normalizedMarkets.length) {
        console.warn('[CustomData] 未同步下拉框: API 市场列表为空或格式不合法');
        return;
    }

    const syncVersion = ++_frameworkSelectSyncVersion;
    const applySync = function () {
        if (syncVersion !== _frameworkSelectSyncVersion) return;
        _applyFrameworkSelectOptions(normalizedMarkets);
        _observeMarketSelectText();
    };

    applySync();
    [120, 500, 1200, 2500, 5000].forEach(delay => setTimeout(applySync, delay));
    _scheduleFrameworkSelectMountSync(normalizedMarkets, syncVersion);

    console.log('[CustomData] 框架下拉选项已同步 API 数据:', normalizedMarkets.map(m => m.marketName));
}

// =====================================================
let _cachedSelectValueEl = null;
let _lastMarketName = '';
let _dsMarketMenuEl = null;
let _dsMarketMenuOpen = false;

function _getMarketListForMenu() {
    const list = Array.isArray(window._DS_MARKET_LIST) ? window._DS_MARKET_LIST.slice() : [];
    if (list.length > 0) {
        list.sort((a, b) => Number(a.marketId) - Number(b.marketId));
        return list.map(m => ({ marketId: String(m.marketId), marketName: String(m.marketName || '').trim() })).filter(m => m.marketId && m.marketName);
    }
    const fallback = Object.keys(MARKET_NAME_MAP).map(name => ({ marketId: String(MARKET_NAME_MAP[name]), marketName: name }));
    fallback.sort((a, b) => Number(a.marketId) - Number(b.marketId));
    return fallback;
}

function _ensureMarketMenuEl() {
    if (_dsMarketMenuEl && _dsMarketMenuEl.isConnected) return _dsMarketMenuEl;
    const el = document.createElement('div');
    el.id = 'ds-market-menu';
    el.style.position = 'fixed';
    el.style.zIndex = '2147483647';
    el.style.background = 'rgba(31, 147, 255, 0.96)';
    el.style.border = '1px solid rgba(255, 255, 255, 0.2)';
    el.style.boxShadow = '0 10px 24px rgba(0,0,0,0.35)';
    el.style.display = 'none';
    el.style.maxHeight = '340px';
    el.style.overflow = 'auto';
    el.style.padding = '6px 0';
    el.style.minWidth = '240px';
    el.style.backdropFilter = 'blur(2px)';
    document.body.appendChild(el);
    _dsMarketMenuEl = el;
    return el;
}

function _renderMarketMenu(currentId) {
    const el = _ensureMarketMenuEl();
    const list = _getMarketListForMenu();
    el.innerHTML = '';
    list.forEach(m => {
        const item = document.createElement('div');
        item.setAttribute('data-market-id', m.marketId);
        item.setAttribute('data-market-name', m.marketName);
        item.textContent = m.marketName;
        item.style.padding = '10px 14px';
        item.style.cursor = 'pointer';
        item.style.whiteSpace = 'nowrap';
        item.style.overflow = 'hidden';
        item.style.textOverflow = 'ellipsis';
        item.style.color = 'rgba(255,255,255,1)';
        item.style.fontSize = '16px';
        item.style.lineHeight = '20px';
        item.style.borderBottom = '1px dotted rgba(255,255,255,0.2)';
        if (String(m.marketId) === String(currentId)) {
            item.style.background = 'rgba(0, 61, 174, 0.55)';
        }
        item.addEventListener('mouseenter', function () {
            item.style.background = String(m.marketId) === String(currentId) ? 'rgba(0, 61, 174, 0.65)' : 'rgba(0, 61, 174, 0.35)';
        });
        item.addEventListener('mouseleave', function () {
            item.style.background = String(m.marketId) === String(currentId) ? 'rgba(0, 61, 174, 0.55)' : 'transparent';
        });
        el.appendChild(item);
    });
    return el;
}

function _positionMarketMenu(anchorRect) {
    const el = _ensureMarketMenuEl();
    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
    const minW = Math.max(220, Math.round(anchorRect.width || 0));
    el.style.minWidth = minW + 'px';
    el.style.left = '0px';
    el.style.top = '0px';
    el.style.display = 'block';
    const mw = el.offsetWidth || minW;
    const mh = el.offsetHeight || 200;
    let left = Math.round(anchorRect.left);
    let top = Math.round(anchorRect.bottom + 2);
    left = Math.min(Math.max(6, left), Math.max(6, vw - mw - 6));
    if (top + mh > vh - 6) {
        const upTop = Math.round(anchorRect.top - mh - 2);
        if (upTop >= 6) top = upTop;
    }
    el.style.left = left + 'px';
    el.style.top = top + 'px';
}

function _openMarketMenu(currentId) {
    if (!_marketDropdownEnabled) return;
    const wrap = document.getElementById(SELECT_COMPONENT_ID);
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    _renderMarketMenu(currentId);
    _positionMarketMenu(rect);
    _dsMarketMenuOpen = true;
}

function _closeMarketMenu() {
    if (_dsMarketMenuEl) _dsMarketMenuEl.style.display = 'none';
    _dsMarketMenuOpen = false;
}

function refreshMarketDropdownMenu(currentId) {
    if (!_marketDropdownEnabled) {
        _closeMarketMenu();
        return;
    }
    if (!_dsMarketMenuOpen) return;
    const wrap = document.getElementById(SELECT_COMPONENT_ID);
    if (!wrap) return;
    _renderMarketMenu(currentId);
    _positionMarketMenu(wrap.getBoundingClientRect());
}


function updateMarketDropdownText(marketName) {
    const name = String(marketName || '').trim();
    if (!name) return;
    if (name === _lastMarketName && _cachedSelectValueEl && _cachedSelectValueEl.isConnected) return;

    const wrap = document.getElementById(SELECT_COMPONENT_ID);
    if (!wrap) return;

    const setText = function (el) {
        if (!el) return false;
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            if (el.value !== name) el.value = name;
            el.setAttribute('value', name);
        } else {
            if (el.textContent.trim() !== name) el.textContent = name;
        }
        el.setAttribute('title', name);
        _cachedSelectValueEl = el;
        _lastMarketName = name;
        return true;
    };

    if (_cachedSelectValueEl && _cachedSelectValueEl.isConnected && wrap.contains(_cachedSelectValueEl)) {
        if (setText(_cachedSelectValueEl)) return;
    }

    const isVisible = function (el) {
        if (!el || !el.isConnected) return false;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
        return el.offsetWidth > 0 || el.offsetHeight > 0;
    };

    const scoreCandidate = function (el) {
        let score = 0;
        const txt = (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') ? String(el.value || '').trim() : el.textContent.trim();
        const classText = [el.className, el.id, el.getAttribute('data-role'), el.getAttribute('name')].filter(Boolean).join(' ');
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') score += 100;
        if (/(value|text|label|selected|current|title|content|inner)/i.test(classText)) score += 40;
        if (txt === name) score += 80;
        if (MARKET_NAME_MAP[txt] != null) score += 60;
        if (!txt) score -= 10;
        if (txt && txt.length > 32) score -= 20;
        return score;
    };

    const candidates = Array.from(wrap.querySelectorAll('input, textarea, span, div, p, button'))
        .filter(el => isVisible(el))
        .sort((a, b) => scoreCandidate(b) - scoreCandidate(a));

    for (const el of candidates) {
        if (el.children && el.children.length > 0 && el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') continue;
        const txt = (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') ? String(el.value || '').trim() : el.textContent.trim();
        if (txt === name) {
            setText(el);
            return;
        }
        if (MARKET_NAME_MAP[txt] != null) {
            setText(el);
            return;
        }
        if (!txt && scoreCandidate(el) >= 40) {
            setText(el);
            return;
        }
    }

    if (candidates.length > 0) setText(candidates[0]);
}

function _killNativeSelectEvents() {
    // 保留框架原生下拉，这里不再拦截 selectLink 的原生事件。
}

function setupMarketSwitcher() {
    const urlParams = new URLSearchParams(window.location.search);
    const flipDemoParam = urlParams.get('flipdemo') || urlParams.get('demo');
    if (flipDemoParam === '1' || flipDemoParam === 'true') {
        try { startLeftFlipDemoOnce(); } catch(e){}
    }
    // 保留框架原生下拉，停用自定义菜单的 click/mousedown 接管逻辑。
    console.log('[CustomData] 已停用自定义下拉接管，保留框架原生下拉');
}

// =====================================================
// 直接在数字 DOM 元素内部注入单位 <span>
// 原理：在 DOM 中找到包含数字值的叶子元素，在其内部追加单位文字
//       单位自然排在数字后面（inline 流式布局），无需计算坐标
//       用 setInterval 持续注入，对抗框架的周期性重渲染
// =====================================================

const UNIT_LABELS = [
    { dataSetName: '交易总量',          unit: ' 公斤' },
    { dataSetName: '交易金额',          unit: ' 万元' },
    { dataSetName: '交易均价',          unit: ' 元/公斤' },
    { dataSetName: '交易均价(不含异常)',  unit: ' 元/公斤' },
    { dataSetName: '货源企业数量',        unit: ' 家' },
    { dataSetName: '采购商数量',        unit: ' 家' },
];

const UNIT_MARKER_CLASS = 'ds-injected-unit';
const NUM_LEFT_ALIGN_CLASS = 'ds-num-left-align';
const LEFT_METRIC_FLIP_ENABLED = true;
const LEFT_FLIP_OVERLAY_CLASS = 'ds-left-flip-overlay';
const LEFT_FLIP_DIGITS_CLASS = 'ds-left-flip-digits';
const LEFT_FLIP_UNIT_CLASS = 'ds-left-flip-unit';
const LEFT_FLIP_CELL_CLASS = 'ds-left-flip-cell';
const LEFT_FLIP_CARD_CLASS = 'ds-left-flip-card';
const LEFT_FLIP_ANIM_CLASS = 'ds-left-flip-anim';
const LEFT_FLIP_FRONT_CLASS = 'ds-left-flip-front';
const LEFT_FLIP_BACK_CLASS = 'ds-left-flip-back';
const LEFT_FLIP_TOP_CLASS = 'ds-left-flip-top';
const LEFT_FLIP_BOTTOM_CLASS = 'ds-left-flip-bottom';
const LEFT_FLIP_TOP_ANIM_CLASS = 'ds-left-flip-top-anim';
const LEFT_FLIP_BOTTOM_ANIM_CLASS = 'ds-left-flip-bottom-anim';
const LEFT_FLIP_DIGITS_FONT_SCALE = 1.70;
const TIME_WRAP_CLASS = 'ds-time-wrap';
const TIME_MAIN_CLASS = 'ds-time-main';
const TIME_WEEK_CLASS = 'ds-time-week';
const LEFT_ROLL_CELL_CLASS = 'ds-roll-cell';
const LEFT_ROLL_LIST_CLASS = 'ds-roll-list';
const LEFT_ANIM_MODE = 'roll';
const LEFT_ROLL_DURATION_MS = 850;
const LEFT_PER_DIGIT_WIDTH = true;

function unwrapDataSetValue(v) {
    if (v && typeof v === 'object' && Object.prototype.hasOwnProperty.call(v, 'value')) return v.value;
    return v;
}

function formatLeftMetricValue(dataSetName, rawValue) {
    const n = Number(rawValue);
    if (!Number.isFinite(n)) return '0';
    if (dataSetName === '货源企业数量' || dataSetName === '采购商数量') return String(Math.round(n));
    if (dataSetName === '交易总量' || dataSetName === '交易金额' || dataSetName === '交易均价' || dataSetName === '交易均价(不含异常)') return n.toFixed(2);
    if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
    return n.toFixed(2);
}

function padLeft(text, len) {
    const s = text == null ? '' : String(text);
    if (s.length >= len) return s;
    return ' '.repeat(len - s.length) + s;
}

function isDigitChar(ch) {
    return ch >= '0' && ch <= '9';
}

function calcTextUnits(text) {
    let units = 0;
    const s = text == null ? '' : String(text);
    for (let i = 0; i < s.length; i++) {
        const code = s.charCodeAt(i);
        if ((code >= 0x4E00 && code <= 0x9FFF) || (code >= 0x3400 && code <= 0x4DBF)) units += 2;
        else units += 1;
    }
    return units;
}

function truncateRightKeepHead(text, maxUnits) {
    const s = text == null ? '' : String(text);
    if (!s) return s;
    let units = 0;
    let out = '';
    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        const code = s.charCodeAt(i);
        const step = ((code >= 0x4E00 && code <= 0x9FFF) || (code >= 0x3400 && code <= 0x4DBF)) ? 2 : 1;
        if (units + step > maxUnits) {
            out += '…';
            return out;
        }
        out += ch;
        units += step;
    }
    return out;
}

const RANK_LABEL_MAX_UNITS = 20;

function scaleComputedSize(value, scale) {
    if (!value) return value;
    if (value === 'normal') return value;
    const n = parseFloat(value);
    if (!Number.isFinite(n)) return value;
    const unit = String(value).replace(String(n), '').trim();
    const scaled = n * scale;
    return unit ? String(scaled) + unit : String(scaled) + 'px';
}

function toNumericFontWeight(weight) {
    if (weight == null) return NaN;
    const w = String(weight).trim().toLowerCase();
    if (!w) return NaN;
    if (w === 'normal') return 400;
    if (w === 'bold') return 700;
    if (w === 'bolder') return 800;
    if (w === 'lighter') return 300;
    const n = parseInt(w, 10);
    return Number.isFinite(n) ? n : NaN;
}

function snapshotTypography(el) {
    const cs = window.getComputedStyle(el);
    return {
        fontFamily: cs.fontFamily,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        fontStyle: cs.fontStyle,
        lineHeight: cs.lineHeight,
        letterSpacing: cs.letterSpacing,
        fontVariantNumeric: cs.fontVariantNumeric,
        fontFeatureSettings: cs.fontFeatureSettings,
        fontKerning: cs.fontKerning,
        textTransform: cs.textTransform
    };
}

function computeDigitMetrics(typography) {
    const measurer = document.createElement('span');
    measurer.style.position = 'absolute';
    measurer.style.visibility = 'hidden';
    measurer.style.left = '-99999px';
    measurer.style.top = '-99999px';
    measurer.style.fontFamily = typography.fontFamily;
    measurer.style.fontSize = typography.fontSize;
    measurer.style.fontWeight = typography.fontWeight;
    measurer.style.fontStyle = typography.fontStyle;
    measurer.style.lineHeight = typography.lineHeight;
    measurer.style.letterSpacing = typography.letterSpacing;
    measurer.style.fontVariantNumeric = 'tabular-nums';
    measurer.style.fontFeatureSettings = '"tnum" 1, "lnum" 1';
    document.body.appendChild(measurer);
    let maxDigit = 0;
    for (let d = 0; d <= 9; d++) {
        measurer.textContent = String(d);
        maxDigit = Math.max(maxDigit, measurer.offsetWidth || 0);
    }
    const digitPx = maxDigit || 0;
    measurer.textContent = '.';
    const dotPx = measurer.offsetWidth || Math.max(1, Math.round(digitPx * 0.35));
    measurer.textContent = '-';
    const dashPx = measurer.offsetWidth || Math.max(1, Math.round(digitPx * 0.5));
    document.body.removeChild(measurer);
    return { digitPx, dotPx, dashPx };
}

function ensureLeftFlipOverlay(containerEl) {
    let overlay = containerEl.querySelector('.' + LEFT_FLIP_OVERLAY_CLASS);
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = LEFT_FLIP_OVERLAY_CLASS;
        containerEl.appendChild(overlay);
    }
    return overlay;
}

function renderLeftFlip(overlayEl, key, toText, unitText, typography) {
    window._DS_LEFT_FLIP_LAST = window._DS_LEFT_FLIP_LAST || {};
    const lastMap = window._DS_LEFT_FLIP_LAST;
    const fromText = lastMap[key];

    const to = String(toText == null ? '' : toText);
    const unit = String(unitText == null ? '' : unitText);

    overlayEl.innerHTML = '';

    const digitsWrap = document.createElement('span');
    digitsWrap.className = LEFT_FLIP_DIGITS_CLASS;
    if (typography) {
        digitsWrap.style.fontFamily = typography.fontFamily;
        digitsWrap.style.fontSize = scaleComputedSize(typography.fontSize, LEFT_FLIP_DIGITS_FONT_SCALE);
        const baseW = toNumericFontWeight(typography.fontWeight);
        digitsWrap.style.fontWeight = String(Number.isFinite(baseW) ? Math.max(baseW, 800) : 800);
        digitsWrap.style.fontStyle = typography.fontStyle;
        digitsWrap.style.lineHeight = scaleComputedSize(typography.lineHeight, LEFT_FLIP_DIGITS_FONT_SCALE);
        // 统一间距：翻牌容器内禁用字距，全部由固定位宽控制
        digitsWrap.style.letterSpacing = '0px';
        digitsWrap.style.fontVariantNumeric = 'tabular-nums';
        digitsWrap.style.fontFeatureSettings = '"tnum" 1, "lnum" 1';
        digitsWrap.style.fontKerning = typography.fontKerning;
        digitsWrap.style.textTransform = typography.textTransform;
    }
    const metrics = typography ? computeDigitMetrics(typography) : null;
    const scale = LEFT_FLIP_DIGITS_FONT_SCALE || 1;
    const scaledDigitPx = metrics ? Math.ceil(metrics.digitPx * scale + 1) : null;
    const scaledDotPx = metrics ? Math.ceil(metrics.dotPx * scale + 1) : null;
    function widthOfDigit(ch) {
        if (!metrics) return null;
        if (ch === '.') return scaledDotPx;
        if (LEFT_PER_DIGIT_WIDTH && ch >= '0' && ch <= '9' && metrics.digits) {
            const base = metrics.digits[ch] || metrics.digitPx;
            return Math.ceil(base * scale + 1);
        }
        return scaledDigitPx;
    }
    overlayEl.appendChild(digitsWrap);

    const unitSpan = document.createElement('span');
    unitSpan.className = LEFT_FLIP_UNIT_CLASS;
    unitSpan.textContent = unit;
    if (typography) {
        unitSpan.style.fontFamily = typography.fontFamily;
        unitSpan.style.fontWeight = typography.fontWeight;
        unitSpan.style.fontStyle = typography.fontStyle;
        unitSpan.style.lineHeight = typography.lineHeight;
        unitSpan.style.letterSpacing = typography.letterSpacing;
        unitSpan.style.fontVariantNumeric = typography.fontVariantNumeric;
        unitSpan.style.fontFeatureSettings = typography.fontFeatureSettings;
        unitSpan.style.fontKerning = typography.fontKerning;
        unitSpan.style.textTransform = typography.textTransform;
    }
    overlayEl.appendChild(unitSpan);

    const mode = String(LEFT_ANIM_MODE || '').toLowerCase();
    if (mode === 'roll') {
        const a = padLeft(fromText == null ? '' : String(fromText), to.length);
        const b = padLeft(to, Math.max((fromText || '').length, to.length));
        const hProbe = document.createElement('span');
        hProbe.textContent = '8';
        hProbe.style.position = 'absolute';
        hProbe.style.visibility = 'hidden';
        hProbe.style.whiteSpace = 'nowrap';
        digitsWrap.appendChild(hProbe);
        const cellH = Math.max(1, hProbe.offsetHeight);
        digitsWrap.removeChild(hProbe);
        for (let i = 0; i < b.length; i++) {
            const oldCh = a[i] || ' ';
            const newCh = b[i] || ' ';
            const cell = document.createElement('span');
            cell.className = LEFT_ROLL_CELL_CLASS;
            const w = widthOfDigit(newCh);
            if (w != null) cell.style.width = w + 'px';
            if (!isDigitChar(oldCh) || !isDigitChar(newCh) || oldCh === newCh) {
                cell.textContent = newCh;
                digitsWrap.appendChild(cell);
                continue;
            }
            const list = document.createElement('span');
            list.className = LEFT_ROLL_LIST_CLASS;
            for (let d = 0; d <= 9; d++) {
                const item = document.createElement('span');
                item.className = 'ds-roll-item';
                item.textContent = String(d);
                item.style.height = cellH + 'px';
                item.style.lineHeight = cellH + 'px';
                list.appendChild(item);
            }
            cell.style.height = cellH + 'px';
            cell.appendChild(list);
            digitsWrap.appendChild(cell);
            list.style.transform = 'translate3d(0,' + (-parseInt(oldCh, 10) * cellH) + 'px,0)';
            void list.offsetHeight;
            requestAnimationFrame(() => {
                list.style.transform = 'translate3d(0,' + (-parseInt(newCh, 10) * cellH) + 'px,0)';
            });
            list.addEventListener('transitionend', () => {
                cell.textContent = newCh;
            }, { once: true });
        }
        lastMap[key] = to;
        return;
    }

    if (fromText == null) {
        digitsWrap.textContent = to;
        lastMap[key] = to;
        return;
    }

    const from = String(fromText);
    if (from === to) {
        digitsWrap.textContent = to;
        return;
    }

    const maxLen = Math.max(from.length, to.length);
    const a = padLeft(from, maxLen);
    const b = padLeft(to, maxLen);

    const animatedCards = [];

    for (let i = 0; i < maxLen; i++) {
        const oldCh = a[i];
        const newCh = b[i];

        const cell = document.createElement('span');
        cell.className = LEFT_FLIP_CELL_CLASS;

        if (!isDigitChar(oldCh) || !isDigitChar(newCh) || oldCh === newCh) {
            cell.textContent = newCh;
            const w = widthOfDigit(newCh);
            if (w != null) cell.style.width = w + 'px';
            digitsWrap.appendChild(cell);
            continue;
        }

        const topHalf = document.createElement('span');
        topHalf.className = LEFT_FLIP_TOP_CLASS;
        const bottomHalf = document.createElement('span');
        bottomHalf.className = LEFT_FLIP_BOTTOM_CLASS;

        const topFront = document.createElement('span');
        topFront.className = LEFT_FLIP_FRONT_CLASS;
        topFront.textContent = oldCh;
        const topBack = document.createElement('span');
        topBack.className = LEFT_FLIP_BACK_CLASS;
        topBack.textContent = newCh;

        const bottomFront = document.createElement('span');
        bottomFront.className = LEFT_FLIP_FRONT_CLASS;
        bottomFront.textContent = oldCh;
        const bottomBack = document.createElement('span');
        bottomBack.className = LEFT_FLIP_BACK_CLASS;
        bottomBack.textContent = newCh;

        topHalf.appendChild(topFront);
        topHalf.appendChild(topBack);
        bottomHalf.appendChild(bottomFront);
        bottomHalf.appendChild(bottomBack);

        const linePx = parseFloat(getComputedStyle(digitsWrap).lineHeight) || 0;
        if (linePx > 0) {
            const halfPx = Math.round(linePx / 2);
            topHalf.style.height = halfPx + 'px';
            bottomHalf.style.height = halfPx + 'px';
        }

        cell.appendChild(topHalf);
        cell.appendChild(bottomHalf);
        const w3 = widthOfDigit(newCh);
        if (w3 != null) cell.style.width = w3 + 'px';
        digitsWrap.appendChild(cell);

        animatedCards.push({ topHalf, bottomHalf, cell, newCh });
    }

    requestAnimationFrame(() => {
        animatedCards.forEach(({ topHalf, bottomHalf, cell, newCh }) => {
            topHalf.classList.add(LEFT_FLIP_TOP_ANIM_CLASS);
            topHalf.addEventListener('animationend', () => {
                const tf = topHalf.querySelector('.' + LEFT_FLIP_FRONT_CLASS);
                const tb = topHalf.querySelector('.' + LEFT_FLIP_BACK_CLASS);
                if (tf && tb) tf.textContent = tb.textContent;
                bottomHalf.classList.add(LEFT_FLIP_BOTTOM_ANIM_CLASS);
                bottomHalf.addEventListener('animationend', () => {
                    cell.textContent = newCh;
                }, { once: true });
            }, { once: true });
        });
    });

    lastMap[key] = to;
}

/** 地图容器 id（热力地图 含省市） */
const MAP_CONTAINER_ID = 'cpmbd3a7549-e208-42e1-a158-fa080262956e';

/**
 * 在地图容器上覆盖山川纹理层，通过 mix-blend-mode 只在地图有颜色区域显示
 * 纹理图：shared/assets/image/background.png
 */
function injectMapTexture() {
    const mapEl = document.getElementById(MAP_CONTAINER_ID);
    if (!mapEl) return;
    if (mapEl.querySelector('.map-texture')) return; // 已存在则不重复添加
    const texture = document.createElement('div');
    texture.className = 'map-texture';
    texture.setAttribute('aria-hidden', 'true');
    mapEl.appendChild(texture);
}

// 注入全局 CSS（只执行一次），通过 !important 强制左对齐 + 允许溢出
(function injectGlobalStyle() {
    if (document.getElementById('ds-custom-style')) return;
    const style = document.createElement('style');
    style.id = 'ds-custom-style';
    style.textContent = [
        // 1. 全局重置，防止误伤
        'body, #app { cursor: default !important; }',

        // 2. 覆盖 .number-el 的 flexbox 居中 → 左对齐
        '.' + NUM_LEFT_ALIGN_CLASS + ' {',
        '  text-align: left !important;',
        '  justify-content: flex-start !important;',
        '  align-items: baseline !important;',
        '  overflow: visible !important;',
        '}',
        '.' + NUM_LEFT_ALIGN_CLASS + ' > * {',
        '  text-align: left !important;',
        '  overflow: visible !important;',
        '}',

        // 3. 注入的单位文本样式
        '.' + UNIT_MARKER_CLASS + ' {',
        '  font-size: 20px;',
        '  color: #ffffff;',
        '  font-weight: bold;',
        '  font-family: AlimamaAgileVF-Thin, sans-serif;',
        '  white-space: nowrap;',
        '  margin-left: 8px;',
        '  position: relative;',
        '  top: -1px;',
        '}',

        '.' + LEFT_FLIP_OVERLAY_CLASS + ' {',
        '  position: absolute;',
        '  inset: 0;',
        '  display: flex;',
        '  align-items: baseline;',
        '  justify-content: flex-start;',
        '  pointer-events: none;',
        '  z-index: 2;',
        '}',
        '.' + LEFT_FLIP_DIGITS_CLASS + ' {',
        '  display: inline-flex;',
        '  align-items: baseline;',
        '  white-space: pre;',
        '  color: #00e4ff !important;',
        '  -webkit-text-fill-color: #00e4ff !important;',
        '  font-variant-numeric: tabular-nums;',
        '  font-feature-settings: "tnum" 1, "lnum" 1;',
        '  text-shadow: 0 0 10px rgba(0, 228, 255, 0.55), 0 0 18px rgba(0, 228, 255, 0.25);',
        '}',
        '.' + LEFT_FLIP_UNIT_CLASS + ' {',
        '  font-size: 20px;',
        '  color: #ffffff !important;',
        '  -webkit-text-fill-color: #ffffff !important;',
        '  font-weight: bold;',
        '  font-family: AlimamaAgileVF-Thin, sans-serif;',
        '  white-space: nowrap;',
        '  margin-left: 8px;',
        '  position: relative;',
        '  top: -1px;',
        '}',
        '.' + LEFT_FLIP_CELL_CLASS + ' {',
        '  position: relative;',
        '  display: inline-block;',
        '  min-width: 0.62em;',
        '  text-align: center;',
        '  perspective: 800px;',
        '  will-change: transform;',
        '}',
        '.' + LEFT_FLIP_CARD_CLASS + ' {',
        '  position: relative;',
        '  display: inline-block;',
        '  transform-style: preserve-3d;',
        '  will-change: transform;',
        '}',
        '.' + LEFT_FLIP_CARD_CLASS + ' .' + LEFT_FLIP_FRONT_CLASS + ',',
        '.' + LEFT_FLIP_CARD_CLASS + ' .' + LEFT_FLIP_BACK_CLASS + ' {',
        '  position: absolute;',
        '  top: 0; left: 0;',
        '  width: 100%;',
        '  backface-visibility: hidden;',
        '  transform-origin: 50% 55%;',
        '}',
        '.' + LEFT_FLIP_CARD_CLASS + ' .' + LEFT_FLIP_FRONT_CLASS + ' {',
        '  transform: rotateX(0deg);',
        '}',
        '.' + LEFT_FLIP_CARD_CLASS + ' .' + LEFT_FLIP_BACK_CLASS + ' {',
        '  transform: rotateX(180deg);',
        '}',
        '.' + LEFT_FLIP_CARD_CLASS + '.' + LEFT_FLIP_ANIM_CLASS + ' {',
        '  animation: dsLeftFlipX 420ms cubic-bezier(0.2, 0.75, 0.2, 1) forwards;',
        '}',
        '@keyframes dsLeftFlipX {',
        '  0% { transform: rotateX(0deg); }',
        '  100% { transform: rotateX(-180deg); }',
        '}',
        '.' + LEFT_ROLL_CELL_CLASS + ' {',
        '  position: relative;',
        '  display: inline-block;',
        '  overflow: hidden;',
        '  vertical-align: baseline;',
        '}',
        '.' + LEFT_ROLL_LIST_CLASS + ' {',
        '  display: block;',
        '  transition: transform ' + LEFT_ROLL_DURATION_MS + 'ms cubic-bezier(0.22, 0.61, 0.36, 1);',
        '  will-change: transform;',
        '  backface-visibility: hidden;',
        '  transform: translateZ(0);',
        '}',
        '.ds-roll-item {',
        '  display: block;',
        '  height: 1em;',
        '  line-height: 1em;',
        '}',
        '.' + LEFT_FLIP_TOP_CLASS + ', .' + LEFT_FLIP_BOTTOM_CLASS + ' {',
        '  display: block;',
        '  overflow: hidden;',
        '  position: relative;',
        '  transform-style: preserve-3d;',
        '}',
        '.' + LEFT_FLIP_TOP_CLASS + ' .' + LEFT_FLIP_FRONT_CLASS + ',',
        '.' + LEFT_FLIP_TOP_CLASS + ' .' + LEFT_FLIP_BACK_CLASS + ',',
        '.' + LEFT_FLIP_BOTTOM_CLASS + ' .' + LEFT_FLIP_FRONT_CLASS + ',',
        '.' + LEFT_FLIP_BOTTOM_CLASS + ' .' + LEFT_FLIP_BACK_CLASS + ' {',
        '  display: block;',
        '  backface-visibility: hidden;',
        '  transform-origin: center;',
        '}',
        '.' + LEFT_FLIP_TOP_CLASS + ' .' + LEFT_FLIP_BACK_CLASS + ' {',
        '  transform: rotateX(90deg);',
        '}',
        '.' + LEFT_FLIP_BOTTOM_CLASS + ' .' + LEFT_FLIP_FRONT_CLASS + ' {',
        '  transform: rotateX(-90deg);',
        '}',
        '.' + LEFT_FLIP_TOP_CLASS + '.' + LEFT_FLIP_TOP_ANIM_CLASS + ' {',
        '  animation: dsFlipTop 220ms cubic-bezier(0.2, 0.75, 0.2, 1) forwards;',
        '  transform-origin: center bottom;',
        '}',
        '.' + LEFT_FLIP_BOTTOM_CLASS + '.' + LEFT_FLIP_BOTTOM_ANIM_CLASS + ' {',
        '  animation: dsFlipBottom 220ms cubic-bezier(0.2, 0.75, 0.2, 1) forwards;',
        '  transform-origin: center top;',
        '}',
        '@keyframes dsFlipTop {',
        '  0% { transform: rotateX(0deg); }',
        '  100% { transform: rotateX(-90deg); }',
        '}',
        '@keyframes dsFlipBottom {',
        '  0% { transform: rotateX(90deg); }',
        '  100% { transform: rotateX(0deg); }',
        '}',
        '.' + TIME_WRAP_CLASS + ' {',
        '  display: inline-flex;',
        '  align-items: baseline;',
        '  gap: 8px;',
        '  white-space: nowrap;',
        '}',
        '.' + TIME_MAIN_CLASS + ' {',
        '  font-variant-numeric: tabular-nums;',
        '  font-feature-settings: "tnum" 1, "lnum" 1;',
        '}',
        '.' + TIME_WEEK_CLASS + ' {',
        '  white-space: nowrap;',
        '}',

        // 4. 右侧菜单高亮 & 手型鼠标（精确控制）
        // 背景框：只给特定的背景框加手型
        '.ds-menu-active-card, .ds-menu-card-bg {',
        '  cursor: pointer !important;',
        '}',
        '.ds-menu-active-card {',
        '  filter: brightness(1.8) drop-shadow(0 0 6px rgba(0, 200, 255, 0.6)) !important;',
        '}',
        // 文本：只给特定的菜单文本加手型
        '.ds-menu-active-text, .ds-menu-inactive-text {',
        '  cursor: pointer !important;',
        '}',
        '.ds-menu-active-text {',
        '  color: #00e4ff !important;',
        '  text-shadow: 0 0 10px rgba(0, 228, 255, 0.7), 0 0 20px rgba(0, 228, 255, 0.3) !important;',
        '}',
        '.ds-menu-inactive-text {',
        '  opacity: 0.65 !important;',
        '}',

        '.dv-decoration-11 {',
        '  overflow: hidden !important;',
        '}',
        '.dv-decoration-11 svg {',
        '  display: block;',
        '  width: 100% !important;',
        '  height: 100% !important;',
        '}',
        '.dv-border-box-10 {',
        '  overflow: hidden !important;',
        '}',
        '.dv-border-box-10 svg {',
        '  display: block;',
        '  width: 100% !important;',
        '  height: 100% !important;',
        '}',

        // 5. 修复异常交易表格的表头对齐
        '[id="cpm817f187b-80cb-47eb-b250-a6a559a3cc8d"] .header-row .cell {',
        '  display: flex !important;',
        '  justify-content: center !important;',
        '  align-items: center !important;',
        '}',
        '[id="cpm817f187b-80cb-47eb-b250-a6a559a3cc8d"] .header-row .cell:nth-child(2) .text-box,',
        '[id="cpm817f187b-80cb-47eb-b250-a6a559a3cc8d"] .header-row .cell:nth-child(3) .text-box {',
        '  text-indent: 2em !important;',
        '}',

        // 6. 指定组件手型鼠标：地图 & 下拉框
        '[id="cpmbd3a7549-e208-42e1-a158-fa080262956e"],', // 地图
        '[id="cpme41cb160-0568-4114-90c8-c847a9d8aa0b"] {', // 下拉框
        '  cursor: pointer !important;',
        '}',
        '[id="' + SELECT_COMPONENT_ID + '"][data-ds-market-dropdown-enabled="0"] {',
        '  cursor: default !important;',
        '  pointer-events: none !important;',
        '  user-select: none !important;',
        '}',
        '[id="' + SELECT_COMPONENT_ID + '"][data-ds-market-dropdown-enabled="0"] *,',
        '[id="' + SELECT_COMPONENT_ID + '"][data-ds-market-dropdown-disabled="1"] *,',
        '[id="' + SELECT_COMPONENT_ID + '"][aria-disabled="true"] * {',
        '  pointer-events: none !important;',
        '}',
        // 6b. 保留框架原生 selectLink，下拉面板不再由自定义样式强制隐藏
        // 7. 地图 2.5D：整图投影，加强可见度（深色阴影 + 大模糊 + box-shadow 兜底）
        '[id="cpmbd3a7549-e208-42e1-a158-fa080262956e"] {',
        '  position: relative !important;',
        '  filter: drop-shadow(0 12px 28px rgba(0, 0, 0, 0.55)) drop-shadow(0 6px 14px rgba(0, 35, 90, 0.5));',
        '  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.45), 0 6px 16px rgba(0, 30, 70, 0.4);',
        '}',
        // 8. 地图山川纹理层：mix-blend-mode 让纹理只在地图有颜色区域显示
        '.map-texture {',
        '  position: absolute !important;',
        '  top: 0 !important; left: 0 !important;',
        '  width: 100% !important; height: 100% !important;',
        '  pointer-events: none !important;',
        '  background-image: url("../../shared/assets/image/background.png") !important;',
        '  background-size: 400px !important;',
        '  background-repeat: repeat !important;',
        '  mix-blend-mode: overlay !important;',
        '  opacity: 0.3 !important;',
        '}'
    ].join('\n');
    document.head.appendChild(style);
})();

/**
 * 在显示数字的 DOM 元素内部注入单位文本
 * 1. 遍历 #app 下所有叶子元素
 * 2. 对比纯文本内容（排除已注入的 span）是否与数字值完全匹配
 * 3. 匹配成功则追加/更新一个带样式的 <span>
 */
function injectUnits() {
    const dataSet = window._DS_DATA && window._DS_DATA.dataSet;
    if (!dataSet) return;

    const app = document.getElementById('app');
    if (!app) return;

    // 清理旧方案残留的 overlay 元素（如果有的话）
    for (let i = 0; i < 10; i++) {
        const old = document.getElementById('ds-unit-overlay-' + i);
        if (old) old.remove();
    }

    // ---- 精确定位策略 ----
    // 框架 NumElement 渲染为 .number-el > .val 结构
    // 页面共 6 个 NumElement，按 Y 坐标从上到下依次对应 UNIT_LABELS 中的 6 个指标
    // 不再使用文本匹配（同值指标、地图标签等会导致误匹配），改用位置排序

    const numberEls = Array.from(app.querySelectorAll('.number-el'));
    if (numberEls.length === 0) return;

    // 按视觉位置（Y 坐标）排序，对应从上到下的指标顺序
    numberEls.sort((a, b) => {
        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        return ra.top - rb.top;
    });

    // 逐一匹配：UNIT_LABELS 已按从上到下顺序定义
    UNIT_LABELS.forEach(({ dataSetName, unit }, idx) => {
        if (idx >= numberEls.length) return;

        const numEl = numberEls[idx];
        // .val 是框架渲染数字的子元素
        const valEl = numEl.querySelector('.val') || numEl;

        // 通过 CSS class 强制左对齐 + 允许溢出（!important 保证不被框架覆盖）
        valEl.classList.add(NUM_LEFT_ALIGN_CLASS);
        numEl.classList.add(NUM_LEFT_ALIGN_CLASS);
        if (numEl.parentElement) {
            numEl.parentElement.classList.add(NUM_LEFT_ALIGN_CLASS);
        }
        if (numEl.parentElement && numEl.parentElement.parentElement) {
            numEl.parentElement.parentElement.classList.add(NUM_LEFT_ALIGN_CLASS);
        }

        if (LEFT_METRIC_FLIP_ENABLED) {
            const injectedUnit = valEl.querySelector('.' + UNIT_MARKER_CLASS);
            if (injectedUnit) injectedUnit.remove();

            const raw = unwrapDataSetValue(dataSet[dataSetName]);
            const text = formatLeftMetricValue(dataSetName, raw);
            const rawValEl = numEl.querySelector('.val') || valEl;
            const typography = snapshotTypography(rawValEl);
            rawValEl.style.position = 'relative';
            rawValEl.style.color = 'transparent';
            rawValEl.style.textShadow = 'none';
            rawValEl.style.setProperty('-webkit-text-fill-color', 'transparent');

            const overlay = ensureLeftFlipOverlay(rawValEl);
            renderLeftFlip(overlay, dataSetName, text, unit, typography);

        } else {
            let unitSpan = valEl.querySelector('.' + UNIT_MARKER_CLASS);
            if (!unitSpan) {
                unitSpan = document.createElement('span');
                unitSpan.className = UNIT_MARKER_CLASS;
                valEl.appendChild(unitSpan);
            }
            unitSpan.textContent = unit;
        }
    });
}

// =====================================================
// 右侧菜单卡片高亮：将"实时交易"标记为选中状态
// 通过 DOM 查找文本元素 + 其背后的装饰卡片，分别加高亮/暗淡样式
// =====================================================
const MENU_LABELS = ['实时交易', '历史查询', '数据分析'];
const ACTIVE_MENU = '实时交易';

function highlightActiveMenu() {
    const app = document.getElementById('app');
    if (!app) return;

    // 收集所有叶子文本节点（.text-el 内的文本）
    const textEls = app.querySelectorAll('.text-el');
    const menuMap = {}; // { '实时交易': textElWrapper, ... }

    textEls.forEach(el => {
        // 排除已注入的 span 等，取纯文本
        const raw = el.textContent.trim();
        if (MENU_LABELS.includes(raw)) {
            menuMap[raw] = el;
        }
    });

    // 对每个菜单文本元素应用样式
    MENU_LABELS.forEach(label => {
        const textEl = menuMap[label];
        if (!textEl) return;

        if (label === ACTIVE_MENU) {
            textEl.classList.add('ds-menu-active-text');
            textEl.classList.remove('ds-menu-inactive-text');
        } else {
            textEl.classList.add('ds-menu-inactive-text');
            textEl.classList.remove('ds-menu-active-text');
        }

        // 找到对应的装饰卡片背景（同级的上一个兄弟组件，或通过位置匹配）
        // DataShow 框架中，组件 wrapper 是 textEl 的祖先 absolute div
        let wrapper = textEl.closest('[style*="position"]') || textEl.parentElement;
        // 往上找到组件最外层 wrapper（一般 3 层）
        for (let i = 0; i < 5 && wrapper && wrapper.id !== 'app'; i++) {
            if (wrapper.parentElement && wrapper.parentElement.id === 'app') break;
            wrapper = wrapper.parentElement;
        }
        if (!wrapper || wrapper.id === 'app') return;

        // wrapper 是文字组件的最外层，找相邻的装饰组件（位置重叠的前一个兄弟）
        const wrapperRect = wrapper.getBoundingClientRect();
        let decorationWrapper = null;

        // 向前遍历兄弟节点，找位置重叠的装饰元素
        let sibling = wrapper.previousElementSibling;
        for (let i = 0; i < 5 && sibling; i++) {
            const sr = sibling.getBoundingClientRect();
            // 位置重叠判断：水平距离 < 40px 且垂直距离 < 30px
            if (Math.abs(sr.left - wrapperRect.left) < 60 &&
                Math.abs(sr.top - wrapperRect.top) < 30) {
                decorationWrapper = sibling;
                break;
            }
            sibling = sibling.previousElementSibling;
        }

        if (decorationWrapper) {
            decorationWrapper.classList.add('ds-menu-card-bg');
            if (label === ACTIVE_MENU) {
                decorationWrapper.classList.add('ds-menu-active-card');
            } else {
                decorationWrapper.classList.remove('ds-menu-active-card');
            }
        }
        wrapper.classList.add('ds-menu-card');
    });
}

// =====================================================
// 页面导航：点击右上角卡片跳转到对应页面
// "历史查询" → ../history/index.html
// "分析报告" → ../analysis/index.html
// 跳转时自动继承当前市场，但不暴露 marketId 参数
// =====================================================
const PAGE_NAV_MAP = {
    '历史查询': '../history/index.html',
    '数据分析': '../analysis/index.html',
    '分析报告': '../analysis/index.html',  // 兼容旧文本
};

function setupPageNavigation() {
    document.addEventListener('click', function (e) {
        // 向上查找最近的文本内容（兼容点击到子元素的情况）
        let target = e.target;
        let clickedText = '';
        // 最多向上找 3 层
        for (let i = 0; i < 3 && target && target !== document; i++) {
            clickedText = target.textContent.trim();
            if (PAGE_NAV_MAP[clickedText]) break;
            target = target.parentElement;
        }

        const targetPath = PAGE_NAV_MAP[clickedText];
        if (!targetPath) return;

        e.preventDefault();
        e.stopPropagation();

        const marketId = _getCurrentMarketId();
        const targetUrl = _buildHiddenMarketUrl(targetPath, marketId);
        console.log('[CustomData] 页面跳转:', clickedText, '→', targetUrl);
        window.location.href = targetUrl;
    }, true);

    console.log('[CustomData] 页面导航监听已启动');
}

// =====================================================
// 屠宰场出厂价日期：从 API factoryPriceDate 动态更新
// 替换 app.data.readable.js 中写死的静态日期文本
// [性能优化] 缓存日期 DOM 元素引用，避免每 1.5s 全量扫描 div/span/p
// =====================================================
let _cachedDateEl = null;
let _lastFormattedDate = '';
let _cachedFactoryPriceLabelEl = null;

function updateFactoryPriceDate() {
    const dateStr = window._DS_FACTORY_PRICE_DATE;
    if (!dateStr) return;

    // "2026-01-23" → "2026年1月23日"
    const parts = dateStr.split('-');
    if (parts.length !== 3) return;
    const formatted = parseInt(parts[0]) + '年' + parseInt(parts[1]) + '月' + parseInt(parts[2]) + '日';

    // 如果日期未变化且缓存元素仍有效，直接跳过
    if (formatted === _lastFormattedDate && _cachedDateEl && _cachedDateEl.isConnected) return;

    // 缓存失效时重新查找
    if (!_cachedDateEl || !_cachedDateEl.isConnected) {
        const app = document.getElementById('app');
        if (!app) return;
        _cachedDateEl = null;
        const els = app.querySelectorAll('div, span, p');
        for (const el of els) {
            if (el.children.length > 0) continue;
            const text = el.textContent.trim();
            if (/^\d{4}年\d{1,2}月\d{1,2}日$/.test(text)) {
                _cachedDateEl = el;
                break;
            }
        }
    }

    if (_cachedDateEl && _cachedDateEl.textContent.trim() !== formatted) {
        _cachedDateEl.textContent = formatted;
        _lastFormattedDate = formatted;
    }
}

function injectFactoryPriceHelpIcon() {
    const app = document.getElementById('app');
    if (!app) return;

    // 尽量复用已命中的标题元素（大屏会频繁重渲染，需校验 isConnected）
    let target = (_cachedFactoryPriceLabelEl && _cachedFactoryPriceLabelEl.isConnected)
      ? _cachedFactoryPriceLabelEl
      : null;

    if (!target) {
        // 兼容实际渲染文本可能包含：空格/换行/单位/冒号等情况
        const WANT = '屠宰场平均出厂价';
        const normalize = (s) => String(s || '').replace(/\s+/g, '').replace(/[：:]/g, '');
        const wantN = normalize(WANT);

        // 优先在 .text-el 中找；找不到再 fallback 到所有叶子节点（避免误匹配大面积容器）
        const candidates = [];
        app.querySelectorAll('.text-el').forEach((el) => candidates.push(el));
        if (candidates.length === 0) {
            app.querySelectorAll('span, p, div').forEach((el) => candidates.push(el));
        }

        for (const el of candidates) {
            // 避免选到容器：只选“叶子”或近似叶子（子元素很少）
            if (el.children && el.children.length > 2) continue;
            const raw = (el.textContent || '').trim();
            if (!raw) continue;
            const n = normalize(raw);
            if (n === wantN || n.includes(wantN)) {
                target = el;
                _cachedFactoryPriceLabelEl = el;
                break;
            }
        }
    }

    if (!target) return;
    let icon = target.querySelector('.factory-price-help');
    if (!icon) {
        icon = document.createElement('span');
        icon.className = 'factory-price-help';
        target.appendChild(icon);
    }
    icon.textContent = '?';
    icon.title = '数据来源于中国农业农村信息网';
    icon.style.marginLeft = '7px';
    icon.style.cursor = 'help';
    icon.style.display = 'inline-flex';
    icon.style.alignItems = 'center';
    icon.style.justifyContent = 'center';
    icon.style.width = '17px';
    icon.style.height = '17px';
    icon.style.border = '1px solid rgba(255,255,255,0.7)';
    icon.style.borderRadius = '50%';
    icon.style.fontSize = '13px';
    icon.style.fontWeight = '100';
    icon.style.fontFamily = 'AlimamaAgileVF-Thin, sans-serif';
    icon.style.lineHeight = '1';
    icon.style.color = '#fff';
    icon.style.transform = 'translateY(-2px)';
    icon.style.verticalAlign = 'middle';
    icon.style.position = 'relative';
    icon.style.pointerEvents = 'auto';
    icon.style.zIndex = '9999';
    try { target.style.pointerEvents = 'auto'; } catch (e) {}
    // 暴露引用给全局 hover watcher（用于绕过透明遮罩导致的 hover 事件不触发）
    window._dsFactoryPriceHelpIcon = icon;
    if (!icon._dsTooltipBind) {
        icon._dsTooltipBind = true;
        const ensureGlobalTip = function () {
            let g = document.getElementById('ds-global-tooltip');
            if (!g) {
                g = document.createElement('div');
                g.id = 'ds-global-tooltip';
                // tooltip 挂到 body：避免被 #app(Vue) 重渲染移除、也避免被容器 overflow 裁剪
                // 坐标用 getBoundingClientRect() 的视口坐标，fixed 定位最稳定
                g.style.position = 'fixed';
                g.style.background = 'rgba(60, 60, 60, 0.9)';
                g.style.color = '#fff';
                g.style.padding = '6px 10px';
                g.style.borderRadius = '4px';
                g.style.fontSize = '12px';
                g.style.whiteSpace = 'nowrap';
                g.style.boxShadow = '0 6px 16px rgba(0,0,0,0.3)';
                g.style.zIndex = '999999';
                g.style.pointerEvents = 'none';
                g.style.display = 'none';
                g.style.left = '0px';
                g.style.top = '0px';
                g.style.maxWidth = '420px';
                g.style.overflow = 'hidden';
                g.style.textOverflow = 'ellipsis';
                g.style.transform = 'translateZ(0)';
                document.body.appendChild(g);
            }
            return g;
        };
        const showTip = function () {
            const tip = ensureGlobalTip();
            tip.textContent = '数据来源于中国农业农村信息网';
            const r = icon.getBoundingClientRect();
            // fixed + 视口坐标
            let top = r.bottom + 6;
            let left = r.left;
            // 轻微防越界（右侧/下侧）
            const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
            const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
            const maxLeft = Math.max(4, vw - 430); // 420 + padding buffer
            left = Math.min(Math.max(4, left), maxLeft);
            top = Math.min(Math.max(4, top), Math.max(4, vh - 40));
            tip.style.top = Math.round(top) + 'px';
            tip.style.left = Math.round(left) + 'px';
            tip.style.display = 'block';
        };
        const hideTip = function () {
            const tip = document.getElementById('ds-global-tooltip');
            if (tip) tip.style.display = 'none';
        };
        icon.addEventListener('mouseenter', showTip);
        icon.addEventListener('mousemove', showTip);
        icon.addEventListener('mouseleave', hideTip);
    }

    if (!window._dsHoverTipWatcher) {
        window._dsHoverTipWatcher = true;
        const onMove = function (e) {
            let tip = document.getElementById('ds-global-tooltip');
            const ic = window._dsFactoryPriceHelpIcon || app.querySelector('.factory-price-help');
            if (!ic) return;

            // 如果 tip 还没创建（因为 icon 的 mouseenter 没触发），这里主动创建
            if (!tip) {
                tip = document.createElement('div');
                tip.id = 'ds-global-tooltip';
                tip.style.position = 'fixed';
                tip.style.background = 'rgba(109, 108, 108, 0.9)';
                tip.style.color = '#fff';
                tip.style.padding = '6px 10px';
                tip.style.borderRadius = '4px';
                tip.style.fontSize = '12px';
                tip.style.whiteSpace = 'nowrap';
                tip.style.boxShadow = '0 6px 16px rgba(0,0,0,0.3)';
                tip.style.zIndex = '2147483647'; // 尽量置顶
                tip.style.pointerEvents = 'none';
                tip.style.display = 'none';
                tip.style.left = '0px';
                tip.style.top = '0px';
                tip.style.maxWidth = '420px';
                tip.style.overflow = 'hidden';
                tip.style.textOverflow = 'ellipsis';
                tip.style.transform = 'translateZ(0)';
                document.body.appendChild(tip);
            }

            const r = ic.getBoundingClientRect();
            const x = e.clientX, y = e.clientY;
            const inside = x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
            if (inside) {
                tip.textContent = '数据来源于中国农业农村信息网';
                let top = r.bottom + 6;
                let left = r.left;
                const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
                const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
                const maxLeft = Math.max(4, vw - 430);
                left = Math.min(Math.max(4, left), maxLeft);
                top = Math.min(Math.max(4, top), Math.max(4, vh - 40));
                tip.style.top = Math.round(top) + 'px';
                tip.style.left = Math.round(left) + 'px';
                tip.style.display = 'block';
            } else {
                tip.style.display = 'none';
            }
        };
        document.addEventListener('mousemove', onMove, true);
        window.addEventListener('mousemove', onMove, true);
    }
}

// 立即调用一次
setTimeout(getData, 100);

// 定时轮询 (每10秒)
setInterval(getData, 10000);

// 持续注入单位文本 + 日期更新 + 菜单高亮 + 地图纹理（框架每 ~1s 重渲染，注入会被覆盖，需持续补回）
setInterval(function () { injectUnits(); updateFactoryPriceDate(); highlightActiveMenu(); injectFactoryPriceHelpIcon(); injectMapTexture(); }, 1500);

// 首次延迟注入（等 Vue 渲染 + 首次数据加载完成）
setTimeout(function () { injectUnits(); updateFactoryPriceDate(); highlightActiveMenu(); injectFactoryPriceHelpIcon(); injectMapTexture(); }, 500);

// 启动市场切换监听（等 DOM 渲染后）
setTimeout(setupMarketSwitcher, 2000);

// 启动页面导航监听（等 DOM 渲染后）
setTimeout(setupPageNavigation, 2000);

// 调试：打印当前 marketId
//_hideMarketIdFromAddressBar();
console.log('[CustomData] 页面 URL:', window.location.href);
console.log('[CustomData] marketId:', _getCurrentMarketId());

// --- 自定义时间更新逻辑 ---
// 此部分代码用于更新右上角的自定义日期时间显示 (yyyy-MM-dd HH:mm:ss)
// [性能优化] 缓存 DOM 元素引用，避免每秒全量扫描 DOM
(function startCustomTimer() {
    let _cachedTimeEl = null; // 缓存时间显示元素
    let _cacheAttempts = 0;   // 缓存查找尝试次数
    let _timeMainWidthPx = null; // 主时间固定宽度，避免数字变化引起抖动

    function findTimeElement() {
        const app = document.getElementById('app');
        if (!app) return null;
        // 先在 .text-el 中查找
        const textEls = app.querySelectorAll('.text-el');
        for (const el of textEls) {
            const text = el.textContent.trim();
            if (text === 'Loading...' || /^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}/.test(text)) {
                return el;
            }
        }
        // fallback: 查找叶子 div
        const allDivs = app.querySelectorAll('div');
        for (const div of allDivs) {
            if (div.textContent.trim() === 'Loading...' && div.children.length === 0) {
                return div;
            }
        }
        return null;
    }

    function updateTime() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
        const weekDay = weekDays[now.getDay()];
        const mainStr = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        
        // 更新数据集
        if (window._DS_DATA && window._DS_DATA.dataSet) {
            window._DS_DATA.dataSet['系统时间'] = mainStr + ' ' + weekDay;
            window._DS_DATA.dataSet['custom_time_header'] = mainStr + ' ' + weekDay;
            window._DS_DATA.dataSet['系统时间'] = { value: mainStr + ' ' + weekDay };
        }
         
        if (!_cachedTimeEl || !_cachedTimeEl.isConnected) {
            _cachedTimeEl = null;
            if (_cacheAttempts < 10) {
                _cachedTimeEl = findTimeElement();
                _cacheAttempts++;
            }
        }

        if (_cachedTimeEl) {
            let wrap = _cachedTimeEl.querySelector('.' + TIME_WRAP_CLASS);
            if (!wrap) {
                _cachedTimeEl.textContent = '';
                wrap = document.createElement('span');
                wrap.className = TIME_WRAP_CLASS;
                const mainSpan = document.createElement('span');
                mainSpan.className = TIME_MAIN_CLASS;
                const weekSpan = document.createElement('span');
                weekSpan.className = TIME_WEEK_CLASS;
                wrap.appendChild(mainSpan);
                wrap.appendChild(weekSpan);
                _cachedTimeEl.appendChild(wrap);
                _cachedTimeEl.style.fontFamily = 'AlimamaAgileVF-Thin, sans-serif';
                _cachedTimeEl.style.fontSize = '25px';
                if (_timeMainWidthPx == null) {
                    const measurer = document.createElement('span');
                    measurer.style.position = 'absolute';
                    measurer.style.visibility = 'hidden';
                    measurer.style.left = '-99999px';
                    measurer.style.top = '-99999px';
                    measurer.style.fontFamily = _cachedTimeEl.style.fontFamily || 'AlimamaAgileVF-Thin, sans-serif';
                    measurer.style.fontSize = _cachedTimeEl.style.fontSize || '25px';
                    measurer.textContent = '8888-88-88 88:88:88';
                    document.body.appendChild(measurer);
                    _timeMainWidthPx = measurer.offsetWidth;
                    document.body.removeChild(measurer);
                }
                mainSpan.style.display = 'inline-block';
                if (_timeMainWidthPx) mainSpan.style.width = _timeMainWidthPx + 'px';
            }
            const mainEl = wrap.querySelector('.' + TIME_MAIN_CLASS);
            const weekEl = wrap.querySelector('.' + TIME_WEEK_CLASS);
            if (mainEl && weekEl) {
                if (mainEl.textContent !== mainStr) mainEl.textContent = mainStr;
                if (weekEl.textContent !== weekDay) weekEl.textContent = weekDay;
            }
            _cacheAttempts = 0;
        }
    }
    
    // 立即执行一次
    updateTime();
    // 每秒执行
    setInterval(updateTime, 1000);
})();
