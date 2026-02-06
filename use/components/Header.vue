<template>
  <div class="header-placeholder" v-if="!isSysIndex"></div>
  <div
    ref="headerRef"
    :class="[
      'w-full header-container',
      isSysIndex ? 'header-container--sysIndex' : '',
      isScrolled ? 'header-scrolled' : '',
    ]"
  >
    <div class="container">
      <div class="logo-info" @click="goRouter('/sysIndex')">
        <img :src="HeaderLogo" :alt="platformName" class="logo" />
        <div class="logo-text">
          <div class="logo-title-cn">{{ platformName }}</div>
          <div class="logo-title-en">{{ platformNameEn }}</div>
        </div>
      </div>
      <div class="nav">
        <router-link
          v-for="item in navData"
          :key="item.name"
          :to="item.to"
          :class="['nav-item', route.path == item.to ? 'active' : '']"
        >
          {{ item.name }}
        </router-link>
        <div class="nav-item">
          <UserDropDown />
        </div>
      </div>
    </div>
    <LoginModal @register="registerModal" :destroyOnClose="true" />
  </div>
</template>
<script lang="ts" setup>
  import { onMounted, onUnmounted, reactive, ref, watch } from 'vue';
  import { UserDropDown } from '@/layouts/default/header/components/index';
  import { useRoute, useRouter } from 'vue-router';
  import { listDictModelBatch } from '@/api/common';
  import { bizIndexQueryCateList } from '@/api/farm/homeApi';
  import HeaderLogo from '@/assets/images/_logo.png';
  import LoginModal from '@/views/base/login/LoginModal.vue';
  import { useModal } from '@/components/Modal';
  import { useUserStore } from '@/store/modules/user';

  const [registerModal, { openModal, closeModal }] = useModal();

  const router = useRouter();
  const bizDictOptions = reactive<any>({});
  const bizDictData = ref([
    { key: 'farm_report', dictCode: 'farm_report' },
    { key: 'farm_news', dictCode: 'farm_news' },
    { key: 'farm_category', dictCode: 'farm_category' },
  ]);

  const isSysIndex = ref(false);
  const isScrolled = ref(false);

  // 平台名称
  const platformName = '农业收益保险智能服务平台';
  const platformNameEn = 'Agricultural Income Insurance Intelligent Service Platform (AIIS)';
  const navData = reactive([
    { to: '/sysIndex', name: '首页' },
    { to: '/frontCategory', name: '品种分析' },
    { to: '/frontCalc', name: '智能测算' },
    { to: '/frontReport', name: '分析报告' },
    { to: '/frontNews', name: '保险资讯' },
    { to: '/frontContact', name: '联系我们' },
  ]);

  const secondNav = ref<any[]>([]);

  const route = useRoute();
  const headerRef = ref<HTMLElement | null>(null);
  let scrollParent: HTMLElement | Window | null = null;

  // Find scroll parent
  function findScrollParent(element: HTMLElement | null): HTMLElement | Window {
    if (!element) return window;
    let parent = element.parentElement;
    while (parent) {
      const { overflow, overflowY } = window.getComputedStyle(parent);
      if (/(auto|scroll)/.test(overflow + overflowY)) {
        return parent;
      }
      parent = parent.parentElement;
    }
    return window;
  }

  // Scroll handler
  const handleScroll = (e?: Event) => {
    let scrollTop = 0;
    if (e && e.target instanceof HTMLElement) {
      scrollTop = e.target.scrollTop;
    } else {
      scrollTop =
        window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;
    }
    // console.log('🚀 ~ file: Header.vue:73 ~ scrollTop:', scrollTop);

    isScrolled.value = scrollTop > 50;
  };

  onMounted(async () => {
    scrollParent = findScrollParent(headerRef.value);
    scrollParent.addEventListener('scroll', handleScroll);
    // Also check initial position
    handleScroll({ target: scrollParent } as any);

    if (route.path === '/sysIndex') {
      isSysIndex.value = true;
      return;
    }
    await getDictData();
  });

  onUnmounted(() => {
    if (scrollParent) {
      scrollParent.removeEventListener('scroll', handleScroll);
    }
  });

  watch(
    () => route,
    async (val) => {
      isSysIndex.value = val.path === '/sysIndex';

      if (val.path === '/sysIndex') {
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
        try {
          const res = await bizIndexQueryCateList({});
          if (res && res.length > 0) {
            const list1 = res[0]?.childNames || [];
            const list2 = res[1]?.childNames || [];
            const data = [...list1, ...list2];
            secondNav.value = data.map((ele: any) => ({
              to: `/frontCategory?cateId=${ele.id}&cateTitle=${ele.name}`,
              name: ele.name,
            }));
          }
        } catch (error) {
          console.error('Failed to load categories:', error);
        }
      } else {
        secondNav.value = [];
      }
    },
    { immediate: true },
  );
  async function getDictData() {
    const res = await listDictModelBatch(bizDictData.value.map((ele) => ele.dictCode));
    for (const i in res) {
      const filter = bizDictData.value.filter((ele) => ele.dictCode == i)[0];
      bizDictOptions[filter.key] = res[i];
    }
  }

  function goRouter(path: string) {
    router.push({ path });
  }
  const userStore = useUserStore();
  console.log('🚀 ~ file: Header.vue:137 ~ userStore:', userStore);
  watch(
    () => userStore.getLoginModalVisible,
    (visible) => {
      if (visible) {
        console.log('🚀 ~ file: Header.vue:140 ~ visible:', visible);
        // openModal(true);
        openLoginModal();
      } else {
        closeModal();
      }
    },
    { immediate: true },
  );
  function openLoginModal() {
    console.log('打开弹窗');
    if (userStore.getLoginModalVisible) {
      openModal(true);
    }
  }
</script>
<style lang="less" scoped>
  // @import url('./index.less');

  .header-placeholder {
    width: 100%;
    height: 82px; // Approximate height of header
  }

  .header-container {
    position: fixed;
    z-index: 999;
    top: 0;
    left: 0;
    width: 100%;
    padding: 16px 0;
    transition: all 0.3s ease;
    background-color: #fff;
    box-shadow: 0 2px 8px rgb(0 0 0 / 5%);

    &--sysIndex {
      background-color: transparent;
      box-shadow: none;
      color: #fff;

      // When sysIndex is scrolled, behave like normal header
      &.header-scrolled {
        background-color: #fff;
        box-shadow: 0 2px 8px rgb(0 0 0 / 10%);
        color: #333;

        .nav-item {
          color: #2b2929;

          &:hover {
            color: #008037 !important;
          }
        }

        .logo-title-cn {
          color: #333;
        }

        .logo-title-en {
          color: #666;
        }

        &:hover {
          // Reset hover behavior when scrolled if needed, or keep it
        }
      }
    }
  }

  .container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 1200px;
    height: 100%;
    margin: 0 auto;
  }

  .logo-info {
    display: flex;
    align-items: center;
    transition: opacity 0.3s;
    cursor: pointer;

    &:hover {
      opacity: 0.9;
    }
  }

  .logo {
    display: block;
    width: 60px;
    height: 60px;
    margin-right: 8px;
    object-fit: contain;
  }

  .logo-text {
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .logo-title-cn {
    margin-bottom: 4px;
    color: #333;
    font-size: 22px;
    font-weight: bold;
    letter-spacing: 2px;
    line-height: 1.2;
  }

  .logo-title-en {
    color: #666;
    font-size: 8px;
    line-height: 1.2;
    text-transform: uppercase;
    // letter-spacing: 0.5px;
  }

  .nav-container {
    display: flex;
    justify-content: center;
    height: 50px;
    background-color: #19a653;
  }

  .nav-item {
    display: inline-block;
    //width: 100px;
    min-width: 40px;
    max-width: 100px;
    height: 50px;
    padding: 0 10px;
    transition: background-color 0.3s ease;
    color: #2b2929;
    font-size: 18px;
    line-height: 50px;
    text-align: center;
    text-decoration: none;

    &:hover {
      // background-color: #fff !important;
      color: #008037;
    }
  }

  .nav-item.active {
    // background-color: #fff !important;
    color: #008037;
  }

  .header-container--sysIndex {
    .nav-item {
      color: #fff;

      &:hover {
        color: #19a653 !important;
      }
    }

    .logo-title-cn {
      color: #fff;
    }

    .logo-title-en {
      color: rgb(255 255 255 / 90%);
    }

    &:hover {
      background-color: #fff !important;
      color: #19a653 !important;

      .nav-item {
        color: #000;
      }

      .logo-title-cn {
        color: #333;
      }

      .logo-title-en {
        color: #666;
      }
    }
  }
</style>
