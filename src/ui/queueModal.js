// UI: Queue & Up Next Sheet Modal with Loading Shimmer & Unnumbered Rows
import { Icons } from './icons.js';
import { DEFAULT_FALLBACK_COVER } from '../data/samples.js';

export function renderQueueModal(container, { audioEngine, onSelectTrack }) {
  let isOpen = false;
  let isLoading = false;

  function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  function renderList() {
    const currentTrack = audioEngine.currentTrack;
    const queue = audioEngine.queue || [];
    const currentIndex = audioEngine.queueIndex || 0;
    const upNext = queue.slice(currentIndex + 1);

    return `
      <div class="queue-sheet-overlay ${isOpen ? 'active open' : ''}" id="queue-sheet-overlay">
        <div class="queue-sheet-modal" id="queue-sheet-content">
          <!-- Grab handle -->
          <div class="queue-grab-bar"></div>

          <!-- Header -->
          <div class="queue-header">
            <div class="queue-header-left">
              <span class="queue-title">Playing Queue</span>
              <span class="queue-count">${queue.length} tracks</span>
            </div>
            <div class="queue-header-actions">
              <button class="queue-clear-btn" id="btn-queue-clear" title="Clear upcoming queue">
                Clear
              </button>
              <button class="btn-circle-nav" id="btn-queue-close" title="Close Queue">
                ${Icons.close(18)}
              </button>
            </div>
          </div>

          <!-- Scrollable Body -->
          <div class="queue-body">
            ${isLoading ? `
              <!-- Micro-loading Skeleton -->
              <div class="queue-section-label">NOW PLAYING</div>
              <div class="queue-track-row melo-skeleton" style="height: 56px; border: none; margin-bottom: 10px;"></div>

              <div class="queue-section-label">UP NEXT</div>
              <div class="queue-track-row melo-skeleton" style="height: 52px; border: none; margin-bottom: 8px;"></div>
              <div class="queue-track-row melo-skeleton" style="height: 52px; border: none; margin-bottom: 8px;"></div>
              <div class="queue-track-row melo-skeleton" style="height: 52px; border: none; margin-bottom: 8px;"></div>
              <div class="queue-track-row melo-skeleton" style="height: 52px; border: none; margin-bottom: 8px;"></div>
            ` : `
              <!-- Currently Playing Item -->
              ${currentTrack ? `
                <div class="queue-section-label">NOW PLAYING</div>
                <div class="queue-track-row now-playing playlist-content-fade">
                  <div class="queue-thumb-wrap">
                    <img src="${currentTrack.cover || DEFAULT_FALLBACK_COVER}" alt="${currentTrack.title}" class="queue-thumb" />
                    <div class="queue-now-playing-bars">
                      <span></span><span></span><span></span>
                    </div>
                  </div>
                  <div class="queue-track-info">
                    <span class="queue-track-title">${currentTrack.title}</span>
                    <span class="queue-track-artist">${currentTrack.artist}</span>
                  </div>
                  <span class="queue-track-duration">${formatTime(currentTrack.duration)}</span>
                </div>
              ` : ''}

              <!-- Up Next Section (Unnumbered) -->
              <div class="queue-section-label">UP NEXT (${upNext.length})</div>
              ${upNext.length === 0 ? `
                <div class="queue-empty-state playlist-content-fade">
                  ${Icons.music(32)}
                  <p>No more tracks in queue</p>
                  <span style="font-size: 12px; color: var(--text-secondary);">Add songs from home or playlists</span>
                </div>
              ` : `
                <div class="queue-tracks-list playlist-content-fade">
                  ${upNext.map((track, i) => {
                    const actualIdx = currentIndex + 1 + i;
                    return `
                      <div class="queue-track-row" data-index="${actualIdx}">
                        <img src="${track.cover || DEFAULT_FALLBACK_COVER}" alt="${track.title}" class="queue-thumb" />
                        <div class="queue-track-info">
                          <span class="queue-track-title">${track.title}</span>
                          <span class="queue-track-artist">${track.artist}</span>
                        </div>
                        <span class="queue-track-duration">${formatTime(track.duration)}</span>
                        <button class="btn-queue-remove" data-remove-index="${actualIdx}" title="Remove from queue">
                          ${Icons.close(14)}
                        </button>
                      </div>
                    `;
                  }).join('')}
                </div>
              `}
            `}
          </div>
        </div>
      </div>
    `;
  }

  function update() {
    container.innerHTML = renderList();
    bindEvents();
    const overlay = container.querySelector('#queue-sheet-overlay');
    if (overlay) {
      overlay.classList.toggle('active', isOpen);
      overlay.classList.toggle('open', isOpen);
    }
  }

  function bindEvents() {
    const overlay = container.querySelector('#queue-sheet-overlay');
    const closeBtn = container.querySelector('#btn-queue-close');
    const clearBtn = container.querySelector('#btn-queue-clear');

    closeBtn?.addEventListener('click', () => close());
    overlay?.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    clearBtn?.addEventListener('click', () => {
      if (audioEngine.queue.length > 1) {
        audioEngine.queue = [audioEngine.currentTrack];
        audioEngine.queueIndex = 0;
        audioEngine.notify('queueChange', { queue: audioEngine.queue });
        update();
      }
    });

    container.querySelectorAll('.queue-track-row:not(.now-playing)').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.btn-queue-remove')) return;
        const index = parseInt(row.dataset.index, 10);
        if (!isNaN(index) && audioEngine.queue[index]) {
          audioEngine.playTrackAtIndex(index);
          update();
        }
      });
    });

    container.querySelectorAll('.btn-queue-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const removeIdx = parseInt(btn.dataset.removeIndex, 10);
        if (!isNaN(removeIdx) && audioEngine.queue[removeIdx]) {
          audioEngine.queue.splice(removeIdx, 1);
          audioEngine.notify('queueChange', { queue: audioEngine.queue });
          update();
        }
      });
    });
  }

  function open() {
    isOpen = true;
    isLoading = true;
    update();

    setTimeout(() => {
      container.querySelector('#queue-sheet-overlay')?.classList.add('active');
      container.querySelector('#queue-sheet-overlay')?.classList.add('open');
    }, 10);

    // Let it load a bit smoothly before rendering tracks
    setTimeout(() => {
      if (isOpen) {
        isLoading = false;
        update();
      }
    }, 380);
  }

  function close() {
    isOpen = false;
    isLoading = false;
    const overlay = container.querySelector('#queue-sheet-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      overlay.classList.remove('open');
      setTimeout(() => {
        if (!isOpen) container.innerHTML = '';
      }, 350);
    }
  }

  // Subscribe to audio engine changes
  audioEngine.subscribe('trackChange', () => {
    if (isOpen && !isLoading) update();
  });
  audioEngine.subscribe('queueChange', () => {
    if (isOpen && !isLoading) update();
  });

  return {
    open,
    close,
    isOpen: () => isOpen
  };
}
