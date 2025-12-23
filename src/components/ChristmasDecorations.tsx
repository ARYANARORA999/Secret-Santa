import { useEffect, useState } from 'react';

interface MovingElement {
  id: number;
  type: 'santa' | 'reindeer';
  top: number;
  direction: 'left' | 'right';
  delay: number;
  duration: number;
}

interface Tree {
  id: number;
  left: number;
  size: number;
  delay: number;
}

const ChristmasDecorations = () => {
  const [movingElements, setMovingElements] = useState<MovingElement[]>([]);
  const [trees, setTrees] = useState<Tree[]>([]);

  useEffect(() => {
    // Create moving elements (Santa and reindeer)
    const elements: MovingElement[] = [
      { id: 1, type: 'santa', top: 8, direction: 'right', delay: 0, duration: 20 },
      { id: 2, type: 'reindeer', top: 15, direction: 'left', delay: 5, duration: 18 },
      { id: 3, type: 'reindeer', top: 12, direction: 'right', delay: 10, duration: 22 },
      { id: 4, type: 'santa', top: 20, direction: 'left', delay: 15, duration: 25 },
    ];
    setMovingElements(elements);

    // Create trees at bottom
    const treeElements: Tree[] = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      left: i * 14 + Math.random() * 5,
      size: 0.8 + Math.random() * 0.6,
      delay: Math.random() * 2,
    }));
    setTrees(treeElements);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-5">
      {/* Moving Santa and Reindeer */}
      {movingElements.map((element) => (
        <div
          key={element.id}
          className={`absolute ${element.direction === 'right' ? 'animate-fly-right' : 'animate-fly-left'}`}
          style={{
            top: `${element.top}%`,
            animationDelay: `${element.delay}s`,
            animationDuration: `${element.duration}s`,
          }}
        >
          <div className="flex items-center gap-1">
            {element.type === 'santa' ? (
              <>
                <span className="text-3xl md:text-4xl" style={{ transform: element.direction === 'left' ? 'scaleX(-1)' : 'none' }}>
                  🦌
                </span>
                <span className="text-3xl md:text-4xl" style={{ transform: element.direction === 'left' ? 'scaleX(-1)' : 'none' }}>
                  🦌
                </span>
                <span className="text-4xl md:text-5xl" style={{ transform: element.direction === 'left' ? 'scaleX(-1)' : 'none' }}>
                  🛷
                </span>
                <span className="text-3xl md:text-4xl">🎅</span>
              </>
            ) : (
              <>
                <span className="text-2xl md:text-3xl" style={{ transform: element.direction === 'left' ? 'scaleX(-1)' : 'none' }}>
                  🦌
                </span>
                <span className="text-2xl md:text-3xl" style={{ transform: element.direction === 'left' ? 'scaleX(-1)' : 'none' }}>
                  🦌
                </span>
                <span className="text-2xl md:text-3xl" style={{ transform: element.direction === 'left' ? 'scaleX(-1)' : 'none' }}>
                  🦌
                </span>
              </>
            )}
          </div>
        </div>
      ))}

      {/* Christmas Trees at bottom */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-around items-end">
        {trees.map((tree) => (
          <div
            key={tree.id}
            className="animate-sway"
            style={{
              position: 'absolute',
              left: `${tree.left}%`,
              bottom: 0,
              transform: `scale(${tree.size})`,
              animationDelay: `${tree.delay}s`,
            }}
          >
            <div className="relative">
              <span className="text-5xl md:text-6xl">🎄</span>
              {/* Twinkling lights effect */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2">
                <span className="text-xs animate-twinkle" style={{ animationDelay: '0s' }}>✨</span>
              </div>
              <div className="absolute top-4 left-1/3">
                <span className="text-xs animate-twinkle" style={{ animationDelay: '0.5s' }}>✨</span>
              </div>
              <div className="absolute top-4 right-1/3">
                <span className="text-xs animate-twinkle" style={{ animationDelay: '1s' }}>✨</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Hanging ornaments */}
      <div className="absolute top-0 left-0 right-0 flex justify-around">
        {['🔔', '⭐', '🎀', '🔔', '⭐', '🎀', '🔔'].map((ornament, i) => (
          <div
            key={i}
            className="animate-swing"
            style={{
              animationDelay: `${i * 0.3}s`,
            }}
          >
            <div className="flex flex-col items-center">
              <div className="w-px h-4 md:h-8 bg-christmas-gold/50" />
              <span className="text-xl md:text-2xl">{ornament}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Corner decorations */}
      <div className="absolute top-4 left-4 text-3xl md:text-4xl animate-wiggle">
        🎄
      </div>
      <div className="absolute top-4 right-4 text-3xl md:text-4xl animate-wiggle" style={{ animationDelay: '0.5s' }}>
        🎄
      </div>
    </div>
  );
};

export default ChristmasDecorations;
