//自定义获取数据代码, 详细教程请参考https://www.data-show.cn/newsDetail.html?no=92
window._DS_DATA = {
    enable: false, // 是否开启数据自定义,如果要自定义请设置为true
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