/**
 * The front page's customer quotes, written by the owner: each a quote, a
 * name, a role, a company and a picture (a face or a logo). Only real words
 * from real customers belong here; the page shows them exactly as typed.
 */
import { Plus, Trash2 } from 'lucide-react';
import { Button, Field, Input, Textarea } from '@/components/ui';
import { ImagePicker } from '@/components/ImagePicker';
import { MAX_TESTIMONIALS, type SiteTestimonial } from '@/lib/siteDoc';

const EMPTY: SiteTestimonial = { quote: '', name: '', role: '', company: '', photo: '' };

export function TestimonialEditor({
  items,
  onChange,
}: {
  items: SiteTestimonial[];
  onChange: (next: SiteTestimonial[]) => void;
}) {
  const update = (index: number, patch: Partial<SiteTestimonial>) =>
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  return (
    <div className="space-y-5">
      {items.map((item, index) => (
        <div key={index} className="flex flex-col gap-4 rounded-xl border border-hairline p-4 sm:flex-row sm:items-start">
          <ImagePicker
            kind="site"
            value={item.photo}
            onChange={(photo) => update(index, { photo })}
            size={96}
            shape="circle"
            label="Photo or logo"
            quiet
          />
          <div className="min-w-0 flex-1 space-y-3">
            <Field label="What they said" required>
              <Textarea
                rows={3}
                value={item.quote}
                onChange={(e) => update(index, { quote: e.target.value })}
                placeholder="In their own words."
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Name" required>
                <Input value={item.name} onChange={(e) => update(index, { name: e.target.value })} />
              </Field>
              <Field label="Role">
                <Input value={item.role} onChange={(e) => update(index, { role: e.target.value })} placeholder="Sales manager" />
              </Field>
              <Field label="Company">
                <Input value={item.company} onChange={(e) => update(index, { company: e.target.value })} />
              </Field>
            </div>
            <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => onChange(items.filter((_, i) => i !== index))}>
              Remove
            </Button>
          </div>
        </div>
      ))}
      {items.length < MAX_TESTIMONIALS && (
        <Button variant="outline" size="sm" icon={<Plus size={15} />} onClick={() => onChange([...items, { ...EMPTY }])}>
          Add a testimonial
        </Button>
      )}
    </div>
  );
}
