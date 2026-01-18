<template>
  <div class="page-container">
    <a-row :gutter="24" justify="center">
      <a-col :xs="24" :sm="24" :md="20" :lg="16">
        <a-card :bordered="false" title="个人信息">
          <template #extra>
             <span class="text-secondary">用户 ID 固定不可修改</span>
          </template>
          
          <div v-if="!user" class="text-center py-8">
            <a-empty description="请先登录">
              <a-button type="primary" @click="router.push('/login')">去登录</a-button>
            </a-empty>
          </div>

          <div v-else>
            <a-descriptions title="当前账号" bordered class="mb-6" :column="{ xs: 1, sm: 2 }">
              <a-descriptions-item label="角色">
                <a-tag color="blue">{{ formatRole(user.role) }}</a-tag>
              </a-descriptions-item>
              <a-descriptions-item label="邮箱">{{ user.email }}</a-descriptions-item>
            </a-descriptions>

            <a-divider>编辑资料</a-divider>

            <a-form layout="vertical" :model="form" @finish="handleSave">
              <a-row :gutter="16">
                <a-col :xs="24" :sm="12">
                  <a-form-item name="name" label="用户名">
                    <a-input v-model:value="form.name" />
                  </a-form-item>
                </a-col>
                <a-col :xs="24" :sm="12">
                  <a-form-item name="email" label="邮箱">
                    <a-input v-model:value="form.email" />
                  </a-form-item>
                </a-col>
                <a-col :span="24">
                  <a-form-item name="password" label="新密码" help="留空表示不修改">
                    <a-input-password v-model:value="form.password" placeholder="********" />
                  </a-form-item>
                </a-col>
                <a-col :xs="24" :sm="12">
                   <a-form-item name="profile.phone" label="电话">
                     <a-input v-model:value="form.profile.phone" placeholder="可选" />
                   </a-form-item>
                </a-col>
                <a-col :xs="24" :sm="12">
                   <a-form-item name="profile.title" label="职位">
                     <a-input v-model:value="form.profile.title" placeholder="可选" />
                   </a-form-item>
                </a-col>
                <a-col :xs="24" :sm="12">
                   <a-form-item name="profile.organization" label="机构">
                     <a-input v-model:value="form.profile.organization" placeholder="可选" />
                   </a-form-item>
                </a-col>
                <a-col :xs="24" :sm="12">
                   <a-form-item name="profile.location" label="所在地">
                     <a-input v-model:value="form.profile.location" placeholder="可选" />
                   </a-form-item>
                </a-col>
                <a-col :span="24">
                  <a-form-item name="profile.bio" label="个人简介">
                    <a-textarea v-model:value="form.profile.bio" :rows="3" placeholder="可选" />
                  </a-form-item>
                </a-col>
              </a-row>

              <div class="form-actions">
                <a-button type="primary" html-type="submit" :loading="loading">保存修改</a-button>
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
import { useRouter } from "vue-router";
import { useAppStore } from "../store/appStore";
import { message } from "ant-design-vue";

const router = useRouter();
const { user, updateUser, loadProfile, formatRole } = useAppStore();

const loading = ref(false);

const form = reactive({
  name: "",
  email: "",
  password: "",
  profile: {
    phone: "",
    title: "",
    organization: "",
    location: "",
    bio: ""
  }
});

const fillForm = () => {
  if (!user.value) return;
  form.name = user.value.name;
  form.email = user.value.email;
  form.password = "";
  form.profile.phone = user.value.profile?.phone ?? "";
  form.profile.title = user.value.profile?.title ?? "";
  form.profile.organization = user.value.profile?.organization ?? "";
  form.profile.location = user.value.profile?.location ?? "";
  form.profile.bio = user.value.profile?.bio ?? "";
};

watch(user, fillForm, { immediate: true });

const handleSave = async () => {
  if (!user.value) return;
  if (!form.name.trim() || !form.email.trim()) {
    message.error("用户名和邮箱不能为空");
    return;
  }
  loading.value = true;
  try {
    const payload: any = {
      name: form.name.trim(),
      email: form.email.trim(),
      profile: { ...form.profile }
    };
    if (form.password.trim()) {
      payload.password = form.password;
    }
    await updateUser(user.value.id, payload);
    await loadProfile();
    message.success("已保存");
    form.password = "";
  } catch (err) {
    message.error(err instanceof Error ? err.message : "保存失败");
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.page-container {
  padding: 24px;
}
.text-secondary { color: var(--color-text-secondary); }
.text-center { text-align: center; }
.py-8 { padding-top: 32px; padding-bottom: 32px; }
.mb-6 { margin-bottom: 24px; }
.form-actions { text-align: right; margin-top: 16px; }
</style>

