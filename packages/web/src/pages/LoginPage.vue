<template>
  <div class="login-container">
    <a-card class="login-card" :bordered="false">
      <div class="login-header">
        <div class="brand-icon">
          <compass-outlined />
        </div>
        <h1 class="brand-title">ChronoAtlas</h1>
        <p class="brand-slogan">探索历史 · 编织时空</p>
      </div>

      <div v-if="user" class="user-status">
        <a-result
          status="success"
          title="您已登录"
          :sub-title="`${user.displayName} (${user.email})`"
        >
          <template #extra>
            <router-link to="/content" custom v-slot="{ navigate, href }">
              <a-button type="primary" :href="href" @click="navigate">进入内容管理</a-button>
            </router-link>
          </template>
        </a-result>
      </div>

      <a-form v-else layout="vertical" :model="formState" @finish="handleLogin" autocomplete="on">
        <a-form-item label="邮箱" name="email" :rules="[{ required: true, message: '请输入邮箱' }]">
          <a-input
            v-model:value="formState.email"
            placeholder="admin@chronoatlas.local…"
            size="large"
            name="email"
            type="email"
            inputmode="email"
            autocomplete="email"
            autocapitalize="none"
            spellcheck="false"
          >
            <template #prefix><UserOutlined /></template>
          </a-input>
        </a-form-item>

        <a-form-item label="密码" name="password" :rules="[{ required: true, message: '请输入密码' }]">
          <a-input-password
            v-model:value="formState.password"
            placeholder="admin123…"
            size="large"
            name="password"
            autocomplete="current-password"
          >
            <template #prefix><LockOutlined /></template>
          </a-input-password>
        </a-form-item>

        <a-alert v-if="error" :message="error" type="error" show-icon class="mb-4" aria-live="polite" />

        <a-button type="primary" html-type="submit" :loading="loading" block size="large">
          登录
        </a-button>
      </a-form>

      <div class="login-links">
        <router-link to="/register" custom v-slot="{ navigate, href }">
          <a-button type="link" :href="href" @click="navigate">注册账号</a-button>
        </router-link>
        <router-link to="/forgot-password" custom v-slot="{ navigate, href }">
          <a-button type="link" :href="href" @click="navigate">忘记密码</a-button>
        </router-link>
      </div>
      
      <div class="demo-account mt-6">
        <a-divider>演示账号</a-divider>
        <a-tag
          class="w-full text-center cursor-pointer"
          role="button"
          tabindex="0"
          aria-label="填充演示账号"
          @click="fillDemo"
          @keydown.enter.prevent="fillDemo"
          @keydown.space.prevent="fillDemo"
        >
          admin@chronoatlas.local / admin123
        </a-tag>
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAppStore } from "../store/appStore";
import { UserOutlined, LockOutlined, CompassOutlined } from "@ant-design/icons-vue";

const router = useRouter();
const route = useRoute();
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
    const target = typeof route.query.redirect === "string" ? route.query.redirect : "/content";
    await router.push(target);
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
  background: radial-gradient(circle at top right, rgba(16, 185, 129, 0.08), transparent 40%),
              radial-gradient(circle at bottom left, rgba(59, 130, 246, 0.08), transparent 40%);
}
.login-card {
  width: 100%;
  max-width: 420px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  border-radius: 16px;
  padding: 24px 12px;
}
:global([data-theme="dark"]) .login-card {
  background: rgba(30, 41, 59, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}
.login-header {
  text-align: center;
  margin-bottom: 40px;
}
.brand-icon {
  font-size: 48px;
  color: #10b981;
  margin-bottom: 16px;
  display: inline-block;
  filter: drop-shadow(0 4px 12px rgba(16, 185, 129, 0.3));
}
.brand-title {
  font-size: 28px;
  font-weight: 800;
  margin-bottom: 8px;
  background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -0.5px;
}
.brand-slogan {
  color: var(--color-text-secondary);
  font-size: 14px;
  letter-spacing: 2px;
  text-transform: uppercase;
  opacity: 0.8;
}
.mb-4 { margin-bottom: 24px; }
.mt-6 { margin-top: 32px; }
.w-full { width: 100%; display: block; }
.text-center { text-align: center; }
.cursor-pointer { cursor: pointer; }
.login-links {
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
  padding: 0 8px;
}
.login-links a {
  color: var(--color-text-secondary);
  transition: color 0.3s;
}
.login-links a:hover {
  color: #10b981;
}
</style>
