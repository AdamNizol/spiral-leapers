function optimalGridSize(offsets) {
  const max = offsets.reduce((value, offset) => Math.max(value, Math.abs(offset.dx), Math.abs(offset.dy)), 1);
  return Math.max(3, Math.min(49, max * 2 + 1));
}

function key(dx, dy) { return `${dx},${dy}`; }

export class PieceEditor {
  constructor(elements, handlers) {
    this.dialog = elements.dialog;
    this.form = elements.form;
    this.title = elements.title;
    this.nameInput = elements.nameInput;
    this.sizeSelect = elements.sizeSelect;
    this.grid = elements.grid;
    this.summary = elements.summary;
    this.closeButton = elements.closeButton;
    this.cancelButton = elements.cancelButton;
    this.duplicateButton = elements.duplicateButton;
    this.deleteButton = elements.deleteButton;
    this.handlers = handlers;
    this.draft = null;
    this.bind();
  }

  bind() {
    this.form.addEventListener('submit', event => {
      event.preventDefault();
      if (!this.draft) return;
      this.draft.name = this.nameInput.value.trim() || 'Unnamed piece';
      this.handlers.save(structuredClone(this.draft));
      this.dialog.close();
    });
    this.sizeSelect.addEventListener('change', () => {
      if (!this.draft) return;
      const half = (Number(this.sizeSelect.value) - 1) / 2;
      const previousLength = this.draft.offsets.length;
      this.draft.offsets = this.draft.offsets.filter(offset => Math.abs(offset.dx) <= half && Math.abs(offset.dy) <= half);
      if (previousLength !== this.draft.offsets.length) this.handlers.notify('Offsets outside the smaller editor grid were removed.');
      this.render();
    });
    this.closeButton.addEventListener('click', () => this.dialog.close());
    this.cancelButton.addEventListener('click', () => this.dialog.close());
    this.duplicateButton.addEventListener('click', () => {
      if (!this.draft) return;
      const clone = this.handlers.duplicate(structuredClone(this.draft));
      this.open(clone);
    });
    this.deleteButton.addEventListener('click', () => {
      if (!this.draft) return;
      if (this.handlers.delete(this.draft.id)) this.dialog.close();
    });
  }

  open(piece, canDelete = true) {
    this.draft = structuredClone(piece);
    this.title.textContent = `Edit ${this.draft.name}`;
    this.nameInput.value = this.draft.name;
    this.sizeSelect.value = String(optimalGridSize(this.draft.offsets));
    this.deleteButton.disabled = !canDelete;
    this.duplicateButton.disabled = !canDelete;
    this.render();
    if (!this.dialog.open) this.dialog.showModal();
  }

  render() {
    const size = Number(this.sizeSelect.value);
    const half = (size - 1) / 2;
    const active = new Set(this.draft.offsets.map(offset => key(offset.dx, offset.dy)));
    this.grid.innerHTML = '';
    this.grid.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    this.grid.style.gap = size > 25 ? '1px' : '2px';

    for (let row = 0; row < size; row += 1) {
      for (let column = 0; column < size; column += 1) {
        const dx = column - half;
        const dy = row - half;
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'editor-cell';
        cell.title = dx === 0 && dy === 0 ? 'Placed piece' : `Toggle offset (${dx}, ${dy})`;
        if (dx === 0 && dy === 0) {
          cell.classList.add('origin');
          cell.disabled = true;
        } else {
          if (active.has(key(dx, dy))) cell.classList.add('active');
          cell.addEventListener('click', () => {
            const current = new Set(this.draft.offsets.map(offset => key(offset.dx, offset.dy)));
            const currentKey = key(dx, dy);
            if (current.has(currentKey)) {
              this.draft.offsets = this.draft.offsets.filter(offset => key(offset.dx, offset.dy) !== currentKey);
            } else {
              this.draft.offsets.push({ dx, dy });
              this.draft.offsets.sort((a, b) => a.dy - b.dy || a.dx - b.dx);
            }
            this.render();
          });
        }
        this.grid.append(cell);
      }
    }

    const list = this.draft.offsets.map(offset => `(${offset.dx}, ${offset.dy})`).join(', ');
    this.summary.textContent = this.draft.offsets.length ? `${this.draft.offsets.length} attacked offsets: ${list}` : 'This piece currently attacks no cells.';
  }
}
