<template>
  <footer class="footer">
    <div class="footer-container">
      <div class="contact-us footer-item">
        <h4>
          <span class="icon"></span>
          <span class="text">联系我们</span>
        </h4>
        <div class="phone">{{ phoneNumber }}</div>
        <button class="consult-button">在线咨询</button>
      </div>
      <div class="category-analysis footer-item">
        <h4>品类分析</h4>
        <div class="category-content">
          <div class="category-row" v-for="item in categoryData" :key="item.name">
            <div class="category-item category-item_tit">{{ item.frontName || item.name }}</div>
            <div
              class="category-item"
              v-for="it in item.childNames"
              :key="it.id"
              @click="goRouter(it, 'frontCategory')"
            >
              {{ it.frontName || it.name }}
            </div>
          </div>
        </div>
      </div>
      <div class="intelligent-calculation footer-item">
        <h4>智能测算</h4>
        <div class="category-content">
          <div class="category-row" v-for="item in intelligentData" :key="item.name">
            <div class="category-item category-item_tit">{{ item.frontName || item.name }}</div>
            <div
              class="category-item"
              v-for="it in item.childNames"
              :key="it.id"
              @click="goRouter(it, 'frontCalc')"
            >
              {{ it.frontName || it.name }}
            </div>
          </div>
        </div>
      </div>
      <div class="analysis-report footer-item">
        <h4>分析报告</h4>
        <div class="category-row">
          <div
            class="category-item"
            v-for="item in reportData"
            :key="item.id"
            @click="goRouter(item, 'frontReport')"
          >
            {{ _.truncate(item.name || '', { length: 10 }) }}
          </div>
        </div>
      </div>
      <div class="insurance-news footer-item">
        <h4>保险资讯</h4>
        <div class="category-row">
          <div
            class="category-item"
            v-for="item in insuranceData"
            :key="item.id"
            @click="goRouter(item, 'frontNews')"
          >
            <div>{{ item.name }}</div>
          </div>
        </div>
      </div>
    </div>
    <div class="footer-bottom">
      <div class="footer-bottom-text">
        Copyright © 2013-{{ currentYear }} 农产品价格保险智能服务平台 www.nongchanpinjiage.com
        保留权利
      </div>
    </div>
  </footer>
</template>
<script lang="ts" setup>
  import { onMounted, ref, reactive } from 'vue';
  import { useRouter } from 'vue-router';
  import { bizIndexQueryCateList } from '@/api/farm/homeApi';
  import _ from 'lodash-es';
  import { listDictModelBatch } from '@/api/common';

  const bizDictOptions = reactive<any>({});
  const bizDictData = ref([
    { key: 'farm_report', dictCode: 'farm_report' },
    { key: 'farm_news', dictCode: 'farm_news' },
    { key: 'farm_category', dictCode: 'farm_category' },
  ]);
  onMounted(async () => {
    await getDictData();
    await getData();
  });
  const router = useRouter();

  const insuranceData = ref<any[]>([]);
  const reportData = ref<any[]>([]);
  const categoryData = ref<any[]>([]);
  const intelligentData = ref<any[]>([]);
  const phoneNumber = '+86-13381250839';

  const currentYear = new Date().getFullYear();

  async function getData() {
    reportData.value =
      bizDictOptions?.farm_report?.map((ele: any) => ({
        to: `/frontReport?cate=${ele.value}`,
        name: ele.label,
      })) || [];
    insuranceData.value =
      bizDictOptions?.farm_news?.map((ele: any) => ({
        to: `/frontNews?cate=${ele.value}`,
        name: ele.label,
      })) || [];

    const resCateData = await bizIndexQueryCateList({});
    if (resCateData?.length) {
      categoryData.value = resCateData;
      intelligentData.value = resCateData;
    }
  }

  function goRouter(data, type) {
    console.log('🚀 ~ goRouter ~ data:', data);
    if (type === 'frontNews') {
      router.push(data.to);
    } else if (type === 'frontReport') {
      router.push(data.to);
    } else if (type === 'frontCalc') {
      router.push({ path: '/frontCalc', query: { id: data.id } });
    } else {
      router.push(`/frontCategory?cateId=${data.id}&cateTitle=${data.name}`).then(() => {
        window.scrollTo(0, 0);
      });
    }
  }

  async function getDictData() {
    const res = await listDictModelBatch(bizDictData.value.map((ele) => ele.dictCode));
    for (const i in res) {
      const filter = bizDictData.value.filter((ele) => ele.dictCode == i)[0];
      bizDictOptions[filter.key] = res[i];
    }
  }
</script>
<style lang="less" scoped>
  .footer {
    // position: absolute;
    // bottom: 0;
    width: 100%;
    padding: 40px 0 20px;
    background-color: #171717;

    &-container {
      display: flex;
      justify-content: space-between;
      width: 1200px;
      margin: 0 auto;
      color: white;
    }
  }

  h4 {
    margin-bottom: 10px;
    font-size: 18px;
  }

  .category-content {
    display: flex;
  }

  .category-row {
    display: flex;
    flex-direction: column;
    margin-right: 20px;
  }

  .category-item {
    margin-bottom: 5px;
    padding: 5px 10px 5px 0;
    border-radius: 4px;
    color: #a19c9c;

    &_tit {
      color: white;
    }

    &:hover {
      color: white;
      cursor: pointer;
    }
  }

  .contact-us {
    text-align: left;
  }

  .icon {
    margin-right: 5px;
  }

  .phone {
    margin-bottom: 20px;
    font-size: 24px;
  }

  .consult-button {
    padding: 8px 20px;
    border: 1px solid white;
    border-radius: 4px;
    background: transparent;
    color: white;
    font-size: 16px;
    cursor: pointer;
  }

  .footer-bottom {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #464545;
    color: #787878;
    font-size: 14px;
    font-style: normal;
    font-weight: 400;
    text-align: justify;

    &-text {
      width: 1200px;
      margin: 0 auto;
    }
  }
</style>
