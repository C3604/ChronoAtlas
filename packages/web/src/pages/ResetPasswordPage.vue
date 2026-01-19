<template>
  <div class="login-container">
    <a-card class="login-card" :bordered="false">
      <div class="login-header">
        <h2 class="text-gradient-fern">重置密码</h2>
        <p class="text-secondary">请输入新的密码</p>
      </div>

      <a-result
        v-if="done"
        status="success"
        title="密码已更新"
        sub-title="请使用新密码登录"
      >
        <template #extra>
          <a-button type="primary" @click="router.push('/login')">去登录</a-button>
        </template>
      </a-result>

      <a-form v-else layout="vertical" :model="formState" @finish="handleReset">
        <a-form-item label="新密码" name="newPassword" :rules="[{ required: true, message: '请输入新密码' }]">
          <a-input-password v-model:value="formState.newPassword" placeholder="至少 8 位，含大小写和数字" size="large" />
        </a-form-item>

        <a-form-item label="确认新密码" name="confirmPassword" :rules="[{ required: true, message: '请再次输入新密码' }]">
          <a-input-password v-model:value="formState.confirmPassword" placeholder="再次输入新密码" size="large" />
        </a-form-item>

        <a-alert v-if="error" :message="error" type="error" show-icon class="mb-4" />

        <a-button type="primary" html-type="submit" :loading="loading" block size="large">
          更新密码
        </a-button>
      </a-form>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAppStore } from "../store/appStore";

const router = useRouter();
const route = useRoute();
const { resetPassword } = useAppStore();

const formState = reactive({
  newPassword: "",
  confirmPassword: ""
});

const loading = ref(false);
const error = ref("");
const done = ref(false);

const handleReset = async () => {
  error.value = "";
  const token = String(route.query.token || "").trim();
  if (!token) {
    error.value = "缺少重置 token";
    return;
  }
  if (formState.newPassword !== formState.confirmPassword) {
    error.value = "两次输入的密码不一致";
    return;
  }
  loading.value = true;
  try {
    await resetPassword(token, formState.newPassword);
    done.value = true;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "更新失败";
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.login-container {
  min-height: calc(100vh - 64px - 48px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.login-card {
  width: 100%;
  max-width: 420px;
  background: rgba(30, 41, 59, 0.6);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
:global([data-theme="light"]) .login-card {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(15, 23, 42, 0.08);
}
.login-header {
  text-align: center;
  margin-bottom: 24px;
}
.text-gradient-fern {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 8px;
}
.text-secondary {
  color: var(--color-text-secondary);
}
.mb-4 { margin-bottom: 16px; }
</style>
