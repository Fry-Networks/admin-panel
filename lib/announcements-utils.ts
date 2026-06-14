export const ANNOUNCEMENT_VARIANTS = [
  'info',
  'warning',
  'error',
  'success',
  'critical'
] as const;

export type AnnouncementVariant = (typeof ANNOUNCEMENT_VARIANTS)[number];

export type AnnouncementStatus =
  | 'draft'
  | 'scheduled'
  | 'published'
  | 'archived';

export interface AnnouncementCta {
  label?: string;
  href?: string;
}

export interface AnnouncementInput {
  title: string;
  body: string;
  variant?: AnnouncementVariant;
  priority?: number;
  publishAt?: Date | null;
  expiresAt?: Date | null;
  cta?: AnnouncementCta;
  status?: AnnouncementStatus;
}

export interface AnnouncementUpdatableFields {
  title?: string;
  body?: string;
  variant?: AnnouncementVariant;
  priority?: number;
  publish_at?: Date | null;
  expires_at?: Date | null;
  cta?: AnnouncementCta | null;
  status?: AnnouncementStatus;
}

export function parseDateInput(input?: unknown): Date | null {
  if (!input) {
    return null;
  }

  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return null;
    const parsed = new Date(trimmed);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

export function containsScriptTag(content: string) {
  return /<\s*script/gi.test(content);
}

export function validateCta(cta?: AnnouncementCta | null) {
  if (!cta) return null;
  const cleaned: AnnouncementCta = {};
  if (cta.label) {
    cleaned.label = String(cta.label).trim().slice(0, 120);
  }
  if (cta.href) {
    const href = String(cta.href).trim();
    if (!href) {
      throw new Error('CTA URL cannot be empty when provided');
    }
    if (!/^https:\/\//.test(href)) {
      throw new Error('CTA URL must start with https://');
    }
    try {
      // Validate URL structure
      // eslint-disable-next-line no-new
      new URL(href);
    } catch (_err) {
      throw new Error('CTA URL is not a valid URL');
    }
    cleaned.href = href;
  }

  if (!cleaned.label && !cleaned.href) {
    return null;
  }

  if (cleaned.label && !cleaned.href) {
    throw new Error('CTA label requires a matching https:// URL');
  }

  if (cleaned.href && !cleaned.label) {
    cleaned.label = 'Learn more';
  }

  return cleaned;
}

interface ValidatePayloadOptions {
  requireTitle?: boolean;
  requireBody?: boolean;
  allowStatusChange?: boolean;
  currentStatus?: AnnouncementStatus;
  allowPublishedFieldUpdates?: boolean;
  currentPublishAt?: Date | null;
}

export function validateAnnouncementPayload(
  payload: Partial<AnnouncementInput>,
  options: ValidatePayloadOptions
): AnnouncementUpdatableFields {
  const errors: string[] = [];
  const next: AnnouncementUpdatableFields = {};

  if (options.requireTitle) {
    if (!payload.title || !payload.title.trim()) {
      errors.push('Title is required');
    }
  }
  if (payload.title) {
    const title = payload.title.trim();
    if (title.length < 3 || title.length > 180) {
      errors.push('Title must be between 3 and 180 characters');
    } else {
      next.title = title;
    }
  }

  if (options.requireBody) {
    if (!payload.body || !payload.body.trim()) {
      errors.push('Body is required');
    }
  }
  if (payload.body) {
    const body = payload.body.trim();
    if (body.length < 2 || body.length > 4000) {
      errors.push('Body must be between 2 and 4000 characters');
    }
    if (containsScriptTag(body)) {
      errors.push('Body cannot contain script tags');
    }
    if (!errors.length) {
      next.body = body;
    }
  }

  if (payload.variant) {
    if (!ANNOUNCEMENT_VARIANTS.includes(payload.variant)) {
      errors.push('Variant is invalid');
    } else {
      next.variant = payload.variant;
    }
  }

  if (payload.priority !== undefined) {
    const priority = Number(payload.priority);
    if (Number.isNaN(priority)) {
      errors.push('Priority must be a number');
    } else if (priority < 0 || priority > 1000) {
      errors.push('Priority must be between 0 and 1000');
    } else {
      next.priority = priority;
    }
  }

  const payloadRecord = payload as Record<string, unknown>;
  const hasPublishAt = Object.prototype.hasOwnProperty.call(
    payloadRecord,
    'publishAt'
  );
  const hasExpiresAt = Object.prototype.hasOwnProperty.call(
    payloadRecord,
    'expiresAt'
  );

  const publishAt = parseDateInput(payload.publishAt);
  const expiresAt = parseDateInput(payload.expiresAt);
  const referencePublishAt =
    publishAt ?? options.currentPublishAt ?? null;

  if (
    hasPublishAt &&
    payload.publishAt &&
    publishAt === null &&
    payload.publishAt !== null
  ) {
    errors.push('Publish date is invalid');
  }

  if (
    hasExpiresAt &&
    payload.expiresAt &&
    expiresAt === null &&
    payload.expiresAt !== null
  ) {
    errors.push('Expiry date is invalid');
  }

  if (expiresAt && referencePublishAt && expiresAt < referencePublishAt) {
    errors.push('Expiry must be after publish time');
  }

  if (hasPublishAt) {
    next.publish_at = publishAt;
  }

  if (hasExpiresAt) {
    next.expires_at = expiresAt;
  }

  try {
    const validatedCta = validateCta(payload.cta ?? null);
    if (validatedCta) {
      next.cta = validatedCta;
    } else if (payload.cta === null) {
      next.cta = null;
    }
  } catch (err) {
    errors.push((err as Error).message);
  }

  if (payload.status) {
    if (!options.allowStatusChange) {
      errors.push('Status updates are not permitted');
    } else if (
      !['draft', 'scheduled', 'published', 'archived'].includes(payload.status)
    ) {
      errors.push('Status is invalid');
    } else {
      next.status = payload.status;
    }
  }

  if (errors.length) {
    const error = new Error(errors.join('; '));
    (error as Error & { statusCode?: number }).statusCode = 400;
    throw error;
  }

  return next;
}
