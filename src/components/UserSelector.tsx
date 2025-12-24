import { Users, X, Sparkles } from 'lucide-react';

interface UserSelectorProps {
  participants: string[];
  currentUser: string;
  authName?: string;
  canRemoveParticipant?: (name: string) => boolean;
  onSetCurrentUser: (name: string) => void;
  onAddParticipant: (name: string) => void;
  onRemoveParticipant: (name: string) => void;
}

const UserSelector = ({
  participants,
  currentUser,
  onSetCurrentUser,
  onAddParticipant,
  onRemoveParticipant,
  authName,
  canRemoveParticipant,
}: UserSelectorProps) => {
  return (
    <div className="card-gift max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Users className="w-6 h-6 text-christmas-red" />
        <h2 className="text-2xl font-display font-semibold">Who's Playing?</h2>
      </div>

      {/* Participants join by logging in; disable manual adds */}
      <div className="mb-6 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        Participants are added automatically when they log in using your link.
      </div>

      {/* Participants list */}
      {participants.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground mb-3">
            Click on your name to select yourself:
          </p>
          <div className="flex flex-wrap gap-2">
            {participants.map((name) => {
              const isAuthName = authName && authName === name;
              const canSelect = !authName || isAuthName; // if authName provided, only allow selecting your own name
              const canRemove = (canRemoveParticipant ? canRemoveParticipant(name) : !authName || isAuthName);
              return (
                <div
                  key={name}
                  className={`group relative inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                    currentUser === name
                      ? 'bg-primary text-primary-foreground shadow-lg'
                      : 'bg-muted'
                  } ${canSelect ? 'cursor-pointer hover:bg-muted/80 transition-all' : 'opacity-80'} `}
                  onClick={() => canSelect && onSetCurrentUser(name)}
                  title={!canSelect ? 'You can only select your own name while signed in' : undefined}
                >
                  {currentUser === name && (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span className="font-medium">{name}{isAuthName ? ' (you)' : ''}</span>
                  {canRemove && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveParticipant(name);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded-full hover:bg-destructive/20"
                      aria-label={`Remove ${name}`}
                      title={isAuthName ? 'Remove yourself' : undefined}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <p>Add your friends to get started! 🎄</p>
        </div>
      )}

      {currentUser && (
        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-center text-lg">
            Playing as{' '}
            <span className="font-semibold text-christmas-green">{currentUser}</span>{' '}
            <span className="text-2xl">🎅</span>
          </p>
        </div>
      )}
    </div>
  );
};

export default UserSelector;
