<template>
  <div class="page-container">
    <a-row :gutter="24">
      <a-col :xs="24" :sm="24" :md="24" :lg="24">
        <a-card :bordered="false" title="个人信息">
          <template #extra>
            <span class="text-secondary">邮箱与角色由系统管理</span>
          </template>

          <div v-if="!user" class="text-center py-8">
            <a-empty description="请先登录">
              <router-link to="/login" custom v-slot="{ navigate, href }">
                <a-button type="primary" :href="href" @click="navigate">去登录</a-button>
              </router-link>
            </a-empty>
          </div>

          <div v-else>
            <a-descriptions title="当前账号" bordered class="mb-6" :column="{ xs: 1, sm: 2 }">
              <a-descriptions-item label="显示名">{{ user.displayName }}</a-descriptions-item>
              <a-descriptions-item label="邮箱">{{ user.email }}</a-descriptions-item>
              <a-descriptions-item label="角色">
                <a-tag color="blue">{{ formatRole(user.roles) }}</a-tag>
              </a-descriptions-item>
              <a-descriptions-item label="邮箱验证">
                <a-tag :color="user.emailVerified ? 'green' : 'orange'">
                  {{ user.emailVerified ? '已验证' : '未验证' }}
                </a-tag>
              </a-descriptions-item>
            </a-descriptions>

            <a-divider>更新显示名</a-divider>

            <a-form layout="vertical" :model="profileForm" @finish="handleSaveProfile" autocomplete="on">
              <a-form-item name="displayName" label="显示名" required>
                <a-input v-model:value="profileForm.displayName" name="displayName" autocomplete="name" />
              </a-form-item>
              <div class="form-actions">
                <a-button type="primary" html-type="submit" :loading="savingProfile">保存修改</a-button>
              </div>
            </a-form>

            <a-divider>修改密码</a-divider>

            <a-form layout="vertical" :model="passwordForm" @finish="handleChangePassword" autocomplete="on">
              <a-form-item name="currentPassword" label="当前密码" required>
                <a-input-password
                  v-model:value="passwordForm.currentPassword"
                  name="currentPassword"
                  autocomplete="current-password"
                />
              </a-form-item>
              <a-form-item name="newPassword" label="新密码" required>
                <a-input-password
                  v-model:value="passwordForm.newPassword"
                  name="newPassword"
                  autocomplete="new-password"
                />
              </a-form-item>
              <div class="form-actions">
                <a-button type="primary" html-type="submit" :loading="savingPassword">更新密码</a-button>
              </div>
            </a-form>
          </div>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import { useAppStore } from "../store/appStore";
import { message } from "ant-design-vue";

const { user, updateProfile, changePassword, formatRole } = useAppStore();

const savingProfile = ref(false);
const savingPassword = ref(false);

const profileForm = reactive({
  displayName: ""
});

const passwordForm = reactive({
  currentPassword: "",
  newPassword: ""
});

watch(
  user,
  (value) => {
    if (!value) {
      return;
    }
    profileForm.displayName = value.displayName;
  },
  { immediate: true }
);

const handleSaveProfile = async () => {
  if (!user.value) {
    return;
  }
  if (!profileForm.displayName.trim()) {
    message.error("显示名不能为空");
    return;
  }
  savingProfile.value = true;
  try {
    await updateProfile(profileForm.displayName.trim());
    message.success("已保存");
  } catch (error) {
    message.error(error instanceof Error ? error.message : "保存失败");
  } finally {
    savingProfile.value = false;
  }
};

const handleChangePassword = async () => {
  if (!user.value) {
    return;
  }
  if (!passwordForm.currentPassword.trim() || !passwordForm.newPassword.trim()) {
    message.error("请填写当前密码和新密码");
    return;
  }
  savingPassword.value = true;
  try {
    await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
    message.success("密码已更新");
    passwordForm.currentPassword = "";
    passwordForm.newPassword = "";
  } catch (error) {
    message.error(error instanceof Error ? error.message : "更新失败");
  } finally {
    savingPassword.value = false;
  }
};
</script>

<style scoped>
.page-container {
  width: 100%;
  padding: 24px clamp(16px, 3vw, 40px);
}
.text-secondary {
  color: var(--color-text-secondary);
}
.text-center {
  text-align: center;
}
.py-8 {
  padding-top: 32px;
  padding-bottom: 32px;
}
.mb-6 {
  margin-bottom: 24px;
}
.form-actions {
  text-align: right;
  margin-top: 16px;
}
</style>
