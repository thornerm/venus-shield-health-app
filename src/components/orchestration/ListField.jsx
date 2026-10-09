import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

export default function ListField({ label, hint, values = [], onChange, placeholder }) {
  const update = (idx, val) => {
    const next = [...values];
    next[idx] = val;
    onChange(next);
  };
  const add = () => onChange([...values, ""]);
  const remove = (idx) => onChange(values.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        <Button type="button" variant="ghost" size="sm" onClick={add}>
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {values.length === 0 && <p className="text-xs italic text-muted-foreground">None</p>}
      <div className="space-y-2">
        {values.map((v, idx) => (
          <div key={idx} className="flex gap-2">
            <Input value={v} onChange={(e) => update(idx, e.target.value)} placeholder={placeholder} />
            <Button type="button" variant="ghost" size="icon" onClick={() => remove(idx)} aria-label="Remove">
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}