import { Gift } from '@/types/gift';
import GiftCard from './GiftCard';
import { Gift as GiftIcon } from 'lucide-react';

interface GiftGalleryProps {
  gifts: Gift[];
  currentUser: string;
  currentParticipantId?: string;
  isEventRevealed: boolean;
  onToggleLock: (id: string) => void;
  onDeleteGift: (id: string) => void;
}

const GiftGallery = ({ gifts, currentUser, currentParticipantId, isEventRevealed, onToggleLock, onDeleteGift }: GiftGalleryProps) => {
  if (gifts.length === 0) {
    return (
      <div className="card-gift text-center py-16">
        <div className="text-6xl mb-4">🎁</div>
        <h3 className="text-xl font-display font-semibold mb-2">No gifts yet!</h3>
        <p className="text-muted-foreground">
          Be the first to add a gift for your Secret Santa recipient.
        </p>
      </div>
    );
  }

  // Sort: User's own gifts first, then gifts for them, then others
  const sortedGifts = [...gifts].sort((a, b) => {
    const aIsOwner =
      (!!currentParticipantId && (a as any).fromParticipantId === currentParticipantId) ||
      a.fromName.toLowerCase() === currentUser.toLowerCase();
    const bIsOwner =
      (!!currentParticipantId && (b as any).fromParticipantId === currentParticipantId) ||
      b.fromName.toLowerCase() === currentUser.toLowerCase();
    const aIsRecipient = a.toName.toLowerCase() === currentUser.toLowerCase();
    const bIsRecipient = b.toName.toLowerCase() === currentUser.toLowerCase();

    if (aIsOwner && !bIsOwner) return -1;
    if (!aIsOwner && bIsOwner) return 1;
    if (aIsRecipient && !bIsRecipient) return -1;
    if (!aIsRecipient && bIsRecipient) return 1;
    return 0;
  });

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <GiftIcon className="w-6 h-6 text-christmas-gold" />
        <h2 className="text-2xl font-display font-semibold">All Gifts</h2>
        <span className="ml-auto text-sm text-muted-foreground">
          {gifts.length} gift{gifts.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedGifts.map((gift) => (
          <GiftCard
            key={gift.id}
            gift={gift}
            isOwner={
              (!!currentParticipantId && (gift as any).fromParticipantId === currentParticipantId) ||
              gift.fromName.toLowerCase() === currentUser.toLowerCase()
            }
            currentUser={currentUser}
            currentParticipantId={currentParticipantId}
            isEventRevealed={isEventRevealed}
            onToggleLock={onToggleLock}
            onDelete={onDeleteGift}
          />
        ))}
      </div>
    </div>
  );
};

export default GiftGallery;
