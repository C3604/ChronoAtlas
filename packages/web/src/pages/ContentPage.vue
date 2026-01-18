<template>
  <div class="page-container" style="padding: 24px">
    <a-typography-title :level="2">内容编辑中心</a-typography-title>

    <div v-if="!user">
      <a-alert
        message="请先登录后再使用内容编辑功能"
        type="warning"
        show-icon
      />
    </div>

    <div v-else>
      <a-alert
        message="提示"
        description="内容编辑提交后需要审批，内容管理员/超级管理员可直接生效。"
        type="info"
        show-icon
        closable
        style="margin-bottom: 24px"
      />

      <a-tabs v-model:activeKey="tab">
        <!-- Events Tab -->
        <a-tab-pane v-if="canWriteContent" key="events" tab="事件管理">
          <!-- Approvals Section -->
          <a-card
            v-if="canApproveContent"
            title="待审批列表"
            size="small"
            style="margin-bottom: 24px"
            :bordered="false"
            class="approval-card"
          >
            <template #extra>
              <a-button type="link" @click="refreshApprovals">刷新审批</a-button>
            </template>
            <div v-if="approvalError">
              <a-alert :message="approvalError" type="error" show-icon />
            </div>
            <a-empty v-else-if="approvals.length === 0" description="暂无待审批事件" />
            <a-list
              v-else
              item-layout="horizontal"
              :data-source="approvals"
            >
              <template #renderItem="{ item }">
                <a-list-item>
                  <template #actions>
                    <a-button type="primary" size="small" @click="approve(item.id)">通过</a-button>
                    <a-button danger size="small" @click="reject(item.id)">拒绝</a-button>
                  </template>
                  <a-list-item-meta
                    :description="`提交人：${item.requestedByName || item.requestedBy || '-'} · ${formatDateTime(item.requestedAt)}`"
                  >
                    <template #title>
                      <span>
                        <a-tag :color="item.action === 'delete' ? 'red' : 'blue'">{{ approvalActionLabel(item.action) }}</a-tag>
                        {{ approvalTitle(item) }}
                      </span>
                    </template>
                  </a-list-item-meta>
                </a-list-item>
              </template>
            </a-list>
          </a-card>

          <!-- Events Toolbar -->
          <div style="margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
            <a-space>
              <a-button type="primary" @click="openCreateEventModal" :disabled="!canWriteContent">
                <template #icon><plus-outlined /></template>
                新增事件
              </a-button>
              <a-button @click="refreshEvents" :loading="loading">刷新</a-button>
            </a-space>
            <span style="color: #999">共 {{ events.length }} 条</span>
          </div>

          <!-- Events Table -->
          <div v-if="!canWriteContent">
             <a-alert message="当前账号没有内容权限" type="warning" />
          </div>
          <a-table
            v-else
            :dataSource="events"
            :columns="eventColumns"
            rowKey="id"
            :loading="loading"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'time'">
                <div>{{ formatEventTime(record.time) }}</div>
              </template>
              <template v-if="column.key === 'precision'">
                <a-tag>{{ record.time.precision }}</a-tag>
              </template>
              <template v-if="column.key === 'tags'">
                <a-space size="small" wrap>
                  <a-tag v-for="tag in getEventTagLabels(record)" :key="tag" color="blue">{{ tag }}</a-tag>
                  <a-tag v-for="cat in mapCategories(record.categoryIds)" :key="cat" color="cyan">{{ cat }}</a-tag>
                </a-space>
              </template>
              <template v-if="column.key === 'action'">
                <a-space>
                  <a-button type="link" size="small" @click="beginEdit(record)">编辑</a-button>
                  <a-popconfirm title="确定要删除该事件吗？" @confirm="removeEvent(record.id)">
                    <a-button type="link" danger size="small">删除</a-button>
                  </a-popconfirm>
                </a-space>
              </template>
            </template>
            
            <!-- Expanded Row for Versions -->
            <template #expandedRowRender="{ record }">
              <div style="margin: 10px 0;">
                <div style="margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
                   <h4 style="margin: 0">版本历史</h4>
                   <a-button size="small" @click="toggleVersions(record.id)">加载/刷新版本</a-button>
                </div>
                
                <a-empty v-if="!versions[record.id] || versions[record.id].length === 0" description="暂无版本记录或未加载" />
                <a-list
                  v-else
                  size="small"
                  bordered
                  :data-source="versions[record.id]"
                >
                  <template #renderItem="{ item }">
                    <a-list-item>
                      <template #actions>
                        <a-popconfirm 
                          v-if="canManageContent" 
                          title="确定要恢复该版本吗？" 
                          @confirm="restoreEventVersion(record.id, item.id)"
                        >
                          <a-button type="link" size="small">恢复</a-button>
                        </a-popconfirm>
                        <span v-else class="text-muted">无权限恢复</span>
                      </template>
                      <a-list-item-meta :description="formatDateTime(item.changedAt)">
                        <template #title>
                          <strong>{{ item.action }}</strong>
                        </template>
                      </a-list-item-meta>
                    </a-list-item>
                  </template>
                </a-list>
              </div>
            </template>
          </a-table>
        </a-tab-pane>

        <!-- Taxonomy Tab -->
        <a-tab-pane v-if="canManageContent" key="taxonomy" tab="标签与分类">
          <div v-if="!canManageContent">
            <a-alert message="当前账号没有内容管理权限" type="warning" />
          </div>
          <a-row v-else :gutter="24">
            <!-- Tags Column -->
            <a-col :span="12">
              <a-card title="标签管理" :bordered="false">
                <a-input-group compact style="margin-bottom: 16px; display: flex;">
                  <a-input v-model:value="tagForm.name" placeholder="新标签名称" style="flex: 1" @pressEnter="createTagItem" />
                  <a-button type="primary" @click="createTagItem">新增</a-button>
                </a-input-group>

                <a-list bordered :data-source="tags">
                  <template #renderItem="{ item }">
                    <a-list-item>
                      <template #actions>
                        <a-button type="link" size="small" @click="startEditTag(item)">编辑</a-button>
                        <a-popconfirm title="确定要删除该标签吗？" @confirm="deleteTagItem(item.id)">
                          <a-button type="link" danger size="small">删除</a-button>
                        </a-popconfirm>
                      </template>
                      <div v-if="tagEdit.id === item.id" style="display: flex; gap: 8px; width: 100%;">
                         <a-input v-model:value="tagEdit.name" size="small" />
                         <a-button type="primary" size="small" @click="saveTagEdit">保存</a-button>
                         <a-button size="small" @click="cancelTagEdit">取消</a-button>
                      </div>
                      <span v-else>{{ item.name }}</span>
                    </a-list-item>
                  </template>
                </a-list>
              </a-card>
            </a-col>

            <!-- Categories Column -->
            <a-col :span="12">
              <a-card title="分类管理" :bordered="false">
                <a-input-group compact style="margin-bottom: 16px; display: flex;">
                  <a-input v-model:value="categoryForm.name" placeholder="新分类名称" style="flex: 1" @pressEnter="createCategoryItem" />
                  <a-button type="primary" @click="createCategoryItem">新增</a-button>
                </a-input-group>

                <a-list bordered :data-source="categories">
                  <template #renderItem="{ item }">
                    <a-list-item>
                      <template #actions>
                        <a-button type="link" size="small" @click="startEditCategory(item)">编辑</a-button>
                        <a-popconfirm title="确定要删除该分类吗？" @confirm="deleteCategoryItem(item.id)">
                          <a-button type="link" danger size="small">删除</a-button>
                        </a-popconfirm>
                      </template>
                      <div v-if="categoryEdit.id === item.id" style="display: flex; gap: 8px; width: 100%;">
                         <a-input v-model:value="categoryEdit.name" size="small" />
                         <a-button type="primary" size="small" @click="saveCategoryEdit">保存</a-button>
                         <a-button size="small" @click="cancelCategoryEdit">取消</a-button>
                      </div>
                      <span v-else>{{ item.name }}</span>
                    </a-list-item>
                  </template>
                </a-list>
              </a-card>
            </a-col>
          </a-row>
        </a-tab-pane>

        <!-- Import/Export Tab -->
        <a-tab-pane v-if="canManageContent" key="import" tab="导入导出">
          <div v-if="!canManageContent">
            <a-alert message="当前账号没有内容管理权限" type="warning" />
          </div>
          <a-row v-else :gutter="24">
            <a-col :span="12">
              <a-card title="导出事件" :bordered="false">
                <a-space direction="vertical" style="width: 100%;">
                  <a-button type="primary" :loading="exportLoading" @click="handleExport">
                    下载导出文件
                  </a-button>
                  <div v-if="exportNotice" style="color: #666;">{{ exportNotice }}</div>
                  <a-alert v-if="exportError" :message="exportError" type="error" show-icon />
                </a-space>
              </a-card>
            </a-col>
            <a-col :span="12">
              <a-card title="导入事件" :bordered="false">
                <a-form layout="vertical">
                  <a-form-item label="导入模式">
                    <a-select v-model:value="importMode">
                      <a-select-option value="merge">merge（合并）</a-select-option>
                      <a-select-option value="replace">replace（替换）</a-select-option>
                    </a-select>
                  </a-form-item>
                  <a-form-item label="选择文件">
                    <a-upload
                      :beforeUpload="handleImportFile"
                      :showUploadList="false"
                      accept=".json,application/json"
                    >
                      <a-button type="primary" :loading="importLoading">选择 JSON 文件并导入</a-button>
                    </a-upload>
                    <div v-if="importFileName" style="margin-top: 8px; color: #999;">
                      已选择：{{ importFileName }}
                    </div>
                  </a-form-item>
                  <a-alert v-if="importError" :message="importError" type="error" show-icon />
                </a-form>
              </a-card>
            </a-col>
          </a-row>
        </a-tab-pane>

        <!-- Stats Tab -->
        <a-tab-pane v-if="canWriteContent" key="stats" tab="统计概览">
          <div style="margin-bottom: 16px">
            <a-button @click="loadStats">刷新统计</a-button>
          </div>
          <a-empty v-if="!stats" description="暂无统计数据" />
          <div v-else>
            <a-row :gutter="16" style="margin-bottom: 24px">
              <a-col :span="12">
                <a-card>
                  <a-statistic title="事件总数" :value="stats.total" />
                </a-card>
              </a-col>
              <a-col :span="12">
                <a-card>
                  <a-statistic title="年份范围" :value="`${stats.years.min ?? '-'} ~ ${stats.years.max ?? '-'}`" />
                </a-card>
              </a-col>
            </a-row>

            <a-row :gutter="16">
              <a-col :span="12">
                <a-card title="标签分布">
                   <a-list size="small" :data-source="stats.tags">
                      <template #renderItem="{ item }">
                        <a-list-item>
                          <span>{{ item.name }}</span>
                          <span>{{ item.count }}</span>
                        </a-list-item>
                      </template>
                   </a-list>
                </a-card>
              </a-col>
              <a-col :span="12">
                <a-card title="分类分布">
                   <a-list size="small" :data-source="stats.categories">
                      <template #renderItem="{ item }">
                        <a-list-item>
                          <span>{{ item.name }}</span>
                          <span>{{ item.count }}</span>
                        </a-list-item>
                      </template>
                   </a-list>
                </a-card>
              </a-col>
            </a-row>
          </div>
        </a-tab-pane>

        <!-- Users Tab -->
        <a-tab-pane v-if="canManageAccounts" key="users" tab="用户与权限">
          <div style="margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
             <h3>用户列表与权限</h3>
             <a-button @click="refreshUsers">刷新列表</a-button>
          </div>
          <a-alert
            message="权限说明"
            description="账号管理员负责管理账户，内容管理员负责审批与内容管理。"
            type="info"
            show-icon
            style="margin-bottom: 16px"
          />
          
          <div v-if="!canManageAccounts">
             <a-alert message="当前账号没有账号管理权限" type="warning" />
          </div>
          <div v-else>
            <a-card title="新增账号" size="small" style="margin-bottom: 24px">
               <a-form layout="inline" :model="userForm" @finish="handleCreateUser">
                  <a-form-item name="name">
                    <a-input v-model:value="userForm.name" placeholder="用户名" />
                  </a-form-item>
                  <a-form-item name="email">
                    <a-input v-model:value="userForm.email" placeholder="邮箱" />
                  </a-form-item>
                  <a-form-item name="password">
                    <a-input-password v-model:value="userForm.password" placeholder="密码" />
                  </a-form-item>
                  <a-form-item name="role">
                    <a-select v-model:value="userForm.role" style="width: 120px">
                      <a-select-option value="account_admin">账号管理员</a-select-option>
                      <a-select-option value="content_admin">内容管理员</a-select-option>
                      <a-select-option value="content_editor">内容编辑</a-select-option>
                    </a-select>
                  </a-form-item>
                  <a-form-item>
                    <a-button type="primary" html-type="submit">创建</a-button>
                  </a-form-item>
               </a-form>
               <div v-if="userError" style="color: red; margin-top: 8px;">{{ userError }}</div>
            </a-card>

            <a-table :dataSource="users" :columns="userColumns" rowKey="id">
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'role'">
                    <a-tag>{{ formatRole(record.role) }}</a-tag>
                  </template>
                  <template v-if="column.key === 'action'">
                    <a-space>
                       <a-button 
                         v-if="record.role !== 'super_admin' || user?.role === 'super_admin'" 
                         type="link" 
                         size="small"
                         @click="startEditUser(record)"
                       >
                         编辑
                       </a-button>
                       <span v-else class="text-muted" style="font-size: 12px; color: #ccc;">不可编辑</span>
                       
                       <a-popconfirm 
                         title="确定要删除该账号吗？" 
                         :disabled="record.role === 'super_admin' || record.id === user?.id"
                         @confirm="deleteUserItem(record.id)"
                       >
                         <a-button 
                           type="link" 
                           danger 
                           size="small" 
                           :disabled="record.role === 'super_admin' || record.id === user?.id"
                         >
                           删除
                         </a-button>
                       </a-popconfirm>
                    </a-space>
                  </template>
                </template>
            </a-table>
          </div>
        </a-tab-pane>
      </a-tabs>
    </div>

    <!-- Event Edit Modal -->
    <a-modal
      v-model:open="eventModalVisible"
      :title="isEditing ? '编辑事件' : '新增事件'"
      width="800px"
      @ok="submitEvent"
      :confirmLoading="loading"
    >
      <a-form layout="vertical">
        <a-row :gutter="16">
          <a-col :span="24">
             <a-form-item label="标题" required>
               <a-input v-model:value="eventForm.title" placeholder="事件标题" />
             </a-form-item>
          </a-col>
          <a-col :span="24">
             <a-form-item label="摘要">
               <a-textarea v-model:value="eventForm.summary" :rows="3" placeholder="简要说明" />
             </a-form-item>
          </a-col>
        </a-row>

        <a-divider orientation="left">时间信息</a-divider>
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="起始年份" required>
              <a-input-number v-model:value="eventForm.startYear" style="width: 100%" placeholder="-221" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="起始月份">
              <a-input-number v-model:value="eventForm.startMonth" style="width: 100%" :min="1" :max="12" placeholder="1-12" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="起始日期">
              <a-input-number v-model:value="eventForm.startDay" style="width: 100%" :min="1" :max="31" placeholder="1-31" />
            </a-form-item>
          </a-col>

          <a-col :span="8">
            <a-form-item label="结束年份">
              <a-input-number v-model:value="eventForm.endYear" style="width: 100%" placeholder="可选" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="结束月份">
              <a-input-number v-model:value="eventForm.endMonth" style="width: 100%" :min="1" :max="12" placeholder="可选" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="结束日期">
              <a-input-number v-model:value="eventForm.endDay" style="width: 100%" :min="1" :max="31" placeholder="可选" />
            </a-form-item>
          </a-col>

          <a-col :span="12">
            <a-form-item label="时间精度">
              <a-select v-model:value="eventForm.precision">
                <a-select-option value="century">century</a-select-option>
                <a-select-option value="decade">decade</a-select-option>
                <a-select-option value="year">year</a-select-option>
                <a-select-option value="month">month</a-select-option>
                <a-select-option value="day">day</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
             <a-form-item label="模糊时间">
               <a-checkbox v-model:checked="eventForm.isApprox">标记为模糊时间</a-checkbox>
             </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16" v-if="eventForm.isApprox">
           <a-col :span="12">
             <a-form-item label="模糊范围（年）">
               <a-input-number v-model:value="eventForm.approxRangeYears" style="width: 100%" placeholder="例如 10" />
             </a-form-item>
           </a-col>
           <a-col :span="12">
             <a-form-item label="模糊说明">
               <a-input v-model:value="eventForm.fuzzyText" placeholder="可选" />
             </a-form-item>
           </a-col>
        </a-row>

        <a-divider orientation="left">分类与标签</a-divider>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="标签">
              <a-select
                v-model:value="eventForm.tagIds"
                mode="tags"
                placeholder="选择或输入标签"
                :options="tags.map(t => ({ value: t.id, label: t.name }))"
                :tokenSeparators="[',', '，', ' ']"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="分类">
              <a-select
                v-model:value="eventForm.categoryIds"
                mode="tags"
                placeholder="选择或输入分类"
                :options="categories.map(c => ({ value: c.id, label: c.name }))"
                :tokenSeparators="[',', '，', ' ']"
              />
            </a-form-item>
          </a-col>
        </a-row>
        
        <div v-if="formError">
           <a-alert :message="formError" type="error" show-icon />
        </div>
        <div v-if="formNotice" style="margin-top: 10px">
           <a-alert :message="formNotice" type="info" show-icon />
        </div>
      </a-form>
    </a-modal>

    <!-- User Edit Modal -->
    <a-modal
      v-model:open="userModalVisible"
      title="编辑账号"
      @ok="handleSaveUser"
    >
      <a-form layout="vertical">
        <a-form-item label="用户名" required>
          <a-input v-model:value="userEdit.name" />
        </a-form-item>
        <a-form-item label="邮箱" required>
          <a-input v-model:value="userEdit.email" />
        </a-form-item>
        <a-form-item label="新密码">
          <a-input-password v-model:value="userEdit.password" placeholder="留空表示不修改" />
        </a-form-item>
        <a-form-item label="角色">
           <a-select v-model:value="userEdit.role" :disabled="userEdit.role === 'super_admin'">
              <a-select-option value="account_admin">账号管理员</a-select-option>
              <a-select-option value="content_admin">内容管理员</a-select-option>
              <a-select-option value="content_editor">内容编辑</a-select-option>
              <a-select-option v-if="userEdit.role === 'super_admin'" value="super_admin">超级管理员</a-select-option>
           </a-select>
        </a-form-item>
        <div v-if="userError">
           <a-alert :message="userError" type="error" show-icon />
        </div>
      </a-form>
    </a-modal>

  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useAppStore } from "../store/appStore";
import type { EventItem, EventTime, UserRole } from "../store/appStore";
import { PlusOutlined } from '@ant-design/icons-vue';

const {
  user,
  tags,
  categories,
  events,
  versions,
  stats,
  approvals,
  users,
  loadTags,
  loadCategories,
  loadEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  loadVersions,
  restoreVersion,
  loadApprovals,
  approveEventChange,
  rejectEventChange,
  createTag,
  updateTag,
  deleteTag,
  createCategory,
  updateCategory,
  deleteCategory,
  exportEvents,
  importEvents,
  loadStats,
  loadUsers,
  createUser,
  updateUser,
  deleteUser,
  canManageAccounts,
  canManageContent,
  canWriteContent,
  canApproveContent,
  isContentEditorRole,
  formatEventTime,
  formatDateTime,
  formatRole,
  mapTags,
  mapCategories,
  approvalActionLabel,
  approvalTitle
} = useAppStore();

type TabKey = "events" | "taxonomy" | "import" | "stats" | "users";
const tab = ref<TabKey>("events");
const loading = ref(false);
const formError = ref("");
const formNotice = ref("");
const approvalError = ref("");
const importError = ref("");
const userError = ref("");

const availableTabs = computed<TabKey[]>(() => {
  const list: TabKey[] = [];
  if (canWriteContent.value) {
    list.push("events");
  }
  if (canManageContent.value) {
    list.push("taxonomy", "import");
  }
  if (canWriteContent.value) {
    list.push("stats");
  }
  if (canManageAccounts.value) {
    list.push("users");
  }
  return list;
});

const ensureTabAvailable = () => {
  if (availableTabs.value.length === 0) {
    return;
  }
  if (!availableTabs.value.includes(tab.value)) {
    tab.value = availableTabs.value[0];
  }
};

// Modal visibility
const eventModalVisible = ref(false);
const userModalVisible = ref(false);

const eventForm = reactive({
  id: "",
  title: "",
  summary: "",
  startYear: "" as string | number,
  startMonth: "" as string | number,
  startDay: "" as string | number,
  endYear: "" as string | number,
  endMonth: "" as string | number,
  endDay: "" as string | number,
  precision: "year",
  isApprox: false,
  approxRangeYears: "" as string | number,
  fuzzyText: "",
  tagIds: [] as string[],
  categoryIds: [] as string[]
});

const tagForm = reactive({ name: "" });
const tagEdit = reactive({ id: "", name: "" });
const categoryForm = reactive({ name: "" });
const categoryEdit = reactive({ id: "", name: "" });

const exportNotice = ref("");
const exportError = ref("");
const exportLoading = ref(false);
const importLoading = ref(false);
const importFileName = ref("");
const importMode = ref<"merge" | "replace">("merge");

const userForm = reactive({
  name: "",
  email: "",
  password: "",
  role: "content_editor" as UserRole
});
const userEdit = reactive({
  id: "",
  name: "",
  email: "",
  password: "",
  role: "content_editor" as UserRole
});

const isEditing = computed(() => eventForm.id !== "");

// Columns Definition
const eventColumns = [
  { title: '标题', dataIndex: 'title', key: 'title', width: 200 },
  { title: '时间', key: 'time', width: 150 },
  { title: '精度', key: 'precision', width: 100 },
  { title: '标签/分类', key: 'tags' },
  { title: '操作', key: 'action', width: 150 },
];

const getEventTagLabels = (event: EventItem) => {
  if (event.tags && event.tags.length > 0) {
    return event.tags.map((tag) => tag.name);
  }
  return mapTags(event.tagIds);
};

const userColumns = [
  { title: '用户名', dataIndex: 'name', key: 'name' },
  { title: '邮箱', dataIndex: 'email', key: 'email' },
  { title: '角色', key: 'role' },
  { title: '操作', key: 'action' },
];

const parseIntField = (value: string | number) => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }
  const num = Number(value);
  return Number.isInteger(num) ? num : null;
};

const openCreateEventModal = () => {
    resetEventForm();
    eventModalVisible.value = true;
};

const resetEventForm = () => {
  eventForm.id = "";
  eventForm.title = "";
  eventForm.summary = "";
  eventForm.startYear = "";
  eventForm.startMonth = "";
  eventForm.startDay = "";
  eventForm.endYear = "";
  eventForm.endMonth = "";
  eventForm.endDay = "";
  eventForm.precision = "year";
  eventForm.isApprox = false;
  eventForm.approxRangeYears = "";
  eventForm.fuzzyText = "";
  eventForm.tagIds = [];
  eventForm.categoryIds = [];
  formError.value = "";
  formNotice.value = "";
};

const submitEvent = async () => {
  formError.value = "";
  formNotice.value = "";
  const startYear = parseIntField(eventForm.startYear);
  const startMonth = parseIntField(eventForm.startMonth);
  const startDay = parseIntField(eventForm.startDay);
  const endYear = parseIntField(eventForm.endYear);
  const endMonth = parseIntField(eventForm.endMonth);
  const endDay = parseIntField(eventForm.endDay);
  const approxRangeYears = parseIntField(eventForm.approxRangeYears);

  if (!eventForm.title.trim()) {
    formError.value = "请填写事件标题";
    return;
  }
  if (startYear == null) {
    formError.value = "起始年份必须是整数";
    return;
  }
  if (startMonth != null && (startMonth < 1 || startMonth > 12)) {
    formError.value = "起始月份需要在 1-12 之间";
    return;
  }
  if (startDay != null && (startDay < 1 || startDay > 31)) {
    formError.value = "起始日期需要在 1-31 之间";
    return;
  }
  if (startDay != null && startMonth == null) {
    formError.value = "填写起始日期前需要先填写起始月份";
    return;
  }
  if (endYear != null && endYear < startYear) {
    formError.value = "结束年份不能小于起始年份";
    return;
  }
  if (endYear == null && (endMonth != null || endDay != null)) {
    formError.value = "填写结束月份/日期前需要先填写结束年份";
    return;
  }
  if (endMonth != null && (endMonth < 1 || endMonth > 12)) {
    formError.value = "结束月份需要在 1-12 之间";
    return;
  }
  if (endDay != null && (endDay < 1 || endDay > 31)) {
    formError.value = "结束日期需要在 1-31 之间";
    return;
  }
  if (endDay != null && endMonth == null) {
    formError.value = "填写结束日期前需要先填写结束月份";
    return;
  }
  if ((eventForm.precision === "month" || eventForm.precision === "day") && startMonth == null) {
    formError.value = "精度为月或日时，需要填写起始月份";
    return;
  }
  if (eventForm.precision === "day" && startDay == null) {
    formError.value = "精度为日时，需要填写起始日期";
    return;
  }
  if (eventForm.isApprox && (approxRangeYears == null || approxRangeYears <= 0)) {
    formError.value = "模糊范围需要填写大于 0 的整数";
    return;
  }

  const startTime: EventTime["start"] = {
    year: startYear,
    ...(startMonth != null ? { month: startMonth } : {}),
    ...(startDay != null ? { day: startDay } : {})
  };
  const time: EventTime = {
    start: startTime,
    precision: eventForm.precision,
    fuzzy: { isApprox: false }
  };
  if (endYear != null) {
    const endTime: EventTime["start"] = {
      year: endYear,
      ...(endMonth != null ? { month: endMonth } : {}),
      ...(endDay != null ? { day: endDay } : {})
    };
    time.end = endTime;
  }
  if (eventForm.isApprox) {
    time.fuzzy = {
      isApprox: true,
      ...(approxRangeYears != null ? { approxRangeYears } : {}),
      ...(eventForm.fuzzyText.trim() ? { displayText: eventForm.fuzzyText.trim() } : {})
    };
  }

  const payload = {
    title: eventForm.title.trim(),
    summary: eventForm.summary.trim(),
    time,
    tagIds: eventForm.tagIds,
    categoryIds: eventForm.categoryIds
  };

  loading.value = true;
  try {
    let result: any = null;
    if (eventForm.id) {
      result = await updateEvent(eventForm.id, payload);
    } else {
      result = await createEvent(payload);
    }
    await refreshEvents();
    await loadStats();
    if (result?.pending) {
       // Ideally show a notification, but for now just close and maybe alert
       alert("已提交审核，等待内容管理员审批");
    }
    eventModalVisible.value = false;
    resetEventForm();
  } catch (error) {
    formError.value = error instanceof Error ? error.message : "提交失败";
  } finally {
    loading.value = false;
  }
};

const beginEdit = (event: EventItem) => {
  eventForm.id = event.id;
  eventForm.title = event.title;
  eventForm.summary = event.summary ?? "";
  eventForm.startYear = event.time.start.year;
  eventForm.startMonth = event.time.start.month ?? "";
  eventForm.startDay = event.time.start.day ?? "";
  eventForm.endYear = event.time.end?.year ?? "";
  eventForm.endMonth = event.time.end?.month ?? "";
  eventForm.endDay = event.time.end?.day ?? "";
  eventForm.precision = event.time.precision;
  eventForm.isApprox = event.time.fuzzy?.isApprox ?? false;
  eventForm.approxRangeYears = event.time.fuzzy?.approxRangeYears ?? "";
  eventForm.fuzzyText = event.time.fuzzy?.displayText ?? "";
  eventForm.tagIds = [...event.tagIds];
  eventForm.categoryIds = [...event.categoryIds];
  eventModalVisible.value = true;
};

const removeEvent = async (id: string) => {
  // Popconfirm handles the confirmation now, so we just proceed
  loading.value = true;
  try {
    const result = await deleteEvent(id);
    await refreshEvents();
    await loadStats();
    if (result?.pending) {
      alert("删除申请已提交，等待审批");
    }
  } catch (error) {
    formError.value = error instanceof Error ? error.message : "删除失败";
  } finally {
    loading.value = false;
  }
};

const toggleVersions = async (eventId: string) => {
  if (versions[eventId]) {
    // If we want to support toggle off, we can do it, but refreshing is better for table view
    // But let's keep it simple: always load
  }
  await loadVersions(eventId);
};

const restoreEventVersion = async (eventId: string, versionId: string) => {
  await restoreVersion(eventId, versionId);
  await refreshEvents();
  await loadVersions(eventId);
};

const refreshEvents = async () => {
  loading.value = true;
  await Promise.all([loadEvents(), loadTags(), loadCategories()]);
  await refreshApprovals();
  loading.value = false;
};

const refreshApprovals = async () => {
  approvalError.value = "";
  if (!canApproveContent.value) {
    approvals.value = [];
    return;
  }
  try {
    await loadApprovals();
  } catch (error) {
    approvalError.value = error instanceof Error ? error.message : "审批列表加载失败";
  }
};

const approve = async (id: string) => {
  try {
    await approveEventChange(id);
    await refreshEvents();
    await loadStats();
  } catch (error) {
    approvalError.value = error instanceof Error ? error.message : "审批失败";
  }
};

const reject = async (id: string) => {
  try {
    await rejectEventChange(id);
    await refreshApprovals();
  } catch (error) {
    approvalError.value = error instanceof Error ? error.message : "拒绝失败";
  }
};

const createTagItem = async () => {
  if (!tagForm.name.trim()) {
    return;
  }
  await createTag({ name: tagForm.name.trim() });
  tagForm.name = "";
  await loadTags();
};

const startEditTag = (tag: { id: string; name: string }) => {
  tagEdit.id = tag.id;
  tagEdit.name = tag.name;
};

const saveTagEdit = async () => {
  if (!tagEdit.id || !tagEdit.name.trim()) {
    return;
  }
  await updateTag(tagEdit.id, { name: tagEdit.name.trim() });
  tagEdit.id = "";
  tagEdit.name = "";
  await loadTags();
};

const cancelTagEdit = () => {
  tagEdit.id = "";
  tagEdit.name = "";
};

const deleteTagItem = async (id: string) => {
  await deleteTag(id);
  await loadTags();
  await loadEvents();
  await loadStats();
};

const createCategoryItem = async () => {
  if (!categoryForm.name.trim()) {
    return;
  }
  await createCategory({ name: categoryForm.name.trim() });
  categoryForm.name = "";
  await loadCategories();
};

const startEditCategory = (cat: { id: string; name: string }) => {
  categoryEdit.id = cat.id;
  categoryEdit.name = cat.name;
};

const saveCategoryEdit = async () => {
  if (!categoryEdit.id || !categoryEdit.name.trim()) {
    return;
  }
  await updateCategory(categoryEdit.id, { name: categoryEdit.name.trim() });
  categoryEdit.id = "";
  categoryEdit.name = "";
  await loadCategories();
};

const cancelCategoryEdit = () => {
  categoryEdit.id = "";
  categoryEdit.name = "";
};

const deleteCategoryItem = async (id: string) => {
  await deleteCategory(id);
  await loadCategories();
  await loadEvents();
  await loadStats();
};

const handleExport = async () => {
  exportError.value = "";
  exportNotice.value = "";
  exportLoading.value = true;
  try {
    const data = await exportEvents();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const link = document.createElement("a");
    link.href = url;
    link.download = `events-export-${timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    exportNotice.value = "已开始下载导出文件";
  } catch (error) {
    exportError.value = error instanceof Error ? error.message : "导出失败";
  } finally {
    exportLoading.value = false;
  }
};

const handleImportFile = async (file: File) => {
  importError.value = "";
  importFileName.value = file.name;
  importLoading.value = true;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const items = Array.isArray(parsed) ? parsed : parsed.items;
    if (!Array.isArray(items)) {
      importError.value = "JSON 必须是数组或包含 items 数组";
      return false;
    }
    await importEvents(importMode.value, items);
    await refreshEvents();
    await loadStats();
    alert("导入成功");
  } catch (error) {
    importError.value = error instanceof Error ? error.message : "导入失败";
  } finally {
    importLoading.value = false;
  }
  return false;
};

const refreshUsers = async () => {
  userError.value = "";
  if (!canManageAccounts.value) {
    return;
  }
  try {
    await loadUsers();
  } catch (error) {
    userError.value = error instanceof Error ? error.message : "用户列表加载失败";
  }
};

const resetUserForm = () => {
  userForm.name = "";
  userForm.email = "";
  userForm.password = "";
  userForm.role = "content_editor";
};

const resetUserEdit = () => {
  userEdit.id = "";
  userEdit.name = "";
  userEdit.email = "";
  userEdit.password = "";
  userEdit.role = "content_editor";
  userModalVisible.value = false;
};

const handleCreateUser = async () => {
  userError.value = "";
  if (!userForm.name.trim() || !userForm.email.trim() || !userForm.password.trim()) {
    userError.value = "请完整填写用户名、邮箱和密码";
    return;
  }
  try {
    await createUser({
      name: userForm.name.trim(),
      email: userForm.email.trim(),
      password: userForm.password,
      role: userForm.role
    });
    resetUserForm();
    await refreshUsers();
  } catch (error) {
    userError.value = error instanceof Error ? error.message : "创建用户失败";
  }
};

const startEditUser = (item: { id: string; name: string; email: string; role: UserRole }) => {
  userEdit.id = item.id;
  userEdit.name = item.name;
  userEdit.email = item.email;
  userEdit.role = item.role;
  userEdit.password = "";
  userModalVisible.value = true;
};

const handleSaveUser = async () => {
  userError.value = "";
  if (!userEdit.id) {
    return;
  }
  if (!userEdit.name.trim() || !userEdit.email.trim()) {
    userError.value = "请完整填写用户名和邮箱";
    return;
  }
  try {
    const payload: Record<string, string> = {
      name: userEdit.name.trim(),
      email: userEdit.email.trim()
    };
    if (userEdit.role !== "super_admin") {
      payload.role = userEdit.role;
    }
    if (userEdit.password.trim()) {
      payload.password = userEdit.password;
    }
    await updateUser(userEdit.id, payload);
    resetUserEdit();
    await refreshUsers();
  } catch (error) {
    userError.value = error instanceof Error ? error.message : "保存用户失败";
  }
};

const deleteUserItem = async (id: string) => {
  userError.value = "";
  try {
    await deleteUser(id);
    await refreshUsers();
  } catch (error) {
    userError.value = error instanceof Error ? error.message : "删除用户失败";
  }
};

const refreshAll = async () => {
  if (!user.value) {
    return;
  }
  await Promise.all([loadTags(), loadCategories(), refreshEvents(), loadStats()]);
  await refreshUsers();
};

watch(availableTabs, () => {
  ensureTabAvailable();
}, { immediate: true });

onMounted(async () => {
  await refreshAll();
});

watch(user, async (value) => {
  if (value) {
    await refreshAll();
  }
});

watch(tab, async (value) => {
  if (!user.value) {
    return;
  }
  if (value === "users") {
    await refreshUsers();
  }
  if (value === "events") {
    await refreshEvents();
  }
  if (value === "taxonomy") {
    await Promise.all([loadTags(), loadCategories()]);
  }
  if (value === "stats") {
    await loadStats();
  }
});
</script>

