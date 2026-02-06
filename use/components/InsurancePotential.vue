<template>
  <div class="insurance-potential">
    <div class="insurance-potential-container">
      <div class="category-selector">
        <Dropdown>
          <template #overlay>
            <Menu @click="handleMenuClick">
              <MenuItem v-for="item in cateDataLevel2" :key="item.id">
                {{ item.name }}
              </MenuItem>
            </Menu>
          </template>
          <a-button>
            {{ cateSelect || '选择种类' }}
            <DownOutlined />
          </a-button>
        </Dropdown>
      </div>
      <div class="map-and-card-container">
        <div class="map-container">
          <div ref="chartRef" :style="{ height, width }"></div>
        </div>
        <div class="card-container">
          <div class="card">
            <h3 class="card-title">基于金融理论与数据技术的农产品保险智能测算器</h3>
            <div class="card-content">
              资产定价模型 · VaR · CVaR · 金融时序算法 · 数据科技支撑
            </div>
            <div class="start-button" @click="goRouter()">
              <div class="start-button_text">开始测算</div>
              <img :src="PngRight1" alt="开始测算" class="start-button_icon" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { onMounted, ref, watch } from 'vue';
  // import * as echarts from 'echarts';
  import { useECharts } from '@/hooks/web/useECharts';
  import { registerMap } from 'echarts';
  // import { mapData } from './data';
  import { bizIndexQueryRegionList } from '@/api/farm/homeApi';
  import { Dropdown, Menu, MenuItem } from 'ant-design-vue';
  import { DownOutlined } from '@ant-design/icons-vue';
  import { bizProductCateQueryList } from '@/api/farm/cateApi';
  import PngRight1 from '@/assets/images/right-1.png';

  const emit = defineEmits(['router']);
  const props = defineProps({
    data: {
      type: Array,
      default: () => [],
    },
  });
  watch(
    () => props.data,
    (newVal) => {
      if (newVal && newVal.length) {
        cateData.value = newVal;
        cateDataLevel2.value = [
          { id: '', name: '全部' },
          ...cateData.value.map((ele: any) => ({
            id: ele.id,
            name: ele.frontName || ele.name,
          })),
        ];
      }
    },
    { immediate: true },
  );
  const chartRef = ref<any>(null);
  const { setOptions } = useECharts(chartRef);
  const width = ref('100%');
  const height = ref('500px');
  const mapOption = ref({});
  const chartData = ref([]);
  const cateData = ref<any>([]);
  const cateDataLevel2 = ref<any>([]);
  const cateSelect = ref(''); // 选择的种类
  onMounted(async () => {
    const json = (await (await import('./china.json')).default) as any;
    registerMap('china', json);
    setMapOptions();
    cateData.value = props.data;
    cateDataLevel2.value = [{ id: '', name: '全部' }, ...cateData.value];
  });
  function goRouter() {
    emit('router', { path: 'frontCalc', configId: 1 });
  }

  function handleMenuClick(e) {
    cateSelect.value = cateDataLevel2.value.filter((item) => item.id === e.key)[0]?.name || '';
    setMapOptions(e.key);
  }

  async function setMapOptions(cateId = '') {
    // registerMap('china', chinaJson);
    chartData.value = await bizIndexQueryRegionList({ cateId });

    mapOption.value = {
      visualMap: [
        {
          min: 0,
          max: 10,
          left: 'left',
          top: 'bottom',
          text: ['高', '低'],
          calculable: false,
          orient: 'horizontal',
          inRange: {
            color: ['#b7e8cf', '#2e886d'],
            symbolSize: [30, 100],
          },
        },
      ],
      tooltip: {
        trigger: 'item',
        padding: 10,
        borderWidth: 1,
        borderColor: '#19a653',
        backgroundColor: 'rgba(255,255,255,0.8)',
        textStyle: {
          color: '#000000',
          fontSize: 14,
        },
        formatter: function (a, b) {
          if (a['data'] === undefined) {
            return '';
          }
          let str = `<strong>${a['name']}</strong> <br />`;
          if (Array.isArray(a['data'].data) && a['data']?.data.length != 0) {
            str += a['data'].data
              .map((item, index) => {
                if (index === a['data'].data.length - 1) {
                  return `<span>${item.name}</span>`;
                }
                if (index === 3) {
                  return `<span>${item.name} </span><br />`;
                }
                return `<span>${item.name} 、</span>`;
              })
              .join('');
          }
          return str;
        },
      },
      series: [
        {
          name: '产品信息',
          // roam: true,
          type: 'map',
          map: 'china',
          top: '160px',
          zoom: 1.7,
          label: {
            show: true,
            fontSize: 10,
            color: '#ffffff',
          },
          itemStyle: {
            areaColor: '#2f82ce',
            borderColor: '#0DAAC1',
            // 正常状态下的样式
            normal: {
              color: '#b7e8cf', // 浅绿色（RGB值：135, 229, 157）
              // borderColor: '#fff', // 边框颜色（可选）
            },
          },
          data: chartData.value.map((item: any) => {
            return {
              name: item.name,
              value: item.value,
              data: item.data,
            };
          }),
        },
      ],
    };
    setOptions(mapOption.value);
  }
</script>

<style scoped lang="less">
  .insurance-potential {
    position: relative;
    width: 100%;
    min-height: 100vh;
    margin-bottom: 60px;
    padding-top: 20vh;
    padding-bottom: 40px;
    background: url('') no-repeat center center;
    box-sizing: border-box;
  }

  .insurance-potential-container {
    position: relative;
    width: 1200px;
    margin: 0 auto;
    text-align: center;
  }

  .title {
    margin-bottom: 30px;
    font-size: 24px;
    font-weight: bold;
    text-align: center;
  }

  .category-selector {
    position: absolute;
    z-index: 999;
    top: 0;
    left: 10px;
    text-align: center;

    .ant-dropdown-link {
      color: #19a653;
      font-size: 16px;
      font-weight: bold;
    }
  }

  .map-and-card-container {
    display: flex;
    position: relative;
    justify-content: space-around;
  }

  .map-container {
    width: 60%;
  }

  .map-echarts {
    width: 100%;
    height: 400px;
  }

  .card-container {
    position: relative;
    margin-top: 100px;
  }

  .card {
    width: 500px;
    padding: 20px;
    color: #fff;
    text-align: left;
  }

  .card-title {
    width: 100%;
    margin-bottom: 10px;
    color: #fff;
    font-size: 36px;
    font-style: normal;
    font-weight: 600;
    line-height: 1.5;
    text-align: center;
    text-align: left;
  }

  .card-content {
    margin-bottom: 16px;
    color: #c5c3c3;
    font-size: 15px;
    font-style: normal;
    font-weight: 400;
    line-height: 1.4;
    line-height: 22px;
    text-align: left;
  }

  .start-button {
    display: flex;
    align-items: center;
    width: 180px;
    margin-top: 100px;
    color: #fff;
    cursor: pointer;

    &_text {
      font-size: 16px;
      font-style: normal;
      font-weight: 400;
      text-align: left;
    }

    &_icon {
      width: 40px;
      height: 40px;
      margin-left: 18px;
    }
  }

  ::v-deep(.category-selector .ant-btn-default) {
    width: 120px;
    height: 40px;
    border-radius: 10px;
    opacity: 0.52;
    background: #d4d4d4;
    color: #292121;
    backdrop-filter: blur(10px);
  }
</style>
