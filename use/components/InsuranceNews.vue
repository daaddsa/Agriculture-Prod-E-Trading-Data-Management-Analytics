<template>
  <div class="insurance-news">
    <div class="insurance-news-container">
      <div class="title">
        <div class="title-text">保险资讯</div>
        <div class="title-more" @click="goRouter({ path: 'frontNews', type: 'all' })">
          查看更多 <ArrowRightOutlined />
        </div>
      </div>
      <div class="news-list">
        <div
          v-for="(item, index) in otherData"
          :key="index"
          class="clearfix news-item"
          @click="goRouter(item)"
        >
          <span class="news-content">
            <span class="mr-1">{{
              item.keyWords ? '【' + item.keyWords?.join(',') + '】' : ''
            }}</span>
            <span v-html="_.truncate(item.title || '', { length: 56 })"></span>
          </span>
          <span class="news-date">{{ dayjs(item.updateTime).format('YYYY.MM.DD') }}</span>
        </div>
      </div>
      <!-- <div class="news-list" v-if="otherData.length">
        <vue3-seamless-scroll class="scroll-wrap" :list="otherData">
          <template #default="{ data }">
            <div class="news-item" @click="goRouter(data)">
              <span class="news-content">
                <span v-html="_.truncate(data.title || '', { length: 56 })"></span>
              </span>
              <span class="news-date">{{ data.updateTime }}</span>
            </div>
          </template>
        </vue3-seamless-scroll> 
      </div>-->
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, watch } from 'vue';
  import _ from 'lodash-es';
  // import { Vue3SeamlessScroll } from 'vue3-seamless-scroll';
  import { ArrowRightOutlined } from '@ant-design/icons-vue';
  import dayjs from 'dayjs';

  const emit = defineEmits(['router']);

  const props = defineProps({
    data: {
      type: Array,
      default: () => [],
    },
  });
  const otherData = ref<any>();

  watch(
    () => props.data,
    (newVal) => {
      otherData.value = newVal;
    },
    { immediate: true, deep: true },
  );

  function goRouter(data) {
    if (data.type == 'all') {
      emit('router', { type: 'frontNews', data });
    } else {
      window.open(data.url);
    }
  }
</script>

<style lang="less" scoped>
  .insurance-news {
    width: 100%;
    height: 500px;
    padding: 30px;
    // background-color: #f8f8f8;
  }

  .insurance-news-container {
    width: 1200px;
    height: 380px;
    margin: 0 auto;
    padding: 20px 0;
    overflow: hidden;
    text-align: left;
  }

  .title {
    display: flex;
    position: relative;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 30px;

    &-text {
      color: #222;
      font-size: 36px;
      font-style: normal;
      font-weight: 600;
      line-height: 67px;
    }

    &-more {
      color: #04b452;
      font-size: 16px;
      font-style: normal;
      line-height: 22px;
      text-align: center;
    }

    &::after {
      content: '';
      display: block;
      position: absolute;
      top: 0;
      left: 0;
      width: 80px;
      height: 4px;
      border-radius: 2px;
      background: #04b452;
    }
  }

  .news-list {
    width: 100%;
    height: 300px;
    // overflow: hidden;
  }

  .scroll-wrap {
    width: 100%;
    height: 300px;
    margin: 0 auto;
    overflow: hidden;
  }

  .news-item {
    display: flex;
    position: relative;
    justify-content: space-between;
    height: 36px;
    margin: 4px 0;
    // padding-left: 20px;
    font-size: 16px;

    &:hover {
      color: rgb(25 166 83 / 80%);
      cursor: pointer;
    }
  }

  // .news-item::before {
  //   content: '';
  //   position: absolute;
  //   top: 8px;
  //   left: 0;
  //   // color: green;
  //   width: 8px;
  //   height: 8px;
  //   border-radius: 50%;
  //   background-color: green;
  //   line-height: 1.4;
  // }

  .news-date {
    color: #666;
  }
</style>
