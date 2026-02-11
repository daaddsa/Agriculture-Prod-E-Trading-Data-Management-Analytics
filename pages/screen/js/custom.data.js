
//自定义获取数据代码, 详细教程请参考https://www.data-show.cn/newsDetail.html?no=92
window._DS_DATA = {
    enable: true, // 是否开启数据自定义,如果要自定义请设置为true
    dataSet: {} // 数据集: 大屏中每个组件的数据，key为编辑器中设置的数据集名称，value为组件数据必须和编辑器中静态数据格式一致
}
// window._DS_DATA.dataSet对象里的数据发生变化时，会自动触发大屏数据更新
// 数据集名称请在编辑器中设置

// 这里自定义你的数据更新逻辑，window._DS_DATA.dataSet 里的数据发生改变时，页面上会自动触发数据更新

async function getData() {
    // 优先从 URL 参数中获取 marketId，如果没有则默认为 1
    // 例如: index.html?marketId=2 将会加载市场 2 的数据
    const urlParams = new URLSearchParams(window.location.search);
    const marketId = urlParams.get('marketId') || 1;
    
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

        // 更新数据集
        const newDataSet = {};

        // 1. 商品销售排行 (visualData) -> 商品表
        // 先重置所有核心指标为 0（防止切换市场时旧数据缓存残留）
        newDataSet['交易总量'] = 0;
        newDataSet['交易金额'] = 0;
        newDataSet['交易均价'] = 0;
        newDataSet['交易均价(不含异常)'] = 0;
        newDataSet['屠宰场数量'] = 0;
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
                newDataSet['屠宰场数量'] = parseInt(visualData.abattoirNum);
            }
            if (visualData.purchaserNum != null) {
                newDataSet['采购商数量'] = parseInt(visualData.purchaserNum);
            }
            console.log('[CustomData] 核心指标:', {
                交易总量: newDataSet['交易总量'],
                交易金额: newDataSet['交易金额'],
                交易均价: newDataSet['交易均价'],
                屠宰场数量: newDataSet['屠宰场数量'],
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
                    titles: titles,
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
                    titles: titles,
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
                
                // 列宽总和需 ≤ 表格组件宽度 568px，否则最后一列「交易单价」会被挤出看不见
                const abnormalData = {
                    body: body,
                    header: ["交易时间", "货源省份", "流向地区", "交易单价"],
                    columnWidth: [168, 110, 110, 180]
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

                const existingNames = new Set(provinceMapData.map(item => item.name));
                allProvinces.forEach(name => {
                    if (!existingNames.has(name)) {
                        // 如果是需要高亮的省份，设置特定值 9.49；否则设为 0
                        const defaultVal = highlightProvinces.includes(name) ? 9.49 : 0;
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
            const markets = rawResults.tradeMarketData;
            window._DS_MARKET_LIST = markets;
            console.log('[CustomData] 市场列表:', markets.map(m => m.marketId + '-' + m.marketName));
            
            // 将 API 返回的市场名称补充到映射表中
            markets.forEach(m => {
                MARKET_NAME_MAP[m.marketName] = m.marketId;
            });
            
            // 根据当前 marketId 更新下拉框显示文本
            const currentMarket = markets.find(m => String(m.marketId) === String(marketId));
            if (currentMarket) {
                updateMarketDropdownText(currentMarket.marketName);
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

            // 数据更新后，延迟注入单位文本
            setTimeout(injectUnits, 200);
        } else {
            console.warn('[CustomData] No data prepared to update!');
        }
    } catch (error) {
        console.error('[CustomData] Global Error:', error);
    }
}

// =====================================================
// 市场下拉框：名称同步 + 切换跳转
// 1. 更新下拉框显示文本为当前市场名称
// 2. 拦截下拉选项点击，使用 window.location.href 强制跳转
//    （绕过 selectLink 组件的 SPA 内部路由，确保页面真正刷新）
// =====================================================
const SELECT_COMPONENT_ID = 'cpme41cb160-0568-4114-90c8-c847a9d8aa0b';

// 市场名称 → marketId 映射（静态兜底 + 动态API补充）
const MARKET_NAME_MAP = {
    '上海西郊国际农产品交易中心': 1,
    '上海农产品中心批发市场': 2,
    '上海农产品中心批发市场经营管理有限公司': 2,
    '江苏无锡朝阳农产品大市场': 3,
    '江苏苏州农产品大市场': 4
};

// =====================================================
// 下拉框文本：已在 app.data.readable.js 的导出前根据 URL marketId
// 动态设置 DS_CONFIG[selectKey].style.text，框架渲染时自带正确文本
// 此处只需保留市场切换的点击拦截（将框架的路由跳转改为整页刷新）
// =====================================================
function updateMarketDropdownText() {
    // 文本已由 app.data.readable.js 中的预处理逻辑设置，无需额外操作
}

function setupMarketSwitcher() {
    const urlParams = new URLSearchParams(window.location.search);
    const currentId = String(urlParams.get('marketId') || '1');

    document.addEventListener('click', function (e) {
        const clickedText = e.target.textContent.trim();
        if (!clickedText || clickedText.length < 4) return;

        // 精确匹配：静态映射表
        let targetId = MARKET_NAME_MAP[clickedText] || null;

        // 精确匹配：API 动态列表
        if (!targetId && window._DS_MARKET_LIST) {
            const m = window._DS_MARKET_LIST.find(m => m.marketName === clickedText);
            if (m) targetId = m.marketId;
        }

        if (targetId && String(targetId) !== currentId) {
            e.preventDefault();
            e.stopPropagation();
            console.log('[CustomData] 切换市场:', currentId, '→', targetId);
            window.location.href = window.location.pathname + '?marketId=' + targetId;
        }
    }, true);

    console.log('[CustomData] 市场切换监听已启动, 当前 marketId:', currentId);
}

// =====================================================
// 方案3（最终版）：直接在数字 DOM 元素内部注入单位 <span>
// 原理：在 DOM 中找到包含数字值的叶子元素，在其内部追加单位文字
//       单位自然排在数字后面（inline 流式布局），无需计算坐标
//       用 setInterval 持续注入，对抗框架的周期性重渲染
// =====================================================

const UNIT_LABELS = [
    { dataSetName: '交易总量',          unit: ' 公斤' },
    { dataSetName: '交易金额',          unit: ' 万元' },
    { dataSetName: '交易均价',          unit: ' 元/公斤' },
    { dataSetName: '交易均价(不含异常)',  unit: ' 元/公斤' },
    { dataSetName: '屠宰场数量',        unit: ' 家' },
    { dataSetName: '采购商数量',        unit: ' 家' },
];

const UNIT_MARKER_CLASS = 'ds-injected-unit';
const NUM_LEFT_ALIGN_CLASS = 'ds-num-left-align';

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

        // 检查是否已存在正确的 unit span
        let unitSpan = valEl.querySelector('.' + UNIT_MARKER_CLASS);
        if (unitSpan && unitSpan.textContent === unit) return; // 已正确，无需重复操作

        // 通过 CSS class 强制左对齐 + 允许溢出（!important 保证不被框架覆盖）
        valEl.classList.add(NUM_LEFT_ALIGN_CLASS);
        numEl.classList.add(NUM_LEFT_ALIGN_CLASS);
        if (numEl.parentElement) {
            numEl.parentElement.classList.add(NUM_LEFT_ALIGN_CLASS);
        }
        if (numEl.parentElement && numEl.parentElement.parentElement) {
            numEl.parentElement.parentElement.classList.add(NUM_LEFT_ALIGN_CLASS);
        }

        // 创建或更新 unit span
        if (!unitSpan) {
            unitSpan = document.createElement('span');
            unitSpan.className = UNIT_MARKER_CLASS;
            valEl.appendChild(unitSpan);
        }
        unitSpan.textContent = unit;
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
// 跳转时自动携带当前 marketId 参数
// =====================================================
const PAGE_NAV_MAP = {
    '历史查询': '../history/index.html',
    '数据分析': '../analysis/index.html',
    '分析报告': '../analysis/index.html',  // 兼容旧文本
};

function setupPageNavigation() {
    const urlParams = new URLSearchParams(window.location.search);
    const marketId = urlParams.get('marketId') || '1';

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

        // 携带当前 marketId 跳转
        const targetUrl = targetPath + '?marketId=' + marketId;
        console.log('[CustomData] 页面跳转:', clickedText, '→', targetUrl);
        window.location.href = targetUrl;
    }, true);

    console.log('[CustomData] 页面导航监听已启动');
}

// =====================================================
// 屠宰场出厂价日期：从 API factoryPriceDate 动态更新
// 替换 app.data.readable.js 中写死的静态日期文本
// =====================================================
function updateFactoryPriceDate() {
    const dateStr = window._DS_FACTORY_PRICE_DATE;
    if (!dateStr) return;

    // "2026-01-23" → "2026年1月23日"
    const parts = dateStr.split('-');
    if (parts.length !== 3) return;
    const formatted = parseInt(parts[0]) + '年' + parseInt(parts[1]) + '月' + parseInt(parts[2]) + '日';

    const app = document.getElementById('app');
    if (!app) return;

    // 找到匹配 "XXXX年X月X日" 格式的叶子文本元素并替换
    const els = app.querySelectorAll('div, span, p');
    for (const el of els) {
        if (el.children.length > 0) continue;
        const text = el.textContent.trim();
        if (/^\d{4}年\d{1,2}月\d{1,2}日$/.test(text) && text !== formatted) {
            el.textContent = formatted;
            return;
        }
    }
}

// 立即调用一次
setTimeout(getData, 100);

// 定时轮询 (每10秒)
setInterval(getData, 10000);

// 持续注入单位文本 + 日期更新 + 菜单高亮 + 地图纹理（框架每 ~1s 重渲染，注入会被覆盖，需持续补回）
setInterval(function () { injectUnits(); updateFactoryPriceDate(); highlightActiveMenu(); injectMapTexture(); }, 1500);

// 首次延迟注入（等 Vue 渲染 + 首次数据加载完成）
setTimeout(function () { injectUnits(); updateFactoryPriceDate(); highlightActiveMenu(); injectMapTexture(); }, 500);

// 启动市场切换监听（等 DOM 渲染后）
setTimeout(setupMarketSwitcher, 2000);

// 启动页面导航监听（等 DOM 渲染后）
setTimeout(setupPageNavigation, 2000);

// 调试：打印当前 marketId
console.log('[CustomData] 页面 URL:', window.location.href);
console.log('[CustomData] marketId:', new URLSearchParams(window.location.search).get('marketId') || '1(默认)');

// --- 自定义时间更新逻辑 ---
// 此部分代码用于更新右上角的自定义日期时间显示 (yyyy-MM-dd HH:mm:ss)
(function startCustomTimer() {
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
        
        const timeStr = `${year}-${month}-${day} ${hours}:${minutes}:${seconds} ${weekDay}`;
        
        // 更新数据集
         if (window._DS_DATA && window._DS_DATA.dataSet) {
             // 尝试多种绑定方式
             window._DS_DATA.dataSet['系统时间'] = timeStr;
             window._DS_DATA.dataSet['custom_time_header'] = timeStr;
             // 部分组件可能需要对象格式
             window._DS_DATA.dataSet['系统时间'] = { value: timeStr };
         }
         
         // DOM 直接操作 (Fallback)
         // 查找内容为 Loading... 或符合时间格式的 TextElement
         const app = document.getElementById('app');
         if (app) {
             // 查找 text-el 类的元素
             const textEls = app.querySelectorAll('.text-el');
             let updated = false;
             for (const el of textEls) {
                 const text = el.textContent.trim();
                 // 匹配 "Loading..." 或者 已经是时间格式 "2026-..." (包含可能的星期几)
                 // 允许包含中文
                 if (text === 'Loading...' || /^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}/.test(text)) {
                     // 只有当内容确实变化时才更新，避免闪烁
                     if (el.textContent !== timeStr) {
                         el.textContent = timeStr;
                         // 强制样式 (参考 custom.data.js 中的其他 hacks)
                         el.style.fontFamily = 'AlimamaAgileVF-Thin, sans-serif';
                         el.style.fontSize = '25px';
                     }
                     updated = true;
                     break; // 假设只有一个
                 }
             }
             
             // 如果没找到 .text-el，尝试查找所有包含 Loading... 的 div
             if (!updated) {
                 const allDivs = app.querySelectorAll('div');
                 for (const div of allDivs) {
                     if (div.textContent.trim() === 'Loading...' && div.children.length === 0) {
                          div.textContent = timeStr;
                          div.style.fontFamily = 'AlimamaAgileVF-Thin, sans-serif';
                          div.style.fontSize = '25px';
                          break;
                     }
                 }
             }
         }
     }
    
    // 立即执行一次
    updateTime();
    // 每秒执行
    setInterval(updateTime, 1000);
})();
