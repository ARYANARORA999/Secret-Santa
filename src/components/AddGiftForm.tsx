import { useState } from 'react';
import { DeliveryStatus, Gift, GiftImage } from '@/types/gift';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Plus, Upload, X, Gift as GiftIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';

interface AddGiftFormProps {
  currentUser: string;
  participants: string[];
  onAddGift: (gift: Gift) => void;
}

const AddGiftForm = ({ currentUser, participants, onAddGift }: AddGiftFormProps) => {
  const [open, setOpen] = useState(false);
  const [toName, setToName] = useState('');
  const [status, setStatus] = useState<DeliveryStatus>('pending');
  const [message, setMessage] = useState('');
  const [images, setImages] = useState<GiftImage[]>([]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              url: event.target!.result as string,
            },
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!toName.trim()) return;

    const newGift: Gift = {
      id: crypto.randomUUID(),
      fromName: currentUser,
      toName: toName.trim(),
      status,
      images,
      isUnlocked: false,
      message: message.trim() || undefined,
      createdAt: new Date(),
    };

    onAddGift(newGift);
    setOpen(false);
    setToName('');
    setStatus('pending');
    setMessage('');
    setImages([]);
  };

  const otherParticipants = participants.filter(
    (p) => p.toLowerCase() !== currentUser.toLowerCase()
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="btn-festive gap-2">
          <Plus className="w-5 h-5" />
          Add Your Gift
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-2xl">
            <GiftIcon className="w-6 h-6 text-christmas-red" />
            Add Your Secret Gift
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label htmlFor="recipient">Who are you gifting?</Label>
            <Select value={toName} onValueChange={setToName}>
              <SelectTrigger>
                <SelectValue placeholder="Select recipient" />
              </SelectTrigger>
              <SelectContent>
                {otherParticipants.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Delivery Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as DeliveryStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">🚚 On the way</SelectItem>
                <SelectItem value="partial">📦 Partially delivered</SelectItem>
                <SelectItem value="delivered">✅ Delivered</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Gift Screenshots</Label>
            <div className="grid grid-cols-3 gap-2">
              {images.map((img) => (
                <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden group">
                  <img src={img.url} alt="Gift" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(img.id)}
                    className="absolute top-1 right-1 p-1 bg-destructive rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3 text-destructive-foreground" />
                  </button>
                </div>
              ))}
              <label className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center cursor-pointer transition-colors bg-muted/50">
                <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                <span className="text-xs text-muted-foreground">Upload</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Secret Message (optional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write a sweet message..."
              rows={2}
            />
          </div>

          <Button type="submit" className="w-full btn-gold" disabled={!toName}>
            <GiftIcon className="w-4 h-4 mr-2" />
            Wrap This Gift
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddGiftForm;
