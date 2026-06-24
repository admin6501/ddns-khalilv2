import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { dnsAPI, referralAPI, activityAPI, authAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
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
  Plus, Trash2, Pencil, Loader2, Globe, Server, Shield, AlertTriangle,
  RefreshCw, Gift, Copy, Check as CheckIcon, Users, Clock, ChevronLeft, ChevronRight,
  ArrowUpRight, Save, X, KeyRound, ClipboardCheck, Search, Terminal, Activity, Zap, Database, CreditCard,
  Download, Upload, FileText,
} from 'lucide-react';
import { DOMAIN } from '../config/site';
import { useConfig } from '../contexts/ConfigContext';
import { downloadBlob, fileTimestamp } from '../lib/utils';

const FREE_RECORD_LIMIT = 2;

export default function Dashboard() {
  const { t, lang } = useLanguage();
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const config = useConfig();
  const DNS_DOMAIN = config.dns_domain || DOMAIN;
  const enabledRecordTypes = config.loaded ? (config.enabled_record_types || []) : ['A', 'AAAA', 'CNAME', 'NS'];
  const recordCreationDisabled = config.loaded && enabledRecordTypes.length === 0;

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const [availableZones, setAvailableZones] = useState([]);
  const [copiedRecordId, setCopiedRecordId] = useState(null);

  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', newPass: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState({ type: '', text: '' });

  const [searchQuery, setSearchQuery] = useState('');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importCsvText, setImportCsvText] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const [formData, setFormData] = useState({
    name: '', record_type: 'A', content: '', ttl: 1, proxied: false, zone_id: '',
  });

  const [referralStats, setReferralStats] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const [activityLogs, setActivityLogs] = useState([]);
  const [activityPage, setActivityPage] = useState(1);
  const [activityPages, setActivityPages] = useState(1);
  const [activityLoading, setActivityLoading] = useState(false);

  const handleChangePassword = async () => {
    setPwMsg({ type: '', text: '' });
    if (pwForm.newPass.length < 6) { setPwMsg({ type: 'error', text: t('password_too_short') }); return; }
    if (pwForm.newPass !== pwForm.confirm) { setPwMsg({ type: 'error', text: t('password_mismatch') }); return; }
    setPwLoading(true);
    try {
      await authAPI.changePassword(pwForm.current, pwForm.newPass);
      setPwMsg({ type: 'success', text: t('password_changed') });
      setPwForm({ current: '', newPass: '', confirm: '' });
      setTimeout(() => setShowPasswordDialog(false), 1500);
    } catch (err) {
      setPwMsg({ type: 'error', text: err.response?.data?.detail || t('password_wrong_current') });
    } finally { setPwLoading(false); }
  };

  const fetchRecords = useCallback(async () => {
    try {
      const res = await dnsAPI.listRecords();
      setRecords(res.data.records || []);
    } catch (err) { console.error('Failed to fetch records:', err); }
    finally { setLoading(false); }
  }, []);

  const fetchZones = useCallback(async () => {
    try {
      const res = await dnsAPI.listZones();
      const zones = res.data.zones || [];
      setAvailableZones(zones);
      if (zones.length > 0) setFormData(prev => ({ ...prev, zone_id: zones[0].id }));
    } catch { /* ignore */ }
  }, []);

  const fetchReferralStats = useCallback(async () => {
    try { const res = await referralAPI.getStats(); setReferralStats(res.data); } catch { /* ignore */ }
  }, []);

  const fetchActivityLogs = useCallback(async (page = 1) => {
    setActivityLoading(true);
    try {
      const res = await activityAPI.getLogs(page, 10);
      setActivityLogs(res.data.logs || []);
      setActivityPages(res.data.pages || 1);
      setActivityPage(res.data.page || 1);
    } catch { /* ignore */ }
    setActivityLoading(false);
  }, []);

  useEffect(() => {
    fetchRecords();
    fetchZones();
    fetchReferralStats();
    fetchActivityLogs();
  }, [fetchRecords, fetchZones, fetchReferralStats, fetchActivityLogs]);

  const referralLink = `${window.location.origin}/register?ref=${user?.referral_code || ''}`;

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  const resetForm = () => {
    const defaultZoneId = availableZones.length > 0 ? availableZones[0].id : '';
    setFormData({ name: '', record_type: enabledRecordTypes[0] || 'A', content: '', ttl: 1, proxied: false, zone_id: defaultZoneId });
    setFormError('');
  };

  const copyRecordName = async (record) => {
    try {
      await navigator.clipboard.writeText(record.full_name);
      setCopiedRecordId(record.id);
      setTimeout(() => setCopiedRecordId(null), 2000);
    } catch { /* ignore */ }
  };

  const handleCreate = async () => {
    setFormError(''); setFormLoading(true);
    try {
      await dnsAPI.createRecord(formData);
      setShowCreateDialog(false); resetForm();
      await fetchRecords(); await refreshUser();
    } catch (err) { setFormError(err.response?.data?.detail || 'Failed to create record'); }
    finally { setFormLoading(false); }
  };

  const triggerBlobDownload = (blob, filename) => downloadBlob(blob, filename);

  const handleExportCSV = async () => {
    try {
      const res = await dnsAPI.exportCSV();
      triggerBlobDownload(res.data, `dns-records-${fileTimestamp()}.csv`);
    } catch (err) { alert(err.response?.data?.detail || 'Export failed'); }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await dnsAPI.downloadTemplate();
      triggerBlobDownload(res.data, 'dns-records-template.csv');
    } catch (err) { alert(err.response?.data?.detail || 'Failed'); }
  };

  const handleImportFileChange = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImportCsvText(String(ev.target?.result || ''));
    reader.readAsText(file);
  };

  const handleImportSubmit = async () => {
    if (!importCsvText.trim()) return;
    setImportLoading(true); setImportResult(null);
    try {
      const res = await dnsAPI.importCSV(importCsvText);
      setImportResult(res.data);
      await fetchRecords(); await refreshUser();
    } catch (err) {
      setImportResult({ success: [], failed: [{ line: 0, name: '-', error: err.response?.data?.detail || 'Import failed' }], total: 0 });
    } finally { setImportLoading(false); }
  };

  const handleEdit = async () => {
    if (!selectedRecord) return;
    setFormError(''); setFormLoading(true);
    try {
      await dnsAPI.updateRecord(selectedRecord.id, {
        content: formData.content, ttl: formData.ttl, proxied: formData.proxied,
      });
      setShowEditDialog(false); resetForm(); setSelectedRecord(null);
      await fetchRecords();
    } catch (err) { setFormError(err.response?.data?.detail || 'Failed to update record'); }
    finally { setFormLoading(false); }
  };

  const handleDelete = async () => {
    if (!selectedRecord) return;
    setFormLoading(true);
    try {
      await dnsAPI.deleteRecord(selectedRecord.id);
      setShowDeleteDialog(false); setSelectedRecord(null);
      await fetchRecords(); await refreshUser();
    } catch (err) { setFormError(err.response?.data?.detail || 'Failed to delete record'); }
    finally { setFormLoading(false); }
  };

  const openEdit = (record) => {
    setSelectedRecord(record);
    setFormData({
      name: record.name, record_type: record.record_type,
      content: record.content, ttl: record.ttl, proxied: record.proxied,
    });
    setFormError(''); setShowEditDialog(true);
  };

  const openDelete = (record) => { setSelectedRecord(record); setShowDeleteDialog(true); };

  const getContentPlaceholder = (type) => {
    switch (type) {
      case 'A': return t('form_content_a');
      case 'AAAA': return t('form_content_aaaa');
      case 'CNAME': return t('form_content_cname');
      case 'NS': return 'ns1.example.com';
      default: return '';
    }
  };

  const recordCount = records.length;
  const recordLimit = user?.record_limit !== undefined && user?.record_limit !== null ? user.record_limit : FREE_RECORD_LIMIT;
  const isUnlimited = recordLimit === 0;
  const usagePercent = isUnlimited ? 0 : Math.min(100, (recordCount / recordLimit) * 100);
  const canCreate = (isUnlimited || recordCount < recordLimit) && !recordCreationDisabled;
  const canImport = isUnlimited || recordCount < recordLimit;

  const typeColors = {
    A: 'text-primary border-primary/40',
    AAAA: 'text-cyan-500 border-cyan-500/40',
    CNAME: 'text-emerald-500 border-emerald-500/40',
    NS: 'text-violet-400 border-violet-500/40',
  };

  const q = searchQuery.toLowerCase();
  const filtered = q ? records.filter(r =>
    r.name?.toLowerCase().includes(q) || r.full_name?.toLowerCase().includes(q) ||
    r.content?.toLowerCase().includes(q) || r.record_type?.toLowerCase().includes(q)
  ) : records;

  return (
    <div className="min-h-screen bg-background page-mount" data-testid="dashboard-page">
      {/* ─── Header bar ─── */}
      <div className="border-b border-border bg-card/40 relative">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <span className="editorial-mark">{lang === 'fa' ? 'داشبورد شما' : 'YOUR DASHBOARD'}</span>
              <div className="flex items-center gap-3 mt-2">
                <h1 className="text-3xl md:text-4xl font-display font-semibold tracking-tighter" data-testid="dashboard-title">
                  {t('dash_title')}
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-1 border border-emerald-500/30 text-emerald-500 font-mono text-[10px] uppercase tracking-widest">
                  <span className="status-dot" /> {lang === 'fa' ? 'فعال' : 'LIVE'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {lang === 'fa' ? 'خوش اومدی، ' : 'Welcome back, '}
                <span className="text-foreground font-medium">{user?.name || user?.email}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setShowPasswordDialog(true); setPwMsg({ type: '', text: '' }); setPwForm({ current: '', newPass: '', confirm: '' }); }}
                className="h-10 px-3 border border-border bg-card hover:border-primary hover:text-primary font-mono uppercase tracking-widest text-[11px] flex items-center gap-2 transition-colors"
                data-testid="change-password-btn"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('change_password')}</span>
              </button>
              <button
                onClick={handleExportCSV}
                disabled={records.length === 0}
                className="h-10 px-3 border border-border bg-card hover:border-primary hover:text-primary font-mono uppercase tracking-widest text-[11px] flex items-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                data-testid="export-csv-btn"
                title={t('export_csv')}
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('export_csv')}</span>
              </button>
              <button
                onClick={() => { setImportCsvText(''); setImportResult(null); setShowImportDialog(true); }}
                disabled={!canImport}
                className="h-10 px-3 border border-border bg-card hover:border-primary hover:text-primary font-mono uppercase tracking-widest text-[11px] flex items-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                data-testid="import-csv-btn"
                title={t('import_csv')}
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('import_csv')}</span>
              </button>
              <button
                onClick={() => { resetForm(); setShowCreateDialog(true); }}
                disabled={!canCreate}
                className="h-10 px-4 bg-primary text-primary-foreground hover:bg-primary/90 font-mono uppercase tracking-widest text-[11px] font-semibold flex items-center gap-2 transition-all amber-glow disabled:opacity-40 disabled:cursor-not-allowed"
                data-testid="add-record-button"
              >
                <Plus className="w-3.5 h-3.5" />
                {t('dash_add_record')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* ─── Stats grid (control-room style, gapless) ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border mb-6" data-testid="stats-grid">
          <StatCell
            label="RECORDS"
            icon={Server}
            value={recordCount}
            suffix={isUnlimited ? '/∞' : `/${recordLimit}`}
            progress={usagePercent}
            testid="stat-records"
          />
          <StatCell
            label="PLAN"
            icon={Shield}
            value={(user?.plan || 'free').toUpperCase()}
            note={lang === 'fa' ? 'پلن فعال' : 'Active tier'}
            testid="stat-plan"
          />
          <StatCell
            label="ZONE"
            icon={Globe}
            value={DNS_DOMAIN}
            mono
            note={lang === 'fa' ? 'دامنه اصلی' : 'Primary zone'}
            testid="stat-domain"
          />
          <StatCell
            label="INVITES"
            icon={Gift}
            value={referralStats?.referral_count || user?.referral_count || 0}
            note={`+${referralStats?.referral_bonus || user?.referral_bonus || 0} ${lang === 'fa' ? 'جایزه' : 'bonus'}`}
            testid="stat-referrals"
          />
        </div>

        {/* ─── Limit warning ─── */}
        {!canCreate && !recordCreationDisabled && (
          <div className="mb-6 border border-primary/40 bg-primary/5 p-4 flex items-center gap-3 animate-fade-in" data-testid="limit-warning">
            <AlertTriangle className="w-4 h-4 text-primary shrink-0" />
            <div className="font-mono text-xs flex-1">
              <span className="uppercase tracking-widest text-primary">⚠ LIMIT REACHED</span>
              <span className="ms-2 text-muted-foreground">
                {lang === 'fa'
                  ? `شما به حد مجاز ${recordLimit} رکورد رسیده‌اید. پلن را ارتقا دهید.`
                  : `You've hit the ${recordLimit} record cap. Upgrade to add more.`}
              </span>
            </div>
            <button
              onClick={() => navigate('/#pricing')}
              className="h-8 px-3 border border-primary text-primary hover:bg-primary hover:text-primary-foreground font-mono uppercase tracking-widest text-[10px] flex items-center gap-1.5 transition-colors"
              data-testid="upgrade-button"
            >
              <ArrowUpRight className="w-3 h-3" />{t('dash_upgrade')}
            </button>
          </div>
        )}

        {/* ─── All record types disabled warning ─── */}
        {recordCreationDisabled && (
          <div className="mb-6 border border-destructive/40 bg-destructive/5 p-4 flex items-center gap-3 animate-fade-in" data-testid="record-types-disabled-warning">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
            <div className="font-mono text-xs flex-1">
              <span className="uppercase tracking-widest text-destructive">{lang === 'fa' ? '⚠ ایجاد رکورد غیرفعال است' : '⚠ RECORD CREATION DISABLED'}</span>
              <span className="ms-2 text-muted-foreground">
                {lang === 'fa'
                  ? 'در حال حاضر هیچ نوع رکوردی فعال نیست. لطفاً بعداً دوباره تلاش کنید.'
                  : 'No record types are currently enabled. Please try again later.'}
              </span>
            </div>
          </div>
        )}

        {/* ─── Records Panel ─── */}
        <section className="border border-border bg-card mb-6 min-w-0 overflow-hidden" data-testid="records-table-wrapper">
          {/* Section header */}
          <div className="border-b border-border px-4 py-3 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" />
              <h2 className="font-mono text-xs uppercase tracking-widest">DNS RECORDS</h2>
              <span className="px-1.5 py-0.5 font-mono text-[10px] border border-border text-muted-foreground">
                {filtered.length}
              </span>
            </div>
            <div className="relative flex-1 min-w-[200px] max-w-md ms-auto">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder={t('search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 ps-9 pe-3 bg-background border border-border font-mono text-xs focus:border-primary focus:outline-none transition-colors"
              />
            </div>
            <button
              onClick={fetchRecords}
              className="w-9 h-9 border border-border bg-card hover:border-primary hover:text-primary flex items-center justify-center transition-colors"
              data-testid="refresh-records-button"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Body */}
          {loading ? (
            <div className="flex items-center justify-center p-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : records.length === 0 ? (
            <div className="text-center p-16 space-y-4" data-testid="no-records">
              <div className="w-14 h-14 mx-auto border border-dashed border-border flex items-center justify-center">
                <Server className="w-6 h-6 text-muted-foreground opacity-60" />
              </div>
              <div>
                <h3 className="text-base font-semibold mb-1">{t('dash_no_records')}</h3>
                <p className="text-xs text-muted-foreground font-mono">{t('dash_no_records_desc')}</p>
              </div>
              <button
                onClick={() => { resetForm(); setShowCreateDialog(true); }}
                disabled={!canCreate}
                className="h-10 px-4 bg-primary text-primary-foreground hover:bg-primary/90 font-mono uppercase tracking-widest text-[11px] font-semibold inline-flex items-center gap-2 transition-all amber-glow disabled:opacity-40 disabled:cursor-not-allowed"
                data-testid="create-first-record-button"
              >
                <Plus className="w-3.5 h-3.5" />{t('dash_add_record')}
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center p-12 font-mono text-sm text-muted-foreground">
              ⇢ {t('search_no_results')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    <th className="text-start p-3 mono-label">{t('table_type')}</th>
                    <th className="text-start p-3 mono-label">{t('table_name')}</th>
                    <th className="text-start p-3 mono-label">{t('table_content')}</th>
                    <th className="text-start p-3 mono-label">{t('table_ttl')}</th>
                    <th className="text-start p-3 mono-label">{t('table_proxied')}</th>
                    <th className="text-end p-3 mono-label">{t('table_actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((record) => (
                    <tr
                      key={record.id}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                      data-testid={`record-row-${record.id}`}
                    >
                      <td className="p-3">
                        <span className={`px-1.5 py-0.5 border text-[10px] font-mono ${typeColors[record.record_type] || 'text-muted-foreground border-border'}`}>
                          {record.record_type}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-sm">{record.full_name}</td>
                      <td className="p-3 font-mono text-xs text-muted-foreground max-w-[280px] truncate">{record.content}</td>
                      <td className="p-3 font-mono text-xs">
                        {record.ttl === 1 ? <span className="text-muted-foreground">auto</span> : record.ttl}
                      </td>
                      <td className="p-3">
                        {record.proxied ? (
                          <span className="px-1.5 py-0.5 border border-primary/40 text-primary font-mono text-[10px] uppercase tracking-wider">proxied</span>
                        ) : (
                          <span className="text-xs text-muted-foreground font-mono">—</span>
                        )}
                      </td>
                      <td className="p-3 text-end">
                        <div className="inline-flex items-center gap-0">
                          <button
                            onClick={() => copyRecordName(record)}
                            className="w-8 h-8 hover:bg-muted flex items-center justify-center transition-colors"
                            title={lang === 'fa' ? 'کپی' : 'Copy'}
                            data-testid={`copy-record-${record.id}`}
                          >
                            {copiedRecordId === record.id ? <ClipboardCheck className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => openEdit(record)}
                            className="w-8 h-8 hover:bg-muted hover:text-primary flex items-center justify-center transition-colors"
                            title={lang === 'fa' ? 'ویرایش' : 'Edit'}
                            data-testid={`edit-record-${record.id}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openDelete(record)}
                            className="w-8 h-8 hover:bg-destructive/10 text-destructive flex items-center justify-center transition-colors"
                            title={lang === 'fa' ? 'حذف' : 'Delete'}
                            data-testid={`delete-record-${record.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ─── Two-column: Referral + Activity Log ─── */}
        <div className="grid lg:grid-cols-2 gap-6 min-w-0">
          {/* Referral */}
          <section className="border border-border bg-card min-w-0 overflow-hidden" data-testid="referral-card">
            <div className="border-b border-border px-4 py-3 flex items-center gap-2">
              <Gift className="w-4 h-4 text-primary" />
              <h2 className="font-mono text-xs uppercase tracking-widest">{t('referral_title')}</h2>
            </div>
            <div className="p-4 sm:p-5 space-y-4">
              <p className="text-xs text-muted-foreground">{t('referral_subtitle')}</p>

              {/* stats */}
              <div className="grid grid-cols-3 gap-px bg-border border border-border">
                <div className="bg-card p-2 sm:p-3 text-center" data-testid="referral-count-stat">
                  <div className="mono-label text-[9px] sm:text-[10px]">INVITES</div>
                  <div className="font-mono text-xl sm:text-2xl font-semibold text-primary mt-1">
                    {referralStats?.referral_count || user?.referral_count || 0}
                  </div>
                </div>
                <div className="bg-card p-2 sm:p-3 text-center" data-testid="referral-bonus-stat">
                  <div className="mono-label text-[9px] sm:text-[10px]">BONUS</div>
                  <div className="font-mono text-xl sm:text-2xl font-semibold text-emerald-500 mt-1">
                    +{referralStats?.referral_bonus || user?.referral_bonus || 0}
                  </div>
                </div>
                <div className="bg-card p-2 sm:p-3 text-center">
                  <div className="mono-label text-[9px] sm:text-[10px]">RATE</div>
                  <div className="font-mono text-xl sm:text-2xl font-semibold mt-1">
                    {referralStats?.bonus_per_invite || 1}×
                  </div>
                </div>
              </div>

              {/* link */}
              <div className="min-w-0">
                <Label className="mono-label mb-2 block">{t('referral_link')}</Label>
                <div className="flex items-stretch min-w-0">
                  <input
                    value={referralLink} readOnly
                    className="flex-1 min-w-0 h-10 px-3 border border-border bg-background font-mono text-xs text-muted-foreground focus:outline-none"
                    data-testid="referral-link-input"
                    dir="ltr"
                  />
                  <button
                    onClick={copyReferralLink}
                    className="shrink-0 px-3 border border-s-0 border-border bg-card hover:bg-primary hover:text-primary-foreground transition-colors"
                    data-testid="copy-referral-btn"
                  >
                    {linkCopied ? <CheckIcon className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* invited list */}
              {referralStats?.referred_users?.length > 0 && (
                <div className="pt-3 border-t border-dashed border-border">
                  <div className="flex items-center gap-2 mono-label mb-2">
                    <Users className="w-3 h-3" />{t('referral_invited_list')}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {referralStats.referred_users.map((u, i) => (
                      <span key={i} className="px-2 py-1 border border-border font-mono text-[10px]">
                        {u.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Activity Log */}
          <section className="border border-border bg-card min-w-0 overflow-hidden">
            <div className="border-b border-border px-4 py-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <h2 className="font-mono text-xs uppercase tracking-widest">
                {lang === 'fa' ? 'لاگ فعالیت' : 'Activity Log'}
              </h2>
              <span className="ms-auto">
                <button
                  onClick={() => fetchActivityLogs(1)}
                  className="w-8 h-8 hover:text-primary flex items-center justify-center transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${activityLoading ? 'animate-spin' : ''}`} />
                </button>
              </span>
            </div>
            {activityLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : activityLogs.length === 0 ? (
              <div className="text-center p-12 text-xs text-muted-foreground font-mono">
                ⇢ {lang === 'fa' ? 'هنوز فعالیتی ثبت نشده.' : 'No activity logged yet.'}
              </div>
            ) : (
              <>
                <ul className="divide-y divide-border">
                  {activityLogs.map((log) => {
                    const colorMap = {
                      record_created: 'text-emerald-500 border-emerald-500/40',
                      record_deleted: 'text-destructive border-destructive/40',
                      record_updated: 'text-blue-500 border-blue-500/40',
                      login: 'text-primary border-primary/40',
                      register: 'text-primary border-primary/40',
                      telegram_linked: 'text-cyan-500 border-cyan-500/40',
                    };
                    const iconMap = {
                      record_created: Plus,
                      record_deleted: Trash2,
                      record_updated: Pencil,
                      login: Activity,
                      register: Zap,
                    };
                    const Icon = iconMap[log.action] || Clock;
                    const titles = {
                      record_created: lang === 'fa' ? 'رکورد ساخته شد' : 'Record Created',
                      record_deleted: lang === 'fa' ? 'رکورد حذف شد' : 'Record Deleted',
                      record_updated: lang === 'fa' ? 'رکورد ویرایش شد' : 'Record Updated',
                      login: lang === 'fa' ? 'ورود به سیستم' : 'Login',
                      register: lang === 'fa' ? 'ثبت‌نام' : 'Register',
                      telegram_linked: lang === 'fa' ? 'اتصال تلگرام' : 'Telegram Linked',
                    };
                    return (
                      <li key={log.id} className="flex items-start gap-2.5 px-4 py-2.5 hover:bg-muted/30 transition-colors min-w-0">
                        <span className={`w-7 h-7 border flex items-center justify-center shrink-0 mt-0.5 ${colorMap[log.action] || 'text-muted-foreground border-border'}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </span>
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <p className="text-xs font-medium truncate">{titles[log.action] || log.action}</p>
                          {log.details && <p className="text-[11px] text-muted-foreground font-mono truncate mt-0.5">{log.details}</p>}
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap mt-1 shrink-0">
                          {new Date(log.created_at).toLocaleDateString(lang === 'fa' ? 'fa-IR' : 'en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {activityPages > 1 && (
                  <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-border bg-muted/20">
                    <button
                      disabled={activityPage <= 1}
                      onClick={() => fetchActivityLogs(activityPage - 1)}
                      className="h-7 px-2 border border-border font-mono text-[10px] uppercase tracking-widest disabled:opacity-40 hover:border-primary hover:text-primary transition-colors flex items-center gap-1"
                    >
                      <ChevronLeft className="w-3 h-3 rtl-flip" />{lang === 'fa' ? 'قبلی' : 'Prev'}
                    </button>
                    <span className="font-mono text-[10px] text-muted-foreground px-2">
                      {activityPage} / {activityPages}
                    </span>
                    <button
                      disabled={activityPage >= activityPages}
                      onClick={() => fetchActivityLogs(activityPage + 1)}
                      className="h-7 px-2 border border-border font-mono text-[10px] uppercase tracking-widest disabled:opacity-40 hover:border-primary hover:text-primary transition-colors flex items-center gap-1"
                    >
                      {lang === 'fa' ? 'بعدی' : 'Next'}<ChevronRight className="w-3 h-3 rtl-flip" />
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>

      {/* ═══ IMPORT CSV DIALOG ═══ */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="sm:max-w-2xl rounded-sm border-border" data-testid="import-csv-dialog">
          <DialogHeader>
            <div className="mono-label text-primary mb-1">⇧ BULK IMPORT</div>
            <DialogTitle className="text-xl font-semibold tracking-tight">{t('import_csv_title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleDownloadTemplate}
                className="h-8 px-3 border border-border bg-card hover:border-primary hover:text-primary font-mono uppercase tracking-widest text-[10px] flex items-center gap-1.5 transition-colors"
                data-testid="download-template-btn"
              >
                <FileText className="w-3 h-3" /> {t('download_template')}
              </button>
              <label className="h-8 px-3 border border-border bg-card hover:border-primary hover:text-primary font-mono uppercase tracking-widest text-[10px] flex items-center gap-1.5 transition-colors cursor-pointer">
                <Upload className="w-3 h-3" /> {t('choose_csv_file')}
                <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleImportFileChange} data-testid="import-file-input" />
              </label>
              <span className="text-[11px] font-mono text-muted-foreground ms-auto">
                {t('import_hint_cols')}
              </span>
            </div>
            <textarea
              value={importCsvText}
              onChange={(e) => setImportCsvText(e.target.value)}
              rows={10}
              placeholder="name,record_type,content,ttl,proxied,zone_domain&#10;www,A,1.2.3.4,1,false,example.com"
              className="w-full border border-border bg-background rounded-sm p-3 font-mono text-xs focus:border-primary focus:outline-none resize-none"
              data-testid="import-csv-textarea"
            />
            {importResult && (
              <div className="border border-border rounded-sm p-3 space-y-2 max-h-52 overflow-y-auto" data-testid="import-result">
                <div className="font-mono text-xs flex gap-4">
                  <span className="text-green-600">✓ {t('import_success_count')}: {importResult.success?.length || 0}</span>
                  <span className="text-destructive">✗ {t('import_failed_count')}: {importResult.failed?.length || 0}</span>
                  <span className="text-muted-foreground">{t('import_total')}: {importResult.total || 0}</span>
                </div>
                {importResult.failed?.length > 0 && (
                  <div className="space-y-1">
                    {importResult.failed.map((f, i) => (
                      <div key={i} className="text-[11px] font-mono text-destructive/90">
                        line {f.line}: {f.name} — {f.error}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <button
              onClick={() => setShowImportDialog(false)}
              className="h-10 px-4 border border-border bg-card hover:border-muted-foreground font-mono uppercase tracking-widest text-[11px] transition-colors"
              data-testid="import-cancel-btn"
            >
              {t('btn_close')}
            </button>
            <button
              onClick={handleImportSubmit}
              disabled={importLoading || !importCsvText.trim()}
              className="h-10 px-4 bg-primary text-primary-foreground hover:bg-primary/90 font-mono uppercase tracking-widest text-[11px] font-semibold inline-flex items-center gap-2 amber-glow disabled:opacity-40 disabled:cursor-not-allowed"
              data-testid="import-submit-btn"
            >
              {importLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {t('import_csv')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ CREATE DIALOG ═══ */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md rounded-sm border-border" data-testid="create-record-dialog">
          <DialogHeader>
            <div className="mono-label text-primary mb-1">+ NEW RECORD</div>
            <DialogTitle className="text-xl font-semibold tracking-tight">
              {t('form_create_title')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {formError && (
              <div className="p-3 bg-destructive/10 text-destructive text-xs border border-destructive/20 font-mono" data-testid="form-error">
                ! {formError}
              </div>
            )}
            {availableZones.length > 1 && (
              <div className="space-y-2">
                <Label className="mono-label">{lang === 'fa' ? 'دامنه' : 'Zone'}</Label>
                <Select value={formData.zone_id} onValueChange={(v) => setFormData(prev => ({ ...prev, zone_id: v }))}>
                  <SelectTrigger className="h-10 rounded-sm font-mono text-sm" data-testid="form-zone-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableZones.map(z => (
                      <SelectItem key={z.id} value={z.id} className="font-mono text-sm">
                        {z.domain}{z.is_primary ? (lang === 'fa' ? ' (اصلی)' : ' · primary') : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label className="mono-label">{t('form_subdomain')}</Label>
              <div className="flex items-stretch">
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={t('form_subdomain_placeholder')}
                  className="h-10 rounded-sm rounded-e-none font-mono text-sm"
                  data-testid="form-subdomain-input"
                />
                <span className="px-3 border border-s-0 border-border bg-muted/40 font-mono text-xs text-muted-foreground flex items-center whitespace-nowrap">
                  .{(availableZones.find(z => z.id === formData.zone_id) || {}).domain || DNS_DOMAIN}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="mono-label">{t('form_type')}</Label>
                <Select value={formData.record_type} onValueChange={(v) => setFormData(prev => ({ ...prev, record_type: v }))}>
                  <SelectTrigger className="h-10 rounded-sm font-mono" data-testid="form-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {enabledRecordTypes.map(tp => (
                      <SelectItem key={tp} value={tp} className="font-mono">{tp}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end justify-between px-3 border border-border rounded-sm h-10">
                <Label className="mono-label">{t('form_proxied')}</Label>
                <Switch
                  checked={formData.proxied}
                  onCheckedChange={(v) => setFormData(prev => ({ ...prev, proxied: v }))}
                  data-testid="form-proxied-switch"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="mono-label">{t('form_content')}</Label>
              <Input
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder={getContentPlaceholder(formData.record_type)}
                className="h-10 rounded-sm font-mono text-sm"
                data-testid="form-content-input"
                dir="ltr"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <button
              onClick={() => setShowCreateDialog(false)}
              className="h-10 px-4 border border-border hover:border-primary hover:text-primary font-mono uppercase tracking-widest text-[11px] flex items-center gap-1.5 transition-colors"
              data-testid="form-cancel-button"
            >
              <X className="w-3.5 h-3.5" />{t('form_cancel')}
            </button>
            <button
              onClick={handleCreate}
              disabled={formLoading || !formData.name || !formData.content}
              className="h-10 px-4 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed font-mono uppercase tracking-widest text-[11px] font-semibold flex items-center gap-1.5 transition-all amber-glow"
              data-testid="form-create-button"
            >
              {formLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              {t('form_create')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ EDIT DIALOG ═══ */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md rounded-sm" data-testid="edit-record-dialog">
          <DialogHeader>
            <div className="mono-label text-primary mb-1">~ EDIT RECORD</div>
            <DialogTitle className="text-xl font-semibold tracking-tight">
              {t('form_edit_title')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {formError && (
              <div className="p-3 bg-destructive/10 text-destructive text-xs border border-destructive/20 font-mono">! {formError}</div>
            )}
            <div className="space-y-2">
              <Label className="mono-label">{t('table_name')}</Label>
              <Input value={selectedRecord?.full_name || ''} disabled className="h-10 rounded-sm font-mono text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="mono-label">{t('form_type')}</Label>
                <Input value={selectedRecord?.record_type || ''} disabled className="h-10 rounded-sm font-mono" />
              </div>
              <div className="flex items-end justify-between px-3 border border-border rounded-sm h-10">
                <Label className="mono-label">{t('form_proxied')}</Label>
                <Switch
                  checked={formData.proxied}
                  onCheckedChange={(v) => setFormData(prev => ({ ...prev, proxied: v }))}
                  data-testid="edit-proxied-switch"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="mono-label">{t('form_content')}</Label>
              <Input
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder={getContentPlaceholder(selectedRecord?.record_type || 'A')}
                className="h-10 rounded-sm font-mono text-sm"
                data-testid="edit-content-input"
                dir="ltr"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <button onClick={() => setShowEditDialog(false)}
              className="h-10 px-4 border border-border hover:border-primary hover:text-primary font-mono uppercase tracking-widest text-[11px] flex items-center gap-1.5 transition-colors"
              data-testid="edit-cancel-button">
              <X className="w-3.5 h-3.5" />{t('form_cancel')}
            </button>
            <button onClick={handleEdit} disabled={formLoading}
              className="h-10 px-4 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 font-mono uppercase tracking-widest text-[11px] font-semibold flex items-center gap-1.5 transition-all amber-glow"
              data-testid="edit-save-button">
              {formLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {t('form_update')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ DELETE CONFIRMATION ═══ */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-sm" data-testid="delete-record-dialog">
          <AlertDialogHeader>
            <div className="mono-label text-destructive mb-1">! DESTRUCTIVE · ACTION</div>
            <AlertDialogTitle className="text-xl font-semibold tracking-tight">{t('form_delete')}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-sm text-muted-foreground">
                {t('form_delete_confirm')}
                {selectedRecord && (
                  <div className="mt-3 p-3 bg-muted/40 border border-border font-mono text-xs">
                    <span className="text-muted-foreground">{selectedRecord.record_type}</span>{' '}
                    <span className="text-foreground">{selectedRecord.full_name}</span>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="h-10 px-4 rounded-sm border border-border hover:border-primary hover:text-primary font-mono uppercase tracking-widest text-[11px]"
              data-testid="delete-cancel-button">
              <X className="w-3.5 h-3.5 me-1.5" />{t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="h-10 px-4 rounded-sm bg-destructive text-destructive-foreground hover:bg-destructive/90 font-mono uppercase tracking-widest text-[11px] font-semibold"
              data-testid="delete-confirm-button"
            >
              {formLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin me-1.5" /> : <Trash2 className="w-3.5 h-3.5 me-1.5" />}
              {t('delete_confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ═══ CHANGE PASSWORD ═══ */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="rounded-sm">
          <DialogHeader>
            <div className="mono-label text-primary mb-1">~ SECURITY · UPDATE</div>
            <DialogTitle className="text-xl font-semibold tracking-tight flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" />{t('change_password')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {pwMsg.text && (
              <div className={`p-3 text-xs font-mono border ${pwMsg.type === 'error' ? 'bg-destructive/10 text-destructive border-destructive/30' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'}`}>
                {pwMsg.type === 'error' ? '! ' : '✓ '}{pwMsg.text}
              </div>
            )}
            <div className="space-y-2">
              <Label className="mono-label">{t('current_password')}</Label>
              <Input type="password" value={pwForm.current} onChange={(e) => setPwForm(p => ({ ...p, current: e.target.value }))} className="h-10 rounded-sm font-mono" dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label className="mono-label">{t('new_password')}</Label>
              <Input type="password" value={pwForm.newPass} onChange={(e) => setPwForm(p => ({ ...p, newPass: e.target.value }))} className="h-10 rounded-sm font-mono" dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label className="mono-label">{t('confirm_new_password')}</Label>
              <Input type="password" value={pwForm.confirm} onChange={(e) => setPwForm(p => ({ ...p, confirm: e.target.value }))} className="h-10 rounded-sm font-mono" dir="ltr" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <button onClick={() => setShowPasswordDialog(false)}
              className="h-10 px-4 border border-border hover:border-primary hover:text-primary font-mono uppercase tracking-widest text-[11px] flex items-center gap-1.5 transition-colors">
              <X className="w-3.5 h-3.5" />{t('cancel')}
            </button>
            <button onClick={handleChangePassword} disabled={pwLoading}
              className="h-10 px-4 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 font-mono uppercase tracking-widest text-[11px] font-semibold flex items-center gap-1.5 transition-all amber-glow">
              {pwLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
              {t('change_password')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Stat cell subcomponent ─── */
function StatCell({ label, icon: Icon, value, suffix, note, progress, mono, testid }) {
  return (
    <div className="bg-card p-5 relative group hover:bg-muted/30 transition-colors" data-testid={testid}>
      <div className="flex items-center justify-between mb-3">
        <span className="mono-label">{label}</span>
        <Icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
      <div className={`text-2xl md:text-3xl font-semibold tracking-tight truncate ${mono ? 'font-mono text-lg md:text-xl' : ''}`}>
        {value}
        {suffix && <span className="text-sm text-muted-foreground font-normal ms-1">{suffix}</span>}
      </div>
      {note && <div className="mt-1 text-[11px] text-muted-foreground font-mono">{note}</div>}
      {progress !== undefined && (
        <div className="mt-3 h-0.5 bg-border overflow-hidden">
          <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}
