<template>
  <div class="login-container">
    <a-card class="login-card" :bordered="false">
      <div class="login-header">
        <h2 class="text-gradient-fern">找回密码</h2>
        <p class="text-secondary">填写邮箱后发送重置链接</p>
      </div>

      <a-result
        v-if="done"
        status="success"
        title="已发送"
        sub-title="如果邮箱存在，将收到重置链接"
      >
        <template #extra>
          <a-button type="primary" @click="router.push('/login')">返回登录</a-button>
        </template>
      </a-result>

      <a-form v-else layout="vertical" :model="formState" @finish="handleSubmit">
        <a-form-item label="邮箱" name="email" :rules="[{ required: true, message: '请输入邮箱' }]">
          <a-input v-model:value="formState.email" placeholder="you@example.com" size="large" />
        </a-form-item>

        <a-alert v-if="error" :message="error" type="error" show-icon class="mb-4" />

        <a-button type="primary" html-type="submit" :loading="loading" block size="large">
          发送重置邮件
        </a-button>

        <div class="login-links">
          <a-button type="link" @click="router.push('/login')">返回登录</a-button>
        </div>
      </a-form>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { useAppStore } from "../store/appStore";

const router = useRouter();
const { forgotPassword } = useAppStore();

const formState = reactive({
  email: ""
});

const loading = ref(false);
const error = ref("");
const done = ref(false);

const handleSubmit = async () => {
  error.value = "";
  loading.value = true;
  try {
    await forgotPassword(formState.email);
    done.value = true;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "发送失败";
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
.login-links {
  display: flex;
  justify-content: center;
  margin-top: 8px;
}
</style>
