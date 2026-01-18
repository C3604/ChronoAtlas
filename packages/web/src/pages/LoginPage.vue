<template>
  <div class="login-container">
    <a-card class="login-card" :bordered="false">
      <div class="login-header">
        <h2 class="text-gradient-fern">欢迎回来</h2>
        <p class="text-secondary">登录 ChronoAtlas 管理后台</p>
      </div>

      <div v-if="user" class="user-status">
        <a-result
          status="success"
          title="您已登录"
          :sub-title="`${user.name} (${user.email})`"
        >
          <template #extra>
            <a-button type="primary" @click="router.push('/content')">进入内容管理</a-button>
          </template>
        </a-result>
      </div>

      <a-form v-else layout="vertical" :model="formState" @finish="handleLogin">
        <a-form-item label="邮箱" name="email" :rules="[{ required: true, message: '请输入邮箱' }]">
          <a-input v-model:value="formState.email" placeholder="admin@chronoatlas.local" size="large">
            <template #prefix><UserOutlined /></template>
          </a-input>
        </a-form-item>

        <a-form-item label="密码" name="password" :rules="[{ required: true, message: '请输入密码' }]">
          <a-input-password v-model:value="formState.password" placeholder="admin123" size="large">
            <template #prefix><LockOutlined /></template>
          </a-input-password>
        </a-form-item>

        <a-alert v-if="error" :message="error" type="error" show-icon class="mb-4" />

        <a-button type="primary" html-type="submit" :loading="loading" block size="large">
          登录
        </a-button>
      </a-form>
      
      <div class="demo-account mt-6">
        <a-divider>演示账号</a-divider>
        <a-tag class="w-full text-center cursor-pointer" @click="fillDemo">
          admin@chronoatlas.local / admin123
        </a-tag>
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { useAppStore } from "../store/appStore";
import { UserOutlined, LockOutlined } from "@ant-design/icons-vue";

const router = useRouter();
const { user, login } = useAppStore();

const formState = reactive({
  email: "",
  password: ""
});
const loading = ref(false);
const error = ref("");

const handleLogin = async () => {
  error.value = "";
  loading.value = true;
  try {
    await login(formState.email, formState.password);
    await router.push("/content");
  } catch (err) {
    error.value = err instanceof Error ? err.message : "登录失败";
  } finally {
    loading.value = false;
  }
};

const fillDemo = () => {
  formState.email = "admin@chronoatlas.local";
  formState.password = "admin123";
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
  max-width: 400px;
  background: rgba(30, 41, 59, 0.6); /* Glassmorphism */
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
:global([data-theme="light"]) .login-card {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(15, 23, 42, 0.08);
}
.login-header {
  text-align: center;
  margin-bottom: 32px;
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
.mt-6 { margin-top: 24px; }
.w-full { width: 100%; display: block; }
.text-center { text-align: center; }
.cursor-pointer { cursor: pointer; }
</style>
