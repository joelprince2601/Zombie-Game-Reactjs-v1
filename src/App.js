import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

function App() {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('menu');
  const [difficultyLevel, setDifficultyLevel] = useState('normal');
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [waveStartTime, setWaveStartTime] = useState(null);

  const [player, setPlayer] = useState({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    radius: 20,
    health: 100,
    maxHealth: 100,
    ammo: 50,
    maxAmmo: 50,
    score: 0,
    level: 1,
    killCount: 0,
    powerups: []
  });

  const [zombies, setZombies] = useState([]);
  const [bullets, setBullets] = useState([]);
  const [effects, setEffects] = useState([]);
  const [wave, setWave] = useState(1);
  const [powerups, setPowerups] = useState([]);
  const [lastShot, setLastShot] = useState(0);

  class Zombie {
    constructor(wave) {
      this.id = Date.now() + Math.random();
      this.spawnPosition = this.getSpawnPosition();
      this.x = this.spawnPosition.x;
      this.y = this.spawnPosition.y;
      this.radius = 25;
      this.baseSpeed = 2 + (wave * 0.2);
      this.speed = this.baseSpeed;
      this.health = 50 + (wave * 10);
      this.maxHealth = this.health;
      this.damage = 10 + (wave * 2);
      this.type = this.generateZombieType(wave);
      this.animation = 0;
      this.lastAttack = 0;
      this.stunned = false;
    }

    generateZombieType(wave) {
      const types = [
        {
          name: 'regular',
          color: '#2ecc71',
          speedMod: 1,
          healthMod: 1,
          damageMod: 1
        },
        {
          name: 'runner',
          color: '#e74c3c',
          speedMod: 1.5,
          healthMod: 0.7,
          damageMod: 0.8
        },
        {
          name: 'tank',
          color: '#8e44ad',
          speedMod: 0.7,
          healthMod: 2,
          damageMod: 1.5
        }
      ];

      const availableTypes = types.slice(0, Math.min(Math.floor(wave/3) + 1, types.length));
      return availableTypes[Math.floor(Math.random() * availableTypes.length)];
    }

    getSpawnPosition() {
      const side = Math.floor(Math.random() * 4);
      const padding = 100;
      
      switch(side) {
        case 0: // Top
          return { x: Math.random() * window.innerWidth, y: -padding };
        case 1: // Right
          return { x: window.innerWidth + padding, y: Math.random() * window.innerHeight };
        case 2: // Bottom
          return { x: Math.random() * window.innerWidth, y: window.innerHeight + padding };
        case 3: // Left
        default:
          return { x: -padding, y: Math.random() * window.innerHeight };
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.beginPath();
      ctx.fillStyle = this.type.color;
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();

      // Draw health bar
      const healthBarWidth = this.radius * 2;
      const healthBarHeight = 5;
      const healthPercent = this.health / this.maxHealth;
      ctx.fillStyle = 'red';
      ctx.fillRect(this.x - healthBarWidth/2, this.y - this.radius - 10, healthBarWidth, healthBarHeight);
      ctx.fillStyle = 'lime';
      ctx.fillRect(this.x - healthBarWidth/2, this.y - this.radius - 10, healthBarWidth * healthPercent, healthBarHeight);

      // Draw zombie face
      const eyeRadius = this.radius * 0.2;
      ctx.fillStyle = 'red';
      ctx.beginPath();
      ctx.arc(this.x - this.radius * 0.3, this.y - this.radius * 0.2, eyeRadius, 0, Math.PI * 2);
      ctx.arc(this.x + this.radius * 0.3, this.y - this.radius * 0.2, eyeRadius, 0, Math.PI * 2);
      ctx.fill();

      // Draw zombie mouth
      ctx.beginPath();
      ctx.strokeStyle = 'darkred';
      ctx.lineWidth = 3;
      ctx.arc(this.x, this.y + this.radius * 0.1, this.radius * 0.4, 0, Math.PI);
      ctx.stroke();

      // Add type indicator
      ctx.fillStyle = 'white';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(this.type.name, this.x, this.y - this.radius - 15);
      
      ctx.restore();
    }

    move(playerX, playerY) {
      if (this.stunned) return;

      const angle = Math.atan2(playerY - this.y, playerX - this.x);
      this.x += Math.cos(angle) * this.speed * this.type.speedMod;
      this.y += Math.sin(angle) * this.speed * this.type.speedMod;
      this.animation = (this.animation + 0.1) % (Math.PI * 2);
    }
  }

  const startGame = useCallback(() => {
    setGameState('playing');
    setWaveStartTime(Date.now());
    spawnWave();
  }, []);

  const movePlayer = useCallback((e) => {
    setLastMousePos({ x: e.clientX, y: e.clientY });
    setPlayer(prev => ({
      ...prev,
      x: e.clientX,
      y: e.clientY
    }));
  }, []);

  const shoot = useCallback(() => {
    if (player.ammo <= 0 || Date.now() - lastShot < 250) return;

    const angle = Math.atan2(lastMousePos.y - player.y, lastMousePos.x - player.x);
    const speed = 10;
    const bullet = {
      x: player.x,
      y: player.y,
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed,
      damage: 25
    };

    setBullets(prev => [...prev, bullet]);
    setPlayer(prev => ({ ...prev, ammo: prev.ammo - 1 }));
    setLastShot(Date.now());
  }, [lastMousePos, player, lastShot]);

  const applyPowerup = useCallback((powerup) => {
    setPlayer(prev => {
      if (powerup.type === 'health') {
        return { ...prev, health: Math.min(prev.health + 25, prev.maxHealth) };
      } else {
        return { ...prev, ammo: Math.min(prev.ammo + 25, prev.maxAmmo) };
      }
    });
  }, []);

  const spawnWave = useCallback(() => {
    const zombieCount = Math.floor(5 + wave * 1.5);
    const newZombies = Array(zombieCount).fill(null).map(() => new Zombie(wave));
    setZombies(newZombies);
  }, [wave]);

  const checkWaveProgress = useCallback(() => {
    if (zombies.length === 0) {
      setWave(prev => prev + 1);
      setWaveStartTime(Date.now());
      spawnWave();
    }
  }, [zombies.length, spawnWave]);

  const drawGrid = useCallback((ctx) => {
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    const gridSize = 50;

    for (let x = 0; x < ctx.canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, ctx.canvas.height);
      ctx.stroke();
    }

    for (let y = 0; y < ctx.canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(ctx.canvas.width, y);
      ctx.stroke();
    }
  }, []);

  const drawPlayer = useCallback((ctx) => {
    ctx.save();
    
    // Draw player body
    ctx.beginPath();
    ctx.fillStyle = '#3498db';
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw player health bar
    const healthBarWidth = player.radius * 2;
    const healthBarHeight = 8;
    const healthPercent = player.health / player.maxHealth;
    ctx.fillStyle = 'red';
    ctx.fillRect(player.x - healthBarWidth/2, player.y - player.radius - 15, healthBarWidth, healthBarHeight);
    ctx.fillStyle = 'lime';
    ctx.fillRect(player.x - healthBarWidth/2, player.y - player.radius - 15, healthBarWidth * healthPercent, healthBarHeight);

    // Draw weapon
    const angle = Math.atan2(lastMousePos.y - player.y, lastMousePos.x - player.x);
    ctx.translate(player.x, player.y);
    ctx.rotate(angle);
    ctx.fillStyle = '#666';
    ctx.fillRect(player.radius - 5, -5, 20, 10);
    
    ctx.restore();
  }, [player, lastMousePos]);

  const updateZombies = useCallback((ctx) => {
    setZombies(prevZombies => {
      prevZombies.forEach(zombie => {
        zombie.move(player.x, player.y);
        zombie.draw(ctx);
      });
      return prevZombies;
    });
  }, [player.x, player.y]);

  const drawHUD = useCallback((ctx) => {
    ctx.save();
    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px Arial';
    
    // Score and wave info
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${player.score}`, 20, 30);
    ctx.fillText(`Wave ${wave}`, 20, 60);
    ctx.fillText(`Zombies: ${zombies.length}`, 20, 90);

    // Ammo counter
    ctx.textAlign = 'right';
    ctx.fillText(`Ammo: ${player.ammo}/${player.maxAmmo}`, ctx.canvas.width - 20, 30);
    
    // Kill count and level
    ctx.fillText(`Kills: ${player.killCount}`, ctx.canvas.width - 20, 60);
    ctx.fillText(`Level: ${player.level}`, ctx.canvas.width - 20, 90);

    // Wave announcement
    if (waveStartTime && Date.now() - waveStartTime < 3000) {
      ctx.textAlign = 'center';
      ctx.font = 'bold 40px Arial';
      ctx.fillStyle = `rgba(255, 255, 255, ${1 - (Date.now() - waveStartTime) / 3000})`;
      ctx.fillText(`Wave ${wave}`, ctx.canvas.width/2, ctx.canvas.height/2);
    }

    ctx.restore();
  }, [player, wave, zombies.length, waveStartTime]);

  const updateBullets = useCallback((ctx) => {
    setBullets(prev => {
      const updatedBullets = prev.filter(bullet => {
        bullet.x += bullet.dx;
        bullet.y += bullet.dy;

        // Draw bullet
        ctx.beginPath();
        ctx.fillStyle = '#ff0';
        ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
        ctx.fill();

        // Check if bullet is off screen
        return !(bullet.x < 0 || bullet.x > window.innerWidth ||
                bullet.y < 0 || bullet.y > window.innerHeight);
      });

      return updatedBullets;
    });
  }, []);

  const updateEffects = useCallback((ctx) => {
    setEffects(prev => {
      return prev.filter(effect => {
        effect.lifetime -= 16;
        if (effect.lifetime <= 0) return false;

        ctx.fillStyle = `rgba(${effect.color}, ${effect.lifetime / effect.maxLifetime})`;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
        ctx.fill();

        return true;
      });
    });
  }, []);

  const updatePowerups = useCallback((ctx) => {
    setPowerups(prev => {
      return prev.filter(powerup => {
        // Draw powerup
        ctx.beginPath();
        ctx.fillStyle = powerup.type === 'health' ? '#2ecc71' : '#f1c40f';
        ctx.arc(powerup.x, powerup.y, 10, 0, Math.PI * 2);
        ctx.fill();

        // Check collision with player
        const dx = powerup.x - player.x;
        const dy = powerup.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < player.radius + 10) {
          applyPowerup(powerup);
          return false;
        }

        return true;
      });
    });
  }, [player, applyPowerup]);

  const StartMenu = () => (
    <div className="menu">
      <h1>ZOMBIE SHOOTER</h1>
      <div className="difficulty-select">
        <button 
          className={difficultyLevel === 'easy' ? 'selected' : ''} 
          onClick={() => setDifficultyLevel('easy')}
        >
          Easy
        </button>
        <button 
          className={difficultyLevel === 'normal' ? 'selected' : ''} 
          onClick={() => setDifficultyLevel('normal')}
        >
          Normal
        </button>
        <button 
          className={difficultyLevel === 'hard' ? 'selected' : ''} 
          onClick={() => setDifficultyLevel('hard')}
        >
          Hard
        </button>
      </div>
      <button className="start-button" onClick={startGame}>Start Game</button>
    </div>
  );

  const PauseMenu = () => (
    <div className="menu pause-menu">
      <h2>Game Paused</h2>
      <button onClick={() => setGameState('playing')}>Resume</button>
      <button onClick={() => setGameState('menu')}>Main Menu</button>
    </div>
  );
  
  const GameOverScreen = () => (
    <div className="menu game-over">
      <h2>Game Over</h2>
      <p>Score: {player.score}</p>
      <p>Waves Survived: {wave - 1}</p>
      <p>Zombies Killed: {player.killCount}</p>
      <button onClick={() => setGameState('menu')}>Main Menu</button>
    </div>
  );
  
  // Handle keyboard events
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Escape') {
        setGameState(prev => prev === 'playing' ? 'paused' : 'playing');
      }
      if (e.key === 'r' && player.ammo === 0) {
        setPlayer(prev => ({ ...prev, ammo: prev.maxAmmo }));
      }
    };
  
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [player.ammo]);
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
  
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Collision detection
  useEffect(() => {
    if (gameState !== 'playing') return;
  
    // Bullet-zombie collisions
    bullets.forEach((bullet, bulletIndex) => {
      zombies.forEach((zombie, zombieIndex) => {
        const dx = bullet.x - zombie.x;
        const dy = bullet.y - zombie.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
  
        if (distance < zombie.radius) {
          // Remove bullet
          setBullets(prev => prev.filter((_, index) => index !== bulletIndex));
  
          // Damage zombie
          zombie.health -= bullet.damage;
          if (zombie.health <= 0) {
            setZombies(prev => prev.filter((_, index) => index !== zombieIndex));
            setPlayer(prev => ({
              ...prev,
              score: prev.score + 100,
              killCount: prev.killCount + 1
            }));
  
            // Spawn powerup with 20% chance
            if (Math.random() < 0.2) {
              setPowerups(prev => [...prev, {
                x: zombie.x,
                y: zombie.y,
                type: Math.random() < 0.5 ? 'health' : 'ammo'
              }]);
            }
          }
  
          // Add hit effect
          setEffects(prev => [...prev, {
            x: bullet.x,
            y: bullet.y,
            radius: 5,
            color: '255, 255, 0',
            lifetime: 200,
            maxLifetime: 200
          }]);
        }
      });
    });
  
    // Player-zombie collisions
    zombies.forEach(zombie => {
      const dx = player.x - zombie.x;
      const dy = player.y - zombie.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
  
      if (distance < player.radius + zombie.radius && Date.now() - zombie.lastAttack > 1000) {
        setPlayer(prev => {
          const newHealth = prev.health - zombie.damage;
          if (newHealth <= 0) {
            setGameState('gameOver');
          }
          return { ...prev, health: newHealth };
        });
  
        zombie.lastAttack = Date.now();
  
        // Add hit effect
        setEffects(prev => [...prev, {
          x: player.x,
          y: player.y,
          radius: 20,
          color: '255, 0, 0',
          lifetime: 300,
          maxLifetime: 300
        }]);
      }
    });
  }, [gameState, bullets, zombies, player]);
  
  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;
  
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  
    const gameLoop = setInterval(() => {
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      drawGrid(ctx);
      drawPlayer(ctx);
      updateZombies(ctx);
      updateBullets(ctx);
      updateEffects(ctx);
      updatePowerups(ctx);
      drawHUD(ctx);
      checkWaveProgress();
    }, 1000 / 60);
  
    return () => clearInterval(gameLoop);
  }, [
    gameState, 
    drawGrid, 
    drawPlayer, 
    updateZombies, 
    updateBullets, 
    updateEffects, 
    updatePowerups,
    drawHUD,
    checkWaveProgress
  ]);
  
  return (
    <div className="game-container">
      {gameState === 'menu' && <StartMenu />}
      {gameState === 'playing' && (
        <canvas 
          ref={canvasRef}
          className="game-canvas"
          onMouseMove={movePlayer}
          onClick={shoot}
        />
      )}
      {gameState === 'paused' && <PauseMenu />}
      {gameState === 'gameOver' && <GameOverScreen />}
    </div>
  );
  }
  
  export default App;