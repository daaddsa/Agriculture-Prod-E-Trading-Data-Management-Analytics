<template>
  <div ref="testEl" id="testEl">
    <Header data-aos="fade-up" />
    <div class="video-content w-full h-full opacity-90 animate-slow-zoom">
      <div class="loading-wrapper" v-if="!isImgLoaded">
        <Spin size="large" tip="Loading..." />
      </div>
      <img
        :src="indexImg"
        alt=""
        @load="handleImgLoad"
        :class="{ loaded: isImgLoaded }"
        class="hero-image"
      />
      <div class="dark-mask"></div>
      <div class="stars-container">
        <div class="star-layer layer-1"></div>
        <div class="star-layer layer-2"></div>
        <div class="star-layer layer-3"></div>
      </div>
    </div>
    <InsurancePotential @router="goRouter" :data="potentialData" />
    <div class="main">
      <ProductTypes :data="typesData" v-if="typesData.length" @router="goRouter" />
    </div>
    <div class="main--bg">
      <AnalysisReports
        class="main"
        :data="reportData"
        :has-foot="true"
        v-if="reportData.length"
        @router="goRouter"
      />
    </div>
    <InsuranceNews :data="insuranceData" v-if="insuranceData.length" @router="goRouter" />
    <Footer />
  </div>
</template>

<script setup lang="ts">
  import { onMounted, ref } from 'vue';
  import { useRouter } from 'vue-router';
  import { Spin } from 'ant-design-vue';
  import ProductTypes from './components/ProductTypes.vue';
  import AnalysisReports from './components/AnalysisReports.vue';
  import InsuranceNews from './components/InsuranceNews.vue';
  import InsurancePotential from './components/InsurancePotential.vue';
  import Footer from './components/Footer.vue';
  import Header from './components/Header.vue';
  import {
    bizIndexQueryCateList,
    bizIndexQueryReportList,
    bizIndexQueryInsuranceList,
  } from '@/api/farm/homeApi';
  import { nanoid } from 'nanoid';
  import indexImg from '@/assets/images/index.avif';
  import Flatten from 'lodash-es/flatten';

  const router = useRouter();

  const typesData = ref<any[]>([]);
  const insuranceData = ref<any[]>([]);
  const reportData = ref<any[]>([]);
  const isImgLoaded = ref(false);
  const potentialData = ref<any[]>([]);
  onMounted(async () => {
    await getData();
  });

  function handleImgLoad() {
    isImgLoaded.value = true;
  }

  async function getData() {
    const resTypeData = await bizIndexQueryCateList({
      orders: [{ field: 'analysisSort', direction: 'DESC' }],
    });
    if (resTypeData.length) {
      const filterData = resTypeData.map((item: any) => {
        return item?.childNames;
      });
      typesData.value = Flatten(filterData);
    }
    const potentialDataRes = await bizIndexQueryCateList({
      indexShow: true,
      orders: [{ field: 'indexShowSort', direction: 'DESC' }],
    });
    potentialData.value = potentialDataRes[0]?.childNames || [];
    const resInsuranceData = await bizIndexQueryInsuranceList({
      pageNum: 1,
      pageSize: 8,
    });
    console.log('🚀 ~ getData ~ resInsuranceData:', resInsuranceData.data);
    if (resInsuranceData?.data?.length) {
      insuranceData.value = resInsuranceData.data?.map((ele) => {
        return {
          ...ele,
          uid: nanoid(),
          id: ele.id + '_' + nanoid(5),
        };
      });
    }
    const resReportData = await bizIndexQueryReportList({
      pageNum: 1,
      pageSize: 4,
    });
    if (resReportData?.data?.length) {
      reportData.value = resReportData.data;
    }
  }

  function goRouter(data) {
    console.log('🚀 ~ goRouter ~ data:', data);
    if (data.path === 'frontNews' && data.type != 'all') {
      window.location.href = data.data?.url;
    } else {
      router.push(data?.data?.path || data?.path);
    }
  }
</script>

<style lang="less" scoped>
  @import url('./index.less');

  .test {
    display: flex;
    position: fixed;
    z-index: 9999;
    top: 0;
    left: 0;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 50px;
    background-color: rgb(255 255 255 / 80%);
    color: #333;
    font-size: 16px;
  }

  .main--bg {
    padding: 50px 0;
    background-color: #f8f8f8;
  }

  .video-content {
    position: absolute;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    overflow: hidden;

    // &::after {
    //   content: '';
    //   position: absolute;
    //   top: 0;
    //   left: 0;
    //   width: 100%;
    //   height: 100%;
    //   background-color: rgb(0 0 0 / 20%);
    // }

    & img.hero-image {
      width: 100%;
      height: 100%;
      transition: opacity 1s ease-in-out;
      opacity: 0;
      object-fit: cover;

      &.loaded {
        opacity: 1;
      }
    }
  }

  .loading-wrapper {
    position: absolute;
    z-index: 10;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  .dark-mask {
    position: absolute;
    z-index: 1;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(to bottom, rgb(0 0 0 / 20%), rgb(0 0 0 / 60%));
    pointer-events: none;
  }

  .stars-container {
    position: absolute;
    z-index: 2;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    pointer-events: none;
  }

  .star-layer {
    position: absolute;
    top: 0;
    left: 0;
    width: 1px;
    height: 1px;
    border-radius: 50%;
    background: transparent;
  }

  .layer-1 {
    animation: moveUp 50s linear infinite;
    opacity: 0.8;
    box-shadow:
      10vw 10vh #fff,
      20vw 80vh #fff,
      50vw 50vh #fff,
      80vw 20vh #fff,
      90vw 90vh #fff,
      30vw 40vh #fff,
      70vw 60vh #fff,
      40vw 10vh #fff,
      60vw 30vh #fff,
      15vw 70vh #fff,
      85vw 15vh #fff,
      25vw 55vh #fff,
      75vw 45vh #fff,
      35vw 25vh #fff,
      65vw 85vh #fff,
      5vw 35vh #fff,
      95vw 65vh #fff,
      45vw 75vh #fff,
      55vw 5vh #fff,
      10vw 95vh #fff,
      10vw 110vh #fff,
      20vw 180vh #fff,
      50vw 150vh #fff,
      80vw 120vh #fff,
      90vw 190vh #fff,
      30vw 140vh #fff,
      70vw 160vh #fff,
      40vw 110vh #fff,
      60vw 130vh #fff,
      15vw 170vh #fff,
      85vw 115vh #fff,
      25vw 155vh #fff,
      75vw 145vh #fff,
      35vw 125vh #fff,
      65vw 185vh #fff,
      5vw 135vh #fff,
      95vw 165vh #fff,
      45vw 175vh #fff,
      55vw 105vh #fff,
      10vw 195vh #fff;
  }

  .layer-2 {
    width: 2px;
    height: 2px;
    animation: moveUp 35s linear infinite;
    opacity: 0.6;
    box-shadow:
      12vw 12vh #fff,
      22vw 82vh #fff,
      52vw 52vh #fff,
      82vw 22vh #fff,
      92vw 92vh #fff,
      32vw 42vh #fff,
      72vw 62vh #fff,
      42vw 12vh #fff,
      62vw 32vh #fff,
      17vw 72vh #fff,
      87vw 17vh #fff,
      27vw 57vh #fff,
      77vw 47vh #fff,
      37vw 27vh #fff,
      67vw 87vh #fff,
      7vw 37vh #fff,
      97vw 67vh #fff,
      47vw 77vh #fff,
      57vw 7vh #fff,
      12vw 97vh #fff,
      12vw 112vh #fff,
      22vw 182vh #fff,
      52vw 152vh #fff,
      82vw 122vh #fff,
      92vw 192vh #fff,
      32vw 142vh #fff,
      72vw 162vh #fff,
      42vw 112vh #fff,
      62vw 132vh #fff,
      17vw 172vh #fff,
      87vw 117vh #fff,
      27vw 157vh #fff,
      77vw 147vh #fff,
      37vw 127vh #fff,
      67vw 187vh #fff,
      7vw 137vh #fff,
      97vw 167vh #fff,
      47vw 177vh #fff,
      57vw 107vh #fff,
      12vw 197vh #fff;
  }

  .layer-3 {
    width: 3px;
    height: 3px;
    animation: moveUp 20s linear infinite;
    opacity: 0.4;
    box-shadow:
      14vw 14vh #fff,
      24vw 84vh #fff,
      54vw 54vh #fff,
      84vw 24vh #fff,
      94vw 94vh #fff,
      34vw 44vh #fff,
      74vw 64vh #fff,
      44vw 14vh #fff,
      64vw 34vh #fff,
      19vw 74vh #fff,
      89vw 19vh #fff,
      29vw 59vh #fff,
      79vw 49vh #fff,
      39vw 29vh #fff,
      69vw 89vh #fff,
      9vw 39vh #fff,
      99vw 69vh #fff,
      49vw 79vh #fff,
      59vw 9vh #fff,
      14vw 99vh #fff,
      14vw 114vh #fff,
      24vw 184vh #fff,
      54vw 154vh #fff,
      84vw 124vh #fff,
      94vw 194vh #fff,
      34vw 144vh #fff,
      74vw 164vh #fff,
      44vw 114vh #fff,
      64vw 134vh #fff,
      19vw 174vh #fff,
      89vw 119vh #fff,
      29vw 159vh #fff,
      79vw 149vh #fff,
      39vw 129vh #fff,
      69vw 189vh #fff,
      9vw 139vh #fff,
      99vw 169vh #fff,
      49vw 179vh #fff,
      59vw 109vh #fff,
      14vw 199vh #fff;
  }

  @keyframes moveUp {
    from {
      transform: translateY(0);
    }

    to {
      transform: translateY(-100vh);
    }
  }
</style>
