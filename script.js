const video   = document.getElementById('camera');
const status  = document.getElementById('status');
const info    = document.getElementById('info');
const overlay = document.getElementById('hidden-overlay');

let siteHidden = false;

const hands = new Hands({
  locateFile: (file) =>
    https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.5
});

hands.onResults(onResults);

const camera = new Camera(video, {
  onFrame: async () => {
    await hands.send({ image: video });
  },
  width: 640,
  height: 480
});
camera.start();

function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function isHandOpen(lm) {
  const wrist = lm[0];
  const tips  = [8, 12, 16, 20];
  const pips  = [6, 10, 14, 18];
  let extended = 0;
  for (let i = 0; i < tips.length; i++) {
    if (distance(lm[tips[i]], wrist) > distance(lm[pips[i]], wrist)) {
      extended++;
    }
  }
  return extended >= 3;
}

function isThumbAndIndexClosed(lm) {
  const wrist = lm[0];
  const indexFolded =
    distance(lm[8], wrist) < distance(lm[6], wrist);
  const palmSize    = distance(lm[0], lm[5]);
  const thumbFolded = distance(lm[4], lm[5]) < palmSize * 0.6;
  return indexFolded && thumbFolded;
}

function isThumbsUp(lm) {
  // Pouce tendu vers le haut : bout (4) au-dessus de la base (2)
  const thumbUp = lm[4].y < lm[2].y - 0.05;

  // Les 4 autres doigts repliés
  const wrist = lm[0];
  const tips  = [8, 12, 16, 20];
  const pips  = [6, 10, 14, 18];
  let folded = 0;
  for (let i = 0; i < tips.length; i++) {
    if (distance(lm[tips[i]], wrist) < distance(lm[pips[i]], wrist)) {
      folded++;
    }
  }
  return thumbUp && folded >= 3;
}

function hideSite() {
  if (!siteHidden) {
    siteHidden = true;
    overlay.classList.add('visible');
    Array.from(document.body.children).forEach(el => {
      if (!['camera', 'status', 'hidden-overlay'].includes(el.id)) {
        el.style.visibility = 'hidden';
        el.style.opacity    = '0';
      }
    });
  }
}

function showSite() {
  if (siteHidden) {
    siteHidden = false;
    overlay.classList.remove('visible');
    Array.from(document.body.children).forEach(el => {
      if (!['camera', 'status', 'hidden-overlay'].includes(el.id)) {
        el.style.visibility = '';
        el.style.opacity    = '';
      }
    });
  }
}

function onResults(results) {
  if (!results.multiHandLandmarks ||
      results.multiHandLandmarks.length === 0) {
    status.textContent = '🙈 Aucune main';
    return;
  }

  const lm = results.multiHandLandmarks[0];

  if (isThumbsUp(lm)) {
    status.textContent = '👍 Pouce levé — site masqué !';
    hideSite();
    return;
  }

  if (isHandOpen(lm)) {
    showSite();
    info.style.display = 'flex';
    status.textContent = '✋ Main ouverte';
    return;
  }

  info.style.display = 'none';

  if (isThumbAndIndexClosed(lm)) {
    const y = lm[0].y;
    if (y < 0.4) {
      status.textContent = '🤏⬆️ Scroll haut';
      window.scrollBy({ top: -20, behavior: 'auto' });
    } else if (y > 0.6) {
      status.textContent = '🤏⬇️ Scroll bas';
      window.scrollBy({ top: 20, behavior: 'auto' });
    } else {
      status.textContent = '🤏 Zone morte';
    }
  } else {
    status.textContent = '✊ Main fermée';
  }
}