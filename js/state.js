import { normalizeOddSize } from './spiral.js';
import { getPreset } from './presets.js';

export function uniqueId(prefix = 'item') {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function isColor(value, fallback) {
  return /^#[0-9a-fA-F]{6}$/.test(value ?? '') ? value : fallback;
}

function cleanOffsets(offsets) {
  const unique = new Map();
  for (const value of Array.isArray(offsets) ? offsets : []) {
    const dx = Math.round(Number(value.dx));
    const dy = Math.round(Number(value.dy));
    if (!Number.isFinite(dx) || !Number.isFinite(dy) || (dx === 0 && dy === 0)) continue;
    if (Math.abs(dx) > 24 || Math.abs(dy) > 24) continue;
    unique.set(`${dx},${dy}`, { dx, dy });
  }
  return [...unique.values()].sort((a, b) => a.dy - b.dy || a.dx - b.dx);
}

export function sanitizeConfig(rawConfig) {
  const fallback = getPreset();
  const raw = rawConfig && typeof rawConfig === 'object' ? rawConfig : fallback;
  const rawPieces = Array.isArray(raw.pieces) ? raw.pieces : fallback.pieces;
  const usedPieceIds = new Set();
  const pieces = rawPieces.slice(0, 200).map((piece, index) => {
    let id = typeof piece.id === 'string' && piece.id.trim() ? piece.id.trim() : uniqueId('piece');
    if (usedPieceIds.has(id)) id = uniqueId('piece');
    usedPieceIds.add(id);
    return {
      id,
      name: String(piece.name ?? `Piece ${index + 1}`).trim().slice(0, 40) || `Piece ${index + 1}`,
      offsets: cleanOffsets(piece.offsets)
    };
  });
  if (pieces.length === 0) pieces.push(...fallback.pieces);

  const pieceIds = new Set(pieces.map(piece => piece.id));
  const rawTeams = Array.isArray(raw.teams) ? raw.teams : fallback.teams;
  const usedTeamIds = new Set();
  const teams = rawTeams.slice(0, 16).map((teamValue, index) => {
    let id = typeof teamValue.id === 'string' && teamValue.id.trim() ? teamValue.id.trim() : uniqueId('team');
    if (usedTeamIds.has(id)) id = uniqueId('team');
    usedTeamIds.add(id);
    const sequence = (Array.isArray(teamValue.sequence) ? teamValue.sequence : []).filter(pieceId => pieceIds.has(pieceId));
    return {
      id,
      name: String(teamValue.name ?? `Team ${index + 1}`).trim().slice(0, 40) || `Team ${index + 1}`,
      color: isColor(teamValue.color, ['#ef3652', '#44a7ff', '#ffc13d', '#42d397'][index % 4]),
      sequence: sequence.length ? sequence : [pieces[0].id],
      attacks: Array.isArray(teamValue.attacks) ? [...new Set(teamValue.attacks.filter(value => typeof value === 'string'))] : []
    };
  });
  if (teams.length === 0) teams.push(...fallback.teams);
  const teamIds = new Set(teams.map(team => team.id));
  teams.forEach(team => { team.attacks = team.attacks.filter(targetId => teamIds.has(targetId) && targetId !== team.id); });

  return {
    version: 1,
    board: {
      size: normalizeOddSize(raw.board?.size ?? fallback.board.size),
      backgroundColor: isColor(raw.board?.backgroundColor, fallback.board.backgroundColor)
    },
    pieces,
    teams
  };
}

export function downloadConfig(config, filename = 'spiral-leapers-config.json') {
  const content = JSON.stringify(config, null, 2);
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function bytesToBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function base64UrlToBytes(encoded) {
  const base64 = encoded.replaceAll('-', '+').replaceAll('_', '/') + '==='.slice((encoded.length + 3) % 4);
  const binary = atob(base64);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function gzip(bytes) {
  if (!('CompressionStream' in window)) return null;
  const compressed = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(compressed).arrayBuffer());
}

async function ungzip(bytes) {
  const decompressed = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(decompressed).arrayBuffer());
}

export async function configToHash(config) {
  const bytes = new TextEncoder().encode(JSON.stringify(config));
  const compressed = await gzip(bytes);
  if (compressed && compressed.length < bytes.length) return `gz.${bytesToBase64Url(compressed)}`;
  return `j.${bytesToBase64Url(bytes)}`;
}

export async function configFromHash(hash) {
  const match = hash.match(/^#s=(gz|j)\.([A-Za-z0-9_-]+)$/);
  if (!match) return null;
  try {
    const bytes = base64UrlToBytes(match[2]);
    const output = match[1] === 'gz' && 'DecompressionStream' in window ? await ungzip(bytes) : bytes;
    return sanitizeConfig(JSON.parse(new TextDecoder().decode(output)));
  } catch (error) {
    console.warn('Could not decode shared configuration.', error);
    return null;
  }
}
