# Bar Lines Card

Labelled colour-scale bars for Home Assistant wall panels: drawer levels,
litter, UV, anything with a range. Every bar uses the same block, a 20px line
(coloured icon, label, optional warning icon, value) over a 14px bar with a
white 6px "now" marker, so bars on different cards line up and look alike.
Each bar fills exactly one grid row, so a card with N bars takes N rows.

## Install

HACS → custom repositories → add this repository's URL as a **Dashboard**
repository, then download it. HACS registers the dashboard resource.

## Config

```yaml
type: custom:bar-lines-card
bars:
  - entity: sensor.litter_drawer
    name: Litter Tray
    icon: mdi:cat
    scale: fill
    warn_above: 90
```

| Key | Meaning |
| --- | --- |
| `bars` | The bars, top to bottom. |
| `card` | `false` drops the card background and padding, for a bar nested inside another card. |

### Bar keys

| Key | Meaning |
| --- | --- |
| `entity`, `name`, `icon` | The value, its label (default the friendly name) and icon. |
| `scale` | `fill` (green to red as it fills), `level` (red when low), `uv` (WHO UV bands, use `max: 12`), or a list of `[value, "#hex"]` stops on the min..max range. |
| `min`, `max`, `unit`, `decimals` | Range (default 0..100), unit (default `%`) and decimals (default 0). |
| `warn_above`, `warn_below` | Show a warning icon at or beyond these values. |
| `detail` | Dimmer right-hand text (e.g. a time window); the value then follows the label. |
| `after` | Dimmer text straight after an inline value (e.g. a category). |
| `forecast`, `forecast_label`, `forecast_decimals` | A number or entity on the range: the bar is lightly shaded from now to it, dark beyond, with a `▲ MAX n` marker under it. |

Tapping a bar opens its entity.
