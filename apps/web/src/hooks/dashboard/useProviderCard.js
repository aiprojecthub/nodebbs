'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

/**
 * 单个 Provider Card 管理 Hook
 * 管理表单状态、保存、启用/禁用、测试操作
 *
 * @param {Object} options
 * @param {Object} options.provider - Provider 数据对象
 * @param {string} options.idField - 唯一标识字段名 ('provider' | 'slug')
 * @param {Function} options.updateApiFn - async (id, payload) => void
 * @param {Function} options.onUpdate - (id, updates) => void 乐观更新回调
 * @param {Function} options.getInitialFormData - (provider) => formData
 * @param {Function} options.buildSavePayload - (formData, provider) => API payload
 * @param {string} options.editingProvider - 当前正在编辑的 provider ID
 * @param {Function} options.setEditingProvider - 设置编辑状态
 * @param {Function} [options.testApiFn] - async (id, ...args) => { success, message }
 * @param {string} [options.testingProvider] - 当前正在测试的 provider ID
 * @param {Function} [options.setTestingProvider] - 设置测试状态
 */
export function useProviderCard({
  provider,
  idField = 'provider',
  updateApiFn,
  onUpdate,
  getInitialFormData,
  buildSavePayload,
  editingProvider,
  setEditingProvider,
  testApiFn,
  testingProvider,
  setTestingProvider,
}) {
  const providerId = provider[idField];
  const isEditing = editingProvider === providerId;
  const isTesting = testingProvider === providerId;

  const [formData, setFormData] = useState(() => getInitialFormData(provider));
  const [saving, setSaving] = useState(false);

  const handleEditClick = useCallback(() => {
    setEditingProvider(providerId);
    setFormData(getInitialFormData(provider));
  }, [providerId, provider, setEditingProvider, getInitialFormData]);

  const handleCancelClick = useCallback(() => {
    setEditingProvider(null);
  }, [setEditingProvider]);

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      const payload = buildSavePayload(formData, provider);
      await updateApiFn(providerId, payload);
      toast.success(`${provider.displayName} 配置已保存`);
      setEditingProvider(null);
      onUpdate(providerId, payload);
    } catch (error) {
      console.error(`Failed to update provider ${providerId}:`, error);
      toast.error('保存配置失败');
    } finally {
      setSaving(false);
    }
  }, [formData, provider, providerId, buildSavePayload, updateApiFn, setEditingProvider, onUpdate]);

  const handleToggleEnabled = useCallback(
    async (checked) => {
      try {
        const payload = { isEnabled: checked };
        await updateApiFn(providerId, payload);
        toast.success(
          checked
            ? `${provider.displayName} 已启用`
            : `${provider.displayName} 已停用`
        );
        onUpdate(providerId, payload);
      } catch (error) {
        console.error(`Failed to toggle provider ${providerId}:`, error);
        toast.error('操作失败');
      }
    },
    [providerId, provider.displayName, updateApiFn, onUpdate]
  );

  const handleTest = useCallback(
    async (...args) => {
      if (!testApiFn || !setTestingProvider) return;
      try {
        setTestingProvider(providerId);
        const result = await testApiFn(providerId, ...args);
        if (result.success) {
          toast.success(result.message || '测试通过');
        } else {
          toast.error(result.message || '测试失败');
        }
      } catch (error) {
        console.error(`Failed to test provider ${providerId}:`, error);
        toast.error('测试失败');
      } finally {
        setTestingProvider(null);
      }
    },
    [providerId, testApiFn, setTestingProvider]
  );

  return {
    formData,
    setFormData,
    saving,
    isEditing,
    isTesting,
    handleEditClick,
    handleCancelClick,
    handleSave,
    handleToggleEnabled,
    handleTest,
  };
}
