<template>
  <div class="product-types-container">
    <h2 class="title">品种分析</h2>
    <div v-if="otherData.length" class="category-container">
      <div class="product-item" v-for="(it, idx) in otherData" :key="idx" @click="goRouter(it)">
        <img :src="it.icon || placeholderImg" :alt="it.name" class="product-image" />
        <div class="product-name">{{ it.frontName || it.name }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, watch } from 'vue';

  const emit = defineEmits(['router']);

  const props = defineProps({
    data: {
      type: Array,
      default: () => [],
    },
  });
  const otherData = ref<any[]>(props.data);

  watch(
    () => props.data,
    (newVal) => {
      console.log('🚀 ~ newVal:', newVal);
      otherData.value = newVal;
    },
    { immediate: true },
  );

  const placeholderImg = ref('http://iph.href.lu/200x108');

  function goRouter(data) {
    emit('router', {
      path: `/frontCategory?cateId=${data.id}&cateTitle=${data.name}`,
      configId: '1',
    });
  }
</script>

<style lang="less" scoped>
  .product-types-container {
    margin-bottom: 60px;
    text-align: center;
  }

  .title {
    position: relative;
    width: 192px;
    height: 67px;
    margin-bottom: 30px;
    color: #222;
    font-size: 36px;
    font-style: normal;
    font-weight: 600;
    line-height: 67px;
    text-align: left;

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

  .category-container {
    display: flex;
    flex-wrap: wrap;
    // justify-content: space-between;
    gap: 20px;
  }

  .product-item {
    position: relative;
    width: 280px;
    margin-bottom: 28px;
    overflow: hidden;
    transition: all 0.3s ease-in-out;
    border-radius: 4px;
    color: #333;
    cursor: pointer;

    &:hover {
      transform: scale(1.15);
      // box-shadow: 0 0 10px rgb(81 83 82 / 50%);
      color: #04b452;

      .product-name {
        margin-top: 0;
      }
    }
  }

  .product-image {
    width: 100%;
    height: 256px;
  }

  .product-name {
    width: 100%;
    margin-top: 4px;
    font-size: 18px;
    letter-spacing: 4px;
    text-align: center;
  }
</style>
