const ChristmasHeader = () => {
  return (
    <header className="relative py-12 px-4 text-center">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="text-5xl md:text-6xl animate-bounce-slow" aria-hidden>
            🎄
          </span>
          <h1 className="text-5xl md:text-6xl font-display font-bold text-christmas-dark">
            Secret Santa
          </h1>
          <span
            className="text-5xl md:text-6xl animate-bounce-slow"
            style={{ animationDelay: '0.5s' }}
            aria-hidden
          >
            🎄
          </span>
        </div>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Share your gifts secretly and reveal them together on the big day! 
          <span className="text-christmas-gold"> 🎄</span>
        </p>
        <div className="mt-6 flex justify-center gap-2">
          {['🎁', '⭐', '🎄', '❄️', '🔔'].map((emoji, i) => (
            <span
              key={i}
              className="text-2xl animate-bounce-slow"
              style={{ animationDelay: `${i * 0.2}s` }}
            >
              {emoji}
            </span>
          ))}
        </div>
      </div>
    </header>
  );
};

export default ChristmasHeader;
