# StrataMDT Desktop

The StrataMDT CAD as a Windows app, built with [Tauri](https://tauri.app). It uses Rust for the app itself and Windows' built-in WebView2 to draw the CAD's screens. It is not Electron, and the installer is about 10 MB.

## What it does

Every time it opens, the launcher:

1. **Checks for updates.** It reads `latest.json` from this repo's newest GitHub Release. If a newer version exists, it downloads it, checks the signature, installs it and restarts before the CAD can be used. If there's no internet, it starts the installed version.
2. **Opens the CAD.** It connects to the CAD server saved on this PC. On first launch it asks for the address, or uses `DEFAULT_SERVER` in `src/config.js`. **Change** on the launcher switches servers.

The CAD itself runs on the server, so CAD changes show up as soon as Railway deploys them. The app only needs a new release when something in `desktop/` changes.

## One-time setup (repository owner)

1. **Updater signing key.** Add these repository secrets under *Settings → Secrets and variables → Actions*:
   - `TAURI_SIGNING_PRIVATE_KEY`: the full contents of `strata-mdt-updater.key`, which was generated outside the repo in your user folder (`%USERPROFILE%\.tauri\`).
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: leave empty; the key has no password.

   **Back up that key file.** Installed apps only accept updates signed with it. If it's lost, every user has to reinstall by hand.
2. Optional: set `DEFAULT_SERVER` in `src/config.js` to your Railway URL, so players don't have to type it.
3. Optional: a Windows code-signing certificate. See below.

## Releasing a version

```bash
cd desktop
node scripts/set-version.mjs 0.2.0
git commit -am "Desktop 0.2.0"
git tag desktop-v0.2.0
git push && git push origin desktop-v0.2.0
```

The **Desktop release** workflow builds `StrataMDT_0.2.0_x64-setup.exe` and publishes it with the signed `latest.json` as a GitHub Release. Installed copies update themselves the next time they open.

The **Desktop check** workflow compiles the app on every change to `desktop/`.

## Code signing (Windows SmartScreen)

Without a code-signing certificate, Windows shows "Windows protected your PC / Unknown publisher" the first time someone runs the installer (*More info → Run anyway*). Updates are still verified with the updater key above.

A trusted certificate has to be issued by a certificate authority after it verifies who you are, so it can't be generated here. The options are:

- **Azure Trusted Signing**: about $10/month. Requires identity verification (organization or individual, depending on region).
- **An OV code-signing certificate** from Sectigo, SSL.com, DigiCert, etc. A few hundred dollars a year, with identity checks. These now come on a hardware token or as a cloud service.
- **SignPath Foundation**: free code signing for open-source projects that meet their requirements.

With a `.pfx` certificate, add the repository secrets `WINDOWS_CERTIFICATE` (the `.pfx` file as base64) and `WINDOWS_CERTIFICATE_PASSWORD`. The release workflow then signs the app and installer automatically. Cloud and hardware-token certificates need their own signing step instead; Tauri supports this through `bundle.windows.signCommand`.

## Development

Requires Rust and Node.

```bash
cd desktop
npm install
npm run dev     # run the app
npm run build   # build the installer locally (needs TAURI_SIGNING_PRIVATE_KEY set)
```
