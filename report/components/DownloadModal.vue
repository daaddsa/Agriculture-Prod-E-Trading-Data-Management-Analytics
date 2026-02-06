<template>
  <Modal
    :open="open"
    :title="null"
    :footer="null"
    :width="600"
    @cancel="handleCancel"
    class="download-modal"
    centered
  >
    <div class="modal-header">
      <div class="header-title">
        <span class="indicator"></span>
        下载报告文件
      </div>
    </div>

    <div class="report-title">
      {{ reportTitle }}
    </div>

    <div class="file-list">
      <div v-for="(file, index) in files" :key="file.id" class="file-item">
        <div class="file-icon" :class="getFileType(file.suffix)">
          {{ getFileType(file.suffix).toUpperCase() }}
        </div>
        <div class="file-info">
          <div class="file-name" :title="file.realName">{{ file.realName }}</div>
          <div class="file-size">{{ formatSize(file.size) }}</div>
        </div>
        <div class="file-actions">
          <div class="action-btn preview-btn" @click="handlePreview(file, index)" title="预览">
            <EyeOutlined />
          </div>
          <div class="action-btn download-btn" @click="handleDownload(file)" title="下载">
            <DownloadOutlined />
          </div>
        </div>
      </div>
    </div>

    <div class="modal-footer">
      <div class="footer-tip">点击列表下载对应文件</div>
      <div class="close-btn" @click="handleCancel">关闭</div>
    </div>
    <ViewDrawer @register="registerDrawer" />
  </Modal>
</template>

<script setup lang="ts">
  import { PropType } from 'vue';
  import { Modal } from 'ant-design-vue';
  import { CloseOutlined, DownloadOutlined, EyeOutlined } from '@ant-design/icons-vue';
  import ViewDrawer from '@/views/biz/me/download/ViewDrawer.vue';
  import { useDrawer } from '@/components/Drawer';

  const [registerDrawer, { openDrawer }] = useDrawer();

  const props = defineProps({
    open: {
      type: Boolean,
      default: false,
    },
    reportTitle: {
      type: String,
      default: '',
    },
    files: {
      type: Array as PropType<any[]>,
      default: () => [],
    },
  });

  const emit = defineEmits(['update:open']);

  const handleCancel = () => {
    emit('update:open', false);
  };

  const handlePreview = (file: any, index: number) => {
    openDrawer(true, {
      record: {
        attachment: props.files,
      },
      index: index,
    });
  };

  const handleDownload = (file: any) => {
    if (file.absolutePath) {
      // Assuming absolutePath is a full URL or relative path we can open
      window.open(file.absolutePath, '_blank');
    }
  };

  const getFileType = (suffix: string) => {
    if (!suffix) return 'file';
    const s = suffix.toLowerCase().replace('.', '');
    if (['pdf'].includes(s)) return 'pdf';
    if (['doc', 'docx'].includes(s)) return 'docx';
    if (['xls', 'xlsx'].includes(s)) return 'xlsx';
    return 'file';
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };
</script>

<style lang="less" scoped>
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;

    .header-title {
      display: flex;
      align-items: center;
      color: #333;
      font-size: 20px;
      font-weight: bold;

      .indicator {
        width: 4px;
        height: 20px;
        margin-right: 12px;
        border-radius: 2px;
        background: #00b96b;
      }
    }

    .close-icon {
      transition: color 0.3s;
      color: #999;
      font-size: 18px;
      cursor: pointer;

      &:hover {
        color: #666;
      }
    }
  }

  .report-title {
    width: 100%;
    margin-bottom: 24px;
    padding: 12px;
    overflow: hidden;
    border-bottom: 1px solid #f0f0f0;
    background: rgb(122 209 173 / 10%);
    color: #333;
    font-size: 16px;
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 24px;
  }

  .file-item {
    display: flex;
    align-items: center;
    padding: 16px;
    transition: all 0.3s;
    border-radius: 8px;
    background: #f9f9f9;

    &:hover {
      background: #fff;
      box-shadow: 0 4px 12px rgb(0 0 0 / 5%);

      .download-btn {
        background: #e6f7ff;
        color: #00b96b;
      }
    }
  }

  .file-icon {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    margin-right: 16px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: bold;

    &.pdf {
      background: #fff1f0;
      color: #ff4d4f;
    }

    &.docx {
      background: #e6f7ff;
      color: #1890ff;
    }

    &.xlsx {
      background: #f6ffed;
      color: #52c41a;
    }

    &.file {
      background: #f5f5f5;
      color: #999;
    }
  }

  .file-info {
    flex: 1;
    min-width: 0;

    .file-name {
      width: 90%;
      margin-bottom: 4px;
      overflow: hidden;
      color: #333;
      font-size: 16px;
      font-weight: 500;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .file-size {
      color: #999;
      font-size: 13px;
    }
  }

  .file-actions {
    display: flex;
    gap: 8px;
  }

  .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    transition: all 0.3s;
    border: 1px solid #f0f0f0;
    border-radius: 50%;
    color: #ccc;
    cursor: pointer;

    &:hover {
      border-color: #00b96b;
      background: #e6f7ff;
      color: #00b96b;
    }
  }

  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 20px;
    border-top: 1px solid #f0f0f0;

    .footer-tip {
      color: #ccc;
      font-size: 13px;
    }

    .close-btn {
      color: #666;
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;

      &:hover {
        color: #333;
      }
    }
  }
</style>
