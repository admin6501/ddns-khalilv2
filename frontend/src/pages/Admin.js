import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { adminAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Switch } from '../components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Users, Server, Settings, Trash2, Eye, ArrowUpDown,
  Loader2, Plus, Save, Send, RefreshCw, Crown
} from 'lucide-react';
import { toast } from 'sonner';

const DOMAIN = "khalilv2.com";

export default function Admin() {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('users');

  // Users state
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [deleteUserId, setDeleteUserId] = useState(null);
  const [planDialogUser, setPlanDialogUser] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState('free');
  const [planLoading, setPlanLoading] = useState(false);

  // Records state
  const [allRecords, setAllRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [userRecordsDialog, setUserRecordsDialog] = useState(null);
  const [userRecords, setUserRecords] = useState([]);
  const [deleteRecordId, setDeleteRecordId] = useState(null);

  // Create record state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({
    user_id: '', name: '', record_type: 'A', content: '', ttl: 1, proxied: false
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Settings state
  const [settings, setSettings] = useState({
    telegram_id: '', telegram_url: '', contact_message_en: '', contact_message_fa: ''
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await adminAPI.listUsers();
      setUsers(res.data.users || []);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const fetchAllRecords = useCallback(async () => {
    setRecordsLoading(true);
    try {
      const res = await adminAPI.listAllRecords();
      setAllRecords(res.data.records || []);
    } catch (err) {
      toast.error('Failed to load records');
    } finally {
      setRecordsLoading(false);
    }
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
      });
    } catch (err) {
      toast.error('Failed to load settings');
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchAllRecords();
    fetchSettings();
  }, [fetchUsers, fetchAllRecords, fetchSettings]);

  // === User actions ===
  const handleDeleteUser = async () => {
    if (!deleteUserId) return;
    try {
      await adminAPI.deleteUser(deleteUserId);
      toast.success('User deleted');
      setDeleteUserId(null);
      fetchUsers();
      fetchAllRecords();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete');
    }
  };

  const handleChangePlan = async () => {
    if (!planDialogUser) return;
    setPlanLoading(true);
    try {
      await adminAPI.updateUserPlan(planDialogUser.id, selectedPlan);
      toast.success(`Plan updated to ${selectedPlan}`);
      setPlanDialogUser(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update');
    } finally {
      setPlanLoading(false);
    }
  };

  const handleViewUserRecords = async (u) => {
    setUserRecordsDialog(u);
    try {
      const res = await adminAPI.getUserRecords(u.id);
      setUserRecords(res.data.records || []);
    } catch (err) {
      toast.error('Failed to load records');
    }
  };

  // === Record actions ===
  const handleDeleteRecord = async () => {
    if (!deleteRecordId) return;
    try {
      await adminAPI.deleteRecord(deleteRecordId);
      toast.success('Record deleted');
      setDeleteRecordId(null);
      fetchAllRecords();
      if (userRecordsDialog) {
        handleViewUserRecords(userRecordsDialog);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete');
    }
  };

  const handleCreateRecord = async () => {
    setCreateError('');
    setCreateLoading(true);
    try {
      await adminAPI.createRecord(createForm);
      toast.success('Record created');
      setShowCreateDialog(false);
      setCreateForm({ user_id: '', name: '', record_type: 'A', content: '', ttl: 1, proxied: false });
      fetchAllRecords();
      fetchUsers();
    } catch (err) {
      setCreateError(err.response?.data?.detail || 'Failed to create');
    } finally {
      setCreateLoading(false);
    }
  };

  // === Settings ===
  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    try {
      await adminAPI.updateSettings(settings);
      toast.success(t('admin_settings_saved'));
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSettingsSaving(false);
    }
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="rounded-xl border border-border bg-card p-6" data-testid="admin-stat-users">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">{t('admin_total_users')}</p>
                <p className="text-3xl font-bold">{users.length}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-6" data-testid="admin-stat-records">
            <div className="flex items-center gap-3">
              <Server className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">{t('admin_total_records')}</p>
                <p className="text-3xl font-bold">{allRecords.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="users" data-testid="admin-tab-users">
              <Users className="w-4 h-4 me-2" />{t('admin_users')}
            </TabsTrigger>
            <TabsTrigger value="records" data-testid="admin-tab-records">
              <Server className="w-4 h-4 me-2" />{t('admin_records')}
            </TabsTrigger>
            <TabsTrigger value="settings" data-testid="admin-tab-settings">
              <Settings className="w-4 h-4 me-2" />{t('admin_settings')}
            </TabsTrigger>
          </TabsList>

          {/* USERS TAB */}
          <TabsContent value="users" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">{t('admin_users')}</h2>
              <Button variant="ghost" size="sm" onClick={fetchUsers} data-testid="admin-refresh-users">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
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
                        <TableRow key={u.id} data-testid={`admin-user-row-${u.id}`}>
                          <TableCell className="font-medium">{u.name}</TableCell>
                          <TableCell className="font-mono text-sm">{u.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={planColors[u.plan] || ''}>
                              {u.plan}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                              {u.role || 'user'}
                            </Badge>
                          </TableCell>
                          <TableCell>{u.record_count}/{u.record_limit}</TableCell>
                          <TableCell className="text-end">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleViewUserRecords(u)} data-testid={`admin-view-records-${u.id}`}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              {u.role !== 'admin' && (
                                <>
                                  <Button variant="ghost" size="sm" onClick={() => { setPlanDialogUser(u); setSelectedPlan(u.plan); }} data-testid={`admin-change-plan-${u.id}`}>
                                    <ArrowUpDown className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteUserId(u.id)} data-testid={`admin-delete-user-${u.id}`}>
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

          {/* RECORDS TAB */}
          <TabsContent value="records" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">{t('admin_records')}</h2>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setShowCreateDialog(true)} data-testid="admin-add-record-btn">
                  <Plus className="w-4 h-4 me-2" />{t('admin_add_record')}
                </Button>
                <Button variant="ghost" size="sm" onClick={fetchAllRecords} data-testid="admin-refresh-records">
                  <RefreshCw className="w-4 h-4" />
                </Button>
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
                          <TableCell>
                            <Badge variant="outline" className={typeColors[rec.record_type] || ''}>{rec.record_type}</Badge>
                          </TableCell>
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

          {/* SETTINGS TAB */}
          <TabsContent value="settings" className="space-y-6">
            <h2 className="text-xl font-semibold">{t('admin_settings')}</h2>
            <div className="rounded-xl border border-border bg-card p-6 space-y-6 max-w-xl">
              {settingsLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>{t('admin_telegram_id')}</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">@</span>
                      <Input
                        value={settings.telegram_id}
                        onChange={(e) => setSettings(prev => ({ ...prev, telegram_id: e.target.value }))}
                        placeholder="username"
                        data-testid="admin-telegram-id-input"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('admin_telegram_url')}</Label>
                    <Input
                      value={settings.telegram_url}
                      onChange={(e) => setSettings(prev => ({ ...prev, telegram_url: e.target.value }))}
                      placeholder="https://t.me/username"
                      data-testid="admin-telegram-url-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('admin_contact_en')}</Label>
                    <Input
                      value={settings.contact_message_en}
                      onChange={(e) => setSettings(prev => ({ ...prev, contact_message_en: e.target.value }))}
                      data-testid="admin-contact-en-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('admin_contact_fa')}</Label>
                    <Input
                      value={settings.contact_message_fa}
                      onChange={(e) => setSettings(prev => ({ ...prev, contact_message_fa: e.target.value }))}
                      dir="rtl"
                      data-testid="admin-contact-fa-input"
                    />
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

      {/* Delete User Dialog */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent data-testid="admin-delete-user-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin_delete_user')}</AlertDialogTitle>
            <AlertDialogDescription>{t('admin_delete_user_confirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="admin-delete-user-cancel">{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid="admin-delete-user-confirm-btn">
              {t('delete_confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Plan Dialog */}
      <Dialog open={!!planDialogUser} onOpenChange={() => setPlanDialogUser(null)}>
        <DialogContent className="sm:max-w-sm" data-testid="admin-change-plan-dialog">
          <DialogHeader>
            <DialogTitle>{t('admin_change_plan')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {planDialogUser?.email} - {lang === 'fa' ? 'پلن فعلی:' : 'Current:'} <strong>{planDialogUser?.plan}</strong>
            </p>
            <Select value={selectedPlan} onValueChange={setSelectedPlan}>
              <SelectTrigger data-testid="admin-plan-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free (2 records)</SelectItem>
                <SelectItem value="pro">Pro (50 records)</SelectItem>
                <SelectItem value="enterprise">Enterprise (500 records)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanDialogUser(null)}>{t('cancel')}</Button>
            <Button onClick={handleChangePlan} disabled={planLoading} data-testid="admin-plan-save-btn">
              {planLoading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View User Records Dialog */}
      <Dialog open={!!userRecordsDialog} onOpenChange={() => setUserRecordsDialog(null)}>
        <DialogContent className="sm:max-w-2xl" data-testid="admin-user-records-dialog">
          <DialogHeader>
            <DialogTitle>{t('admin_user_records')} - {userRecordsDialog?.email}</DialogTitle>
          </DialogHeader>
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

      {/* Delete Record Dialog */}
      <AlertDialog open={!!deleteRecordId} onOpenChange={() => setDeleteRecordId(null)}>
        <AlertDialogContent data-testid="admin-delete-record-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('form_delete')}</AlertDialogTitle>
            <AlertDialogDescription>{t('form_delete_confirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRecord} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid="admin-delete-record-confirm-btn">
              {t('delete_confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Record Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md" data-testid="admin-create-record-dialog">
          <DialogHeader>
            <DialogTitle>{t('admin_add_record')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {createError && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">{createError}</div>
            )}
            <div className="space-y-2">
              <Label>{t('admin_select_user')}</Label>
              <Select value={createForm.user_id} onValueChange={(v) => setCreateForm(prev => ({ ...prev, user_id: v }))}>
                <SelectTrigger data-testid="admin-create-user-select">
                  <SelectValue placeholder={t('admin_select_user')} />
                </SelectTrigger>
                <SelectContent>
                  {nonAdminUsers.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('form_subdomain')}</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={createForm.name}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="mysite"
                  data-testid="admin-create-subdomain-input"
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">.{DOMAIN}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('form_type')}</Label>
              <Select value={createForm.record_type} onValueChange={(v) => setCreateForm(prev => ({ ...prev, record_type: v }))}>
                <SelectTrigger data-testid="admin-create-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">A</SelectItem>
                  <SelectItem value="AAAA">AAAA</SelectItem>
                  <SelectItem value="CNAME">CNAME</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('form_content')}</Label>
              <Input
                value={createForm.content}
                onChange={(e) => setCreateForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder="192.168.1.1"
                data-testid="admin-create-content-input"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>{t('form_proxied')}</Label>
              <Switch
                checked={createForm.proxied}
                onCheckedChange={(v) => setCreateForm(prev => ({ ...prev, proxied: v }))}
                data-testid="admin-create-proxied-switch"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>{t('cancel')}</Button>
            <Button onClick={handleCreateRecord} disabled={createLoading || !createForm.user_id || !createForm.name || !createForm.content} data-testid="admin-create-record-btn">
              {createLoading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <Plus className="w-4 h-4 me-2" />}
              {t('form_create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
