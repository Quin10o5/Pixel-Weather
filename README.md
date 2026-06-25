# Pixel Weather

Pixel-art **clouds**, **rain**, and **thunder** in a strip above your editor. The scene uses your editor background color so it blends with your theme.

## Screenshots

**Rain with sun**

![Rain with sun](https://raw.githubusercontent.com/Quin10o5/Pixel-Weather/main/media/screenshots/rain-sun.png)

**Snowy night with moon and birds**

![Snowy night with moon and birds](https://raw.githubusercontent.com/Quin10o5/Pixel-Weather/main/media/screenshots/snow-moon.png)

**Cloudy dusk with sun and birds**

![Cloudy dusk with sun and birds](https://raw.githubusercontent.com/Quin10o5/Pixel-Weather/main/media/screenshots/cloudy-dusk.png)

## Layout

On startup the extension moves the **Panel to the top** of the window (above your code). Drag the panel edge to resize — ~120–200px works well.

> VS Code does not allow drawing directly over the editor. The weather strip sits in the top panel, with rain splashing along the **bottom edge** of that strip (where it meets your code).

## Settings

Open **Settings → Extensions → Pixel Weather**, or run **Pixel Weather: Open Extension Settings**.

| Setting | Default | Description |
|---------|---------|-------------|
| `weather.enabled` | `true` | Show the weather scene |
| `weather.showOnStartup` | `true` | Open the panel when Cursor starts |
| `weather.intensity` | `1.0` | Effect strength (0–2) |
| `weather.dayNight` | `true` | Sun/moon cycle from local time |
| `weather.birds` | `true` | Occasional bird flocks |
| `weather.lightning` | `true` | Lightning during storms |
| `weather.snowSeason` | `auto` | When snow can appear |
| `weather.uiMode` | `normal` | In-panel ☰ menu: simple or developer |

Use **Pixel Weather: Use Normal Settings Mode** / **Pixel Weather: Use Developer Mode** to switch the ☰ menu.

## Commands

- **Pixel Weather: Show Panel** — move panel to top and open weather
- **Pixel Weather: Open Extension Settings**
- **Pixel Weather: Toggle Settings Menu** — open the in-panel ☰ menu

## Development

```bash
npm install
npm run build
npm run screenshot    # hero image → media/screenshot.png (rain + sun)
npm run screenshots   # marketplace gallery → media/screenshots/
```

Press **F5** to launch the Extension Development Host.

## License

MIT
