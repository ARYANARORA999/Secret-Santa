import { Gift, GiftImage } from '@/types/gift';
import { useEffect, useState } from 'react';
import { Lock, Unlock, Eye, Trash2, HelpCircle } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { Button } from './ui/button';

interface GiftCardProps {
  gift: Gift;
  isOwner: boolean;
  currentUser: string;
  currentParticipantId?: string;
  isEventRevealed: boolean;
  onToggleLock: (id: string) => void;
  onDelete: (id: string) => void;
}

const GiftCard = ({ gift, isOwner, currentUser, currentParticipantId, isEventRevealed, onToggleLock, onDelete }: GiftCardProps) => {
  const isRecipient =
    (!!currentParticipantId && (gift as any).toParticipantId === currentParticipantId) ||
    gift.toName.toLowerCase() === currentUser.toLowerCase();
  const canViewContent = isOwner || (isRecipient && gift.isUnlocked);
  // Show "From" only when: owner views their gift OR event is fully revealed
  const canSeeFrom = isOwner || isEventRevealed;

  const [activeImage, setActiveImage] = useState<GiftImage | null>(null);

  useEffect(() => {
    if (!activeImage) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveImage(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeImage]);

  return (
    <div className="card-gift relative overflow-hidden group">
      {activeImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setActiveImage(null)}
        >
          <div
            className="relative max-w-5xl w-full max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={activeImage.url}
              alt={activeImage.caption || 'Gift image'}
              className="w-full h-full max-h-[85vh] object-contain rounded-xl"
            />
            {activeImage.caption && (
              <div className="mt-3 text-center text-sm text-white/80">{activeImage.caption}</div>
            )}
            <button
              type="button"
              onClick={() => setActiveImage(null)}
              className="absolute -top-3 -right-3 bg-white text-black rounded-full w-9 h-9 flex items-center justify-center shadow"
              aria-label="Close"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      {/* Lock indicator */}
      <div className="absolute top-4 right-4 z-10">
        {gift.isUnlocked ? (
          <div className="bg-secondary/90 p-2 rounded-full">
            <Unlock className="w-4 h-4 text-secondary-foreground" />
          </div>
        ) : (
          <div className="bg-primary/90 p-2 rounded-full shimmer">
            <Lock className="w-4 h-4 text-primary-foreground" />
          </div>
        )}
      </div>

      {/* Gift header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">🎁</span>
          {canSeeFrom ? (
            <>
              <div>
                <p className="text-sm text-muted-foreground">From</p>
                <p className="font-semibold text-foreground">{gift.fromName}</p>
              </div>
              <span className="text-muted-foreground mx-2">→</span>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <HelpCircle className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">From</p>
                  <p className="font-semibold text-muted-foreground italic">Secret Santa 🤫</p>
                </div>
              </div>
              <span className="text-muted-foreground mx-2">→</span>
            </>
          )}
          <div>
            <p className="text-sm text-muted-foreground">To</p>
            <p className="font-semibold text-christmas-green">{gift.toName}</p>
          </div>
        </div>
        {/* Only show status when content can be viewed or owner */}
        {(canViewContent || isOwner) && <StatusBadge status={gift.status} />}
      </div>

      {/* Gift images */}
      {canViewContent ? (
        <div className="space-y-3 gift-reveal">
          {gift.images.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {gift.images.map((img) => (
                <div
                  key={img.id}
                  className="aspect-square rounded-xl overflow-hidden bg-muted cursor-zoom-in"
                  onClick={() => setActiveImage(img)}
                  title="Click to view"
                >
                  <img
                    src={img.url}
                    alt={img.caption || 'Gift'}
                    className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="aspect-video rounded-xl bg-muted flex items-center justify-center">
              <p className="text-muted-foreground text-sm">No images yet</p>
            </div>
          )}
          {gift.message && (
            <p className="text-sm text-muted-foreground italic">"{gift.message}"</p>
          )}
        </div>
      ) : (
        <div className="aspect-video rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-primary/20">
          <div className="text-4xl animate-wiggle">🎄</div>
          <p className="text-muted-foreground text-sm text-center px-4">
            {isRecipient
              ? 'This gift is still wrapped! Wait for the reveal...'
              : 'Only the gifter and recipient can see this'}
          </p>
        </div>
      )}

      {/* Owner actions */}
      {isOwner && (
        <div className="mt-4 flex gap-2">
          <Button
            onClick={() => onToggleLock(gift.id)}
            variant={gift.isUnlocked ? 'secondary' : 'default'}
            size="sm"
            className="flex-1"
          >
            {gift.isUnlocked ? (
              <>
                <Lock className="w-4 h-4 mr-2" />
                Lock
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                Reveal to {gift.toName}
              </>
            )}
          </Button>
          <Button
            onClick={() => onDelete(gift.id)}
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default GiftCard;
