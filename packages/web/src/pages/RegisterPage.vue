<template>
  <div class="login-container">
    <a-card class="login-card" :bordered="false">
      <div class="login-header">
        <h2 class="text-gradient-fern">创建账号</h2>
        <p class="text-secondary">注册后需要完成邮箱验证</p>
      </div>

      <a-result
        v-if="done"
        status="success"
        title="注册成功"
        sub-title="验证邮件已发送，请查收后完成验证"
      >
        <template #extra>
          <a-button type="primary" @click="router.push('/login')">返回登录</a-button>
        </template>
      </a-result>

      <a-form v-else layout="vertical" :model="formState" @finish="handleRegister">
        <a-form-item label="显示名" name="displayName" :rules="[{ required: true, message: '请输入显示名' }]">
          <a-input v-model:value="formState.displayName" placeholder="历史爱好者" size="large" />
        </a-form-item>

        <a-form-item label="邮箱" name="email" :rules="[{ required: true, message: '请输入邮箱' }]">
          <a-input v-model:value="formState.email" placeholder="you@example.com" size="large" />
        </a-form-item>

        <a-form-item label="密码" name="password" :rules="[{ required: true, message: '请输入密码' }]">
          <a-input-password v-model:value="formState.password" placeholder="至少 8 位，含大小写和数字" size="large" />
        </a-form-item>

        <a-form-item label="确认密码" name="confirmPassword" :rules="[{ required: true, message: '请再次输入密码' }]">
          <a-input-password v-model:value="formState.confirmPassword" placeholder="再次输入密码" size="large" />
        </a-form-item>

        <a-alert v-if="error" :message="error" type="error" show-icon class="mb-4" />

        <a-button type="primary" html-type="submit" :loading="loading" block size="large">
          注册
        </a-button>

        <div class="login-links">
          <a-button type="link" @click="router.push('/login')">已有账号，去登录</a-button>
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
