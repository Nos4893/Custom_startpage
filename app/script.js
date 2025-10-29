// script.js

// --- Storage Helpers ---
const load  = key => JSON.parse(localStorage.getItem(key) || 'null');
const save  = (key, v) => localStorage.setItem(key, JSON.stringify(v));

// --- State (with defaults) ---
let searches   = load('searches')   || [];
let galleries  = load('galleries')  || [];
let background = load('background') || null;
let showDeleteButtons = load('showDeleteButtons') || false;
let twitchChannels = load('twitchChannels') || []; // Liste der Kanalnamen
let twitchChannelData = load('twitchChannelData') || []; // Kanalinfos mit Livestatus
let twitchPanelVisible = load('twitchPanelVisible') || false;
let channelsInputVisible = load('channelsInputVisible') || false; // Neuer State für Eingabefeld-Sichtbarkeit
let bookmarkPages = load('bookmarkPages') || [{ id: "default", name: "Allgemein", bookmarks: [] }]; // Neue Lesezeichenseiten
let activeBookmarkPageId = load('activeBookmarkPageId') || "default"; // Aktive Lesezeichenseite
let bookmarksPanelVisible = load('bookmarksPanelVisible') || false; // Sichtbarkeit des Lesezeichen-Panels

// --- Apply stored background ---
if (background) {
  document.body.style.backgroundImage = `url(${background})`;
  document.body.style.backgroundSize = 'cover';
  document.body.style.backgroundRepeat = 'no-repeat';
  document.body.style.backgroundPosition = 'center center';
  document.body.style.backgroundAttachment = 'fixed';
}

// --- DOM References ---
const burger       = document.getElementById('burger');
const settings     = document.getElementById('settings');
const rows         = document.getElementById('rows');
const gals         = document.getElementById('galleries');
const addSearchBtn = document.getElementById('add-search');
const addGalleryBtn= document.getElementById('add-gallery');
const setBgBtn     = document.getElementById('set-bg');
const exportBtn    = document.getElementById('export-btn');
const importBtn    = document.getElementById('import-btn');
const importFile   = document.getElementById('import-file');
const bgFile       = document.getElementById('bg-file');
const cancelBtns   = document.querySelectorAll('.cancel');
const sidePanel    = document.getElementById('side-panel');
const closePanel   = document.getElementById('close-panel');
const showPanelBtn = document.getElementById('show-panel-btn');
const refreshTwitch   = document.getElementById('refresh-twitch');
const channelsInput = document.getElementById('twitch-channels-input');
const saveChannelsBtn = document.getElementById('save-channels');
const toggleChannelsInputBtn = document.getElementById('toggle-channels-input');
const hideChannelsInputBtn = document.getElementById('hide-channels-input');
const channelsInputContainer = document.getElementById('twitch-channels-input-container');

// Neue DOM-Referenzen für Lesezeichen
const bookmarksPanel = document.getElementById('bookmarks-panel');
const closeBookmarksPanel = document.getElementById('close-bookmarks-panel');
const showBookmarksBtn = document.getElementById('show-bookmarks-btn');
const bookmarkPagesNav = document.getElementById('bookmark-pages-nav');
const bookmarksList = document.getElementById('bookmarks-list');
const currentPageTitle = document.getElementById('current-page-title');
const addBookmarkBtn = document.getElementById('add-bookmark');
const addBookmarkPageBtn = document.getElementById('add-bookmark-page');
const toggleBookmarksPanelBtn = document.getElementById('toggle-bookmarks-panel');

// --- Toggle Burger Menu ---
burger.onclick = () => settings.classList.toggle('show');
cancelBtns.forEach(b => b.onclick = e => e.target.closest('.modal').classList.add('hidden'));

// --- Neuer Toggle für Löschbuttons ---
function updateDeleteButtonsVisibility() {
  document.body.classList.toggle('show-delete-buttons', showDeleteButtons);
  // Toggle-Button Text aktualisieren
  const toggleBtn = document.getElementById('toggle-delete-buttons');
  if (toggleBtn) {
    toggleBtn.textContent = showDeleteButtons ? '🔒 Löschbuttons ausblenden' : '🔓 Löschbuttons einblenden';
  }
}

// --- Render Search Bars ---
function renderSearches() {
  rows.innerHTML = '';
  searches.forEach((s, i) => {
    const r = document.createElement('div');
    r.className = 'row';
    r.innerHTML = `
      <img class="icon" src="${s.icon}" alt="Search icon">
      <input placeholder="Search…" data-index="${i}">
      <button class="delete-search" data-index="${i}">🗑️</button>
    `;
    const inp = r.querySelector('input');
    inp.onkeydown = e => {
      if (e.key === 'Enter') {
        const q = encodeURIComponent(inp.value);
        window.location.href = s.urlTemplate.replace('%s', q);
      }
    };

    // Löschen-Button für Suchleiste
    r.querySelector('.delete-search').onclick = () => {
      if (confirm('Suchleiste wirklich löschen?')) {
        searches.splice(i, 1);
        save('searches', searches);
        renderSearches();
      }
    };

    rows.appendChild(r);
  });
}

// --- Render Galleries ---
function renderGalleries() {
  gals.innerHTML = '';
  galleries.forEach((g, gi) => {
    const cont = document.createElement('div');
    cont.className = 'gallery';
    cont.innerHTML = `
      <div class="gallery-header">
        <h3>${g.name}</h3>
        <button class="delete-gallery" data-index="${gi}">🗑️</button>
      </div>
      <div class="images"></div>
    `;

    // Löschen-Button für Galerie
    cont.querySelector('.delete-gallery').onclick = () => {
      if (confirm(`Galerie "${g.name}" wirklich löschen?`)) {
        galleries.splice(gi, 1);
        save('galleries', galleries);
        renderGalleries();
      }
    };

    const imgs = cont.querySelector('.images');

    g.items.forEach((it, ii) => {
      const thumb = document.createElement('div');
      thumb.className = 'thumb';
      thumb.innerHTML = `
        <img src="${it.img}" alt="Gallery item ${ii + 1}">
        <button class="menu" data-g="${gi}" data-i="${ii}">⋮</button>
      `;

      // Navigate on click - Unterstützung für Mittelklick hinzufügen
      const img = thumb.querySelector('img');

      // mousedown statt mouseup verwenden und preventDefault für Mittelklick
      img.addEventListener('mousedown', (e) => {
        if (e.button === 1) { // Mittelklick
          e.preventDefault(); // Verhindert Standard-Scroll-Verhalten
        }
      });

      img.addEventListener('click', () => {
        window.location.href = it.link || '#';
      });

      // Zusätzlicher Event-Handler für Mittelklick
      img.addEventListener('auxclick', (e) => {
        if (e.button === 1) { // Mittelklick
          e.preventDefault();
          window.open(it.link || '#', '_blank');
        }
      });

      // Popup menu mit Toggle-Funktion
      thumb.querySelector('.menu').onclick = e => {
        const btn = e.target;
        const buttonId = `menu-${gi}-${ii}`;
        const existingPopup = document.querySelector(`.menu-popup[data-button-id="${buttonId}"]`);

        // Wenn ein Popup für diesen Button existiert, entfernen
        if (existingPopup) {
          existingPopup.remove();
          return;
        }

        // Ansonsten alle anderen Popups entfernen und ein neues erstellen
        document.querySelectorAll('.menu-popup').forEach(el => el.remove());

        const { g: gIdx, i: iIdx } = btn.dataset;
        const pop = document.createElement('div');
        pop.className = 'menu-popup';
        pop.dataset.buttonId = buttonId;
        pop.style.top  = `${btn.getBoundingClientRect().bottom + window.scrollY}px`;
        pop.style.left = `${btn.getBoundingClientRect().left + window.scrollX}px`;
        pop.innerHTML = `
          <button class="chg-img">Change Image</button>
          <button class="chg-link">Change Link</button>
        `;
        document.body.appendChild(pop);

        pop.querySelector('.chg-img').onclick = () => {
          const fi = document.createElement('input');
          fi.type = 'file'; fi.accept = 'image/*';
          fi.onchange = ev => {
            const file = ev.target.files[0];
            const reader = new FileReader();
            reader.onload = () => {
              galleries[gIdx].items[iIdx].img = reader.result;
              save('galleries', galleries);
              renderGalleries();
            };
            reader.readAsDataURL(file);
          };
          fi.click();
          pop.remove();
        };

        pop.querySelector('.chg-link').onclick = () => {
          const url = prompt('Enter new link URL:', it.link || '');
          if (url !== null) {
            galleries[gIdx].items[iIdx].link = url;
            save('galleries', galleries);
            renderGalleries();
          }
          pop.remove();
        };
      };

      imgs.appendChild(thumb);
    });

    gals.appendChild(cont);
  });
}

// --- Lesezeichenfunktionen ---

// Aktualisiert die Sichtbarkeit des Lesezeichen-Panels
function updateBookmarksPanelVisibility() {
  if (bookmarksPanelVisible) {
    bookmarksPanel.classList.remove('hidden');
    showBookmarksBtn.classList.add('hidden');
  } else {
    bookmarksPanel.classList.add('hidden');
    showBookmarksBtn.classList.remove('hidden');
  }
}

// Rendert die Lesezeichenseiten-Navigation
function renderBookmarkPages() {
  bookmarkPagesNav.innerHTML = '';

  bookmarkPages.forEach(page => {
    const pageTab = document.createElement('button');
    pageTab.className = `bookmark-page-tab ${page.id === activeBookmarkPageId ? 'active' : ''}`;
    pageTab.dataset.pageId = page.id;
    pageTab.innerHTML = `
      ${page.name} <span class="delete-page">✕</span>
    `;

    // Klick auf Seitenreiter
    pageTab.onclick = (e) => {
      // Verhindern, dass der Klick auf dem Lösch-Button hier verarbeitet wird
      if (e.target.classList.contains('delete-page')) return;

      // Aktive Seite ändern und neu rendern
      activeBookmarkPageId = page.id;
      save('activeBookmarkPageId', activeBookmarkPageId);
      renderBookmarkPages();
      renderBookmarks();
    };

    // Klick auf Lösch-Button
    pageTab.querySelector('.delete-page').onclick = (e) => {
      e.stopPropagation(); // Verhindert Auslösen des Klick-Events des Eltern-Elements

      // Verhindern, dass die letzte Seite gelöscht wird
      if (bookmarkPages.length === 1) {
        alert('Die letzte Lesezeichenseite kann nicht gelöscht werden.');
        return;
      }

      // Bestätigung und Löschen
      if (confirm(`Lesezeichenseite "${page.name}" wirklich löschen?`)) {
        bookmarkPages = bookmarkPages.filter(p => p.id !== page.id);

        // Falls die aktive Seite gelöscht wurde, zur ersten Seite wechseln
        if (page.id === activeBookmarkPageId) {
          activeBookmarkPageId = bookmarkPages[0].id;
        }

        save('bookmarkPages', bookmarkPages);
        save('activeBookmarkPageId', activeBookmarkPageId);
        renderBookmarkPages();
        renderBookmarks();
      }
    };

    bookmarkPagesNav.appendChild(pageTab);
  });
}

// Favicon einer URL abrufen
async function getFavicon(url) {
  try {
    // URL parsen, um den Hostnamen zu extrahieren
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    // Google Favicon API verwenden
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
  } catch (error) {
    console.error('Fehler beim Abrufen des Favicons:', error);
    // Fallback zu einem Standardicon
    return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0Ij48cGF0aCBmaWxsPSIjODA4MDgwIiBkPSJNMTIgMkM2LjQ4IDIgMiA2LjQ4IDIgMTJzNC40OCAxMCAxMCAxMCAxMC00LjQ4IDEwLTEwUzE3LjUyIDIgMTIgMnptMCAxOGMtNC40MSAwLTgtMy41OS04LThzMy41OS04IDgtOCA4IDMuNTkgOCA4LTMuNTkgOC04IDh6Ii8+PHBhdGggZmlsbD0iIzgwODA4MCIgZD0iTTExIDdoMnYyaC0yek0xMSAxMWgydjZoLTJ6Ii8+PC9zdmc+';
  }
}

// Lesezeichen rendern
async function renderBookmarks() {
  // Aktive Seite finden
  const activePage = bookmarkPages.find(page => page.id === activeBookmarkPageId) || bookmarkPages[0];

  // Seitentitel aktualisieren
  if (currentPageTitle) {
    currentPageTitle.textContent = activePage.name;
  }

  // Lesezeichenliste leeren
  bookmarksList.innerHTML = '';

  // Lesezeichen für aktive Seite anzeigen
  for (const bookmark of activePage.bookmarks) {
    const bookmarkItem = document.createElement('div');
    bookmarkItem.className = 'bookmark-item';

    // Favicon laden
    if (!bookmark.favicon) {
      bookmark.favicon = await getFavicon(bookmark.url);
      // Aktualisieren der Lesezeichenseiten im Speicher
      save('bookmarkPages', bookmarkPages);
    }

    bookmarkItem.innerHTML = `
      <img class="bookmark-favicon" src="${bookmark.favicon}" alt="${bookmark.name} favicon">
      <span class="bookmark-name">${bookmark.name}</span>
      <button class="delete-bookmark">🗑️</button>
    `;
    const faviconImg = bookmarkItem.querySelector('.bookmark-favicon');
    faviconImg.addEventListener('error', () => {
      faviconImg.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0Ij48cGF0aCBmaWxsPSIjODA4MDgwIiBkPSJNMTIgMkM2LjQ4IDIgMiA2LjQ4IDIgMTJzNC40OCAxMCAxMCAxMCAxMC00LjQ4IDEwLTEwUzE3LjUyIDIgMTIgMnptMCAxOGMtNC40MSAwLTgtMy41OS04LThzMy41OS04IDgtOCA4IDMuNTkgOCA4LTMuNTkgOC04IDh6Ii8+PHBhdGggZmlsbD0iIzgwODA4MCIgZD0iTTExIDdoMnYyaC0yek0xMSAxMWgydjZoLTJ6Ii8+PC9zdmc+';
    });

    // Verbesserte Mittelklick-Behandlung
    // mousedown Event verwenden um das Scrolling zu verhindern
    bookmarkItem.addEventListener('mousedown', (e) => {
      // Klick nicht auslösen, wenn auf den Lösch-Button geklickt wurde
      if (e.target.classList.contains('delete-bookmark')) return;

      if (e.button === 1) { // Mittelklick
        e.preventDefault(); // Verhindert Standard-Scroll-Verhalten
      }
    });

    // Linksklick behandeln
    bookmarkItem.addEventListener('click', (e) => {
      // Klick nicht auslösen, wenn auf den Lösch-Button geklickt wurde
      if (e.target.classList.contains('delete-bookmark')) return;

      window.location.href = bookmark.url;
    });

    // Mittelklick behandeln mit auxclick Event
    bookmarkItem.addEventListener('auxclick', (e) => {
      // Klick nicht auslösen, wenn auf den Lösch-Button geklickt wurde
      if (e.target.classList.contains('delete-bookmark')) return;

      if (e.button === 1) { // Mittelklick
        e.preventDefault();
        window.open(bookmark.url, '_blank');
      }
    });

    // Lösch-Button Event
    bookmarkItem.querySelector('.delete-bookmark').onclick = (e) => {
      e.stopPropagation(); // Verhindert Auslösen des Klick-Events des Eltern-Elements
      if (confirm(`Lesezeichen "${bookmark.name}" wirklich löschen?`)) {
        activePage.bookmarks = activePage.bookmarks.filter(b => b !== bookmark);
        save('bookmarkPages', bookmarkPages);
        renderBookmarks();
      }
    };

    bookmarksList.appendChild(bookmarkItem);
  }

  // Meldung anzeigen, wenn keine Lesezeichen vorhanden
  if (activePage.bookmarks.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'no-bookmarks';
    emptyMessage.textContent = 'Keine Lesezeichen vorhanden. Klicke auf "+" um Lesezeichen hinzuzufügen.';
    bookmarksList.appendChild(emptyMessage);
  }
}

// Neues Lesezeichen hinzufügen
async function addNewBookmark(name, url) {
  // URL formatieren (http hinzufügen falls nötig)
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  // Favicon abrufen
  const favicon = await getFavicon(url);

  // Aktive Seite finden
  const activePage = bookmarkPages.find(page => page.id === activeBookmarkPageId);

  if (activePage) {
    // Lesezeichen zur aktiven Seite hinzufügen
    activePage.bookmarks.push({ name, url, favicon });
    save('bookmarkPages', bookmarkPages);
    renderBookmarks();
  }
}

// Neue Lesezeichenseite hinzufügen
function addNewBookmarkPage(name) {
  // Eindeutige ID generieren
  const id = 'page-' + Date.now();

  // Neue Seite erstellen
  bookmarkPages.push({
    id,
    name,
    bookmarks: []
  });

  // Zur neuen Seite wechseln
  activeBookmarkPageId = id;

  save('bookmarkPages', bookmarkPages);
  save('activeBookmarkPageId', activeBookmarkPageId);

  renderBookmarkPages();
  renderBookmarks();
}

// Event Handler für Lesezeichen-Panel
closeBookmarksPanel.onclick = () => {
  bookmarksPanelVisible = false;
  save('bookmarksPanelVisible', bookmarksPanelVisible);
  updateBookmarksPanelVisibility();
};

showBookmarksBtn.onclick = () => {
  bookmarksPanelVisible = true;
  save('bookmarksPanelVisible', bookmarksPanelVisible);
  updateBookmarksPanelVisibility();
};

toggleBookmarksPanelBtn.onclick = () => {
  bookmarksPanelVisible = !bookmarksPanelVisible;
  save('bookmarksPanelVisible', bookmarksPanelVisible);
  updateBookmarksPanelVisibility();
};

// Lesezeichen hinzufügen
addBookmarkBtn.onclick = () => {
  document.getElementById('bookmark-form').classList.remove('hidden');
};

document.getElementById('save-bookmark').onclick = async () => {
  const name = document.getElementById('bookmark-name').value.trim();
  const url = document.getElementById('bookmark-url').value.trim();

  if (!name || !url) {
    alert('Bitte geben Sie einen Namen und eine URL ein.');
    return;
  }

  await addNewBookmark(name, url);
  document.getElementById('bookmark-form').classList.add('hidden');
  document.getElementById('bookmark-name').value = '';
  document.getElementById('bookmark-url').value = '';
};

// Lesezeichenseite hinzufügen
addBookmarkPageBtn.onclick = () => {
  document.getElementById('bookmark-page-form').classList.remove('hidden');
};

document.getElementById('save-bookmark-page').onclick = () => {
  const name = document.getElementById('bookmark-page-name').value.trim();

  if (!name) {
    alert('Bitte geben Sie einen Namen ein.');
    return;
  }

  addNewBookmarkPage(name);
  document.getElementById('bookmark-page-form').classList.add('hidden');
  document.getElementById('bookmark-page-name').value = '';
};

// --- Initial Render ---
renderSearches();
renderGalleries();
updateDeleteButtonsVisibility();
updateTwitchPanelVisibility();
updateTwitchChannelsInput();
updateChannelsInputVisibility();
updateBookmarksPanelVisibility();
renderBookmarkPages();
renderBookmarks();

// --- Add Search Bar Flow ---
addSearchBtn.onclick = () => document.getElementById('search-form').classList.remove('hidden');
document.getElementById('save-search').onclick = () => {
  const iconF = document.getElementById('search-icon').files[0];
  const urlT  = document.getElementById('search-url').value;
  
  if (!iconF || !urlT) {
    alert('Please provide both an icon and URL template');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = () => {
    searches.push({
      icon: reader.result,
      urlTemplate: urlT
    });
    save('searches', searches);
    renderSearches();
    document.getElementById('search-form').classList.add('hidden');
    document.getElementById('search-icon').value = '';
    document.getElementById('search-url').value = '';
  };
  reader.readAsDataURL(iconF);
};

// --- Add Link Gallery Flow ---
addGalleryBtn.onclick = () => document.getElementById('gallery-form').classList.remove('hidden');
document.getElementById('save-gallery').onclick = () => {
  const name = document.getElementById('gallery-name').value.trim();
  if (!name) return alert('Bitte geben Sie einen Namen ein.');

  // Erstelle 6 leere Einträge als Platzhalter
  const items = Array.from({ length: 6 }, () => ({
    img: '',
    link: '#'
  }));

  galleries.push({ name, items });
  save('galleries', galleries);
  renderGalleries();
  document.getElementById('gallery-form').classList.add('hidden');
  document.getElementById('gallery-name').value = '';
};

// --- Set Background Flow ---
setBgBtn.onclick = () => bgFile.click();
bgFile.onchange = e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    background = reader.result;
    save('background', background);
    document.body.style.backgroundImage = `url(${background})`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundRepeat = 'no-repeat';
    document.body.style.backgroundPosition = 'center center';
    document.body.style.backgroundAttachment = 'fixed';
  };
  reader.readAsDataURL(file);
  bgFile.value = '';
};

// --- Export / Import Settings ---
exportBtn.onclick = () => {
  const data = { 
    searches, 
    galleries, 
    background, 
    showDeleteButtons,
    twitchChannels,
    twitchPanelVisible,
    channelsInputVisible,
    bookmarkPages,
    activeBookmarkPageId,
    bookmarksPanelVisible
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'startpage-settings.json';
  a.click();
  URL.revokeObjectURL(url);
};

importBtn.onclick = () => importFile.click();
importFile.onchange = e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const obj = JSON.parse(reader.result);
      if (!Array.isArray(obj.searches) || !Array.isArray(obj.galleries)) {
        console.warn('Invalid format during import');
        alert('Import failed: Invalid format');
        return;
      }
      searches   = obj.searches;
      galleries  = obj.galleries;
      background = obj.background || null;
      showDeleteButtons = obj.showDeleteButtons || false;
      twitchChannels = obj.twitchChannels || [];
      twitchPanelVisible = obj.twitchPanelVisible || false;
      channelsInputVisible = obj.channelsInputVisible !== undefined ? obj.channelsInputVisible : true;
      bookmarkPages = obj.bookmarkPages || [{ id: "default", name: "Allgemein", bookmarks: [] }];
      activeBookmarkPageId = obj.activeBookmarkPageId || "default";
      bookmarksPanelVisible = obj.bookmarksPanelVisible || false;

      save('searches', searches);
      save('galleries', galleries);
      save('background', background);
      save('showDeleteButtons', showDeleteButtons);
      save('twitchChannels', twitchChannels);
      save('twitchPanelVisible', twitchPanelVisible);
      save('channelsInputVisible', channelsInputVisible);
      save('bookmarkPages', bookmarkPages);
      save('activeBookmarkPageId', activeBookmarkPageId);
      save('bookmarksPanelVisible', bookmarksPanelVisible);

      if (background) {
        document.body.style.backgroundImage = `url(${background})`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundRepeat = 'no-repeat';
        document.body.style.backgroundPosition = 'center center';
        document.body.style.backgroundAttachment = 'fixed';
      }
      renderSearches();
      renderGalleries();
      updateDeleteButtonsVisibility();
      updateTwitchPanelVisibility();
      updateTwitchChannelsInput();
      updateChannelsInputVisibility();
      updateBookmarksPanelVisibility();
      renderBookmarkPages();
      renderBookmarks();
      fetchTwitchChannelData();
      alert('Settings imported successfully!');
    } catch (err) {
      alert('Import failed: ' + err.message);
    }
  };
  reader.readAsText(file);
  importFile.value = '';
};

// --- Toggle Löschbuttons ---
document.getElementById('toggle-delete-buttons').addEventListener('click', () => {
  showDeleteButtons = !showDeleteButtons;
  save('showDeleteButtons', showDeleteButtons);
  updateDeleteButtonsVisibility();
});

// --- Neue Twitch Panel Funktionen ---

// Sichtbarkeit des Twitch Panels aktualisieren
function updateTwitchPanelVisibility() {
  if (twitchPanelVisible) {
    sidePanel.classList.remove('hidden');
    showPanelBtn.classList.add('hidden');
  } else {
    sidePanel.classList.add('hidden');
    showPanelBtn.classList.remove('hidden');
  }
}

// Twitch Panel schließen
closePanel.addEventListener('click', () => {
  twitchPanelVisible = false;
  save('twitchPanelVisible', twitchPanelVisible);
  updateTwitchPanelVisibility();
});

// Twitch Panel mit dem Pfeil-Button wieder anzeigen
showPanelBtn.addEventListener('click', () => {
  twitchPanelVisible = true;
  save('twitchPanelVisible', twitchPanelVisible);
  updateTwitchPanelVisibility();
});

// Kanallisteneingabe aktualisieren
function updateTwitchChannelsInput() {
  if (channelsInput) {
    channelsInput.value = twitchChannels.join(';');
  }
}

// --- Neue Funktion für Kanaleingabe Ein-/Ausblenden ---
function updateChannelsInputVisibility() {
  if (channelsInputVisible) {
    channelsInputContainer.classList.remove('hidden');
    toggleChannelsInputBtn.classList.add('hidden');
    // Twitch-Panel-Layout anpassen
    document.documentElement.style.setProperty('--channels-max-height', 'calc(100vh - 250px)');
  } else {
    channelsInputContainer.classList.add('hidden');
    toggleChannelsInputBtn.classList.remove('hidden');
    // Twitch-Panel-Layout anpassen für maximalen Platz
    document.documentElement.style.setProperty('--channels-max-height', 'calc(100vh - 120px)');
  }
  
  // Kurze Verzögerung, um DOM-Updates zu gewährleisten
  setTimeout(() => {
    window.dispatchEvent(new Event('resize'));
  }, 50);
}

// Event-Listener für Ein-/Ausblend-Buttons
toggleChannelsInputBtn.addEventListener('click', () => {
  channelsInputVisible = true;
  save('channelsInputVisible', channelsInputVisible);
  updateChannelsInputVisibility();
});

hideChannelsInputBtn.addEventListener('click', () => {
  channelsInputVisible = false;
  save('channelsInputVisible', channelsInputVisible);
  updateChannelsInputVisibility();
});

// Kanalliste speichern
saveChannelsBtn.addEventListener('click', () => {
  const input = channelsInput.value;
  // Kanäle mit Semikolon trennen, leerzeichen entfernen und leere Einträge filtern
  twitchChannels = input.split(';')
    .map(channel => channel.trim().toLowerCase())
    .filter(channel => channel.length > 0);
  
  save('twitchChannels', twitchChannels);
  fetchTwitchChannelData();
});

// Kanalinformationen von Twitch abrufen
async function fetchTwitchChannelData() {
  if (!twitchChannels.length) {
    twitchChannelData = [];
    save('twitchChannelData', twitchChannelData);
    renderTwitchChannels();
    return;
  }
  
  // Lade-Anzeige
  const container = document.getElementById('twitch-channels-list');
  if (container) {
    container.innerHTML = '<div class="loading-channels">Kanäle werden geladen...</div>';
  }
  
  try {
    // GraphQL für alle Kanäle in einem Batch abfragen
    const operationsDoc = `
      query {
        ${twitchChannels.map((channel, index) => `
          user${index}: user(login: "${channel}") {
            id
            login
            displayName
            profileImageURL(width: 70)
            stream {
              id
              title
              viewersCount
              game {
                name
              }
            }
          }
        `).join('\n')}
      }
    `;
    
    const response = await fetch('https://gql.twitch.tv/gql', {
      method: 'POST',
      headers: {
        'Client-ID': 'kimne78kx3ncx6brgo4mv6wki5h1ko', // Public Twitch Client-ID
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: operationsDoc })
    });
    
    const result = await response.json();
    
    // Verarbeite die Ergebnisse
    if (result && result.data) {
      const channelData = [];
      
      // Durchlaufe alle Benutzer-Ergebnisse
      for (let i = 0; i < twitchChannels.length; i++) {
        const userKey = `user${i}`;
        const user = result.data[userKey];
        
        if (user) {
          channelData.push({
            id: user.id,
            login: user.login,
            display_name: user.displayName,
            profile_image_url: user.profileImageURL,
            isLive: !!user.stream,
            stream: user.stream ? {
              title: user.stream.title,
              viewer_count: user.stream.viewersCount,
              game_name: user.stream.game ? user.stream.game.name : 'Streaming'
            } : null
          });
        }
      }
      
      twitchChannelData = channelData;
      save('twitchChannelData', twitchChannelData);
    } else {
      console.warn('Ungültiges Antwortformat von Twitch');
      const container = document.getElementById('twitch-channels-list');
      if (container) container.innerHTML = '<div class="error-channels">Ungültige Twitch-Antwort</div>';
      return;
    }
  } catch (error) {
    console.error('Fehler beim Abrufen der Twitch-Daten:', error);
    
    // Versuche als Fallback Anfragen für jeden Kanal einzeln zu senden
    try {
      await fetchChannelsIndividually();
    } catch (fallbackError) {
      console.error('Auch Fallback-Methode fehlgeschlagen:', fallbackError);
      // Zeige Fehlermeldung im Container
      if (container) {
        container.innerHTML = '<div class="error-channels">Fehler beim Laden der Kanäle</div>';
      }
    }
  }
  
  renderTwitchChannels();
}

// Fallback-Methode: Kanäle einzeln abfragen
async function fetchChannelsIndividually() {
  const channelData = [];
  
  for (const channelName of twitchChannels) {
    try {
      const query = `
        query {
          user(login: "${channelName}") {
            id
            login
            displayName
            profileImageURL(width: 70)
            stream {
              id
              title
              viewersCount
              game {
                name
              }
            }
          }
        }
      `;
      
      const response = await fetch('https://gql.twitch.tv/gql', {
        method: 'POST',
        headers: {
          'Client-ID': 'kimne78kx3ncx6brgo4mv6wki5h1ko',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });
      
      const result = await response.json();
      const user = result.data?.user;
      
      if (user) {
        channelData.push({
          id: user.id,
          login: user.login,
          display_name: user.displayName,
          profile_image_url: user.profileImageURL,
          isLive: !!user.stream,
          stream: user.stream ? {
            title: user.stream.title,
            viewer_count: user.stream.viewersCount,
            game_name: user.stream.game ? user.stream.game.name : 'Streaming'
          } : null
        });
      }
    } catch (error) {
      console.warn(`Fehler beim Abrufen von Kanal ${channelName}:`, error);
    }
  }
  
  if (channelData.length > 0) {
    twitchChannelData = channelData;
    save('twitchChannelData', twitchChannelData);
  }
}

// Twitch-Kanäle anzeigen
function renderTwitchChannels() {
  const container = document.getElementById('twitch-channels-list');
  if (!container) return;

  container.innerHTML = '';

  if (!twitchChannelData.length) {
    container.innerHTML = '<div class="no-channels">Keine Kanäle gefunden oder hinzugefügt</div>';
    return;
  }

  // Kanäle sortieren: Live zuerst nach Zuschauerzahl, dann offline alphabetisch
  const sortedChannels = [...twitchChannelData].sort((a, b) => {
    // Live-Kanäle zuerst
    if (a.isLive && !b.isLive) return -1;
    if (!a.isLive && b.isLive) return 1;

    // Für Live-Kanäle nach Zuschauerzahl sortieren
    if (a.isLive && b.isLive) {
      return (b.stream?.viewer_count || 0) - (a.stream?.viewer_count || 0);
    }

    // Offline-Kanäle alphabetisch sortieren
    return a.display_name.localeCompare(b.display_name);
  });

  sortedChannels.forEach(channel => {
    const channelEl = document.createElement('div');
    channelEl.className = `twitch-channel ${channel.isLive ? 'live' : ''}`;

    let streamInfo = '';
    if (channel.isLive && channel.stream) {
      streamInfo = `
        <div class="stream-info">
          <span class="live-indicator"></span>
          ${channel.stream.game_name || 'Streaming'} - ${channel.stream.viewer_count} Zuschauer
        </div>
      `;
    }

    channelEl.innerHTML = `
      <img class="channel-avatar" alt="${channel.display_name}" src="${channel.profile_image_url}">
      <div class="channel-info">
        <div class="channel-name">${channel.display_name}</div>
        ${streamInfo}
      </div>
    `;
    const avatar = channelEl.querySelector('.channel-avatar');
    avatar.addEventListener('error', () => {
      avatar.src = 'https://static-cdn.jtvnw.net/user-default-pictures-uv/75305d54-c7cc-40d1-bb9c-91fbe85943c7-profile_image-70x70.png';
    });

    // Verbesserte Mittelklick-Unterstützung für Twitch-Kanäle
    // mousedown Event verwenden um das Scrolling zu verhindern
    channelEl.addEventListener('mousedown', (e) => {
      if (e.button === 1) { // Mittelklick
        e.preventDefault(); // Verhindert Standard-Scroll-Verhalten
      }
    });

    // Linksklick behandeln
    channelEl.addEventListener('click', () => {
      window.location.href = `https://twitch.tv/${channel.login}`;
    });

    // Mittelklick behandeln mit auxclick Event
    channelEl.addEventListener('auxclick', (e) => {
      if (e.button === 1) { // Mittelklick
        e.preventDefault();
        window.open(`https://twitch.tv/${channel.login}`, '_blank');
      }
    });

    container.appendChild(channelEl);
  });
}

// Aktualisieren-Button
refreshTwitch.addEventListener('click', () => {
  fetchTwitchChannelData();
});

// Bei Seitenlade Twitch-Daten initialisieren
document.addEventListener('DOMContentLoaded', () => {
  updateTwitchPanelVisibility();
  updateTwitchChannelsInput();
  updateBookmarksPanelVisibility();

  // Wenn Kanäle gespeichert sind, Daten abrufen
  if (twitchChannels.length > 0) {
    fetchTwitchChannelData();
  } else {
    renderTwitchChannels();
  }
});

// --- Responsive Panel Auto-Hide ---
(function initAutoHidePanels() {
  const leftPanel = document.getElementById('side-panel');
  const rightPanel = document.getElementById('bookmarks-panel');
  const showLeftBtn = document.getElementById('show-panel-btn');
  const showRightBtn = document.getElementById('show-bookmarks-btn');

  // Persist user override in memory (not localStorage per request simplicity)
  let userForcedLeftVisible = false;
  let userForcedRightVisible = false;
  const THRESHOLD = 1700;

  function applyAutoHide() {
    const small = window.innerWidth <= THRESHOLD;
    if (!leftPanel || !rightPanel) return;

    if (small) {
      // Auto hide if not user-forced visible
      if (!userForcedLeftVisible && !leftPanel.classList.contains('hidden')) {
        leftPanel.classList.add('hidden');
        showLeftBtn.classList.remove('hidden');
      }
      if (!userForcedRightVisible && !rightPanel.classList.contains('hidden')) {
        rightPanel.classList.add('hidden');
        showRightBtn.classList.remove('hidden');
      }
    } else {
      // Ensure panels visible in large view unless manually closed
      if (leftPanel.classList.contains('hidden')) {
        leftPanel.classList.remove('hidden');
        showLeftBtn.classList.add('hidden');
      }
      if (rightPanel.classList.contains('hidden')) {
        rightPanel.classList.remove('hidden');
        showRightBtn.classList.add('hidden');
      }
      userForcedLeftVisible = false;
      userForcedRightVisible = false;
    }
  }

  // Hook into existing show buttons
  if (showLeftBtn) {
    showLeftBtn.addEventListener('click', () => {
      leftPanel.classList.remove('hidden');
      showLeftBtn.classList.add('hidden');
      userForcedLeftVisible = true; // Keep visible even while small
    });
  }
  if (showRightBtn) {
    showRightBtn.addEventListener('click', () => {
      rightPanel.classList.remove('hidden');
      showRightBtn.classList.add('hidden');
      userForcedRightVisible = true;
    });
  }

  // When user closes manually, reset forced flag so auto-hide can happen again
  if (closePanel) {
    closePanel.addEventListener('click', () => {
      userForcedLeftVisible = false;
      applyAutoHide();
    });
  }
  if (closeBookmarksPanel) {
    closeBookmarksPanel.addEventListener('click', () => {
      userForcedRightVisible = false;
      applyAutoHide();
    });
  }

  window.addEventListener('resize', applyAutoHide);
  // Run once after initial visibility application
  setTimeout(applyAutoHide, 0);
})();
