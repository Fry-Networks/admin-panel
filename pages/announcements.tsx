import {
  Badge,
  Button,
  Callout,
  Card,
  Divider,
  Flex,
  Select,
  SelectItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
  TextInput,
  Textarea,
  Title,
  Dialog,
  DialogPanel,
  NumberInput
} from '@tremor/react';
import { useMemo, useState } from 'react';
import { getSession } from 'next-auth/react';
import clientPromise from '../lib/mongoclient';
import {
  ANNOUNCEMENT_VARIANTS,
  AnnouncementVariant
} from '../lib/announcements-utils';
import { RiAlertLine, RiCheckLine } from '@remixicon/react';

type AnnouncementStatus =
  | 'draft'
  | 'scheduled'
  | 'published'
  | 'archived';

interface AnnouncementRecord {
  _id: string;
  title: string;
  body: string;
  variant: AnnouncementVariant;
  priority: number;
  status: AnnouncementStatus;
  publish_at: string | null;
  expires_at: string | null;
  cta?: {
    label?: string;
    href?: string;
  } | null;
  audience?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

interface AnnouncementPageProps {
  initialAnnouncements: AnnouncementRecord[];
  error?: string;
}

const STATUS_OPTIONS: Array<{ value: 'all' | AnnouncementStatus; label: string }> =
  [
    { value: 'all', label: 'All statuses' },
    { value: 'draft', label: 'Drafts' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'published', label: 'Published' },
    { value: 'archived', label: 'Archived' }
  ];

const VARIANT_LABEL: Record<AnnouncementVariant, string> = {
  info: 'Info',
  warning: 'Warning',
  error: 'Error',
  success: 'Success',
  critical: 'Critical'
};

const STATUS_COLOR: Record<AnnouncementStatus, string> = {
  draft: 'gray',
  scheduled: 'amber',
  published: 'emerald',
  archived: 'slate'
};

const HIGH_PRIORITY_THRESHOLD = 80;

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

function toDatetimeLocalInput(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function datetimeLocalToIso(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

interface AnnouncementFormState {
  title: string;
  body: string;
  variant: AnnouncementVariant;
  priority: number;
  schedule: boolean;
  publishAt: string;
  expiresEnabled: boolean;
  expiresAt: string;
  ctaLabel: string;
  ctaHref: string;
}

const defaultFormState: AnnouncementFormState = {
  title: '',
  body: '',
  variant: 'info',
  priority: 0,
  schedule: false,
  publishAt: '',
  expiresEnabled: false,
  expiresAt: '',
  ctaLabel: '',
  ctaHref: ''
};

type FormMode = 'create' | 'edit';

function buildAnnouncementFormState(initial?: AnnouncementRecord | null) {
  if (!initial) {
    return { ...defaultFormState };
  }

  return {
    title: initial.title ?? '',
    body: initial.body ?? '',
    variant: initial.variant ?? 'info',
    priority: initial.priority ?? 0,
    schedule: Boolean(initial.publish_at),
    publishAt: toDatetimeLocalInput(initial.publish_at),
    expiresEnabled: Boolean(initial.expires_at),
    expiresAt: toDatetimeLocalInput(initial.expires_at),
    ctaLabel: initial.cta?.label ?? '',
    ctaHref: initial.cta?.href ?? ''
  };
}

export default function AnnouncementsPage({
  initialAnnouncements,
  error: initialError
}: AnnouncementPageProps) {
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>(
    initialAnnouncements ?? []
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | AnnouncementStatus
  >('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [formValues, setFormValues] = useState<AnnouncementFormState>(
    defaultFormState
  );
  const [formTarget, setFormTarget] = useState<AnnouncementRecord | null>(
    null
  );

  const [publishOpen, setPublishOpen] = useState(false);
  const [publishTarget, setPublishTarget] =
    useState<AnnouncementRecord | null>(null);
  const [publishAtInput, setPublishAtInput] = useState('');
  const [publishExpiryInput, setPublishExpiryInput] = useState('');
  const [publishConfirm, setPublishConfirm] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);

  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveTarget, setArchiveTarget] =
    useState<AnnouncementRecord | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(false);

  const requiresPublishConfirmation =
    publishTarget &&
    (publishTarget.priority >= HIGH_PRIORITY_THRESHOLD ||
      publishTarget.variant === 'error' ||
      publishTarget.variant === 'critical');

  const filteredAnnouncements = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return announcements.filter((announcement) => {
      if (
        statusFilter !== 'all' &&
        announcement.status !== statusFilter
      ) {
        return false;
      }
      if (!normalizedSearch) return true;
      return (
        announcement.title.toLowerCase().includes(normalizedSearch) ||
        announcement.body.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [announcements, searchTerm, statusFilter]);

  const sortedAnnouncements = useMemo(() => {
    return [...filteredAnnouncements].sort((a, b) => {
      if (a.status !== b.status) {
        // Put non-archived entries first
        if (a.status === 'archived') return 1;
        if (b.status === 'archived') return -1;
      }
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      const publishA = a.publish_at ? new Date(a.publish_at).getTime() : 0;
      const publishB = b.publish_at ? new Date(b.publish_at).getTime() : 0;
      if (publishB !== publishA) {
        return publishB - publishA;
      }
      const updatedA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const updatedB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return updatedB - updatedA;
    });
  }, [filteredAnnouncements]);

  const resetFeedback = () => {
    setError(null);
    setSuccess(null);
  };

  const refreshAnnouncements = async (notify = true) => {
    setIsRefreshing(true);
    resetFeedback();
    try {
      const params = new URLSearchParams({
        page: '1',
        pageSize: '100',
        includeArchived: 'true'
      });
      const response = await fetch(`/api/announcements?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to load announcements (${response.status})`);
      }
      const data = await response.json();
      setAnnouncements(data.items ?? []);
      if (notify) {
        setSuccess('Announcements refreshed.');
      }
    } catch (err) {
      console.error(err);
      setError((err as Error).message ?? 'Unexpected error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const openCreateForm = () => {
    resetFeedback();
    setFormMode('create');
    setFormValues(defaultFormState);
    setFormTarget(null);
    setFormOpen(true);
  };

  const openEditForm = (record: AnnouncementRecord) => {
    resetFeedback();
    setFormMode('edit');
    setFormTarget(record);
    const initialState = buildAnnouncementFormState(record);
    if (record.status === 'published') {
      initialState.schedule = false;
      initialState.publishAt = '';
    }
    setFormValues(initialState);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setFormTarget(null);
    setFormValues(defaultFormState);
  };

  const handleFormSubmit = async () => {
    if (formMode === 'edit' && !formTarget) {
      setError('No announcement selected for editing.');
      return;
    }
    const errors: string[] = [];
    const trimmedTitle = formValues.title.trim();
    const trimmedBody = formValues.body.trim();
    if (trimmedTitle.length < 3) {
      errors.push('Title must be at least 3 characters.');
    }
    if (trimmedBody.length < 2 || trimmedBody.length > 4000) {
      errors.push('Body must be between 2 and 4000 characters.');
    }
    if (/<\s*script/i.test(trimmedBody)) {
      errors.push('Body cannot contain script tags.');
    }
    if (!ANNOUNCEMENT_VARIANTS.includes(formValues.variant)) {
      errors.push('Variant is invalid.');
    }
    if (Number.isNaN(formValues.priority)) {
      errors.push('Priority must be a valid number.');
    }
    if (formValues.priority < 0 || formValues.priority > 1000) {
      errors.push('Priority must be between 0 and 1000.');
    }
    if (formValues.schedule && !formValues.publishAt) {
      errors.push('Select a scheduled publish date.');
    }
    if (formValues.schedule && formValues.publishAt) {
      const scheduleDate = datetimeLocalToIso(formValues.publishAt);
      if (!scheduleDate) {
        errors.push('Scheduled publish date is invalid.');
      } else if (new Date(scheduleDate) < new Date()) {
        errors.push('Scheduled publish date must be in the future.');
      }
    }
    if (formValues.expiresEnabled && !formValues.expiresAt) {
      errors.push('Select an expiry date or disable expiry.');
    }
    if (formValues.expiresEnabled && formValues.expiresAt) {
      const expiresIso = datetimeLocalToIso(formValues.expiresAt);
      if (!expiresIso) {
        errors.push('Expiry date is invalid.');
      } else if (formValues.schedule && formValues.publishAt) {
        const publishIso = datetimeLocalToIso(formValues.publishAt);
        if (
          publishIso &&
          new Date(expiresIso) <= new Date(publishIso)
        ) {
          errors.push('Expiry must be after the publish schedule.');
        }
      }
    }
    const hasLabel = Boolean(formValues.ctaLabel.trim());
    const hasHref = Boolean(formValues.ctaHref.trim());
    if (hasLabel !== hasHref) {
      errors.push('CTA label requires a matching https:// URL and vice versa.');
    }
    if (hasHref && !formValues.ctaHref.trim().startsWith('https://')) {
      errors.push('CTA URL must start with https://');
    }

    if (errors.length) {
      setError(errors.join(' '));
      return;
    }

    const payload: Record<string, unknown> = {
      title: trimmedTitle,
      body: trimmedBody,
      variant: formValues.variant,
      priority: Number(formValues.priority)
    };

    if (formValues.schedule && formValues.publishAt) {
      const publishIso = datetimeLocalToIso(formValues.publishAt);
      if (publishIso) payload.publishAt = publishIso;
    } else if (formMode === 'edit' && !formValues.schedule) {
      payload.publishAt = null;
    }

    if (formValues.expiresEnabled && formValues.expiresAt) {
      const expiresIso = datetimeLocalToIso(formValues.expiresAt);
      if (expiresIso) payload.expiresAt = expiresIso;
    } else if (formMode === 'edit' && !formValues.expiresEnabled) {
      payload.expiresAt = null;
    }

    if (hasLabel && hasHref) {
      payload.cta = {
        label: formValues.ctaLabel.trim(),
        href: formValues.ctaHref.trim()
      };
    } else if (formMode === 'edit') {
      payload.cta = null;
    }

    try {
      resetFeedback();
      const endpoint =
        formMode === 'create'
          ? '/api/announcements'
          : `/api/announcements/${formTarget?._id}`;
      const method = formMode === 'create' ? 'POST' : 'PUT';
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const message =
          data?.message || `Request failed (${response.status})`;
        throw new Error(message);
      }

      const data = await response.json();
      closeForm();
      if (formMode === 'create' && data?.announcement) {
        const normalized = JSON.parse(JSON.stringify(data.announcement));
        setAnnouncements((prev) => [normalized, ...prev]);
        setSuccess('Announcement draft created.');
      } else {
        await refreshAnnouncements(false);
        setSuccess('Announcement updated.');
      }
    } catch (err) {
      console.error(err);
      setError((err as Error).message ?? 'Request failed');
    }
  };

  const openPublishDialog = (record: AnnouncementRecord) => {
    resetFeedback();
    setPublishTarget(record);
    setPublishAtInput(
      record.publish_at
        ? toDatetimeLocalInput(record.publish_at)
        : ''
    );
    setPublishExpiryInput(
      record.expires_at
        ? toDatetimeLocalInput(record.expires_at)
        : ''
    );
    setPublishConfirm(false);
    setPublishOpen(true);
  };

  const closePublishDialog = () => {
    setPublishOpen(false);
    setPublishTarget(null);
    setPublishAtInput('');
    setPublishExpiryInput('');
    setPublishConfirm(false);
    setPublishLoading(false);
  };

  const submitPublish = async () => {
    if (!publishTarget) return;
    if (requiresPublishConfirmation && !publishConfirm) {
      setError(
        'Confirm high-priority publish before proceeding.'
      );
      return;
    }
    setPublishLoading(true);
    resetFeedback();
    try {
      const body: Record<string, unknown> = {
        confirmHighPriority: requiresPublishConfirmation
          ? publishConfirm
          : false
      };
      if (publishAtInput) {
        const publishIso = datetimeLocalToIso(publishAtInput);
        if (!publishIso) {
          throw new Error('Publish date is invalid.');
        }
        body.publishAt = publishIso;
      }
      if (publishExpiryInput || publishExpiryInput === '') {
        body.expiresAt = publishExpiryInput
          ? datetimeLocalToIso(publishExpiryInput)
          : null;
      }
      const response = await fetch(
        `/api/announcements/${publishTarget._id}/publish`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        }
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message =
          payload?.message || `Publish failed (${response.status})`;
        throw new Error(message);
      }
      await refreshAnnouncements(false);
      setSuccess(
        publishAtInput
          ? 'Announcement scheduled.'
          : 'Announcement published.'
      );
      closePublishDialog();
    } catch (err) {
      console.error(err);
      setError((err as Error).message ?? 'Publish failed');
      setPublishLoading(false);
    }
  };

  const openArchiveDialog = (record: AnnouncementRecord) => {
    resetFeedback();
    setArchiveTarget(record);
    setArchiveOpen(true);
  };

  const closeArchiveDialog = () => {
    setArchiveOpen(false);
    setArchiveTarget(null);
    setArchiveLoading(false);
  };

  const submitArchive = async () => {
    if (!archiveTarget) return;
    setArchiveLoading(true);
    resetFeedback();
    try {
      const response = await fetch(
        `/api/announcements/${archiveTarget._id}/archive`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ forceRemove: true })
        }
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message =
          payload?.message || `Archive failed (${response.status})`;
        throw new Error(message);
      }
      await refreshAnnouncements(false);
      setSuccess('Announcement archived.');
      closeArchiveDialog();
    } catch (err) {
      console.error(err);
      setError((err as Error).message ?? 'Archive failed');
      setArchiveLoading(false);
    }
  };

  const renderStatusBadge = (status: AnnouncementStatus) => {
    const color = STATUS_COLOR[status] ?? 'gray';
    return (
      <Badge color={color}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const allowScheduling =
    formMode === 'create' ||
    (formTarget?.status === 'draft' || formTarget?.status === 'scheduled');

  return (
    <main className="p-4 md:p-10 mx-auto max-w-8xl">
      <Flex justifyContent="between" alignItems="center" className="mb-4">
        <Title>Announcements</Title>
        <Flex justifyContent="end" alignItems="center" className="space-x-2">
          <Button
            variant="secondary"
            loading={isRefreshing}
            onClick={() => refreshAnnouncements()}
          >
            Refresh
          </Button>
          <Button onClick={openCreateForm}>Create announcement</Button>
        </Flex>
      </Flex>

      {(error || success) && (
        <Callout
          className="mb-4"
          title={error ? 'Something went wrong' : 'Success'}
          color={error ? 'rose' : 'emerald'}
          icon={error ? RiAlertLine : RiCheckLine}
        >
          {error ?? success}
        </Callout>
      )}

      <Card className="mb-6">
        <Flex className="gap-4" alignItems="end" justifyContent="start">
          <div className="w-full md:w-1/3">
            <Text className="mb-2">Search</Text>
            <TextInput
              className="bg-gray-800 border-gray-600 text-white"
              placeholder="Search title or body..."
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
          </div>
          <div className="w-full md:w-1/3">
            <Text className="mb-2">Status</Text>
            <Select
              className="bg-gray-800 border-gray-600 text-white"
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as AnnouncementStatus | 'all')
              }
            >
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </Select>
          </div>
        </Flex>
      </Card>

      <Card>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Title</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Variant</TableHeaderCell>
              <TableHeaderCell>Priority</TableHeaderCell>
              <TableHeaderCell>Publish</TableHeaderCell>
              <TableHeaderCell>Expires</TableHeaderCell>
              <TableHeaderCell>Updated</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedAnnouncements.length === 0 && (
              <TableRow>
                <TableCell colSpan={8}>
                  <Text className="text-center text-gray-400 py-6">
                    No announcements match the current filters.
                  </Text>
                </TableCell>
              </TableRow>
            )}
            {sortedAnnouncements.map((announcement) => (
              <TableRow key={announcement._id}>
                <TableCell>
                  <div className="flex flex-col">
                    <Text className="font-semibold">
                      {announcement.title}
                    </Text>
                    <Text className="text-sm text-gray-400 line-clamp-2">
                      {announcement.body}
                    </Text>
                  </div>
                </TableCell>
                <TableCell>{renderStatusBadge(announcement.status)}</TableCell>
                <TableCell>
                  <Badge
                    color={
                      announcement.variant === 'critical'
                        ? 'rose'
                        : announcement.variant === 'warning'
                        ? 'amber'
                        : announcement.variant === 'success'
                        ? 'emerald'
                        : 'blue'
                    }
                  >
                    {VARIANT_LABEL[announcement.variant]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Text className="font-semibold">
                    {announcement.priority}
                  </Text>
                </TableCell>
                <TableCell>{formatDateTime(announcement.publish_at)}</TableCell>
                <TableCell>{formatDateTime(announcement.expires_at)}</TableCell>
                <TableCell>{formatDateTime(announcement.updated_at)}</TableCell>
                <TableCell>
                  <Flex className="gap-2" justifyContent="start">
                    <Button
                      size="xs"
                      variant="secondary"
                      onClick={() => openEditForm(announcement)}
                    >
                      Edit
                    </Button>
                    {announcement.status !== 'archived' && (
                      <Button
                        size="xs"
                        variant="secondary"
                        onClick={() => openPublishDialog(announcement)}
                      >
                        {announcement.status === 'published'
                          ? 'Update publish'
                          : 'Publish / schedule'}
                      </Button>
                    )}
                    {announcement.status !== 'archived' && (
                      <Button
                        size="xs"
                        color="rose"
                        onClick={() => openArchiveDialog(announcement)}
                      >
                        Archive
                      </Button>
                    )}
                  </Flex>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={formOpen} onClose={closeForm} static={true}>
        <DialogPanel className="sm:max-w-3xl bg-gray-900 border border-gray-700">
          <Flex justifyContent="between" alignItems="center" className="mb-4">
            <Title>
              {formMode === 'create'
                ? 'Create announcement'
                : 'Edit announcement'}
            </Title>
            <Button variant="light" onClick={closeForm}>
              Close
            </Button>
          </Flex>
          {formMode === 'edit' && formTarget?.status === 'published' && (
            <Callout
              className="mb-4"
              title="Live announcement"
              color="amber"
              icon={RiAlertLine}
            >
              Only body, CTA, and expiry can be updated after publishing.
            </Callout>
          )}
          <Divider />
          <div className="space-y-4">
            <div>
              <Text className="mb-1">Title</Text>
              <TextInput
                className="bg-gray-800 border-gray-600 text-white"
                value={formValues.title}
                onValueChange={(value) =>
                  setFormValues((prev) => ({ ...prev, title: value }))
                }
                placeholder="System upgrade notice"
                disabled={
                  formMode === 'edit' && formTarget?.status === 'published'
                }
              />
            </div>
            <div>
              <Text className="mb-1">Body</Text>
              <Textarea
                className="bg-gray-800 border-gray-600 text-white"
                value={formValues.body}
                onValueChange={(value) =>
                  setFormValues((prev) => ({ ...prev, body: value }))
                }
                rows={8}
                placeholder="Provide full detail about the update..."
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Text className="mb-1">Variant</Text>
                <Select
                  className="bg-gray-800 border-gray-600 text-white"
                  value={formValues.variant}
                  onValueChange={(value) =>
                    setFormValues((prev) => ({
                      ...prev,
                      variant: value as AnnouncementVariant
                    }))
                  }
                  disabled={
                    formMode === 'edit' &&
                    formTarget?.status === 'published'
                  }
                >
                  {ANNOUNCEMENT_VARIANTS.map((variant) => (
                    <SelectItem key={variant} value={variant}>
                      {VARIANT_LABEL[variant]}
                    </SelectItem>
                  ))}
                </Select>
              </div>
              <div>
                <Text className="mb-1">Priority ({formValues.priority})</Text>
                <Flex className="items-center gap-3">
                  <NumberInput
                    value={formValues.priority}
                    onValueChange={(v) =>
                      setFormValues((prev) => ({
                        ...prev,
                        priority: v || 0
                      }))
                    }
                    min={0}
                    max={100}
                    className="w-24"
                    disabled={
                      formMode === 'edit' && formTarget?.status === 'published'
                    }
                  />
                  <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 transition-all"
                      style={{ width: `${formValues.priority}%` }}
                    />
                  </div>
                </Flex>
              </div>
              <div>
                <Text className="mb-1">CTA label</Text>
                <TextInput
                  className="bg-gray-800 border-gray-600 text-white"
                  value={formValues.ctaLabel}
                  onValueChange={(value) =>
                    setFormValues((prev) => ({
                      ...prev,
                      ctaLabel: value
                    }))
                  }
                  placeholder="Learn more"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Text className="mb-1">CTA link (https://)</Text>
                <TextInput
                  className="bg-gray-800 border-gray-600 text-white"
                  value={formValues.ctaHref}
                  onValueChange={(value) =>
                    setFormValues((prev) => ({
                      ...prev,
                      ctaHref: value
                    }))
                  }
                  placeholder="https://status.frynetworks.com"
                />
              </div>
              {allowScheduling && (
                <div className="flex items-center space-x-3">
                  <input
                    id="schedule"
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-red-500 focus:ring-red-500"
                    checked={formValues.schedule}
                    onChange={(event) =>
                      setFormValues((prev) => ({
                        ...prev,
                        schedule: event.target.checked
                      }))
                    }
                  />
                  <label htmlFor="schedule" className="text-sm text-gray-300">
                    Schedule publish for later
                  </label>
                </div>
              )}
            </div>
            {allowScheduling && formValues.schedule && (
              <div>
                <Text className="mb-1">Publish at</Text>
                <input
                  type="datetime-local"
                  value={formValues.publishAt}
                  onChange={(event) =>
                    setFormValues((prev) => ({
                      ...prev,
                      publishAt: event.target.value
                    }))
                  }
                  className="w-full rounded-tremor-default border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white"
                />
              </div>
            )}
            <div className="flex items-center space-x-3">
              <input
                id="expires"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-red-500 focus:ring-red-500"
                checked={formValues.expiresEnabled}
                onChange={(event) =>
                  setFormValues((prev) => ({
                    ...prev,
                    expiresEnabled: event.target.checked
                  }))
                }
              />
              <label htmlFor="expires" className="text-sm text-gray-300">
                Set expiry
              </label>
            </div>
            {formValues.expiresEnabled && (
              <div>
                <Text className="mb-1">Expires at</Text>
                <input
                  type="datetime-local"
                  value={formValues.expiresAt}
                  onChange={(event) =>
                    setFormValues((prev) => ({
                      ...prev,
                      expiresAt: event.target.value
                    }))
                  }
                  className="w-full rounded-tremor-default border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white"
                />
              </div>
            )}
            <Divider />
            <Flex justifyContent="end" className="space-x-2">
              <Button variant="light" onClick={closeForm}>
                Cancel
              </Button>
              <Button onClick={handleFormSubmit}>
                {formMode === 'create' ? 'Create draft' : 'Save changes'}
              </Button>
            </Flex>
          </div>
        </DialogPanel>
      </Dialog>

      <Dialog open={publishOpen} onClose={closePublishDialog} static={true}>
        <DialogPanel className="sm:max-w-lg bg-gray-900 border border-gray-700">
          <Title className="mb-2">
            {publishTarget?.status === 'published'
              ? 'Update publish window'
              : 'Publish announcement'}
          </Title>
          <Text className="text-sm text-gray-300 mb-4">
            Publishing will push updates to the dashboard within a few
            minutes. Use scheduling to delay the go-live time.
          </Text>
          <div className="space-y-4">
            <div>
              <Text className="mb-1">Publish at (leave blank for now)</Text>
              <input
                type="datetime-local"
                value={publishAtInput}
                onChange={(event) => setPublishAtInput(event.target.value)}
                className="w-full rounded-tremor-default border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <Text className="mb-1">Expires at (optional)</Text>
              <input
                type="datetime-local"
                value={publishExpiryInput}
                onChange={(event) =>
                  setPublishExpiryInput(event.target.value)
                }
                className="w-full rounded-tremor-default border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white"
              />
            </div>
            {requiresPublishConfirmation && (
              <div className="flex items-center space-x-3 border border-amber-200 bg-amber-50 rounded-md px-3 py-2">
                <input
                  id="confirm-publish"
                  type="checkbox"
                  className="h-4 w-4 rounded border-amber-400 bg-amber-100 text-amber-600 focus:ring-amber-500"
                  checked={publishConfirm}
                  onChange={(event) => setPublishConfirm(event.target.checked)}
                />
                <label
                  htmlFor="confirm-publish"
                  className="text-sm text-amber-800"
                >
                  Confirm publishing a critical or high-priority notice.
                </label>
              </div>
            )}
          </div>
          <Divider className="my-4" />
          <Flex justifyContent="end" className="space-x-2">
            <Button variant="light" onClick={closePublishDialog}>
              Cancel
            </Button>
            <Button loading={publishLoading} onClick={submitPublish}>
              {publishAtInput ? 'Schedule' : 'Publish now'}
            </Button>
          </Flex>
        </DialogPanel>
      </Dialog>

      <Dialog open={archiveOpen} onClose={closeArchiveDialog} static={true}>
        <DialogPanel className="sm:max-w-md bg-gray-900 border border-gray-700">
          <Title className="mb-2">Archive announcement</Title>
          <Text className="text-sm text-gray-300 mb-4">
            Archiving immediately removes the banner from view. Continue?
          </Text>
          <Divider className="my-4" />
          <Flex justifyContent="end" className="space-x-2">
            <Button variant="light" onClick={closeArchiveDialog}>
              Cancel
            </Button>
            <Button
              color="rose"
              loading={archiveLoading}
              onClick={submitArchive}
            >
              Archive now
            </Button>
          </Flex>
        </DialogPanel>
      </Dialog>
    </main>
  );
}

export async function getServerSideProps(context: any) {
  const session = await getSession(context);

  if (!session || !session.user?.admin) {
    return {
      props: {
        error: 'Unauthorized access',
        initialAnnouncements: []
      }
    };
  }

  try {
    const client = await clientPromise;
    const db = client.db('main');

    const announcements =
      (await db
        .collection('announcements')
        .find({})
        .sort({ updated_at: -1 })
        .limit(100)
        .toArray()) ?? [];

    return {
      props: {
        initialAnnouncements: JSON.parse(JSON.stringify(announcements))
      }
    };
  } catch (error) {
    console.error('Announcements fetch error:', error);
    return {
      props: {
        initialAnnouncements: [],
        error: 'Failed to load announcements'
      }
    };
  }
}
