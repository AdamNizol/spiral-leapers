export function normalizeOddSize(value, min = 11, max = 10001) {
  let size = Number.isFinite(Number(value)) ? Math.round(Number(value)) : 151;
  size = Math.max(min, Math.min(max, size));
  if (size % 2 === 0) size += size === max ? -1 : 1;
  return size;
}

export function buildSquareSpiral(size) {
  const count = size * size;
  const half = (size - 1) / 2;
  const xs = new Int32Array(count);
  const ys = new Int32Array(count);
  const cells = new Uint32Array(count);
  const indices = new Uint32Array(count);

  let x = 0;
  let y = 0;
  let written = 0;

  const record = () => {
    if (Math.abs(x) > half || Math.abs(y) > half || written >= count) return;
    const cell = (y + half) * size + (x + half);
    xs[written] = x;
    ys[written] = y;
    cells[written] = cell;
    indices[cell] = written;
    written += 1;
  };

  record();
  let distance = 1;
  while (written < count) {
    for (let i = 0; i < distance; i += 1) { x += 1; record(); }
    for (let i = 0; i < distance; i += 1) { y -= 1; record(); }
    distance += 1;
    for (let i = 0; i < distance; i += 1) { x -= 1; record(); }
    for (let i = 0; i < distance; i += 1) { y += 1; record(); }
    distance += 1;
  }

  return { size, half, count, xs, ys, cells, indices };
}

export function toBoardCell(x, y, spiral) {
  if (Math.abs(x) > spiral.half || Math.abs(y) > spiral.half) return -1;
  return (y + spiral.half) * spiral.size + (x + spiral.half);
}
