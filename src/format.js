export function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  if (totalSec < 60) {
    return `${totalSec} sec`;
  }
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min} min. ${sec} sec.`;
}
