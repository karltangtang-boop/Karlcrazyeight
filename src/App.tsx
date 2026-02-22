/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, RotateCcw, Play, Info, Heart, Diamond, Club, Spade, ChevronRight } from 'lucide-react';
import { Card, Suit, GameState, GameStatus } from './types';
import { createDeck, shuffleDeck, isValidMove, getSuitSymbol, getSuitColor } from './utils/gameLogic';
import PlayingCard from './components/PlayingCard';

const INITIAL_HAND_SIZE = 8;

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    playerHand: [],
    aiHand: [],
    drawPile: [],
    discardPile: [],
    currentTurn: 'player',
    status: 'waiting',
    winner: null,
    activeSuit: null,
    lastAction: '欢迎来到 Karl 疯狂 8 点！'
  });

  const [showSuitSelector, setShowSuitSelector] = useState(false);
  const [pendingCard, setPendingCard] = useState<Card | null>(null);

  const startNewGame = useCallback(() => {
    try {
      const deck = shuffleDeck(createDeck());
      const playerHand = deck.splice(0, INITIAL_HAND_SIZE);
      const aiHand = deck.splice(0, INITIAL_HAND_SIZE);
      
      // Ensure the first discard is not an 8
      let firstDiscardIndex = 0;
      while (deck[firstDiscardIndex] && deck[firstDiscardIndex].rank === '8') {
        firstDiscardIndex++;
      }
      
      if (firstDiscardIndex >= deck.length) {
        // Fallback if somehow all cards are 8s (impossible with 52 cards)
        firstDiscardIndex = 0;
      }

      const discardPile = [deck.splice(firstDiscardIndex, 1)[0]];
      const drawPile = deck;

      setGameState({
        playerHand,
        aiHand,
        drawPile,
        discardPile,
        currentTurn: 'player',
        status: 'playing',
        winner: null,
        activeSuit: null,
        lastAction: '游戏开始！请出牌。'
      });
    } catch (error) {
      console.error('Failed to start game:', error);
    }
  }, []);

  const checkWinner = useCallback((state: GameState) => {
    if (state.status !== 'playing') return state;
    
    if (state.playerHand.length === 0) {
      return { ...state, status: 'game_over' as GameStatus, winner: 'player' as const, lastAction: '恭喜！你清空了所有手牌，赢得了胜利！' };
    }
    if (state.aiHand.length === 0) {
      return { ...state, status: 'game_over' as GameStatus, winner: 'ai' as const, lastAction: 'AI 率先清空了手牌，你输了。' };
    }
    return state;
  }, []);

  // Defensive check to ensure game ends if hand is empty
  useEffect(() => {
    if (gameState.status === 'playing') {
      if (gameState.playerHand.length === 0 || gameState.aiHand.length === 0) {
        setGameState(prev => checkWinner(prev));
      }
    }
  }, [gameState.playerHand.length, gameState.aiHand.length, gameState.status, checkWinner]);

  // Emergency deal if game is active but hands are empty (should not happen)
  useEffect(() => {
    if (gameState.status === 'playing' && gameState.playerHand.length === 0 && !gameState.winner) {
      const timer = setTimeout(() => {
        if (gameState.playerHand.length === 0) {
          startNewGame();
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [gameState.playerHand.length, gameState.status, gameState.winner, startNewGame]);

  // Auto-start if stuck in waiting for too long
  useEffect(() => {
    if (gameState.status === 'waiting') {
      const timer = setTimeout(() => {
        // Optional: auto-start after 10s if user doesn't click
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [gameState.status]);

  const playCard = (card: Card, isPlayer: boolean, chosenSuit?: Suit) => {
    setGameState(prev => {
      const hand = isPlayer ? prev.playerHand : prev.aiHand;
      const newHand = hand.filter(c => c.id !== card.id);
      const newDiscardPile = [card, ...prev.discardPile];
      
      const suitNames: Record<Suit, string> = { hearts: '红心', diamonds: '方块', clubs: '梅花', spades: '黑桃' };
      
      const nextState: GameState = {
        ...prev,
        [isPlayer ? 'playerHand' : 'aiHand']: newHand,
        discardPile: newDiscardPile,
        activeSuit: card.rank === '8' ? (chosenSuit || null) : null,
        currentTurn: isPlayer ? 'ai' : 'player',
        lastAction: `${isPlayer ? '你' : 'AI'} 打出了 ${card.rank} (${suitNames[card.suit]})${card.rank === '8' && chosenSuit ? ` 并将花色改为 ${suitNames[chosenSuit]}` : ''}。`
      };

      return checkWinner(nextState);
    });
  };

  const drawCard = (isPlayer: boolean) => {
    setGameState(prev => {
      if (prev.drawPile.length === 0) {
        // If draw pile is empty, reshuffle discard pile except top card
        if (prev.discardPile.length <= 1) {
          return { ...prev, lastAction: '没有牌可以摸了！跳过回合。', currentTurn: isPlayer ? 'ai' : 'player' };
        }
        const topCard = prev.discardPile[0];
        const newDrawPile = shuffleDeck(prev.discardPile.slice(1));
        const newDiscardPile = [topCard];
        return { ...prev, drawPile: newDrawPile, discardPile: newDiscardPile, lastAction: '摸牌堆已重新洗牌。' };
      }

      const newDrawPile = [...prev.drawPile];
      const drawnCard = newDrawPile.pop()!;
      const newHand = isPlayer ? [...prev.playerHand, drawnCard] : [...prev.aiHand, drawnCard];

      return {
        ...prev,
        drawPile: newDrawPile,
        [isPlayer ? 'playerHand' : 'aiHand']: newHand,
        lastAction: `${isPlayer ? '你' : 'AI'} 摸了一张牌。`,
        currentTurn: isPlayer ? 'ai' : 'player'
      };
    });
  };

  const handlePlayerCardClick = (card: Card) => {
    if (gameState.currentTurn !== 'player' || gameState.status !== 'playing') return;

    if (isValidMove(card, gameState.discardPile[0], gameState.activeSuit)) {
      if (card.rank === '8') {
        setPendingCard(card);
        setShowSuitSelector(true);
      } else {
        playCard(card, true);
      }
    }
  };

  const handleSuitSelection = (suit: Suit) => {
    if (pendingCard) {
      playCard(pendingCard, true, suit);
      setPendingCard(null);
      setShowSuitSelector(false);
    }
  };

  // AI Logic
  useEffect(() => {
    if (gameState.currentTurn === 'ai' && gameState.status === 'playing') {
      const timer = setTimeout(() => {
        const topCard = gameState.discardPile[0];
        const playableCards = gameState.aiHand.filter(c => isValidMove(c, topCard, gameState.activeSuit));

        if (playableCards.length > 0) {
          // AI strategy: play an 8 if it's the only option or randomly
          const eightCard = playableCards.find(c => c.rank === '8');
          const normalCards = playableCards.filter(c => c.rank !== '8');
          
          if (normalCards.length > 0) {
            // Play a normal card
            playCard(normalCards[0], false);
          } else if (eightCard) {
            // Play an 8 and pick the suit the AI has most of
            const suitCounts: Record<Suit, number> = { hearts: 0, diamonds: 0, clubs: 0, spades: 0 };
            gameState.aiHand.forEach(c => {
              if (c.id !== eightCard.id) suitCounts[c.suit]++;
            });
            const bestSuit = (Object.keys(suitCounts) as Suit[]).reduce((a, b) => suitCounts[a] > suitCounts[b] ? a : b);
            playCard(eightCard, false, bestSuit);
          }
        } else {
          drawCard(false);
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [gameState.currentTurn, gameState.status]);

  const topCard = gameState.discardPile[0];

  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-4 sm:p-8 bg-felt relative overflow-hidden">
      {/* Background Texture */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/felt.png')]" />

      {/* Header */}
      <header className="w-full max-w-5xl flex justify-between items-center z-30 bg-black/20 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-2xl">
        <div className="flex flex-col">
          <h1 className="text-2xl sm:text-4xl font-black font-display tracking-tighter text-white drop-shadow-lg">
            KARL <span className="text-amber-400">8S</span>
          </h1>
          <p className="text-amber-200/70 text-[10px] sm:text-xs font-bold uppercase tracking-widest">{gameState.lastAction}</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={startNewGame}
            className="flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black transition-all text-xs sm:text-sm shadow-[0_0_20px_rgba(245,158,11,0.4)] active:scale-90 animate-pulse border-b-4 border-amber-700"
          >
            <RotateCcw size={18} />
            <span>立即发牌</span>
          </button>
        </div>
      </header>

      {/* Main Game Board */}
      <main className="flex-1 w-full max-w-6xl flex flex-col justify-between items-center py-6 sm:py-10 z-10">
        
        {/* AI Hand Area */}
        <div className="relative h-28 sm:h-36 w-full flex flex-col items-center justify-start">
          <div className="flex -space-x-14 sm:-space-x-20">
            <AnimatePresence>
              {gameState.aiHand.map((card, index) => (
                <PlayingCard 
                  key={card.id} 
                  card={card} 
                  isFaceUp={false} 
                  className="scale-75 sm:scale-90 origin-top shadow-2xl"
                  style={{ zIndex: index }}
                />
              ))}
            </AnimatePresence>
          </div>
          {gameState.status === 'playing' && (
            <div className="mt-4 bg-zinc-950/80 px-4 py-1 rounded-full border-2 border-zinc-800 text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] shadow-inner">
              AI OPPONENT ({gameState.aiHand.length})
            </div>
          )}
        </div>

        {/* Center Piles Area */}
        <div className="flex-1 flex items-center justify-center gap-8 sm:gap-24 my-6">
          {/* Draw Pile */}
          <div className="relative group">
            <div className="absolute -inset-4 bg-amber-400/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <button 
              onClick={() => gameState.currentTurn === 'player' && gameState.status === 'playing' && drawCard(true)}
              disabled={gameState.currentTurn !== 'player' || gameState.status !== 'playing'}
              className="relative active:scale-90 transition-transform"
            >
              {gameState.drawPile.length > 0 ? (
                <div className="relative">
                  <div className="absolute top-1.5 left-1.5 w-24 h-32 sm:w-32 sm:h-44 rounded-2xl bg-zinc-800 border-2 border-zinc-700 translate-x-1.5 translate-y-1.5 shadow-2xl" />
                  <PlayingCard card={gameState.drawPile[0]} isFaceUp={false} className="w-24 h-32 sm:w-32 sm:h-44" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-zinc-950/90 text-amber-400 text-[10px] sm:text-xs font-black px-3 py-1.5 rounded-lg border-2 border-amber-500/30 shadow-2xl uppercase tracking-widest">
                      摸牌 ({gameState.drawPile.length})
                    </span>
                  </div>
                </div>
              ) : (
                <div className="w-24 h-32 sm:w-32 sm:h-44 rounded-2xl border-4 border-dashed border-white/10 flex items-center justify-center text-white/10 font-black text-sm uppercase tracking-widest">
                  EMPTY
                </div>
              )}
            </button>
          </div>

          {/* Discard Pile */}
          <div className="relative">
            <AnimatePresence mode="popLayout">
              {topCard && (
                <PlayingCard 
                  key={topCard.id} 
                  card={topCard} 
                  className="w-24 h-32 sm:w-32 sm:h-44 animate-float shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                />
              )}
            </AnimatePresence>
            {gameState.activeSuit && (
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white px-4 py-1.5 rounded-full shadow-[0_10px_30px_rgba(255,255,255,0.3)] border-2 border-zinc-200">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">SUIT</span>
                <span className={`text-2xl ${getSuitColor(gameState.activeSuit)}`}>
                  {getSuitSymbol(gameState.activeSuit)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Player Hand Area */}
        <div className="relative min-h-[240px] sm:min-h-[320px] w-full flex flex-col items-center justify-center bg-rose-950/40 rounded-[3rem] border-4 border-amber-500/30 p-6 sm:p-10 shadow-[inset_0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-md">
          <div className="absolute top-4 left-6 text-[10px] font-black text-amber-500/30 uppercase tracking-[0.5em] select-none">
            Karl Hand Zone
          </div>
          
          {/* Player Status & Draw Button Hint */}
          {gameState.status === 'playing' && (
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 w-full z-30">
              {gameState.currentTurn === 'player' && 
               gameState.playerHand.length > 0 &&
               gameState.playerHand.every(c => !isValidMove(c, topCard, gameState.activeSuit)) && (
                <motion.button
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => drawCard(true)}
                  className="bg-gradient-to-r from-amber-400 to-orange-600 text-white px-10 py-3 rounded-full font-black text-sm shadow-[0_15px_40px_rgba(245,158,11,0.5)] border-2 border-white/30 uppercase tracking-widest animate-bounce"
                >
                  无牌可出，请摸牌
                </motion.button>
              )}

              <div className="flex items-center gap-4">
                <div className={`px-6 py-2 rounded-full border-2 text-xs font-black uppercase tracking-[0.3em] transition-all ${
                  gameState.currentTurn === 'player' 
                    ? 'bg-amber-500 text-white border-amber-300 shadow-[0_0_30px_rgba(245,158,11,0.6)]' 
                    : 'bg-zinc-950/90 text-zinc-600 border-zinc-800'
                }`}>
                  {gameState.currentTurn === 'player' ? 'YOUR TURN' : 'AI THINKING'}
                </div>
                <div className="bg-zinc-950/90 px-5 py-2 rounded-full border-2 border-zinc-800 text-xs font-black text-amber-400 shadow-inner tracking-widest">
                  CARDS: {gameState.playerHand.length}
                </div>
              </div>
            </div>
          )}

          {gameState.playerHand.length > 0 ? (
            <div className="flex justify-center items-end w-full max-w-6xl px-4 sm:px-10 py-8 overflow-x-auto no-scrollbar min-h-[200px]">
              <div className="flex -space-x-12 sm:-space-x-16 hover:space-x-2 transition-all duration-300 pb-4">
                {gameState.playerHand.map((card, index) => (
                  <PlayingCard 
                    key={card.id}
                    card={card} 
                    isPlayable={gameState.currentTurn === 'player' && gameState.status === 'playing' && isValidMove(card, topCard, gameState.activeSuit)}
                    onClick={() => handlePlayerCardClick(card)}
                    className="shadow-2xl hover:z-50 transition-transform"
                    style={{ 
                      zIndex: index,
                    }}
                  />
                ))}
              </div>
            </div>
          ) : gameState.status === 'playing' && !gameState.winner ? (
            <div className="flex flex-col items-center gap-10 py-12">
              <div className="flex flex-col items-center gap-6">
                <div className="w-24 h-24 rounded-full border-8 border-amber-500 border-t-transparent animate-spin shadow-2xl" />
                <p className="text-amber-400 text-2xl font-black tracking-[0.5em] animate-pulse uppercase">
                  Dealing...
                </p>
              </div>
              <button 
                onClick={startNewGame}
                className="px-16 py-8 bg-amber-500 text-zinc-950 rounded-[2rem] font-black text-3xl hover:bg-amber-400 transition-all shadow-[0_30px_80px_rgba(245,158,11,0.5)] active:scale-90 border-b-[12px] border-amber-700 animate-bounce uppercase tracking-widest"
              >
                Deal Now
              </button>
            </div>
          ) : (
            <div className="text-amber-500/5 font-black text-6xl sm:text-9xl select-none uppercase tracking-[0.8em] opacity-10">
              KARL
            </div>
          )}
        </div>
      </main>

      {/* Overlays */}
      <AnimatePresence>
        {/* Start Screen */}
        {gameState.status === 'waiting' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/95 backdrop-blur-md p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center shadow-2xl ring-1 ring-white/10"
            >
              <div className="w-24 h-24 bg-amber-500/20 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                <Play className="text-amber-400 fill-amber-400" size={48} />
              </div>
              <h2 className="text-5xl font-black font-display text-white mb-4 tracking-tight">疯狂 8 点</h2>
              <p className="text-zinc-400 mb-10 text-lg">准备好挑战智能 AI 了吗？</p>
              
              <div className="space-y-4 mb-10 text-left bg-zinc-950/50 p-6 rounded-2xl border border-zinc-800">
                <div className="flex items-start gap-4 text-sm">
                  <div className="mt-1 p-1 bg-amber-500/20 rounded-full text-amber-400"><ChevronRight size={14} /></div>
                  <p className="text-zinc-300">初始每人发 <span className="text-amber-400 font-bold">8 张牌</span></p>
                </div>
                <div className="flex items-start gap-4 text-sm">
                  <div className="mt-1 p-1 bg-amber-500/20 rounded-full text-amber-400"><ChevronRight size={14} /></div>
                  <p className="text-zinc-300">匹配 <span className="text-white font-bold">花色</span> 或 <span className="text-white font-bold">点数</span> 出牌</p>
                </div>
                <div className="flex items-start gap-4 text-sm">
                  <div className="mt-1 p-1 bg-amber-500/20 rounded-full text-amber-400"><ChevronRight size={14} /></div>
                  <p className="text-zinc-300"><span className="text-amber-400 font-bold">数字 8</span> 是万能牌，可改花色</p>
                </div>
              </div>

              <button 
                onClick={startNewGame}
                className="w-full py-5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xl rounded-2xl transition-all shadow-[0_10px_40px_rgba(245,158,11,0.3)] flex items-center justify-center gap-3 group active:scale-95"
              >
                立即发牌
                <ChevronRight size={24} className="group-hover:translate-x-2 transition-transform" />
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* Suit Selector */}
        {showSuitSelector && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center shadow-2xl max-w-sm w-full"
            >
              <h3 className="text-2xl font-bold text-white mb-2">万能 8 点!</h3>
              <p className="text-zinc-400 mb-8">请选择新的花色</p>
              
              <div className="grid grid-cols-2 gap-4">
                {(['hearts', 'diamonds', 'clubs', 'spades'] as Suit[]).map((suit) => {
                  const suitNames: Record<Suit, string> = { hearts: '红心', diamonds: '方块', clubs: '梅花', spades: '黑桃' };
                  return (
                    <button
                      key={suit}
                      onClick={() => handleSuitSelection(suit)}
                      className="flex flex-col items-center justify-center p-6 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-2xl transition-all group"
                    >
                      <span className={`text-4xl mb-2 group-hover:scale-125 transition-transform ${getSuitColor(suit)}`}>
                        {getSuitSymbol(suit)}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">{suitNames[suit]}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Game Over */}
        {gameState.status === 'game_over' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/90 backdrop-blur-md p-6"
          >
            <motion.div 
              initial={{ scale: 0.8, rotate: -5 }}
              animate={{ scale: 1, rotate: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-10 text-center shadow-2xl max-w-md w-full relative overflow-hidden"
            >
              {/* Decorative elements */}
              <div className="absolute top-0 left-0 w-full h-2 bg-amber-500" />
              
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${
                gameState.winner === 'player' ? 'bg-amber-500/20 text-amber-500' : 'bg-red-500/20 text-red-500'
              }`}>
                {gameState.winner === 'player' ? <Trophy size={48} /> : <RotateCcw size={48} />}
              </div>

              <h2 className="text-4xl font-extrabold font-display text-white mb-2">
                {gameState.winner === 'player' ? '胜利!' : '失败'}
              </h2>
              <p className="text-zinc-400 mb-10 text-lg">{gameState.lastAction}</p>

              <button 
                onClick={startNewGame}
                className="w-full py-4 bg-white text-zinc-950 font-bold rounded-xl hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 shadow-xl"
              >
                再玩一次
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer / Status */}
      <footer className="w-full max-w-5xl flex justify-between items-center z-10 text-amber-200/40 text-[10px] font-bold uppercase tracking-[0.2em] mt-4">
        <div className="flex items-center gap-4">
          <span>牌堆: {gameState.drawPile.length}</span>
          <span>弃牌: {gameState.discardPile.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <Info size={12} />
          <span>规则: 标准疯狂 8 点</span>
        </div>
      </footer>
    </div>
  );
}
