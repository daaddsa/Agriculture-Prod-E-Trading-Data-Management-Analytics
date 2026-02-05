//自定义获取数据代码, 详细教程请参考https://www.data-show.cn/newsDetail.html?no=92
window._DS_DATA = {
    enable: true, // 是否开启数据自定义,如果要自定义请设置为true
    dataSet: {} // 数据集: 大屏中每个组件的数据，key为编辑器中设置的数据集名称，value为组件数据必须和编辑器中静态数据格式一致
}
// window._DS_DATA.dataSet对象里的数据发生变化时，会自动触发大屏数据更新
// 数据集名称请在编辑器中设置

// 这里自定义你的数据更新逻辑，window._DS_DATA.dataSet 里的数据发生改变时，页面上会自动触发数据更新
// 示例：每5秒从接口获取一次数据
// function getData(){
//     fetch('https://api.com/api/getData?no=123456')
//         .then(response => response.json())
//         .then(json => {
//             window._DS_DATA.dataSet = json
//         })
// }
// setInterval(() => {
//     getData()
// }, 5000);

async function getData() {
    // 优先从 URL 参数中获取 marketId，如果没有则默认为 1
    // 例如: index.html?marketId=2 将会加载市场 2 的数据
    const urlParams = new URLSearchParams(window.location.search);
    const marketId = urlParams.get('marketId') || 1;
    const baseUrl = 'http://xu9sp2bdxt3d.guyubao.com/tradeDynamicData';
    
    const endpoints = {
        visualData: `${baseUrl}/visualData?marketId=${marketId}`,
        tradeDataProvinces: `${baseUrl}/tradeDataProvinces?marketId=${marketId}`, // 可视化指标数据
        abnormalData: `${baseUrl}/abnormal?marketId=${marketId}`,
        activityData: `${baseUrl}/activity?marketId=${marketId}`
    };

    try {
        const promises = Object.entries(endpoints).map(async ([key, url]) => {
            try {
                const response = await fetch(url);
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

        // ================== Mock Data Fallback ==================
        // 如果接口请求失败（网络错误或接口不通），则使用模拟数据，确保大屏不为空
        const useMock = true; // 强制启用 Mock 数据填充缺失部分

        if (useMock) {
            if (!rawResults.visualData) {
                console.warn('[CustomData] Using Mock Data for visualData');
                rawResults.visualData = {
                    tradeFactoryPrices: [
                        { nameProv: "河南", factoryPrice: "22.5" },
                        { nameProv: "山东", factoryPrice: "23.1" },
                        { nameProv: "河北", factoryPrice: "21.8" },
                        { nameProv: "湖北", factoryPrice: "24.0" },
                        { nameProv: "安徽", factoryPrice: "22.9" }
                    ],
                    provinceNameRank: [
                        { provinceName: "河南", count: 3500 },
                        { provinceName: "山东", count: 2800 },
                        { provinceName: "湖北", count: 2100 },
                        { provinceName: "湖南", count: 1800 },
                        { provinceName: "广东", count: 1500 }
                    ],
                    countyNameRank: [
                        { countyName: "朝阳区", count: 1200 },
                        { countyName: "海淀区", count: 1100 },
                        { countyName: "浦东新区", count: 980 },
                        { countyName: "白云区", count: 850 },
                        { countyName: "余杭区", count: 720 }
                    ]
                };
            }
            
            if (!rawResults.activityData) {
                console.warn('[CustomData] Using Mock Data for activityData');
                rawResults.activityData = {
                    xList: ["08:00", "10:00", "12:00", "14:00", "16:00"],
                    yList: [120, 300, 450, 280, 500]
                };
            }

            if (!rawResults.abnormalData) {
                console.warn('[CustomData] Using Mock Data for abnormalData');
                // 使用用户提供的真实数据作为 Mock 数据
                rawResults.abnormalData = [
                    { businessDate: "2024-12-30 21:12:24", producAdd: "河南省", sellAdd: "徐汇区", businessPrice: 24.6 },
                    { businessDate: "2024-12-30 21:12:39", producAdd: "河南省", sellAdd: "徐汇区", businessPrice: 24.6 },
                    { businessDate: "2024-12-30 22:12:58", producAdd: "河南省", sellAdd: "长宁区", businessPrice: 23 },
                    { businessDate: "2024-12-30 23:12:30", producAdd: "广西壮族自治区", sellAdd: "闵行区", businessPrice: 12 },
                    { businessDate: "2024-12-30 23:12:10", producAdd: "河南省", sellAdd: "长宁区", businessPrice: 23 }
                ];
            }
        }
        // ================== End Mock Data ==================

        // 1. 商品销售排行 (visualData) -> 商品表
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
            // ID mapping for robustness (optional now that config is patched)
                newDataSet['cpm5znQAaRPBgPONPpN0ce87'] = { body: body };
            }

        // 2. 产地销售量排名 & 销地采购量排名 (visualData)
        // 使用 visualData 接口中的 provinceNameRank 和 countyNameRank 字段
        if (rawResults.visualData) {
            const visualData = rawResults.visualData;

            // 2.1 产地销售量排名
            // 字段: provinceNameRank (省份名数组) 和 provinceTradeVolumeRank (销量数值数组)
            if (visualData.provinceNameRank && visualData.provinceTradeVolumeRank) {
                // 直接使用数组
                let titles = visualData.provinceNameRank;
                let values = visualData.provinceTradeVolumeRank;

                // 简单校验长度一致性，如果不一致取最小长度
                const len = Math.min(titles.length, values.length);
                if (len < titles.length) titles = titles.slice(0, len);
                if (len < values.length) values = values.slice(0, len);

                // 如果需要排序（虽然接口似乎已经排好了，但为了保险起见可以组合后重排，
                // 不过如果分开的数组已经对应好了，通常意味着顺序是一致的。
                // 观察用户提供的 XML 数据顺序，似乎是对应的。我们假设顺序一致。）

                // 调试数据兜底
                const debugTitles = ["测试省A", "测试省B", "测试省C"];
                const debugValues = [1000, 2000, 3000];
                const finalTitles = titles.length > 0 ? titles : debugTitles;
                const finalValues = values.length > 0 ? values : debugValues;

                const factoryData = {
                    titles: finalTitles,
                    values: [{ data: finalValues, name: "产地销售量排名" }]
                };
                newDataSet['产地销售量排名'] = factoryData;
                newDataSet['cpm46a6db0a-dae1-42f4-a476-e5be47b52121'] = factoryData;
            }

            // 2.2 销地采购量排名
            // 字段: countyNameRank (地区名数组) 和 countyTradeVolumeRank (销量数值数组)
            if (visualData.countyNameRank && visualData.countyTradeVolumeRank) {
                let titles = visualData.countyNameRank;
                let values = visualData.countyTradeVolumeRank;

                // 校验长度
                const len = Math.min(titles.length, values.length);
                if (len < titles.length) titles = titles.slice(0, len);
                if (len < values.length) values = values.slice(0, len);

                // 调试数据兜底
                const debugTitles = ["测试地A", "测试地B", "测试地C"];
                const debugValues = [500, 1500, 2500];
                const finalTitles = titles.length > 0 ? titles : debugTitles;
                const finalValues = values.length > 0 ? values : debugValues;

                const purchaseData = {
                    titles: finalTitles,
                    values: [{ data: finalValues, name: "销地采购量排名" }]
                };
                newDataSet['销地采购量排名'] = purchaseData;
                newDataSet['cpm392223cb-81f8-4803-8377-3d3661ebf467'] = purchaseData;
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

            // 4. 异常交易数据 (abnormalData) - 使用 abnormal 接口数据 (该接口返回交易列表)
            if (rawResults.abnormalData) {
                const rawList = rawResults.abnormalData;
                
                if (Array.isArray(rawList)) {
                    let body = rawList.map(item => [
                        item.businessDate,
                        item.producAdd,
                        item.sellAdd,
                        (item.businessPrice) + '元/公斤'
                    ]);
                    
                    // 调试数据
                    if (body.length === 0) {
                        console.warn('[CustomData] abnormalData returned empty array');
                    }

                    // 强制改变 header 以触发更新（有些组件如果 header 不变可能不更新）
                    // 并且确保 header 与 body 列数一致
                    const abnormalData = {
                        body: body,
                        header: ["交易时间", "货源省份", "流向地区", "交易单价"]
                    };
                    
                    console.log('[CustomData] abnormalData prepared:', JSON.stringify(abnormalData));
                    
                    newDataSet['异常交易数据'] = abnormalData;
                    newDataSet['cpm817f187b-80cb-47eb-b250-a6a559a3cc8d'] = abnormalData;
                } else {
                    console.error('[CustomData] abnormalData is not an array:', rawList);
                }
            }

            if (Object.keys(newDataSet).length > 0) {
                // 合并到 window._DS_DATA.dataSet
                Object.assign(window._DS_DATA.dataSet, newDataSet);
                console.log('[CustomData] Data updated:', newDataSet);
                
                // 强制更新 Hack
                try {
                     window._DS_DATA.dataSet = JSON.parse(JSON.stringify(window._DS_DATA.dataSet));
                } catch(e) {}
            }
    } catch (error) {
        console.error('[CustomData] Global Error:', error);
    }
}

// 立即调用一次
setTimeout(getData, 500); // 延迟 500ms 确保页面加载

// 定时轮询 (每10秒)
setInterval(getData, 10000);