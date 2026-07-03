
const PUZZLE_SEARCH_DEBOUNCE_MS = 400;
const PUZZLE_SEARCH_MAX_RESULTS = 8;
const PUZZLE_DIFFICULTIES = [
  { label: 'Fácil', size: 3 },
  { label: 'Medio', size: 4 },
  { label: 'Difícil', size: 5 },
];

function renderPuzzleView(container, params, signal) {
  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'btn btn-secondary';
  backBtn.textContent = '← Volver a Departamentos';
  backBtn.addEventListener('click', () => window.history.back());
  container.appendChild(backBtn);

  const title = document.createElement('h1');
  title.className = 'puzzle-title';
  title.textContent = 'Rompecabezas';
  container.appendChild(title);

  const subtitle = document.createElement('p');
  subtitle.className = 'departments-subtitle';
  subtitle.textContent = 'Buscá una obra de la colección y armala pieza por pieza.';
  container.appendChild(subtitle);

  const stage = document.createElement('div');
  stage.className = 'puzzle-stage';
  container.appendChild(stage);

  _renderSearchStep(stage, signal);
}

// Paso 1: buscar y elegir la obra

function _renderSearchStep(stage, signal) {
  ViewHelpers.clearElement(stage);

  const input = document.createElement('input');
  input.type = 'search';
  input.className = 'compare-search-input';
  input.placeholder = 'Busca una pintura por nombre, artista, tema…';
  stage.appendChild(input);

  const resultsArea = document.createElement('div');
  resultsArea.className = 'puzzle-search-results';
  stage.appendChild(resultsArea);

  const hint = document.createElement('p');
  hint.className = 'compare-hint';
  hint.textContent = 'Busca y elegí una obra para empezar a armarla.';
  resultsArea.appendChild(hint);

  let debounceTimer = null;
  let requestId = 0;

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const term = input.value.trim();

    if (!term) {
      ViewHelpers.clearElement(resultsArea);
      resultsArea.appendChild(hint);
      return;
    }

    debounceTimer = setTimeout(() => _runSearch(term), PUZZLE_SEARCH_DEBOUNCE_MS);
  });

  async function _runSearch(term) {
    const id = ++requestId;
    ViewHelpers.clearElement(resultsArea);
    resultsArea.appendChild(ViewHelpers.buildLoading('Buscando obras...'));

    try {
      const searchResult = await MetAPI.search({ q: term, hasImages: true }, { signal });
      if (signal.aborted || id !== requestId) return;

      const ids = (searchResult.objectIDs || []).slice(0, PUZZLE_SEARCH_MAX_RESULTS);

      if (ids.length === 0) {
        ViewHelpers.clearElement(resultsArea);
        const empty = document.createElement('p');
        empty.className = 'compare-hint';
        empty.textContent = 'No se encontraron obras con ese término.';
        resultsArea.appendChild(empty);
        return;
      }

      const { artworks } = await MetAPI.resolveObjects(ids, { signal });
      if (signal.aborted || id !== requestId) return;

      ViewHelpers.clearElement(resultsArea);

      if (artworks.length === 0) {
        resultsArea.appendChild(
          ViewHelpers.buildError('No se pudo cargar ninguna obra para este término.', () => _runSearch(term))
        );
        return;
      }

      const grid = document.createElement('div');
      grid.className = 'puzzle-search-grid';
      artworks.forEach((artwork) => {
        const card = document.createElement('artwork-card');
        card.setData(artwork);
        // Sobreescribimos la navegación por defecto de <artwork-card>:
        // acá no queremos ir a #detail/:id, sino elegirla para el rompecabezas.
        card.onclick = (e) => {
          e.preventDefault();
          _renderDifficultyStep(stage, artwork, signal);
        };
        card.onkeydown = (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            _renderDifficultyStep(stage, artwork, signal);
          }
        };
        grid.appendChild(card);
      });
      resultsArea.appendChild(grid);
    } catch (err) {
      if (err.name === 'AbortError' || signal.aborted || id !== requestId) return;
      console.error('Vitrae: fallo en la búsqueda del rompecabezas:', err);
      ViewHelpers.clearElement(resultsArea);
      resultsArea.appendChild(
        ViewHelpers.buildError('No se pudo completar la búsqueda.', () => _runSearch(term))
      );
    }
  }
}

// Paso 2: elegir dificultad

function _renderDifficultyStep(stage, artwork, signal) {
  ViewHelpers.clearElement(stage);

  const imageSrc = artwork.primaryImage || artwork.primaryImageSmall;

  if (!imageSrc) {
    stage.appendChild(
      ViewHelpers.buildError('Esta obra no tiene una imagen utilizable para el rompecabezas.', () =>
        _renderSearchStep(stage, signal)
      )
    );
    return;
  }

  const preview = document.createElement('div');
  preview.className = 'puzzle-preview';
  const previewImg = document.createElement('img');
  previewImg.src = artwork.primaryImageSmall || imageSrc;
  previewImg.alt = artwork.title || 'Obra elegida';
  preview.appendChild(previewImg);

  const previewInfo = document.createElement('div');
  const t = document.createElement('h2');
  t.textContent = artwork.title || 'Sin título';
  const a = document.createElement('p');
  a.className = 'artwork-artist';
  a.textContent = artwork.artistDisplayName || 'Artista desconocido';
  previewInfo.append(t, a);
  preview.appendChild(previewInfo);

  stage.appendChild(preview);

  const diffLabel = document.createElement('p');
  diffLabel.className = 'puzzle-diff-label';
  diffLabel.textContent = 'Elegí la dificultad:';
  stage.appendChild(diffLabel);

  const diffWrap = document.createElement('div');
  diffWrap.className = 'puzzle-difficulty-options';
  PUZZLE_DIFFICULTIES.forEach(({ label, size }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn';
    btn.textContent = `${label} (${size}×${size})`;
    btn.addEventListener('click', () => _renderPuzzleBoard(stage, artwork, imageSrc, size, signal));
    diffWrap.appendChild(btn);
  });
  stage.appendChild(diffWrap);

  const changeBtn = document.createElement('button');
  changeBtn.type = 'button';
  changeBtn.className = 'btn btn-secondary';
  changeBtn.textContent = 'Elegir otra obra';
  changeBtn.addEventListener('click', () => _renderSearchStep(stage, signal));
  stage.appendChild(changeBtn);
}

// Paso 3: el rompecabezas en sí

function _renderPuzzleBoard(stage, artwork, imageSrc, size, signal) {
  ViewHelpers.clearElement(stage);

  const totalPieces = size * size;

  // boardState[slotIndex] = pieceIndex colocado ahí, o null si está vacío.
  const boardState = new Array(totalPieces).fill(null);
  // trayPieces = pieceIndex de las piezas que todavía están en la bandeja.
  let trayPieces = _shuffle([...Array(totalPieces).keys()]);
  let selected = null;

  const header = document.createElement('div');
  header.className = 'puzzle-header';

  const info = document.createElement('p');
  info.className = 'puzzle-info';
  info.textContent = `Armando: ${artwork.title || 'Sin título'} — ${size}×${size} piezas`;
  header.appendChild(info);

  const actions = document.createElement('div');
  actions.className = 'puzzle-actions';

  const shuffleBtn = document.createElement('button');
  shuffleBtn.type = 'button';
  shuffleBtn.className = 'btn btn-secondary';
  shuffleBtn.textContent = 'Mezclar de nuevo';
  shuffleBtn.addEventListener('click', _reset);
  actions.appendChild(shuffleBtn);

  const changeDiffBtn = document.createElement('button');
  changeDiffBtn.type = 'button';
  changeDiffBtn.className = 'btn btn-secondary';
  changeDiffBtn.textContent = 'Cambiar dificultad';
  changeDiffBtn.addEventListener('click', () => _renderDifficultyStep(stage, artwork, signal));
  actions.appendChild(changeDiffBtn);

  const changeArtBtn = document.createElement('button');
  changeArtBtn.type = 'button';
  changeArtBtn.className = 'btn btn-secondary';
  changeArtBtn.textContent = 'Elegir otra obra';
  changeArtBtn.addEventListener('click', () => _renderSearchStep(stage, signal));
  actions.appendChild(changeArtBtn);

  header.appendChild(actions);
  stage.appendChild(header);

  const successBanner = document.createElement('div');
  successBanner.className = 'puzzle-success';
  successBanner.hidden = true;
  successBanner.textContent = '¡Completaste el rompecabezas!';
  stage.appendChild(successBanner);

  const board = document.createElement('div');
  board.className = 'puzzle-board';
  board.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
  stage.appendChild(board);

  const trayLabel = document.createElement('p');
  trayLabel.className = 'puzzle-tray-label';
  trayLabel.textContent = 'Piezas disponibles:';
  stage.appendChild(trayLabel);

  const tray = document.createElement('div');
  tray.className = 'puzzle-tray';
  stage.appendChild(tray);

  _renderAll();

  function _pieceStyle(pieceIndex) {
    const row = Math.floor(pieceIndex / size);
    const col = pieceIndex % size;
    const posX = size > 1 ? (col / (size - 1)) * 100 : 0;
    const posY = size > 1 ? (row / (size - 1)) * 100 : 0;
    return {
      backgroundImage: `url(${imageSrc})`,
      backgroundSize: `${size * 100}% ${size * 100}%`,
      backgroundPosition: `${posX}% ${posY}%`,
    };
  }

  function _buildPieceEl(pieceIndex, extraClass) {
    const el = document.createElement('div');
    el.className = `puzzle-piece ${extraClass || ''}`.trim();
    Object.assign(el.style, _pieceStyle(pieceIndex));
    el.tabIndex = 0;
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', `Pieza ${pieceIndex + 1}`);
    return el;
  }

  function _renderAll() {
    _renderBoard();
    _renderTray();
    _checkCompletion();
  }

  function _renderBoard() {
    ViewHelpers.clearElement(board);
    boardState.forEach((pieceIndex, slotIndex) => {
      const slot = document.createElement('div');
      slot.className = 'puzzle-slot';

      if (pieceIndex !== null) {
        const isSelected = selected && selected.origin === 'board' && selected.slotIndex === slotIndex;
        const piece = _buildPieceEl(pieceIndex, isSelected ? 'is-selected' : '');
        slot.appendChild(piece);
      }

      const activate = () => _onSlotClick(slotIndex);
      slot.addEventListener('click', activate);
      slot.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activate();
        }
      });
      slot.tabIndex = 0;
      slot.setAttribute('role', 'button');

      board.appendChild(slot);
    });
  }

  function _renderTray() {
    ViewHelpers.clearElement(tray);

    if (trayPieces.length === 0) {
      const doneMsg = document.createElement('p');
      doneMsg.className = 'compare-hint';
      doneMsg.textContent = 'Ya colocaste todas las piezas en el tablero.';
      tray.appendChild(doneMsg);
      return;
    }

    trayPieces.forEach((pieceIndex) => {
      const isSelected = selected && selected.origin === 'tray' && selected.pieceIndex === pieceIndex;
      const piece = _buildPieceEl(pieceIndex, isSelected ? 'is-selected' : '');
      piece.addEventListener('click', () => _onTrayPieceClick(pieceIndex));
      piece.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          _onTrayPieceClick(pieceIndex);
        }
      });
      tray.appendChild(piece);
    });
  }

  function _onTrayPieceClick(pieceIndex) {
    if (!selected) {
      selected = { pieceIndex, origin: 'tray' };
    } else if (selected.origin === 'tray' && selected.pieceIndex === pieceIndex) {
      selected = null; // deseleccionar
    } else if (selected.origin === 'board') {
      // Ya había una pieza tomada del tablero: la soltamos en la
      // bandeja (queda pendiente) y en su lugar seleccionamos esta.
      trayPieces.push(selected.pieceIndex);
      boardState[selected.slotIndex] = null;
      selected = { pieceIndex, origin: 'tray' };
    } else {
      selected = { pieceIndex, origin: 'tray' }; // cambiar selección a otra pieza de la bandeja
    }
    _renderAll();
  }

  function _onSlotClick(slotIndex) {
    if (!selected) {
      const occupant = boardState[slotIndex];
      if (occupant !== null) {
        selected = { pieceIndex: occupant, origin: 'board', slotIndex };
        _renderAll();
      }
      return;
    }

    if (selected.origin === 'tray') {
      const occupant = boardState[slotIndex];
      trayPieces = trayPieces.filter((p) => p !== selected.pieceIndex);
      if (occupant !== null) {
        trayPieces.push(occupant);
      }
      boardState[slotIndex] = selected.pieceIndex;
      selected = null;
    } else {
      if (selected.slotIndex === slotIndex) {
        selected = null; // click en la misma pieza: la soltamos donde está
      } else {
        const occupant = boardState[slotIndex];
        boardState[slotIndex] = selected.pieceIndex;
        boardState[selected.slotIndex] = occupant;
        selected = null;
      }
    }

    _renderAll();
  }

  function _checkCompletion() {
    const complete = boardState.every((pieceIndex, slotIndex) => pieceIndex === slotIndex);
    successBanner.hidden = !complete;
  }

  function _reset() {
    boardState.fill(null);
    trayPieces = _shuffle([...Array(totalPieces).keys()]);
    selected = null;
    _renderAll();
  }
}

function _shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
