# Installation Guide - Smart Dialogue Colorizer Extended

## 📦 Quick Install

### Method 1: Using SillyTavern's Extension Installer (Recommended)

1. Open SillyTavern
2. Click on the **Extensions** (three blocks) icon
3. Click **Install Extension**
4. Enter `https://github.com/gusta01010/SillyTavern-Smart-Dialogue-Colorizer-Extended`
5. Click **Install just for me** or **Install for all users** depending of your choice
6. Wait until the installation finishes with a green message and refresh the page.

### Method 2: Manual Installation

1. In `https://github.com/gusta01010/SillyTavern-Smart-Dialogue-Colorizer-Extended`, click the green icon `<> Code` and select `Download ZIP` to download the file.
2. Navigate to your SillyTavern directory
3. Go to: `public/scripts/extensions/third-party/`
4. Inside the `SillyTavern-Smart-Dialogue-Colorizer-Extended-main.zip` downloaded file, extract the `SillyTavern-Smart-Dialogue-Colorizer-Extended-main` folder to inside `third-party/` folder. and rename it to `SillyTavern-Smart-Dialogue-Colorizer-Extended`. The final result should look like this: `public/scripts/extensions/third-party/SillyTavern-Smart-Dialogue-Colorizer-Extended/`
6. Refresh SillyTavern (F5 or Ctrl+R)

## ⚙️ Initial Setup

1. Open the **Extensions** panel (three blocks icon)
3. Scroll down to find **Smart Dialogue Colorizer Extended**
4. Click to expand the settings and configure it freely.

## 🧪 Testing

1. Start or open a chat
2. Look at, for example quoted text in messages (text between `"quotes"`)
3. Colors should automatically apply based on who's speaking (**Configurable with Quotation Marks** setting)
4. Try switching characters to see colors change
5. Send a message as yourself to test persona colors, feel free to test other options such as `*italic*, Raw text, **Bold text**`

## 🔧 Troubleshooting

### Colors Not Appearing
- Check if extension is enabled in Extensions panel
- Verify the extension loaded without errors (check browser console: F12)
- Make sure it's not the `Disabled` option selected in settings.
- Try refreshing the page (F5)

### Colors Are Too Dark/Light
- The extension has built-in quality filtering
- If a color fails quality checks, it uses a fallback
- You can set per-character overrides for specific colors
- Or use "Static Color" mode for consistent results

### Extension Not Loading
- Check folder name is exactly: `Smart-Dialogue-Colorizer-Extended`
- Verify all files are present (especially `manifest.json`)
- Check browser console (F12) for error messages
- Make sure SillyTavern is up to date

### Conflicts with Other Extensions
- This extension uses prefix `sdc-` to avoid conflicts
- If issues occur, try disabling other dialogue-related extensions

## 📊 Performance Notes

- Colors are cached per character for better performance
- Cache is cleared when avatars change
- Smart extraction runs once per character when first encountered
- Minimal performance impact on chat loading

## 🆘 Getting Help

If you encounter issues:
1. Check browser console (F12) for errors
2. Look for messages starting with `[SDC]`
3. Verify extension version in manifest.json (should be 2.5.0)
4. Report issues with:
   - SillyTavern version
   - Browser and version
   - Error messages from console
   - Steps to reproduce

## 🔄 Updating

### From GitHub (if auto-update is enabled):
1. Extension will update automatically
2. Refresh SillyTavern to load new version

### Manual Update:
1. Backup your settings (export settings from ST)
2. Replace all extension files with new versions
3. Refresh SillyTavern
4. Settings should be preserved automatically

