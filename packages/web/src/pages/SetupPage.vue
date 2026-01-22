<template>
  <div class="setup-page">
    <a-card class="setup-card" :bordered="false">
      <template #title>首次运行初始化</template>
      <a-alert
        type="info"
        show-icon
        message="系统检测到尚未完成初始化配置，请按步骤完成环境检查、数据库与端口配置。"
      />
    </a-card>

    <a-card class="setup-card" :bordered="false">
      <template #title>1. 环境检查</template>
      <div class="card-actions">
        <a-button @click="refreshChecks" :loading="checking">重新检测</a-button>
      </div>
      <a-list :data-source="setup.checks" :locale="{ emptyText: '暂无检查结果' }">
        <template #renderItem="{ item }">
          <a-list-item>
            <a-space size="middle">
              <a-tag :color="item.ok ? 'green' : 'red'">{{ item.ok ? '通过' : '未满足' }}</a-tag>
              <div class="check-title">{{ item.label }}</div>
              <div class="check-meta">要求：{{ item.required }}</div>
              <div class="check-meta">当前：{{ item.current }}</div>
            </a-space>
          </a-list-item>
        </template>
      </a-list>
    </a-card>

    <a-card class="setup-card" :bordered="false">
      <template #title>2. 配置数据库</template>
      <a-form layout="vertical">
        <a-row :gutter="[16, 16]">
          <a-col :xs="24" :md="12">
            <a-form-item label="数据库主机" required>
              <a-input v-model:value="dbForm.host" placeholder="例如 127.0.0.1" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="12">
            <a-form-item label="数据库端口" required>
              <a-input-number v-model:value="dbForm.port" :min="1" :max="65535" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="12">
            <a-form-item label="用户名" required>
              <a-input v-model:value="dbForm.user" placeholder="例如 postgres" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="12">
            <a-form-item label="密码" required>
              <a-input-password v-model:value="dbForm.password" placeholder="数据库密码" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="12">
            <a-form-item label="数据库名称" required>
              <a-input v-model:value="dbForm.database" placeholder="例如 chronoatlas" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="12">
            <a-form-item label="SSL 连接">
              <a-switch v-model:checked="dbForm.ssl" checked-children="开启" un-checked-children="关闭" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-divider orientation="left">高级选项</a-divider>
        <a-row :gutter="[16, 16]">
          <a-col :xs="24" :md="12">
            <a-form-item label="Schema">
              <a-input v-model:value="dbForm.schema" placeholder="public" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="12">
            <a-form-item label="数据表">
              <a-input v-model:value="dbForm.table" placeholder="app_data" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-space size="middle">
          <a-button @click="handleTestDb" :loading="testing">测试连接</a-button>
          <span v-if="testResult" :class="testResult.ok ? 'text-success' : 'text-danger'">
            {{ testResult.message }}
          </span>
        </a-space>
      </a-form>
    </a-card>

    <a-card class="setup-card" :bordered="false">
      <template #title>3. 配置端口</template>
      <a-form layout="vertical">
        <a-row :gutter="[16, 16]">
          <a-col :xs="24" :md="12">
            <a-form-item label="后端端口" required>
              <a-input-number v-model:value="portForm.backendPort" :min="1" :max="65535" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="12">
            <a-form-item label="前端端口" required>
              <a-input-number v-model:value="portForm.frontendPort" :min="1" :max="65535" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-card>

    <div class="setup-actions">
      <a-button type="primary" size="large" :loading="saving" @click="handleSave">
        保存配置
      </a-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { notification } from "ant-design-vue";
import { useAppStore } from "../store/appStore";

const { setup, loadSetupStatus, loadSetupChecks, testDatabaseConnection, saveSetupConfig } =
  useAppStore();

const checking = ref(false);
const testing = ref(false);
const saving = ref(false);
const testResult = ref<{ ok: boolean; message: string } | null>(null);

const dbForm = reactive({
  host: "",
  port: 5432,
  user: "",
  password: "",
  database: "",
  ssl: false,
  schema: "public",
  table: "app_data"
});

const portForm = reactive({
  backendPort: setup.ports.backendPort,
  frontendPort: setup.ports.frontendPort
});

const refreshChecks = async () => {
  checking.value = true;
  try {
    await loadSetupChecks();
  } finally {
    checking.value = false;
  }
};

const handleTestDb = async () => {
  testing.value = true;
  testResult.value = null;
  try {
    const result = await testDatabaseConnection({ ...dbForm });
    testResult.value = result as { ok: boolean; message: string };
    if (result?.ok) {
      notification.success({ message: "数据库连接成功" });
    } else {
      notification.error({ message: "数据库连接失败", description: result?.message || "请检查配置" });
    }
  } catch (error: any) {
    const message = error?.message || "数据库连接失败";
    testResult.value = { ok: false, message };
    notification.error({ message: "数据库连接失败", description: message });
  } finally {
    testing.value = false;
  }
};

const handleSave = async () => {
  saving.value = true;
  try {
    const result = await saveSetupConfig({
      database: { ...dbForm },
      ports: { ...portForm }
    });
    notification.success({
      message: "配置已保存",
      description: result?.message || "请重启后端与前端服务"
    });
    const targetPort = Number(portForm.frontendPort) || setup.ports.frontendPort;
    const protocol = window.location.protocol || "http:";
    const host = window.location.hostname || "localhost";
    const targetUrl =
      targetPort === 80 ? `${protocol}//${host}/` : `${protocol}//${host}:${targetPort}/`;
    setTimeout(() => {
      window.location.href = targetUrl;
    }, 800);
  } catch (error: any) {
    notification.error({
      message: "保存失败",
      description: error?.message || "请检查填写内容"
    });
  } finally {
    saving.value = false;
  }
};

onMounted(async () => {
  await loadSetupStatus();
  portForm.backendPort = setup.ports.backendPort;
  portForm.frontendPort = setup.ports.frontendPort;
  await refreshChecks();
});
</script>

<style scoped>
.setup-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setup-card {
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
}

.card-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}

.check-title {
  font-weight: 600;
  color: var(--color-text-primary);
}

.check-meta {
  color: var(--color-text-secondary);
  font-size: 12px;
}

.setup-actions {
  display: flex;
  justify-content: flex-end;
  padding-bottom: 12px;
}

.text-success {
  color: #16a34a;
}

.text-danger {
  color: #dc2626;
}
</style>
