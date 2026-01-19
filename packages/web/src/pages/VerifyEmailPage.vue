<template>
  <div class="login-container">
    <a-card class="login-card" :bordered="false">
      <div class="login-header">
        <h2 class="text-gradient-fern">邮箱验证</h2>
        <p class="text-secondary">正在确认您的邮箱</p>
      </div>

      <a-result
        v-if="state === 'success'"
        status="success"
        title="验证成功"
        sub-title="您可以继续登录使用"
      >
        <template #extra>
          <a-button type="primary" @click="router.push('/login')">去登录</a-button>
        </template>
      </a-result>

      <a-result
        v-else-if="state === 'error'"
        status="error"
        title="验证失败"
        :sub-title="message"
      >
        <template #extra>
          <a-button @click="router.push('/login')">返回登录</a-button>
        </template>
      </a-result>

      <a-result v-else status="info" title="验证中" sub-title="请稍候" />
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAppStore } from "../store/appStore";

const router = useRouter();
const route = useRoute();
const { verifyEmail } = useAppStore();

const state = ref<"loading" | "success" | "error">("loading");
const message = ref("");

onMounted(async () => {
  const token = String(route.query.token || "").trim();
  if (!token) {
    state.value = "error";
    message.value = "缺少验证 token";
    return;
  }
  try {
    await verifyEmail(token);
    state.value = "success";
  } catch (error) {
    state.value = "error";
    message.value = error instanceof Error ? error.message : "验证失败";
  }
});
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
</style>
