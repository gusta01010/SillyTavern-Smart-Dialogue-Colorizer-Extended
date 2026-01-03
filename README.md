# Smart Dialogue Colorizer Extended

Originally inspired by [Smart Dialogue Colorizer](https://github.com/b4bysw0rld/SillyTavern-Smart-Dialogue-Colorizer).

A SillyTavern extension that automatically applies semantic coloring (`*italics*`, `raw text`, `**bold**`, `"quotes"`) based on character avatars. Features intelligent color extraction, quality filtering, and high customizability.

## ✨ Features

### Smart Color Extraction
- **Intelligent Fallback System**: Automatically tries multiple color extraction methods with samples from Color Thief when none is found.
- **Quality Filtering**: Automatically rejects colors that are too dark or too desaturated
- **Enhanced Contrast**: Optimizes colors for readability on dark backgrounds based lightness and saturation automatically.

### Customization Options
- **Character Colors**: Separate settings for characters (**Character Narration & Dialogue**) and user personas (**Persona Narration & Dialogue**).
- **Character Name Coloring**: Optionally apply colors to character names in addition to dialogue quotes

### CSS Variable Support
Assigns character colors to a CSS variable `--character-color` scoped to message elements for use in custom CSS:

```css
/* Example: Color avatar borders */
div.mes .mesAvatarWrapper .avatar {
    outline: 1px solid var(--character-color);
    box-shadow: 0px 0px 2px 1px rgb(from var(--character-color) r g b / 80%);
}

/* Example: Color message metadata */
div.mes .mesIDDisplay:not(:empty) {
    outline: 1px solid var(--character-color);
    background-color: rgba(20, 20, 20, 0.7);
}
```

## 📦 Installation

1. Open SillyTavern
2. Go to **Extensions** → **Install Extension**
3. Enter this repository's URL
4. Click **Save**

Alternatively, manually place the extension folder in:
```
SillyTavern/public/scripts/extensions/third-party/Smart-Dialogue-Colorizer-Extended/
```

## 🎨 Usage

1. Open **Extensions** panel in SillyTavern
2. Find **Smart Dialogue Colorizer Extended** settings
3. Configure:
   - **Character Dialogue Settings**: How character texts are colored
   - **Persona Dialogue Settings**: How your persona's texts are colored
4. Apply color to char names (optional)

## 🔧 Configuration

### Color Source Options

Uses intelligent color extraction with quality filtering for many types available:
- **Light Vibrant**
- **Vibrant**
- **Dark Vibrant**
- **Light Muted**
- **Muted**
- **Dark Muted**

## 🆚 Improvements Over Original

- This fork maintains a simpler, more flexible options approach.
- More reliable color extraction that works with a wider variety of avatars
- Smart fallback system prevents failures when vibrant colors aren't available with Color Thief as fallback to Vibrant.js.
- Revamped contrast and lightness algorithm that ensures readability
- Quality filtering removes poor color choices
- Simplified UI focused on quoted text (no chat bubble complexity)
- Cleaner codebase with better performance, no bloat.

## 📝 License

MIT License - see [LICENSE](./LICENSE)
