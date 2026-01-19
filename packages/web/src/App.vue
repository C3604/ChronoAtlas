<template>
  <a-config-provider :theme="themeConfig">
    <a-layout class="app-layout">
      <a-layout-header class="header">
        <div class="header-content">
          <div class="brand" @click="router.push('/')">
            <div class="brand-title text-gradient-fern">ChronoAtlas</div>
            <div class="brand-sub">时序史鉴</div>
          </div>

          <!-- Desktop Navigation -->
          <div class="desktop-nav">
            <a-menu
              v-if="menuItems.length"
              v-model:selectedKeys="selectedKeys"
              mode="horizontal"
              :items="menuItems"
              @click="handleMenuClick"
              class="nav-menu"
            />
            
            <!-- Theme Toggle -->
            <a-button type="text" @click="toggleTheme" class="theme-btn">
              <template #icon>
                <bulb-filled v-if="isDark" />
                <bulb-outlined v-else />
              </template>
            </a-button>

            <div class="user-actions">
              <template v-if="user">
                <a-dropdown>
                  <a-button type="text" class="user-btn">
                    <template #icon><UserOutlined /></template>
                    {{ user.displayName }}
                  </a-button>
                  <template #overlay>
                    <a-menu>
                      <a-menu-item key="role">
                        <a-tag color="success">{{ formatRole(user.roles) }}</a-tag>
                      </a-menu-item>
                      <a-menu-divider />
                      <a-menu-item key="content" @click="handleUserMenuClick('/content')">
                        <ReadOutlined /> 内容编辑
                      </a-menu-item>
                      <a-menu-item key="profile" @click="handleUserMenuClick('/profile')">
                        <UserOutlined /> 我的信息
                      </a-menu-item>
                      <a-menu-divider />
                      <a-menu-item key="logout" @click="handleLogout">
                        <LogoutOutlined /> 退出登录
                      </a-menu-item>
                    </a-menu>
                  </template>
                </a-dropdown>
              </template>
              <template v-else>
                <a-button type="primary" ghost @click="router.push('/login')">
                  登录
                </a-button>
              </template>
            </div>
          </div>

          <!-- Mobile Navigation Trigger -->
          <div class="mobile-trigger">
            <a-button type="text" @click="toggleTheme" class="theme-btn-mobile">
              <template #icon>
                <bulb-filled v-if="isDark" />
                <bulb-outlined v-else />
              </template>
            </a-button>
            <a-button type="text" @click="drawerVisible = true">
              <MenuOutlined />
            </a-button>
          </div>
        </div>
      </a-layout-header>

      <a-layout-content class="content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </a-layout-content>

      <!-- Mobile Navigation Drawer -->
      <a-drawer
        title="导航"
        placement="right"
        :closable="true"
        v-model:open="drawerVisible"
      >
        <a-menu
          v-if="menuItems.length"
          v-model:selectedKeys="selectedKeys"
          mode="inline"
          :items="menuItems"
          @click="handleMenuClick"
        />
        <div class="drawer-footer">
          <template v-if="user">
            <div class="user-info">
              <span class="user-name">{{ user.displayName }}</span>
              <a-tag color="success">{{ formatRole(user.roles) }}</a-tag>
            </div>
            <a-button block class="drawer-action" @click="handleUserMenuClick('/content')">
              <ReadOutlined /> 内容编辑
            </a-button>
            <a-button block class="drawer-action" @click="handleUserMenuClick('/profile')">
              <UserOutlined /> 我的信息
            </a-button>
            <a-button block danger @click="handleLogout">
              <LogoutOutlined /> 退出
            </a-button>
          </template>
          <template v-else>
            <a-button block type="primary" @click="handleLoginClick">
              登录
            </a-button>
          </template>
        </div>
      </a-drawer>
    </a-layout>
  </a-config-provider>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAppStore } from "./store/appStore";
import { theme, notification } from "ant-design-vue";
import {
  HomeOutlined,
  ReadOutlined,
  UserOutlined,
  MenuOutlined,
  LogoutOutlined,
  BulbOutlined,
  BulbFilled
} from "@ant-design/icons-vue";

const router = useRouter();
const route = useRoute();
const { apiBase, status, user, loadStatus, ensureProfileLoaded, logout, formatRole } = useAppStore();

// Theme State
const isDark = ref(localStorage.getItem('theme') === 'dark');

const toggleTheme = () => {
  isDark.value = !isDark.value;
  const themeValue = isDark.value ? 'dark' : 'light';
  localStorage.setItem('theme', themeValue);
  document.documentElement.dataset.theme = themeValue;
};

// Initialize theme
document.documentElement.dataset.theme = isDark.value ? 'dark' : 'light';

// Theme Configuration
const themeConfig = computed(() => ({
  algorithm: isDark.value ? theme.darkAlgorithm : theme.defaultAlgorithm,
  token: {
    colorPrimary: '#10B981', // Matching --color-success
    colorBgBase: isDark.value ? '#0F172A' : '#F8FAFC',  // --color-bg-default
    colorBgContainer: isDark.value ? '#1E293B' : '#FFFFFF', // --color-bg-surface
    borderRadius: 8,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
}));

// Navigation State
const drawerVisible = ref(false);
const selectedKeys = ref<string[]>([]);

// Menu Items
const menuItems = computed(() => {
  if (route.path === '/') {
    return [];
  }
  return [
    {
      key: '/',
      label: '主页',
      icon: () => h(HomeOutlined),
    }
  ];
});

// Watch route to update selected menu
watch(
  () => route.path,
  (path) => {
    selectedKeys.value = [path];
  },
  { immediate: true }
);

// Handlers
const handleMenuClick = ({ key }: { key: string }) => {
  router.push(key);
  drawerVisible.value = false;
};

const handleLoginClick = () => {
  router.push('/login');
  drawerVisible.value = false;
};

const handleUserMenuClick = (path: string) => {
  router.push(path);
  drawerVisible.value = false;
};

const handleLogout = async () => {
  await logout();
  drawerVisible.value = false;
  await router.push("/");
};

// Lifecycle
onMounted(async () => {
  await loadStatus();
  if (!status.ok) {
    const description = status.text || "服务异常";
    notification.error({
      message: "后端服务异常",
      description
    });
    console.error(`[后端服务异常] ${description}`, { apiBase });
  }
  await ensureProfileLoaded();
});
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
  background: var(--color-bg-default);
  transition: background 0.3s;
}

.header {
  padding: 0 24px;
  background: var(--color-bg-surface);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 100;
  height: 64px;
  transition: background 0.3s, border-color 0.3s;
  opacity: 0.95;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: flex;
  align-items: baseline;
  gap: 8px;
  cursor: pointer;
}

.brand-title {
  font-size: 1.25rem;
  font-weight: 700;
  background: linear-gradient(135deg, #00F260 0%, #0575E6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.brand-sub {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.desktop-nav {
  display: flex;
  align-items: center;
  gap: 16px;
}

.nav-menu {
  background: transparent;
  border-bottom: none;
  min-width: 300px;
}

.mobile-trigger {
  display: none;
  align-items: center;
  gap: 8px;
}

.content {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.drawer-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  padding: 16px;
  border-top: 1px solid var(--color-border);
}

.drawer-action {
  margin-bottom: 8px;
}

.user-info {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.user-name {
  font-weight: 600;
  color: var(--color-text-primary);
}

.theme-btn {
  color: var(--color-text-primary);
}

.theme-btn-mobile {
  color: var(--color-text-primary);
}

/* Responsive */
@media (max-width: 768px) {
  .desktop-nav {
    display: none;
  }
  
  .mobile-trigger {
    display: flex;
  }
  
  .header {
    padding: 0 16px;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
