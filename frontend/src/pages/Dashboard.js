import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { dnsAPI, referralAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
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
  Plus, Trash2, Pencil, Loader2, Globe, Server, Shield,
  AlertTriangle, RefreshCw, Gift, Copy, Check as CheckIcon, Users
} from 'lucide-react';

const DOMAIN = "khalilv2.com";

export default function Dashboard() {
  const { t, lang } = useLanguage();
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    record_type: 'A',
    content: '',
    ttl: 1,
    proxied: false,
  });

  // Referral state
  const [referralStats, setReferralStats] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const fetchRecords = useCallback(async () => {
    try {
      const res = await dnsAPI.listRecords();
      setRecords(res.data.records || []);
    } catch (err) {
      console.error('Failed to fetch records:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchReferralStats = useCallback(async () => {
    try {
      const res = await referralAPI.getStats();
      setReferralStats(res.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchRecords();
    fetchReferralStats();
  }, [fetchRecords, fetchReferralStats]);

  const referralLink = `${window.location.origin}/register?ref=${user?.referral_code || ''}`;

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  const resetForm = () => {
    setFormData({ name: '', record_type: 'A', content: '', ttl: 1, proxied: false });
    setFormError('');
  };

  const handleCreate = async () => {
    setFormError('');
    setFormLoading(true);
    try {
      await dnsAPI.createRecord(formData);
      setShowCreateDialog(false);
      resetForm();
      await fetchRecords();
      await refreshUser();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to create record');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedRecord) return;
    setFormError('');
    setFormLoading(true);
    try {
      await dnsAPI.updateRecord(selectedRecord.id, {
        content: formData.content,
        ttl: formData.ttl,
        proxied: formData.proxied,
      });
      setShowEditDialog(false);
      resetForm();
      setSelectedRecord(null);
      await fetchRecords();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to update record');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRecord) return;
    setFormLoading(true);
    try {
      await dnsAPI.deleteRecord(selectedRecord.id);
      setShowDeleteDialog(false);
      setSelectedRecord(null);
      await fetchRecords();
      await refreshUser();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to delete record');
    } finally {
      setFormLoading(false);
    }
  };

  const openEdit = (record) => {
    setSelectedRecord(record);
    setFormData({
      name: record.name,
      record_type: record.record_type,
      content: record.content,
      ttl: record.ttl,
      proxied: record.proxied,
    });
    setFormError('');
    setShowEditDialog(true);
  };

  const openDelete = (record) => {
    setSelectedRecord(record);
    setShowDeleteDialog(true);
  };

  const getContentPlaceholder = (type) => {
    switch (type) {
      case 'A': return t('form_content_a');
      case 'AAAA': return t('form_content_aaaa');
      case 'CNAME': return t('form_content_cname');
      default: return '';
    }
  };

  const recordCount = records.length;
  const recordLimit = user?.record_limit || FREE_RECORD_LIMIT;
  const usagePercent = (recordCount / recordLimit) * 100;
  const canCreate = recordCount < recordLimit;

  const typeColors = {
    A: 'bg-primary/10 text-primary border-primary/20',
    AAAA: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
    CNAME: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  };

  return (
    <div className="min-h-screen" data-testid="dashboard-page">
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className={`text-3xl md:text-4xl font-bold tracking-tight ${lang === 'en' ? 'font-en-heading' : 'font-fa'}`} data-testid="dashboard-title">
              {t('dash_title')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {lang === 'fa' ? `سلام ${user?.name || ''}` : `Hello, ${user?.name || ''}`}
            </p>
          </div>
          <Button
            onClick={() => { resetForm(); setShowCreateDialog(true); }}
            disabled={!canCreate}
            className="brand-glow"
            data-testid="add-record-button"
          >
            <Plus className="w-4 h-4 me-2" />
            {t('dash_add_record')}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:shadow-md" data-testid="stat-records">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Server className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('dash_records')}</p>
                <p className="text-2xl font-bold">{recordCount} <span className="text-sm font-normal text-muted-foreground">{t('dash_of')} {recordLimit}</span></p>
              </div>
            </div>
            <Progress value={usagePercent} className="h-2" />
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:shadow-md" data-testid="stat-plan">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('dash_plan')}</p>
                <p className="text-2xl font-bold capitalize">{user?.plan || 'free'}</p>
              </div>
            </div>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:shadow-md" data-testid="stat-domain">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Globe className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{lang === 'fa' ? 'دامنه' : 'Domain'}</p>
                <p className="text-lg font-bold font-mono">{DOMAIN}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Limit Warning */}
        {!canCreate && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5 mb-6" data-testid="limit-warning">
            <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" />
            <p className="text-sm">
              {lang === 'fa'
                ? `شما به حد مجاز ${recordLimit} رکورد رسیده‌اید. برای اضافه کردن رکوردهای بیشتر، پلن خود را ارتقا دهید.`
                : `You've reached the limit of ${recordLimit} records. Upgrade your plan for more.`}
            </p>
            <Button variant="outline" size="sm" onClick={() => navigate('/#pricing')} className="shrink-0 ms-auto" data-testid="upgrade-button">
              {t('dash_upgrade')}
            </Button>
          </div>
        )}

        {/* Records Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden" data-testid="records-table-wrapper">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold">{t('dash_records')}</h2>
            <Button variant="ghost" size="sm" onClick={fetchRecords} data-testid="refresh-records-button">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : records.length === 0 ? (
            <div className="text-center p-12 space-y-3" data-testid="no-records">
              <Server className="w-12 h-12 text-muted-foreground mx-auto opacity-40" />
              <h3 className="text-lg font-medium">{t('dash_no_records')}</h3>
              <p className="text-sm text-muted-foreground">{t('dash_no_records_desc')}</p>
              <Button onClick={() => { resetForm(); setShowCreateDialog(true); }} data-testid="create-first-record-button">
                <Plus className="w-4 h-4 me-2" />
                {t('dash_add_record')}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('table_type')}</TableHead>
                    <TableHead>{t('table_name')}</TableHead>
                    <TableHead>{t('table_content')}</TableHead>
                    <TableHead>{t('table_ttl')}</TableHead>
                    <TableHead>{t('table_proxied')}</TableHead>
                    <TableHead className="text-end">{t('table_actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id} className="group" data-testid={`record-row-${record.id}`}>
                      <TableCell>
                        <Badge variant="outline" className={typeColors[record.record_type] || ''}>
                          {record.record_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{record.full_name}</TableCell>
                      <TableCell className="font-mono text-sm max-w-[200px] truncate">{record.content}</TableCell>
                      <TableCell>{record.ttl === 1 ? t('table_auto') : record.ttl}</TableCell>
                      <TableCell>
                        <Badge variant={record.proxied ? 'default' : 'secondary'} className="text-xs">
                          {record.proxied ? t('table_yes') : t('table_no')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-end">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(record)} data-testid={`edit-record-${record.id}`}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => openDelete(record)} data-testid={`delete-record-${record.id}`}>
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
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md" data-testid="create-record-dialog">
          <DialogHeader>
            <DialogTitle className={lang === 'en' ? 'font-en-heading' : 'font-fa'}>
              {t('form_create_title')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {formError && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20" data-testid="form-error">
                {formError}
              </div>
            )}
            <div className="space-y-2">
              <Label>{t('form_subdomain')}</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={t('form_subdomain_placeholder')}
                  data-testid="form-subdomain-input"
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">.{DOMAIN}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('form_type')}</Label>
              <Select value={formData.record_type} onValueChange={(v) => setFormData(prev => ({ ...prev, record_type: v }))}>
                <SelectTrigger data-testid="form-type-select">
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
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder={getContentPlaceholder(formData.record_type)}
                data-testid="form-content-input"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>{t('form_proxied')}</Label>
              <Switch
                checked={formData.proxied}
                onCheckedChange={(v) => setFormData(prev => ({ ...prev, proxied: v }))}
                data-testid="form-proxied-switch"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} data-testid="form-cancel-button">
              {t('form_cancel')}
            </Button>
            <Button onClick={handleCreate} disabled={formLoading || !formData.name || !formData.content} data-testid="form-create-button">
              {formLoading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
              {t('form_create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md" data-testid="edit-record-dialog">
          <DialogHeader>
            <DialogTitle className={lang === 'en' ? 'font-en-heading' : 'font-fa'}>
              {t('form_edit_title')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {formError && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
                {formError}
              </div>
            )}
            <div className="space-y-2">
              <Label>{t('table_name')}</Label>
              <Input value={selectedRecord?.full_name || ''} disabled className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label>{t('form_type')}</Label>
              <Input value={selectedRecord?.record_type || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>{t('form_content')}</Label>
              <Input
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder={getContentPlaceholder(selectedRecord?.record_type || 'A')}
                data-testid="edit-content-input"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>{t('form_proxied')}</Label>
              <Switch
                checked={formData.proxied}
                onCheckedChange={(v) => setFormData(prev => ({ ...prev, proxied: v }))}
                data-testid="edit-proxied-switch"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} data-testid="edit-cancel-button">
              {t('form_cancel')}
            </Button>
            <Button onClick={handleEdit} disabled={formLoading} data-testid="edit-save-button">
              {formLoading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
              {t('form_update')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent data-testid="delete-record-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('form_delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('form_delete_confirm')}
              {selectedRecord && (
                <span className="block mt-2 font-mono text-sm font-semibold">
                  {selectedRecord.full_name} ({selectedRecord.record_type})
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="delete-cancel-button">{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="delete-confirm-button"
            >
              {formLoading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
              {t('delete_confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const FREE_RECORD_LIMIT = 2;
