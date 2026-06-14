import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, Title, Text, Button, TextInput, NumberInput, Select, SelectItem, Badge } from '@tremor/react';

type EventStatus = 'draft' | 'active' | 'ended' | 'cancelled';
type MetricType = 'manual' | 'aem_count' | 'device_count';
type Prize = { type?: string; amount?: number; description?: string; paidTxId?: string };
type Metric = { type: MetricType; config?: Record<string, any> };
type Winner = { wallet: string; score?: number; prizeTxId?: string };
type Event = {
  _id: string; name: string; description?: string; status: EventStatus;
  startDate: string; endDate: string; prize?: Prize; metric: Metric;
  bannerImage?: string; ctaLink?: string; audience?: string; winner?: Winner;
  created_at?: string; updated_at?: string;
};

const STATUS_COLORS: Record<EventStatus, string> = { draft: 'gray', active: 'green', ended: 'amber', cancelled: 'red' };
const STATUS_OPTIONS: EventStatus[] = ['draft', 'active', 'ended', 'cancelled'];
const METRIC_OPTIONS: MetricType[] = ['manual', 'aem_count', 'device_count'];

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<EventStatus>('draft');
  const [metricType, setMetricType] = useState<MetricType>('manual');
  const [prizeType, setPrizeType] = useState('USDC');
  const [prizeAmount, setPrizeAmount] = useState<number>(0);
  const [prizeDescription, setPrizeDescription] = useState('');
  const [bannerImage, setBannerImage] = useState('');
  const [ctaLink, setCtaLink] = useState('');
  const [audience, setAudience] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchEvents = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/events');
      if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
      const data = await res.json();
      setEvents(data.events || []);
    } catch (e: any) { setError(e.message || 'Failed to load'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchEvents(); }, []);

  const handleCreate = async () => {
    setSubmitting(true); setError(null);
    try {
      const body: any = { name, startDate, endDate, status, metric: { type: metricType } };
      if (description) body.description = description;
      if (prizeAmount > 0 || prizeType.trim()) body.prize = { type: prizeType.trim() || undefined, amount: prizeAmount || undefined, description: prizeDescription.trim() || undefined };
      if (bannerImage.trim()) body.bannerImage = bannerImage.trim();
      if (ctaLink.trim()) body.ctaLink = ctaLink.trim();
      if (audience.trim()) body.audience = audience.trim();
      const res = await fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `create failed: ${res.status}`); }
      setName(''); setDescription(''); setStartDate(''); setEndDate(''); setStatus('draft'); setMetricType('manual');
      setPrizeType('USDC'); setPrizeAmount(0); setPrizeDescription(''); setBannerImage(''); setCtaLink(''); setAudience('');
      await fetchEvents();
    } catch (e: any) { setError(e.message || 'Create failed'); }
    finally { setSubmitting(false); }
  };

  return (
    <main className="p-4 md:p-10 mx-auto max-w-7xl bg-gray-950 min-h-screen">
      <Title className="text-white">Events</Title>
      <Text className="text-gray-400 mt-2">Manage admin events and competitions.</Text>
      <Card className="bg-gray-900 border-gray-700 mt-6">
        <Title className="text-white">Create Event</Title>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <TextInput placeholder="Event name *" value={name} onValueChange={setName} />
          <Select value={status} onValueChange={(v: any) => setStatus(v as EventStatus)}>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</Select>
          <TextInput placeholder="Description" value={description} onValueChange={setDescription} className="md:col-span-2" />
          <TextInput placeholder="Start date (ISO 8601) *" value={startDate} onValueChange={setStartDate} />
          <TextInput placeholder="End date (ISO 8601) *" value={endDate} onValueChange={setEndDate} />
          <Select value={metricType} onValueChange={(v: any) => setMetricType(v as MetricType)}>{METRIC_OPTIONS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</Select>
          <TextInput placeholder="Audience" value={audience} onValueChange={setAudience} />
          <TextInput placeholder="Prize type (e.g. USDC)" value={prizeType} onValueChange={setPrizeType} />
          <NumberInput placeholder="Prize amount" value={prizeAmount} onValueChange={(v: any) => setPrizeAmount(typeof v === 'number' ? v : Number(v) || 0)} />
          <TextInput placeholder="Prize description" value={prizeDescription} onValueChange={setPrizeDescription} className="md:col-span-2" />
          <TextInput placeholder="Banner image URL" value={bannerImage} onValueChange={setBannerImage} />
          <TextInput placeholder="CTA link" value={ctaLink} onValueChange={setCtaLink} />
        </div>
        <div className="mt-4"><Button onClick={handleCreate} disabled={submitting || !name || !startDate || !endDate}>{submitting ? 'Creating...' : 'Create Event'}</Button></div>
        {error && <Text className="text-red-400 mt-3">{error}</Text>}
      </Card>
      <Card className="bg-gray-900 border-gray-700 mt-6">
        <Title className="text-white">All Events</Title>
        {loading ? <Text className="text-gray-400 mt-4">Loading...</Text> : events.length === 0 ? <Text className="text-gray-400 mt-4">No events yet.</Text> : (
          <div className="mt-4 space-y-3">{events.map((event) => (
            <Link key={event._id} href={`/events/${event._id}`} className="block">
              <div className="border border-gray-700 rounded-lg p-4 hover:border-gray-500 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <Text className="text-white font-semibold truncate">{event.name}</Text>
                    {event.description && <Text className="text-gray-400 text-sm mt-1 truncate">{event.description}</Text>}
                  </div>
                  <Badge color={(STATUS_COLORS[event.status] || 'gray') as any}>{event.status}</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-sm text-gray-400">
                  {event.prize && typeof event.prize.amount === 'number' && <span>Prize: {event.prize.amount} {event.prize.type || ''}</span>}
                  {event.metric && <span>Metric: {event.metric.type}</span>}
                  {event.startDate && event.endDate && <span>{new Date(event.startDate).toLocaleDateString()} → {new Date(event.endDate).toLocaleDateString()}</span>}
                </div>
              </div>
            </Link>
          ))}</div>
        )}
      </Card>
    </main>
  );
}
