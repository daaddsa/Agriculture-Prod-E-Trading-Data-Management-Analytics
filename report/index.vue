<template>
  <div class="bg-container">
    <Header />
    <div class="main">
      <!-- Header with Search Bar -->
      <div class="report-header">
        <div class="header-content">
          <div class="title-wrapper">
            <span class="green-indicator"></span>
            <h1 class="main-title">分析报告库</h1>
          </div>
          <p class="subtitle">深度洞察农业市场趋势，辅助科学决策</p>
        </div>
        <Input
          v-model:value="searchKeyword"
          placeholder="搜索报告标题或关键词..."
          class="custom-search-input"
          @press-enter="handleSearch"
        >
          <template #prefix>
            <SearchOutlined style="margin-right: 4px; color: #999; font-size: 16px" />
          </template>
        </Input>
      </div>

      <div class="mt-2 mb-10">
        <Tabs v-model:activeKey="activeKey" @change="handleTabChange">
          <TabPane v-for="ele in secondNav" :key="ele.value" :tab="ele.name">
            <div class="tab-content" v-if="reportData.length > 0">
              <!-- Featured Report (First Item) -->
              <div class="featured-report" v-if="reportData[0] && pagination.current == 1">
                <Row :gutter="48">
                  <!-- Image Left -->
                  <Col :span="13">
                    <div class="featured-img-wrapper">
                      <img
                        :src="reportData[0].cover || Png5"
                        alt="report image"
                        class="report-image"
                      />
                      <div class="featured-tag">
                        {{
                          formatDictValue(bizDictOptions.farm_report, reportData[0].cateId, 'label')
                        }}
                      </div>
                    </div>
                  </Col>
                  <!-- Content Right -->
                  <Col :span="11">
                    <div class="report-info">
                      <div class="meta-row">
                        <span class="date">
                          <CalendarOutlined />
                          {{ dayjs(reportData[0].uploadTime || Date.now()).format('YYYY-MM-DD') }}
                        </span>
                        <span class="separator"></span>
                        <span class="read-time"> </span>
                      </div>

                      <h1 class="featured-title text-ellipsis-2">{{ reportData[0].title }}</h1>

                      <div class="desc text-ellipsis-4">
                        {{ reportData[0].description || '暂无数据...' }}
                      </div>

                      <div class="featured-footer">
                        <div class="category-tag">
                          {{
                            formatDictValue(
                              bizDictOptions.farm_report,
                              reportData[0].cateId,
                              'label',
                            )
                          }}
                        </div>
                        <div>
                          <div class="download-btn mr-4" @click="handlePreview(reportData[0])">
                            <EyeOutlined /> 预览报告
                          </div>
                          <div class="download-btn" @click="handleDownload(reportData[0])">
                            <DownloadOutlined /> 下载报告
                          </div>
                        </div>
                      </div>
                    </div>
                  </Col>
                </Row>
              </div>

              <!-- Grid Reports (Remaining Items) -->
              <div class="report-grid" v-if="reportData.length > 1">
                <Row :gutter="[24, 24]">
                  <Col
                    :span="8"
                    v-for="item in reportData.slice(pagination.current > 1 ? 0 : 1)"
                    :key="item.id"
                  >
                    <div class="grid-card">
                      <div class="img-wrapper">
                        <img
                          :src="item.cover || Png5"
                          :alt="item.title"
                          class="report-image-small"
                        />
                        <div class="card-tag">
                          {{ formatDictValue(bizDictOptions.farm_report, item.cateId, 'label') }}
                        </div>
                        <div class="card-date">
                          {{ dayjs(item.uploadTime || Date.now()).format('YYYY-MM-DD') }}
                        </div>
                      </div>
                      <div class="grid-info">
                        <h3 class="card-title text-ellipsis-2" :title="item.title">{{
                          item.title
                        }}</h3>
                        <div class="card-desc text-ellipsis-3">
                          {{ item.description || '暂无数据...' }}
                        </div>
                        <div class="card-footer">
                          <span class="read-time"></span>
                          <div>
                            <div class="download-link mr-4" @click="handlePreview(item)">
                              <EyeOutlined /> 预览报告
                            </div>
                            <div class="download-link" @click="handleDownload(item)">
                              <DownloadOutlined /> 下载报告
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Col>
                </Row>
              </div>

              <!-- Pagination -->
              <div class="pagination-container">
                <Pagination
                  v-model:current="pagination.current"
                  :total="pagination.total"
                  :pageSize="pagination.pageSize"
                  :showSizeChanger="false"
                  @change="handlePageChange"
                />
              </div>
            </div>
            <div v-else class="empty-container">
              <Empty />
            </div>
          </TabPane>
        </Tabs>
      </div>
    </div>
    <Footer />

    <ViewDrawer @register="registerDrawer" />
  </div>
</template>

<script setup lang="ts">
  import { onMounted, reactive, ref } from 'vue';
  import Footer from '@/views/base/home/components/Footer.vue';
  import Header from '@/views/base/home/components/Header.vue';
  import { bizAnalysisReportQueryPage } from '@/api/farm/analysisReportApi';
  import { useRoute } from 'vue-router';
  import { Tabs, TabPane, Row, Col, Pagination, Empty, Input } from 'ant-design-vue';
  import { listDictModelBatch } from '@/api/common';
  import dayjs from 'dayjs';
  import Png5 from '@/assets/images/5.png';
  import {
    DownloadOutlined,
    CalendarOutlined,
    SearchOutlined,
    EyeOutlined,
  } from '@ant-design/icons-vue';
  import { formatDictValue } from '@/utils';
  import ViewDrawer from '@/views/biz/me/download/ViewDrawer.vue';
  import { useDrawer } from '@/components/Drawer';

  const route = useRoute();
  const [registerDrawer, { openDrawer }] = useDrawer();

  const bizDictOptions = reactive<any>({});
  const bizDictData = ref([{ key: 'farm_report', dictCode: 'farm_report' }]);
  const reportData = ref<any[]>([]);
  const activeKey = ref<any>('');
  const searchKeyword = ref('');

  const pagination = reactive({
    current: 1,
    pageSize: 7,
    total: 0,
  });

  const downloadModalOpen = ref(false);
  const currentReport = ref<any>({});
  const currentReportFiles = ref<any[]>([]);

  const secondNav = ref<any[]>([]);

  onMounted(async () => {
    await getDictData();
    secondNav.value =
      bizDictOptions?.farm_report?.map((ele: any) => ({
        to: `/frontReport?cate=${ele.value}`,
        name: ele.label,
        id: ele.id,
        value: ele.value,
      })) || [];
    secondNav.value.unshift({
      to: `/frontReport`,
      name: '全部报告',
      id: '',
      value: '1',
    });

    if (route.query.cate) {
      activeKey.value = route.query.cate;
    } else {
      activeKey.value = '1';
    }
    await getData();
  });

  async function handleTabChange(key: string) {
    activeKey.value = key;
    pagination.current = 1; // Reset to first page
    await getData();
  }

  async function handleSearch() {
    pagination.current = 1;
    await getData();
  }

  async function handlePageChange(page: number) {
    pagination.current = page;
    await getData();
  }

  async function getData() {
    try {
      const res = await bizAnalysisReportQueryPage({
        pageNum: pagination.current,
        pageSize: pagination.pageSize,
        cate: activeKey.value == '1' ? '' : activeKey.value,
        title: searchKeyword.value,
      });
      if (res) {
        reportData.value = res.data;
        pagination.total = res.total || res.data.length;
      } else {
        reportData.value = [];
        pagination.total = 0;
      }
    } catch (e) {
      console.error(e);
      reportData.value = [];
    }
  }

  async function getDictData() {
    const res = await listDictModelBatch(bizDictData.value.map((ele) => ele.dictCode));
    for (const i in res) {
      const filter = bizDictData.value.filter((ele) => ele.dictCode == i)[0];
      bizDictOptions[filter.key] = res[i];
    }
  }
  const handlePreview = (data) => {
    openDrawer(true, {
      record: {
        attachment: data.storages,
      },
      index: 0,
    });
  };

  const handleDownload = (data) => {
    console.log('🚀 ~ const handleDownload ~ data:', data);
    if (data?.storages?.[0].absolutePath) {
      // Assuming absolutePath is a full URL or relative path we can open
      window.open(data.storages[0].absolutePath, '_blank');
    }
  };
  function handleOpenDownload(item: any) {
    currentReport.value = item;
    let files = [];
    if (item.storages) {
      try {
        files = typeof item.storages === 'string' ? JSON.parse(item.storages) : item.storages;
      } catch (e) {
        console.error('Error parsing storages:', e);
        files = [];
      }
    }
    if (!Array.isArray(files)) {
      files = files ? [files] : [];
    }
    currentReportFiles.value = files;
    downloadModalOpen.value = true;
  }
</script>

<style lang="less" scoped>
  .bg-container {
    min-height: 100vh;
    background-color: #f4f5f9;
  }

  .main {
    width: 1200px;
    margin: 0 auto;
    padding: 30px 0;
  }

  .report-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 16px;

    .header-content {
      .title-wrapper {
        display: flex;
        align-items: center;
        margin-bottom: 8px;

        .green-indicator {
          width: 4px;
          height: 24px;
          margin-right: 12px;
          border-radius: 4px;
          background: #04b452;
        }

        .main-title {
          margin: 0;
          color: #333;
          font-size: 24px;
          font-weight: 700;
          line-height: 1;
        }
      }

      .subtitle {
        margin: 0 0 0 20px;
        color: #666;
        font-size: 14px;
      }
    }

    .custom-search-input {
      width: 300px;
      padding: 6px 16px;
      transition: all 0.3s;
      border: 1px solid #e0e0e0;
      border-radius: 20px;
      background-color: #fff;

      :deep(.ant-input) {
        background-color: transparent;
        font-size: 14px;
      }

      &:hover,
      &:focus-within {
        border-color: #04b452;
        box-shadow: 0 0 0 2px rgb(4 180 82 / 10%);
      }
    }
  }

  /* Featured Report Styles */
  .featured-report {
    margin-bottom: 30px;
    border-radius: 12px;
    background: #fff;
    box-shadow: 0 4px 20px rgb(0 0 0 / 5%);

    .featured-img-wrapper {
      position: relative;
      height: 340px;
      overflow: hidden;
      border-radius: 8px 0 0 8px;

      .report-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .featured-tag {
        position: absolute;
        top: 20px;
        left: 20px;
        padding: 4px 12px;
        border-radius: 4px;
        background: #04b452;
        box-shadow: 0 2px 8px rgb(0 0 0 / 20%);
        color: #fff;
        font-size: 14px;
        font-weight: 500;
      }
    }

    .report-info {
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: 10px;

      .meta-row {
        display: flex;
        align-items: center;
        margin-bottom: 16px;
        color: #999;
        font-size: 13px;

        .separator {
          margin: 0 10px;
        }

        .anticon {
          margin-right: 6px;
        }
      }

      .featured-title {
        margin-bottom: 20px;
        color: #333;
        font-size: 32px;
        font-weight: 700;
        line-height: 1.3;
      }

      .desc {
        margin-bottom: auto;
        color: #666;
        font-size: 15px;
        line-height: 28px;
      }

      .featured-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 30px;
        padding-top: 20px;
        border-top: 1px solid #f0f0f0;

        .category-tag {
          padding: 6px 12px;
          border-radius: 4px;
          background: #f5f5f5;
          color: #666;
          font-size: 13px;
        }

        .download-btn {
          display: inline-flex;
          align-items: center;
          padding: 8px 20px;
          transition: all 0.3s;
          border-radius: 20px;
          background: #e8f5e9;
          color: #04b452;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          gap: 8px;

          &:hover {
            background: #d0ebd3;
          }
        }
      }
    }
  }

  /* Grid Card Styles */
  .grid-card {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    transition: all 0.3s;
    border-radius: 12px;
    background: #fff;
    box-shadow: 0 2px 10px rgb(0 0 0 / 3%);

    &:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 25px rgb(0 0 0 / 8%);
    }

    .img-wrapper {
      position: relative;
      height: 200px;
      overflow: hidden;

      .report-image-small {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.5s;
      }

      .card-tag {
        position: absolute;
        top: 12px;
        left: 12px;
        padding: 4px 8px;
        border-radius: 4px;
        background: rgb(255 255 255 / 90%);
        color: #333;
        font-size: 12px;
        font-weight: 500;
        backdrop-filter: blur(4px);
      }

      .card-date {
        position: absolute;
        bottom: 12px;
        left: 12px;
        color: #fff;
        font-size: 13px;
        font-weight: 500;
        text-shadow: 0 1px 2px rgb(0 0 0 / 60%);
      }
    }

    &:hover .report-image-small {
      transform: scale(1.05);
    }

    .grid-info {
      display: flex;
      flex: 1;
      flex-direction: column;
      padding: 20px;

      .card-title {
        height: 50px; /* Fixed height for 2 lines */
        margin-bottom: 12px;
        color: #333;
        font-size: 18px;
        font-weight: 700;
        line-height: 1.4;
      }

      .card-desc {
        flex: 1;
        margin-bottom: 20px;
        color: #888;
        font-size: 13px;
        line-height: 22px;
      }

      .card-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-top: 15px;
        border-top: 1px solid #f5f5f5;

        .read-time {
          display: flex;
          align-items: center;
          color: #999;
          font-size: 12px;
          gap: 4px;
        }

        .download-link {
          display: inline-flex;
          align-items: center;
          color: #04b452;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          gap: 4px;

          &:hover {
            text-decoration: underline;
          }
        }
      }
    }
  }

  .text-ellipsis-2 {
    display: -webkit-box;
    overflow: hidden;
    text-overflow: ellipsis;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .text-ellipsis-3 {
    display: -webkit-box;
    overflow: hidden;
    text-overflow: ellipsis;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
  }

  .text-ellipsis-4 {
    display: -webkit-box;
    overflow: hidden;
    text-overflow: ellipsis;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
  }

  .pagination-container {
    margin-top: 50px;
    padding-bottom: 20px;
    text-align: center;
  }

  .empty-container {
    padding: 100px 0;
    text-align: center;
  }

  ::v-deep(.ant-tabs-tab) {
    padding: 12px 0;
    font-size: 16px;

    &:hover {
      color: #04b452;
    }
  }

  ::v-deep(.ant-tabs-tab-active .ant-tabs-tab-btn) {
    color: #04b452 !important;
    font-size: 18px;
    font-weight: 600;
  }

  ::v-deep(.ant-tabs-ink-bar) {
    height: 3px;
    background: #04b452;
  }

  ::v-deep(.ant-pagination-item-active) {
    border-color: #04b452;

    a {
      color: #04b452;
    }
  }

  ::v-deep(.ant-pagination-item:hover) {
    border-color: #04b452;

    a {
      color: #04b452;
    }
  }
</style>
