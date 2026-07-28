const sounds = {
  click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  win: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
  hover: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
  success: 'https://assets.mixkit.co/active_storage/sfx/592/592-preview.mp3',
  notification: 'https://assets.mixkit.co/active_storage/sfx/2357/2357-preview.mp3',
  open: "https://assets.mixkit.co/active_storage/sfx/1103/1103-preview.mp3",
  shake: "https://assets.mixkit.co/active_storage/sfx/2012/2012-preview.mp3",
  tick: "https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3",
  reveal: "https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3",
};

export const playSound = (soundName: keyof typeof sounds) => {
  const audio = new Audio(sounds[soundName]);
  audio.volume = 0.3;
  audio.play().catch(err => console.log('Audio play failed:', err));
};

export const hapticFeedback = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate(10);
  }
};