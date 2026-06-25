import { useState } from 'react';
import { Item, ItemsByCategory, SelectedCatalogItem, SelectedCustomItem, SelectedItem } from '../../types';

interface Props {
  catalog: ItemsByCategory;
  selected: SelectedItem[];
  onChange: (items: SelectedItem[]) => void;
}

function getCatalogItem(selected: SelectedItem[], itemId: string): SelectedCatalogItem | undefined {
  return selected.find(
    (s): s is SelectedCatalogItem => s.type === 'catalog' && s.item_id === itemId
  );
}

function CounterButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-8 h-8 flex items-center justify-center rounded-full border border-sky-300 text-sky-600 hover:bg-sky-50 font-bold transition"
    >
      {children}
    </button>
  );
}

interface CatalogRowProps {
  item: Item;
  entry: SelectedCatalogItem | undefined;
  onAdd: (item: Item) => void;
  onRemove: (itemId: string) => void;
  onToggleFragile: (itemId: string) => void;
}

function CatalogRow({ item, entry, onAdd, onRemove, onToggleFragile }: CatalogRowProps) {
  const qty = entry?.quantity ?? 0;

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800">{item.name}</p>
        {item.dimensions && (
          <p className="text-xs text-gray-400">{item.dimensions}</p>
        )}
      </div>

      <div className="flex items-center gap-3 ml-4">
        {qty > 0 && (
          <button
            type="button"
            onClick={() => onToggleFragile(item.id)}
            className={`text-xs px-2 py-1 rounded-full border transition ${
              entry?.is_fragile
                ? 'bg-amber-100 border-amber-300 text-amber-700'
                : 'border-gray-200 text-gray-400 hover:border-amber-300 hover:text-amber-600'
            }`}
          >
            Frágil
          </button>
        )}

        <div className="flex items-center gap-2">
          <CounterButton onClick={() => onRemove(item.id)}>−</CounterButton>
          <span className="w-5 text-center text-sm font-semibold text-gray-700">{qty}</span>
          <CounterButton onClick={() => onAdd(item)}>+</CounterButton>
        </div>
      </div>
    </div>
  );
}

const MAX_CUSTOM_NAME = 100;
const MAX_CUSTOM_ITEMS = 20;
const MAX_QUANTITY_PER_ITEM = 50;

const MAX_ITEM_NOTES = 200;

function CustomItemForm({ onAdd, customCount }: { onAdd: (item: SelectedCustomItem) => void; customCount: number }) {
  const [name, setName] = useState('');
  const [fragile, setFragile] = useState(false);
  const [notes, setNotes] = useState('');

  const limitReached = customCount >= MAX_CUSTOM_ITEMS;

  function handleAdd() {
    if (!name.trim() || name.trim().length < 2 || limitReached) return;
    onAdd({
      type: 'custom',
      custom_name: name.trim(),
      quantity: 1,
      is_fragile: fragile,
      notes: notes.trim() || undefined,
    });
    setName('');
    setFragile(false);
    setNotes('');
  }

  return (
    <div className="mt-4 bg-gray-50 border border-dashed border-gray-300 rounded-xl p-4 space-y-3">
      <p className="text-sm font-medium text-gray-700">¿No encuentras lo que buscas? Agrégalo manualmente</p>
      {limitReached ? (
        <p className="text-xs text-amber-600">Máximo de {MAX_CUSTOM_ITEMS} ítems personalizados alcanzado.</p>
      ) : (
        <>
          <div>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                if (e.target.value.length <= MAX_CUSTOM_NAME) {
                  setName(e.target.value);
                }
              }}
              placeholder="Nombre del ítem (mín. 2 caracteres)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
            <p className="text-xs text-gray-400 text-right mt-1">{name.length}/{MAX_CUSTOM_NAME}</p>
          </div>
          <input
            type="text"
            value={notes}
            onChange={(e) => {
              if (e.target.value.length <= MAX_ITEM_NOTES) {
                setNotes(e.target.value);
              }
            }}
            placeholder="Nota opcional (ej: muy pesado, requiere desarme)"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={fragile}
                onChange={(e) => setFragile(e.target.checked)}
                className="accent-sky-400"
              />
              Frágil
            </label>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!name.trim() || name.trim().length < 2}
              className="bg-sky-400 hover:bg-sky-500 disabled:opacity-40 text-white text-sm px-4 py-2 rounded-lg transition"
            >
              + Agregar
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function ItemSelector({ catalog, selected, onChange }: Props) {
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());

  function toggleCategory(cat: string) {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }

  function addCatalogItem(item: Item) {
    const existing = getCatalogItem(selected, item.id);
    if (existing) {
      if (existing.quantity >= MAX_QUANTITY_PER_ITEM) return;
      onChange(
        selected.map((s) =>
          s.type === 'catalog' && s.item_id === item.id
            ? { ...s, quantity: s.quantity + 1 }
            : s
        )
      );
    } else {
      onChange([
        ...selected,
        {
          type: 'catalog',
          item_id: item.id,
          name: item.name,
          category: item.category,
          dimensions: item.dimensions,
          quantity: 1,
          is_fragile: false,
        },
      ]);
    }
  }

  function removeCatalogItem(itemId: string) {
    const existing = getCatalogItem(selected, itemId);
    if (!existing) return;

    if (existing.quantity <= 1) {
      onChange(selected.filter((s) => !(s.type === 'catalog' && s.item_id === itemId)));
    } else {
      onChange(
        selected.map((s) =>
          s.type === 'catalog' && s.item_id === itemId
            ? { ...s, quantity: s.quantity - 1 }
            : s
        )
      );
    }
  }

  function toggleFragile(itemId: string) {
    onChange(
      selected.map((s) =>
        s.type === 'catalog' && s.item_id === itemId
          ? { ...s, is_fragile: !s.is_fragile }
          : s
      )
    );
  }

  function addCustomItem(item: SelectedCustomItem) {
    onChange([...selected, item]);
  }

  function removeCustomItem(index: number) {
    const customItems = selected.filter((s): s is SelectedCustomItem => s.type === 'custom');
    const customIndex = selected.indexOf(customItems[index]);
    onChange(selected.filter((_, i) => i !== customIndex));
  }

  const totalItems = selected.reduce((sum, s) => sum + s.quantity, 0);

  return (
    <div className="space-y-3">
      {totalItems > 0 && (
        <p className="text-sm text-sky-600 font-medium">
          {totalItems} {totalItems === 1 ? 'ítem seleccionado' : 'ítems seleccionados'}
        </p>
      )}

      {/* Acordeón de categorías */}
      {Object.entries(catalog).map(([category, items]) => {
        const isOpen = openCategories.has(category);
        const categoryCount = items.reduce((sum, item) => {
          const entry = getCatalogItem(selected, item.id);
          return sum + (entry?.quantity ?? 0);
        }, 0);

        return (
          <div key={category} className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-sky-50 transition text-left"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-800">{category}</span>
                {categoryCount > 0 && (
                  <span className="bg-sky-400 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {categoryCount}
                  </span>
                )}
              </div>
              <span className="text-gray-400 text-lg">{isOpen ? '−' : '+'}</span>
            </button>

            {isOpen && (
              <div className="px-4 pb-2 border-t border-gray-100">
                {items.map((item) => (
                  <CatalogRow
                    key={item.id}
                    item={item}
                    entry={getCatalogItem(selected, item.id)}
                    onAdd={addCatalogItem}
                    onRemove={removeCatalogItem}
                    onToggleFragile={toggleFragile}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Ítems personalizados existentes */}
      {selected.filter((s): s is SelectedCustomItem => s.type === 'custom').map((item, index) => (
        <div key={index} className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <div>
            <p className="text-sm font-medium text-gray-800">{item.custom_name}</p>
            <p className="text-xs text-gray-400">{item.is_fragile ? 'Frágil' : 'Normal'} · x{item.quantity}</p>
            {item.notes && <p className="text-xs text-gray-400 italic">“{item.notes}”</p>}
          </div>
          <button
            type="button"
            onClick={() => removeCustomItem(index)}
            className="text-red-400 hover:text-red-600 text-sm"
          >
            Quitar
          </button>
        </div>
      ))}

      {/* Formulario ítem personalizado */}
      <CustomItemForm
        onAdd={addCustomItem}
        customCount={selected.filter((s) => s.type === 'custom').length}
      />
    </div>
  );
}
