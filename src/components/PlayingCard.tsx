import React from 'react';
import { motion } from 'motion/react';
import { Card, Suit } from '../types';
import { getSuitSymbol, getSuitColor } from '../utils/gameLogic';

interface PlayingCardProps {
  card: Card;
  isFaceUp?: boolean;
  onClick?: () => void;
  isPlayable?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const PlayingCard: React.FC<PlayingCardProps> = ({
  card,
  isFaceUp = true,
  onClick,
  isPlayable = false,
  className = '',
  style = {},
}) => {
  if (!card) return null;
  const { suit, rank } = card;

  if (!isFaceUp) {
    return (
      <motion.div
        className={`relative w-20 h-28 sm:w-28 sm:h-40 rounded-xl bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center card-shadow overflow-hidden ${className}`}
        style={style}
      >
        <div className="absolute inset-2 border border-zinc-600/50 rounded-lg flex items-center justify-center">
          <div className="w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-700 to-zinc-800 opacity-50" />
          <div className="absolute text-zinc-600 font-bold text-2xl opacity-20 select-none">KARL</div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={isPlayable ? { y: -10, scale: 1.05 } : {}}
      whileTap={isPlayable ? { scale: 0.95 } : {}}
      onClick={isPlayable ? onClick : undefined}
      className={`relative w-20 h-28 sm:w-28 sm:h-40 rounded-xl bg-white border-2 ${
        isPlayable ? 'border-amber-500 cursor-pointer ring-4 ring-amber-500/20' : 'border-zinc-200'
      } flex flex-col p-2 sm:p-3 card-shadow select-none ${className}`}
      style={style}
    >
      <div className={`flex flex-col items-start leading-none ${getSuitColor(suit)}`}>
        <span className="text-lg sm:text-xl font-bold font-display">{rank}</span>
        <span className="text-sm sm:text-base">{getSuitSymbol(suit)}</span>
      </div>

      <div className={`flex-1 flex items-center justify-center text-3xl sm:text-4xl ${getSuitColor(suit)}`}>
        {getSuitSymbol(suit)}
      </div>

      <div className={`flex flex-col items-end leading-none rotate-180 ${getSuitColor(suit)}`}>
        <span className="text-lg sm:text-xl font-bold font-display">{rank}</span>
        <span className="text-sm sm:text-base">{getSuitSymbol(suit)}</span>
      </div>
    </motion.div>
  );
};

export default PlayingCard;
