﻿<template>
  <div class="page-container">
    <a-typography-title :level="2">内容编辑中心</a-typography-title>

    <div v-if="!user">
      <a-alert
        message="请先登录后再使用内容编辑功能"
        type="warning"
        show-icon
      />
      <div class="login-cta">
        <router-link to="/login" custom v-slot="{ navigate, href }">
          <a-button type="primary" :href="href" @click="navigate">去登录</a-button>
        </router-link>
      </div>
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
      <a-alert
        v-if="opNotice"
        :type="opNotice.type"
        :message="opNotice.message"
        :description="opNotice.description"
        show-icon
        closable
        class="op-notice"
        @close="clearOpNotice"
      />

      <!-- Quick Navigation -->
      <a-card class="quick-nav-card" :bordered="false" size="small" v-if="user">
        <div class="quick-nav-container">
           <div class="quick-nav-label"><rocket-outlined /> 快捷导航</div>
           <div class="quick-nav-buttons">
              <a-button type="dashed" class="nav-btn" @click="tab = 'events'" v-if="canWriteContent">
                <template #icon><table-outlined /></template>
                事件列表
              </a-button>
              <a-button type="dashed" class="nav-btn" @click="tab = 'events'; refreshApprovals()" v-if="canApproveContent">
                <template #icon><audit-outlined /></template>
                审批管理
              </a-button>
              <a-button type="dashed" class="nav-btn" @click="tab = 'taxonomy'" v-if="canManageContent">
                <template #icon><tags-outlined /></template>
                标签管理
              </a-button>
              <a-button type="dashed" class="nav-btn" @click="tab = 'import'" v-if="canManageContent">
                <template #icon><import-outlined /></template>
                数据导入
              </a-button>
           </div>
        </div>
      </a-card>

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
        <a-tab-pane v-if="canManageContent" key="taxonomy" tab="标签管理">
          <div v-if="!canManageContent">
            <a-alert message="当前账号没有内容管理权限" type="warning" />
          </div>
          <a-row v-else :gutter="24">
            <a-col :span="24">
              <a-card title="标签管理" :bordered="false">
                <a-input-group compact style="margin-bottom: 16px; display: flex;">
                  <a-input
                    v-model:value="tagForm.name"
                    name="tagName"
                    placeholder="新标签名称…"
                    autocomplete="off"
                    style="flex: 1"
                    @pressEnter="createTagItem"
                  />
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
                <a-form layout="vertical" autocomplete="off">
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
                    <a-button
                      type="link"
                      href="/examples/events-import-sample.json"
                      target="_blank"
                      style="padding-left: 0;"
                    >
                      下载导入示例文件
                    </a-button>
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
              <a-col :span="24">
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
            description="管理员负责账号与内容管理，编辑负责内容编辑。"
            type="info"
            show-icon
            style="margin-bottom: 16px"
          />
          
          <div v-if="!canManageAccounts">
             <a-alert message="当前账号没有账号管理权限" type="warning" />
          </div>
          <div v-else>
            <a-card title="新增账号" size="small" style="margin-bottom: 24px">
               <a-form layout="inline" :model="userForm" @finish="handleCreateUser" autocomplete="off">
                  <a-form-item name="displayName">
                    <a-input
                      v-model:value="userForm.displayName"
                      name="userDisplayName"
                      placeholder="显示名…"
                      autocomplete="name"
                    />
                  </a-form-item>
                  <a-form-item name="email">
                    <a-input
                      v-model:value="userForm.email"
                      name="userEmail"
                      placeholder="邮箱…"
                      type="email"
                      inputmode="email"
                      autocomplete="email"
                      autocapitalize="none"
                      spellcheck="false"
                    />
                  </a-form-item>
                  <a-form-item name="password">
                    <a-input-password
                      v-model:value="userForm.password"
                      name="userPassword"
                      placeholder="密码…"
                      autocomplete="new-password"
                    />
                  </a-form-item>
                  <a-form-item name="role">
                    <a-select v-model:value="userForm.role" style="width: 120px">
                      <a-select-option value="ADMIN">管理员</a-select-option>
                      <a-select-option value="EDITOR">内容编辑</a-select-option>
                      <a-select-option value="USER">普通用户</a-select-option>
                      <a-select-option v-if="isCurrentSuper" value="SUPER_ADMIN">超级管理员</a-select-option>
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
                    <a-tag>{{ formatRole(record.roles) }}</a-tag>
                  </template>
                  <template v-if="column.key === 'status'">
                    <a-tag :color="record.isActive ? 'green' : 'red'">
                      {{ record.isActive ? '启用' : '禁用' }}
                    </a-tag>
                  </template>
                  <template v-if="column.key === 'action'">
                    <a-space>
                       <a-button 
                         v-if="!isSuperAdmin(record) || isCurrentSuper" 
                         type="link" 
                         size="small"
                         @click="startEditUser(record)"
                       >
                         编辑
                       </a-button>
                       <span v-else class="text-muted" style="font-size: 12px; color: #ccc;">不可编辑</span>
                       
                       <a-popconfirm 
                         title="确定要禁用该账号吗？" 
                         :disabled="isSuperAdmin(record) || record.id === user?.id"
                         @confirm="disableUserItem(record.id)"
                       >
                         <a-button 
                           type="link" 
                           danger 
                           size="small" 
                           :disabled="isSuperAdmin(record) || record.id === user?.id"
                         >
                           禁用
                         </a-button>
                       </a-popconfirm>
                    </a-space>
                  </template>
                </template>
            </a-table>
          </div>
        </a-tab-pane>

        <a-tab-pane v-if="canManageSystem" key="settings" tab="系统设置">
          <div v-if="!canManageSystem">
            <a-alert message="当前账号没有系统设置权限" type="warning" />
          </div>
          <div v-else>
            <a-card title="SMTP 邮件设置" :bordered="false">
              <a-alert
                message="用于发送验证邮件和找回密码邮件"
                type="info"
                show-icon
                style="margin-bottom: 16px"
              />
              <a-form layout="vertical" autocomplete="off">
                <a-form-item label="启用邮件发送">
                  <a-switch v-model:checked="smtpForm.enabled" />
                </a-form-item>
                <a-form-item label="服务器地址" required>
                  <a-input
                    v-model:value="smtpForm.host"
                    :disabled="!smtpForm.enabled"
                    name="smtpHost"
                    placeholder="例如 smtp.example.com…"
                    autocomplete="off"
                  />
                </a-form-item>
                <a-form-item label="端口" required>
                  <a-input-number
                    v-model:value="smtpForm.port"
                    :disabled="!smtpForm.enabled"
                    :min="1"
                    :max="65535"
                    name="smtpPort"
                    inputmode="numeric"
                    style="width: 100%"
                  />
                </a-form-item>
                <a-form-item label="使用 SSL/TLS">
                  <a-switch v-model:checked="smtpForm.secure" :disabled="!smtpForm.enabled" />
                </a-form-item>
                <a-form-item label="账号">
                  <a-input
                    v-model:value="smtpForm.username"
                    name="smtpUsername"
                    :disabled="!smtpForm.enabled"
                    autocomplete="off"
                  />
                </a-form-item>
                <a-form-item label="密码">
                  <a-input-password
                    v-model:value="smtpForm.password"
                    :disabled="!smtpForm.enabled"
                    name="smtpPassword"
                    placeholder="留空表示不修改…"
                    autocomplete="new-password"
                  />
                </a-form-item>
                <a-form-item label="发件人地址">
                  <a-input
                    v-model:value="smtpForm.fromAddress"
                    :disabled="!smtpForm.enabled"
                    name="smtpFromAddress"
                    placeholder="例如 no-reply@example.com…"
                    type="email"
                    inputmode="email"
                    autocomplete="email"
                    autocapitalize="none"
                    spellcheck="false"
                  />
                </a-form-item>
              </a-form>

              <div style="display: flex; align-items: center; gap: 12px;">
                <a-button type="primary" :loading="smtpSaving" @click="handleSaveSmtp">保存设置</a-button>
                <span v-if="smtpNotice" style="color: #52c41a;">{{ smtpNotice }}</span>
              </div>

              <a-alert v-if="smtpError" :message="smtpError" type="error" show-icon style="margin-top: 12px" />
              <div v-if="smtpSettings?.updatedAt" style="margin-top: 8px; color: #999;">
                最后更新：{{ formatDateTime(smtpSettings.updatedAt) }}
              </div>
              <div style="margin-top: 4px; color: #999;">
                密码状态：{{ smtpSettings?.hasPassword ? "已保存" : "未保存" }}
              </div>
            </a-card>
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
      <a-form layout="vertical" autocomplete="off">
        <a-row :gutter="16">
          <a-col :span="24">
             <a-form-item label="标题" required>
               <a-input
                 v-model:value="eventForm.title"
                 name="eventTitle"
                 placeholder="事件标题…"
                 autocomplete="off"
               />
             </a-form-item>
          </a-col>
          <a-col :span="24">
             <a-form-item label="摘要">
               <a-textarea
                 v-model:value="eventForm.summary"
                 name="eventSummary"
                 :rows="3"
                 placeholder="简要说明…"
                 autocomplete="off"
               />
             </a-form-item>
          </a-col>
        </a-row>

        <a-divider orientation="left">时间信息</a-divider>
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="起始年份" required>
              <a-input-number
                v-model:value="eventForm.startYear"
                name="startYear"
                style="width: 100%"
                placeholder="-221…"
                inputmode="numeric"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="起始月份">
              <a-input-number
                v-model:value="eventForm.startMonth"
                name="startMonth"
                style="width: 100%"
                :min="1"
                :max="12"
                placeholder="1-12…"
                inputmode="numeric"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="起始日期">
              <a-input-number
                v-model:value="eventForm.startDay"
                name="startDay"
                style="width: 100%"
                :min="1"
                :max="31"
                placeholder="1-31…"
                inputmode="numeric"
              />
            </a-form-item>
          </a-col>

          <a-col :span="8">
            <a-form-item label="结束年份">
              <a-input-number
                v-model:value="eventForm.endYear"
                name="endYear"
                style="width: 100%"
                placeholder="可选…"
                inputmode="numeric"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="结束月份">
              <a-input-number
                v-model:value="eventForm.endMonth"
                name="endMonth"
                style="width: 100%"
                :min="1"
                :max="12"
                placeholder="可选…"
                inputmode="numeric"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="结束日期">
              <a-input-number
                v-model:value="eventForm.endDay"
                name="endDay"
                style="width: 100%"
                :min="1"
                :max="31"
                placeholder="可选…"
                inputmode="numeric"
              />
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
               <a-input-number
                 v-model:value="eventForm.approxRangeYears"
                 name="approxRangeYears"
                 style="width: 100%"
                 placeholder="例如 10…"
                 inputmode="numeric"
               />
             </a-form-item>
           </a-col>
           <a-col :span="12">
             <a-form-item label="模糊说明">
               <a-input
                 v-model:value="eventForm.fuzzyText"
                 name="fuzzyText"
                 placeholder="可选…"
                 autocomplete="off"
               />
             </a-form-item>
           </a-col>
        </a-row>

        <a-divider orientation="left">标签</a-divider>
        <a-row :gutter="16">
          <a-col :span="24">
            <a-form-item label="标签">
              <a-select
                v-model:value="eventForm.tagIds"
                mode="tags"
                name="eventTags"
                placeholder="选择或输入标签…"
                :options="tags.map(t => ({ value: t.id, label: t.name }))"
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
      <a-form layout="vertical" autocomplete="off">
        <a-form-item label="显示名" required>
          <a-input v-model:value="userEdit.displayName" name="editDisplayName" autocomplete="name" />
        </a-form-item>
        <a-form-item label="邮箱" required>
          <a-input
            v-model:value="userEdit.email"
            name="editEmail"
            type="email"
            inputmode="email"
            autocomplete="email"
            autocapitalize="none"
            spellcheck="false"
          />
        </a-form-item>
        <a-form-item label="新密码">
          <a-input-password
            v-model:value="userEdit.password"
            name="editPassword"
            placeholder="留空表示不修改…"
            autocomplete="new-password"
          />
        </a-form-item>
        <a-form-item label="角色">
           <a-select v-model:value="userEdit.role" :disabled="userEdit.role === 'SUPER_ADMIN' && !isCurrentSuper">
              <a-select-option value="ADMIN">管理员</a-select-option>
              <a-select-option value="EDITOR">内容编辑</a-select-option>
              <a-select-option value="USER">普通用户</a-select-option>
              <a-select-option v-if="isCurrentSuper" value="SUPER_ADMIN">超级管理员</a-select-option>
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
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { useAppStore } from "../store/appStore";
import type { EventItem, EventTime, RoleName, UserInfo } from "../store/appStore";
import {
  PlusOutlined,
  RocketOutlined,
  AuditOutlined,
  TableOutlined,
  TagsOutlined,
  ImportOutlined
} from '@ant-design/icons-vue';

const {
  user,
  tags,
  events,
  versions,
  stats,
  approvals,
  users,
  smtpSettings,
  loadTags,
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
  exportEvents,
  importEvents,
  loadStats,
  loadUsers,
  createUser,
  updateUser,
  disableUser,
  canManageAccounts,
  canManageContent,
  canWriteContent,
  canApproveContent,
  canManageSystem,
  isContentEditorRole,
  formatEventTime,
  formatDateTime,
  formatRole,
  mapTags,
  approvalActionLabel,
  approvalTitle,
  loadSmtpSettings,
  updateSmtpSettings
} = useAppStore();

type TabKey = "events" | "taxonomy" | "import" | "stats" | "users" | "settings";
const tab = ref<TabKey>("events");
const loading = ref(false);
const formError = ref("");
const formNotice = ref("");
const approvalError = ref("");
const importError = ref("");
const userError = ref("");
const smtpError = ref("");
const smtpNotice = ref("");
const smtpSaving = ref(false);
const opNotice = ref<{ type: "success" | "info" | "warning" | "error"; message: string; description?: string } | null>(null);
let opNoticeTimer: number | null = null;

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
  if (canManageSystem.value) {
    list.push("settings");
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
  tagIds: [] as string[]
});

const tagForm = reactive({ name: "" });
const tagEdit = reactive({ id: "", name: "" });

const exportNotice = ref("");
const exportError = ref("");
const exportLoading = ref(false);
const importLoading = ref(false);
const importFileName = ref("");
const importMode = ref<"merge" | "replace">("merge");

const userForm = reactive({
  displayName: "",
  email: "",
  password: "",
  role: "EDITOR" as RoleName
});
const userEdit = reactive({
  id: "",
  displayName: "",
  email: "",
  password: "",
  role: "EDITOR" as RoleName
});

const smtpForm = reactive({
  enabled: false,
  host: "",
  port: 587,
  secure: false,
  username: "",
  password: "",
  fromAddress: ""
});

const isCurrentSuper = computed(() => user.value?.roles?.includes("SUPER_ADMIN") ?? false);

const resolvePrimaryRole = (roles: RoleName[]) => {
  if (roles.includes("SUPER_ADMIN")) {
    return "SUPER_ADMIN";
  }
  if (roles.includes("ADMIN")) {
    return "ADMIN";
  }
  if (roles.includes("EDITOR")) {
    return "EDITOR";
  }
  return "USER";
};

const isSuperAdmin = (item: UserInfo) => item.roles.includes("SUPER_ADMIN");

const isEditing = computed(() => eventForm.id !== "");

const showOpNotice = (
  type: "success" | "info" | "warning" | "error",
  message: string,
  description?: string
) => {
  opNotice.value = { type, message, description };
  if (opNoticeTimer) {
    window.clearTimeout(opNoticeTimer);
  }
  opNoticeTimer = window.setTimeout(() => {
    opNotice.value = null;
    opNoticeTimer = null;
  }, 4000);
};

const clearOpNotice = () => {
  opNotice.value = null;
  if (opNoticeTimer) {
    window.clearTimeout(opNoticeTimer);
    opNoticeTimer = null;
  }
};

// Columns Definition
const eventColumns = [
  { title: '标题', dataIndex: 'title', key: 'title', width: 200 },
  { title: '时间', key: 'time', width: 150 },
  { title: '精度', key: 'precision', width: 100 },
  { title: '标签', key: 'tags' },
  { title: '操作', key: 'action', width: 150 },
];

const getEventTagLabels = (event: EventItem) => {
  if (event.tags && event.tags.length > 0) {
    return event.tags.map((tag) => tag.name);
  }
  return mapTags(event.tagIds);
};

const userColumns = [
  { title: '显示名', dataIndex: 'displayName', key: 'displayName' },
  { title: '邮箱', dataIndex: 'email', key: 'email' },
  { title: '角色', key: 'role' },
  { title: '状态', key: 'status' },
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
    tagIds: eventForm.tagIds
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
      showOpNotice("info", "已提交审核", "等待内容管理员审批");
    } else {
      showOpNotice("success", isEditing.value ? "事件已更新" : "事件已创建");
    }
    eventModalVisible.value = false;
    resetEventForm();
  } catch (error) {
    formError.value = error instanceof Error ? error.message : "提交失败";
    showOpNotice("error", "提交失败", formError.value);
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
      showOpNotice("info", "删除申请已提交", "等待内容管理员审批");
    } else {
      showOpNotice("success", "事件已删除");
    }
  } catch (error) {
    formError.value = error instanceof Error ? error.message : "删除失败";
    showOpNotice("error", "删除失败", formError.value);
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
  showOpNotice("success", "版本已恢复");
};

const refreshEvents = async () => {
  loading.value = true;
  await Promise.all([loadEvents(), loadTags()]);
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
    showOpNotice("success", "审批列表已刷新");
  } catch (error) {
    approvalError.value = error instanceof Error ? error.message : "审批列表加载失败";
    showOpNotice("error", "审批列表加载失败", approvalError.value);
  }
};

const approve = async (id: string) => {
  try {
    await approveEventChange(id);
    await refreshEvents();
    await loadStats();
    showOpNotice("success", "已通过审批");
  } catch (error) {
    approvalError.value = error instanceof Error ? error.message : "审批失败";
    showOpNotice("error", "审批失败", approvalError.value);
  }
};

const reject = async (id: string) => {
  try {
    await rejectEventChange(id);
    await refreshApprovals();
    showOpNotice("success", "已拒绝审批");
  } catch (error) {
    approvalError.value = error instanceof Error ? error.message : "拒绝失败";
    showOpNotice("error", "拒绝失败", approvalError.value);
  }
};

const createTagItem = async () => {
  if (!tagForm.name.trim()) {
    return;
  }
  try {
    await createTag({ name: tagForm.name.trim() });
    tagForm.name = "";
    await loadTags();
    showOpNotice("success", "标签已新增");
  } catch (error) {
    showOpNotice("error", "标签新增失败", error instanceof Error ? error.message : "保存失败");
  }
};

const startEditTag = (tag: { id: string; name: string }) => {
  tagEdit.id = tag.id;
  tagEdit.name = tag.name;
};

const saveTagEdit = async () => {
  if (!tagEdit.id || !tagEdit.name.trim()) {
    return;
  }
  try {
    await updateTag(tagEdit.id, { name: tagEdit.name.trim() });
    tagEdit.id = "";
    tagEdit.name = "";
    await loadTags();
    showOpNotice("success", "标签已更新");
  } catch (error) {
    showOpNotice("error", "标签更新失败", error instanceof Error ? error.message : "保存失败");
  }
};

const cancelTagEdit = () => {
  tagEdit.id = "";
  tagEdit.name = "";
};

const deleteTagItem = async (id: string) => {
  try {
    await deleteTag(id);
    await loadTags();
    await loadEvents();
    await loadStats();
    showOpNotice("success", "标签已删除");
  } catch (error) {
    showOpNotice("error", "标签删除失败", error instanceof Error ? error.message : "删除失败");
  }
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
    showOpNotice("success", "导出已开始");
  } catch (error) {
    exportError.value = error instanceof Error ? error.message : "导出失败";
    showOpNotice("error", "导出失败", exportError.value);
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
    showOpNotice("success", "导入成功");
  } catch (error) {
    importError.value = error instanceof Error ? error.message : "导入失败";
    showOpNotice("error", "导入失败", importError.value);
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
  userForm.displayName = "";
  userForm.email = "";
  userForm.password = "";
  userForm.role = "EDITOR";
};

const resetUserEdit = () => {
  userEdit.id = "";
  userEdit.displayName = "";
  userEdit.email = "";
  userEdit.password = "";
  userEdit.role = "EDITOR";
  userModalVisible.value = false;
};

const handleCreateUser = async () => {
  userError.value = "";
  if (!userForm.displayName.trim() || !userForm.email.trim() || !userForm.password.trim()) {
    userError.value = "请完整填写显示名、邮箱和密码";
    return;
  }
  try {
    await createUser({
      displayName: userForm.displayName.trim(),
      email: userForm.email.trim(),
      password: userForm.password,
      roles: [userForm.role]
    });
    resetUserForm();
    await refreshUsers();
    showOpNotice("success", "账号已创建");
  } catch (error) {
    userError.value = error instanceof Error ? error.message : "创建用户失败";
    showOpNotice("error", "创建失败", userError.value);
  }
};

const startEditUser = (item: UserInfo) => {
  userEdit.id = item.id;
  userEdit.displayName = item.displayName;
  userEdit.email = item.email;
  userEdit.role = resolvePrimaryRole(item.roles);
  userEdit.password = "";
  userModalVisible.value = true;
};

const handleSaveUser = async () => {
  userError.value = "";
  if (!userEdit.id) {
    return;
  }
  if (!userEdit.displayName.trim() || !userEdit.email.trim()) {
    userError.value = "请完整填写显示名和邮箱";
    return;
  }
  try {
    const payload: Record<string, string | string[] | boolean> = {
      displayName: userEdit.displayName.trim(),
      email: userEdit.email.trim(),
      roles: [userEdit.role]
    };
    if (userEdit.password.trim()) {
      payload.password = userEdit.password;
    }
    await updateUser(userEdit.id, payload);
    resetUserEdit();
    await refreshUsers();
    showOpNotice("success", "账号已更新");
  } catch (error) {
    userError.value = error instanceof Error ? error.message : "保存用户失败";
    showOpNotice("error", "保存失败", userError.value);
  }
};

const disableUserItem = async (id: string) => {
  userError.value = "";
  try {
    await disableUser(id);
    await refreshUsers();
    showOpNotice("success", "账号已禁用");
  } catch (error) {
    userError.value = error instanceof Error ? error.message : "禁用用户失败";
    showOpNotice("error", "禁用失败", userError.value);
  }
};

const applySmtpSettings = () => {
  if (!smtpSettings.value) {
    return;
  }
  smtpForm.enabled = smtpSettings.value.enabled;
  smtpForm.host = smtpSettings.value.host || "";
  smtpForm.port = smtpSettings.value.port || 587;
  smtpForm.secure = smtpSettings.value.secure;
  smtpForm.username = smtpSettings.value.username || "";
  smtpForm.fromAddress = smtpSettings.value.fromAddress || "";
  smtpForm.password = "";
};

const refreshSmtpSettings = async () => {
  smtpError.value = "";
  smtpNotice.value = "";
  if (!canManageSystem.value) {
    return;
  }
  try {
    await loadSmtpSettings();
    applySmtpSettings();
  } catch (error) {
    smtpError.value = error instanceof Error ? error.message : "SMTP 设置加载失败";
  }
};

const handleSaveSmtp = async () => {
  smtpError.value = "";
  smtpNotice.value = "";
  if (smtpForm.enabled && !smtpForm.host.trim()) {
    smtpError.value = "请填写服务器地址";
    return;
  }
  if (smtpForm.enabled && (!Number.isInteger(smtpForm.port) || smtpForm.port <= 0)) {
    smtpError.value = "请填写有效的端口";
    return;
  }

  smtpSaving.value = true;
  try {
    const payload: Record<string, string | number | boolean> = {
      enabled: smtpForm.enabled,
      host: smtpForm.host.trim(),
      port: smtpForm.port,
      secure: smtpForm.secure,
      username: smtpForm.username.trim(),
      fromAddress: smtpForm.fromAddress.trim()
    };
    if (smtpForm.password.trim()) {
      payload.password = smtpForm.password;
    }
    const data = await updateSmtpSettings(payload);
    smtpNotice.value = "已保存";
    smtpForm.password = "";
    if (data?.settings) {
      applySmtpSettings();
    }
    showOpNotice("success", "SMTP 设置已保存");
  } catch (error) {
    smtpError.value = error instanceof Error ? error.message : "保存失败";
    showOpNotice("error", "保存失败", smtpError.value);
  } finally {
    smtpSaving.value = false;
  }
};

const refreshAll = async () => {
  if (!user.value) {
    return;
  }
  await Promise.all([loadTags(), refreshEvents(), loadStats()]);
  await refreshUsers();
  await refreshSmtpSettings();
};

watch(availableTabs, () => {
  ensureTabAvailable();
}, { immediate: true });

onMounted(async () => {
  await refreshAll();
});

onUnmounted(() => {
  if (opNoticeTimer) {
    window.clearTimeout(opNoticeTimer);
    opNoticeTimer = null;
  }
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
    await loadTags();
  }
  if (value === "stats") {
    await loadStats();
  }
  if (value === "settings") {
    await refreshSmtpSettings();
  }
});
</script>

<style scoped>
.page-container {
  width: 100%;
  padding: 24px clamp(16px, 3vw, 40px);
}

.login-cta {
  margin-top: 16px;
}

.op-notice {
  margin-bottom: 16px;
  position: sticky;
  top: 88px;
  z-index: 9;
}

.quick-nav-card {
  margin-bottom: 24px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(0,0,0,0.03);
}

.quick-nav-container {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.quick-nav-label {
  font-weight: 600;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.quick-nav-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.nav-btn {
  border-radius: 16px;
  font-size: 13px;
}
</style>

