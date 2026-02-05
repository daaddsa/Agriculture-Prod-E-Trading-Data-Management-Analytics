
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
            // ID mapping for robustness
            newDataSet['cpm5znQAaRPBgPONPpN0ce87'] = { body: body };
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
