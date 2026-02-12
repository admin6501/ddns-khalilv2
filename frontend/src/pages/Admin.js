import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { adminAPI, activityAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Switch } from '../components/ui/switch';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import {
  Users, Server, Settings, Trash2, Eye, ArrowUpDown, Loader2,
  Plus, Save, RefreshCw, Crown, KeyRound, CreditCard, Pencil, Gift, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { DOMAIN } from '../config/site';
import { useConfig } from '../contexts/ConfigContext';

export default function Admin() {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const config = useConfig();
  const DNS_DOMAIN = config.dns_domain || DOMAIN;
  const [activeTab, setActiveTab] = useState('users');

  // Users
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [deleteUserId, setDeleteUserId] = useState(null);
  const [planDialogUser, setPlanDialogUser] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState('free');
  const [planLoading, setPlanLoading] = useState(false);

  // Activity log state
  const [adminLogs, setAdminLogs] = useState([]);
  const [adminLogPage, setAdminLogPage] = useState(1);
  const [adminLogPages, setAdminLogPages] = useState(1);
  const [adminLogLoading, setAdminLogLoading] = useState(false);
  const [adminLogFilter, setAdminLogFilter] = useState('');

  // Password
  const [passwordDialogUser, setPasswordDialogUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Bulk selection
  const [selectedUserIds, setSelectedUserIds] = useState(new Set());
  const [showBulkPlanDialog, setShowBulkPlanDialog] = useState(false);
  const [bulkPlan, setBulkPlan] = useState('free');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  // Records
  const [allRecords, setAllRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [userRecordsDialog, setUserRecordsDialog] = useState(null);
  const [userRecords, setUserRecords] = useState([]);
  const [deleteRecordId, setDeleteRecordId] = useState(null);

  // Create record
  const [showCreateRecordDialog, setShowCreateRecordDialog] = useState(false);
  const [createRecordForm, setCreateRecordForm] = useState({
    user_id: '', name: '', record_type: 'A', content: '', ttl: 1, proxied: false
  });
  const [createRecordLoading, setCreateRecordLoading] = useState(false);
  const [createRecordError, setCreateRecordError] = useState('');

  // Plans
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planForm, setPlanForm] = useState({
    plan_id: '', name: '', name_fa: '', price: '', price_fa: '',
    record_limit: 0, features: '', features_fa: '', popular: false, sort_order: 0
  });
  const [planFormLoading, setPlanFormLoading] = useState(false);
  const [planFormError, setPlanFormError] = useState('');
  const [deletePlanId, setDeletePlanId] = useState(null);

  // Settings
  const [settings, setSettings] = useState({
    telegram_id: '', telegram_url: '', contact_message_en: '', contact_message_fa: '',
    referral_bonus_per_invite: 1
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await adminAPI.listUsers();
      setUsers(res.data.users || []);
    } catch { toast.error('Failed to load users'); }
    finally { setUsersLoading(false); }
  }, []);

  const fetchAllRecords = useCallback(async () => {
    setRecordsLoading(true);
    try {
      const res = await adminAPI.listAllRecords();
      setAllRecords(res.data.records || []);
    } catch { toast.error('Failed to load records'); }
    finally { setRecordsLoading(false); }
  }, []);

  const fetchPlans = useCallback(async () => {
    setPlansLoading(true);
    try {
      const res = await adminAPI.listPlans();
      setPlans(res.data.plans || []);
    } catch { toast.error('Failed to load plans'); }
    finally { setPlansLoading(false); }
  }, []);

  const fetchSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const res = await adminAPI.getSettings();
      setSettings({
        telegram_id: res.data.telegram_id || '',
        telegram_url: res.data.telegram_url || '',
        contact_message_en: res.data.contact_message_en || '',
        contact_message_fa: res.data.contact_message_fa || '',
        referral_bonus_per_invite: res.data.referral_bonus_per_invite ?? 1,
      });
    } catch { toast.error('Failed to load settings'); }
    finally { setSettingsLoading(false); }
  }, []);

  const fetchAdminLogs = useCallback(async (page = 1, action = '') => {
    setAdminLogLoading(true);
    try {
      const res = await activityAPI.getAdminLogs(page, 30, '', action);
      setAdminLogs(res.data.logs || []);
      setAdminLogPages(res.data.pages || 1);
      setAdminLogPage(res.data.page || 1);
    } catch { /* ignore */ }
    setAdminLogLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers(); fetchAllRecords(); fetchPlans(); fetchSettings(); fetchAdminLogs();
  }, [fetchUsers, fetchAllRecords, fetchPlans, fetchSettings, fetchAdminLogs]);

  // === User actions ===
  const handleDeleteUser = async () => {
    if (!deleteUserId) return;
    try {
      await adminAPI.deleteUser(deleteUserId);
      toast.success('User deleted');
      setDeleteUserId(null);
      fetchUsers(); fetchAllRecords();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const handleChangePlan = async () => {
    if (!planDialogUser) return;
    setPlanLoading(true);
    try {
      await adminAPI.updateUserPlan(planDialogUser.id, selectedPlan);
      toast.success(`Plan updated to ${selectedPlan}`);
      setPlanDialogUser(null);
      fetchUsers();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
    finally { setPlanLoading(false); }
  };

  const handleChangePassword = async () => {
    if (!passwordDialogUser || newPassword.length < 6) return;
    setPasswordLoading(true);
    try {
      await adminAPI.changeUserPassword(passwordDialogUser.id, newPassword);
      toast.success(t('admin_password_changed'));
      setPasswordDialogUser(null);
      setNewPassword('');
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
    finally { setPasswordLoading(false); }
  };

  const handleViewUserRecords = async (u) => {
    setUserRecordsDialog(u);
    try {
      const res = await adminAPI.getUserRecords(u.id);
      setUserRecords(res.data.records || []);
    } catch { toast.error('Failed to load records'); }
  };

  // === Bulk actions ===
  const toggleUserSelection = (userId) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const selectable = users.filter(u => u.role !== 'admin');
    if (selectedUserIds.size === selectable.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(selectable.map(u => u.id)));
    }
  };

  const handleBulkPlanChange = async () => {
    setBulkLoading(true);
    try {
      const res = await adminAPI.bulkUpdatePlan([...selectedUserIds], bulkPlan);
      toast.success(t('admin_bulk_plan_updated').replace('{count}', res.data.updated_count));
      setShowBulkPlanDialog(false);
      setSelectedUserIds(new Set());
      fetchUsers();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
    finally { setBulkLoading(false); }
  };

  const handleBulkDelete = async () => {
    setBulkLoading(true);
    try {
      const res = await adminAPI.bulkDeleteUsers([...selectedUserIds]);
      toast.success(t('admin_bulk_deleted').replace('{count}', res.data.deleted_count));
      setShowBulkDeleteDialog(false);
      setSelectedUserIds(new Set());
      fetchUsers();
      fetchAllRecords();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
    finally { setBulkLoading(false); }
  };

  // === Record actions ===
  const handleDeleteRecord = async () => {
    if (!deleteRecordId) return;
    try {
      await adminAPI.deleteRecord(deleteRecordId);
      toast.success('Record deleted');
      setDeleteRecordId(null);
      fetchAllRecords();
      if (userRecordsDialog) handleViewUserRecords(userRecordsDialog);
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const handleCreateRecord = async () => {
    setCreateRecordError('');
    setCreateRecordLoading(true);
    try {
      await adminAPI.createRecord(createRecordForm);
      toast.success('Record created');
      setShowCreateRecordDialog(false);
      setCreateRecordForm({ user_id: '', name: '', record_type: 'A', content: '', ttl: 1, proxied: false });
      fetchAllRecords(); fetchUsers();
    } catch (err) { setCreateRecordError(err.response?.data?.detail || 'Failed'); }
    finally { setCreateRecordLoading(false); }
  };

  // === Plan actions ===
  const openCreatePlan = () => {
    setEditingPlan(null);
    setPlanForm({ plan_id: '', name: '', name_fa: '', price: '', price_fa: '', record_limit: 0, features: '', features_fa: '', popular: false, sort_order: plans.length });
    setPlanFormError('');
    setShowPlanDialog(true);
  };

  const openEditPlan = (p) => {
    setEditingPlan(p);
    setPlanForm({
      plan_id: p.plan_id,
      name: p.name, name_fa: p.name_fa || '',
      price: p.price, price_fa: p.price_fa || '',
      record_limit: p.record_limit,
      features: (p.features || []).join('\n'),
      features_fa: (p.features_fa || []).join('\n'),
      popular: p.popular || false,
      sort_order: p.sort_order || 0,
    });
    setPlanFormError('');
    setShowPlanDialog(true);
  };

  const handleSavePlan = async () => {
    setPlanFormError('');
    setPlanFormLoading(true);
    const payload = {
      ...planForm,
      features: planForm.features.split('\n').filter(Boolean),
      features_fa: planForm.features_fa.split('\n').filter(Boolean),
    };
    try {
      if (editingPlan) {
        const { plan_id, ...rest } = payload;
        await adminAPI.updatePlan(editingPlan.plan_id, rest);
        toast.success(t('admin_plan_updated'));
      } else {
        await adminAPI.createPlan(payload);
        toast.success(t('admin_plan_created'));
      }
      setShowPlanDialog(false);
      fetchPlans();
    } catch (err) { setPlanFormError(err.response?.data?.detail || 'Failed'); }
    finally { setPlanFormLoading(false); }
  };

  const handleDeletePlan = async () => {
    if (!deletePlanId) return;
    try {
      await adminAPI.deletePlan(deletePlanId);
      toast.success(t('admin_plan_deleted'));
      setDeletePlanId(null);
      fetchPlans();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  // === Settings ===
  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    try {
      await adminAPI.updateSettings(settings);
      toast.success(t('admin_settings_saved'));
    } catch { toast.error('Failed'); }
    finally { setSettingsSaving(false); }
  };

  const planColors = {
    free: 'bg-muted text-muted-foreground',
    pro: 'bg-primary/10 text-primary border-primary/20',
    enterprise: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
  };
  const typeColors = {
    A: 'bg-primary/10 text-primary border-primary/20',
    AAAA: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
    CNAME: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  };
  const nonAdminUsers = users.filter(u => u.role !== 'admin');

  return (
    <div className="min-h-screen" data-testid="admin-page">
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Crown className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className={`text-3xl md:text-4xl font-bold tracking-tight ${lang === 'en' ? 'font-en-heading' : 'font-fa'}`} data-testid="admin-title">
              {t('admin_title')}
            </h1>
            <p className="text-muted-foreground text-sm">{user?.email}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl border border-border bg-card p-5" data-testid="admin-stat-users">
            <div className="flex items-center gap-3">
              <Users className="w-7 h-7 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">{t('admin_total_users')}</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5" data-testid="admin-stat-records">
            <div className="flex items-center gap-3">
              <Server className="w-7 h-7 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">{t('admin_total_records')}</p>
                <p className="text-2xl font-bold">{allRecords.length}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5" data-testid="admin-stat-plans">
            <div className="flex items-center gap-3">
              <CreditCard className="w-7 h-7 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">{t('admin_plans_tab')}</p>
                <p className="text-2xl font-bold">{plans.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full max-w-2xl">
            <TabsTrigger value="users" data-testid="admin-tab-users">
              <Users className="w-4 h-4 me-1.5" />{t('admin_users')}
            </TabsTrigger>
            <TabsTrigger value="records" data-testid="admin-tab-records">
              <Server className="w-4 h-4 me-1.5" />{t('admin_records')}
            </TabsTrigger>
            <TabsTrigger value="plans" data-testid="admin-tab-plans">
              <CreditCard className="w-4 h-4 me-1.5" />{t('admin_plans_tab')}
            </TabsTrigger>
            <TabsTrigger value="logs" data-testid="admin-tab-logs">
              <Clock className="w-4 h-4 me-1.5" />{lang === 'fa' ? 'لاگ' : 'Logs'}
            </TabsTrigger>
            <TabsTrigger value="settings" data-testid="admin-tab-settings">
              <Settings className="w-4 h-4 me-1.5" />{t('admin_settings')}
            </TabsTrigger>
          </TabsList>

          {/* ===== USERS TAB ===== */}
          <TabsContent value="users" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">{t('admin_users')}</h2>
              <Button variant="ghost" size="sm" onClick={fetchUsers} data-testid="admin-refresh-users"><RefreshCw className="w-4 h-4" /></Button>
            </div>

            {/* Bulk Action Bar */}
            {selectedUserIds.size > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-xl border border-primary/30 bg-primary/5 animate-fade-in" data-testid="bulk-action-bar">
                <Badge variant="default" className="text-sm">
                  {selectedUserIds.size} {t('admin_selected')}
                </Badge>
                <div className="flex gap-2 ms-auto">
                  <Button size="sm" variant="outline" onClick={() => { setBulkPlan('free'); setShowBulkPlanDialog(true); }} data-testid="bulk-change-plan-btn">
                    <ArrowUpDown className="w-4 h-4 me-1.5" />{t('admin_bulk_change_plan')}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setShowBulkDeleteDialog(true)} data-testid="bulk-delete-btn">
                    <Trash2 className="w-4 h-4 me-1.5" />{t('admin_bulk_delete')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedUserIds(new Set())} data-testid="bulk-clear-btn">
                    {t('cancel')}
                  </Button>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-border bg-card overflow-hidden">
              {usersLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : users.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">{t('admin_no_users')}</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedUserIds.size > 0 && selectedUserIds.size === users.filter(u => u.role !== 'admin').length}
                            onCheckedChange={toggleSelectAll}
                            data-testid="select-all-checkbox"
                          />
                        </TableHead>
                        <TableHead>{lang === 'fa' ? 'نام' : 'Name'}</TableHead>
                        <TableHead>{lang === 'fa' ? 'ایمیل' : 'Email'}</TableHead>
                        <TableHead>{lang === 'fa' ? 'پلن' : 'Plan'}</TableHead>
                        <TableHead>{lang === 'fa' ? 'نقش' : 'Role'}</TableHead>
                        <TableHead>{lang === 'fa' ? 'رکوردها' : 'Records'}</TableHead>
                        <TableHead className="text-end">{t('table_actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow
                          key={u.id}
                          className={selectedUserIds.has(u.id) ? 'bg-primary/5' : ''}
                          data-testid={`admin-user-row-${u.id}`}
                        >
                          <TableCell>
                            {u.role !== 'admin' ? (
                              <Checkbox
                                checked={selectedUserIds.has(u.id)}
                                onCheckedChange={() => toggleUserSelection(u.id)}
                                data-testid={`select-user-${u.id}`}
                              />
                            ) : <div className="w-4" />}
                          </TableCell>
                          <TableCell className="font-medium">{u.name}</TableCell>
                          <TableCell className="font-mono text-sm">{u.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={planColors[u.plan] || 'bg-muted text-muted-foreground'}>{u.plan}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>{u.role || 'user'}</Badge>
                          </TableCell>
                          <TableCell>{u.record_count}/{u.record_limit}</TableCell>
                          <TableCell className="text-end">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleViewUserRecords(u)} title={t('admin_view_records')} data-testid={`admin-view-records-${u.id}`}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              {u.role !== 'admin' && (
                                <>
                                  <Button variant="ghost" size="sm" onClick={() => { setPlanDialogUser(u); setSelectedPlan(u.plan); }} title={t('admin_change_plan')} data-testid={`admin-change-plan-${u.id}`}>
                                    <ArrowUpDown className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => { setPasswordDialogUser(u); setNewPassword(''); }} title={t('admin_change_password')} data-testid={`admin-change-pw-${u.id}`}>
                                    <KeyRound className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteUserId(u.id)} title={t('admin_delete_user')} data-testid={`admin-delete-user-${u.id}`}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ===== RECORDS TAB ===== */}
          <TabsContent value="records" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">{t('admin_records')}</h2>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setShowCreateRecordDialog(true)} data-testid="admin-add-record-btn">
                  <Plus className="w-4 h-4 me-2" />{t('admin_add_record')}
                </Button>
                <Button variant="ghost" size="sm" onClick={fetchAllRecords} data-testid="admin-refresh-records"><RefreshCw className="w-4 h-4" /></Button>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              {recordsLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : allRecords.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">{t('admin_no_records')}</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('table_type')}</TableHead>
                        <TableHead>{t('table_name')}</TableHead>
                        <TableHead>{t('table_content')}</TableHead>
                        <TableHead>{lang === 'fa' ? 'کاربر' : 'User'}</TableHead>
                        <TableHead className="text-end">{t('table_actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allRecords.map((rec) => (
                        <TableRow key={rec.id} data-testid={`admin-record-row-${rec.id}`}>
                          <TableCell><Badge variant="outline" className={typeColors[rec.record_type] || ''}>{rec.record_type}</Badge></TableCell>
                          <TableCell className="font-mono text-sm">{rec.full_name}</TableCell>
                          <TableCell className="font-mono text-sm max-w-[180px] truncate">{rec.content}</TableCell>
                          <TableCell className="text-sm">{rec.user_email || rec.user_id}</TableCell>
                          <TableCell className="text-end">
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteRecordId(rec.id)} data-testid={`admin-delete-record-${rec.id}`}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ===== PLANS TAB ===== */}
          <TabsContent value="plans" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">{t('admin_plans_tab')}</h2>
              <div className="flex gap-2">
                <Button size="sm" onClick={openCreatePlan} data-testid="admin-add-plan-btn">
                  <Plus className="w-4 h-4 me-2" />{t('admin_add_plan')}
                </Button>
                <Button variant="ghost" size="sm" onClick={fetchPlans} data-testid="admin-refresh-plans"><RefreshCw className="w-4 h-4" /></Button>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              {plansLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : plans.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">{t('admin_no_plans')}</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>{lang === 'fa' ? 'نام' : 'Name'}</TableHead>
                        <TableHead>{t('admin_plan_price')}</TableHead>
                        <TableHead>{t('admin_plan_limit')}</TableHead>
                        <TableHead>{t('admin_plan_popular')}</TableHead>
                        <TableHead>{lang === 'fa' ? 'ترتیب' : 'Order'}</TableHead>
                        <TableHead className="text-end">{t('table_actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plans.map((p) => (
                        <TableRow key={p.plan_id} data-testid={`admin-plan-row-${p.plan_id}`}>
                          <TableCell className="font-mono text-sm">{p.plan_id}</TableCell>
                          <TableCell>
                            <div>{p.name}</div>
                            <div className="text-xs text-muted-foreground">{p.name_fa}</div>
                          </TableCell>
                          <TableCell>
                            <div>{p.price}</div>
                            <div className="text-xs text-muted-foreground">{p.price_fa}</div>
                          </TableCell>
                          <TableCell className="font-semibold">{p.record_limit}</TableCell>
                          <TableCell>
                            {p.popular ? <Badge className="bg-primary/10 text-primary">{lang === 'fa' ? 'بله' : 'Yes'}</Badge> : <span className="text-muted-foreground text-sm">{lang === 'fa' ? 'خیر' : 'No'}</span>}
                          </TableCell>
                          <TableCell>{p.sort_order}</TableCell>
                          <TableCell className="text-end">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openEditPlan(p)} data-testid={`admin-edit-plan-${p.plan_id}`}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeletePlanId(p.plan_id)} data-testid={`admin-delete-plan-${p.plan_id}`}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ===== ACTIVITY LOGS TAB ===== */}
          <TabsContent value="logs" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5" />
                {lang === 'fa' ? 'لاگ فعالیت‌ها' : 'Activity Logs'}
              </h2>
              <div className="flex items-center gap-2">
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={adminLogFilter}
                  onChange={(e) => { setAdminLogFilter(e.target.value); fetchAdminLogs(1, e.target.value); }}
                >
                  <option value="">{lang === 'fa' ? 'همه فعالیت‌ها' : 'All Actions'}</option>
                  <option value="login">{lang === 'fa' ? 'ورود' : 'Login'}</option>
                  <option value="register">{lang === 'fa' ? 'ثبت‌نام' : 'Register'}</option>
                  <option value="record_created">{lang === 'fa' ? 'ساخت رکورد' : 'Record Created'}</option>
                  <option value="record_updated">{lang === 'fa' ? 'ویرایش رکورد' : 'Record Updated'}</option>
                  <option value="record_deleted">{lang === 'fa' ? 'حذف رکورد' : 'Record Deleted'}</option>
                  <option value="telegram_linked">{lang === 'fa' ? 'اتصال تلگرام' : 'Telegram Linked'}</option>
                </select>
                <Button variant="ghost" size="sm" onClick={() => fetchAdminLogs(1, adminLogFilter)}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
              {adminLogLoading ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : adminLogs.length === 0 ? (
                <div className="text-center p-12 text-muted-foreground">
                  {lang === 'fa' ? 'هنوز فعالیتی ثبت نشده.' : 'No activity logs yet.'}
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{lang === 'fa' ? 'کاربر' : 'User'}</TableHead>
                          <TableHead>{lang === 'fa' ? 'فعالیت' : 'Action'}</TableHead>
                          <TableHead>{lang === 'fa' ? 'جزئیات' : 'Details'}</TableHead>
                          <TableHead>{lang === 'fa' ? 'تاریخ' : 'Date'}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {adminLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-medium text-sm">{log.user_email}</TableCell>
                            <TableCell>
                              <Badge variant={
                                log.action === 'record_created' ? 'default' :
                                log.action === 'record_deleted' ? 'destructive' :
                                log.action === 'record_updated' ? 'secondary' :
                                'outline'
                              } className="text-xs">
                                {log.action === 'record_created' ? (lang === 'fa' ? 'ساخت رکورد' : 'Created') :
                                 log.action === 'record_deleted' ? (lang === 'fa' ? 'حذف رکورد' : 'Deleted') :
                                 log.action === 'record_updated' ? (lang === 'fa' ? 'ویرایش رکورد' : 'Updated') :
                                 log.action === 'login' ? (lang === 'fa' ? 'ورود' : 'Login') :
                                 log.action === 'register' ? (lang === 'fa' ? 'ثبت‌نام' : 'Register') :
                                 log.action === 'telegram_linked' ? (lang === 'fa' ? 'تلگرام' : 'Telegram') :
                                 log.action}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground font-mono max-w-xs truncate">{log.details || '—'}</TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(log.created_at).toLocaleDateString(lang === 'fa' ? 'fa-IR' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {adminLogPages > 1 && (
                    <div className="flex items-center justify-center gap-2 p-3 border-t border-border">
                      <Button variant="ghost" size="sm" disabled={adminLogPage <= 1} onClick={() => fetchAdminLogs(adminLogPage - 1, adminLogFilter)}>
                        {lang === 'fa' ? 'قبلی' : 'Prev'}
                      </Button>
                      <span className="text-xs text-muted-foreground">{adminLogPage}/{adminLogPages}</span>
                      <Button variant="ghost" size="sm" disabled={adminLogPage >= adminLogPages} onClick={() => fetchAdminLogs(adminLogPage + 1, adminLogFilter)}>
                        {lang === 'fa' ? 'بعدی' : 'Next'}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>

          {/* ===== SETTINGS TAB ===== */}
          <TabsContent value="settings" className="space-y-6">
            <h2 className="text-xl font-semibold">{t('admin_settings')}</h2>
            <div className="rounded-xl border border-border bg-card p-6 space-y-5 max-w-xl">
              {settingsLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>{t('admin_telegram_id')}</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">@</span>
                      <Input value={settings.telegram_id} onChange={(e) => setSettings(p => ({ ...p, telegram_id: e.target.value }))} placeholder="username" data-testid="admin-telegram-id-input" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('admin_telegram_url')}</Label>
                    <Input value={settings.telegram_url} onChange={(e) => setSettings(p => ({ ...p, telegram_url: e.target.value }))} placeholder="https://t.me/username" data-testid="admin-telegram-url-input" />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('admin_contact_en')}</Label>
                    <Input value={settings.contact_message_en} onChange={(e) => setSettings(p => ({ ...p, contact_message_en: e.target.value }))} data-testid="admin-contact-en-input" />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('admin_contact_fa')}</Label>
                    <Input value={settings.contact_message_fa} onChange={(e) => setSettings(p => ({ ...p, contact_message_fa: e.target.value }))} dir="rtl" data-testid="admin-contact-fa-input" />
                  </div>
                  <div className="pt-4 border-t border-border space-y-2">
                    <Label className="flex items-center gap-2">
                      <Gift className="w-4 h-4 text-primary" />
                      {t('admin_referral_bonus')}
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={settings.referral_bonus_per_invite}
                      onChange={(e) => setSettings(p => ({ ...p, referral_bonus_per_invite: parseInt(e.target.value) || 0 }))}
                      className="max-w-[200px]"
                      data-testid="admin-referral-bonus-input"
                    />
                    <p className="text-xs text-muted-foreground">
                      {lang === 'fa'
                        ? 'تعداد رکوردهای اضافه‌ای که به ازای هر دعوت موفق به کاربر داده میشه'
                        : 'Number of bonus records given to the referrer for each successful invite'}
                    </p>
                  </div>
                  <Button onClick={handleSaveSettings} disabled={settingsSaving} data-testid="admin-save-settings-btn">
                    {settingsSaving ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <Save className="w-4 h-4 me-2" />}
                    {t('admin_save_settings')}
                  </Button>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* === DIALOGS === */}

      {/* Delete User */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent data-testid="admin-delete-user-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin_delete_user')}</AlertDialogTitle>
            <AlertDialogDescription>{t('admin_delete_user_confirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid="admin-delete-user-confirm-btn">{t('delete_confirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Plan */}
      <Dialog open={!!planDialogUser} onOpenChange={() => setPlanDialogUser(null)}>
        <DialogContent className="sm:max-w-sm" data-testid="admin-change-plan-dialog">
          <DialogHeader><DialogTitle>{t('admin_change_plan')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {planDialogUser?.email} &mdash; {lang === 'fa' ? 'فعلی:' : 'Current:'} <strong>{planDialogUser?.plan}</strong>
            </p>
            <Select value={selectedPlan} onValueChange={setSelectedPlan}>
              <SelectTrigger data-testid="admin-plan-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                {plans.map(p => (
                  <SelectItem key={p.plan_id} value={p.plan_id}>{p.name} ({p.record_limit} records)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanDialogUser(null)}>{t('cancel')}</Button>
            <Button onClick={handleChangePlan} disabled={planLoading} data-testid="admin-plan-save-btn">
              {planLoading && <Loader2 className="w-4 h-4 animate-spin me-2" />}{t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password */}
      <Dialog open={!!passwordDialogUser} onOpenChange={() => setPasswordDialogUser(null)}>
        <DialogContent className="sm:max-w-sm" data-testid="admin-change-password-dialog">
          <DialogHeader><DialogTitle>{t('admin_change_password')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{passwordDialogUser?.email}</p>
            <div className="space-y-2">
              <Label>{t('admin_new_password')}</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                data-testid="admin-new-password-input"
              />
              {newPassword.length > 0 && newPassword.length < 6 && (
                <p className="text-xs text-destructive">{lang === 'fa' ? 'حداقل ۶ کاراکتر' : 'Minimum 6 characters'}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogUser(null)}>{t('cancel')}</Button>
            <Button onClick={handleChangePassword} disabled={passwordLoading || newPassword.length < 6} data-testid="admin-password-save-btn">
              {passwordLoading && <Loader2 className="w-4 h-4 animate-spin me-2" />}{t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View User Records */}
      <Dialog open={!!userRecordsDialog} onOpenChange={() => setUserRecordsDialog(null)}>
        <DialogContent className="sm:max-w-2xl" data-testid="admin-user-records-dialog">
          <DialogHeader><DialogTitle>{t('admin_user_records')} &mdash; {userRecordsDialog?.email}</DialogTitle></DialogHeader>
          {userRecords.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">{t('admin_no_records')}</p>
          ) : (
            <div className="overflow-x-auto max-h-80">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('table_type')}</TableHead>
                    <TableHead>{t('table_name')}</TableHead>
                    <TableHead>{t('table_content')}</TableHead>
                    <TableHead className="text-end">{t('table_actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userRecords.map((rec) => (
                    <TableRow key={rec.id}>
                      <TableCell><Badge variant="outline" className={typeColors[rec.record_type] || ''}>{rec.record_type}</Badge></TableCell>
                      <TableCell className="font-mono text-sm">{rec.full_name}</TableCell>
                      <TableCell className="font-mono text-sm">{rec.content}</TableCell>
                      <TableCell className="text-end">
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteRecordId(rec.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Record */}
      <AlertDialog open={!!deleteRecordId} onOpenChange={() => setDeleteRecordId(null)}>
        <AlertDialogContent data-testid="admin-delete-record-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('form_delete')}</AlertDialogTitle>
            <AlertDialogDescription>{t('form_delete_confirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRecord} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid="admin-delete-record-confirm-btn">{t('delete_confirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Record for User */}
      <Dialog open={showCreateRecordDialog} onOpenChange={setShowCreateRecordDialog}>
        <DialogContent className="sm:max-w-md" data-testid="admin-create-record-dialog">
          <DialogHeader><DialogTitle>{t('admin_add_record')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {createRecordError && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">{createRecordError}</div>}
            <div className="space-y-2">
              <Label>{t('admin_select_user')}</Label>
              <Select value={createRecordForm.user_id} onValueChange={(v) => setCreateRecordForm(p => ({ ...p, user_id: v }))}>
                <SelectTrigger data-testid="admin-create-user-select"><SelectValue placeholder={t('admin_select_user')} /></SelectTrigger>
                <SelectContent>{nonAdminUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('form_subdomain')}</Label>
              <div className="flex items-center gap-2">
                <Input value={createRecordForm.name} onChange={(e) => setCreateRecordForm(p => ({ ...p, name: e.target.value }))} placeholder="mysite" data-testid="admin-create-subdomain-input" />
                <span className="text-sm text-muted-foreground whitespace-nowrap">.{DOMAIN}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('form_type')}</Label>
              <Select value={createRecordForm.record_type} onValueChange={(v) => setCreateRecordForm(p => ({ ...p, record_type: v }))}>
                <SelectTrigger data-testid="admin-create-type-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">A</SelectItem>
                  <SelectItem value="AAAA">AAAA</SelectItem>
                  <SelectItem value="CNAME">CNAME</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('form_content')}</Label>
              <Input value={createRecordForm.content} onChange={(e) => setCreateRecordForm(p => ({ ...p, content: e.target.value }))} placeholder="192.168.1.1" data-testid="admin-create-content-input" />
            </div>
            <div className="flex items-center justify-between">
              <Label>{t('form_proxied')}</Label>
              <Switch checked={createRecordForm.proxied} onCheckedChange={(v) => setCreateRecordForm(p => ({ ...p, proxied: v }))} data-testid="admin-create-proxied-switch" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateRecordDialog(false)}>{t('cancel')}</Button>
            <Button onClick={handleCreateRecord} disabled={createRecordLoading || !createRecordForm.user_id || !createRecordForm.name || !createRecordForm.content} data-testid="admin-create-record-btn">
              {createRecordLoading && <Loader2 className="w-4 h-4 animate-spin me-2" />}<Plus className="w-4 h-4 me-1" />{t('form_create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Plan */}
      <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" data-testid="admin-plan-dialog">
          <DialogHeader>
            <DialogTitle>{editingPlan ? t('admin_edit_plan') : t('admin_add_plan')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {planFormError && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">{planFormError}</div>}
            {!editingPlan && (
              <div className="space-y-2">
                <Label>{t('admin_plan_id')}</Label>
                <Input value={planForm.plan_id} onChange={(e) => setPlanForm(p => ({ ...p, plan_id: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') }))} placeholder="e.g. starter" data-testid="admin-plan-id-input" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('admin_plan_name')}</Label>
                <Input value={planForm.name} onChange={(e) => setPlanForm(p => ({ ...p, name: e.target.value }))} placeholder="Pro" data-testid="admin-plan-name-input" />
              </div>
              <div className="space-y-2">
                <Label>{t('admin_plan_name_fa')}</Label>
                <Input value={planForm.name_fa} onChange={(e) => setPlanForm(p => ({ ...p, name_fa: e.target.value }))} dir="rtl" placeholder="حرفه‌ای" data-testid="admin-plan-namefa-input" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('admin_plan_price')}</Label>
                <Input value={planForm.price} onChange={(e) => setPlanForm(p => ({ ...p, price: e.target.value }))} placeholder="$10/mo" data-testid="admin-plan-price-input" />
              </div>
              <div className="space-y-2">
                <Label>{t('admin_plan_price_fa')}</Label>
                <Input value={planForm.price_fa} onChange={(e) => setPlanForm(p => ({ ...p, price_fa: e.target.value }))} dir="rtl" placeholder="۱۰ دلار/ماه" data-testid="admin-plan-pricefa-input" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('admin_plan_limit')}</Label>
                <Input type="number" min="0" value={planForm.record_limit} onChange={(e) => setPlanForm(p => ({ ...p, record_limit: parseInt(e.target.value) || 0 }))} data-testid="admin-plan-limit-input" />
              </div>
              <div className="space-y-2">
                <Label>{t('admin_plan_sort')}</Label>
                <Input type="number" value={planForm.sort_order} onChange={(e) => setPlanForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} data-testid="admin-plan-sort-input" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('admin_plan_features')}</Label>
              <Textarea rows={3} value={planForm.features} onChange={(e) => setPlanForm(p => ({ ...p, features: e.target.value }))} placeholder="One feature per line" data-testid="admin-plan-features-input" />
            </div>
            <div className="space-y-2">
              <Label>{t('admin_plan_features_fa')}</Label>
              <Textarea rows={3} value={planForm.features_fa} onChange={(e) => setPlanForm(p => ({ ...p, features_fa: e.target.value }))} dir="rtl" placeholder="هر خط یک امکان" data-testid="admin-plan-featuresfa-input" />
            </div>
            <div className="flex items-center justify-between">
              <Label>{t('admin_plan_popular')}</Label>
              <Switch checked={planForm.popular} onCheckedChange={(v) => setPlanForm(p => ({ ...p, popular: v }))} data-testid="admin-plan-popular-switch" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPlanDialog(false)}>{t('cancel')}</Button>
            <Button onClick={handleSavePlan} disabled={planFormLoading || (!editingPlan && !planForm.plan_id) || !planForm.name} data-testid="admin-plan-save-btn">
              {planFormLoading && <Loader2 className="w-4 h-4 animate-spin me-2" />}
              <Save className="w-4 h-4 me-1" />{t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Plan */}
      <AlertDialog open={!!deletePlanId} onOpenChange={() => setDeletePlanId(null)}>
        <AlertDialogContent data-testid="admin-delete-plan-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin_delete_plan')}</AlertDialogTitle>
            <AlertDialogDescription>{t('admin_delete_plan_confirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePlan} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid="admin-delete-plan-confirm-btn">{t('delete_confirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Change Plan */}
      <Dialog open={showBulkPlanDialog} onOpenChange={setShowBulkPlanDialog}>
        <DialogContent className="sm:max-w-sm" data-testid="bulk-plan-dialog">
          <DialogHeader>
            <DialogTitle>{t('admin_bulk_change_plan')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('admin_bulk_confirm_plan').replace('{count}', selectedUserIds.size)}
            </p>
            <Select value={bulkPlan} onValueChange={setBulkPlan}>
              <SelectTrigger data-testid="bulk-plan-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                {plans.map(p => (
                  <SelectItem key={p.plan_id} value={p.plan_id}>{p.name} ({p.record_limit} records)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkPlanDialog(false)}>{t('cancel')}</Button>
            <Button onClick={handleBulkPlanChange} disabled={bulkLoading} data-testid="bulk-plan-confirm-btn">
              {bulkLoading && <Loader2 className="w-4 h-4 animate-spin me-2" />}{t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent data-testid="bulk-delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin_bulk_delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin_bulk_confirm_delete').replace('{count}', selectedUserIds.size)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={bulkLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="bulk-delete-confirm-btn"
            >
              {bulkLoading && <Loader2 className="w-4 h-4 animate-spin me-2" />}{t('delete_confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
