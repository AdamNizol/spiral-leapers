function rgb(hex) {
  const value = /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#10141c';
  return [parseInt(value.slice(1, 3), 16), parseInt(value.slice(3, 5), 16), parseInt(value.slice(5, 7), 16), 255];
}

function setPixel(data, cell, rgba) {
  const start = cell * 4;
  data[start] = rgba[0];
  data[start + 1] = rgba[1];
  data[start + 2] = rgba[2];
  data[start + 3] = rgba[3];
}

export class PatternRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d', { alpha: false });
    this.context.imageSmoothingEnabled = false;
    this.imageData = null;
    this.size = 0;
    this.colors = [];
    this.background = rgb('#10141c');
  }

  configure(config) {
    this.size = config.board.size;
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.colors = config.teams.map(team => rgb(team.color));
    this.background = rgb(config.board.backgroundColor);
    this.imageData = this.context.createImageData(this.size, this.size);
    this.clear();
  }

  clear() {
    const data = this.imageData.data;
    for (let cell = 0; cell < this.size * this.size; cell += 1) setPixel(data, cell, this.background);
    this.draw();
  }

  paint(placement) {
    setPixel(this.imageData.data, placement.cell, this.colors[placement.teamIndex]);
  }

  paintMany(placements) {
    for (const placement of placements) this.paint(placement);
    this.draw();
  }

  sync(simulation) {
    const data = this.imageData.data;
    for (let cell = 0; cell < simulation.spiral.count; cell += 1) {
      const owner = simulation.owners[cell];
      setPixel(data, cell, owner ? this.colors[owner - 1] : this.background);
    }
    this.draw();
  }

  draw() {
    this.context.putImageData(this.imageData, 0, 0);
  }

  cellFromPointer(event) {
    const rect = this.canvas.getBoundingClientRect();
    const px = Math.floor((event.clientX - rect.left) * this.size / rect.width);
    const py = Math.floor((event.clientY - rect.top) * this.size / rect.height);
    if (px < 0 || py < 0 || px >= this.size || py >= this.size) return -1;
    return py * this.size + px;
  }

  exportPng(scale = 4) {
    const output = document.createElement('canvas');
    output.width = this.size * scale;
    output.height = this.size * scale;
    const context = output.getContext('2d', { alpha: false });
    context.imageSmoothingEnabled = false;
    context.drawImage(this.canvas, 0, 0, output.width, output.height);
    output.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `spiral-leapers-${this.size}x${this.size}.png`;
      link.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }
}
