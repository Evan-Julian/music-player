document.addEventListener("DOMContentLoaded", function () {
  const dynamicContentArea = document.getElementById("dynamic-content-area");

  let audioPlayer = new Audio();
  let playerVisualizerCanvas = null;
  let playerCanvasCtx = null;

  const footerPlayer = document.querySelector(".music-player-footer");
  const playPauseBtn = footerPlayer.querySelector(".play-pause-btn");
  const playPauseIcon = playPauseBtn.querySelector("i");
  const prevBtn = footerPlayer.querySelector(
    ".player-controls button:nth-child(1)"
  );
  const nextBtn = footerPlayer.querySelector(
    ".player-controls button:nth-child(3)"
  );

  const currentTrackName = footerPlayer.querySelector(".current-track-name");
  const currentArtist = footerPlayer.querySelector(".current-artist");
  const playerCover = footerPlayer.querySelector(".player-cover");
  const progressBarFill = footerPlayer.querySelector(".progress-fill");
  const progressTrack = footerPlayer.querySelector(".progress-track");
  const currentTimeDisplay = footerPlayer.querySelector(".current-time");
  const totalTimeDisplay = footerPlayer.querySelector(".total-time");
  const volumeSlider = footerPlayer.querySelector(".volume-slider input");

  const volumeControlContainer = footerPlayer.querySelector(".volume-controls");
  const volumePercentageDisplay = document.createElement("div");
  volumePercentageDisplay.classList.add("volume-percentage-display");
  volumePercentageDisplay.style.cssText = `
    position: absolute;
    bottom: calc(100% + 5px);
    left: 50%;
    transform: translateX(-50%);
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.8em;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease-in-out;
    z-index: 201;
  `;
  volumeControlContainer.style.position = "relative";
  volumeControlContainer.appendChild(volumePercentageDisplay);
  let volumeDisplayTimeout;

  const loopBtn = footerPlayer.querySelector("#loopBtn");
  const shuffleBtn = footerPlayer.querySelector("#shuffleBtn");

  const playbackSpeedBtn = footerPlayer.querySelector("#playbackSpeedBtn");
  const playbackSpeedDisplay = playbackSpeedBtn.querySelector(
    ".playback-speed-display"
  );

  const hamburgerMenu = document.getElementById("hamburgerMenu");
  const sidebar = document.querySelector(".sidebar");
  const body = document.body;

  const visualizerCanvas = document.getElementById("visualizerCanvas");
  const canvasCtx = visualizerCanvas ? visualizerCanvas.getContext("2d") : null;

  const toastContainer = document.getElementById("toastContainer");

  const searchInput = document.querySelector(".navbar .search-bar input");
  const searchButton = document.querySelector(".navbar .search-bar button");

  const queueSidepanel = document.getElementById("queueSidepanel");
  const closeQueueBtn = document.getElementById("closeQueueBtn");
  const queueListContainer = document.getElementById("queueList");
  const viewQueueBtn = footerPlayer.querySelector("#viewQueueBtn");
  const saveQueueAsPlaylistBtn = document.getElementById(
    "saveQueueAsPlaylistBtn"
  );
  const fullscreenBtn = footerPlayer.querySelector("#fullscreenBtn");

  const toggleMiniPlayerBtn = footerPlayer.querySelector(
    "#toggleMiniPlayerBtn"
  );
  let isMiniPlayerMode = false;

  let allSongs = [];
  let currentSongIndex = -1;
  let currentQueue = [];
  let isLooping = false;
  let isShuffling = false;
  let shuffleQueue = [];
  let playedSongs = [];
  let previousVolume = 70;
  let currentPlaybackSpeed = 1.0;
  const playbackSpeeds = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

  let audioContext;
  let analyser;
  let sourceNode;
  let bufferLength;
  let dataArray;
  let animationFrameId;

  let currentVisualizerType = localStorage.getItem("visualizerType") || "bars";

  // --- Utility Functions ---
  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const formattedMinutes = String(minutes).padStart(2, "0");
    const formattedSeconds = String(remainingSeconds).padStart(2, "0");
    return `${formattedMinutes}:${formattedSeconds}`;
  }

  function showToast(message, duration = 3000) {
    if (!toastContainer) return;
    const toast = document.createElement("div");
    toast.classList.add("toast-message");
    toast.textContent = message;
    toastContainer.appendChild(toast);
    void toast.offsetWidth;
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
      toast.classList.add("hide");
      toast.addEventListener(
        "animationend",
        () => {
          toast.remove();
        },
        { once: true }
      );
    }, duration);
  }

  // --- Audio Context and Visualizer ---
  function setupAudioContext() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      bufferLength = analyser.frequencyBinCount;
      dataArray = new Uint8Array(bufferLength);
      if (!sourceNode) {
        sourceNode = audioContext.createMediaElementSource(audioPlayer);
        sourceNode.connect(analyser);
        analyser.connect(audioContext.destination);
      }
    }
  }

  function drawVisualizerType(ctx, canvas, type, scale = 1) {
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = "rgba(0, 0, 0, 0)";
    const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    gradient.addColorStop(0, "#7f5af0");
    gradient.addColorStop(0.5, "#8d70f5");
    gradient.addColorStop(1, "#a18af7");
    analyser.getByteFrequencyData(dataArray);
    switch (type) {
      case "bars":
        ctx.lineCap = "round";
        const barWidth = (canvasWidth / bufferLength) * 2.5;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          let barHeight = (dataArray[i] / 2) * scale;
          barHeight = Math.max(1, barHeight);
          ctx.fillStyle = gradient;
          ctx.fillRect(x, canvasHeight - barHeight, barWidth, barHeight);
          if (barHeight > canvasHeight / 3) {
            ctx.shadowColor = "rgba(127, 90, 240, 0.6)";
            ctx.shadowBlur = barHeight / 20;
          } else {
            ctx.shadowBlur = 0;
          }
          x += barWidth + 1;
        }
        ctx.shadowBlur = 0;
        break;
      case "waves":
        ctx.lineWidth = 2;
        ctx.strokeStyle = gradient;
        ctx.beginPath();
        const sliceWidth = (canvasWidth * 1.0) / bufferLength;
        x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * canvasHeight) / 2;
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }
        ctx.lineTo(canvasWidth, canvasHeight / 2);
        ctx.stroke();
        break;
      case "circles":
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        const maxRadius = Math.min(centerX, centerY) * 0.8;
        for (let i = 0; i < bufferLength; i++) {
          const percent = dataArray[i] / 255;
          const radius = maxRadius * percent * scale;
          const hue = (i / bufferLength) * 360;
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
          ctx.strokeStyle = `hsl(${hue}, 100%, 70%)`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        break;
      default:
        drawVisualizerType(ctx, canvas, "bars", scale);
        break;
    }
  }

  function drawVisualizer() {
    if (visualizerCanvas && canvasCtx) {
      visualizerCanvas.width = visualizerCanvas.offsetWidth;
      visualizerCanvas.height = visualizerCanvas.offsetHeight;
    }
    if (playerVisualizerCanvas && playerCanvasCtx) {
      playerVisualizerCanvas.width = playerVisualizerCanvas.offsetWidth;
      playerVisualizerCanvas.height = playerVisualizerCanvas.offsetHeight;
    }
    if (!analyser || audioPlayer.paused) {
      animationFrameId = requestAnimationFrame(drawVisualizer);
      return;
    }
    if (canvasCtx) {
      drawVisualizerType(canvasCtx, visualizerCanvas, "bars", 0.8);
    }
    if (playerCanvasCtx) {
      drawVisualizerType(
        playerCanvasCtx,
        playerVisualizerCanvas,
        currentVisualizerType,
        1.5
      );
    }
    animationFrameId = requestAnimationFrame(drawVisualizer);
  }

  // --- Song Loading & Playback ---
  async function loadSongsData() {
    try {
      const response = await fetch("/api/songs");
      if (!response.ok) throw new Error("Failed to fetch songs");
      allSongs = await response.json();
      console.log("Songs data loaded for player:", allSongs);
      const savedVolume = localStorage.getItem("musicPlayerVolume");
      if (savedVolume !== null) {
        volumeSlider.value = savedVolume;
        audioPlayer.volume = savedVolume / 100;
        previousVolume = savedVolume;
      } else {
        volumeSlider.value = 70;
        audioPlayer.volume = 70 / 100;
        localStorage.setItem("musicPlayerVolume", 70);
        previousVolume = 70;
      }
      const savedSpeed = localStorage.getItem("musicPlayerSpeed");
      if (savedSpeed !== null) {
        currentPlaybackSpeed = parseFloat(savedSpeed);
        audioPlayer.playbackRate = currentPlaybackSpeed;
        if (playbackSpeedDisplay)
          playbackSpeedDisplay.textContent = `${currentPlaybackSpeed.toFixed(
            2
          )}x`;
      } else {
        localStorage.setItem("musicPlayerSpeed", currentPlaybackSpeed);
      }
      if (allSongs.length > 0 && currentSongIndex === -1) {
        const pathHash = window.location.hash;
        if (pathHash.startsWith("#play/")) {
          const songNameFromHash = decodeURIComponent(pathHash.substring(6));
          const foundSong = allSongs.find(
            (s) => s.name_no_ext === songNameFromHash
          );
          if (foundSong) {
            currentSongIndex = allSongs.indexOf(foundSong);
            await loadPlayerSongDetails(foundSong);
          }
        }
        if (currentSongIndex === -1 && allSongs.length > 0) {
          currentSongIndex = 0;
          await loadPlayerSongDetails(allSongs[currentSongIndex]);
        }
      } else if (allSongs.length > 0 && currentSongIndex !== -1) {
        await loadPlayerSongDetails(allSongs[currentSongIndex]);
      }
    } catch (error) {
      console.error("Error loading songs data for player:", error);
      currentTrackName.textContent = "No songs available";
      currentArtist.textContent = "";
    }
  }

  async function loadPlayerSongDetails(song) {
    if (!song || !song.name_no_ext) {
      console.error("Invalid song object for loadPlayerSongDetails:", song);
      return;
    }
    try {
      const response = await fetch(`/api/song_details/${song.name_no_ext}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const fullSongDetails = await response.json();
      audioPlayer.src = fullSongDetails.url;
      currentTrackName.textContent = fullSongDetails.title;
      currentArtist.textContent = fullSongDetails.artist;
      const coverPath = `/static/images/covers/${fullSongDetails.name_no_ext}.jpg`;
      const defaultCoverPath =
        "/static/images/covers/default_playlist_cover.jpg";
      const responseCover = await fetch(coverPath, { method: "HEAD" });
      if (responseCover.ok) {
        playerCover.src = coverPath;
      } else {
        playerCover.src = defaultCoverPath;
      }
      totalTimeDisplay.textContent = fullSongDetails.duration;
      currentTimeDisplay.textContent = "00:00";
      progressBarFill.style.width = "0%";
      const indexInAllSongs = allSongs.findIndex(
        (s) => s.name_no_ext === fullSongDetails.name_no_ext
      );
      if (indexInAllSongs !== -1) {
        currentSongIndex = indexInAllSongs;
      }
    } catch (error) {
      console.error("Error loading song details:", error);
      currentTrackName.textContent = "Error loading song";
      currentArtist.textContent = "Please try again";
      playerCover.src = "/static/images/covers/default_playlist_cover.jpg";
      totalTimeDisplay.textContent = "00:00";
    }
  }

  function playSong() {
    if (audioPlayer.src) {
      setupAudioContext();
      audioPlayer.play();
      if (audioContext.state === "suspended") {
        audioContext.resume();
      }
      playPauseIcon.classList.remove("fa-play");
      playPauseIcon.classList.add("fa-pause");
      drawVisualizer();
      showToast("Playing");
    } else {
      showToast("No song loaded to play.", "info");
    }
  }

  function pauseSong() {
    audioPlayer.pause();
    playPauseIcon.classList.remove("fa-pause");
    playPauseIcon.classList.add("fa-play");
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    showToast("Paused");
  }

  function togglePlayPause() {
    if (audioPlayer.paused) {
      playSong();
    } else {
      pauseSong();
    }
  }

  function playNextSong() {
    if (allSongs.length === 0) {
      showToast("No songs available to play.", "info");
      return;
    }
    let nextSongNoExt = null;
    if (isLooping) {
      nextSongNoExt = allSongs[currentSongIndex].name_no_ext;
    } else if (currentQueue.length > 0) {
      const currentSongInQueue = currentQueue.find(
        (s) => s.name_no_ext === allSongs[currentSongIndex].name_no_ext
      );
      const currentQueueIndex = currentQueue.indexOf(currentSongInQueue);
      if (
        currentQueueIndex !== -1 &&
        currentQueueIndex < currentQueue.length - 1
      ) {
        nextSongNoExt = currentQueue[currentQueueIndex + 1].name_no_ext;
      } else {
        if (isShuffling) {
          if (shuffleQueue.length === 0) {
            shuffleQueue = [...allSongs];
            if (currentSongIndex !== -1) {
              shuffleQueue = shuffleQueue.filter(
                (s) => s.name_no_ext !== allSongs[currentSongIndex].name_no_ext
              );
            }
            for (let i = shuffleQueue.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffleQueue[i], shuffleQueue[j]] = [
                shuffleQueue[j],
                shuffleQueue[i],
              ];
            }
            playedSongs = [];
          }
          nextSongNoExt = shuffleQueue.shift().name_no_ext;
        } else {
          currentSongIndex = (currentSongIndex + 1) % allSongs.length;
          nextSongNoExt = allSongs[currentSongIndex].name_no_ext;
        }
      }
    } else if (isShuffling) {
      if (shuffleQueue.length === 0) {
        shuffleQueue = [...allSongs];
        if (currentSongIndex !== -1) {
          shuffleQueue = shuffleQueue.filter(
            (s) => s.name_no_ext !== allSongs[currentSongIndex].name_no_ext
          );
        }
        for (let i = shuffleQueue.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffleQueue[i], shuffleQueue[j]] = [
            shuffleQueue[j],
            shuffleQueue[i],
          ];
        }
        playedSongs = [];
      }
      nextSongNoExt = shuffleQueue.shift().name_no_ext;
    } else {
      currentSongIndex = (currentSongIndex + 1) % allSongs.length;
      nextSongNoExt = allSongs[currentSongIndex].name_no_ext;
    }
    if (nextSongNoExt) {
      const nextSong = allSongs.find((s) => s.name_no_ext === nextSongNoExt);
      if (nextSong) {
        loadPlayerSongDetails(nextSong).then(() => {
          playSong();
          showToast("Next Song");
          updateQueueUI();
        });
      } else {
        console.error("Next song not found in allSongs:", nextSongNoExt);
        showToast("Next song not found.", "error");
      }
    } else {
      showToast("No more songs in queue or library.", "info");
      pauseSong();
    }
  }

  function playPrevSong() {
    if (allSongs.length === 0) return;
    if (audioPlayer.currentTime > 3) {
      audioPlayer.currentTime = 0;
      playSong();
      return;
    }
    let prevSongToPlay = null;
    if (currentQueue.length > 0) {
      const currentSongInQueue = currentQueue.find(
        (s) => s.name_no_ext === allSongs[currentSongIndex].name_no_ext
      );
      const currentQueueIndex = currentQueue.indexOf(currentSongInQueue);
      if (currentQueueIndex > 0) {
        prevSongToPlay = currentQueue[currentQueueIndex - 1];
      } else {
        if (isShuffling) {
          if (playedSongs.length > 1) {
            playedSongs.pop();
            prevSongToPlay = allSongs[playedSongs.pop()];
          } else {
            audioPlayer.currentTime = 0;
            playSong();
            return;
          }
        } else {
          currentSongIndex =
            (currentSongIndex - 1 + allSongs.length) % allSongs.length;
          prevSongToPlay = allSongs[currentSongIndex];
        }
      }
    } else if (isShuffling) {
      if (playedSongs.length > 1) {
        playedSongs.pop();
        currentSongIndex = playedSongs.pop();
        prevSongToPlay = allSongs[currentSongIndex];
      } else {
        audioPlayer.currentTime = 0;
        playSong();
        return;
      }
    } else {
      currentSongIndex =
        (currentSongIndex - 1 + allSongs.length) % allSongs.length;
      prevSongToPlay = allSongs[currentSongIndex];
    }
    if (prevSongToPlay) {
      loadPlayerSongDetails(prevSongToPlay).then(() => {
        playSong();
        showToast("Previous Song");
        updateQueueUI();
      });
    }
  }

  playPauseBtn.addEventListener("click", togglePlayPause);
  prevBtn.addEventListener("click", playPrevSong);
  nextBtn.addEventListener("click", playNextSong);

  audioPlayer.addEventListener("timeupdate", () => {
    if (!isNaN(audioPlayer.duration) && audioPlayer.duration > 0) {
      const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
      progressBarFill.style.width = `${progress}%`;
      currentTimeDisplay.textContent = formatTime(audioPlayer.currentTime);
    } else {
      progressBarFill.style.width = "0%";
      currentTimeDisplay.textContent = "00:00";
    }
  });

  audioPlayer.addEventListener("loadedmetadata", () => {
    if (visualizerCanvas) {
      visualizerCanvas.width = visualizerCanvas.offsetWidth;
      visualizerCanvas.height = visualizerCanvas.offsetHeight;
    }
    if (playerVisualizerCanvas) {
      playerVisualizerCanvas.width = playerVisualizerCanvas.offsetWidth;
      playerVisualizerCanvas.height = playerVisualizerCanvas.offsetHeight;
    }
    totalTimeDisplay.textContent = formatTime(audioPlayer.duration);
  });

  audioPlayer.addEventListener("ended", () => {
    playNextSong();
  });

  volumeSlider.addEventListener("input", (e) => {
    const newVolume = e.target.value;
    audioPlayer.volume = newVolume / 100;
    localStorage.setItem("musicPlayerVolume", newVolume);
    updateVolumeIcon(audioPlayer.volume);
    volumePercentageDisplay.textContent = `${newVolume}%`;
    volumePercentageDisplay.style.opacity = 1;
    clearTimeout(volumeDisplayTimeout);
    volumeDisplayTimeout = setTimeout(() => {
      volumePercentageDisplay.style.opacity = 0;
    }, 1000);
  });

  const volumeButton = footerPlayer.querySelector(".volume-controls button");
  if (volumeButton) {
    updateVolumeIcon(audioPlayer.volume);
    volumeButton.addEventListener("click", () => {
      if (audioPlayer.volume > 0) {
        previousVolume = volumeSlider.value;
        volumeSlider.value = 0;
        audioPlayer.volume = 0;
        updateVolumeIcon(0);
        showToast("Muted");
        volumePercentageDisplay.textContent = `0%`;
        volumePercentageDisplay.style.opacity = 1;
        clearTimeout(volumeDisplayTimeout);
        volumeDisplayTimeout = setTimeout(() => {
          volumePercentageDisplay.style.opacity = 0;
        }, 1000);
      } else {
        const restoreVolume = previousVolume > 0 ? previousVolume : 70;
        volumeSlider.value = restoreVolume;
        audioPlayer.volume = restoreVolume / 100;
        updateVolumeIcon(audioPlayer.volume);
        showToast(`Unmuted: ${restoreVolume}%`);
        volumePercentageDisplay.textContent = `${restoreVolume}%`;
        volumePercentageDisplay.style.opacity = 1;
        clearTimeout(volumeDisplayTimeout);
        volumeDisplayTimeout = setTimeout(() => {
          volumePercentageDisplay.style.opacity = 0;
        }, 1000);
      }
    });
  }

  function updateVolumeIcon(volume) {
    const iconElement = volumeButton.querySelector("i");
    iconElement.classList.remove(
      "fa-volume-up",
      "fa-volume-down",
      "fa-volume-mute"
    );
    if (volume === 0) {
      iconElement.classList.add("fa-volume-mute");
    } else if (volume < 0.5) {
      iconElement.classList.add("fa-volume-down");
    } else {
      iconElement.classList.add("fa-volume-up");
    }
  }

  progressTrack.addEventListener("click", (e) => {
    const rect = progressTrack.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const duration = audioPlayer.duration;
    if (!isNaN(duration) && duration > 0) {
      audioPlayer.currentTime = (clickX / width) * duration;
    }
  });

  loopBtn.addEventListener("click", () => {
    isLooping = !isLooping;
    if (isLooping) {
      loopBtn.classList.add("active");
      loopBtn.style.color = "#7f5af0";
      showToast("Loop ON");
    } else {
      loopBtn.classList.remove("active");
      loopBtn.style.color = "";
      showToast("Loop OFF");
    }
    audioPlayer.loop = isLooping;
  });

  shuffleBtn.addEventListener("click", () => {
    isShuffling = !isShuffling;
    if (isShuffling) {
      shuffleBtn.classList.add("active");
      shuffleBtn.style.color = "#7f5af0";
      showToast("Shuffle ON");
    } else {
      shuffleBtn.classList.remove("active");
      shuffleBtn.style.color = "";
      shuffleQueue = [];
      playedSongs = [];
      showToast("Shuffle OFF");
    }
  });

  if (playbackSpeedBtn) {
    playbackSpeedBtn.addEventListener("click", () => {
      let nextSpeedIndex =
        (playbackSpeeds.indexOf(currentPlaybackSpeed) + 1) %
        playbackSpeeds.length;
      currentPlaybackSpeed = playbackSpeeds[nextSpeedIndex];
      audioPlayer.playbackRate = currentPlaybackSpeed;
      localStorage.setItem("musicPlayerSpeed", currentPlaybackSpeed);
      if (playbackSpeedDisplay) {
        playbackSpeedDisplay.textContent = `${currentPlaybackSpeed.toFixed(
          2
        )}x`;
      }
      showToast(`Speed: ${currentPlaybackSpeed.toFixed(2)}x`);
    });
  }

  function filterSongs(query) {
    const lowerCaseQuery = query.toLowerCase();
    return allSongs.filter(
      (song) =>
        song.title.toLowerCase().includes(lowerCaseQuery) ||
        song.artist.toLowerCase().includes(lowerCaseQuery)
    );
  }

  function renderSearchResults(songs, query) {
    let html = `
        <section class="search-results-section" style="padding: 40px">
            <div class="section-header">
                <h2>Search Results for "${query}"</h2>
                <a href="#home" class="see-all back-button-home" data-route="home">
                    <i class="fas fa-arrow-left"></i> Back to Home
                </a>
            </div>
            <div class="release-grid search-results-grid">
    `;
    if (songs.length > 0) {
      songs.forEach((song) => {
        html += `
                <div class="release-item search-result-item" data-song-name="${song.name_no_ext}">
                    <img
                        src="/static/images/covers/${song.name_no_ext}.jpg"
                        alt="${song.title} Cover Art"
                        class="cover-art"
                    />
                    <div class="item-info">
                        <a
                            href="#play/${song.name_no_ext}"
                            class="play-link"
                            data-song-name="${song.name_no_ext}"
                        >${song.title}</a>
                        <p class="artist">${song.artist}</p>
                        <p
                            class="song-duration"
                            style="font-size: 0.8em; color: #b0b0c0; margin-top: 2px"
                        >
                            ${song.duration}
                        </p>
                        <button class="add-to-queue-btn" data-song-name="${song.name_no_ext}" title="Add to Queue">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
            `;
      });
    } else {
      html += `
            <p style="margin-top: 20px; color: #b3b3b3;">No results found for "${query}".</p>
            `;
    }
    html += `
            </div>
        </section>
    `;
    dynamicContentArea.innerHTML = html;
  }

  searchButton.addEventListener("click", () => {
    const query = searchInput.value.trim();
    if (query) {
      loadContent(`search/${encodeURIComponent(query)}`);
      if (body.classList.contains("mobile-menu-active")) {
        body.classList.remove("mobile-menu-active");
      }
    } else {
      showToast("Please enter a search query.");
    }
  });

  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      searchButton.click();
    }
  });

  function addToQueue(songNameNoExt) {
    const songToAdd = allSongs.find((s) => s.name_no_ext === songNameNoExt);
    if (songToAdd) {
      const existsInQueue = currentQueue.some(
        (s) => s.name_no_ext === songNameNoExt
      );
      if (!existsInQueue) {
        currentQueue.push(songToAdd);
        showToast(`Added "${songToAdd.title}" to queue.`);
        updateQueueUI();
      } else {
        showToast(`"${songToAdd.title}" is already in the queue.`, "info");
      }
    } else {
      console.error("Song not found to add to queue:", songNameNoExt);
      showToast("Failed to add song to queue.");
    }
  }

  function removeFromQueue(index) {
    if (index >= 0 && index < currentQueue.length) {
      const removedSong = currentQueue.splice(index, 1);
      showToast(`Removed "${removedSong[0].title}" from queue.`);
      updateQueueUI();
    }
  }

  function renderQueueList() {
    queueListContainer.innerHTML = "";
    if (currentQueue.length === 0) {
      queueListContainer.innerHTML =
        '<p style="color: #b3b3b3; text-align: center; margin-top: 20px;">Queue is empty.</p>';
      return;
    }
    currentQueue.forEach((song, index) => {
      const queueItem = document.createElement("div");
      queueItem.classList.add("queue-item");
      queueItem.setAttribute("data-song-name", song.name_no_ext);
      queueItem.setAttribute("data-queue-index", index);
      const isCurrentSong =
        allSongs[currentSongIndex] &&
        song.name_no_ext === allSongs[currentSongIndex].name_no_ext;
      queueItem.classList.toggle("is-playing", isCurrentSong);
      queueItem.innerHTML = `
        <div class="item-info">
          <span class="queue-item-index">${index + 1}.</span>
          <img src="/static/images/covers/${song.name_no_ext}.jpg" alt="${
        song.title
      } Cover" class="queue-cover-art">
          <div class="queue-text">
            <span class="queue-title">${song.title}</span>
            <span class="queue-artist">${song.artist}</span>
          </div>
        </div>
        <div class="queue-actions">
          <button class="play-queue-item-btn" data-song-name="${
            song.name_no_ext
          }" title="Play this song now">
              <i class="fas fa-play"></i>
          </button>
          <button class="remove-queue-item-btn" data-song-name="${
            song.name_no_ext
          }" title="Remove from queue">
              <i class="fas fa-times"></i>
          </button>
        </div>
      `;
      queueListContainer.appendChild(queueItem);
    });
    queueListContainer
      .querySelectorAll(".remove-queue-item-btn")
      .forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const songName = e.currentTarget.getAttribute("data-song-name");
          const index = currentQueue.findIndex(
            (s) => s.name_no_ext === songName
          );
          if (index !== -1) {
            removeFromQueue(index);
          }
        });
      });
    queueListContainer
      .querySelectorAll(".play-queue-item-btn")
      .forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          e.stopPropagation();
          const songName = e.currentTarget.getAttribute("data-song-name");
          const songToPlay = allSongs.find((s) => s.name_no_ext === songName);
          if (songToPlay) {
            await loadPlayerSongDetails(songToPlay);
            playSong();
            showToast(`Playing "${songToPlay.title}" from queue.`);
            hideQueueSidepanel();
            updateQueueUI();
          }
        });
      });
  }

  function updateQueueUI() {
    renderQueueList();
  }

  function showQueueSidepanel() {
    if (queueSidepanel) {
      queueSidepanel.classList.add("open");
      updateQueueUI();
    }
  }

  function hideQueueSidepanel() {
    if (queueSidepanel) {
      queueSidepanel.classList.remove("open");
    }
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
        showToast("Fullscreen ON");
      } else if (document.documentElement.mozRequestFullScreen) {
        document.documentElement.mozRequestFullScreen();
        showToast("Fullscreen ON");
      } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen();
        showToast("Fullscreen ON");
      } else if (document.documentElement.msRequestFullscreen) {
        document.documentElement.msRequestFullscreen();
        showToast("Fullscreen ON");
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        showToast("Fullscreen OFF");
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  }

  if (fullscreenBtn) {
    fullscreenBtn.addEventListener("click", toggleFullscreen);
  }

  if (viewQueueBtn) {
    viewQueueBtn.addEventListener("click", showQueueSidepanel);
  }
  if (closeQueueBtn) {
    closeQueueBtn.addEventListener("click", hideQueueSidepanel);
  }

  if (saveQueueAsPlaylistBtn) {
    saveQueueAsPlaylistBtn.addEventListener("click", async () => {
      if (currentQueue.length === 0) {
        showToast("Queue is empty, cannot save as playlist.");
        return;
      }
      const playlistName = prompt("Enter a name for your new playlist:");
      if (playlistName && playlistName.trim() !== "") {
        try {
          const response = await fetch("/api/playlists", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ name: playlistName.trim() }),
          });
          const data = await response.json();
          if (response.ok) {
            const newPlaylistId = data.id;
            for (const song of currentQueue) {
              await fetch(`/api/playlist/${newPlaylistId}`, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ add_song: song.name_no_ext }),
              });
            }
            showToast(`Queue saved as playlist "${playlistName}".`);
            hideQueueSidepanel();
            loadContent("playlists");
          } else {
            showToast(`Error: ${data.message || "Failed to create playlist."}`);
          }
        } catch (error) {
          console.error("Error saving queue as playlist:", error);
          showToast("Failed to save queue as playlist. Network error.");
        }
      } else if (playlistName !== null) {
        showToast("Playlist name cannot be empty.");
      }
    });
  }

  function applyMiniPlayerMode(enable) {
    isMiniPlayerMode = enable;
    if (enable) {
      footerPlayer.classList.add("mini-mode");
      document.documentElement.style.setProperty("--footer-height", "60px");
      document.documentElement.style.setProperty(
        "--content-padding-bottom",
        "60px"
      );
      showToast("Mini Player Mode ON", "info");
    } else {
      footerPlayer.classList.remove("mini-mode");
      document.documentElement.style.setProperty("--footer-height", "80px");
      document.documentElement.style.setProperty(
        "--content-padding-bottom",
        "100px"
      );
      showToast("Mini Player Mode OFF", "info");
    }
    localStorage.setItem("miniPlayerMode", enable);
  }

  if (toggleMiniPlayerBtn) {
    toggleMiniPlayerBtn.addEventListener("click", () => {
      applyMiniPlayerMode(!isMiniPlayerMode);
    });
  }

  // --- SPA Routing Logic ---
  async function loadContent(path) {
    let htmlContent = "";
    let songName = "";
    let albumName = "";
    let playlistId = "";
    let artistName = "";
    let apiUrl = "";
    let isSearchPath = false;

    document.body.classList.remove("player-page-active");
    hideQueueSidepanel();

    document.querySelectorAll(".sidebar .nav-link").forEach((link) => {
      link.classList.remove("active");
    });

    if (path === "home" || path === "") {
      apiUrl = "/api/home-content";
      history.pushState({ path: "home" }, "", "#home");
      document
        .querySelector('.sidebar .nav-link[data-route="home"]')
        .classList.add("active");
    } else if (path === "all-songs") {
      apiUrl = "/api/all-songs-content";
      history.pushState({ path: "all-songs" }, "", "#all-songs");
      document
        .querySelector('.sidebar .nav-link[data-route="all-songs"]')
        .classList.add("active");
    } else if (path === "albums") {
      apiUrl = "/api/albums";
      history.pushState({ path: "albums" }, "", "#albums");
      document
        .querySelector('.sidebar .nav-link[data-route="albums"]')
        .classList.add("active");
    } else if (path.startsWith("album/")) {
      albumName = decodeURIComponent(path.substring(6));
      apiUrl = `/api/album-detail/${albumName}`;
      history.pushState({ path: path }, "", `#album/${albumName}`);
      document
        .querySelector('.sidebar .nav-link[data-route="albums"]')
        .classList.add("active");
    } else if (path === "artists") {
      apiUrl = "/api/artists";
      history.pushState({ path: "artists" }, "", "#artists");
      document
        .querySelector('.sidebar .nav-link[data-route="artists"]')
        .classList.add("active");
    } else if (path.startsWith("artist/")) {
      artistName = decodeURIComponent(path.substring(7));
      apiUrl = `/api/artist-detail/${artistName}`;
      history.pushState({ path: path }, "", `#artist/${artistName}`);
      document
        .querySelector('.sidebar .nav-link[data-route="artists"]')
        .classList.add("active");
    } else if (path === "playlists") {
      apiUrl = "/api/playlists";
      history.pushState({ path: "playlists" }, "", "#playlists");
      document
        .querySelector('.sidebar .nav-link[data-route="playlists"]')
        .classList.add("active");
    } else if (path.startsWith("playlist/")) {
      playlistId = parseInt(path.substring(9));
      apiUrl = `/api/playlist/${playlistId}`;
      history.pushState({ path: path }, "", `#playlist/${playlistId}`);
      document
        .querySelector('.sidebar .nav-link[data-route="playlists"]')
        .classList.add("active");
    } else if (path === "recently-played") {
      apiUrl = "/api/recently-played";
      history.pushState({ path: "recently-played" }, "", "#recently-played");
      document
        .querySelector('.sidebar .nav-link[data-route="recently-played"]')
        .classList.add("active");
    } else if (path.startsWith("play/")) {
      songName = path.substring(5);
      const songDetails = allSongs.find((s) => s.name_no_ext === songName);
      if (songDetails) {
        apiUrl = `/api/player-content/${songName}`;
        history.pushState({ path: path }, "", `#play/${songName}`);
      } else {
        dynamicContentArea.innerHTML =
          "<h2>Song Not Found</h2><p>The song you are looking for does not exist.</p>";
        history.pushState({ path: "404" }, "", "#404");
        return;
      }
    } else if (path.startsWith("search/")) {
      isSearchPath = true;
      const query = decodeURIComponent(path.substring(7));
      history.pushState({ path: path }, "", `#search/${query}`);
    } else {
      dynamicContentArea.innerHTML =
        "<h2>Page Not Found</h2><p>The content you are looking for does not exist.</p>";
      history.pushState({ path: "404" }, "", "#404");
      return;
    }

    try {
      if (isSearchPath) {
        const query = decodeURIComponent(path.substring(7));
        const filteredSongs = filterSongs(query);
        renderSearchResults(filteredSongs, query);
      } else {
        const response = await fetch(apiUrl);
        if (!response.ok)
          throw new Error(`Failed to load content from ${apiUrl}`);
        htmlContent = await response.text();
        dynamicContentArea.innerHTML = htmlContent;
      }

      attachDynamicEventListeners();

      if (path.startsWith("play/")) {
        audioPlayer = document.getElementById("audioPlayer");
        playerVisualizerCanvas = document.getElementById(
          "playerVisualizerCanvas"
        );
        playerCanvasCtx = playerVisualizerCanvas
          ? playerVisualizerCanvas.getContext("2d")
          : null;

        const visualizerTypeSelect = document.getElementById("visualizerType");
        if (visualizerTypeSelect) {
          visualizerTypeSelect.value = currentVisualizerType;
          visualizerTypeSelect.addEventListener("change", (e) => {
            currentVisualizerType = e.target.value;
            localStorage.setItem("visualizerType", currentVisualizerType);
          });
        }
        if (audioPlayer) {
          const currentSong = allSongs.find((s) => s.name_no_ext === songName);
          if (currentSong) {
            currentSongIndex = allSongs.indexOf(currentSong);
            await loadPlayerSongDetails(currentSong);
            playSong();
          }
        }
      }

      if (path === "home" || path === "") {
        initializeHeroBannerCarousel();
      }
      if (path === "playlists") {
        initializePlaylistsPageListeners();
      }
      if (path.startsWith("playlist/")) {
        initializePlaylistDetailPageListeners(playlistId);
      }
    } catch (error) {
      console.error("Error loading content:", error);
      dynamicContentArea.innerHTML =
        "<h2>Error</h2><p>Failed to load content.</p>";
    }
  }

  function attachDynamicEventListeners() {
    document.querySelectorAll(".sidebar .nav-link").forEach((link) => {
      link.removeEventListener("click", handleNavLinkClick);
      link.addEventListener("click", handleNavLinkClick);
    });
    dynamicContentArea.querySelectorAll(".play-link").forEach((link) => {
      link.removeEventListener("click", handlePlayableItemClick);
      link.addEventListener("click", handlePlayableItemClick);
    });
    dynamicContentArea
      .querySelectorAll(".add-to-queue-btn")
      .forEach((button) => {
        button.removeEventListener("click", handleAddToQueueClick);
        button.addEventListener("click", handleAddToQueueClick);
      });
    dynamicContentArea.querySelectorAll(".album-link").forEach((link) => {
      link.removeEventListener("click", handleAlbumLinkClick);
      link.addEventListener("click", handleAlbumLinkClick);
    });
    dynamicContentArea.querySelectorAll(".artist-link").forEach((link) => {
      link.removeEventListener("click", handleArtistLinkClick);
      link.addEventListener("click", handleArtistLinkClick);
    });
    dynamicContentArea.querySelectorAll(".playlist-item").forEach((item) => {
      item.removeEventListener("click", handlePlaylistItemClick);
      item.addEventListener("click", handlePlaylistItemClick);
    });
    dynamicContentArea
      .querySelectorAll(
        ".back-button-all-songs, .back-button-albums, .back-button-playlists, .back-button-home, .back-button-artists"
      )
      .forEach((button) => {
        button.removeEventListener("click", handleNavLinkClick);
        button.addEventListener("click", handleNavLinkClick);
      });
  }

  async function handlePlayableItemClick(e) {
    if (e.target.closest(".add-to-queue-btn")) {
      return;
    }
    e.preventDefault();
    const songElement = e.currentTarget;
    const songName = songElement.getAttribute("data-song-name");
    const songToPlay = allSongs.find((s) => s.name_no_ext === songName);
    if (songToPlay) {
      currentSongIndex = allSongs.indexOf(songToPlay);
      await loadPlayerSongDetails(songToPlay);
      playSong();
      history.pushState({ path: `play/${songName}` }, "", `#play/${songName}`);
      if (isShuffling) {
        shuffleQueue = [...allSongs].filter(
          (song) => song.name_no_ext !== songToPlay.name_no_ext
        );
        for (let i = shuffleQueue.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffleQueue[i], shuffleQueue[j]] = [
            shuffleQueue[j],
            shuffleQueue[i],
          ];
        }
        playedSongs = [currentSongIndex];
      }
      if (body.classList.contains("mobile-menu-active")) {
        body.classList.remove("mobile-menu-active");
      }
    } else {
      console.error("Song not found in allSongs array:", songName);
      showToast("Song not found. Cannot play.", "error");
    }
  }

  function handleAddToQueueClick(e) {
    e.stopPropagation();
    const songName = e.currentTarget.getAttribute("data-song-name");
    addToQueue(songName);
  }

  function handleNavLinkClick(e) {
    e.preventDefault();
    const route = this.getAttribute("data-route") || this.hash.substring(1);
    loadContent(route);
    if (body.classList.contains("mobile-menu-active")) {
      body.classList.remove("mobile-menu-active");
    }
  }

  function handleAlbumLinkClick(e) {
    e.preventDefault();
    const albumName =
      this.getAttribute("data-album-name") || this.hash.substring(7);
    const route = `album/${albumName}`;
    loadContent(route);
    if (body.classList.contains("mobile-menu-active")) {
      body.classList.remove("mobile-menu-active");
    }
  }

  function handleArtistLinkClick(e) {
    e.preventDefault();
    const artistName =
      this.getAttribute("data-artist-name") || this.hash.substring(8);
    const route = `artist/${artistName}`;
    loadContent(route);
    if (body.classList.contains("mobile-menu-active")) {
      body.classList.remove("mobile-menu-active");
    }
  }

  function handlePlaylistItemClick(e) {
    e.preventDefault();
    if (e.target.closest(".delete-playlist-btn")) {
      return;
    }
    const playlistId = parseInt(this.getAttribute("data-playlist-id"));
    const route = `playlist/${playlistId}`;
    loadContent(route);
    if (body.classList.contains("mobile-menu-active")) {
      body.classList.remove("mobile-menu-active");
    }
  }

  if (hamburgerMenu) {
    hamburgerMenu.addEventListener("click", () => {
      body.classList.toggle("mobile-menu-active");
    });
  }

  document.addEventListener("click", (e) => {
    if (
      body.classList.contains("mobile-menu-active") &&
      !sidebar.contains(e.target) &&
      !hamburgerMenu.contains(e.target) &&
      !e.target.closest(".sidebar")
    ) {
      body.classList.remove("mobile-menu-active");
    }
  });

  let currentSlide = 0;
  let carouselInterval;
  let images;
  let dots;

  function initializeHeroBannerCarousel() {
    const heroBanner = dynamicContentArea.querySelector(".hero-banner");
    if (!heroBanner) return;
    images = heroBanner.querySelectorAll(".carousel-images img");
    dots = heroBanner.querySelectorAll(".banner-controls .dot");
    if (images.length === 0) return;
    if (carouselInterval) {
      clearInterval(carouselInterval);
    }
    showSlide(currentSlide);
    carouselInterval = setInterval(nextSlide, 5000);
    dots.forEach((dot, index) => {
      dot.removeEventListener("click", handleDotClick);
      dot.addEventListener("click", () => handleDotClick(index));
    });
  }

  function showSlide(index) {
    images.forEach((img) => img.classList.remove("active"));
    dots.forEach((dot) => dot.classList.remove("active"));
    if (images[index]) {
      images[index].classList.add("active");
    }
    if (dots[index]) {
      dots[index].classList.add("active");
    }
    currentSlide = index;
  }

  function nextSlide() {
    currentSlide = (currentSlide + 1) % images.length;
    showSlide(currentSlide);
  }

  function handleDotClick(index) {
    clearInterval(carouselInterval);
    showSlide(index);
    carouselInterval = setInterval(nextSlide, 5000);
  }

  async function initializePlaylistsPageListeners() {
    const createPlaylistBtn =
      dynamicContentArea.querySelector("#createPlaylistBtn");
    const newPlaylistNameInput =
      dynamicContentArea.querySelector("#newPlaylistName");
    if (createPlaylistBtn && newPlaylistNameInput) {
      createPlaylistBtn.addEventListener("click", async () => {
        const playlistName = newPlaylistNameInput.value.trim();
        if (playlistName) {
          try {
            const response = await fetch("/api/playlists", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: playlistName }),
            });
            const data = await response.json();
            if (response.ok) {
              showToast(data.message);
              newPlaylistNameInput.value = "";
              loadContent("playlists");
            } else {
              showToast(
                `Error: ${data.message || "Failed to create playlist."}`
              );
            }
          } catch (error) {
            console.error("Error creating playlist:", error);
            showToast("Failed to create playlist. Network error.");
          }
        } else {
          showToast("Playlist name cannot be empty.");
        }
      });
    }
    dynamicContentArea
      .querySelectorAll(".delete-playlist-btn")
      .forEach((btn) => {
        btn.removeEventListener("click", handleDeletePlaylistButton);
        btn.addEventListener("click", handleDeletePlaylistButton);
      });
  }

  async function handleDeletePlaylistButton(e) {
    e.stopPropagation();
    const playlistId = e.target
      .closest(".playlist-item")
      .getAttribute("data-playlist-id");
    if (confirm("Are you sure you want to delete this playlist?")) {
      try {
        const response = await fetch(`/api/playlist/${playlistId}`, {
          method: "DELETE",
        });
        const data = await response.json();
        if (response.ok) {
          showToast(data.message);
          loadContent("playlists");
        } else {
          showToast(`Error: ${data.message || "Failed to delete playlist."}`);
        }
      } catch (error) {
        console.error("Error deleting playlist:", error);
        showToast("Failed to delete playlist. Network error.");
      }
    }
  }

  async function initializePlaylistDetailPageListeners(playlistId) {
    const addSongToPlaylistBtn = dynamicContentArea.querySelector(
      "#addSongToPlaylistBtn"
    );
    const songNameToAddInput =
      dynamicContentArea.querySelector("#songNameToAdd");
    if (addSongToPlaylistBtn && songNameToAddInput) {
      addSongToPlaylistBtn.addEventListener("click", async () => {
        const songName = songNameToAddInput.value.trim();
        if (songName) {
          try {
            const response = await fetch(`/api/playlist/${playlistId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ add_song: songName }),
            });
            const data = await response.json();
            if (response.ok) {
              showToast(data.message);
              songNameToAddInput.value = "";
              loadContent(`playlist/${playlistId}`);
            } else {
              showToast(`Error: ${data.message || "Failed to add song."}`);
            }
          } catch (error) {
            console.error("Error adding song to playlist:", error);
            showToast("Failed to add song. Network error.");
          }
        } else {
          showToast("Song name cannot be empty.");
        }
      });
    }

    dynamicContentArea
      .querySelectorAll(".remove-song-from-playlist-btn")
      .forEach((btn) => {
        btn.removeEventListener("click", handleRemoveSongFromPlaylistClick);
        btn.addEventListener("click", handleRemoveSongFromPlaylistClick);
      });

    async function handleRemoveSongFromPlaylistClick(e) {
      e.stopPropagation();
      const songName = e.target
        .closest(".playlist-song-list-item")
        .getAttribute("data-song-name");
      if (
        confirm(
          `Are you sure you want to remove "${songName}" from this playlist?`
        )
      ) {
        try {
          const response = await fetch(`/api/playlist/${playlistId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ remove_song: songName }),
          });
          const data = await response.json();
          if (response.ok) {
            showToast(data.message);
            loadContent(`playlist/${playlistId}`);
          } else {
            showToast(`Error: ${data.message || "Failed to remove song."}`);
          }
        } catch (error) {
          console.error("Error removing song from playlist:", error);
          showToast("Failed to remove song. Network error.");
        }
      }
    }

    const editPlaylistNameBtn = dynamicContentArea.querySelector(
      "#editPlaylistNameBtn"
    );
    const playlistNameDisplay = dynamicContentArea.querySelector(
      "#playlistNameDisplay"
    );
    const playlistNameEditInput = dynamicContentArea.querySelector(
      "#playlistNameEditInput"
    );
    const savePlaylistNameBtn = dynamicContentArea.querySelector(
      "#savePlaylistNameBtn"
    );
    const cancelEditPlaylistNameBtn = dynamicContentArea.querySelector(
      "#cancelEditPlaylistNameBtn"
    );
    if (
      editPlaylistNameBtn &&
      playlistNameDisplay &&
      playlistNameEditInput &&
      savePlaylistNameBtn &&
      cancelEditPlaylistNameBtn
    ) {
      editPlaylistNameBtn.addEventListener("click", () => {
        playlistNameDisplay.style.display = "none";
        editPlaylistNameBtn.style.display = "none";
        playlistNameEditInput.value = playlistNameDisplay.textContent;
        playlistNameEditInput.style.display = "inline-block";
        savePlaylistNameBtn.style.display = "inline-block";
        cancelEditPlaylistNameBtn.style.display = "inline-block";
        playlistNameEditInput.focus();
      });
      cancelEditPlaylistNameBtn.addEventListener("click", () => {
        playlistNameDisplay.style.display = "inline";
        editPlaylistNameBtn.style.display = "inline-block";
        playlistNameEditInput.style.display = "none";
        savePlaylistNameBtn.style.display = "none";
        cancelEditPlaylistNameBtn.style.display = "none";
      });
      savePlaylistNameBtn.addEventListener("click", async () => {
        const newName = playlistNameEditInput.value.trim();
        if (newName && newName !== playlistNameDisplay.textContent) {
          try {
            const response = await fetch(`/api/playlist/${playlistId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: newName }),
            });
            const data = await response.json();
            if (response.ok) {
              showToast(data.message);
              loadContent(`playlist/${playlistId}`);
            } else {
              showToast(
                `Error: ${data.message || "Failed to update playlist name."}`
              );
            }
          } catch (error) {
            console.error("Error updating playlist name:", error);
            showToast("Failed to update playlist name. Network error.");
          }
        } else {
          showToast("Playlist name cannot be empty or unchanged.");
          cancelEditPlaylistNameBtn.click();
        }
      });
    }
  }

  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
      return;
    }
    if (
      [" ", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
    ) {
      e.preventDefault();
    }
    switch (e.key) {
      case " ":
      case "k":
        togglePlayPause();
        break;
      case "ArrowRight":
        playNextSong();
        break;
      case "ArrowLeft":
        playPrevSong();
        break;
      case "ArrowUp":
        audioPlayer.volume = Math.min(1, audioPlayer.volume + 0.05);
        volumeSlider.value = Math.round(audioPlayer.volume * 100);
        updateVolumeIcon(audioPlayer.volume);
        volumePercentageDisplay.textContent = `${volumeSlider.value}%`;
        volumePercentageDisplay.style.opacity = 1;
        clearTimeout(volumeDisplayTimeout);
        volumeDisplayTimeout = setTimeout(() => {
          volumePercentageDisplay.style.opacity = 0;
        }, 1000);
        showToast(`Volume: ${volumeSlider.value}%`);
        break;
      case "ArrowDown":
        audioPlayer.volume = Math.max(0, audioPlayer.volume - 0.05);
        volumeSlider.value = Math.round(audioPlayer.volume * 100);
        updateVolumeIcon(audioPlayer.volume);
        volumePercentageDisplay.textContent = `${volumeSlider.value}%`;
        volumePercentageDisplay.style.opacity = 1;
        clearTimeout(volumeDisplayTimeout);
        volumeDisplayTimeout = setTimeout(() => {
          volumePercentageDisplay.style.opacity = 0;
        }, 1000);
        showToast(`Volume: ${volumeSlider.value}%`);
        break;
      case "f":
        toggleFullscreen();
        break;
      case "l":
        const currentSongPlayed = allSongs[currentSongIndex];
        if (currentSongPlayed) {
          showToast(
            `Liked: "${currentSongPlayed.title}" (Feature not implemented)`
          );
        } else {
          showToast("No song playing to like.");
        }
        break;
      case "s":
        shuffleBtn.click();
        break;
      case "r":
        loopBtn.click();
        break;
      case "m":
        volumeButton.click();
        break;
    }
  });

  window.addEventListener("popstate", (event) => {
    const pathHash = window.location.hash.substring(1);
    loadContent(pathHash || "home");
  });

  const savedMiniPlayerMode = localStorage.getItem("miniPlayerMode");
  if (savedMiniPlayerMode === "true") {
    applyMiniPlayerMode(true);
  } else {
    applyMiniPlayerMode(false);
  }

  loadSongsData().then(() => {
    const initialHash = window.location.hash.substring(1);
    if (initialHash) {
      loadContent(initialHash);
    } else {
      history.replaceState({ path: "home" }, "", "#home");
      loadContent("home");
    }
  });
});
