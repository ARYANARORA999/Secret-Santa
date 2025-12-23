import { useState } from 'react';
import { Button } from './ui/button';
import { PartyPopper, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';

interface EndEventButtonProps {
  isRevealed: boolean;
  onEndEvent: () => void;
}

const EndEventButton = ({ isRevealed, onEndEvent }: EndEventButtonProps) => {
  const [showConfetti, setShowConfetti] = useState(false);

  const handleEndEvent = () => {
    setShowConfetti(true);
    onEndEvent();
    
    // Reset confetti after animation
    setTimeout(() => setShowConfetti(false), 4000);
  };

  if (isRevealed) {
    return (
      <div className="card-gift text-center py-8 bg-gradient-to-r from-christmas-red/10 via-christmas-gold/10 to-christmas-green/10">
        <div className="flex justify-center gap-2 mb-4">
          <span className="text-4xl animate-bounce-slow">🎉</span>
          <span className="text-4xl animate-bounce-slow" style={{ animationDelay: '0.2s' }}>🎅</span>
          <span className="text-4xl animate-bounce-slow" style={{ animationDelay: '0.4s' }}>🎁</span>
        </div>
        <h3 className="text-2xl font-display font-bold text-christmas-green mb-2">
          The Big Reveal Has Happened!
        </h3>
        <p className="text-muted-foreground">
          Everyone can now see who their Secret Santa was! 🎄
        </p>
      </div>
    );
  }

  return (
    <>
      {showConfetti && <ConfettiEffect />}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button className="btn-gold text-lg py-6 px-8">
            <PartyPopper className="w-5 h-5 mr-2" />
            End Event & Reveal All Names
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="card-gift">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-2xl font-display">
              <AlertTriangle className="w-6 h-6 text-christmas-gold" />
              End Secret Santa Event?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              This will reveal who everyone's Secret Santa was to all participants.
              <br /><br />
              <strong className="text-foreground">This action cannot be undone!</strong>
              <br /><br />
              Make sure everyone is ready for the big reveal! 🎅🎄
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not yet</AlertDialogCancel>
            <AlertDialogAction onClick={handleEndEvent} className="btn-festive">
              <PartyPopper className="w-4 h-4 mr-2" />
              Reveal Everyone!
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const ConfettiEffect = () => {
  const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 2,
    color: ['🎊', '🎉', '✨', '⭐', '🌟', '🎁', '🎄'][Math.floor(Math.random() * 7)],
    duration: 2 + Math.random() * 2,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {confettiPieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute text-2xl animate-confetti"
          style={{
            left: `${piece.left}%`,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
          }}
        >
          {piece.color}
        </div>
      ))}
    </div>
  );
};

export default EndEventButton;
