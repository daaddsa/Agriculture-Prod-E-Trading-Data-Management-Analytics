<template>
  <div>
    <div class="w-full">
      <header :class="['header-container', isSysIndex ? 'header-container--sysIndex' : '']">
        <!-- <img :src="HeaderLogo" :alt="platformName" class="logo" /> -->
        <div class="flex items-center cursor-pointer" @click="goRouter('/sysIndex')">
          <img :src="HeaderLogo" :alt="platformName" class="logo" />
          <div class="flex flex-col ml-2 header-container_title">
            <span class="font-bold text-size-2xl">农产品价格保险智能服务平台</span>
            <span class="text-sm">
              Agricultural Income Insurance Intelligent Service Platform (AIIS)
            </span>
          </div>
        </div>
        <div class="contact">
          <!-- <div class="contact-info">
            <span class="icon">📞</span> <span class="text">联系电话</span>
          </div>
          <div class="contact-phone">{{ phoneNumber }}</div> -->
        </div>
      </header>
      <nav class="nav-container">
        <div class="container">
          <router-link
            v-for="item in navData"
            :key="item.name"
            :to="item.to"
            :class="['nav-item', route.path == item.to ? 'active' : '']"
          >
            {{ item.name }}
          </router-link>
          <UserDropDown :theme="getHeaderTheme" />
        </div>
      </nav>
      <!-- <div class="nav-bottom" v-if="secondNav.length > 0">
        <div class="container">
          <router-link
            v-for="item in secondNav"
            :key="item.name"
            :to="item.to"
            :class="['nav-item', route.fullPath == item.to ? 'active' : '']"
          >
            {{ item.name }}
          </router-link>
        </div>
      </div> -->
    </div>
  </div>
</template>
<script lang="ts" setup>
  import { onMounted, reactive, ref, watch } from 'vue';

  import { useHeaderSetting } from '@/hooks/setting/useHeaderSetting';
  import HeaderLogo from '@/assets/images/_logo.png';
  import { UserDropDown } from '@/layouts/default/header/components/index';

  import { useRoute, useRouter } from 'vue-router';

  import { listDictModelBatch } from '@/api/common';

  import { bizIndexQueryCateList } from '@/api/farm/homeApi';

  const router = useRouter();
  const bizDictOptions = reactive<any>({});
  const bizDictData = ref([
    { key: 'farm_report', dictCode: 'farm_report' },
    { key: 'farm_news', dictCode: 'farm_news' },
    { key: 'farm_category', dictCode: 'farm_category' },
  ]);
  onMounted(async () => {
    // console.log('🚀 ~ route.path:', route);
    if (route.path === '/sysIndex') {
      isSysIndex.value = true;
      return;
    }
    await getDictData();
  });

  // 平台名称
  const platformName = '农产品价格保险智能服务平台';
  // 联系电话
  const phoneNumber = '136-7890-7734';

  const navData = reactive([
    { to: '/sysIndex', name: '首页' },
    { to: '/frontCategory', name: '品种分析' },
    { to: '/frontCalc', name: '智能测算' },
    { to: '/frontReport', name: '分析报告' },
    { to: '/frontNews', name: '保险资讯' },
    { to: '/frontContact', name: '联系我们' },
  ]);
  const isSysIndex = ref(false);
  const secondNav = ref<any[]>([]);

  const route = useRoute();

  watch(
    () => route,
    async (val) => {
      if (route.path === '/sysIndex') {
        isSysIndex.value = true;
        return;
      }
      if (!bizDictOptions?.farm_report || !bizDictOptions?.farm_news) {
        await getDictData();
      }
      if (val.path === '/frontNews') {
        secondNav.value = bizDictOptions?.farm_news.map((ele: any) => ({
          to: `/frontNews?cate=${ele.value}`,
          name: ele.label,
        }));
      } else if (val.path === '/frontReport') {
        secondNav.value = bizDictOptions?.farm_report.map((ele: any) => ({
          to: `/frontReport?cate=${ele.value}`,
          name: ele.label,
        }));
      } else if (val.path === '/frontCategory') {
        const res = await bizIndexQueryCateList({});
        const data = [...res[0].childNames, ...res[1].childNames];
        secondNav.value = data.map((ele: any) => ({
          to: `/frontCategory?cateId=${ele.id}&cateTitle=${ele.name}`,
          name: ele.name,
        }));
      } else {
        secondNav.value = [];
      }
    },
    { immediate: true },
  );

  const { getHeaderTheme } = useHeaderSetting();

  async function getDictData() {
    const res = await listDictModelBatch(bizDictData.value.map((ele) => ele.dictCode));
    for (const i in res) {
      const filter = bizDictData.value.filter((ele) => ele.dictCode == i)[0];
      bizDictOptions[filter.key] = res[i];
    }
  }

  function goRouter(path: string) {
    console.log('🚀 ~ goRouter ~ path:', path);
    router.push({ path });
  }
</script>
<style lang="less">
  // @import url('./index.less');

  .container {
    display: flex;
    align-items: center;
    width: 1200px;
    height: 100%;
    margin: 0 auto;
  }

  .header-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 1200px;
    height: 80px;
    margin: 0 auto;
    border-bottom: 1px solid #e0e0e0;
    background-color: white;

    &--sysIndex {
      background-color: transparent !important;
    }

    &_title span {
      color: green;
    }
  }

  .logo {
    display: block;
    width: 54px;
    height: 54px;
    margin-right: 10px;
  }

  .contact {
    width: 180px;

    &-info {
      width: 100%;
      height: 30px;
      margin-right: 10px;
      margin-bottom: 18px;
      color: green;
      font-size: 16px;
    }

    &-phone {
      height: 30px;
      color: green;
      font-size: 20px;
      font-weight: 600;
      line-height: 20px;
    }
  }

  .nav-container {
    display: flex;
    justify-content: center;
    height: 50px;
    background-color: #19a653;
  }

  .nav-item {
    width: 172px;
    min-width: 40px;
    max-width: 172px;
    height: 50px;
    padding: 0 10px;
    transition: background-color 0.3s ease;
    color: white;
    font-size: 18px;
    line-height: 50px;
    text-align: center;
    text-decoration: none;

    &:hover {
      background-color: #008037;
      color: white;
    }
  }

  .nav-item.active {
    background-color: #008037;
    color: white;
  }

  .nav-bottom {
    display: flex;
    // height: 40px;
    background-color: rgb(240 240 240);
    box-shadow: 0 1px 3px rgb(0 0 0 / 10%);

    .nav-item {
      // width: 120px;
      height: 50px;
      color: #333;
      font-size: 16px;
      line-height: 50px;
      text-decoration: none;
      cursor: pointer;

      &:hover,
      &.active {
        background-color: rgb(121 118 118 / 80%);
        color: #fff;
      }
    }
  }
</style>
