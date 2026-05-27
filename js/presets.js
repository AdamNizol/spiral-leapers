const offset = (dx, dy) => ({ dx, dy });

export const starterPieces = [
  {
    id: 'knight', name: 'Knight',
    offsets: [offset(-2, -1), offset(-1, -2), offset(1, -2), offset(2, -1), offset(2, 1), offset(1, 2), offset(-1, 2), offset(-2, 1)]
  },
  {
    id: 'king', name: 'King',
    offsets: [offset(-1, -1), offset(0, -1), offset(1, -1), offset(-1, 0), offset(1, 0), offset(-1, 1), offset(0, 1), offset(1, 1)]
  },
  {
    id: 'wazir', name: 'Wazir',
    offsets: [offset(0, -1), offset(-1, 0), offset(1, 0), offset(0, 1)]
  },
  {
    id: 'ferz', name: 'Ferz',
    offsets: [offset(-1, -1), offset(1, -1), offset(-1, 1), offset(1, 1)]
  },
  {
    id: 'camel', name: 'Camel',
    offsets: [offset(-3, -1), offset(-1, -3), offset(1, -3), offset(3, -1), offset(3, 1), offset(1, 3), offset(-1, 3), offset(-3, 1)]
  },
  {
    id: 'zebra', name: 'Zebra',
    offsets: [offset(-3, -2), offset(-2, -3), offset(2, -3), offset(3, -2), offset(3, 2), offset(2, 3), offset(-2, 3), offset(-3, 2)]
  },
  {
    id: 'giraffe', name: 'Giraffe',
    offsets: [offset(-4, -1), offset(-1, -4), offset(1, -4), offset(4, -1), offset(4, 1), offset(1, 4), offset(-1, 4), offset(-4, 1)]
  }
];

const pieces = () => structuredClone(starterPieces);
const board = () => ({ size: 151, backgroundColor: '#10141c' });
const team = (id, name, color, sequence, attacks) => ({ id, name, color, sequence, attacks });

export const presets = [
  {
    id: 'original-knights',
    name: 'Original: Red & Black Knights',
    config: () => ({
      version: 1,
      board: board(),
      pieces: pieces(),
      teams: [
        team('red', 'Red', '#ef3652', ['knight'], ['black']),
        team('black', 'Black', '#dde4f0', ['knight'], ['red'])
      ]
    })
  },
  {
    id: 'three-way-cycle',
    name: 'Three-Way Cycle: Knights',
    config: () => ({
      version: 1,
      board: board(),
      pieces: pieces(),
      teams: [
        team('crimson', 'Crimson', '#eb3c56', ['knight'], ['azure']),
        team('azure', 'Azure', '#35a6ff', ['knight'], ['gold']),
        team('gold', 'Gold', '#ffc43d', ['knight'], ['crimson'])
      ]
    })
  },
  {
    id: 'mixed-cycle',
    name: 'Three-Way Cycle: Mixed Leapers',
    config: () => ({
      version: 1,
      board: board(),
      pieces: pieces(),
      teams: [
        team('red', 'Knight', '#ff4962', ['knight'], ['blue']),
        team('blue', 'Camel', '#48a7ff', ['camel'], ['green']),
        team('green', 'Zebra', '#37d495', ['zebra'], ['red'])
      ]
    })
  },
  {
    id: 'alternating',
    name: 'Alternating Sequences',
    config: () => ({
      version: 1,
      board: board(),
      pieces: pieces(),
      teams: [
        team('ember', 'Ember', '#ff684d', ['knight', 'ferz', 'knight', 'camel'], ['ice']),
        team('ice', 'Ice', '#57c7ff', ['zebra', 'wazir', 'zebra'], ['ember'])
      ]
    })
  },
  {
    id: 'friendly-competition',
    name: 'Four Teams: Selective Hostility',
    config: () => ({
      version: 1,
      board: board(),
      pieces: pieces(),
      teams: [
        team('ruby', 'Ruby', '#f44263', ['knight'], ['jade', 'violet']),
        team('jade', 'Jade', '#31d28d', ['camel'], ['amber']),
        team('amber', 'Amber', '#ffc13d', ['ferz', 'zebra'], ['ruby']),
        team('violet', 'Violet', '#bb72ff', ['giraffe'], ['jade'])
      ]
    })
  }
];

export function getPreset(id = 'original-knights') {
  return (presets.find(preset => preset.id === id) ?? presets[0]).config();
}
