# Spiral Leapers

[Demo](https://adamnizol.github.io/spiral-leapers/)

An interactive web playground for generating painted grid patterns from competing custom chess-like pieces placed along an outward spiral.

Inspired by Numberphile's videos:

- [Red & Black Knights (extraordinary result) - Numberphile](https://www.youtube.com/watch?v=UiX4CFIiegM)
- [Amazing Chessboard Patterns (extra) - Numberphile](https://www.youtube.com/watch?v=VgmDuBCayPw)

## Concept

Teams take turns placing pieces into the earliest available square of an outward spiral. A square is unavailable to a team if it has already been occupied or is attacked by a hostile team's previously placed pieces.

Each team can have:

- Its own colour
- A repeating ordered sequence of pieces
- A custom list of teams it attacks

Pieces are defined by highlighted relative positions on a small grid, allowing users to create, inspect, save and share their own movement patterns.

## Planned Features

- Custom piece editor based on relative grid offsets
- Multiple configurable teams and colours
- Directed team hostility, including cyclic rock-paper-scissors-style rules
- Repeating piece sequences per team
- Adjustable output grid size
- Animated playback and instant final rendering
- Save/load configurations and shareable presets
- PNG export of generated patterns

## Development

The project is intended to run as a static web application hosted through GitHub Pages.
