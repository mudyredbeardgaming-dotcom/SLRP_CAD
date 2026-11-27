// StrataMDT launcher: runs every time the app opens.
//   1. Check GitHub Releases for a newer app version. If there is one, it is
//      downloaded, installed and the app restarts, before the CAD can be used.
//   2. Open the CAD server (saved after the first launch).
(function () {
  const T = window.__TAURI__ || {};
  const CFG = window.STRATA_DESKTOP || {};
  const KEY = 'strataServerUrl';
  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  let wantsServerChange = false;

  const setStatus = (text, done) => {
    $('status').textContent = text;
    $('spinner').classList.toggle('done', !!done);
  };
  const setProgress = (fraction) => {
    $('progress').hidden = fraction == null;
    if (fraction != null) $('progress-bar').style.width = `${Math.round(fraction * 100)}%`;
  };

  const readServer = () => {
    try { return localStorage.getItem(KEY) || ''; } catch { return ''; }
  };
  const saveServer = (url) => {
    try { localStorage.setItem(KEY, url); } catch {}
  };
  /** "my-cad.up.railway.app" -> "https://my-cad.up.railway.app" (no trailing slash). */
  const normalize = (raw) => {
    let s = String(raw || '').trim();
    if (!s) return '';
    if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
    try {
      const u = new URL(s);
      return `${u.protocol}//${u.host}${u.pathname.replace(/\/+$/, '')}`;
    } catch { return ''; }
  };

  async function showVersion() {
    try {
      const v = await T.app.getVersion();
      $('version').textContent = `Version ${v}`;
    } catch {}
  }

  /** Returns true when the app is restarting into a new version. */
  async function updateIfAvailable() {
    if (!T.updater) return false; // running outside the app (e.g. opened in a browser)
    setStatus('Checking for updates…');
    try {
      const update = await T.updater.check();
      if (!update) {
        setStatus('StrataMDT is up to date', true);
        return false;
      }
      setStatus(`Installing update ${update.version}…`);
      let total = 0;
      let received = 0;
      setProgress(0);
      await update.downloadAndInstall((event) => {
        if (event.event === 'Started') total = event.data.contentLength || 0;
        else if (event.event === 'Progress') {
          received += event.data.chunkLength || 0;
          setProgress(total ? Math.min(1, received / total) : null);
        } else if (event.event === 'Finished') setProgress(1);
      });
      setStatus('Restarting…');
      await T.process.relaunch();
      return true;
    } catch (err) {
      // No internet / GitHub unreachable: carry on with the installed version.
      console.warn('Update check failed', err);
      setStatus('Could not check for updates', true);
      await sleep(800);
      return false;
    }
  }

  /** True when the server answers within the timeout. */
  async function reachable(url) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), CFG.CONNECT_TIMEOUT_MS || 10000);
    try {
      await fetch(url, { mode: 'no-cors', cache: 'no-store', signal: ctl.signal });
      return true;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  function askForServer(message) {
    $('status-view').hidden = true;
    $('server-view').hidden = false;
    $('server-input').value = readServer() || CFG.DEFAULT_SERVER || '';
    $('server-error').hidden = !message;
    $('server-error').textContent = message || '';
    $('server-input').focus();
  }

  async function connect(url) {
    $('server-view').hidden = true;
    $('status-view').hidden = false;
    $('server-line').hidden = false;
    $('server-label').textContent = url.replace(/^https?:\/\//, '');
    setStatus('Connecting to the CAD…');
    if (!(await reachable(url))) {
      askForServer(`Could not reach ${url}. Check the address or your connection.`);
      return;
    }
    if (wantsServerChange) { askForServer(); return; }
    saveServer(url);
    window.location.replace(url); // the CAD takes over this window
  }

  $('change-server').addEventListener('click', () => {
    wantsServerChange = true;
    askForServer();
  });
  $('server-view').addEventListener('submit', (e) => {
    e.preventDefault();
    const url = normalize($('server-input').value);
    if (!url) {
      $('server-error').hidden = false;
      $('server-error').textContent = 'Enter the CAD address, e.g. https://your-cad.up.railway.app';
      return;
    }
    wantsServerChange = false;
    connect(url);
  });

  (async function start() {
    showVersion();
    const saved = normalize(readServer() || CFG.DEFAULT_SERVER || '');
    if (saved) {
      $('server-line').hidden = false;
      $('server-label').textContent = saved.replace(/^https?:\/\//, '');
    }
    if (await updateIfAvailable()) return; // restarting into the new version
    if (wantsServerChange) return;
    if (!saved) { askForServer(); return; }
    connect(saved);
  })();
})();
