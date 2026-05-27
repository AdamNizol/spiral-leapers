import { buildSquareSpiral, toBoardCell } from './spiral.js';

export class SpiralSimulation {
  constructor(config) {
    this.config = config;
    this.spiral = buildSquareSpiral(config.board.size);
    this.teams = config.teams;
    this.pieces = config.pieces;
    this.teamIndexById = new Map(this.teams.map((team, index) => [team.id, index]));
    this.pieceIndexById = new Map(this.pieces.map((piece, index) => [piece.id, index]));

    const cellCount = this.spiral.count;
    this.owners = new Uint16Array(cellCount); // zero is empty, team index + 1 is occupied.
    this.pieceAt = new Uint16Array(cellCount); // piece index + 1.
    this.placedAt = new Uint32Array(cellCount); // placement number + 1.
    this.blockedBy = this.teams.map(() => new Uint32Array(cellCount));
    this.cursors = new Uint32Array(this.teams.length);
    this.teamCounts = new Uint32Array(this.teams.length);
    this.exhausted = this.teams.map(() => false);
    this.activeTeams = this.teams.length;
    this.nextTeam = 0;
    this.turnAttempts = 0;
    this.placements = 0;
    this.finished = this.teams.length === 0;
  }

  get completion() {
    return this.placements / this.spiral.count;
  }

  markBlocked(attackerIndex, cell, piece) {
    const attacker = this.teams[attackerIndex];
    const bit = (1 << attackerIndex) >>> 0;
    const x = (cell % this.spiral.size) - this.spiral.half;
    const y = Math.floor(cell / this.spiral.size) - this.spiral.half;

    for (const targetId of attacker.attacks) {
      const targetIndex = this.teamIndexById.get(targetId);
      if (targetIndex === undefined || targetIndex === attackerIndex) continue;
      const targetMask = this.blockedBy[targetIndex];
      for (const offset of piece.offsets) {
        const attackedCell = toBoardCell(x + offset.dx, y + offset.dy, this.spiral);
        if (attackedCell !== -1) targetMask[attackedCell] |= bit;
      }
    }
  }

  attemptTeamPlacement(teamIndex) {
    if (this.exhausted[teamIndex]) return null;
    const team = this.teams[teamIndex];
    let spiralIndex = this.cursors[teamIndex];
    const blocks = this.blockedBy[teamIndex];

    while (spiralIndex < this.spiral.count) {
      const cell = this.spiral.cells[spiralIndex];
      if (this.owners[cell] === 0 && blocks[cell] === 0) {
        const pieceId = team.sequence[this.teamCounts[teamIndex] % team.sequence.length];
        const pieceIndex = this.pieceIndexById.get(pieceId) ?? 0;
        const piece = this.pieces[pieceIndex];
        this.cursors[teamIndex] = spiralIndex + 1;
        this.owners[cell] = teamIndex + 1;
        this.pieceAt[cell] = pieceIndex + 1;
        this.placedAt[cell] = this.placements + 1;
        this.teamCounts[teamIndex] += 1;
        this.placements += 1;
        this.markBlocked(teamIndex, cell, piece);
        return {
          cell,
          spiralIndex,
          x: this.spiral.xs[spiralIndex],
          y: this.spiral.ys[spiralIndex],
          teamIndex,
          pieceIndex,
          placementNumber: this.placements,
          turnAttempt: this.turnAttempts
        };
      }
      spiralIndex += 1;
    }

    this.cursors[teamIndex] = this.spiral.count;
    this.exhausted[teamIndex] = true;
    this.activeTeams -= 1;
    if (this.activeTeams <= 0) this.finished = true;
    return null;
  }

  stepTurn() {
    if (this.finished || this.teams.length === 0) return null;
    const teamIndex = this.nextTeam;
    this.nextTeam = (this.nextTeam + 1) % this.teams.length;
    if (this.exhausted[teamIndex]) return null;
    this.turnAttempts += 1;
    return this.attemptTeamPlacement(teamIndex);
  }

  stepPlacement() {
    if (this.finished) return null;
    for (let checked = 0; checked < this.teams.length; checked += 1) {
      const result = this.stepTurn();
      if (result) return result;
      if (this.finished) return null;
    }
    return null;
  }

  stepRound() {
    const results = [];
    if (this.finished) return results;
    for (let turn = 0; turn < this.teams.length && !this.finished; turn += 1) {
      const result = this.stepTurn();
      if (result) results.push(result);
    }
    return results;
  }

  runPlacements(maxPlacements) {
    const results = [];
    while (!this.finished && results.length < maxPlacements) {
      const result = this.stepPlacement();
      if (result) results.push(result);
      else if (!this.finished) break;
    }
    return results;
  }

  inspect(cell) {
    if (cell < 0 || cell >= this.spiral.count) return null;
    const ownerValue = this.owners[cell];
    const placementValue = this.placedAt[cell];
    const x = (cell % this.spiral.size) - this.spiral.half;
    const y = Math.floor(cell / this.spiral.size) - this.spiral.half;
    const blockers = this.teams.map((team, targetIndex) => {
      const mask = this.blockedBy[targetIndex][cell];
      const attackers = this.teams.filter((_, attackerIndex) => mask & ((1 << attackerIndex) >>> 0));
      return { target: team, attackers };
    }).filter(item => item.attackers.length > 0);

    return {
      x,
      y,
      spiralIndex: this.spiral.indices[cell] + 1,
      owner: ownerValue ? this.teams[ownerValue - 1] : null,
      piece: ownerValue ? this.pieces[this.pieceAt[cell] - 1] : null,
      placementNumber: placementValue || null,
      blockers
    };
  }
}
