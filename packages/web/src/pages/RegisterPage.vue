﻿<template>
  <div class="login-container">
    <a-card class="login-card" :bordered="false">
      <div class="login-header">
        <div class="brand-icon">
          <compass-outlined />
        </div>
        <h1 class="brand-title">创建账号</h1>
        <p class="brand-slogan">开启您的时空之旅</p>
      </div>

      <a-result
        v-if="done"
        status="success"
        title="注册成功"
        sub-title="验证邮件已发送，请查收后完成验证"
      >
        <template #extra>
          <router-link to="/login" custom v-slot="{ navigate, href }">
            <a-button type="primary" :href="href" @click="navigate">返回登录</a-button>
          </router-link>
        </template>
      </a-result>

      <a-form v-else layout="vertical" :model="formState" @finish="handleRegister" autocomplete="on">
        <a-form-item label="显示名" name="displayName" :rules="[{ required: true, message: '请输入显示名' }]">
          <a-input
            v-model:value="formState.displayName"
            placeholder="历史爱好者…"
            size="large"
            name="displayName"
            autocomplete="name"
          />
        </a-form-item>

        <a-form-item label="邮箱" name="email" :rules="[{ required: true, message: '请输入邮箱' }]">
          <a-input
            v-model:value="formState.email"
            placeholder="you@example.com…"
            size="large"
            name="email"
            type="email"
            inputmode="email"
            autocomplete="email"
            autocapitalize="none"
            spellcheck="false"
          />
        </a-form-item>

        <a-form-item label="密码" name="password" :rules="[{ required: true, message: '请输入密码' }]">
          <a-input-password
            v-model:value="formState.password"
            placeholder="至少 8 位，含大小写和数字…"
            size="large"
            name="password"
            autocomplete="new-password"
          />
        </a-form-item>

        <a-form-item label="确认密码" name="confirmPassword" :rules="[{ required: true, message: '请再次输入密码' }]">
          <a-input-password
            v-model:value="formState.confirmPassword"
            placeholder="再次输入密码…"
            size="large"
            name="confirmPassword"
            autocomplete="new-password"
          />
        </a-form-item>

        <a-alert v-if="error" :message="error" type="error" show-icon class="mb-4" aria-live="polite" />

        <a-button type="primary" html-type="submit" :loading="loading" block size="large">
          注册
        </a-button>

        <div class="login-links">
          <router-link to="/login" custom v-slot="{ navigate, href }">
            <a-button type="link" :href="href" @click="navigate">已有账号，去登录</a-button>
          </router-link>
        </div>
      </a-form>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import { useAppStore } from "../store/appStore";
import { CompassOutlined } from "@ant-design/icons-vue";

const { register } = useAppStore();

const formState = reactive({
  displayName: "",
  email: "",
  password: "",
  confirmPassword: ""
});

const loading = ref(false);
const error = ref("");
const done = ref(false);

const handleRegister = async () => {
  error.value = "";
  if (formState.password !== formState.confirmPassword) {
    error.value = "两次输入的密码不一致";
    return;
  }
  loading.value = true;
  try {
    await register(formState.email, formState.displayName, formState.password);
    done.value = true;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "注册失败";
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
  margin-bottom: 32px;
}
.brand-icon {
  font-size: 40px;
  color: #10b981;
  margin-bottom: 16px;
  display: inline-block;
  filter: drop-shadow(0 4px 12px rgba(16, 185, 129, 0.3));
}
.brand-title {
  font-size: 24px;
  font-weight: 800;
  margin-bottom: 8px;
  color: var(--color-text-primary);
  letter-spacing: -0.5px;
}
.brand-slogan {
  color: var(--color-text-secondary);
  font-size: 14px;
  letter-spacing: 1px;
  opacity: 0.8;
}
.mb-4 { margin-bottom: 24px; }
.login-links {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}
.login-links a {
  color: var(--color-text-secondary);
  transition: color 0.3s;
}
.login-links a:hover {
  color: #10b981;
}
</style>
