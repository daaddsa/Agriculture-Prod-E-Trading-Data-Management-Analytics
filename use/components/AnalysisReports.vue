<template>
  <div class="analysis-reports-container">
    <div class="title" v-if="hasTitle">
      <div class="title-text">分析报告</div>
      <div class="title-more" @click="goRouter({ path: 'frontReport', type: 'all' })">
        查看更多 <ArrowRightOutlined />
      </div>
    </div>
    <div
      :class="['report-item', hasImg ? '' : 'report-item--noImg']"
      v-for="(item, index) in otherData"
      :key="index"
      @click="goRouter(item)"
    >
      <img
        v-if="hasImg"
        :src="item.cover || placeholderImg"
        :alt="item.title"
        class="report-image"
      />
      <h3 class="report-title">
        <span>{{ item?.cateName }}</span>
        {{ item.title.length > 30 ? _.truncate(item.title, 30) + '...' : item.title }}
      </h3>
      <div class="report-date">
        <FieldTimeOutlined class="report-date_icon" />
        {{ dayjs(item.uploadTime || Date.now()).format('YYYY.MM.DD') }}
      </div>
      <!-- <p class="report-content">{{ item.summary }}</p> -->
    </div>
    <div class="foot" v-if="hasFoot"> </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, watch } from 'vue';
  import _ from 'lodash-es';
  import dayjs from 'dayjs';
  import ImgReport from '/@/assets/images/report_01.png';
  import { FieldTimeOutlined, ArrowRightOutlined } from '@ant-design/icons-vue';

  const emit = defineEmits(['router']);
  const props = defineProps({
    // props
    data: {
      type: Array,
      default: () => [],
    },
    hasTitle: {
      type: Boolean,
      default: true,
    },
    hasImg: {
      type: Boolean,
      default: true,
    },
    hasFoot: {
      type: Boolean,
      default: false,
    },
  });

  const otherData = ref<any[]>(props.data);

  watch(
    () => props.data,
    (newVal) => {
      otherData.value = newVal;
      console.log('🚀 ~ newVal:', newVal);
    },
    { immediate: true },
  );

  function goRouter(data: any, type?: string) {
    if (type) {
      emit('router', { path: data.path, ...data });
    }
    emit('router', { path: 'frontReport', ...data });

    // emit('router', { path: 'frontReportDetail', ...data });
  }
  const placeholderImg = ref(ImgReport || 'http://iph.href.lu/300x100');
</script>

<style scoped lang="less">
  .analysis-reports-container {
    margin-bottom: 60px;
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

  .report-item {
    display: inline-block;
    width: 280px;
    margin: 0 10px;
    transition: all 0.3s ease;
    border-radius: 4px;
    background: #fff;

    &--noImg {
      height: 240px;
      padding: 20px 0;
    }

    &:hover {
      background: rgb(25 166 83 / 80%);
      box-shadow: 0 0 10px rgb(0 0 0 / 20%);
      color: white;
      cursor: pointer;

      .report-date {
        border-color: white;
        color: white;
      }
    }
  }

  .report-image {
    width: 100%;
    height: 150px;
    margin-bottom: 15px;
    border-radius: 4px 4px 0 0;
  }

  .report-date {
    // display: block;
    // width: 100px;
    // margin-bottom: 15px;
    // padding: 4px;
    // border: 1px solid #19a653;
    // border-left: 0;
    // color: #19a653;
    // font-style: italic;
    display: flex;
    align-items: center;
    margin-bottom: 15px;
    padding: 0 20px;
    border-left: 0;
    color: #999;
    font-size: 12px;
    font-weight: bold;

    &_icon {
      margin-right: 5px;
    }
  }

  .report-title {
    width: 100%;
    margin-bottom: 15px;
    padding: 0 20px;
    height: 60px;
    font-size: 14px;
    font-weight: bold;
    line-height: 1.4;
    text-align: left;
  }

  .report-content {
    width: 100%;
    padding: 0 20px;
    font-size: 12px;
    text-align: left;
  }

  .foot {
    display: flex;
    align-items: center;
    justify-content: end;
    margin-top: 20px;
    margin-right: 20px;
    color: #19a653;
    font-size: 14px;
    cursor: pointer;

    span {
      text-decoration: underline;
    }
  }
</style>
